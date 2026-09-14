-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger (Sprint 025 Update)
-- Incorporating H3 Resolution Tiers (0-15), Spatial Monad States, 
-- and Thermodynamic Conservation Constraints (Law 1 & Law 2).
-- ============================================================================

BEGIN;

-- 1. Spatial Resolution Lookup Table (Enforcing H3 Tiers 0-15)
CREATE TABLE IF NOT EXISTS h3_resolution_tiers (
    resolution_tier SMALLINT PRIMARY KEY CHECK (resolution_tier BETWEEN 0 AND 15),
    average_area_km2 DOUBLE PRECISION NOT NULL,
    average_edge_length_km DOUBLE PRECISION NOT NULL,
    trophic_energy_scaling_factor DOUBLE PRECISION NOT NULL DEFAULT 7.0
);

-- Seed H3 Resolution Tiers with theoretical geometric metrics
INSERT INTO h3_resolution_tiers (resolution_tier, average_area_km2, average_edge_length_km, trophic_energy_scaling_factor) VALUES
(0, 4250546.847, 1107.712, 1.0),
(1, 607220.978, 418.676, 7.0),
(2, 86745.854, 158.226, 49.0),
(3, 12392.265, 59.811, 343.0),
(4, 1770.324, 22.611, 2401.0),
(5, 252.903, 8.544, 16807.0),
(6, 36.129, 3.227, 117649.0),
(7, 5.161, 1.219, 823543.0),
(8, 0.737, 0.461, 5764801.0),
(9, 0.105, 0.174, 40353607.0),
(10, 0.015, 0.066, 282475249.0),
(11, 0.0021, 0.025, 1977326743.0),
(12, 0.00031, 0.0094, 13841287201.0),
(13, 0.000044, 0.0035, 96889000407.0),
(14, 0.0000063, 0.0013, 678223002849.0),
(15, 0.0000009, 0.0005, 4747561019943.0)
ON CONFLICT (resolution_tier) DO NOTHING;

-- 2. Spatial Monad State Table
CREATE TABLE IF NOT EXISTS spatial_monad_states (
    monad_id UUID PRIMARY KEY,
    h3_index VARCHAR(15) NOT NULL,
    resolution SMALLINT NOT NULL REFERENCES h3_resolution_tiers(resolution_tier),
    biomass_stock_kg DOUBLE PRECISION NOT NULL CHECK (biomass_stock_kg >= 0.0),
    enthalpy_joules DOUBLE PRECISION NOT NULL,
    entropy_joules_per_k DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Thermodynamic Stock Transactions (Law 1 & Law 2 Ledger)
CREATE TABLE IF NOT EXISTS thermodynamic_transactions (
    transaction_id UUID PRIMARY KEY,
    block_height BIGINT NOT NULL,
    source_monad_id UUID REFERENCES spatial_monad_states(monad_id),
    target_monad_id UUID REFERENCES spatial_monad_states(monad_id),
    energy_delta_joules DOUBLE PRECISION NOT NULL,
    solar_flux_import_joules DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    entropy_change DOUBLE PRECISION NOT NULL CHECK (entropy_change >= 0.0),
    signature VARCHAR(128) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Blockchain Ledger Block Signatures
CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_height BIGINT PRIMARY KEY,
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    validator_node_id UUID NOT NULL,
    thermodynamic_checksum DOUBLE PRECISION NOT NULL,
    minted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance and spatial integrity
CREATE INDEX IF NOT EXISTS idx_spatial_monad_resolution ON spatial_monad_states(resolution);
CREATE INDEX IF NOT EXISTS idx_spatial_monad_h3 ON spatial_monad_states(h3_index);
CREATE INDEX IF NOT EXISTS idx_thermo_tx_block ON thermodynamic_transactions(block_height);

COMMIT;