-- ============================================================================
-- Web of Life: Thermodynamic Spatial DGGS & Conservation Blockchain Ledger
-- Sprint 077: Topological Valence Invariant & Adjacency Boundary Verification
-- ============================================================================

-- Extensions for geospatial and cryptographic operations
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. Discrete Global Grid System (DGGS) Topology & Valence Invariants
-- ============================================================================

-- Table: dggs_cells
-- Encapsulates H3 discrete global grid cells with topological valence invariants
CREATE TABLE IF NOT EXISTS dggs_cells (
    cell_id VARCHAR(15) PRIMARY KEY, -- Hexadecimal string representation of H3Index
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    expected_neighbor_count SMALLINT GENERATED ALWAYS AS (
        CASE WHEN is_pentagon THEN 5 ELSE 6 END
    ) STORED,
    centroid_lat DOUBLE PRECISION,
    centroid_lng DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_valence_cardinality CHECK (expected_neighbor_count IN (5, 6))
);

CREATE INDEX IF NOT EXISTS idx_dggs_cells_res_pentagon ON dggs_cells (resolution, is_pentagon);

-- Table: cell_neighborhoods
-- Canonical materialized adjacencies reflecting the direct k=1 topological neighborhood
CREATE TABLE IF NOT EXISTS cell_neighborhoods (
    cell_id VARCHAR(15) NOT NULL REFERENCES dggs_cells(cell_id) ON DELETE CASCADE,
    neighbor_cell_id VARCHAR(15) NOT NULL REFERENCES dggs_cells(cell_id) ON DELETE RESTRICT,
    edge_index SMALLINT NOT NULL CHECK (edge_index BETWEEN 0 AND 5),
    boundary_length_meters DOUBLE PRECISION NOT NULL CHECK (boundary_length_meters > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cell_id, neighbor_cell_id),
    CONSTRAINT chk_non_self_neighbor CHECK (cell_id <> neighbor_cell_id)
);

CREATE INDEX IF NOT EXISTS idx_cell_neighborhoods_neighbor ON cell_neighborhoods (neighbor_cell_id);

-- ============================================================================
-- 2. Neighborhood Verification & Invariant Audit Log
-- ============================================================================

