-- ============================================================================
-- Web of Life Database Schema: Sprint 004 Additions
-- Uber H3 Geospatial Partitioning Engine & Thermodynamic Ledger Integration
-- ============================================================================

-- Ensure TimescaleDB extension is available for time-series thermodynamic tracking
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ----------------------------------------------------------------------------
-- 1. Spatial Grid Cells Table (Uber H3 Partitioning Engine)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_spatial_cells (
    h3_index VARCHAR(15) PRIMARY KEY,
    resolution INTEGER NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    centroid_lat DOUBLE PRECISION NOT NULL,
    centroid_lng DOUBLE PRECISION NOT NULL,
    boundary_polygon JSONB NOT NULL,
    area_km2 DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_h3_cells_resolution ON h3_spatial_cells(resolution);

-- ----------------------------------------------------------------------------
-- 2. H3 Adjacency Table (Topological Neighborhoods & Gradient Tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_adjacencies (
    source_index VARCHAR(15) NOT NULL REFERENCES h3_spatial_cells(h3_index) ON DELETE CASCADE,
    neighbor_index VARCHAR(15) NOT NULL REFERENCES h3_spatial_cells(h3_index) ON DELETE CASCADE,
    edge_distance_km DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (source_index, neighbor_index)
);

CREATE INDEX IF NOT EXISTS idx_h3_adj_source ON h3_adjacencies(source_index);

-- ----------------------------------------------------------------------------
-- 3. Spatial Monad Ecological Stocks (Time-Series / Hypertable)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_monad_stocks (
    time TIMESTAMPTZ NOT NULL,
    h3_index VARCHAR(15) NOT NULL REFERENCES h3_spatial_cells(h3_index) ON DELETE CASCADE,
    biomass_stock DOUBLE PRECISION NOT NULL CHECK (biomass_stock >= 0),
    energy_stock DOUBLE PRECISION NOT NULL CHECK (energy_stock >= 0),
    entropy_stock DOUBLE PRECISION NOT NULL CHECK (entropy_stock >= 0),
    solar_irradiance_input DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    PRIMARY KEY (time, h3_index)
);

-- Convert to TimescaleDB hypertable for efficient time-series state propagation
SELECT create_hypertable('spatial_monad_stocks', 'time', if_not_exists => TRUE);

-- ----------------------------------------------------------------------------
-- 4. Thermodynamic Blockchain Transactions (Conservation & Dissipation Ledgers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_transactions (
    transaction_id UUID PRIMARY KEY,
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_h3 VARCHAR(15) REFERENCES h3_spatial_cells(h3_index),
    target_h3 VARCHAR(15) REFERENCES h3_spatial_cells(h3_index),
    energy_transferred DOUBLE PRECISION NOT NULL,
    entropy_generated DOUBLE PRECISION NOT NULL CHECK (entropy_generated >= 0),
    transaction_signature VARCHAR(128) NOT NULL,
    CONSTRAINT chk_first_law_conservation CHECK (energy_transferred >= 0)
);

CREATE INDEX IF NOT EXISTS idx_thermo_tx_block ON thermodynamic_transactions(block_number);
CREATE INDEX IF NOT EXISTS idx_thermo_tx_time ON thermodynamic_transactions(timestamp);