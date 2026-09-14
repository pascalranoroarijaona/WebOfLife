-- ============================================================================
-- Web of Life: Planetary Thermodynamic Ledger & Spatial State Schema
-- Sprint 055: Angular Normalization Wrapper (normalizeAngleRadians) & Geodesic Advection
-- ============================================================================

-- Extensions for high-precision arithmetic, spatial geometries, and cryptographic security
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Domain definitions for angular and spatial coordinates
-- PI constant: 3.14159265358979323846
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'normalized_radians') THEN
        CREATE DOMAIN normalized_radians AS DOUBLE PRECISION
            CHECK (VALUE >= -3.14159265358979323846 AND VALUE < 3.14159265358979323846);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'h3_index_varchar') THEN
        CREATE DOMAIN h3_index_varchar AS VARCHAR(16)
            CHECK (VALUE ~ '^[0-9a-fA-F]{15,16}$');
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic Blockchain Ledger: Blocks & State Hashes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash VARCHAR(64) NOT NULL UNIQUE,
    previous_hash VARCHAR(64) NOT NULL,
    merkle_state_root VARCHAR(64) NOT NULL,
    thermodynamic_entropy_flux DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    kinetic_energy_conserved BOOLEAN NOT NULL DEFAULT TRUE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_blockchain_entropy_flux_non_negative CHECK (thermodynamic_entropy_flux >= 0.0)
);

CREATE INDEX IF NOT EXISTS idx_blockchain_blocks_hash ON blockchain_blocks(block_hash);

-- ----------------------------------------------------------------------------
-- 2. Hexagonal DGGS Cell Topology & Spatial Index
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_h3_cells (
    cell_index h3_index_varchar PRIMARY KEY,
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    centroid_lat DOUBLE PRECISION NOT NULL CHECK (centroid_lat BETWEEN -90.0 AND 90.0),
    centroid_lon DOUBLE PRECISION NOT NULL CHECK (centroid_lon BETWEEN -180.0 AND 180.0),
    altitude_meters DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spatial_h3_cells_coords ON spatial_h3_cells(centroid_lat, centroid_lon);

-- ----------------------------------------------------------------------------
-- 3. Spherical Hexagonal Adjacency & Normalized Angular Bearings
-- Implements RFC 055: canonical half-open domain [-π, π)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_adjacency_bearings (
    origin_cell h3_index_varchar NOT NULL REFERENCES spatial_h3_cells(cell_index) ON DELETE RESTRICT,
    target_cell h3_index_varchar NOT NULL REFERENCES spatial_h3_cells(cell_index) ON DELETE RESTRICT,
    raw_bearing_radians DOUBLE PRECISION NOT NULL,
    normalized_bearing_radians normalized_radians NOT NULL,
    geodesic_distance_meters DOUBLE PRECISION NOT NULL CHECK (geodesic_distance_meters > 0.0),
    is_canonical_neighbor BOOLEAN NOT NULL DEFAULT TRUE,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (origin_cell, target_cell),
    CONSTRAINT chk_no_self_adjacency CHECK (origin_cell <> target_cell)
);

CREATE INDEX IF NOT EXISTS idx_spatial_adjacency_origin ON spatial_adjacency_bearings(origin_cell);
CREATE INDEX IF NOT EXISTS idx_spatial_adjacency_target ON spatial_adjacency_bearings(target_cell);
CREATE INDEX IF NOT EXISTS idx_spatial_adjacency_norm_bearing ON spatial_adjacency_bearings(normalized_bearing_radians);

-- ----------------------------------------------------------------------------
-- 4. Spatial Monad Vector Field & Thermodynamic Fluxes
-- Advective transport decomposing momentum & kinetic energy along normalized bearings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hexagonal_advection_fluxes (
    flux_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(block_height) ON DELETE CASCADE,
    origin_cell h3_index_varchar NOT NULL,
    target_cell h3_index_varchar NOT NULL,
    velocity_magnitude DOUBLE PRECISION NOT NULL CHECK (velocity_magnitude >= 0.0),
    advection_bearing_radians normalized_radians NOT NULL,
    velocity_u DOUBLE PRECISION NOT NULL, -- Longitudinal component (u = |v| * cos(θ))
    velocity_v DOUBLE PRECISION NOT NULL, -- Latitudinal component (v = |v| * sin(θ))
    mass_flux_kg_per_sec DOUBLE PRECISION NOT NULL CHECK (mass_flux_kg_per_sec >= 0.0),
    kinetic_energy_flux_watts DOUBLE PRECISION NOT NULL CHECK (kinetic_energy_flux_watts >= 0.0),
    dissipation_entropy_delta DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (dissipation_entropy_delta >= 0.0),
    FOREIGN KEY (origin_cell, target_cell) REFERENCES spatial_adjacency_bearings(origin_cell, target_cell),
    CONSTRAINT chk_cartesian_decomposition CHECK (
        abs((velocity_u * velocity_u + velocity_v * velocity_v) - (velocity_magnitude * velocity_magnitude)) < 1e-9
    )
);

CREATE INDEX IF NOT EXISTS idx_hex_fluxes_block ON hexagonal_advection_fluxes(block_height);
CREATE INDEX IF NOT EXISTS idx_hex_fluxes_cells ON hexagonal_advection_fluxes(origin_cell, target_cell);

-- ----------------------------------------------------------------------------
-- 5. Thermodynamic Stock Ledgers (First & Second Law Verification)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_stock_transactions (
    tx_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(block_height) ON DELETE CASCADE,
    cell_index h3_index_varchar NOT NULL REFERENCES spatial_h3_cells(cell_index),
    internal_energy_joules DOUBLE PRECISION NOT NULL,
    enthalpy_joules DOUBLE PRECISION NOT NULL,
    entropy_joules_per_kelvin DOUBLE PRECISION NOT NULL CHECK (entropy_joules_per_kelvin >= 0.0),
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin > 0.0),
    pressure_pascals DOUBLE PRECISION NOT NULL CHECK (pressure_pascals >= 0.0),
    mass_kg DOUBLE PRECISION NOT NULL CHECK (mass_kg >= 0.0),
    tx_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thermo_tx_cell_block ON thermodynamic_stock_transactions(cell_index, block_height);

-- ----------------------------------------------------------------------------
-- 6. Angular Normalization Verification Function (Mirroring TypeScript RFC)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_angle_radians(radians DOUBLE PRECISION)
RETURNS DOUBLE PRECISION AS $$
DECLARE
    two_pi CONSTANT DOUBLE PRECISION := 6.28318530717958647692;
    pi_val CONSTANT DOUBLE PRECISION := 3.14159265358979323846;
    ang DOUBLE PRECISION;
BEGIN
    IF radians IS NULL OR radians = 'NaN'::DOUBLE PRECISION OR radians = 'Infinity'::DOUBLE PRECISION OR radians = '-Infinity'::DOUBLE PRECISION THEN
        RETURN radians;
    END IF;

    -- Shift domain to [0, 2pi), apply modulo, and shift back to [-pi, pi)
    ang := (radians + pi_val) - (two_pi * FLOOR((radians + pi_val) / two_pi));
    
    -- Remainder boundary adjustment
    ang := ang - pi_val;
    IF ang >= pi_val THEN
        ang := -pi_val;
    END IF;

    RETURN ang;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;