-- Sprint 028: Spatial Equilibrium, Trophic Cascade Refinement, and Thermodynamic Ledger Stabilization
-- Database Schema Extensions

-- Drop existing tables if re-provisioning for clean state
DROP TABLE IF EXISTS thermodynamic_ledger_audit CASCADE;
DROP TABLE IF EXISTS detritivore_scavenge_events CASCADE;
DROP TABLE IF EXISTS biome_patch_nutrients CASCADE;
DROP TABLE IF EXISTS spatial_nodes CASCADE;

-- Spatial Nodes and Biome Patches
CREATE TABLE spatial_nodes (
    node_id VARCHAR(64) PRIMARY KEY,
    node_type VARCHAR(32) NOT NULL CHECK (node_type IN ('BiomePatch', 'ObstacleNode')),
    coordinate_x DOUBLE PRECISION NOT NULL,
    coordinate_y DOUBLE PRECISION NOT NULL,
    carrying_capacity DOUBLE PRECISION NOT NULL CHECK (carrying_capacity >= 0),
    connectivity_weights JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE biome_patch_nutrients (
    patch_id VARCHAR(64) PRIMARY KEY REFERENCES spatial_nodes(node_id) ON DELETE CASCADE,
    carbon_stock DOUBLE PRECISION NOT NULL CHECK (carbon_stock >= 0),
    nitrogen_stock DOUBLE PRECISION NOT NULL CHECK (nitrogen_stock >= 0),
    phosphorus_stock DOUBLE PRECISION NOT NULL CHECK (phosphorus_stock >= 0),
    sunlight_flux DOUBLE PRECISION NOT NULL CHECK (sunlight_flux >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Detritivore Scavenge and Decomposition Events
CREATE TABLE detritivore_scavenge_events (
    event_id VARCHAR(64) PRIMARY KEY,
    detritivore_id VARCHAR(64) NOT NULL,
    carcass_id VARCHAR(64) NOT NULL,
    assimilated_biomass DOUBLE PRECISION NOT NULL CHECK (assimilated_biomass >= 0),
    residue_mass DOUBLE PRECISION NOT NULL CHECK (residue_mass >= 0),
    entropy_increment DOUBLE PRECISION NOT NULL CHECK (entropy_increment >= 0),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Thermodynamic Ledger & Conservation Audits (Blockchain Integration)
CREATE TABLE thermodynamic_ledger_audit (
    block_id VARCHAR(64) PRIMARY KEY,
    previous_hash VARCHAR(128) NOT NULL,
    merkle_root VARCHAR(128) NOT NULL,
    total_system_mass DOUBLE PRECISION NOT NULL,
    mass_discrepancy_delta DOUBLE PRECISION NOT NULL CHECK (ABS(mass_discrepancy_delta) <= 1e-12),
    global_entropy DOUBLE PRECISION NOT NULL CHECK (global_entropy >= 0),
    dissipated_heat_joules DOUBLE PRECISION NOT NULL CHECK (dissipated_heat_joules >= 0),
    signature VARCHAR(256) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high-frequency queries
CREATE INDEX idx_spatial_nodes_coords ON spatial_nodes(coordinate_x, coordinate_y);
CREATE INDEX idx_ledger_audit_created ON thermodynamic_ledger_audit(created_at);