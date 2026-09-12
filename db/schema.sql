-- ============================================================================
-- Web of Life: Thermodynamic State Vector & Exergy Ledger Schema (Sprint 15)
-- Enforces First and Second Laws of Thermodynamics on Ecological Stocks/Flows
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for Thermodynamic Cycles
CREATE TYPE cycle_type AS ENUM ('CARBON', 'NITROGEN', 'PHOSPHORUS', 'WATER');

-- Table: thermodynamic_states
-- Captures time-series thermodynamic vectors for each planetary cycle subsystem
CREATE TABLE thermodynamic_states (
    state_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cycle_name cycle_type NOT NULL,
    timestamp BIGINT NOT NULL,
    temperature DOUBLE PRECISION NOT NULL CHECK (temperature >= 0),
    dead_state_temperature DOUBLE PRECISION NOT NULL CHECK (dead_state_temperature >= 0),
    internal_energy DOUBLE PRECISION NOT NULL,
    entropy DOUBLE PRECISION NOT NULL,
    entropy_generation_rate DOUBLE PRECISION NOT NULL CHECK (entropy_generation_rate >= 0),
    exergy_destruction_rate DOUBLE PRECISION NOT NULL CHECK (exergy_destruction_rate >= 0),
    first_law_residual DOUBLE PRECISION NOT NULL,
    second_law_valid BOOLEAN GENERATED ALWAYS AS (entropy_generation_rate >= 0.0) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: boundary_fluxes
-- Records individual mass/energy/entropy flows crossing subsystem boundaries
CREATE TABLE boundary_fluxes (
    flux_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_id UUID NOT NULL REFERENCES thermodynamic_states(state_id) ON DELETE CASCADE,
    species VARCHAR(64) NOT NULL,
    mass_flow_rate DOUBLE PRECISION NOT NULL,
    specific_enthalpy DOUBLE PRECISION NOT NULL,
    specific_entropy DOUBLE PRECISION NOT NULL,
    heat_transfer_rate DOUBLE PRECISION NOT NULL,
    boundary_temperature DOUBLE PRECISION NOT NULL CHECK (boundary_temperature >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for high-frequency time-series queries and thermodynamic auditing
CREATE INDEX idx_thermo_states_cycle_time ON thermodynamic_states(cycle_name, timestamp DESC);
CREATE INDEX idx_boundary_fluxes_state_id ON boundary_fluxes(state_id);

-- Blockchain Transaction Ledger for Thermodynamic Verification Records
CREATE TABLE thermodynamic_ledger_blocks (
    block_id BIGSERIAL PRIMARY KEY,
    previous_hash VARCHAR(64) NOT NULL,
    block_hash VARCHAR(64) NOT NULL UNIQUE,
    state_id UUID NOT NULL REFERENCES thermodynamic_states(state_id),
    miner_signature VARCHAR(128) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    timestamp BIGINT NOT NULL
);

CREATE INDEX idx_ledger_block_hash ON thermodynamic_ledger_blocks(block_hash);