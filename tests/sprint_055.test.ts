// =============================================================================
// SPRINT 055 VERIFICATION SUITE: Angular Normalization & Geodesic Advection
// =============================================================================

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  normalizeAngleRadians,
  HexagonalAdvectiveBearing,
  computeAdvectiveEdgeTransfer,
  computeGeodesicBearing,
  HexCellStocks,
  AdvectiveEdgeContext,
} from "../src/spatial/h3_adjacency.js";
import { SpatialMonad } from "../src/monads/spatial_monad.js";

describe("Sprint 055: normalizeAngleRadians Exhaustive Test Matrix", () => {
  // TC-ANG-001: 0.0 -> 0.0
  it("TC-ANG-001: Zero identity", () => {
    const result = normalizeAngleRadians(0.0);
    assert.strictEqual(result, 0.0);
    assert.strictEqual(Object.is(result, 0.0), true, "Must be positive zero (+0.0)");
  });

  // TC-ANG-002: Math.PI / 2 -> Math.PI / 2
  it("TC-ANG-002: Quarter circle positive", () => {
    const input = Math.PI / 2;
    const result = normalizeAngleRadians(input);
    assert.ok(Math.abs(result - input) < 1e-15, `Expected ${input}, got ${result}`);
  });

  // TC-ANG-003: -Math.PI / 2 -> -Math.PI / 2
  it("TC-ANG-003: Quarter circle negative", () => {
    const input = -Math.PI / 2;
    const result = normalizeAngleRadians(input);
    assert.ok(Math.abs(result - input) < 1e-15, `Expected ${input}, got ${result}`);
  });

  // TC-ANG-004: Math.PI -> -Math.PI
  it("TC-ANG-004: Upper boundary wraps to lower boundary", () => {
    const result = normalizeAngleRadians(Math.PI);
    assert.strictEqual(result, -Math.PI, `Expected -Math.PI, got ${result}`);
  });

  // TC-ANG-005: -Math.PI -> -Math.PI
  it("TC-ANG-005: Lower boundary identity", () => {
    const result = normalizeAngleRadians(-Math.PI);
    assert.strictEqual(result, -Math.PI, `Expected -Math.PI, got ${result}`);
  });

  // TC-ANG-006: 2 * Math.PI -> 0.0
  it("TC-ANG-006: Full circle wrap", () => {
    const result = normalizeAngleRadians(2 * Math.PI);
    assert.ok(Math.abs(result) < 1e-15, `Expected 0.0, got ${result}`);
  });

  // TC-ANG-007: -2 * Math.PI -> 0.0
  it("TC-ANG-007: Negative full circle wrap", () => {
    const result = normalizeAngleRadians(-2 * Math.PI);
    assert.ok(Math.abs(result) < 1e-15, `Expected 0.0, got ${result}`);
  });

  // TC-ANG-008: 3 * Math.PI -> -Math.PI
  it("TC-ANG-008: Multi-turn boundary wrap", () => {
    const result = normalizeAngleRadians(3 * Math.PI);
    assert.strictEqual(result, -Math.PI, `Expected -Math.PI, got ${result}`);
  });

  // TC-ANG-009: 3.5 * Math.PI -> -0.5 * Math.PI
  it("TC-ANG-009: Large positive angle", () => {
    const expected = -0.5 * Math.PI;
    const result = normalizeAngleRadians(3.5 * Math.PI);
    assert.ok(Math.abs(result - expected) < 1e-15, `Expected ${expected}, got ${result}`);
  });

  // TC-ANG-010: -5.25 * Math.PI -> 0.75 * Math.PI
  it("TC-ANG-010: Large negative angle", () => {
    const expected = 0.75 * Math.PI;
    const result = normalizeAngleRadians(-5.25 * Math.PI);
    assert.ok(Math.abs(result - expected) < 1e-15, `Expected ${expected}, got ${result}`);
  });

  // TC-ANG-011: 100 * Math.PI -> 0.0
  it("TC-ANG-011: Extreme positive multiple", () => {
    const result = normalizeAngleRadians(100 * Math.PI);
    assert.ok(Math.abs(result) < 1e-14, `Expected 0.0, got ${result}`);
  });

  // TC-ANG-012: -99 * Math.PI -> -Math.PI
  it("TC-ANG-012: Extreme negative odd multiple", () => {
    const result = normalizeAngleRadians(-99 * Math.PI);
    assert.ok(Math.abs(result - (-Math.PI)) < 1e-14, `Expected -Math.PI, got ${result}`);
  });

  // TC-ANG-013: NaN -> NaN
  it("TC-ANG-013: IEEE 754 NaN safety", () => {
    const result = normalizeAngleRadians(NaN);
    assert.ok(Number.isNaN(result), "Expected NaN");
  });

  // TC-ANG-014: Infinity -> Infinity
  it("TC-ANG-014: Positive infinity safety", () => {
    const result = normalizeAngleRadians(Infinity);
    assert.strictEqual(result, Infinity);
  });

  // TC-ANG-015: -Infinity -> -Infinity
  it("TC-ANG-015: Negative infinity safety", () => {
    const result = normalizeAngleRadians(-Infinity);
    assert.strictEqual(result, -Infinity);
  });
});

