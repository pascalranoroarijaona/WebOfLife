-- Updated Schema & Ledger Definitions (Sprint 019: H3 Spatial Validation & Thermodynamic Blockchain)

-- Enable TimescaleDB extension if not already present
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Spatial Indices and H3 Validation Metadata Ledger
CREATE TABLE IF NOT EXISTS spatial_h3_validations (
    validation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index_candidate VARCHAR(64) NOT NULL,
    is_valid_length BOOLEAN NOT NULL,
    validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    solar_compute_joules NUMERIC(18, 6) DEFAULT 0.000001
);

-- Convert to hypertable for time-series analytics on spatial validation requests
SELECT create_hypertable('spatial_h3_validations', 'validated_at', if_not_exists => TRUE);

-- Thermodynamic Stock Ledger for Spatial Monads
CREATE TABLE IF NOT EXISTS thermodynamic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monad_name VARCHAR(128) NOT NULL,
    mass_energy_joules NUMERIC(24, 8) NOT NULL,
    solar_flux_absorbed NUMERIC(24, 8) NOT NULL,
    entropy_delta NUMERIC(24, 8) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blockchain Block Transaction Signatures
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_height BIGINT NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    block_hash VARCHAR(64) NOT NULL,
    payload_ref UUID REFERENCES spatial_h3_validations(validation_id),
    signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_spatial_h3_candidate ON spatial_h3_validations(index_candidate);
CREATE INDEX IF NOT EXISTS idx_blockchain_block_height ON blockchain_transactions(block_height);