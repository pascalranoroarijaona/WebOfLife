-- ============================================================================
-- Web of Life: Planetary Thermodynamic Blockchain & Spatial Ledger Schema
-- Sprint 065: 3D Boundary Centroid Displacement Vector Formulation & Fluxes
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. SPATIAL GEOCENTRIC DOMAIN (H3 Spherical & Cartesian Coordinates)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spatial_h3_cells (
    cell_id VARCHAR(15) PRIMARY KEY, -- Canonical 15-character H3 hex index string
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    lat DOUBLE PRECISION NOT NULL CHECK (lat >= -90.0 AND lat <= 90.0),
    lng DOUBLE PRECISION NOT NULL CHECK (lng >= -180.0 AND lng <= 180.0),
    cartesian_x DOUBLE PRECISION NOT NULL, -- Geocentric unit sphere X = cos(lat)*cos(lng)
    cartesian_y DOUBLE PRECISION NOT NULL, -- Geocentric unit sphere Y = cos(lat)*sin(lng)
    cartesian_z DOUBLE PRECISION NOT NULL, -- Geocentric unit sphere Z = sin(lat)
    elevation_masl DOUBLE PRECISION DEFAULT 0.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_unit_sphere_norm CHECK (
        ABS((cartesian_x * cartesian_x + cartesian_y * cartesian_y + cartesian_z * cartesian_z) - 1.0) < 1e-7
    )
);

CREATE INDEX IF NOT EXISTS idx_spatial_h3_res ON spatial_h3_cells(resolution);
CREATE INDEX IF NOT EXISTS idx_spatial_h3_cartesian ON spatial_h3_cells(cartesian_x, cartesian_y, cartesian_z);

-- ----------------------------------------------------------------------------
-- 2. 3D BOUNDARY CENTROID DISPLACEMENTS (RFC-065)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS boundary_displacements_3d (
    edge_id VARCHAR(32) PRIMARY KEY, -- Deterministic pairing: concat(origin_h3, '->', target_h3)
    origin_h3 VARCHAR(15) NOT NULL REFERENCES spatial_h3_cells(cell_id),
    target_h3 VARCHAR(15) NOT NULL REFERENCES spatial_h3_cells(cell_id),
    origin_x DOUBLE PRECISION NOT NULL,
    origin_y DOUBLE PRECISION NOT NULL,
    origin_z DOUBLE PRECISION NOT NULL,
    target_x DOUBLE PRECISION NOT NULL,
    target_y DOUBLE PRECISION NOT NULL,
    target_z DOUBLE PRECISION NOT NULL,
    displacement_dx DOUBLE PRECISION NOT NULL, -- target_x - origin_x
    displacement_dy DOUBLE PRECISION NOT NULL, -- target_y - origin_y
    displacement_dz DOUBLE PRECISION NOT NULL, -- target_z - origin_z
    unit_x DOUBLE PRECISION NOT NULL,         -- Normalized unit displacement component x
    unit_y DOUBLE PRECISION NOT NULL,         -- Normalized unit displacement component y
    unit_z DOUBLE PRECISION NOT NULL,         -- Normalized unit displacement component z
    chord_distance DOUBLE PRECISION NOT NULL CHECK (chord_distance >= 0.0),
    angular_distance_rad DOUBLE PRECISION NOT NULL CHECK (angular_distance_rad >= 0.0 AND angular_distance_rad <= PI()),
    epsilon_singular DOUBLE PRECISION DEFAULT 1e-12,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_origin_target_distinct CHECK (origin_h3 <> target_h3),
    CONSTRAINT chk_unit_vector_norm CHECK (
        chord_distance <= epsilon_singular OR 
        ABS((unit_x * unit_x + unit_y * unit_y + unit_z * unit_z) - 1.0) < 1e-7
    )
);

CREATE INDEX IF NOT EXISTS idx_boundary_displacement_origin ON boundary_displacements_3d(origin_h3);
CREATE INDEX IF NOT EXISTS idx_boundary_displacement_target ON boundary_displacements_3d(target_h3);
CREATE INDEX IF NOT EXISTS idx_boundary_displacement_unit ON boundary_displacements_3d(unit_x, unit_y, unit_z);

-- ----------------------------------------------------------------------------
-- 3. CELL THERMODYNAMIC STOCK SNAPSHOTS (State Monad Replicas)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cell_thermodynamic_stocks (
    cell_id VARCHAR(15) NOT NULL REFERENCES spatial_h3_cells(cell_id),
    epoch_height BIGINT NOT NULL,
    moisture_mass_kg DOUBLE PRECISION NOT NULL CHECK (moisture_mass_kg >= 0.0),
    organic_carbon_kg DOUBLE PRECISION NOT NULL CHECK (organic_carbon_kg >= 0.0),
    dry_air_mass_kg DOUBLE PRECISION NOT NULL CHECK (dry_air_mass_kg >= 0.0),
    thermal_energy_joules DOUBLE PRECISION NOT NULL CHECK (thermal_energy_joules >= 0.0),
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin >= 0.0),
    entropy_joules_per_k DOUBLE PRECISION NOT NULL,
    exergy_joules DOUBLE PRECISION NOT NULL,
    wind_velocity_x DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    wind_velocity_y DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    wind_velocity_z DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    state_merkle_leaf VARCHAR(64) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (cell_id, epoch_height)
);

