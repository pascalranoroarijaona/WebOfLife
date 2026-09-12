-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger Definitions
-- Sprint 026: Thermodynamic Equilibrium & Trophic Cascade Architecture
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic & Material Ledger Infrastructure
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    vector_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL,
    ambient_temperature NUMERIC(10, 4) NOT NULL DEFAULT 288.15, -- T_0 in Kelvin
    internal_energy NUMERIC(18, 8) NOT NULL,                    -- Joules (E_sys)
    entropy_generated NUMERIC(18, 8) NOT NULL DEFAULT 0.0,      -- Joules/Kelvin
    solar_flux_in NUMERIC(18, 8) NOT NULL DEFAULT 0.0,          -- Watts
    heat_dissipated NUMERIC(18, 8) NOT NULL DEFAULT 0.0,        -- Joules
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS material_pools (
    pool_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL,
    pool_type VARCHAR(50) NOT NULL, -- 'ATMOSPHERE', 'SOIL_MATRIX', 'BIOMASS', 'DETRITUS'
    carbon_mass NUMERIC(18, 8) NOT NULL DEFAULT 0.0,            -- grams
    nitrogen_mass NUMERIC(18, 8) NOT NULL DEFAULT 0.0,          -- grams
    phosphorus_mass NUMERIC(18, 8) NOT NULL DEFAULT 0.0,        -- grams
    water_mass NUMERIC(18, 8) NOT NULL DEFAULT 0.0,             -- grams
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trophic_monad_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_id UUID NOT NULL,
    source_entity_id UUID,
    target_entity_id UUID,
    transaction_type VARCHAR(64) NOT NULL, -- 'PHOTOSYNTHESIS', 'INGESTION', 'RESPIRATION', 'EGESTION'
    energy_transferred NUMERIC(18, 8) NOT NULL,                 -- Joules
    carbon_transferred NUMERIC(18, 8) NOT NULL DEFAULT 0.0,     -- grams
    entropy_delta NUMERIC(18, 8) NOT NULL,                      -- Joules/Kelvin
    stoichiometry_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. Biotic & Abiotic Entity Hierarchies
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS entities (
    entity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain VARCHAR(32) NOT NULL,                                -- 'ABIOTIC', 'BIOTIC'
    classification VARCHAR(64) NOT NULL,                        -- 'SOLAR_SOURCE', 'ATMOSPHERE', 'SOIL_MATRIX', 'C3_PLANT', 'HERBIVORE', etc.
    name VARCHAR(128) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organisms (
    organism_id UUID PRIMARY KEY REFERENCES entities(entity_id) ON DELETE CASCADE,
    biomass NUMERIC(18, 8) NOT NULL,                            -- grams
    assimilation_efficiency NUMERIC(5, 4) NOT NULL DEFAULT 0.10,-- e.g., 0.10 for 10%
    basal_metabolic_rate NUMERIC(18, 8) NOT NULL,               -- Watts
    trophic_level INTEGER NOT NULL                              -- 1: Autotroph, 2: Herbivore, 3+: Carnivore
);

-- ----------------------------------------------------------------------------
-- 3. Blockchain Ledger Integration for Energy Conservation Audits
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT GENERATED ALWAYS AS IDENTITY,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    total_system_energy NUMERIC(18, 8) NOT NULL,                -- Validating E_sys invariant
    total_system_entropy NUMERIC(18, 8) NOT NULL,               -- Validating dS >= 0
    solar_input_cumulative NUMERIC(18, 8) NOT NULL,
    heat_dissipated_cumulative NUMERIC(18, 8) NOT NULL,
    validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for time-series performance and invariant auditing
CREATE INDEX idx_thermodynamic_vectors_entity ON thermodynamic_state_vectors(entity_id, recorded_at DESC);
CREATE INDEX idx_material_pools_entity ON material_pools(entity_id);
CREATE INDEX idx_trophic_transactions_block ON trophic_monad_transactions(block_id);
CREATE INDEX idx_blocks_height ON thermodynamic_blocks(block_height DESC);