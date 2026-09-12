-- Sprint 034: Thermodynamic State Vector Non-Negative Entropy Assertion Schema
-- Adds support for entropy validation tracking, thermodynamic state vectors, and Second Law compliance logs.

BEGIN;

-- Thermodynamic State Vectors Table with Non-Negative Constraints (Second Law)
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL,
    entropy NUMERIC(20, 8) NOT NULL CHECK (entropy >= 0),
    entropy_generation_rate NUMERIC(20, 8) NOT NULL CHECK (entropy_generation_rate >= 0),
    temperature NUMERIC(10, 4) NOT NULL CHECK (temperature >= 0),
    internal_energy NUMERIC(20, 8) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thermodynamic Validation Audit Log (Tracks assertions and violations)
CREATE TABLE IF NOT EXISTS thermodynamic_validation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_vector_id UUID REFERENCES thermodynamic_state_vectors(id) ON DELETE CASCADE,
    is_valid BOOLEAN NOT NULL,
    violation_type VARCHAR(64),
    error_message TEXT,
    validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thermodynamic Monad Stock Transactions Ledger
CREATE TABLE IF NOT EXISTS thermodynamic_monad_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_state_id UUID REFERENCES thermodynamic_state_vectors(id),
    target_state_id UUID REFERENCES thermodynamic_state_vectors(id),
    q_in NUMERIC(20, 8) NOT NULL DEFAULT 0.00000000,
    q_out NUMERIC(20, 8) NOT NULL DEFAULT 0.00000000,
    entropy_delta NUMERIC(20, 8) NOT NULL,
    block_hash VARCHAR(64) NOT NULL,
    signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for high-performance time-series queries
CREATE INDEX IF NOT EXISTS idx_thermodynamic_vectors_entity_time 
ON thermodynamic_state_vectors(entity_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_thermodynamic_logs_validity 
ON thermodynamic_validation_logs(is_valid, validated_at DESC);

COMMIT;