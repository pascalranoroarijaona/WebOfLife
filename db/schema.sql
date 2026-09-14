-- ============================================================================
-- Web of Life Database Schema: Sprint 023 Update
-- Spatial Resolution Tiers (0-15), Thermodynamic Monads & Ledger Transactions
-- ============================================================================

BEGIN;

-- Spatial Resolution Tier Lookup Table (H3 Tiers 0 to 15)
CREATE TABLE IF NOT EXISTS h3_resolution_tiers (
    tier_level SMALLINT PRIMARY KEY CHECK (tier_level BETWEEN 0 AND 15),
    avg_area_km2 NUMERIC(16, 6) NOT NULL,
    avg_edge_length_km NUMERIC(16, 6) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed H3 Resolution Tiers 0-15
INSERT INTO h3_resolution_tiers (tier_level, avg_area_km2, avg_edge_length_km, description) VALUES
(0, 4250546.8477, 1107.712591, 'Global base cells'),
(1, 607220.9782, 418.676005, 'Sub-continental'),
(2, 86745.8540, 158.204558, 'Large countries / regions'),
(3, 12392.2649, 59.810963, 'States / large provinces'),
(4, 1770.3236, 22.618608, 'Counties / metropolitan areas'),
(5, 252.9034, 8.544405, 'Large cities'),
(6, 36.1291, 3.227183, 'Towns / districts'),
(7, 5.1613, 1.219182, 'Neighborhoods'),
(8, 0.7373, 0.460683, 'Large parks / blocks'),
(9, 0.1053, 0.174176, 'City blocks'),
(10, 0.0150, 0.065837, 'Individual properties'),
(11, 0.0021, 0.024889, 'Large structures'),
(12, 0.0003, 0.009403, 'Trees / fine spatial units'),
(13, 0.000044, 0.003554, 'Micro-habitats'),
(14, 0.000006, 0.001344, 'Sub-meter biological sampling'),
(15, 0.000001, 0.000508, 'Nanoscale / cellular interface')
ON CONFLICT (tier_level) DO NOTHING;

-- Spatial Monad Stocks Table
CREATE TABLE IF NOT EXISTS spatial_monad_stocks (
    stock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL,
    h3_index VARCHAR(15) NOT NULL,
    resolution SMALLINT NOT NULL REFERENCES h3_resolution_tiers(tier_level),
    matter_kg NUMERIC(18, 6) NOT NULL CHECK (matter_kg >= 0),
    energy_joules NUMERIC(18, 6) NOT NULL CHECK (energy_joules >= 0),
    entropy_j_k NUMERIC(18, 6) NOT NULL CHECK (entropy_j_k >= 0),
    solar_flux_watts NUMERIC(18, 6) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Thermodynamic Stock Transactions & Blockchain Signatures Ledger
CREATE TABLE IF NOT EXISTS thermodynamic_stock_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_height BIGINT NOT NULL,
    parent_stock_id UUID REFERENCES spatial_monad_stocks(stock_id),
    target_stock_id UUID REFERENCES spatial_monad_stocks(stock_id),
    transition_type VARCHAR(64) NOT NULL, -- e.g., 'REFINEMENT', 'DEGRADATION', 'FLUX_ADJACENCY'
    source_resolution SMALLINT NOT NULL CHECK (source_resolution BETWEEN 0 AND 15),
    target_resolution SMALLINT NOT NULL CHECK (target_resolution BETWEEN 0 AND 15),
    delta_matter_kg NUMERIC(18, 6) NOT NULL,
    delta_energy_joules NUMERIC(18, 6) NOT NULL,
    delta_entropy_j_k NUMERIC(18, 6) NOT NULL,
    cryptographic_signature VARCHAR(128) NOT NULL,
    ledger_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for time-series and spatial lookup optimization
CREATE INDEX IF NOT EXISTS idx_spatial_monads_h3 ON spatial_monad_stocks(h3_index, resolution);
CREATE INDEX IF NOT EXISTS idx_thermo_transactions_block ON thermodynamic_stock_transactions(block_height);
CREATE INDEX IF NOT EXISTS idx_thermo_transactions_ledger ON thermodynamic_stock_transactions(ledger_timestamp);

COMMIT;