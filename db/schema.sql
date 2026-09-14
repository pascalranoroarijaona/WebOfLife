-- Updated Schema & Ledger Definitions for Sprint 033
-- Enforcing strict thermodynamic spatial token validation and ledger integrity

CREATE TABLE IF NOT EXISTS spatial_tokens (
    token_id VARCHAR(64) PRIMARY KEY,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    entropy_score NUMERIC(18, 8) NOT NULL DEFAULT 0.00000000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS thermodynamic_stock_transactions (
    transaction_id UUID PRIMARY KEY,
    source_token_id VARCHAR(64) REFERENCES spatial_tokens(token_id),
    target_token_id VARCHAR(64) REFERENCES spatial_tokens(token_id),
    energy_delta NUMERIC(18, 8) NOT NULL,
    validation_status VARCHAR(32) NOT NULL,
    error_message TEXT,
    blockchain_hash VARCHAR(64) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spatial_tokens_validity ON spatial_tokens(is_valid);
CREATE INDEX IF NOT EXISTS idx_thermo_tx_hash ON thermodynamic_stock_transactions(blockchain_hash);