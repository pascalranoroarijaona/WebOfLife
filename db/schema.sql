-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger Definitions
-- Sprint 080: Thermodynamic State Vector Inventory Discrepancy Evaluator Wrapper
-- ============================================================================

-- Enable TimescaleDB extension if not already present
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic State Vectors Table (Time-Series)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    vector_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    stock_data JSONB NOT NULL,
    solar_flux_input DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (vector_id, timestamp)
);

-- Convert to hypertable for high-frequency thermodynamic telemetry
SELECT create_hypertable('thermodynamic_state_vectors', 'timestamp', if_not_exists => TRUE);

-- ----------------------------------------------------------------------------
-- 2. State Discrepancy Evaluation Log Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS state_discrepancy_evaluations (
    evaluation_id SERIAL,
    vector_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    is_balanced BOOLEAN NOT NULL,
    total_discrepancy DOUBLE PRECISION NOT NULL,
    component_discrepancies JSONB NOT NULL,
    entropy_delta DOUBLE PRECISION NOT NULL CHECK (entropy_delta >= 0.0),
    tolerance_threshold DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (evaluation_id, timestamp)
);

SELECT create_hypertable('state_discrepancy_evaluations', 'timestamp', if_not_exists => TRUE);

-- ----------------------------------------------------------------------------
-- 3. Thermodynamic Blockchain Transaction Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_blockchain_ledger (
    block_id VARCHAR(64) PRIMARY KEY,
    parent_block_id VARCHAR(64),
    vector_id VARCHAR(64) NOT NULL,
    evaluation_id INTEGER NOT NULL,
    transaction_signature VARCHAR(128) NOT NULL,
    first_law_conserved BOOLEAN NOT NULL,
    second_law_entropy_valid BOOLEAN NOT NULL,
    committed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (evaluation_id) REFERENCES state_discrepancy_evaluations(evaluation_id)
);

CREATE INDEX IF NOT EXISTS idx_blockchain_vector_id ON thermodynamic_blockchain_ledger(vector_id);