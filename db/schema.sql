-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger Definitions
-- Sprint 011: Uber H3 Index Character Set Verification & Spatial Monad Integrity
-- ============================================================================

-- Enable UUID extension for cryptographic block signatures
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. SPATIAL & H3 GRID DOMAIN
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS h3_spatial_nodes (
    node_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    h3_index VARCHAR(15) NOT NULL UNIQUE CHECK (h3_index ~ '^[0-9a-f]{15}$'),
    resolution INT NOT NULL DEFAULT 9,
    is_validated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_h3_spatial_nodes_index ON h3_spatial_nodes(h3_index);

-- ----------------------------------------------------------------------------
-- 2. TROPHIC & MONAD STOCK STORES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS trophic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID REFERENCES h3_spatial_nodes(node_id) ON DELETE CASCADE,
    trophic_level VARCHAR(32) NOT NULL CHECK (trophic_level IN ('PRIMARY_PRODUCER', 'PRIMARY_CONSUMER', 'SECONDARY_CONSUMER', 'DECOMPOSER')),
    enthalpy_joules NUMERIC(20, 6) NOT NULL CHECK (enthalpy_joules >= 0.0),
    biomass_kg NUMERIC(20, 6) NOT NULL CHECK (biomass_kg >= 0.0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trophic_stocks_node ON trophic_stocks(node_id);

-- ----------------------------------------------------------------------------
-- 3. THERMODYNAMIC BLOCKCHAIN LEDGER & TRANSACTIONS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT UNIQUE NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    solar_input_joules NUMERIC(24, 6) NOT NULL CHECK (solar_input_joules >= 0.0),
    dissipated_enthalpy_joules NUMERIC(24, 6) NOT NULL CHECK (dissipated_enthalpy_joules >= 0.0),
    miner_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS spatial_monad_transactions (
    tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_id UUID REFERENCES thermodynamic_blocks(block_id) ON DELETE CASCADE,
    source_node_id UUID REFERENCES h3_spatial_nodes(node_id),
    target_node_id UUID REFERENCES h3_spatial_nodes(node_id),
    h3_index_payload VARCHAR(15) NOT NULL CHECK (h3_index_payload ~ '^[0-9a-f]{15}$'),
    transaction_type VARCHAR(32) NOT NULL CHECK (transaction_type IN ('STATE_TRANSITION', 'BOUNDARY_REJECTION', 'SOLAR_ALLOCATION')),
    enthalpy_delta_joules NUMERIC(20, 6) NOT NULL,
    signature VARCHAR(128) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spatial_monad_tx_block ON spatial_monad_transactions(block_id);
CREATE INDEX IF NOT EXISTS idx_spatial_monad_tx_payload ON spatial_monad_transactions(h3_index_payload);