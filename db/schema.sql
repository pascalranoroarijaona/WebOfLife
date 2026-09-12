-- Sprint 049: Thermodynamic State Vector Non-Negative Entropy Monad Pipe Schema

CREATE TABLE IF NOT EXISTS thermodynamic_states (
    state_id VARCHAR(64) PRIMARY KEY,
    entity_id VARCHAR(64) NOT NULL,
    internal_energy NUMERIC(20, 8) NOT NULL,
    kinetic_energy NUMERIC(20, 8) NOT NULL,
    potential_energy NUMERIC(20, 8) NOT NULL,
    entropy NUMERIC(20, 8) NOT NULL CHECK (entropy >= 0),
    temperature NUMERIC(12, 4) NOT NULL CHECK (temperature >= 0),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entropy_monad_transactions (
    transaction_id VARCHAR(64) PRIMARY KEY,
    previous_state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    next_state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    entropy_change NUMERIC(20, 8) NOT NULL,
    solar_flux_input NUMERIC(20, 8) NOT NULL DEFAULT 0.0,
    is_success BOOLEAN NOT NULL,
    rejection_reason TEXT,
    blockchain_hash VARCHAR(128) NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_thermodynamic_states_entity ON thermodynamic_states(entity_id, timestamp);
CREATE INDEX idx_entropy_monad_success ON entropy_monad_transactions(is_success);