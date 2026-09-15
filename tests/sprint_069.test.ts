import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as h3 from 'h3-js';
import {
  extractH3BoundaryCartesianVertices3D,
  SpatialGeometryBridge,
  H3BoundaryProjector,
  H3AdjacencyGraph,
  computeEdgeCartesianMetrics,
  evaluateInterfacialTransferMonad
} from '../src/spatial/h3_adjacency.js';
import { SpatialFluxMonad, CellStockTensor } from '../src/spatial/spatial_flux_monad.js';

// Helper to obtain resilient H3 hexagon test index
function getTestHexagon(res: number = 7): string {
  if (typeof (h3 as any).latLngToCell === 'function') {
    return (h3 as any).latLngToCell(37.7749, -122.4194, res);
  }
  if (typeof (h3 as any).geoToH3 === 'function') {
    return (h3 as any).geoToH3(37.7749, -122.4194, res);
  }
  return '872830828ffffff';
}

// Helper to obtain resilient H3 pentagon test index
function getTestPentagon(res: number = 7): string {
  if (typeof (h3 as any).getPentagons === 'function') {
    const p = (h3 as any).getPentagons(res);
    if (p && p.length > 0) return p[0];
  }
  if (typeof (h3 as any).getPentagonIndexes === 'function') {
    const p = (h3 as any).getPentagonIndexes(res);
    if (p && p.length > 0) return p[0];
  }
  return '870800000ffffff';
}

