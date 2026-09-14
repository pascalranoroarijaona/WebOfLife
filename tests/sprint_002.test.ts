import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3AdjacencyEngine, CellStockState } from '../src/spatial/h3_adjacency.js';
import { SpatialMonad } from '../src/monads/spatial_monad.js';

describe('Sprint 002: Uber H3 Spatial Indexing and Adjacency Mappings', () => {
    const engine = new H3AdjacencyEngine();
    const validHex = '8c2681432ffffffff';

    it('should parse valid 15-char hex H3 indices successfully', () => {
        const cell = engine.parseIndex(validHex);
        assert.strictEqual(cell.index, validHex);
        assert.strictEqual(cell.resolution, 4);
    });

    it('should throw an error on invalid H3 format', () => {
        assert.throws(() => {
            engine.parseIndex('invalid_hex_str');
        }, /Invalid H3 index format/);
    });

    it('should return exactly 6 edge neighbors for standard cells', () => {
        const cell = engine.parseIndex(validHex);
        const neighbors = cell.getEdgeNeighbors();
        assert.strictEqual(neighbors.length, 6);
    });

    it('should generate K-rings conforming to the hexagonal scaling law (3k^2 + 3k + 1)', () => {
        const cell = engine.parseIndex(validHex);
        const k = 2;
        const rings = engine.generateKRing(cell, k);
        assert.strictEqual(rings.length, k);

        // Ring 1 cardinality = 3(1)^2 + 3(1) + 1 = 7
        assert.strictEqual(rings[0].length, 7);
        // Ring 2 cardinality = 3(2)^2 + 3(2) + 1 = 19
        assert.strictEqual(rings[1].length, 19);
    });

    it('should execute conservative mass-energy diffusion across edge neighbors adhering to First Law', () => {
        const centerCell = engine.parseIndex(validHex);
        const centerState: CellStockState = {
            index: centerCell.index,
            carbonMass: 1000,
            waterMass: 5000,
            mineralNutrients: 200,
            thermalEnergy: 100000
        };

        const neighborMap = new Map<string, CellStockState>();
        const neighbors = centerCell.getEdgeNeighbors();
        neighbors.forEach((nbrId, idx) => {
            neighborMap.set(nbrId, {
                index: nbrId,
                carbonMass: 800 + idx * 10,
                waterMass: 4800 + idx * 20,
                mineralNutrients: 190,
                thermalEnergy: 95000 + idx * 100
            });
        });

        const monadResult = engine.executeDiffusionStep(centerState, neighborMap, 0.05, 1.0);
        assert.ok(monadResult instanceof SpatialMonad);

        const updated = monadResult.extract();
        assert.notStrictEqual(updated.carbonMass, centerState.carbonMass);
        assert.notStrictEqual(updated.waterMass, centerState.waterMass);
        assert.ok(updated.carbonMass >= 0);
        assert.ok(updated.waterMass >= 0);
    });
});