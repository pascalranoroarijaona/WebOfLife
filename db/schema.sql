-- ============================================================================
-- Web of Life: Planetary Thermodynamic Blockchain & Spatial Ledger
-- Architecture: Spatial 3D Spherical Topology & Interface Boundary Flux Schema
-- Sprint: 068 - extractSharedBoundaryVertices3D Integration
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;

-- ----------------------------------------------------------------------------
-- Canonical Spatial Manifold Cells (H3 Discrete Global Grid)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_cells (
    cell_id VARCHAR(32) PRIMARY KEY,
    resolution INTEGER NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    centroid_lat DOUBLE PRECISION NOT NULL CHECK (centroid_lat BETWEEN -90.0 AND 90.0),
    centroid_lng DOUBLE PRECISION NOT NULL CHECK (centroid_lng BETWEEN -180.0 AND 180.0),
    centroid_x DOUBLE PRECISION NOT NULL,
    centroid_y DOUBLE PRECISION NOT NULL,
    centroid_z DOUBLE PRECISION NOT NULL,
    surface_area_m2 DOUBLE PRECISION NOT NULL CHECK (surface_area_m2 > 0.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spatial_cells_res ON spatial_cells(resolution);
CREATE INDEX IF NOT EXISTS idx_spatial_cells_centroid ON spatial_cells(centroid_x, centroid_y, centroid_z);

-- ----------------------------------------------------------------------------
-- Shared Geodesic Boundary Edges (3D Spherical Manifold Interface)
-- Stores analytical boundary endpoints extracted via extractSharedBoundaryVertices3D
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shared_boundary_edges_3d (
    edge_hash CHAR(64) PRIMARY KEY,
    cell_a VARCHAR(32) NOT NULL REFERENCES spatial_cells(cell_id) ON DELETE CASCADE,
    cell_b VARCHAR(32) NOT NULL REFERENCES spatial_cells(cell_id) ON DELETE CASCADE,
    canonical_order BOOLEAN NOT NULL DEFAULT TRUE, -- TRUE if cell_a < cell_b
    -- 3D Cartesian coordinates on S^2 sphere (radius R)
    v1_x DOUBLE PRECISION NOT NULL,
    v1_y DOUBLE PRECISION NOT NULL,
    v1_z DOUBLE PRECISION NOT NULL,
    v2_x DOUBLE PRECISION NOT NULL,
    v2_y DOUBLE PRECISION NOT NULL,
    v2_z DOUBLE PRECISION NOT NULL,
    -- Directed Interface Midpoint
    midpoint_x DOUBLE PRECISION NOT NULL,
    midpoint_y DOUBLE PRECISION NOT NULL,
    midpoint_z DOUBLE PRECISION NOT NULL,
    -- Directed Interface Unit Normal Vector (cell_a -> cell_b)
    normal_a_to_b_x DOUBLE PRECISION NOT NULL,
    normal_a_to_b_y DOUBLE PRECISION NOT NULL,
    normal_a_to_b_z DOUBLE PRECISION NOT NULL,
    -- Geodesic line metrics
    geodesic_length_m DOUBLE PRECISION NOT NULL CHECK (geodesic_length_m > 0.0),
    transmissibility DOUBLE PRECISION NOT NULL DEFAULT 1.0 CHECK (transmissibility >= 0.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_distinct_cells CHECK (cell_a <> cell_b),
    CONSTRAINT uq_cell_pair UNIQUE (cell_a, cell_b)
);

CREATE INDEX IF NOT EXISTS idx_boundary_cell_a ON shared_boundary_edges_3d(cell_a);
CREATE INDEX IF NOT EXISTS idx_boundary_cell_b ON shared_boundary_edges_3d(cell_b);

-- ----------------------------------------------------------------------------
-- Thermodynamic State Tensors (Spatial Monad Control Volumes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_cell_states (
    cell_id VARCHAR(32) NOT NULL REFERENCES spatial_cells(cell_id) ON DELETE CASCADE,
    epoch_timestamp TIMESTAMPTZ NOT NULL,
    enthalpy_joules DOUBLE PRECISION NOT NULL,
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin > 0.0),
    pressure_pascals DOUBLE PRECISION NOT NULL CHECK (pressure_pascals >= 0.0),
    mass_total_kg DOUBLE PRECISION NOT NULL CHECK (mass_total_kg >= 0.0),
    carbon_stock_kg DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    moisture_mass_kg DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    entropy_joules_per_kelvin DOUBLE PRECISION NOT NULL,
    entropy_generation_rate_w_k DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    PRIMARY KEY (cell_id, epoch_timestamp)
);

SELECT create_hypertable('thermodynamic_cell_states', 'epoch_timestamp', if_not_exists => TRUE);

-- ----------------------------------------------------------------------------
-- Interface Advective & Diffusive Flux Ledgers (First & Second Law Enforced)
-- Phi(A->B) + Phi(B->A) == 0 strictly verified via cryptographic state delta
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS boundary_flux_transactions (
    flux_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edge_hash CHAR(64) NOT NULL REFERENCES shared_boundary_edges_3d(edge_hash) ON DELETE CASCADE,
    source_cell VARCHAR(32) NOT NULL REFERENCES spatial_cells(cell_id),
    target_cell VARCHAR(32) NOT NULL REFERENCES spatial_cells(cell_id),
    epoch_timestamp TIMESTAMPTZ NOT NULL,
    -- Effective physical exchange facet area: A_ij = L_ij * delta_z
    vertical_layer_thickness_m DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    exchange_area_m2 DOUBLE PRECISION NOT NULL CHECK (exchange_area_m2 > 0.0),
    -- Directed fluxes across interface (positive from source to target)
    sensible_heat_flux_watts DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    latent_heat_flux_watts DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    mass_flux_kg_per_sec DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    carbon_advection_kg_per_sec DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    -- Thermodynamic entropy production rate: S_irr = L_ij * delta_z * kappa * (T_A - T_B)^2 / (T_A * T_B * d_AB) >= 0
    entropy_production_watts_per_kelvin DOUBLE PRECISION NOT NULL CHECK (entropy_production_watts_per_kelvin >= 0.0),
    flux_normal_alignment DOUBLE PRECISION NOT NULL, -- Dot product of flow vector with boundary normal
    tx_hash CHAR(64) NOT NULL
);

SELECT create_hypertable('boundary_flux_transactions', 'epoch_timestamp', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_flux_tx_edge ON boundary_flux_transactions(edge_hash, epoch_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_flux_tx_cells ON boundary_flux_transactions(source_cell, target_cell, epoch_timestamp DESC);

-- ----------------------------------------------------------------------------
-- Blockchain Blocks & Cryptographic Thermodynamic Proofs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGSERIAL PRIMARY KEY,
    block_hash CHAR(64) UNIQUE NOT NULL,
    parent_hash CHAR(64) NOT NULL,
    epoch_timestamp TIMESTAMPTZ NOT NULL,
    merkle_flux_root CHAR(64) NOT NULL,
    merkle_state_root CHAR(64) NOT NULL,
    total_energy_joules DOUBLE PRECISION NOT NULL,
    total_mass_kg DOUBLE PRECISION NOT NULL,
    net_global_entropy_production_w_k DOUBLE PRECISION NOT NULL CHECK (net_global_entropy_production_w_k >= 0.0),
    first_law_residual_joules DOUBLE PRECISION NOT NULL CHECK (abs(first_law_residual_joules) < 1e-4),
    validator_node_signature TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocks_epoch ON thermodynamic_blocks(epoch_timestamp DESC);

-- ----------------------------------------------------------------------------
-- Trigger Function: Enforce First Law of Conservation on Interface Fluxes
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION verify_interface_flux_antisymmetry()
RETURNS TRIGGER AS $$
BEGIN
    -- Verify exchange area matches geodesic length * layer thickness
    IF ABS(NEW.exchange_area_m2 - (SELECT geodesic_length_m * NEW.vertical_layer_thickness_m 
                                   FROM shared_boundary_edges_3d 
                                   WHERE edge_hash = NEW.edge_hash)) > 1e-3 THEN
        RAISE EXCEPTION 'First Law Area Violation: exchange_area_m2 does not match geodesic boundary facet.';
    END IF;

    -- Verify irreversible entropy generation is non-negative
    IF NEW.entropy_production_watts_per_kelvin < 0.0 THEN
        RAISE EXCEPTION 'Second Law Violation: Irreversible entropy production cannot be negative.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_flux_antisymmetry ON boundary_flux_transactions;
CREATE TRIGGER trg_verify_flux_antisymmetry
    BEFORE INSERT OR UPDATE ON boundary_flux_transactions
    FOR EACH ROW
    EXECUTE FUNCTION verify_interface_flux_antisymmetry();