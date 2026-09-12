-- Updated Schema & Ledger Definitions (Sprint 036)
-- Thermodynamic State Vector Non-Negative Entropy Assertion & Ledger Records

CREATE TABLE IF NOT EXISTS thermodynamic_states (
    state_id VARCHAR(64) PRIMARY KEY,
    entity_id VARCHAR(64) NOT NULL,
    energy_stock NUMERIC(18, 8) NOT NULL CHECK (energy_stock >= 0),
    entropy_stock NUMERIC(18, 8) NOT NULL CHECK (entropy_stock >= 0),
    entropy_generation_rate NUMERIC(18, 8) NOT NULL CHECK (entropy_generation_rate >= 0),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS thermodynamic_monad_transactions (
    transaction_id VARCHAR(64) PRIMARY KEY,
    state_id VARCHAR(64) NOT NULL REFERENCES thermodynamic_states(state_id),
    previous_state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    solar_input_flux NUMERIC(18, 8) NOT NULL CHECK (solar_input_flux >= 0),
    is_valid BOOLEAN NOT NULL,
    violation_reason TEXT,
    block_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thermo_states_entity ON thermodynamic_states(entity_id);
CREATE INDEX IF NOT EXISTS idx_thermo_tx_signature ON thermodynamic_monad_transactions(block_signature);