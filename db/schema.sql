-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger (Sprint 021)
-- Spatial Resolution Tier (0-15) Boundary Check Integration
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Thermodynamic Ledger & Blockchain Blocks
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    height BIGINT UNIQUE NOT NULL,
    prev_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    thermodynamic_entropy_delta NUMERIC(20, 10) NOT NULL, -- Second Law tracking
    solar_input_joules NUMERIC(24, 6) NOT NULL,           -- Solar flux accounting
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS block_transactions (
    tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_id UUID REFERENCES blocks(block_id) ON DELETE CASCADE,
    sender_node VARCHAR(255) NOT NULL,
    receiver_node VARCHAR(255) NOT NULL,
    matter_mass_grams NUMERIC(18, 6) NOT NULL,            -- First Law: Matter Conservation
    energy_joules NUMERIC(18, 6) NOT NULL,
    spatial_resolution SMALLINT CHECK (spatial_resolution BETWEEN 0 AND 15),
    h3_index VARCHAR(15) NOT NULL,
    signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. Spatial Index & Resolution Tier Management (H3 Tiers 0-15)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_resolution_tiers (
    tier_level SMALLINT PRIMARY KEY CHECK (tier_level BETWEEN 0 AND 15),
    tier_name VARCHAR(64) NOT NULL,
    average_cell_area_km2 NUMERIC(20, 8) NOT NULL,
    max_entropy_limit NUMERIC(20, 10) NOT NULL
);

-- Seed standard H3 resolution tiers (0 to 15)
INSERT INTO spatial_resolution_tiers (tier_level, tier_name, average_cell_area_km2, max_entropy_limit) VALUES
(0, 'Planetary Macro-Cell', 4250546.847, 1000000.0),
(1, 'Continental Sector', 607220.978, 142857.0),
(2, 'Sub-Continental Zone', 86745.854, 20408.1),
(3, 'Regional Biome', 12392.265, 2915.4),
(4, 'Ecoregion', 1767.466, 416.5),
(5, 'Sub-Ecoregion', 252.495, 59.5),
(6, 'Macro-Watershed', 36.071, 8.5),
(7, 'Mesoscale Catchment', 5.153, 1.2),
(8, 'Micro-Watershed', 0.736, 0.17),
(9, 'Landscape Unit', 0.105, 0.024),
(10, 'Habitat Patch', 0.015, 0.0034),
(11, 'Ecosystem Sub-Unit', 0.0021, 0.00049),
(12, 'Local Community', 0.00030, 0.00007),
(13, 'Micro-Habitat', 0.000043, 0.00001),
(14, 'Sub-Meter Plot', 0.0000061, 0.0000014),
(15, 'Precise Organism Node', 0.00000087, 0.0000002)
ON CONFLICT (tier_level) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Spatial Monad Stock Transitions & Trophic Energy Distribution
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_monad_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    h3_index VARCHAR(15) NOT NULL,
    resolution_tier SMALLINT NOT NULL REFERENCES spatial_resolution_tiers(tier_level),
    biomass_stock_grams NUMERIC(18, 6) NOT NULL,
    energy_stock_joules NUMERIC(18, 6) NOT NULL,
    entropy_state NUMERIC(18, 10) NOT NULL,
    validation_status VARCHAR(32) DEFAULT 'PENDING' CHECK (validation_status IN ('PENDING', 'VALIDATED', 'REJECTED')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spatial_monads_resolution ON spatial_monad_stocks(resolution_tier);
CREATE INDEX idx_spatial_monads_h3 ON spatial_monad_stocks(h3_index);