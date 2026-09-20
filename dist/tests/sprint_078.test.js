import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertValidNeighborCountForCell, getPentagonCells, H3TopologyViolationError, H3AdjacencyError, PentagonalCoordinationViolationError, HexagonalCoordinationViolationError } from '../src/spatial/h3_adjacency.js';
import { SpatialFluxMonad } from '../src/spatial/spatial_flux_monad.js';
describe('Sprint 078: Pentagonal Coordination Invariant Enforcement in DGGS', () => {
    const pentagonsRes0 = getPentagonCells(0);
    const canonicalPentagon = pentagonsRes0.length > 0 ? pentagonsRes0[0] : 'pentagon_sample_0';
    const mockPentagon = '801dffffffffff_pentagon';
    const mockHexagon = '8828308281fffff';
    describe('1. Error Taxonomy and Hierarchy Integrity', () => {
        it('PentagonalCoordinationViolationError inherits from H3AdjacencyError and H3TopologyViolationError', () => {
            const err = new PentagonalCoordinationViolationError('pentagon_1', 6);
            assert.ok(err instanceof PentagonalCoordinationViolationError);
            assert.ok(err instanceof H3AdjacencyError);
            assert.ok(err instanceof H3TopologyViolationError);
            assert.ok(err instanceof Error);
            assert.strictEqual(err.name, 'PentagonalCoordinationViolationError');
            assert.strictEqual(err.cellId, 'pentagon_1');
            assert.strictEqual(err.neighborCount, 6);
            assert.strictEqual(err.expectedCount, 5);
        });
        it('HexagonalCoordinationViolationError inherits from H3AdjacencyError and H3TopologyViolationError', () => {
            const err = new HexagonalCoordinationViolationError('hex_1', 5);
            assert.ok(err instanceof HexagonalCoordinationViolationError);
            assert.ok(err instanceof H3AdjacencyError);
            assert.ok(err instanceof H3TopologyViolationError);
            assert.ok(err instanceof Error);
            assert.strictEqual(err.name, 'HexagonalCoordinationViolationError');
            assert.strictEqual(err.cellId, 'hex_1');
            assert.strictEqual(err.neighborCount, 5);
            assert.strictEqual(err.expectedCount, 6);
        });
    });
    describe('2. Pentagonal Positive & Negative Coordination Checks', () => {
        it('assertValidNeighborCountForCell passes when pentagon cell has exactly 5 neighbors', () => {
            assert.doesNotThrow(() => {
                assertValidNeighborCountForCell(canonicalPentagon, 5);
            });
            assert.doesNotThrow(() => {
                assertValidNeighborCountForCell(mockPentagon, ['n1', 'n2', 'n3', 'n4', 'n5']);
            });
        });
        it('assertValidNeighborCountForCell throws PentagonalCoordinationViolationError when neighbor count !== 5', () => {
            const testCounts = [0, 1, 4, 6, 7];
            for (const count of testCounts) {
                assert.throws(() => assertValidNeighborCountForCell(mockPentagon, count), (err) => {
                    assert.ok(err instanceof PentagonalCoordinationViolationError);
                    assert.strictEqual(err.cellId, mockPentagon);
                    assert.strictEqual(err.neighborCount, count);
                    assert.strictEqual(err.expectedCount, 5);
                    assert.match(err.message, /Pentagonal coordination violation/);
                    return true;
                });
            }
        });
        it('assertValidNeighborCountForCell throws PentagonalCoordinationViolationError with neighbor array of length !== 5', () => {
            const corruptedSixNeighbors = ['n1', 'n2', 'n3', 'n4', 'n5', 'ghost_n6'];
            assert.throws(() => assertValidNeighborCountForCell(canonicalPentagon, corruptedSixNeighbors), (err) => {
                assert.ok(err instanceof PentagonalCoordinationViolationError);
                assert.strictEqual(err.cellId, canonicalPentagon);
                assert.strictEqual(err.neighborCount, 6);
                assert.strictEqual(err.expectedCount, 5);
                return true;
            });
        });
    });
    describe('3. Hexagonal Positive & Negative Coordination Checks', () => {
        it('assertValidNeighborCountForCell passes when hexagonal cell has exactly 6 neighbors', () => {
            assert.doesNotThrow(() => {
                assertValidNeighborCountForCell(mockHexagon, 6);
            });
            assert.doesNotThrow(() => {
                assertValidNeighborCountForCell(mockHexagon, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
            });
        });
        it('assertValidNeighborCountForCell throws HexagonalCoordinationViolationError when neighbor count !== 6', () => {
            const invalidCounts = [0, 4, 5, 7];
            for (const count of invalidCounts) {
                assert.throws(() => assertValidNeighborCountForCell(mockHexagon, count), (err) => {
                    assert.ok(err instanceof HexagonalCoordinationViolationError);
                    assert.strictEqual(err.cellId, mockHexagon);
                    assert.strictEqual(err.neighborCount, count);
                    assert.strictEqual(err.expectedCount, 6);
                    assert.match(err.message, /Hexagonal coordination violation/);
                    return true;
                });
            }
        });
    });
    describe('4. SpatialFluxMonad and First Law Conservation', () => {
        it('rejects diffusion evaluation when pentagonal cell is assigned 6 neighbors', () => {
            const pCell = 'pentagon_01';
            const stocks = new Map([
                [pCell, { carbonMol: 100, waterKg: 500, oxygenMol: 200, mineralsKg: 50, thermalJoules: 1000 }]
            ]);
            const geometries = new Map([
                [pCell, {
                        cellId: pCell,
                        neighbors: ['n1', 'n2', 'n3', 'n4', 'n5', 'invalid_n6'], // 6 neighbors on pentagon
                        volumeM3: 1000,
                        interfaceAreasM2: [10, 10, 10, 10, 10, 10],
                        centroidDistancesM: [100, 100, 100, 100, 100, 100]
                    }]
            ]);
            const state = { stocks, geometries };
            const monad = SpatialFluxMonad.of(state).validateTopology();
            assert.ok(monad.getError() instanceof PentagonalCoordinationViolationError);
            assert.throws(() => monad.run(), (err) => {
                return err instanceof PentagonalCoordinationViolationError;
            });
        });
        it('conserves global mass and thermal energy over valid pentagon-hexagon coupled grid', () => {
            const pCell = 'pentagon_defect_1';
            const hCell = 'hexagon_cell_2';
            // 5 neighbors for pentagon, 6 neighbors for hexagon
            const pNeighbors = [hCell, 'pn_2', 'pn_3', 'pn_4', 'pn_5'];
            const hNeighbors = [pCell, 'hn_2', 'hn_3', 'hn_4', 'hn_5', 'hn_6'];
            const initialStocks = new Map([
                [pCell, { carbonMol: 1000, waterKg: 5000, oxygenMol: 800, mineralsKg: 200, thermalJoules: 1e6 }],
                [hCell, { carbonMol: 200, waterKg: 1000, oxygenMol: 150, mineralsKg: 50, thermalJoules: 2e5 }]
            ]);
            const geometries = new Map([
                [pCell, {
                        cellId: pCell,
                        neighbors: pNeighbors,
                        volumeM3: 500,
                        interfaceAreasM2: [25, 25, 25, 25, 25],
                        centroidDistancesM: [50, 50, 50, 50, 50]
                    }],
                [hCell, {
                        cellId: hCell,
                        neighbors: hNeighbors,
                        volumeM3: 500,
                        interfaceAreasM2: [25, 25, 25, 25, 25],
                        centroidDistancesM: [50, 50, 50, 50, 50]
                    }]
            ]);
            const coefficients = {
                diffusionC: 0.1,
                diffusionW: 0.2,
                diffusionO: 0.05,
                diffusionM: 0.01,
                thermalDiffusivity: 1.5
            };
            const stockP = initialStocks.get(pCell);
            const stockH = initialStocks.get(hCell);
            const initialTotalC = (stockP.carbonMol ?? 0) + (stockH.carbonMol ?? 0);
            const initialTotalW = (stockP.waterKg ?? 0) + (stockH.waterKg ?? 0);
            const initialTotalU = (stockP.thermalJoules ?? 0) + (stockH.thermalJoules ?? 0);
            const monad = SpatialFluxMonad.of({
                stocks: initialStocks,
                geometries: geometries
            }).stepDiffusion(10, coefficients);
            const finalState = monad.unwrap();
            const finalP = finalState.stocks.get(pCell);
            const finalH = finalState.stocks.get(hCell);
            const finalTotalC = (finalP.carbonMol ?? 0) + (finalH.carbonMol ?? 0);
            const finalTotalW = (finalP.waterKg ?? 0) + (finalH.waterKg ?? 0);
            const finalTotalU = (finalP.thermalJoules ?? 0) + (finalH.thermalJoules ?? 0);
            assert.ok(Math.abs(finalTotalC - initialTotalC) < 1e-6);
            assert.ok(Math.abs(finalTotalW - initialTotalW) < 1e-6);
            assert.ok(Math.abs(finalTotalU - initialTotalU) < 1e-6);
        });
    });
});
