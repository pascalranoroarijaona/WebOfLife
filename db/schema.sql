-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger (Sprint 019)
-- Capturing Thermodynamic State Vectors, Boundary Fluxes, and Exergy Destruction
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Thermodynamic Boundary Flux Vectors
CREATE TABLE IF NOT EXISTS boundary_flux_vectors (
    flux_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    solar_radiation_flux DOUBLE PRECISION NOT NULL,       -- W/m^2
    thermal_radiation_flux DOUBLE PRECISION NOT NULL,      -- W/m^2
    sensible_heat_flux DOUBLE PRECISION NOT NULL,          -- W/m^2
    latent_heat_flux DOUBLE PRECISION NOT NULL,            -- W/m^2
    mass_flux_map JSONB NOT NULL DEFAULT '{}'::jsonb,      -- Elemental & moisture mass transfer rates (kg/s or mol/s)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Thermodynamic State Vectors (Clausius-Duhem & Gouy-Stodola Compliance)
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    state_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_id UUID NOT NULL,
    flux_id UUID REFERENCES boundary_flux_vectors(flux_id),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    internal_energy DOUBLE PRECISION NOT NULL,             -- Joules (J)
    entropy DOUBLE PRECISION NOT NULL,                     -- Joules per Kelvin (J/K)
    temperature DOUBLE PRECISION NOT NULL,                 -- Kelvin (K)
    ambient_temperature DOUBLE PRECISION NOT NULL DEFAULT 288.15, -- T_0 (K)
    entropy_generation_rate DOUBLE PRECISION NOT NULL CHECK (entropy_generation_rate >= 0), -- S_dot_gen >= 0 (W/K)
    exergy_destruction_rate DOUBLE PRECISION NOT NULL,     -- I_dot = T_0 * S_dot_gen (W)
    exergy DOUBLE PRECISION NOT NULL,                      -- Available work potential / availability (J)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Thermodynamic Process Monad Executions & Derivatives
CREATE TABLE IF NOT EXISTS thermodynamic_process_monads (
    monad_execution_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_id UUID REFERENCES thermodynamic_state_vectors(state_id),
    process_id VARCHAR(255) NOT NULL,
    dt DOUBLE PRECISION NOT NULL,                          -- Time step (s)
    d_internal_energy DOUBLE PRECISION NOT NULL,
    d_entropy DOUBLE PRECISION NOT NULL,
    entropy_generation_rate DOUBLE PRECISION NOT NULL CHECK (entropy_generation_rate >= 0),
    exergy_destruction_rate DOUBLE PRECISION NOT NULL,
    mass_stock_deltas JSONB NOT NULL DEFAULT '{}'::jsonb,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Thermodynamic Blockchain Block Ledger & Transaction Signatures
CREATE TABLE IF NOT EXISTS thermodynamic_ledger_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_index BIGINT NOT NULL UNIQUE,
    previous_hash VARCHAR(64) NOT NULL,
    block_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    solar_forcing_total DOUBLE PRECISION NOT NULL,
    system_exergy_efficiency DOUBLE PRECISION NOT NULL,    -- eta_exergy = 1 - (sum(I_dot * dt) / E_solar_in)
    validator_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for high-performance time-series querying
CREATE INDEX IF NOT EXISTS idx_thermo_state_sim_time ON thermodynamic_state_vectors(simulation_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_boundary_flux_sim_time ON boundary_flux_vectors(simulation_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monad_exec_process ON thermodynamic_process_monads(process_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_block_index ON thermodynamic_ledger_blocks(block_index DESC);