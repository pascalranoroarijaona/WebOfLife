-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger (Sprint 068)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic State Vectors Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    vector_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_id UUID NOT NULL,
    carbon DECIMAL(18, 8) NOT NULL DEFAULT 0.0,
    nitrogen DECIMAL(18, 8) NOT NULL DEFAULT 0.0,
    phosphorus DECIMAL(18, 8) NOT NULL DEFAULT 0.0,
    water DECIMAL(18, 8) NOT NULL DEFAULT 0.0,
    energy DECIMAL(18, 8) NOT NULL DEFAULT 0.0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_thermodynamic_vectors_pod ON thermodynamic_state_vectors(pod_id, recorded_at DESC);

-- ----------------------------------------------------------------------------
-- 2. State Discrepancy Reports Table (Sprint 068)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS state_discrepancy_reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actual_vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id) ON DELETE CASCADE,
    expected_vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id) ON DELETE CASCADE,
    is_valid BOOLEAN NOT NULL,
    max_discrepancy DECIMAL(18, 12) NOT NULL,
    discrepancy_details JSONB NOT NULL,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_discrepancy_reports_valid ON state_discrepancy_reports(is_valid, evaluated_at DESC);

-- ----------------------------------------------------------------------------
-- 3. Thermodynamic Stock Transactions & Blockchain Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_index BIGINT UNIQUE NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validator_signature VARCHAR(128) NOT NULL
);

CREATE TABLE IF NOT EXISTS thermodynamic_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_id UUID REFERENCES thermodynamic_blocks(block_id) ON DELETE CASCADE,
    source_pod_id UUID NOT NULL,
    target_pod_id UUID NOT NULL,
    element_type VARCHAR(32) NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    entropy_delta DECIMAL(18, 8) NOT NULL,
    signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_thermodynamic_tx_block ON thermodynamic_transactions(block_id);