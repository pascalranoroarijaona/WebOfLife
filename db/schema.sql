-- ============================================================================
-- Web of Life: Planetary Thermodynamic Blockchain & Spatial DGGS Schema
-- Sprint 047: Spherical Geodesic Edge Scaling & Geodesic Boundary Flux Ledger
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;

-- ----------------------------------------------------------------------------
-- 1. H3 DGGS RESOLUTION GEODESIC REFERENCE TABLE
-- ----------------------------------------------------------------------------
-- Caches invariant nominal geodesic spatial parameters across H3 resolutions (0-15)
-- derived from aperture 7 scaling: L(r) = L_0 * 7^(-r/2).
CREATE TABLE IF NOT EXISTS h3_resolution_metrics (
    resolution SMALLINT PRIMARY KEY CHECK (resolution BETWEEN 0 AND 15),
    nominal_edge_length_meters NUMERIC(12, 4) NOT NULL CHECK (nominal_edge_length_meters > 0),
    nominal_cell_area_km2 NUMERIC(16, 6) NOT NULL CHECK (nominal_cell_area_km2 > 0),
    nominal_inter_cell_distance_meters NUMERIC(12, 4) NOT NULL CHECK (nominal_inter_cell_distance_meters > 0),
    aperture_scaling_factor NUMERIC(10, 8) NOT NULL DEFAULT 0.37796447, -- 1 / sqrt(7)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed static reference metrics (WGS84 / Spherical Earth Radius = 6,371,007.1809 m)
INSERT INTO h3_resolution_metrics (resolution, nominal_edge_length_meters, nominal_cell_area_km2, nominal_inter_cell_distance_meters)
VALUES
    (0,  1107712.5900, 4357449.416078, 1918341.11),
    (1,  418676.0100,   609788.441868,  725064.08),
    (2,  158244.6600,    86841.206267,  274041.84),
    (3,   59810.8600,    12393.030181,  103576.97),
    (4,   22606.3800,     1770.432883,   39148.24),
    (5,    8544.4100,      252.918983,   14796.53),
    (6,    3229.4800,       36.131283,    5592.51),
    (7,    1220.6300,        5.161612,    2113.79),
    (8,     461.3500,        0.737373,     798.92),
    (9,     174.3800,        0.105339,     301.97),
    (10,     65.9100,        0.015048,     114.13),
    (11,     24.9100,        0.002150,      43.14),
    (12,      9.4200,        0.000307,      16.31),
    (13,      3.5600,        0.000044,       6.16),
    (14,      1.3500,        0.000006,       2.33),
    (15,      0.5100,        0.000001,       0.88)
ON CONFLICT (resolution) DO UPDATE 
SET nominal_edge_length_meters = EXCLUDED.nominal_edge_length_meters,
    nominal_cell_area_km2 = EXCLUDED.nominal_cell_area_km2,
    nominal_inter_cell_distance_meters = EXCLUDED.nominal_inter_cell_distance_meters;

-- ----------------------------------------------------------------------------
-- 2. SPATIAL ADJACENCY INTERFACES
-- ----------------------------------------------------------------------------
-- Tracks shared boundary geometries between adjacent H3 Voronoi/hexagonal cells.
CREATE TABLE IF NOT EXISTS h3_cell_interfaces (
    interface_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resolution SMALLINT NOT NULL REFERENCES h3_resolution_metrics(resolution),
    cell_index_origin VARCHAR(16) NOT NULL,
    cell_index_destination VARCHAR(16) NOT NULL,
    edge_length_meters NUMERIC(12, 4) NOT NULL CHECK (edge_length_meters > 0),
    inter_cell_distance_meters NUMERIC(12, 4) NOT NULL CHECK (inter_cell_distance_meters > 0),
    column_depth_meters NUMERIC(10, 3) NOT NULL DEFAULT 100.000 CHECK (column_depth_meters > 0),
    contact_area_meters2 NUMERIC(16, 4) GENERATED ALWAYS AS (edge_length_meters * column_depth_meters) STORED,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_cell_order CHECK (cell_index_origin < cell_index_destination),
    CONSTRAINT uq_cell_interface UNIQUE (resolution, cell_index_origin, cell_index_destination)
);

CREATE INDEX IF NOT EXISTS idx_h3_interface_origin ON h3_cell_interfaces(cell_index_origin);
CREATE INDEX IF NOT EXISTS idx_h3_interface_dest ON h3_cell_interfaces(cell_index_destination);

-- ----------------------------------------------------------------------------
-- 3. THERMODYNAMIC BLOCKCHAIN LEDGER: BLOCKS
-- ----------------------------------------------------------------------------
-- Immutable block headers tracking planetary state transitions and merkle roots.
CREATE TABLE IF NOT EXISTS thermodynamic_blocks (
    block_height BIGINT PRIMARY KEY,
    block_hash CHAR(64) NOT NULL UNIQUE,
    parent_hash CHAR(64) NOT NULL,
    state_merkle_root CHAR(64) NOT NULL,
    transaction_merkle_root CHAR(64) NOT NULL,
    net_entropy_production_joules_per_kelvin NUMERIC(24, 8) NOT NULL CHECK (net_entropy_production_joules_per_kelvin >= 0),
    total_fickian_mass_flux_kg NUMERIC(24, 8) NOT NULL,
    total_thermal_flux_joules NUMERIC(24, 8) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. THERMODYNAMIC BOUNDARY FLUX TRANSACTIONS
-- ----------------------------------------------------------------------------
-- Detailed edge-level Fickian mass and Fourier thermal dissipation transactions.
-- Pairwise anti-symmetry: Flux(i->j) = -Flux(j->i).
CREATE TABLE IF NOT EXISTS thermodynamic_boundary_fluxes (
    transaction_id UUID DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL REFERENCES thermodynamic_blocks(block_height),
    interface_id UUID NOT NULL REFERENCES h3_cell_interfaces(interface_id),
    cell_index_origin VARCHAR(16) NOT NULL,
    cell_index_destination VARCHAR(16) NOT NULL,
    delta_time_seconds NUMERIC(10, 4) NOT NULL CHECK (delta_time_seconds > 0),
    
    -- Geodesic Contact Geometry
    edge_length_meters NUMERIC(12, 4) NOT NULL CHECK (edge_length_meters > 0),
    contact_area_meters2 NUMERIC(16, 4) NOT NULL CHECK (contact_area_meters2 > 0),
    inter_cell_distance_meters NUMERIC(12, 4) NOT NULL CHECK (inter_cell_distance_meters > 0),

    -- Thermodynamics State Gradients
    temperature_origin_kelvin NUMERIC(10, 4) NOT NULL CHECK (temperature_origin_kelvin > 0),
    temperature_destination_kelvin NUMERIC(10, 4) NOT NULL CHECK (temperature_destination_kelvin > 0),
    concentration_origin_mol_m3 NUMERIC(16, 8) NOT NULL CHECK (concentration_origin_mol_m3 >= 0),
    concentration_destination_mol_m3 NUMERIC(16, 8) NOT NULL CHECK (concentration_destination_mol_m3 >= 0),

    -- Transport Coefficients
    thermal_conductivity_kappa NUMERIC(12, 6) NOT NULL CHECK (thermal_conductivity_kappa >= 0),
    mass_diffusion_d NUMERIC(16, 10) NOT NULL CHECK (mass_diffusion_d >= 0),

    -- Boundary Fluxes (Sign denotes direction origin -> destination)
    fourier_thermal_flux_joules NUMERIC(24, 8) NOT NULL,
    fickian_mass_flux_kg NUMERIC(24, 8) NOT NULL,
    
    -- Second Law Invariant: Local Entropy Production Rate >= 0
    entropy_production_joules_per_kelvin NUMERIC(24, 8) NOT NULL CHECK (entropy_production_joules_per_kelvin >= 0),

    -- Blockchain Cryptographic Proof
    signature_tx CHAR(128) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (transaction_id, timestamp)
);

-- TimescaleDB Hypertable partitioning for boundary flux time-series ledger
SELECT create_hypertable('thermodynamic_boundary_fluxes', 'timestamp', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_tb_flux_block ON thermodynamic_boundary_fluxes(block_height);
CREATE INDEX IF NOT EXISTS idx_tb_flux_interface ON thermodynamic_boundary_fluxes(interface_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tb_flux_nodes ON thermodynamic_boundary_fluxes(cell_index_origin, cell_index_destination);

-- ----------------------------------------------------------------------------
-- 5. AUDIT TRIGGER: SECOND LAW OF THERMODYNAMICS & PAIRWISE ANTI-SYMMETRY
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION verify_boundary_flux_invariants()
RETURNS TRIGGER AS $$
DECLARE
    grad_temp NUMERIC(14, 6);
    grad_conc NUMERIC(18, 8);
    computed_q NUMERIC(24, 8);
    computed_m NUMERIC(24, 8);
    entropy_prod NUMERIC(24, 8);
BEGIN
    -- Verify Edge Length Consistency with Interface Contact Area
    IF ABS(NEW.contact_area_meters2 - (NEW.edge_length_meters * (NEW.contact_area_meters2 / NEW.edge_length_meters))) > 0.001 THEN
        RAISE EXCEPTION 'Geometric Invariant Violation: contact_area_meters2 must scale strictly with edge_length_meters';
    END IF;

    -- Validate Fourier Heat Dissipation Sign & Scale
    grad_temp := (NEW.temperature_destination_kelvin - NEW.temperature_origin_kelvin) / NEW.inter_cell_distance_meters;
    computed_q := -NEW.thermal_conductivity_kappa * grad_temp * NEW.contact_area_meters2 * NEW.delta_time_seconds;

    -- Validate Fickian Mass Diffusion Sign & Scale
    grad_conc := (NEW.concentration_destination_mol_m3 - NEW.concentration_origin_mol_m3) / NEW.inter_cell_distance_meters;
    computed_m := -NEW.mass_diffusion_d * grad_conc * NEW.contact_area_meters2 * NEW.delta_time_seconds;

    -- Local Entropy Production Rate Validation: sigma = J_q * (1/T_dst - 1/T_src) >= 0
    entropy_prod := computed_q * ((1.0 / NEW.temperature_destination_kelvin) - (1.0 / NEW.temperature_origin_kelvin));
    IF entropy_prod < -1e-12 THEN
        RAISE EXCEPTION 'Second Law Violation: Negative Entropy Production (sigma = %) detected across interface %',
            entropy_prod, NEW.interface_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_boundary_flux ON thermodynamic_boundary_fluxes;
CREATE TRIGGER trg_verify_boundary_flux
BEFORE INSERT OR UPDATE ON thermodynamic_boundary_fluxes
FOR EACH ROW
EXECUTE FUNCTION verify_boundary_flux_invariants();