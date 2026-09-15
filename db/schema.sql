-- Web of Life: Planetary Thermodynamic Ledger & Spatial DGGS Schema
-- Sprint 074: Topological Invariant Enforcement & Pentagonal Coordination Tracking
-- Compliant with RFC-074: Euler-Poincaré Discrete Global Grid Adjacency & Conservation

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- 1. BLOCKCHAIN CONSENSUS & PROOF-OF-CONSERVATION LEDGER
-- ============================================================================

CREATE TABLE IF NOT EXISTS blockchain_blocks (
    height                  BIGINT PRIMARY KEY,
    block_hash              BYTEA NOT NULL UNIQUE CHECK (length(block_hash) = 32),
    previous_block_hash     BYTEA NOT NULL CHECK (length(previous_block_hash) = 32),
    merkle_root             BYTEA NOT NULL CHECK (length(merkle_root) = 32),
    state_root              BYTEA NOT NULL CHECK (length(state_root) = 32),
    first_law_residual      NUMERIC(38, 18) NOT NULL DEFAULT 0.0 CHECK (first_law_residual = 0.0),
    entropy_production_joules_per_kelvin NUMERIC(38, 18) NOT NULL CHECK (entropy_production_joules_per_kelvin >= 0.0),
    validator_address       BYTEA NOT NULL CHECK (length(validator_address) = 20),
    validator_signature     BYTEA NOT NULL CHECK (length(validator_signature) = 65),
    timestamp_utc           TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    tx_count                INTEGER NOT NULL CHECK (tx_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_blockchain_blocks_hash ON blockchain_blocks(block_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_blocks_timestamp ON blockchain_blocks(timestamp_utc);

-- ============================================================================
-- 2. H3 DISCRETE GLOBAL GRID SYSTEM (DGGS) TOPOLOGY
-- ============================================================================

CREATE TABLE IF NOT EXISTS h3_cells (
    cell_index              VARCHAR(16) PRIMARY KEY CHECK (cell_index ~ '^[0-9a-fA-F]{15,16}$'),
    resolution              SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    is_pentagon             BOOLEAN NOT NULL DEFAULT FALSE,
    expected_coordination   SMALLINT GENERATED ALWAYS AS (CASE WHEN is_pentagon THEN 5 ELSE 6 END) STORED,
    actual_coordination     SMALLINT NOT NULL DEFAULT 0 CHECK (actual_coordination BETWEEN 0 AND 6),
    centroid_geom           GEOMETRY(Point, 4326),
    cell_boundary           GEOMETRY(Polygon, 4326),
    created_at_block        BIGINT NOT NULL REFERENCES blockchain_blocks(height),
    CONSTRAINT chk_pentagon_coordination_bounds CHECK (
        (is_pentagon = FALSE AND actual_coordination <= 6) OR
        (is_pentagon = TRUE AND actual_coordination <= 5)
    )
);

CREATE INDEX IF NOT EXISTS idx_h3_cells_resolution ON h3_cells(resolution);
CREATE INDEX IF NOT EXISTS idx_h3_cells_is_pentagon ON h3_cells(is_pentagon);
CREATE INDEX IF NOT EXISTS idx_h3_cells_centroid ON h3_cells USING GIST(centroid_geom);

-- Directed dual mesh edges connecting H3 cells
CREATE TABLE IF NOT EXISTS h3_cell_adjacencies (
    edge_id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_cell_index       VARCHAR(16) NOT NULL REFERENCES h3_cells(cell_index),
    destination_cell_index  VARCHAR(16) NOT NULL REFERENCES h3_cells(cell_index),
    direction_index         SMALLINT NOT NULL CHECK (direction_index BETWEEN 0 AND 5),
    metric_boundary_length_meters NUMERIC(18, 6) NOT NULL CHECK (metric_boundary_length_meters > 0),
    is_pentagon_interface   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_origin_destination UNIQUE (origin_cell_index, destination_cell_index),
    CONSTRAINT uq_origin_direction UNIQUE (origin_cell_index, direction_index),
    CONSTRAINT chk_no_self_adjacency CHECK (origin_cell_index <> destination_cell_index)
);

CREATE INDEX IF NOT EXISTS idx_h3_adj_origin ON h3_cell_adjacencies(origin_cell_index);
CREATE INDEX IF NOT EXISTS idx_h3_adj_destination ON h3_cell_adjacencies(destination_cell_index);

-- ============================================================================
-- 3. TOPOLOGICAL COORDINATION AUDIT & VIOLATION LOGS (RFC-074)
-- ============================================================================

CREATE TABLE IF NOT EXISTS topological_coordination_violations (
    violation_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height            BIGINT NOT NULL REFERENCES blockchain_blocks(height),
    cell_index              VARCHAR(16) NOT NULL REFERENCES h3_cells(cell_index),
    error_name              VARCHAR(64) NOT NULL DEFAULT 'PentagonalCoordinationViolationError',
    expected_count          SMALLINT NOT NULL CHECK (expected_count = 5),
    actual_count            SMALLINT NOT NULL CHECK (actual_count <> 5),
    error_message           TEXT NOT NULL,
    state_vector_dump       JSONB NOT NULL,
    detected_at             TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    resolved                BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_pentagon_mismatch CHECK (expected_count <> actual_count)
);

CREATE INDEX IF NOT EXISTS idx_topo_violation_block ON topological_coordination_violations(block_height);
CREATE INDEX IF NOT EXISTS idx_topo_violation_cell ON topological_coordination_violations(cell_index);

-- ============================================================================
-- 4. THERMODYNAMIC STOCKS & FINITE VOLUME CONSERVATION
-- ============================================================================

CREATE TYPE conserved_stock_type AS ENUM (
    'BIOMASS_CARBON_KG',
    'SOIL_NITROGEN_KG',
    'SENSIBLE_HEAT_JOULES',
    'HYDROLOGIC_WATER_KG'
);

CREATE TABLE IF NOT EXISTS cell_thermodynamic_stocks (
    stock_id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cell_index              VARCHAR(16) NOT NULL REFERENCES h3_cells(cell_index),
    stock_type              conserved_stock_type NOT NULL,
    quantity                NUMERIC(38, 18) NOT NULL CHECK (quantity >= 0.0),
    temperature_kelvin      NUMERIC(10, 4) NOT NULL CHECK (temperature_kelvin > 0.0),
    chemical_potential_mu   NUMERIC(18, 8) NOT NULL DEFAULT 0.0,
    entropy_s               NUMERIC(38, 18) NOT NULL CHECK (entropy_s >= 0.0),
    updated_at_block        BIGINT NOT NULL REFERENCES blockchain_blocks(height),
    CONSTRAINT uq_cell_stock_type UNIQUE (cell_index, stock_type)
);

CREATE INDEX IF NOT EXISTS idx_cell_stocks_cell ON cell_thermodynamic_stocks(cell_index);
CREATE INDEX IF NOT EXISTS idx_cell_stocks_type ON cell_thermodynamic_stocks(stock_type);

-- Finite volume edge transport transactions
CREATE TABLE IF NOT EXISTS spatial_flux_transactions (
    tx_id                   BYTEA PRIMARY KEY CHECK (length(tx_id) = 32),
    block_height            BIGINT NOT NULL REFERENCES blockchain_blocks(height),
    origin_cell_index       VARCHAR(16) NOT NULL REFERENCES h3_cells(cell_index),
    destination_cell_index  VARCHAR(16) NOT NULL REFERENCES h3_cells(cell_index),
    stock_type              conserved_stock_type NOT NULL,
    flux_density_j          NUMERIC(38, 18) NOT NULL,
    metric_boundary_length  NUMERIC(18, 6) NOT NULL CHECK (metric_boundary_length > 0),
    integrated_transfer     NUMERIC(38, 18) GENERATED ALWAYS AS (flux_density_j * metric_boundary_length) STORED,
    entropy_production      NUMERIC(38, 18) NOT NULL CHECK (entropy_production >= 0.0),
    signature               BYTEA NOT NULL CHECK (length(signature) = 65),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_flux_tx_block ON spatial_flux_transactions(block_height);
CREATE INDEX IF NOT EXISTS idx_flux_tx_origin ON spatial_flux_transactions(origin_cell_index);
CREATE INDEX IF NOT EXISTS idx_flux_tx_dest ON spatial_flux_transactions(destination_cell_index);

-- ============================================================================
-- 5. COORDINATION INTEGRITY VERIFICATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_pentagonal_invariants(target_cell VARCHAR(16))
RETURNS BOOLEAN AS $$
DECLARE
    v_is_pentagon BOOLEAN;
    v_neighbor_count SMALLINT;
BEGIN
    SELECT is_pentagon INTO v_is_pentagon
    FROM h3_cells
    WHERE cell_index = target_cell;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cell % does not exist in spatial topology', target_cell;
    END IF;

    IF v_is_pentagon THEN
        SELECT COUNT(*)::SMALLINT INTO v_neighbor_count
        FROM h3_cell_adjacencies
        WHERE origin_cell_index = target_cell;

        IF v_neighbor_count <> 5 THEN
            RAISE EXCEPTION 'PentagonalCoordinationViolationError: Cell % expected 5 neighbors, found %',
                target_cell, v_neighbor_count;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;