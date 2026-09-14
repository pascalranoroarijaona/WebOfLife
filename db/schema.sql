-- Updated Schema & Ledger Definitions: Sprint 007
-- Spatial Validation, H3 Index String Formats, and Thermodynamic Monad Stock Transactions

CREATE TABLE IF NOT EXISTS h3_validation_audit_log (
    transaction_id VARCHAR(64) PRIMARY KEY,
    h3_index_token VARCHAR(16) NOT NULL,
    is_valid BOOLEAN NOT NULL,
    error_code INTEGER DEFAULT 0,
    resolution SMALLINT CHECK (resolution >= 0 AND resolution <= 15),
    base_cell INTEGER,
    entropy_generated_joules NUMERIC(18, 6) NOT NULL DEFAULT 0.000000,
    solar_input_verified BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS spatial_monad_stock_ledger (
    stock_id VARCHAR(64) PRIMARY KEY,
    h3_index_token VARCHAR(16) NOT NULL,
    matter_mass_kg NUMERIC(18, 9) NOT NULL CHECK (matter_mass_kg >= 0),
    energy_joules NUMERIC(18, 6) NOT NULL CHECK (energy_joules >= 0),
    validation_status VARCHAR(32) NOT NULL,
    CONSTRAINT fk_h3_audit FOREIGN KEY (h3_index_token) 
        REFERENCES h3_validation_audit_log(h3_index_token)
        ON UPDATE CASCADE 
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_spatial_monad_h3 ON spatial_monad_stock_ledger(h3_index_token);
CREATE INDEX IF NOT EXISTS idx_h3_validation_status ON h3_validation_audit_log(is_valid, error_code);