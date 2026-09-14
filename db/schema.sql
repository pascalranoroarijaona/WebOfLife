-- Updated Schema & Ledger Definitions for Sprint 027
-- Web of Life Architecture Specification: Spatial Resolution Tier (0-15) Boundary Enforcement

-- Ensure TimescaleDB extension is active
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Spatial Resolution Tiers & H3 Grid Validation Metadata
CREATE TABLE IF NOT EXISTS h3_resolution_tiers (
    tier_id SMALLINT PRIMARY KEY CHECK (tier_id >= 0 AND tier_id <= 15),
    mean_edge_length_km NUMERIC(10, 6) NOT NULL,
    mean_area_km2 NUMERIC(14, 6) NOT NULL,
    entropy_dissipation_factor NUMERIC(18, 12) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed standard H3 resolution tiers (0 to 15)
INSERT INTO h3_resolution_tiers (tier_id, mean_edge_length_km, mean_area_km2, entropy_dissipation_factor) VALUES
(0, 1107.712591, 4250546.8477, 1.000000000000),
(1, 418.676005, 60744.3760, 1.058200000000),
(2, 158.244655, 8680.1983, 1.122300000000),
(3, 59.810961, 1239.9918, 1.190200000000),
(4, 22.606379, 177.1350, 1.262100000000),
(5, 8.544407, 25.2908, 1.338400000000),
(6, 3.229483, 3.6120, 1.419300000000),
(7, 1.220305, 0.5159, 1.505100000000),
(8, 0.461356, 0.0737, 1.596100000000),
(9, 0.174376, 0.0105, 1.692600000000),
(10, 0.065908, 0.0015, 1.794900000000),
(11, 0.024910, 0.000211, 1.903400000000),
(12, 0.009415, 0.000030, 2.018500000000),
(13, 0.003558, 0.0000043, 2.140600000000),
(14, 0.001345, 0.0000006, 2.270100000000),
(15, 0.000508, 0.00000009, 2.407400000000)
ON CONFLICT (tier_id) DO NOTHING;

-- Spatial Monads Table: Encapsulates localized trophic energy and matter stocks
CREATE TABLE IF NOT EXISTS spatial_monads (
    monad_id UUID PRIMARY KEY,
    h3_index VARCHAR(15) NOT NULL,
    resolution SMALLINT NOT NULL REFERENCES h3_resolution_tiers(tier_id),
    carbon_stock NUMERIC(20, 8) NOT NULL CHECK (carbon_stock >= 0),
    nitrogen_stock NUMERIC(20, 8) NOT NULL CHECK (nitrogen_stock >= 0),
    water_stock NUMERIC(20, 8) NOT NULL CHECK (water_stock >= 0),
    trophic_energy NUMERIC(24, 8) NOT NULL CHECK (trophic_energy >= 0),
    solar_input_flux NUMERIC(18, 8) NOT NULL DEFAULT 0.0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thermodynamic Stock Transactions & State Transitions (Hypertable)
CREATE TABLE IF NOT EXISTS thermodynamic_stock_transactions (
    transaction_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    source_monad_id UUID REFERENCES spatial_monads(monad_id),
    target_monad_id UUID REFERENCES spatial_monads(monad_id),
    source_resolution SMALLINT REFERENCES h3_resolution_tiers(tier_id),
    target_resolution SMALLINT REFERENCES h3_resolution_tiers(tier_id),
    matter_delta_carbon NUMERIC(20, 8) NOT NULL,
    matter_delta_nitrogen NUMERIC(20, 8) NOT NULL,
    matter_delta_water NUMERIC(20, 8) NOT NULL,
    energy_delta NUMERIC(24, 8) NOT NULL,
    entropy_generated NUMERIC(18, 8) NOT NULL,
    blockchain_tx_signature VARCHAR(128) NOT NULL,
    CONSTRAINT chk_resolutions_valid CHECK (
        source_resolution BETWEEN 0 AND 15 AND 
        target_resolution BETWEEN 0 AND 15
    )
);

-- Convert to TimescaleDB hypertable for optimal time-series partitioning
SELECT create_hypertable('thermodynamic_stock_transactions', 'timestamp', if_not_exists => TRUE);

-- Blockchain Block Transaction Signatures Ledger
CREATE TABLE IF NOT EXISTS blockchain_block_ledger (
    block_height BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    block_hash VARCHAR(64) UNIQUE NOT NULL,
    previous_block_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    solar_epoch_timestamp TIMESTAMPTZ NOT NULL,
    transaction_count INT NOT NULL,
    validated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for spatial-temporal efficiency
CREATE INDEX IF NOT EXISTS idx_spatial_monads_h3 ON spatial_monads (h3_index, resolution);
CREATE INDEX IF NOT EXISTS idx_thermodynamic_tx_time ON thermodynamic_stock_transactions (timestamp DESC);