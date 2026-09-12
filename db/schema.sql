-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger (Sprint 039)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic State Vectors & Entropy Audit Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_states (
    state_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL,
    entropy_value NUMERIC(20, 10) NOT NULL CHECK (entropy_value >= 0.0),
    internal_energy NUMERIC(20, 10) NOT NULL,
    temperature NUMERIC(10, 4) NOT NULL,
    pressure NUMERIC(12, 4) NOT NULL,
    validation_status VARCHAR(32) NOT NULL DEFAULT 'VALID',
    error_message TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_thermodynamic_states_entity ON thermodynamic_states(entity_id);
CREATE INDEX idx_thermodynamic_states_entropy ON thermodynamic_states(entropy_value);

-- ----------------------------------------------------------------------------
-- 2. Monad Execution & Result Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS monad_execution_ledger (
    execution_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utility_name VARCHAR(128) NOT NULL,
    input_payload JSONB NOT NULL,
    is_success BOOLEAN NOT NULL,
    result_payload JSONB,
    error_reason TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_monad_utility ON monad_execution_ledger(utility_name);
CREATE INDEX idx_monad_success ON monad_execution_ledger(is_success);

-- ----------------------------------------------------------------------------
-- 3. Thermodynamic Blockchain Block Transactions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGSERIAL UNIQUE NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    state_vector_id UUID REFERENCES thermodynamic_states(state_id),
    entropy_change_rate NUMERIC(20, 10) NOT NULL,
    miner_node_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_block_height ON thermodynamic_blocks(block_height);
CREATE INDEX idx_block_hash ON thermodynamic_blocks(current_hash);