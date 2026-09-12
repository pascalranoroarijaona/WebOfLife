-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger Definitions
-- Sprint 067 Additions: State Validator, Discrepancy Audits, and Monad Transactions
-- ============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. THERMODYNAMIC STATE VECTORS & INVENTORY TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    vector_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    energy_flux NUMERIC(18, 8) NOT NULL,
    entropy NUMERIC(18, 8) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS thermodynamic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vector_id UUID NOT NULL REFERENCES thermodynamic_state_vectors(vector_id) ON DELETE CASCADE,
    element_key VARCHAR(64) NOT NULL,
    stock_value NUMERIC(18, 8) NOT NULL,
    UNIQUE(vector_id, element_key)
);

-- ============================================================================
-- 2. STATE VALIDATION & DISCREPANCY AUDIT TABLES (Sprint 067)
-- ============================================================================

CREATE TABLE IF NOT EXISTS state_validations (
    validation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actual_vector_id UUID NOT NULL REFERENCES thermodynamic_state_vectors(vector_id),
    expected_vector_id UUID NOT NULL REFERENCES thermodynamic_state_vectors(vector_id),
    is_valid BOOLEAN NOT NULL,
    global_tolerance NUMERIC(18, 12) NOT NULL DEFAULT 1e-6,
    validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS validation_element_differences (
    difference_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    validation_id UUID NOT NULL REFERENCES state_validations(validation_id) ON DELETE CASCADE,
    element_key VARCHAR(64) NOT NULL,
    absolute_difference NUMERIC(18, 12) NOT NULL,
    applied_tolerance NUMERIC(18, 12) NOT NULL,
    violation_flag BOOLEAN NOT NULL DEFAULT FALSE,
    violation_message TEXT
);

-- ============================================================================
-- 3. MONAD PROCESS & BLOCKCHAIN LEDGER TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS monad_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id),
    target_vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id),
    validation_id UUID REFERENCES state_validations(validation_id),
    process_type VARCHAR(128) NOT NULL,
    energy_delta NUMERIC(18, 8) NOT NULL,
    entropy_delta NUMERIC(18, 8) NOT NULL,
    signature VARCHAR(256) NOT NULL,
    committed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    previous_block_id UUID REFERENCES blockchain_blocks(block_id),
    merkle_root VARCHAR(256) NOT NULL,
    block_index BIGINT NOT NULL UNIQUE,
    nonce BIGINT NOT NULL,
    mined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS block_transactions (
    block_id UUID NOT NULL REFERENCES blockchain_blocks(block_id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES monad_transactions(transaction_id),
    PRIMARY KEY (block_id, transaction_id)
);

-- ============================================================================
-- 4. INDEXES FOR HIGH-THROUGHPUT TIME-SERIES EVALUATION
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_thermo_stocks_vector ON thermodynamic_stocks(vector_id);
CREATE INDEX IF NOT EXISTS idx_validation_differences_val ON validation_element_differences(validation_id);
CREATE INDEX IF NOT EXISTS idx_monad_tx_committed ON monad_transactions(committed_at);
CREATE INDEX IF NOT EXISTS idx_blockchain_index ON blockchain_blocks(block_index);