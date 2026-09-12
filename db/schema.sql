-- ============================================================================
-- Web of Life: Thermodynamic Blockchain & Relational Schema
-- Updated for Sprint 044: Non-Negative Entropy Assertion Monad & Ledger Stocks
-- ============================================================================

CREATE TABLE IF NOT EXISTS thermodynamic_states (
    state_id VARCHAR(64) PRIMARY KEY,
    internal_energy NUMERIC(18, 6) NOT NULL,
    enthalpy NUMERIC(18, 6) NOT NULL,
    entropy NUMERIC(18, 6) CHECK (entropy >= 0) NOT NULL, -- Second Law Enforcement
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS entropy_validation_ledger (
    validation_id VARCHAR(64) PRIMARY KEY,
    state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    is_success BOOLEAN NOT NULL,
    error_message TEXT,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_hash VARCHAR(64) PRIMARY KEY,
    previous_hash VARCHAR(64) NOT NULL,
    solar_flux_vector NUMERIC(18, 6) NOT NULL,
    state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    nonce BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thermodynamic_states_entropy ON thermodynamic_states(entropy);
CREATE INDEX IF NOT EXISTS idx_validation_ledger_success ON entropy_validation_ledger(is_success);