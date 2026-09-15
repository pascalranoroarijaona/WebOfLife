-- ============================================================================
-- Web of Life: Thermodynamic Blockchain & Spatial DGGS Ledger Schema
-- Sprint 072: Centroid-Relative Boundary Ordering & Outward-Normal Orientation
-- ============================================================================

-- Enable PostGIS and cryptographic extensions if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ----------------------------------------------------------------------------
-- 1. H3 DGGS SPATIAL CELL REGISTRY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_cells (
    cell_id VARCHAR(15) PRIMARY KEY, -- Canonical 64-bit H3 index in hex string format
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    centroid_lat DOUBLE PRECISION NOT NULL CHECK (centroid_lat BETWEEN -90.0 AND 90.0),
    centroid_lon DOUBLE PRECISION NOT NULL CHECK (centroid_lon BETWEEN -180.0 AND 180.0),
    centroid_x DOUBLE PRECISION NOT NULL, -- Cartesian unit sphere X (||C|| = 1)
    centroid_y DOUBLE PRECISION NOT NULL, -- Cartesian unit sphere Y
    centroid_z DOUBLE PRECISION NOT NULL, -- Cartesian unit sphere Z
    surface_area_m2 DOUBLE PRECISION NOT NULL CHECK (surface_area_m2 > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT h3_cell_unit_sphere_norm CHECK (
        ABS(SQRT(centroid_x * centroid_x + centroid_y * centroid_y + centroid_z * centroid_z) - 1.0) < 1e-7
    )
);

CREATE INDEX IF NOT EXISTS idx_h3_cells_resolution ON h3_cells(resolution);
CREATE INDEX IF NOT EXISTS idx_h3_cells_lat_lon ON h3_cells(centroid_lat, centroid_lon);

-- ----------------------------------------------------------------------------
-- 2. UNDIRECTED TOPOLOGICAL BOUNDARIES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_shared_boundaries (
    boundary_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cell_low_id VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_id),
    cell_high_id VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_id),
    raw_p1_x DOUBLE PRECISION NOT NULL,
    raw_p1_y DOUBLE PRECISION NOT NULL,
    raw_p1_z DOUBLE PRECISION NOT NULL,
    raw_p2_x DOUBLE PRECISION NOT NULL,
    raw_p2_y DOUBLE PRECISION NOT NULL,
    raw_p2_z DOUBLE PRECISION NOT NULL,
    geodesic_length_m DOUBLE PRECISION NOT NULL CHECK (geodesic_length_m > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT h3_canonical_cell_pair CHECK (cell_low_id < cell_high_id),
    CONSTRAINT h3_unique_boundary_pair UNIQUE (cell_low_id, cell_high_id)
);

CREATE INDEX IF NOT EXISTS idx_h3_shared_boundaries_cells ON h3_shared_boundaries(cell_low_id, cell_high_id);

-- ----------------------------------------------------------------------------
-- 3. ORIENTED SHARED BOUNDARY INTERFACES (Sprint 072 RFC Addition)
-- Implements outward-normal orientation and strict skew-symmetry
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS h3_directed_interfaces (
    interface_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    boundary_id UUID NOT NULL REFERENCES h3_shared_boundaries(boundary_id) ON DELETE CASCADE,
    source_cell_id VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_id),
    neighbor_cell_id VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_id),
    -- Ordered endpoints (V_start -> V_end) such that normal points source -> neighbor
    v_start_x DOUBLE PRECISION NOT NULL,
    v_start_y DOUBLE PRECISION NOT NULL,
    v_start_z DOUBLE PRECISION NOT NULL,
    v_end_x DOUBLE PRECISION NOT NULL,
    v_end_y DOUBLE PRECISION NOT NULL,
    v_end_z DOUBLE PRECISION NOT NULL,
    -- Normalized outward unit normal vector n_{A -> B}
    outward_normal_x DOUBLE PRECISION NOT NULL,
    outward_normal_y DOUBLE PRECISION NOT NULL,
    outward_normal_z DOUBLE PRECISION NOT NULL,
    interface_length_m DOUBLE PRECISION NOT NULL CHECK (interface_length_m > 0),
    alignment_dot_product DOUBLE PRECISION NOT NULL, -- n_{A->B} . (C_B - C_A) > 0 (INV-072-1)
    is_inverted BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_outward_orientation_positive CHECK (alignment_dot_product > 0),
    CONSTRAINT chk_unit_normal_magnitude CHECK (
        ABS(SQRT(outward_normal_x * outward_normal_x + outward_normal_y * outward_normal_y + outward_normal_z * outward_normal_z) - 1.0) < 1e-9
    ),
    CONSTRAINT chk_distinct_adjacent_cells CHECK (source_cell_id <> neighbor_cell_id),
    CONSTRAINT uq_directed_interface UNIQUE (source_cell_id, neighbor_cell_id)
);

