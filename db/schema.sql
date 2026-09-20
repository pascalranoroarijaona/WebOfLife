-- Web of Life Thermodynamic Blockchain Schema
-- Sprint 090: Pure Pentagon Resolution Index & Aperture Orientation Invariance Engine
-- Governance: First Law (Mass-Energy Conservation) & Second Law (Non-Negative Entropy Production)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enumerations for Spatial Topology & Aperture Symmetry Classes
DO $$ BEGIN
    CREATE TYPE aperture_class_enum AS ENUM (
        'CLASS_II_UNROTATED', -- Even resolutions (r % 2 == 0), net aperture rotation = 0 rad
        'CLASS_III_ROTATED'   -- Odd resolutions (r % 2 == 1), net aperture rotation = ±arcsin(sqrt(3)/(2*sqrt(7)))
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE cell_topology_enum AS ENUM (
        'HEXAGON',
        'PENTAGON_SINGULARITY'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE thermodynamic_flux_type AS ENUM (
        'MASS_DIFFUSIVE',
        'ENTHALPY_ADVECTIVE',
        'VORTICITY_CORRECTED',
        'ISOTROPIC_ISOTHERMAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Discrete Global Grid System (DGGS) Cell Registry
CREATE TABLE IF NOT EXISTS h3_spatial_cells (
    cell_index BIGINT PRIMARY KEY,
    hex_string VARCHAR(16) NOT NULL UNIQUE,
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    base_cell_id SMALLINT NOT NULL CHECK (base_cell_id BETWEEN 0 AND 121),
    topology cell_topology_enum NOT NULL,
    aperture_class aperture_class_enum NOT NULL,
    net_aperture_rotation_rad NUMERIC(12, 10) NOT NULL DEFAULT 0.0000000000,
    is_pure_pentagon BOOLEAN GENERATED ALWAYS AS (
        (topology = 'PENTAGON_SINGULARITY') AND (resolution % 2 = 0)
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_h3_spatial_cells_pure_pentagon 
    ON h3_spatial_cells (is_pure_pentagon) WHERE is_pure_pentagon = TRUE;

CREATE INDEX IF NOT EXISTS idx_h3_spatial_cells_res_topology 
    ON h3_spatial_cells (resolution, topology);

-- 2. Base Cell Topological Invariants (12 Pentagons of icosahedral vertices)
CREATE TABLE IF NOT EXISTS h3_base_cell_topology (
    base_cell_id SMALLINT PRIMARY KEY CHECK (base_cell_id BETWEEN 0 AND 121),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    meridian_angle_rad NUMERIC(12, 10) NOT NULL,
    icosahedron_vertex_id SMALLINT CHECK (icosahedron_vertex_id BETWEEN 0 AND 11),
    CONSTRAINT chk_base_cell_pentagon_vertices CHECK (
        (is_pentagon = TRUE AND base_cell_id IN (4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117) AND icosahedron_vertex_id IS NOT NULL) OR
        (is_pentagon = FALSE AND icosahedron_vertex_id IS NULL)
    )
);

-- Seed base cell pentagon singularities if not existing
INSERT INTO h3_base_cell_topology (base_cell_id, is_pentagon, meridian_angle_rad, icosahedron_vertex_id)
VALUES 
    (4,   TRUE, 0.0000000000, 0),
    (14,  TRUE, 0.6283185307, 1),
    (24,  TRUE, 1.2566370614, 2),
    (38,  TRUE, 1.8849555922, 3),
    (49,  TRUE, 2.5132741229, 4),
    (58,  TRUE, 3.1415926536, 5),
    (63,  TRUE, 3.7699111843, 6),
    (72,  TRUE, 4.3982297150, 7),
    (83,  TRUE, 5.0265482457, 8),
    (97,  TRUE, 5.6548667765, 9),
    (107, TRUE, 6.2831853072, 10),
    (117, TRUE, 0.0000000000, 11)
ON CONFLICT (base_cell_id) DO NOTHING;

-- 3. Cell Thermodynamic Stock States (Monadic Conservation Targets)
CREATE TABLE IF NOT EXISTS h3_thermodynamic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cell_index BIGINT NOT NULL REFERENCES h3_spatial_cells(cell_index),
    block_height BIGINT NOT NULL,
    epoch_timestamp TIMESTAMPTZ NOT NULL,
    mass_kg NUMERIC(24, 8) NOT NULL CHECK (mass_kg >= 0),
    internal_energy_j NUMERIC(28, 8) NOT NULL CHECK (internal_energy_j >= 0),
    enthalpy_j NUMERIC(28, 8) NOT NULL,
    entropy_j_per_k NUMERIC(24, 8) NOT NULL CHECK (entropy_j_per_k >= 0),
    temperature_k NUMERIC(10, 4) NOT NULL CHECK (temperature_k > 0),
    spurious_vorticity_curl NUMERIC(16, 12) NOT NULL DEFAULT 0.000000000000,
    CONSTRAINT chk_stock_vorticity_at_pure_pentagon CHECK (
        -- Pure pentagons require pristine vorticity = 0 (no numerical curl)
        spurious_vorticity_curl = 0.000000000000 OR spurious_vorticity_curl BETWEEN -1e-12 AND 1e-12
    ),
    CONSTRAINT uq_cell_epoch_stock UNIQUE (cell_index, block_height)
);

CREATE INDEX IF NOT EXISTS idx_h3_thermo_stocks_cell_epoch 
    ON h3_thermodynamic_stocks (cell_index, epoch_timestamp DESC);

-- 4. Spatial Flux Ledgers (Inter-Cell Finite Volume Boundary Transfers)
CREATE TABLE IF NOT EXISTS h3_spatial_flux_ledgers (
    flux_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL,
    source_cell BIGINT NOT NULL REFERENCES h3_spatial_cells(cell_index),
    target_cell BIGINT NOT NULL REFERENCES h3_spatial_cells(cell_index),
    boundary_edge_index SMALLINT NOT NULL CHECK (boundary_edge_index BETWEEN 0 AND 5),
    flux_type thermodynamic_flux_type NOT NULL,
    aperture_correction_applied BOOLEAN NOT NULL,
    rotation_correction_rad NUMERIC(12, 10) NOT NULL DEFAULT 0.0000000000,
    mass_flux_kg_per_sec NUMERIC(24, 8) NOT NULL,
    enthalpy_flux_w NUMERIC(28, 8) NOT NULL,
    entropy_production_w_per_k NUMERIC(24, 8) NOT NULL CHECK (entropy_production_w_per_k >= -1e-14), -- Second Law: Delta S >= 0
    tx_hash VARCHAR(64) NOT NULL,
    CONSTRAINT chk_pure_pentagon_no_rotation_correction CHECK (
        (aperture_correction_applied = FALSE AND rotation_correction_rad = 0.0000000000) OR
        (aperture_correction_applied = TRUE AND rotation_correction_rad != 0.0000000000)
    )
);

CREATE INDEX IF NOT EXISTS idx_h3_spatial_flux_src_dst 
    ON h3_spatial_flux_ledgers (source_cell, target_cell, block_height);

-- 5. Blockchain Block Headers & Singularity Invariance Proofs
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    previous_block_hash VARCHAR(64) NOT NULL,
    block_hash VARCHAR(64) NOT NULL UNIQUE,
    state_merkle_root VARCHAR(64) NOT NULL,
    pure_pentagon_invariant_root VARCHAR(64) NOT NULL,
    total_entropy_production_w_per_k NUMERIC(28, 8) NOT NULL CHECK (total_entropy_production_w_per_k >= 0),
    total_energy_drift_j NUMERIC(28, 8) NOT NULL CHECK (total_energy_drift_j BETWEEN -1e-8 AND 1e-8), -- First Law
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Singularity Verification Proof Records
CREATE TABLE IF NOT EXISTS pure_pentagon_invariance_proofs (
    proof_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL REFERENCES thermodynamic_blocks(block_height),
    cell_index BIGINT NOT NULL REFERENCES h3_spatial_cells(cell_index),
    resolution SMALLINT NOT NULL CHECK (resolution % 2 = 0),
    adjacent_directional_count SMALLINT NOT NULL CHECK (adjacent_directional_count = 5),
    net_aperture_rotation NUMERIC(12, 10) NOT NULL CHECK (net_aperture_rotation = 0.0000000000),
    boundary_mass_residual_kg NUMERIC(24, 14) NOT NULL CHECK (boundary_mass_residual_kg BETWEEN -1e-14 AND 1e-14),
    boundary_enthalpy_residual_w NUMERIC(24, 14) NOT NULL CHECK (boundary_enthalpy_residual_w BETWEEN -1e-14 AND 1e-14),
    cryptographic_sig VARCHAR(128) NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proofs_block_cell 
    ON pure_pentagon_invariance_proofs (block_height, cell_index);