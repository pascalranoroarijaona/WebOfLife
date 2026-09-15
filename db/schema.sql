-- ============================================================================
-- WEB OF LIFE: THERMODYNAMIC BLOCKCHAIN & SPATIAL DGGS SCHEMA
-- SPRINT 086: Extraction of Directional Aperture Digits for Pentagonal H3 Cells
-- ============================================================================

-- Extensions for high-precision arithmetic, UUID generation, and bitwise operations
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================================================
-- 1. BASE CELL TOPOLOGY & ICOSAHEDRAL CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS dggs_base_cells (
    base_cell_id SMALLINT PRIMARY KEY CHECK (base_cell_id BETWEEN 0 AND 121),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    coord_lat NUMERIC(10, 7) NOT NULL,
    coord_lon NUMERIC(10, 7) NOT NULL,
    icosahedron_face_id SMALLINT NOT NULL CHECK (icosahedron_face_id BETWEEN 0 AND 19),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed canonical icosahedral pentagonal base cells
INSERT INTO dggs_base_cells (base_cell_id, is_pentagon, coord_lat, coord_lon, icosahedron_face_id)
VALUES
    (4,   TRUE,  52.6220556, -142.0000000, 0),
    (14,  TRUE,  10.8123170,  -77.0000000, 2),
    (24,  TRUE, -31.7174744, -142.0000000, 4),
    (38,  TRUE,  52.6220556,  -70.0000000, 6),
    (49,  TRUE,  10.8123170,   -5.0000000, 8),
    (58,  TRUE, -31.7174744,  -70.0000000, 10),
    (63,  TRUE,  52.6220556,    2.0000000, 11),
    (72,  TRUE,  10.8123170,   67.0000000, 13),
    (83,  TRUE, -31.7174744,    2.0000000, 15),
    (97,  TRUE,  52.6220556,   74.0000000, 16),
    (107, TRUE,  10.8123170,  139.0000000, 18),
    (117, TRUE, -31.7174744,   74.0000000, 19)
ON CONFLICT (base_cell_id) DO UPDATE 
SET is_pentagon = EXCLUDED.is_pentagon,
    coord_lat = EXCLUDED.coord_lat,
    coord_lon = EXCLUDED.coord_lon,
    icosahedron_face_id = EXCLUDED.icosahedron_face_id;

-- ============================================================================
-- 2. H3 PENTAGONAL APERTURE DIGIT PARSER REGISTRY
-- ============================================================================

CREATE TABLE IF NOT EXISTS h3_cell_records (
    h3_index_hex VARCHAR(16) PRIMARY KEY CHECK (h3_index_hex ~ '^[0-9a-fA-F]{15,16}$'),
    h3_index_int NUMERIC(20, 0) NOT NULL UNIQUE,
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    base_cell_id SMALLINT NOT NULL REFERENCES dggs_base_cells(base_cell_id),
    is_pentagon_base_cell BOOLEAN NOT NULL,
    is_pure_pentagon BOOLEAN NOT NULL,
    has_invalid_pentagon_digit BOOLEAN NOT NULL DEFAULT FALSE,
    leading_center_count SMALLINT NOT NULL CHECK (leading_center_count >= 0),
    leading_non_zero_digit SMALLINT CHECK (leading_non_zero_digit BETWEEN 1 AND 6),
    leading_non_zero_resolution SMALLINT CHECK (leading_non_zero_resolution BETWEEN 1 AND 15),
    all_digits_bitstream VARCHAR(15) NOT NULL, -- Representation of [d_1, ..., d_r]
    non_zero_digits_bitstream VARCHAR(15) NOT NULL, -- Filtered sequence [d_k != 0]
    first_discovered_block_height BIGINT NOT NULL,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_h3_pentagon_pure_consistency CHECK (
        (is_pure_pentagon = TRUE AND is_pentagon_base_cell = TRUE AND leading_non_zero_digit IS NULL) OR
        (is_pure_pentagon = FALSE)
    ),
    CONSTRAINT chk_h3_pentagon_invalid_digit_rule CHECK (
        (is_pentagon_base_cell = TRUE AND all_digits_bitstream LIKE '%1%' AND has_invalid_pentagon_digit = TRUE) OR
        (is_pentagon_base_cell = TRUE AND all_digits_bitstream NOT LIKE '%1%' AND has_invalid_pentagon_digit = FALSE) OR
        (is_pentagon_base_cell = FALSE AND has_invalid_pentagon_digit = FALSE)
    )
);

CREATE INDEX IF NOT EXISTS idx_h3_cell_res_base ON h3_cell_records(resolution, base_cell_id);
CREATE INDEX IF NOT EXISTS idx_h3_cell_pure_pentagon ON h3_cell_records(is_pure_pentagon) WHERE is_pure_pentagon = TRUE;

-- ============================================================================
-- 3. APERTURE DIGIT COMPONENT SEQUENCES (TIME-SERIES DGGS TRACES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS h3_directional_digits (
    h3_index_hex VARCHAR(16) NOT NULL REFERENCES h3_cell_records(h3_index_hex) ON DELETE CASCADE,
    resolution_level SMALLINT NOT NULL CHECK (resolution_level BETWEEN 1 AND 15),
    digit_value SMALLINT NOT NULL CHECK (digit_value BETWEEN 0 AND 6),
    is_non_zero BOOLEAN GENERATED ALWAYS AS (digit_value > 0) STORED,
    is_k_axis BOOLEAN GENERATED ALWAYS AS (digit_value = 1) STORED,
    PRIMARY KEY (h3_index_hex, resolution_level)
);

CREATE INDEX IF NOT EXISTS idx_h3_dir_digits_val ON h3_directional_digits(digit_value, is_non_zero);

-- ============================================================================
-- 4. THERMODYNAMIC STOCKS & SYSTEM STATE TENSORS
-- ============================================================================

CREATE TABLE IF NOT EXISTS thermodynamic_cell_stocks (
    h3_index_hex VARCHAR(16) NOT NULL REFERENCES h3_cell_records(h3_index_hex),
    state_vector_timestamp TIMESTAMPTZ NOT NULL,
    mass_kg NUMERIC(38, 18) NOT NULL CHECK (mass_kg >= 0),
    internal_energy_joules NUMERIC(38, 18) NOT NULL,
    temperature_kelvin NUMERIC(18, 8) NOT NULL CHECK (temperature_kelvin > 0),
    entropy_j_per_k NUMERIC(38, 18) NOT NULL,
    chemical_potential_j_per_kg NUMERIC(38, 18) NOT NULL DEFAULT 0,
    neighbor_topology_degree SMALLINT NOT NULL CHECK (neighbor_topology_degree IN (5, 6)),
    geometric_conductance_factor NUMERIC(8, 6) NOT NULL,
    CONSTRAINT chk_pentagon_conductance_factor CHECK (
        (neighbor_topology_degree = 5 AND geometric_conductance_factor = 0.833333) OR
        (neighbor_topology_degree = 6 AND geometric_conductance_factor = 1.000000)
    ),
    PRIMARY KEY (h3_index_hex, state_vector_timestamp)
);

CREATE INDEX IF NOT EXISTS idx_thermo_cell_stocks_time ON thermodynamic_cell_stocks(state_vector_timestamp DESC);

-- ============================================================================
-- 5. SPATIAL BOUNDARY FLUX MONAD & CONSERVATIVE TRANSACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS spatial_boundary_flux_ledgers (
    flux_ledger_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_h3_index VARCHAR(16) NOT NULL REFERENCES h3_cell_records(h3_index_hex),
    target_h3_index VARCHAR(16) NOT NULL REFERENCES h3_cell_records(h3_index_hex),
    aperture_directional_digit SMALLINT NOT NULL CHECK (aperture_directional_digit BETWEEN 2 AND 6),
    epoch_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mass_flux_kg NUMERIC(38, 18) NOT NULL,
    enthalpy_flux_joules NUMERIC(38, 18) NOT NULL,
    entropy_production_sigma NUMERIC(38, 18) NOT NULL CHECK (entropy_production_sigma >= 0),
    source_temperature_k NUMERIC(18, 8) NOT NULL,
    target_temperature_k NUMERIC(18, 8) NOT NULL,
    block_commit_hash CHAR(64) NOT NULL,
    is_pentagon_boundary BOOLEAN NOT NULL,
    flux_balance_divergence NUMERIC(38, 24) NOT NULL DEFAULT 0.0 CHECK (ABS(flux_balance_divergence) < 1e-15),
    CONSTRAINT chk_pentagon_flux_directional_digit CHECK (
        (is_pentagon_boundary = TRUE AND aperture_directional_digit != 1) OR
        (is_pentagon_boundary = FALSE)
    ),
    CONSTRAINT chk_second_law_entropy_non_negative CHECK (entropy_production_sigma >= 0)
);

CREATE INDEX IF NOT EXISTS idx_spatial_flux_boundary ON spatial_boundary_flux_ledgers(source_h3_index, target_h3_index);
CREATE INDEX IF NOT EXISTS idx_spatial_flux_block ON spatial_boundary_flux_ledgers(block_commit_hash);

-- ============================================================================
-- 6. THERMODYNAMIC BLOCKCHAIN CONSENSUS & ATTESTATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash CHAR(64) NOT NULL UNIQUE,
    parent_block_hash CHAR(64) NOT NULL UNIQUE,
    state_merkle_root CHAR(64) NOT NULL,
    flux_receipts_root CHAR(64) NOT NULL,
    pentagon_invariants_root CHAR(64) NOT NULL,
    total_universe_mass_kg NUMERIC(38, 18) NOT NULL,
    total_universe_energy_j NUMERIC(38, 18) NOT NULL,
    delta_universe_mass_kg NUMERIC(38, 24) NOT NULL DEFAULT 0.0 CHECK (ABS(delta_universe_mass_kg) < 1e-15),
    net_entropy_production_j_k NUMERIC(38, 18) NOT NULL CHECK (net_entropy_production_j_k >= 0),
    active_pentagon_cell_count INTEGER NOT NULL CHECK (active_pentagon_cell_count >= 0),
    validator_node_pubkey VARCHAR(130) NOT NULL,
    consensus_signature VARCHAR(144) NOT NULL,
    block_timestamp TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_thermo_blocks_timestamp ON thermodynamic_blocks(block_timestamp DESC);

CREATE TABLE IF NOT EXISTS pentagon_singularity_attestations (
    attestation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL REFERENCES thermodynamic_blocks(block_height),
    h3_index_hex VARCHAR(16) NOT NULL REFERENCES h3_cell_records(h3_index_hex),
    suppressed_k_axis_checked BOOLEAN NOT NULL DEFAULT TRUE,
    flux_conservation_witness_hash CHAR(64) NOT NULL,
    five_neighbor_geometric_scale NUMERIC(8, 6) NOT NULL DEFAULT 0.833333,
    signed_attestation VARCHAR(144) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attestation_block_cell ON pentagon_singularity_attestations(block_height, h3_index_hex);

-- ============================================================================
-- 7. AUDIT VIEW: GLOBAL CONSERVATIVE CONTINUITY
-- ============================================================================

CREATE OR REPLACE VIEW view_global_pentagon_flux_continuity AS
SELECT 
    b.block_height,
    b.block_hash,
    b.delta_universe_mass_kg,
    b.net_entropy_production_j_k,
    COUNT(p.attestation_id) AS total_pentagon_attestations,
    BOOL_AND(p.suppressed_k_axis_checked) AS all_k_axes_suppressed
FROM thermodynamic_blocks b
LEFT JOIN pentagon_singularity_attestations p ON b.block_height = p.block_height
GROUP BY b.block_height, b.block_hash, b.delta_universe_mass_kg, b.net_entropy_production_j_k;