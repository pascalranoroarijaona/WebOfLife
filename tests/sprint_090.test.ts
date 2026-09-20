// =============================================================================
// WEB OF LIFE - SPRINT 090 TEST SUITE: PURE PENTAGON RESOLUTION VERIFICATION
// =============================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  isPurePentagonResolutionIndex,
  isPentagonBaseCell,
  isPentagon,
  computePentagonBoundaryDelta,
  getPentagonNeighborDirections,
  APERTURE_ROTATION_RAD,
  APERTURE_ROTATION_DEG
} from '../src/spatial/h3_adjacency';

import {
  PENTAGON_BASE_CELLS,
  PentagonThermodynamicStocks
} from '../src/spatial/h3_types';

import {
  buildH3Index,
  getResolution,
  getBaseCell,
  isValidH3Index
} from '../src/spatial/h3_grid';

describe('Sprint 090 - Pure Pentagon Resolution Verification', () => {

  describe('1. Numeric Resolution Overload Invariants', () => {
    it('returns true for all Class II even resolutions (0, 2, 4, 6, 8, 10, 12, 14)', () => {
      const evenResolutions = [0, 2, 4, 6, 8, 10, 12, 14];
      for (const res of evenResolutions) {
        assert.strictEqual(
          isPurePentagonResolutionIndex(res),
          true,
          `Resolution ${res} should be recognized as a pure pentagon resolution`
        );
      }
    });

    it('returns false for all Class III odd resolutions (1, 3, 5, 7, 9, 11, 13, 15)', () => {
      const oddResolutions = [1, 3, 5, 7, 9, 11, 13, 15];
      for (const res of oddResolutions) {
        assert.strictEqual(
          isPurePentagonResolutionIndex(res),
          false,
          `Resolution ${res} has aperture rotation and must not be pure`
        );
      }
    });

    it('returns false for out-of-range, non-integer, or non-finite inputs', () => {
      assert.strictEqual(isPurePentagonResolutionIndex(-1), false);
      assert.strictEqual(isPurePentagonResolutionIndex(-2), false);
      assert.strictEqual(isPurePentagonResolutionIndex(16), false);
      assert.strictEqual(isPurePentagonResolutionIndex(100), false);
      assert.strictEqual(isPurePentagonResolutionIndex(2.5), false);
      assert.strictEqual(isPurePentagonResolutionIndex(0.001), false);
      assert.strictEqual(isPurePentagonResolutionIndex(Number.NaN), false);
      assert.strictEqual(isPurePentagonResolutionIndex(Number.POSITIVE_INFINITY), false);
    });
  });

  describe('2. Pentagon Cell Index Overload (Hex String & BigInt)', () => {
    it('returns true for all 12 pentagonal base cells at resolution 0', () => {
      for (const baseCell of PENTAGON_BASE_CELLS) {
        assert.strictEqual(isPentagonBaseCell(baseCell), true);
        const indexStr = buildH3Index(0, baseCell);
        assert.strictEqual(isPurePentagonResolutionIndex(indexStr), true);

        const indexBigInt = BigInt('0x' + indexStr);
        assert.strictEqual(isPurePentagonResolutionIndex(indexBigInt), true);
      }
    });

    it('returns false for resolution 1 pentagons due to Class III aperture rotation', () => {
      for (const baseCell of PENTAGON_BASE_CELLS) {
        const indexRes1 = buildH3Index(1, baseCell, [0]);
        assert.strictEqual(isPentagon(indexRes1), true);
        assert.strictEqual(isPurePentagonResolutionIndex(indexRes1), false);
      }
    });

    it('returns true for resolution 2 pentagons (Class II, center children)', () => {
      for (const baseCell of PENTAGON_BASE_CELLS) {
        const indexRes2 = buildH3Index(2, baseCell, [0, 0]);
        assert.strictEqual(isPentagon(indexRes2), true);
        assert.strictEqual(isPurePentagonResolutionIndex(indexRes2), true);
      }
    });

    it('returns false for resolution 3 pentagons and true for resolution 4 pentagons', () => {
      const pent3 = buildH3Index(3, 4, [0, 0, 0]);
      assert.strictEqual(isPentagon(pent3), true);
      assert.strictEqual(isPurePentagonResolutionIndex(pent3), false);

      const pent4 = buildH3Index(4, 4, [0, 0, 0, 0]);
      assert.strictEqual(isPentagon(pent4), true);
      assert.strictEqual(isPurePentagonResolutionIndex(pent4), true);
    });

    it('validates higher even and odd resolutions up to resolution 14 and 15', () => {
      const pent14 = buildH3Index(14, 14, new Array(14).fill(0));
      assert.strictEqual(isPentagon(pent14), true);
      assert.strictEqual(isPurePentagonResolutionIndex(pent14), true);

      const pent15 = buildH3Index(15, 14, new Array(15).fill(0));
      assert.strictEqual(isPentagon(pent15), true);
      assert.strictEqual(isPurePentagonResolutionIndex(pent15), false);
    });

    it('respects the optional resolution parameter override', () => {
      const pent2 = buildH3Index(2, 4, [0, 0]);
      assert.strictEqual(isPurePentagonResolutionIndex(pent2, 2), true);
      assert.strictEqual(isPurePentagonResolutionIndex(pent2, 1), false);
      assert.strictEqual(isPurePentagonResolutionIndex(pent2, 3), false);
      assert.strictEqual(isPurePentagonResolutionIndex(pent2, 4), true);
    });
  });

  describe('3. Hexagonal Cell and Descendant Invariants', () => {
    it('returns false for hexagonal base cells at resolution 0', () => {
      const hexagonalBaseCells = [0, 1, 2, 3, 5, 10, 20, 50, 100, 121];
      for (const base of hexagonalBaseCells) {
        assert.strictEqual(isPentagonBaseCell(base), false);
        const hexIndex = buildH3Index(0, base);
        assert.strictEqual(isPurePentagonResolutionIndex(hexIndex), false);
      }
    });

    it('returns false for hexagonal cells at even resolutions', () => {
      const hex2 = buildH3Index(2, 0, [0, 0]);
      assert.strictEqual(isPurePentagonResolutionIndex(hex2), false);

      const hex4 = buildH3Index(4, 5, [0, 0, 0, 0]);
      assert.strictEqual(isPurePentagonResolutionIndex(hex4), false);
    });

    it('returns false for descendants of pentagonal base cells that contain non-zero digits', () => {
      // Non-zero child digits convert the descendant into a hexagon
      const nonCenterDigit1 = buildH3Index(2, 4, [1, 0]);
      assert.strictEqual(isPentagon(nonCenterDigit1), false);
      assert.strictEqual(isPurePentagonResolutionIndex(nonCenterDigit1), false);

      const nonCenterDigit2 = buildH3Index(2, 4, [0, 2]);
      assert.strictEqual(isPentagon(nonCenterDigit2), false);
      assert.strictEqual(isPurePentagonResolutionIndex(nonCenterDigit2), false);

      const nonCenterDigit4 = buildH3Index(4, 24, [0, 0, 3, 0]);
      assert.strictEqual(isPentagon(nonCenterDigit4), false);
      assert.strictEqual(isPurePentagonResolutionIndex(nonCenterDigit4), false);
    });

    it('returns false for malformed or non-H3 strings', () => {
      assert.strictEqual(isPurePentagonResolutionIndex(''), false);
      assert.strictEqual(isPurePentagonResolutionIndex('invalid-hex'), false);
      assert.strictEqual(isPurePentagonResolutionIndex('0000000000000000'), false);
    });
  });

  describe('4. Directional Adjacency and Neighbor Topological Properties', () => {
    it('returns the 5 valid neighbor directions for a pentagon', () => {
      const pentCell = buildH3Index(0, 4);
      const directions = getPentagonNeighborDirections(pentCell);
      assert.strictEqual(directions.length, 5);
      assert.deepStrictEqual(directions, [2, 3, 4, 5, 6]);
    });

    it('throws when requesting pentagon neighbor directions on a hexagonal cell', () => {
      const hexCell = buildH3Index(0, 0);
      assert.throws(() => {
        getPentagonNeighborDirections(hexCell);
      }, /not a valid pentagon/);
    });

    it('verifies mathematical constants for Aperture-7 rotation', () => {
      const computedRad = Math.asin(Math.sqrt(3) / (2 * Math.sqrt(7)));
      assert.ok(Math.abs(computedRad - APERTURE_ROTATION_RAD) < 1e-10);

      const computedDeg = (computedRad * 180) / Math.PI;
      assert.ok(Math.abs(computedDeg - APERTURE_ROTATION_DEG) < 1e-7);
    });
  });

  describe('5. Thermodynamic First Law Conservation & Boundary Delta Formulation', () => {
    const sourceStocks: PentagonThermodynamicStocks = {
      carbonDioxideKg: 1000,
      waterVaporKg: 500,
      dustKg: 50,
      oxygenKg: 2000,
      enthalpyJoules: 1e8
    };

    const neighborStocks: PentagonThermodynamicStocks = {
      carbonDioxideKg: 800,
      waterVaporKg: 600,
      dustKg: 40,
      oxygenKg: 2100,
      enthalpyJoules: 0.95e8
    };

    it('strictly satisfies First Law mass and enthalpy conservation across boundary', () => {
      const purePentagon = buildH3Index(2, 4, [0, 0]);
      const neighbor = buildH3Index(2, 4, [1, 0]);

      const deltas = computePentagonBoundaryDelta(
        purePentagon,
        neighbor,
        sourceStocks,
        neighborStocks,
        1000, // 1000 meters face length
        2000, // 2000 meters centroid distance
        5.0,  // 5 m/s advection normal
        0.01, // diffusion coefficient
        60    // 60 seconds
      );

      // Verify zero net accumulation across interface (error < 1e-14)
      assert.ok(Math.abs(deltas.sourceDelta.dCO2 + deltas.neighborDelta.dCO2) < 1e-14);
      assert.ok(Math.abs(deltas.sourceDelta.dH2O + deltas.neighborDelta.dH2O) < 1e-14);
      assert.ok(Math.abs(deltas.sourceDelta.dDust + deltas.neighborDelta.dDust) < 1e-14);
      assert.ok(Math.abs(deltas.sourceDelta.dO2 + deltas.neighborDelta.dO2) < 1e-14);
      assert.ok(Math.abs(deltas.sourceDelta.dEnthalpy + deltas.neighborDelta.dEnthalpy) < 1e-14);
    });

    it('bypasses aperture rotation for pure pentagons and applies rotation for Class III pentagons', () => {
      const purePentagon = buildH3Index(2, 4, [0, 0]); // res 2: Class II pure
      const oddPentagon = buildH3Index(1, 4, [0]);     // res 1: Class III rotated
      const neighbor = buildH3Index(2, 4, [1, 0]);

      const pureDeltas = computePentagonBoundaryDelta(
        purePentagon,
        neighbor,
        sourceStocks,
        neighborStocks,
        1000,
        2000,
        10.0,
        0.0, // purely advective to isolate Vn
        1
      );

      const oddDeltas = computePentagonBoundaryDelta(
        oddPentagon,
        neighbor,
        sourceStocks,
        neighborStocks,
        1000,
        2000,
        10.0,
        0.0,
        1
      );

      // Ratio of advective fluxes between odd (Class III) and even (Class II)
      // must equal cos(APERTURE_ROTATION_RAD)
      const expectedRatio = Math.cos(APERTURE_ROTATION_RAD);
      const actualRatio = Math.abs(oddDeltas.sourceDelta.dCO2) / Math.abs(pureDeltas.sourceDelta.dCO2);

      assert.ok(
        Math.abs(actualRatio - expectedRatio) < 1e-10,
        `Expected ratio ${expectedRatio}, got ${actualRatio}`
      );
    });
  });

});