-- Web of Life Planetary Manifold & Thermodynamic Ledger Schema
-- Sprint 067: Integration of DetailedInterfaceNormalResult and Finite-Volume Interface Fluxes

-- Extensions for spatial calculations and cryptographic hashing
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ---------------------------------------------------------------------
-- 1. H3 Discrete Global Grid System (DGGS) Manifold & Interfaces
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS h3_cells (
    h3_index VARCHAR(16) PRIMARY KEY,
    resolution INTEGER NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    centroid_lat DOUBLE PRECISION NOT NULL,
    centroid_lon DOUBLE PRECISION NOT NULL,
    centroid_x DOUBLE PRECISION NOT NULL,
    centroid_y DOUBLE PRECISION NOT NULL,
    centroid_z DOUBLE PRECISION NOT NULL,
    surface_area_sqm DOUBLE PRECISION NOT NULL CHECK (surface_area_sqm > 0),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_h3_cells_res ON h3_cells (resolution);

-- Directed cell-to-cell interface geometry adhering to RFC-067
CREATE TABLE IF NOT EXISTS h3_cell_interfaces (
    interface_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_h3 VARCHAR(16) NOT NULL REFERENCES h3_cells(h3_index),
    destination_h3 VARCHAR(16) NOT NULL REFERENCES h3_cells(h3_index),
    resolution INTEGER NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    
    -- DetailedInterfaceNormalResult Components
    normal_x DOUBLE PRECISION NOT NULL,
    normal_y DOUBLE PRECISION NOT NULL,
    normal_z DOUBLE PRECISION NOT NULL,
    arc_length_meters DOUBLE PRECISION NOT NULL CHECK (arc_length_meters > 0),
    alignment_cos DOUBLE PRECISION NOT NULL CHECK (alignment_cos BETWEEN -1.0 AND 1.0),

    -- Midpoint on unit sphere S^2 tangent plane
    midpoint_x DOUBLE PRECISION NOT NULL,
    midpoint_y DOUBLE PRECISION NOT NULL,
    midpoint_z DOUBLE PRECISION NOT NULL,

    -- Boundary arc vertices on unit sphere S^2
    vertex_a_x DOUBLE PRECISION NOT NULL,
    vertex_a_y DOUBLE PRECISION NOT NULL,
    vertex_a_z DOUBLE PRECISION NOT NULL,
    vertex_b_x DOUBLE PRECISION NOT NULL,
    vertex_b_y DOUBLE PRECISION NOT NULL,
    vertex_b_z DOUBLE PRECISION NOT NULL,

    -- Interface canonical identification and anti-symmetry checksum
    canonical_interface_hash CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_h3_interface_pair UNIQUE (origin_h3, destination_h3),
    CONSTRAINT chk_unit_normal_length CHECK (
        ABS((normal_x * normal_x + normal_y * normal_y + normal_z * normal_z) - 1.0) < 1e-9
    )
);

CREATE INDEX IF NOT EXISTS idx_h3_interfaces_origin ON h3_cell_interfaces (origin_h3);
CREATE INDEX IF NOT EXISTS idx_h3_interfaces_dest ON h3_cell_interfaces (destination_h3);
CREATE INDEX IF NOT EXISTS idx_h3_interfaces_hash ON h3_cell_interfaces (canonical_interface_hash);

-- ---------------------------------------------------------------------
-- 2. Thermodynamic States & Stock Monads
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cell_thermodynamic_state (
    state_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    h3_index VARCHAR(16) NOT NULL REFERENCES h3_cells(h3_index),
    timestamp_epoch_ms BIGINT NOT NULL,
    
    -- Conserved Intensive & Extensive Quantities
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin > 0),
    mass_kg DOUBLE PRECISION NOT NULL CHECK (mass_kg >= 0),
    internal_energy_joules DOUBLE PRECISION NOT NULL,
    entropy_joules_per_kelvin DOUBLE PRECISION NOT NULL,
    carbon_monad_stock_moles DOUBLE PRECISION NOT NULL CHECK (carbon_monad_stock_moles >= 0),
    pressure_pascals DOUBLE PRECISION NOT NULL CHECK (pressure_pascals >= 0),
    
    -- Local Horizontal Fluid Velocity Vector (tangent plane projected)
    velocity_u_ms DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    velocity_v_ms DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    velocity_w_ms DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    state_hash CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cell_state_time UNIQUE (h3_index, timestamp_epoch_ms)
);

