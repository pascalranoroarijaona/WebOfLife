-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger (Sprint 059)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic State Vectors & Pools
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    vector_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_step BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    boundary_condition VARCHAR(64) NOT NULL DEFAULT 'SOLAR_INPUT_ONLY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pool_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vector_id UUID NOT NULL REFERENCES thermodynamic_state_vectors(vector_id) ON DELETE CASCADE,
    pool_name VARCHAR(128) NOT NULL,
    stock_value NUMERIC(32, 12) NOT NULL,
    element_type VARCHAR(32) NOT NULL, -- e.g., 'CARBON', 'NITROGEN', 'PHOSPHORUS', 'WATER'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (vector_id, pool_name)
);

-- ----------------------------------------------------------------------------
-- 2. Monad Processes & Flux Integrations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS monad_flux_integrations (
    integration_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vector_id UUID NOT NULL REFERENCES thermodynamic_state_vectors(vector_id) ON DELETE CASCADE,
    pool_name VARCHAR(128) NOT NULL,
    influx_sum NUMERIC(32, 12) NOT NULL DEFAULT 0.0,
    outflux_sum NUMERIC(32, 12) NOT NULL DEFAULT 0.0,
    expected_delta NUMERIC(32, 12) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. State Validator Discrepancy Reports (Sprint 059)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discrepancy_reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vector_id UUID NOT NULL REFERENCES thermodynamic_state_vectors(vector_id) ON DELETE CASCADE,
    timestamp BIGINT NOT NULL,
    total_discrepancy NUMERIC(32, 12) NOT NULL,
    tolerance_threshold NUMERIC(32, 12) NOT NULL,
    within_tolerance BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pool_discrepancies (
    pool_discrepancy_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES discrepancy_reports(report_id) ON DELETE CASCADE,
    pool_name VARCHAR(128) NOT NULL,
    actual_delta NUMERIC(32, 12) NOT NULL,
    expected_delta NUMERIC(32, 12) NOT NULL,
    absolute_difference NUMERIC(32, 12) NOT NULL,
    violated BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. Thermodynamic Blockchain Ledger Transactions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT UNIQUE NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    state_vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id),
    validator_report_id UUID REFERENCES discrepancy_reports(report_id),
    miner_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance and chronological audit
CREATE INDEX idx_state_vectors_step ON thermodynamic_state_vectors(simulation_step);
CREATE INDEX idx_pool_stocks_name ON pool_stocks(pool_name);
CREATE INDEX idx_discrepancy_reports_tolerance ON discrepancy_reports(within_tolerance);
CREATE INDEX idx_blockchain_blocks_height ON blockchain_blocks(block_height);