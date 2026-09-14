-- Updated Schema & Ledger Definitions: Sprint 008 (H3 Index Validation & Spatial Monads)

-- Drop existing tables if re-initializing Sprint 008 architecture
DROP TABLE IF EXISTS blockchain_transactions CASCADE;
DROP TABLE IF EXISTS spatial_monad_states CASCADE;
DROP TABLE IF EXISTS thermodynamic_ledgers CASCADE;

-- 1. Thermodynamic Ledgers (First and Second Laws of Thermodynamics tracking)
CREATE TABLE thermodynamic_ledgers (
    ledger_id VARCHAR(64) PRIMARY KEY,
    gaia_earth_pod_id VARCHAR(64) NOT NULL,
    total_solar_input_joules NUMERIC(24, 6) NOT NULL DEFAULT 0.000000,
    total_entropy_joules NUMERIC(24, 6) NOT NULL DEFAULT 0.000000,
    matter_mass_grams NUMERIC(24, 6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT non_negative_entropy CHECK (total_entropy_joules >= 0),
    CONSTRAINT conservation_of_matter CHECK (matter_mass_grams >= 0)
);

-- 2. Spatial Monad States with strict H3 Index verification gates
CREATE TABLE spatial_monad_states (
    monad_id VARCHAR(64) PRIMARY KEY,
    ledger_id VARCHAR(64) REFERENCES thermodynamic_ledgers(ledger_id),
    raw_input_string VARCHAR(255) NOT NULL,
    h3_index VARCHAR(15) CHECK (h3_index ~ '^[0-9a-fA-F]{15}$'),
    is_valid BOOLEAN NOT NULL DEFAULT FALSE,
    validation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    trophic_energy_joules NUMERIC(18, 6) NOT NULL DEFAULT 0.000000,
    entropy_leakage_risk NUMERIC(12, 6) NOT NULL DEFAULT 0.000000
);

-- 3. Blockchain Block Transaction Signatures for Spatial-Thermodynamic State Transitions
CREATE TABLE blockchain_transactions (
    transaction_id VARCHAR(64) PRIMARY KEY,
    block_height BIGINT NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    monad_id VARCHAR(64) REFERENCES spatial_monad_states(monad_id),
    transaction_signature VARCHAR(128) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for spatial lookup and validation performance
CREATE INDEX idx_spatial_monad_h3 ON spatial_monad_states(h3_index);
CREATE INDEX idx_blockchain_block_height ON blockchain_transactions(block_height);