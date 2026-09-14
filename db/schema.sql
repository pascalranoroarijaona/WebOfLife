-- ============================================================================
-- Web of Life: Planetary Thermodynamic Ledger & Geodesic Monad Schema
-- Sprint 053: Spatial Geodesic Invariant Enforcement & H3 Adjacency Stocks
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ----------------------------------------------------------------------------
-- 1. GEODESIC GRID & H3 SPATIAL INDEXING
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_h3_cells (
    h3_index VARCHAR(16) PRIMARY KEY,
    resolution INTEGER NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    centroid_lat DOUBLE PRECISION NOT NULL,
    centroid_lng DOUBLE PRECISION NOT NULL,
    boundary_geom GEOMETRY(Polygon, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_h3_latitude_geodesic_bounds CHECK (
        centroid_lat IS NOT NULL 
        AND NOT is_nan(centroid_lat) 
        AND NOT is_infinite(centroid_lat) 
        AND centroid_lat >= -90.0 
        AND centroid_lat <= 90.0
    ),
    CONSTRAINT chk_h3_longitude_bounds CHECK (
        centroid_lng IS NOT NULL 
        AND NOT is_nan(centroid_lng) 
        AND NOT is_infinite(centroid_lng) 
        AND centroid_lng >= -180.0 
        AND centroid_lng <= 180.0
    )
);

CREATE INDEX IF NOT EXISTS idx_spatial_h3_cells_lat ON spatial_h3_cells (centroid_lat);
CREATE INDEX IF NOT EXISTS idx_spatial_h3_cells_geom ON spatial_h3_cells USING GIST (boundary_geom);

-- ----------------------------------------------------------------------------
-- 2. H3 ADJACENCY DIRECTED TOPOLOGY GRAPH
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_h3_adjacencies (
    origin_h3 VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index) ON DELETE RESTRICT,
    neighbor_h3 VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index) ON DELETE RESTRICT,
    direction_index INTEGER NOT NULL CHECK (direction_index BETWEEN 0 AND 5),
    geodesic_distance_meters DOUBLE PRECISION NOT NULL CHECK (geodesic_distance_meters >= 0.0),
    advection_conductance DOUBLE PRECISION NOT NULL DEFAULT 1.0 CHECK (advection_conductance >= 0.0),
    PRIMARY KEY (origin_h3, neighbor_h3),
    CONSTRAINT chk_non_self_adjacent CHECK (origin_h3 <> neighbor_h3)
);

CREATE INDEX IF NOT EXISTS idx_spatial_h3_adjacencies_neighbor ON spatial_h3_adjacencies (neighbor_h3);

-- ----------------------------------------------------------------------------
-- 3. THERMODYNAMIC CELL STOCKS (State Variables)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_cell_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    h3_index VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index) ON DELETE RESTRICT,
    epoch_tick BIGINT NOT NULL,
    internal_energy_joules NUMERIC(38, 8) NOT NULL CHECK (internal_energy_joules >= 0),
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin >= 0.0),
    entropy_joules_per_kelvin DOUBLE PRECISION NOT NULL,
    mass_atmosphere_kg DOUBLE PRECISION NOT NULL CHECK (mass_atmosphere_kg >= 0.0),
    mass_ocean_kg DOUBLE PRECISION NOT NULL CHECK (mass_ocean_kg >= 0.0),
    biomass_carbon_kg DOUBLE PRECISION NOT NULL CHECK (biomass_carbon_kg >= 0.0),
    monad_state_hash VARCHAR(64) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cell_stock_epoch UNIQUE (h3_index, epoch_tick)
);

CREATE INDEX IF NOT EXISTS idx_thermo_stocks_epoch ON thermodynamic_cell_stocks (epoch_tick);
CREATE INDEX IF NOT EXISTS idx_thermo_stocks_h3 ON thermodynamic_cell_stocks (h3_index);

