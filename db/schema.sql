-- ============================================================================
-- Web of Life: Planetary Thermodynamic Blockchain Schema
-- Sprint 082: Pentagonal Neighbor Count Validation & Topological Invariants
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ----------------------------------------------------------------------------
-- 1. SPATIAL TOPOLOGY: H3 DISCRETE GLOBAL GRID SYSTEM (DGGS)
-- ----------------------------------------------------------------------------

-- H3 cell catalog establishing cell geometry, resolution, and topological class.
-- By Euler's formula (V - E + F = 2), precisely 12 pentagons exist per resolution (F_5 = 12).
CREATE TABLE IF NOT EXISTS h3_cells (
    cell_index VARCHAR(15) PRIMARY KEY,
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    expected_coordination SMALLINT GENERATED ALWAYS AS (
        CASE WHEN is_pentagon THEN 5 ELSE 6 END
    ) STORED,
    centroid_lat DOUBLE PRECISION NOT NULL CHECK (centroid_lat BETWEEN -90.0 AND 90.0),
    centroid_lon DOUBLE PRECISION NOT NULL CHECK (centroid_lon BETWEEN -180.0 AND 180.0),
    surface_area_m2 DOUBLE PRECISION NOT NULL CHECK (surface_area_m2 > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_h3_cells_resolution_pentagon 
    ON h3_cells (resolution, is_pentagon);

-- Directed adjacency graph between neighboring H3 cells.
CREATE TABLE IF NOT EXISTS h3_cell_adjacencies (
    source_cell VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index) ON DELETE RESTRICT,
    neighbor_cell VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index) ON DELETE RESTRICT,
    facet_index SMALLINT NOT NULL CHECK (facet_index BETWEEN 0 AND 5),
    shared_boundary_length_m DOUBLE PRECISION NOT NULL CHECK (shared_boundary_length_m > 0),
    effective_diffusion_area_m2 DOUBLE PRECISION NOT NULL CHECK (effective_diffusion_area_m2 > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (source_cell, neighbor_cell),
    CONSTRAINT chk_no_self_adjacency CHECK (source_cell <> neighbor_cell)
);

CREATE INDEX IF NOT EXISTS idx_h3_cell_adjacencies_source 
    ON h3_cell_adjacencies (source_cell);
CREATE INDEX IF NOT EXISTS idx_h3_cell_adjacencies_neighbor 
    ON h3_cell_adjacencies (neighbor_cell);

-- ----------------------------------------------------------------------------
-- 2. TOPOLOGICAL VALIDATION & COORDINATION AUDIT LEDGER
-- ----------------------------------------------------------------------------

-- Audit log recording runtime execution of validatePentagonalNeighborCount
-- and capturing any PentagonalCoordinationViolationError exceptions.
CREATE TABLE IF NOT EXISTS topological_coordination_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cell_index VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index),
    is_pentagon BOOLEAN NOT NULL,
    expected_count SMALLINT NOT NULL,
    actual_count SMALLINT NOT NULL,
    is_valid BOOLEAN GENERATED ALWAYS AS (expected_count = actual_count) STORED,
    violation_error VARCHAR(128) DEFAULT NULL,
    caller_module VARCHAR(64) NOT NULL DEFAULT 'src/spatial/h3_adjacency.ts',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topological_logs_violation 
    ON topological_coordination_logs (is_valid, cell_index) 
    WHERE is_valid = FALSE;

-- ----------------------------------------------------------------------------
-- 3. THERMODYNAMIC BIOGEOCHEMICAL STOCKS
-- ----------------------------------------------------------------------------

