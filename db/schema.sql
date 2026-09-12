-- Sprint 060: Thermodynamic State Vector Inventory Discrepancy Evaluator Schema
-- Maintains relational and time-series ledgers for thermodynamic conservation laws, 
-- state vectors, flux-derived deltas, and validation reports.

CREATE TABLE IF NOT EXISTS thermodynamic_stocks (
    stock_id VARCHAR(64) PRIMARY KEY,
    biogeochemical_cycle VARCHAR(32) NOT NULL, -- e.g., 'CARBON', 'NITROGEN', 'PHOSPHORUS', 'WATER'
    current_quantity DECIMAL(24, 12) NOT NULL,
    last_updated_timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS state_vectors (
    vector_id VARCHAR(64) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    parent_vector_id VARCHAR(64) REFERENCES state_vectors(vector_id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS state_vector_stocks (
    vector_id VARCHAR(64) REFERENCES state_vectors(vector_id) ON DELETE CASCADE,
    stock_id VARCHAR(64) REFERENCES thermodynamic_stocks(stock_id),
    quantity DECIMAL(24, 12) NOT NULL,
    PRIMARY KEY (vector_id, stock_id)
);

CREATE TABLE IF NOT EXISTS thermodynamic_fluxes (
    flux_id VARCHAR(64) PRIMARY KEY,
    source_stock_id VARCHAR(64) REFERENCES thermodynamic_stocks(stock_id),
    target_stock_id VARCHAR(64) REFERENCES thermodynamic_stocks(stock_id),
    flux_magnitude DECIMAL(24, 12) NOT NULL,
    is_solar_input BOOLEAN DEFAULT FALSE,
    timestamp BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS validation_reports (
    report_id VARCHAR(64) PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    previous_vector_id VARCHAR(64) REFERENCES state_vectors(vector_id),
    current_vector_id VARCHAR(64) REFERENCES state_vectors(vector_id),
    is_valid BOOLEAN NOT NULL,
    max_discrepancy DECIMAL(24, 12) NOT NULL,
    tolerance DECIMAL(12, 10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discrepancy_results (
    result_id BIGSERIAL PRIMARY KEY,
    report_id VARCHAR(64) REFERENCES validation_reports(report_id) ON DELETE CASCADE,
    stock_id VARCHAR(64) REFERENCES thermodynamic_stocks(stock_id),
    actual_delta DECIMAL(24, 12) NOT NULL,
    expected_delta DECIMAL(24, 12) NOT NULL,
    absolute_difference DECIMAL(24, 12) NOT NULL,
    is_within_tolerance BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS blockchain_block_signatures (
    block_hash VARCHAR(64) PRIMARY KEY,
    previous_block_hash VARCHAR(64),
    report_id VARCHAR(64) REFERENCES validation_reports(report_id),
    merkle_root VARCHAR(64) NOT NULL,
    transaction_signature TEXT NOT NULL,
    mined_timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance and time-series analytical queries
CREATE INDEX IF NOT EXISTS idx_state_vectors_timestamp ON state_vectors(timestamp);
CREATE INDEX IF NOT EXISTS idx_validation_reports_timestamp ON validation_reports(timestamp);
CREATE INDEX IF NOT EXISTS idx_discrepancy_results_report ON discrepancy_results(report_id);
CREATE INDEX IF NOT EXISTS idx_thermodynamic_fluxes_timestamp ON thermodynamic_fluxes(timestamp);