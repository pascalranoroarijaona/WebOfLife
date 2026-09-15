-- Web of Life Planetary Simulation Database Schema
-- Sprint 079: H3 Discrete Global Grid System (DGGS) Pentagonal Adjacency,
-- Conservative Thermodynamic Flux Monad Integration, and Blockchain Proof-of-Conservation

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- ENUMERATIONS & DOMAINS
-- ============================================================================

CREATE TYPE cell_topology_type AS ENUM (
    'HEXAGON',
    'PENTAGON'
);

CREATE TYPE stock_component_type AS ENUM (
    'BIOMASS_CARBON',
    'NITROGEN',
    'PHOSPHORUS',
    'WATER',
    'INTERNAL_ENERGY',
    'ENTROPY'
);

CREATE TYPE transaction_status_type AS ENUM (
    'PENDING',
    'COMMITTED',
    'REVERTED',
    'THERMODYNAMICALLY_INVALID'
);

-- Coordination number domain: 5 for pentagons, 6 for hexagons
CREATE DOMAIN coordination_degree AS INTEGER
    CHECK (VALUE IN (5, 6));

-- ============================================================================
-- 1. SPATIAL TOPOLOGY & H3 CELL REGISTRY
-- ============================================================================

CREATE TABLE h3_cells (
    cell_index          VARCHAR(15) PRIMARY KEY, -- 64-bit H3 index as hex string
    resolution          SMALLINT NOT NULL CHECK (resolution >= 0 AND resolution <= 15),
    topology_type       cell_topology_type NOT NULL,
    coordination_target coordination_degree NOT NULL,
    latitude            NUMERIC(10, 7) NOT NULL,
    longitude           NUMERIC(10, 7) NOT NULL,
    boundary_polygon    GEOMETRY(Polygon, 4326) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_topology_coordination CHECK (
        (topology_type = 'PENTAGON' AND coordination_target = 5) OR
        (topology_type = 'HEXAGON'  AND coordination_target = 6)
    )
);

CREATE INDEX idx_h3_cells_resolution ON h3_cells(resolution);
CREATE INDEX idx_h3_cells_topology ON h3_cells(topology_type);
CREATE INDEX idx_h3_cells_spatial ON h3_cells USING GIST(boundary_polygon);

-- Enforce Euler's Polyhedral Characteristic: Exactly 12 pentagons per resolution level
CREATE OR REPLACE FUNCTION check_pentagon_count_per_resolution()
RETURNS TRIGGER AS $$
DECLARE
    pentagon_count INTEGER;
BEGIN
    IF NEW.topology_type = 'PENTAGON' THEN
        SELECT COUNT(*) INTO pentagon_count
        FROM h3_cells
        WHERE resolution = NEW.resolution AND topology_type = 'PENTAGON';
        
        IF pentagon_count > 12 THEN
            RAISE EXCEPTION 'Euler polyhedral invariant violated: Resolution % already contains 12 pentagons', NEW.resolution;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_pentagon_count
    BEFORE INSERT OR UPDATE ON h3_cells
    FOR EACH ROW
    EXECUTE FUNCTION check_pentagon_count_per_resolution();

-- ============================================================================
-- 2. TOPOLOGICAL ADJACENCY RELATIONS
-- ============================================================================

CREATE TABLE h3_adjacencies (
    adjacency_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_cell_index   VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index) ON DELETE CASCADE,
    neighbor_cell_index VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index) ON DELETE CASCADE,
    direction_index     SMALLINT NOT NULL CHECK (direction_index BETWEEN 0 AND 5),
    facet_area_m2       NUMERIC(18, 6) NOT NULL CHECK (facet_area_m2 > 0),
    geodesic_distance_m NUMERIC(18, 6) NOT NULL CHECK (geodesic_distance_m > 0),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_origin_direction UNIQUE (origin_cell_index, direction_index),
    CONSTRAINT unique_directed_edge UNIQUE (origin_cell_index, neighbor_cell_index),
    CONSTRAINT check_no_self_adjacency CHECK (origin_cell_index <> neighbor_cell_index)
);

CREATE INDEX idx_h3_adjacencies_origin ON h3_adjacencies(origin_cell_index);
CREATE INDEX idx_h3_adjacencies_neighbor ON h3_adjacencies(neighbor_cell_index);

-- Topological validation view verifying neighbor array cardinality
CREATE OR REPLACE VIEW v_cell_adjacency_validations AS
SELECT 
    c.cell_index,
    c.resolution,
    c.topology_type,
    c.coordination_target,
    COUNT(a.neighbor_cell_index)::INTEGER AS active_neighbor_count,
    CASE 
        WHEN c.topology_type = 'PENTAGON' AND COUNT(a.neighbor_cell_index) = 5 THEN TRUE
        WHEN c.topology_type = 'HEXAGON'  AND COUNT(a.neighbor_cell_index) = 6 THEN TRUE
        ELSE FALSE
    END AS is_adjacency_topology_valid
FROM h3_cells c
LEFT JOIN h3_adjacencies a 
    ON c.cell_index = a.origin_cell_index AND a.is_active = TRUE
GROUP BY c.cell_index, c.resolution, c.topology_type, c.coordination_target;

-- ============================================================================
-- 3. THERMODYNAMIC STATE STOCKS (CONTINUOUS / TIME-SERIES)
-- ============================================================================

