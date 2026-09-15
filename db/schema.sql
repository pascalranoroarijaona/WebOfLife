-- Web of Life Thermodynamic Blockchain Schema
-- Sprint 073: Spherical Angular Tolerance Validation & Shared Boundary Closure
-- Enforces topological manifold continuity and First Law of Thermodynamics across DGGS cell interfaces.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enum types for coordinate systems and validation statuses
DO $$ BEGIN
    CREATE TYPE coordinate_system_unit AS ENUM ('RADIANS', 'DEGREES');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE boundary_validation_status AS ENUM ('CONVERGED', 'BREACHED', 'BYPASS_CHECKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE flux_direction AS ENUM ('FORWARD', 'REVERSE', 'NET_ZERO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ---------------------------------------------------------------------
-- DGGS H3 Cells Registry
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_cells (
    cell_id VARCHAR(15) PRIMARY KEY, -- 15-character H3 canonical index
    resolution INTEGER NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    centroid_lat DOUBLE PRECISION NOT NULL CHECK (centroid_lat BETWEEN -90.0 AND 90.0),
    centroid_lng DOUBLE PRECISION NOT NULL CHECK (centroid_lng BETWEEN -180.0 AND 180.0),
    centroid_lat_rad DOUBLE PRECISION GENERATED ALWAYS AS (radians(centroid_lat)) STORED,
    centroid_lng_rad DOUBLE PRECISION GENERATED ALWAYS AS (radians(centroid_lng)) STORED,
    geom GEOMETRY(Polygon, 4326) NOT NULL,
    thermodynamic_stock_entropy DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (thermodynamic_stock_entropy >= 0.0),
    thermodynamic_stock_enthalpy DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_h3_cells_geom ON h3_cells USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_h3_cells_res ON h3_cells (resolution);

-- ---------------------------------------------------------------------
-- H3 Directed Boundary Adjacency Edges
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_boundary_edges (
    edge_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_cell_id VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_id) ON DELETE CASCADE,
    destination_cell_id VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_id) ON DELETE CASCADE,
    edge_index INTEGER NOT NULL CHECK (edge_index BETWEEN 0 AND 5),
    start_lat_rad DOUBLE PRECISION NOT NULL CHECK (start_lat_rad BETWEEN -pi()/2 AND pi()/2),
    start_lng_rad DOUBLE PRECISION NOT NULL CHECK (start_lng_rad BETWEEN -pi() AND pi()),
    end_lat_rad DOUBLE PRECISION NOT NULL CHECK (end_lat_rad BETWEEN -pi()/2 AND pi()/2),
    end_lng_rad DOUBLE PRECISION NOT NULL CHECK (end_lng_rad BETWEEN -pi() AND pi()),
    boundary_length_meters DOUBLE PRECISION NOT NULL CHECK (boundary_length_meters >= 0.0),
    normal_vector_x DOUBLE PRECISION NOT NULL,
    normal_vector_y DOUBLE PRECISION NOT NULL,
    normal_vector_z DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_origin_destination_edge UNIQUE (origin_cell_id, destination_cell_id),
    CONSTRAINT chk_different_cells CHECK (origin_cell_id <> destination_cell_id)
);

CREATE INDEX IF NOT EXISTS idx_h3_edges_origin ON h3_boundary_edges (origin_cell_id);
CREATE INDEX IF NOT EXISTS idx_h3_edges_dest ON h3_boundary_edges (destination_cell_id);

-- ---------------------------------------------------------------------
-- Spherical Angular Tolerance Verifications (RFC-073 Invariant Audit)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS boundary_endpoint_validations (
    validation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edge_id UUID NOT NULL REFERENCES h3_boundary_edges(edge_id) ON DELETE CASCADE,
    reverse_edge_id UUID REFERENCES h3_boundary_edges(edge_id) ON DELETE SET NULL,
    endpoint_a_lat_rad DOUBLE PRECISION NOT NULL CHECK (endpoint_a_lat_rad BETWEEN -pi()/2 AND pi()/2),
    endpoint_a_lng_rad DOUBLE PRECISION NOT NULL CHECK (endpoint_a_lng_rad BETWEEN -pi() AND pi()),
    endpoint_b_lat_rad DOUBLE PRECISION NOT NULL CHECK (endpoint_b_lat_rad BETWEEN -pi()/2 AND pi()/2),
    endpoint_b_lng_rad DOUBLE PRECISION NOT NULL CHECK (endpoint_b_lng_rad BETWEEN -pi() AND pi()),
    calculated_angular_distance_rad DOUBLE PRECISION NOT NULL CHECK (calculated_angular_distance_rad >= 0.0),
    tolerance_threshold_rad DOUBLE PRECISION NOT NULL DEFAULT 1.0e-6 CHECK (tolerance_threshold_rad > 0.0),
    validation_status boundary_validation_status NOT NULL,
    error_message TEXT,
    execution_context VARCHAR(255) NOT NULL DEFAULT 'H3AdjacencyGraph.validateSharedBoundaries',
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_valid_tolerance CHECK (
        (validation_status = 'CONVERGED' AND calculated_angular_distance_rad <= tolerance_threshold_rad) OR
        (validation_status = 'BREACHED' AND calculated_angular_distance_rad > tolerance_threshold_rad) OR
        (validation_status = 'BYPASS_CHECKED')
    )
);

