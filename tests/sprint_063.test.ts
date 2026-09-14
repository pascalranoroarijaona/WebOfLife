import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createVec3D,
  computeBoundaryHorizontalNormal3D,
  computeBoundaryHorizontalNormalFromEndpoints3D,
  computeBoundaryDarbouxFrame3D,
  computeSharedBoundaryMidpoint3D,
  evaluateFacetHorizontalExchange,
  dotProduct3D,
  vectorNorm3D,
} from '../src/spatial/h3_adjacency.js';
import { Vector3D, CellFacetState } from '../src/spatial/h3_types.js';

const EPSILON = 1e-12;

describe('Sprint 063: computeBoundaryHorizontalNormal3D & Facet Transport', () => {
  it('computes correct horizontal normal for equatorial boundary edge', () => {
    // Edge along equator (z = 0) directed east-west: t = (0, 1, 0)
    // Midpoint on x-axis: r = (1, 0, 0)
    // Expected normal: (0, 1, 0) x (1, 0, 0) = (0, 0, -1)
    const tangent: Vector3D = createVec3D(0, 1, 0);
    const radial: Vector3D = createVec3D(1, 0, 0);

    const normal = computeBoundaryHorizontalNormal3D(tangent, radial);

    assert.ok(Math.abs(normal.x! - 0) < EPSILON);
    assert.ok(Math.abs(normal.y! - 0) < EPSILON);
    assert.ok(Math.abs(normal.z! - (-1)) < EPSILON);
    assert.ok(Math.abs(vectorNorm3D(normal) - 1.0) < EPSILON);
  });

  it('computes correct horizontal normal for meridional boundary edge', () => {
    // Edge along meridian directed north: t = (0, 0, 1)
    // Midpoint on prime meridian equator: r = (1, 0, 0)
    // Expected normal: (0, 0, 1) x (1, 0, 0) = (0, 1, 0)
    const tangent: Vector3D = createVec3D(0, 0, 1);
    const radial: Vector3D = createVec3D(1, 0, 0);

    const normal = computeBoundaryHorizontalNormal3D(tangent, radial);

    assert.ok(Math.abs(normal.x! - 0) < EPSILON);
    assert.ok(Math.abs(normal.y! - 1) < EPSILON);
    assert.ok(Math.abs(normal.z! - 0) < EPSILON);
    assert.ok(Math.abs(vectorNorm3D(normal) - 1.0) < EPSILON);
  });

  it('satisfies unit norm invariance across arbitrary spherical orientations', () => {
    const orientations: Array<{ theta: number; phi: number }> = [
      { theta: 0.1, phi: 0.2 },
      { theta: Math.PI / 4, phi: Math.PI / 3 },
      { theta: Math.PI / 2, phi: 0 },
      { theta: (3 * Math.PI) / 4, phi: (5 * Math.PI) / 6 },
      { theta: Math.PI * 0.9, phi: 1.5 },
    ];

    for (const { theta, phi } of orientations) {
      // Radial unit normal
      const radial: Vector3D = createVec3D(
        Math.sin(theta) * Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(theta)
      );

      // Local tangent east vector (-sin(phi), cos(phi), 0)
      const tangent: Vector3D = createVec3D(
        -Math.sin(phi),
        Math.cos(phi),
        0
      );

      const normal = computeBoundaryHorizontalNormal3D(tangent, radial);
      const norm = vectorNorm3D(normal);

      assert.ok(
        Math.abs(norm - 1.0) < EPSILON,
        `Expected unit norm, got ${norm} at theta=${theta}, phi=${phi}`
      );
    }
  });

  it('satisfies strict orthogonality with tangent and radial normal', () => {
    const tangent: Vector3D = createVec3D(0.5773502691896258, -0.5773502691896258, 0.5773502691896258);
    // Create an orthogonal radial vector: (-0.5773502691896258, -0.5773502691896258, 0) normalized
    const rawR = { x: -1, y: -1, z: 0 };
    const rNorm = Math.sqrt(2);
    const radial: Vector3D = createVec3D(rawR.x / rNorm, rawR.y / rNorm, 0);

    const normal = computeBoundaryHorizontalNormal3D(tangent, radial);

    const dotTangent = dotProduct3D(normal, tangent);
    const dotRadial = dotProduct3D(normal, radial);

    assert.ok(
      Math.abs(dotTangent) < EPSILON,
      `Expected dot(n_h, t) == 0, got ${dotTangent}`
    );
    assert.ok(
      Math.abs(dotRadial) < EPSILON,
      `Expected dot(n_h, r) == 0 (zero vertical leakage), got ${dotRadial}`
    );
  });

  it('safely handles degenerate inputs (parallel vectors or zero vectors)', () => {
    const vZero: Vector3D = createVec3D(0, 0, 0);
    const v1: Vector3D = createVec3D(1, 0, 0);

    // Parallel vectors (cross product is zero)
    const parallelResult = computeBoundaryHorizontalNormal3D(v1, v1);
    assert.deepStrictEqual(parallelResult, createVec3D(0, 0, 0));

    // Zero vectors
    const zeroResult = computeBoundaryHorizontalNormal3D(vZero, v1);
    assert.deepStrictEqual(zeroResult, createVec3D(0, 0, 0));

    const zeroResult2 = computeBoundaryHorizontalNormal3D(v1, vZero);
    assert.deepStrictEqual(zeroResult2, createVec3D(0, 0, 0));
  });

  it('evaluates boundary horizontal normal from endpoints and midpoint directly', () => {
    const R = 6.371e6;
    // Two vertices along equator at longitude 0 and longitude 10 deg
    const lon1 = 0;
    const lon2 = 10 * (Math.PI / 180);
    const v1: Vector3D = createVec3D(R * Math.cos(lon1), R * Math.sin(lon1), 0);
    const v2: Vector3D = createVec3D(R * Math.cos(lon2), R * Math.sin(lon2), 0);
    const midpoint = computeSharedBoundaryMidpoint3D(v1, v2, R);

    const normal = computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint);

    assert.ok(Math.abs(vectorNorm3D(normal) - 1.0) < EPSILON);
    // Along the equator, horizontal normal should point in z direction (south: z < 0)
    assert.ok(normal.z! < -0.99);
    assert.ok(Math.abs(normal.x!) < 0.05);
    assert.ok(Math.abs(normal.y!) < 0.05);
  });

  it('constructs a full orthonormal Darboux frame', () => {
    const R = 6.371e6;
    const v1: Vector3D = createVec3D(R, 0, 0);
    const v2: Vector3D = createVec3D(0, R, 0);

    const frame = computeBoundaryDarbouxFrame3D(v1, v2, R);

    // Check unit norms
    assert.ok(Math.abs(vectorNorm3D(frame.tangent) - 1.0) < EPSILON);
    assert.ok(Math.abs(vectorNorm3D(frame.horizontalNormal) - 1.0) < EPSILON);
    assert.ok(Math.abs(vectorNorm3D(frame.radialNormal) - 1.0) < EPSILON);

    // Check mutual orthogonality
    assert.ok(Math.abs(dotProduct3D(frame.tangent, frame.horizontalNormal)) < EPSILON);
    assert.ok(Math.abs(dotProduct3D(frame.horizontalNormal, frame.radialNormal)) < EPSILON);
    assert.ok(Math.abs(dotProduct3D(frame.tangent, frame.radialNormal)) < EPSILON);
  });

  it('governs conservative facet exchange and non-negative entropy production', () => {
    const cellI: CellFacetState = {
      massDry: 1e6,
      massWater: 1e5,
      massCarbon: 400,
      massOxygen: 2e5,
      massMineral: 10,
      thermalEnergy: 3e8,
      temperature: 300,
      volume: 1e6,
      centroid: createVec3D(6.371e6, 0, 0),
    };

    const cellJ: CellFacetState = {
      massDry: 1e6,
      massWater: 1e5,
      massCarbon: 380,
      massOxygen: 2e5,
      massMineral: 10,
      thermalEnergy: 2.8e8,
      temperature: 280,
      volume: 1e6,
      centroid: createVec3D(6.371e6, 1000, 0),
    };

    const normal: Vector3D = createVec3D(0, 1, 0);
    const velocity: Vector3D = createVec3D(0, 5.0, 0); // 5 m/s toward cell J
    const facetLength = 100; // m
    const layerDepth = 50;   // m
    const dt = 10;           // s
    const diffusivity = 1e-4;
    const thermalConductivity = 0.6;

    const exchangeItoJ = evaluateFacetHorizontalExchange(
      cellI,
      cellJ,
      normal,
      velocity,
      facetLength,
      layerDepth,
      diffusivity,
      thermalConductivity,
      dt
    );

    // Mass must flow from cell I to cell J
    assert.ok(exchangeItoJ.deltaMassDry > 0);
    assert.ok(exchangeItoJ.deltaMassWater > 0);
    assert.ok(exchangeItoJ.deltaMassCarbon > 0);
    assert.ok(exchangeItoJ.deltaThermalEnergy > 0);

    // Second Law: entropy generation from heat conduction must be non-negative
    assert.ok(
      exchangeItoJ.entropyProduction >= 0,
      `Entropy production should be non-negative, got ${exchangeItoJ.entropyProduction}`
    );
  });
});