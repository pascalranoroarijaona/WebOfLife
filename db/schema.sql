-- Updated Schema & Ledger Definitions for Sprint 036
-- Focus: Spatial H3 String Boundary Validation Logs, Thermodynamic Monad Stocks, and Immutable Blockchain Transactions.

-- 1. Thermodynamic Stocks & Spatial Monad Registry
CREATE TABLE IF NOT EXISTS spatial_monad_registry (
    monad_id VARCHAR(64) PRIMARY KEY,
    h3_index_token VARCHAR(32) NOT NULL,
    is_valid_length BOOLEAN NOT NULL,
    is_within_bounds BOOLEAN NOT NULL,
    thermodynamic_entropy_delta NUMERIC(18, 9) DEFAULT 0.000000000,
    solar_input_joules NUMERIC(18, 9) DEFAULT 0.000000000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. String Length Boundary Validation Audit Trail (Stateless Inspection Logging)
CREATE TABLE IF NOT EXISTS h3_boundary_validation_audit (
    audit_id SERIAL PRIMARY KEY,
    monad_id VARCHAR(64) REFERENCES spatial_monad_registry(monad_id),
    tested_string VARCHAR(255) NOT NULL,
    min_length INT NOT NULL DEFAULT 1,
    max_length INT NOT NULL DEFAULT 15,
    is_valid_length BOOLEAN NOT NULL,
    is_within_bounds BOOLEAN NOT NULL,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Thermodynamic Blockchain Ledger Transactions (Sprint 036)
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    tx_hash VARCHAR(64) PRIMARY KEY,
    block_number BIGINT NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    monad_id VARCHAR(64) REFERENCES spatial_monad_registry(monad_id),
    payload_signature TEXT NOT NULL,
    matter_conservation_verified BOOLEAN NOT NULL DEFAULT TRUE,
    second_law_entropy_checked BOOLEAN NOT NULL DEFAULT TRUE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance and spatial integrity checks
CREATE INDEX IF NOT EXISTS idx_spatial_monad_h3 ON spatial_monad_registry(h3_index_token);
CREATE INDEX IF NOT EXISTS idx_audit_validation ON h3_boundary_validation_audit(is_within_bounds);
CREATE INDEX IF NOT EXISTS idx_blockchain_block ON blockchain_transactions(block_number);