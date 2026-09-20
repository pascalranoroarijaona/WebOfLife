// =============================================================================
// SPRINT 089 TEST SUITE: APERTURE-7 HEPTAGONAL COARSENING & H3 DIGIT INSPECTION
// =============================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  hasNonZeroApertureDigits,
  getApertureDigitAt,
  getFirstNonZeroApertureResolution,
  analyzeApertureStructure,
  inspectApertureState,
  calculateApertureHexagonalOffset,
  computeCoarseningDriftVector,
  coarsenHexagonalPatchFlux,
  buildH3Index,
  buildH3IndexString,
  getResolution,
  H3AdjacencyCoordinator,
} from '../src/spatial/h3_adjacency.js';

import {
  PatchThermodynamicStock,
  Vector3D,
} from '../src/spatial/h3_types.js';

describe('Sprint 089 — Aperture-7 Coarsening & Digit Inspection Predicates', () => {
  describe('hasNonZeroApertureDigits predicate', () => {
    it('TC-089-01: identifies pure center cell at resolution 0 as having no non-zero digits', () => {
      const res0 = buildH3Index(4, 0, []);
      assert.strictEqual(hasNonZeroApertureDigits(res0), false);
      assert.strictEqual(hasNonZeroApertureDigits(res0.toString(16)), false);
    });

    it('TC-089-02: identifies pure center cells at higher resolutions as zero-aperture', () => {
      const res3Center = buildH3Index(14, 3, [0, 0, 0]);
      assert.strictEqual(hasNonZeroApertureDigits(res3Center), false);

      const res7Center = buildH3Index(24, 7, [0, 0, 0, 0, 0, 0, 0]);
      assert.strictEqual(hasNonZeroApertureDigits(res7Center), false);
    });

    it('TC-089-03: detects non-zero aperture digits at single resolution', () => {
      const res1NonCenter = buildH3Index(4, 1, [2]);
      assert.strictEqual(hasNonZeroApertureDigits(res1NonCenter), true);

      const res3WithOneNonZero = buildH3Index(14, 3, [0, 0, 5]);
      assert.strictEqual(hasNonZeroApertureDigits(res3WithOneNonZero), true);
    });

    it('TC-089-04: respects resolution limit parameter if provided', () => {
      // Cell with digits [0, 0, 4]
      const cell = buildH3Index(14, 3, [0, 0, 4]);

      // Checked up to resolution 2, digits are [0, 0] -> no non-zero digits
      assert.strictEqual(hasNonZeroApertureDigits(cell, 2), false);

      // Checked up to resolution 3 -> detects 4
      assert.strictEqual(hasNonZeroApertureDigits(cell, 3), true);
    });
  });

  describe('getApertureDigitAt & getFirstNonZeroApertureResolution', () => {
    it('TC-089-05: extracts digit accurately at each resolution tier', () => {
      const cell = buildH3Index(38, 4, [1, 0, 6, 3]);
      assert.strictEqual(getApertureDigitAt(cell, 1), 1);
      assert.strictEqual(getApertureDigitAt(cell, 2), 0);
      assert.strictEqual(getApertureDigitAt(cell, 3), 6);
      assert.strictEqual(getApertureDigitAt(cell, 4), 3);
      assert.strictEqual(getApertureDigitAt(cell, 5), 0); // beyond cell resolution
    });

    it('TC-089-06: returns first non-zero resolution correctly', () => {
      const cellAllZero = buildH3Index(58, 4, [0, 0, 0, 0]);
      assert.strictEqual(getFirstNonZeroApertureResolution(cellAllZero), null);

      const cellLeading = buildH3Index(58, 4, [0, 3, 0, 1]);
      assert.strictEqual(getFirstNonZeroApertureResolution(cellLeading), 2);

      const cellFirst = buildH3Index(58, 4, [5, 0, 0, 0]);
      assert.strictEqual(getFirstNonZeroApertureResolution(cellFirst), 1);
    });
  });

  describe('analyzeApertureStructure & Telemetry Inspection', () => {
    it('TC-089-07: produces complete aperture analysis report', () => {
      const hexStr = buildH3IndexString(63, 3, [0, 2, 4]);
      const report = analyzeApertureStructure(hexStr);

      assert.strictEqual(report.resolution, 3);
      assert.strictEqual(report.hasNonZeroDigits, true);
      assert.strictEqual(report.firstNonZeroResolution, 2);
      assert.strictEqual(report.nonZeroDigitCount, 2);
      assert.deepStrictEqual(report.digitSequence, [0, 2, 4]);
    });

    it('TC-089-08: inspectApertureState returns valid thermodynamic inspection telemetry', () => {
      const cell = buildH3Index(72, 2, [0, 0]);
      const teleZero = inspectApertureState(cell);
      assert.strictEqual(teleZero.isNonZero, false);

      const cellNonZero = buildH3Index(72, 2, [0, 3]);
      const teleNonZero = inspectApertureState(cellNonZero);
      assert.strictEqual(teleNonZero.isNonZero, true);
    });
  });

  describe('calculateApertureHexagonalOffset & computeCoarseningDriftVector', () => {
    it('TC-089-09: returns zero vector for center aperture digit (digit 0)', () => {
      const centerCell = buildH3Index(83, 2, [0, 0]);
      const offset = calculateApertureHexagonalOffset(centerCell);
      assert.strictEqual(offset.x, 0);
      assert.strictEqual(offset.y, 0);
      assert.strictEqual(offset.z, 0);

      const drift = computeCoarseningDriftVector(centerCell, buildH3Index(83, 1, [0]));
      assert.strictEqual(drift.x, 0);
      assert.strictEqual(drift.y, 0);
    });

    it('TC-089-10: returns unit-norm directional offset for peripheral digits', () => {
      for (let digit = 1; digit <= 6; digit++) {
        const cell = buildH3Index(97, 1, [digit]);
        const offset = calculateApertureHexagonalOffset(cell);
        const mag = offset.magnitude();
        assert.ok(Math.abs(mag - 1.0) < 1e-12, `Magnitude for digit ${digit} must be 1.0, got ${mag}`);
      }
    });
  });

  describe('coarsenHexagonalPatchFlux Heptagonal Aggregation', () => {
    it('TC-089-11: aggregates thermodynamic stocks with strict First Law conservation', () => {
      const parentBc = 107;
      const parentIndex = buildH3Index(parentBc, 1, [0]);

      // 7 child cells of an aperture-7 cluster
      const children: Array<{ index: bigint; stock: PatchThermodynamicStock }> = [];

      for (let d = 0; d < 7; d++) {
        const childIdx = buildH3Index(parentBc, 2, [0, d]);
        children.push({
          index: childIdx,
          stock: {
            carbonMol: 100 + d * 10,
            waterKg: 1000 + d * 50,
            mineralsMol: 50 + d * 5,
            oxygenMol: 200 + d * 2,
            enthalpyJoules: 1e7 + d * 1e5,
            temperatureKelvin: 295.15,
          },
        });
      }

      const initialTotalEnthalpy = children.reduce((acc, c) => acc + c.stock.enthalpyJoules, 0);
      const initialTotalCarbon = children.reduce((acc, c) => acc + c.stock.carbonMol, 0);
      const initialTotalWater = children.reduce((acc, c) => acc + c.stock.waterKg, 0);

      const result = coarsenHexagonalPatchFlux(parentIndex, children, 1e-4);

      // Verify strict mass and energy conservation
      assert.strictEqual(result.parentStock.carbonMol, initialTotalCarbon);
      assert.strictEqual(result.parentStock.waterKg, initialTotalWater);
      assert.strictEqual(result.parentStock.enthalpyJoules, initialTotalEnthalpy);
      assert.strictEqual(result.conservationError, 0);

      // Verify Second Law: entropy generation from peripheral shear dissipation > 0
      assert.ok(result.totalEntropyGenerated > 0, `Expected entropy generation > 0, got ${result.totalEntropyGenerated}`);

      // Verify child stocks were depleted / transferred to parent
      for (const child of result.childStocks) {
        assert.strictEqual(child.carbonMol, 0);
        assert.strictEqual(child.waterKg, 0);
        assert.strictEqual(child.enthalpyJoules, 0);
      }
    });

    it('TC-089-12: H3AdjacencyCoordinator provides aperture inspection interface', () => {
      const coordinator = new H3AdjacencyCoordinator();
      const cell = buildH3Index(117, 2, [0, 3]);

      assert.strictEqual(coordinator.hasNonZeroApertureDigits(cell), true);
      assert.strictEqual(coordinator.getApertureDigit(cell, 2), 3);
      assert.strictEqual(coordinator.getFirstNonZeroApertureResolution(cell), 2);

      const analysis = coordinator.analyzeApertureStructure(cell);
      assert.strictEqual(analysis.hasNonZeroDigits, true);
      assert.strictEqual(analysis.firstNonZeroResolution, 2);

      const telemetry = coordinator.inspectApertureState(cell);
      assert.strictEqual(telemetry.isNonZero, true);

      const drift = coordinator.computeCoarseningDriftVector(cell, buildH3Index(117, 1, [0]));
      assert.ok(drift instanceof Vector3D);
    });
  });
});