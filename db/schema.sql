-- Web of Life Thermodynamic Engine & Spatial Ledger Schema
-- Target: Sprint 044 - Discrete Global Grid System (H3 DGGS) Thermodynamic State Tensor
-- Physical Invariants: 1st Law (Conservation of Mass/Energy) & 2nd Law (dS_gen >= 0)

-- Extensions for spatial-temporal indexing and cryptographic verification
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum types for thermodynamic phases and transition types
DO $$ BEGIN
    CREATE TYPE thermodynamic_phase AS ENUM ('GAS', 'LIQUID', 'SOLID', 'PLASMA', 'SUPERCRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE spatial_monad_op_type AS ENUM (
        'STP_INITIALIZATION',
        'ADIABATIC_TRANSITION',
        'ISOTHERMAL_FLUX',
        'TROPHIC_EXCHANGE',
        'MASS_DIFFUSION',
        'ENTROPY_PRODUCTION'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Table: h3_cell_registry
-- Tracks registered H3 discrete global grid indices and geometric invariant properties
CREATE TABLE IF NOT EXISTS h3_cell_registry (
    h3_index VARCHAR(15) PRIMARY KEY,
    resolution SMALLINT NOT NULL CHECK (resolution >= 0 AND resolution <= 15),
    area_m2 NUMERIC(24, 6) NOT NULL CHECK (area_m2 > 0),
    centroid_lat NUMERIC(10, 7) NOT NULL CHECK (centroid_lat >= -90.0 AND centroid_lat <= 90.0),
    centroid_lon NUMERIC(11, 7) NOT NULL CHECK (centroid_lon >= -180.0 AND centroid_lon <= 180.0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: h3_cell_thermodynamic_state
-- Represents IH3CellThermodynamicState baseline and temporal state transitions
CREATE TABLE IF NOT EXISTS h3_cell_thermodynamic_state (
    state_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    h3_index VARCHAR(15) NOT NULL REFERENCES h3_cell_registry(h3_index) ON DELETE RESTRICT,
    epoch_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolution SMALLINT NOT NULL CHECK (resolution >= 0 AND resolution <= 15),
    area_m2 NUMERIC(24, 6) NOT NULL CHECK (area_m2 > 0),
    
    -- Bulk Intensive Thermodynamic Properties
    temperature_kelvin NUMERIC(12, 5) NOT NULL CHECK (temperature_kelvin > 0.0), -- Absolute Zero invariant
    surface_pressure_pa NUMERIC(14, 4) NOT NULL CHECK (surface_pressure_pa > 0.0),
    internal_energy_joules NUMERIC(28, 6) NOT NULL,
    entropy_joules_per_kelvin NUMERIC(28, 6) NOT NULL,

    -- Atmosphere Stock (IThermodynamicAtmosphereStock)
    atm_nitrogen_moles NUMERIC(24, 6) NOT NULL CHECK (atm_nitrogen_moles >= 0.0),
    atm_oxygen_moles NUMERIC(24, 6) NOT NULL CHECK (atm_oxygen_moles >= 0.0),
    atm_co2_moles NUMERIC(24, 6) NOT NULL CHECK (atm_co2_moles >= 0.0),
    atm_water_vapor_moles NUMERIC(24, 6) NOT NULL CHECK (atm_water_vapor_moles >= 0.0),

    -- Hydrosphere Stock (IThermodynamicHydrosphereStock)
    hydro_liquid_water_kg NUMERIC(24, 6) NOT NULL CHECK (hydro_liquid_water_kg >= 0.0),
    hydro_ice_kg NUMERIC(24, 6) NOT NULL CHECK (hydro_ice_kg >= 0.0),
    hydro_salinity_psu NUMERIC(8, 4) NOT NULL CHECK (hydro_salinity_psu >= 0.0),

    -- Lithosphere Stock (IThermodynamicLithosphereStock)
    litho_soil_organic_carbon_kg NUMERIC(24, 6) NOT NULL CHECK (litho_soil_organic_carbon_kg >= 0.0),
    litho_inorganic_mineral_kg NUMERIC(24, 6) NOT NULL CHECK (litho_inorganic_mineral_kg >= 0.0),
    litho_soil_moisture_kg NUMERIC(24, 6) NOT NULL CHECK (litho_soil_moisture_kg >= 0.0),

    -- Biosphere Stock (IThermodynamicBiosphereStock)
    bio_autotroph_biomass_kg NUMERIC(24, 6) NOT NULL CHECK (bio_autotroph_biomass_kg >= 0.0),
    bio_heterotroph_biomass_kg NUMERIC(24, 6) NOT NULL CHECK (bio_heterotroph_biomass_kg >= 0.0),
    bio_detritus_kg NUMERIC(24, 6) NOT NULL CHECK (bio_detritus_kg >= 0.0),

    -- Cryptographic Integrity & Merkle State Commit
    state_tensor_hash BYTEA NOT NULL,
    parent_state_id UUID REFERENCES h3_cell_thermodynamic_state(state_id),

    CONSTRAINT uq_cell_timestamp UNIQUE (h3_index, epoch_timestamp)
);

CREATE INDEX IF NOT EXISTS idx_h3_cell_state_h3_time 
    ON h3_cell_thermodynamic_state (h3_index, epoch_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_h3_cell_state_hash 
    ON h3_cell_thermodynamic_state USING HASH (state_tensor_hash);

-- Table: thermodynamic_blocks
-- Immutable blockchain ledger recording verifiable thermodynamic epoch state commitments
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash BYTEA NOT NULL UNIQUE,
    parent_block_hash BYTEA NOT NULL,
    merkle_state_root BYTEA NOT NULL,
    entropy_production_total NUMERIC(32, 8) NOT NULL CHECK (entropy_production_total >= 0.0), -- 2nd Law verification
    energy_conservation_delta NUMERIC(24, 8) NOT NULL, -- Must be within epsilon of zero
    mass_conservation_delta NUMERIC(24, 8) NOT NULL,   -- Must be within epsilon of zero
    validator_signature BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: thermodynamic_transactions
-- Monadic state transitions across H3 cells within a block ledger
CREATE TABLE IF NOT EXISTS thermodynamic_transactions (
    tx_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_height BIGINT NOT NULL REFERENCES thermodynamic_blocks(block_height) ON DELETE CASCADE,
    operation_type spatial_monad_op_type NOT NULL,
    source_h3_index VARCHAR(15) REFERENCES h3_cell_registry(h3_index),
    target_h3_index VARCHAR(15) REFERENCES h3_cell_registry(h3_index),
    pre_state_hash BYTEA NOT NULL,
    post_state_hash BYTEA NOT NULL,
    enthalpy_flux_joules NUMERIC(28, 6) NOT NULL,
    mass_flux_kg NUMERIC(24, 6) NOT NULL,
    entropy_delta_joules_per_k NUMERIC(28, 6) NOT NULL,
    transition_monad_signature BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_block_height 
    ON thermodynamic_transactions (block_height);
CREATE INDEX IF NOT EXISTS idx_tx_h3_source 
    ON thermodynamic_transactions (source_h3_index);
CREATE INDEX IF NOT EXISTS idx_tx_h3_target 
    ON thermodynamic_transactions (target_h3_index);

-- View: v_stp_thermodynamic_invariants
-- Computes and audits STP baseline state adherence (T = 288.15 K, P = 101325.0 Pa)
CREATE OR REPLACE VIEW v_stp_thermodynamic_invariants AS
SELECT 
    state_id,
    h3_index,
    resolution,
    area_m2,
    temperature_kelvin,
    surface_pressure_pa,
    (atm_nitrogen_moles + atm_oxygen_moles + atm_co2_moles + atm_water_vapor_moles) AS total_gas_moles,
    (
        atm_nitrogen_moles * 0.0280134 + 
        atm_oxygen_moles * 0.0319988 + 
        atm_co2_moles * 0.0440100 + 
        atm_water_vapor_moles * 0.0180153
    ) AS calculated_atm_mass_kg,
    (hydro_liquid_water_kg + hydro_ice_kg) AS total_water_kg,
    (litho_soil_organic_carbon_kg + litho_inorganic_mineral_kg + litho_soil_moisture_kg) AS total_litho_kg,
    (bio_autotroph_biomass_kg + bio_heterotroph_biomass_kg + bio_detritus_kg) AS total_biomass_kg,
    internal_energy_joules,
    entropy_joules_per_kelvin,
    state_tensor_hash
FROM h3_cell_thermodynamic_state;