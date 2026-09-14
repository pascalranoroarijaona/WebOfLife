-- Web of Life: Sprint 030 Schema & Thermodynamic Ledger Definitions
-- Focus: Hexadecimal H3 Spatial Index Validation Monads & Thermodynamic Conservation

BEGIN;

-- 1. Spatial Monad States (H3 Grid Verification)
CREATE TYPE spatial_monad_state AS ENUM ('S0_UNVERIFIED', 'V_VERIFICATION_GATE', 'S1_VALIDATED');

-- 2. H3 Spatial Index Verification Ledger Table
CREATE TABLE IF NOT EXISTS h3_spatial_monads (
    monad_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_index_string VARCHAR(64) NOT NULL,
    current_state spatial_monad_state NOT NULL DEFAULT 'S0_UNVERIFIED',
    regex_pattern_matched VARCHAR(128) DEFAULT '^[a-fA-F0-9]{15}$',
    is_valid BOOLEAN NOT NULL DEFAULT FALSE,
    solar_energy_consumed NUMERIC(18, 8) NOT NULL DEFAULT 0.00000000,
    entropy_delta NUMERIC(18, 8) NOT NULL DEFAULT 0.00000000,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Thermodynamic Stock Transactions for Spatial Verification
CREATE TABLE IF NOT EXISTS thermodynamic_stock_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monad_id UUID REFERENCES h3_spatial_monads(monad_id) ON DELETE CASCADE,
    initial_state spatial_monad_state NOT NULL,
    final_state spatial_monad_state NOT NULL,
    matter_delta_kg NUMERIC(18, 8) NOT NULL DEFAULT 0.00000000, -- First Law: Must sum to zero across system
    energy_joules NUMERIC(18, 8) NOT NULL,                     -- Second Law: Dissipative compute cost
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Blockchain Block Signatures for Sprint 030 Verification Ledger
CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_height SERIAL PRIMARY KEY,
    block_hash VARCHAR(64) UNIQUE NOT NULL,
    previous_block_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    trophic_flow_signature VARCHAR(128) NOT NULL,
    spatial_validator_signature VARCHAR(128) NOT NULL,
    total_system_energy NUMERIC(24, 8) NOT NULL,
    total_system_entropy NUMERIC(24, 8) NOT NULL,
    mined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for high-frequency H3 spatial validation lookups
CREATE INDEX idx_h3_spatial_monads_state ON h3_spatial_monads(current_state);
CREATE INDEX idx_h3_spatial_monads_string ON h3_spatial_monads(raw_index_string);

COMMIT;