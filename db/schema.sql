-- ============================================================================
-- Web of Life: Planetary Ecosystem Simulation & Thermodynamic Ledger Schema
-- Sprint 045: Thermodynamic Overrides & Cell State Mutation Accounting
-- Target Subsystems: src/spatial/h3_state_tensor.ts, src/monads/spatial_monad.ts
-- Thermodynamic Invariants: Mass-Energy Conservation (First Law),
--                            Entropy Non-Decrease & Boundary Ledgering (Second Law)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic Manifold & Spatial Grid Infrastructure
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_h3_cells (
    h3_index VARCHAR(15) PRIMARY KEY,
    resolution INTEGER NOT NULL CHECK (resolution >= 0 AND resolution <= 15),
    centroid_geom GEOMETRY(Point, 4326) NOT NULL,
    area_m2 DOUBLE PRECISION NOT NULL CHECK (area_m2 > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spatial_h3_cells_geom 
    ON spatial_h3_cells USING GIST (centroid_geom);

-- ----------------------------------------------------------------------------
-- 2. Thermodynamic Blockchain Blocks & Boundary Transaction Receipts
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash VARCHAR(64) UNIQUE NOT NULL,
    parent_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    state_tensor_root VARCHAR(64) NOT NULL,
    epoch_timestamp TIMESTAMPTZ NOT NULL,
    global_entropy_production_jk DOUBLE PRECISION NOT NULL CHECK (global_entropy_production_jk >= 0),
    net_boundary_mass_delta_kg DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    net_boundary_energy_delta_joules DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    validator_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS boundary_override_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL REFERENCES thermodynamic_blocks(block_height) ON DELETE CASCADE,
    tx_hash VARCHAR(64) UNIQUE NOT NULL,
    origin_actor VARCHAR(128) NOT NULL,
    mutation_type VARCHAR(64) NOT NULL, -- e.g., 'ANTHROPOGENIC_CARBON', 'VULCANISM', 'ALBEDO_MOD'
    strict_bounds BOOLEAN NOT NULL DEFAULT TRUE,
    min_temperature_kelvin DOUBLE PRECISION NOT NULL DEFAULT 2.7315 CHECK (min_temperature_kelvin >= 0),
    allow_mass_destruction BOOLEAN NOT NULL DEFAULT FALSE,
    recomputed_sensible_heat BOOLEAN NOT NULL DEFAULT TRUE,
    signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boundary_override_tx_block 
    ON boundary_override_transactions(block_height);

-- ----------------------------------------------------------------------------
-- 3. Thermodynamic Override Execution Reports
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_override_reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES boundary_override_transactions(transaction_id) ON DELETE CASCADE,
    timestamp BIGINT NOT NULL,
    cell_count_modified INTEGER NOT NULL CHECK (cell_count_modified >= 0),
    net_mass_delta_kg DOUBLE PRECISION NOT NULL,
    net_energy_delta_joules DOUBLE PRECISION NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_override_reports_tx 
    ON thermodynamic_override_reports(transaction_id);

-- ----------------------------------------------------------------------------
-- 4. Granular Cell-Level State Mutations (Delta Audit Log)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cell_thermodynamic_delta_records (
    record_id BIGSERIAL PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES thermodynamic_override_reports(report_id) ON DELETE CASCADE,
    h3_index VARCHAR(15) NOT NULL REFERENCES spatial_h3_cells(h3_index),
    cell_index INTEGER NOT NULL CHECK (cell_index >= 0),
    pre_mass_kg DOUBLE PRECISION NOT NULL CHECK (pre_mass_kg >= 0),
    post_mass_kg DOUBLE PRECISION NOT NULL CHECK (post_mass_kg >= 0),
    mass_delta_kg DOUBLE PRECISION NOT NULL,
    pre_energy_joules DOUBLE PRECISION NOT NULL CHECK (pre_energy_joules >= 0),
    post_energy_joules DOUBLE PRECISION NOT NULL CHECK (post_energy_joules >= 0),
    energy_delta_joules DOUBLE PRECISION NOT NULL,
    overridden_fields JSONB NOT NULL,
    delta_signature VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cell_delta_records_report 
    ON cell_thermodynamic_delta_records(report_id);
CREATE INDEX IF NOT EXISTS idx_cell_delta_records_h3 
    ON cell_thermodynamic_delta_records(h3_index);

-- ----------------------------------------------------------------------------
-- 5. Time-Series Thermodynamic State Tensor Channels
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS h3_cell_thermodynamic_states (
    h3_index VARCHAR(15) NOT NULL REFERENCES spatial_h3_cells(h3_index),
    timestamp TIMESTAMPTZ NOT NULL,
    block_height BIGINT NOT NULL REFERENCES thermodynamic_blocks(block_height),
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin >= 2.7315),
    sensible_heat_joules DOUBLE PRECISION NOT NULL CHECK (sensible_heat_joules >= 0),
    water_mass_kg DOUBLE PRECISION NOT NULL CHECK (water_mass_kg >= 0),
    soil_organic_carbon_kg DOUBLE PRECISION NOT NULL CHECK (soil_organic_carbon_kg >= 0),
    vegetation_biomass_kg DOUBLE PRECISION NOT NULL CHECK (vegetation_biomass_kg >= 0),
    atmospheric_co2_kg DOUBLE PRECISION NOT NULL CHECK (atmospheric_co2_kg >= 0),
    mineral_nitrogen_kg DOUBLE PRECISION NOT NULL CHECK (mineral_nitrogen_kg >= 0),
    albedo DOUBLE PRECISION NOT NULL CHECK (albedo >= 0.0 AND albedo <= 1.0),
    PRIMARY KEY (h3_index, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_h3_cell_thermodynamic_states_block 
    ON h3_cell_thermodynamic_states(block_height);

-- ----------------------------------------------------------------------------
-- 6. Monadic Boundary Verification Trigger & Integrity Checks
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verify_thermodynamic_override_integrity()
RETURNS TRIGGER AS $$
DECLARE
    sum_mass_delta DOUBLE PRECISION;
    sum_energy_delta DOUBLE PRECISION;
BEGIN
    -- Verify aggregate report deltas match sum of cell records
    SELECT 
        COALESCE(SUM(mass_delta_kg), 0.0),
        COALESCE(SUM(energy_delta_joules), 0.0)
    INTO 
        sum_mass_delta,
        sum_energy_delta
    FROM cell_thermodynamic_delta_records
    WHERE report_id = NEW.report_id;

    IF ABS(NEW.net_mass_delta_kg - sum_mass_delta) > 1e-6 THEN
        RAISE EXCEPTION 'First Law Violation: Net mass delta (%) does not equal sum of cell mass deltas (%)',
            NEW.net_mass_delta_kg, sum_mass_delta;
    END IF;

    IF ABS(NEW.net_energy_delta_joules - sum_energy_delta) > 1e-4 THEN
        RAISE EXCEPTION 'First Law Violation: Net energy delta (%) does not equal sum of cell energy deltas (%)',
            NEW.net_energy_delta_joules, sum_energy_delta;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_override_integrity ON thermodynamic_override_reports;
CREATE CONSTRAINT TRIGGER trg_verify_override_integrity
AFTER INSERT OR UPDATE ON thermodynamic_override_reports
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION verify_thermodynamic_override_integrity();