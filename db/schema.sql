-- ============================================================================
-- Web of Life: Thermodynamic Blockchain & Relational Schema
-- Sprint 043: Thermodynamic State Vector Non-Negative Entropy Assertion Utility
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic State Vectors & Entropy Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    vector_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_id UUID NOT NULL,
    cycle_index BIGINT NOT NULL,
    entropy DOUBLE PRECISION NOT NULL CHECK (entropy >= 0.0),
    mass_energy_total DOUBLE PRECISION NOT NULL,
    state_payload JSONB NOT NULL,
    validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_non_negative_entropy CHECK (entropy >= 0.0)
);

CREATE INDEX idx_thermodynamic_vectors_pod_cycle 
    ON thermodynamic_state_vectors (pod_id, cycle_index);

-- ----------------------------------------------------------------------------
-- 2. Monad Execution & Pipeline Guard Results
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS monad_execution_logs (
    execution_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id),
    pipeline_stage VARCHAR(128) NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_monad_exec_success 
    ON monad_execution_logs (success, executed_at);

-- ----------------------------------------------------------------------------
-- 3. Thermodynamic Blockchain Ledger Transactions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_blockchain_blocks (
    block_index BIGINT PRIMARY KEY,
    previous_hash VARCHAR(64) NOT NULL,
    block_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    entropy_ledger_state DOUBLE PRECISION NOT NULL CHECK (entropy_ledger_state >= 0.0),
    validator_signature VARCHAR(128) NOT NULL
);

CREATE TABLE IF NOT EXISTS thermodynamic_block_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_index BIGINT REFERENCES thermodynamic_blockchain_blocks(block_index),
    vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id),
    transaction_type VARCHAR(64) NOT NULL,
    delta_entropy DOUBLE PRECISION NOT NULL,
    is_spontaneous_injection BOOLEAN NOT NULL DEFAULT FALSE
);