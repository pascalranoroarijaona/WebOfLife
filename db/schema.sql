-- Updated Schema & Ledger Definitions: Sprint 13 Spatial Guard Clauses & Thermodynamic Monads

BEGIN;

-- Spatial Nodes Table representing H3 Grid cells with thermodynamic energy reserves
CREATE TABLE IF NOT EXISTS spatial_nodes (
    h3_index VARCHAR(15) PRIMARY KEY,
    resolution INTEGER NOT NULL CHECK (resolution BETWEEN 0 AND 15),
    energy_stock NUMERIC(18, 8) NOT NULL DEFAULT 0.00000000 CHECK (energy_stock >= 0),
    entropy_level NUMERIC(12, 8) NOT NULL DEFAULT 0.00000000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial Payload Validation Logs (Tracking Guard Clause Interceptions for Second Law Entropy Management)
CREATE TABLE IF NOT EXISTS spatial_payload_audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_payload TEXT,
    rejection_reason VARCHAR(255) NOT NULL,
    thermodynamic_state VARCHAR(50) NOT NULL DEFAULT 'TRAPPED_ERROR',
    intercepted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Thermodynamic Stock Transactions Ledger (Blockchain Anchored)
CREATE TABLE IF NOT EXISTS spatial_stock_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_h3_index VARCHAR(15) REFERENCES spatial_nodes(h3_index) ON DELETE SET NULL,
    target_h3_index VARCHAR(15) REFERENCES spatial_nodes(h3_index) ON DELETE SET NULL,
    energy_delta NUMERIC(18, 8) NOT NULL,
    entropy_delta NUMERIC(12, 8) NOT NULL,
    block_signature VARCHAR(64) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Blockchain Blocks Ledger for Spatial Monad State Transitions
CREATE TABLE IF NOT EXISTS spatial_blockchain_blocks (
    block_height SERIAL PRIMARY KEY,
    previous_block_signature VARCHAR(64),
    current_block_signature VARCHAR(64) UNIQUE NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    forged_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for high-performance spatial monad traversals
CREATE INDEX IF NOT EXISTS idx_spatial_nodes_resolution ON spatial_nodes(resolution);
CREATE INDEX IF NOT EXISTS idx_spatial_transactions_sig ON spatial_stock_transactions(block_signature);

COMMIT;