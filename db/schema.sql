-- ============================================================================
-- Web of Life: Planetary Simulation & Thermodynamic Blockchain Schema
-- Sprint 054: Longitudinal Boundary Wrapping & Antimeridian Coordinate Normalization
-- ============================================================================

-- Extensions for spatial computations and cryptographic hashing
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Enum types for spatial navigation and transport dynamics
DO $$ BEGIN
    CREATE TYPE hex_direction AS ENUM (
        'DIRECTION_CENTER',
        'DIRECTION_NORTH_EAST',
        'DIRECTION_EAST',
        'DIRECTION_SOUTH_EAST',
        'DIRECTION_SOUTH_WEST',
        'DIRECTION_WEST',
        'DIRECTION_NORTH_WEST'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE antimeridian_crossing_type AS ENUM (
        'EAST_TO_WEST',     -- +179.999 -> -179.999 (wrapped across 180.0)
        'WEST_TO_EAST',     -- -180.000 -> +179.999 (wrapped across -180.0)
        'STATIONARY_WRAPPED'-- Normalization of out-of-range accumulation
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- Canonical H3 DGGS Cell Spatial Registry
-- Enforces canonical half-open longitude range [-180.0, 180.0)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_cell_registry (
    h3_index VARCHAR(15) PRIMARY KEY,
    resolution INTEGER NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    latitude_deg DOUBLE PRECISION NOT NULL CHECK (latitude_deg >= -90.0 AND latitude_deg <= 90.0),
    longitude_deg DOUBLE PRECISION NOT NULL CHECK (longitude_deg >= -180.0 AND longitude_deg < 180.0),
    area_km2 DOUBLE PRECISION NOT NULL CHECK (area_km2 > 0.0),
    boundary_polygon JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_h3_cell_lat_lon 
    ON h3_cell_registry (latitude_deg, longitude_deg);

CREATE INDEX IF NOT EXISTS idx_h3_cell_res 
    ON h3_cell_registry (resolution);

-- ----------------------------------------------------------------------------
-- Coordinate Wrapping & Geodesic Advection Audit Log
-- Records boundary wrapping operations and enforces mathematical invariance
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_coordinate_normalizations (
    normalization_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_longitude_deg DOUBLE PRECISION NOT NULL,
    canonical_longitude_deg DOUBLE PRECISION NOT NULL CHECK (canonical_longitude_deg >= -180.0 AND canonical_longitude_deg < 180.0),
    raw_latitude_deg DOUBLE PRECISION NOT NULL CHECK (raw_latitude_deg >= -90.0 AND raw_latitude_deg <= 90.0),
    canonical_latitude_deg DOUBLE PRECISION NOT NULL CHECK (canonical_latitude_deg >= -90.0 AND canonical_latitude_deg <= 90.0),
    winding_number_k INTEGER NOT NULL,
    crossed_antimeridian BOOLEAN NOT NULL DEFAULT FALSE,
    crossing_type antimeridian_crossing_type,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_canonical_longitude_half_open 
        CHECK (canonical_longitude_deg >= -180.0 AND canonical_longitude_deg < 180.0),
    CONSTRAINT chk_winding_number_consistency
        CHECK (raw_longitude_deg = canonical_longitude_deg + (winding_number_k * 360.0) 
               OR abs(raw_longitude_deg - (canonical_longitude_deg + (winding_number_k * 360.0))) < 1e-9)
);

CREATE INDEX IF NOT EXISTS idx_norm_canonical_lon 
    ON spatial_coordinate_normalizations (canonical_longitude_deg);

CREATE INDEX IF NOT EXISTS idx_norm_crossed_antimeridian 
    ON spatial_coordinate_normalizations (crossed_antimeridian) 
    WHERE crossed_antimeridian IS TRUE;

-- ----------------------------------------------------------------------------
-- Antimeridian Mass & Energy Transport Ledger (Thermodynamic Monad Stocks)
-- Enforces 1st & 2nd Laws during continuous boundary advection
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS antimeridian_transport_ledger (
    transport_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tick_number BIGINT NOT NULL,
    origin_cell VARCHAR(15) NOT NULL REFERENCES h3_cell_registry(h3_index),
    destination_cell VARCHAR(15) NOT NULL REFERENCES h3_cell_registry(h3_index),
    crossing_type antimeridian_crossing_type NOT NULL,
    advected_mass_kg DOUBLE PRECISION NOT NULL CHECK (advected_mass_kg >= 0.0),
    advected_energy_joules DOUBLE PRECISION NOT NULL CHECK (advected_energy_joules >= 0.0),
    entropy_generated_j_per_k DOUBLE PRECISION NOT NULL CHECK (entropy_generated_j_per_k >= 0.0),
    origin_lon_pre_wrap DOUBLE PRECISION NOT NULL,
    dest_lon_post_wrap DOUBLE PRECISION NOT NULL CHECK (dest_lon_post_wrap >= -180.0 AND dest_lon_post_wrap < 180.0),
    mass_conservation_delta DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    energy_conservation_delta DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_mass_conservation_zero 
        CHECK (abs(mass_conservation_delta) < 1e-12),
    CONSTRAINT chk_energy_conservation_zero 
        CHECK (abs(energy_conservation_delta) < 1e-12),
    CONSTRAINT chk_second_law_entropy 
        CHECK (entropy_generated_j_per_k >= 0.0)
);

CREATE INDEX IF NOT EXISTS idx_transport_tick 
    ON antimeridian_transport_ledger (tick_number);

CREATE INDEX IF NOT EXISTS idx_transport_origin_dest 
    ON antimeridian_transport_ledger (origin_cell, destination_cell);

-- ----------------------------------------------------------------------------
-- Blockchain Transaction Ledger: Spatial State Monad Transitions
-- Anchors thermodynamic spatial state proofs into consensus blocks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_block_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL,
    block_hash VARCHAR(64) NOT NULL,
    previous_block_hash VARCHAR(64) NOT NULL,
    h3_index VARCHAR(15) NOT NULL REFERENCES h3_cell_registry(h3_index),
    pre_state_hash VARCHAR(64) NOT NULL,
    post_state_hash VARCHAR(64) NOT NULL,
    total_biomass_kg DOUBLE PRECISION NOT NULL CHECK (total_biomass_kg >= 0.0),
    total_water_mass_kg DOUBLE PRECISION NOT NULL CHECK (total_water_mass_kg >= 0.0),
    total_internal_energy_j DOUBLE PRECISION NOT NULL CHECK (total_internal_energy_j >= 0.0),
    total_entropy_j_per_k DOUBLE PRECISION NOT NULL CHECK (total_entropy_j_per_k >= 0.0),
    antimeridian_wrap_count INTEGER NOT NULL DEFAULT 0 CHECK (antimeridian_wrap_count >= 0),
    merkle_root VARCHAR(64) NOT NULL,
    cryptographic_signature BYTEA NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spatial_block_height 
    ON spatial_block_transactions (block_height);

CREATE INDEX IF NOT EXISTS idx_spatial_block_h3 
    ON spatial_block_transactions (h3_index);

-- ----------------------------------------------------------------------------
-- Automated Constraint Function: Coordinate Sanitization & Canonical Invariant
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sanitize_and_validate_longitude()
RETURNS TRIGGER AS $$
DECLARE
    v_raw DOUBLE PRECISION;
    v_wrapped DOUBLE PRECISION;
    v_normalized DOUBLE PRECISION;
BEGIN
    v_raw := NEW.longitude_deg;
    
    -- Dual-modulo projection: [ ((lon + 180) % 360) + 360 ] % 360 - 180
    v_wrapped := (((v_raw + 180.0) % 360.0) + 360.0) % 360.0;
    v_normalized := v_wrapped - 180.0;
    
    -- Negative-zero suppression
    IF v_normalized = 0.0 THEN
        v_normalized := 0.0;
    END IF;

    NEW.longitude_deg := v_normalized;
    
    -- Strict domain assertion
    IF NEW.longitude_deg < -180.0 OR NEW.longitude_deg >= 180.0 THEN
        RAISE EXCEPTION 'Fatal invariant violation: Canonical longitude % out of bounds [-180, 180)', NEW.longitude_deg;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sanitize_cell_longitude
    BEFORE INSERT OR UPDATE OF longitude_deg ON h3_cell_registry
    FOR EACH ROW
    EXECUTE FUNCTION sanitize_and_validate_longitude();