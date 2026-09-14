-- ============================================================================
-- Web of Life Database & Thermodynamic Blockchain Schema (Sprint 016)
-- ============================================================================

-- Enable TimescaleDB extension for time-series thermodynamic stocks & flows
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ============================================================================
-- 1. SPATIAL & H3 GRID LEDGER
-- ============================================================================

CREATE TABLE spatial_cells (
    h3_index VARCHAR(15) PRIMARY KEY,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_h3_length CHECK (LENGTH(h3_index) = 15),
    CONSTRAINT chk_h3_hex CHECK (h3_index ~ '^[0-9a-fA-F]{15}$')
);

-- ============================================================================
-- 2. THERMODYNAMIC STOCKS & MONADS
-- ============================================================================

CREATE TABLE trophic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    h3_index VARCHAR(15) NOT NULL REFERENCES spatial_cells(h3_index),
    energy_joules DOUBLE PRECISION NOT NULL CHECK (energy_joules >= 0.0),
    entropy_j_k DOUBLE PRECISION NOT NULL CHECK (entropy_j_k >= 0.0),
    biomass_grams DOUBLE PRECISION NOT NULL CHECK (biomass_grams >= 0.0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert to hypertable for high-frequency thermodynamic telemetry
SELECT create_hypertable('trophic_stocks', 'updated_at', if_not_exists => TRUE);

-- ============================================================================
-- 3. BLOCKCHAIN TRANSACTION LEDGER (FIRST & SECOND LAW CONSERVATION)
-- ============================================================================

CREATE TABLE block_transactions (
    tx_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_height BIGINT NOT NULL,
    h3_index VARCHAR(15) NOT NULL REFERENCES spatial_cells(h3_index),
    source_stock_id UUID REFERENCES trophic_stocks(stock_id),
    target_stock_id UUID REFERENCES trophic_stocks(stock_id),
    delta_energy_joules DOUBLE PRECISION NOT NULL,
    delta_entropy_j_k DOUBLE PRECISION NOT NULL,
    solar_flux_constant DOUBLE PRECISION NOT NULL,
    signature VARCHAR(128) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('block_transactions', 'recorded_at', if_not_exists => TRUE);

-- ============================================================================
-- 4. INDEXING FOR PERFORMANCE & INTEGRITY
-- ============================================================================

CREATE INDEX idx_spatial_cells_h3 ON spatial_cells(h3_index);
CREATE INDEX idx_trophic_stocks_spatial ON trophic_stocks(h3_index, updated_at DESC);
CREATE INDEX idx_block_transactions_height ON block_transactions(block_height DESC);