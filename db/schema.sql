-- Web of Life Thermodynamic Blockchain & Spatial Ledger Schema
-- Sprint 039: Canonical H3 Grid Validation & Spatial Monad Integrity
-- Invariant: First & Second Laws of Thermodynamics; Zero-leakage Geospatial Partitioning

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;

-- Domain: Canonical H3 Index (15-character hex starting with 8)
CREATE DOMAIN canonical_h3_index AS VARCHAR(15)
    CHECK (VALUE ~* '^8[0-9a-fA-F]{14}$');

-- Enumeration of Thermodynamic Stock Dimensions
CREATE TYPE stock_element AS ENUM (
    'BIOMASS',
    'CARBON',
    'NITROGEN',
    'PHOSPHORUS',
    'WATER',
    'THERMAL_ENERGY'
);

-- Enumeration of Spatial Validation Error Categories
CREATE TYPE validation_fault_type AS ENUM (
    'INVALID_CANONICAL_FORMAT',
    'INVALID_RESOLUTION',
    'TOPOLOGICAL_DISCONTINUITY',
    'NON_CONSERVATIVE_FLUX'
);

--------------------------------------------------------------------------------
-- 1. Spatial Partition Topologies (DGGS Layer)
--------------------------------------------------------------------------------
CREATE TABLE spatial_cells (
    h3_index canonical_h3_index PRIMARY KEY,
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    base_cell SMALLINT NOT NULL CHECK (base_cell BETWEEN 0 AND 121),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    centroid_lat DOUBLE PRECISION NOT NULL CHECK (centroid_lat BETWEEN -90.0 AND 90.0),
    centroid_lon DOUBLE PRECISION NOT NULL CHECK (centroid_lon BETWEEN -180.0 AND 180.0),
    surface_area_m2 NUMERIC(18, 4) NOT NULL CHECK (surface_area_m2 > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_spatial_cells_res ON spatial_cells (resolution);

--------------------------------------------------------------------------------
-- 2. EarthPods and Spatial Monads
--------------------------------------------------------------------------------
CREATE TABLE earth_pods (
    pod_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    h3_index canonical_h3_index NOT NULL REFERENCES spatial_cells(h3_index) ON DELETE RESTRICT,
    pod_label VARCHAR(64) NOT NULL,
    biome_type VARCHAR(48) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_earth_pod_cell UNIQUE (h3_index)
);

CREATE INDEX idx_earth_pods_h3 ON earth_pods (h3_index);

--------------------------------------------------------------------------------
-- 3. Thermodynamic Stocks (State Layer)
--------------------------------------------------------------------------------
CREATE TABLE monad_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_id UUID NOT NULL REFERENCES earth_pods(pod_id) ON DELETE RESTRICT,
    h3_index canonical_h3_index NOT NULL REFERENCES spatial_cells(h3_index) ON DELETE RESTRICT,
    biomass_kg NUMERIC(24, 8) NOT NULL CHECK (biomass_kg >= 0.0),
    carbon_kg NUMERIC(24, 8) NOT NULL CHECK (carbon_kg >= 0.0),
    nitrogen_kg NUMERIC(24, 8) NOT NULL CHECK (nitrogen_kg >= 0.0),
    phosphorus_kg NUMERIC(24, 8) NOT NULL CHECK (phosphorus_kg >= 0.0),
    water_kg NUMERIC(24, 8) NOT NULL CHECK (water_kg >= 0.0),
    thermal_energy_joules NUMERIC(32, 8) NOT NULL CHECK (thermal_energy_joules >= 0.0),
    entropy_joules_per_kelvin NUMERIC(28, 8) NOT NULL CHECK (entropy_joules_per_kelvin >= 0.0),
    exergy_joules NUMERIC(32, 8) NOT NULL CHECK (exergy_joules >= 0.0),
    state_merkle_root BYTEA NOT NULL,
    version BIGINT NOT NULL CHECK (version >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_monad_stock_pod UNIQUE (pod_id)
);

CREATE INDEX idx_monad_stocks_h3 ON monad_stocks (h3_index);

--------------------------------------------------------------------------------
-- 4. Thermodynamic Blockchain Ledger (Blocks & State Proofs)
--------------------------------------------------------------------------------
CREATE TABLE blockchain_blocks (
    block_number BIGSERIAL PRIMARY KEY,
    previous_block_hash BYTEA NOT NULL,
    current_block_hash BYTEA NOT NULL UNIQUE,
    state_root BYTEA NOT NULL,
    tx_merkle_root BYTEA NOT NULL,
    total_entropy_production_jk NUMERIC(32, 8) NOT NULL CHECK (total_entropy_production_jk >= 0.0),
    total_energy_joules NUMERIC(38, 8) NOT NULL,
    validator_node_id UUID NOT NULL,
    block_signature BYTEA NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_blockchain_blocks_prev ON blockchain_blocks (previous_block_hash);

--------------------------------------------------------------------------------
-- 5. Thermodynamic Transactions & Flux Allocations
--------------------------------------------------------------------------------
CREATE TABLE stock_transactions (
    tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_number BIGINT REFERENCES blockchain_blocks(block_number) ON DELETE RESTRICT,
    source_h3 canonical_h3_index NOT NULL REFERENCES spatial_cells(h3_index) ON DELETE RESTRICT,
    target_h3 canonical_h3_index NOT NULL REFERENCES spatial_cells(h3_index) ON DELETE RESTRICT,
    flux_biomass_kg NUMERIC(24, 8) NOT NULL DEFAULT 0.0,
    flux_carbon_kg NUMERIC(24, 8) NOT NULL DEFAULT 0.0,
    flux_nitrogen_kg NUMERIC(24, 8) NOT NULL DEFAULT 0.0,
    flux_phosphorus_kg NUMERIC(24, 8) NOT NULL DEFAULT 0.0,
    flux_water_kg NUMERIC(24, 8) NOT NULL DEFAULT 0.0,
    flux_thermal_energy_joules NUMERIC(32, 8) NOT NULL DEFAULT 0.0,
    entropy_generation_joules_per_kelvin NUMERIC(28, 8) NOT NULL CHECK (entropy_generation_joules_per_kelvin >= 0.0),
    tx_signature BYTEA NOT NULL,
    nonce BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_flux_non_negative_all CHECK (
        flux_biomass_kg >= 0.0 AND
        flux_carbon_kg >= 0.0 AND
        flux_nitrogen_kg >= 0.0 AND
        flux_phosphorus_kg >= 0.0 AND
        flux_water_kg >= 0.0 AND
        flux_thermal_energy_joules >= 0.0
    ),
    CONSTRAINT chk_distinct_source_target CHECK (source_h3 <> target_h3)
);

CREATE INDEX idx_stock_tx_source_h3 ON stock_transactions (source_h3);
CREATE INDEX idx_stock_tx_target_h3 ON stock_transactions (target_h3);
CREATE INDEX idx_stock_tx_block ON stock_transactions (block_number);

--------------------------------------------------------------------------------
-- 6. Spatial Validation Invariant Audit Log
--------------------------------------------------------------------------------
CREATE TABLE spatial_validation_fault_log (
    fault_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_token TEXT NOT NULL,
    fault_type validation_fault_type NOT NULL,
    error_message TEXT NOT NULL,
    source_ip INET,
    caller_component VARCHAR(128) NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX idx_spatial_fault_raw ON spatial_validation_fault_log (raw_token);
CREATE INDEX idx_spatial_fault_type ON spatial_validation_fault_log (fault_type);