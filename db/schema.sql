-- ============================================================================
-- Web of Life: Thermodynamic State Vector & Conservation Ledger Schema
-- Sprint 051: Thermodynamic State Vector Stock Conservation Asserter
-- ============================================================================

CREATE TABLE IF NOT EXISTS thermodynamic_stocks (
    stock_id VARCHAR(64) PRIMARY KEY,
    stock_name VARCHAR(128) NOT NULL UNIQUE,
    category VARCHAR(64) NOT NULL, -- e.g., 'ELEMENTAL', 'ENERGETIC', 'ENTROPIC'
    base_unit VARCHAR(32) NOT NULL,
    default_tolerance NUMERIC(20, 10) DEFAULT 1e-6,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS state_vectors (
    vector_id VARCHAR(64) PRIMARY KEY,
    pod_id VARCHAR(64) NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS state_vector_components (
    vector_id VARCHAR(64) REFERENCES state_vectors(vector_id) ON DELETE CASCADE,
    stock_id VARCHAR(64) REFERENCES thermodynamic_stocks(stock_id),
    stock_value NUMERIC(30, 12) NOT NULL,
    PRIMARY KEY (vector_id, stock_id)
);

CREATE TABLE IF NOT EXISTS flux_boundaries (
    boundary_id VARCHAR(64) PRIMARY KEY,
    pod_id VARCHAR(64) NOT NULL,
    solar_input NUMERIC(20, 10) NOT NULL DEFAULT 0.0,
    dissipation_rate NUMERIC(20, 10) NOT NULL DEFAULT 0.0,
    recorded_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS boundary_net_fluxes (
    boundary_id VARCHAR(64) REFERENCES flux_boundaries(boundary_id) ON DELETE CASCADE,
    stock_id VARCHAR(64) REFERENCES thermodynamic_stocks(stock_id),
    flux_rate NUMERIC(30, 12) NOT NULL,
    PRIMARY KEY (boundary_id, stock_id)
);

CREATE TABLE IF NOT EXISTS conservation_validation_runs (
    validation_id VARCHAR(64) PRIMARY KEY,
    previous_vector_id VARCHAR(64) REFERENCES state_vectors(vector_id),
    current_vector_id VARCHAR(64) REFERENCES state_vectors(vector_id),
    boundary_id VARCHAR(64) REFERENCES flux_boundaries(boundary_id),
    delta_time NUMERIC(16, 6) NOT NULL,
    is_valid BOOLEAN NOT NULL,
    validated_at BIGINT NOT NULL,
    block_signature VARCHAR(128)
);

CREATE TABLE IF NOT EXISTS conservation_violations (
    violation_id VARCHAR(64) PRIMARY KEY,
    validation_id VARCHAR(64) REFERENCES conservation_validation_runs(validation_id) ON DELETE CASCADE,
    stock_id VARCHAR(64) REFERENCES thermodynamic_stocks(stock_id),
    observed_delta NUMERIC(30, 12) NOT NULL,
    predicted_delta NUMERIC(30, 12) NOT NULL,
    discrepancy NUMERIC(30, 12) NOT NULL,
    tolerance NUMERIC(20, 10) NOT NULL
);

CREATE INDEX idx_state_vectors_pod_timestamp ON state_vectors(pod_id, timestamp);
CREATE INDEX idx_validation_runs_validity ON conservation_validation_runs(is_valid);