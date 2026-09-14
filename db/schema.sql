-- ============================================================================
-- Web of Life: Thermodynamic Ledger & Spatial State Schema
-- Sprint 043: Discrete H3 Hexagonal Cell Thermodynamic Invariant Verification
-- ============================================================================

-- Spatial grid topology reference table for Uber H3 cells
CREATE TABLE IF NOT EXISTS h3_grid_cells (
    cell_index VARCHAR(15) PRIMARY KEY,
    resolution INTEGER NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    centroid_lat DOUBLE PRECISION NOT NULL CHECK (centroid_lat BETWEEN -90.0 AND 90.0),
    centroid_lon DOUBLE PRECISION NOT NULL CHECK (centroid_lon BETWEEN -180.0 AND 180.0),
    surface_area_m2 DOUBLE PRECISION NOT NULL CHECK (surface_area_m2 > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Core Blockchain Block Header with Thermodynamic Conservation Merkle Root
CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash CHAR(64) NOT NULL UNIQUE,
    parent_hash CHAR(64) NOT NULL,
    state_root CHAR(64) NOT NULL,
    thermodynamic_entropy_merkle_root CHAR(64) NOT NULL,
    total_enthalpy_joules DOUBLE PRECISION NOT NULL,
    total_carbon_mass_kg DOUBLE PRECISION NOT NULL CHECK (total_carbon_mass_kg >= 0),
    total_water_mass_kg DOUBLE PRECISION NOT NULL CHECK (total_water_mass_kg >= 0),
    timestamp BIGINT NOT NULL,
    validator_signature VARCHAR(130) NOT NULL
);

-- Discrete H3 Cell Thermodynamic State Tensor Snapshots
CREATE TABLE IF NOT EXISTS h3_cell_thermodynamic_states (
    state_id BIGSERIAL PRIMARY KEY,
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(block_height) ON DELETE CASCADE,
    cell_index VARCHAR(15) NOT NULL REFERENCES h3_grid_cells(cell_index),
    temperature_kelvin DOUBLE PRECISION NOT NULL,
    atmospheric_carbon DOUBLE PRECISION NOT NULL,
    organic_carbon DOUBLE PRECISION NOT NULL,
    water_mass_kg DOUBLE PRECISION NOT NULL,
    enthalpy_joules DOUBLE PRECISION NOT NULL,
    is_thermodynamically_valid BOOLEAN NOT NULL DEFAULT TRUE,
    snapshot_timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Physical invariant checks representing Omega_phys admissibility bounds
    CONSTRAINT chk_positive_temperature CHECK (temperature_kelvin > 0.0),
    CONSTRAINT chk_non_negative_atm_carbon CHECK (atmospheric_carbon >= -1e-9),
    CONSTRAINT chk_non_negative_org_carbon CHECK (organic_carbon >= -1e-9),
    CONSTRAINT chk_non_negative_water_mass CHECK (water_mass_kg >= -1e-9),
    CONSTRAINT chk_finite_enthalpy CHECK (enthalpy_joules = enthalpy_joules)
);

CREATE INDEX IF NOT EXISTS idx_h3_state_cell_block ON h3_cell_thermodynamic_states(cell_index, block_height);
CREATE INDEX IF NOT EXISTS idx_h3_state_validity ON h3_cell_thermodynamic_states(is_thermodynamically_valid);

-- Multivariant Trophic Biomass Stocks associated with an H3 Cell State
CREATE TABLE IF NOT EXISTS h3_cell_biomass_stocks (
    stock_id BIGSERIAL PRIMARY KEY,
    state_id BIGINT NOT NULL REFERENCES h3_cell_thermodynamic_states(state_id) ON DELETE CASCADE,
    trophic_tier VARCHAR(64) NOT NULL, -- e.g., autotroph, primary_herbivore, apex_predator, decomposer
    biomass_mass_kg DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Mass non-negativity constraint
    CONSTRAINT chk_non_negative_trophic_biomass CHECK (biomass_mass_kg >= -1e-9),
    CONSTRAINT uq_state_trophic_tier UNIQUE (state_id, trophic_tier)
);

CREATE INDEX IF NOT EXISTS idx_biomass_stocks_state ON h3_cell_biomass_stocks(state_id);

-- Thermodynamic State Validation Audit Trail
CREATE TABLE IF NOT EXISTS h3_thermodynamic_validation_events (
    validation_id BIGSERIAL PRIMARY KEY,
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(block_height) ON DELETE CASCADE,
    cell_index VARCHAR(15) NOT NULL REFERENCES h3_grid_cells(cell_index),
    is_valid BOOLEAN NOT NULL,
    tolerance DOUBLE PRECISION NOT NULL DEFAULT 1e-9,
    min_temperature_kelvin DOUBLE PRECISION NOT NULL DEFAULT 1e-3,
    violation_count INTEGER NOT NULL DEFAULT 0,
    evaluated_at BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_validation_events_cell ON h3_thermodynamic_validation_events(cell_index, evaluated_at);
CREATE INDEX IF NOT EXISTS idx_validation_events_block ON h3_thermodynamic_validation_events(block_height);

-- Detailed Invariant Violations Emitted by validateH3CellThermodynamicState
CREATE TABLE IF NOT EXISTS h3_thermodynamic_violations (
    violation_id BIGSERIAL PRIMARY KEY,
    validation_id BIGINT NOT NULL REFERENCES h3_thermodynamic_validation_events(validation_id) ON DELETE CASCADE,
    violation_type VARCHAR(32) NOT NULL CHECK (
        violation_type IN (
            'NEGATIVE_STOCK',
            'NON_POSITIVE_TEMPERATURE',
            'NON_FINITE_VALUE',
            'CORRUPT_METADATA'
        )
    ),
    field_name VARCHAR(128) NOT NULL,
    observed_value DOUBLE PRECISION,
    threshold_value DOUBLE PRECISION,
    diagnostic_message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_violations_validation_id ON h3_thermodynamic_violations(validation_id);
CREATE INDEX IF NOT EXISTS idx_violations_type ON h3_thermodynamic_violations(violation_type);

-- Thermodynamic Stock Ledger Transitions (Monadic bind ledger receipts)
CREATE TABLE IF NOT EXISTS thermodynamic_stock_transitions (
    transition_id BIGSERIAL PRIMARY KEY,
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(block_height) ON DELETE CASCADE,
    cell_index VARCHAR(15) NOT NULL REFERENCES h3_grid_cells(cell_index),
    monad_stage VARCHAR(64) NOT NULL, -- e.g., 'climate', 'trophic', 'lateral_flux'
    delta_atmospheric_carbon DOUBLE PRECISION NOT NULL,
    delta_organic_carbon DOUBLE PRECISION NOT NULL,
    delta_water_mass_kg DOUBLE PRECISION NOT NULL,
    delta_enthalpy_joules DOUBLE PRECISION NOT NULL,
    entropy_generated_joules_per_kelvin DOUBLE PRECISION NOT NULL CHECK (entropy_generated_joules_per_kelvin >= 0),
    post_state_hash CHAR(64) NOT NULL,
    pre_validation_passed BOOLEAN NOT NULL,
    post_validation_passed BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transitions_cell_stage ON thermodynamic_stock_transitions(cell_index, monad_stage);