-- ============================================================================
-- Web of Life Database & Thermodynamic Blockchain Schema (Sprint 062 Update)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Thermodynamic Stock State Vectors Table
CREATE TABLE IF NOT EXISTS thermodynamic_states (
    state_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id VARCHAR(255) NOT NULL,
    timestamp BIGINT NOT NULL,
    stocks JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thermodynamic_states_entity_time 
ON thermodynamic_states (entity_id, timestamp DESC);

-- 2. Thermodynamic Flux Transactions Ledger Table
CREATE TABLE IF NOT EXISTS thermodynamic_fluxes (
    flux_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_hash VARCHAR(64) UNIQUE NOT NULL,
    previous_state_id UUID REFERENCES thermodynamic_states(state_id),
    current_state_id UUID REFERENCES thermodynamic_states(state_id),
    net_fluxes JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thermodynamic_fluxes_hash 
ON thermodynamic_fluxes (transaction_hash);

-- 3. State Vector Discrepancy Reports Table (Sprint 062 Addition)
CREATE TABLE IF NOT EXISTS discrepancy_reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flux_id UUID REFERENCES thermodynamic_fluxes(flux_id) ON DELETE CASCADE,
    timestamp BIGINT NOT NULL,
    is_balanced BOOLEAN NOT NULL,
    max_discrepancy NUMERIC(20, 10) NOT NULL,
    tolerance NUMERIC(20, 10) NOT NULL DEFAULT 1e-6,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discrepancy_reports_balanced 
ON discrepancy_reports (is_balanced, timestamp DESC);

-- 4. Thermodynamic Blockchain Ledger Block Signatures
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT UNIQUE NOT NULL,
    previous_block_hash VARCHAR(64) NOT NULL,
    block_hash VARCHAR(64) UNIQUE NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    validator_signature VARCHAR(128) NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thermodynamic_blocks_height 
ON thermodynamic_blocks (block_height DESC);