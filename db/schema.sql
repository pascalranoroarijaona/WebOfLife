-- Web of Life Thermodynamic Blockchain Schema
-- Sprint 062: Normalized Radial Midpoint Unit Vector for Boundary Segments (RFC-062)
-- Architecture: Discrete Global Grid System (H3) & Finite Volume Facet Triad Flux Ledger

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- ENUM TYPES & CORE THERMODYNAMIC STATUS
-- ============================================================================
CREATE TYPE cell_resolution_enum AS ENUM (
    'res_0', 'res_1', 'res_2', 'res_3', 'res_4', 'res_5', 
    'res_6', 'res_7', 'res_8', 'res_9', 'res_10', 'res_11', 
    'res_12', 'res_13', 'res_14', 'res_15'
);

CREATE TYPE triad_singularity_strategy AS ENUM (
    'ZENITH_FALLBACK',
    'STRICT_EXCEPTION',
    'INTERPOLATED_NEIGHBOR'
);

CREATE TYPE flux_transport_mode AS ENUM (
    'ADVECTION',
    'LATERAL_DIFFUSION',
    'THERMAL_CONDUCTION',
    'SURFACE_SHEAR_STRESS',
    'GEOSTROPHIC_DRIFT'
);

CREATE TYPE conservation_audit_status AS ENUM (
    'STRICTLY_CONSERVED',
    'ENTROPY_PRODUCING_VALID',
    'MASS_DEFICIT_VIOLATION',
    'ENERGY_NON_CONSERVATION_ERROR'
);

