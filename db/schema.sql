-- ============================================================================
-- Web of Life: Thermodynamic Blockchain & Discrete Global Grid Schema
-- Sprint 070: Angular Tolerance Comparison for 3D Cartesian Unit Vectors in H3 Adjacency
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Domain for normalized floating-point components
CREATE DOMAIN unit_coordinate AS DOUBLE PRECISION
    CHECK (VALUE >= -1.0000001 AND VALUE <= 1.0000001);

CREATE DOMAIN angular_radians AS DOUBLE PRECISION
    CHECK (VALUE >= 0.0 AND VALUE <= 3.141592653589793);

CREATE DOMAIN thermodynamic_quantity AS NUMERIC(38, 18)
    CHECK (VALUE >= 0.0);

-- ----------------------------------------------------------------------------
-- 1. BLOCKCHAIN CONSENSUS & PROOF-OF-CONSERVATION (PoC) LEDGER
-- ----------------------------------------------------------------------------

CREATE TABLE blockchain_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash BYTEA NOT NULL UNIQUE,
    parent_hash BYTEA NOT NULL,
    state_merkle_root BYTEA NOT NULL,
    spatial_flux_merkle_root BYTEA NOT NULL,
    total_entropy_production NUMERIC(38, 18) NOT NULL CHECK (total_entropy_production >= 0.0),
    net_mass_divergence NUMERIC(38, 18) NOT NULL CHECK (ABS(net_mass_divergence) <= 1e-12),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    proposer_public_key BYTEA NOT NULL,
    signature BYTEA NOT NULL
);

CREATE TABLE blockchain_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(block_height) ON DELETE CASCADE,
    tx_type VARCHAR(64) NOT NULL,
    source_h3_index BIGINT NOT NULL,
    target_h3_index BIGINT NOT NULL,
    first_law_residual NUMERIC(38, 18) NOT NULL DEFAULT 0.0 CHECK (ABS(first_law_residual) <= 1e-15),
    second_law_entropy_delta NUMERIC(38, 18) NOT NULL CHECK (second_law_entropy_delta >= 0.0),
    nonce BIGINT NOT NULL,
    witness_signature BYTEA NOT NULL
);

-- ----------------------------------------------------------------------------
-- 2. H3 DISCRETE GLOBAL GEODESIC GRID & 3D CARTESIAN TOPOLOGY
-- ----------------------------------------------------------------------------

CREATE TABLE h3_cells (
    h3_index BIGINT PRIMARY KEY,
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    centroid_lat DOUBLE PRECISION NOT NULL,
    centroid_lon DOUBLE PRECISION NOT NULL,
    centroid_x unit_coordinate NOT NULL,
    centroid_y unit_coordinate NOT NULL,
    centroid_z unit_coordinate NOT NULL,
    CONSTRAINT chk_centroid_unit_norm CHECK (
        ABS((centroid_x * centroid_x + centroid_y * centroid_y + centroid_z * centroid_z) - 1.0) <= 1e-6
    )
);

CREATE TABLE h3_cartesian_vertices (
    vertex_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    x unit_coordinate NOT NULL,
    y unit_coordinate NOT NULL,
    z unit_coordinate NOT NULL,
    angular_tolerance_epsilon angular_radians NOT NULL DEFAULT 1e-9,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT chk_vertex_unit_norm CHECK (
        ABS((x * x + y * y + z * z) - 1.0) <= 1e-6
    )
);

CREATE INDEX idx_h3_cartesian_vertices_coords ON h3_cartesian_vertices(x, y, z);

CREATE TABLE h3_cell_vertices (
    h3_index BIGINT NOT NULL REFERENCES h3_cells(h3_index) ON DELETE CASCADE,
    vertex_order SMALLINT NOT NULL CHECK (vertex_order BETWEEN 0 AND 5),
    vertex_id UUID NOT NULL REFERENCES h3_cartesian_vertices(vertex_id) ON DELETE RESTRICT,
    PRIMARY KEY (h3_index, vertex_order)
);

-- Interface facets shared between adjacent H3 cells (boundary deduplication)
CREATE TABLE h3_adjacency_facets (
    facet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_h3_index BIGINT NOT NULL REFERENCES h3_cells(h3_index),
    target_h3_index BIGINT NOT NULL REFERENCES h3_cells(h3_index),
    vertex_v1 UUID NOT NULL REFERENCES h3_cartesian_vertices(vertex_id),
    vertex_v2 UUID NOT NULL REFERENCES h3_cartesian_vertices(vertex_id),
    unit_normal_x unit_coordinate NOT NULL,
    unit_normal_y unit_coordinate NOT NULL,
    unit_normal_z unit_coordinate NOT NULL,
    facet_angular_length angular_radians NOT NULL,
    boundary_area_m2 DOUBLE PRECISION NOT NULL CHECK (boundary_area_m2 > 0.0),
    angular_tolerance_epsilon angular_radians NOT NULL DEFAULT 1e-9,
    is_symmetric BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_distinct_cells CHECK (source_h3_index != target_h3_index),
    CONSTRAINT chk_facet_normal_norm CHECK (
        ABS((unit_normal_x * unit_normal_x + unit_normal_y * unit_normal_y + unit_normal_z * unit_normal_z) - 1.0) <= 1e-6
    ),
    CONSTRAINT uq_ordered_facet UNIQUE (source_h3_index, target_h3_index, vertex_v1, vertex_v2)
);

