-- Web of Life Database Schema & Thermodynamic Ledger
-- Sprint 001: Directed Acyclic Trophic Graphs and Lindeman's Efficiency Matrix

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for Trophic Levels based on RFC 001
CREATE TYPE trophic_level AS ENUM (
    'PRIMARY_PRODUCER',    -- 1: Autotrophs (Solar conversion)
    'PRIMARY_CONSUMER',    -- 2: Herbivores
    'SECONDARY_CONSUMER',  -- 3: Carnivores / Omnivores
    'APEX_PREDATOR',       -- 4: Tertiary / Apex
    'DECOMPOSER'           -- 5: Detritivores
);

-- Trophic Nodes Table (Taxonomic entities and biological stocks)
CREATE TABLE trophic_nodes (
    node_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    level trophic_level NOT NULL,
    biomass_joules NUMERIC(18, 6) NOT NULL CHECK (biomass_joules >= 0),
    metabolic_rate NUMERIC(18, 6) NOT NULL CHECK (metabolic_rate >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trophic Edges Table (Directed energy transfer pathways between predator and prey)
CREATE TABLE trophic_edges (
    edge_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    predator_id UUID NOT NULL REFERENCES trophic_nodes(node_id) ON DELETE CASCADE,
    prey_id UUID NOT NULL REFERENCES trophic_nodes(node_id) ON DELETE CASCADE,
    efficiency_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.1000 CHECK (efficiency_rate >= 0 AND efficiency_rate <= 1),
    CONSTRAINT no_self_loops CHECK (predator_id != prey_id),
    UNIQUE (predator_id, prey_id)
);

-- Energy Packets Table (Tracking discrete energy transmissions across trophic edges)
CREATE TABLE energy_packets (
    packet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_node_id UUID NOT NULL REFERENCES trophic_nodes(node_id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES trophic_nodes(node_id) ON DELETE CASCADE,
    joules NUMERIC(18, 6) NOT NULL CHECK (joules >= 0),
    timestamp BIGINT NOT NULL
);

-- Thermodynamic Blockchain Ledger Table (Immutable transaction blocks verifying energy conservation)
CREATE TABLE thermodynamic_blocks (
    block_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_index BIGINT NOT NULL UNIQUE,
    previous_hash VARCHAR(64) NOT NULL,
    hash VARCHAR(64) NOT NULL,
    nonce BIGINT NOT NULL,
    solar_input_total NUMERIC(18, 6) NOT NULL,
    metabolic_heat_total NUMERIC(18, 6) NOT NULL,
    biomass_total NUMERIC(18, 6) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for high-frequency time-series ecosystem ticks
CREATE INDEX idx_energy_packets_timestamp ON energy_packets(timestamp);
CREATE INDEX idx_trophic_nodes_level ON trophic_nodes(level);
CREATE INDEX idx_thermodynamic_blocks_index ON thermodynamic_blocks(block_index);