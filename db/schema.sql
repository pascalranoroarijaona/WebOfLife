-- Updated Schema & Ledger Definitions for Sprint 020
-- Target: 15-Character H3 Index Length Validation & Spatial Monad Stock Transitions

BEGIN;

-- Spatial Validation Ledger & Audit Table
CREATE TABLE IF NOT EXISTS spatial_validations (
    validation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    h3_index VARCHAR(64) NOT NULL,
    is_valid BOOLEAN NOT NULL,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    solar_epoch_cycle BIGINT NOT NULL,
    entropy_delta NUMERIC(18, 10) DEFAULT 0.0000000000
);

-- Thermodynamic Stock Transactions for Spatial Monads
CREATE TABLE IF NOT EXISTS spatial_monad_stocks (
    stock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    validation_id UUID REFERENCES spatial_validations(validation_id),
    trophic_layer VARCHAR(32) NOT NULL,
    energy_allocation NUMERIC(18, 8) NOT NULL CHECK (energy_allocation >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Blockchain Block Transaction Signatures for Spatial State Transitions
CREATE TABLE IF NOT EXISTS spatial_blockchain_ledger (
    block_id BIGSERIAL PRIMARY KEY,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    validation_id UUID REFERENCES spatial_validations(validation_id),
    merkle_root VARCHAR(64) NOT NULL,
    solar_signature VARCHAR(128) NOT NULL,
    committed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for high-throughput spatial adjacency & validation queries
CREATE INDEX IF NOT EXISTS idx_spatial_validations_h3 ON spatial_validations(h3_index);
CREATE INDEX IF NOT EXISTS idx_spatial_monads_layer ON spatial_monad_stocks(trophic_layer);
CREATE INDEX IF NOT EXISTS idx_spatial_blockchain_hash ON spatial_blockchain_ledger(current_hash);

COMMIT;