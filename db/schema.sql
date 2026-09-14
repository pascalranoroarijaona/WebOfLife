-- ============================================================================
-- Web of Life: Sprint 010 Database & Thermodynamic Ledger Schema
-- Spatial H3 Index Validation & Thermodynamic Monad Stock State Machine
-- ============================================================================

BEGIN;

-- Spatial H3 Index Validation Audit Log
CREATE TABLE IF NOT EXISTS spatial_h3_validation_audit (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    h3_index_input VARCHAR(32) NOT NULL,
    is_valid BOOLEAN NOT NULL,
    resolution INT CHECK (resolution BETWEEN 0 AND 15),
    entropy_delta NUMERIC(18, 8) NOT NULL DEFAULT 0.00000000,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thermodynamic Monad Stock Table (Tracking Earth Pod / Spatial Monad States)
CREATE TABLE IF NOT EXISTS thermodynamic_monad_stocks (
    stock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monad_type VARCHAR(64) NOT NULL DEFAULT 'SpatialMonad',
    current_state VARCHAR(32) NOT NULL CHECK (current_state IN ('State_unverified', 'State_active_cell', 'State_entropy_sink')),
    h3_index VARCHAR(15) REFERENCES spatial_h3_validation_audit(h3_index_input),
    matter_allocation NUMERIC(24, 12) NOT NULL CHECK (matter_allocation >= 0),
    solar_energy_input NUMERIC(24, 12) NOT NULL CHECK (solar_energy_input >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thermodynamic Stock Transactions / Ledger
CREATE TABLE IF NOT EXISTS thermodynamic_stock_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_stock_id UUID REFERENCES thermodynamic_monad_stocks(stock_id),
    target_stock_id UUID REFERENCES thermodynamic_monad_stocks(stock_id),
    transition_type VARCHAR(64) NOT NULL, -- e.g., 'State_unverified -> State_active_cell'
    energy_transferred NUMERIC(24, 12) NOT NULL,
    block_signature VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for optimal time-series query performance
CREATE INDEX IF NOT EXISTS idx_spatial_h3_audit_valid ON spatial_h3_validation_audit(is_valid);
CREATE INDEX IF NOT EXISTS idx_monad_stocks_state ON thermodynamic_monad_stocks(current_state);
CREATE INDEX IF NOT EXISTS idx_stock_transactions_sig ON thermodynamic_stock_transactions(block_signature);

COMMIT;