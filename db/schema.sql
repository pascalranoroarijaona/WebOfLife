-- ============================================================================
-- Web of Life Database Schema - Sprint 058
-- Thermodynamic State Vector Stock Conservation & Delta Ledger
-- ============================================================================

CREATE TABLE IF NOT EXISTS thermodynamic_states (
    state_id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    vector_data JSONB NOT NULL,
    total_energy_stock NUMERIC(24, 12) NOT NULL,
    entropy NUMERIC(24, 12) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS boundary_flux_logs (
    flux_id BIGSERIAL PRIMARY KEY,
    state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    stock_identifier VARCHAR(128) NOT NULL,
    inflow_rate NUMERIC(24, 12) NOT NULL DEFAULT 0,
    outflow_rate NUMERIC(24, 12) NOT NULL DEFAULT 0,
    delta_time NUMERIC(16, 8) NOT NULL,
    expected_delta NUMERIC(24, 12) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conservation_validations (
    validation_id BIGSERIAL PRIMARY KEY,
    previous_state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    next_state_id VARCHAR(64) REFERENCES thermodynamic_states(state_id),
    tolerance NUMERIC(16, 12) NOT NULL DEFAULT 1e-9,
    is_conserved BOOLEAN NOT NULL,
    total_inflow NUMERIC(24, 12) NOT NULL,
    total_outflow NUMERIC(24, 12) NOT NULL,
    net_rate NUMERIC(24, 12) NOT NULL,
    validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blockchain_transactions (
    tx_hash VARCHAR(64) PRIMARY KEY,
    block_number BIGINT NOT NULL,
    validation_id BIGINT REFERENCES conservation_validations(validation_id),
    signature VARCHAR(128) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    committed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thermodynamic_states_timestamp ON thermodynamic_states(timestamp);
CREATE INDEX IF NOT EXISTS idx_boundary_flux_stock ON boundary_flux_logs(stock_identifier);
CREATE INDEX IF NOT EXISTS idx_conservation_validations_status ON conservation_validations(is_conserved);