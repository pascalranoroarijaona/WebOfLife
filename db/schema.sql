-- ============================================================================
-- Web of Life: Planetary Thermodynamic Blockchain & Spatial Monad Ledger
-- Sprint 041 Schema: Canonical H3 Spatial Ingestion & Zero-Entropy Extraction
-- ============================================================================

-- Extensions required for cryptographic verification and spatial indexes
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Earth Pod Biophysical Foundations & Stocks
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS earth_pods (
    earth_pod_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pod_name VARCHAR(128) NOT NULL UNIQUE,
    parent_pod_id UUID REFERENCES earth_pods(earth_pod_id),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DORMANT', 'ISOLATED', 'DEGRADED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thermodynamic mass and energy conservation envelope per Earth Pod
CREATE TABLE IF NOT EXISTS thermodynamic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    earth_pod_id UUID NOT NULL REFERENCES earth_pods(earth_pod_id) ON DELETE RESTRICT,
    total_mass_kg NUMERIC(24, 8) NOT NULL CHECK (total_mass_kg >= 0.0),
    total_energy_joules NUMERIC(32, 8) NOT NULL CHECK (total_energy_joules >= 0.0),
    cumulative_entropy_dissipation_joules_per_kelvin NUMERIC(32, 8) NOT NULL DEFAULT 0.0,
    mass_conservation_invariant_hash VARCHAR(64) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS atmosphere_stocks (
    stock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    earth_pod_id UUID NOT NULL REFERENCES earth_pods(earth_pod_id) ON DELETE RESTRICT,
    co2_kg NUMERIC(20, 8) NOT NULL CHECK (co2_kg >= 0.0),
    o2_kg NUMERIC(20, 8) NOT NULL CHECK (o2_kg >= 0.0),
    n2_kg NUMERIC(20, 8) NOT NULL CHECK (n2_kg >= 0.0),
    h2o_vapor_kg NUMERIC(20, 8) NOT NULL CHECK (h2o_vapor_kg >= 0.0),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_atmosphere_mass_consistency CHECK ((co2_kg + o2_kg + n2_kg + h2o_vapor_kg) > 0.0)
);

CREATE TABLE IF NOT EXISTS trophic_biomass_stocks (
    stock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    earth_pod_id UUID NOT NULL REFERENCES earth_pods(earth_pod_id) ON DELETE RESTRICT,
    autotroph_biomass_kg NUMERIC(20, 8) NOT NULL CHECK (autotroph_biomass_kg >= 0.0),
    herbivore_biomass_kg NUMERIC(20, 8) NOT NULL CHECK (herbivore_biomass_kg >= 0.0),
    carnivore_biomass_kg NUMERIC(20, 8) NOT NULL CHECK (carnivore_biomass_kg >= 0.0),
    detritivore_biomass_kg NUMERIC(20, 8) NOT NULL CHECK (detritivore_biomass_kg >= 0.0),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS thermal_stocks (
    stock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    earth_pod_id UUID NOT NULL REFERENCES earth_pods(earth_pod_id) ON DELETE RESTRICT,
    sensible_heat_joules NUMERIC(28, 8) NOT NULL CHECK (sensible_heat_joules >= 0.0),
    latent_heat_joules NUMERIC(28, 8) NOT NULL CHECK (latent_heat_joules >= 0.0),
    surface_temp_kelvin NUMERIC(8, 4) NOT NULL CHECK (surface_temp_kelvin >= 0.0),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. H3 Hexagonal Grid & Canonical Spatial Telemetry Ledger
-- ----------------------------------------------------------------------------

-- Canonical reference master for verified H3 cell tokens
CREATE TABLE IF NOT EXISTS h3_cells (
    canonical_h3_index VARCHAR(15) PRIMARY KEY,
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    mode SMALLINT NOT NULL DEFAULT 1 CHECK (mode = 1),
    base_cell SMALLINT NOT NULL CHECK (base_cell BETWEEN 0 AND 121),
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    first_observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_h3_index_format CHECK (canonical_h3_index ~ '^[0-9a-f]{15}$')
);

CREATE INDEX IF NOT EXISTS idx_h3_cells_resolution ON h3_cells(resolution);

-- Unstructured and semi-structured spatial telemetry ingest ledger
CREATE TABLE IF NOT EXISTS spatial_telemetry_ingests (
    ingest_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    earth_pod_id UUID NOT NULL REFERENCES earth_pods(earth_pod_id),
    raw_payload TEXT NOT NULL,
    byte_length INTEGER NOT NULL CHECK (byte_length >= 0),
    payload_hash VARCHAR(64) NOT NULL, -- SHA-256 of raw textual stream
    extracted_token_count INTEGER NOT NULL DEFAULT 0 CHECK (extracted_token_count >= 0),
    entropy_dissipation_joules NUMERIC(16, 8) NOT NULL DEFAULT 0.00000000 CHECK (entropy_dissipation_joules >= 0.0),
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spatial_telemetry_pod_time 
    ON spatial_telemetry_ingests (earth_pod_id, ingested_at DESC);

-- Deduplicated canonical tokens extracted per ingest operation
CREATE TABLE IF NOT EXISTS canonical_h3_token_extractions (
    extraction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingest_id UUID NOT NULL REFERENCES spatial_telemetry_ingests(ingest_id) ON DELETE CASCADE,
    canonical_h3_index VARCHAR(15) NOT NULL REFERENCES h3_cells(canonical_h3_index),
    discovery_order SMALLINT NOT NULL CHECK (discovery_order >= 0),
    raw_match_fragment VARCHAR(64) NOT NULL,
    extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ingest_token_canonical UNIQUE (ingest_id, canonical_h3_index),
    CONSTRAINT uq_ingest_discovery_order UNIQUE (ingest_id, discovery_order)
);

CREATE INDEX IF NOT EXISTS idx_extractions_canonical_index 
    ON canonical_h3_token_extractions (canonical_h3_index);

-- ----------------------------------------------------------------------------
-- 3. Spatial Monad States & Activation Graph
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_monad_states (
    monad_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    earth_pod_id UUID NOT NULL REFERENCES earth_pods(earth_pod_id),
    state_version BIGINT NOT NULL CHECK (state_version >= 1),
    parent_monad_id UUID REFERENCES spatial_monad_states(monad_id),
    active_tokens_merkle_root VARCHAR(64) NOT NULL,
    total_active_cells INTEGER NOT NULL CHECK (total_active_cells >= 0),
    thermodynamic_mass_delta_kg NUMERIC(20, 8) NOT NULL DEFAULT 0.0 CHECK (thermodynamic_mass_delta_kg = 0.0), -- First law conservation verification
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_monad_pod_version UNIQUE (earth_pod_id, state_version)
);

-- Association between Spatial Monad state instances and canonical active H3 cells
CREATE TABLE IF NOT EXISTS spatial_monad_active_cells (
    monad_id UUID NOT NULL REFERENCES spatial_monad_states(monad_id) ON DELETE CASCADE,
    canonical_h3_index VARCHAR(15) NOT NULL REFERENCES h3_cells(canonical_h3_index),
    activated_via_ingest_id UUID REFERENCES spatial_telemetry_ingests(ingest_id),
    activation_sequence INTEGER NOT NULL CHECK (activation_sequence >= 0),
    PRIMARY KEY (monad_id, canonical_h3_index)
);

CREATE INDEX IF NOT EXISTS idx_monad_cells_active_index 
    ON spatial_monad_active_cells (canonical_h3_index);

-- ----------------------------------------------------------------------------
-- 4. Thermodynamic Blockchain: Blocks, Receipts & Conservation Proofs
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_height BIGINT PRIMARY KEY CHECK (block_height >= 0),
    previous_block_hash VARCHAR(64) NOT NULL,
    block_hash VARCHAR(64) NOT NULL UNIQUE,
    state_merkle_root VARCHAR(64) NOT NULL,
    spatial_monad_merkle_root VARCHAR(64) NOT NULL,
    total_mass_balance_kg NUMERIC(28, 8) NOT NULL CHECK (total_mass_balance_kg >= 0.0),
    mass_conservation_delta_kg NUMERIC(28, 8) NOT NULL DEFAULT 0.0 CHECK (mass_conservation_delta_kg = 0.0),
    total_entropy_dissipated_joules NUMERIC(28, 8) NOT NULL CHECK (total_entropy_dissipated_joules >= 0.0),
    validator_node_signature TEXT NOT NULL,
    mined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blockchain_transactions (
    tx_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(block_height) ON DELETE RESTRICT,
    tx_hash VARCHAR(64) NOT NULL UNIQUE,
    tx_type VARCHAR(48) NOT NULL CHECK (tx_type IN ('SPATIAL_INGEST', 'TROPHIC_EXCHANGE', 'HEAT_TRANSFER', 'ATMOSPHERIC_FLUX')),
    earth_pod_id UUID NOT NULL REFERENCES earth_pods(earth_pod_id),
    ingest_id UUID REFERENCES spatial_telemetry_ingests(ingest_id),
    entropy_cost_joules NUMERIC(18, 8) NOT NULL CHECK (entropy_cost_joules >= 0.0),
    gas_consumed NUMERIC(16, 4) NOT NULL CHECK (gas_consumed >= 0.0),
    cryptographic_signature TEXT NOT NULL,
    receipt_status VARCHAR(16) NOT NULL DEFAULT 'COMMITTED' CHECK (receipt_status IN ('COMMITTED', 'REVERTED')),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blockchain_tx_type ON blockchain_transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_blockchain_tx_block ON blockchain_transactions(block_height);

-- ----------------------------------------------------------------------------
-- 5. Thermodynamic Conservation Integrity Guards (Triggers & Procedures)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verify_mass_conservation_invariant()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.thermodynamic_mass_delta_kg <> 0.0 THEN
        RAISE EXCEPTION 'Thermodynamic Invariant Violation: Matter cannot be created or destroyed. Delta: % kg', 
            NEW.thermodynamic_mass_delta_kg;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_monad_mass_conservation ON spatial_monad_states;
CREATE TRIGGER trg_verify_monad_mass_conservation
    BEFORE INSERT OR UPDATE ON spatial_monad_states
    FOR EACH ROW
    EXECUTE FUNCTION verify_mass_conservation_invariant();

CREATE OR REPLACE FUNCTION verify_canonical_h3_format()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.canonical_h3_index !~ '^[0-9a-f]{15}$' THEN
        RAISE EXCEPTION 'Canonical H3 Index Violation: token % must be exactly 15 lowercase hexadecimal characters.', 
            NEW.canonical_h3_index;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_h3_cell_token ON h3_cells;
CREATE TRIGGER trg_verify_h3_cell_token
    BEFORE INSERT OR UPDATE ON h3_cells
    FOR EACH ROW
    EXECUTE FUNCTION verify_canonical_h3_format();