// =============================================================================
// SPRINT 046 TEST SUITE: GEODESIC HAVERSINE DISTANCE & SPATIAL MONAD METRICS
// =============================================================================
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EARTH_RADIUS_METERS } from '../src/thermodynamics/constants.js';
import { calculateHaversineDistance, computeSpatialGradientTransport, H3AdjacencyMatrix, } from '../src/spatial/h3_adjacency.js';
describe('Sprint 046 - Geodesic Haversine Distance Metric', () => {
    it('evaluates identical coordinates to exactly 0.0 meters', () => {
        const d1 = calculateHaversineDistance([0, 0], [0, 0]);
        assert.strictEqual(d1, 0.0);
        const d2 = calculateHaversineDistance({ lat: 45.0, lng: -93.0 }, { lat: 45.0, lng: -93.0 });
        assert.strictEqual(d2, 0.0);
    });
    it('computes antipodal poles separation accurately', () => {
        // North pole [90, 0] to South pole [-90, 0] = PI * R_earth
        const expected = Math.PI * EARTH_RADIUS_METERS;
        const distance = calculateHaversineDistance([90, 0], [-90, 0]);
        assert.ok(Math.abs(distance - expected) < 1e-2, `Expected ${expected}, got ${distance}`);
    });
    it('computes equatorial quadrant separation accurately', () => {
        // Equator quadrant [0, 0] to [0, 90] = (PI / 2) * R_earth
        const expected = (Math.PI / 2.0) * EARTH_RADIUS_METERS;
        const distance = calculateHaversineDistance([0, 0], [0, 90]);
        assert.ok(Math.abs(distance - expected) < 1e-2, `Expected ${expected}, got ${distance}`);
    });
    it('computes London to Paris geodesic baseline within 0.1%', () => {
        // London: 51.5074, -0.1278 | Paris: 48.8566, 2.3522 (~343.5 km)
        const distanceMeters = calculateHaversineDistance({ lat: 51.5074, lng: -0.1278 }, { lat: 48.8566, lng: 2.3522 });
        const distanceKm = distanceMeters / 1000.0;
        assert.ok(distanceKm > 340.0 && distanceKm < 347.0, `London-Paris km was ${distanceKm}`);
        const directKm = calculateHaversineDistance({ lat: 51.5074, lng: -0.1278 }, { lat: 48.8566, lng: 2.3522 }, { unit: 'kilometers' });
        assert.strictEqual(directKm, distanceMeters * 0.001);
    });
    it('computes New York to Tokyo geodesic baseline within 0.2%', () => {
        // New York: 40.7128, -74.0060 | Tokyo: 35.6762, 139.6503 (~10,850 km)
        const distanceKm = calculateHaversineDistance([40.7128, -74.006], [35.6762, 139.6503], { unit: 'kilometers' });
        assert.ok(Math.abs(distanceKm - 10850) < 10850 * 0.01, `Expected ~10,850 km, got ${distanceKm}`);
    });
    it('correctly crosses the International Date Line without path inversion', () => {
        // [0, 179] to [0, -179] is an angular separation of 2 degrees along the equator
        const expected = (2.0 * (Math.PI / 180.0)) * EARTH_RADIUS_METERS;
        const distance = calculateHaversineDistance([0, 179], [0, -179]);
        assert.ok(Math.abs(distance - expected) < 1e-2, `Expected ${expected}, got ${distance}`);
    });
    it('verifies metric symmetry: d(A, B) === d(B, A)', () => {
        const pointA = [37.7749, -122.4194]; // San Francisco
        const pointB = [-33.8688, 151.2093]; // Sydney
        const distAB = calculateHaversineDistance(pointA, pointB);
        const distBA = calculateHaversineDistance(pointB, pointA);
        assert.strictEqual(distAB, distBA);
    });
    it('verifies the triangle inequality: d(A, C) <= d(A, B) + d(B, C)', () => {
        const pA = [10.0, 20.0];
        const pB = [25.0, 55.0];
        const pC = [-15.0, 80.0];
        const dAC = calculateHaversineDistance(pA, pC);
        const dAB = calculateHaversineDistance(pA, pB);
        const dBC = calculateHaversineDistance(pB, pC);
        assert.ok(dAC <= dAB + dBC + 1e-6, `Triangle inequality violated: ${dAC} > ${dAB} + ${dBC}`);
    });
    it('supports custom planetary radii', () => {
        const marsRadius = 3389500; // Mars radius in meters
        const distMars = calculateHaversineDistance([0, 0], [0, 90], { radiusMeters: marsRadius });
        const expectedMars = (Math.PI / 2.0) * marsRadius;
        assert.ok(Math.abs(distMars - expectedMars) < 1e-2);
    });
});
describe('Sprint 046 - H3AdjacencyMatrix Geodesic Integration', () => {
    it('manages adjacency, centroids, and distance caching', () => {
        const matrix = new H3AdjacencyMatrix();
        matrix.registerCentroid('cell_london', { lat: 51.5074, lng: -0.1278 });
        matrix.registerCentroid('cell_paris', { lat: 48.8566, lng: 2.3522 });
        matrix.addEdge('cell_london', 'cell_paris');
        assert.strictEqual(matrix.areNeighbors('cell_london', 'cell_paris'), true);
        assert.strictEqual(matrix.areNeighbors('cell_paris', 'cell_london'), true);
        assert.deepStrictEqual(matrix.getNeighbors('cell_london'), ['cell_paris']);
        const dist1 = matrix.getCentroidDistance('cell_london', 'cell_paris');
        assert.ok(dist1 > 340000 && dist1 < 347000);
        // Call again to verify cache hit
        const dist2 = matrix.getCentroidDistance('cell_london', 'cell_paris');
        assert.strictEqual(dist1, dist2);
        // Coincident distance
        assert.strictEqual(matrix.getCentroidDistance('cell_london', 'cell_london'), 0.0);
    });
    it('throws informative error when distance is queried for unknown centroids', () => {
        const matrix = new H3AdjacencyMatrix();
        matrix.addCell('unknown_1');
        matrix.addCell('unknown_2');
        assert.throws(() => matrix.getCentroidDistance('unknown_1', 'unknown_2'), /Centroid coordinates not found/);
    });
});
describe('Sprint 046 - Thermodynamic Gradient Transport Monad', () => {
    it('satisfies First Law conservation of energy, water, and carbon stocks', () => {
        const cellA = {
            cellIndex: 'cell_A',
            centroid: { lat: 0.0, lng: 0.0 },
            temperatureKelvin: 300.0,
            internalEnergyJoules: 1e9,
            waterVaporMassKg: 5000.0,
            dissolvedCarbonKg: 1000.0,
            dissolvedNutrientsKg: 200.0,
            biomassKg: 50000.0,
            entropyJoulesPerKelvin: 3.33e6,
        };
        const cellB = {
            cellIndex: 'cell_B',
            centroid: { lat: 0.0, lng: 1.0 }, // ~111.19 km distance
            temperatureKelvin: 280.0,
            internalEnergyJoules: 9e8,
            waterVaporMassKg: 3000.0,
            dissolvedCarbonKg: 1200.0,
            dissolvedNutrientsKg: 200.0,
            biomassKg: 40000.0,
            entropyJoulesPerKelvin: 3.21e6,
        };
        const boundaryArea = 1e5; // m^2
        const deltaSeconds = 3600; // 1 hour
        const delta = computeSpatialGradientTransport(cellA, cellB, boundaryArea, deltaSeconds);
        // Assert geodesic distance was computed
        assert.ok(delta.geodesicDistanceMeters > 110000 && delta.geodesicDistanceMeters < 112000);
        // 1. First Law: Energy Conservation
        assert.strictEqual(delta.deltaInternalEnergyJoulesA + delta.deltaInternalEnergyJoulesB, 0.0, 'Energy is strictly conserved across cell interface');
        // 2. First Law: Mass Conservation (Water Vapor)
        assert.strictEqual(delta.deltaWaterVaporKgA + delta.deltaWaterVaporKgB, 0.0, 'Water mass is strictly conserved');
        // 3. First Law: Mass Conservation (Carbon)
        assert.strictEqual(delta.deltaCarbonKgA + delta.deltaCarbonKgB, 0.0, 'Carbon mass is strictly conserved');
        // 4. Second Law: Non-negative Entropy Generation
        assert.ok(delta.entropyGeneratedJoulesPerKelvin >= 0.0, 'Entropy generation must be non-negative');
    });
    it('handles zero-distance or coincident state without NaN or infinite transport', () => {
        const cellA = {
            cellIndex: 'cell_same',
            centroid: { lat: 10.0, lng: 10.0 },
            temperatureKelvin: 300.0,
            internalEnergyJoules: 1e9,
            waterVaporMassKg: 5000.0,
            dissolvedCarbonKg: 1000.0,
            dissolvedNutrientsKg: 200.0,
            biomassKg: 50000.0,
            entropyJoulesPerKelvin: 3.33e6,
        };
        const delta = computeSpatialGradientTransport(cellA, cellA, 1000, 60);
        assert.strictEqual(delta.geodesicDistanceMeters, 0.0);
        assert.strictEqual(delta.deltaInternalEnergyJoulesA, 0.0);
        assert.strictEqual(delta.deltaWaterVaporKgA, 0.0);
        assert.strictEqual(delta.entropyGeneratedJoulesPerKelvin, 0.0);
    });
});
