-- ============================================================================
-- Web of Life: Thermodynamic Blockchain & Planetary Discrete Geodesic Schema
-- Sprint 075: Coordination Number Adjacency Verification (RFC-075)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- Domain Enumerations & Types
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cell_polygon_type') THEN
        CREATE TYPE cell_polygon_type AS ENUM ('HEXAGON', 'PENTAGON');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'flux_vector_state') THEN
        CREATE TYPE flux_vector_state AS ENUM ('CONSERVED', 'DEFECTIVE', 'RECONCILED');
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Core Discrete Global Geodesic Grid (DGGS) Cells
-- Captures spherical icosahedral tessellation (12 pentagons per resolution)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_h3_cells (
    cell_index VARCHAR(16) PRIMARY KEY, -- 64-bit Hexadecimal H3 representation
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    polygon_type cell_polygon_type NOT NULL,
    is_pentagon BOOLEAN NOT NULL GENERATED ALWAYS AS (polygon_type = 'PENTAGON') STORED,
    coordination_number SMALLINT NOT NULL CHECK (coordination_number IN (5, 6)),
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90.0 AND 90.0),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180.0 AND 180.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Invariant: Pentagons must have coordination number 5; Hexagons must have 6
    CONSTRAINT chk_h3_coordination_geometry CHECK (
        (polygon_type = 'PENTAGON' AND coordination_number = 5) OR
        (polygon_type = 'HEXAGON' AND coordination_number = 6)
    )
);

CREATE INDEX IF NOT EXISTS idx_spatial_h3_cells_res_type 
    ON spatial_h3_cells (resolution, polygon_type);

-- ----------------------------------------------------------------------------
-- H3 Directional Adjacency Graph
-- Represents explicit directed pairwise interface edges
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_h3_adjacencies (
    source_cell VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(cell_index) ON DELETE RESTRICT,
    neighbor_cell VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(cell_index) ON DELETE RESTRICT,
    directional_index SMALLINT NOT NULL CHECK (directional_index BETWEEN 0 AND 5),
    contact_edge_length_m DOUBLE PRECISION NOT NULL CHECK (contact_edge_length_m > 0.0),
    boundary_normal_vector DOUBLE PRECISION[3] NOT NULL,
    PRIMARY KEY (source_cell, neighbor_cell),
    CONSTRAINT chk_no_self_adjacency CHECK (source_cell <> neighbor_cell)
);

CREATE INDEX IF NOT EXISTS idx_spatial_adj_neighbor 
    ON spatial_h3_adjacencies (neighbor_cell);

-- ----------------------------------------------------------------------------
-- Topological Neighborhood Verification Ledger
-- Enforces zero-allocation isExpectedNeighborCount integrity checks per block
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS topological_neighborhood_verifications (
    verification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL,
    cell_index VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(cell_index) ON DELETE RESTRICT,
    candidate_neighbor_count SMALLINT NOT NULL CHECK (candidate_neighbor_count >= 0),
    expected_coordination_number SMALLINT NOT NULL CHECK (expected_coordination_number IN (5, 6)),
    is_valid BOOLEAN NOT NULL,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verification_digest BYTEA NOT NULL, -- SHA-256 (block_height || cell_index || candidate_count || is_valid)

    CONSTRAINT chk_verification_validity_match CHECK (
        is_valid = (candidate_neighbor_count = expected_coordination_number)
    )
);

CREATE INDEX IF NOT EXISTS idx_topo_verif_block_cell 
    ON topological_neighborhood_verifications (block_height, cell_index);

-- ----------------------------------------------------------------------------
-- Thermodynamic Stock State Ledger (Monadic Snapshots)
-- Mass, Enthalpy, and Entropy states attached to verified cells
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_thermodynamic_stocks (
    stock_snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL,
    cell_index VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(cell_index) ON DELETE RESTRICT,
    mass_kg NUMERIC(28, 10) NOT NULL CHECK (mass_kg >= 0.0),
    enthalpy_joules NUMERIC(38, 10) NOT NULL,
    entropy_j_per_k NUMERIC(28, 10) NOT NULL CHECK (entropy_j_per_k >= 0.0),
    temperature_kelvin NUMERIC(10, 4) NOT NULL CHECK (temperature_kelvin > 0.0),
    laplacian_degree SMALLINT NOT NULL CHECK (laplacian_degree IN (5, 6)),
    is_neighborhood_verified BOOLEAN NOT NULL DEFAULT FALSE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_laplacian_coordination_sync CHECK (
        laplacian_degree IN (5, 6)
    )
);

