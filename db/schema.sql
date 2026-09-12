-- Updated Schema & Ledger Definitions for Sprint 070
-- Thermodynamic State Vector Discrepancy Absolute Difference Math Function

CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    id SERIAL PRIMARY KEY,
    entity_id VARCHAR(255) NOT NULL,
    vector_type VARCHAR(50) NOT NULL CHECK (vector_type IN ('ACTUAL', 'EXPECTED')),
    stocks JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS state_discrepancy_logs (
    id SERIAL PRIMARY KEY,
    actual_vector_id INT REFERENCES thermodynamic_state_vectors(id),
    expected_vector_id INT REFERENCES thermodynamic_state_vectors(id),
    discrepancies JSONB NOT NULL DEFAULT '{}',
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS thermodynamic_blockchain_ledger (
    block_id SERIAL PRIMARY KEY,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    transaction_signature VARCHAR(128) NOT NULL,
    state_delta_summary JSONB NOT NULL,
    entropy_change NUMERIC(18, 6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thermo_vectors_entity ON thermodynamic_state_vectors(entity_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_discrepancy_logs_computed ON state_discrepancy_logs(computed_at);
CREATE INDEX IF NOT EXISTS idx_blockchain_hash ON thermodynamic_blockchain_ledger(current_hash);