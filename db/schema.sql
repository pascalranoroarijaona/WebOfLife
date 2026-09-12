-- Updated Schema & Ledger Definitions for Sprint 074
-- Focus: Thermodynamic State Vector Discrepancy Absolute Difference Validation & Stock/Flow Ledger

CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    vector_id VARCHAR(64) PRIMARY KEY,
    entity_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    elements JSONB NOT NULL DEFAULT '{}', -- Maps elemental keys (C, N, P, H2O) to numeric stock values
    vector_type VARCHAR(32) NOT NULL CHECK (vector_type IN ('ACTUAL', 'EXPECTED', 'DELTA'))
);

CREATE TABLE IF NOT EXISTS thermodynamic_discrepancy_logs (
    log_id SERIAL PRIMARY KEY,
    vector_id_actual VARCHAR(64) REFERENCES thermodynamic_state_vectors(vector_id),
    vector_id_expected VARCHAR(64) REFERENCES thermodynamic_state_vectors(vector_id),
    absolute_deltas JSONB NOT NULL DEFAULT '{}', -- Results of computeAbsoluteStockDelta
    max_discrepancy NUMERIC(18, 8) NOT NULL DEFAULT 0.0,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blockchain_transactions (
    tx_hash VARCHAR(64) PRIMARY KEY,
    block_number BIGINT NOT NULL,
    sender_pod VARCHAR(64) NOT NULL,
    recipient_pod VARCHAR(64) NOT NULL,
    stock_payload JSONB NOT NULL,
    thermodynamic_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thermo_vectors_entity ON thermodynamic_state_vectors(entity_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_discrepancy_logs_evaluated ON thermodynamic_discrepancy_logs(evaluated_at);