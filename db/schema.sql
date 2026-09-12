-- ============================================================================
-- Web of Life Database Schema: Sprint 003
-- Thermodynamic State Vectors, Boundary Fluxes, & Exergy Ledger
-- ============================================================================

-- Enable UUID extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Control Volumes & Earth Pods
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS control_volumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. Thermodynamic State Vectors (Time-Series Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    control_volume_id UUID NOT NULL REFERENCES control_volumes(id) ON DELETE CASCADE,
    timestamp BIGINT NOT NULL,
    internal_energy NUMERIC(24, 6) NOT NULL, -- [J]
    total_mass NUMERIC(20, 6) NOT NULL,     -- [kg]
    temperature NUMERIC(10, 4) NOT NULL,    -- [K]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thermo_state_vector_time 
ON thermodynamic_state_vectors(control_volume_id, timestamp DESC);

-- ----------------------------------------------------------------------------
-- 3. Boundary Flux Arrays
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS boundary_flux_arrays (
    state_vector_id UUID PRIMARY KEY REFERENCES thermodynamic_state_vectors(id) ON DELETE CASCADE,
    radiative_flux NUMERIC(18, 6) NOT NULL,     -- Net solar/terrestrial [W]
    convective_flux NUMERIC(18, 6) NOT NULL,    -- Sensible/latent heat [W]
    mass_enthalpy_flux NUMERIC(18, 6) NOT NULL, -- Enthalpy transport [W]
    species_mass_fluxes JSONB DEFAULT '{}'::jsonb -- Record<string, number> [kg/s]
);

-- ----------------------------------------------------------------------------
-- 4. Second-Law Entropy & Exergy Metrics (Clausius-Duhem Enforcement)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entropy_metrics (
    state_vector_id UUID PRIMARY KEY REFERENCES thermodynamic_state_vectors(id) ON DELETE CASCADE,
    s_gen_rate NUMERIC(18, 6) NOT NULL CHECK (s_gen_rate >= 0),         -- d(S_gen)/dt [W/K]
    reference_temperature NUMERIC(10, 4) NOT NULL,                      -- T_0 [K]
    exergy_destruction_rate NUMERIC(18, 6) NOT NULL CHECK (exergy_destruction_rate >= 0) -- I = T_0 * S_gen_dot [W]
);

-- ----------------------------------------------------------------------------
-- 5. Thermodynamic Blockchain Transaction Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_index BIGINT PRIMARY KEY,
    previous_hash VARCHAR(64) NOT NULL,
    block_hash VARCHAR(64) NOT NULL UNIQUE,
    merkle_root VARCHAR(64) NOT NULL,
    state_vector_id UUID NOT NULL REFERENCES thermodynamic_state_vectors(id),
    validator_signature VARCHAR(128) NOT NULL,
    minted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thermo_blocks_hash ON thermodynamic_blocks(block_hash);