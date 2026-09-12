-- Updated Schema & Ledger Definitions for Sprint 077
-- Thermodynamic State Vector Discrepancy Aggregator & Monad Stock Transactions

CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    vector_id VARCHAR(64) PRIMARY KEY,
    pod_id VARCHAR(64) NOT NULL,
    timestamp BIGINT NOT NULL,
    carbon_stock DECIMAL(18, 8) NOT NULL,
    nitrogen_stock DECIMAL(18, 8) NOT NULL,
    phosphorus_stock DECIMAL(18, 8) NOT NULL,
    water_stock DECIMAL(18, 8) NOT NULL,
    enthalpy_stock DECIMAL(18, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS state_evaluation_results (
    evaluation_id SERIAL PRIMARY KEY,
    timestamp BIGINT NOT NULL,
    expected_vector_id VARCHAR(64) REFERENCES thermodynamic_state_vectors(vector_id),
    actual_vector_id VARCHAR(64) REFERENCES thermodynamic_state_vectors(vector_id),
    discrepancy DECIMAL(18, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discrepancy_aggregations (
    aggregation_id SERIAL PRIMARY KEY,
    batch_timestamp BIGINT NOT NULL,
    max_discrepancy DECIMAL(18, 8) NOT NULL,
    total_evaluations INT NOT NULL,
    breach_flag BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blockchain_transactions (
    tx_hash VARCHAR(64) PRIMARY KEY,
    block_number BIGINT NOT NULL,
    sender_pod VARCHAR(64) NOT NULL,
    receiver_pod VARCHAR(64) NOT NULL,
    stock_type VARCHAR(32) NOT NULL,
    delta_amount DECIMAL(18, 8) NOT NULL,
    dissipation_amount DECIMAL(18, 8) NOT NULL,
    entropy_generation DECIMAL(18, 8) NOT NULL,
    signature TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_eval_results_timestamp ON state_evaluation_results(timestamp);
CREATE INDEX idx_discrepancy_aggregations_batch ON discrepancy_aggregations(batch_timestamp);
CREATE INDEX idx_blockchain_tx_block ON blockchain_transactions(block_number);