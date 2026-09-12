-- ============================================================================
-- Web of Life Database & Thermodynamic Blockchain Schema
-- Sprint 075: Thermodynamic State Vector Elemental Tolerance Comparison Guard
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Thermodynamic Monad Pods & State Vectors
CREATE TABLE earth_pods (
    pod_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE thermodynamic_state_vectors (
    vector_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_id UUID REFERENCES earth_pods(pod_id) ON DELETE CASCADE,
    carbon_stock NUMERIC(18, 6) NOT NULL,
    nitrogen_stock NUMERIC(18, 6) NOT NULL,
    phosphorus_stock NUMERIC(18, 6) NOT NULL,
    water_stock NUMERIC(18, 6) NOT NULL,
    entropy_measure NUMERIC(18, 6) NOT NULL,
    solar_input_constraint NUMERIC(18, 6) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Elemental Tolerance Comparison Audits (Sprint 075)
CREATE TABLE tolerance_validation_audits (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id) ON DELETE CASCADE,
    element_name VARCHAR(64) NOT NULL, -- e.g., 'Carbon', 'Nitrogen', 'Phosphorus', 'Water'
    difference_value NUMERIC(18, 6) NOT NULL,
    tolerance_threshold NUMERIC(18, 6) NOT NULL,
    is_compliant BOOLEAN NOT NULL,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Thermodynamic Blockchain Ledger Transactions
CREATE TABLE block_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_index BIGINT NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL,
    pod_id UUID REFERENCES earth_pods(pod_id),
    vector_id UUID REFERENCES thermodynamic_state_vectors(vector_id),
    transaction_signature VARCHAR(128) NOT NULL,
    first_law_conserved BOOLEAN NOT NULL,
    second_law_compliant BOOLEAN NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance and time-series efficiency
CREATE INDEX idx_state_vectors_pod_id ON thermodynamic_state_vectors(pod_id, recorded_at DESC);
CREATE INDEX idx_tolerance_audits_vector ON tolerance_validation_audits(vector_id, is_compliant);
CREATE INDEX idx_block_transactions_index ON block_transactions(block_index DESC);