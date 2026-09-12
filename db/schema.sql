-- ============================================================================
-- Web of Life: Thermodynamic Blockchain & SQL Schema
-- Sprint 030 Update: Thermodynamic State Vector Validation & Monad Ledgers
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Thermodynamic State Vectors Table
CREATE TABLE IF NOT EXISTS thermodynamic_state_vectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL,
    energy DOUBLE PRECISION NOT NULL CHECK (energy >= 0),
    entropy DOUBLE PRECISION NOT NULL CHECK (entropy >= 0),
    temperature DOUBLE PRECISION NOT NULL CHECK (temperature >= 0),
    elemental_stocks JSONB NOT NULL DEFAULT '{}',
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    validation_errors TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Thermodynamic Validation Audit Log
CREATE TABLE IF NOT EXISTS validation_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_vector_id UUID REFERENCES thermodynamic_state_vectors(id) ON DELETE CASCADE,
    is_valid BOOLEAN NOT NULL,
    errors TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    warnings TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT²,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Monad Process Execution Ledger
CREATE TABLE IF NOT EXISTS monad_process_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_name VARCHAR(255) NOT NULL,
    input_state_id UUID REFERENCES thermodynamic_state_vectors(id),
    output_state_id UUID REFERENCES thermodynamic_state_vectors(id),
    entropy_generated DOUBLE PRECISION NOT NULL CHECK (entropy_generated >= 0),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    signature VARCHAR(512) NOT NULL
);

-- 4. Indexes for Time-Series and State Verification Performance
CREATE INDEX IF NOT EXISTS idx_thermodynamic_state_vectors_entity ON thermodynamic_state_vectors(entity_id);
CREATE INDEX IF NOT EXISTS idx_validation_audit_logs_state ON validation_audit_logs(state_vector_id);
CREATE INDEX IF NOT EXISTS idx_monad_process_ledger_executed ON monad_process_ledger(executed_at);