-- ============================================================================
-- Web of Life: Planetary Ecological Ledger & Thermodynamic Grid Schema
-- Sprint 080: Runtime Type Assertion for Pentagonal Neighbor Collections
-- Specification: RFC-080 (Spatial Adjacency Defensive Guardrails)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ----------------------------------------------------------------------------
-- Enumerated Types & Thermodynamic Classifications
-- ----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE cell_topology_kind AS ENUM (
        'HEXAGONAL',     -- Planar degree-6 manifold regular cell
        'PENTAGONAL'     -- Singular icosahedral vertex degree-5 cell (12 per H3 resolution)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE spatial_assertion_status AS ENUM (
        'PASSED',
        'TYPE_ERROR_REJECTED',
        'DEGREE_VIOLATION_REJECTED',
        'THERMODYNAMIC_INVARIANT_FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE thermodynamic_flux_type AS ENUM (
        'MASS_ADVECTION',
        'DIFFUSION_CONCENTRATION',
        'ENTROPY_PRODUCTION',
        'BOUNDARY_EXCHANGE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- Planetary Spatial Grid Cells (DGGS H3 Index Registry)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_grid_cells (
    cell_id VARCHAR(15) PRIMARY KEY, -- 64-bit H3Index in hexadecimal notation
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    topology cell_topology_kind NOT NULL DEFAULT 'HEXAGONAL',
    max_degree SMALLINT NOT NULL CHECK (
        (topology = 'PENTAGONAL' AND max_degree = 5) OR
        (topology = 'HEXAGONAL' AND max_degree = 6)
    ),
    centroid GEOMETRY(Point, 4326) NOT NULL,
    boundary GEOMETRY(Polygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spatial_grid_cells_topology 
    ON spatial_grid_cells(topology);

CREATE INDEX IF NOT EXISTS idx_spatial_grid_cells_centroid 
    ON spatial_grid_cells USING GIST(centroid);

-- ----------------------------------------------------------------------------
-- Pentagonal & Hexagonal Adjacency Registries
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_cell_adjacencies (
    cell_id VARCHAR(15) NOT NULL REFERENCES spatial_grid_cells(cell_id) ON DELETE CASCADE,
    neighbor_indices VARCHAR(15)[] NOT NULL,
    neighbor_count SMALLINT GENERATED ALWAYS AS (cardinality(neighbor_indices)) STORED,
    is_valid_array BOOLEAN NOT NULL DEFAULT TRUE,
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pentagon_cardinality CHECK (
        neighbor_count <= 6
    ),
    PRIMARY KEY (cell_id)
);

-- Defensive assertion auditing table for RFC-080
CREATE TABLE IF NOT EXISTS pentagonal_assertion_audit_log (
    assertion_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_cell_id VARCHAR(15) NOT NULL,
    raw_payload_type VARCHAR(64) NOT NULL,
    assertion_result spatial_assertion_status NOT NULL,
    error_message TEXT,
    received_payload JSONB,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    stack_trace TEXT
);

CREATE INDEX IF NOT EXISTS idx_pentagonal_audit_status 
    ON pentagonal_assertion_audit_log(assertion_result, evaluated_at DESC);

-- ----------------------------------------------------------------------------
-- Thermodynamic Stock & State Tensors
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_state_tensors (
    tensor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cell_id VARCHAR(15) NOT NULL REFERENCES spatial_grid_cells(cell_id) ON DELETE CASCADE,
    epoch_timestamp TIMESTAMPTZ NOT NULL,
    biomass_carbon_kg NUMERIC(18, 6) NOT NULL CHECK (biomass_carbon_kg >= 0),
    enthalpy_joules NUMERIC(24, 6) NOT NULL CHECK (enthalpy_joules >= 0),
    temperature_kelvin NUMERIC(8, 4) NOT NULL CHECK (temperature_kelvin > 0),
    chemical_potential NUMERIC(12, 6) NOT NULL,
    entropy_j_per_k NUMERIC(18, 6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cell_epoch UNIQUE (cell_id, epoch_timestamp)
);

CREATE INDEX IF NOT EXISTS idx_spatial_tensors_cell_epoch 
    ON spatial_state_tensors(cell_id, epoch_timestamp DESC);

-- ----------------------------------------------------------------------------
-- Spatial Flux Ledger (Thermodynamic Mass-Energy Conservations)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_flux_monad_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_cell_id VARCHAR(15) NOT NULL REFERENCES spatial_grid_cells(cell_id),
    target_cell_id VARCHAR(15) NOT NULL REFERENCES spatial_grid_cells(cell_id),
    flux_type thermodynamic_flux_type NOT NULL,
    mass_transfer_kg NUMERIC(18, 6) NOT NULL,
    enthalpy_transfer_joules NUMERIC(24, 6) NOT NULL,
    entropy_generated_j_per_k NUMERIC(18, 6) NOT NULL CHECK (entropy_generated_j_per_k >= 0), -- Second Law: dS_gen >= 0
    delta_time_seconds NUMERIC(12, 4) NOT NULL CHECK (delta_time_seconds > 0),
    executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_non_self_flux CHECK (source_cell_id <> target_cell_id)
);

CREATE INDEX IF NOT EXISTS idx_flux_transactions_source_target 
    ON spatial_flux_monad_transactions(source_cell_id, target_cell_id);

-- ----------------------------------------------------------------------------
-- Blockchain Thermodynamic State Block Ledger
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blockchain_thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    previous_block_hash VARCHAR(64) NOT NULL,
    merkle_state_root VARCHAR(64) NOT NULL,
    total_system_mass_kg NUMERIC(30, 6) NOT NULL,
    total_system_enthalpy_j NUMERIC(36, 6) NOT NULL,
    net_entropy_production_j_k NUMERIC(30, 6) NOT NULL CHECK (net_entropy_production_j_k >= 0),
    mass_conservation_delta_kg NUMERIC(18, 12) NOT NULL DEFAULT 0.0 CHECK (mass_conservation_delta_kg = 0.0), -- First Law
    block_signature BYTEA NOT NULL,
    signer_public_key VARCHAR(128) NOT NULL,
    minted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Link individual cell transitions to blockchain blocks
CREATE TABLE IF NOT EXISTS block_spatial_flux_receipts (
    receipt_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL REFERENCES blockchain_thermodynamic_blocks(block_height) ON DELETE RESTRICT,
    transaction_id UUID NOT NULL REFERENCES spatial_flux_monad_transactions(transaction_id) ON DELETE RESTRICT,
    merkle_leaf_hash VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_block_receipts_block_height 
    ON block_spatial_flux_receipts(block_height);