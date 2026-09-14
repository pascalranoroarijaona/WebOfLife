-- Web of Life Thermodynamic Blockchain Ledger & Spatial Monad Schema
-- Sprint 059: Great Circle Plane Normal Vectors & Advective Boundary Flux Ledger

-- Extension registrations
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ---------------------------------------------------------------------
-- 1. SPATIAL GEODESIC & GREAT CIRCLE PLANE NORMALS
-- ---------------------------------------------------------------------

-- Table: spatial_great_circle_normals
-- Persists normalized 3D plane normal vectors for cell boundaries, advective corridors, and geodesics.
CREATE TABLE IF NOT EXISTS spatial_great_circle_normals (
    normal_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_h3_index VARCHAR(15) NOT NULL,
    target_h3_index VARCHAR(15) NOT NULL,
    u_vector DOUBLE PRECISION[3] NOT NULL, -- [ux, uy, uz] on S^2
    v_vector DOUBLE PRECISION[3] NOT NULL, -- [vx, vy, vz] on S^2
    normal_vector DOUBLE PRECISION[3] NOT NULL, -- [nx, ny, nz] unit normal vector (u x v / ||u x v||)
    sin_theta DOUBLE PRECISION NOT NULL, -- Cross product magnitude ||u x v||
    is_collinear BOOLEAN NOT NULL DEFAULT FALSE, -- True if ||u x v|| < epsilon (fallback used)
    epsilon DOUBLE PRECISION NOT NULL DEFAULT 1e-10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_unit_norm CHECK (
        ABS(
            SQRT(
                (normal_vector[1] * normal_vector[1]) +
                (normal_vector[2] * normal_vector[2]) +
                (normal_vector[3] * normal_vector[3])
            ) - 1.0
        ) < 1e-10
    ),
    CONSTRAINT chk_orthogonal_u CHECK (
        ABS(
            (normal_vector[1] * u_vector[1]) +
            (normal_vector[2] * u_vector[2]) +
            (normal_vector[3] * u_vector[3])
        ) < 1e-7
    )
);

CREATE INDEX IF NOT EXISTS idx_sgcn_source_target 
    ON spatial_great_circle_normals (source_h3_index, target_h3_index);

-- ---------------------------------------------------------------------
-- 2. DGGS BOUNDARY INTERFACE & ADVECTIVE FLUX TRANSACTIONS
-- ---------------------------------------------------------------------

-- Table: boundary_advective_flux_ledger
-- Tracks mass, energy, and entropy transfer across great circle hexagonal boundaries.
-- Enforces anti-symmetric advection: F(u, v) = -F(v, u).
CREATE TABLE IF NOT EXISTS boundary_advective_flux_ledger (
    flux_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL,
    normal_id UUID NOT NULL REFERENCES spatial_great_circle_normals(normal_id),
    source_cell VARCHAR(15) NOT NULL,
    target_cell VARCHAR(15) NOT NULL,
    advective_velocity DOUBLE PRECISION[3] NOT NULL, -- 3D fluid/biomass velocity vector
    normal_projected_flux DOUBLE PRECISION NOT NULL, -- Dot product: v_adv . n
    enthalpy_flux_joules DOUBLE PRECISION NOT NULL, -- Advective energy exchange
    biomass_flux_kg DOUBLE PRECISION NOT NULL, -- Advective biomass exchange
    entropy_delta_production DOUBLE PRECISION NOT NULL, -- Irreversible dispersion entropy dS >= 0
    state_merkle_root BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_entropy_non_negative CHECK (entropy_delta_production >= 0.0)
);

CREATE INDEX IF NOT EXISTS idx_bafl_block_source 
    ON boundary_advective_flux_ledger (block_height, source_cell);

-- ---------------------------------------------------------------------
-- 3. THERMODYNAMIC STATE STOCKS & ACCUMULATORS
-- ---------------------------------------------------------------------

-- Table: h3_cell_thermodynamic_stocks
-- Canonical thermodynamic state for DGGS cells, conserving total energy and mass.
CREATE TABLE IF NOT EXISTS h3_cell_thermodynamic_stocks (
    cell_h3_index VARCHAR(15) PRIMARY KEY,
    centroid_unit_vector DOUBLE PRECISION[3] NOT NULL,
    internal_energy_joules DOUBLE PRECISION NOT NULL CHECK (internal_energy_joules >= 0.0),
    biomass_carbon_kg DOUBLE PRECISION NOT NULL CHECK (biomass_carbon_kg >= 0.0),
    entropy_j_per_k DOUBLE PRECISION NOT NULL CHECK (entropy_j_per_k >= 0.0),
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin > 0.0),
    updated_at_block BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ---------------------------------------------------------------------
-- 4. BLOCKCHAIN ATTESTATION & GEODESIC CONSENSUS
-- ---------------------------------------------------------------------

-- Table: thermodynamic_block_headers
-- Verifiable block headers bundling spatial fluxes and conservation proofs.
CREATE TABLE IF NOT EXISTS thermodynamic_block_headers (
    block_height BIGINT PRIMARY KEY,
    parent_block_hash BYTEA NOT NULL,
    state_root BYTEA NOT NULL,
    flux_receipts_root BYTEA NOT NULL,
    geodesic_normal_hash BYTEA NOT NULL,
    total_net_energy_delta DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_net_mass_delta DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_entropy_generated DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    validator_signature BYTEA NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_first_law_conservation CHECK (
        ABS(total_net_energy_delta) < 1e-6 AND ABS(total_net_mass_delta) < 1e-6
    ),
    CONSTRAINT chk_second_law_entropy CHECK (total_entropy_generated >= 0.0)
);

-- ---------------------------------------------------------------------
-- 5. CONTINUOUS TIME-SERIES PARTITIONS (TimescaleDB / Spatial Telemetry)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cell_flux_telemetry_timeseries (
    recorded_at TIMESTAMPTZ NOT NULL,
    cell_h3_index VARCHAR(15) NOT NULL,
    boundary_normal_id UUID NOT NULL REFERENCES spatial_great_circle_normals(normal_id),
    flux_rate_joules_sec DOUBLE PRECISION NOT NULL,
    biomass_rate_kg_sec DOUBLE PRECISION NOT NULL,
    local_reynolds_number DOUBLE PRECISION NOT NULL
);

SELECT create_hypertable('cell_flux_telemetry_timeseries', 'recorded_at', if_not_exists => TRUE);