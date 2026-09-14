-- Sprint 032 Schema Update: H3 Spatial Monad Validation & Thermodynamic Accounting
-- Ensure strict adherence to time-series ledger standards for spatial energy states.

CREATE TABLE IF NOT EXISTS thermodynamic_constants (
    constant_key VARCHAR(64) PRIMARY KEY,
    numeric_value DECIMAL(20, 10) NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO thermodynamic_constants (constant_key, numeric_value, description)
VALUES ('SOLAR_INPUT_BASELINE', 1361.0000000000, 'Solar irradiance baseline for validation computational overhead')
ON CONFLICT (constant_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS spatial_monad_states (
    state_id VARCHAR(64) PRIMARY KEY,
    state_name VARCHAR(32) NOT NULL CHECK (state_name IN ('UnvalidatedState', 'ActiveSpatialStock', 'SinkState')),
    description TEXT
);

INSERT INTO spatial_monad_states (state_id, state_name, description) VALUES
('STATE_UNVAL', 'UnvalidatedState', 'Initial ingestion state prior to regex validation'),
('STATE_ACTIVE', 'ActiveSpatialStock', 'Valid H3 15-char hex spatial token, maintaining free energy'),
('STATE_SINK', 'SinkState', 'Invalid payload discarded to entropy sink')
ON CONFLICT (state_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS h3_spatial_tokens (
    token_id VARCHAR(64) PRIMARY KEY,
    h3_payload VARCHAR(15) NOT NULL CHECK (h3_payload ~ '^[0-9a-fA-F]{15}$'),
    resolution INT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    state_id VARCHAR(64) NOT NULL REFERENCES spatial_monad_states(state_id),
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    entropy_delta DECIMAL(16, 8) DEFAULT 0.00000000
);

CREATE TABLE IF NOT EXISTS thermodynamic_stock_transactions (
    transaction_id UUID PRIMARY KEY,
    token_id VARCHAR(64) REFERENCES h3_spatial_tokens(token_id),
    source_state VARCHAR(64) NOT NULL REFERENCES spatial_monad_states(state_id),
    target_state VARCHAR(64) NOT NULL REFERENCES spatial_monad_states(state_id),
    energy_joules DECIMAL(20, 10) NOT NULL,
    entropy_generated_joules_k DECIMAL(20, 10) NOT NULL,
    transaction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    block_signature VARCHAR(128) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_h3_spatial_tokens_payload ON h3_spatial_tokens(h3_payload);
CREATE INDEX IF NOT EXISTS idx_thermodynamic_tx_timestamp ON thermodynamic_stock_transactions(transaction_timestamp);