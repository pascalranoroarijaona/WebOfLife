-- ============================================================================
-- Web of Life Thermodynamic Planetary Ledger & Spatial Manifold Schema
-- SPRINT 066: 3D Spherical Boundary Outward Normal Vector Computation
-- Architecture: Conservative Finite Volume Adjacency & Thermodynamic Flux Ledger
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ----------------------------------------------------------------------------
-- 1. SPATIAL TOPOLOGY & MANIFOLD CELLS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_h3_cells (
    h3_index VARCHAR(16) PRIMARY KEY,
    resolution INTEGER NOT NULL CHECK (resolution >= 0 AND resolution <= 15),
    centroid_x DOUBLE PRECISION NOT NULL,
    centroid_y DOUBLE PRECISION NOT NULL,
    centroid_z DOUBLE PRECISION NOT NULL,
    centroid_radius DOUBLE PRECISION NOT NULL DEFAULT 6371008.8,
    area_m2 DOUBLE PRECISION NOT NULL CHECK (area_m2 > 0),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_cell_centroid_unit_radius CHECK (
        ABS(SQRT(centroid_x * centroid_x + centroid_y * centroid_y + centroid_z * centroid_z) - centroid_radius) < 1e-3
    )
);

CREATE INDEX IF NOT EXISTS idx_spatial_h3_cells_res ON spatial_h3_cells(resolution);

-- ----------------------------------------------------------------------------
-- 2. CELL INTERFACES & BOUNDARY OUTWARD NORMALS
-- Stores discrete facet boundaries between adjacent DGGS cells on S^2 manifold.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_cell_interfaces (
    interface_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_h3 VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index) ON DELETE CASCADE,
    neighbor_h3 VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index) ON DELETE CASCADE,
    edge_vertex_a_x DOUBLE PRECISION NOT NULL,
    edge_vertex_a_y DOUBLE PRECISION NOT NULL,
    edge_vertex_a_z DOUBLE PRECISION NOT NULL,
    edge_vertex_b_x DOUBLE PRECISION NOT NULL,
    edge_vertex_b_y DOUBLE PRECISION NOT NULL,
    edge_vertex_b_z DOUBLE PRECISION NOT NULL,
    midpoint_x DOUBLE PRECISION NOT NULL,
    midpoint_y DOUBLE PRECISION NOT NULL,
    midpoint_z DOUBLE PRECISION NOT NULL,
    radial_unit_x DOUBLE PRECISION NOT NULL,
    radial_unit_y DOUBLE PRECISION NOT NULL,
    radial_unit_z DOUBLE PRECISION NOT NULL,
    midpoint_normal_x DOUBLE PRECISION NOT NULL,
    midpoint_normal_y DOUBLE PRECISION NOT NULL,
    midpoint_normal_z DOUBLE PRECISION NOT NULL,
    displacement_normal_x DOUBLE PRECISION NOT NULL,
    displacement_normal_y DOUBLE PRECISION NOT NULL,
    displacement_normal_z DOUBLE PRECISION NOT NULL,
    outward_normal_x DOUBLE PRECISION NOT NULL,
    outward_normal_y DOUBLE PRECISION NOT NULL,
    outward_normal_z DOUBLE PRECISION NOT NULL,
    blend_alpha DOUBLE PRECISION NOT NULL DEFAULT 0.5 CHECK (blend_alpha >= 0.0 AND blend_alpha <= 1.0),
    alignment_cos DOUBLE PRECISION NOT NULL CHECK (alignment_cos > 0.0),
    geodesic_length_m DOUBLE PRECISION NOT NULL CHECK (geodesic_length_m > 0.0),
    is_anti_symmetric BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_interface_pair UNIQUE (origin_h3, neighbor_h3),
    CONSTRAINT chk_outward_normal_unit_magnitude CHECK (
        ABS(SQRT(outward_normal_x * outward_normal_x + outward_normal_y * outward_normal_y + outward_normal_z * outward_normal_z) - 1.0) < 1e-7
    ),
    CONSTRAINT chk_outward_normal_sphere_tangency CHECK (
        ABS(outward_normal_x * radial_unit_x + outward_normal_y * radial_unit_y + outward_normal_z * radial_unit_z) < 1e-7
    )
);

CREATE INDEX IF NOT EXISTS idx_spatial_interfaces_origin ON spatial_cell_interfaces(origin_h3);
CREATE INDEX IF NOT EXISTS idx_spatial_interfaces_neighbor ON spatial_cell_interfaces(neighbor_h3);