-- Table: cell_neighborhood_validations
-- Immutable audit log capturing invocations of assertValidNeighborCountForCell
CREATE TABLE IF NOT EXISTS cell_neighborhood_validations (
    validation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_id VARCHAR(15) NOT NULL REFERENCES dggs_cells(cell_id) ON DELETE CASCADE,
    raw_payload_type VARCHAR(64) NOT NULL, -- e.g., 'Array', 'Object', 'null', 'undefined'
    is_array BOOLEAN NOT NULL,
    observed_count INTEGER NOT NULL,
    expected_count SMALLINT NOT NULL,
    is_valid BOOLEAN NOT NULL,
    error_message TEXT,
    caller_monad VARCHAR(128) NOT NULL DEFAULT 'SpatialFluxMonad',
    block_hash BYTEA,
    validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_validation_consistency CHECK (
        (is_valid = TRUE AND is_array = TRUE AND observed_count = expected_count AND error_message IS NULL) OR
        (is_valid = FALSE AND (is_array = FALSE OR observed_count <> expected_count) AND error_message IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_cell_neighborhood_val_cell ON cell_neighborhood_validations (cell_id, validated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cell_neighborhood_val_status ON cell_neighborhood_validations (is_valid);

-- ============================================================================
-- 3. Thermodynamic Stock & Spatial Flux Ledger (First & Second Laws on S^2)
-- ============================================================================

-- Table: thermodynamic_cell_stocks
-- Time-series state representing conserved state monads (mass, energy, entropy)
CREATE TABLE IF NOT EXISTS thermodynamic_cell_stocks (
    stock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_id VARCHAR(15) NOT NULL REFERENCES dggs_cells(cell_id) ON DELETE CASCADE,
    epoch_timestamp TIMESTAMPTZ NOT NULL,
    internal_energy_joules NUMERIC(38, 10) NOT NULL CHECK (internal_energy_joules >= 0),
    biomass_carbon_kg NUMERIC(38, 10) NOT NULL CHECK (biomass_carbon_kg >= 0),
    trophic_matter_kg NUMERIC(38, 10) NOT NULL CHECK (trophic_matter_kg >= 0),
    entropy_joules_per_kelvin NUMERIC(38, 10) NOT NULL CHECK (entropy_joules_per_kelvin >= 0),
    state_merkle_root BYTEA NOT NULL,
    block_height BIGINT NOT NULL,
    CONSTRAINT uq_cell_stock_epoch UNIQUE (cell_id, epoch_timestamp)
);

CREATE INDEX IF NOT EXISTS idx_thermo_stocks_epoch ON thermodynamic_cell_stocks (epoch_timestamp);
CREATE INDEX IF NOT EXISTS idx_thermo_stocks_cell_block ON thermodynamic_cell_stocks (cell_id, block_height);

-- Table: spatial_flux_transactions
-- Directed inter-cell boundary fluxes verified against assertValidNeighborCountForCell
CREATE TABLE IF NOT EXISTS spatial_flux_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_cell_id VARCHAR(15) NOT NULL,
    target_cell_id VARCHAR(15) NOT NULL,
    validation_id UUID NOT NULL REFERENCES cell_neighborhood_validations(validation_id),
    energy_flux_joules NUMERIC(38, 10) NOT NULL,
    matter_flux_kg NUMERIC(38, 10) NOT NULL,
    entropy_generation_jk NUMERIC(38, 10) NOT NULL CHECK (entropy_generation_jk >= 0), -- Second Law: Delta S >= 0
    boundary_divergence NUMERIC(38, 10) NOT NULL,
    tx_signature BYTEA NOT NULL,
    block_height BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (source_cell_id, target_cell_id) REFERENCES cell_neighborhoods(cell_id, neighbor_cell_id),
    CONSTRAINT chk_positive_or_negative_flux CHECK (energy_flux_joules <> 0 OR matter_flux_kg <> 0)
);

CREATE INDEX IF NOT EXISTS idx_spatial_flux_tx_block ON spatial_flux_transactions (block_height);
CREATE INDEX IF NOT EXISTS idx_spatial_flux_tx_cells ON spatial_flux_transactions (source_cell_id, target_cell_id);

-- ============================================================================
-- 4. Blockchain Block Ledger & Boundary Conservation Verification
-- ============================================================================

-- Table: spatial_flux_blocks
-- Cryptographic block bundling verified spatial fluxes with strict boundary closure
CREATE TABLE IF NOT EXISTS spatial_flux_blocks (
    block_height BIGINT PRIMARY KEY,
    previous_block_hash BYTEA NOT NULL,
    merkle_root BYTEA NOT NULL,
    flux_count INTEGER NOT NULL CHECK (flux_count >= 0),
    net_boundary_divergence NUMERIC(38, 10) NOT NULL,
    is_conservation_preserved BOOLEAN GENERATED ALWAYS AS (
        abs(net_boundary_divergence) < 1e-9
    ) STORED,
    validator_node_id VARCHAR(64) NOT NULL,
    validator_signature BYTEA NOT NULL,
    minted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. Trigger Functions: Runtime Enforcement of Topological Adjacency Limits
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_cell_neighborhood_valence_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_expected_count SMALLINT;
    v_current_count INTEGER;
BEGIN
    SELECT expected_neighbor_count INTO v_expected_count
    FROM dggs_cells
    WHERE cell_id = NEW.cell_id;

    IF v_expected_count IS NULL THEN
        RAISE EXCEPTION 'Topological cell % does not exist in dggs_cells registry', NEW.cell_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    SELECT COUNT(*) INTO v_current_count
    FROM cell_neighborhoods
    WHERE cell_id = NEW.cell_id AND is_active = TRUE;

    IF v_current_count >= v_expected_count THEN
        RAISE EXCEPTION 'Valence invariant violated for cell %: maximum neighbor limit % reached', 
            NEW.cell_id, v_expected_count
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_cell_valence ON cell_neighborhoods;
CREATE TRIGGER trg_enforce_cell_valence
BEFORE INSERT ON cell_neighborhoods
FOR EACH ROW
EXECUTE FUNCTION verify_cell_neighborhood_valence_limit();