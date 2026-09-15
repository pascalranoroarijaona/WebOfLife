// =============================================================================
// SPRINT 073 TEST SUITE: SPHERICAL BOUNDARY TOPOLOGY & CONSERVATIVE FLUXES
// =============================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  assertBoundaryEndpointTolerance,
  computeSphericalAngularDistance,
  normalizeSphericalCoords,
  validateSharedEdgeTopologicalAlignment,
  BoundaryEndpointToleranceExceededError,
  DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD,
  HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD,
  EARTH_MEAN_RADIUS_METERS,
  H3AdjacencyGraph,
  SpatialFluxMonad,
} from '../src/spatial/h3_adjacency.js';

describe('Sprint 073: Spherical Angular Tolerance & Boundary Assertions', () => {
  describe('Coordinate Normalization', () => {
    it('normalizes radian coordinates within canonical bounds', () => {
      const [lat, lng] = normalizeSphericalCoords([0.5, -1.2], false);
      assert.strictEqual(lat, 0.5);
      assert.strictEqual(lng, -1.2);
    });

    it('clamps latitudes exceeding polar limits [-pi/2, pi/2]', () => {
      const [northClamped] = normalizeSphericalCoords([2.0, 0.0], false);
      assert.strictEqual(northClamped, Math.PI / 2);

      const [southClamped] = normalizeSphericalCoords([-2.5, 0.0], false);
      assert.strictEqual(southClamped, -Math.PI / 2);
    });

    it('wraps longitudes outside [-pi, pi] correctly', () => {
      const [, wrapped] = normalizeSphericalCoords([0.0, 3.0 * Math.PI], false);
      assert.ok(Math.abs(wrapped - (-Math.PI)) < 1e-12 || Math.abs(wrapped - Math.PI) < 1e-12);

      const [, wrappedDeg] = normalizeSphericalCoords([0.0, 370.0], true);
      const expectedRad = (10.0 * Math.PI) / 180.0;
      assert.ok(Math.abs(wrappedDeg - expectedRad) < 1e-12);
    });
  });

  describe('Central Angular Distance Computation', () => {
    it('returns exact zero for identical coordinates', () => {
      const dist = computeSphericalAngularDistance([0.123, 0.456], [0.123, 0.456], false);
      assert.strictEqual(dist, 0.0);
    });

    it('computes central angular distance accurately between known points', () => {
      // Quarter circle: equator (0, 0) to north pole (pi/2, 0) -> distance is pi/2
      const dist = computeSphericalAngularDistance([0.0, 0.0], [Math.PI / 2, 0.0], false);
      assert.ok(Math.abs(dist - Math.PI / 2) < 1e-12);
    });

    it('handles degree coordinates properly when useDegrees is true', () => {
      // 90 degrees along equator from (0, 0) to (0, 90) -> distance is pi/2
      const dist = computeSphericalAngularDistance([0.0, 0.0], [0.0, 90.0], true);
      assert.ok(Math.abs(dist - Math.PI / 2) < 1e-12);
    });

    it('evaluates polar singularities where longitude differences do not create distance', () => {
      // Points at 90 deg latitude with different longitudes represent the exact same North Pole
      const dist = computeSphericalAngularDistance([90.0, 0.0], [90.0, 120.0], true);
      assert.strictEqual(dist, 0.0);
    });

    it('handles antimeridian boundary correctly without spurious divergence', () => {
      // Two points right on either side of the antimeridian
      const p1: [number, number] = [0.0, 3.141592];
      const p2: [number, number] = [0.0, -3.141592];
      const dist = computeSphericalAngularDistance(p1, p2, false);
      // Small delta: 2 * (pi - 3.141592) approx 1.307e-6 rad
      assert.ok(dist > 1.2e-6 && dist < 1.4e-6);
    });
  });

  describe('assertBoundaryEndpointTolerance Invariant Assertions', () => {
    it('passes without error when coordinates match identically', () => {
      assert.doesNotThrow(() => {
        assertBoundaryEndpointTolerance([0.25, 1.15], [0.25, 1.15]);
      });
    });

    it('passes when jittered distance is strictly below tolerance', () => {
      const epsilon = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD; // 1.0e-6
      const p1: [number, number] = [0.0, 0.0];
      const p2: [number, number] = [0.5 * epsilon, 0.0];

      assert.doesNotThrow(() => {
        assertBoundaryEndpointTolerance(p1, p2, epsilon);
      });
    });

    it('throws BoundaryEndpointToleranceExceededError when distance breaches tolerance', () => {
      const epsilon = DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD; // 1.0e-6
      const p1: [number, number] = [0.0, 0.0];
      const p2: [number, number] = [1.05 * epsilon, 0.0];

      assert.throws(
        () => {
          assertBoundaryEndpointTolerance(p1, p2, epsilon, { context: 'Unit test boundary check' });
        },
        (err: any) => {
          assert.ok(err instanceof BoundaryEndpointToleranceExceededError);
          assert.strictEqual(err.name, 'BoundaryEndpointToleranceExceededError');
          assert.deepStrictEqual(err.endpointA, p1);
          assert.deepStrictEqual(err.endpointB, p2);
          assert.ok(err.angularDistanceRad > epsilon);
          assert.strictEqual(err.toleranceRad, epsilon);
          assert.ok(err.message.includes('Unit test boundary check'));
          return true;
        }
      );
    });

    it('supports configurable high-precision micro-tolerance (1.0e-9 rad)', () => {
      const p1: [number, number] = [0.1, 0.2];
      const p2: [number, number] = [0.1 + 5.0e-8, 0.2];

      // Passes under default 1.0e-6
      assert.doesNotThrow(() => {
        assertBoundaryEndpointTolerance(p1, p2, DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD);
      });

      // Breaches high-precision 1.0e-9
      assert.throws(
        () => {
          assertBoundaryEndpointTolerance(p1, p2, HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD);
        },
        BoundaryEndpointToleranceExceededError
      );
    });

    it('works correctly with degree coordinates and options flag', () => {
      // 45.000000 vs 45.000005 deg is ~8.7e-8 rad
      const p1: [number, number] = [45.0, 10.0];
      const p2: [number, number] = [45.000005, 10.0];

      assert.doesNotThrow(() => {
        assertBoundaryEndpointTolerance(p1, p2, DEFAULT_BOUNDARY_ANGULAR_TOLERANCE_RAD, {
          useDegrees: true,
        });
      });

      // With strict micro-tolerance in degrees
      assert.throws(
        () => {
          assertBoundaryEndpointTolerance(p1, p2, HIGH_PRECISION_BOUNDARY_ANGULAR_TOLERANCE_RAD, {
            useDegrees: true,
          });
        },
        BoundaryEndpointToleranceExceededError
      );
    });
  });

  describe('Shared Edge Topological Alignment', () => {
    it('validates properly reversed boundary edges between neighbor cells', () => {
      const edgeU: [[number, number], [number, number]] = [
        [0.1, 0.1],
        [0.2, 0.2],
      ];
      // Edge V is reversed orientation of Edge U: V[0] ~ U[1], V[1] ~ U[0]
      const edgeV: [[number, number], [number, number]] = [
        [0.2, 0.2],
        [0.1, 0.1],
      ];

      assert.doesNotThrow(() => {
        validateSharedEdgeTopologicalAlignment(edgeU, edgeV);
      });
    });

    it('fails when edges share same direction instead of reversed topological winding', () => {
      const edgeU: [[number, number], [number, number]] = [
        [0.1, 0.1],
        [0.2, 0.2],
      ];
      const edgeVNonReversed: [[number, number], [number, number]] = [
        [0.1, 0.1],
        [0.2, 0.2],
      ];

      assert.throws(
        () => {
          validateSharedEdgeTopologicalAlignment(edgeU, edgeVNonReversed);
        },
        BoundaryEndpointToleranceExceededError
      );
    });
  });

  describe('Adjacency Graph & Thermodynamic Conservation Integration', () => {
    it('registers verified shared boundary and computes physical arc metrics', () => {
      const graph = new H3AdjacencyGraph();
      const edgeU: [[number, number], [number, number]] = [
        [0.0, 0.0],
        [0.01, 0.0],
      ];
      const edgeV: [[number, number], [number, number]] = [
        [0.01, 0.0],
        [0.0, 0.0],
      ];

      const arc = graph.registerSharedBoundary('cell_1', 'cell_2', edgeU, edgeV);
      assert.strictEqual(arc.isTopologicallyClosed, true);
      assert.ok(arc.angularLengthRad > 0.0099 && arc.angularLengthRad < 0.0101);
      assert.ok(arc.lengthMeters > 0.0099 * EARTH_MEAN_RADIUS_METERS);
    });

    it('rejects porous shared boundaries violating endpoint tolerance during registration', () => {
      const graph = new H3AdjacencyGraph();
      const edgeU: [[number, number], [number, number]] = [
        [0.0, 0.0],
        [0.01, 0.0],
      ];
      // Dislocated endpoint by 0.001 rad (~6.37 km)
      const edgeVDislocated: [[number, number], [number, number]] = [
        [0.011, 0.0],
        [0.0, 0.0],
      ];

      assert.throws(
        () => {
          graph.registerSharedBoundary('cell_1', 'cell_2', edgeU, edgeVDislocated);
        },
        BoundaryEndpointToleranceExceededError
      );
    });

    it('enforces First Law of Thermodynamics across verified boundary interface', () => {
      const graph = new H3AdjacencyGraph();
      const edgeU: [[number, number], [number, number]] = [
        [0.0, 0.0],
        [0.005, 0.0],
      ];
      const edgeV: [[number, number], [number, number]] = [
        [0.005, 0.0],
        [0.0, 0.0],
      ];

      graph.registerSharedBoundary('cell_A', 'cell_B', edgeU, edgeV);

      const flux = graph.computeInterfaceTransport(
        'cell_A',
        'cell_B',
        0.5, // 0.5 m/s normal advection
        10.0, // 10 m layer height
        {
          carbonKgM3: 0.025,
          oxygenKgM3: 0.009,
          mineralsKgM3: 0.0015,
          temperatureKelvin: 295.15,
        },
        60.0 // 60s tick
      );

      assert.strictEqual(flux.firstLawConserved, true);
      assert.strictEqual(flux.waterMassDeltaKg.u + flux.waterMassDeltaKg.v, 0);
      assert.strictEqual(flux.carbonMassDeltaKg.u + flux.carbonMassDeltaKg.v, 0);
      assert.strictEqual(flux.oxygenMassDeltaKg.u + flux.oxygenMassDeltaKg.v, 0);
      assert.strictEqual(flux.mineralsMassDeltaKg.u + flux.mineralsMassDeltaKg.v, 0);
      assert.strictEqual(flux.thermalEnergyDeltaJoules.u + flux.thermalEnergyDeltaJoules.v, 0);

      // Verify conservation within SpatialFluxMonad
      const monad = new SpatialFluxMonad(graph);
      monad.initCellStock({
        cellId: 'cell_A',
        waterMassKg: 1.0e9,
        carbonMassKg: 2.5e7,
        oxygenMassKg: 9.0e6,
        mineralsMassKg: 1.5e6,
        thermalEnergyJoules: 1.2e15,
      });
      monad.initCellStock({
        cellId: 'cell_B',
        waterMassKg: 1.0e9,
        carbonMassKg: 2.5e7,
        oxygenMassKg: 9.0e6,
        mineralsMassKg: 1.5e6,
        thermalEnergyJoules: 1.2e15,
      });

      const initialTotalWater = monad.totalMassWater();
      const initialTotalEnergy = monad.totalThermalEnergy();

      monad.applyExchange(flux);

      const finalTotalWater = monad.totalMassWater();
      const finalTotalEnergy = monad.totalThermalEnergy();

      assert.ok(Math.abs(finalTotalWater - initialTotalWater) < 1e-4);
      assert.ok(Math.abs(finalTotalEnergy - initialTotalEnergy) < 1e-2);
    });
  });
});