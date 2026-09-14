-- ============================================================================
-- Web of Life: Planetary Biogeochemical Simulation Engine & Blockchain Ledger
-- SPRINT 060: Tangent Space Projection for Discrete Geodesic Manifolds (RFC-060)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. SPATIAL TOPOLOGY: Discrete Geodesic Manifold (H3 Cell Centroids)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_cells (
    h3_index VARCHAR(15) PRIMARY KEY,
    resolution INTEGER NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    -- Centroid Cartesian coordinates embedded in global geocentric R^3 (meters)
    pos_x DOUBLE PRECISION NOT NULL,
    pos_y DOUBLE PRECISION NOT NULL,
    pos_z DOUBLE PRECISION NOT NULL,
    -- Radius magnitude ||p|| = sqrt(px^2 + py^2 + pz^2)
    radius_meters DOUBLE PRECISION GENERATED ALWAYS AS (
        SQRT(pos_x * pos_x + pos_y * pos_y + pos_z * pos_z)
    ) STORED,
    -- Outward unit normal vector n_hat = p / ||p||
    normal_x DOUBLE PRECISION NOT NULL,
    normal_y DOUBLE PRECISION NOT NULL,
    normal_z DOUBLE PRECISION NOT NULL,
    surface_area_m2 DOUBLE PRECISION NOT NULL CHECK (surface_area_m2 > 0),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_unit_normal CHECK (
        ABS((normal_x * normal_x + normal_y * normal_y + normal_z * normal_z) - 1.0) < 1e-7
    )
);

CREATE INDEX IF NOT EXISTS idx_h3_cells_resolution ON h3_cells(resolution);

-- ----------------------------------------------------------------------------
-- 2. THERMODYNAMIC MONAD STATE STOCKS (Conservational State Tensor per Cell)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS monad_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL,
    h3_index VARCHAR(15) NOT NULL REFERENCES h3_cells(h3_index) ON DELETE RESTRICT,
    -- Conservative stock scalar variables (First Law invariance)
    carbon_stock_mol DOUBLE PRECISION NOT NULL CHECK (carbon_stock_mol >= 0),
    nitrogen_stock_mol DOUBLE PRECISION NOT NULL CHECK (nitrogen_stock_mol >= 0),
    water_stock_kg DOUBLE PRECISION NOT NULL CHECK (water_stock_kg >= 0),
    phosphorus_stock_mol DOUBLE PRECISION NOT NULL CHECK (phosphorus_stock_mol >= 0),
    thermal_energy_joules DOUBLE PRECISION NOT NULL CHECK (thermal_energy_joules >= 0),
    -- Local intensive variables
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin > 0),
    state_entropy_j_k DOUBLE PRECISION NOT NULL,
    state_hash BYTEA NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_monad_stock_cell_height UNIQUE (h3_index, block_height)
);

CREATE INDEX IF NOT EXISTS idx_monad_stocks_height ON monad_stocks(block_height);
CREATE INDEX IF NOT EXISTS idx_monad_stocks_cell ON monad_stocks(h3_index);

-- ----------------------------------------------------------------------------
-- 3. TANGENT SPACE ADVECTION VECTORS (RFC-060 Orthogonal Velocity Projections)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cell_advection_vectors (
    vector_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL,
    h3_index VARCHAR(15) NOT NULL REFERENCES h3_cells(h3_index) ON DELETE RESTRICT,
    -- Raw 3D Cartesian unconstrained velocity v in R^3 (m/s)
    raw_vx DOUBLE PRECISION NOT NULL,
    raw_vy DOUBLE PRECISION NOT NULL,
    raw_vz DOUBLE PRECISION NOT NULL,
    -- Orthogonally projected tangential velocity v_perp in T_p S^2 (m/s)
    tangent_vx DOUBLE PRECISION NOT NULL,
    tangent_vy DOUBLE PRECISION NOT NULL,
    tangent_vz DOUBLE PRECISION NOT NULL,
    -- Filtered radial component v_parallel = ((v . p) / ||p||^2) * p (m/s)
    radial_vx DOUBLE PRECISION NOT NULL,
    radial_vy DOUBLE PRECISION NOT NULL,
    radial_vz DOUBLE PRECISION NOT NULL,
    -- Diagnostic scalar invariants
    radial_magnitude DOUBLE PRECISION NOT NULL CHECK (radial_magnitude >= 0),
    tangential_magnitude DOUBLE PRECISION NOT NULL CHECK (tangential_magnitude >= 0),
    -- Orthogonality residual: (v_perp . p) / (||v_perp|| * ||p|| + eps)
    orthogonal_residual DOUBLE PRECISION NOT NULL,
    is_strictly_tangent BOOLEAN NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_orthogonality_invariant CHECK (ABS(orthogonal_residual) < 1e-6),
    CONSTRAINT uq_cell_advection_height UNIQUE (h3_index, block_height)
);

CREATE INDEX IF NOT EXISTS idx_cell_advection_height ON cell_advection_vectors(block_height);

