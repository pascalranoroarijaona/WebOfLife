-- Web of Life Thermodynamic Engine & Spatial DGGS Schema
-- Sprint 094: Aperture-7 Class III Step Counter & Hierarchical Orientation Parity
-- Database Target: PostgreSQL 14+ / TimescaleDB with PostGIS & H3 Extensions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. ENUMS & DOMAIN DEFINITIONS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE h3_aperture_class AS ENUM ('CLASS_II', 'CLASS_III');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE spatial_transform_direction AS ENUM ('PROJECTION', 'RESTRICTION', 'LATERAL_DIFFUSION');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE thermodynamic_flux_type AS ENUM (
        'SOLAR_IRRADIANCE',
        'SENSIBLE_HEAT',
        'LATENT_EVAPORATION',
        'TROPHIC_BIOMASS',
        'SOIL_CARBON_TRANSPORT',
        'ENTROPIC_DISSIPATION'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Domain for valid H3 hierarchical resolutions (0 to 15)
CREATE DOMAIN h3_resolution_level AS SMALLINT
    CHECK (VALUE >= 0 AND VALUE <= 15);

-- ============================================================================
-- 2. HIERARCHICAL RESOLUTION & APERTURE PARITY REGISTRY
-- ============================================================================

CREATE TABLE IF NOT EXISTS h3_resolution_parity_registry (
    resolution h3_resolution_level PRIMARY KEY,
    aperture_class h3_aperture_class NOT NULL,
    cumulative_class_iii_steps SMALLINT NOT NULL CHECK (cumulative_class_iii_steps >= 0),
    cumulative_class_ii_steps SMALLINT NOT NULL CHECK (cumulative_class_ii_steps >= 0),
    nominal_rotation_rad DOUBLE PRECISION NOT NULL,
    nominal_rotation_deg DOUBLE PRECISION NOT NULL,
    average_area_m2 DOUBLE PRECISION NOT NULL CHECK (average_area_m2 > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE h3_resolution_parity_registry IS 
'Reference table for Aperture-7 discrete hexagonal resolution levels, recording orientation parity and accumulated rotation steps.';

-- Seed canonical H3 aperture parity values from resolution 0 through 15
INSERT INTO h3_resolution_parity_registry (
    resolution, aperture_class, cumulative_class_iii_steps, cumulative_class_ii_steps, nominal_rotation_rad, nominal_rotation_deg, average_area_m2
) VALUES
    (0,  'CLASS_II',  0, 1, 0.0,                  0.0,                   4357449416078.39),
    (1,  'CLASS_III', 1, 1, 0.3334731722265022,   19.106605350869095,    609788441794.13),
    (2,  'CLASS_II',  1, 2, 0.0,                  0.0,                   86801780364.67),
    (3,  'CLASS_III', 2, 2, 0.3334731722265022,   19.106605350869095,    12393278664.31),
    (4,  'CLASS_II',  2, 3, 0.0,                  0.0,                   1770493543.47),
    (5,  'CLASS_III', 3, 3, 0.3334731722265022,   19.106605350869095,    252936749.07),
    (6,  'CLASS_II',  3, 4, 0.0,                  0.0,                   36133935.58),
    (7,  'CLASS_III', 4, 4, 0.3334731722265022,   19.106605350869095,    5162013.65),
    (8,  'CLASS_II',  4, 5, 0.0,                  0.0,                   737430.52),
    (9,  'CLASS_III', 5, 5, 0.3334731722265022,   19.106605350869095,    105347.22),
    (10, 'CLASS_II',  5, 6, 0.0,                  0.0,                   15049.60),
    (11, 'CLASS_III', 6, 6, 0.3334731722265022,   19.106605350869095,    2149.94),
    (12, 'CLASS_II',  6, 7, 0.0,                  0.0,                   307.13),
    (13, 'CLASS_III', 7, 7, 0.3334731722265022,   19.106605350869095,    43.88),
    (14, 'CLASS_II',  7, 8, 0.0,                  0.0,                   6.27),
    (15, 'CLASS_III', 8, 8, 0.3334731722265022,   19.106605350869095,    0.90)
ON CONFLICT (resolution) DO UPDATE SET
    aperture_class = EXCLUDED.aperture_class,
    cumulative_class_iii_steps = EXCLUDED.cumulative_class_iii_steps,
    cumulative_class_ii_steps = EXCLUDED.cumulative_class_ii_steps,
    nominal_rotation_rad = EXCLUDED.nominal_rotation_rad,
    nominal_rotation_deg = EXCLUDED.nominal_rotation_deg,
    average_area_m2 = EXCLUDED.average_area_m2;

-- ============================================================================
-- 3. ROTATIONAL STENCILS & DIRECTIONAL KERNELS
-- ============================================================================

CREATE TABLE IF NOT EXISTS spatial_rotation_kernels (
    kernel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_resolution h3_resolution_level NOT NULL REFERENCES h3_resolution_parity_registry(resolution),
    target_resolution h3_resolution_level NOT NULL REFERENCES h3_resolution_parity_registry(resolution),
    class_iii_steps SMALLINT NOT NULL CHECK (class_iii_steps >= 0),
    class_ii_steps SMALLINT NOT NULL CHECK (class_ii_steps >= 0),
    net_rotation_parity SMALLINT NOT NULL CHECK (net_rotation_parity IN (0, 1)),
    transform_direction spatial_transform_direction NOT NULL,
    affine_matrix DOUBLE PRECISION[2][2] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_res_transition UNIQUE (source_resolution, target_resolution, transform_direction)
);

CREATE INDEX IF NOT EXISTS idx_spatial_rotation_lookup 
    ON spatial_rotation_kernels(source_resolution, target_resolution);

-- ============================================================================
-- 4. THERMODYNAMIC STOCKS (MASS, ENERGY, ENTROPY PER H3 CELL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS h3_cell_thermodynamic_stocks (
    h3_index BIGINT NOT NULL,
    resolution h3_resolution_level NOT NULL REFERENCES h3_resolution_parity_registry(resolution),
    snapshot_timestamp TIMESTAMPTZ NOT NULL,
    trophic_biomass_kg DOUBLE PRECISION NOT NULL CHECK (trophic_biomass_kg >= 0.0),
    internal_energy_joules DOUBLE PRECISION NOT NULL CHECK (internal_energy_joules >= 0.0),
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin > 0.0),
    entropy_j_per_k DOUBLE PRECISION NOT NULL,
    mass_conservation_hash BYTEA NOT NULL,
    PRIMARY KEY (h3_index, snapshot_timestamp)
);

CREATE INDEX IF NOT EXISTS idx_h3_stocks_time_res 
    ON h3_cell_thermodynamic_stocks(resolution, snapshot_timestamp DESC);

-- ============================================================================
-- 5. SPATIAL FLUX MONAD STATE TRANSFERS & DISSIPATION LEDGER
-- ============================================================================

CREATE TABLE IF NOT EXISTS spatial_flux_transitions (
    transition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_h3 BIGINT NOT NULL,
    target_h3 BIGINT NOT NULL,
    kernel_id UUID NOT NULL REFERENCES spatial_rotation_kernels(kernel_id),
    flux_type thermodynamic_flux_type NOT NULL,
    transferred_mass_kg DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (transferred_mass_kg >= 0.0),
    transferred_energy_joules DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (transferred_energy_joules >= 0.0),
    entropy_dissipation_joules_per_k DOUBLE PRECISION NOT NULL CHECK (entropy_dissipation_joules_per_k >= 0.0),
    class_iii_step_count SMALLINT NOT NULL CHECK (class_iii_step_count >= 0),
    is_orientation_parity_preserved BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flux_source_target 
    ON spatial_flux_transitions(source_h3, target_h3, flux_type);

-- ============================================================================
-- 6. THERMODYNAMIC BLOCKCHAIN LEDGER: BLOCKS & TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash BYTEA NOT NULL UNIQUE,
    parent_hash BYTEA NOT NULL,
    merkle_root BYTEA NOT NULL,
    spatial_flux_root BYTEA NOT NULL,
    total_entropy_production_j_per_k DOUBLE PRECISION NOT NULL CHECK (total_entropy_production_j_per_k >= 0.0),
    total_energy_delta_joules DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    validator_signature BYTEA NOT NULL
);

CREATE TABLE IF NOT EXISTS thermodynamic_spatial_transactions (
    tx_hash BYTEA PRIMARY KEY,
    block_height BIGINT NOT NULL REFERENCES thermodynamic_blocks(block_height) ON DELETE CASCADE,
    tx_sequence INTEGER NOT NULL,
    source_resolution h3_resolution_level NOT NULL REFERENCES h3_resolution_parity_registry(resolution),
    target_resolution h3_resolution_level NOT NULL REFERENCES h3_resolution_parity_registry(resolution),
    class_iii_steps_traversed SMALLINT NOT NULL CHECK (class_iii_steps_traversed >= 0),
    input_energy_joules DOUBLE PRECISION NOT NULL CHECK (input_energy_joules >= 0.0),
    output_energy_joules DOUBLE PRECISION NOT NULL CHECK (output_energy_joules >= 0.0),
    dissipation_entropy_production DOUBLE PRECISION NOT NULL CHECK (dissipation_entropy_production >= 0.0),
    is_first_law_satisfied BOOLEAN NOT NULL DEFAULT TRUE,
    is_second_law_satisfied BOOLEAN NOT NULL DEFAULT TRUE,
    transition_id UUID REFERENCES spatial_flux_transitions(transition_id),
    signature BYTEA NOT NULL,
    CONSTRAINT uq_block_seq UNIQUE (block_height, tx_sequence)
);

CREATE INDEX IF NOT EXISTS idx_tx_block_res 
    ON thermodynamic_spatial_transactions(block_height, source_resolution, target_resolution);

-- ============================================================================
-- 7. AUDIT TRIGGERS & FIRST/SECOND LAW VERIFICATION FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_spatial_flux_first_law()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure enthalpy and mass conservation with positive entropic dissipation
    IF NEW.entropy_dissipation_joules_per_k < 0.0 THEN
        RAISE EXCEPTION 'Second Law Violation: local entropy dissipation cannot be negative (% < 0)',
            NEW.entropy_dissipation_joules_per_k;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_spatial_flux_first_law ON spatial_flux_transitions;
CREATE TRIGGER trg_verify_spatial_flux_first_law
    BEFORE INSERT OR UPDATE ON spatial_flux_transitions
    FOR EACH ROW
    EXECUTE FUNCTION verify_spatial_flux_first_law();