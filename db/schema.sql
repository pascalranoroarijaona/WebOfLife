-- Updated Schema & Ledger Definitions for Sprint 083
-- Thermodynamic State Vector Inventory Discrepancy Evaluator Wrapper

CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    vector_id VARCHAR(64) PRIMARY KEY,
    entity_id VARCHAR(64) NOT NULL,
    solar_boundary_input NUMERIC(18, 8) NOT NULL,
    total_enthalpy NUMERIC(18, 8) NOT NULL,
    total_entropy NUMERIC(18, 8) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS thermodynamic_stocks (
    stock_id SERIAL PRIMARY KEY,
    vector_id VARCHAR(64) REFERENCES thermodynamic_state_vectors(vector_id) ON DELETE CASCADE,
    stock_key VARCHAR(128) NOT NULL,
    stock_value NUMERIC(18, 8) NOT NULL,
    CONSTRAINT unique_vector_stock UNIQUE (vector_id, stock_key)
);

CREATE TABLE IF NOT EXISTS discrepancy_evaluations (
    evaluation_id SERIAL PRIMARY KEY,
    vector_id VARCHAR(64) REFERENCES thermodynamic_state_vectors(vector_id) ON DELETE CASCADE,
    is_valid BOOLEAN NOT NULL,
    total_mass_variance NUMERIC(18, 12) NOT NULL,
    evaluated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discrepancy_details (
    detail_id SERIAL PRIMARY KEY,
    evaluation_id INTEGER REFERENCES discrepancy_evaluations(evaluation_id) ON DELETE CASCADE,
    stock_key VARCHAR(128) NOT NULL,
    variance_value NUMERIC(18, 12) NOT NULL
);

CREATE TABLE IF NOT EXISTS blockchain_stock_transactions (
    tx_hash VARCHAR(64) PRIMARY KEY,
    evaluation_id INTEGER REFERENCES discrepancy_evaluations(evaluation_id),
    previous_hash VARCHAR(64),
    mass_conservation_verified BOOLEAN NOT NULL,
    entropy_generation_rate NUMERIC(18, 12) NOT NULL,
    block_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_thermodynamic_stocks_vector ON thermodynamic_stocks(vector_id);
CREATE INDEX idx_discrepancy_evaluations_vector ON discrepancy_evaluations(vector_id);
CREATE INDEX idx_blockchain_tx_hash ON blockchain_stock_transactions(tx_hash);