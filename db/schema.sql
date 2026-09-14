-- ============================================================================
-- Web of Life: Planetary Thermodynamic Blockchain & Spatial Ledger Schema
-- Sprint 042: H3CellThermodynamicState & Spatial State Tensor Integration
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;

-- ----------------------------------------------------------------------------
-- Domain Types & Validations
-- ----------------------------------------------------------------------------
CREATE DOMAIN h3_index_t AS VARCHAR(16)
    CHECK (VALUE ~ '^[0-9a-fA-F]{15,16}$');

CREATE DOMAIN sha256_hash_t AS CHAR(64)
    CHECK (VALUE ~ '^[0-9a-fA-F]{64}$');

CREATE DOMAIN unit_interval_t AS NUMERIC(8, 7)
    CHECK (VALUE >= 0.0000000 AND VALUE <= 1.0000000);

-- ----------------------------------------------------------------------------
-- Base Table: H3 Spatial Topography & Geometry
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_spatial_cells (
    h3_index            h3_index_t PRIMARY KEY,
    resolution          SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    area_m2             NUMERIC(18, 4) NOT NULL CHECK (area_m2 > 0),
    elevation_m         NUMERIC(10, 3) NOT NULL,
    centroid_lat        NUMERIC(10, 7) NOT NULL CHECK (centroid_lat BETWEEN -90 AND 90),
    centroid_lon        NUMERIC(11, 7) NOT NULL CHECK (centroid_lon BETWEEN -180 AND 180),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

CREATE INDEX IF NOT EXISTS idx_h3_spatial_cells_res ON h3_spatial_cells(resolution);

-- ----------------------------------------------------------------------------
-- Blockchain Block Ledger Header
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_height        BIGINT PRIMARY KEY,
    block_hash          sha256_hash_t NOT NULL UNIQUE,
    previous_block_hash sha256_hash_t NOT NULL,
    epoch_tick          BIGINT NOT NULL,
    timestamp           TIMESTAMPTZ NOT NULL,
    tensor_merkle_root  sha256_hash_t NOT NULL,
    total_cells         INTEGER NOT NULL CHECK (total_cells > 0),
    total_internal_energy_j NUMERIC(38, 6) NOT NULL,
    total_entropy_j_k   NUMERIC(38, 6) NOT NULL,
    total_mass_kg       NUMERIC(38, 6) NOT NULL,
    entropy_production_rate_w_k NUMERIC(38, 6) NOT NULL CHECK (entropy_production_rate_w_k >= 0),
    validator_pubkey    TEXT NOT NULL,
    signature           TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);

CREATE INDEX IF NOT EXISTS idx_blockchain_blocks_epoch ON blockchain_blocks(epoch_tick);
CREATE INDEX IF NOT EXISTS idx_blockchain_blocks_timestamp ON blockchain_blocks(timestamp DESC);

