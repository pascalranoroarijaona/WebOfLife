-- ============================================================================
-- Web of Life Database & Thermodynamic Blockchain Schema
-- Sprint 026: Resolution Tier (0-15) Boundary Check & Spatial Indexing
-- ============================================================================

-- Enable UUID extension for cryptographic transaction hashing
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic Monad Ledger & Stocks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS solar_monad_stocks (
    monad_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    q_solar_inflow NUMERIC(18, 8) NOT NULL CHECK (q_solar_inflow >= 0.0),
    entropy_dissipation NUMERIC(18, 8) NOT NULL CHECK (entropy_dissipation >= 0.0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. Spatial Grid & H3 Resolution Tier Constraints (0-15)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_spatial_partitions (
    cell_index VARCHAR(15) PRIMARY KEY,
    resolution_tier SMALLINT NOT NULL CHECK (resolution_tier BETWEEN 0 AND 15),
    biomass_stock NUMERIC(18, 8) NOT NULL DEFAULT 0.0,
    energy_joules NUMERIC(18, 8) NOT NULL DEFAULT 0.0,
    last_validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. Thermodynamic Blockchain Transaction Signatures
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_transaction_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    cell_index VARCHAR(15) REFERENCES h3_spatial_partitions(cell_index),
    resolution_tier SMALLINT NOT NULL CHECK (resolution_tier BETWEEN 0 AND 15),
    solar_work_delta NUMERIC(18, 8) NOT NULL,
    signature_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high-frequency spatial queries and boundary checks
CREATE INDEX IF NOT EXISTS idx_h3_resolution_tier ON h3_spatial_partitions(resolution_tier);
CREATE INDEX IF NOT EXISTS idx_spatial_tx_hash ON spatial_transaction_blocks(current_hash);