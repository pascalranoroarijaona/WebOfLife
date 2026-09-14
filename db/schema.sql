-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger (Sprint 024)
-- ============================================================================

-- Enable TimescaleDB extension for time-series spatial stock tracking
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ----------------------------------------------------------------------------
-- 1. Spatial Resolution & H3 Grid Tiers
-- ----------------------------------------------------------------------------
CREATE TABLE spatial_resolution_tiers (
    resolution_tier INT PRIMARY KEY CHECK (resolution_tier BETWEEN 0 AND 15),
    description VARCHAR(255) NOT NULL,
    average_edge_length_km NUMERIC(10, 4) NOT NULL,
    average_area_km2 NUMERIC(12, 4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed H3 resolution bounds (0-15)
INSERT INTO spatial_resolution_tiers (resolution_tier, description, average_edge_length_km, average_area_km2) VALUES
(0, 'Global root cells', 1107.7125910, 4250546.8480),
(1, 'Sub-continental', 418.6760055, 607998.2926),
(2, 'Large regional', 158.2449572, 86802.7749),
(3, 'Regional / Country-scale', 59.8109690, 12399.5441),
(4, 'Sub-regional', 22.6074149, 1771.3635),
(5, 'Metropolitan / Large Basin', 8.5444083, 253.0762),
(6, 'County / Watershed', 3.2294828, 36.1557),
(7, 'Municipal / Forest tract', 1.2206305, 5.1612),
(8, 'Neighborhood / Ecological site', 0.4613547, 0.7374),
(9, 'Sub-neighborhood', 0.1743757, 0.1053),
(10, 'Hectare-scale', 0.0659078, 0.0150),
(11, 'Plot-scale', 0.0249105, 0.0021),
(12, 'Sub-plot scale', 0.0094154, 0.00030),
(13, 'Micro-site', 0.0035590, 0.000044),
(14, 'Sub-micro site', 0.0013459, 0.0000063),
(15, 'Fine organism level', 0.0005086, 0.0000009);

-- ----------------------------------------------------------------------------
-- 2. Spatial Monads & Ecological Stocks (Matter & Energy Conservation)
-- ----------------------------------------------------------------------------
CREATE TABLE spatial_monads (
    monad_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    h3_index VARCHAR(15) NOT NULL,
    resolution_tier INT NOT NULL REFERENCES spatial_resolution_tiers(resolution_tier),
    energy_stock_joules NUMERIC(20, 4) NOT NULL CHECK (energy_stock_joules >= 0),
    biomass_stock_kg NUMERIC(20, 4) NOT NULL CHECK (biomass_stock_kg >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hypertable for spatial monad time-series tracking
SELECT create_hypertable('spatial_monads', 'created_at', if_not_exists => TRUE);

-- ----------------------------------------------------------------------------
-- 3. Thermodynamic State Transitions & Refinement Flows
-- ----------------------------------------------------------------------------
CREATE TABLE spatial_transitions (
    transition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_monad_id UUID REFERENCES spatial_monads(monad_id),
    target_monad_id UUID REFERENCES spatial_monads(monad_id),
    transition_type VARCHAR(50) NOT NULL CHECK (transition_type IN ('REFINE', 'COMPACT', 'SOLAR_FLUX_IN', 'THERMAL_DISSIPATION')),
    energy_delta_joules NUMERIC(20, 4) NOT NULL,
    biomass_delta_kg NUMERIC(20, 4) NOT NULL,
    -- First Law constraint verification: Biomass delta across subdivision must sum to 0
    CONSTRAINT check_matter_conservation CHECK (biomass_delta_kg = 0),
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. Thermodynamic Blockchain Ledger Signatures
-- ----------------------------------------------------------------------------
CREATE TABLE thermodynamic_blocks (
    block_height BIGSERIAL PRIMARY KEY,
    block_hash VARCHAR(64) NOT NULL UNIQUE,
    parent_hash VARCHAR(64) NOT NULL,
    solar_flux_input_joules NUMERIC(24, 4) NOT NULL CHECK (solar_flux_input_joules >= 0),
    thermal_dissipation_joules NUMERIC(24, 4) NOT NULL CHECK (thermal_dissipation_joules >= 0),
    state_root VARCHAR(64) NOT NULL,
    miner_node_id VARCHAR(128) NOT NULL,
    minted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE block_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_height BIGINT REFERENCES thermodynamic_blocks(block_height),
    transition_id UUID REFERENCES spatial_transitions(transition_id),
    signature VARCHAR(128) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL
);

-- Indexing for performance
CREATE INDEX idx_spatial_monads_h3 ON spatial_monads(h3_index, resolution_tier);
CREATE INDEX idx_spatial_transitions_type ON spatial_transitions(transition_type);
CREATE INDEX idx_blocks_minted ON thermodynamic_blocks(minted_at);