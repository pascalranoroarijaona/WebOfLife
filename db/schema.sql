-- ============================================================================
-- Web of Life Database Schema: Sprint 063
-- Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper
-- ============================================================================

CREATE TABLE IF NOT EXISTS thermodynamic_states (
    state_id VARCHAR(64) PRIMARY KEY,
    entity_id VARCHAR(64) NOT NULL,
    timestamp BIGINT NOT NULL,
    carbon DECIMAL(18, 8) NOT NULL,
    nitrogen DECIMAL(18, 8) NOT NULL,
    phosphorus DECIMAL(18, 8) NOT NULL,
    water DECIMAL(18, 8) NOT NULL,
    energy DECIMAL(18, 8) NOT NULL,
    entropy DECIMAL(18, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS state_validation_records (
    validation_id VARCHAR(64) PRIMARY KEY,
    actual_state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    expected_state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    is_valid BOOLEAN NOT NULL,
    discrepancies JSONB NOT NULL,
    max_tolerance_exceeded BOOLEAN NOT NULL,
    first_law_satisfied BOOLEAN NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blockchain_transactions (
    tx_hash VARCHAR(64) PRIMARY KEY,
    block_number BIGINT NOT NULL,
    validation_id VARCHAR(64) REFERENCES state_validation_records(validation_id),
    signature VARCHAR(128) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thermodynamic_states_entity ON thermodynamic_states(entity_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_state_validation_valid ON state_validation_records(is_valid);
CREATE INDEX IF NOT EXISTS idx_blockchain_block ON blockchain_transactions(block_number);