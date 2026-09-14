-- Updated Schema & Ledger Definitions - Sprint 014: Spatial Ingress & Thermodynamic Guard Clauses

CREATE TABLE IF NOT EXISTS spatial_monad_stocks (
    monad_id VARCHAR(64) PRIMARY KEY,
    h3_index VARCHAR(15),
    is_validated BOOLEAN NOT NULL DEFAULT FALSE,
    entropy_state DECIMAL(18, 6) NOT NULL DEFAULT 0.000000,
    solar_energy_input DECIMAL(18, 6) NOT NULL DEFAULT 0.000000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS spatial_guard_audit_log (
    log_id SERIAL PRIMARY KEY,
    monad_id VARCHAR(64) REFERENCES spatial_monad_stocks(monad_id),
    raw_payload TEXT,
    validation_status VARCHAR(32) NOT NULL,
    error_message TEXT,
    thermodynamic_penalty DECIMAL(18, 6) DEFAULT 0.000000,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blockchain_transactions (
    tx_hash VARCHAR(64) PRIMARY KEY,
    block_number BIGINT NOT NULL,
    monad_id VARCHAR(64) REFERENCES spatial_monad_stocks(monad_id),
    signature TEXT NOT NULL,
    energy_delta DECIMAL(18, 6) NOT NULL,
    state_transition_type VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spatial_monad_h3 ON spatial_monad_stocks(h3_index);
CREATE INDEX IF NOT EXISTS idx_audit_validation ON spatial_guard_audit_log(validation_status);
CREATE INDEX IF NOT EXISTS idx_blockchain_block ON blockchain_transactions(block_number);