-- Updated Schema & Ledger Definitions for Sprint 079
-- Thermodynamic State Vector Inventory Discrepancy Evaluator & Monad Stock Transactions

CREATE TABLE IF NOT EXISTS thermodynamic_states (
    state_id VARCHAR(64) PRIMARY KEY,
    entity_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    carbon NUMERIC(18, 8) NOT NULL DEFAULT 0.0,
    nitrogen NUMERIC(18, 8) NOT NULL DEFAULT 0.0,
    phosphorus NUMERIC(18, 8) NOT NULL DEFAULT 0.0,
    water NUMERIC(18, 8) NOT NULL DEFAULT 0.0,
    energy NUMERIC(18, 8) NOT NULL DEFAULT 0.0,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS element_tolerances (
    tolerance_id VARCHAR(64) PRIMARY KEY,
    context_name VARCHAR(128) NOT NULL UNIQUE,
    carbon NUMERIC(18, 8) NOT NULL DEFAULT 1e-6,
    nitrogen NUMERIC(18, 8) NOT NULL DEFAULT 1e-6,
    phosphorus NUMERIC(18, 8) NOT NULL DEFAULT 1e-6,
    water NUMERIC(18, 8) NOT NULL DEFAULT 1e-6,
    energy NUMERIC(18, 8) NOT NULL DEFAULT 1e-6,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discrepancy_audit_logs (
    audit_id SERIAL PRIMARY KEY,
    state_id_actual VARCHAR(64) NOT NULL REFERENCES thermodynamic_states(state_id),
    state_id_expected VARCHAR(64) NOT NULL REFERENCES thermodynamic_states(state_id),
    is_valid BOOLEAN NOT NULL,
    max_discrepancy NUMERIC(18, 8) NOT NULL,
    discrepancy_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS thermodynamic_monad_transactions (
    transaction_id VARCHAR(64) PRIMARY KEY,
    block_hash VARCHAR(64) NOT NULL,
    previous_state_id VARCHAR(64) NOT NULL REFERENCES thermodynamic_states(state_id),
    resulting_state_id VARCHAR(64) NOT NULL REFERENCES thermodynamic_states(state_id),
    audit_id INT REFERENCES discrepancy_audit_logs(audit_id),
    status VARCHAR(32) NOT NULL CHECK (status IN ('COMMITTED', 'ROLLED_BACK', 'HALTED')),
    signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thermodynamic_states_entity ON thermodynamic_states(entity_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_discrepancy_audit_valid ON discrepancy_audit_logs(is_valid);
CREATE INDEX IF NOT EXISTS idx_monad_tx_status ON thermodynamic_monad_transactions(status);