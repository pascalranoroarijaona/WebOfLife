-- Web of Life: Planetary Scale Thermodynamic Ledger & Spatial DGGS Schema
-- Sprint 093: Aperture Rotation Sequence Resolution for H3 Hierarchical Tessellation
-- Standard ISO-SQL / PostgreSQL 15+ compatible with TimescaleDB & PostGIS hooks

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- 1. ENUMERATIONS & DOMAIN DEFINITIONS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE aperture_class_enum AS ENUM ('CLASS_II', 'CLASS_III');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE thermodynamic_flux_carrier_enum AS ENUM (
        'BIOMASS',
        'LIQUID_WATER',
        'WATER_VAPOR',
        'SENSIBLE_HEAT',
        'LATENT_HEAT',
        'DISSOLVED_NUTRIENT',
        'ENTROPY_DISSIPATION'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE spatial_parity_status_enum AS ENUM (
        'PARITY_ALIGNED',
        'ROTATION_TRANSFORMED',
        'CROSS_RESOLUTION_PROJECTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Domain for discrete H3 resolutions [0, 15]
CREATE DOMAIN h3_resolution_level AS SMALLINT
    CHECK (VALUE >= 0 AND VALUE <= 15);

-- Domain for non-negative mass/energy quantities
CREATE DOMAIN non_negative_double AS DOUBLE PRECISION
    CHECK (VALUE >= 0.0);

-- ============================================================================
-- 2. H3 APERTURE REFERENCE & RESOLUTION LOOKUP
-- ============================================================================

CREATE TABLE IF NOT EXISTS dggs_aperture_resolution_ref (
    resolution h3_resolution_level PRIMARY KEY,
    aperture_class aperture_class_enum NOT NULL,
    cumulative_rotation_deg DOUBLE PRECISION NOT NULL,
    rotation_offset_rad DOUBLE PRECISION NOT NULL,
    scaling_ratio DOUBLE PRECISION NOT NULL DEFAULT 7.0,
    nominal_area_km2 DOUBLE PRECISION NOT NULL,
    is_class_ii BOOLEAN GENERATED ALWAYS AS (aperture_class = 'CLASS_II') STORED,
    is_class_iii BOOLEAN GENERATED ALWAYS AS (aperture_class = 'CLASS_III') STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Pre-seed deterministic resolutions [0, 15] conforming to RFC-093
INSERT INTO dggs_aperture_resolution_ref (
    resolution, aperture_class, cumulative_rotation_deg, rotation_offset_rad, nominal_area_km2
) VALUES
    (0,  'CLASS_II',   0.0000000000,  0.000000000000000, 4357449.416078383),
    (1,  'CLASS_III', 19.1066053509,  0.333473172224027,  609788.441835441),
    (2,  'CLASS_II',   0.0000000000,  0.000000000000000,   86801.780345479),
    (3,  'CLASS_III', 19.1066053509,  0.333473172224027,   12393.939055462),
    (4,  'CLASS_II',   0.0000000000,  0.000000000000000,    1770.386981881),
    (5,  'CLASS_III', 19.1066053509,  0.333473172224027,     252.906979685),
    (6,  'CLASS_II',   0.0000000000,  0.000000000000000,      36.129462529),
    (7,  'CLASS_III', 19.1066053509,  0.333473172224027,       5.161343714),
    (8,  'CLASS_II',   0.0000000000,  0.000000000000000,       0.737334778),
    (9,  'CLASS_III', 19.1066053509,  0.333473172224027,       0.105333539),
    (10, 'CLASS_II',   0.0000000000,  0.000000000000000,       0.015047648),
    (11, 'CLASS_III', 19.1066053509,  0.333473172224027,       0.002149664),
    (12, 'CLASS_II',   0.0000000000,  0.000000000000000,       0.000307095),
    (13, 'CLASS_III', 19.1066053509,  0.333473172224027,       0.000043871),
    (14, 'CLASS_II',   0.0000000000,  0.000000000000000,       0.000006267),
    (15, 'CLASS_III', 19.1066053509,  0.333473172224027,       0.000000895)
ON CONFLICT (resolution) DO UPDATE SET
    aperture_class = EXCLUDED.aperture_class,
    cumulative_rotation_deg = EXCLUDED.cumulative_rotation_deg,
    rotation_offset_rad = EXCLUDED.rotation_offset_rad;

-- ============================================================================
-- 3. H3 SPATIAL MONAD CELL REGISTRY
-- ============================================================================

CREATE TABLE IF NOT EXISTS spatial_monad_cells (
    h3_index BIGINT PRIMARY KEY,
    resolution h3_resolution_level NOT NULL,
    base_cell_num SMALLINT NOT NULL CHECK (base_cell_num >= 0 AND base_cell_num <= 121),
    aperture_class aperture_class_enum NOT NULL,
    aperture_sequence aperture_class_enum[] NOT NULL,
    sequence_hash CHAR(64) NOT NULL,
    centroid_geom GEOMETRY(Point, 4326),
    boundary_geom GEOMETRY(Polygon, 4326),
    current_state_root CHAR(64) NOT NULL,
    last_block_height BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT fk_monad_cell_resolution FOREIGN KEY (resolution)
        REFERENCES dggs_aperture_resolution_ref (resolution)
);

CREATE INDEX IF NOT EXISTS idx_spatial_monad_cells_res ON spatial_monad_cells(resolution);
CREATE INDEX IF NOT EXISTS idx_spatial_monad_cells_class ON spatial_monad_cells(aperture_class);
CREATE INDEX IF NOT EXISTS idx_spatial_monad_cells_geom ON spatial_monad_cells USING GIST (boundary_geom);

-- ============================================================================
-- 4. THERMODYNAMIC STATE STOCKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS monad_thermodynamic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    h3_index BIGINT NOT NULL REFERENCES spatial_monad_cells(h3_index) ON DELETE CASCADE,
    block_height BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    mass_dry_biomass_kg non_negative_double NOT NULL DEFAULT 0.0,
    mass_liquid_water_kg non_negative_double NOT NULL DEFAULT 0.0,
    mass_water_vapor_kg non_negative_double NOT NULL DEFAULT 0.0,
    enthalpy_joules DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    entropy_joules_per_kelvin non_negative_double NOT NULL DEFAULT 0.0,
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin >= 0.0),
    pressure_pascals DOUBLE PRECISION NOT NULL CHECK (pressure_pascals >= 0.0),
    stock_checksum CHAR(64) NOT NULL,
    CONSTRAINT uq_monad_stock_height UNIQUE (h3_index, block_height)
);

CREATE INDEX IF NOT EXISTS idx_thermo_stocks_h3_time ON monad_thermodynamic_stocks(h3_index, timestamp DESC);

-- ============================================================================
-- 5. CROSS-RESOLUTION & ADJACENCY ROTATION TRANSFORMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS aperture_flux_rotations (
    rotation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_resolution h3_resolution_level NOT NULL,
    target_resolution h3_resolution_level NOT NULL,
    source_class aperture_class_enum NOT NULL,
    target_class aperture_class_enum NOT NULL,
    delta_rotation_rad DOUBLE PRECISION NOT NULL,
    cos_theta DOUBLE PRECISION NOT NULL,
    sin_theta DOUBLE PRECISION NOT NULL,
    parity_status spatial_parity_status_enum NOT NULL,
    CONSTRAINT fk_rot_src_res FOREIGN KEY (source_resolution) REFERENCES dggs_aperture_resolution_ref(resolution),
    CONSTRAINT fk_rot_tgt_res FOREIGN KEY (target_resolution) REFERENCES dggs_aperture_resolution_ref(resolution),
    CONSTRAINT uq_flux_rotation_res UNIQUE (source_resolution, target_resolution)
);

-- Populate standard rotation lookup for adjacent resolutions
INSERT INTO aperture_flux_rotations (
    source_resolution, target_resolution, source_class, target_class,
    delta_rotation_rad, cos_theta, sin_theta, parity_status
)
SELECT 
    r1.resolution AS source_resolution,
    r2.resolution AS target_resolution,
    r1.aperture_class AS source_class,
    r2.aperture_class AS target_class,
    (r2.rotation_offset_rad - r1.rotation_offset_rad) AS delta_rotation_rad,
    COS(r2.rotation_offset_rad - r1.rotation_offset_rad) AS cos_theta,
    SIN(r2.rotation_offset_rad - r1.rotation_offset_rad) AS sin_theta,
    CASE 
        WHEN r1.aperture_class = r2.aperture_class THEN 'PARITY_ALIGNED'::spatial_parity_status_enum
        ELSE 'ROTATION_TRANSFORMED'::spatial_parity_status_enum
    END AS parity_status
FROM dggs_aperture_resolution_ref r1
CROSS JOIN dggs_aperture_resolution_ref r2
WHERE ABS(r1.resolution - r2.resolution) <= 1
ON CONFLICT (source_resolution, target_resolution) DO UPDATE SET
    delta_rotation_rad = EXCLUDED.delta_rotation_rad,
    cos_theta = EXCLUDED.cos_theta,
    sin_theta = EXCLUDED.sin_theta,
    parity_status = EXCLUDED.parity_status;

-- ============================================================================
-- 6. DIRECTIONAL SPATIAL FLUX FLOW TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS spatial_flux_transactions (
    tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL,
    source_h3_index BIGINT NOT NULL REFERENCES spatial_monad_cells(h3_index),
    target_h3_index BIGINT NOT NULL REFERENCES spatial_monad_cells(h3_index),
    source_resolution h3_resolution_level NOT NULL,
    target_resolution h3_resolution_level NOT NULL,
    source_aperture_class aperture_class_enum NOT NULL,
    target_aperture_class aperture_class_enum NOT NULL,
    carrier_type thermodynamic_flux_carrier_enum NOT NULL,
    raw_vector_norm DOUBLE PRECISION NOT NULL,
    transformed_vector_norm DOUBLE PRECISION NOT NULL,
    flux_vector_x DOUBLE PRECISION NOT NULL,
    flux_vector_y DOUBLE PRECISION NOT NULL,
    flux_magnitude DOUBLE PRECISION NOT NULL,
    enthalpy_transferred_joules DOUBLE PRECISION NOT NULL,
    entropy_generated_joules_per_kelvin non_negative_double NOT NULL,
    norm_conservation_delta DOUBLE PRECISION NOT NULL,
    tx_signature CHAR(128) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_first_law_flux_norm CHECK (ABS(raw_vector_norm - transformed_vector_norm) <= 1e-9),
    CONSTRAINT chk_second_law_dissipation CHECK (entropy_generated_joules_per_kelvin >= 0.0)
);

CREATE INDEX IF NOT EXISTS idx_spatial_flux_source ON spatial_flux_transactions(source_h3_index, block_height);
CREATE INDEX IF NOT EXISTS idx_spatial_flux_target ON spatial_flux_transactions(target_h3_index, block_height);
CREATE INDEX IF NOT EXISTS idx_spatial_flux_block ON spatial_flux_transactions(block_height);

-- ============================================================================
-- 7. THERMODYNAMIC BLOCKCHAIN LEDGER BLOCKS & PROOFS
-- ============================================================================

CREATE TABLE IF NOT EXISTS thermodynamic_spatial_blocks (
    block_height BIGINT PRIMARY KEY,
    parent_block_hash CHAR(64) NOT NULL,
    block_hash CHAR(64) NOT NULL UNIQUE,
    state_merkle_root CHAR(64) NOT NULL,
    flux_transactions_root CHAR(64) NOT NULL,
    aperture_sequence_root CHAR(64) NOT NULL,
    total_mass_balance_error DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_enthalpy_balance_error DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_entropy_generated DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    validator_node_id VARCHAR(128) NOT NULL,
    consensus_signature CHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_closed_boundary_mass_balance CHECK (ABS(total_mass_balance_error) <= 1e-6),
    CONSTRAINT chk_closed_boundary_enthalpy_balance CHECK (ABS(total_enthalpy_balance_error) <= 1e-6),
    CONSTRAINT chk_non_negative_global_entropy CHECK (total_entropy_generated >= 0.0)
);

CREATE INDEX IF NOT EXISTS idx_thermo_blocks_hash ON thermodynamic_spatial_blocks(block_hash);

-- ============================================================================
-- 8. APERTURE SEQUENCE AUDIT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS aperture_sequence_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_resolution h3_resolution_level NOT NULL,
    sequence_elements aperture_class_enum[] NOT NULL,
    sequence_length INT GENERATED ALWAYS AS (array_length(sequence_elements, 1)) STORED,
    expected_length INT GENERATED ALWAYS AS (target_resolution + 1) STORED,
    verified_base_parity BOOLEAN NOT NULL DEFAULT true,
    verified_alternating_parity BOOLEAN NOT NULL,
    merkle_leaf_hash CHAR(64) NOT NULL,
    audited_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_sequence_length_alignment CHECK (array_length(sequence_elements, 1) = (target_resolution + 1))
);

CREATE INDEX IF NOT EXISTS idx_aperture_audit_res ON aperture_sequence_audit_log(target_resolution);