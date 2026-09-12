-- ============================================================================
-- Web of Life Database & Thermodynamic Ledger Schema
-- Sprint 056: Thermodynamic State Vector Stock Conservation Delta Calculator
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Thermodynamic Elements Enum
CREATE TYPE thermodynamic_element AS ENUM (
    'carbon',
    'nitrogen',
    'phosphorus',
    'water',
    'energy'
);

-- 2. EarthPods Table (Container for Thermodynamic Structures & State Vectors)
CREATE TABLE earth_pods (
    pod_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Thermodynamic Stocks Table (Tracks mass/energy levels per element within an EarthPod)
CREATE TABLE thermodynamic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_id UUID NOT NULL REFERENCES earth_pods(pod_id) ON DELETE CASCADE,
    element thermodynamic_element NOT NULL,
    current_mass NUMERIC(20, 10) NOT NULL DEFAULT 0.0,
    capacity NUMERIC(20, 10),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_pod_element_stock UNIQUE (pod_id, element)
);

-- 4. Flow Rate Vectors Table (Defines inflows and outflows per element)
CREATE TABLE flow_rate_vectors (
    vector_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pod_id UUID NOT NULL REFERENCES earth_pods(pod_id) ON DELETE CASCADE,
    element thermodynamic_element NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Flow Entries Table (Granular source/sink rates making up IFlowRateVector)
CREATE TABLE flow_entries (
    entry_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vector_id UUID NOT NULL REFERENCES flow_rate_vectors(vector_id) ON DELETE CASCADE,
    flow_type VARCHAR(10) NOT NULL CHECK (flow_type IN ('inflow', 'outflow')),
    entity_id VARCHAR(255) NOT NULL, -- sourceId or sinkId
    rate NUMERIC(20, 10) NOT NULL CHECK (rate >= 0.0)
);

-- 6. State Validation Ledger (Time-series audit trail of delta calculations and conservation checks)
CREATE TABLE state_validation_ledger (
    ledger_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vector_id UUID NOT NULL REFERENCES flow_rate_vectors(vector_id) ON DELETE CASCADE,
    time_step NUMERIC(15, 6) NOT NULL,
    net_rate NUMERIC(20, 10) NOT NULL,
    expected_delta NUMERIC(20, 10) NOT NULL,
    actual_delta NUMERIC(20, 10) NOT NULL,
    discrepancy NUMERIC(20, 10) NOT NULL,
    is_conserved BOOLEAN NOT NULL,
    tolerance NUMERIC(12, 10) NOT NULL DEFAULT 1e-9,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    block_signature VARCHAR(64) NOT NULL -- Cryptographic hash anchoring the state transition
);

-- Indexes for performance and time-series querying
CREATE INDEX idx_state_validation_vector ON state_validation_ledger(vector_id);
CREATE INDEX idx_state_validation_timestamp ON state_validation_ledger(validated_at);
CREATE INDEX idx_flow_entries_vector ON flow_entries(vector_id);