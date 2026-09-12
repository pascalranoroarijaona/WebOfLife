-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger Definitions
-- Sprint 064: Thermodynamic State Vector Inventory Discrepancy Evaluator
-- ============================================================================

-- Drop existing tables to enforce clean schema instantiation if rebuilding
DROP TABLE IF EXISTS thermodynamic_discrepancy_audits CASCADE;
DROP TABLE IF EXISTS thermodynamic_state_vectors CASCADE;
DROP TABLE IF EXISTS thermodynamic_blocks CASCADE;
DROP TABLE IF EXISTS monad_stocks CASCADE;

-- 1. Monad Stocks Ledger (Matter & Energy Conservation Tracking)
CREATE TABLE monad_stocks (
    stock_id VARCHAR(64) PRIMARY KEY,
    entity_id VARCHAR(64) NOT NULL,
    element_type VARCHAR(32) NOT NULL, -- e.g., 'CARBON', 'NITROGEN', 'PHOSPHORUS', 'WATER', 'SOLAR_ENERGY'
    stock_value NUMERIC(20, 10) NOT NULL CHECK (stock_value >= 0.0),
    entropy_content NUMERIC(20, 10) NOT NULL DEFAULT 0.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Thermodynamic State Vectors (Capturing state vectors per simulation cycle)
CREATE TABLE thermodynamic_state_vectors (
    vector_id VARCHAR(64) PRIMARY KEY,
    cycle_index BIGINT NOT NULL,
    vector_data JSONB NOT NULL, -- Map of element keys to scalar values
    total_entropy NUMERIC(20, 10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Thermodynamic Discrepancy Audits (Sprint 064 Ledger Persistence)
CREATE TABLE thermodynamic_discrepancy_audits (
    audit_id VARCHAR(64) PRIMARY KEY,
    expected_vector_id VARCHAR(64) REFERENCES thermodynamic_state_vectors(vector_id) ON DELETE CASCADE,
    actual_vector_id VARCHAR(64) REFERENCES thermodynamic_state_vectors(vector_id) ON DELETE CASCADE,
    is_valid BOOLEAN NOT NULL,
    max_delta NUMERIC(20, 10) NOT NULL,
    discrepancy_details JSONB NOT NULL, -- Detailed element-wise expected, actual, delta, and tolerance
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Thermodynamic Blockchain Blocks (Immutable Transaction Ledgers)
CREATE TABLE thermodynamic_blocks (
    block_hash VARCHAR(64) PRIMARY KEY,
    previous_block_hash VARCHAR(64) REFERENCES thermodynamic_blocks(block_hash),
    merkle_root VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    state_vector_id VARCHAR(64) REFERENCES thermodynamic_state_vectors(vector_id),
    audit_id VARCHAR(64) REFERENCES thermodynamic_discrepancy_audits(audit_id),
    nonce BIGINT NOT NULL
);

-- Indexes for performance optimization on time-series and state checks
CREATE INDEX idx_monad_stocks_entity ON monad_stocks(entity_id);
CREATE INDEX idx_state_vectors_cycle ON thermodynamic_state_vectors(cycle_index);
CREATE INDEX idx_discrepancy_audits_valid ON thermodynamic_discrepancy_audits(is_valid);
CREATE INDEX idx_blocks_prev_hash ON thermodynamic_blocks(previous_block_hash);