-- Web of Life Database Schema & Thermodynamic Blockchain Ledger
-- Sprint 029: Hexadecimal Character Set Verification Helper & Spatial Indexing Layer

BEGIN;

-- Thermodynamic Ledger Enums & Types
CREATE TYPE thermodynamic_state AS ENUM ('S_UNV', 'S_VAL', 'DISSIPATED', 'CONSERVED');
CREATE TYPE spatial_mesh_resolution AS ENUM ('RES_0', 'RES_1', 'RES_2', 'RES_3', 'RES_4', 'RES_5', 'RES_6', 'RES_7', 'RES_8', 'RES_9', 'RES_10', 'RES_11', 'RES_12', 'RES_13', 'RES_14', 'RES_15');

-- Core Blockchain Blocks Table with Solar Flux & Thermodynamic Verification
CREATE TABLE IF NOT EXISTS blocks (
    block_id BIGSERIAL PRIMARY KEY,
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    solar_flux_joules NUMERIC(18, 6) NOT NULL CHECK (solar_flux_joules >= 0.000000),
    dissipation_joules NUMERIC(18, 6) NOT NULL CHECK (dissipation_joules >= 0.000000),
    net_matter_delta NUMERIC(18, 6) NOT NULL DEFAULT 0.000000 CHECK (net_matter_delta = 0.000000),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    signature VARCHAR(128) NOT NULL
);

-- Spatial Monads Table: Tracks terrestrial H3 mesh states and verification
CREATE TABLE IF NOT EXISTS spatial_monads (
    monad_id UUID PRIMARY KEY,
    block_id BIGINT REFERENCES blocks(block_id) ON DELETE CASCADE,
    h3_index_str VARCHAR(15) CHECK (h3_index_str ~ '^[0-9a-fA-F]+$'),
    resolution spatial_mesh_resolution NOT NULL DEFAULT 'RES_9',
    state thermodynamic_state NOT NULL DEFAULT 'S_UNV',
    entropy_joules_k NUMERIC(18, 6) NOT NULL CHECK (entropy_joules_k >= 0.000000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thermodynamic Stock Transactions Ledger (Sprint 029 State Transitions)
CREATE TABLE IF NOT EXISTS thermodynamic_stock_transactions (
    transaction_id BIGSERIAL PRIMARY KEY,
    monad_id UUID REFERENCES spatial_monads(monad_id) ON DELETE CASCADE,
    block_id BIGINT REFERENCES blocks(block_id) ON DELETE CASCADE,
    source_state thermodynamic_state NOT NULL,
    target_state thermodynamic_state NOT NULL,
    energy_delta_joules NUMERIC(18, 6) NOT NULL,
    solar_input_flux NUMERIC(18, 6) NOT NULL CHECK (solar_input_flux >= 0.000000),
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for spatial querying and blockchain verification performance
CREATE INDEX IF NOT EXISTS idx_spatial_monads_h3 ON spatial_monads(h3_index_str);
CREATE INDEX IF NOT EXISTS idx_spatial_monads_state ON spatial_monads(state);
CREATE INDEX IF NOT EXISTS idx_thermodynamic_tx_monad ON thermodynamic_stock_transactions(monad_id);

COMMIT;