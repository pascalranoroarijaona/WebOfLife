-- ============================================================================
-- Web of Life Database & Thermodynamic Blockchain Schema
-- Sprint 029 Update: Thermodynamic State Vector Validation & Monad Ledger
-- ============================================================================

-- Enable UUID extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic State Vectors & Validation Logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    vector_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    energy DOUBLE PRECISION NOT NULL CHECK (energy >= 0),
    entropy DOUBLE PRECISION NOT NULL CHECK (entropy >= 0),
    temperature DOUBLE PRECISION NOT NULL CHECK (temperature > 0),
    stocks JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    validation_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thermo_vectors_pod_time 
ON thermodynamic_state_vectors(pod_id, timestamp DESC);

-- ----------------------------------------------------------------------------
-- 2. Thermodynamic Monad Execution Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS monad_execution_logs (
    execution_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vector_id_input UUID REFERENCES thermodynamic_state_vectors(vector_id),
    vector_id_output UUID REFERENCES thermodynamic_state_vectors(vector_id),
    step_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('SUCCESS', 'VALIDATION_FAILED', 'EXECUTION_ERROR')),
    error_message TEXT,
    execution_time_ms DOUBLE PRECISION NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monad_logs_status 
ON monad_execution_logs(status, executed_at DESC);

-- ----------------------------------------------------------------------------
-- 3. Thermodynamic Blockchain Stock Transactions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT UNIQUE NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    universe_entropy_change DOUBLE PRECISION NOT NULL CHECK (universe_entropy_change >= 0),
    validator_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS thermodynamic_transactions (
    tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_id UUID REFERENCES thermodynamic_blocks(block_id) ON DELETE CASCADE,
    source_pod_id UUID NOT NULL,
    target_pod_id UUID NOT NULL,
    stock_type VARCHAR(100) NOT NULL, -- e.g., 'CARBON', 'NITROGEN', 'PHOSPHORUS', 'WATER'
    quantity DOUBLE PRECISION NOT NULL CHECK (quantity >= 0),
    entropy_generated DOUBLE PRECISION NOT NULL CHECK (entropy_generated >= 0),
    tx_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thermo_tx_block 
ON thermodynamic_transactions(block_id);