CREATE INDEX IF NOT EXISTS idx_thermo_stocks_block_cell 
    ON spatial_thermodynamic_stocks (block_height, cell_index);

-- ----------------------------------------------------------------------------
-- Thermodynamic Flux Transactions
-- Discrete divergence transport verified against First and Second Laws
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_flux_transactions (
    tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL,
    source_cell VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(cell_index),
    target_cell VARCHAR(16) NOT NULL REFERENCES spatial_h3_cells(cell_index),
    mass_flux_kg_per_sec NUMERIC(24, 10) NOT NULL,
    heat_flux_watts NUMERIC(30, 10) NOT NULL,
    interface_area_m2 NUMERIC(18, 6) NOT NULL CHECK (interface_area_m2 > 0.0),
    verification_id UUID NOT NULL REFERENCES topological_neighborhood_verifications(verification_id),
    flux_state flux_vector_state NOT NULL DEFAULT 'CONSERVED',
    tx_signature BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_flux_cells_distinct CHECK (source_cell <> target_cell)
);

CREATE INDEX IF NOT EXISTS idx_flux_tx_block_cells 
    ON spatial_flux_transactions (block_height, source_cell, target_cell);

-- ----------------------------------------------------------------------------
-- Thermodynamic Blockchain Blocks
-- Enforces closed 2-manifold Euler invariant and global divergence closure
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_blockchain_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash BYTEA NOT NULL UNIQUE,
    prev_block_hash BYTEA NOT NULL,
    merkle_flux_root BYTEA NOT NULL,
    merkle_topology_root BYTEA NOT NULL,
    total_pentagons SMALLINT NOT NULL CHECK (total_pentagons = 12), -- Global Euler requirement
    net_mass_divergence_residual NUMERIC(28, 18) NOT NULL CHECK (abs(net_mass_divergence_residual) < 1e-12),
    net_heat_divergence_residual NUMERIC(32, 18) NOT NULL CHECK (abs(net_heat_divergence_residual) < 1e-12),
    validator_node_id VARCHAR(64) NOT NULL,
    validator_signature BYTEA NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Foreign key linking block height in verification and flux tables
ALTER TABLE topological_neighborhood_verifications
    ADD CONSTRAINT fk_topo_block_height
    FOREIGN KEY (block_height) REFERENCES thermodynamic_blockchain_blocks(block_height);

ALTER TABLE spatial_thermodynamic_stocks
    ADD CONSTRAINT fk_stock_block_height
    FOREIGN KEY (block_height) REFERENCES thermodynamic_blockchain_blocks(block_height);

ALTER TABLE spatial_flux_transactions
    ADD CONSTRAINT fk_flux_block_height
    FOREIGN KEY (block_height) REFERENCES thermodynamic_blockchain_blocks(block_height);

-- ----------------------------------------------------------------------------
-- Continuous Divergence Audit View
-- Verifies First Law pairwise anti-symmetry and divergence closure across cells
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW view_flux_divergence_audit AS
SELECT 
    f.block_height,
    f.source_cell AS cell_index,
    COUNT(f.target_cell) AS active_neighbor_count,
    v.expected_coordination_number,
    v.is_valid AS topology_valid,
    SUM(f.mass_flux_kg_per_sec) AS net_mass_divergence,
    SUM(f.heat_flux_watts) AS net_heat_divergence
FROM spatial_flux_transactions f
JOIN topological_neighborhood_verifications v 
    ON f.verification_id = v.verification_id
GROUP BY f.block_height, f.source_cell, v.expected_coordination_number, v.is_valid;