-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger Definitions
-- Sprint 038: Thermodynamic State Vector Non-Negative Entropy Assertion Utility
-- ============================================================================

BEGIN;

-- Core Thermodynamic States (Time-Series Ledger)
CREATE TABLE IF NOT EXISTS thermodynamic_states (
    state_id VARCHAR(64) PRIMARY KEY,
    entity_id VARCHAR(64) NOT NULL,
    energy NUMERIC(20, 10) NOT NULL CHECK (energy >= 0),
    entropy NUMERIC(20, 10) NOT NULL CHECK (entropy >= 0),
    temperature NUMERIC(10, 4),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Validation Result Monad Log Table
CREATE TABLE IF NOT EXISTS entropy_validation_logs (
    validation_id SERIAL PRIMARY KEY,
    state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id) ON DELETE CASCADE,
    is_success BOOLEAN NOT NULL,
    observed_entropy NUMERIC(20, 10),
    error_message TEXT,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Thermodynamic Blockchain Block Transactions
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_index SERIAL PRIMARY KEY,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) UNIQUE NOT NULL,
    state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    validation_id INT REFERENCES entropy_validation_logs(validation_id),
    nonce BIGINT NOT NULL,
    miner_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance & time-series traversal
CREATE INDEX IF NOT EXISTS idx_thermodynamic_states_entity ON thermodynamic_states(entity_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_entropy_validation_success ON entropy_validation_logs(is_success);
CREATE INDEX IF NOT EXISTS idx_thermodynamic_blocks_hash ON thermodynamic_blocks(current_hash);

COMMIT;