CREATE INDEX IF NOT EXISTS idx_boundary_validations_edge ON boundary_endpoint_validations (edge_id);
CREATE INDEX IF NOT EXISTS idx_boundary_validations_status ON boundary_endpoint_validations (validation_status);

-- ---------------------------------------------------------------------
-- Edge Flux Metrics & Spatial Conduit Cache
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS edge_flux_conduits (
    conduit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edge_id UUID NOT NULL REFERENCES h3_boundary_edges(edge_id) ON DELETE RESTRICT,
    validation_id UUID NOT NULL REFERENCES boundary_endpoint_validations(validation_id) ON DELETE RESTRICT,
    diffusive_permeability DOUBLE PRECISION NOT NULL DEFAULT 1.0 CHECK (diffusive_permeability >= 0.0),
    effective_length_rad DOUBLE PRECISION NOT NULL CHECK (effective_length_rad >= 0.0),
    diffusion_coefficient DOUBLE PRECISION NOT NULL CHECK (diffusion_coefficient >= 0.0),
    is_manifold_sealed BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flux_conduits_edge ON edge_flux_conduits (edge_id);

-- ---------------------------------------------------------------------
-- Thermodynamic Stock Ledger & Conserved Flux Transactions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_stock_ledger (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conduit_id UUID NOT NULL REFERENCES edge_flux_conduits(conduit_id) ON DELETE RESTRICT,
    source_cell_id VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_id) ON DELETE RESTRICT,
    target_cell_id VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_id) ON DELETE RESTRICT,
    enthalpy_delta_joules DOUBLE PRECISION NOT NULL,
    entropy_delta_joules_per_kelvin DOUBLE PRECISION NOT NULL CHECK (entropy_delta_joules_per_kelvin >= 0.0),
    mass_delta_kg DOUBLE PRECISION NOT NULL,
    flux_vector_direction flux_direction NOT NULL,
    first_law_residual_joules DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (abs(first_law_residual_joules) <= 1.0e-12),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_different_flux_cells CHECK (source_cell_id <> target_cell_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_ledger_cells ON thermodynamic_stock_ledger (source_cell_id, target_cell_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_conduit ON thermodynamic_stock_ledger (conduit_id);

-- ---------------------------------------------------------------------
-- Blockchain Block Headers & State Invariant Signatures
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_height BIGSERIAL PRIMARY KEY,
    block_hash BYTEA NOT NULL UNIQUE CHECK (length(block_hash) = 32),
    parent_block_hash BYTEA NOT NULL CHECK (length(parent_block_hash) = 32),
    state_merkle_root BYTEA NOT NULL CHECK (length(state_merkle_root) = 32),
    spatial_topology_merkle_root BYTEA NOT NULL CHECK (length(spatial_topology_merkle_root) = 32),
    boundary_verification_digest BYTEA NOT NULL CHECK (length(boundary_verification_digest) = 32),
    total_entropy_accumulated DOUBLE PRECISION NOT NULL CHECK (total_entropy_accumulated >= 0.0),
    total_enthalpy_accumulated DOUBLE PRECISION NOT NULL,
    minted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocks_hash ON blockchain_blocks (block_hash);

-- ---------------------------------------------------------------------
-- Blockchain Stock Transaction Signatures & Inclusion Proofs
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_transaction_signatures (
    signature_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(block_height) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES thermodynamic_stock_ledger(transaction_id) ON DELETE RESTRICT,
    secp256k1_signature BYTEA NOT NULL CHECK (length(secp256k1_signature) = 64),
    signer_public_key BYTEA NOT NULL CHECK (length(signer_public_key) = 33),
    merkle_leaf_hash BYTEA NOT NULL CHECK (length(merkle_leaf_hash) = 32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_block_transaction UNIQUE (block_height, transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_tx_signatures_block ON stock_transaction_signatures (block_height);
CREATE INDEX IF NOT EXISTS idx_tx_signatures_tx ON stock_transaction_signatures (transaction_id);