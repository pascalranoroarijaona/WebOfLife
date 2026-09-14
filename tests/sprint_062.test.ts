// =============================================================================
// SPRINT 062 TEST SUITE: computeBoundarySegmentRadialNormal3D
// =============================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  computeBoundarySegmentRadialNormal3D,
  computeBoundarySegmentRadialNormal3DFromPoints,
  computeBoundarySegmentTangent3D,
  computeBoundarySegmentLateralNormal3D,
  computeBoundaryFacetFrame3D,
  createBoundarySegment3D,
  toVec3D,
} from '../src/spatial/h3_adjacency.js';
import { Vector3D } from '../src/spatial/h3_types.js';

const EPSILON_TOLERANCE = 1e-12;

function assertVectorClose(actual: Vector3D, expected: Vector3D, tolerance: number = EPSILON_TOLERANCE) {
  const act = toVec3D(actual);
  const exp = toVec3D(expected);
  for (let i = 0; i < 3; i++) {
    assert.ok(
      Math.abs(act[i] - exp[i]) <= tolerance,
      `Component [${i}] mismatch: actual=${act[i]}, expected=${exp[i]}, diff=${Math.abs(act[i] - exp[i])}`
    );
  }
}

function vectorLength(v: Vector3D): number {
  const arr = toVec3D(v);
  return Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]);
}

function dotProduct(a: Vector3D, b: Vector3D): number {
  const va = toVec3D(a);
  const vb = toVec3D(b);
  return va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2];
}

describe('Sprint 062: RFC-062 Boundary Segment Radial Normal 3D Unit Vector', () => {

  it('computes radial normal correctly for equatorial segment ([1, 0, 0], [0, 1, 0])', () => {
    const v1: Vector3D = [1, 0, 0];
    const v2: Vector3D = [0, 1, 0];
    const segment = createBoundarySegment3D(v1, v2);

    const normal = computeBoundarySegmentRadialNormal3D(segment);
    const expectedVal = Math.SQRT1_2; // sqrt(2)/2

    assertVectorClose(normal, [expectedVal, expectedVal, 0]);
    assert.ok(Math.abs(vectorLength(normal) - 1.0) < 1e-14, 'Length must be exactly 1.0');
  });

  it('computes radial normal correctly from point arguments directly', () => {
    const v1: Vector3D = [1, 0, 0];
    const v2: Vector3D = [0, 1, 0];

    const normal = computeBoundarySegmentRadialNormal3DFromPoints(v1, v2);
    const expectedVal = Math.SQRT1_2;

    assertVectorClose(normal, [expectedVal, expectedVal, 0]);
  });

  it('computes radial normal for Northern Arctic facet ([0, 1, 1], [1, 0, 1])', () => {
    const v1: Vector3D = [0, 1, 1];
    const v2: Vector3D = [1, 0, 1];
    const segment = createBoundarySegment3D(v1, v2);

    const normal = computeBoundarySegmentRadialNormal3D(segment);
    const sqrt6 = Math.sqrt(6);
    const expected: Vector3D = [1 / sqrt6, 1 / sqrt6, 2 / sqrt6];

    assertVectorClose(normal, expected);
    assert.ok(Math.abs(vectorLength(normal) - 1.0) < 1e-14);
  });

  it('computes radial normal for Polar Apex Parallel ([-0.5, 0, 1], [0.5, 0, 1])', () => {
    const v1: Vector3D = [-0.5, 0, 1];
    const v2: Vector3D = [0.5, 0, 1];
    const segment = createBoundarySegment3D(v1, v2);

    const normal = computeBoundarySegmentRadialNormal3D(segment);
    assertVectorClose(normal, [0, 0, 1]);
  });

  it('handles antipodal degeneracy safely without NaN or Infinity', () => {
    const v1: Vector3D = [1, 0, 0];
    const v2: Vector3D = [-1, 0, 0];
    const segment = createBoundarySegment3D(v1, v2);

    const normal = computeBoundarySegmentRadialNormal3D(segment);
    assert.deepStrictEqual(normal, [0, 0, 1], 'Should return fallback polar zenith [0, 0, 1]');
  });

  it('handles zero-length vector degeneracy at origin safely', () => {
    const v1: Vector3D = [0, 0, 0];
    const v2: Vector3D = [0, 0, 0];
    const segment = createBoundarySegment3D(v1, v2);

    const normal = computeBoundarySegmentRadialNormal3D(segment);
    assert.deepStrictEqual(normal, [0, 0, 1]);
  });

  it('satisfies scale invariance: scaling vertices does not alter radial normal', () => {
    const v1: Vector3D = [1, 0, 0];
    const v2: Vector3D = [0, 1, 0];

    const v1Scaled: Vector3D = [2, 0, 0];
    const v2Scaled: Vector3D = [0, 2, 0];

    const norm1 = computeBoundarySegmentRadialNormal3D(createBoundarySegment3D(v1, v2));
    const norm2 = computeBoundarySegmentRadialNormal3D(createBoundarySegment3D(v1Scaled, v2Scaled));

    assertVectorClose(norm1, norm2, 1e-14);
  });

  it('satisfies orthogonality to boundary tangent for spherical edges (||v1|| = ||v2||)', () => {
    // Two vertices on unit sphere
    const theta1 = 0.2;
    const phi1 = 0.5;
    const v1: Vector3D = [
      Math.sin(theta1) * Math.cos(phi1),
      Math.sin(theta1) * Math.sin(phi1),
      Math.cos(theta1),
    ];

    const theta2 = 0.4;
    const phi2 = 0.8;
    const v2: Vector3D = [
      Math.sin(theta2) * Math.cos(phi2),
      Math.sin(theta2) * Math.sin(phi2),
      Math.cos(theta2),
    ];

    const segment = createBoundarySegment3D(v1, v2);
    const radialNormal = computeBoundarySegmentRadialNormal3D(segment);
    const tangent = computeBoundarySegmentTangent3D(segment);

    const dot = dotProduct(radialNormal, tangent);
    assert.ok(
      Math.abs(dot) < 1e-12,
      `Radial normal and tangent must be orthogonal, got dot product: ${dot}`
    );
  });

  it('generates a full orthonormal facet frame triad with proper mutual orthogonality', () => {
    const v1: Vector3D = [1, 0, 0];
    const v2: Vector3D = [0, 1, 0];
    const segment = createBoundarySegment3D(v1, v2);

    const frame = computeBoundaryFacetFrame3D(segment);

    // Verify unit lengths
    assert.ok(Math.abs(vectorLength(frame.tangent) - 1.0) < 1e-14);
    assert.ok(Math.abs(vectorLength(frame.radialNormal) - 1.0) < 1e-14);
    assert.ok(Math.abs(vectorLength(frame.lateralNormal) - 1.0) < 1e-14);

    // Verify mutual orthogonality
    const dotTanRad = dotProduct(frame.tangent, frame.radialNormal);
    const dotTanLat = dotProduct(frame.tangent, frame.lateralNormal);
    const dotLatRad = dotProduct(frame.lateralNormal, frame.radialNormal);

    assert.ok(Math.abs(dotTanRad) < 1e-12, `Tangent and Radial normal must be orthogonal: ${dotTanRad}`);
    assert.ok(Math.abs(dotTanLat) < 1e-12, `Tangent and Lateral normal must be orthogonal: ${dotTanLat}`);
    assert.ok(Math.abs(dotLatRad) < 1e-12, `Lateral and Radial normal must be orthogonal: ${dotLatRad}`);
  });
});