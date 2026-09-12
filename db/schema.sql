-- Sprint 009: Thermodynamic State Vector & Ledger Schema
-- Implements First and Second Law constraints, entropy generation rates, and exergy destruction tracking.

CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    id SERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    system_internal_energy_joules NUMERIC(38, 6) NOT NULL, -- U (J)
    system_entropy_joules_per_kelvin NUMERIC(38, 6) NOT NULL, -- S (J/K)
    temperature_kelvin NUMERIC(12, 4) NOT NULL, -- T (K)
    dead_state_temperature_kelvin NUMERIC(12, 4) NOT NULL, -- T_0 (K)
    
    -- Boundary Interactions
    solar_input_watts NUMERIC(24, 4) NOT NULL CHECK (solar_input_watts >= 0), -- Q_solar (W)
    planetary_emission_watts NUMERIC(24, 4) NOT NULL CHECK (planetary_emission_watts >= 0), -- Q_emit (W)
    
    -- Second Law Metrics
    entropy_generation_rate_watts_per_kelvin NUMERIC(24, 8) NOT NULL CHECK (entropy_generation_rate_watts_per_kelvin >= 0), -- S_gen_dot (W/K)
    exergy_destruction_rate_watts NUMERIC(24, 4) NOT NULL CHECK (exergy_destruction_rate_watts >= 0), -- I_dot = T_0 * S_gen_dot (W)
    exergy_efficiency NUMERIC(5, 4) NOT NULL CHECK (exergy_efficiency >= 0.0 AND exergy_efficiency <= 1.0),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS thermal_boundary_fluxes (
    id SERIAL PRIMARY KEY,
    state_vector_id INTEGER REFERENCES thermodynamic_state_vectors(id) ON DELETE CASCADE,
    heat_transfer_rate_watts NUMERIC(24, 4) NOT NULL, -- Q_dot (W)
    boundary_temperature_kelvin NUMERIC(12, 4) NOT NULL -- T_b (K)
);

CREATE TABLE IF NOT EXISTS mass_boundary_fluxes (
    id SERIAL PRIMARY KEY,
    state_vector_id INTEGER REFERENCES thermodynamic_state_vectors(id) ON DELETE CASCADE,
    species_id VARCHAR(64) NOT NULL,
    mass_flow_rate_kg_per_sec NUMERIC(24, 8) NOT NULL, -- m_dot (kg/s)
    specific_enthalpy_joules_per_kg NUMERIC(24, 4) NOT NULL, -- h (J/kg)
    specific_entropy_joules_per_kelvin NUMERIC(24, 4) NOT NULL -- s (J/kg·K)
);

CREATE TABLE IF NOT EXISTS thermodynamic_monad_transactions (
    block_id VARCHAR(64) PRIMARY KEY,
    previous_block_id VARCHAR(64),
    timestamp BIGINT NOT NULL,
    state_vector_id INTEGER REFERENCES thermodynamic_state_vectors(id) NOT NULL,
    second_law_verified BOOLEAN NOT NULL CHECK (second_law_verified = TRUE),
    signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_thermodynamic_state_timestamp ON thermodynamic_state_vectors(timestamp);
CREATE INDEX idx_monad_transactions_block ON thermodynamic_monad_transactions(block_id);