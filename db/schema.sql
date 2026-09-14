-- Updated Schema & Ledger Definitions for Sprint 022
-- Target: Spatial Resolution Tier (0-15) Boundary Enforcements & Thermodynamic Ledger

CREATE TABLE IF NOT EXISTS spatial_resolutions (
    resolution_tier INT PRIMARY KEY CHECK (resolution_tier >= 0 AND resolution_tier <= 15),
    description VARCHAR(255) NOT NULL,
    average_hexagon_area_km2 DECIMAL(18, 9) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed standard H3 resolutions 0 through 15
INSERT INTO spatial_resolutions (resolution_tier, description, average_hexagon_area_km2) VALUES
(0, 'Base Ecosahedron Face Partition', 4250546.847596000),
(1, 'Resolution Tier 1', 607221.006799400),
(2, 'Resolution Tier 2', 86745.858114200),
(3, 'Resolution Tier 3', 12392.265444900),
(4, 'Resolution Tier 4', 1770.323635000),
(5, 'Resolution Tier 5', 252.903376400),
(6, 'Resolution Tier 6', 36.129053800),
(7, 'Resolution Tier 7', 5.161293400),
(8, 'Resolution Tier 8', 0.737327600),
(9, 'Resolution Tier 9', 0.105332500),
(10, 'Resolution Tier 10', 0.015047500),
(11, 'Resolution Tier 11', 0.002149600),
(12, 'Resolution Tier 12', 0.000307100),
(13, 'Resolution Tier 13', 0.000043900),
(14, 'Resolution Tier 14', 0.000006300),
(15, 'Resolution Tier 15', 0.000000900)
ON CONFLICT (resolution_tier) DO NOTHING;

CREATE TABLE IF NOT EXISTS thermodynamic_stock_transactions (
    transaction_id UUID PRIMARY KEY,
    block_height BIGINT NOT NULL,
    h3_index VARCHAR(15) NOT NULL,
    resolution_tier INT NOT NULL REFERENCES spatial_resolutions(resolution_tier),
    energy_delta DECIMAL(18, 9) NOT NULL,
    entropy_delta DECIMAL(18, 9) NOT NULL,
    signature VARCHAR(128) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thermo_tx_resolution ON thermodynamic_stock_transactions(resolution_tier);
CREATE INDEX IF NOT EXISTS idx_thermo_tx_h3 ON thermodynamic_stock_transactions(h3_index);