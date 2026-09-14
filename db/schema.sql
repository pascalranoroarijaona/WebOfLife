-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Blockchain Ledger
-- Sprint 028: H3 Resolution Tier (0-15) Boundary Validation & Spatial Monads
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Spatial Resolution Tier Lookup Table (H3 Tiers 0-15)
CREATE TABLE IF NOT EXISTS h3_resolution_tiers (
    resolution_tier SMALLINT PRIMARY KEY CHECK (resolution_tier >= 0 AND resolution_tier <= 15),
    tier_description VARCHAR(64) NOT NULL,
    average_hexagon_area_km2 NUMERIC(18, 6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed standard H3 resolutions 0 through 15
INSERT INTO h3_resolution_tiers (resolution_tier, tier_description, average_hexagon_area_km2) VALUES
(0, 'Global Macro-Cell', 4250546.8475),
(1, 'Continental Sub-Cell', 607220.9782),
(2, 'Regional Cell', 86745.8540),
(3, 'Sub-Regional Cell', 12392.2649),
(4, 'Macro-Bioregion', 1770.3236),
(5, 'Bioregion', 252.9034),
(6, 'Sub-Bioregion', 36.1291),
(7, 'Landscape Cell', 5.1613),
(8, 'Sub-Landscape Cell', 0.7373),
(9, 'Micro-Habitat', 0.1053),
(10, 'Sub-Micro-Habitat', 0.0150),
(11, 'Patch Level', 0.00215),
(12, 'Sub-Patch Level', 0.000307),
(13, 'Local Plot', 0.0000438),
(14, 'Sub-Plot Level', 0.00000626),
(15, 'Micro-Resolution', 0.000000894)
ON CONFLICT (resolution_tier) DO NOTHING;

-- 2. Spatial Monads Table
CREATE TABLE IF NOT EXISTS spatial_monads (
    monad_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    h3_index VARCHAR(15) NOT NULL,
    resolution SMALLINT NOT NULL REFERENCES h3_resolution_tiers(resolution_tier),
    enthalpy_joules NUMERIC(24, 6) NOT NULL DEFAULT 0.000000 CHECK (enthalpy_joules >= 0),
    biomass_kg NUMERIC(20, 6) NOT NULL DEFAULT 0.000000 CHECK (biomass_kg >= 0),
    solar_flux_input NUMERIC(18, 6) NOT NULL DEFAULT 0.000000,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spatial_monads_h3 ON spatial_monads(h3_index);
CREATE INDEX idx_spatial_monads_resolution ON spatial_monads(resolution);

-- 3. Thermodynamic Stock Transactions Ledger (First & Second Law Conservation)
CREATE TABLE IF NOT EXISTS thermodynamic_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_monad_id UUID REFERENCES spatial_monads(monad_id),
    target_monad_id UUID REFERENCES spatial_monads(monad_id),
    energy_transferred_joules NUMERIC(24, 6) NOT NULL CHECK (energy_transferred_joules >= 0),
    entropy_generated_joules_k NUMERIC(20, 6) NOT NULL CHECK (entropy_generated_joules_k >= 0),
    transaction_type VARCHAR(32) NOT NULL, -- e.g., 'SOLAR_INPUT', 'TROPHIC_DIFFUSION', 'TIER_AGGREGATION'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Blockchain Blocks for Immutable Thermodynamic State Verifiability
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_index BIGSERIAL PRIMARY KEY,
    block_hash VARCHAR(64) NOT NULL UNIQUE,
    previous_block_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    state_enthalpy_total NUMERIC(30, 6) NOT NULL,
    nonce BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS block_transactions (
    block_index BIGINT REFERENCES thermodynamic_blocks(block_index),
    transaction_id UUID REFERENCES thermodynamic_transactions(transaction_id),
    PRIMARY KEY (block_index, transaction_id)
);