CREATE INDEX IF NOT EXISTS idx_directed_interfaces_source ON h3_directed_interfaces(source_cell_id);
CREATE INDEX IF NOT EXISTS idx_directed_interfaces_neighbor ON h3_directed_interfaces(neighbor_cell_id);

-- ----------------------------------------------------------------------------
-- 4. THERMODYNAMIC STATE STOCKS (Finite Volume Cell Stocks)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cell_thermodynamic_stocks (
    stock_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cell_id VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_id),
    epoch_height BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    -- First Law Conserved Physical Stocks (Extensive Quantities)
    internal_energy_joules DOUBLE PRECISION NOT NULL CHECK (internal_energy_joules >= 0),
    water_mass_kg DOUBLE PRECISION NOT NULL CHECK (water_mass_kg >= 0),
    carbon_moles DOUBLE PRECISION NOT NULL CHECK (carbon_moles >= 0),
    nitrogen_moles DOUBLE PRECISION NOT NULL CHECK (nitrogen_moles >= 0),
    phosphorus_moles DOUBLE PRECISION NOT NULL CHECK (phosphorus_moles >= 0),
    biomass_dry_kg DOUBLE PRECISION NOT NULL CHECK (biomass_dry_kg >= 0),
    -- Intensive State Variables
    temperature_kelvin DOUBLE PRECISION NOT NULL CHECK (temperature_kelvin > 0),
    chemical_potential_j_per_mol DOUBLE PRECISION NOT NULL,
    -- Second Law Entropy Diagnostic
    accumulated_entropy_j_per_k DOUBLE PRECISION NOT NULL CHECK (accumulated_entropy_j_per_k >= 0),
    CONSTRAINT uq_cell_epoch UNIQUE (cell_id, epoch_height)
);

CREATE INDEX IF NOT EXISTS idx_cell_stocks_epoch ON cell_thermodynamic_stocks(epoch_height, cell_id);
CREATE INDEX IF NOT EXISTS idx_cell_stocks_time ON cell_thermodynamic_stocks(timestamp);

-- ----------------------------------------------------------------------------
-- 5. FINITE-VOLUME BOUNDARY FLUX LEDGER (SpatialFluxMonad Transitions)
-- ----------------------------------------------------------------------------
CREATE TYPE flux_carrier_type AS ENUM (
    'SENSIBLE_HEAT',
    'WATER_MASS',
    'CARBON_ADVECTIVE',
    'CARBON_DIFFUSIVE',
    'NITROGEN_TROPHIC',
    'PHOSPHORUS_TROPHIC',
    'BIOMASS_MIGRATION'
);

CREATE TABLE IF NOT EXISTS spatial_boundary_flux_ledger (
    flux_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    epoch_height BIGINT NOT NULL,
    interface_id UUID NOT NULL REFERENCES h3_directed_interfaces(interface_id),
    source_cell_id VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_id),
    neighbor_cell_id VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_id),
    carrier flux_carrier_type NOT NULL,
    -- Directed flux value Phi_{A -> B} evaluated via dot(F, n_{A->B}) * dl
    flux_density_per_meter DOUBLE PRECISION NOT NULL,
    total_flux_quantity DOUBLE PRECISION NOT NULL, -- integrated over interface_length_m * dt
    entropy_production_j_per_k DOUBLE PRECISION NOT NULL CHECK (entropy_production_j_per_k >= 0), -- Second Law: dot(sigma) >= 0
    delta_t_seconds DOUBLE PRECISION NOT NULL CHECK (delta_t_seconds > 0),
    execution_merkle_leaf BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boundary_flux_epoch ON spatial_boundary_flux_ledger(epoch_height, source_cell_id, neighbor_cell_id);
