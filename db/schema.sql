-- ============================================================================
-- Web of Life Database Schema: Sprint 069
-- Thermodynamic State Vector Discrepancy Absolute Difference Math Function
-- ============================================================================

-- Enable UUID extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic State Vectors & Stock Ledgers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_states (
    state_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    stocks JSONB NOT NULL DEFAULT '{}'::jsonb,
    entropy_delta NUMERIC(20, 10) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thermodynamic_states_entity_time 
    ON thermodynamic_states(entity_id, timestamp DESC);

-- ----------------------------------------------------------------------------
-- 2. State Discrepancy Ledger (Sprint 069 Tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS state_discrepancy_logs (
    discrepancy_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actual_state_id UUID REFERENCES thermodynamic_states(state_id) ON DELETE CASCADE,
    expected_state_id UUID REFERENCES thermodynamic_states(state_id) ON DELETE CASCADE,
    absolute_deltas JSONB NOT NULL DEFAULT '{}'::jsonb,
    max_absolute_delta NUMERIC(20, 10) NOT NULL DEFAULT 0.0,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_state_discrepancy_computed 
    ON state_discrepancy_logs(computed_at DESC);

-- ----------------------------------------------------------------------------
-- 3. Thermodynamic Monad Stock Transactions & Blockchain Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_monad_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_index BIGINT NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    actor_id VARCHAR(255) NOT NULL,
    stock_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
    stock_outputs JSONB NOT NULL DEFAULT '{}'::jsonb,
    discrepancy_record_id UUID REFERENCES state_discrepancy_logs(discrepancy_id),
    first_law_conserved BOOLEAN NOT NULL DEFAULT TRUE,
    second_law_entropy_valid BOOLEAN NOT NULL DEFAULT TRUE,
    signature VARCHAR(128) NOT NULL,
    committed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thermo_monad_block 
    ON thermodynamic_monad_transactions(block_index DESC);

CREATE INDEX IF NOT EXISTS idx_thermo_monad_hash 
    ON thermodynamic_monad_transactions(current_hash);