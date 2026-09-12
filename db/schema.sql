-- Web of Life Database, UML & Thermodynamic Blockchain Schema
-- Sprint 073: Thermodynamic State Vector Discrepancy Absolute Difference Math Function & Ledger Integration

-- Enable TimescaleDB extension for time-series thermodynamic states and ledger transactions
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 1. Thermodynamic Elements Master Table
CREATE TABLE thermodynamic_elements (
    element_key VARCHAR(16) PRIMARY KEY, -- e.g., 'C', 'N', 'P', 'H2O'
    element_name VARCHAR(64) NOT NULL,
    atomic_weight NUMERIC(12, 6) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed core biological elements
INSERT INTO thermodynamic_elements (element_key, element_name, atomic_weight) VALUES
('C', 'Carbon', 12.011000),
('N', 'Nitrogen', 14.006700),
('P', 'Phosphorus', 30.973762),
('H2O', 'Water', 18.015280)
ON CONFLICT (element_key) DO NOTHING;

-- 2. Thermodynamic State Vectors Table
CREATE TABLE thermodynamic_state_vectors (
    vector_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    vector_type VARCHAR(32) NOT NULL CHECK (vector_type IN ('ACTUAL', 'EXPECTED', 'STEADY_STATE')),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Hypertable conversion for time-series analysis
SELECT create_hypertable('thermodynamic_state_vectors', 'timestamp', if_not_exists => TRUE);

-- 3. State Vector Elemental Stocks (Time-Series Monad Data)
CREATE TABLE state_vector_stocks (
    vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id) ON DELETE CASCADE,
    element_key VARCHAR(16) REFERENCES thermodynamic_elements(element_key),
    stock_value NUMERIC(24, 8) NOT NULL DEFAULT 0.00000000,
    PRIMARY KEY (vector_id, element_key)
);

-- 4. State Discrepancy Ledger (Sprint 073: computeAbsoluteStockDelta tracking)
CREATE TABLE state_discrepancy_ledger (
    discrepancy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actual_vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id),
    expected_vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id),
    element_key VARCHAR(16) REFERENCES thermodynamic_elements(element_key),
    absolute_delta NUMERIC(24, 8) NOT NULL CHECK (absolute_delta >= 0),
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Blockchain Transaction & Block Signatures for Thermodynamic Validation
CREATE TABLE thermodynamic_blocks (
    block_index SERIAL PRIMARY KEY,
    block_hash VARCHAR(64) UNIQUE NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    validator_signature TEXT NOT NULL,
    nonce BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE thermodynamic_block_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_index INT REFERENCES thermodynamic_blocks(block_index) ON DELETE CASCADE,
    discrepancy_id UUID REFERENCES state_discrepancy_ledger(discrepancy_id),
    entropy_change NUMERIC(18, 8) NOT NULL,
    transaction_signature VARCHAR(128) NOT NULL,
    payload JSONB NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_state_vectors_entity ON thermodynamic_state_vectors(entity_id, timestamp DESC);
CREATE INDEX idx_discrepancy_element ON state_discrepancy_ledger(element_key, computed_at DESC);
CREATE INDEX idx_blockchain_hash ON thermodynamic_blocks(block_hash);