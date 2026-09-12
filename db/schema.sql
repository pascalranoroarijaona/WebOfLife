-- ============================================================================
-- Web of Life Database & Thermodynamic Blockchain Ledger Schema
-- Sprint 012: Thermodynamic State Vector & Exergy Ledger Integration
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic State Vectors Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_id VARCHAR(64) NOT NULL,
    internal_energy NUMERIC(24, 6) NOT NULL, -- Joules [J]
    entropy NUMERIC(24, 6) NOT NULL,        -- Joules per Kelvin [J/K]
    reference_temperature NUMERIC(8, 4) NOT NULL DEFAULT 288.15, -- Kelvin [K]
    entropy_generation_rate NUMERIC(18, 6) NOT NULL CHECK (entropy_generation_rate >= 0), -- [W/K], S_gen >= 0
    exergy_destruction_rate NUMERIC(18, 6) NOT NULL CHECK (exergy_destruction_rate >= 0),  -- [W], I = T0 * S_gen
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    simulation_tick BIGINT NOT NULL
);

CREATE INDEX idx_thermodynamic_vectors_pod_tick ON thermodynamic_state_vectors(pod_id, simulation_tick);

-- ----------------------------------------------------------------------------
-- 2. Boundary Flux Arrays Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS boundary_flux_vectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_vector_id UUID REFERENCES thermodynamic_state_vectors(id) ON DELETE CASCADE,
    boundary_segment_id VARCHAR(64) NOT NULL,
    heat_flux_watts NUMERIC(18, 6) NOT NULL,     -- Thermal heat transfer rate [W]
    radiative_net_watts NUMERIC(18, 6) NOT NULL, -- Net shortwave/longwave radiative flux [W]
    mass_flux_kg_s NUMERIC(18, 6) NOT NULL       -- Mass transport rate [kg/s]
);

CREATE INDEX idx_boundary_fluxes_state ON boundary_flux_vectors(state_vector_id);

-- ----------------------------------------------------------------------------
-- 3. Monad Stock Transitions Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_monad_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_id VARCHAR(64) NOT NULL,
    previous_state_id UUID REFERENCES thermodynamic_state_vectors(id),
    next_state_id UUID REFERENCES thermodynamic_state_vectors(id),
    stock_payload JSONB NOT NULL, -- Serialized biogeochemical cycle stocks (C, N, P, Water)
    second_law_verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_monad_transitions_pod ON thermodynamic_monad_transitions(pod_id);

-- ----------------------------------------------------------------------------
-- 4. Thermodynamic Blockchain Ledger Signatures
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_ledger_blocks (
    block_index BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    block_hash VARCHAR(64) NOT NULL UNIQUE,
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    transition_id UUID REFERENCES thermodynamic_monad_transitions(id),
    total_exergy_destruction NUMERIC(24, 6) NOT NULL,
    miner_node_id VARCHAR(64) NOT NULL,
    nonce BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_blocks_hash ON thermodynamic_ledger_blocks(block_hash);
CREATE INDEX idx_ledger_blocks_index ON thermodynamic_ledger_blocks(block_index);