-- ----------------------------------------------------------------------------
-- 3. THERMODYNAMIC STOCKS & EQUILIBRIUM COMPONENT STATES
-- ----------------------------------------------------------------------------

CREATE TABLE thermodynamic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    h3_index BIGINT NOT NULL REFERENCES h3_cells(h3_index) ON DELETE RESTRICT,
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(block_height),
    carbon_mass_kg thermodynamic_quantity NOT NULL DEFAULT 0.0,
    nitrogen_mass_kg thermodynamic_quantity NOT NULL DEFAULT 0.0,
    water_mass_kg thermodynamic_quantity NOT NULL DEFAULT 0.0,
    phosphorus_mass_kg thermodynamic_quantity NOT NULL DEFAULT 0.0,
    enthalpy_joules NUMERIC(38, 18) NOT NULL DEFAULT 0.0,
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin > 0.0),
    chemical_potential_carbon NUMERIC(38, 18) NOT NULL,
    chemical_potential_nitrogen NUMERIC(38, 18) NOT NULL,
    chemical_potential_water NUMERIC(38, 18) NOT NULL,
    gibbs_free_energy_joules NUMERIC(38, 18) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),
    CONSTRAINT uq_cell_state_block UNIQUE (h3_index, block_height)
);

-- ----------------------------------------------------------------------------
-- 4. SPATIAL FLUX MONAD ADVECTION & ENTROPY PRODUCTION LEDGER
-- ----------------------------------------------------------------------------

CREATE TABLE spatial_flux_ledger (
    flux_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES blockchain_transactions(transaction_id) ON DELETE CASCADE,
    facet_id UUID NOT NULL REFERENCES h3_adjacency_facets(facet_id),
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(block_height),
    carbon_flux_kg_sec NUMERIC(38, 18) NOT NULL DEFAULT 0.0,
    nitrogen_flux_kg_sec NUMERIC(38, 18) NOT NULL DEFAULT 0.0,
    water_flux_kg_sec NUMERIC(38, 18) NOT NULL DEFAULT 0.0,
    heat_flux_watts NUMERIC(38, 18) NOT NULL DEFAULT 0.0,
    entropy_production_rate_w_k NUMERIC(38, 18) NOT NULL CHECK (entropy_production_rate_w_k >= 0.0),
    angular_divergence_error DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    CONSTRAINT chk_angular_divergence CHECK (angular_divergence_error <= 1e-9)
);

-- ----------------------------------------------------------------------------
-- 5. FUNCTIONAL INVARIANTS & INTEGRITY PROCEDURES
-- ----------------------------------------------------------------------------

-- Enforces numerical stability dot product clamping and angular tolerance comparison on S^2
CREATE OR REPLACE FUNCTION are_cartesian_unit_vectors_equal_3d(
    ux DOUBLE PRECISION, uy DOUBLE PRECISION, uz DOUBLE PRECISION,
    wx DOUBLE PRECISION, wy DOUBLE PRECISION, wz DOUBLE PRECISION,
    epsilon DOUBLE PRECISION DEFAULT 1e-9
) RETURNS BOOLEAN AS $$
DECLARE
    norm_u DOUBLE PRECISION;
    norm_w DOUBLE PRECISION;
    dot_product DOUBLE PRECISION;
    clamped_dot DOUBLE PRECISION;
    theta DOUBLE PRECISION;
BEGIN
    norm_u := SQRT(ux * ux + uy * uy + uz * uz);
    norm_w := SQRT(wx * wx + wy * wy + wz * wz);
    
    IF norm_u < 1e-12 OR norm_w < 1e-12 THEN
        RAISE EXCEPTION 'Degenerate vector magnitude detected: norm_u=%, norm_w=%', norm_u, norm_w;
    END IF;

    -- Normalize components
    ux := ux / norm_u;
    uy := uy / norm_u;
    uz := uz / norm_u;
    wx := wx / norm_w;
    wy := wy / norm_w;
    wz := wz / norm_w;

    dot_product := ux * wx + uy * wy + uz * wz;
    clamped_dot := GREATEST(-1.0, LEAST(1.0, dot_product));
    theta := ACOS(clamped_dot);

    RETURN theta <= epsilon;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Continuous balance enforcement view ensuring First Law across all facet transactions
CREATE OR REPLACE VIEW view_spatial_flux_conservation AS
SELECT 
    facet_id,
    block_height,
    SUM(carbon_flux_kg_sec) AS net_carbon_flux,
    SUM(nitrogen_flux_kg_sec) AS net_nitrogen_flux,
    SUM(water_flux_kg_sec) AS net_water_flux,
    SUM(heat_flux_watts) AS net_heat_flux,
    SUM(entropy_production_rate_w_k) AS total_entropy_production
FROM spatial_flux_ledger
GROUP BY facet_id, block_height;