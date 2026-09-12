-- ============================================================================
-- Web of Life Database Schema: Sprint 072 Extension
-- Thermodynamic State Vector Discrepancy Absolute Difference Math Function
-- ============================================================================

-- Drop tables if resetting in development
DROP TABLE IF EXISTS thermodynamic_stock_deltas CASCADE;
DROP TABLE IF EXISTS state_vector_validations CASCADE;
DROP TABLE IF EXISTS thermodynamic_transactions CASCADE;
DROP TABLE IF EXISTS elemental_stocks CASCADE;

-- 1. Elemental Stocks (Carbon, Nitrogen, Phosphorus, Water, etc.)
CREATE TABLE elemental_stocks (
    stock_id VARCHAR(64) PRIMARY KEY,
    entity_id VARCHAR(64) NOT NULL,
    element_key VARCHAR(16) NOT NULL, -- e.g., 'C', 'N', 'P', 'H2O'
    quantity NUMERIC(20, 8) NOT NULL CHECK (quantity >= 0),
    units VARCHAR(32) NOT NULL DEFAULT 'moles',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Thermodynamic Transactions (Blockchain Ledger)
CREATE TABLE thermodynamic_transactions (
    transaction_id VARCHAR(64) PRIMARY KEY,
    block_index INTEGER NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    hash VARCHAR(64) NOT NULL,
    payload_json JSONB NOT NULL,
    entropy_delta NUMERIC(20, 8) NOT NULL,
    solar_flux_input NUMERIC(20, 8) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. State Vector Validations (Tracking Expected vs Actual Vectors)
CREATE TABLE state_vector_validations (
    validation_id VARCHAR(64) PRIMARY KEY,
    transaction_id VARCHAR(64) REFERENCES thermodynamic_transactions(transaction_id),
    actual_vector_json JSONB NOT NULL,
    expected_vector_json JSONB NOT NULL,
    is_valid BOOLEAN NOT NULL,
    max_tolerance NUMERIC(10, 8) NOT NULL,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Thermodynamic Stock Deltas (Storing Absolute Stock Discrepancies from Sprint 072)
CREATE TABLE thermodynamic_stock_deltas (
    delta_id VARCHAR(64) PRIMARY KEY,
    validation_id VARCHAR(64) REFERENCES state_vector_validations(validation_id),
    element_key VARCHAR(16) NOT NULL,
    actual_value NUMERIC(20, 8) NOT NULL,
    expected_value NUMERIC(20, 8) NOT NULL,
    absolute_delta NUMERIC(20, 8) NOT NULL CHECK (absolute_delta >= 0),
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance and time-series lookups
CREATE INDEX idx_elemental_stocks_entity ON elemental_stocks(entity_id);
CREATE INDEX idx_stock_deltas_validation ON thermodynamic_stock_deltas(validation_id);
CREATE INDEX idx_transactions_block ON thermodynamic_transactions(block_index);