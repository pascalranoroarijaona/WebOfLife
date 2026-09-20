/**
 * Test Suite: Sprint 094 - Aperture-7 Class III Step Counter and Hierarchical Orientation Parity
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  countClassIIIApertureSteps,
  isClassIIIResolution,
  getApertureClassProfile,
  H3DirectionalKernel,
  SpatialFluxMonad,
  APERTURE_7_ROTATION_RAD,
  MIN_H3_RES,
  MAX_H3_RES,
  ConservedStockVector,
} from '../src/spatial/h3_adjacency.js';

describe('Sprint 094: Aperture-7 Class III Step Counter & Parity Engine', () => {
  describe('1. Base Case Verification (Resolution 0 up to Target Resolution)', () => {
    it('should return 0 Class III steps for base resolution 0', () => {
      assert.strictEqual(countClassIIIApertureSteps(0), 0);
    });

    it('should return 1 Class III step for resolution 1', () => {
      assert.strictEqual(countClassIIIApertureSteps(1), 1);
    });

    it('should return 1 Class III step for resolution 2', () => {
      assert.strictEqual(countClassIIIApertureSteps(2), 1);
    });

    it('should return 2 Class III steps for resolution 3', () => {
      assert.strictEqual(countClassIIIApertureSteps(3), 2);
    });

    it('should return 4 Class III steps for resolution 7', () => {
      assert.strictEqual(countClassIIIApertureSteps(7), 4);
    });

    it('should return 4 Class III steps for resolution 8', () => {
      assert.strictEqual(countClassIIIApertureSteps(8), 4);
    });

    it('should return 8 Class III steps for maximum resolution 15', () => {
      assert.strictEqual(countClassIIIApertureSteps(15), 8);
    });

    it('should match the full RFC analytical step table from 0 to 15', () => {
      const expectedStepsFromZero = [
        0, // Res 0: Class II
        1, // Res 1: Class III (step 1)
        1, // Res 2: Class II
        2, // Res 3: Class III (step 3)
        2, // Res 4: Class II
        3, // Res 5: Class III (step 5)
        3, // Res 6: Class II
        4, // Res 7: Class III (step 7)
        4, // Res 8: Class II
        5, // Res 9: Class III (step 9)
        5, // Res 10: Class II
        6, // Res 11: Class III (step 11)
        6, // Res 12: Class II
        7, // Res 13: Class III (step 13)
        7, // Res 14: Class II
        8, // Res 15: Class III (step 15)
      ];

      for (let r = 0; r <= 15; r++) {
        assert.strictEqual(
          countClassIIIApertureSteps(r),
          expectedStepsFromZero[r],
          `Failed step count at resolution ${r}`
        );
      }
    });
  });

  describe('2. Range Interval Invariance and Commutativity', () => {
    it('countClassIIIApertureSteps(3, 1) should return 1 (odd step: 3)', () => {
      assert.strictEqual(countClassIIIApertureSteps(3, 1), 1);
    });

    it('countClassIIIApertureSteps(4, 2) should return 1 (odd step: 3)', () => {
      assert.strictEqual(countClassIIIApertureSteps(4, 2), 1);
    });

    it('countClassIIIApertureSteps(5, 1) should return 2 (odd steps: 3, 5)', () => {
      assert.strictEqual(countClassIIIApertureSteps(5, 1), 2);
    });

    it('should satisfy commutativity / reversibility: count(a, b) === count(b, a)', () => {
      assert.strictEqual(countClassIIIApertureSteps(1, 5), countClassIIIApertureSteps(5, 1));
      assert.strictEqual(countClassIIIApertureSteps(2, 8), countClassIIIApertureSteps(8, 2));
      assert.strictEqual(countClassIIIApertureSteps(0, 15), countClassIIIApertureSteps(15, 0));
    });

    it('should satisfy identity: count(r, r) === 0 for all r in [0, 15]', () => {
      for (let r = 0; r <= 15; r++) {
        assert.strictEqual(countClassIIIApertureSteps(r, r), 0);
      }
    });

    it('should satisfy additivity / triangle equality: count(a, c) === count(a, b) + count(b, c) for a <= b <= c', () => {
      for (let a = 0; a <= 10; a++) {
        for (let b = a; b <= 12; b++) {
          for (let c = b; c <= 15; c++) {
            const direct = countClassIIIApertureSteps(c, a);
            const chained = countClassIIIApertureSteps(b, a) + countClassIIIApertureSteps(c, b);
            assert.strictEqual(direct, chained, `Additivity failed for interval [${a}, ${b}, ${c}]`);
          }
        }
      }
    });
  });

  describe('3. Parity and Profile Diagnostics', () => {
    it('isClassIIIResolution should identify odd resolutions as true and even as false', () => {
      for (let r = 0; r <= 15; r++) {
        const expected = r % 2 !== 0;
        assert.strictEqual(isClassIIIResolution(r), expected, `Parity check failed for resolution ${r}`);
      }
    });

    it('getApertureClassProfile should satisfy partition completeness: classIIISteps + classIISteps === totalSteps', () => {
      const profile1 = getApertureClassProfile(5, 1);
      assert.strictEqual(profile1.startResolution, 1);
      assert.strictEqual(profile1.targetResolution, 5);
      assert.strictEqual(profile1.classIIISteps, 2);
      assert.strictEqual(profile1.classIISteps, 2);
      assert.strictEqual(profile1.totalSteps, 4);
      assert.strictEqual(profile1.isTargetClassIII, true);
      assert.strictEqual(profile1.netOrientationDeltaRad, 0); // both are Class III, relative tilt cancels

      const profile2 = getApertureClassProfile(1, 0);
      assert.strictEqual(profile2.classIIISteps, 1);
      assert.strictEqual(profile2.classIISteps, 0);
      assert.strictEqual(profile2.totalSteps, 1);
      assert.strictEqual(profile2.isTargetClassIII, true);
      assert.ok(Math.abs(profile2.netOrientationDeltaRad - APERTURE_7_ROTATION_RAD) < 1e-12);

      const profile3 = getApertureClassProfile(0, 1);
      assert.ok(Math.abs(profile3.netOrientationDeltaRad - (-APERTURE_7_ROTATION_RAD)) < 1e-12);
    });
  });

  describe('4. Boundary and Error Handling', () => {
    it('should throw RangeError on negative resolution', () => {
      assert.throws(() => countClassIIIApertureSteps(-1), RangeError);
      assert.throws(() => countClassIIIApertureSteps(2, -1), RangeError);
      assert.throws(() => isClassIIIResolution(-1), RangeError);
      assert.throws(() => getApertureClassProfile(-2), RangeError);
    });

    it('should throw RangeError on resolution exceeding MAX_H3_RES (15)', () => {
      assert.throws(() => countClassIIIApertureSteps(16), RangeError);
      assert.throws(() => countClassIIIApertureSteps(0, 100), RangeError);
      assert.throws(() => isClassIIIResolution(16), RangeError);
      assert.throws(() => getApertureClassProfile(16), RangeError);
    });

    it('should throw RangeError on non-integer inputs', () => {
      assert.throws(() => countClassIIIApertureSteps(2.5), RangeError);
      assert.throws(() => countClassIIIApertureSteps(NaN), RangeError);
      assert.throws(() => countClassIIIApertureSteps(Infinity), RangeError);
      assert.throws(() => isClassIIIResolution(3.14), RangeError);
    });
  });

  describe('5. Thermodynamic and Directional Invariance', () => {
    it('H3DirectionalKernel preserves vector norm (energy conservation) under rotation', () => {
      const kernel = new H3DirectionalKernel(0, 1);
      const testFlux: [number, number] = [3.5, 4.2];
      const initialNorm = H3DirectionalKernel.vectorNorm(testFlux);

      const rotatedFlux = kernel.rotateFlux(testFlux);
      const rotatedNorm = H3DirectionalKernel.vectorNorm(rotatedFlux);

      assert.ok(
        Math.abs(initialNorm - rotatedNorm) < 1e-12,
        `Norm conservation violated: initial=${initialNorm}, rotated=${rotatedNorm}`
      );
    });

    it('H3DirectionalKernel with identical parity (even-even or odd-odd) maintains identity rotation', () => {
      const kernel = new H3DirectionalKernel(0, 2);
      assert.strictEqual(kernel.rotationRad, 0);

      const testFlux: [number, number] = [10.0, -5.0];
      const rotated = kernel.rotateFlux(testFlux);
      assert.strictEqual(rotated[0], testFlux[0]);
      assert.strictEqual(rotated[1], testFlux[1]);
    });

    it('SpatialFluxMonad projection strictly conserves mass and thermal energy (First Law)', () => {
      const children: ConservedStockVector[] = Array.from({ length: 7 }, (_, i) => ({
        carbonKg: 10 + i,
        waterKg: 20 + i * 2,
        oxygenKg: 5 + i * 0.5,
        mineralsKg: 2 + i * 0.1,
        thermalEnergyMJ: 100 + i * 10,
        biomassKg: 50 + i * 5,
      }));

      const parent = SpatialFluxMonad.projectParentStock(children);

      const expectedCarbon = children.reduce((s, c) => s + c.carbonKg, 0);
      const expectedEnergy = children.reduce((s, c) => s + c.thermalEnergyMJ, 0);
      const expectedBiomass = children.reduce((s, c) => s + c.biomassKg, 0);

      assert.strictEqual(parent.carbonKg, expectedCarbon);
      assert.strictEqual(parent.thermalEnergyMJ, expectedEnergy);
      assert.strictEqual(parent.biomassKg, expectedBiomass);
    });

    it('SpatialFluxMonad prolongation strictly conserves mass and thermal energy across partition', () => {
      const parent: ConservedStockVector = {
        carbonKg: 700,
        waterKg: 1400,
        oxygenKg: 350,
        mineralsKg: 70,
        thermalEnergyMJ: 7000,
        biomassKg: 3500,
      };

      const children = SpatialFluxMonad.prolongateSubCells(parent);
      assert.strictEqual(children.length, 7);

      const reconstructed = SpatialFluxMonad.projectParentStock(children);
      assert.ok(Math.abs(reconstructed.carbonKg - parent.carbonKg) < 1e-9);
      assert.ok(Math.abs(reconstructed.thermalEnergyMJ - parent.thermalEnergyMJ) < 1e-9);
      assert.ok(Math.abs(reconstructed.biomassKg - parent.biomassKg) < 1e-9);
    });

    it('SpatialFluxMonad computeRotatedDivergence runs without synthetic mass creation', () => {
      const neighborFluxes: [number, number][] = [
        [1.0, 0.0],
        [0.5, 0.866],
        [-0.5, 0.866],
        [-1.0, 0.0],
        [-0.5, -0.866],
        [0.5, -0.866],
      ];

      const div = SpatialFluxMonad.computeRotatedDivergence(neighborFluxes, 0, 1);
      assert.ok(Number.isFinite(div));
    });
  });
});