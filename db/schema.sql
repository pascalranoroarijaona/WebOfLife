-- ============================================================================
-- Web of Life Database, UML & Thermodynamic Blockchain Architecture
-- Sprint 034: H3 Token Non-Hexadecimal Symbol Validation Schema & Ledger
-- ============================================================================

-- Enable TimescaleDB extension for time-series thermodynamic flow tracking
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ----------------------------------------------------------------------------
-- 1. Spatial Indexing & H3 Validation Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE spatial_h3_tokens (
    token_id VARCHAR(64) PRIMARY KEY,
    is_valid BOOLEAN NOT NULL DEFAULT FALSE,
    validation_error VARCHAR(255),
    resolution INT NOT NULL CHECK (resolution >= 0 AND resolution <= 15),
    entropy_delta NUMERIC(18, 6) NOT NULL DEFAULT 0.000000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hypertable for tracking spatial validation attempts and entropy metrics
SELECT create_hypertable('spatial_h3_tokens', 'created_at', if_not_exists => TRUE);

-- ----------------------------------------------------------------------------
-- 2. Thermodynamic Monad Stocks
-- ----------------------------------------------------------------------------
CREATE TABLE thermodynamic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id VARCHAR(64) REFERENCES spatial_h3_tokens(token_id),
    monad_type VARCHAR(64) NOT NULL, -- e.g., 'SpatialMonad', 'BiomassMonad', 'EnergyMonad'
    matter_mass NUMERIC(18, 8) NOT NULL CHECK (matter_mass >= 0), -- First Law conservation
    free_energy NUMERIC(18, 8) NOT NULL, -- Second Law metric
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. Thermodynamic Stock Flows
-- ----------------------------------------------------------------------------
CREATE TABLE thermodynamic_flows (
    flow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_stock_id UUID REFERENCES thermodynamic_stocks(stock_id),
    target_stock_id UUID REFERENCES thermodynamic_stocks(stock_id),
    joules_transferred NUMERIC(18, 8) NOT NULL,
    entropy_generated NUMERIC(18, 8) NOT NULL CHECK (entropy_generated >= 0),
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('thermodynamic_flows', 'executed_at', if_not_exists => TRUE);

-- ----------------------------------------------------------------------------
-- 4. Thermodynamic Blockchain Block Transaction Signatures
-- ----------------------------------------------------------------------------
CREATE TABLE blockchain_blocks (
    block_hash VARCHAR(128) PRIMARY KEY,
    previous_block_hash VARCHAR(128) REFERENCES blockchain_blocks(block_hash),
    merkle_root VARCHAR(128) NOT NULL,
    state_entropy_total NUMERIC(18, 8) NOT NULL,
    mined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE block_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_hash VARCHAR(128) REFERENCES blockchain_blocks(block_hash),
    flow_id UUID REFERENCES thermodynamic_flows(flow_id),
    signature VARCHAR(256) NOT NULL,
    is_committed BOOLEAN NOT NULL DEFAULT TRUE
);