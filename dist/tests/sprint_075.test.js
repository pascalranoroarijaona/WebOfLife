// =============================================================================
// WEB OF LIFE - SPRINT 075 SPECIFICATION TEST SUITE
// Topological Adjacency Verification & Conservative Spatial Flux
// =============================================================================
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isPentagon, getCoordinationNumber, isExpectedNeighborCount, H3AdjacencyManager, getPentagonCells } from '../src/spatial/h3_adjacency.js';
import { SpatialFluxMonad, computeHarmonizedFluxDeltas, TopologicalAdjacencyDefectError, FluxConservationError } from '../src/spatial/spatial_flux_monad.js';
describe('Sprint 075: Topological Adjacency & isExpectedNeighborCount', () => {
    // Retrieve standard test cells
    const pentagons = getPentagonCells(0);
    const knownPentagon = pentagons[0] ?? '8009fffffffffff';
    // Base cell 0 (8001fffffffffff) is a known regular hexagon at res 0
    const knownHexagon = '8001fffffffffff';
    describe('1. Hexagonal Cell Coordination Verification', () => {
        it('returns coordination number 6 for a regular hexagon', () => {
            assert.strictEqual(isPentagon(knownHexagon), false);
            assert.strictEqual(getCoordinationNumber(knownHexagon), 6);
        });
        it('validates candidate count 6 as true for regular hexagon', () => {
            assert.strictEqual(isExpectedNeighborCount(knownHexagon, 6), true);
            assert.strictEqual(H3AdjacencyManager.isExpectedNeighborCount(knownHexagon, 6), true);
        });
        it('rejects count 5, 7, and other values for regular hexagon', () => {
            assert.strictEqual(isExpectedNeighborCount(knownHexagon, 5), false);
            assert.strictEqual(isExpectedNeighborCount(knownHexagon, 7), false);
            assert.strictEqual(isExpectedNeighborCount(knownHexagon, 0), false);
            assert.strictEqual(H3AdjacencyManager.isExpectedNeighborCount(knownHexagon, 5), false);
        });
    });
    describe('2. Pentagonal Singularity Verification', () => {
        it('identifies icosahedral pentagonal singularity and returns coordination number 5', () => {
            assert.strictEqual(isPentagon(knownPentagon), true);
            assert.strictEqual(getCoordinationNumber(knownPentagon), 5);
            assert.strictEqual(H3AdjacencyManager.isPentagon(knownPentagon), true);
            assert.strictEqual(H3AdjacencyManager.getCoordinationNumber(knownPentagon), 5);
        });
        it('validates candidate count 5 as true for pentagonal singularity', () => {
            assert.strictEqual(isExpectedNeighborCount(knownPentagon, 5), true);
            assert.strictEqual(H3AdjacencyManager.isExpectedNeighborCount(knownPentagon, 5), true);
        });
        it('rejects count 6, 4, and other values for pentagonal singularity', () => {
            assert.strictEqual(isExpectedNeighborCount(knownPentagon, 6), false);
            assert.strictEqual(isExpectedNeighborCount(knownPentagon, 4), false);
            assert.strictEqual(isExpectedNeighborCount(knownPentagon, 0), false);
        });
    });
    describe('3. Polymorphic Parameter Invocation & Edge Case Sanitation', () => {
        it('supports inverted argument order: (candidateCount, cellIndex)', () => {
            assert.strictEqual(isExpectedNeighborCount(6, knownHexagon), true);
            assert.strictEqual(isExpectedNeighborCount(5, knownHexagon), false);
            assert.strictEqual(isExpectedNeighborCount(5, knownPentagon), true);
            assert.strictEqual(isExpectedNeighborCount(6, knownPentagon), false);
            assert.strictEqual(H3AdjacencyManager.isExpectedNeighborCount(6, knownHexagon), true);
            assert.strictEqual(H3AdjacencyManager.isExpectedNeighborCount(5, knownPentagon), true);
        });
        it('accepts integer-equivalent float counts (5.000, 6.0)', () => {
            assert.strictEqual(isExpectedNeighborCount(knownPentagon, 5.0), true);
            assert.strictEqual(isExpectedNeighborCount(knownHexagon, 6.0), true);
        });
        it('rejects non-integer floats (5.001, 5.999)', () => {
            assert.strictEqual(isExpectedNeighborCount(knownPentagon, 5.001), false);
            assert.strictEqual(isExpectedNeighborCount(knownHexagon, 5.999), false);
            assert.strictEqual(isExpectedNeighborCount(knownHexagon, 6.0001), false);
        });
        it('rejects negative numbers, NaN, and Infinity', () => {
            assert.strictEqual(isExpectedNeighborCount(knownHexagon, -6), false);
            assert.strictEqual(isExpectedNeighborCount(knownPentagon, -5), false);
            assert.strictEqual(isExpectedNeighborCount(knownHexagon, NaN), false);
            assert.strictEqual(isExpectedNeighborCount(knownHexagon, Infinity), false);
            assert.strictEqual(isExpectedNeighborCount(knownHexagon, -Infinity), false);
        });
        it('safely returns false for malformed or unrecognized H3 indexes', () => {
            assert.strictEqual(isExpectedNeighborCount('invalid_h3_index', 6), false);
            assert.strictEqual(isExpectedNeighborCount('', 6), false);
            assert.strictEqual(isExpectedNeighborCount('xyz123', 5), false);
        });
        it('supports BigInt H3 index input format', () => {
            const hexBigInt = BigInt('0x' + knownHexagon);
            const pentBigInt = BigInt('0x' + knownPentagon);
            assert.strictEqual(isExpectedNeighborCount(hexBigInt, 6), true);
            assert.strictEqual(isExpectedNeighborCount(hexBigInt, 5), false);
            assert.strictEqual(isExpectedNeighborCount(pentBigInt, 5), true);
            assert.strictEqual(isExpectedNeighborCount(pentBigInt, 6), false);
        });
    });
    describe('4. SpatialFluxMonad Topological Validation', () => {
        it('validates regular hexagonal cell topology via validateCellTopology', () => {
            // Hexagon with 6 dummy neighbors
            const state = {
                cellIndex: knownHexagon,
                stocks: { water: 100, carbon: 50, oxygen: 20, minerals: 10, enthalpy: 300 },
                neighbors: [
                    '8003fffffffffff', '8005fffffffffff', '8007fffffffffff',
                    '8013fffffffffff', '8015fffffffffff', '8017fffffffffff'
                ]
            };
            const result = SpatialFluxMonad.validateCellTopology(state);
            assert.strictEqual(result.isOk(), true);
            assert.strictEqual(result.unwrap().cellIndex, knownHexagon);
            const monad = SpatialFluxMonad.of(state);
            assert.strictEqual(monad.verifyNeighborhoodTopology(), true);
        });
        it('fails validateCellTopology and returns TopologicalAdjacencyDefectError when count is defective', () => {
            // Hexagon with only 5 neighbors (missing 1)
            const state = {
                cellIndex: knownHexagon,
                stocks: { water: 100, carbon: 50, oxygen: 20, minerals: 10, enthalpy: 300 },
                neighbors: [
                    '8003fffffffffff', '8005fffffffffff', '8007fffffffffff',
                    '8013fffffffffff', '8015fffffffffff'
                ]
            };
            const result = SpatialFluxMonad.validateCellTopology(state);
            assert.strictEqual(result.isErr(), true);
            const err = result.unwrapErr();
            assert.ok(err instanceof TopologicalAdjacencyDefectError);
            assert.match(err.message, /topology violation/i);
            const monad = SpatialFluxMonad.of(state);
            assert.throws(() => monad.verifyNeighborhoodTopology(), TopologicalAdjacencyDefectError);
        });
        it('validates pentagonal cell topology when exactly 5 neighbors are present', () => {
            const state = {
                cellIndex: knownPentagon,
                stocks: { water: 80, carbon: 40, oxygen: 15, minerals: 8, enthalpy: 250 },
                neighbors: [
                    '8001fffffffffff', '8003fffffffffff', '8005fffffffffff',
                    '8007fffffffffff', '8011fffffffffff'
                ]
            };
            const result = SpatialFluxMonad.validateCellTopology(state);
            assert.strictEqual(result.isOk(), true);
        });
    });
    describe('5. Conservative Stock Transfer & Pairwise Reciprocity', () => {
        it('computes anti-symmetric flux transfers between verified adjacent cells', () => {
            // Construct a minimal valid two-cell subsystem where both have verified neighbor counts
            const cellA = knownHexagon;
            const neighborsA = [
                '8003fffffffffff', '8005fffffffffff', '8007fffffffffff',
                '8013fffffffffff', '8015fffffffffff', '8017fffffffffff'
            ];
            const stateA = {
                cellIndex: cellA,
                stocks: { water: 500, carbon: 200, oxygen: 100, minerals: 50, enthalpy: 1000 },
                neighbors: neighborsA
            };
            const map = new Map();
            for (const n of neighborsA) {
                map.set(n, {
                    cellIndex: n,
                    stocks: { water: 100, carbon: 50, oxygen: 20, minerals: 10, enthalpy: 200 },
                    neighbors: [
                        cellA, '8021fffffffffff', '8023fffffffffff',
                        '8025fffffffffff', '8027fffffffffff', '8029fffffffffff'
                    ]
                });
            }
            const monadA = SpatialFluxMonad.of(stateA);
            const fluxResult = monadA.computeHarmonizedFluxDeltas(map, 1.0);
            assert.strictEqual(fluxResult.isOk(), true);
            const transfers = fluxResult.unwrap();
            assert.strictEqual(transfers.length, 6);
            const firstTarget = transfers[0];
            assert.strictEqual(firstTarget.targetCell, neighborsA[0]);
            // Positive delta: water flows from cellA (500) to neighbor (100)
            assert.ok(firstTarget.deltaWater > 0);
            assert.ok(firstTarget.deltaCarbon > 0);
            assert.ok(firstTarget.deltaOxygen > 0);
            assert.ok(firstTarget.deltaMinerals > 0);
            assert.ok(firstTarget.deltaEnthalpy > 0);
            // Now compute reverse flux from neighbor back to cellA
            const neighborState = map.get(neighborsA[0]);
            const reverseMap = new Map();
            reverseMap.set(cellA, stateA);
            for (const other of neighborState.neighbors.slice(1)) {
                reverseMap.set(other, {
                    cellIndex: other,
                    stocks: { water: 100, carbon: 50, oxygen: 20, minerals: 10, enthalpy: 200 },
                    neighbors: [
                        neighborState.cellIndex, '8031fffffffffff', '8033fffffffffff',
                        '8035fffffffffff', '8037fffffffffff', '8039fffffffffff'
                    ]
                });
            }
            const reverseFlux = computeHarmonizedFluxDeltas(neighborState, reverseMap, 1.0).unwrap();
            const transferBackToA = reverseFlux.find((t) => t.targetCell === cellA);
            assert.ok(transferBackToA !== undefined);
            // Exact pairwise antisymmetry check: Delta S_{A -> B} + Delta S_{B -> A} === 0
            const sumWater = firstTarget.deltaWater + transferBackToA.deltaWater;
            const sumEnthalpy = firstTarget.deltaEnthalpy + transferBackToA.deltaEnthalpy;
            assert.ok(Math.abs(sumWater) < 1e-12, 'Water flux sum must conserve to 0');
            assert.ok(Math.abs(sumEnthalpy) < 1e-12, 'Enthalpy flux sum must conserve to 0');
        });
        it('aborts flux computation with FluxConservationError if a neighbor has topological defect', () => {
            const stateA = {
                cellIndex: knownHexagon,
                stocks: { water: 500, carbon: 200, oxygen: 100, minerals: 50, enthalpy: 1000 },
                neighbors: [
                    '8003fffffffffff', '8005fffffffffff', '8007fffffffffff',
                    '8013fffffffffff', '8015fffffffffff', '8017fffffffffff'
                ]
            };
            const defectiveMap = new Map();
            // Provide neighbor with defective neighbor count (only 4 neighbors)
            for (const n of stateA.neighbors) {
                defectiveMap.set(n, {
                    cellIndex: n,
                    stocks: { water: 100, carbon: 50, oxygen: 20, minerals: 10, enthalpy: 200 },
                    neighbors: ['8001fffffffffff', '8021fffffffffff', '8023fffffffffff', '8025fffffffffff'] // 4 neighbors, defect!
                });
            }
            const fluxResult = computeHarmonizedFluxDeltas(stateA, defectiveMap, 1.0);
            assert.strictEqual(fluxResult.isErr(), true);
            assert.ok(fluxResult.unwrapErr() instanceof FluxConservationError);
        });
    });
});
