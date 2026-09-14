import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  Vector3D,
  computeBoundaryOutwardNormal3D,
  computeFacetExchangeDeltas,
  FacetCellStockState,
  FacetTransportParameters,
  vec3Dot,
  vec3Norm,
  vec3Normalize,
  vec3Scale,
  vec3Add,
  vec3Sub,
  latLngToCartesian3D,
  cartesian3DToLatLng,
  H3AdjacencyGraph,
  WGS84_EARTH_MEAN_RADIUS_METERS
} from '../src/spatial/h3_adjacency.js';

describe('Sprint 066 - computeBoundaryOutwardNormal3D & Lateral Facet Transport', () => {
  const EPSILON = 1e-12;

  // Helper to create unit sphere vectors
  function makeUnit(x: number, y: number, z: number): Vector3D {
    return vec3Normalize({ x, y, z });
  }

  describe('1. Equatorial Edge Geometry', () => {
    it('computes pure longitudinal normal between equatorial cells separated by a meridian edge', () => {
      // Cell i at lon = -5 deg, Cell j at lon = +5 deg on equator (lat = 0)
      const c_i = makeUnit(Math.cos(-0.1), Math.sin(-0.1), 0);
      const c_j = makeUnit(Math.cos(0.1), Math.sin(0.1), 0);

      // Shared boundary arc at lon = 0 deg, stretching from lat = +3 deg to lat = -3 deg
      const v_a = makeUnit(Math.cos(0.05), 0, Math.sin(0.05));
      const v_b = makeUnit(Math.cos(-0.05), 0, Math.sin(-0.05));

      const result = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: 0.5 });

      // The interface midpoint should be at lon=0, lat=0 -> (1, 0, 0)
      assert.ok(Math.abs(result.midpoint.x - 1.0) < 1e-4);
      assert.ok(Math.abs(result.midpoint.y) < 1e-4);
      assert.ok(Math.abs(result.midpoint.z) < 1e-4);

      // Outward normal from cell i (-y) to cell j (+y) must point in +y direction
      assert.ok(Math.abs(result.normal.x) < EPSILON);
      assert.ok(Math.abs(result.normal.y - 1.0) < EPSILON);
      assert.ok(Math.abs(result.normal.z) < EPSILON);

      // Magnitude must be exactly 1.0
      assert.ok(Math.abs(vec3Norm(result.normal) - 1.0) < EPSILON);
    });
  });

  describe('2. Radial Orthogonality (Tangency to Sphere Manifold)', () => {
    it('guarantees normal . radialUnitVector < 1e-14 across arbitrary sphere geometries', () => {
      // Arbitrary oblique orientation on Earth
      const c_i = latLngToCartesian3D({ lat: 45.0, lng: 10.0 });
      const c_j = latLngToCartesian3D({ lat: 46.0, lng: 11.0 });

      // Shared edge
      const v_a = latLngToCartesian3D({ lat: 45.6, lng: 10.2 });
      const v_b = latLngToCartesian3D({ lat: 45.4, lng: 10.8 });

      const result = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: 0.5 });

      const radialUnit = vec3Normalize(result.midpoint);
      const radialDot = Math.abs(vec3Dot(result.normal, radialUnit));

      assert.ok(radialDot < 1e-14, `Expected dot product < 1e-14, got ${radialDot}`);
    });
  });

  describe('3. Outward Orientation Verification', () => {
    it('strictly satisfies normal . (centroid_j - centroid_i) > 0', () => {
      const c_i = latLngToCartesian3D({ lat: -25.0, lng: 130.0 });
      const c_j = latLngToCartesian3D({ lat: -24.5, lng: 131.0 });
      const v_a = latLngToCartesian3D({ lat: -24.6, lng: 130.2 });
      const v_b = latLngToCartesian3D({ lat: -24.9, lng: 130.8 });

      const result = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b);
      const disp = vec3Sub(c_j, c_i);
      const alignment = vec3Dot(result.normal, disp);

      assert.ok(alignment > 0, `Expected outward normal alignment > 0, got ${alignment}`);
      assert.ok(result.alignmentCos > 0, `Expected alignmentCos > 0, got ${result.alignmentCos}`);
    });
  });

  describe('4. Anti-Symmetry & Flux Conservation Invariant', () => {
    it('satisfies normal_ij + normal_ji = 0 when order of cells and boundary vertices are inverted', () => {
      const c_i = latLngToCartesian3D({ lat: 30.0, lng: -80.0 });
      const c_j = latLngToCartesian3D({ lat: 31.0, lng: -79.0 });
      const v_a = latLngToCartesian3D({ lat: 30.8, lng: -80.2 });
      const v_b = latLngToCartesian3D({ lat: 30.2, lng: -78.8 });

      // Forward evaluation (origin=i, neighbor=j, edge=v_a -> v_b)
      const forward = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: 0.35 });

      // Inverted evaluation (origin=j, neighbor=i, edge=v_b -> v_a)
      const backward = computeBoundaryOutwardNormal3D(c_j, c_i, v_b, v_a, { blendAlpha: 0.35 });

      const sum = vec3Add(forward.normal, backward.normal);
      const sumNorm = vec3Norm(sum);

      assert.ok(sumNorm < EPSILON, `Expected anti-symmetric sum norm < 1e-12, got ${sumNorm}`);
      assert.ok(
        Math.abs(forward.midpoint.x - backward.midpoint.x) < EPSILON &&
        Math.abs(forward.midpoint.y - backward.midpoint.y) < EPSILON &&
        Math.abs(forward.midpoint.z - backward.midpoint.z) < EPSILON
      );
    });

    it('satisfies normal_ij + normal_ji = 0 even if vertices v_a, v_b are kept in same order', () => {
      const c_i = latLngToCartesian3D({ lat: 12.0, lng: 45.0 });
      const c_j = latLngToCartesian3D({ lat: 13.0, lng: 46.0 });
      const v_a = latLngToCartesian3D({ lat: 12.8, lng: 45.2 });
      const v_b = latLngToCartesian3D({ lat: 12.2, lng: 45.8 });

      const forward = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: 0.7 });
      const backward = computeBoundaryOutwardNormal3D(c_j, c_i, v_a, v_b, { blendAlpha: 0.7 });

      const sum = vec3Add(forward.normal, backward.normal);
      const sumNorm = vec3Norm(sum);

      assert.ok(sumNorm < EPSILON, `Expected anti-symmetric sum norm < 1e-12, got ${sumNorm}`);
    });
  });

  describe('5. Alpha Blending Sensitivity', () => {
    it('interpolates accurately between pure midpoint normal (alpha=0) and displacement normal (alpha=1)', () => {
      // Cell centroids slightly skewed relative to the boundary normal
      const c_i = makeUnit(1, -0.2, 0.1);
      const c_j = makeUnit(1, 0.2, 0.2);

      const v_a = makeUnit(1, -0.05, 0.3);
      const v_b = makeUnit(1, 0.05, -0.1);

      const pureMid = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: 0.0 });
      const pureDisp = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: 1.0 });
      const balanced = computeBoundaryOutwardNormal3D(c_i, c_j, v_a, v_b, { blendAlpha: 0.5 });

      // pureMid.normal matches midpointNormal
      assert.ok(vec3Norm(vec3Sub(pureMid.normal, pureMid.midpointNormal)) < EPSILON);

      // pureDisp.normal matches displacementNormal
      assert.ok(vec3Norm(vec3Sub(pureDisp.normal, pureDisp.displacementNormal)) < EPSILON);

      // Balanced normal bisects between the two
      const dotMidBalanced = vec3Dot(balanced.normal, pureMid.normal);
      const dotDispBalanced = vec3Dot(balanced.normal, pureDisp.normal);

      assert.ok(dotMidBalanced > 0.8 && dotDispBalanced > 0.8);
      assert.ok(Math.abs(dotMidBalanced - dotDispBalanced) < 0.1);
    });
  });

  describe('6. Degeneracy Handling', () => {
    it('throws descriptive error on coincident centroids', () => {
      const c = makeUnit(1, 0, 0);
      const v_a = makeUnit(1, 0, 0.1);
      const v_b = makeUnit(1, 0, -0.1);

      assert.throws(() => {
        computeBoundaryOutwardNormal3D(c, c, v_a, v_b);
      }, /coincident/i);
    });

    it('throws descriptive error on coincident edge vertices', () => {
      const c_i = makeUnit(1, -0.1, 0);
      const c_j = makeUnit(1, 0.1, 0);
      const v = makeUnit(1, 0, 0);

      assert.throws(() => {
        computeBoundaryOutwardNormal3D(c_i, c_j, v, v);
      }, /coincident/i);
    });
  });

  describe('7. Coordinate Conversion Utilities', () => {
    it('preserves latitude and longitude through Cartesian roundtrip', () => {
      const original = { lat: 37.7749, lng: -122.4194 };
      const cart = latLngToCartesian3D(original, WGS84_EARTH_MEAN_RADIUS_METERS);
      const back = cartesian3DToLatLng(cart);

      assert.ok(Math.abs(back.lat - original.lat) < 1e-8);
      assert.ok(Math.abs(back.lng - original.lng) < 1e-8);
    });
  });

  describe('8. Lateral Facet Stock Transfer Monad (Thermodynamics & First Law)', () => {
    const originState: FacetCellStockState = {
      carbonKg: 1000,
      waterKg: 50000,
      mineralsKg: 250,
      oxygenKg: 500,
      energyJoules: 1e9,
      volumeM3: 10000,
      temperatureKelvin: 298.15
    };

    const neighborState: FacetCellStockState = {
      carbonKg: 800,
      waterKg: 45000,
      mineralsKg: 300,
      oxygenKg: 480,
      energyJoules: 9.5e8,
      volumeM3: 10000,
      temperatureKelvin: 293.15
    };

    const c_i = latLngToCartesian3D({ lat: 0, lng: 0 });
    const c_j = latLngToCartesian3D({ lat: 0, lng: 0.1 });
    const v_a = latLngToCartesian3D({ lat: 0.05, lng: 0.05 });
    const v_b = latLngToCartesian3D({ lat: -0.05, lng: 0.05 });

    const params: FacetTransportParameters = {
      fluidVelocity3D: { x: 0, y: 0.5, z: 0 }, // 0.5 m/s eastward
      effectiveHeightM: 100,
      diffusionCoeffs: {
        carbon: 1e-4,
        water: 1e-3,
        minerals: 1e-5,
        oxygen: 2e-4,
        thermalConductivity: 0.6
      },
      blendAlpha: 0.5
    };

    it('satisfies exact zero-sum mass and energy conservation across facet (First Law)', () => {
      const dt = 60; // 60 seconds
      const res = computeFacetExchangeDeltas(
        originState,
        neighborState,
        c_i,
        c_j,
        v_a,
        v_b,
        params,
        dt
      );

      // Invariant: delta_origin + delta_neighbor == 0 for all stocks
      assert.ok(Math.abs(res.originDeltas.deltaCarbonKg + res.neighborDeltas.deltaCarbonKg) < 1e-12);
      assert.ok(Math.abs(res.originDeltas.deltaWaterKg + res.neighborDeltas.deltaWaterKg) < 1e-12);
      assert.ok(Math.abs(res.originDeltas.deltaMineralsKg + res.neighborDeltas.deltaMineralsKg) < 1e-12);
      assert.ok(Math.abs(res.originDeltas.deltaOxygenKg + res.neighborDeltas.deltaOxygenKg) < 1e-12);
      assert.ok(Math.abs(res.originDeltas.deltaEnergyJoules + res.neighborDeltas.deltaEnergyJoules) < 1e-6);

      // Area and velocity diagnostics
      assert.ok(res.facetAreaM2 > 0);
      assert.ok(res.normalVelocityMs !== 0);
    });

    it('preserves non-negative entropy generation (Second Law)', () => {
      const dt = 30;
      const res = computeFacetExchangeDeltas(
        originState,
        neighborState,
        c_i,
        c_j,
        v_a,
        v_b,
        params,
        dt
      );

      // Heat diffuses from warm cell (298.15 K) to cool cell (293.15 K)
      assert.ok(
        res.originDeltas.entropyProductionJoulesPerKelvin >= 0,
        `Expected non-negative entropy production, got ${res.originDeltas.entropyProductionJoulesPerKelvin}`
      );
      assert.ok(
        res.neighborDeltas.entropyProductionJoulesPerKelvin >= 0,
        `Expected non-negative entropy production, got ${res.neighborDeltas.entropyProductionJoulesPerKelvin}`
      );
    });
  });

  describe('9. H3AdjacencyGraph Edge Indexing and Normal Cache', () => {
    it('manages adjacency edges and caches computed boundary outward normals', () => {
      const graph = new H3AdjacencyGraph();
      const originCentroid = latLngToCartesian3D({ lat: 10, lng: 20 });
      const neighborCentroid = latLngToCartesian3D({ lat: 10.1, lng: 20.1 });
      const edgeVertexA = latLngToCartesian3D({ lat: 10.08, lng: 20.02 });
      const edgeVertexB = latLngToCartesian3D({ lat: 10.02, lng: 20.08 });

      graph.addEdge({
        originIndex: '881f1d4881fffff',
        neighborIndex: '881f1d4883fffff',
        originCentroid,
        neighborCentroid,
        edgeVertexA,
        edgeVertexB
      });

      const res1 = graph.getBoundaryNormal('881f1d4881fffff', '881f1d4883fffff');
      const res2 = graph.getBoundaryNormal('881f1d4881fffff', '881f1d4883fffff');

      assert.strictEqual(res1, res2); // Reference identity confirms cache hit
      assert.ok(res1.alignmentCos > 0);
    });
  });
});