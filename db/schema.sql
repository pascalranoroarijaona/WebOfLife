-- Web of Life: Planetary Thermodynamic Blockchain & Spatial Ledger Schema
-- Sprint 081: Discrete Global Grid Adjacency, Pentagonal Defect Validation & Conserved Spatial Flux

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;

-- -----------------------------------------------------------------------------
-- Topological & Spatial Geometry Tables
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_cells (
    cell_id VARCHAR(16) PRIMARY KEY, -- Uber H3 64-bit hex canonical address
    resolution SMALLINT NOT NULL CHECK (resolution >= 0 AND resolution <= 15),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    coordination_number SMALLINT NOT NULL CHECK (coordination_number IN (5, 6)),
    centroid_lat DOUBLE PRECISION NOT NULL CHECK (centroid_lat >= -90.0 AND centroid_lat <= 90.0),
    centroid_lng DOUBLE PRECISION NOT NULL CHECK (centroid_lng >= -180.0 AND centroid_lng <= 180.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_pentagon_coordination CHECK (
        (is_pentagon = TRUE AND coordination_number = 5) OR
        (is_pentagon = FALSE AND coordination_number = 6)
    )
);

CREATE INDEX IF NOT EXISTS idx_spatial_cells_pentagon ON spatial_cells (is_pentagon, resolution);

-- Pentagonal and Hexagonal Adjacency Graph Edges
CREATE TABLE IF NOT EXISTS spatial_adjacency_edges (
    source_cell_id VARCHAR(16) NOT NULL REFERENCES spatial_cells(cell_id) ON DELETE RESTRICT,
    neighbor_index SMALLINT NOT NULL CHECK (neighbor_index >= 0 AND neighbor_index < 6),
    target_cell_id VARCHAR(16) NOT NULL REFERENCES spatial_cells(cell_id) ON DELETE RESTRICT,
    distance_meters DOUBLE PRECISION NOT NULL CHECK (distance_meters > 0),
    boundary_conductance DOUBLE PRECISION NOT NULL DEFAULT 1.0 CHECK (boundary_conductance >= 0.0),
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (source_cell_id, neighbor_index),
    CONSTRAINT chk_no_self_loops CHECK (source_cell_id <> target_cell_id)
);

CREATE INDEX IF NOT EXISTS idx_spatial_adjacency_target ON spatial_adjacency_edges (target_cell_id);

-- Pentagonal Singularity Validation Audit Log
CREATE TABLE IF NOT EXISTS pentagonal_neighbor_validations (
    validation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pentagon_cell_id VARCHAR(16) NOT NULL REFERENCES spatial_cells(cell_id),
    neighbor_strings TEXT[] NOT NULL,
    neighbor_count SMALLINT NOT NULL CHECK (neighbor_count = 5),
    assertion_name VARCHAR(64) NOT NULL DEFAULT 'assertPentagonalNeighborStringElements',
    is_valid BOOLEAN NOT NULL,
    validation_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validator_node_id VARCHAR(64) NOT NULL,
    error_message TEXT,
    CONSTRAINT chk_pentagonal_elements_cardinality CHECK (array_length(neighbor_strings, 1) = 5)
);

CREATE INDEX IF NOT EXISTS idx_pentagon_val_cell ON pentagonal_neighbor_validations (pentagon_cell_id, validation_timestamp DESC);

-- -----------------------------------------------------------------------------
-- Thermodynamic State & Chemical Stocks
-- -----------------------------------------------------------------------------

CREATE TYPE chemical_stock_type AS ENUM (
    'CARBON_ORGANIC',
    'CARBON_MINERAL',
    'NITROGEN_ACTIVE',
    'PHOSPHORUS_LABILE',
    'WATER_SOIL',
    'BIOMASS_CANOPY',
    'ENTROPY_THERMAL'
);

CREATE TABLE IF NOT EXISTS cellular_stock_states (
    cell_id VARCHAR(16) NOT NULL REFERENCES spatial_cells(cell_id) ON DELETE RESTRICT,
    stock_type chemical_stock_type NOT NULL,
    amount_moles DOUBLE PRECISION NOT NULL CHECK (amount_moles >= 0.0),
    internal_energy_joules DOUBLE PRECISION NOT NULL CHECK (internal_energy_joules >= 0.0),
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin > 0.0),
    entropy_joules_per_kelvin DOUBLE PRECISION NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cell_id, stock_type)
);

