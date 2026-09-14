-- Web of Life Core Database Schema - Sprint 058
-- Integration: Spherical Boundary Midpoints, Inter-Hexel Adjacency Interfaces, 
-- and Conservative Thermodynamic Transport Metrics.

-- PostGIS and TimescaleDB extension setup
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Global Enum Types
CREATE TYPE boundary_interface_type AS ENUM (
    'ATMOSPHERIC_ADVECTION',
    'OCEANIC_DIC_TRANSPORT',
    'TROPHIC_BIOMASS_MIGRATION',
    'SENSIBLE_HEAT_DIFFUSION'
);

CREATE TYPE thermodynamic_conservation_status AS ENUM (
    'STRICT_CONSERVATIVE',
    'ENTROPY_GENERATING_DISSIPATIVE',
    'EQUILIBRIUM_NEUTRAL'
);

-- =====================================================================
-- TABLE: h3_hexel_registry
-- Registry of discrete global grid cells (H3 Hexels)
-- =====================================================================
CREATE TABLE IF NOT EXISTS h3_hexel_registry (
    h3_index VARCHAR(15) PRIMARY KEY,
    resolution SMALLINT NOT NULL CHECK (resolution >= 0 AND resolution <= 15),
    centroid_lat DOUBLE PRECISION NOT NULL CHECK (centroid_lat >= -90.0 AND centroid_lat <= 90.0),
    centroid_lng DOUBLE PRECISION NOT NULL CHECK (centroid_lng >= -180.0 AND centroid_lng <= 180.0),
    centroid_geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (
        ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326)
    ) STORED,
    cell_boundary GEOMETRY(Polygon, 4326),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hexel_spatial ON h3_hexel_registry USING GIST (centroid_geom);
CREATE INDEX IF NOT EXISTS idx_hexel_resolution ON h3_hexel_registry(resolution);

-- =====================================================================
-- TABLE: h3_boundary_interfaces
-- Caches evaluated spherical boundary midpoints and metric properties
-- between adjacent H3 cells (RFC 058)
-- =====================================================================
CREATE TABLE IF NOT EXISTS h3_boundary_interfaces (
    interface_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_hex VARCHAR(15) NOT NULL REFERENCES h3_hexel_registry(h3_index) ON DELETE CASCADE,
    neighbor_hex VARCHAR(15) NOT NULL REFERENCES h3_hexel_registry(h3_index) ON DELETE CASCADE,
    midpoint_lat DOUBLE PRECISION NOT NULL CHECK (midpoint_lat >= -90.0 AND midpoint_lat <= 90.0),
    midpoint_lng DOUBLE PRECISION NOT NULL CHECK (midpoint_lng >= -180.0 AND midpoint_lng < 180.0),
    midpoint_geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (
        ST_SetSRID(ST_MakePoint(midpoint_lng, midpoint_lat), 4326)
    ) STORED,
    geodesic_distance_meters DOUBLE PRECISION NOT NULL CHECK (geodesic_distance_meters >= 0.0),
    normal_azimuth_degrees DOUBLE PRECISION NOT NULL CHECK (normal_azimuth_degrees >= 0.0 AND normal_azimuth_degrees < 360.0),
    interface_type boundary_interface_type NOT NULL DEFAULT 'SENSIBLE_HEAT_DIFFUSION',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_hex_adjacency_pair UNIQUE (origin_hex, neighbor_hex),
    CONSTRAINT chk_non_self_adjacent CHECK (origin_hex <> neighbor_hex)
);

CREATE INDEX IF NOT EXISTS idx_boundary_midpoint_geom ON h3_boundary_interfaces USING GIST (midpoint_geom);
CREATE INDEX IF NOT EXISTS idx_boundary_origin ON h3_boundary_interfaces(origin_hex);
CREATE INDEX IF NOT EXISTS idx_boundary_neighbor ON h3_boundary_interfaces(neighbor_hex);

-- =====================================================================
-- TABLE: thermodynamic_hexel_stocks (Hypertable)
-- State of physical and chemical stocks per H3 cell over discrete ticks
-- =====================================================================
CREATE TABLE IF NOT EXISTS thermodynamic_hexel_stocks (
    time TIMESTAMPTZ NOT NULL,
    h3_index VARCHAR(15) NOT NULL REFERENCES h3_hexel_registry(h3_index),
    internal_energy_joules NUMERIC(28, 8) NOT NULL CHECK (internal_energy_joules >= 0),
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin > 0.0),
    carbon_stock_kg NUMERIC(24, 6) NOT NULL CHECK (carbon_stock_kg >= 0),
    vapor_stock_kg NUMERIC(24, 6) NOT NULL CHECK (vapor_stock_kg >= 0),
    biomass_stock_kg NUMERIC(24, 6) NOT NULL CHECK (biomass_stock_kg >= 0),
    entropy_joules_per_kelvin NUMERIC(28, 8) NOT NULL,
    state_merkle_root BYTEA NOT NULL,
    PRIMARY KEY (time, h3_index)
);

SELECT create_hypertable('thermodynamic_hexel_stocks', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_hexel_stocks_spatial ON thermodynamic_hexel_stocks(h3_index, time DESC);

-- =====================================================================
-- TABLE: inter_hexel_flux_ledger (Hypertable)
-- Conserved interfacial transfers evaluated across geodesic boundary midpoints
-- =====================================================================
CREATE TABLE IF NOT EXISTS inter_hexel_flux_ledger (
    time TIMESTAMPTZ NOT NULL,
    flux_id UUID DEFAULT gen_random_uuid(),
    interface_id UUID NOT NULL REFERENCES h3_boundary_interfaces(interface_id),
    origin_hex VARCHAR(15) NOT NULL,
    neighbor_hex VARCHAR(15) NOT NULL,
    mass_flux_kg_sec NUMERIC(20, 8) NOT NULL,
    energy_flux_watts NUMERIC(24, 6) NOT NULL,
    entropy_production_rate_w_k NUMERIC(24, 8) NOT NULL CHECK (entropy_production_rate_w_k >= 0.0),
    potential_gradient_delta DOUBLE PRECISION NOT NULL,
    conservation_status thermodynamic_conservation_status NOT NULL DEFAULT 'STRICT_CONSERVATIVE',
    tx_hash BYTEA NOT NULL,
    PRIMARY KEY (time, flux_id)
);

SELECT create_hypertable('inter_hexel_flux_ledger', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_flux_interface ON inter_hexel_flux_ledger(interface_id, time DESC);

-- =====================================================================
-- TABLE: thermodynamic_blockchain_blocks
-- Immutable cryptographic ledger for verified state-transitions & conservation proofs
-- =====================================================================
CREATE TABLE IF NOT EXISTS thermodynamic_blockchain_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash BYTEA NOT NULL UNIQUE,
    parent_hash BYTEA NOT NULL,
    epoch_timestamp TIMESTAMPTZ NOT NULL,
    merkle_root_stocks BYTEA NOT NULL,
    merkle_root_fluxes BYTEA NOT NULL,
    global_internal_energy_joules NUMERIC(38, 8) NOT NULL,
    global_entropy_joules_per_kelvin NUMERIC(38, 8) NOT NULL,
    net_first_law_residual_joules NUMERIC(20, 10) NOT NULL DEFAULT 0.0,
    validator_signature BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blockchain_epoch ON thermodynamic_blockchain_blocks(epoch_timestamp);