-- ============================================================================
-- Web of Life: Thermodynamic Blockchain & Discrete Spatial Substrate Schema
-- Sprint 083: Pentagon Directional Topology & Flux Invariant Accounting
-- ============================================================================

-- Extensions for spatial computations, UUID generation, and cryptographic hashing
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. SPATIAL TOPOLOGY & H3 CELL REGISTRY
-- ============================================================================

CREATE TYPE h3_cell_class AS ENUM ('HEXAGON', 'PENTAGON');

-- Domain constraint for canonical H3 discrete neighbor offset directions
CREATE DOMAIN h3_direction AS SMALLINT
    CHECK (VALUE BETWEEN 1 AND 6);

-- Registry of discrete geodesic cells across all active H3 resolutions
CREATE TABLE IF NOT EXISTS spatial_cells (
    cell_id VARCHAR(16) PRIMARY KEY, -- H3Index in hexadecimal representation
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    cell_type h3_cell_class NOT NULL,
    centroid_lat DOUBLE PRECISION NOT NULL CHECK (centroid_lat BETWEEN -90.0 AND 90.0),
    centroid_lon DOUBLE PRECISION NOT NULL CHECK (centroid_lon BETWEEN -180.0 AND 180.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spatial_cells_res_type 
    ON spatial_cells(resolution, cell_type);

-- Explicit topological configurations for the 12 pentagonal cells per resolution
CREATE TABLE IF NOT EXISTS pentagon_directional_topologies (
    cell_id VARCHAR(16) PRIMARY KEY REFERENCES spatial_cells(cell_id) ON DELETE RESTRICT,
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    omitted_direction h3_direction NOT NULL,
    present_directions h3_direction[] NOT NULL,
    topology_hash BYTEA NOT NULL,
    is_valid BOOLEAN GENERATED ALWAYS AS (
        array_length(present_directions, 1) = 5 AND
        NOT (omitted_direction = ANY(present_directions))
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_pentagon_present_directions_cardinality 
        CHECK (array_length(present_directions, 1) = 5),
    CONSTRAINT chk_pentagon_omitted_disjoint 
        CHECK (NOT (omitted_direction = ANY(present_directions)))
);

CREATE INDEX IF NOT EXISTS idx_pentagon_topologies_res 
    ON pentagon_directional_topologies(resolution);

-- ============================================================================
-- 2. THERMODYNAMIC STOCKS & TIME-SERIES CONTINUUM
-- ============================================================================

-- Conserved thermodynamic stock vector per H3 cell: Carbon, Nitrogen, Phosphorus, Water, Energy
CREATE TABLE IF NOT EXISTS cell_thermodynamic_stocks (
    cell_id VARCHAR(16) NOT NULL REFERENCES spatial_cells(cell_id) ON DELETE RESTRICT,
    timestamp TIMESTAMPTZ NOT NULL,
    epoch BIGINT NOT NULL,
    carbon_mol NUMERIC(28, 12) NOT NULL CHECK (carbon_mol >= 0),
    nitrogen_mol NUMERIC(28, 12) NOT NULL CHECK (nitrogen_mol >= 0),
    phosphorus_mol NUMERIC(28, 12) NOT NULL CHECK (phosphorus_mol >= 0),
    water_kg NUMERIC(28, 12) NOT NULL CHECK (water_kg >= 0),
    thermal_energy_joules NUMERIC(36, 12) NOT NULL CHECK (thermal_energy_joules >= 0),
    entropy_joules_per_kelvin NUMERIC(36, 12) NOT NULL,
    chemical_potential_c NUMERIC(20, 8) NOT NULL,
    chemical_potential_n NUMERIC(20, 8) NOT NULL,
    chemical_potential_p NUMERIC(20, 8) NOT NULL,
    temperature_kelvin NUMERIC(10, 4) NOT NULL CHECK (temperature_kelvin > 0),
    PRIMARY KEY (cell_id, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_cell_thermo_stocks_epoch 
    ON cell_thermodynamic_stocks(epoch, cell_id);

-- ============================================================================
-- 3. SPATIAL DIRECTIONAL FLUX LEDGER (FIRST & SECOND LAW GOVERNANCE)
-- ============================================================================

-- Ledger of directional advective and diffusive fluxes across cell facets
CREATE TABLE IF NOT EXISTS directional_flux_transactions (
    flux_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epoch BIGINT NOT NULL,
    source_cell_id VARCHAR(16) NOT NULL REFERENCES spatial_cells(cell_id),
    target_cell_id VARCHAR(16) NOT NULL REFERENCES spatial_cells(cell_id),
    direction h3_direction NOT NULL,
    carbon_flux_mol NUMERIC(28, 12) NOT NULL,
    nitrogen_flux_mol NUMERIC(28, 12) NOT NULL,
    phosphorus_flux_mol NUMERIC(28, 12) NOT NULL,
    water_flux_kg NUMERIC(28, 12) NOT NULL,
    enthalpy_flux_joules NUMERIC(36, 12) NOT NULL,
    entropy_generation_rate NUMERIC(28, 12) NOT NULL CHECK (entropy_generation_rate >= 0), -- Second Law: σ >= 0
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flux_tx_epoch_cells 
    ON directional_flux_transactions(epoch, source_cell_id, target_cell_id);

-- Strict constraint trigger enforcing zero flux along omitted pentagon directions
CREATE OR REPLACE FUNCTION verify_pentagon_omitted_flux()
RETURNS TRIGGER AS $$
DECLARE
    v_omitted h3_direction;
BEGIN
    SELECT omitted_direction INTO v_omitted
    FROM pentagon_directional_topologies
    WHERE cell_id = NEW.source_cell_id;

    IF FOUND THEN
        IF NEW.direction = v_omitted THEN
            RAISE EXCEPTION 'First Law Violation: Directed flux % attempted through omitted pentagonal direction % on cell %',
                NEW.flux_id, NEW.direction, NEW.source_cell_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_verify_pentagon_flux
BEFORE INSERT ON directional_flux_transactions
FOR EACH ROW
EXECUTE FUNCTION verify_pentagon_omitted_flux();

-- ============================================================================
-- 4. THERMODYNAMIC BLOCKCHAIN LEDGER & CONSENSUS TRANSACTIONS
-- ============================================================================

-- State block committed to the thermodynamic blockchain verifying mass-energy conservation
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash BYTEA NOT NULL UNIQUE,
    parent_hash BYTEA NOT NULL,
    epoch BIGINT NOT NULL UNIQUE,
    state_root BYTEA NOT NULL,
    flux_receipts_root BYTEA NOT NULL,
    total_system_carbon_mol NUMERIC(32, 12) NOT NULL,
    total_system_nitrogen_mol NUMERIC(32, 12) NOT NULL,
    total_system_phosphorus_mol NUMERIC(32, 12) NOT NULL,
    total_system_water_kg NUMERIC(32, 12) NOT NULL,
    total_system_energy_joules NUMERIC(40, 12) NOT NULL,
    mass_conservation_delta NUMERIC(28, 12) NOT NULL CHECK (ABS(mass_conservation_delta) < 1e-9), -- Strict mass conservation
    total_entropy_production NUMERIC(32, 12) NOT NULL CHECK (total_entropy_production >= 0),     -- Strict irreversibility
    pentagon_invariants_verified BOOLEAN NOT NULL DEFAULT TRUE,
    miner_signature BYTEA NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transaction proofs encapsulating atomic monad steps per batch
CREATE TABLE IF NOT EXISTS spatial_monad_transactions (
    tx_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_height BIGINT NOT NULL REFERENCES thermodynamic_blocks(block_height),
    cell_id VARCHAR(16) NOT NULL REFERENCES spatial_cells(cell_id),
    is_pentagon BOOLEAN NOT NULL,
    initial_stock_hash BYTEA NOT NULL,
    final_stock_hash BYTEA NOT NULL,
    omitted_direction_verified BOOLEAN NOT NULL,
    divergence_net_mass NUMERIC(28, 12) NOT NULL,
    execution_gas_units BIGINT NOT NULL,
    signature BYTEA NOT NULL,
    CONSTRAINT chk_monad_pentagon_proof CHECK (
        (is_pentagon = FALSE) OR 
        (is_pentagon = TRUE AND omitted_direction_verified = TRUE)
    )
);

CREATE INDEX IF NOT EXISTS idx_monad_tx_block_cell 
    ON spatial_monad_transactions(block_height, cell_id);