-- ----------------------------------------------------------------------------
-- Discrete Hexagonal Thermodynamic State (Hypertable / Ledger Records)
-- Directly aligns with H3CellThermodynamicState & H3CellThermodynamicRecord
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_cell_thermodynamic_states (
    state_id                    UUID NOT NULL DEFAULT uuid_generate_v4(),
    block_height                BIGINT NOT NULL REFERENCES blockchain_blocks(block_height) ON DELETE RESTRICT,
    timestamp                   TIMESTAMPTZ NOT NULL,
    h3_index                    h3_index_t NOT NULL REFERENCES h3_spatial_cells(h3_index) ON DELETE RESTRICT,
    area_m2                     NUMERIC(18, 4) NOT NULL CHECK (area_m2 > 0),
    elevation_m                 NUMERIC(10, 3) NOT NULL,

    -- Thermal & Energetic Scalar Properties
    internal_energy_j           NUMERIC(24, 6) NOT NULL,
    temperature_k               NUMERIC(12, 6) NOT NULL CHECK (temperature_k > 0.0),
    heat_capacity_j_k           NUMERIC(22, 6) NOT NULL CHECK (heat_capacity_j_k > 0.0),
    albedo                      unit_interval_t NOT NULL,
    emissivity                  unit_interval_t NOT NULL,

    -- Radiative & Thermal Fluxes (W / m^2)
    shortwave_in_wm2            NUMERIC(14, 6) NOT NULL CHECK (shortwave_in_wm2 >= 0),
    shortwave_out_wm2           NUMERIC(14, 6) NOT NULL CHECK (shortwave_out_wm2 >= 0),
    longwave_out_wm2            NUMERIC(14, 6) NOT NULL CHECK (longwave_out_wm2 >= 0),
    sensible_heat_flux_wm2      NUMERIC(14, 6) NOT NULL,
    latent_heat_flux_wm2        NUMERIC(14, 6) NOT NULL,

    -- Entropy State
    entropy_j_per_k             NUMERIC(24, 6) NOT NULL,
    entropy_production_rate_jks NUMERIC(18, 8) NOT NULL CHECK (entropy_production_rate_jks >= 0.0),

    -- Elemental & Conserved Mass Stocks (kg)
    dry_air_mass_kg             NUMERIC(20, 6) NOT NULL CHECK (dry_air_mass_kg >= 0),
    total_water_mass_kg         NUMERIC(20, 6) NOT NULL CHECK (total_water_mass_kg >= 0),
    liquid_water_mass_kg        NUMERIC(20, 6) NOT NULL CHECK (liquid_water_mass_kg >= 0),
    ice_mass_kg                 NUMERIC(20, 6) NOT NULL CHECK (ice_mass_kg >= 0),
    vapor_mass_kg               NUMERIC(20, 6) NOT NULL CHECK (vapor_mass_kg >= 0),
    carbon_mass_kg              NUMERIC(20, 6) NOT NULL CHECK (carbon_mass_kg >= 0),
    nitrogen_mass_kg            NUMERIC(20, 6) NOT NULL CHECK (nitrogen_mass_kg >= 0),
    phosphorus_mass_kg          NUMERIC(20, 6) NOT NULL CHECK (phosphorus_mass_kg >= 0),

    -- Derived Totals and Invariants
    total_mass_kg               NUMERIC(22, 6) GENERATED ALWAYS AS (
        dry_air_mass_kg + total_water_mass_kg + carbon_mass_kg + nitrogen_mass_kg + phosphorus_mass_kg
    ) STORED,

    net_radiative_flux_wm2      NUMERIC(16, 6) GENERATED ALWAYS AS (
        shortwave_in_wm2 - shortwave_out_wm2 - longwave_out_wm2 - sensible_heat_flux_wm2 - latent_heat_flux_wm2
    ) STORED,

    -- Cryptographic leaf proof
    state_leaf_hash             sha256_hash_t NOT NULL,

    PRIMARY KEY (block_height, h3_index),

    -- Mass closure invariant: Water partitioning must balance total water mass
    CONSTRAINT chk_water_phase_closure CHECK (
        ABS(total_water_mass_kg - (liquid_water_mass_kg + ice_mass_kg + vapor_mass_kg))
        <= (1e-6 * total_water_mass_kg + 1e-5)
    )
);

-- Register as hypertable partitioned on block_height / timestamp if TimescaleDB active
CREATE INDEX IF NOT EXISTS idx_h3_cell_thermo_h3_time ON h3_cell_thermodynamic_states(h3_index, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_h3_cell_thermo_block ON h3_cell_thermodynamic_states(block_height);

-- ----------------------------------------------------------------------------
-- Inter-Cell Hexagonal Boundary Advective & Diffusive Flux Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_cell_boundary_flux_ledger (
    transaction_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height        BIGINT NOT NULL REFERENCES blockchain_blocks(block_height) ON DELETE RESTRICT,
    source_h3           h3_index_t NOT NULL REFERENCES h3_spatial_cells(h3_index),
    target_h3           h3_index_t NOT NULL REFERENCES h3_spatial_cells(h3_index),
    energy_flux_j       NUMERIC(20, 6) NOT NULL,
    water_flux_kg       NUMERIC(18, 6) NOT NULL,
    carbon_flux_kg      NUMERIC(18, 6) NOT NULL,
    nitrogen_flux_kg    NUMERIC(18, 6) NOT NULL,
    phosphorus_flux_kg  NUMERIC(18, 6) NOT NULL,
    entropy_transfer_j_k NUMERIC(20, 6) NOT NULL,
    tx_signature        TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP(),

    CONSTRAINT chk_distinct_cells CHECK (source_h3 <> target_h3)
);

CREATE INDEX IF NOT EXISTS idx_boundary_flux_block ON h3_cell_boundary_flux_ledger(block_height);
CREATE INDEX IF NOT EXISTS idx_boundary_flux_edge ON h3_cell_boundary_flux_ledger(source_h3, target_h3);

-- ----------------------------------------------------------------------------
-- Spatial Monad Snapshot Ledger: Verifies Global Thermodynamic Conservations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spatial_tensor_ledger_commitments (
    commitment_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height        BIGINT NOT NULL UNIQUE REFERENCES blockchain_blocks(block_height),
    tensor_root_hash    sha256_hash_t NOT NULL,
    computed_total_u_j  NUMERIC(38, 6) NOT NULL,
    computed_total_m_kg NUMERIC(38, 6) NOT NULL,
    computed_total_s_jk NUMERIC(38, 6) NOT NULL,
    first_law_delta_u   NUMERIC(24, 6) NOT NULL,
    first_law_residual_norm NUMERIC(16, 8) NOT NULL CHECK (first_law_residual_norm <= 1e-5),
    second_law_entropy_rate NUMERIC(24, 8) NOT NULL CHECK (second_law_entropy_rate >= 0),
    is_conserved        BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_conserved = TRUE),
    verified_at         TIMESTAMPTZ NOT NULL DEFAULT CLOCK_TIMESTAMP()
);