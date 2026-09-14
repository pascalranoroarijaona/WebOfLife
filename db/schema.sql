-- ============================================================================
-- Web of Life Thermodynamic Blockchain & Spatial Subsystem Schema
-- Sprint 051: H3CellInterfaceMetrics & Finite-Volume Boundary Transfer Ledger
-- ============================================================================

-- Extensions for spatial computations and cryptographic hashing
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Base Blockchain & Ledger Constructs
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blockchain_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash CHAR(64) NOT NULL UNIQUE,
    parent_hash CHAR(64) NOT NULL,
    merkle_root CHAR(64) NOT NULL,
    state_root CHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_entropy_generated_j_per_k NUMERIC(24, 8) NOT NULL CHECK (total_entropy_generated_j_per_k >= 0),
    net_enthalpy_variance_joules NUMERIC(24, 8) NOT NULL DEFAULT 0.0 CHECK (ABS(net_enthalpy_variance_joules) <= 1e-6),
    validator_signature BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blockchain_blocks_timestamp 
    ON blockchain_blocks (timestamp DESC);

CREATE TABLE IF NOT EXISTS blockchain_transactions (
    tx_hash CHAR(64) PRIMARY KEY,
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(block_height) ON DELETE CASCADE,
    tx_type VARCHAR(64) NOT NULL,
    sender_account CHAR(42) NOT NULL,
    recipient_account CHAR(42) NOT NULL,
    state_delta_hash CHAR(64) NOT NULL,
    signature BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blockchain_tx_block 
    ON blockchain_transactions(block_height);

-- ----------------------------------------------------------------------------
-- 2. Spatial DGGS: H3 Discrete Global Grid Cells
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS h3_cells (
    cell_index VARCHAR(15) PRIMARY KEY CHECK (cell_index ~ '^[0-9a-fA-F]{15}$'),
    resolution SMALLINT NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    centroid_latitude NUMERIC(10, 7) NOT NULL CHECK (centroid_latitude BETWEEN -90.0 AND 90.0),
    centroid_longitude NUMERIC(11, 7) NOT NULL CHECK (centroid_longitude BETWEEN -180.0 AND 180.0),
    elevation_meters NUMERIC(8, 2) NOT NULL DEFAULT 0.0,
    surface_area_m2 NUMERIC(18, 4) NOT NULL CHECK (surface_area_m2 > 0),
    is_pentagon BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_h3_cells_resolution 
    ON h3_cells(resolution);

-- ----------------------------------------------------------------------------
-- 3. H3 Cell Interface Metrics (RFC-051)
-- Captures the physical, geometric, and topological attributes of the shared 
-- boundary between topologically adjacent H3 cells.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS h3_cell_interfaces (
    edge_id VARCHAR(31) PRIMARY KEY, -- Format: originIndex:neighborIndex
    origin_index VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index) ON DELETE CASCADE,
    neighbor_index VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index) ON DELETE CASCADE,
    shared_edge_length_meters NUMERIC(12, 4) NOT NULL CHECK (shared_edge_length_meters > 0),
    centroid_distance_meters NUMERIC(12, 4) NOT NULL CHECK (centroid_distance_meters > 0),
    bearing_radians NUMERIC(9, 8) NOT NULL CHECK (bearing_radians >= 0.0 AND bearing_radians < 2.0 * PI()),
    normal_vector_east NUMERIC(9, 8) NOT NULL,
    normal_vector_north NUMERIC(9, 8) NOT NULL,
    normal_vector_up NUMERIC(9, 8) NOT NULL,
    atmospheric_contact_area_m2 NUMERIC(16, 4) NOT NULL CHECK (atmospheric_contact_area_m2 >= 0),
    subterranean_contact_area_m2 NUMERIC(16, 4) NOT NULL CHECK (subterranean_contact_area_m2 >= 0),
    topographic_slope NUMERIC(10, 6) NOT NULL,
    geometric_conductance NUMERIC(14, 8) NOT NULL CHECK (geometric_conductance > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Invariants: Origin and neighbor must be distinct
    CONSTRAINT chk_h3_interface_distinct_cells CHECK (origin_index <> neighbor_index),
    -- Edge ID format consistency
    CONSTRAINT chk_h3_edge_id_format CHECK (edge_id = origin_index || ':' || neighbor_index),
    -- Normal vector Euclidean length ~ 1.0 (unit vector in local ENU frame)
    CONSTRAINT chk_h3_normal_vector_unit_norm CHECK (
        ABS((normal_vector_east * normal_vector_east + 
             normal_vector_north * normal_vector_north + 
             normal_vector_up * normal_vector_up) - 1.0) < 1e-4
    ),
    -- Conductance definition: L / d
    CONSTRAINT chk_h3_geometric_conductance CHECK (
        ABS(geometric_conductance - (shared_edge_length_meters / centroid_distance_meters)) < 1e-4
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_h3_cell_interfaces_pair 
    ON h3_cell_interfaces (origin_index, neighbor_index);

CREATE INDEX IF NOT EXISTS idx_h3_cell_interfaces_origin 
    ON h3_cell_interfaces (origin_index);

CREATE INDEX IF NOT EXISTS idx_h3_cell_interfaces_neighbor 
    ON h3_cell_interfaces (neighbor_index);

-- ----------------------------------------------------------------------------
-- 4. Interface Reciprocity Audit & Invariant Triggers (INV-051-A..E)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_assert_h3_cell_interface_reciprocity()
RETURNS TRIGGER AS $$
DECLARE
    reciprocal_row RECORD;
BEGIN
    SELECT * INTO reciprocal_row
    FROM h3_cell_interfaces
    WHERE origin_index = NEW.neighbor_index AND neighbor_index = NEW.origin_index;

    IF reciprocal_row IS NOT NULL THEN
        -- INV-051-A: Reciprocity of Shared Length
        IF ABS(reciprocal_row.shared_edge_length_meters - NEW.shared_edge_length_meters) > 1e-3 THEN
            RAISE EXCEPTION 'INV-051-A Violation: Shared edge length mismatch between % and %', 
                NEW.origin_index, NEW.neighbor_index;
        END IF;

        -- INV-051-B: Reciprocity of Centroid Distance
        IF ABS(reciprocal_row.centroid_distance_meters - NEW.centroid_distance_meters) > 1e-3 THEN
            RAISE EXCEPTION 'INV-051-B Violation: Centroid distance mismatch between % and %', 
                NEW.origin_index, NEW.neighbor_index;
        END IF;

        -- INV-051-C: Normal Vector Inversion
        IF ABS(reciprocal_row.normal_vector_east + NEW.normal_vector_east) > 1e-3 OR
           ABS(reciprocal_row.normal_vector_north + NEW.normal_vector_north) > 1e-3 OR
           ABS(reciprocal_row.normal_vector_up + NEW.normal_vector_up) > 1e-3 THEN
            RAISE EXCEPTION 'INV-051-C Violation: Normal vector not anti-parallel between % and %', 
                NEW.origin_index, NEW.neighbor_index;
        END IF;

        -- INV-051-D: Slope Antisymmetry
        IF ABS(reciprocal_row.topographic_slope + NEW.topographic_slope) > 1e-4 THEN
            RAISE EXCEPTION 'INV-051-D Violation: Topographic slope not antisymmetric between % and %', 
                NEW.origin_index, NEW.neighbor_index;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_h3_cell_interface_reciprocity ON h3_cell_interfaces;
CREATE TRIGGER trg_h3_cell_interface_reciprocity
    AFTER INSERT OR UPDATE ON h3_cell_interfaces
    FOR EACH ROW
    EXECUTE FUNCTION trg_assert_h3_cell_interface_reciprocity();

-- ----------------------------------------------------------------------------
-- 5. Thermodynamic Boundary Flux Ledger
-- Records conservative cross-boundary flows (First & Second Laws)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS thermodynamic_interface_fluxes (
    flux_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_height BIGINT NOT NULL REFERENCES blockchain_blocks(block_height) ON DELETE CASCADE,
    tx_hash CHAR(64) NOT NULL REFERENCES blockchain_transactions(tx_hash) ON DELETE CASCADE,
    edge_id VARCHAR(31) NOT NULL REFERENCES h3_cell_interfaces(edge_id),
    origin_index VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index),
    neighbor_index VARCHAR(15) NOT NULL REFERENCES h3_cells(cell_index),
    epoch_timestamp TIMESTAMPTZ NOT NULL,
    
    -- Stock Transport Rates (Fluxes)
    enthalpy_flux_watts NUMERIC(18, 6) NOT NULL,            -- Thermal/internal energy flux (W)
    water_flux_kg_per_s NUMERIC(18, 6) NOT NULL,            -- Water mass transfer (kg/s)
    carbon_flux_kg_per_s NUMERIC(18, 6) NOT NULL,           -- Carbon mass transfer (kg/s)
    nutrient_flux_mol_per_s NUMERIC(18, 6) NOT NULL,        -- Nutrients (N, P) flux (mol/s)
    
    -- Driving Thermodynamic Potentials (for 2nd Law validation)
    origin_temperature_k NUMERIC(8, 3) NOT NULL CHECK (origin_temperature_k > 0),
    neighbor_temperature_k NUMERIC(8, 3) NOT NULL CHECK (neighbor_temperature_k > 0),
    entropy_production_rate_w_per_k NUMERIC(18, 6) NOT NULL CHECK (entropy_production_rate_w_per_k >= 0),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_flux_cells_match_edge CHECK (edge_id = origin_index || ':' || neighbor_index)
);

CREATE INDEX IF NOT EXISTS idx_interface_fluxes_block 
    ON thermodynamic_interface_fluxes(block_height);

CREATE INDEX IF NOT EXISTS idx_interface_fluxes_edge 
    ON thermodynamic_interface_fluxes(edge_id);

CREATE INDEX IF NOT EXISTS idx_interface_fluxes_origin_time 
    ON thermodynamic_interface_fluxes(origin_index, epoch_timestamp);

-- ----------------------------------------------------------------------------
-- 6. Spatial Finite-Volume Laplacian & Divergence View
-- Computes net divergence \nabla \cdot J over each H3 cell for thermodynamic audit
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW view_cell_flux_divergence AS
SELECT
    tif.block_height,
    tif.origin_index AS cell_index,
    COUNT(tif.neighbor_index) AS neighbor_count,
    SUM(tif.enthalpy_flux_watts) AS net_enthalpy_divergence_watts,
    SUM(tif.water_flux_kg_per_s) AS net_water_divergence_kg_per_s,
    SUM(tif.carbon_flux_kg_per_s) AS net_carbon_divergence_kg_per_s,
    SUM(tif.entropy_production_rate_w_per_k) AS total_cell_entropy_production_w_per_k
FROM thermodynamic_interface_fluxes tif
GROUP BY tif.block_height, tif.origin_index;

-- ----------------------------------------------------------------------------
-- 7. First Law Conservation Verification Trigger
-- Ensures pair-wise antisymmetry: Phi_{i->j} + Phi_{j->i} = 0 across block interfaces
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_assert_first_law_flux_antisymmetry()
RETURNS TRIGGER AS $$
DECLARE
    counter_flux RECORD;
BEGIN
    SELECT * INTO counter_flux
    FROM thermodynamic_interface_fluxes
    WHERE block_height = NEW.block_height
      AND origin_index = NEW.neighbor_index
      AND neighbor_index = NEW.origin_index;

    IF counter_flux IS NOT NULL THEN
        IF ABS(NEW.enthalpy_flux_watts + counter_flux.enthalpy_flux_watts) > 1e-4 THEN
            RAISE EXCEPTION 'First Law Violation: Enthalpy flux not antisymmetric across % -> %',
                NEW.origin_index, NEW.neighbor_index;
        END IF;
        IF ABS(NEW.water_flux_kg_per_s + counter_flux.water_flux_kg_per_s) > 1e-4 THEN
            RAISE EXCEPTION 'First Law Violation: Water flux not antisymmetric across % -> %',
                NEW.origin_index, NEW.neighbor_index;
        END IF;
        IF ABS(NEW.carbon_flux_kg_per_s + counter_flux.carbon_flux_kg_per_s) > 1e-4 THEN
            RAISE EXCEPTION 'First Law Violation: Carbon flux not antisymmetric across % -> %',
                NEW.origin_index, NEW.neighbor_index;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_thermodynamic_flux_antisymmetry ON thermodynamic_interface_fluxes;
CREATE TRIGGER trg_thermodynamic_flux_antisymmetry
    AFTER INSERT ON thermodynamic_interface_fluxes
    FOR EACH ROW
    EXECUTE FUNCTION trg_assert_first_law_flux_antisymmetry();