-- ============================================================================
-- Web of Life: Planetary Thermodynamic Blockchain & Spatial Grid Schema
-- Sprint 052: 3D Cartesian Spherical Unit Vector Projection & Solar Insolation
-- ============================================================================

-- Extensions for spatial and cryptographic integrity
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Discrete Global Grid System (DGGS) Cells & Cartesian Vectors
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dggs_cells (
    h3_index             BIGINT PRIMARY KEY,
    h3_index_hex         VARCHAR(16) NOT NULL UNIQUE,
    resolution           SMALLINT NOT NULL CHECK (resolution >= 0 AND resolution <= 15),
    latitude_deg         NUMERIC(10, 7) NOT NULL CHECK (latitude_deg >= -90.0 AND latitude_deg <= 90.0),
    longitude_deg        NUMERIC(10, 7) NOT NULL CHECK (longitude_deg >= -180.0 AND longitude_deg <= 180.0),
    
    -- 3D Cartesian Unit Vector Components on S^2 (||u|| = 1.0)
    u_x                  DOUBLE PRECISION NOT NULL,
    u_y                  DOUBLE PRECISION NOT NULL,
    u_z                  DOUBLE PRECISION NOT NULL,
    
    surface_area_m2      DOUBLE PRECISION NOT NULL CHECK (surface_area_m2 > 0.0),
    is_pentagon          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Numerical tolerance invariant: | ||u||^2 - 1.0 | <= 1e-6
    CONSTRAINT chk_unit_vector_norm 
        CHECK ((u_x * u_x + u_y * u_y + u_z * u_z) BETWEEN 0.999999 AND 1.000001)
);

CREATE INDEX IF NOT EXISTS idx_dggs_cells_res ON dggs_cells(resolution);
CREATE INDEX IF NOT EXISTS idx_dggs_cells_vector ON dggs_cells(u_x, u_y, u_z);

-- ----------------------------------------------------------------------------
-- 2. Hexagonal Adjacency Topology & Chord Metric Invariant
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dggs_cell_adjacencies (
    origin_h3            BIGINT NOT NULL REFERENCES dggs_cells(h3_index) ON DELETE RESTRICT,
    destination_h3       BIGINT NOT NULL REFERENCES dggs_cells(h3_index) ON DELETE RESTRICT,
    direction_index      SMALLINT NOT NULL CHECK (direction_index BETWEEN 0 AND 5),
    
    -- Precomputed Geodesic & Chord Metrics
    chord_distance       DOUBLE PRECISION NOT NULL CHECK (chord_distance > 0.0 AND chord_distance <= 2.0),
    angular_distance_rad DOUBLE PRECISION NOT NULL CHECK (angular_distance_rad > 0.0 AND angular_distance_rad <= PI()),
    geodesic_length_m    DOUBLE PRECISION NOT NULL CHECK (geodesic_length_m > 0.0),
    
    -- Tangent normal vector (t_ij = (u_j - u_i) / ||u_j - u_i||)
    tangent_x            DOUBLE PRECISION NOT NULL,
    tangent_y            DOUBLE PRECISION NOT NULL,
    tangent_z            DOUBLE PRECISION NOT NULL,

    PRIMARY KEY (origin_h3, destination_h3),
    CONSTRAINT chk_distinct_neighbors CHECK (origin_h3 <> destination_h3),
    CONSTRAINT chk_tangent_unit_norm 
        CHECK ((tangent_x * tangent_x + tangent_y * tangent_y + tangent_z * tangent_z) BETWEEN 0.999999 AND 1.000001)
);

CREATE INDEX IF NOT EXISTS idx_adjacencies_dest ON dggs_cell_adjacencies(destination_h3);

-- ----------------------------------------------------------------------------
-- 3. Ephemeris & Subsolar Vector Coordinates (Blockchain State Anchor)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ephemeris_epochs (
    epoch_timestamp      BIGINT PRIMARY KEY, -- UNIX seconds
    subsolar_u_x         DOUBLE PRECISION NOT NULL,
    subsolar_u_y         DOUBLE PRECISION NOT NULL,
    subsolar_u_z         DOUBLE PRECISION NOT NULL,
    solar_constant_w_m2  DOUBLE PRECISION NOT NULL DEFAULT 1361.0 CHECK (solar_constant_w_m2 > 0.0),
    solar_declination_rad DOUBLE PRECISION NOT NULL,
    right_ascension_rad  DOUBLE PRECISION NOT NULL,

    CONSTRAINT chk_subsolar_unit_norm 
        CHECK ((subsolar_u_x * subsolar_u_x + subsolar_u_y * subsolar_u_y + subsolar_u_z * subsolar_u_z) BETWEEN 0.999999 AND 1.000001)
);

