-- ============================================================================
-- Web of Life - Thermodynamic Blockchain & SQL Schema
-- Sprint 078 Addition: State Validator Discrepancy Reports & Ledger States
-- ============================================================================

CREATE TABLE IF NOT EXISTS thermodynamic_states (
    state_id VARCHAR(64) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    total_energy NUMERIC(24, 8) NOT NULL,
    total_entropy NUMERIC(24, 8) NOT NULL,
    is_balanced BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS state_vector_stocks (
    stock_id SERIAL PRIMARY KEY,
    state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id) ON DELETE CASCADE,
    stock_key VARCHAR(128) NOT NULL,
    stock_value NUMERIC(24, 8) NOT NULL,
    UNIQUE(state_id, stock_key)
);

CREATE TABLE IF NOT EXISTS discrepancy_reports (
    report_id SERIAL PRIMARY KEY,
    state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id) ON DELETE CASCADE,
    timestamp BIGINT NOT NULL,
    total_discrepancy NUMERIC(24, 8) NOT NULL,
    is_balanced BOOLEAN NOT NULL,
    entropy_delta NUMERIC(24, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vector_discrepancies (
    discrepancy_id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES discrepancy_reports(report_id) ON DELETE CASCADE,
    vector_key VARCHAR(128) NOT NULL,
    discrepancy_value NUMERIC(24, 8) NOT NULL
);

CREATE TABLE IF NOT EXISTS thermodynamic_blockchain_blocks (
    block_hash VARCHAR(64) PRIMARY KEY,
    previous_block_hash VARCHAR(64),
    state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    merkle_root VARCHAR(64) NOT NULL,
    nonce BIGINT NOT NULL,
    timestamp BIGINT NOT NULL,
    signature TEXT NOT NULL
);

-- Indexing for high-throughput time-series queries on thermodynamic stocks and validations
CREATE INDEX IF NOT EXISTS idx_thermo_states_timestamp ON thermodynamic_states(timestamp);
CREATE INDEX IF NOT EXISTS idx_discrepancy_reports_timestamp ON discrepancy_reports(timestamp);
CREATE INDEX IF NOT EXISTS idx_vector_discrepancies_report ON vector_discrepancies(report_id);