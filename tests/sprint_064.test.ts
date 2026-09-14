// =============================================================================
// SPRINT 064 UNIT TESTS: 3D VECTOR TARGET ORIENTATION VIA DOT-PRODUCT PARITY
// RFC-064 Verification Suite
// =============================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  orientVectorTowardsTarget3D,
  vectorDotProduct3D,
  vectorNorm3D,
  calculateEffectiveVelocity,
  H3AdjacencyGraph,
  Vector3Tuple,
  Vector3Object,
} from '../src/spatial/h3_adjacency.js';

describe('Sprint 064: 3D Vector Target Orientation (RFC-064)', () => {
  const EPSILON = 1e-12;

  function assertVectorsClose(
    actual: Vector3Tuple,
    expected: Vector3Tuple,
    message?: string
  ): void {
    assert(
      Math.abs(actual[0] - expected[0]) < EPSILON,
      `${message ?? 'Vector mismatch'} at x: expected ${expected[0]}, got ${actual[0]}`
    );
    assert(
      Math.abs(actual[1] - expected[1]) < EPSILON,
      `${message ?? 'Vector mismatch'} at y: expected ${expected[1]}, got ${actual[1]}`
    );
    assert(
      Math.abs(actual[2] - expected[2]) < EPSILON,
      `${message ?? 'Vector mismatch'} at z: expected ${expected[2]}, got ${actual[2]}`
    );
  }

  it('TC-01-POS: preserves vector when dot product with displacement is positive', () => {
    const v: Vector3Tuple = [1.0, 2.0, 3.0];
    const d: Vector3Tuple = [1.0, 0.0, 0.0];

    const result = orientVectorTowardsTarget3D(v, d);

    assertVectorsClose(result, [1.0, 2.0, 3.0]);
    assert(vectorDotProduct3D(result, d) > 0);
    assert(Math.abs(vectorNorm3D(result) - Math.sqrt(14)) < EPSILON);
  });

  it('TC-02-NEG: sign-inverts vector when dot product with displacement is negative', () => {
    const v: Vector3Tuple = [1.0, 2.0, 3.0];
    const d: Vector3Tuple = [-1.0, 0.0, 0.0];

    const result = orientVectorTowardsTarget3D(v, d);

    assertVectorsClose(result, [-1.0, -2.0, -3.0]);
    assert(vectorDotProduct3D(result, d) >= 0);
    assert(Math.abs(vectorNorm3D(result) - Math.sqrt(14)) < EPSILON);
  });

  it('TC-03-ORTHO: leaves vector unchanged when orthogonal (dot product is zero)', () => {
    const v: Vector3Tuple = [0.0, 1.0, 0.0];
    const d: Vector3Tuple = [1.0, 0.0, 0.0];

    const result = orientVectorTowardsTarget3D(v, d);

    assertVectorsClose(result, [0.0, 1.0, 0.0]);
    assert.strictEqual(vectorDotProduct3D(result, d), 0.0);
    assert(Math.abs(vectorNorm3D(result) - 1.0) < EPSILON);
  });

  it('TC-04-ZERO-V: correctly handles zero vector without NaN propagation', () => {
    const v: Vector3Tuple = [0.0, 0.0, 0.0];
    const d: Vector3Tuple = [3.0, 4.0, 5.0];

    const result = orientVectorTowardsTarget3D(v, d);

    assertVectorsClose(result, [0.0, 0.0, 0.0]);
    assert.strictEqual(vectorDotProduct3D(result, d), 0.0);
    assert.strictEqual(vectorNorm3D(result), 0.0);
  });

  it('TC-05-ZERO-D: handles zero displacement vector gracefully', () => {
    const v: Vector3Tuple = [1.0, -2.0, 1.5];
    const d: Vector3Tuple = [0.0, 0.0, 0.0];

    const result = orientVectorTowardsTarget3D(v, d);

    assertVectorsClose(result, [1.0, -2.0, 1.5]);
    assert(Math.abs(vectorNorm3D(result) - Math.sqrt(7.25)) < EPSILON);
  });

  it('TC-06-3ARG-POS: correctly processes 3-argument overload (origin, target) with positive alignment', () => {
    const v: Vector3Tuple = [0.5, 0.5, 0.0];
    const origin: Vector3Tuple = [0.0, 0.0, 0.0];
    const target: Vector3Tuple = [1.0, 1.0, 0.0];

    const result = orientVectorTowardsTarget3D(v, origin, target);

    assertVectorsClose(result, [0.5, 0.5, 0.0]);
    assert(Math.abs(vectorNorm3D(result) - Math.sqrt(0.5)) < EPSILON);
  });

  it('TC-07-3ARG-NEG: correctly processes 3-argument overload (origin, target) with negative alignment', () => {
    const v: Vector3Tuple = [0.5, 0.5, 0.0];
    const origin: Vector3Tuple = [1.0, 1.0, 0.0];
    const target: Vector3Tuple = [0.0, 0.0, 0.0];

    const result = orientVectorTowardsTarget3D(v, origin, target);

    assertVectorsClose(result, [-0.5, -0.5, 0.0]);
    assert(Math.abs(vectorNorm3D(result) - Math.sqrt(0.5)) < EPSILON);
  });

  it('TC-08-OBJECT-FORMAT: supports Vector3Object { x, y, z } seamlessly', () => {
    const vObj: Vector3Object = { x: 2, y: -4, z: 6 };
    const dObj: Vector3Object = { x: -1, y: 0, z: 0 };

    const resultObj = orientVectorTowardsTarget3D(vObj, dObj);

    assert.strictEqual(resultObj.x, -2);
    assert.strictEqual(resultObj.y, 4);
    assert.strictEqual(resultObj.z, -6);
  });

  it('TC-09-ISOMETRY: preserves vector Euclidean norm under all reflection operations', () => {
    const candidates: Vector3Tuple[] = [
      [3.1415, -2.7182, 1.4142],
      [-10.0, -20.0, -30.0],
      [0.001, -0.002, 0.003],
    ];
    const displacements: Vector3Tuple[] = [
      [-1, -1, -1],
      [1, 1, 1],
      [-5, 2, -1],
    ];

    for (const v of candidates) {
      for (const d of displacements) {
        const oriented = orientVectorTowardsTarget3D(v, d);
        const normBefore = vectorNorm3D(v);
        const normAfter = vectorNorm3D(oriented);
        assert(
          Math.abs(normBefore - normAfter) < EPSILON,
          `Norm violation: before=${normBefore}, after=${normAfter}`
        );
        assert(
          vectorDotProduct3D(oriented, d) >= 0,
          'Parity invariant violated: dot product must be >= 0'
        );
      }
    }
  });

  it('TC-10-GRAPH-EDGE-INTEGRATION: H3AdjacencyGraph accurately orients boundary edge flux', () => {
    const graph = new H3AdjacencyGraph();
    const cellA = '8828308281fffff';
    const cellB = '8828308283fffff';

    graph.setCellCentroid3D(cellA, [0, 0, 0]);
    graph.setCellCentroid3D(cellB, [10, 0, 0]);
    const edge = graph.addEdge(cellA, cellB, 50.0);

    const fluxOpposing: Vector3Tuple = [-5.0, 0.0, 0.0];
    const oriented = graph.orientEdgeFluxVector(cellA, cellB, fluxOpposing);

    assertVectorsClose(oriented, [5.0, 0.0, 0.0]);

    // Also verify edgeId string lookup overload
    const orientedByEdgeId = graph.orientEdgeFluxVector(edge.id, fluxOpposing);
    assertVectorsClose(orientedByEdgeId, [5.0, 0.0, 0.0]);
  });

  it('TC-11-MASS-CONSERVATION: mass stock transfer maintains strict conservation invariance', () => {
    const graph = new H3AdjacencyGraph();
    const sourceCell = '8828308285fffff';
    const targetCell = '8828308287fffff';

    graph.setCellCentroid3D(sourceCell, [0, 0, 0]);
    graph.setCellCentroid3D(targetCell, [5, 0, 0]);

    const initialStocks = {
      CO2: 1250.0,
      H2O: 50000.0,
      O2: 890.0,
      minerals: 420.0,
      biomass: 310.0,
    };

    const opposingFlowVelocity: Vector3Tuple = [-2.0, 0.0, 0.0];
    const areaM2 = 100.0;
    const dtSeconds = 60.0;
    const sourceVolumeM3 = 1_000_000.0;

    const result = graph.computeAdvectiveMassTransfer(
      sourceCell,
      targetCell,
      opposingFlowVelocity,
      areaM2,
      dtSeconds,
      sourceVolumeM3,
      initialStocks
    );

    assert(result.effectiveVelocity > 0, 'Effective velocity should be positive');

    for (const substance of Object.keys(initialStocks)) {
      const deltaSrc = result.sourceNetDelta[substance];
      const deltaTgt = result.targetNetDelta[substance];
      const netSum = deltaSrc + deltaTgt;
      assert(
        Math.abs(netSum) < 1e-14,
        `Mass conservation failed for ${substance}: net change = ${netSum}`
      );
      assert(deltaSrc < 0, `Source stock for ${substance} must decrease`);
      assert(deltaTgt > 0, `Target stock for ${substance} must increase`);
    }
  });

  it('TC-12-THERMAL-ENTHALPY-CONSERVATION: guarantees enthalpy balance and non-negative entropy generation', () => {
    const graph = new H3AdjacencyGraph();
    const sourceCell = '8828308289fffff';
    const targetCell = '882830828bfffff';

    graph.setCellCentroid3D(sourceCell, [0, 0, 0]);
    graph.setCellCentroid3D(targetCell, [0, 10, 0]);

    const opposingFlowVelocity: Vector3Tuple = [0.0, -3.5, 0.0];
    const areaM2 = 25.0;
    const dtSeconds = 10.0;
    const tempSource = 310.15; // 37 C (warmer)
    const tempTarget = 293.15; // 20 C (cooler)

    const enthalpyResult = graph.computeEnthalpyTransfer(
      sourceCell,
      targetCell,
      opposingFlowVelocity,
      areaM2,
      dtSeconds,
      tempSource,
      tempTarget
    );

    assert(enthalpyResult.effectiveVelocity > 0, 'Velocity must be oriented positively');
    assert(enthalpyResult.deltaH > 0, 'Enthalpy transfer must be positive from warm to cold');
    assert(
      enthalpyResult.entropyGenerationUniverse >= 0,
      'Universe entropy generation must be non-negative'
    );
  });
});