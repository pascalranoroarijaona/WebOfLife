-- ============================================================================
-- Web of Life Database Schema & Thermodynamic Ledger (Sprint 25)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Thermodynamic State Snapshots Table
-- Tracks high-frequency thermodynamic vectors and boundary fluxes per simulation tick.
CREATE TABLE IF NOT EXISTS thermodynamic_snapshots (
    snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp BIGINT NOT NULL,
    temperature NUMERIC(12, 4) NOT NULL, -- Kelvin (K)
    pressure NUMERIC(14, 2) NOT NULL,    -- Pascal (Pa)
    volume NUMERIC(16, 6) NOT NULL,      -- Cubic meters (m^3)
    internal_energy NUMERIC(18, 4) NOT NULL, -- Joules (J)
    enthalpy NUMERIC(18, 4) NOT NULL,    -- Joules (J)
    entropy NUMERIC(18, 4) NOT NULL,     -- Joules per Kelvin (J/K)
    exergy NUMERIC(18, 4) NOT NULL,      -- Joules (J)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Boundary Flux Arrays Table
-- Records energy, matter, and entropy boundary interactions.
CREATE TABLE IF NOT EXISTS boundary_flux_records (
    flux_record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id UUID REFERENCES thermodynamic_snapshots(snapshot_id) ON DELETE CASCADE,
    flux_type VARCHAR(64) NOT NULL, -- 'INCOMING_SOLAR', 'OUTGOING_THERMAL', 'MATTER_FLUX'
    species_id VARCHAR(128),        -- Nullable for pure radiation
    molar_rate NUMERIC(16, 8) DEFAULT 0, -- mol/s
    mass_rate NUMERIC(16, 8) DEFAULT 0,  -- kg/s
    enthalpy_flux NUMERIC(16, 4) DEFAULT 0, -- W (J/s)
    entropy_flux NUMERIC(16, 4) DEFAULT 0,  -- W/K (J/(s*K))
    exergy_flux NUMERIC(16, 4) DEFAULT 0,   -- W (J/s)
    net_heat_flux NUMERIC(16, 4) DEFAULT 0, -- W
    net_work_flux NUMERIC(16, 4) DEFAULT 0  -- W
);

-- 3. Entropy Generation Metrics Table
-- Enforces Second Law compliance: total_entropy_generation_rate >= 0
CREATE TABLE IF NOT EXISTS entropy_generation_metrics (
    metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id UUID REFERENCES thermodynamic_snapshots(snapshot_id) ON DELETE CASCADE,
    thermal_dissipation NUMERIC(16, 6) NOT NULL, -- W/K
    chemical_reaction_entropy NUMERIC(16, 6) NOT NULL, -- W/K
    diffusive_transport_entropy NUMERIC(16, 6) NOT NULL, -- W/K
    total_entropy_generation_rate NUMERIC(16, 6) NOT NULL CHECK (total_entropy_generation_rate >= 0), -- \dot{S}_{gen} >= 0
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Exergy Destruction Metrics Table
-- Quantifies exergy destruction \dot{I} = T_0 \dot{S}_{gen}
CREATE TABLE IF NOT EXISTS exergy_destruction_metrics (
    exergy_metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id UUID REFERENCES thermodynamic_snapshots(snapshot_id) ON DELETE CASCADE,
    ambient_temperature_reference NUMERIC(8, 4) DEFAULT 298.15, -- T_0 (K)
    exergy_destruction_rate NUMERIC(18, 4) NOT NULL, -- \dot{I} (W)
    second_law_efficiency NUMERIC(5, 4) CHECK (second_law_efficiency >= 0 AND second_law_efficiency <= 1) -- dimensionless [0, 1]
);

-- 5. Thermodynamic Blockchain Ledger Transactions
-- Immutable record of state monad transactions and validation proofs.
CREATE TABLE IF NOT EXISTS thermodynamic_ledger_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_index BIGINT UNIQUE NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    snapshot_id UUID REFERENCES thermodynamic_snapshots(snapshot_id),
    second_law_proof_valid BOOLEAN NOT NULL,
    signature VARCHAR(128) NOT NULL,
    timestamp BIGINT NOT NULL
);

-- Indexes for time-series performance
CREATE INDEX IF NOT EXISTS idx_thermodynamic_snapshots_timestamp ON thermodynamic_snapshots(timestamp);
CREATE INDEX IF NOT EXISTS idx_boundary_flux_snapshot ON boundary_flux_records(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_entropy_metrics_snapshot ON entropy_generation_metrics(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_exergy_metrics_snapshot ON exergy_destruction_metrics(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_ledger_block_index ON thermodynamic_ledger_blocks(block_index);