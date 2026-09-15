// =============================================================================
// WEB OF LIFE - SPRINT 079 TEST SUITE
// Validation of Pentagonal Neighbor Cardinality & Discrete Conservative Adjacency
// =============================================================================
import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as h3 from 'h3-js';
import { validatePentagonalNeighborCount, validatePentagonalNeighborDetailed, isPentagonH3, ConservativeAdjacencyGraph, H3_RES0_PENTAGONS } from '../src/spatial/h3_adjacency.js';
import { AdjacencyTopologicalError, TopologicalPreconditionError } from '../src/spatial/h3_types.js';
import { SpatialFluxMonad, computeConservativeSpatialFlux } from '../src/spatial/spatial_flux_monad.js';
describe('Sprint 079: RFC-079 Pentagonal Neighbor Cardinality Validation', () => {
    const knownPentagonRes0 = H3_RES0_PENTAGONS[0]; // '8009fffffffffff'
    const mockNeighbors5 = [
        '8009ffffffffffe',
        '8009fffffffffd1',
        '8009fffffffffd2',
        '8009fffffffffd3',
        '8009fffffffffd4'
    ];
    it('TC-PENT-01: Pentagon cell with exactly 5 unique neighbors passes validation', () => {
        const isValid = validatePentagonalNeighborCount(knownPentagonRes0, mockNeighbors5);
        assert.strictEqual(isValid, true);
        const detailed = validatePentagonalNeighborDetailed(knownPentagonRes0, mockNeighbors5);
        assert.strictEqual(detailed.isValid, true);
        assert.strictEqual(detailed.neighborCount, 5);
        assert.strictEqual(detailed.uniqueCount, 5);
        assert.strictEqual(detailed.hasSelfLoop, false);
        assert.strictEqual(detailed.errorMessage, undefined);
    });
    it('TC-PENT-02: Pentagon cell with 6 neighbors (improperly padded) fails validation', () => {
        const paddedNeighbors6 = [...mockNeighbors5, '8009fffffffffd5'];
        // Returns false when throwOnFailure is omitted or false
        assert.strictEqual(validatePentagonalNeighborCount(knownPentagonRes0, paddedNeighbors6), false);
        // Throws AdjacencyTopologicalError when throwOnFailure is true
        assert.throws(() => validatePentagonalNeighborCount(knownPentagonRes0, paddedNeighbors6, { throwOnFailure: true }), AdjacencyTopologicalError);
        const detailed = validatePentagonalNeighborDetailed(knownPentagonRes0, paddedNeighbors6);
        assert.strictEqual(detailed.isValid, false);
        assert.strictEqual(detailed.neighborCount, 6);
    });
    it('TC-PENT-03: Pentagon cell with 4 neighbors (truncated array) fails validation', () => {
        const truncatedNeighbors4 = mockNeighbors5.slice(0, 4);
        assert.strictEqual(validatePentagonalNeighborCount(knownPentagonRes0, truncatedNeighbors4), false);
        assert.throws(() => validatePentagonalNeighborCount(knownPentagonRes0, truncatedNeighbors4, { throwOnFailure: true }), AdjacencyTopologicalError);
    });
    it('TC-PENT-04: Pentagon cell with 5 neighbors containing duplicate entry fails validation', () => {
        const duplicateNeighbors = [
            mockNeighbors5[0],
            mockNeighbors5[1],
            mockNeighbors5[2],
            mockNeighbors5[3],
            mockNeighbors5[0] // duplicate
        ];
        assert.strictEqual(validatePentagonalNeighborCount(knownPentagonRes0, duplicateNeighbors), false);
        assert.throws(() => validatePentagonalNeighborCount(knownPentagonRes0, duplicateNeighbors, { throwOnFailure: true }), (err) => {
            assert(err instanceof AdjacencyTopologicalError);
            assert(err.message.includes('duplicate'));
            return true;
        });
        const detailed = validatePentagonalNeighborDetailed(knownPentagonRes0, duplicateNeighbors);
        assert.strictEqual(detailed.isValid, false);
        assert.strictEqual(detailed.uniqueCount, 4);
    });
    it('TC-PENT-05: Pentagon cell containing self-index in neighbor list fails validation', () => {
        const selfLoopNeighbors = [
            mockNeighbors5[0],
            mockNeighbors5[1],
            mockNeighbors5[2],
            mockNeighbors5[3],
            knownPentagonRes0 // self loop
        ];
        assert.strictEqual(validatePentagonalNeighborCount(knownPentagonRes0, selfLoopNeighbors), false);
        assert.throws(() => validatePentagonalNeighborCount(knownPentagonRes0, selfLoopNeighbors, { throwOnFailure: true }), (err) => {
            assert(err instanceof AdjacencyTopologicalError);
            assert(err.message.includes('self-loop'));
            return true;
        });
        const detailed = validatePentagonalNeighborDetailed(knownPentagonRes0, selfLoopNeighbors);
        assert.strictEqual(detailed.hasSelfLoop, true);
        assert.strictEqual(detailed.isValid, false);
    });
    it('TC-PENT-06: Non-pentagon cell rejected when assertPentagonType is true', () => {
        // Standard hexagonal base cell (e.g., base cell 0 '8001fffffffffff')
        const hexCell = '8001fffffffffff';
        assert.strictEqual(isPentagonH3(hexCell), false);
        assert.throws(() => validatePentagonalNeighborCount(hexCell, mockNeighbors5, { assertPentagonType: true }), TopologicalPreconditionError);
    });
    it('TC-H3-NATIVE: All 12 base cell pentagons at resolution 0 have exactly 5 gridDisk neighbors', () => {
        const h3Any = h3;
        const pentagons = typeof h3Any.getPentagons === 'function'
            ? h3Any.getPentagons(0)
            : H3_RES0_PENTAGONS;
        assert.strictEqual(pentagons.length, 12);
        for (const pent of pentagons) {
            assert.strictEqual(isPentagonH3(pent), true);
            // In H3 gridDisk(pent, 1) returns 6 cells: the origin + 5 neighbors
            const disk = typeof h3Any.gridDisk === 'function'
                ? h3Any.gridDisk(pent, 1)
                : (typeof h3Any.kRing === 'function' ? h3Any.kRing(pent, 1) : [pent]);
            const neighbors = disk.filter((c) => c !== pent);
            assert.strictEqual(neighbors.length, 5, `Pentagon ${pent} must have exactly 5 neighbors`);
            assert.strictEqual(validatePentagonalNeighborCount(pent, neighbors, { assertPentagonType: true }), true);
        }
    });
    it('TC-GRAPH-01: H3AdjacencyGraph and ConservativeAdjacencyGraph enforce degree invariants', () => {
        const graph = new ConservativeAdjacencyGraph();
        const pentCell = knownPentagonRes0;
        const hexCell = '8001fffffffffff';
        const hexNeighbors = [
            '8001fffffffff01', '8001fffffffff02', '8001fffffffff03',
            '8001fffffffff04', '8001fffffffff05', '8001fffffffff06'
        ];
        // Successful registration
        graph.registerNeighbors(pentCell, mockNeighbors5);
        graph.registerNeighbors(hexCell, hexNeighbors);
        assert.strictEqual(graph.validatePentagonalNeighborCount(pentCell), true);
        assert.deepStrictEqual(graph.getNeighbors(pentCell), mockNeighbors5);
        // Stencils weights check
        const stencils = graph.computeFluxStencils();
        const pentStencil = stencils.get(pentCell);
        assert.strictEqual(pentStencil.size, 5);
        for (const weight of pentStencil.values()) {
            assert.strictEqual(weight, 0.2); // 1/5
        }
        const hexStencil = stencils.get(hexCell);
        assert.strictEqual(hexStencil.size, 6);
        for (const weight of hexStencil.values()) {
            assert.strictEqual(Math.round(weight * 1e6) / 1e6, Math.round((1.0 / 6.0) * 1e6) / 1e6);
        }
    });
    it('TC-CONSERV-01: Conservative diffusion maintains First Law mass conservation to machine precision', () => {
        const pentCell = knownPentagonRes0;
        const hexCells = mockNeighbors5; // 5 neighbor cells
        const cellStates = new Map();
        const neighborsMap = new Map();
        // Pentagon has the 5 hex cells as neighbors
        neighborsMap.set(pentCell, Object.freeze([...hexCells]));
        // Each hex cell has pentCell + 5 synthetic hex neighbors (total 6)
        for (let i = 0; i < hexCells.length; i++) {
            const hex = hexCells[i];
            const otherHex = hexCells[(i + 1) % hexCells.length];
            const synthetic = [
                pentCell,
                otherHex,
                `hex_ext_${i}_1`,
                `hex_ext_${i}_2`,
                `hex_ext_${i}_3`,
                `hex_ext_${i}_4`
            ];
            neighborsMap.set(hex, Object.freeze(synthetic));
        }
        const topology = {
            neighbors: neighborsMap,
            isPentagonLookup: (id) => id === pentCell
        };
        // Pent initialized with concentrated stock, hex cells with lower stock
        const pentStocks = [1000.0, 500.0, 100.0, 25.0, 300.0, 1e7];
        cellStates.set(pentCell, {
            cellIndex: pentCell,
            isPentagon: true,
            volume_m3: 1e6,
            stocks: pentStocks
        });
        for (const hex of hexCells) {
            cellStates.set(hex, {
                cellIndex: hex,
                isPentagon: false,
                volume_m3: 1e6,
                stocks: [100.0, 50.0, 10.0, 2.5, 30.0, 1e6]
            });
        }
        const initialMonad = SpatialFluxMonad.of(cellStates, topology);
        const diffusivity = [0.05, 0.05, 0.05, 0.05, 0.05, 0.05];
        let currentMonad = initialMonad;
        for (let step = 0; step < 10; step++) {
            currentMonad = currentMonad.stepDiffusion(diffusivity, 1.0);
        }
        // Verify absolute mass conservation: initial sum === final sum
        const isConserved = currentMonad.verifyTotalConservation(initialMonad, 1e-11);
        assert.strictEqual(isConserved, true, 'Conservative spatial flux violated First Law');
        // Pentagon stock diffused outward to neighbors
        const finalPentState = currentMonad.getState().get(pentCell);
        assert(finalPentState.stocks[0] < 1000.0, 'Pentagon mass should decrease due to outward gradient');
    });
    it('TC-LEAK-DEFECT: Attempted diffusion on improperly padded pentagon is rejected by pre-flight check', () => {
        const pentCell = knownPentagonRes0;
        const malformedNeighbors6 = [...mockNeighbors5, 'phantom_cell_6'];
        const neighborsMap = new Map();
        neighborsMap.set(pentCell, malformedNeighbors6);
        const topology = {
            neighbors: neighborsMap,
            isPentagonLookup: (id) => id === pentCell
        };
        const cellStates = new Map();
        cellStates.set(pentCell, {
            cellIndex: pentCell,
            isPentagon: true,
            volume_m3: 1e6,
            stocks: [100, 100, 100, 100, 100, 100]
        });
        assert.throws(() => computeConservativeSpatialFlux(cellStates, topology, [1, 1, 1, 1, 1, 1], 1.0), (err) => {
            assert(err instanceof AdjacencyTopologicalError);
            assert(err.message.includes('Topological pre-flight check failed'));
            return true;
        });
    });
});
