-- ============================================================================
-- Web of Life Database & Thermodynamic Blockchain Schema
-- Sprint 076: Thermodynamic State Vector Discrepancy Mapping Iterator
-- ============================================================================

-- Enable UUID extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic Stock Collections & Elemental Baselines
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id VARCHAR(255) NOT NULL,
    element_type VARCHAR(10) CHECK (element_type IN ('C', 'N', 'P', 'H2O')),
    stock_value NUMERIC(20, 8) NOT NULL,
    baseline_value NUMERIC(20, 8) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thermodynamic_stocks_entity 
    ON thermodynamic_stocks(entity_id, element_type);

-- ----------------------------------------------------------------------------
-- 2. Discrepancy Records Ledger (First & Second Law Validation)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS discrepancy_records (
    record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_id UUID REFERENCES thermodynamic_stocks(stock_id) ON DELETE CASCADE,
    element VARCHAR(10) CHECK (element IN ('C', 'N', 'P', 'H2O')),
    expected NUMERIC(20, 8) NOT NULL,
    actual NUMERIC(20, 8) NOT NULL,
    discrepancy NUMERIC(20, 8) NOT NULL,
    is_within_tolerance BOOLEAN NOT NULL,
    entropy_generation NUMERIC(20, 8) DEFAULT 0.0 CHECK (entropy_generation >= 0),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discrepancy_records_tolerance 
    ON discrepancy_records(is_within_tolerance);

-- ----------------------------------------------------------------------------
-- 3. Thermodynamic Blockchain Block & Transaction Signatures
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT UNIQUE NOT NULL,
    prev_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    state_vector_hash VARCHAR(64) NOT NULL,
    validator_signature TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS thermodynamic_transactions (
    tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_id UUID REFERENCES thermodynamic_blocks(block_id) ON DELETE CASCADE,
    record_id UUID REFERENCES discrepancy_records(record_id),
    sender_entity VARCHAR(255) NOT NULL,
    receiver_entity VARCHAR(255) NOT NULL,
    enthalpy_delta NUMERIC(20, 8) NOT NULL,
    entropy_delta NUMERIC(20, 8) NOT NULL,
    transaction_signature VARCHAR(128) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thermo_tx_block 
    ON thermodynamic_transactions(block_id);