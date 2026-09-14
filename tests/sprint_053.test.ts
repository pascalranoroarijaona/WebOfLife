// =============================================================================
// TEST SUITE: SPRINT 053 - GEODESIC LATITUDE BOUNDARY INVARIANTS
// =============================================================================

import { describe, it } from "node:test";
import assert from "node:assert";

import {
  assertValidLatitudeDegrees,
  calculateGeodesicDistance,
  calculateCoriolisParameter,
  calculateTOAInsolation,
  SpatialStateMonad,
  H3AdjacencyResolver,
  computePairwiseDiffusiveTransfer,
} from "../src/spatial/h3_adjacency.js";
import {
  createGeodesicCoordinate,
  degreesToRadians,
  syntheticH3Index,
} from "../src/spatial/h3_grid.js";
import {
  GeodesicCoordinate,
  CellThermodynamicState,
} from "../src/spatial/h3_types.js";
import {
  EARTH_ANGULAR_VELOCITY_RAD_S,
  SOLAR_CONSTANT_W_M2,
} from "../src/thermodynamics/constants.js";

describe("Sprint 053: assertValidLatitudeDegrees Physical Invariants", () => {
  it("TC-LAT-001: Accepts South Pole boundary (-90.0 deg)", () => {
    assert.doesNotThrow(() => {
      assertValidLatitudeDegrees(-90.0);
    });
  });

  it("TC-LAT-002: Accepts North Pole boundary (+90.0 deg)", () => {
    assert.doesNotThrow(() => {
      assertValidLatitudeDegrees(90.0);
    });
  });

  it("TC-LAT-003: Accepts Equator (0.0 deg)", () => {
    assert.doesNotThrow(() => {
      assertValidLatitudeDegrees(0.0);
    });
  });

  it("TC-LAT-004: Accepts Standard Mid-Latitudes (-45.0 deg, +45.0 deg)", () => {
    assert.doesNotThrow(() => {
      assertValidLatitudeDegrees(-45.0);
      assertValidLatitudeDegrees(45.0);
    });
  });

  it("TC-LAT-005: Accepts Tropics boundary lines (-23.44 deg, +23.44 deg)", () => {
    assert.doesNotThrow(() => {
      assertValidLatitudeDegrees(-23.44);
      assertValidLatitudeDegrees(23.44);
      assertValidLatitudeDegrees(-66.5);
      assertValidLatitudeDegrees(66.5);
    });
  });

  it("TC-LAT-006: Throws RangeError for northern boundary overflow (90.0000001 deg)", () => {
    assert.throws(
      () => {
        assertValidLatitudeDegrees(90.0000001);
      },
      (err: unknown) => {
        assert(err instanceof RangeError);
        assert(err.message.includes("Latitude out of physical geodesic range [-90, 90]"));
        return true;
      }
    );
  });

  it("TC-LAT-007: Throws RangeError for southern boundary overflow (-90.0000001 deg)", () => {
    assert.throws(
      () => {
        assertValidLatitudeDegrees(-90.0000001);
      },
      (err: unknown) => {
        assert(err instanceof RangeError);
        assert(err.message.includes("Latitude out of physical geodesic range [-90, 90]"));
        return true;
      }
    );
  });

  it("TC-LAT-008: Throws RangeError for out-of-band coordinate injections (180.0 deg, -180.0 deg)", () => {
    assert.throws(
      () => {
        assertValidLatitudeDegrees(180.0);
      },
      RangeError
    );

    assert.throws(
      () => {
        assertValidLatitudeDegrees(-180.0);
      },
      RangeError
    );
  });

  it("TC-LAT-009: Throws RangeError for NaN values", () => {
    assert.throws(
      () => {
        assertValidLatitudeDegrees(NaN);
      },
      RangeError
    );
  });

  it("TC-LAT-010: Throws RangeError for non-finite +/- Infinity", () => {
    assert.throws(
      () => {
        assertValidLatitudeDegrees(Infinity);
      },
      RangeError
    );

    assert.throws(
      () => {
        assertValidLatitudeDegrees(-Infinity);
      },
      RangeError
    );
  });

  it("TC-LAT-011: Monadic Solar Step rejects invalid latitude and aborts state mutation", () => {
    const initialState: CellThermodynamicState = {
      energyJoules: 1000.0,
      waterKg: 50.0,
      carbonKg: 20.0,
      oxygenKg: 10.0,
      mineralKg: 5.0,
    };

    // Valid initial instantiation
    const monad = SpatialStateMonad.of({
      coord: { latDeg: 45.0, lonDeg: 10.0 },
      state: initialState,
    });

    // Attempting to step solar insolation after assigning an unphysical latitude
    assert.throws(
      () => {
        monad.withCoordinate({ latDeg: 95.0, lonDeg: 10.0 });
      },
      RangeError
    );

    // Verify original monad state remains unmodified
    assert.strictEqual(monad.value.coord.latDeg, 45.0);
    assert.strictEqual(monad.value.state.energyJoules, 1000.0);

    // Attempt direct instantiation of unphysical monad
    assert.throws(
      () => {
        SpatialStateMonad.of({
          coord: { latDeg: -90.0001, lonDeg: 0.0 },
          state: initialState,
        });
      },
      RangeError
    );
  });
});