describe("Sprint 055: Algebraic & Range Invariants", () => {
  it("strictly satisfies range invariant: -π <= ψ(θ) < π for arbitrary samples", () => {
    for (let k = -20; k <= 20; k++) {
      const angle = k * 0.37 * Math.PI;
      const normalized = normalizeAngleRadians(angle);
      assert.ok(normalized >= -Math.PI, `Sample ${angle} normalized to ${normalized} < -π`);
      assert.ok(normalized < Math.PI, `Sample ${angle} normalized to ${normalized} >= π`);
    }
  });

  it("satisfies idempotence: ψ(ψ(θ)) = ψ(θ)", () => {
    const testValues = [0, 0.5, -0.5, 1.23, -2.99, -Math.PI, 3.14, 10.5, -42.8];
    for (const val of testValues) {
      const once = normalizeAngleRadians(val);
      const twice = normalizeAngleRadians(once);
      assert.ok(
        Math.abs(once - twice) < 1e-15,
        `Idempotence failed for ${val}: once=${once}, twice=${twice}`
      );
    }
  });

  it("satisfies 2π periodicity across multiple integer multiples", () => {
    const baseAngle = 0.42 * Math.PI;
    const expected = normalizeAngleRadians(baseAngle);
    for (let k = -10; k <= 10; k++) {
      const wrapped = normalizeAngleRadians(baseAngle + 2 * Math.PI * k);
      assert.ok(
        Math.abs(wrapped - expected) < 1e-14,
        `Periodicity failed for k=${k}: got ${wrapped}, expected ${expected}`
      );
    }
  });
});

describe("Sprint 055: HexagonalAdvectiveBearing Class Integration", () => {
  it("instantiates and calculates Cartesian components accurately", () => {
    const origin = "8828308281fffff";
    const target = "8828308283fffff";
    const bearing = new HexagonalAdvectiveBearing(origin, target, 2.5 * Math.PI, 10.0);

    assert.strictEqual(bearing.originCell, origin);
    assert.strictEqual(bearing.targetCell, target);
    assert.strictEqual(bearing.magnitude, 10.0);
    assert.strictEqual(bearing.bearing, 2.5 * Math.PI);

    const normalizedBearing = bearing.normalize();
    assert.ok(Math.abs(normalizedBearing.angleRadians - Math.PI / 2) < 1e-15);

    const cartesian = normalizedBearing.toCartesianComponents();
    assert.ok(Math.abs(cartesian.u - 0.0) < 1e-14, `Expected u ~ 0, got ${cartesian.u}`);
    assert.ok(Math.abs(cartesian.v - 10.0) < 1e-14, `Expected v ~ 10, got ${cartesian.v}`);
  });
});

describe("Sprint 055: Advective Stock Flux & Spatial Monad Conservation", () => {
  const initialStocks: HexCellStocks = {
    carbonKg: 1000,
    waterKg: 5000,
    mineralsKg: 200,
    oxygenKg: 800,
    energyJoules: 1e9,
  };

  const edgeContext: AdvectiveEdgeContext = {
    edgeLengthMeters: 1000,
    layerDepthMeters: 100,
    cellVolumeM3: 1e8,
    flowVelocityMs: 5.0,
    flowAngleRadians: 0.0,
    boundaryBearingRadians: 0.0, // Collinear flow along outward edge normal
    timeDeltaSeconds: 3600,
  };

  it("computes conservative stock transfers across hexagonal edge boundary", () => {
    const result = computeAdvectiveEdgeTransfer(initialStocks, edgeContext);
    assert.ok(result.effectiveNormalVelocityMs > 0);
    assert.ok(result.volumeTransferredM3 > 0);

    // Delta stocks must be strictly positive and proportional
    assert.ok(result.deltaStocks.carbonKg > 0);
    assert.ok(result.deltaStocks.waterKg > 0);
    assert.ok(result.deltaStocks.mineralsKg > 0);
    assert.ok(result.deltaStocks.oxygenKg > 0);
    assert.ok(result.deltaStocks.energyJoules > 0);
  });

  it("yields zero flux when flow is oriented opposite to boundary edge normal", () => {
    const opposingContext: AdvectiveEdgeContext = {
      ...edgeContext,
      flowAngleRadians: Math.PI, // Opposite direction (bearing 0, flow π)
    };
    const result = computeAdvectiveEdgeTransfer(initialStocks, opposingContext);
    assert.strictEqual(result.effectiveNormalVelocityMs, 0.0);
    assert.strictEqual(result.volumeTransferredM3, 0.0);
    assert.strictEqual(result.deltaStocks.carbonKg, 0.0);
  });

  it("monadic advection strictly conserves First Law mass and energy", () => {
    const sourceMonad = SpatialMonad.of("cell_A", initialStocks);
    const targetStocks: HexCellStocks = {
      carbonKg: 500,
      waterKg: 2000,
      mineralsKg: 100,
      oxygenKg: 400,
      energyJoules: 5e8,
    };
    const targetMonad = SpatialMonad.of("cell_B", targetStocks);

    const initialTotalCarbon = sourceMonad.stocks.carbonKg + targetMonad.stocks.carbonKg;
    const initialTotalEnergy = sourceMonad.stocks.energyJoules + targetMonad.stocks.energyJoules;

    const step = sourceMonad.advectTo(targetMonad, edgeContext);

    const finalTotalCarbon = step.source.stocks.carbonKg + step.target.stocks.carbonKg;
    const finalTotalEnergy = step.source.stocks.energyJoules + step.target.stocks.energyJoules;

    assert.ok(
      Math.abs(initialTotalCarbon - finalTotalCarbon) < 1e-9,
      "Carbon must be conserved"
    );
    assert.ok(
      Math.abs(initialTotalEnergy - finalTotalEnergy) < 1e-4,
      "Energy must be conserved"
    );
  });

  it("geodesic bearing calculation normalizes output within [-π, π)", () => {
    const origin = { lat: 0, lng: 0 };
    const target = { lat: 10, lng: 10 };
    const bearing = computeGeodesicBearing(origin, target);
    assert.ok(bearing >= -Math.PI && bearing < Math.PI);
  });
});