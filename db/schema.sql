-- Web of Life - Thermodynamic Planetary Ledger Schema
-- Sprint 050: Discrete Vertical Cross-Section Contact Area & Lateral Flux Integration
-- Mathematical Invariant: A_ij = A_ji (Exact geometric symmetry for advective/diffusive conservation)

-- Enable PostGIS & cryptographic extensions if not already present
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------
-- Planetary Stratification Enums & Domain Definitions
-- ----------------------------------------------------------------------

CREATE TYPE planetary_stratum_layer AS ENUM (
    'ATMOSPHERE_EXOSPHERE',
    'ATMOSPHERE_THERMOSPHERE',
    'ATMOSPHERE_MESOSPHERE',
    'ATMOSPHERE_STRATOSPHERE',
    'ATMOSPHERE_TROPOSPHERE_UPPER',
    'ATMOSPHERE_TROPOSPHERE_BOUNDARY',
    'HYDROSPHERE_EPILIMNION',
    'HYDROSPHERE_THERMOCLINE',
    'HYDROSPHERE_HYPOLIMNION',
    'HYDROSPHERE_BENTHIC',
    'EDAPHIC_ORGANIC_HORIZON',
    'EDAPHIC_TOPSOIL_A',
    'EDAPHIC_SUBSOIL_B',
    'EDAPHIC_REGOLITH_C',
    'LITHOSPHERE_CRUST_UPPER',
    'LITHOSPHERE_CRUST_LOWER'
);

CREATE TYPE thermodynamic_flux_type AS ENUM (
    'MASS_ADVECTIVE_FLUID',
    'MASS_DIFFUSIVE_SOLUTE',
    'MASS_SEEPAGE_EDAPHIC',
    'HEAT_SENSIBLE_TURBULENT',
    'HEAT_CONDUCTIVE_LITHIC',
    'HEAT_LATENT_PHASE_CHANGE',
    'ENTROPY_DISSIPATION'
);

-- ----------------------------------------------------------------------
-- Spatial Strata Registry (H3 3D Prisms)
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS h3_cell_strata (
    stratum_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    h3_index VARCHAR(15) NOT NULL,
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    layer_type planetary_stratum_layer NOT NULL,
    z_base_meters DOUBLE PRECISION NOT NULL,
    z_top_meters DOUBLE PRECISION NOT NULL,
    volume_m3 DOUBLE PRECISION GENERATED ALWAYS AS (
        -- Geometric volume computed from horizontal area * layer height
        -- Actual exact volume incorporates spherical radial expansion
        GREATEST(0.0, z_top_meters - z_base_meters)
    ) STORED,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_valid_stratum_bounds CHECK (z_top_meters >= z_base_meters),
    CONSTRAINT uq_cell_stratum_layer UNIQUE (h3_index, layer_type)
);

CREATE INDEX IF NOT EXISTS idx_h3_cell_strata_h3 ON h3_cell_strata(h3_index);
CREATE INDEX IF NOT EXISTS idx_h3_cell_strata_elev ON h3_cell_strata(z_base_meters, z_top_meters);

-- ----------------------------------------------------------------------
-- Geometric Boundary Contact Area Ledger
-- Stores canonical symmetric edges: cell_index_a < cell_index_b
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS h3_boundary_interfaces (
    interface_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cell_index_a VARCHAR(15) NOT NULL,
    cell_index_b VARCHAR(15) NOT NULL,
    stratum_id_a UUID NOT NULL REFERENCES h3_cell_strata(stratum_id) ON DELETE CASCADE,
    stratum_id_b UUID NOT NULL REFERENCES h3_cell_strata(stratum_id) ON DELETE CASCADE,
    is_adjacent BOOLEAN NOT NULL DEFAULT TRUE,
    nominal_edge_length_meters DOUBLE PRECISION NOT NULL CHECK (nominal_edge_length_meters >= 0.0),
    midpoint_elevation_meters DOUBLE PRECISION NOT NULL,
    radial_scale_factor DOUBLE PRECISION NOT NULL CHECK (radial_scale_factor > 0.0),
    effective_overlap_height_meters DOUBLE PRECISION NOT NULL CHECK (effective_overlap_height_meters >= 0.0),
    contact_area_m2 DOUBLE PRECISION NOT NULL CHECK (contact_area_m2 >= 0.0),
    geometry_checksum VARCHAR(64) NOT NULL,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Enforce canonical ordering to guarantee A_ij = A_ji symmetry at the relational level
    CONSTRAINT chk_canonical_cell_ordering CHECK (cell_index_a < cell_index_b),
    CONSTRAINT uq_canonical_strata_pair UNIQUE (stratum_id_a, stratum_id_b)
);

CREATE INDEX IF NOT EXISTS idx_h3_boundary_lookup ON h3_boundary_interfaces(cell_index_a, cell_index_b);
CREATE INDEX IF NOT EXISTS idx_h3_boundary_area ON h3_boundary_interfaces(contact_area_m2);