-- ----------------------------------------------------------------------------
-- 4. ADJACENCY INTER-CELL FLUX TRANSACTIONS (Finite-Volume Facet Fluxes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS advective_facet_fluxes (
    flux_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL,
    source_h3_index VARCHAR(15) NOT NULL REFERENCES h3_cells(h3_index) ON DELETE RESTRICT,
    target_h3_index VARCHAR(15) NOT NULL REFERENCES h3_cells(h3_index) ON DELETE RESTRICT,
    -- Directed edge normal and geodesic arc metrics
    facet_length_m DOUBLE PRECISION NOT NULL CHECK (facet_length_m > 0),
    normal_flux_velocity DOUBLE PRECISION NOT NULL, -- Dot product of v_perp with facet outward unit normal
    -- Conservative advective mass and energy flows (J_c = c * v_perp - D * grad_S2(c))
    carbon_flux_mol DOUBLE PRECISION NOT NULL,
    nitrogen_flux_mol DOUBLE PRECISION NOT NULL,
    water_flux_kg DOUBLE PRECISION NOT NULL,
    phosphorus_flux_mol DOUBLE PRECISION NOT NULL,
    energy_flux_joules DOUBLE PRECISION NOT NULL,
    -- Second Law: Positive-definite dissipation entropy generation (sigma >= 0)
    entropy_dissipation_joules_per_kelvin DOUBLE PRECISION NOT NULL CHECK (entropy_dissipation_joules_per_kelvin >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_source_target_distinct CHECK (source_h3_index <> target_h3_index)
);

CREATE INDEX IF NOT EXISTS idx_facet_flux_height ON advective_facet_fluxes(block_height);
CREATE INDEX IF NOT EXISTS idx_facet_flux_source ON advective_facet_fluxes(source_h3_index);
CREATE INDEX IF NOT EXISTS idx_facet_flux_target ON advective_facet_fluxes(target_h3_index);

-- ----------------------------------------------------------------------------
-- 5. THERMODYNAMIC AUDIT TRAIL & LEAKAGE VERIFICATION (RFC-060 Diagnostics)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tangent_projection_audits (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL,
    h3_index VARCHAR(15) NOT NULL REFERENCES h3_cells(h3_index) ON DELETE RESTRICT,
    vector_dot_origin DOUBLE PRECISION NOT NULL,
    origin_norm_squared DOUBLE PRECISION NOT NULL CHECK (origin_norm_squared > 0),
    radial_scale_factor DOUBLE PRECISION NOT NULL,
    energy_norm_conservation_error DOUBLE PRECISION NOT NULL,
    boundary_leakage_detected BOOLEAN NOT NULL DEFAULT FALSE,
    audit_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_zero_boundary_leakage CHECK (boundary_leakage_detected = FALSE)
);

CREATE INDEX IF NOT EXISTS idx_projection_audit_height ON tangent_projection_audits(block_height);

-- ----------------------------------------------------------------------------
-- 6. THERMODYNAMIC BLOCKCHAIN LEDGER: State Commitment & Transaction Blocks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    previous_block_hash BYTEA NOT NULL,
    block_hash BYTEA NOT NULL UNIQUE,
    state_merkle_root BYTEA NOT NULL,
    flux_receipts_root BYTEA NOT NULL,
    tangent_audit_root BYTEA NOT NULL,
    -- Global thermodynamic conservation balances (Sum over S^2)
    total_carbon_mol DOUBLE PRECISION NOT NULL,
    total_nitrogen_mol DOUBLE PRECISION NOT NULL,
    total_water_kg DOUBLE PRECISION NOT NULL,
    total_phosphorus_mol DOUBLE PRECISION NOT NULL,
    total_energy_joules DOUBLE PRECISION NOT NULL,
    total_entropy_production_jk DOUBLE PRECISION NOT NULL CHECK (total_entropy_production_jk >= 0),
    -- Solar input irradiance forcing during this time step dt
    solar_irradiance_joules DOUBLE PRECISION NOT NULL CHECK (solar_irradiance_joules >= 0),
    -- Cryptographic consensus & signatures
    validator_node_id VARCHAR(66) NOT NULL,
    validator_signature BYTEA NOT NULL,
    time_delta_seconds DOUBLE PRECISION NOT NULL CHECK (time_delta_seconds > 0),
    finalized_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. BLOCKCHAIN STATE TRANSITION TRANSACTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_transactions (
    tx_hash BYTEA PRIMARY KEY,
    block_height BIGINT NOT NULL REFERENCES thermodynamic_blocks(block_height) ON DELETE CASCADE,
    sender_identity VARCHAR(66) NOT NULL,
    target_h3_index VARCHAR(15) NOT NULL REFERENCES h3_cells(h3_index) ON DELETE RESTRICT,
    tx_type VARCHAR(32) NOT NULL CHECK (tx_type IN ('METABOLIC_FLUX', 'TANGENT_ADVECTION', 'SOLAR_INPUT', 'ENTROPY_DISSIPATION')),
    stock_delta_carbon DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    stock_delta_nitrogen DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    stock_delta_water DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    stock_delta_phosphorus DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    stock_delta_energy DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    gas_consumed_entropy_units DOUBLE PRECISION NOT NULL CHECK (gas_consumed_entropy_units >= 0),
    tx_nonce BIGINT NOT NULL,
    signature BYTEA NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thermo_tx_block ON thermodynamic_transactions(block_height);
CREATE INDEX IF NOT EXISTS idx_thermo_tx_cell ON thermodynamic_transactions(target_h3_index);