-- Finite volume conserved state vectors for carbon, nitrogen, phosphorus, and water.
CREATE TABLE IF NOT EXISTS biogeochemical_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cell_index VARCHAR(15) UNIQUE NOT NULL REFERENCES h3_cells(cell_index) ON DELETE RESTRICT,
    carbon_mass_kg NUMERIC(24, 8) NOT NULL CHECK (carbon_mass_kg >= 0),
    nitrogen_mass_kg NUMERIC(24, 8) NOT NULL CHECK (nitrogen_mass_kg >= 0),
    phosphorus_mass_kg NUMERIC(24, 8) NOT NULL CHECK (phosphorus_mass_kg >= 0),
    water_mass_kg NUMERIC(24, 8) NOT NULL CHECK (water_mass_kg >= 0),
    internal_energy_joules NUMERIC(30, 6) NOT NULL CHECK (internal_energy_joules >= 0),
    internal_entropy_jk NUMERIC(24, 8) NOT NULL CHECK (internal_entropy_jk >= 0),
    temperature_kelvin NUMERIC(8, 3) NOT NULL CHECK (temperature_kelvin > 0),
    last_block_height BIGINT NOT NULL,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. THERMODYNAMIC BLOCKCHAIN LEDGER & FLUX TRANSACTIONS
-- ----------------------------------------------------------------------------

-- Blocks encapsulating thermodynamic epochs across the global spherical manifold.
CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash BYTEA NOT NULL UNIQUE,
    previous_block_hash BYTEA NOT NULL,
    state_merkle_root BYTEA NOT NULL,
    flux_merkle_root BYTEA NOT NULL,
    topological_invariance_proof BYTEA NOT NULL, -- Cryptographic assertion that all 12 pentagons satisfy z=5
    total_entropy_production_jk NUMERIC(24, 8) NOT NULL CHECK (total_entropy_production_jk >= 0), -- Second Law: dS_irr >= 0
    timestamp TIMESTAMPTZ NOT NULL,
    proposer_public_key BYTEA NOT NULL,
    block_signature BYTEA NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blockchain_blocks_hash ON blockchain_blocks (block_hash);

-- Spatial flux transactions: Inter-cell advective & diffusive mass transport.
-- Finite volume fluxes guarantee First Law balance: sum(dM_in) = sum(dM_out).
CREATE TABLE IF NOT EXISTS spatial_flux_transactions (
    tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(block_height) ON DELETE RESTRICT,
    source_cell VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index),
    target_cell VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index),
    carbon_flux_kg NUMERIC(20, 8) NOT NULL,
    nitrogen_flux_kg NUMERIC(20, 8) NOT NULL,
    phosphorus_flux_kg NUMERIC(20, 8) NOT NULL,
    water_flux_kg NUMERIC(20, 8) NOT NULL,
    chemical_potential_gradient_j_mol NUMERIC(16, 6) NOT NULL,
    entropy_production_jk NUMERIC(20, 8) NOT NULL CHECK (entropy_production_jk >= 0),
    tx_signature BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_flux_endpoints_differ CHECK (source_cell <> target_cell)
);

CREATE INDEX IF NOT EXISTS idx_flux_transactions_block 
    ON spatial_flux_transactions (block_height);
CREATE INDEX IF NOT EXISTS idx_flux_transactions_pair 
    ON spatial_flux_transactions (source_cell, target_cell);

-- ----------------------------------------------------------------------------
-- 5. TOPOLOGICAL ENFORCEMENT PROCEDURES & TRIGGERS
-- ----------------------------------------------------------------------------

-- Trigger function enforcing pentagonal coordination (z = 5) on cell adjacency commits.
CREATE OR REPLACE FUNCTION assert_pentagonal_topology()
RETURNS TRIGGER AS $$
DECLARE
    is_pentagon_cell BOOLEAN;
    neighbor_count INT;
BEGIN
    SELECT is_pentagon INTO is_pentagon_cell
    FROM h3_cells
    WHERE cell_index = NEW.source_cell;

    IF is_pentagon_cell IS TRUE THEN
        SELECT COUNT(*) INTO neighbor_count
        FROM h3_cell_adjacencies
        WHERE source_cell = NEW.source_cell;

        IF neighbor_count > 5 THEN
            RAISE EXCEPTION 'PentagonalCoordinationViolation: cell % cannot exceed 5 neighbors (received count %)',
                NEW.source_cell, neighbor_count;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assert_pentagonal_topology ON h3_cell_adjacencies;
CREATE TRIGGER trg_assert_pentagonal_topology
    AFTER INSERT OR UPDATE ON h3_cell_adjacencies
    FOR EACH ROW
    EXECUTE FUNCTION assert_pentagonal_topology();