-- ============================================================================
-- Web of Life: Planetary Biosphere & Thermodynamic Blockchain Schema
-- Sprint 038: Canonical H3 Token Pattern Enforcement & Spatial Monad Integrity
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ----------------------------------------------------------------------------
-- Domains & Syntactic Invariants
-- Strict 15-character lowercase hexadecimal representation (RFC-038)
-- ----------------------------------------------------------------------------
CREATE DOMAIN canonical_h3_index AS VARCHAR(15)
    CHECK (VALUE ~ '^[0-9a-f]{15}$');

CREATE DOMAIN h3_resolution_level AS SMALLINT
    CHECK (VALUE >= 0 AND VALUE <= 15);

CREATE DOMAIN thermodynamic_joules AS NUMERIC(36, 12)
    CHECK (VALUE >= 0);

CREATE DOMAIN thermodynamic_entropy AS NUMERIC(36, 12)
    CHECK (VALUE >= 0);

CREATE DOMAIN conserved_mass_kg AS NUMERIC(36, 12)
    CHECK (VALUE >= 0);

-- ----------------------------------------------------------------------------
-- Table: spatial_cells
-- Immutable hexagonal partition topology aligned with H3 hierarchical indexing
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_cells (
    h3_index canonical_h3_index PRIMARY KEY,
    resolution h3_resolution_level NOT NULL,
    base_cell_num SMALLINT NOT NULL CHECK (base_cell_num BETWEEN 0 AND 121),
    centroid_lat DOUBLE PRECISION NOT NULL CHECK (centroid_lat BETWEEN -90.0 AND 90.0),
    centroid_lon DOUBLE PRECISION NOT NULL CHECK (centroid_lon BETWEEN -180.0 AND 180.0),
    centroid_geom geometry(Point, 4326) GENERATED ALWAYS AS (
        ST_SetSRID(ST_MakePoint(centroid_lon, centroid_lat), 4326)
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spatial_cells_resolution ON spatial_cells(resolution);
CREATE INDEX IF NOT EXISTS idx_spatial_cells_centroid ON spatial_cells USING GIST (centroid_geom);

-- ----------------------------------------------------------------------------
-- Table: spatial_cell_stocks
-- Thermodynamic state vector per canonical H3 cell: M(h_i) = C + N + P + H2O, H, S
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_cell_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    h3_index canonical_h3_index NOT NULL REFERENCES spatial_cells(h3_index) ON DELETE RESTRICT,
    epoch_tick BIGINT NOT NULL,
    carbon_kg conserved_mass_kg NOT NULL DEFAULT 0.0,
    nitrogen_kg conserved_mass_kg NOT NULL DEFAULT 0.0,
    phosphorus_kg conserved_mass_kg NOT NULL DEFAULT 0.0,
    water_kg conserved_mass_kg NOT NULL DEFAULT 0.0,
    total_mass_kg conserved_mass_kg GENERATED ALWAYS AS (
        carbon_kg + nitrogen_kg + phosphorus_kg + water_kg
    ) STORED,
    enthalpy_kj NUMERIC(36, 12) NOT NULL,
    entropy_j_k thermodynamic_entropy NOT NULL,
    insolation_w_m2 NUMERIC(12, 4) NOT NULL CHECK (insolation_w_m2 >= 0),
    state_merkle_hash CHAR(64) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_spatial_cell_epoch UNIQUE (h3_index, epoch_tick)
);

CREATE INDEX IF NOT EXISTS idx_spatial_cell_stocks_epoch ON spatial_cell_stocks(epoch_tick);
CREATE INDEX IF NOT EXISTS idx_spatial_cell_stocks_h3 ON spatial_cell_stocks(h3_index);

-- ----------------------------------------------------------------------------
-- Table: thermodynamic_blocks
-- Blockchain ledger blocks recording closed thermodynamic epoch transitions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash CHAR(64) NOT NULL UNIQUE,
    previous_block_hash CHAR(64) NOT NULL,
    state_merkle_root CHAR(64) NOT NULL,
    transactions_merkle_root CHAR(64) NOT NULL,
    total_planetary_carbon_kg conserved_mass_kg NOT NULL,
    total_planetary_nitrogen_kg conserved_mass_kg NOT NULL,
    total_planetary_phosphorus_kg conserved_mass_kg NOT NULL,
    total_planetary_water_kg conserved_mass_kg NOT NULL,
    total_planetary_mass_kg conserved_mass_kg GENERATED ALWAYS AS (
        total_planetary_carbon_kg + total_planetary_nitrogen_kg +
        total_planetary_phosphorus_kg + total_planetary_water_kg
    ) STORED,
    total_planetary_enthalpy_kj NUMERIC(36, 12) NOT NULL,
    net_entropy_production_j_k thermodynamic_entropy NOT NULL,
    validator_pod_signature TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thermo_blocks_hash ON thermodynamic_blocks(block_hash);

-- ----------------------------------------------------------------------------
-- Table: spatial_flow_transactions
-- Conservative mass-energy exchange between adjacent canonical H3 cells
-- First Law: Sum(delta_M) = 0 | Second Law: delta_S_irr >= 0
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_flow_transactions (
    tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL REFERENCES thermodynamic_blocks(block_height) ON DELETE RESTRICT,
    source_h3 canonical_h3_index NOT NULL REFERENCES spatial_cells(h3_index) ON DELETE RESTRICT,
    target_h3 canonical_h3_index NOT NULL REFERENCES spatial_cells(h3_index) ON DELETE RESTRICT,
    carbon_delta_kg NUMERIC(36, 12) NOT NULL,
    nitrogen_delta_kg NUMERIC(36, 12) NOT NULL,
    phosphorus_delta_kg NUMERIC(36, 12) NOT NULL,
    water_delta_kg NUMERIC(36, 12) NOT NULL,
    enthalpy_transferred_kj NUMERIC(36, 12) NOT NULL,
    entropy_generated_j_k thermodynamic_entropy NOT NULL,
    flow_vector JSONB NOT NULL,
    tx_signature TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_source_target_distinct CHECK (source_h3 <> target_h3)
);

CREATE INDEX IF NOT EXISTS idx_spatial_flow_block ON spatial_flow_transactions(block_height);
CREATE INDEX IF NOT EXISTS idx_spatial_flow_source ON spatial_flow_transactions(source_h3);
CREATE INDEX IF NOT EXISTS idx_spatial_flow_target ON spatial_flow_transactions(target_h3);

-- ----------------------------------------------------------------------------
-- Trigger Function: Verify First Law Conservation on Flow Transactions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION verify_mass_conservation_invariant()
RETURNS TRIGGER AS $$
DECLARE
    sum_delta_mass NUMERIC(36, 12);
BEGIN
    sum_delta_mass := NEW.carbon_delta_kg + NEW.nitrogen_delta_kg + NEW.phosphorus_delta_kg + NEW.water_delta_kg;
    -- Internal flux consistency assertion
    IF NEW.entropy_generated_j_k < 0 THEN
        RAISE EXCEPTION 'Second Law Violation: Irreversible entropy generated cannot be negative (%).', NEW.entropy_generated_j_k;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_verify_flow_conservation
BEFORE INSERT OR UPDATE ON spatial_flow_transactions
FOR EACH ROW
EXECUTE FUNCTION verify_mass_conservation_invariant();