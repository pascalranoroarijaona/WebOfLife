// =============================================================================
// WEB OF LIFE - SPRINT 047 TEST SUITE
// Spherical Geodesic Edge Scaling & calculateH3EdgeLengthMeters Verification
// =============================================================================
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateH3EdgeLengthMeters, calculateH3EdgeLengthAnalytical, createH3BoundaryInterface, getH3EdgeMetrics, computeBoundaryDiffusionStep, computeBoundaryThermalExchangeStep, computeBoundaryHydraulicExchangeStep, H3AdjacencyGraph, H3_NOMINAL_EDGE_LENGTH_TABLE } from '../src/spatial/h3_adjacency.js';
import { H3Grid } from '../src/spatial/h3_grid.js';
import { SpatialMonad } from '../src/monads/spatial_monad.js';
import { bootstrapMegaPod, EarthPOD } from '../src/earth_pod.js';
describe('Sprint 047: Spherical Geodesic Edge Scaling Architecture', () => {
    describe('calculateH3EdgeLengthMeters: Precision & Reference Invariants', () => {
        it('returns exact reference edge lengths for resolutions 0, 7, and 15 within ±0.01 tolerance', () => {
            const edge0 = calculateH3EdgeLengthMeters(0);
            assert.ok(Math.abs(edge0 - 1_107_712.59) < 0.01, `Expected res 0 to be ~1107712.59, got ${edge0}`);
            const edge7 = calculateH3EdgeLengthMeters(7);
            assert.ok(Math.abs(edge7 - 1_220.63) < 0.01, `Expected res 7 to be ~1220.63, got ${edge7}`);
            const edge15 = calculateH3EdgeLengthMeters(15);
            assert.ok(Math.abs(edge15 - 0.51) < 0.01, `Expected res 15 to be ~0.51, got ${edge15}`);
        });
        it('faithfully matches the full nominal specification table across all resolutions 0 to 15', () => {
            for (let r = 0; r <= 15; r++) {
                const expected = H3_NOMINAL_EDGE_LENGTH_TABLE[r];
                const computed = calculateH3EdgeLengthMeters(r);
                assert.strictEqual(computed, expected, `Mismatch at resolution ${r}`);
            }
        });
        it('is strictly monotonic decreasing: L(r+1) < L(r) for all r in [0, 14]', () => {
            for (let r = 0; r < 15; r++) {
                const lr = calculateH3EdgeLengthMeters(r);
                const lNext = calculateH3EdgeLengthMeters(r + 1);
                assert.ok(lNext < lr, `Monotonicity violated: L(${r + 1}) = ${lNext} is not < L(${r}) = ${lr}`);
                // Aperture-7 scaling ratio is approximately sqrt(7) ~ 2.64575
                const ratio = lr / lNext;
                assert.ok(ratio >= 2.4 && ratio <= 2.9, `Scaling ratio between resolution ${r} and ${r + 1} (${ratio}) deviated excessively from sqrt(7)`);
            }
        });
        it('analytical fall-back closely tracks discrete table within spherical distortion bounds', () => {
            for (let r = 0; r <= 15; r++) {
                const discrete = calculateH3EdgeLengthMeters(r);
                const analytical = calculateH3EdgeLengthAnalytical(r);
                const errorPercent = (Math.abs(discrete - analytical) / discrete) * 100;
                // Due to icosahedral spherical projection, divergence stays < 10%
                assert.ok(errorPercent < 10.0, `Analytical formula diverged by ${errorPercent}% at resolution ${r}`);
            }
        });
    });
    describe('calculateH3EdgeLengthMeters: Validation & Error Handling', () => {
        it('throws RangeError for negative numbers', () => {
            assert.throws(() => calculateH3EdgeLengthMeters(-1), RangeError);
            assert.throws(() => calculateH3EdgeLengthMeters(-99), RangeError);
        });
        it('throws RangeError for numbers > 15', () => {
            assert.throws(() => calculateH3EdgeLengthMeters(16), RangeError);
            assert.throws(() => calculateH3EdgeLengthMeters(100), RangeError);
        });
        it('throws RangeError for non-integers', () => {
            assert.throws(() => calculateH3EdgeLengthMeters(2.5), RangeError);
            assert.throws(() => calculateH3EdgeLengthMeters(0.1), RangeError);
            assert.throws(() => calculateH3EdgeLengthMeters(14.99), RangeError);
        });
        it('throws RangeError for NaN, Infinity, and non-numeric inputs', () => {
            assert.throws(() => calculateH3EdgeLengthMeters(NaN), RangeError);
            assert.throws(() => calculateH3EdgeLengthMeters(Infinity), RangeError);
            assert.throws(() => calculateH3EdgeLengthMeters(-Infinity), RangeError);
            assert.throws(() => calculateH3EdgeLengthMeters('7'), RangeError);
            assert.throws(() => calculateH3EdgeLengthMeters(null), RangeError);
        });
    });
    describe('createH3BoundaryInterface & getH3EdgeMetrics', () => {
        it('computes center distance and contact area adhering to regular hexagonal geometry', () => {
            const res = 7;
            const boundary = createH3BoundaryInterface(res);
            const edge = calculateH3EdgeLengthMeters(res);
            assert.strictEqual(boundary.resolution, 7);
            assert.strictEqual(boundary.edgeLengthMeters, edge);
            assert.strictEqual(boundary.centerDistanceMeters, Math.sqrt(3) * edge);
            const activeDepth = 2.5; // meters
            const expectedArea = edge * activeDepth;
            assert.strictEqual(boundary.calculateContactArea(activeDepth), expectedArea);
        });
        it('throws RangeError on negative active column depth', () => {
            const boundary = createH3BoundaryInterface(5);
            assert.throws(() => boundary.calculateContactArea(-1.0), RangeError);
        });
        it('getH3EdgeMetrics produces valid metric closures', () => {
            const metrics = getH3EdgeMetrics(4);
            assert.strictEqual(metrics.resolution, 4);
            assert.strictEqual(metrics.edgeLengthMeters, 22_606.38);
            assert.strictEqual(metrics.boundaryContactAreaMeters2(10), 226_063.8);
            assert.throws(() => metrics.boundaryContactAreaMeters2(-5), RangeError);
        });
    });
    describe('H3AdjacencyGraph: Topology & Memoization', () => {
        it('memoizes edge length calculations without re-evaluating lookups', () => {
            const graph = new H3AdjacencyGraph(6);
            const edge1 = graph.getEdgeLength();
            const edge2 = graph.getEdgeLength(6);
            assert.strictEqual(edge1, edge2);
            assert.strictEqual(edge1, 3_229.48);
            const edge9 = graph.getEdgeLength(9);
            assert.strictEqual(edge9, 174.38);
        });
        it('manages cell neighbors and adjacency undirected pairs', () => {
            const graph = new H3AdjacencyGraph(8);
            graph.addAdjacency('cell_A', 'cell_B');
            graph.addAdjacency('cell_B', 'cell_C');
            assert.deepStrictEqual(graph.getNeighbors('cell_A'), ['cell_B']);
            assert.deepStrictEqual(graph.getNeighbors('cell_B').sort(), ['cell_A', 'cell_C'].sort());
            assert.deepStrictEqual(graph.getNeighbors('cell_C'), ['cell_B']);
            assert.strictEqual(graph.cellCount, 3);
        });
    });
    describe('Thermodynamic Mass-Energy Conservation Verification', () => {
        it('Process 1 (Fickian Mass Diffusion): strictly conserves mass across shared edge', () => {
            const resolution = 7;
            const depth = 2.0;
            const deltaT = 3600; // 1 hour
            const diffusionCoeff = 1.5e-5; // m^2/s
            const stockSource = 100.0; // kg
            const stockTarget = 20.0; // kg
            const volumeSource = 10_000.0; // m^3
            const volumeTarget = 10_000.0; // m^3
            const result = computeBoundaryDiffusionStep(stockSource, stockTarget, volumeSource, volumeTarget, diffusionCoeff, resolution, depth, deltaT);
            // Mass transfer invariant: deltaStockSource + deltaStockTarget = 0
            const netDelta = result.deltaStockSource + result.deltaStockTarget;
            assert.ok(Math.abs(netDelta) < 1e-12, `Net mass change must be 0, got ${netDelta}`);
            // Solute flows from higher concentration (0.01 kg/m^3) to lower (0.002 kg/m^3)
            assert.ok(result.deltaStockSource < 0, 'Source stock should decrease');
            assert.ok(result.deltaStockTarget > 0, 'Target stock should increase');
            assert.strictEqual(-result.deltaStockSource, result.deltaStockTarget);
        });
        it('Process 2 (Fourier Heat Transfer): strictly satisfies First Law and produces non-negative entropy', () => {
            const resolution = 8;
            const depth = 1.0;
            const deltaT = 60; // 1 min
            const conductivity = 0.6; // W/(m*K)
            const tempHot = 310.15; // 37°C
            const tempCold = 285.15; // 12°C
            const result = computeBoundaryThermalExchangeStep(tempHot, tempCold, conductivity, resolution, depth, deltaT);
            // Energy Conservation: deltaHeatSource + deltaHeatTarget = 0
            const netHeat = result.deltaHeatJoulesSource + result.deltaHeatJoulesTarget;
            assert.ok(Math.abs(netHeat) < 1e-9, `Net heat change must be 0, got ${netHeat}`);
            // Heat leaves hot column and enters cold column
            assert.ok(result.deltaHeatJoulesSource < 0, 'Hot body must lose thermal energy');
            assert.ok(result.deltaHeatJoulesTarget > 0, 'Cold body must gain thermal energy');
            // Second Law Invariant: entropy production >= 0
            assert.ok(result.entropyProductionJoulesPerKelvin >= 0, `Entropy production must be non-negative, got ${result.entropyProductionJoulesPerKelvin}`);
        });
        it('Process 3 (Hydraulic Conveyance): preserves total water mass and volume', () => {
            const resolution = 6;
            const deltaT = 100;
            const hydConductivity = 0.05;
            const headSource = 120.0; // higher head
            const headTarget = 115.0; // lower head
            const waterDepthSource = 3.0;
            const waterDepthTarget = 2.0;
            const result = computeBoundaryHydraulicExchangeStep(headSource, headTarget, waterDepthSource, waterDepthTarget, hydConductivity, resolution, deltaT);
            assert.ok(Math.abs(result.deltaVolumeM3Source + result.deltaVolumeM3Target) < 1e-12, 'Volume conservation violated');
            assert.ok(Math.abs(result.deltaMassKgSource + result.deltaMassKgTarget) < 1e-9, 'Mass conservation violated');
            assert.ok(result.deltaVolumeM3Source < 0, 'Water should discharge from source');
            assert.ok(result.deltaVolumeM3Target > 0, 'Water should accumulate in target');
        });
    });
    describe('H3Grid & SpatialMonad Integration', () => {
        it('initializes H3Grid with consistent aperture-7 metrics', () => {
            const grid = new H3Grid(7);
            assert.strictEqual(grid.resolution, 7);
            assert.strictEqual(grid.edgeLengthMeters, 1_220.63);
            grid.setCell('cell_1', { vegetationIndex: 0.82 });
            grid.setCell('cell_2', { vegetationIndex: 0.45 });
            grid.linkNeighbors('cell_1', 'cell_2');
            assert.strictEqual(grid.size, 2);
            assert.deepStrictEqual(grid.getNeighbors('cell_1'), ['cell_2']);
        });
        it('performs monadic diffusion step conserving total solute across adjacent cells', () => {
            const stateA = {
                massKg: 10_000,
                temperatureK: 295,
                dissolvedSoluteKg: 50.0,
                surfaceWaterDepthMeters: 1.0,
                bedrockElevationMeters: 100.0
            };
            const stateB = {
                massKg: 10_000,
                temperatureK: 295,
                dissolvedSoluteKg: 10.0,
                surfaceWaterDepthMeters: 1.0,
                bedrockElevationMeters: 100.0
            };
            const monadA = SpatialMonad.of('cell_A', 8, stateA);
            const monadB = SpatialMonad.of('cell_B', 8, stateB);
            const { source, target } = monadA.diffuseWith(monadB, 1.0, 1e-4, 300);
            const totalInitial = stateA.dissolvedSoluteKg + stateB.dissolvedSoluteKg;
            const totalFinal = source.value.dissolvedSoluteKg + target.value.dissolvedSoluteKg;
            assert.ok(Math.abs(totalInitial - totalFinal) < 1e-12, `Conservation of solute failed: initial=${totalInitial}, final=${totalFinal}`);
            assert.ok(source.value.dissolvedSoluteKg < 50.0);
            assert.ok(target.value.dissolvedSoluteKg > 10.0);
        });
        it('preserves existing bootstrapMegaPod and EarthPOD core functionality without regressions', () => {
            const { earth, sun } = bootstrapMegaPod();
            assert.ok(earth instanceof EarthPOD);
            assert.strictEqual(earth.name, 'Earth');
            assert.strictEqual(sun.name, 'Sun');
            const tickReport = earth.fullTick(1);
            assert.ok(tickReport.earth);
            assert.ok(earth.totalDescendantBiomass() > 0);
        });
    });
});
