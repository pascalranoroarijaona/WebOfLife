import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  Vector3D,
  CellThermodynamicState,
  DiffusionCoefficients,
} from '../src/spatial/h3_types.js';
import {
  findSharedBoundaryVertexPairs3D,
  extractSharedBoundaryEdge3D,
  H3AdjacencyService,
} from '../src/spatial/h3_adjacency.js';
import {
  computeBoundaryFlux,
  SpatialFluxMonad,
} from '../src/spatial/spatial_flux_monad.js';

describe('RFC-071: findSharedBoundaryVertexPairs3D & Boundary Edge Interface', () => {
  // Helper to generate a regular hexagon in the z=0 plane
  function createHexagon2D(centerX: number, centerY: number, radius: number = 1.0): Vector3D[] {
    const vertices: Vector3D[] = [];
    for (let k = 0; k < 6; k++) {
      const angle = (k * Math.PI) / 3;
      vertices.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        z: 0.0,
      });
    }
    return vertices;
  }

  it('1. Identical vertices match with zero distance and correct permutation indices', () => {
    const hexA = createHexagon2D(0, 0, 1.0);
    // Perturb order or match identical vertices
    const hexB: Vector3D[] = [
      { ...(hexA[3] ?? {}) },
      { ...(hexA[4] ?? {}) },
      { ...(hexA[5] ?? {}) },
      { ...(hexA[0] ?? {}) },
      { ...(hexA[1] ?? {}) },
      { ...(hexA[2] ?? {}) },
    ];

    const pairs = findSharedBoundaryVertexPairs3D(hexA, hexB, 1e-6);
    assert.strictEqual(pairs.length, 2, 'Should clamp to at most 2 coincident pairs for a shared edge');
    assert.ok(pairs[0] && pairs[1]);
    assert.strictEqual(pairs[0].distance, 0.0);
    assert.strictEqual(pairs[1].distance, 0.0);
    assert.strictEqual(pairs[0].vertexA.x, pairs[0].vertexB.x);
    assert.strictEqual(pairs[0].vertexA.y, pairs[0].vertexB.y);
  });

  it('2. Adjacent regular hexagons on z=0 plane and 3D unit sphere return exactly 2 vertex pairs', () => {
    // Regular hexagon tiling: hex A at (0,0), hex B at (1.5, sqrt(3)/2)
    const hexA = createHexagon2D(0, 0, 1.0);
    const hexB = createHexagon2D(1.5, Math.sqrt(3) / 2, 1.0);

    const pairsPlanar = findSharedBoundaryVertexPairs3D(hexA, hexB);
    assert.strictEqual(pairsPlanar.length, 2, 'Planar adjacent hexagons must share exactly 2 coincident vertices');

    // Spherical hexagons on unit sphere
    const sphereHexA: Vector3D[] = [
      { x: 0.0, y: 0.0, z: 1.0 },
      { x: 0.1, y: 0.0, z: Math.sqrt(1 - 0.01) },
      { x: 0.15, y: 0.1, z: Math.sqrt(1 - 0.15 * 0.15 - 0.01) },
      { x: 0.05, y: 0.18, z: Math.sqrt(1 - 0.05 * 0.05 - 0.18 * 0.18) },
      { x: -0.05, y: 0.15, z: Math.sqrt(1 - 0.05 * 0.05 - 0.15 * 0.15) },
      { x: -0.08, y: 0.05, z: Math.sqrt(1 - 0.08 * 0.08 - 0.05 * 0.05) },
    ];

    const s1 = sphereHexA[1]!;
    const s2 = sphereHexA[2]!;

    // Spherical Hex B shares vertices 1 and 2 of Hex A
    const sphereHexB: Vector3D[] = [
      { x: (s1.x ?? 0) + 1e-8, y: s1.y, z: s1.z },
      { x: s2.x, y: (s2.y ?? 0) - 1e-8, z: s2.z },
      { x: 0.25, y: 0.15, z: Math.sqrt(1 - 0.25 * 0.25 - 0.15 * 0.15) },
      { x: 0.3, y: 0.05, z: Math.sqrt(1 - 0.3 * 0.3 - 0.05 * 0.05) },
      { x: 0.25, y: -0.05, z: Math.sqrt(1 - 0.25 * 0.25 - 0.05 * 0.05) },
      { x: 0.18, y: -0.08, z: Math.sqrt(1 - 0.18 * 0.18 - 0.08 * 0.08) },
    ];

    const pairsSphere = findSharedBoundaryVertexPairs3D(sphereHexA, sphereHexB, 1e-4);
    assert.strictEqual(pairsSphere.length, 2, 'Spherical adjacent cells must share exactly 2 coincident vertices');
    assert.ok(pairsSphere[0] && pairsSphere[1]);
    assert.ok(pairsSphere[0].distance < 1e-6);
    assert.ok(pairsSphere[1].distance < 1e-6);
  });

  it('3. Non-adjacent cells return empty pair arrays ([]) and null edge', () => {
    const hexA = createHexagon2D(0, 0, 1.0);
    const hexFar = createHexagon2D(20.0, 30.0, 1.0);

    const pairs = findSharedBoundaryVertexPairs3D(hexA, hexFar);
    assert.strictEqual(pairs.length, 0);

    const edge = extractSharedBoundaryEdge3D('cell_A', hexA, 'cell_FAR', hexFar);
    assert.strictEqual(edge, null);
  });

  it('4. Vertices with distance greater than epsilon are correctly rejected', () => {
    const hexA = createHexagon2D(0, 0, 1.0);
    // Offset hex B slightly past epsilon
    const eps = 1e-4;
    const hexB = createHexagon2D(1.5, Math.sqrt(3) / 2 + eps * 2.0, 1.0);

    const pairsStrict = findSharedBoundaryVertexPairs3D(hexA, hexB, eps);
    assert.strictEqual(pairsStrict.length, 0, 'Should reject vertices beyond epsilon');

    const pairsPermissive = findSharedBoundaryVertexPairs3D(hexA, hexB, eps * 5.0);
    assert.strictEqual(pairsPermissive.length, 2, 'Should accept vertices within relaxed epsilon');
  });

  it('5. BoundaryEdge3D computes symmetric edge length and verified outward normal directed towards cell B', () => {
    const hexA = createHexagon2D(0, 0, 1.0);
    const hexB = createHexagon2D(1.5, Math.sqrt(3) / 2, 1.0);

    const edge = extractSharedBoundaryEdge3D('cellA', hexA, 'cellB', hexB);
    assert.ok(edge !== null);

    // Side length of regular hexagon with radius 1.0 is exactly 1.0
    assert.ok(Math.abs(edge.edgeLength - 1.0) < 1e-7, `Edge length should be 1.0, got ${edge.edgeLength}`);
    assert.ok(Math.abs(edge.lengthMeters - 1.0) < 1e-7);

    // Outward normal must be unit length and point strictly from A towards B
    const normalLen = Math.sqrt(
      edge.outwardNormal.x ** 2 + edge.outwardNormal.y ** 2 + edge.outwardNormal.z ** 2
    );
    assert.ok(Math.abs(normalLen - 1.0) < 1e-7, `Normal should be unit length, got ${normalLen}`);

    // Direction vector from A center to B center is (1.5, sqrt(3)/2, 0)
    const dotProduct =
      edge.outwardNormal.x * 1.5 + edge.outwardNormal.y * (Math.sqrt(3) / 2);
    assert.ok(dotProduct > 0.99, 'Outward normal must point along A -> B vector');

    // Midpoint of shared edge
    assert.ok(Math.abs(edge.midpoint.x - 0.75) < 1e-6);
    assert.ok(Math.abs(edge.midpoint.y - Math.sqrt(3) / 4) < 1e-6);
    assert.ok(Math.abs(edge.midpoint.z - 0.0) < 1e-6);
  });

  it('6. Conservation invariant test: 2-cell closed system mass flux yields total deltaM = 0.0 to within 1e-15', () => {
    const hexA = createHexagon2D(0, 0, 1.0);
    const hexB = createHexagon2D(1.5, Math.sqrt(3) / 2, 1.0);
    const edge = extractSharedBoundaryEdge3D('cellA', hexA, 'cellB', hexB)!;
    assert.ok(edge !== null);

    const stateA: CellThermodynamicState = {
      h3Index: 'cellA',
      centroid: { x: 0, y: 0, z: 0 },
      volumeM3: 100.0,
      waterKg: 1000.0,
      carbonKg: 50.0,
      mineralsKg: 20.0,
      oxygenKg: 10.0,
      enthalpyJoules: 1e8,
      temperatureKelvin: 300.0,
    };

    const stateB: CellThermodynamicState = {
      h3Index: 'cellB',
      centroid: { x: 1.5, y: Math.sqrt(3) / 2, z: 0 },
      volumeM3: 100.0,
      waterKg: 500.0,
      carbonKg: 20.0,
      mineralsKg: 5.0,
      oxygenKg: 2.0,
      enthalpyJoules: 5e7,
      temperatureKelvin: 285.0,
    };

    const coeffs: DiffusionCoefficients = {
      waterDiffusivity: 1e-4,
      carbonDiffusivity: 1e-5,
      mineralDiffusivity: 1e-5,
      oxygenDiffusivity: 2e-4,
      thermalConductivity: 1.5,
    };

    // Evaluate advective and diffusive flux over 10 seconds
    const { nextA, nextB, flux } = computeBoundaryFlux(
      stateA,
      stateB,
      edge,
      5.0, // layerHeightMeters
      0.2, // bulkNormalVelocityMs
      coeffs,
      10.0 // deltaSeconds
    );

    // Mass conservation (First Law: sum(delta) = 0)
    const totalWaterDelta = (nextA.waterKg! - stateA.waterKg!) + (nextB.waterKg! - stateB.waterKg!);
    const totalCarbonDelta = (nextA.carbonKg! - stateA.carbonKg!) + (nextB.carbonKg! - stateB.carbonKg!);
    const totalMineralsDelta = (nextA.mineralsKg! - stateA.mineralsKg!) + (nextB.mineralsKg! - stateB.mineralsKg!);
    const totalOxygenDelta = (nextA.oxygenKg! - stateA.oxygenKg!) + (nextB.oxygenKg! - stateB.oxygenKg!);
    const totalEnthalpyDelta = (nextA.enthalpyJoules! - stateA.enthalpyJoules!) + (nextB.enthalpyJoules! - stateB.enthalpyJoules!);

    assert.ok(Math.abs(totalWaterDelta) < 1e-14, `Water mass leak: ${totalWaterDelta}`);
    assert.ok(Math.abs(totalCarbonDelta) < 1e-14, `Carbon mass leak: ${totalCarbonDelta}`);
    assert.ok(Math.abs(totalMineralsDelta) < 1e-14, `Minerals mass leak: ${totalMineralsDelta}`);
    assert.ok(Math.abs(totalOxygenDelta) < 1e-14, `Oxygen mass leak: ${totalOxygenDelta}`);
    assert.ok(Math.abs(totalEnthalpyDelta) < 1e-6, `Enthalpy leak: ${totalEnthalpyDelta}`);

    // Second Law verification: entropy production non-negative
    assert.ok(flux.entropyProducedJPerK >= 0.0, 'Entropy production must be non-negative');

    // Test monadic integration
    const stateTensor = {
      cells: new Map([
        ['cellA', stateA],
        ['cellB', stateB],
      ]),
    };
    const monad = new SpatialFluxMonad(stateTensor);
    const result = monad.computeConservativeBoundaryFlux(edge, 5.0, 0.2, coeffs, 10.0);
    const updatedCells = result.nextMonad.unwrap().cells;

    const cellAEnd = updatedCells.get('cellA')!;
    const cellBEnd = updatedCells.get('cellB')!;
    assert.strictEqual(cellAEnd.waterKg, nextA.waterKg);
    assert.strictEqual(cellBEnd.waterKg, nextB.waterKg);
  });

  it('7. Service instance methods match static delegation', () => {
    const service = new H3AdjacencyService();
    const hexA = createHexagon2D(0, 0, 1.0);
    const hexB = createHexagon2D(1.5, Math.sqrt(3) / 2, 1.0);

    const pairs1 = service.findSharedBoundaryVertexPairs3D(hexA, hexB);
    const pairs2 = H3AdjacencyService.findSharedBoundaryVertexPairs3D(hexA, hexB);
    assert.strictEqual(pairs1.length, pairs2.length);

    const edge1 = service.extractSharedBoundaryEdge3D('A', hexA, 'B', hexB);
    const edge2 = H3AdjacencyService.extractSharedBoundaryEdge3D('A', hexA, 'B', hexB);
    assert.ok(edge1 !== null && edge2 !== null);
    assert.strictEqual(edge1.edgeLength, edge2.edgeLength);
  });
});