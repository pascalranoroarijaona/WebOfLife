-- ============================================================================
-- Web of Life: Planetary Ecosystem & Thermodynamic Blockchain Ledger Schema
-- Sprint 056: Coordinate Boundary Assertion & Geodesic Adjacency Integrity
-- ============================================================================

-- Enable PostGIS and cryptographic extensions if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- Domain Constraints: Geodesic Coordinates & Numerical Tolerances
-- ----------------------------------------------------------------------------
CREATE DOMAIN wgs84_latitude AS NUMERIC(10, 7)
    CHECK (VALUE >= -90.0000000 AND VALUE <= 90.0000000);

CREATE DOMAIN wgs84_longitude AS NUMERIC(11, 7)
    CHECK (VALUE >= -180.0000000 AND VALUE <= 180.0000000);

CREATE DOMAIN thermodynamic_joules AS NUMERIC(28, 8)
    CHECK (VALUE >= 0.0);

CREATE DOMAIN conserved_mass_kg AS NUMERIC(28, 8)
    CHECK (VALUE >= 0.0);

CREATE DOMAIN entropy_joules_per_kelvin AS NUMERIC(28, 8)
    CHECK (VALUE >= 0.0);

-- ----------------------------------------------------------------------------
-- H3 Hexagonal Spatial Cells (Topological Riemannian Manifold)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_h3_cells (
    cell_id VARCHAR(15) PRIMARY KEY,                    -- H3 Index as 15-char hex string
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    centroid_lat wgs84_latitude NOT NULL,
    centroid_lon wgs84_longitude NOT NULL,
    boundary_wkt TEXT,                                  -- Well-Known Text geometry representation
    surface_area_m2 NUMERIC(18, 4) NOT NULL CHECK (surface_area_m2 > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spatial_h3_cells_coords 
    ON spatial_h3_cells (centroid_lat, centroid_lon);

-- ----------------------------------------------------------------------------
-- Spatial Adjacency Edges (Manifold Advection & Neighbor Graph)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_adjacency_edges (
    edge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_cell_id VARCHAR(15) NOT NULL REFERENCES spatial_h3_cells(cell_id) ON DELETE RESTRICT,
    target_cell_id VARCHAR(15) NOT NULL REFERENCES spatial_h3_cells(cell_id) ON DELETE RESTRICT,
    direction_azimuth NUMERIC(6, 3) NOT NULL CHECK (direction_azimuth >= 0.0 AND direction_azimuth < 360.0),
    great_circle_distance_m NUMERIC(14, 4) NOT NULL CHECK (great_circle_distance_m > 0.0),
    conductance_coefficient NUMERIC(12, 6) NOT NULL DEFAULT 1.0 CHECK (conductance_coefficient >= 0.0),
    is_bidirectional BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_non_self_adjacent CHECK (source_cell_id <> target_cell_id),
    CONSTRAINT uq_spatial_adjacency_pair UNIQUE (source_cell_id, target_cell_id)
);

CREATE INDEX IF NOT EXISTS idx_spatial_adjacency_source ON spatial_adjacency_edges (source_cell_id);
CREATE INDEX IF NOT EXISTS idx_spatial_adjacency_target ON spatial_adjacency_edges (target_cell_id);

-- ----------------------------------------------------------------------------
-- Spatial Coordinate Boundary Audit Log
-- Tracks IEEE 754 anomalies, boundary overflows, and epsilon-clamped inputs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_coordinate_audit (
    audit_id BIGSERIAL PRIMARY KEY,
    invocation_context VARCHAR(128) NOT NULL,           -- e.g., 'H3AdjacencyService.getGreatCircleDistance'
    raw_latitude NUMERIC,
    raw_longitude NUMERIC,
    is_finite BOOLEAN NOT NULL,
    is_nan BOOLEAN NOT NULL,
    epsilon_applied NUMERIC(10, 9) DEFAULT 0.000000001,
    clamped BOOLEAN NOT NULL DEFAULT FALSE,
    validation_status VARCHAR(32) NOT NULL 
        CHECK (validation_status IN ('VALID', 'CLAMPED', 'REJECTED_OUT_OF_BOUNDS', 'REJECTED_NON_FINITE')),
    error_message TEXT,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spatial_coord_audit_status ON spatial_coordinate_audit (validation_status, reported_at);

-- ----------------------------------------------------------------------------
-- Cell Thermodynamic State Tensors (Conserved Scalar Stocks)
-- First Law: Mass & Energy State per Spatial Cell
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cell_thermodynamic_tensors (
    tensor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_id VARCHAR(15) NOT NULL REFERENCES spatial_h3_cells(cell_id) ON DELETE RESTRICT,
    epoch_timestamp TIMESTAMPTZ NOT NULL,
    mass_carbon_kg conserved_mass_kg NOT NULL DEFAULT 0.0,
    mass_nitrogen_kg conserved_mass_kg NOT NULL DEFAULT 0.0,
    mass_phosphorus_kg conserved_mass_kg NOT NULL DEFAULT 0.0,
    mass_water_kg conserved_mass_kg NOT NULL DEFAULT 0.0,
    thermal_energy_joules thermodynamic_joules NOT NULL DEFAULT 0.0,
    temperature_kelvin NUMERIC(8, 4) NOT NULL CHECK (temperature_kelvin > 0.0),
    entropy_j_per_k entropy_joules_per_kelvin NOT NULL DEFAULT 0.0,
    state_tensor_hash BYTEA NOT NULL,                   -- SHA-256 state serialization hash
    CONSTRAINT uq_cell_epoch UNIQUE (cell_id, epoch_timestamp)
);

CREATE INDEX IF NOT EXISTS idx_cell_thermo_epoch ON cell_thermodynamic_tensors (epoch_timestamp);

-- ----------------------------------------------------------------------------
-- Trophic & Physical Spatial Advection Fluxes (Inter-Cell Transfer Ledger)
-- Second Law: Non-negative entropy production on gradient transfers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trophic_spatial_fluxes (
    flux_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edge_id UUID NOT NULL REFERENCES spatial_adjacency_edges(edge_id) ON DELETE RESTRICT,
    epoch_timestamp TIMESTAMPTZ NOT NULL,
    flux_carbon_kg_s NUMERIC(20, 8) NOT NULL DEFAULT 0.0,
    flux_nitrogen_kg_s NUMERIC(20, 8) NOT NULL DEFAULT 0.0,
    flux_phosphorus_kg_s NUMERIC(20, 8) NOT NULL DEFAULT 0.0,
    flux_water_kg_s NUMERIC(20, 8) NOT NULL DEFAULT 0.0,
    heat_flux_watts NUMERIC(24, 6) NOT NULL DEFAULT 0.0,
    entropy_production_rate_w_k NUMERIC(24, 6) NOT NULL CHECK (entropy_production_rate_w_k >= 0.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spatial_fluxes_epoch ON trophic_spatial_fluxes (epoch_timestamp);
CREATE INDEX IF NOT EXISTS idx_spatial_fluxes_edge ON trophic_spatial_fluxes (edge_id);

-- ----------------------------------------------------------------------------
-- Thermodynamic Blockchain Blocks & Cryptographic Seals
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_ledger_blocks (
    block_number BIGSERIAL PRIMARY KEY,
    previous_block_hash BYTEA NOT NULL,
    block_hash BYTEA NOT NULL UNIQUE,
    merkle_state_root BYTEA NOT NULL,                   -- Merkle root of all cell tensors in epoch
    merkle_flux_root BYTEA NOT NULL,                    -- Merkle root of advection fluxes
    total_conserved_mass_kg NUMERIC(32, 8) NOT NULL,
    total_thermal_energy_joules NUMERIC(32, 8) NOT NULL,
    net_entropy_delta_j_per_k NUMERIC(28, 8) NOT NULL CHECK (net_entropy_delta_j_per_k >= 0.0),
    solar_insolation_inflow_joules NUMERIC(32, 8) NOT NULL,
    blackbody_radiation_outflow_joules NUMERIC(32, 8) NOT NULL,
    coordinate_assertions_passed INTEGER NOT NULL CHECK (coordinate_assertions_passed >= 0),
    coordinate_assertions_failed INTEGER NOT NULL CHECK (coordinate_assertions_failed >= 0),
    epoch_start TIMESTAMPTZ NOT NULL,
    epoch_end TIMESTAMPTZ NOT NULL,
    validator_signature BYTEA NOT NULL,
    committed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thermo_block_hash ON thermodynamic_ledger_blocks (block_hash);

-- ----------------------------------------------------------------------------
-- Blockchain Transaction Ledger: Monadic State Transitions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_state_transitions (
    tx_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_number BIGINT NOT NULL REFERENCES thermodynamic_ledger_blocks(block_number) ON DELETE RESTRICT,
    cell_id VARCHAR(15) NOT NULL REFERENCES spatial_h3_cells(cell_id) ON DELETE RESTRICT,
    origin_centroid_lat wgs84_latitude NOT NULL,
    origin_centroid_lon wgs84_longitude NOT NULL,
    transition_type VARCHAR(64) NOT NULL,               -- e.g., 'SpatialMonad.updateCentroid', 'AdvectiveTransfer'
    mass_delta_kg NUMERIC(24, 8) NOT NULL,
    energy_delta_joules NUMERIC(24, 8) NOT NULL,
    entropy_generated_j_k NUMERIC(24, 8) NOT NULL CHECK (entropy_generated_j_k >= 0.0),
    tx_signature BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spatial_state_tx_block ON spatial_state_transitions (block_number);
CREATE INDEX IF NOT EXISTS idx_spatial_state_tx_cell ON spatial_state_transitions (cell_id);