-- ----------------------------------------------------------------------------
-- 4. Thermodynamic Planetary Cell State Tensor (Time-Series Monad Store)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cell_thermodynamic_states (
    state_id             BIGSERIAL PRIMARY KEY,
    h3_index             BIGINT NOT NULL REFERENCES dggs_cells(h3_index) ON DELETE RESTRICT,
    epoch_timestamp      BIGINT NOT NULL REFERENCES ephemeris_epochs(epoch_timestamp) ON DELETE RESTRICT,
    
    -- Local Thermodynamic Stock Variables
    cos_zenith           DOUBLE PRECISION NOT NULL CHECK (cos_zenith >= 0.0 AND cos_zenith <= 1.0),
    albedo               DOUBLE PRECISION NOT NULL CHECK (albedo >= 0.0 AND albedo <= 1.0),
    atm_transmissivity   DOUBLE PRECISION NOT NULL CHECK (atm_transmissivity >= 0.0 AND atm_transmissivity <= 1.0),
    
    -- Insolation Flux Density & Energy Integral
    solar_flux_density   DOUBLE PRECISION NOT NULL CHECK (solar_flux_density >= 0.0), -- W/m^2
    solar_influx_joules  DOUBLE PRECISION NOT NULL CHECK (solar_influx_joules >= 0.0), -- J over dt
    
    -- State Variables
    internal_energy_j    DOUBLE PRECISION NOT NULL,
    temperature_kelvin   DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin >= 0.0),
    entropy_j_per_k      DOUBLE PRECISION NOT NULL,
    
    CONSTRAINT uq_cell_epoch UNIQUE (h3_index, epoch_timestamp)
);

CREATE INDEX IF NOT EXISTS idx_cell_states_epoch ON cell_thermodynamic_states(epoch_timestamp);
CREATE INDEX IF NOT EXISTS idx_cell_states_h3 ON cell_thermodynamic_states(h3_index);

-- ----------------------------------------------------------------------------
-- 5. Thermodynamic Advective Inter-Cell Flows & Entropy Production Ledger
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inter_cell_flux_ledger (
    flux_id              BIGSERIAL PRIMARY KEY,
    epoch_timestamp      BIGINT NOT NULL REFERENCES ephemeris_epochs(epoch_timestamp) ON DELETE RESTRICT,
    origin_h3            BIGINT NOT NULL REFERENCES dggs_cells(h3_index) ON DELETE RESTRICT,
    destination_h3       BIGINT NOT NULL REFERENCES dggs_cells(h3_index) ON DELETE RESTRICT,
    
    -- Advective Transfer Quantities
    mass_flux_kg_per_s   DOUBLE PRECISION NOT NULL,
    heat_flux_watts      DOUBLE PRECISION NOT NULL,
    
    -- Thermodynamic Invariants: Second Law Enforcement (dS/dt >= 0)
    entropy_prod_rate    DOUBLE PRECISION NOT NULL CHECK (entropy_prod_rate >= 0.0),
    gibbs_free_energy_j  DOUBLE PRECISION NOT NULL,

    CONSTRAINT fk_flux_adjacency FOREIGN KEY (origin_h3, destination_h3) 
        REFERENCES dggs_cell_adjacencies(origin_h3, destination_h3) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_flux_epoch ON inter_cell_flux_ledger(epoch_timestamp);

-- ----------------------------------------------------------------------------
-- 6. Thermodynamic Proof-of-Conservation Blockchain Integration
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_height         BIGINT PRIMARY KEY,
    block_hash           VARCHAR(64) NOT NULL UNIQUE,
    parent_hash          VARCHAR(64) NOT NULL,
    epoch_timestamp      BIGINT NOT NULL REFERENCES ephemeris_epochs(epoch_timestamp) ON DELETE RESTRICT,
    
    -- Cryptographic Accumulators
    state_merkle_root    VARCHAR(64) NOT NULL,
    flux_merkle_root     VARCHAR(64) NOT NULL,
    
    -- Thermodynamic Global Boundary Proofs
    total_solar_influx_j DOUBLE PRECISION NOT NULL CHECK (total_solar_influx_j >= 0.0),
    total_dissipation_j  DOUBLE PRECISION NOT NULL CHECK (total_dissipation_j >= 0.0),
    net_energy_delta_j   DOUBLE PRECISION NOT NULL,
    total_entropy_gen    DOUBLE PRECISION NOT NULL CHECK (total_entropy_gen >= 0.0),
    
    -- First Law Conservation Verification: Influx - Outflux - dU == 0
    first_law_residual_j DOUBLE PRECISION NOT NULL,
    is_conserved         BOOLEAN NOT NULL GENERATED ALWAYS AS (abs(first_law_residual_j) < 1e-4) STORED,
    
    validator_pubkey     VARCHAR(66) NOT NULL,
    signature            VARCHAR(130) NOT NULL,
    mined_at             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blocks_epoch ON blockchain_blocks(epoch_timestamp);

-- ----------------------------------------------------------------------------
-- 7. Automated Trigger: Dynamic Cartesian Vector Unit-Normalization
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_enforce_unit_vector_normalization()
RETURNS TRIGGER AS $$
DECLARE
    v_norm DOUBLE PRECISION;
BEGIN
    v_norm := sqrt(NEW.u_x * NEW.u_x + NEW.u_y * NEW.u_y + NEW.u_z * NEW.u_z);
    
    IF v_norm = 0.0 THEN
        RAISE EXCEPTION 'Unit vector norm cannot be zero for cell %', NEW.h3_index;
    END IF;
    
    -- Normalize coordinates explicitly to mitigate floating-point drift
    NEW.u_x := NEW.u_x / v_norm;
    NEW.u_y := NEW.u_y / v_norm;
    NEW.u_z := NEW.u_z / v_norm;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_cell_vector ON dggs_cells;
CREATE TRIGGER trg_normalize_cell_vector
    BEFORE INSERT OR UPDATE OF u_x, u_y, u_z ON dggs_cells
    FOR EACH ROW
    EXECUTE FUNCTION trg_enforce_unit_vector_normalization();