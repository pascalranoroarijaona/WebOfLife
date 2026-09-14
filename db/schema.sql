-- Updated Schema & Ledger Definitions for Sprint 031: H3 Hexadecimal Validation & Spatial Monad Stocks

-- Drop existing tables if re-initializing sprint
DROP TABLE IF EXISTS spatial_quarantine_ledger CASCADE;
DROP TABLE IF EXISTS h3_spatial_monad_stocks CASCADE;
DROP TABLE IF EXISTS thermodynamic_entropy_logs CASCADE;

-- 1. H3 Spatial Monad Stocks & State Tracking
CREATE TABLE h3_spatial_monad_stocks (
    monad_id VARCHAR(64) PRIMARY KEY,
    raw_identifier VARCHAR(128) NOT NULL,
    is_valid_hex BOOLEAN NOT NULL DEFAULT FALSE,
    entropy_state NUMERIC(18, 6) NOT NULL DEFAULT 0.000000,
    trophic_tier INTEGER NOT NULL CHECK (trophic_tier >= 0 AND trophic_tier <= 5),
    solar_energy_consumed NUMERIC(18, 6) NOT NULL CHECK (solar_energy_consumed >= 0.0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Spatial Quarantine Ledger (Second Law Entropy Sinks)
CREATE TABLE spatial_quarantine_ledger (
    quarantine_id SERIAL PRIMARY KEY,
    monad_id VARCHAR(64) REFERENCES h3_spatial_monad_stocks(monad_id) ON DELETE CASCADE,
    invalid_token VARCHAR(128) NOT NULL,
    rejection_reason VARCHAR(255) NOT NULL,
    quarantine_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    entropy_delta NUMERIC(18, 6) NOT NULL
);

-- 3. Thermodynamic Blockchain Block Transaction Signatures
CREATE TABLE thermodynamic_entropy_logs (
    block_id SERIAL PRIMARY KEY,
    transaction_hash VARCHAR(64) UNIQUE NOT NULL,
    monad_id VARCHAR(64) REFERENCES h3_spatial_monad_stocks(monad_id),
    first_law_conservation_check BOOLEAN NOT NULL DEFAULT TRUE,
    second_law_entropy_delta NUMERIC(18, 6) NOT NULL,
    proof_of_solar_work NUMERIC(18, 6) NOT NULL,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high-frequency spatial grid queries
CREATE INDEX idx_h3_valid_hex ON h3_spatial_monad_stocks(is_valid_hex);
CREATE INDEX idx_quarantine_timestamp ON spatial_quarantine_ledger(quarantine_timestamp);
CREATE INDEX idx_thermodynamic_hash ON thermodynamic_entropy_logs(transaction_hash);