describe("Sprint 053: Subsystem Geodesic Integration Checks", () => {
  it("computes orthodromic distance across poles and verifies boundary guards", () => {
    const southPole: GeodesicCoordinate = { latDeg: -90.0, lonDeg: 0.0 };
    const northPole: GeodesicCoordinate = { latDeg: 90.0, lonDeg: 0.0 };

    const poleToPoleDistance = calculateGeodesicDistance(southPole, northPole);
    // Half circumference: pi * R = 3.14159265 * 6371000 ~ 20,015,087 m
    assert(Math.abs(poleToPoleDistance - Math.PI * 6371000) < 10.0);

    assert.throws(() => {
      calculateGeodesicDistance({ latDeg: -95.0, lonDeg: 0 }, northPole);
    }, RangeError);
  });

  it("verifies Coriolis frequency bounds [-2*Omega, 2*Omega]", () => {
    const fEquator = calculateCoriolisParameter(0.0);
    assert.strictEqual(fEquator, 0.0);

    const fNorthPole = calculateCoriolisParameter(90.0);
    assert.strictEqual(fNorthPole, 2.0 * EARTH_ANGULAR_VELOCITY_RAD_S);

    const fSouthPole = calculateCoriolisParameter(-90.0);
    assert.strictEqual(fSouthPole, -2.0 * EARTH_ANGULAR_VELOCITY_RAD_S);

    assert.throws(() => {
      calculateCoriolisParameter(91.0);
    }, RangeError);
  });

  it("calculates TOA solar insolation at noon for Equator and validates non-negativity", () => {
    // Equinox (declination = 0), solar noon (hour angle = 0)
    const insolationEquator = calculateTOAInsolation(0.0, 0.0, 0.0);
    assert.strictEqual(insolationEquator, SOLAR_CONSTANT_W_M2);

    // Midnight at equator (hour angle = pi)
    const insolationMidnight = calculateTOAInsolation(0.0, 0.0, Math.PI);
    assert.strictEqual(insolationMidnight, 0.0);

    assert.throws(() => {
      calculateTOAInsolation(90.1, 0.0, 0.0);
    }, RangeError);
  });

  it("ensures H3AdjacencyResolver guards latitude boundaries during vector construction", () => {
    const resolver = new H3AdjacencyResolver();
    const c1 = createGeodesicCoordinate(10.0, 20.0);
    const c2 = createGeodesicCoordinate(10.5, 20.5);

    const vec = resolver.createAdjacencyVector("c1", c1, "c2", c2);
    assert(vec.distanceMeters > 0);
    assert(vec.azimuthDegrees >= 0 && vec.azimuthDegrees <= 360);

    assert.throws(() => {
      resolver.createAdjacencyVector("c1", { latDeg: -90.5, lonDeg: 0 }, "c2", c2);
    }, RangeError);
  });

  it("maintains strict thermodynamic conservation during diffusive exchange", () => {
    const coordA = createGeodesicCoordinate(40.0, -75.0);
    const coordB = createGeodesicCoordinate(40.1, -75.0);

    const stateA: CellThermodynamicState = {
      energyJoules: 5e6,
      waterKg: 200.0,
      carbonKg: 50.0,
      oxygenKg: 20.0,
      mineralKg: 10.0,
    };

    const stateB: CellThermodynamicState = {
      energyJoules: 3e6,
      waterKg: 100.0,
      carbonKg: 50.0,
      oxygenKg: 20.0,
      mineralKg: 10.0,
    };

    const { exchangeAtoB, conserved } = computePairwiseDiffusiveTransfer(
      coordA,
      stateA,
      coordB,
      stateB,
      5000.0,
      0.01,
      0.005,
      60.0
    );

    assert.strictEqual(conserved, true);
    assert(exchangeAtoB.deltaEnergyJoules > 0);
    assert(exchangeAtoB.deltaWaterKg > 0);

    // Verify rejection if an unphysical latitude is passed
    assert.throws(() => {
      computePairwiseDiffusiveTransfer(
        { latDeg: -100.0, lonDeg: 0 },
        stateA,
        coordB,
        stateB,
        5000.0,
        0.01,
        0.005,
        60.0
      );
    }, RangeError);
  });

  it("checks synthetic H3 index and coordinate conversions with bounds validation", () => {
    const index = syntheticH3Index(7, 45.0, 10.0);
    assert(typeof index === "string" && index.startsWith("8700"));

    const rad = degreesToRadians({ latDeg: 90.0, lonDeg: 0.0 });
    assert.strictEqual(rad.phiRad, Math.PI / 2.0);

    assert.throws(() => {
      syntheticH3Index(7, 95.0, 10.0);
    }, RangeError);
  });
});