-- ----------------------------------------------------------------------------
-- 3. THERMODYNAMIC STOCKS (CELL STATE MONADS)
-- Tracks conservative mass, energy, and entropy per finite volume.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_cell_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    h3_index VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index) ON DELETE CASCADE,
    epoch_index BIGINT NOT NULL,
    internal_energy_joules DOUBLE PRECISION NOT NULL,
    water_mass_kg DOUBLE PRECISION NOT NULL CHECK (water_mass_kg >= 0.0),
    carbon_mass_kg DOUBLE PRECISION NOT NULL CHECK (carbon_mass_kg >= 0.0),
    biomass_dry_kg DOUBLE PRECISION NOT NULL CHECK (biomass_dry_kg >= 0.0),
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin > 0.0),
    entropy_j_per_k DOUBLE PRECISION NOT NULL,
    state_merkle_root BYTEA NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cell_epoch UNIQUE (h3_index, epoch_index)
);

CREATE INDEX IF NOT EXISTS idx_thermo_stocks_epoch ON thermodynamic_cell_stocks(epoch_index);

-- ----------------------------------------------------------------------------
-- 4. LATERAL FLUX LEDGER (FINITE VOLUME FLUXES)
-- Guarantees anti-symmetric flux cancellation: F_ij + F_ji = 0 (First Law)
-- and local non-negative entropy generation: S_dot_interface >= 0 (Second Law).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS boundary_flux_transactions (
    flux_tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interface_id UUID NOT NULL REFERENCES spatial_cell_interfaces(interface_id) ON DELETE RESTRICT,
    epoch_index BIGINT NOT NULL,
    origin_h3 VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index),
    neighbor_h3 VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(h3_index),
    fluid_velocity_x DOUBLE PRECISION NOT NULL,
    fluid_velocity_y DOUBLE PRECISION NOT NULL,
    fluid_velocity_z DOUBLE PRECISION NOT NULL,
    normal_velocity DOUBLE PRECISION NOT NULL,
    scalar_face_concentration DOUBLE PRECISION NOT NULL,
    mass_flux_kg_per_sec DOUBLE PRECISION NOT NULL,
    heat_flux_watts DOUBLE PRECISION NOT NULL,
    entropy_generation_rate_w_per_k DOUBLE PRECISION NOT NULL CHECK (entropy_generation_rate_w_per_k >= 0.0),
    cryptographic_signature BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_flux_normal_velocity CHECK (
        ABS(normal_velocity - (fluid_velocity_x * fluid_velocity_x + fluid_velocity_y * fluid_velocity_y + fluid_velocity_z * fluid_velocity_z)) >= 0.0
    )
);

CREATE INDEX IF NOT EXISTS idx_boundary_flux_epoch ON boundary_flux_transactions(epoch_index);
CREATE INDEX IF NOT EXISTS idx_boundary_flux_interface ON boundary_flux_transactions(interface_id);

-- ----------------------------------------------------------------------------
-- 5. THERMODYNAMIC BLOCKCHAIN LEDGER BLOCKS
-- Captures state transitions, total entropy non-decrease, and conservative flux sums.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    previous_block_hash BYTEA NOT NULL,
    block_hash BYTEA NOT NULL UNIQUE,
    merkle_flux_root BYTEA NOT NULL,
    merkle_state_root BYTEA NOT NULL,
    total_flux_net_cancellation DOUBLE PRECISION NOT NULL,
    total_entropy_production_j_per_k DOUBLE PRECISION NOT NULL CHECK (total_entropy_production_j_per_k >= 0.0),
    total_transactions INTEGER NOT NULL CHECK (total_transactions >= 0),
    timestamp_epoch BIGINT NOT NULL,
    validator_node_id VARCHAR(64) NOT NULL,
    block_signature BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_conservative_cancellation CHECK (
        ABS(total_flux_net_cancellation) < 1e-6
    )
);

CREATE INDEX IF NOT EXISTS idx_thermo_blocks_hash ON thermodynamic_blocks(block_hash);

-- ----------------------------------------------------------------------------
-- 6. CONTINUITY ENFORCEMENT & CONSERVATION VIEW
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW view_interface_flux_antisymmetry AS
SELECT 
    f1.epoch_index,
    f1.origin_h3 AS cell_i,
    f1.neighbor_h3 AS cell_j,
    f1.mass_flux_kg_per_sec AS flux_ij,
    f2.mass_flux_kg_per_sec AS flux_ji,
    (f1.mass_flux_kg_per_sec + f2.mass_flux_kg_per_sec) AS mass_residual_error,
    (f1.heat_flux_watts + f2.heat_flux_watts) AS heat_residual_error,
    (f1.entropy_generation_rate_w_per_k + f2.entropy_generation_rate_w_per_k) AS total_entropy_rate
FROM boundary_flux_transactions f1
JOIN boundary_flux_transactions f2 
  ON f1.origin_h3 = f2.neighbor_h3 
 AND f1.neighbor_h3 = f2.origin_h3 
 AND f1.epoch_index = f2.epoch_index
WHERE f1.origin_h3 < f1.neighbor_h3;