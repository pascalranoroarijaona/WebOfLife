-- ============================================================================
-- Web of Life: Database, UML & Thermodynamic Blockchain Architecture
-- Sprint 017 Schema Update: H3 Spatial Indexing & Thermodynamic Ledger
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic Blockchain Ledger (First & Second Law Conservation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    entropy_delta NUMERIC(20, 10) NOT NULL CHECK (entropy_delta >= 0),
    solar_input_joules NUMERIC(20, 10) NOT NULL CHECK (solar_input_joules >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS thermodynamic_transactions (
    tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_id UUID REFERENCES thermodynamic_blocks(block_id) ON DELETE CASCADE,
    source_monad_id UUID NOT NULL,
    target_monad_id UUID NOT NULL,
    energy_joules NUMERIC(20, 10) NOT NULL CHECK (energy_joules >= 0),
    signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. Spatial Indexing & H3 Grids (Sprint 017)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_h3_indices (
    h3_index VARCHAR(15) PRIMARY KEY CHECK (length(h3_index) = 15 AND h3_index ~ '^[0-9a-f]{15}$'),
    resolution INTEGER NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    biome_type VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. Biosphere Monad Stocks & Trophic Flows
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trophic_monads (
    monad_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    h3_index VARCHAR(15) REFERENCES spatial_h3_indices(h3_index),
    trophic_level VARCHAR(32) NOT NULL CHECK (trophic_level IN ('PRIMARY_PRODUCER', 'HERBIVORE', 'CARNIVORE', 'APEX_PREDATOR', 'DECOMPOSER')),
    biomass_joules NUMERIC(20, 10) NOT NULL CHECK (biomass_joules >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance & spatial queries
CREATE INDEX IF NOT EXISTS idx_spatial_h3_index ON spatial_h3_indices(h3_index);
CREATE INDEX IF NOT EXISTS idx_trophic_monads_h3 ON trophic_monads(h3_index);