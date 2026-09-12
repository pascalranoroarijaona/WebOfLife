-- ============================================================================
-- Web of Life Database & Thermodynamic Blockchain Schema
-- Sprint 027 Extension: Thermodynamic State Vector Baseline Structurer
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Thermodynamic State Vectors Table
-- Captures immutable snapshots of thermodynamic states matching IThermodynamicStateVector
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_id UUID,
    temperature NUMERIC(10, 4) NOT NULL DEFAULT 288.15, -- Default T_0 = 288.15 K
    solar_radiation NUMERIC(12, 4) NOT NULL DEFAULT 0.0000, -- W/m^2
    thermal_emission NUMERIC(12, 4) NOT NULL DEFAULT 0.0000, -- W/m^2
    latent_heat NUMERIC(12, 4) NOT NULL DEFAULT 0.0000, -- W/m^2
    sensible_heat NUMERIC(12, 4) NOT NULL DEFAULT 0.0000, -- W/m^2
    entropy NUMERIC(15, 6) NOT NULL DEFAULT 0.000000, -- J/K
    timestamp BIGINT NOT NULL DEFAULT 0,
    first_law_valid BOOLEAN NOT NULL DEFAULT TRUE,
    second_law_valid BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Thermodynamic Monad Stocks Table
-- Models conserved matter/energy stocks associated with biogeochemical cycles
CREATE TABLE IF NOT EXISTS thermodynamic_monad_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_vector_id UUID REFERENCES thermodynamic_state_vectors(id) ON DELETE CASCADE,
    cycle_type VARCHAR(32) NOT NULL, -- e.g., 'CARBON', 'NITROGEN', 'PHOSPHORUS', 'WATER'
    stock_mass NUMERIC(18, 6) NOT NULL, -- kg or moles depending on cycle
    potential_energy NUMERIC(18, 6) NOT NULL, -- Joules
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Thermodynamic Stock Transactions (Ledger)
-- Records stock transformations enforcing First (Conservation) & Second (Entropy >= 0) Laws
CREATE TABLE IF NOT EXISTS thermodynamic_stock_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_stock_id UUID REFERENCES thermodynamic_monad_stocks(stock_id),
    target_stock_id UUID REFERENCES thermodynamic_monad_stocks(stock_id),
    delta_mass NUMERIC(18, 6) NOT NULL,
    delta_energy NUMERIC(18, 6) NOT NULL,
    entropy_generated NUMERIC(15, 6) NOT NULL CHECK (entropy_generated >= 0),
    transaction_hash VARCHAR(64) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Blockchain Blocks Table
-- Anchors thermodynamic state vectors and transaction ledgers into cryptographic blocks
CREATE INDEX IF NOT EXISTS idx_thermo_states_timestamp ON thermodynamic_state_vectors(timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_tx_hash ON thermodynamic_stock_transactions(transaction_hash);