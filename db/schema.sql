-- ============================================================================
-- Web of Life: Thermodynamic Blockchain & Relational Schema
-- Sprint 045: Thermodynamic State Vector Non-Negative Entropy Assertion Utility
-- ============================================================================

CREATE TABLE IF NOT EXISTS thermodynamic_states (
    state_id VARCHAR(64) PRIMARY KEY,
    entity_id VARCHAR(64) NOT NULL,
    internal_energy NUMERIC(20, 8) NOT NULL,
    enthalpy NUMERIC(20, 8) NOT NULL,
    entropy NUMERIC(20, 8) NOT NULL CHECK (entropy >= 0.0),
    temperature NUMERIC(12, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS state_validation_ledger (
    validation_id VARCHAR(64) PRIMARY KEY,
    state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    is_valid BOOLEAN NOT NULL,
    error_message TEXT,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    validator_signature VARCHAR(128) NOT NULL
);

CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_index SERIAL PRIMARY KEY,
    block_hash VARCHAR(64) UNIQUE NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    nonce BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS block_transactions (
    transaction_id VARCHAR(64) PRIMARY KEY,
    block_index INT REFERENCES blockchain_blocks(block_index),
    state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    monad_result_type VARCHAR(16) NOT NULL CHECK (monad_result_type IN ('SUCCESS', 'FAILURE')),
    payload_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_thermodynamic_states_entropy ON thermodynamic_states(entropy);
CREATE INDEX idx_validation_ledger_state ON state_validation_ledger(state_id);
CREATE INDEX idx_transactions_block ON block_transactions(block_index);