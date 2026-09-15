import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as h3 from 'h3-js';
import { isExpectedNeighborCountForCell, isExpectedNeighborCount, getExpectedNeighborCount, isCellPentagon, isValidCell, getPentagonIndexes, } from '../src/spatial/h3_adjacency.js';
import { TopologicalFluxMonad, SpatialFluxMonad, } from '../src/spatial/spatial_flux_monad.js';
describe('Sprint 076: Topological Adjacency Validation & Discrete Flux Conservation', () => {
    // Resolve valid H3 indexes for testing
    const pentagonsRes0 = getPentagonIndexes(0);
    const validPentagonId = pentagonsRes0.length > 0 ? pentagonsRes0[0] : '8049fffffffffffff';
    // Standard hexagon cell (e.g. San Francisco or Equator)
    const validHexId = typeof h3.latLngToCell === 'function'
        ? h3.latLngToCell(37.7749, -122.4194, 1)
        : (typeof h3.geoToH3 === 'function'
            ? h3.geoToH3(37.7749, -122.4194, 1)
            : '81283ffffffffff');
    it('AC-076-01: Valid hexagonal cell ID with array of exactly 6 strings evaluates to true', () => {
        assert.strictEqual(isValidCell(validHexId), true);
        assert.strictEqual(isCellPentagon(validHexId), false);
        assert.strictEqual(getExpectedNeighborCount(validHexId), 6);
        const neighbors = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'];
        const result = isExpectedNeighborCountForCell(validHexId, neighbors);
        assert.strictEqual(result, true);
    });
    it('AC-076-02: Valid hexagonal cell ID with array of 5 strings evaluates to false', () => {
        const neighbors = ['n1', 'n2', 'n3', 'n4', 'n5'];
        const result = isExpectedNeighborCountForCell(validHexId, neighbors);
        assert.strictEqual(result, false);
    });
    it('AC-076-03: Valid pentagonal cell ID with array of exactly 5 strings evaluates to true', () => {
        assert.strictEqual(isValidCell(validPentagonId), true);
        assert.strictEqual(isCellPentagon(validPentagonId), true);
        assert.strictEqual(getExpectedNeighborCount(validPentagonId), 5);
        const neighbors = ['p1', 'p2', 'p3', 'p4', 'p5'];
        const result = isExpectedNeighborCountForCell(validPentagonId, neighbors);
        assert.strictEqual(result, true);
    });
    it('AC-076-04: Valid pentagonal cell ID with array of 6 strings evaluates to false', () => {
        const neighbors = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
        const result = isExpectedNeighborCountForCell(validPentagonId, neighbors);
        assert.strictEqual(result, false);
    });
    it('AC-076-05: Invalid or non-hex string cell ID evaluates to false', () => {
        const hexNeighbors = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'];
        assert.strictEqual(isExpectedNeighborCountForCell('', hexNeighbors), false);
        assert.strictEqual(isExpectedNeighborCountForCell('not-a-cell-id', hexNeighbors), false);
        assert.strictEqual(isExpectedNeighborCountForCell('12345', hexNeighbors), false);
        assert.strictEqual(isExpectedNeighborCountForCell('ffffffffffffffff', hexNeighbors), false);
    });
    it('AC-076-06: Non-array or null/undefined neighbor argument evaluates to false', () => {
        assert.strictEqual(isExpectedNeighborCountForCell(validHexId, null), false);
        assert.strictEqual(isExpectedNeighborCountForCell(validHexId, undefined), false);
        assert.strictEqual(isExpectedNeighborCountForCell(validHexId, {}), false);
        assert.strictEqual(isExpectedNeighborCountForCell(validHexId, 'string'), false);
        assert.strictEqual(isExpectedNeighborCountForCell(validHexId, 6), false);
    });
    it('AC-076-07: Functional composition delegates to isExpectedNeighborCount', () => {
        // Both return the exact same boolean for corresponding count
        const arr6 = ['a', 'b', 'c', 'd', 'e', 'f'];
        const arr5 = ['a', 'b', 'c', 'd', 'e'];
        const arr0 = [];
        assert.strictEqual(isExpectedNeighborCountForCell(validHexId, arr6), isExpectedNeighborCount(validHexId, 6));
        assert.strictEqual(isExpectedNeighborCountForCell(validHexId, arr5), isExpectedNeighborCount(validHexId, 5));
        assert.strictEqual(isExpectedNeighborCountForCell(validHexId, arr0), isExpectedNeighborCount(validHexId, 0));
        assert.strictEqual(isExpectedNeighborCountForCell(validPentagonId, arr5), isExpectedNeighborCount(validPentagonId, 5));
        assert.strictEqual(isExpectedNeighborCountForCell(validPentagonId, arr6), isExpectedNeighborCount(validPentagonId, 6));
    });
    it('Boundary counts: Hexagonal cell with 0, 1, 7 neighbors evaluates to false', () => {
        assert.strictEqual(isExpectedNeighborCountForCell(validHexId, []), false);
        assert.strictEqual(isExpectedNeighborCountForCell(validHexId, ['one']), false);
        assert.strictEqual(isExpectedNeighborCountForCell(validHexId, ['1', '2', '3', '4', '5', '6', '7']), false);
    });
    it('Boundary counts: Pentagonal cell with 0, 4, 7 neighbors evaluates to false', () => {
        assert.strictEqual(isExpectedNeighborCountForCell(validPentagonId, []), false);
        assert.strictEqual(isExpectedNeighborCountForCell(validPentagonId, ['1', '2', '3', '4']), false);
        assert.strictEqual(isExpectedNeighborCountForCell(validPentagonId, ['1', '2', '3', '4', '5', '6', '7']), false);
    });
    it('Immutability: The passed neighbors array is never mutated', () => {
        const original = Object.freeze(['c1', 'c2', 'c3', 'c4', 'c5', 'c6']);
        const result = isExpectedNeighborCountForCell(validHexId, original);
        assert.strictEqual(result, true);
        assert.strictEqual(original.length, 6);
        assert.strictEqual(original[0], 'c1');
        assert.strictEqual(original[5], 'c6');
    });
    it('TopologicalFluxMonad integration: evaluates divergence when neighbor topology is complete', () => {
        const centerStock = {
            carbonKg: 100,
            waterKg: 200,
            mineralsKg: 50,
            oxygenKg: 80,
            energyJoules: 1000,
        };
        const neighborStock = {
            carbonKg: 120,
            waterKg: 190,
            mineralsKg: 55,
            oxygenKg: 85,
            energyJoules: 1050,
        };
        const conductance = {
            edgeLengthMeters: 100,
            centroidDistanceMeters: 173.2,
            effectiveDepthMeters: 10,
            normalVelocityMetersPerSec: 0.05,
        };
        const diffusivity = {
            carbon: 1e-4,
            water: 2e-4,
            minerals: 5e-5,
            oxygen: 1e-4,
            thermal: 1e-3,
        };
        const monad = TopologicalFluxMonad.of(validHexId, centerStock, 1e6);
        // 1. Evaluation fails when neighbor list is truncated (missing 1 neighbor for hex cell)
        const incompleteNeighbors = ['n1', 'n2', 'n3', 'n4', 'n5'];
        const mapIncomplete = new Map();
        for (const n of incompleteNeighbors)
            mapIncomplete.set(n, neighborStock);
        const failResult = monad.evaluateDivergence(incompleteNeighbors, mapIncomplete, conductance, diffusivity, 60);
        assert.strictEqual(failResult.success, false);
        if (!failResult.success) {
            assert.ok(failResult.reason?.includes('Neighbor count mismatch'));
        }
        // 2. Evaluation succeeds when topology strictly matches 6 neighbors for hex cell
        const completeNeighbors = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'];
        const mapComplete = new Map();
        for (const n of completeNeighbors)
            mapComplete.set(n, neighborStock);
        const successResult = monad.evaluateDivergence(completeNeighbors, mapComplete, conductance, diffusivity, 60);
        assert.strictEqual(successResult.success, true);
        assert.ok(successResult.delta !== undefined);
        assert.ok(typeof successResult.delta.carbonKg === 'number');
        assert.ok(typeof successResult.delta.energyJoules === 'number');
    });
    it('SpatialFluxMonad validates kernel topology correctly', () => {
        const genericMonad = new SpatialFluxMonad(validHexId, { temperature: 298.15 });
        const sixNeighbors = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'];
        const fiveNeighbors = ['n1', 'n2', 'n3', 'n4', 'n5'];
        assert.strictEqual(genericMonad.validateKernelTopology(validHexId, sixNeighbors), true);
        assert.strictEqual(genericMonad.validateKernelTopology(validHexId, fiveNeighbors), false);
    });
});