CREATE INDEX IF NOT EXISTS idx_cell_state_time ON cell_thermodynamic_state (timestamp_epoch_ms DESC);

-- ---------------------------------------------------------------------
-- 3. Finite-Volume Interface Fluxes (First & Second Law Verification)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS interface_flux_transactions (
    flux_tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interface_id UUID NOT NULL REFERENCES h3_cell_interfaces(interface_id),
    timestamp_epoch_ms BIGINT NOT NULL,
    time_step_seconds DOUBLE PRECISION NOT NULL CHECK (time_step_seconds > 0),

    -- Interface normal projection quantities: u_dot_n = u · n_ij
    normal_velocity_ms DOUBLE PRECISION NOT NULL,
    advective_mass_flux_kg_per_s DOUBLE PRECISION NOT NULL,
    advective_heat_flux_watts DOUBLE PRECISION NOT NULL,
    diffusive_heat_flux_watts DOUBLE PRECISION NOT NULL,
    carbon_flux_moles_per_s DOUBLE PRECISION NOT NULL,

    -- Second Law Clausius-Duhem Invariant Proof: S_gen >= 0
    entropy_production_rate_watts_per_kelvin DOUBLE PRECISION NOT NULL CHECK (entropy_production_rate_watts_per_kelvin >= -1e-12),

    -- First Law Anti-symmetry Proof: J_ij = -J_ji
    is_antisymmetric_verified BOOLEAN NOT NULL DEFAULT FALSE,
    counterpart_flux_tx_id UUID REFERENCES interface_flux_transactions(flux_tx_id),

    flux_vector_hash CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interface_flux_tx ON interface_flux_transactions (interface_id, timestamp_epoch_ms);

-- ---------------------------------------------------------------------
-- 4. Thermodynamic Consensus & Immutable Blockchain Ledger
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_number BIGINT PRIMARY KEY,
    previous_block_hash CHAR(64) NOT NULL,
    block_hash CHAR(64) NOT NULL UNIQUE,
    merkle_state_root CHAR(64) NOT NULL,
    merkle_flux_root CHAR(64) NOT NULL,
    timestamp_epoch_ms BIGINT NOT NULL,
    
    -- Global Conservation Closures
    total_planetary_energy_joules DOUBLE PRECISION NOT NULL,
    total_planetary_mass_kg DOUBLE PRECISION NOT NULL,
    net_planetary_entropy_production DOUBLE PRECISION NOT NULL CHECK (net_planetary_entropy_production >= 0),
    global_energy_residual DOUBLE PRECISION NOT NULL CHECK (ABS(global_energy_residual) < 1e-4),
    global_mass_residual DOUBLE PRECISION NOT NULL CHECK (ABS(global_mass_residual) < 1e-4),
    
    -- Cryptographic Proof of Thermodynamic State Validations
    validator_consensus_proof BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS block_interface_flux_ledger (
    ledger_entry_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_number BIGINT NOT NULL REFERENCES thermodynamic_blocks(block_number),
    flux_tx_id UUID NOT NULL REFERENCES interface_flux_transactions(flux_tx_id),
    merkle_leaf_hash CHAR(64) NOT NULL,
    merkle_path_indices INTEGER[] NOT NULL,
    merkle_sibling_hashes TEXT[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_block_flux UNIQUE (block_number, flux_tx_id)
);

CREATE INDEX IF NOT EXISTS idx_block_flux_ledger ON block_interface_flux_ledger (block_number);