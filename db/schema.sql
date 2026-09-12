-- ============================================================================
-- Web of Life Database & Thermodynamic Ledger Schema
-- Sprint 082: Thermodynamic State Vector Inventory Discrepancy Evaluator Wrapper
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic State Vectors Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    vector_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id VARCHAR(255) NOT NULL,
    vector_type VARCHAR(50) NOT NULL CHECK (vector_type IN ('ACTUAL', 'EXPECTED')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    entropy DOUBLE PRECISION NOT NULL,
    state_payload JSONB NOT NULL, -- Serialized Map of inventory components (mass, energy, elements)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. State Discrepancy Evaluation Reports Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS state_discrepancy_reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actual_vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id) ON DELETE CASCADE,
    expected_vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id) ON DELETE CASCADE,
    eval_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_mass_delta DOUBLE PRECISION NOT NULL,
    energy_violation_detected BOOLEAN NOT NULL DEFAULT FALSE,
    entropy_delta DOUBLE PRECISION NOT NULL,
    absolute_discrepancy_payload JSONB NOT NULL, -- Serialized Map of absolute variances
    relative_discrepancy_payload JSONB NOT NULL, -- Serialized Map of relative variances
    tolerance_threshold DOUBLE PRECISION NOT NULL DEFAULT 1e-6,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. Thermodynamic Blockchain Transaction & Monad Stock Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_blockchain_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    previous_hash VARCHAR(64) NOT NULL,
    block_hash VARCHAR(64) UNIQUE NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    nonce BIGINT NOT NULL DEFAULT 0,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS thermodynamic_monad_transactions (
    tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_id UUID REFERENCES thermodynamic_blockchain_blocks(block_id) ON DELETE CASCADE,
    report_id UUID REFERENCES state_discrepancy_reports(report_id) ON DELETE SET NULL,
    sender_entity VARCHAR(255) NOT NULL,
    receiver_entity VARCHAR(255) NOT NULL,
    mass_transfer DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    energy_transfer DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    entropy_change DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    first_law_conserved BOOLEAN NOT NULL,
    second_law_valid BOOLEAN NOT NULL,
    signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance and time-series analytical queries
CREATE INDEX IF NOT EXISTS idx_state_vectors_timestamp ON thermodynamic_state_vectors(timestamp);
CREATE INDEX IF NOT EXISTS idx_discrepancy_reports_timestamp ON state_discrepancy_reports(eval_timestamp);
CREATE INDEX IF NOT EXISTS idx_discrepancy_violation ON state_discrepancy_reports(energy_violation_detected);
CREATE INDEX IF NOT EXISTS idx_monad_tx_block ON thermodynamic_monad_transactions(block_id);