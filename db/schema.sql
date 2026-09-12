-- Updated Schema & Ledger Definitions for Sprint 033: Thermodynamic State Vector Property Validator Helper

-- 1. Thermodynamic States Table
CREATE TABLE IF NOT EXISTS thermodynamic_states (
    state_id VARCHAR(64) PRIMARY KEY,
    block_index BIGINT NOT NULL,
    energy DOUBLE PRECISION NOT NULL CHECK (energy >= 0),
    entropy DOUBLE PRECISION NOT NULL CHECK (entropy >= 0),
    temperature DOUBLE PRECISION NOT NULL CHECK (temperature >= 0),
    is_valid BOOLEAN NOT NULL DEFAULT FALSE,
    validation_errors TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Thermodynamic Stock Inventories Table (Linked to States)
CREATE TABLE IF NOT EXISTS thermodynamic_stocks (
    stock_id SERIAL PRIMARY KEY,
    state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id) ON DELETE CASCADE,
    stock_name VARCHAR(128) NOT NULL,
    quantity DOUBLE PRECISION NOT NULL CHECK (quantity >= 0),
    CONSTRAINT unique_state_stock UNIQUE (state_id, stock_name)
);

-- 3. Validation Audit Ledger (Blockchain Integration)
CREATE TABLE IF NOT EXISTS validation_audit_ledger (
    audit_id SERIAL PRIMARY KEY,
    state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id) ON DELETE CASCADE,
    transaction_signature VARCHAR(128) NOT NULL,
    validator_version VARCHAR(32) NOT NULL DEFAULT '0.33.0',
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_thermodynamic_states_valid ON thermodynamic_states(is_valid);
CREATE INDEX IF NOT EXISTS idx_thermodynamic_stocks_state ON thermodynamic_stocks(state_id);