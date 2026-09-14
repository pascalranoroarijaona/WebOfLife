-- ============================================================================
-- Web of Life: Thermodynamic Blockchain & Spatial Partition Ledger
-- Sprint 040: Canonical H3 Spatial Token Ingestion & Validation
-- ============================================================================

-- Enable cryptographic and regex extensions if not present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Domain for strictly validated 15-character canonical H3 spatial index strings
-- Ensures exact compliance with RFC-040 canonical 15-hexadecimal character specification
CREATE DOMAIN h3_canonical_index AS VARCHAR(15)
    CHECK (VALUE ~* '^[0-9a-f]{15}$');

-- Enumeration of thermodynamic mass stock elements (First Law Mass Conservation)
CREATE TYPE biogeochemical_element AS ENUM (
    'CARBON',
    'NITROGEN',
    'PHOSPHORUS',
    'WATER'
);

-- ============================================================================
-- Spatial Partitioning & Earth Pod Hierarchy
-- ============================================================================

CREATE TABLE IF NOT EXISTS spatial_partitions (
    h3_index h3_canonical_index PRIMARY KEY,
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    parent_h3_index h3_canonical_index,
    bounding_box GEOMETRY(Polygon, 4326),
    centroid GEOMETRY(Point, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_parent_partition FOREIGN KEY (parent_h3_index) 
        REFERENCES spatial_partitions(h3_index) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS earth_pods (
    pod_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    h3_index h3_canonical_index NOT NULL,
    pod_label VARCHAR(128) NOT NULL,
    entropy_budget_joules NUMERIC(24, 8) NOT NULL DEFAULT 0.0 CHECK (entropy_budget_joules >= 0.0),
    total_biomass_kg NUMERIC(24, 8) NOT NULL DEFAULT 0.0 CHECK (total_biomass_kg >= 0.0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_earth_pod_partition FOREIGN KEY (h3_index) 
        REFERENCES spatial_partitions(h3_index) ON DELETE RESTRICT
);

-- ============================================================================
-- Thermodynamic Stocks & Conservation Ledger (First & Second Law)
-- ============================================================================

CREATE TABLE IF NOT EXISTS trophic_biomass_stocks (
    stock_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pod_id UUID NOT NULL,
    element biogeochemical_element NOT NULL,
    mass_kg NUMERIC(24, 8) NOT NULL DEFAULT 0.0 CHECK (mass_kg >= 0.0),
    free_energy_joules NUMERIC(24, 8) NOT NULL DEFAULT 0.0,
    entropy_joules_per_kelvin NUMERIC(24, 8) NOT NULL DEFAULT 0.0 CHECK (entropy_joules_per_kelvin >= 0.0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stock_earth_pod FOREIGN KEY (pod_id) 
        REFERENCES earth_pods(pod_id) ON DELETE CASCADE,
    CONSTRAINT uq_pod_element UNIQUE (pod_id, element)
);

-- ============================================================================
-- Telemetry Stream Ingestion & Global H3 Token Parsing (RFC-040)
-- ============================================================================

CREATE TABLE IF NOT EXISTS spatial_telemetry_streams (
    stream_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_pod_id UUID,
    raw_payload TEXT NOT NULL,
    extracted_tokens_count INTEGER NOT NULL DEFAULT 0 CHECK (extracted_tokens_count >= 0),
    parsing_duration_ms NUMERIC(10, 4) NOT NULL CHECK (parsing_duration_ms >= 0.0),
    is_redos_safe BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_stream_pod FOREIGN KEY (origin_pod_id) 
        REFERENCES earth_pods(pod_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS spatial_token_extractions (
    extraction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id UUID NOT NULL,
    canonical_h3_index h3_canonical_index NOT NULL,
    match_offset_start INTEGER NOT NULL CHECK (match_offset_start >= 0),
    match_offset_end INTEGER NOT NULL CHECK (match_offset_end > match_offset_start),
    is_partition_registered BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_extraction_stream FOREIGN KEY (stream_id) 
        REFERENCES spatial_telemetry_streams(stream_id) ON DELETE CASCADE
);

-- ============================================================================
-- Blockchain Block & Thermodynamic Transaction Signatures
-- ============================================================================

CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_height BIGSERIAL PRIMARY KEY,
    block_hash CHAR(64) NOT NULL UNIQUE CHECK (block_hash ~ '^[0-9a-f]{64}$'),
    previous_block_hash CHAR(64) NOT NULL CHECK (previous_block_hash ~ '^[0-9a-f]{64}$'),
    merkle_root_hash CHAR(64) NOT NULL CHECK (merkle_root_hash ~ '^[0-9a-f]{64}$'),
    thermodynamic_work_joules NUMERIC(24, 8) NOT NULL CHECK (thermodynamic_work_joules >= 0.0),
    net_entropy_dissipated NUMERIC(24, 8) NOT NULL CHECK (net_entropy_dissipated >= 0.0),
    nonce NUMERIC(20, 0) NOT NULL,
    mined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS thermodynamic_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_height BIGINT NOT NULL,
    source_h3_index h3_canonical_index NOT NULL,
    target_h3_index h3_canonical_index NOT NULL,
    element biogeochemical_element NOT NULL,
    mass_transferred_kg NUMERIC(24, 8) NOT NULL CHECK (mass_transferred_kg >= 0.0),
    energy_transferred_joules NUMERIC(24, 8) NOT NULL,
    entropy_generated_joules_per_kelvin NUMERIC(24, 8) NOT NULL CHECK (entropy_generated_joules_per_kelvin >= 0.0),
    digital_signature CHAR(128) NOT NULL CHECK (digital_signature ~ '^[0-9a-fA-F]{128}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tx_block FOREIGN KEY (block_height) 
        REFERENCES blockchain_blocks(block_height) ON DELETE RESTRICT,
    CONSTRAINT fk_tx_source_partition FOREIGN KEY (source_h3_index) 
        REFERENCES spatial_partitions(h3_index) ON DELETE RESTRICT,
    CONSTRAINT fk_tx_target_partition FOREIGN KEY (target_h3_index) 
        REFERENCES spatial_partitions(h3_index) ON DELETE RESTRICT
);

-- ============================================================================
-- Indices for Zero-Allocation Scans and Accelerated Joins
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_spatial_partitions_res ON spatial_partitions (resolution);
CREATE INDEX IF NOT EXISTS idx_earth_pods_h3 ON earth_pods (h3_index);
CREATE INDEX IF NOT EXISTS idx_token_extractions_h3 ON spatial_token_extractions (canonical_h3_index);
CREATE INDEX IF NOT EXISTS idx_token_extractions_stream ON spatial_token_extractions (stream_id);
CREATE INDEX IF NOT EXISTS idx_trophic_stocks_pod ON trophic_biomass_stocks (pod_id);
CREATE INDEX IF NOT EXISTS idx_tx_source_target ON thermodynamic_transactions (source_h3_index, target_h3_index);
CREATE INDEX IF NOT EXISTS idx_blockchain_blocks_hash ON blockchain_blocks (block_hash);

-- Trigger ensuring First Law conservation: sum of transferred mass balance per transaction must be non-negative
CREATE OR REPLACE FUNCTION verify_mass_conservation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.mass_transferred_kg < 0.0 THEN
        RAISE EXCEPTION 'First Law Violation: Negative mass transfer attempted: %', NEW.mass_transferred_kg;
    END IF;
    IF NEW.entropy_generated_joules_per_kelvin < 0.0 THEN
        RAISE EXCEPTION 'Second Law Violation: Negative entropy dissipation attempted: %', NEW.entropy_generated_joules_per_kelvin;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_thermodynamic_conservation ON thermodynamic_transactions;
CREATE TRIGGER trg_verify_thermodynamic_conservation
BEFORE INSERT OR UPDATE ON thermodynamic_transactions
FOR EACH ROW
EXECUTE FUNCTION verify_mass_conservation();