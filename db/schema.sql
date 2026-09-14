-- Web of Life Core Thermodynamic Engine & Ledger Schema
-- Sprint 063: Boundary Horizontal Normal Vector & Darboux Frame Integration

-- Enable cryptographic and spatial extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS & DOMAIN CONSTRAINTS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE cell_flux_direction AS ENUM ('CELL_I_TO_J', 'CELL_J_TO_I', 'EQUILIBRIUM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE thermodynamic_flux_type AS ENUM (
        'BAROTROPIC_MASS_ADVECTION',
        'THERMAL_CONDUCTION_FICKIAN',
        'SALINITY_DIFFUSION',
        'WIND_STRESS_MOMENTUM',
        'GEOSTROPHIC_CURRENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Floating point tolerance for vector normalization constraints: 1e-6 in SQL
CREATE DOMAIN unit_vector_component AS DOUBLE PRECISION
    CHECK (VALUE >= -1.000001 AND VALUE <= 1.000001);

-- ============================================================================
-- SPATIAL GEODESIC TOPOLOGY & DARBOUX BOUNDARY FRAMES
-- ============================================================================

-- Discrete spherical cells (H3 base cells & hierarchical pentagons/hexagons)
CREATE TABLE IF NOT EXISTS spatial_h3_cells (
    h3_index BIGINT PRIMARY KEY,
    resolution INT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    center_x DOUBLE PRECISION NOT NULL,
    center_y DOUBLE PRECISION NOT NULL,
    center_z DOUBLE PRECISION NOT NULL,
    surface_area DOUBLE PRECISION NOT NULL CHECK (surface_area > 0.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- Shared cell-cell boundary edges and local Darboux frames (Sprint 061-063)
CREATE TABLE IF NOT EXISTS spatial_h3_boundary_edges (
    boundary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_i BIGINT NOT NULL REFERENCES spatial_h3_cells(h3_index) ON DELETE CASCADE,
    cell_j BIGINT NOT NULL REFERENCES spatial_h3_cells(h3_index) ON DELETE CASCADE,
    arc_length DOUBLE PRECISION NOT NULL CHECK (arc_length > 0.0),
    facet_depth DOUBLE PRECISION NOT NULL DEFAULT 1.0 CHECK (facet_depth > 0.0),
    facet_area DOUBLE PRECISION GENERATED ALWAYS AS (arc_length * facet_depth) STORED,

    -- Boundary Vertices (Endpoints v1, v2)
    v1_x DOUBLE PRECISION NOT NULL,
    v1_y DOUBLE PRECISION NOT NULL,
    v1_z DOUBLE PRECISION NOT NULL,
    v2_x DOUBLE PRECISION NOT NULL,
    v2_y DOUBLE PRECISION NOT NULL,
    v2_z DOUBLE PRECISION NOT NULL,

    -- Edge Midpoint vector m (Sprint 061)
    midpoint_x DOUBLE PRECISION NOT NULL,
    midpoint_y DOUBLE PRECISION NOT NULL,
    midpoint_z DOUBLE PRECISION NOT NULL,

    -- Outward Radial Normal vector r = normalize(m) (Sprint 061 / S^2 Geometry)
    radial_norm_x unit_vector_component NOT NULL,
    radial_norm_y unit_vector_component NOT NULL,
    radial_norm_z unit_vector_component NOT NULL,

    -- Boundary Tangent vector t (Sprint 062)
    tangent_x unit_vector_component NOT NULL,
    tangent_y unit_vector_component NOT NULL,
    tangent_z unit_vector_component NOT NULL,

    -- Unoriented Horizontal Normal vector n_h = normalize(t x r) (Sprint 063)
    horizontal_norm_x unit_vector_component NOT NULL,
    horizontal_norm_y unit_vector_component NOT NULL,
    horizontal_norm_z unit_vector_component NOT NULL,

    -- Orthonormality & In-Plane Geometric Validation Flags
    is_degenerate BOOLEAN NOT NULL DEFAULT FALSE,
    orthogonality_error DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT unique_boundary_pair UNIQUE (cell_i, cell_j),
    CONSTRAINT order_cell_pair CHECK (cell_i < cell_j),
    CONSTRAINT chk_radial_norm_unit CHECK (
        is_degenerate OR 
        abs((radial_norm_x^2 + radial_norm_y^2 + radial_norm_z^2) - 1.0) < 1e-5
    ),
    CONSTRAINT chk_tangent_unit CHECK (
        is_degenerate OR 
        abs((tangent_x^2 + tangent_y^2 + tangent_z^2) - 1.0) < 1e-5
    ),
    CONSTRAINT chk_horizontal_norm_unit CHECK (
        is_degenerate OR 
        abs((horizontal_norm_x^2 + horizontal_norm_y^2 + horizontal_norm_z^2) - 1.0) < 1e-5
    ),
    -- Orthogonality Constraint: n_h . r == 0 (No vertical leakage)
    CONSTRAINT chk_no_vertical_leakage CHECK (
        is_degenerate OR 
        abs(horizontal_norm_x * radial_norm_x + horizontal_norm_y * radial_norm_y + horizontal_norm_z * radial_norm_z) < 1e-4
    ),
    -- Orthogonality Constraint: n_h . t == 0 (In-plane edge perpendicularity)
    CONSTRAINT chk_horizontal_tangent_orthogonal CHECK (
        is_degenerate OR 
        abs(horizontal_norm_x * tangent_x + horizontal_norm_y * tangent_y + horizontal_norm_z * tangent_z) < 1e-4
    )
);

CREATE INDEX IF NOT EXISTS idx_spatial_h3_boundary_cells 
    ON spatial_h3_boundary_edges (cell_i, cell_j);

-- ============================================================================
-- THERMODYNAMIC STOCK ACCOUNTS (FINITE-VOLUME CONSERVED QUANTITIES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cell_thermodynamic_stocks (
    h3_index BIGINT PRIMARY KEY REFERENCES spatial_h3_cells(h3_index),
    internal_energy_joules DOUBLE PRECISION NOT NULL CHECK (internal_energy_joules >= 0.0),
    mass_kg DOUBLE PRECISION NOT NULL CHECK (mass_kg >= 0.0),
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin >= 0.0),
    pressure_pascals DOUBLE PRECISION NOT NULL CHECK (pressure_pascals >= 0.0),
    entropy_j_per_k DOUBLE PRECISION NOT NULL,
    epoch_height BIGINT NOT NULL DEFAULT 0,
    state_merkle_root BYTEA NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ============================================================================
-- THERMODYNAMIC FLUX LEDGER (FIRST & SECOND LAW VERIFICATION)
-- ============================================================================

CREATE TABLE IF NOT EXISTS boundary_facet_flux_ledger (
    flux_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boundary_id UUID NOT NULL REFERENCES spatial_h3_boundary_edges(boundary_id),
    epoch_height BIGINT NOT NULL,
    flux_type thermodynamic_flux_type NOT NULL,
    
    -- Normal projection orientation relative to (cell_i -> cell_j): +1 or -1
    orientation_sign SMALLINT NOT NULL CHECK (orientation_sign IN (1, -1)),
    
    -- Directed Mass Flux Phi_M = (J_M . n_h) * Area (kg/s)
    mass_flux_rate DOUBLE PRECISION NOT NULL,
    
    -- Directed Enthalpy/Heat Flux Phi_Q = (J_Q . n_h) * Area (J/s)
    enthalpy_flux_rate DOUBLE PRECISION NOT NULL,
    
    -- Irreversible entropy production dot{S}_facet >= 0 (J/(K*s))
    entropy_production_rate DOUBLE PRECISION NOT NULL CHECK (entropy_production_rate >= -1e-12),

    -- Verification signatures
    source_cell_h3 BIGINT NOT NULL REFERENCES spatial_h3_cells(h3_index),
    target_cell_h3 BIGINT NOT NULL REFERENCES spatial_h3_cells(h3_index),
    flux_hash BYTEA NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),

    CONSTRAINT chk_flux_sign CHECK (
        (orientation_sign = 1 AND mass_flux_rate >= 0.0) OR
        (orientation_sign = -1 AND mass_flux_rate <= 0.0) OR
        (mass_flux_rate = 0.0)
    )
);

CREATE INDEX IF NOT EXISTS idx_facet_flux_boundary_epoch 
    ON boundary_facet_flux_ledger (boundary_id, epoch_height);

-- ============================================================================
-- THERMODYNAMIC BLOCKCHAIN STATE & CONSERVATION AUDIT
-- ============================================================================

CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    prev_block_hash BYTEA NOT NULL,
    block_hash BYTEA NOT NULL UNIQUE,
    transactions_root BYTEA NOT NULL,
    boundary_flux_root BYTEA NOT NULL,
    darboux_frames_checksum BYTEA NOT NULL,
    
    -- Global Conservation Accounting (Closed System or Planetary Budget)
    total_energy_joules DOUBLE PRECISION NOT NULL,
    total_mass_kg DOUBLE PRECISION NOT NULL,
    net_boundary_mass_leakage DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    net_boundary_energy_leakage DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    cumulative_entropy_generated DOUBLE PRECISION NOT NULL CHECK (cumulative_entropy_generated >= 0.0),
    
    first_law_satisfied BOOLEAN NOT NULL DEFAULT TRUE,
    second_law_satisfied BOOLEAN NOT NULL DEFAULT TRUE,
    
    validator_signature BYTEA NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    
    CONSTRAINT chk_mass_conservation CHECK (abs(net_boundary_mass_leakage) < 1e-6),
    CONSTRAINT chk_energy_conservation CHECK (abs(net_boundary_energy_leakage) < 1e-3)
);

-- ============================================================================
-- AUDIT TRIGGER: GUARANTEE FIRST LAW ANTISYMMETRY AND ZERO VERTICAL LEAKAGE
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_boundary_darboux_geometry()
RETURNS TRIGGER AS $$
DECLARE
    r_dot_n DOUBLE PRECISION;
    t_dot_n DOUBLE PRECISION;
    norm_sq DOUBLE PRECISION;
BEGIN
    IF NEW.is_degenerate THEN
        RETURN NEW;
    END IF;

    -- Compute dot products to confirm strict Darboux frame orthogonality
    r_dot_n := (NEW.radial_norm_x * NEW.horizontal_norm_x) +
               (NEW.radial_norm_y * NEW.horizontal_norm_y) +
               (NEW.radial_norm_z * NEW.horizontal_norm_z);

    t_dot_n := (NEW.tangent_x * NEW.horizontal_norm_x) +
               (NEW.tangent_y * NEW.horizontal_norm_y) +
               (NEW.tangent_z * NEW.horizontal_norm_z);

    norm_sq := (NEW.horizontal_norm_x^2 + NEW.horizontal_norm_y^2 + NEW.horizontal_norm_z^2);

    IF abs(r_dot_n) > 1e-4 THEN
        RAISE EXCEPTION 'Thermodynamic Violation: Non-zero radial-horizontal normal projection (%) indicates vertical mass/energy leakage', r_dot_n;
    END IF;

    IF abs(t_dot_n) > 1e-4 THEN
        RAISE EXCEPTION 'Geometric Violation: Boundary horizontal normal is not orthogonal to tangent vector (dot = %)', t_dot_n;
    END IF;

    IF abs(norm_sq - 1.0) > 1e-4 THEN
        RAISE EXCEPTION 'Geometric Violation: Boundary horizontal normal is not normalized (norm_sq = %)', norm_sq;
    END IF;

    NEW.orthogonality_error := greatest(abs(r_dot_n), abs(t_dot_n));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_boundary_darboux_geometry ON spatial_h3_boundary_edges;
CREATE TRIGGER trg_audit_boundary_darboux_geometry
    BEFORE INSERT OR UPDATE ON spatial_h3_boundary_edges
    FOR EACH ROW
    EXECUTE FUNCTION audit_boundary_darboux_geometry();