-- ============================================================================
-- 1. H3 DGGS SPATIAL CELLS & VERTEX TOPOLOGY
-- ============================================================================
CREATE TABLE IF NOT EXISTS h3_cells (
    h3_index BIGINT PRIMARY KEY,
    resolution INT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    centroid_lat DOUBLE PRECISION NOT NULL,
    centroid_lng DOUBLE PRECISION NOT NULL,
    centroid_cartesian_x DOUBLE PRECISION NOT NULL,
    centroid_cartesian_y DOUBLE PRECISION NOT NULL,
    centroid_cartesian_z DOUBLE PRECISION NOT NULL,
    surface_area_m2 DOUBLE PRECISION NOT NULL CHECK (surface_area_m2 > 0.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_h3_cells_resolution ON h3_cells(resolution);

-- Directed Boundary Edges / Facet Segments between Adjacent H3 Cells
CREATE TABLE IF NOT EXISTS h3_boundary_segments (
    segment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cell_origin_h3 BIGINT NOT NULL REFERENCES h3_cells(h3_index),
    cell_destination_h3 BIGINT NOT NULL REFERENCES h3_cells(h3_index),
    
    -- Vertex 1 Cartesian Coordinates (v1)
    v1_x DOUBLE PRECISION NOT NULL,
    v1_y DOUBLE PRECISION NOT NULL,
    v1_z DOUBLE PRECISION NOT NULL,
    
    -- Vertex 2 Cartesian Coordinates (v2)
    v2_x DOUBLE PRECISION NOT NULL,
    v2_y DOUBLE PRECISION NOT NULL,
    v2_z DOUBLE PRECISION NOT NULL,
    
    -- Segment Chord Length and Midpoint in R3
    chord_length_m DOUBLE PRECISION NOT NULL CHECK (chord_length_m >= 0.0),
    midpoint_x DOUBLE PRECISION NOT NULL,
    midpoint_y DOUBLE PRECISION NOT NULL,
    midpoint_z DOUBLE PRECISION NOT NULL,
    
    -- Orthonormal Local Facet Reference Triad (t_hat, n_lat_hat, n_rad_hat)
    -- 1. Tangent Unit Vector (t_hat)
    tangent_x DOUBLE PRECISION NOT NULL,
    tangent_y DOUBLE PRECISION NOT NULL,
    tangent_z DOUBLE PRECISION NOT NULL,

    -- 2. Lateral Normal Unit Vector (n_lat_hat) pointing across inter-cell boundary
    lateral_normal_x DOUBLE PRECISION NOT NULL,
    lateral_normal_y DOUBLE PRECISION NOT NULL,
    lateral_normal_z DOUBLE PRECISION NOT NULL,

    -- 3. Normalized Radial Midpoint Unit Vector (n_rad_hat) per RFC-062
    radial_normal_x DOUBLE PRECISION NOT NULL,
    radial_normal_y DOUBLE PRECISION NOT NULL,
    radial_normal_z DOUBLE PRECISION NOT NULL,
    
    -- Precision & Singularity Diagnostics
    radial_norm_deviation DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    singularity_mitigation triad_singularity_strategy NOT NULL DEFAULT 'ZENITH_FALLBACK',
    tangent_radial_dot DOUBLE PRECISION NOT NULL DEFAULT 0.0, -- Must be 0 within 1e-12
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    
    CONSTRAINT chk_boundary_distinct_cells CHECK (cell_origin_h3 != cell_destination_h3),
    CONSTRAINT chk_radial_unit_norm CHECK (
        abs(sqrt(radial_normal_x^2 + radial_normal_y^2 + radial_normal_z^2) - 1.0) < 1e-10
    ),
    CONSTRAINT chk_tangent_radial_orthogonality CHECK (
        abs(tangent_x * radial_normal_x + tangent_y * radial_normal_y + tangent_z * radial_normal_z) < 1e-9
    )
);

CREATE INDEX IF NOT EXISTS idx_h3_boundary_segments_cells 
ON h3_boundary_segments(cell_origin_h3, cell_destination_h3);

-- ============================================================================
-- 2. THERMODYNAMIC CELL STATE STOCKS (MONAD CELL VOLUMES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS thermodynamic_cell_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    h3_index BIGINT NOT NULL REFERENCES h3_cells(h3_index),
    epoch_height BIGINT NOT NULL,
    timestamp_utc TIMESTAMPTZ NOT NULL,
    
    -- Conserved State Variables (First Law of Thermodynamics)
    internal_energy_joules NUMERIC(38, 10) NOT NULL CHECK (internal_energy_joules >= 0),
    enthalpy_joules NUMERIC(38, 10) NOT NULL,
    dry_air_mass_kg NUMERIC(38, 10) NOT NULL CHECK (dry_air_mass_kg >= 0),
    moisture_mass_kg NUMERIC(38, 10) NOT NULL CHECK (moisture_mass_kg >= 0),
    biomass_carbon_kg NUMERIC(38, 10) NOT NULL CHECK (biomass_carbon_kg >= 0),
    entropy_j_per_k NUMERIC(38, 10) NOT NULL,
    
    -- Kinetic Momentum Vector (kg * m / s)
    momentum_x_kg_m_s DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    momentum_y_kg_m_s DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    momentum_z_kg_m_s DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    
    -- Thermodynamic Intensive Properties
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin > 0.0),
    pressure_pascals DOUBLE PRECISION NOT NULL CHECK (pressure_pascals >= 0.0),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_cell_epoch UNIQUE (h3_index, epoch_height)
);

CREATE INDEX IF NOT EXISTS idx_thermo_cell_epoch ON thermodynamic_cell_stocks(epoch_height, h3_index);

-- ============================================================================
-- 3. INTER-CELL BOUNDARY FACET FLUX TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS boundary_facet_flux_ledger (
    flux_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_hash CHAR(64) NOT NULL,
    segment_id UUID NOT NULL REFERENCES h3_boundary_segments(segment_id),
    epoch_height BIGINT NOT NULL,
    transport_mode flux_transport_mode NOT NULL,
    
    -- Finite Volume Flux Projections against Orthonormal Triad
    flux_tangent_component DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    flux_lateral_normal_component DOUBLE PRECISION NOT NULL, -- Net transport across boundary
    flux_radial_normal_component DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    
    -- Conserved Consignments Transferred Across Facet (Δ)
    mass_flux_kg NUMERIC(38, 14) NOT NULL,
    enthalpy_flux_joules NUMERIC(38, 14) NOT NULL,
    carbon_flux_kg NUMERIC(38, 14) NOT NULL,
    entropy_production_j_per_k NUMERIC(38, 14) NOT NULL CHECK (entropy_production_j_per_k >= 0.0),
    
    -- Cryptographic Proof & Verification Monad
    state_merkle_root CHAR(64) NOT NULL,
    signature BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_facet_flux_segment_epoch 
ON boundary_facet_flux_ledger(segment_id, epoch_height);

-- ============================================================================
-- 4. THERMODYNAMIC BLOCKCHAIN BLOCK LEDGER & CONSERVATION AUDIT
-- ============================================================================
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash CHAR(64) UNIQUE NOT NULL,
    parent_hash CHAR(64) NOT NULL,
    merkle_facet_flux_root CHAR(64) NOT NULL,
    merkle_state_stocks_root CHAR(64) NOT NULL,
    
    -- Global Conservation Check Integrals
    global_net_mass_delta_kg NUMERIC(38, 14) NOT NULL DEFAULT 0.0,
    global_net_energy_delta_j NUMERIC(38, 14) NOT NULL DEFAULT 0.0,
    global_entropy_generated_j_k NUMERIC(38, 14) NOT NULL CHECK (global_entropy_generated_j_k >= 0.0),
    
    conservation_status conservation_audit_status NOT NULL,
    validator_node_pubkey BYTEA NOT NULL,
    block_timestamp TIMESTAMPTZ NOT NULL,
    
    CONSTRAINT chk_mass_conservation_law CHECK (abs(global_net_mass_delta_kg) < 1e-7),
    CONSTRAINT chk_first_law_thermodynamics CHECK (abs(global_net_energy_delta_j) < 1e-6)
);

CREATE INDEX IF NOT EXISTS idx_blocks_hash ON thermodynamic_blocks(block_hash);

-- ============================================================================
-- 5. FUNCTION: COMPUTE & UPSERT BOUNDARY SEGMENT RADIAL NORMAL (RFC-062)
-- ============================================================================
CREATE OR REPLACE FUNCTION compute_boundary_segment_radial_normal_3d(
    p_v1_x DOUBLE PRECISION,
    p_v1_y DOUBLE PRECISION,
    p_v1_z DOUBLE PRECISION,
    p_v2_x DOUBLE PRECISION,
    p_v2_y DOUBLE PRECISION,
    p_v2_z DOUBLE PRECISION,
    p_epsilon DOUBLE PRECISION DEFAULT 1e-12
) RETURNS TABLE(
    rad_x DOUBLE PRECISION,
    rad_y DOUBLE PRECISION,
    rad_z DOUBLE PRECISION,
    mid_x DOUBLE PRECISION,
    mid_y DOUBLE PRECISION,
    mid_z DOUBLE PRECISION,
    norm_val DOUBLE PRECISION,
    is_singular BOOLEAN
) AS $$
DECLARE
    sx DOUBLE PRECISION;
    sy DOUBLE PRECISION;
    sz DOUBLE PRECISION;
    n_mag DOUBLE PRECISION;
BEGIN
    -- Unscaled midpoint summation vector m = 0.5 * (v1 + v2)
    sx := p_v1_x + p_v2_x;
    sy := p_v1_y + p_v2_y;
    sz := p_v1_z + p_v2_z;
    
    mid_x := sx * 0.5;
    mid_y := sy * 0.5;
    mid_z := sz * 0.5;
    
    n_mag := sqrt(sx * sx + sy * sy + sz * sz);
    
    IF n_mag <= p_epsilon THEN
        -- Singularity guard: Fallback zenith unit vector
        rad_x := 0.0;
        rad_y := 0.0;
        rad_z := 1.0;
        norm_val := 0.0;
        is_singular := TRUE;
    ELSE
        rad_x := sx / n_mag;
        rad_y := sy / n_mag;
        rad_z := sz / n_mag;
        norm_val := n_mag * 0.5;
        is_singular := FALSE;
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE;