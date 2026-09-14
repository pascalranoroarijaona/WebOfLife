-- ============================================================================
-- WEB OF LIFE DATABASE & THERMODYNAMIC BLOCKCHAIN SCHEMA
-- Sprint 005: Uber H3 Index String Format Validation & Spatial Monad Integration
-- Compliance: First & Second Laws of Thermodynamics (Matter Conservation & Solar Flux)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- Enums matching TypeScript H3ErrorCode and Validation States
CREATE TYPE h3_error_code AS ENUM (
    'H3_SUCCESS',
    'H3_ERR_INVALID_LENGTH',
    'H3_ERR_INVALID_CHARACTER',
    'H3_ERR_INVALID_RESOLUTION',
    'H3_ERR_INVALID_BASE_CELL',
    'H3_ERR_NULL_INDEX'
);

CREATE TYPE spatial_state AS ENUM (
    'UNVERIFIED',
    'VALIDATED',
    'FAULT'
);

-- ============================================================================
-- 1. SPATIAL CELLS & H3 INDEX REGISTRY
-- ============================================================================
CREATE TABLE spatial_h3_cells (
    h3_index VARCHAR(15) PRIMARY KEY,
    resolution INT NOT NULL CHECK (resolution >= 0 AND resolution <= 15),
    base_cell INT NOT NULL CHECK (base_cell >= 0 AND base_cell <= 121),
    state spatial_state NOT NULL DEFAULT 'UNVERIFIED',
    last_error h3_error_code DEFAULT 'H3_SUCCESS',
    matter_stock_kg NUMERIC(18, 6) NOT NULL DEFAULT 0.000000, -- First Law: Matter conservation stock
    solar_flux_jules NUMERIC(18, 6) NOT NULL DEFAULT 0.000000, -- Second Law: Solar input tracking
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. THERMODYNAMIC BLOCKCHAIN LEDGER & TRANSACTIONS
-- ============================================================================
CREATE TABLE thermodynamic_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGSERIAL UNIQUE,
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    solar_dissipation_entropy NUMERIC(18, 6) NOT NULL, -- Entropy overhead tracking
    miner_pod_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE spatial_monad_transactions (
    tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_id UUID REFERENCES thermodynamic_blocks(block_id) ON DELETE CASCADE,
    h3_index VARCHAR(15) REFERENCES spatial_h3_cells(h3_index),
    transition_from spatial_state NOT NULL,
    transition_to spatial_state NOT NULL,
    error_code h3_error_code NOT NULL,
    energy_cost_joules NUMERIC(12, 4) NOT NULL, -- Metabolic cost of validation
    signature VARCHAR(128) NOT NULL,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert transactions to a TimescaleDB hypertable for time-series spatial tracking
SELECT create_hypertable('spatial_monad_transactions', 'logged_at', if_not_exists => TRUE);

-- ============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_spatial_cells_resolution ON spatial_h3_cells(resolution);
CREATE INDEX idx_spatial_cells_state ON spatial_h3_cells(state);
CREATE INDEX idx_spatial_tx_h3 ON spatial_monad_transactions(h3_index, logged_at DESC);