describe('Sprint 069: extractH3BoundaryCartesianVertices3D & 3D Interfacial Topology', () => {
  it('extracts unclosed 3D Cartesian boundary vertices for an H3 hexagon', () => {
    const hex = getTestHexagon(7);
    const boundary = extractH3BoundaryCartesianVertices3D(hex);

    assert.strictEqual(boundary.h3Index, hex);
    assert.strictEqual(boundary.vertexCount, 6);
    assert.strictEqual(boundary.isClosed, false);
    assert.strictEqual(boundary.vertices.length, 6);

    // INV-G-04: Unit sphere norm invariant ||v|| = 1.0 +- 1e-12
    for (const v of boundary.vertices) {
      const norm = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      assert.ok(
        Math.abs(norm - 1.0) < 1e-12,
        `Vertex norm ${norm} violates unit sphere invariant`
      );
    }

    // Centroid norm invariant
    const cNorm = Math.sqrt(
      boundary.centroid.x * boundary.centroid.x +
      boundary.centroid.y * boundary.centroid.y +
      boundary.centroid.z * boundary.centroid.z
    );
    assert.ok(Math.abs(cNorm - 1.0) < 1e-12, `Centroid norm ${cNorm} must be 1.0`);
  });

  it('supports closeLoop option with length = vertexCount + 1 and matching endpoints', () => {
    const hex = getTestHexagon(7);
    const boundary = extractH3BoundaryCartesianVertices3D(hex, { closeLoop: true });

    assert.strictEqual(boundary.vertexCount, 6);
    assert.strictEqual(boundary.isClosed, true);
    assert.strictEqual(boundary.vertices.length, 7);

    // First vertex mirrors the last vertex
    const first = boundary.vertices[0];
    const last = boundary.vertices[6];
    assert.strictEqual(first.x, last.x);
    assert.strictEqual(first.y, last.y);
    assert.strictEqual(first.z, last.z);
  });

  it('extracts 3D Cartesian boundary vertices for an H3 pentagon (5 vertices)', () => {
    const pent = getTestPentagon(7);
    const boundary = extractH3BoundaryCartesianVertices3D(pent, { closeLoop: true });

    assert.strictEqual(boundary.h3Index, pent);
    assert.strictEqual(boundary.vertexCount, 5);
    assert.strictEqual(boundary.isClosed, true);
    assert.strictEqual(boundary.vertices.length, 6);

    for (const v of boundary.vertices) {
      const norm = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      assert.ok(Math.abs(norm - 1.0) < 1e-12);
    }
  });

  it('correctly applies custom planetary scaling radius (Earth radius)', () => {
    const hex = getTestHexagon(5);
    const R_EARTH = 6371008.8;
    const boundary = extractH3BoundaryCartesianVertices3D(hex, { radius: R_EARTH });

    for (const v of boundary.vertices) {
      const norm = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      assert.ok(
        Math.abs(norm - R_EARTH) < 1e-4,
        `Vertex norm ${norm} must match scaled radius ${R_EARTH}`
      );
    }

    const cNorm = Math.sqrt(
      boundary.centroid.x * boundary.centroid.x +
      boundary.centroid.y * boundary.centroid.y +
      boundary.centroid.z * boundary.centroid.z
    );
    assert.ok(Math.abs(cNorm - R_EARTH) < 1e-4);
  });

  it('validates centroid collinearity with cell center', () => {
    const hex = getTestHexagon(7);
    const boundary = extractH3BoundaryCartesianVertices3D(hex);

    let centerLatLng: [number, number];
    if (typeof (h3 as any).cellToLatLng === 'function') {
      centerLatLng = (h3 as any).cellToLatLng(hex);
    } else {
      centerLatLng = (h3 as any).h3ToGeo(hex);
    }

    const centerCartesian = SpatialGeometryBridge.latLngToCartesian(
      centerLatLng[0],
      centerLatLng[1],
      1.0
    );

    const dot = SpatialGeometryBridge.dotProduct(boundary.centroid, centerCartesian);
    const angularDiff = Math.acos(Math.max(-1.0, Math.min(1.0, dot)));

    // Centroid must point in same direction as center within angular tolerance < 0.05 rad
    assert.ok(
      angularDiff < 0.05,
      `Centroid angular divergence ${angularDiff} rad exceeds 0.05 rad threshold`
    );
  });

  it('throws informative errors on invalid input parameters', () => {
    assert.throws(() => {
      extractH3BoundaryCartesianVertices3D('');
    }, /Invalid H3 index/);

    assert.throws(() => {
      extractH3BoundaryCartesianVertices3D('not-a-valid-h3-hex-index');
    }, /Invalid H3 index/);

    const hex = getTestHexagon(7);
    assert.throws(() => {
      extractH3BoundaryCartesianVertices3D(hex, { radius: -100 });
    }, /Invalid radius/);

    assert.throws(() => {
      extractH3BoundaryCartesianVertices3D(hex, { radius: 0 });
    }, /Invalid radius/);
  });

  it('verifies H3BoundaryProjector and H3AdjacencyGraph functionality', () => {
    const projector = new H3BoundaryProjector();
    const hex = getTestHexagon(7);
    const boundary = projector.project(hex);

    assert.ok(projector.verifyNormInvariants(boundary));

    const graph = new H3AdjacencyGraph(projector);
    const neighbors = graph.getNeighbors(hex);
    assert.ok(Array.isArray(neighbors));
    assert.ok(neighbors.length >= 5);

    // Check shared boundary edge between adjacent neighbors
    const n0 = neighbors[0];
    const sharedEdge = graph.findSharedBoundaryEdge(hex, n0);
    if (sharedEdge) {
      assert.strictEqual(sharedEdge.length, 2);
      const [v1, v2] = sharedEdge;
      const metrics = computeEdgeCartesianMetrics(v1, v2, 100.0);
      assert.ok(metrics.lengthMeters > 0);
      assert.ok(metrics.interfacialAreaM2 > 0);
    }
  });

  it('computes edge metrics adhering to metric symmetry and unit normals', () => {
    const v1 = { x: 1, y: 0, z: 0 };
    const v2 = { x: 0, y: 1, z: 0 }; // 90 degree arc on unit sphere

    const metrics1 = computeEdgeCartesianMetrics(v1, v2, 10.0, 1.0);
    const metrics2 = computeEdgeCartesianMetrics(v2, v1, 10.0, 1.0);

    // Metric symmetry: L_AB == L_BA
    assert.ok(Math.abs(metrics1.lengthMeters - metrics2.lengthMeters) < 1e-12);
    assert.ok(Math.abs(metrics1.lengthMeters - (Math.PI / 2)) < 1e-12);

    // Normal vector is normalized unit vector
    const normN = SpatialGeometryBridge.vectorNorm(metrics1.normalUnit);
    assert.ok(Math.abs(normN - 1.0) < 1e-12);
  });

  it('satisfies First Law mass conservation and Second Law entropy generation in SpatialFluxMonad', () => {
    const v1 = { x: 1, y: 0, z: 0 };
    const v2 = { x: Math.cos(0.01), y: Math.sin(0.01), z: 0 };
    const metrics = computeEdgeCartesianMetrics(v1, v2, 1000.0, 6371008.8);

    const cellA = 'cellA';
    const cellB = 'cellB';

    const stockA: CellStockTensor = {
      massH2O: 1e8,
      massCarbon: 5e4,
      massOxygen: 2e4,
      massMinerals: 1e4,
      energyJoules: 1e12,
      temperatureK: 300.0
    };

    const stockB: CellStockTensor = {
      massH2O: 1e8,
      massCarbon: 4e4,
      massOxygen: 2e4,
      massMinerals: 1e4,
      energyJoules: 0.95e12,
      temperatureK: 285.0
    };

    const velocityVec = { x: metrics.normalUnit.x * 0.5, y: metrics.normalUnit.y * 0.5, z: 0 };
    const delta = evaluateInterfacialTransferMonad(
      cellA,
      cellB,
      stockA,
      stockB,
      metrics,
      velocityVec,
      60.0
    );

    // Second Law constraint: entropyProduced >= 0
    assert.ok(delta.entropyProduced >= 0, 'Entropy production must be non-negative');

    // Monad state evolution
    const monad = new SpatialFluxMonad({ [cellA]: stockA, [cellB]: stockB });
    const massBefore = monad.totalSystemMass();

    monad.applyInterfacialTransfer(delta);
    const massAfter = monad.totalSystemMass();

    // INV-M-01: Strict mass conservation
    assert.ok(Math.abs(massAfter.h2o - massBefore.h2o) < 1e-9);
    assert.ok(Math.abs(massAfter.carbon - massBefore.carbon) < 1e-9);
    assert.ok(Math.abs(massAfter.oxygen - massBefore.oxygen) < 1e-9);
    assert.ok(Math.abs(massAfter.minerals - massBefore.minerals) < 1e-9);
  });
});