-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger (Sprint 009)
-- Compliance: First & Second Laws of Thermodynamics
-- ============================================================================

CREATE TABLE IF NOT EXISTS spatial_monads (
    monad_id VARCHAR(64) PRIMARY KEY,
    region_name VARCHAR(128) NOT NULL,
    thermal_stock_joules NUMERIC(24, 6) NOT NULL DEFAULT 0.000000,
    albedo NUMERIC(4, 3) NOT NULL DEFAULT 0.300,
    emissivity NUMERIC(4, 3) NOT NULL DEFAULT 0.950,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS thermodynamic_constants (
    constant_key VARCHAR(64) PRIMARY KEY,
    constant_value NUMERIC(16, 8) NOT NULL,
    unit_description VARCHAR(64) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO thermodynamic_constants (constant_key, constant_value, unit_description) VALUES
('STEFAN_BOLTZMANN', 0.00000005670374419, 'W / (m^2 * K^4)'),
('SOLAR_CONSTANT_TOA', 1361.00000000, 'W / m^2'),
('ZERO_CELSIUS_IN_KELVIN', 273.15000000, 'K'),
('DEFAULT_ALBEDO', 0.30000000, 'Dimensionless'),
('GAS_CONSTANT_R', 8.31446261, 'J / (mol * K)')
ON CONFLICT (constant_key) DO UPDATE SET 
    constant_value = EXCLUDED.constant_value,
    updated_at = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS thermodynamic_stock_transactions (
    transaction_id VARCHAR(64) PRIMARY KEY,
    monad_id VARCHAR(64) NOT NULL REFERENCES spatial_monads(monad_id),
    delta_solar_joules NUMERIC(18, 6) NOT NULL,
    delta_radiation_joules NUMERIC(18, 6) NOT NULL,
    delta_conduction_joules NUMERIC(18, 6) NOT NULL,
    resulting_temperature_k NUMERIC(10, 4) NOT NULL,
    arrhenius_factor NUMERIC(12, 6) NOT NULL,
    block_hash VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_tx_monad_id ON thermodynamic_stock_transactions(monad_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_timestamp ON thermodynamic_stock_transactions(timestamp);