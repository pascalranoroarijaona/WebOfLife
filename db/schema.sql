-- ============================================================================
-- Web of Life: Planetary Thermodynamic Blockchain & Discrete Global Grid Schema
-- Sprint 071: Coincident 3D Boundary Vertex Pair Matching & Conservative Boundary Fluxes
-- Architecture Target: H3 Hexagonal Discrete Global Grid System (DGGS)
-- ============================================================================

-- Extensions for spatial computations, cryptographic integrity, and timescale support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. H3 Discrete Global Grid Topography & Spatial Manifolds
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS h3_cell_centroids (
    cell_index VARCHAR(15) PRIMARY KEY,              -- H3 cell index representation (64-bit uint as hex)
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    centroid_lat DOUBLE PRECISION NOT NULL CHECK (centroid_lat BETWEEN -90.0 AND 90.0),
    centroid_lng DOUBLE PRECISION NOT NULL CHECK (centroid_lng BETWEEN -180.0 AND 180.0),
    centroid_x DOUBLE PRECISION NOT NULL,            -- Geocentric Cartesian X (meters or unit sphere)
    centroid_y DOUBLE PRECISION NOT NULL,            -- Geocentric Cartesian Y (meters or unit sphere)
    centroid_z DOUBLE PRECISION NOT NULL,            -- Geocentric Cartesian Z (meters or unit sphere)
    surface_area_m2 DOUBLE PRECISION NOT NULL CHECK (surface_area_m2 > 0.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS h3_boundary_vertices (
    vertex_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_index VARCHAR(15) NOT NULL REFERENCES h3_cell_centroids(cell_index) ON DELETE CASCADE,
    vertex_order_index SMALLINT NOT NULL CHECK (vertex_order_index BETWEEN 0 AND 5),
    coord_x DOUBLE PRECISION NOT NULL,               -- Cartesian vertex X in R^3
    coord_y DOUBLE PRECISION NOT NULL,               -- Cartesian vertex Y in R^3
    coord_z DOUBLE PRECISION NOT NULL,               -- Cartesian vertex Z in R^3
    radial_norm DOUBLE PRECISION GENERATED ALWAYS AS (
        SQRT(coord_x * coord_x + coord_y * coord_y + coord_z * coord_z)
    ) STORED,
    CONSTRAINT uq_cell_vertex_order UNIQUE (cell_index, vertex_order_index)
);

CREATE INDEX IF NOT EXISTS idx_h3_boundary_vertices_cell ON h3_boundary_vertices(cell_index);

-- ----------------------------------------------------------------------------
-- 2. Coincident 3D Boundary Vertex Pairs & Dual Graph Interfaces
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS h3_coincident_vertex_pairs (
    pair_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_a VARCHAR(15) NOT NULL REFERENCES h3_cell_centroids(cell_index),
    cell_b VARCHAR(15) NOT NULL REFERENCES h3_cell_centroids(cell_index),
    index_a SMALLINT NOT NULL CHECK (index_a BETWEEN 0 AND 5),
    index_b SMALLINT NOT NULL CHECK (index_b BETWEEN 0 AND 5),
    vertex_a_x DOUBLE PRECISION NOT NULL,
    vertex_a_y DOUBLE PRECISION NOT NULL,
    vertex_a_z DOUBLE PRECISION NOT NULL,
    vertex_b_x DOUBLE PRECISION NOT NULL,
    vertex_b_y DOUBLE PRECISION NOT NULL,
    vertex_b_z DOUBLE PRECISION NOT NULL,
    euclidean_distance DOUBLE PRECISION NOT NULL CHECK (euclidean_distance >= 0.0),
    epsilon_applied DOUBLE PRECISION NOT NULL DEFAULT 1.0e-4,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_distinct_cells CHECK (cell_a < cell_b),
    CONSTRAINT chk_coincident_tolerance CHECK (euclidean_distance <= epsilon_applied),
    CONSTRAINT uq_coincident_cell_pair_indices UNIQUE (cell_a, cell_b, index_a, index_b)
);

CREATE INDEX IF NOT EXISTS idx_coincident_cells ON h3_coincident_vertex_pairs(cell_a, cell_b);

CREATE TABLE IF NOT EXISTS h3_boundary_edges (
    edge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_a VARCHAR(15) NOT NULL REFERENCES h3_cell_centroids(cell_index),
    cell_b VARCHAR(15) NOT NULL REFERENCES h3_cell_centroids(cell_index),
    pair1_id UUID NOT NULL REFERENCES h3_coincident_vertex_pairs(pair_id) ON DELETE RESTRICT,
    pair2_id UUID NOT NULL REFERENCES h3_coincident_vertex_pairs(pair_id) ON DELETE RESTRICT,
    symmetric_edge_length_m DOUBLE PRECISION NOT NULL CHECK (symmetric_edge_length_m > 0.0),
    layer_height_m DOUBLE PRECISION NOT NULL DEFAULT 1.0 CHECK (layer_height_m > 0.0),
    contact_area_m2 DOUBLE PRECISION GENERATED ALWAYS AS (
        symmetric_edge_length_m * layer_height_m
    ) STORED,
    midpoint_x DOUBLE PRECISION NOT NULL,
    midpoint_y DOUBLE PRECISION NOT NULL,
    midpoint_z DOUBLE PRECISION NOT NULL,
    normal_x DOUBLE PRECISION NOT NULL,              -- Outward boundary unit normal (A -> B)
    normal_y DOUBLE PRECISION NOT NULL,
    normal_z DOUBLE PRECISION NOT NULL,
    is_normal_unitized BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_canonical_edge_cells CHECK (cell_a < cell_b),
    CONSTRAINT chk_distinct_pairs CHECK (pair1_id <> pair2_id),
    CONSTRAINT uq_edge_cell_pair UNIQUE (cell_a, cell_b)
);

CREATE INDEX IF NOT EXISTS idx_boundary_edges_cells ON h3_boundary_edges(cell_a, cell_b);

-- ----------------------------------------------------------------------------
-- 3. Thermodynamic State Tensors & Stocks
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_cell_states (
    state_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_index VARCHAR(15) NOT NULL REFERENCES h3_cell_centroids(cell_index),
    timestamp_epoch_ms BIGINT NOT NULL,
    mass_density_kg_m3 DOUBLE PRECISION NOT NULL CHECK (mass_density_kg_m3 > 0.0),
    total_mass_kg DOUBLE PRECISION NOT NULL CHECK (total_mass_kg >= 0.0),
    temperature_k DOUBLE PRECISION NOT NULL CHECK (temperature_k > 0.0),
    pressure_pa DOUBLE PRECISION NOT NULL CHECK (pressure_pa >= 0.0),
    enthalpy_j DOUBLE PRECISION NOT NULL,
    entropy_j_k DOUBLE PRECISION NOT NULL,
    tensor_merkle_hash BYTEA NOT NULL,
    CONSTRAINT uq_cell_state_temporal UNIQUE (cell_index, timestamp_epoch_ms)
);

CREATE INDEX IF NOT EXISTS idx_cell_states_temporal ON thermodynamic_cell_states(timestamp_epoch_ms DESC);

-- ----------------------------------------------------------------------------
-- 4. Spatial Flux Monads: Closed Conservative Flows & Dissipation Ledger
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS boundary_flux_transactions (
    flux_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edge_id UUID NOT NULL REFERENCES h3_boundary_edges(edge_id),
    cell_source VARCHAR(15) NOT NULL REFERENCES h3_cell_centroids(cell_index),
    cell_target VARCHAR(15) NOT NULL REFERENCES h3_cell_centroids(cell_index),
    timestep_start_ms BIGINT NOT NULL,
    timestep_end_ms BIGINT NOT NULL,
    duration_seconds DOUBLE PRECISION GENERATED ALWAYS AS (
        (timestep_end_ms - timestep_start_ms)::DOUBLE PRECISION / 1000.0
    ) STORED,
    diffusion_coefficient DOUBLE PRECISION NOT NULL CHECK (diffusion_coefficient >= 0.0),
    mass_flux_kg_per_sec DOUBLE PRECISION NOT NULL,
    enthalpy_flux_w DOUBLE PRECISION NOT NULL,
    delta_mass_source_kg DOUBLE PRECISION NOT NULL,
    delta_mass_target_kg DOUBLE PRECISION NOT NULL,
    first_law_residual_kg DOUBLE GENERATED ALWAYS AS (
        delta_mass_source_kg + delta_mass_target_kg
    ) STORED,
    entropy_production_rate_w_k DOUBLE PRECISION NOT NULL CHECK (entropy_production_rate_w_k >= 0.0),
    flux_signature BYTEA NOT NULL,                   -- Ed25519 signature of the flux state transition
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_valid_duration CHECK (timestep_end_ms > timestep_start_ms),
    CONSTRAINT chk_first_law_conservative CHECK (ABS(delta_mass_source_kg + delta_mass_target_kg) < 1.0e-9)
);

CREATE INDEX IF NOT EXISTS idx_boundary_flux_edge ON boundary_flux_transactions(edge_id, timestep_start_ms);

-- ----------------------------------------------------------------------------
-- 5. Blockchain Block Invariant Audits & Cryptographic Anchors
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    previous_block_hash BYTEA NOT NULL,
    state_merkle_root BYTEA NOT NULL,
    flux_receipts_root BYTEA NOT NULL,
    block_hash BYTEA NOT NULL UNIQUE,
    timestamp_epoch_ms BIGINT NOT NULL,
    total_boundary_mass_leak_kg DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (ABS(total_boundary_mass_leak_kg) < 1.0e-8),
    total_entropy_generated_j_k DOUBLE PRECISION NOT NULL CHECK (total_entropy_generated_j_k >= 0.0),
    validator_node_id VARCHAR(64) NOT NULL,
    validator_signature BYTEA NOT NULL,
    block_sealed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS block_flux_inclusions (
    block_height BIGINT NOT NULL REFERENCES thermodynamic_blocks(block_height) ON DELETE CASCADE,
    flux_id UUID NOT NULL REFERENCES boundary_flux_transactions(flux_id) ON DELETE RESTRICT,
    tx_index INTEGER NOT NULL,
    PRIMARY KEY (block_height, tx_index)
);

CREATE INDEX IF NOT EXISTS idx_block_flux_inclusions_flux ON block_flux_inclusions(flux_id);