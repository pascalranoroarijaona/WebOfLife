import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as h3 from 'h3-js';
import { computeBoundaryMidpointLatLng, computeGreatCircleDistance, computeMidpointCoriolis, computeMidpointSolarIrradiance, evaluateBoundaryInterface, SpatialBoundaryMonad, SpatialAdjacencyGraph, } from '../src/spatial/h3_adjacency.js';
describe('Sprint 058 - Spherical Boundary Midpoint & Interfacial Adjacency', () => {
    // Test 1: Equatorial Co-linear Test
    it('computes exact midpoint along equatorial co-linear points: (0, 10) and (0, 20) -> (0, 15)', () => {
        const c1 = { lat: 0, lng: 10 };
        const c2 = { lat: 0, lng: 20 };
        const midpoint = computeBoundaryMidpointLatLng(c1, c2);
        assert.ok(Math.abs(midpoint.lat - 0) < 1e-12, `Expected lat ~ 0, got ${midpoint.lat}`);
        assert.ok(Math.abs(midpoint.lng - 15) < 1e-12, `Expected lng ~ 15, got ${midpoint.lng}`);
    });
    // Test 2: Meridian Arc Test
    it('computes exact midpoint along a meridian: (10, 0) and (30, 0) -> (20, 0)', () => {
        const c1 = { lat: 10, lng: 0 };
        const c2 = { lat: 30, lng: 0 };
        const midpoint = computeBoundaryMidpointLatLng(c1, c2);
        assert.ok(Math.abs(midpoint.lat - 20) < 1e-12, `Expected lat ~ 20, got ${midpoint.lat}`);
        assert.ok(Math.abs(midpoint.lng - 0) < 1e-12, `Expected lng ~ 0, got ${midpoint.lng}`);
    });
    // Test 3: Antimeridian Crossing Test
    it('correctly handles antimeridian crossing between (10, 179) and (10, -179) without falling near prime meridian', () => {
        const c1 = { lat: 10, lng: 179 };
        const c2 = { lat: 10, lng: -179 };
        const midpoint = computeBoundaryMidpointLatLng(c1, c2);
        // Midpoint longitude must be +/-180, not near 0
        assert.ok(Math.abs(Math.abs(midpoint.lng) - 180) < 1e-9, `Expected lng +/-180, got ${midpoint.lng}`);
        // Latitude must be slightly above 10 degrees due to great circle curvature (~10.00147 deg)
        assert.ok(midpoint.lat > 10.0 && midpoint.lat < 10.1, `Expected lat ~ 10.001 deg, got ${midpoint.lat}`);
    });
    // Test 4: Polar Proximity Test
    it('computes spherical midpoint for high-latitude points across prime meridian', () => {
        const c1 = { lat: 85, lng: -10 };
        const c2 = { lat: 85, lng: 10 };
        const midpoint = computeBoundaryMidpointLatLng(c1, c2);
        // Midpoint should lie on the prime meridian (lng = 0)
        assert.ok(Math.abs(midpoint.lng) < 1e-10, `Expected lng ~ 0, got ${midpoint.lng}`);
        // The great circle arc bends towards the pole: midpoint latitude > 85
        assert.ok(midpoint.lat > 85.0 && midpoint.lat <= 90.0, `Expected lat > 85, got ${midpoint.lat}`);
    });
    // Test 5: Commutativity / Symmetry Axiom
    it('satisfies commutativity M(A, B) === M(B, A) to within 1e-9 degrees', () => {
        const a = { lat: 37.7749, lng: -122.4194 };
        const b = { lat: 34.0522, lng: -118.2437 };
        const mAB = computeBoundaryMidpointLatLng(a, b);
        const mBA = computeBoundaryMidpointLatLng(b, a);
        assert.ok(Math.abs(mAB.lat - mBA.lat) < 1e-9, `Latitude asymmetry: ${Math.abs(mAB.lat - mBA.lat)}`);
        assert.ok(Math.abs(mAB.lng - mBA.lng) < 1e-9, `Longitude asymmetry: ${Math.abs(mAB.lng - mBA.lng)}`);
    });
    // Test 6: Equidistance Verification
    it('satisfies equidistance d(A, M) === d(B, M) === 0.5 * d(A, B) within relative tolerance < 1e-7', () => {
        const a = { lat: -25.2744, lng: 133.7751 };
        const b = { lat: -20.1234, lng: 138.5678 };
        const mid = computeBoundaryMidpointLatLng(a, b);
        const dAM = computeGreatCircleDistance(a, mid);
        const dBM = computeGreatCircleDistance(b, mid);
        const dAB = computeGreatCircleDistance(a, b);
        const relDiff = Math.abs(dAM - dBM) / dAB;
        assert.ok(relDiff < 1e-7, `Relative difference ${relDiff} exceeded tolerance 1e-7`);
        const splitError = Math.abs((dAM + dBM) - dAB) / dAB;
        assert.ok(splitError < 1e-7, `Split distance error ${splitError} exceeded tolerance 1e-7`);
    });
    // Test 7: Idempotence Axiom
    it('satisfies idempotence M(A, A) === A', () => {
        const a = { lat: 51.5074, lng: -0.1278 };
        const mid = computeBoundaryMidpointLatLng(a, a);
        assert.strictEqual(mid.lat, a.lat);
        assert.strictEqual(mid.lng, a.lng);
    });
    // Test 8: Realistic H3 Adjacency Test
    it('computes interface boundary between adjacent resolution 3 H3 hexel centroids', () => {
        const anyH3 = h3;
        // Generate valid resolution 3 cell index
        let originHex;
        if (typeof anyH3.latLngToCell === 'function') {
            originHex = anyH3.latLngToCell(45.0, 5.0, 3);
        }
        else if (typeof anyH3.geoToH3 === 'function') {
            originHex = anyH3.geoToH3(45.0, 5.0, 3);
        }
        else {
            originHex = '831f95fffffffff';
        }
        let neighbors = [];
        if (typeof anyH3.gridDisk === 'function') {
            neighbors = anyH3.gridDisk(originHex, 1).filter((h) => h !== originHex);
        }
        else if (typeof anyH3.kRing === 'function') {
            neighbors = anyH3.kRing(originHex, 1).filter((h) => h !== originHex);
        }
        if (neighbors.length > 0) {
            const neighborHex = neighbors[0];
            const boundary = evaluateBoundaryInterface(originHex, neighborHex);
            assert.strictEqual(boundary.originHex, originHex);
            assert.strictEqual(boundary.neighborHex, neighborHex);
            assert.ok(boundary.distanceMeters > 50000 && boundary.distanceMeters < 250000, `Unexpected distance: ${boundary.distanceMeters}`);
        }
    });
    // Test 9: Coriolis Parameter Calculation at Boundary Midpoint
    it('computes midpoint Coriolis parameter properly according to latitude', () => {
        const fEquator = computeMidpointCoriolis(0);
        assert.strictEqual(fEquator, 0);
        const fNorth = computeMidpointCoriolis(45);
        assert.ok(fNorth > 0, 'Coriolis parameter should be positive in the northern hemisphere');
        const fSouth = computeMidpointCoriolis(-45);
        assert.ok(fSouth < 0, 'Coriolis parameter should be negative in the southern hemisphere');
        assert.ok(Math.abs(fNorth + fSouth) < 1e-12, 'Coriolis parameter should be antisymmetric across the equator');
    });
    // Test 10: Midpoint Solar Irradiance Computation
    it('computes solar irradiance at boundary midpoint across day and night', () => {
        const noonIrradiance = computeMidpointSolarIrradiance(0, 0, 0, 12);
        assert.ok(noonIrradiance > 1000, `Expected high solar irradiance at noon, got ${noonIrradiance}`);
        const midnightIrradiance = computeMidpointSolarIrradiance(0, 0, 0, 0);
        assert.strictEqual(midnightIrradiance, 0, 'Expected zero solar irradiance at midnight');
        const dawnIrradiance = computeMidpointSolarIrradiance(0, 0, 0, 6);
        assert.ok(dawnIrradiance >= 0 && dawnIrradiance < noonIrradiance, 'Dawn irradiance should be non-negative and less than noon');
    });
    // Test 11: Diffusive Exchange via SpatialBoundaryMonad
    it('conserves total mass and energy during diffusive exchange in SpatialBoundaryMonad', () => {
        const state1 = {
            carbonKg: 100,
            waterKg: 200,
            oxygenKg: 50,
            mineralsKg: 20,
            energyJoules: 1000,
        };
        const state2 = {
            carbonKg: 40,
            waterKg: 80,
            oxygenKg: 20,
            mineralsKg: 10,
            energyJoules: 400,
        };
        const boundary = { contactLengthMeters: 500 };
        const monad = SpatialBoundaryMonad.of(state1, state2, boundary);
        const coeffs = {
            diffCarbon: 10,
            diffWater: 10,
            diffOxygen: 10,
            diffMinerals: 10,
            thermalCond: 10,
        };
        const [next1, next2, deltas] = monad.computeTransfer(1, 500, 1000, coeffs);
        assert.ok(deltas.deltaCarbonKg > 0, 'Expected positive carbon flux from higher to lower concentration');
        assert.ok(next1.carbonKg < state1.carbonKg, 'Source cell should decrease in carbon stock');
        assert.ok(next2.carbonKg > state2.carbonKg, 'Target cell should increase in carbon stock');
        // Strict First Law Conservation check: sum of stocks before equals sum of stocks after
        const initialCarbon = state1.carbonKg + state2.carbonKg;
        const finalCarbon = next1.carbonKg + next2.carbonKg;
        assert.ok(Math.abs(initialCarbon - finalCarbon) < 1e-9, 'Mass conservation violated for carbon');
        const initialEnergy = state1.energyJoules + state2.energyJoules;
        const finalEnergy = next1.energyJoules + next2.energyJoules;
        assert.ok(Math.abs(initialEnergy - finalEnergy) < 1e-9, 'Energy conservation violated for internal energy');
    });
    // Test 12: SpatialAdjacencyGraph Boundary Registration and Inter-cell Flux
    it('records boundaries and computes conservative flux in SpatialAdjacencyGraph', () => {
        const graph = new SpatialAdjacencyGraph();
        const boundaryData = { length: 500, area: 1000 };
        graph.addAdjacency('cell_A', 'cell_B', boundaryData);
        const neighbors = graph.getNeighbors('cell_A');
        assert.ok(neighbors.includes('cell_B'), 'cell_B should be registered as neighbor of cell_A');
        const retrievedBoundary = graph.getBoundary('cell_A', 'cell_B');
        assert.deepStrictEqual(retrievedBoundary, boundaryData);
        const stockA = { waterKg: 500 };
        const stockB = { waterKg: 200 };
        const [updatedA, updatedB, flux] = graph.computeInterCellFlux(stockA, stockB, retrievedBoundary, 1, 500, 1000);
        assert.ok(flux.deltaWaterKg > 0, 'Flux should move from cell A to cell B');
        assert.ok(updatedA.waterKg < stockA.waterKg, 'Cell A water should decrease');
        assert.ok(updatedB.waterKg > stockB.waterKg, 'Cell B water should increase');
        assert.ok(Math.abs((updatedA.waterKg + updatedB.waterKg) - (stockA.waterKg + stockB.waterKg)) < 1e-9, 'Total water must be conserved across the graph edge');
    });
});
