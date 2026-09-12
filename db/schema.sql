-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger Definitions
-- Sprint 065: Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Thermodynamic State Vectors Table
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    vector_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL,
    carbon_stock NUMERIC(18, 6) NOT NULL DEFAULT 0.0,
    nitrogen_stock NUMERIC(18, 6) NOT NULL DEFAULT 0.0,
    phosphorus_stock NUMERIC(18, 6) NOT NULL DEFAULT 0.0,
    water_stock NUMERIC(18, 6) NOT NULL DEFAULT 0.0,
    energy_stock NUMERIC(18, 6) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Thermodynamic State Validations Ledger (Sprint 065)
CREATE TABLE IF NOT EXISTS state_validations_ledger (
    validation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expected_vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id) ON DELETE CASCADE,
    actual_vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id) ON DELETE CASCADE,
    is_valid BOOLEAN NOT NULL,
    max_delta NUMERIC(18, 6) NOT NULL,
    discrepancy_details JSONB NOT NULL,
    validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Monad Stock Transitions & Blockchain Transactions
CREATE TABLE IF NOT EXISTS monad_stock_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_index BIGINT NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    validator_id UUID REFERENCES state_validations_ledger(validation_id),
    flow_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    signature VARCHAR(128) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance & auditing
CREATE INDEX IF NOT EXISTS idx_state_vectors_entity ON thermodynamic_state_vectors(entity_id);
CREATE INDEX IF NOT EXISTS idx_validations_is_valid ON state_validations_ledger(is_valid);
CREATE INDEX IF NOT EXISTS idx_monad_tx_block ON monad_stock_transactions(block_index);
CREATE INDEX IF NOT EXISTS idx_monad_tx_hash ON monad_stock_transactions(current_hash);