CREATE TABLE cell_thermodynamic_stocks (
    stock_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cell_index          VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index),
    timestamp_epoch_ms  BIGINT NOT NULL,
    mass_biomass_kg     NUMERIC(24, 8) NOT NULL CHECK (mass_biomass_kg >= 0),
    mass_nitrogen_kg    NUMERIC(24, 8) NOT NULL CHECK (mass_nitrogen_kg >= 0),
    mass_water_kg       NUMERIC(24, 8) NOT NULL CHECK (mass_water_kg >= 0),
    internal_energy_j   NUMERIC(30, 6) NOT NULL CHECK (internal_energy_j >= 0),
    entropy_j_per_k     NUMERIC(30, 6) NOT NULL CHECK (entropy_j_per_k >= 0),
    temperature_kelvin  NUMERIC(10, 4) GENERATED ALWAYS AS (
        CASE WHEN mass_biomass_kg + mass_water_kg > 0 
             THEN internal_energy_j / ((mass_biomass_kg * 1800.0) + (mass_water_kg * 4184.0))
             ELSE 0.0 END
    ) STORED,
    state_merkle_hash   BYTEA NOT NULL,
    CONSTRAINT unique_cell_timestamp UNIQUE (cell_index, timestamp_epoch_ms)
);

CREATE INDEX idx_cell_thermo_stocks_lookup ON cell_thermodynamic_stocks(cell_index, timestamp_epoch_ms DESC);

-- ============================================================================
-- 4. SPATIAL FLUX MONAD TRANSACTIONS & DIVERGENCE AUDIT
-- ============================================================================

CREATE TABLE spatial_flux_transactions (
    flux_tx_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    step_epoch_ms          BIGINT NOT NULL,
    source_cell_index      VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index),
    target_cell_index      VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index),
    adjacency_id           UUID NOT NULL REFERENCES h3_adjacencies(adjacency_id),
    component_type         stock_component_type NOT NULL,
    flux_magnitude         NUMERIC(24, 10) NOT NULL, -- positive: source -> target
    entropy_production_j_k NUMERIC(24, 10) NOT NULL CHECK (entropy_production_j_k >= 0), -- Second Law: dS >= 0
    first_law_residual     NUMERIC(24, 12) NOT NULL DEFAULT 0.0,
    tx_status              transaction_status_type NOT NULL DEFAULT 'COMMITTED',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_first_law_conservation CHECK (ABS(first_law_residual) < 1e-9)
);

CREATE INDEX idx_flux_tx_step ON spatial_flux_transactions(step_epoch_ms);
CREATE INDEX idx_flux_tx_source ON spatial_flux_transactions(source_cell_index);
CREATE INDEX idx_flux_tx_target ON spatial_flux_transactions(target_cell_index);

-- Trigger: Validate topology and adjacency length prior to spatial flux settlement
CREATE OR REPLACE FUNCTION validate_flux_transaction_adjacency()
RETURNS TRIGGER AS $$
DECLARE
    origin_topology cell_topology_type;
    neighbor_count INTEGER;
BEGIN
    SELECT topology_type INTO origin_topology FROM h3_cells WHERE cell_index = NEW.source_cell_index;
    SELECT COUNT(*) INTO neighbor_count FROM h3_adjacencies WHERE origin_cell_index = NEW.source_cell_index AND is_active = TRUE;

    IF origin_topology = 'PENTAGON' AND neighbor_count <> 5 THEN
        RAISE EXCEPTION 'SpatialFluxMonad Invariant Failed: Pentagon % has invalid neighbor count % (expected exactly 5)', 
            NEW.source_cell_index, neighbor_count;
    ELSIF origin_topology = 'HEXAGON' AND neighbor_count <> 6 THEN
        RAISE EXCEPTION 'SpatialFluxMonad Invariant Failed: Hexagon % has invalid neighbor count % (expected exactly 6)', 
            NEW.source_cell_index, neighbor_count;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_flux_transaction_adjacency
    BEFORE INSERT ON spatial_flux_transactions
    FOR EACH ROW
    EXECUTE FUNCTION validate_flux_transaction_adjacency();

-- ============================================================================
-- 5. THERMODYNAMIC BLOCKCHAIN LEDGER
-- ============================================================================

CREATE TABLE blockchain_blocks (
    block_height            BIGINT PRIMARY KEY,
    block_hash              BYTEA NOT NULL UNIQUE,
    parent_hash             BYTEA NOT NULL,
    epoch_timestamp_ms      BIGINT NOT NULL,
    state_merkle_root       BYTEA NOT NULL,
    flux_receipt_root       BYTEA NOT NULL,
    pentagon_invariance_root BYTEA NOT NULL,
    total_entropy_generated NUMERIC(30, 8) NOT NULL CHECK (total_entropy_generated >= 0),
    total_biomass_mass_kg   NUMERIC(30, 8) NOT NULL,
    net_mass_divergence_kg  NUMERIC(24, 12) NOT NULL DEFAULT 0.0 CHECK (ABS(net_mass_divergence_kg) < 1e-8),
    validator_signature     BYTEA NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE block_cell_snapshots (
    snapshot_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height            BIGINT NOT NULL REFERENCES blockchain_blocks(block_height) ON DELETE CASCADE,
    cell_index              VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index),
    stock_id                UUID NOT NULL REFERENCES cell_thermodynamic_stocks(stock_id),
    coordination_verified   BOOLEAN NOT NULL,
    divergence_residual     NUMERIC(24, 12) NOT NULL DEFAULT 0.0,
    CONSTRAINT unique_block_cell_snapshot UNIQUE (block_height, cell_index)
);

CREATE INDEX idx_block_cell_snapshots_height ON block_cell_snapshots(block_height);
CREATE INDEX idx_block_cell_snapshots_cell ON block_cell_snapshots(cell_index);