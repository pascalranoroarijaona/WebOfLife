-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger Definitions
-- Sprint 020 Integration: Thermodynamic State Vector & Second Law Compliance
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Thermodynamic State Vectors Table
-- Captures time-series thermodynamic states for pods and planetary subsystems
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_id UUID NOT NULL,
    internal_energy NUMERIC(38, 12) NOT NULL, -- Joules (J)
    entropy NUMERIC(38, 12) NOT NULL, -- Joules per Kelvin (J/K)
    reference_temperature NUMERIC(10, 4) NOT NULL DEFAULT 288.15, -- Kelvin (K)
    entropy_generation_rate NUMERIC(38, 12) NOT NULL CHECK (entropy_generation_rate >= 0.0), -- W/K (Second Law Enforcement)
    exergy_destruction_rate NUMERIC(38, 12) NOT NULL CHECK (exergy_destruction_rate >= 0.0), -- Watts (J/s)
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Thermodynamic Boundary Fluxes Table
-- Records heat, mass, enthalpy, and entropy across system boundaries
CREATE TABLE IF NOT EXISTS thermodynamic_boundary_fluxes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_vector_id UUID REFERENCES thermodynamic_state_vectors(id) ON DELETE CASCADE,
    heat_fluxes NUMERIC(38, 12)[] NOT NULL, -- Watts (J/s)
    boundary_temperatures NUMERIC(10, 4)[] NOT NULL, -- Kelvin (K)
    mass_fluxes NUMERIC(38, 12)[] NOT NULL, -- kg/s (C, N, P, H2O cycles)
    specific_enthalpies NUMERIC(38, 12)[] NOT NULL, -- J/kg
    specific_entropies NUMERIC(38, 12)[] NOT NULL, -- J/(kg·K)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Biogeochemical Monad Stocks Table
-- Tracks elemental stocks (Carbon, Nitrogen, Phosphorus, Water) bound to thermodynamics
CREATE TABLE IF NOT EXISTS biogeochemical_monad_stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_id UUID NOT NULL,
    element_type VARCHAR(16) NOT NULL CHECK (element_type IN ('CARBON', 'NITROGEN', 'PHOSPHORUS', 'WATER')),
    mass_pool NUMERIC(38, 12) NOT NULL CHECK (mass_pool >= 0.0), -- kg
    enthalpy NUMERIC(38, 12) NOT NULL, -- Joules
    timestamp BIGINT NOT NULL,
    CONSTRAINT unique_pod_element_time UNIQUE (pod_id, element_type, timestamp)
);

-- 4. Thermodynamic Blockchain Ledger Transactions
-- Immutable record of thermodynamic and monad transitions secured cryptographically
CREATE TABLE IF NOT EXISTS thermodynamic_ledger_transactions (
    block_id BIGSERIAL PRIMARY KEY,
    transaction_uuid UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    state_vector_id UUID REFERENCES thermodynamic_state_vectors(id),
    entropy_generation_rate NUMERIC(38, 12) NOT NULL,
    exergy_destruction_rate NUMERIC(38, 12) NOT NULL,
    solar_flux_input NUMERIC(38, 12) NOT NULL CHECK (solar_flux_input >= 0.0),
    validator_signature VARCHAR(128) NOT NULL,
    block_hash VARCHAR(64) NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Time-Series Analysis & Validation
CREATE INDEX IF NOT EXISTS idx_thermo_states_pod_time ON thermodynamic_state_vectors(pod_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monad_stocks_element ON biogeochemical_monad_stocks(element_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_block_hash ON thermodynamic_ledger_transactions(block_hash);