CREATE INDEX IF NOT EXISTS idx_boundary_flux_interface ON spatial_boundary_flux_ledger(interface_id);

-- ----------------------------------------------------------------------------
-- 6. FIRST LAW INTERFACE SKEW-SYMMETRY VERIFICATION AUDIT
-- Guarantees Phi(A -> B) + Phi(B -> A) = 0 identical across boundaries
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS boundary_skew_symmetry_audit (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    epoch_height BIGINT NOT NULL,
    boundary_id UUID NOT NULL REFERENCES h3_shared_boundaries(boundary_id),
    carrier flux_carrier_type NOT NULL,
    flux_ab DOUBLE PRECISION NOT NULL,
    flux_ba DOUBLE PRECISION NOT NULL,
    imbalance_residual DOUBLE PRECISION GENERATED ALWAYS AS (flux_ab + flux_ba) STORED,
    tolerance_threshold DOUBLE PRECISION NOT NULL DEFAULT 1e-12,
    is_conservative BOOLEAN GENERATED ALWAYS AS (ABS(flux_ab + flux_ba) <= 1e-12) STORED,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_interface_conservative CHECK (is_conservative = TRUE)
);

CREATE INDEX IF NOT EXISTS idx_audit_epoch_boundary ON boundary_skew_symmetry_audit(epoch_height, boundary_id);

-- ----------------------------------------------------------------------------
-- 7. THERMODYNAMIC BLOCKCHAIN CONSENSUS LAYER
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thermodynamic_blockchain_blocks (
    epoch_height BIGINT PRIMARY KEY,
    block_hash BYTEA NOT NULL UNIQUE,
    parent_block_hash BYTEA NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    state_root_merkle BYTEA NOT NULL,
    flux_receipts_root BYTEA NOT NULL,
    total_entropy_production_rate DOUBLE PRECISION NOT NULL CHECK (total_entropy_production_rate >= 0),
    first_law_residual_l2_norm DOUBLE PRECISION NOT NULL CHECK (first_law_residual_l2_norm <= 1e-9),
    proposer_public_key BYTEA NOT NULL,
    consensus_signature BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blockchain_blocks_timestamp ON thermodynamic_blockchain_blocks(timestamp);

-- ----------------------------------------------------------------------------
-- 8. TRIGGERS: AUTOMATIC DERIVATION & VALIDATION OF DIRECTED INTERFACES
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_enforce_outward_normal_direction()
RETURNS TRIGGER AS $$
DECLARE
    src_x DOUBLE PRECISION;
    src_y DOUBLE PRECISION;
    src_z DOUBLE PRECISION;
    nbr_x DOUBLE PRECISION;
    nbr_y DOUBLE PRECISION;
    nbr_z DOUBLE PRECISION;
    dx DOUBLE PRECISION;
    dy DOUBLE PRECISION;
    dz DOUBLE PRECISION;
    dot_prod DOUBLE PRECISION;
BEGIN
    SELECT centroid_x, centroid_y, centroid_z INTO src_x, src_y, src_z FROM h3_cells WHERE cell_id = NEW.source_cell_id;
    SELECT centroid_x, centroid_y, centroid_z INTO nbr_x, nbr_y, nbr_z FROM h3_cells WHERE cell_id = NEW.neighbor_cell_id;

    dx := nbr_x - src_x;
    dy := nbr_y - src_y;
    dz := nbr_z - src_z;

    dot_prod := (NEW.outward_normal_x * dx) + (NEW.outward_normal_y * dy) + (NEW.outward_normal_z * dz);

    IF dot_prod <= 0.0 THEN
        RAISE EXCEPTION 'INV-072-1 Violation: Interface outward normal must point from centroid A to centroid B. Dot product: %', dot_prod;
    END IF;

    NEW.alignment_dot_product := dot_prod;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_directed_interface_orientation ON h3_directed_interfaces;
CREATE TRIGGER check_directed_interface_orientation
    BEFORE INSERT OR UPDATE ON h3_directed_interfaces
    FOR EACH ROW
    EXECUTE FUNCTION trg_enforce_outward_normal_direction();