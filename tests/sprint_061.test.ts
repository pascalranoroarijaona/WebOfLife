import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  computeBoundarySegmentVector3D,
  createBoundarySegment3D,
  computeFacetMetrics,
  evaluateInterfacialFlux,
  latLngToVector3D,
  H3AdjacencyGraph,
  MEAN_EARTH_RADIUS_METERS,
  GEOMETRIC_EPSILON
} from '../src/spatial/h3_adjacency.js';
import {
  Vector3D,
  ThermodynamicStocks,
  DiffusionCoefficients
} from '../src/spatial/h3_types.js';

describe('Sprint 061 - Spherical Boundary Segment Displacement Vector Formulation', () => {
  describe('1. Orthogonal Basis & Core Vector Calculation', () => {
    it('computes displacement between orthogonal basis points', () => {
      const v1: Vector3D = { x: 1, y: 0, z: 0 };
      const v2: Vector3D = { x: 0, y: 1, z: 0 };

      const delta = computeBoundarySegmentVector3D(v1, v2);
      assert.strictEqual(delta.x, -1);
      assert.strictEqual(delta.y, 1);
      assert.strictEqual(delta.z, 0);
    });

    it('computes displacement from origin to arbitrary coordinate', () => {
      const origin: Vector3D = { x: 0, y: 0, z: 0 };
      const target: Vector3D = { x: 12.5, y: -45.2, z: 88.0 };

      const delta = computeBoundarySegmentVector3D(origin, target);
      assert.strictEqual(delta.x, 12.5);
      assert.strictEqual(delta.y, -45.2);
      assert.strictEqual(delta.z, 88.0);
    });
  });

  describe('2. Algebraic Antisymmetry Property', () => {
    it('strictly satisfies delta_BA === -delta_AB to machine precision', () => {
      const vA: Vector3D = { x: 4500000.12, y: 1200000.56, z: 4200000.89 };
      const vB: Vector3D = { x: 4500500.44, y: 1200300.22, z: 4199500.11 };

      const lab = computeBoundarySegmentVector3D(vA, vB);
      const lba = computeBoundarySegmentVector3D(vB, vA);

      assert.strictEqual(lab.x, -lba.x);
      assert.strictEqual(lab.y, -lba.y);
      assert.strictEqual(lab.z, -lba.z);
      assert.ok(Math.abs(lab.x + lba.x) < GEOMETRIC_EPSILON);
      assert.ok(Math.abs(lab.y + lba.y) < GEOMETRIC_EPSILON);
      assert.ok(Math.abs(lab.z + lba.z) < GEOMETRIC_EPSILON);
    });
  });

  describe('3. Degenerate Point Boundary Handling', () => {
    it('returns exact zero vector without error for coincident vertices', () => {
      const v: Vector3D = { x: 3000000, y: 2000000, z: 5000000 };
      const zeroVec = computeBoundarySegmentVector3D(v, v);

      assert.strictEqual(zeroVec.x, 0);
      assert.strictEqual(zeroVec.y, 0);
      assert.strictEqual(zeroVec.z, 0);
    });
  });

  describe('4. Spherical Boundary Geometry & Chord Length Verification', () => {
    it('verifies Euclidean chord length against analytical distance on planetary sphere', () => {
      const v1 = latLngToVector3D(0.0, 0.0, MEAN_EARTH_RADIUS_METERS);
      const v2 = latLngToVector3D(0.0, 1.0, MEAN_EARTH_RADIUS_METERS);

      const segment = createBoundarySegment3D(v1, v2, MEAN_EARTH_RADIUS_METERS);

      const expectedChord = Math.sqrt(
        Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2) + Math.pow(v2.z - v1.z, 2)
      );

      assert.ok(Math.abs(segment.chordLength - expectedChord) < 1e-6);
      assert.ok(segment.arcLength > segment.chordLength);
      // Great circle arc for 1 degree is roughly 111.19 km
      assert.ok(segment.arcLength > 111000 && segment.arcLength < 112000);
    });
  });

  describe('5. Stokes Closed Loop Invariant (Discrete Divergence Theorem)', () => {
    it('confirms the vector sum of a closed hexagonal loop is zero', () => {
      // Create a regular hexagon on the spherical tangent plane
      const centerLat = 45.0;
      const centerLng = 10.0;
      const radiusDeg = 0.5;
      const vertices: Vector3D[] = [];

      for (let i = 0; i < 6; i++) {
        const angle = (i * 2 * Math.PI) / 6;
        const lat = centerLat + radiusDeg * Math.sin(angle);
        const lng = centerLng + radiusDeg * Math.cos(angle);
        vertices.push(latLngToVector3D(lat, lng));
      }

      let sumX = 0;
      let sumY = 0;
      let sumZ = 0;

      for (let i = 0; i < 6; i++) {
        const vCurr = vertices[i];
        const vNext = vertices[(i + 1) % 6];
        const seg = computeBoundarySegmentVector3D(vCurr, vNext);
        sumX += seg.x;
        sumY += seg.y;
        sumZ += seg.z;
      }

      assert.ok(
        Math.abs(sumX) < 1e-9,
        `Loop sumX must be ~0, got ${sumX}`
      );
      assert.ok(
        Math.abs(sumY) < 1e-9,
        `Loop sumY must be ~0, got ${sumY}`
      );
      assert.ok(
        Math.abs(sumZ) < 1e-9,
        `Loop sumZ must be ~0, got ${sumZ}`
      );
    });
  });

  describe('6. Input Validation & Robustness Guards', () => {
    it('throws descriptive error on NaN or non-finite inputs', () => {
      const badV1: Vector3D = { x: NaN, y: 0, z: 0 };
      const validV2: Vector3D = { x: 1, y: 2, z: 3 };

      assert.throws(
        () => computeBoundarySegmentVector3D(badV1, validV2),
        /All vertex coordinates must be finite numbers/
      );

      const badV2: Vector3D = { x: 0, y: Infinity, z: 0 };
      assert.throws(
        () => computeBoundarySegmentVector3D(validV2, badV2),
        /All vertex coordinates must be finite numbers/
      );
    });
  });

  describe('7. Thermodynamic Flux & Conservation Invariants', () => {
    it('preserves First Law (exact anti-symmetry) and Second Law (entropy >= 0)', () => {
      const v1 = latLngToVector3D(20.0, 30.0);
      const v2 = latLngToVector3D(20.1, 30.1);
      const layerDepth = 1000; // 1 km depth
      const metrics = computeFacetMetrics(v1, v2, layerDepth);

      const stockI: ThermodynamicStocks = {
        internalEnergyJ: 1e9,
        waterKg: 50000,
        carbonKg: 2000,
        oxygenKg: 500,
        mineralsKg: 1000
      };

      const stockJ: ThermodynamicStocks = {
        internalEnergyJ: 8e8, // cooler
        waterKg: 40000,
        carbonKg: 1800,
        oxygenKg: 450,
        mineralsKg: 900
      };

      const volumeI = 1e8;
      const volumeJ = 1e8;
      const heatCapacityI = 4e6; // J / K => T_I = 250 K
      const heatCapacityJ = 4e6; // J / K => T_J = 200 K
      const centroidDist = 12000;
      const fluidVelocity: Vector3D = { x: 0.1, y: 0.05, z: 0 };
      const coeffs: DiffusionCoefficients = {
        water: 1e-4,
        carbon: 1e-5,
        oxygen: 1e-5,
        minerals: 1e-6,
        thermalConductivity: 0.6
      };
      const dt = 60; // 1 minute

      const { deltaI, deltaJ } = evaluateInterfacialFlux(
        stockI,
        stockJ,
        volumeI,
        volumeJ,
        heatCapacityI,
        heatCapacityJ,
        centroidDist,
        metrics,
        fluidVelocity,
        coeffs,
        dt
      );

      // 1st Law Mass & Energy Conservation (zero sum)
      assert.ok(Math.abs(deltaI.dInternalEnergyJ + deltaJ.dInternalEnergyJ) < 1e-6);
      assert.ok(Math.abs(deltaI.dWaterKg + deltaJ.dWaterKg) < 1e-6);
      assert.ok(Math.abs(deltaI.dCarbonKg + deltaJ.dCarbonKg) < 1e-6);
      assert.ok(Math.abs(deltaI.dOxygenKg + deltaJ.dOxygenKg) < 1e-6);
      assert.ok(Math.abs(deltaI.dMineralsKg + deltaJ.dMineralsKg) < 1e-6);

      // 2nd Law Entropy Generation (>= 0)
      assert.ok(deltaI.entropyGenJK >= 0, `Entropy gen I must be non-negative: ${deltaI.entropyGenJK}`);
      assert.ok(deltaJ.entropyGenJK >= 0, `Entropy gen J must be non-negative: ${deltaJ.entropyGenJK}`);
    });
  });

  describe('8. H3AdjacencyGraph Integration', () => {
    it('manages cell boundaries and segments consistently', () => {
      const graph = new H3AdjacencyGraph();
      const vA = { x: 1, y: 0, z: 0 };
      const vB = { x: 0, y: 1, z: 0 };
      const vC = { x: 0, y: 0, z: 1 };

      graph.addCell('cell_1', [vA, vB, vC]);
      graph.addCell('cell_2', [vB, vA, { x: -1, y: 0, z: 0 }]);
      graph.connect('cell_1', 'cell_2');

      assert.deepStrictEqual(graph.getNeighbors('cell_1'), ['cell_2']);
      assert.deepStrictEqual(graph.getNeighbors('cell_2'), ['cell_1']);

      const segments = graph.computeCellBoundarySegments('cell_1');
      assert.strictEqual(segments.length, 3);
      assert.strictEqual(segments[0].displacement.x, -1);
      assert.strictEqual(segments[0].displacement.y, 1);
    });
  });
});