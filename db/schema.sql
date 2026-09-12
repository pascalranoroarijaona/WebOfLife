-- Updated Schema & Ledger Definitions for Sprint 046
-- Thermodynamic State Vector Non-Negative Entropy Exception Guard

CREATE TABLE IF NOT EXISTS thermodynamic_states (
    state_id UUID PRIMARY KEY,
    pod_id UUID NOT NULL,
    internal_energy NUMERIC(20, 8) NOT NULL,
    temperature NUMERIC(12, 4) NOT NULL,
    entropy NUMERIC(20, 8) NOT NULL,
    entropy_generation_rate NUMERIC(20, 8) NOT NULL,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_entropy_generation CHECK (entropy_generation_rate >= 0.0)
);

CREATE TABLE IF NOT EXISTS entropy_violation_audit_logs (
    violation_id UUID PRIMARY KEY,
    state_id UUID REFERENCES thermodynamic_states(state_id),
    invalid_entropy_generation_rate NUMERIC(20, 8) NOT NULL,
    error_message TEXT NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blockchain_transactions (
    tx_hash VARCHAR(64) PRIMARY KEY,
    block_number BIGINT NOT NULL,
    state_id UUID REFERENCES thermodynamic_states(state_id),
    signature VARCHAR(128) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    committed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thermodynamic_states_pod ON thermodynamic_states(pod_id);
CREATE INDEX IF NOT EXISTS idx_entropy_violations_state ON entropy_violation_audit_logs(state_id);