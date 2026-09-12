-- Updated Schema & Ledger Definitions for Sprint 032
-- Web of Life Database, UML & Thermodynamic Blockchain Architect

CREATE TABLE IF NOT EXISTS thermodynamic_states (
    state_id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    energy DOUBLE PRECISION NOT NULL CHECK (energy >= 0),
    entropy DOUBLE PRECISION NOT NULL CHECK (entropy >= 0),
    temperature DOUBLE PRECISION NOT NULL CHECK (temperature >= 0),
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    validation_errors TEXT[]
);

CREATE TABLE IF NOT EXISTS thermodynamic_stocks (
    stock_id SERIAL PRIMARY KEY,
    state_id VARCHAR(64) NOT NULL REFERENCES thermodynamic_states(state_id) ON DELETE CASCADE,
    stock_name VARCHAR(128) NOT NULL,
    quantity DOUBLE PRECISION NOT NULL CHECK (quantity >= 0),
    UNIQUE(state_id, stock_name)
);

CREATE TABLE IF NOT EXISTS blockchain_transactions (
    tx_hash VARCHAR(64) PRIMARY KEY,
    block_index BIGINT NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    signature VARCHAR(128) NOT NULL,
    payload_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thermodynamic_stocks_state ON thermodynamic_stocks(state_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_block ON blockchain_transactions(block_index);