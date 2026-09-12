-- Updated Schema & Ledger Definitions for Sprint 042
-- Thermodynamic State Vector Non-Negative Entropy Assertion Utility

CREATE TABLE IF NOT EXISTS thermodynamic_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id VARCHAR(255) NOT NULL,
    entropy NUMERIC(18, 8) NOT NULL CHECK (entropy >= 0),
    energy NUMERIC(18, 8),
    temperature NUMERIC(18, 8),
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS thermodynamic_audit_ledger (
    block_id SERIAL PRIMARY KEY,
    state_id UUID REFERENCES thermodynamic_states(id),
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    transaction_signature VARCHAR(128) NOT NULL,
    biogeochemical_cycle VARCHAR(50) NOT NULL, -- CARBON, NITROGEN, PHOSPHORUS, WATER
    entropy_delta NUMERIC(18, 8) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thermodynamic_states_entity ON thermodynamic_states(entity_id);
CREATE INDEX IF NOT EXISTS idx_thermodynamic_audit_hash ON thermodynamic_audit_ledger(current_hash);