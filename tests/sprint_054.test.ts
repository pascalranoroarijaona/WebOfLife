import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  normalizeLongitudeDegrees,
  stepAdvectiveCoordinate,
  H3AdjacencyService,
  SpatialCoordinateState,
} from '../src/spatial/h3_adjacency.js';

describe('Sprint 054: RFC-054 Longitude Boundary Wrapping & Normalization', () => {
  describe('1. Exact Boundary & Edge Case Matrix Compliance', () => {
    it('should map 0.0 to 0.0', () => {
      const result = normalizeLongitudeDegrees(0.0);
      assert.strictEqual(result, 0.0);
      assert.strictEqual(Object.is(result, 0), true);
    });

    it('should sanitize negative zero (-0.0) to positive canonical zero (+0.0)', () => {
      const result = normalizeLongitudeDegrees(-0.0);
      assert.strictEqual(result, 0);
      assert.strictEqual(Object.is(result, 0), true);
      assert.strictEqual(Object.is(result, -0), false);
    });

    it('should enforce exact half-open upper boundary mapping: +180.0 -> -180.0', () => {
      const result = normalizeLongitudeDegrees(180.0);
      assert.strictEqual(result, -180.0);
    });

    it('should preserve exact half-open lower boundary invariant: -180.0 -> -180.0', () => {
      const result = normalizeLongitudeDegrees(-180.0);
      assert.strictEqual(result, -180.0);
    });

    it('should correctly wrap 540.0 and -540.0 to -180.0', () => {
      assert.strictEqual(normalizeLongitudeDegrees(540.0), -180.0);
      assert.strictEqual(normalizeLongitudeDegrees(-540.0), -180.0);
    });

    it('should correctly wrap adjacent antimeridian coordinates 181.0 and -181.0', () => {
      assert.strictEqual(normalizeLongitudeDegrees(181.0), -179.0);
      assert.strictEqual(normalizeLongitudeDegrees(-181.0), 179.0);
    });

    it('should normalize complete revolutions (360.0, -360.0, 720.0) to 0.0', () => {
      assert.strictEqual(normalizeLongitudeDegrees(360.0), 0.0);
      assert.strictEqual(normalizeLongitudeDegrees(-360.0), 0.0);
      assert.strictEqual(normalizeLongitudeDegrees(720.0), 0.0);
      assert.strictEqual(Object.is(normalizeLongitudeDegrees(360.0), 0), true);
      assert.strictEqual(Object.is(normalizeLongitudeDegrees(-360.0), 0), true);
    });

    it('should maintain micro-arcsecond coordinates just inside boundaries', () => {
      const nearMax = 179.999999;
      const nearMin = -179.999999;
      assert.strictEqual(normalizeLongitudeDegrees(nearMax), nearMax);
      assert.strictEqual(normalizeLongitudeDegrees(nearMin), nearMin);
    });

    it('should handle fractional boundary wrap just beyond +180 and -180', () => {
      const resPos = normalizeLongitudeDegrees(180.000001);
      assert.ok(Math.abs(resPos - -179.999999) < 1e-9);

      const resNeg = normalizeLongitudeDegrees(-180.000001);
      assert.ok(Math.abs(resNeg - 179.999999) < 1e-9);
    });

    it('should return NaN for non-finite inputs', () => {
      assert.ok(Number.isNaN(normalizeLongitudeDegrees(Infinity)));
      assert.ok(Number.isNaN(normalizeLongitudeDegrees(-Infinity)));
      assert.ok(Number.isNaN(normalizeLongitudeDegrees(NaN)));
    });
  });

  describe('2. Multi-turn Periodicity & Translation Invariance', () => {
    it('should satisfy normalizeLongitudeDegrees(lon + 360 * k) == normalizeLongitudeDegrees(lon)', () => {
      const testAngles = [-179.5, -90, -45.123, 0, 12.345, 90, 179.876];
      const kFactors = [-10, -5, -2, -1, 1, 2, 5, 10];

      for (const lon of testAngles) {
        const canonical = normalizeLongitudeDegrees(lon);
        for (const k of kFactors) {
          const shifted = lon + 360 * k;
          const result = normalizeLongitudeDegrees(shifted);
          assert.ok(
            Math.abs(result - canonical) < 1e-9,
            `Failed for lon=${lon}, k=${k}: got ${result}, expected ${canonical}`
          );
        }
      }
    });

    it('should handle large multi-turn angles (+3600 deg, -3600 deg, 1080 deg)', () => {
      assert.strictEqual(normalizeLongitudeDegrees(3600.0), 0.0);
      assert.strictEqual(normalizeLongitudeDegrees(-3600.0), 0.0);
      assert.strictEqual(normalizeLongitudeDegrees(1080.0), 0.0);
      assert.strictEqual(normalizeLongitudeDegrees(1080.0 + 45.5), 45.5);
    });
  });

  describe('3. Strict Range Invariant: [-180, 180)', () => {
    it('should guarantee every output falls strictly in [-180, 180) across random spectrum', () => {
      for (let i = 0; i < 1000; i++) {
        const randLon = (Math.random() - 0.5) * 20000;
        const norm = normalizeLongitudeDegrees(randLon);
        assert.ok(
          norm >= -180.0 && norm < 180.0,
          `Violation for ${randLon} -> ${norm}`
        );
      }
    });
  });

  describe('4. Thermodynamic Conservation During Antimeridian Advection', () => {
    it('should conserve mass and energy stocks across antimeridian crossing', () => {
      const initial: SpatialCoordinateState = {
        latitudeDeg: 15.0,
        longitudeDeg: 179.5,
        massKg: {
          carbon: 10500.5,
          water: 84300.2,
          minerals: 2300.1,
          oxygen: 45000.0,
        },
        energyJoules: 3.5e12,
      };

      // Zonal velocity advects coordinate eastward across the antimeridian (+1.0 deg total)
      const zonalVel = 0.1; // deg/sec
      const deltaSec = 10;  // 10 sec -> +1.0 deg shift -> raw 180.5 -> normalized -179.5
      const { nextState, flux } = stepAdvectiveCoordinate(initial, zonalVel, deltaSec);

      assert.strictEqual(nextState.longitudeDeg, -179.5);
      assert.strictEqual(nextState.latitudeDeg, 15.0);

      // Mass conservation check (First Law)
      assert.strictEqual(nextState.massKg.carbon, initial.massKg.carbon);
      assert.strictEqual(nextState.massKg.water, initial.massKg.water);
      assert.strictEqual(nextState.massKg.minerals, initial.massKg.minerals);
      assert.strictEqual(nextState.massKg.oxygen, initial.massKg.oxygen);

      const totalMassBefore = (Object.values(initial.massKg) as number[]).reduce((a: number, b: number) => a + Number(b), 0);
      const totalMassAfter = (Object.values(nextState.massKg) as number[]).reduce((a: number, b: number) => a + Number(b), 0);
      assert.strictEqual(totalMassBefore, totalMassAfter);

      // Energy conservation check
      assert.strictEqual(nextState.energyJoules, initial.energyJoules);
      assert.strictEqual(flux.deltaEnergyJoules, 0);
    });

    it('should conserve stocks when stepping westward across the antimeridian', () => {
      const initial: SpatialCoordinateState = {
        latitudeDeg: -40.0,
        longitudeDeg: -179.8,
        massKg: { carbon: 100, water: 200, minerals: 300, oxygen: 400 },
        energyJoules: 1.0e9,
      };

      // Move west by 0.5 deg -> raw -180.3 -> normalized 179.7
      const { nextState } = stepAdvectiveCoordinate(initial, -0.05, 10);
      assert.ok(Math.abs(nextState.longitudeDeg - 179.7) < 1e-9);
      assert.strictEqual(nextState.energyJoules, initial.energyJoules);
    });
  });

  describe('5. H3AdjacencyService Integration', () => {
    const service = new H3AdjacencyService();

    it('should compute geodesic step with boundary wrapping', () => {
      const base = { latitude: 10.0, longitude: 179.0 };
      const delta = { x: 2.5, y: 5.0 }; // x moves past +180
      const next = service.computeGeodesicStep(base, delta);

      assert.strictEqual(next.latitude, 15.0);
      assert.strictEqual(next.longitude, -178.5);
    });

    it('should clamp latitude to [-90, 90] during geodesic step', () => {
      const base = { latitude: 85.0, longitude: 0.0 };
      const delta = { x: 10.0, y: 15.0 };
      const next = service.computeGeodesicStep(base, delta);

      assert.strictEqual(next.latitude, 90.0);
      assert.strictEqual(next.longitude, 10.0);
    });

    it('should produce 6 directional neighbors for discrete cells', () => {
      const neighbors = service.getNeighbors('8828308281fffff');
      assert.strictEqual(neighbors.length, 6);
      assert.strictEqual(neighbors[0], '8828308281fffff_d0');
      assert.strictEqual(neighbors[5], '8828308281fffff_d5');
    });

    it('should validate canonical longitude range with isCanonicalLongitude', () => {
      assert.strictEqual(service.isCanonicalLongitude(-180.0), true);
      assert.strictEqual(service.isCanonicalLongitude(179.9999), true);
      assert.strictEqual(service.isCanonicalLongitude(0.0), true);
      assert.strictEqual(service.isCanonicalLongitude(180.0), false);
      assert.strictEqual(service.isCanonicalLongitude(-180.0001), false);
      assert.strictEqual(service.isCanonicalLongitude(NaN), false);
    });
  });
});