CREATE INDEX IF NOT EXISTS idx_thermo_stocks_epoch ON cell_thermodynamic_stocks(epoch_height);

-- ----------------------------------------------------------------------------
-- 4. DIRECTED BOUNDARY FLUX LEDGER (Conservation & Entropy Verification)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS boundary_flux_ledgers (
    flux_id BIGSERIAL PRIMARY KEY,
    block_height BIGINT NOT NULL,
    edge_id VARCHAR(32) NOT NULL REFERENCES boundary_displacements_3d(edge_id),
    origin_h3 VARCHAR(15) NOT NULL REFERENCES spatial_h3_cells(cell_id),
    target_h3 VARCHAR(15) NOT NULL REFERENCES spatial_h3_cells(cell_id),
    projected_velocity_m_s DOUBLE PRECISION NOT NULL, -- dot(wind_velocity_3d, displacement_unit_3d)
    transferred_moisture_kg DOUBLE PRECISION NOT NULL,
    transferred_carbon_kg DOUBLE PRECISION NOT NULL,
    transferred_enthalpy_j DOUBLE PRECISION NOT NULL,
    entropy_production_j_k DOUBLE PRECISION NOT NULL CHECK (entropy_production_j_k >= -1e-9), -- 2nd Law of Thermodynamics
    flux_tx_hash VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_conservative_mass_flow CHECK (
        transferred_moisture_kg >= 0.0 AND transferred_carbon_kg >= 0.0
    )
);

CREATE INDEX IF NOT EXISTS idx_boundary_flux_block ON boundary_flux_ledgers(block_height);
CREATE INDEX IF NOT EXISTS idx_boundary_flux_edge ON boundary_flux_ledgers(edge_id);

-- ----------------------------------------------------------------------------
-- 5. BLOCKCHAIN CORE: BLOCKS & TRANSACTIONS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_height BIGINT PRIMARY KEY,
    prev_block_hash VARCHAR(64) NOT NULL,
    block_hash VARCHAR(64) NOT NULL UNIQUE,
    state_merkle_root VARCHAR(64) NOT NULL,
    flux_merkle_root VARCHAR(64) NOT NULL,
    total_mass_kg DOUBLE PRECISION NOT NULL,
    total_energy_joules DOUBLE PRECISION NOT NULL,
    entropy_delta_proof DOUBLE PRECISION NOT NULL CHECK (entropy_delta_proof >= -1e-9), -- Global non-negative dissipation
    validator_public_key VARCHAR(66) NOT NULL,
    validator_signature VARCHAR(130) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocks_hash ON blockchain_blocks(block_hash);

CREATE TABLE IF NOT EXISTS thermodynamic_transactions (
    tx_hash VARCHAR(64) PRIMARY KEY,
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(block_height) ON DELETE CASCADE,
    tx_type VARCHAR(32) NOT NULL, -- 'ADVECTIVE_FLUX', 'DIFFUSIVE_TRANSFER', 'METABOLIC_BURDEN'
    origin_cell VARCHAR(15) REFERENCES spatial_h3_cells(cell_id),
    target_cell VARCHAR(15) REFERENCES spatial_h3_cells(cell_id),
    mass_delta_kg DOUBLE PRECISION NOT NULL,
    energy_delta_joules DOUBLE PRECISION NOT NULL,
    entropy_delta_j_k DOUBLE PRECISION NOT NULL,
    vector_unit_x DOUBLE PRECISION,
    vector_unit_y DOUBLE PRECISION,
    vector_unit_z DOUBLE PRECISION,
    chord_distance DOUBLE PRECISION,
    cryptographic_proof JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thermo_tx_block ON thermodynamic_transactions(block_height);
CREATE INDEX IF NOT EXISTS idx_thermo_tx_origin ON thermodynamic_transactions(origin_cell);
CREATE INDEX IF NOT EXISTS idx_thermo_tx_target ON thermodynamic_transactions(target_cell);

-- ----------------------------------------------------------------------------
-- 6. FIRST LAW CONSERVATIVE INVARIANT TRIGGER
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION verify_mass_energy_conservation()
RETURNS TRIGGER AS $$
DECLARE
    net_mass_delta DOUBLE PRECISION;
    net_energy_delta DOUBLE PRECISION;
BEGIN
    SELECT COALESCE(SUM(mass_delta_kg), 0.0), COALESCE(SUM(energy_delta_joules), 0.0)
    INTO net_mass_delta, net_energy_delta
    FROM thermodynamic_transactions
    WHERE block_height = NEW.block_height;

    IF ABS(net_mass_delta) > 1e-6 THEN
        RAISE EXCEPTION 'Thermodynamic Invariant Violation: First Law mass imbalance detected: % kg', net_mass_delta;
    END IF;

    IF ABS(net_energy_delta) > 1e-4 THEN
        RAISE EXCEPTION 'Thermodynamic Invariant Violation: First Law energy imbalance detected: % J', net_energy_delta;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_verify_conservation
AFTER INSERT OR UPDATE ON blockchain_blocks
FOR EACH ROW
EXECUTE FUNCTION verify_mass_energy_conservation();