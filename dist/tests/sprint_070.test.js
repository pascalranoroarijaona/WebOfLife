import { describe, it } from 'node:test';
import assert from 'node:assert';
import { areCartesianUnitVectorsEqual3D, computeAngularDistance3D, normalizeVector3D, DEFAULT_ANGULAR_EPSILON, H3BoundaryVertexMatcher, H3AdjacencyService, } from '../src/spatial/h3_adjacency.js';
import { SpatialFluxMonad, } from '../src/spatial/spatial_flux_monad.js';
import { geoToCartesian3D, cartesian3DToGeo } from '../src/spatial/h3_grid.js';
describe('Sprint 070: areCartesianUnitVectorsEqual3D & Spatial Adjacency Verification', () => {
    it('1. Identity Case: Two identical vectors return true with epsilon = 0', () => {
        const v = { x: 1, y: 0, z: 0 };
        assert.strictEqual(areCartesianUnitVectorsEqual3D(v, v, 0), true);
        const vCopy = { x: 1, y: 0, z: 0 };
        assert.strictEqual(areCartesianUnitVectorsEqual3D(v, vCopy, 0), true);
    });
    it('2. Small Perturbation: Vectors separated by 0.5e-9 radians return true with default epsilon = 1e-9', () => {
        const theta = 0.5e-9;
        const v1 = { x: 1, y: 0, z: 0 };
        const v2 = { x: Math.cos(theta), y: Math.sin(theta), z: 0 };
        const distance = computeAngularDistance3D(v1, v2);
        assert.ok(distance <= DEFAULT_ANGULAR_EPSILON, `Distance ${distance} should be <= ${DEFAULT_ANGULAR_EPSILON}`);
        assert.strictEqual(areCartesianUnitVectorsEqual3D(v1, v2, DEFAULT_ANGULAR_EPSILON), true);
    });
    it('3. Exceeding Tolerance: Vectors separated by 2.0e-9 radians return false with default epsilon = 1e-9', () => {
        const theta = 2.0e-9;
        const v1 = { x: 1, y: 0, z: 0 };
        const v2 = { x: Math.cos(theta), y: Math.sin(theta), z: 0 };
        const distance = computeAngularDistance3D(v1, v2);
        assert.ok(distance > DEFAULT_ANGULAR_EPSILON, `Distance ${distance} should exceed ${DEFAULT_ANGULAR_EPSILON}`);
        assert.strictEqual(areCartesianUnitVectorsEqual3D(v1, v2, DEFAULT_ANGULAR_EPSILON), false);
    });
    it('4. Orthogonal Vectors: (1, 0, 0) and (0, 1, 0) separated by pi/2 radians', () => {
        const v1 = { x: 1, y: 0, z: 0 };
        const v2 = { x: 0, y: 1, z: 0 };
        const distance = computeAngularDistance3D(v1, v2);
        assert.ok(Math.abs(distance - Math.PI / 2) < 1e-15);
        assert.strictEqual(areCartesianUnitVectorsEqual3D(v1, v2, Math.PI / 2), true);
        assert.strictEqual(areCartesianUnitVectorsEqual3D(v1, v2, Math.PI / 2 - 1e-9), false);
    });
    it('5. Antipodal Vectors: (0, 0, 1) and (0, 0, -1) separated by pi radians', () => {
        const v1 = { x: 0, y: 0, z: 1 };
        const v2 = { x: 0, y: 0, z: -1 };
        const distance = computeAngularDistance3D(v1, v2);
        assert.ok(Math.abs(distance - Math.PI) < 1e-15);
        assert.strictEqual(areCartesianUnitVectorsEqual3D(v1, v2, Math.PI), true);
        assert.strictEqual(areCartesianUnitVectorsEqual3D(v1, v2, Math.PI - 1e-6), false);
    });
    it('6. Unnormalized Vectors: (2, 0, 0) and (10, 0, 0) normalize and evaluate to equal', () => {
        const v1 = { x: 2, y: 0, z: 0 };
        const v2 = { x: 10, y: 0, z: 0 };
        assert.strictEqual(areCartesianUnitVectorsEqual3D(v1, v2, 1e-9), true);
        const norm1 = normalizeVector3D(v1);
        const norm2 = normalizeVector3D(v2);
        assert.strictEqual(norm1.x, 1);
        assert.strictEqual(norm2.x, 1);
    });
    it('7. Degenerate / Zero-Length Guard: Zero-magnitude vector throws error', () => {
        const vZero = { x: 0, y: 0, z: 0 };
        const vValid = { x: 1, y: 0, z: 0 };
        assert.throws(() => {
            areCartesianUnitVectorsEqual3D(vZero, vValid);
        }, /magnitude is zero or non-finite/i);
        assert.throws(() => {
            areCartesianUnitVectorsEqual3D(vValid, vZero);
        }, /magnitude is zero or non-finite/i);
    });
    it('8. Negative epsilon guard returns false', () => {
        const v1 = { x: 1, y: 0, z: 0 };
        const v2 = { x: 1, y: 0, z: 0 };
        assert.strictEqual(areCartesianUnitVectorsEqual3D(v1, v2, -1e-9), false);
    });
    it('9. H3BoundaryVertexMatcher deduplicates vertices and detects shared conjugate edges', () => {
        const v1 = { x: 1, y: 0, z: 0 };
        const v1Perturbed = { x: Math.cos(0.4e-9), y: Math.sin(0.4e-9), z: 0 };
        const v2 = { x: 0, y: 1, z: 0 };
        const deduped = H3BoundaryVertexMatcher.deduplicateVertices([v1, v1Perturbed, v2]);
        assert.strictEqual(deduped.length, 2);
        const polyA = [
            { x: 1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
            { x: 0, y: 0, z: 1 },
        ];
        const polyB = [
            { x: 0, y: 1, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: -1, y: 0, z: 0 },
        ];
        const shared = H3BoundaryVertexMatcher.findSharedEdge(polyA, polyB);
        assert.ok(shared !== null);
        assert.strictEqual(areCartesianUnitVectorsEqual3D(shared.edgeA[0], shared.edgeB[1]), true);
        assert.strictEqual(areCartesianUnitVectorsEqual3D(shared.edgeA[1], shared.edgeB[0]), true);
    });
    it('10. H3AdjacencyService registers cell boundaries and creates directed facets', () => {
        const service = new H3AdjacencyService();
        const cellA = 'cell-8828308281fffff';
        const cellB = 'cell-8828308283fffff';
        service.boundaryIndex.registerCell(cellA, [
            { x: 1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
            { x: 0, y: 0, z: 1 },
        ]);
        service.boundaryIndex.registerCell(cellB, [
            { x: 0, y: 1, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 0, y: -1, z: 0 },
        ]);
        assert.strictEqual(service.areAdjacent(cellA, cellB), true);
        const facet = service.createDirectedFacet(cellA, cellB, {
            depthM: 5.0,
            normalVelocityMs: 0.1,
            distanceM: 500.0,
        });
        assert.ok(facet !== null);
        assert.strictEqual(facet.originCell, cellA);
        assert.strictEqual(facet.neighborCell, cellB);
        assert.ok(facet.areaM2 > 0);
    });
    it('11. SpatialFluxMonad enforces exact mass & energy conservation and positive entropy production', () => {
        const originStock = {
            cellIndex: 'cell_A',
            carbonMol: 1000,
            nitrogenMol: 200,
            phosphorusMol: 50,
            waterMol: 55000,
            oxygenMol: 500,
            thermalEnergyJoules: 1.2e9,
            volumeM3: 1000,
            centroid: { x: 1, y: 0, z: 0 },
        };
        const neighborStock = {
            cellIndex: 'cell_B',
            carbonMol: 800,
            nitrogenMol: 150,
            phosphorusMol: 30,
            waterMol: 50000,
            oxygenMol: 450,
            thermalEnergyJoules: 1.0e9,
            volumeM3: 1000,
            centroid: { x: 0, y: 1, z: 0 },
        };
        const facet = {
            originCell: 'cell_A',
            neighborCell: 'cell_B',
            originV1: { x: 1, y: 0, z: 0 },
            originV2: { x: 0, y: 1, z: 0 },
            neighborV1: { x: 0, y: 1, z: 0 },
            neighborV2: { x: 1, y: 0, z: 0 },
            areaM2: 250,
            normalVelocityMs: 0.05,
            distanceM: 100,
        };
        const result = SpatialFluxMonad.computeFacetTransfer(originStock, neighborStock, facet, 60.0 // 60 seconds
        );
        assert.strictEqual(result.isValidConjugate, true);
        // Skew-symmetry / First Law of Thermodynamics: originDelta + neighborDelta == 0
        assert.ok(Math.abs(result.originDelta.deltaCarbonMol + result.neighborDelta.deltaCarbonMol) < 1e-12, 'Carbon must be conserved');
        assert.ok(Math.abs(result.originDelta.deltaNitrogenMol + result.neighborDelta.deltaNitrogenMol) < 1e-12, 'Nitrogen must be conserved');
        assert.ok(Math.abs(result.originDelta.deltaPhosphorusMol + result.neighborDelta.deltaPhosphorusMol) < 1e-12, 'Phosphorus must be conserved');
        assert.ok(Math.abs(result.originDelta.deltaWaterMol + result.neighborDelta.deltaWaterMol) < 1e-12, 'Water must be conserved');
        assert.ok(Math.abs(result.originDelta.deltaOxygenMol + result.neighborDelta.deltaOxygenMol) < 1e-12, 'Oxygen must be conserved');
        assert.ok(Math.abs(result.originDelta.deltaThermalEnergyJoules + result.neighborDelta.deltaThermalEnergyJoules) < 1e-6, 'Thermal energy must be conserved');
        // Second Law of Thermodynamics: Entropy production >= 0
        assert.ok(result.entropyProductionJPerK >= 0, `Entropy production (${result.entropyProductionJPerK}) must be non-negative`);
    });
    it('12. SpatialFluxMonad rejects non-conjugate boundary facets safely without leaking flux', () => {
        const originStock = {
            cellIndex: 'cell_A',
            carbonMol: 1000,
            nitrogenMol: 200,
            phosphorusMol: 50,
            waterMol: 55000,
            oxygenMol: 500,
            thermalEnergyJoules: 1.2e9,
            volumeM3: 1000,
            centroid: { x: 1, y: 0, z: 0 },
        };
        const neighborStock = {
            cellIndex: 'cell_B',
            carbonMol: 800,
            nitrogenMol: 150,
            phosphorusMol: 30,
            waterMol: 50000,
            oxygenMol: 450,
            thermalEnergyJoules: 1.0e9,
            volumeM3: 1000,
            centroid: { x: 0, y: 1, z: 0 },
        };
        // Broken facet where vertices do not match conjugate pairing
        const nonConjugateFacet = {
            originCell: 'cell_A',
            neighborCell: 'cell_B',
            originV1: { x: 1, y: 0, z: 0 },
            originV2: { x: 0, y: 1, z: 0 },
            neighborV1: { x: 0, y: 0, z: 1 }, // mismatch!
            neighborV2: { x: 1, y: 0, z: 0 },
            areaM2: 250,
            normalVelocityMs: 0.05,
            distanceM: 100,
        };
        const result = SpatialFluxMonad.computeFacetTransfer(originStock, neighborStock, nonConjugateFacet, 60.0);
        assert.strictEqual(result.isValidConjugate, false);
        assert.strictEqual(result.originDelta.deltaCarbonMol, 0);
        assert.strictEqual(result.neighborDelta.deltaCarbonMol, 0);
        assert.strictEqual(result.entropyProductionJPerK, 0);
    });
    it('13. Spherical to Cartesian conversions preserve angular equality', () => {
        const coord = { lat: 37.7749, lng: -122.4194 };
        const cart = geoToCartesian3D(coord);
        const roundTrip = cartesian3DToGeo(cart);
        assert.ok(Math.abs(roundTrip.lat - coord.lat) < 1e-10);
        assert.ok(Math.abs(roundTrip.lng - coord.lng) < 1e-10);
        const reprojected = geoToCartesian3D(roundTrip);
        assert.strictEqual(areCartesianUnitVectorsEqual3D(cart, reprojected, DEFAULT_ANGULAR_EPSILON), true);
    });
});
