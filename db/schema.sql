-- Web of Life: Planetary Thermodynamic Blockchain & Spatial Simulation Schema
-- Architecture Specification: Sprint 095 - Aperture-7 Class III Coordinate Rotation & Spatial Flux Monad

-- Extensions for high-precision geospatial and cryptographic hashing
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enum types for thermodynamic stock categories and spatial coordinate classifications
DO $$ BEGIN
    CREATE TYPE h3_grid_class AS ENUM ('CLASS_II', 'CLASS_III');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE spatial_flux_vector_type AS ENUM ('ENERGY_W_M2', 'MASS_KG_M2_S', 'EXERGY_DISSIPATION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE stock_medium_type AS ENUM ('THERMAL', 'HYDROLOGIC', 'CARBON', 'NUTRIENT_PHOSPHORUS', 'NUTRIENT_NITROGEN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------------------------
-- 1. H3 Discrete Global Grid System (DGGS) Resolution Hierarchy & Topology
-- ------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_resolutions (
    resolution SMALLINT PRIMARY KEY CHECK (resolution BETWEEN 0 AND 15),
    grid_class h3_grid_class NOT NULL,
    aperture_ratio NUMERIC(10, 4) NOT NULL DEFAULT 7.0000,
    hex_area_km2 NUMERIC(18, 6) NOT NULL,
    hex_edge_km NUMERIC(18, 6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed static metadata for H3 resolutions 0 through 15
INSERT INTO h3_resolutions (resolution, grid_class, aperture_ratio, hex_area_km2, hex_edge_km)
VALUES
    (0,  'CLASS_II',  7.0, 4357449.416078, 1107.712591),
    (1,  'CLASS_III', 7.0, 609788.441794,  418.676005),
    (2,  'CLASS_II',  7.0, 86801.780370,   158.244656),
    (3,  'CLASS_III', 7.0, 12393.434862,   59.784906),
    (4,  'CLASS_II',  7.0, 1770.386266,    22.593396),
    (5,  'CLASS_III', 7.0, 252.909338,     8.538476),
    (6,  'CLASS_II',  7.0, 36.129910,      3.226834),
    (7,  'CLASS_III', 7.0, 5.161416,       1.219597),
    (8,  'CLASS_II',  7.0, 0.737345,       0.460978),
    (9,  'CLASS_III', 7.0, 0.105335,       0.174217),
    (10, 'CLASS_II',  7.0, 0.015048,       0.065847),
    (11, 'CLASS_III', 7.0, 0.002150,       0.024888),
    (12, 'CLASS_II',  7.0, 0.000307,       0.009406),
    (13, 'CLASS_III', 7.0, 0.000044,       0.003555),
    (14, 'CLASS_II',  7.0, 0.000006,       0.001344),
    (15, 'CLASS_III', 7.0, 0.000001,       0.000508)
ON CONFLICT (resolution) DO UPDATE SET
    grid_class = EXCLUDED.grid_class,
    aperture_ratio = EXCLUDED.aperture_ratio;

-- ------------------------------------------------------------------------------------------------
-- 2. Spatial Index & Monad State Tensors
-- ------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_cells (
    h3_index BIGINT PRIMARY KEY,
    resolution SMALLINT NOT NULL REFERENCES h3_resolutions(resolution),
    centroid GEOMETRY(POINT, 4326) NOT NULL,
    surface_temperature_k NUMERIC(8, 4) NOT NULL CHECK (surface_temperature_k >= 0.0),
    exergy_potential_joules NUMERIC(24, 6) NOT NULL DEFAULT 0.0 CHECK (exergy_potential_joules >= 0.0),
    entropy_generation_rate_w_k NUMERIC(20, 8) NOT NULL DEFAULT 0.0 CHECK (entropy_generation_rate_w_k >= 0.0),
    last_block_height BIGINT NOT NULL DEFAULT 0,
    state_merkle_root BYTEA NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_h3_cells_resolution ON h3_cells(resolution);
CREATE INDEX IF NOT EXISTS idx_h3_cells_centroid ON h3_cells USING GIST(centroid);

-- ------------------------------------------------------------------------------------------------
-- 3. Aperture-7 Class III Coordinate Rotation Transformations
-- ------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_rotation_transforms (
    transform_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    start_resolution SMALLINT NOT NULL REFERENCES h3_resolutions(resolution),
    target_resolution SMALLINT NOT NULL REFERENCES h3_resolutions(resolution),
    class_iii_step_count INT NOT NULL,
    raw_rotation_angle_rad NUMERIC(16, 12) NOT NULL,
    normalized_rotation_angle_rad NUMERIC(16, 12) NOT NULL,
    cos_theta NUMERIC(16, 12) NOT NULL,
    sin_theta NUMERIC(16, 12) NOT NULL,
    orthogonality_check NUMERIC(16, 12) NOT NULL DEFAULT 1.000000000000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_res_transition UNIQUE (start_resolution, target_resolution),
    CONSTRAINT chk_orthogonality CHECK (orthogonality_check BETWEEN 0.999999999990 AND 1.000000000010),
    CONSTRAINT chk_normalized_rad CHECK (normalized_rotation_angle_rad >= -PI() AND normalized_rotation_angle_rad < PI())
);

-- Pre-populate transition lookup table using the invariant APERTURE_7_ROTATION_RAD: 0.3334731722918321 rad
CREATE OR REPLACE FUNCTION compute_class_iii_steps(start_res INT, target_res INT)
RETURNS INT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    step_count INT := 0;
    r INT;
    res_min INT := LEAST(start_res, target_res);
    res_max INT := GREATEST(start_res, target_res);
BEGIN
    FOR r IN (res_min + 1)..res_max LOOP
        -- An odd resolution index corresponds to Class III
        IF (r % 2) = 1 THEN
            step_count := step_count + 1;
        END IF;
    END LOOP;

    IF start_res > target_res THEN
        RETURN -step_count;
    ELSE
        RETURN step_count;
    END IF;
END;
$$;

DO $$
DECLARE
    s SMALLINT;
    t SMALLINT;
    steps INT;
    raw_rad NUMERIC(16, 12);
    norm_rad NUMERIC(16, 12);
    ap7_rad CONSTANT NUMERIC(16, 12) := 0.3334731722918321;
    pi_val CONSTANT NUMERIC(16, 12) := 3.1415926535897932;
    two_pi CONSTANT NUMERIC(16, 12) := 6.2831853071795864;
    cos_t NUMERIC(16, 12);
    sin_t NUMERIC(16, 12);
BEGIN
    FOR s IN 0..15 LOOP
        FOR t IN 0..15 LOOP
            steps := compute_class_iii_steps(s, t);
            raw_rad := steps * ap7_rad;
            -- Modular normalization to [-PI, PI)
            norm_rad := raw_rad - (two_pi * FLOOR((raw_rad + pi_val) / two_pi));
            cos_t := COS(norm_rad);
            sin_t := SIN(norm_rad);

            INSERT INTO h3_rotation_transforms (
                start_resolution,
                target_resolution,
                class_iii_step_count,
                raw_rotation_angle_rad,
                normalized_rotation_angle_rad,
                cos_theta,
                sin_theta,
                orthogonality_check
            ) VALUES (
                s,
                t,
                steps,
                raw_rad,
                norm_rad,
                cos_t,
                sin_t,
                (cos_t * cos_t) + (sin_t * sin_t)
            )
            ON CONFLICT (start_resolution, target_resolution) DO UPDATE SET
                class_iii_step_count = EXCLUDED.class_iii_step_count,
                raw_rotation_angle_rad = EXCLUDED.raw_rotation_angle_rad,
                normalized_rotation_angle_rad = EXCLUDED.normalized_rotation_angle_rad,
                cos_theta = EXCLUDED.cos_theta,
                sin_theta = EXCLUDED.sin_theta,
                orthogonality_check = EXCLUDED.orthogonality_check;
        END LOOP;
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------------------------
-- 4. Thermodynamic Blockchain: Blocks, Transactions & Spatial Flux Ledgers
-- ------------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash BYTEA NOT NULL UNIQUE,
    parent_hash BYTEA NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    total_solar_insolation_joules NUMERIC(30, 6) NOT NULL,
    total_thermal_dissipation_joules NUMERIC(30, 6) NOT NULL,
    net_entropy_production_jk NUMERIC(30, 8) NOT NULL CHECK (net_entropy_production_jk >= 0.0),
    spatial_transformation_merkle_root BYTEA NOT NULL,
    validator_signature BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spatial_flux_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL REFERENCES thermodynamic_blocks(block_height) ON DELETE CASCADE,
    source_h3_index BIGINT NOT NULL REFERENCES h3_cells(h3_index),
    target_h3_index BIGINT NOT NULL REFERENCES h3_cells(h3_index),
    flux_type spatial_flux_vector_type NOT NULL,
    medium_type stock_medium_type NOT NULL,
    
    -- Coordinate Frame Transformation tracking
    source_resolution SMALLINT NOT NULL REFERENCES h3_resolutions(resolution),
    target_resolution SMALLINT NOT NULL REFERENCES h3_resolutions(resolution),
    class_iii_step_count INT NOT NULL,
    rotation_angle_rad NUMERIC(16, 12) NOT NULL,

    -- Pre-rotation Vector components (Source coordinate frame)
    source_vector_u NUMERIC(18, 8) NOT NULL,
    source_vector_v NUMERIC(18, 8) NOT NULL,
    source_magnitude NUMERIC(18, 8) NOT NULL,

    -- Post-rotation Vector components (Target coordinate frame)
    transformed_vector_u NUMERIC(18, 8) NOT NULL,
    transformed_vector_v NUMERIC(18, 8) NOT NULL,
    transformed_magnitude NUMERIC(18, 8) NOT NULL,

    -- First Law Thermodynamic Invariant: ||R J|| = ||J||
    norm_divergence NUMERIC(18, 12) NOT NULL DEFAULT 0.0,
    
    -- Second Law Dissipation & Local Exergy Loss: sigma = -(1/T^2) J_q . grad(T) >= 0
    entropy_generation_sigma NUMERIC(24, 10) NOT NULL CHECK (entropy_generation_sigma >= 0.0),
    temperature_gradient_k_m NUMERIC(14, 6) NOT NULL,

    tx_signature BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_first_law_conservation CHECK (
        ABS(source_magnitude - transformed_magnitude) <= 1e-6
    )
);

CREATE INDEX IF NOT EXISTS idx_spatial_flux_tx_block ON spatial_flux_transactions(block_height);
CREATE INDEX IF NOT EXISTS idx_spatial_flux_tx_source ON spatial_flux_transactions(source_h3_index);
CREATE INDEX IF NOT EXISTS idx_spatial_flux_tx_target ON spatial_flux_transactions(target_h3_index);
CREATE INDEX IF NOT EXISTS idx_spatial_flux_tx_res_pair ON spatial_flux_transactions(source_resolution, target_resolution);

-- ------------------------------------------------------------------------------------------------
-- 5. Thermodynamic Balance & Invariant Verification Trigger
-- ------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION verify_spatial_flux_invariants()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    expected_steps INT;
    expected_rotation NUMERIC(16, 12);
    calculated_mag NUMERIC(18, 8);
BEGIN
    -- Query rotation transformation parameters
    SELECT class_iii_step_count, normalized_rotation_angle_rad
    INTO expected_steps, expected_rotation
    FROM h3_rotation_transforms
    WHERE start_resolution = NEW.source_resolution
      AND target_resolution = NEW.target_resolution;

    IF NEW.class_iii_step_count != expected_steps THEN
        RAISE EXCEPTION 'Invalid class III step count: expected %, received %',
            expected_steps, NEW.class_iii_step_count;
    END IF;

    IF ABS(NEW.rotation_angle_rad - expected_rotation) > 1e-9 THEN
        RAISE EXCEPTION 'Rotation angle mismatch for resolution % -> %: expected % rad, received % rad',
            NEW.source_resolution, NEW.target_resolution, expected_rotation, NEW.rotation_angle_rad;
    END IF;

    -- Verify vector magnitude conservation
    calculated_mag := SQRT((NEW.transformed_vector_u ^ 2) + (NEW.transformed_vector_v ^ 2));
    IF ABS(calculated_mag - NEW.source_magnitude) > 1e-6 THEN
        RAISE EXCEPTION 'First Law violation: Vector magnitude changed from % to % under SO(2) rotation',
            NEW.source_magnitude, calculated_mag;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verify_spatial_flux_invariants ON spatial_flux_transactions;
CREATE TRIGGER trg_verify_spatial_flux_invariants
BEFORE INSERT OR UPDATE ON spatial_flux_transactions
FOR EACH ROW EXECUTE FUNCTION verify_spatial_flux_invariants();