-- ============================================================================
-- Web of Life Database, UML & Thermodynamic Blockchain Schema
-- Sprint 012 Update: H3 String Payload Guard Clauses & Spatial Monad Integrity
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic Blockchain Ledger (Blocks & Transactions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash VARCHAR(64) NOT NULL UNIQUE,
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    thermodynamic_entropy NUMERIC(20, 10) NOT NULL,
    total_energy_joules NUMERIC(24, 6) NOT NULL,
    validator_node_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS block_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT REFERENCES blocks(block_height) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    energy_delta_joules NUMERIC(18, 6) NOT NULL,
    entropy_delta NUMERIC(18, 10) NOT NULL,
    payload_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. Spatial Monad & H3 Grid Tables
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_monad_states (
    state_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    monad_uuid UUID NOT NULL,
    h3_index VARCHAR(15), -- Nullable in raw intake, strictly guarded before state mutation
    validation_status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'VALID', 'GUARD_REJECTED', 'DEFAULT_SINK'
    energy_stock NUMERIC(18, 6) NOT NULL,
    entropy_stock NUMERIC(18, 10) NOT NULL,
    error_message TEXT,
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Convert to TimescaleDB hypertable for time-series spatial tracking
SELECT create_hypertable('spatial_monad_states', 'recorded_at', if_not_exists => TRUE);

-- ----------------------------------------------------------------------------
-- 3. Thermodynamic Stock Transactions & Flows
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_stock_flows (
    flow_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_stock_id UUID NOT NULL,
    target_stock_id UUID NOT NULL,
    joules_transferred NUMERIC(18, 6) NOT NULL,
    guard_assertion_passed BOOLEAN NOT NULL DEFAULT FALSE,
    flow_signature VARCHAR(128) NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spatial_monad_h3 ON spatial_monad_states(h3_index);
CREATE INDEX IF NOT EXISTS idx_spatial_monad_status ON spatial_monad_states(validation_status);