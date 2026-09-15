// File: tests/sprint_059.test.ts
// =============================================================================
// VERIFICATION TEST SUITE: computeSphericalGreatCircleNormal3D (RFC-059)
// =============================================================================
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeSphericalGreatCircleNormal3D, latLngToUnitVector3D, unitVectorToLatLng, dotProduct3D, vectorNorm3D, advectiveBoundaryFluxMonad, H3Adjacency, createVec3D, } from '../src/spatial/h3_adjacency.js';
describe('RFC-059: Spherical Great Circle Plane Normal Vector Computation', () => {
    it('1. Canonical Axes: computes expected orthogonal normals', () => {
        // Equator (0N, 0E) -> [1, 0, 0]
        // Equator (0N, 90E) -> [0, 1, 0]
        // u x v should point directly to North Pole [0, 0, 1]
        const u = createVec3D(1, 0, 0);
        const v = createVec3D(0, 1, 0);
        const normal = computeSphericalGreatCircleNormal3D(u, v);
        assert.ok(Math.abs(normal[0] - 0) < 1e-12);
        assert.ok(Math.abs(normal[1] - 0) < 1e-12);
        assert.ok(Math.abs(normal[2] - 1) < 1e-12);
        // [0, 1, 0] x [0, 0, 1] -> [1, 0, 0]
        const normal2 = computeSphericalGreatCircleNormal3D(createVec3D(0, 1, 0), createVec3D(0, 0, 1));
        assert.ok(Math.abs(normal2[0] - 1) < 1e-12);
        assert.ok(Math.abs(normal2[1] - 0) < 1e-12);
        assert.ok(Math.abs(normal2[2] - 0) < 1e-12);
        // [0, 0, 1] x [1, 0, 0] -> [0, 1, 0]
        const normal3 = computeSphericalGreatCircleNormal3D(createVec3D(0, 0, 1), createVec3D(1, 0, 0));
        assert.ok(Math.abs(normal3[0] - 0) < 1e-12);
        assert.ok(Math.abs(normal3[1] - 1) < 1e-12);
        assert.ok(Math.abs(normal3[2] - 0) < 1e-12);
    });
    it('2. Right-Hand Rule and Anti-Symmetry Invariant', () => {
        const u = latLngToUnitVector3D(45.0, 10.0);
        const v = latLngToUnitVector3D(-30.0, 75.0);
        const nUV = computeSphericalGreatCircleNormal3D(u, v);
        const nVU = computeSphericalGreatCircleNormal3D(v, u);
        // n(u, v) = -n(v, u)
        assert.ok(Math.abs(nUV[0] + nVU[0]) < 1e-12);
        assert.ok(Math.abs(nUV[1] + nVU[1]) < 1e-12);
        assert.ok(Math.abs(nUV[2] + nVU[2]) < 1e-12);
    });
    it('3. Orthogonality Condition: normal is strictly perpendicular to both u and v', () => {
        const testPairs = [
            [createVec3D(...latLngToUnitVector3D(20.0, -40.0)), createVec3D(...latLngToUnitVector3D(55.0, 120.0))],
            [createVec3D(...latLngToUnitVector3D(-60.0, 170.0)), createVec3D(...latLngToUnitVector3D(15.0, -10.0))],
            [createVec3D(...latLngToUnitVector3D(0.0, 0.0)), createVec3D(...latLngToUnitVector3D(85.0, 45.0))]
        ];
        for (const [u, v] of testPairs) {
            const n = computeSphericalGreatCircleNormal3D(u, v);
            const dotU = dotProduct3D(n, u);
            const dotV = dotProduct3D(n, v);
            assert.ok(Math.abs(dotU) < 1e-10, `Expected dot(n, u) ~ 0, got ${dotU}`);
            assert.ok(Math.abs(dotV) < 1e-10, `Expected dot(n, v) ~ 0, got ${dotV}`);
        }
    });
    it('4. Unit Norm Invariant: ||n|| is strictly 1.0 +/- 1e-12', () => {
        const angles = [15, 30, 45, 60, 75, 110, 160];
        for (const a of angles) {
            const u = latLngToUnitVector3D(a, a * 2);
            const v = latLngToUnitVector3D(-a / 2, -a);
            const n = computeSphericalGreatCircleNormal3D(u, v);
            const len = vectorNorm3D(n);
            assert.ok(Math.abs(len - 1.0) < 1e-12, `Expected length 1.0, got ${len}`);
        }
    });
    it('5. Collinear and Antipodal Edge Cases: deterministic stable fallback', () => {
        // Identical North Pole vectors
        const northPole = createVec3D(0, 0, 1);
        const nIdentical = computeSphericalGreatCircleNormal3D(northPole, northPole);
        assert.ok(!isNaN(nIdentical[0]) && !isNaN(nIdentical[1]) && !isNaN(nIdentical[2]));
        assert.ok(Math.abs(vectorNorm3D(nIdentical) - 1.0) < 1e-12);
        assert.ok(Math.abs(dotProduct3D(nIdentical, northPole)) < 1e-10);
        // Antipodal vectors (North Pole vs South Pole)
        const southPole = createVec3D(0, 0, -1);
        const nAntipodal = computeSphericalGreatCircleNormal3D(northPole, southPole);
        assert.ok(!isNaN(nAntipodal[0]) && !isNaN(nAntipodal[1]) && !isNaN(nAntipodal[2]));
        assert.ok(Math.abs(vectorNorm3D(nAntipodal) - 1.0) < 1e-12);
        assert.ok(Math.abs(dotProduct3D(nAntipodal, northPole)) < 1e-10);
        // Identical X-axis vector (|u[0]| >= 0.9 branch)
        const xAxis = createVec3D(1, 0, 0);
        const nXAxis = computeSphericalGreatCircleNormal3D(xAxis, xAxis);
        assert.ok(Math.abs(vectorNorm3D(nXAxis) - 1.0) < 1e-12);
        assert.ok(Math.abs(dotProduct3D(nXAxis, xAxis)) < 1e-10);
    });
    it('6. Spherical Coordinate Conversions round-trip', () => {
        const originalLat = 37.7749;
        const originalLng = -122.4194;
        const unitVec = latLngToUnitVector3D(originalLat, originalLng);
        const [recoveredLat, recoveredLng] = unitVectorToLatLng(unitVec);
        assert.ok(Math.abs(recoveredLat - originalLat) < 1e-6);
        assert.ok(Math.abs(recoveredLng - originalLng) < 1e-6);
    });
    it('7. Thermodynamic Boundary Advective Flux Conservation', () => {
        const cellA = {
            carbonKg: 5000,
            waterKg: 20000,
            mineralsKg: 300,
            oxygenKg: 1200,
            energyJoules: 1e9,
            volumeM3: 1e6
        };
        const cellB = {
            carbonKg: 2000,
            waterKg: 10000,
            mineralsKg: 150,
            oxygenKg: 600,
            energyJoules: 5e8,
            volumeM3: 1e6
        };
        const normal = createVec3D(0, 1, 0);
        const flowVelocity = createVec3D(0, 2.5, 0); // directed from A to B
        const edgeLength = 1000; // 1 km
        const layerHeight = 100; // 100 m
        const dt = 10; // 10 seconds
        const flux = advectiveBoundaryFluxMonad(cellA, cellB, flowVelocity, normal, edgeLength, layerHeight, dt);
        // First Law: exact conservation (deltaA + deltaB = 0)
        assert.strictEqual(flux.deltaA.deltaCarbonKg + flux.deltaB.deltaCarbonKg, 0);
        assert.strictEqual(flux.deltaA.deltaWaterKg + flux.deltaB.deltaWaterKg, 0);
        assert.strictEqual(flux.deltaA.deltaMineralsKg + flux.deltaB.deltaMineralsKg, 0);
        assert.strictEqual(flux.deltaA.deltaOxygenKg + flux.deltaB.deltaOxygenKg, 0);
        assert.strictEqual(flux.deltaA.deltaEnergyJoules + flux.deltaB.deltaEnergyJoules, 0);
        // Donor cell A loses stock, Receiver cell B gains stock
        assert.ok(flux.deltaA.deltaCarbonKg < 0);
        assert.ok(flux.deltaB.deltaCarbonKg > 0);
    });
    it('8. H3Adjacency class provides geometry and hemisphere tests', () => {
        const adjacency = new H3Adjacency('cell_001', [0, 0]);
        const neighborCentroid = latLngToUnitVector3D(0, 90);
        const normal = adjacency.computePlaneNormalTo(neighborCentroid);
        assert.ok(Math.abs(vectorNorm3D(normal) - 1.0) < 1e-12);
        const { midpoint, tangent } = adjacency.computeMidpointTangent(neighborCentroid);
        assert.ok(Math.abs(vectorNorm3D(midpoint) - 1.0) < 1e-12);
        assert.ok(Math.abs(vectorNorm3D(tangent) - 1.0) < 1e-12);
        // Test hemisphere discrimination
        const northPole = createVec3D(0, 0, 1);
        const southPole = createVec3D(0, 0, -1);
        assert.strictEqual(adjacency.isPositiveHemisphere(northPole, neighborCentroid), true);
        assert.strictEqual(adjacency.isPositiveHemisphere(southPole, neighborCentroid), false);
    });
});
