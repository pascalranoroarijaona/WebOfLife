-- ============================================================================
-- Web of Life Database & Thermodynamic Blockchain Schema
-- Sprint 006 Extension: Spatial H3 Validation & Thermodynamic Ledger
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- Enums for H3 Validation Errors (Aligned with src/spatial/h3_grid.ts)
CREATE TYPE h3_error_code AS ENUM (
    'H3_ERR_INVALID_LENGTH',
    'H3_ERR_INVALID_CHARACTER',
    'H3_ERR_INVALID_RESOLUTION',
    'H3_ERR_INVALID_BASE_CELL',
    'H3_ERR_NULL_INDEX'
);

-- Spatial Grid Cells validated against Uber H3 specifications
CREATE TABLE spatial_cells (
    h3_index VARCHAR(15) PRIMARY KEY,
    resolution SMALLINT NOT NULL CHECK (resolution >= 0 AND resolution <= 15),
    base_cell SMALLINT NOT NULL CHECK (base_cell >= 0 AND base_cell <= 122),
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thermodynamic Stocks bound to spatial H3 indices (First & Second Law Conservation)
CREATE TABLE thermodynamic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    h3_index VARCHAR(15) NOT NULL REFERENCES spatial_cells(h3_index),
    stock_type VARCHAR(64) NOT NULL, -- e.g., 'BIOMASS', 'NUTRIENT_RESERVOIR', 'SOLAR_FLUX'
    energy_joules NUMERIC(20, 6) NOT NULL CHECK (energy_joules >= 0.000000),
    matter_grams NUMERIC(20, 6) NOT NULL CHECK (matter_grams >= 0.000000),
    entropy_j_k NUMERIC(20, 6) NOT NULL CHECK (entropy_j_k >= 0.000000),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Time-Series Table for Thermodynamic Energy/Matter Flows
CREATE TABLE thermodynamic_flows (
    flow_id UUID DEFAULT uuid_generate_v4(),
    source_stock_id UUID REFERENCES thermodynamic_stocks(stock_id),
    target_stock_id UUID REFERENCES thermodynamic_stocks(stock_id),
    h3_index VARCHAR(15) NOT NULL REFERENCES spatial_cells(h3_index),
    energy_delta_joules NUMERIC(20, 6) NOT NULL,
    matter_delta_grams NUMERIC(20, 6) NOT NULL,
    entropy_delta_j_k NUMERIC(20, 6) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('thermodynamic_flows', 'recorded_at', if_not_exists => TRUE);

-- Blockchain Block Transactions ensuring tamper-evident state transitions
CREATE TABLE blockchain_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_index BIGINT UNIQUE NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    state_signature VARCHAR(128) NOT NULL,
    h3_validation_status h3_error_code NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spatial_cells_res ON spatial_cells(resolution);
CREATE INDEX idx_thermodynamic_stocks_h3 ON thermodynamic_stocks(h3_index);
CREATE INDEX idx_blockchain_blocks_index ON blockchain_blocks(block_index);