-- Timeseries TimescaleDB hypertable for cellular thermodynamic snapshots
CREATE TABLE IF NOT EXISTS cellular_thermodynamic_history (
    recorded_at TIMESTAMPTZ NOT NULL,
    cell_id VARCHAR(16) NOT NULL,
    stock_type chemical_stock_type NOT NULL,
    amount_moles DOUBLE PRECISION NOT NULL,
    internal_energy_joules DOUBLE PRECISION NOT NULL,
    entropy_joules_per_kelvin DOUBLE PRECISION NOT NULL,
    net_flux_moles DOUBLE PRECISION NOT NULL DEFAULT 0.0
);

SELECT create_hypertable('cellular_thermodynamic_history', 'recorded_at', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_cell_thermo_hist_cell ON cellular_thermodynamic_history (cell_id, recorded_at DESC);

-- -----------------------------------------------------------------------------
-- Thermodynamic Conserved Flux Ledger
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_flux_transactions (
    flux_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL,
    source_cell_id VARCHAR(16) NOT NULL REFERENCES spatial_cells(cell_id),
    target_cell_id VARCHAR(16) NOT NULL REFERENCES spatial_cells(cell_id),
    stock_type chemical_stock_type NOT NULL,
    flux_moles DOUBLE PRECISION NOT NULL CHECK (flux_moles >= 0.0),
    enthalpy_transferred_joules DOUBLE PRECISION NOT NULL,
    entropy_generated_joules_per_kelvin DOUBLE PRECISION NOT NULL CHECK (entropy_generated_joules_per_kelvin >= 0.0),
    conservation_checksum BYTEA NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_flux_directional CHECK (source_cell_id <> target_cell_id)
);

CREATE INDEX IF NOT EXISTS idx_spatial_flux_source ON spatial_flux_transactions (source_cell_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_spatial_flux_target ON spatial_flux_transactions (target_cell_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_spatial_flux_block ON spatial_flux_transactions (block_height);

-- -----------------------------------------------------------------------------
-- Thermodynamic Consensus & Blockchain Ledger
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    previous_block_hash BYTEA NOT NULL,
    block_hash BYTEA NOT NULL UNIQUE,
    merkle_state_root BYTEA NOT NULL,
    merkle_flux_root BYTEA NOT NULL,
    total_entropy_production_jk DOUBLE PRECISION NOT NULL CHECK (total_entropy_production_jk >= 0.0),
    net_planetary_mass_delta_moles DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    solar_inflow_joules DOUBLE PRECISION NOT NULL CHECK (solar_inflow_joules >= 0.0),
    thermal_radiation_outflow_joules DOUBLE PRECISION NOT NULL CHECK (thermal_radiation_outflow_joules >= 0.0),
    validator_signature BYTEA NOT NULL,
    witness_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_mass_conservation_closure CHECK (
        net_planetary_mass_delta_moles BETWEEN -1e-9 AND 1e-9
    )
);

CREATE INDEX IF NOT EXISTS idx_thermo_blocks_hash ON thermodynamic_blocks (block_hash);

-- Verification view for Pentagonal Singularities Adjacency Completeness
CREATE OR REPLACE VIEW view_pentagonal_invariants AS
SELECT 
    sc.cell_id AS pentagon_cell_id,
    sc.resolution,
    COUNT(sae.target_cell_id) AS verified_neighbor_count,
    array_agg(sae.target_cell_id ORDER BY sae.neighbor_index) AS neighbor_canonical_strings,
    CASE 
        WHEN COUNT(sae.target_cell_id) = 5 
             AND bool_and(sae.target_cell_id IS NOT NULL AND length(trim(sae.target_cell_id)) > 0)
        THEN TRUE 
        ELSE FALSE 
    END AS is_topologically_sound
FROM spatial_cells sc
LEFT JOIN spatial_adjacency_edges sae ON sc.cell_id = sae.source_cell_id
WHERE sc.is_pentagon = TRUE
GROUP BY sc.cell_id, sc.resolution;