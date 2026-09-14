-- Updated Schema & Ledger Definitions for Sprint 035
-- Focus: Spatial Integrity, Thermodynamic Monad Stocks, and Guard Clause Exceptions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for spatial guard clause violation severity & states
CREATE TYPE spatial_guard_status AS ENUM ('VALID', 'NULL_VIOLATION', 'UNDEFINED_VIOLATION', 'MALFORMED_INDEX');

-- Spatial Monad Stock Table (Thermodynamic allocation bins tied to H3 indexes)
CREATE TABLE spatial_monad_stocks (
    monad_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    h3_index VARCHAR(64) NOT NULL,
    resolution INT NOT NULL CHECK (resolution >= 0 AND resolution <= 15),
    energy_joules NUMERIC(20, 6) NOT NULL CHECK (energy_joules >= 0.000000),
    entropy_s NUMERIC(20, 6) NOT NULL CHECK (entropy_s >= 0.000000),
    guard_status spatial_guard_status NOT NULL DEFAULT 'VALID',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Thermodynamic Stock Transactions & Block Signatures Ledger
CREATE TABLE thermodynamic_ledger_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    monad_id UUID REFERENCES spatial_monad_stocks(monad_id) ON DELETE CASCADE,
    solar_input_watts NUMERIC(16, 4) NOT NULL,
    entropy_delta NUMERIC(16, 4) NOT NULL,
    exception_flag VARCHAR(128),
    transaction_signature VARCHAR(128) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for fast H3 and spatial lookups
CREATE INDEX idx_spatial_monads_h3 ON spatial_monad_stocks(h3_index);
CREATE INDEX idx_thermodynamic_ledger_hash ON thermodynamic_ledger_blocks(current_hash);