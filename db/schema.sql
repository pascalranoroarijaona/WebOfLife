-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger (Sprint 008)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- 1. Thermodynamic State Vectors Table (Hypertable for Time-Series Analysis)
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    id UUID DEFAULT uuid_generate_v4(),
    pod_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    t_zero NUMERIC(10, 4) NOT NULL DEFAULT 288.15,
    internal_energy NUMERIC(20, 6) NOT NULL,
    entropy NUMERIC(20, 6) NOT NULL,
    entropy_generation_rate NUMERIC(20, 6) CHECK (entropy_generation_rate >= 0),
    exergy_destruction_rate NUMERIC(20, 6) NOT NULL,
    solar_in NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    infrared_out NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    sensible_latent_flux NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
    mass_inventory JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (pod_id, timestamp)
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('thermodynamic_state_vectors', 'timestamp', if_not_exists => TRUE);

-- 2. Thermodynamic Monad State Transactions Ledger
CREATE TABLE IF NOT EXISTS thermodynamic_monad_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_id UUID NOT NULL,
    parent_transaction_id UUID REFERENCES thermodynamic_monad_transactions(transaction_id),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payload_type VARCHAR(255) NOT NULL,
    input_vector_hash VARCHAR(64) NOT NULL,
    output_vector_hash VARCHAR(64) NOT NULL,
    entropy_generation_delta NUMERIC(20, 6) CHECK (entropy_generation_delta >= 0),
    first_law_verified BOOLEAN NOT NULL DEFAULT TRUE,
    second_law_verified BOOLEAN NOT NULL DEFAULT TRUE,
    blockchain_signature VARCHAR(128) NOT NULL,
    raw_payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_monad_pod_timestamp ON thermodynamic_monad_transactions(pod_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monad_signature ON thermodynamic_monad_transactions(blockchain_signature);

-- 3. Biogeochemical Mass Inventory Balances (Tracking Conservation Laws)
CREATE TABLE IF NOT EXISTS biogeochemical_mass_ledgers (
    ledger_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    element_symbol VARCHAR(16) NOT NULL, -- e.g., 'C', 'N', 'P', 'H2O'
    total_mass_kg NUMERIC(20, 9) NOT NULL,
    flux_in_kg NUMERIC(20, 9) NOT NULL DEFAULT 0.0,
    flux_out_kg NUMERIC(20, 9) NOT NULL DEFAULT 0.0,
    delta_mass_kg NUMERIC(20, 9) NOT NULL,
    CONSTRAINT mass_conservation_check CHECK (ABS(delta_mass_kg - (flux_in_kg - flux_out_kg)) < 1e-9)
);

SELECT create_hypertable('biogeochemical_mass_ledgers', 'timestamp', if_not_exists => TRUE);