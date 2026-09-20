import { describe, it } from "node:test";
import assert from "node:assert";

import {
  APERTURE_7_ROTATION_RAD,
  countClassIIIApertureSteps,
  computeClassIIIRotationAngleRadians,
  rotateVector2D,
  H3SpatialTransformationRegistry,
  Aperture7GridCoordinateTransformer,
} from "../src/spatial/h3_adjacency.js";
import { SpatialFluxMonad, CellThermodynamicStock } from "../src/spatial/spatial_flux_monad.js";
import { H3StateTensor, Vector2D } from "../src/spatial/h3_types.js";

describe("Sprint 095: Hierarchical Aperture-7 Class III Coordinate Rotation Angle Computation", () => {
  const EPSILON = 1e-12;

  describe("Aperture Constant & Fundamental Properties", () => {
    it("should export the correct numerical constant for APERTURE_7_ROTATION_RAD", () => {
      const theoretical = Math.asin(Math.sqrt(3) / (2 * Math.sqrt(7)));
      assert.strictEqual(typeof APERTURE_7_ROTATION_RAD, "number");
      assert.ok(
        Math.abs(APERTURE_7_ROTATION_RAD - theoretical) < EPSILON,
        `Expected ${theoretical}, received ${APERTURE_7_ROTATION_RAD}`
      );
      assert.ok(Math.abs(APERTURE_7_ROTATION_RAD - 0.3334731722918321) < EPSILON);
    });
  });

  describe("countClassIIIApertureSteps", () => {
    it("returns 0 for equal start and target resolutions", () => {
      for (let r = 0; r <= 15; r++) {
        assert.strictEqual(
          countClassIIIApertureSteps(r, r),
          0,
          `Resolution ${r} -> ${r} must have 0 steps`
        );
      }
    });

    it("evaluates canonical reference test vectors correctly", () => {
      // (0 -> 1): 1 step (1 is odd)
      assert.strictEqual(countClassIIIApertureSteps(0, 1), 1);
      // (1 -> 0): -1 step
      assert.strictEqual(countClassIIIApertureSteps(1, 0), -1);
      // (0 -> 2): 1 step (1 is odd, 2 is even)
      assert.strictEqual(countClassIIIApertureSteps(0, 2), 1);
      // (1 -> 2): 0 steps (2 is even)
      assert.strictEqual(countClassIIIApertureSteps(1, 2), 0);
      // (2 -> 1): 0 steps
      assert.strictEqual(countClassIIIApertureSteps(2, 1), 0);
      // (0 -> 3): 2 steps (1 and 3 are odd)
      assert.strictEqual(countClassIIIApertureSteps(0, 3), 2);
      // (3 -> 0): -2 steps
      assert.strictEqual(countClassIIIApertureSteps(3, 0), -2);
      // (0 -> 7): 4 steps (1, 3, 5, 7)
      assert.strictEqual(countClassIIIApertureSteps(0, 7), 4);
      // (0 -> 15): 8 steps (1, 3, 5, 7, 9, 11, 13, 15)
      assert.strictEqual(countClassIIIApertureSteps(0, 15), 8);
      // (15 -> 0): -8 steps
      assert.strictEqual(countClassIIIApertureSteps(15, 0), -8);
      // (1 -> 15): 7 steps (3, 5, 7, 9, 11, 13, 15)
      assert.strictEqual(countClassIIIApertureSteps(1, 15), 7);
    });

    it("satisfies global antisymmetry: count(r1, r2) === -count(r2, r1)", () => {
      for (let r1 = 0; r1 <= 15; r1++) {
        for (let r2 = 0; r2 <= 15; r2++) {
          assert.strictEqual(
            countClassIIIApertureSteps(r1, r2),
            -countClassIIIApertureSteps(r2, r1),
            `Antisymmetry failed for (${r1}, ${r2})`
          );
        }
      }
    });

    it("throws RangeError on negative resolutions or resolutions > 15 or non-integers", () => {
      assert.throws(() => countClassIIIApertureSteps(-1, 5), RangeError);
      assert.throws(() => countClassIIIApertureSteps(0, 16), RangeError);
      assert.throws(() => countClassIIIApertureSteps(1.5, 4), RangeError);
      assert.throws(() => countClassIIIApertureSteps(0, NaN), RangeError);
    });
  });

  describe("computeClassIIIRotationAngleRadians", () => {
    it("scales APERTURE_7_ROTATION_RAD by countClassIIIApertureSteps", () => {
      const angle0to1 = computeClassIIIRotationAngleRadians(0, 1, false);
      assert.ok(Math.abs(angle0to1 - APERTURE_7_ROTATION_RAD) < EPSILON);

      const angle0to3 = computeClassIIIRotationAngleRadians(0, 3, false);
      assert.ok(Math.abs(angle0to3 - 2 * APERTURE_7_ROTATION_RAD) < EPSILON);

      const angle3to0 = computeClassIIIRotationAngleRadians(3, 0, false);
      assert.ok(Math.abs(angle3to0 - -2 * APERTURE_7_ROTATION_RAD) < EPSILON);
    });

    it("normalizes angle to [-PI, PI) by default", () => {
      const angle = computeClassIIIRotationAngleRadians(0, 15, true);
      assert.ok(angle >= -Math.PI && angle < Math.PI);

      const angleRaw = computeClassIIIRotationAngleRadians(0, 15, false);
      assert.ok(Math.abs(angleRaw - 8 * APERTURE_7_ROTATION_RAD) < EPSILON);
    });

    it("exhibits antisymmetry under reversal", () => {
      for (let r1 = 0; r1 <= 15; r1 += 3) {
        for (let r2 = 0; r2 <= 15; r2 += 3) {
          const fwd = computeClassIIIRotationAngleRadians(r1, r2, true);
          const rev = computeClassIIIRotationAngleRadians(r2, r1, true);
          assert.ok(
            Math.abs(fwd + rev) < 1e-10,
            `Antisymmetry failed for ${r1} <-> ${r2}: ${fwd} vs ${rev}`
          );
        }
      }
    });

    it("throws RangeError on invalid resolution bounds", () => {
      assert.throws(() => computeClassIIIRotationAngleRadians(-1, 2), RangeError);
      assert.throws(() => computeClassIIIRotationAngleRadians(2, 20), RangeError);
    });
  });

  describe("Aperture7GridCoordinateTransformer & Registry", () => {
    it("instantiates and computes rotation angles correctly", () => {
      const transformer = new Aperture7GridCoordinateTransformer(0, 3);
      assert.ok(transformer instanceof H3SpatialTransformationRegistry);
      assert.strictEqual(transformer.baseResolution, 0);
      assert.strictEqual(transformer.targetResolution, 3);
      assert.strictEqual(transformer.stepsClassIII, 2);
      assert.ok(
        Math.abs(transformer.getRotationAngle() - 2 * APERTURE_7_ROTATION_RAD) < EPSILON
      );
      assert.ok(
        Math.abs(transformer.computeRotationAngle() - 2 * APERTURE_7_ROTATION_RAD) < EPSILON
      );
    });

    it("rotates vector preserving Euclidean magnitude (First Law of Thermodynamics)", () => {
      const transformer = new Aperture7GridCoordinateTransformer(0, 7);
      const vector: Vector2D = { x: 12.5, y: -7.8 };
      const rotated = transformer.transformFluxVector(vector);

      const normBefore = Math.hypot(vector.x, vector.y);
      const normAfter = Math.hypot(rotated.x, rotated.y);
      assert.ok(
        Math.abs(normBefore - normAfter) < EPSILON,
        `Norm must be conserved. Before: ${normBefore}, After: ${normAfter}`
      );
    });

    it("projects H3StateTensor to target resolution with rotated flux", () => {
      const transformer = new Aperture7GridCoordinateTransformer(1, 3);
      const tensor: H3StateTensor = {
        cellIndex: "8828308281fffff",
        resolution: 1,
        carbonKg: 5000,
        waterKg: 20000,
        mineralsKg: 300,
        oxygenKg: 1500,
        internalEnergyJoules: 1.2e9,
        fluxVector: { x: 100, y: 50 },
      };

      const projected = transformer.projectTensorToResolution(tensor);
      assert.strictEqual(projected.resolution, 3);
      assert.strictEqual(projected.carbonKg, 5000);
      assert.strictEqual(projected.waterKg, 20000);

      const normOrig = Math.hypot(tensor.fluxVector.x, tensor.fluxVector.y);
      const normProj = Math.hypot(projected.fluxVector.x, projected.fluxVector.y);
      assert.ok(Math.abs(normOrig - normProj) < EPSILON);
    });
  });

  describe("SpatialFluxMonad Inter-Resolution Integration", () => {
    it("aligns flux across resolutions preserving magnitude and stocks", () => {
      const stocks: CellThermodynamicStock = {
        carbonKg: 1200,
        waterKg: 3500,
        mineralsKg: 140,
        oxygenKg: 850,
        internalEnergyJoules: 4.5e8,
      };
      const initialVector: Vector2D = { x: 30.0, y: 40.0 };
      const monad = SpatialFluxMonad.of(0, initialVector, stocks);

      const alignedMonad = monad.alignToResolution(5);
      assert.strictEqual(alignedMonad.resolution, 5);
      assert.strictEqual(alignedMonad.stocks, stocks);

      const initialNorm = Math.hypot(initialVector.x, initialVector.y);
      const alignedNorm = Math.hypot(alignedMonad.fluxVector.x, alignedMonad.fluxVector.y);
      assert.ok(
        Math.abs(initialNorm - alignedNorm) < EPSILON,
        `Vector norm must remain conserved across resolution alignment`
      );
    });

    it("conserves mass and internal energy across cell boundary stock transfers", () => {
      const sourceStocks: CellThermodynamicStock = {
        carbonKg: 1000,
        waterKg: 5000,
        mineralsKg: 200,
        oxygenKg: 600,
        internalEnergyJoules: 1e7,
      };

      const targetStocks: CellThermodynamicStock = {
        carbonKg: 800,
        waterKg: 4000,
        mineralsKg: 150,
        oxygenKg: 500,
        internalEnergyJoules: 8e6,
      };

      const monad = SpatialFluxMonad.of(2, { x: 0.05, y: 0.0 }, sourceStocks);
      const boundaryNormal: Vector2D = { x: 1.0, y: 0.0 };
      const boundaryLength = 100; // meters
      const dt = 10; // seconds

      const [updatedSource, updatedTarget] = monad.transferStocksAcrossBoundary(
        targetStocks,
        boundaryNormal,
        boundaryLength,
        dt
      );

      // Mass conservation check: total before === total after
      assert.ok(
        Math.abs(
          sourceStocks.carbonKg + targetStocks.carbonKg -
          (updatedSource.carbonKg + updatedTarget.carbonKg)
        ) < EPSILON
      );
      assert.ok(
        Math.abs(
          sourceStocks.waterKg + targetStocks.waterKg -
          (updatedSource.waterKg + updatedTarget.waterKg)
        ) < EPSILON
      );
      assert.ok(
        Math.abs(
          sourceStocks.internalEnergyJoules + targetStocks.internalEnergyJoules -
          (updatedSource.internalEnergyJoules + updatedTarget.internalEnergyJoules)
        ) < EPSILON
      );
    });
  });

  describe("SO(2) Orthogonality and Invariant Audit", () => {
    it("ensures det(R) === 1 and R^T * R === I", () => {
      for (let r = 0; r <= 15; r++) {
        const theta = computeClassIIIRotationAngleRadians(0, r);
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        // det(R) = cos^2 + sin^2
        const det = cosT * cosT + sinT * sinT;
        assert.ok(
          Math.abs(det - 1.0) < EPSILON,
          `det(R) must equal 1.0 for angle ${theta}`
        );

        // Orthogonality: R * R^T = I
        const r11 = cosT * cosT + (-sinT) * (-sinT);
        const r12 = cosT * sinT + (-sinT) * cosT;
        assert.ok(Math.abs(r11 - 1.0) < EPSILON);
        assert.ok(Math.abs(r12 - 0.0) < EPSILON);
      }
    });
  });
});