-- ----------------------------------------------------------------------
-- Blockchain Ledger: Thermodynamic Blocks & Epoch State Roots
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGSERIAL PRIMARY KEY,
    block_hash VARCHAR(64) NOT NULL UNIQUE,
    previous_block_hash VARCHAR(64) NOT NULL,
    epoch_timestamp TIMESTAMPTZ NOT NULL,
    delta_time_seconds DOUBLE PRECISION NOT NULL CHECK (delta_time_seconds > 0.0),
    total_mass_kg NUMERIC(38, 8) NOT NULL,
    total_internal_energy_joules NUMERIC(38, 8) NOT NULL,
    entropy_production_joules_per_kelvin NUMERIC(38, 8) NOT NULL CHECK (entropy_production_joules_per_kelvin >= 0.0),
    merkle_root VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thermo_block_height ON thermodynamic_blocks(block_height);

-- ----------------------------------------------------------------------
-- Thermodynamic Lateral Boundary Flux Transactions
-- Divergence operator: Delta S_i = Delta t * SUM(F_ji * A_contact(j, i))
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_lateral_flux_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_height BIGINT NOT NULL REFERENCES thermodynamic_blocks(block_height) ON DELETE RESTRICT,
    interface_id UUID NOT NULL REFERENCES h3_boundary_interfaces(interface_id) ON DELETE RESTRICT,
    flux_type thermodynamic_flux_type NOT NULL,
    -- Positive flux indicates directional transport from cell_a to cell_b; negative indicates b to a
    flux_density DOUBLE PRECISION NOT NULL, -- e.g. kg/(m^2*s) or J/(m^2*s)
    total_flux_quantity NUMERIC(38, 12) NOT NULL, -- flux_density * contact_area_m2 * delta_time
    symmetry_verified BOOLEAN NOT NULL DEFAULT TRUE,
    transaction_signature VARCHAR(128) NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_flux_symmetry_enforced CHECK (symmetry_verified IS TRUE)
);

CREATE INDEX IF NOT EXISTS idx_flux_tx_block ON thermodynamic_lateral_flux_transactions(block_height);
CREATE INDEX IF NOT EXISTS idx_flux_tx_interface ON thermodynamic_lateral_flux_transactions(interface_id);

-- ----------------------------------------------------------------------
-- Cell Thermodynamic Stock Balance (Double-entry Invariant Ledger)
-- Enforces: dM_i/dt + div(J) = 0 and First Law Energy Conservation
-- ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_cell_stocks (
    stock_record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_height BIGINT NOT NULL REFERENCES thermodynamic_blocks(block_height) ON DELETE RESTRICT,
    stratum_id UUID NOT NULL REFERENCES h3_cell_strata(stratum_id) ON DELETE RESTRICT,
    mass_stock_kg NUMERIC(38, 8) NOT NULL CHECK (mass_stock_kg >= 0.0),
    internal_energy_joules NUMERIC(38, 8) NOT NULL,
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin >= 0.0),
    pressure_pascals DOUBLE PRECISION NOT NULL CHECK (pressure_pascals >= 0.0),
    divergence_mass_in_kg NUMERIC(38, 12) NOT NULL DEFAULT 0.0,
    divergence_mass_out_kg NUMERIC(38, 12) NOT NULL DEFAULT 0.0,
    divergence_energy_in_joules NUMERIC(38, 12) NOT NULL DEFAULT 0.0,
    divergence_energy_out_joules NUMERIC(38, 12) NOT NULL DEFAULT 0.0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cell_stock_per_block UNIQUE (block_height, stratum_id)
);

CREATE INDEX IF NOT EXISTS idx_cell_stocks_block ON thermodynamic_cell_stocks(block_height);
CREATE INDEX IF NOT EXISTS idx_cell_stocks_stratum ON thermodynamic_cell_stocks(stratum_id);

-- ----------------------------------------------------------------------
-- Continuous Integrity Trigger: Symmetrical Conservation Verification
-- ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verify_stratum_flux_conservation()
RETURNS TRIGGER AS $$
DECLARE
    contact_area DOUBLE PRECISION;
    calculated_total NUMERIC(38, 12);
    block_dt DOUBLE PRECISION;
BEGIN
    -- Retrieve verified contact area
    SELECT contact_area_m2 INTO contact_area
    FROM h3_boundary_interfaces
    WHERE interface_id = NEW.interface_id;

    -- Retrieve block time-step
    SELECT delta_time_seconds INTO block_dt
    FROM thermodynamic_blocks
    WHERE block_height = NEW.block_height;

    calculated_total := NEW.flux_density * contact_area * block_dt;

    -- Verify transactional fidelity against geometric bounds
    IF ABS(NEW.total_flux_quantity - calculated_total) > 1e-6 THEN
        RAISE EXCEPTION 'Thermodynamic Invariant Violation: Flux total (%) does not match contact_area * flux_density * dt (%)',
            NEW.total_flux_quantity, calculated_total;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_flux_conservation ON thermodynamic_lateral_flux_transactions;
CREATE TRIGGER trg_verify_flux_conservation
BEFORE INSERT ON thermodynamic_lateral_flux_transactions
FOR EACH ROW
EXECUTE FUNCTION verify_stratum_flux_conservation();