-- ----------------------------------------------------------------------------
-- 4. SPATIAL MONAD INSOLATION & BOUNDARY FLUXES
-- Enforces strictly non-negative solar flux derived from latitude [-90, 90]
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS solar_insolation_fluxes (
    flux_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    h3_index VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index),
    epoch_tick BIGINT NOT NULL,
    subsolar_latitude DOUBLE PRECISION NOT NULL,
    cell_latitude DOUBLE PRECISION NOT NULL,
    solar_zenith_cos DOUBLE PRECISION NOT NULL CHECK (solar_zenith_cos >= 0.0 AND solar_zenith_cos <= 1.0),
    solar_irradiance_flux_w_m2 DOUBLE PRECISION NOT NULL CHECK (solar_irradiance_flux_w_m2 >= 0.0),
    net_energy_joules NUMERIC(38, 8) NOT NULL CHECK (net_energy_joules >= 0),
    CONSTRAINT chk_flux_cell_lat CHECK (
        cell_latitude IS NOT NULL 
        AND cell_latitude >= -90.0 
        AND cell_latitude <= 90.0
    ),
    CONSTRAINT chk_flux_subsolar_lat CHECK (
        subsolar_latitude IS NOT NULL 
        AND subsolar_latitude >= -90.0 
        AND subsolar_latitude <= 90.0
    ),
    CONSTRAINT uq_solar_flux_cell_epoch UNIQUE (h3_index, epoch_tick)
);

CREATE INDEX IF NOT EXISTS idx_solar_flux_epoch ON solar_insolation_fluxes (epoch_tick);

-- ----------------------------------------------------------------------------
-- 5. INTER-CELL ADJACENCY FLUX TRANSACTIONS
-- Tracks conservation of energy & mass transfers across hex boundaries
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS adjacency_flux_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    epoch_tick BIGINT NOT NULL,
    origin_h3 VARCHAR(16) NOT NULL,
    neighbor_h3 VARCHAR(16) NOT NULL,
    mass_flux_transferred_kg DOUBLE PRECISION NOT NULL,
    energy_transferred_joules NUMERIC(38, 8) NOT NULL,
    entropy_production_joules_per_k DOUBLE PRECISION NOT NULL CHECK (entropy_production_joules_per_k >= 0.0),
    FOREIGN KEY (origin_h3, neighbor_h3) REFERENCES spatial_h3_adjacencies(origin_h3, neighbor_h3),
    CONSTRAINT chk_entropy_non_negative CHECK (entropy_production_joules_per_k >= 0.0)
);

CREATE INDEX IF NOT EXISTS idx_adj_flux_epoch ON adjacency_flux_transactions (epoch_tick);

-- ----------------------------------------------------------------------------
-- 6. THERMODYNAMIC BLOCKCHAIN LEDGER (Consensus & Verification)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_height BIGINT PRIMARY KEY,
    epoch_tick BIGINT NOT NULL UNIQUE,
    parent_block_hash VARCHAR(64) NOT NULL,
    block_hash VARCHAR(64) NOT NULL UNIQUE,
    state_merkle_root VARCHAR(64) NOT NULL,
    flux_merkle_root VARCHAR(64) NOT NULL,
    total_entropy_production DOUBLE PRECISION NOT NULL CHECK (total_entropy_production >= 0.0),
    total_energy_delta_joules NUMERIC(38, 8) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blockchain_transactions (
    tx_hash VARCHAR(64) PRIMARY KEY,
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(block_height),
    epoch_tick BIGINT NOT NULL,
    h3_index VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index),
    signature VARCHAR(132) NOT NULL,
    invariant_assertions_passed BOOLEAN NOT NULL DEFAULT TRUE,
    payload_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_invariants_valid CHECK (invariant_assertions_passed = TRUE)
);

CREATE INDEX IF NOT EXISTS idx_blockchain_tx_block ON blockchain_transactions (block_height);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_h3 ON blockchain_transactions (h3_index);