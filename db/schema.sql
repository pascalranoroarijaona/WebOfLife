-- Web of Life Database, UML & Thermodynamic Blockchain Schema
-- Sprint 052: Thermodynamic State Vector Stock Conservation Asserter

CREATE TABLE IF NOT EXISTS thermodynamic_states (
    state_id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    vector_data JSONB NOT NULL,
    entropy_total DOUBLE PRECISION NOT NULL,
    enthalpy_total DOUBLE PRECISION NOT NULL,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS boundary_fluxes (
    flux_id VARCHAR(64) PRIMARY KEY,
    state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    element_name VARCHAR(64) NOT NULL,
    flux_rate DOUBLE PRECISION NOT NULL,
    delta_time DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conservation_reports (
    report_id VARCHAR(64) PRIMARY KEY,
    pre_state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    post_state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    element VARCHAR(64) NOT NULL,
    expected_delta DOUBLE PRECISION NOT NULL,
    actual_delta DOUBLE PRECISION NOT NULL,
    discrepancy DOUBLE PRECISION NOT NULL,
    tolerance DOUBLE PRECISION NOT NULL,
    is_valid BOOLEAN NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS thermodynamic_blockchain_ledger (
    block_index SERIAL PRIMARY KEY,
    block_hash VARCHAR(64) UNIQUE NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    report_id VARCHAR(64) REFERENCES conservation_reports(report_id),
    transaction_signature VARCHAR(128) NOT NULL,
    proof_of_work BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conservation_reports_valid ON conservation_reports(is_valid);
CREATE INDEX IF NOT EXISTS idx_boundary_fluxes_element ON boundary_fluxes(element_name);