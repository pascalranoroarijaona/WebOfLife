-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger (Sprint 040)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic State & Entropy Validation Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_states (
    state_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id VARCHAR(255) NOT NULL,
    entropy_value NUMERIC(20, 10) NOT NULL CHECK (entropy_value >= 0.0),
    enthalpy_value NUMERIC(20, 10) NOT NULL,
    temperature NUMERIC(10, 4) NOT NULL,
    vector_payload JSONB NOT NULL,
    validation_status VARCHAR(50) NOT NULL DEFAULT 'VALIDATED',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thermodynamic_states_entity 
    ON thermodynamic_states(entity_id, recorded_at);

-- ----------------------------------------------------------------------------
-- 2. Thermodynamic Stock & Flow Ledger (Biogeochemical Cycles)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cycle_type VARCHAR(50) NOT NULL, -- CARBON, NITROGEN, PHOSPHORUS, WATER
    stock_name VARCHAR(100) NOT NULL,
    mass_or_energy NUMERIC(24, 10) NOT NULL,
    entropy_content NUMERIC(20, 10) NOT NULL CHECK (entropy_content >= 0.0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS thermodynamic_flows (
    flow_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_stock_id UUID REFERENCES thermodynamic_stocks(stock_id),
    target_stock_id UUID REFERENCES thermodynamic_stocks(stock_id),
    transfer_amount NUMERIC(24, 10) NOT NULL,
    entropy_production NUMERIC(20, 10) NOT NULL CHECK (entropy_production >= 0.0),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. Blockchain Transaction & Monad State Signatures
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT UNIQUE NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    state_root VARCHAR(64) NOT NULL,
    validator_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS block_transactions (
    tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_id UUID REFERENCES blockchain_blocks(block_id) ON DELETE CASCADE,
    monad_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    entropy_assertion_status BOOLEAN NOT NULL DEFAULT TRUE,
    tx_hash VARCHAR(64) UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_block_transactions_hash 
    ON block_transactions(tx_hash);