// =============================================================================
// TEST SUITE: SPRINT 057 - GEODESIC AZIMUTH VECTORIZATION & H3 ADJACENCY
// =============================================================================

import { describe, it } from "node:test";
import assert from "node:assert";

import {
  computeSphericalArcBearing,
  computeDetailedBearing,
  computeSphericalDistance,
  canonicalDeltaLongitude,
  computeAdvectiveTransfer,
  SphericalGeodesicCalculator,
  H3AdjacencyGraph,
  LatLngPoint,
  SpatialHexCell,
} from "../src/spatial/h3_adjacency.js";
import { WGS84_EARTH_RADIUS_METERS } from "../src/thermodynamics/constants.js";
import { SpatialMonad } from "../src/monads/spatial_monad.js";

const EPSILON = 1e-9;
const RAD2DEG = 180.0 / Math.PI;

describe("RFC-057 Geodesic Azimuth & Spherical Bearing Vectorization", () => {
  describe("1. Canonical Longitudinal Wrapping", () => {
    it("should handle normal longitudinal differences within [-pi, pi]", () => {
      const dLon = canonicalDeltaLongitude(0, 0.5);
      assert.strictEqual(Math.abs(dLon - 0.5) < EPSILON, true);
    });

    it("should wrap eastward antimeridian crossing (+179 deg to -179 deg)", () => {
      const lon1 = 179 * (Math.PI / 180);
      const lon2 = -179 * (Math.PI / 180);
      const dLon = canonicalDeltaLongitude(lon1, lon2);
      const expected = 2 * (Math.PI / 180);
      assert.strictEqual(Math.abs(dLon - expected) < EPSILON, true);
    });

    it("should wrap westward antimeridian crossing (-179 deg to +179 deg)", () => {
      const lon1 = -179 * (Math.PI / 180);
      const lon2 = 179 * (Math.PI / 180);
      const dLon = canonicalDeltaLongitude(lon1, lon2);
      const expected = -2 * (Math.PI / 180);
      assert.strictEqual(Math.abs(dLon - expected) < EPSILON, true);
    });
  });

  describe("2. Equatorial Orthogonal Traversal", () => {
    it("should yield 90.0 degrees (pi / 2 rad) moving due East along equator", () => {
      const p1: LatLngPoint = { lat: 0.0, lng: 0.0 };
      const p2: LatLngPoint = { lat: 0.0, lng: 10.0 };
      const bearingRad = computeSphericalArcBearing(p1, p2);
      const bearingDeg = bearingRad * RAD2DEG;

      assert.strictEqual(Math.abs(bearingRad - Math.PI / 2.0) < EPSILON, true);
      assert.strictEqual(Math.abs(bearingDeg - 90.0) < EPSILON, true);
    });

    it("should yield 270.0 degrees (3*pi / 2 rad) moving due West along equator", () => {
      const p1: LatLngPoint = { lat: 0.0, lng: 10.0 };
      const p2: LatLngPoint = { lat: 0.0, lng: 0.0 };
      const bearingRad = computeSphericalArcBearing(p1, p2);
      const bearingDeg = bearingRad * RAD2DEG;

      assert.strictEqual(Math.abs(bearingRad - 1.5 * Math.PI) < EPSILON, true);
      assert.strictEqual(Math.abs(bearingDeg - 270.0) < EPSILON, true);
    });
  });

  describe("3. Meridional Traversal", () => {
    it("should yield 0.0 degrees (0 rad) moving due North along prime meridian", () => {
      const p1: LatLngPoint = { lat: 0.0, lng: 0.0 };
      const p2: LatLngPoint = { lat: 45.0, lng: 0.0 };
      const bearingRad = computeSphericalArcBearing(p1, p2);
      const bearingDeg = bearingRad * RAD2DEG;

      assert.strictEqual(Math.abs(bearingRad - 0.0) < EPSILON, true);
      assert.strictEqual(Math.abs(bearingDeg - 0.0) < EPSILON, true);
    });

    it("should yield 180.0 degrees (pi rad) moving due South along prime meridian", () => {
      const p1: LatLngPoint = { lat: 45.0, lng: 0.0 };
      const p2: LatLngPoint = { lat: 0.0, lng: 0.0 };
      const bearingRad = computeSphericalArcBearing(p1, p2);
      const bearingDeg = bearingRad * RAD2DEG;

      assert.strictEqual(Math.abs(bearingRad - Math.PI) < EPSILON, true);
      assert.strictEqual(Math.abs(bearingDeg - 180.0) < EPSILON, true);
    });
  });

  describe("4. Antimeridian & Transpolar Geodesic Transits", () => {
    it("should yield 90.0 degrees crossing antimeridian eastbound (0, 179) -> (0, -179)", () => {
      const p1: LatLngPoint = { lat: 0.0, lng: 179.0 };
      const p2: LatLngPoint = { lat: 0.0, lng: -179.0 };
      const bearingRad = computeSphericalArcBearing(p1, p2);
      const bearingDeg = bearingRad * RAD2DEG;

      assert.strictEqual(Math.abs(bearingRad - Math.PI / 2.0) < EPSILON, true);
      assert.strictEqual(Math.abs(bearingDeg - 90.0) < EPSILON, true);
    });

    it("should yield 0.0 degrees crossing over the North Pole (80, 0) -> (80, 180)", () => {
      const p1: LatLngPoint = { lat: 80.0, lng: 0.0 };
      const p2: LatLngPoint = { lat: 80.0, lng: 180.0 };
      const bearingRad = computeSphericalArcBearing(p1, p2);
      const bearingDeg = bearingRad * RAD2DEG;

      assert.strictEqual(Math.abs(bearingRad - 0.0) < EPSILON, true);
      assert.strictEqual(Math.abs(bearingDeg - 0.0) < EPSILON, true);
    });
  });

  describe("5. Boundary & Singularity Guardrails", () => {
    it("should return 0.0 for coincident points", () => {
      const p: LatLngPoint = { lat: 35.6895, lng: 139.6917 };
      const bearingRad = computeSphericalArcBearing(p, p);
      assert.strictEqual(bearingRad, 0.0);
    });

    it("should return pi (180 deg) when origin is at North Pole", () => {
      const northPole: LatLngPoint = { lat: 90.0, lng: 0.0 };
      const paris: LatLngPoint = { lat: 48.8566, lng: 2.3522 };
      const bearingRad = computeSphericalArcBearing(northPole, paris);
      assert.strictEqual(bearingRad, Math.PI);
    });

    it("should return 0.0 (0 deg) when origin is at South Pole", () => {
      const southPole: LatLngPoint = { lat: -90.0, lng: 0.0 };
      const sydney: LatLngPoint = { lat: -33.8688, lng: 151.2093 };
      const bearingRad = computeSphericalArcBearing(southPole, sydney);
      assert.strictEqual(bearingRad, 0.0);
    });

    it("should return 0.0 when destination is at North Pole", () => {
      const london: LatLngPoint = { lat: 51.5074, lng: -0.1278 };
      const northPole: LatLngPoint = { lat: 90.0, lng: 0.0 };
      const bearingRad = computeSphericalArcBearing(london, northPole);
      assert.strictEqual(bearingRad, 0.0);
    });

    it("should return pi when destination is at South Pole", () => {
      const equator: LatLngPoint = { lat: 0.0, lng: 20.0 };
      const southPole: LatLngPoint = { lat: -90.0, lng: 0.0 };
      const bearingRad = computeSphericalArcBearing(equator, southPole);
      assert.strictEqual(bearingRad, Math.PI);
    });
  });

  describe("6. Detailed Bearing & Tangent Plane Unit Vector", () => {
    it("should calculate correct unit vector and distance along 45-degree bearing", () => {
      const p1: LatLngPoint = { lat: 0.0, lng: 0.0 };
      const p2: LatLngPoint = { lat: 10.0, lng: 10.0 };
      const result = computeDetailedBearing(p1, p2);

      // Tangent plane unit vector norm must equal 1.0
      const norm = Math.sqrt(
        result.unitVector.uEast ** 2 + result.unitVector.vNorth ** 2
      );
      assert.strictEqual(Math.abs(norm - 1.0) < EPSILON, true);

      // Both uEast and vNorth should be positive (Northeast quadrant)
      assert.strictEqual(result.unitVector.uEast > 0, true);
      assert.strictEqual(result.unitVector.vNorth > 0, true);
      assert.strictEqual(result.initialAzimuthDeg > 40 && result.initialAzimuthDeg < 50, true);
      assert.strictEqual(result.distanceMeters > 0, true);
    });

    it("should match static SphericalGeodesicCalculator methods", () => {
      const p1: LatLngPoint = { lat: 12.0, lng: 77.0 };
      const p2: LatLngPoint = { lat: 28.0, lng: 77.0 };

      const bearingStatic = SphericalGeodesicCalculator.computeSphericalArcBearing(p1, p2);
      const bearingFunc = computeSphericalArcBearing(p1, p2);
      assert.strictEqual(Math.abs(bearingStatic - bearingFunc) < EPSILON, true);

      const distStatic = SphericalGeodesicCalculator.computeGreatCircleDistance(p1, p2);
      const distFunc = computeSphericalDistance(p1, p2).distanceMeters;
      assert.strictEqual(Math.abs(distStatic - distFunc) < EPSILON, true);

      const vector = SphericalGeodesicCalculator.computeEdgeAzimuthVector(p1, p2);
      assert.strictEqual(Math.abs(vector.vNorth - 1.0) < EPSILON, true); // Due North
      assert.strictEqual(Math.abs(vector.uEast - 0.0) < EPSILON, true);
    });
  });

  describe("7. Directional Advective Transport & First Law Conservation", () => {
    function createMockCell(
      h3Index: string,
      lat: number,
      lng: number,
      carbonMol = 1000
    ): SpatialHexCell {
      return {
        h3Index,
        centroid: { lat, lng },
        areaM2: 1e8,
        stocks: {
          carbonMol,
          waterKg: 5000,
          mineralsKg: 200,
          oxygenMol: 800,
          internalEnergyJoules: 1e9,
        },
      };
    }

    it("should transport stock eastward with an Eastward wind vector", () => {
      const center = createMockCell("881f1d4881fffff", 0.0, 0.0);
      const eastNeighbor = createMockCell("881f1d4883fffff", 0.0, 0.1);
      const westNeighbor = createMockCell("881f1d4885fffff", 0.0, -0.1);

      const neighbors = [
        { cell: eastNeighbor, edgeLengthMeters: 10000 },
        { cell: westNeighbor, edgeLengthMeters: 10000 },
      ];

      // Wind blowing due East (uEast = 10 m/s, vNorth = 0 m/s)
      const wind = { uEast: 10.0, vNorth: 0.0 };
      const dtSeconds = 60.0;

      const transfers = computeAdvectiveTransfer(center, neighbors, wind, dtSeconds);

      const eastTransfer = transfers.get(eastNeighbor.h3Index)!;
      const westTransfer = transfers.get(westNeighbor.h3Index)!;

      // Transport should be directed Eastward only
      assert.strictEqual(eastTransfer.carbonMol > 0, true);
      assert.strictEqual(westTransfer.carbonMol, 0.0);
    });

    it("should enforce CFL stability condition and scale back transfers if sum(k) > 1", () => {
      const center = createMockCell("center", 0.0, 0.0, 1000);
      const north1 = createMockCell("north1", 0.1, 0.0);
      const north2 = createMockCell("north2", 0.1, 0.0);

      // Huge edge length & wind velocity that would exceed 100% of cell stock
      const neighbors = [
        { cell: north1, edgeLengthMeters: 1e7 },
        { cell: north2, edgeLengthMeters: 1e7 },
      ];

      const wind = { uEast: 0.0, vNorth: 100.0 }; // Massive northward gale
      const dtSeconds = 3600.0;

      const transfers = computeAdvectiveTransfer(center, neighbors, wind, dtSeconds);

      let totalCarbonTransferred = 0;
      for (const t of transfers.values()) {
        totalCarbonTransferred += t.carbonMol;
      }

      // Must never transfer more than source stock
      assert.strictEqual(totalCarbonTransferred < center.stocks.carbonMol, true);
      assert.strictEqual(totalCarbonTransferred > 0.99 * center.stocks.carbonMol, true);
    });

    it("should preserve mass across multi-cell H3AdjacencyGraph simulation step", () => {
      const graph = new H3AdjacencyGraph();

      const c0 = createMockCell("c0", 0.0, 0.0, 1000);
      const c1 = createMockCell("c1", 0.0, 0.05, 500);
      const c2 = createMockCell("c2", 0.05, 0.0, 500);
      const c3 = createMockCell("c3", 0.0, -0.05, 500);
      const c4 = createMockCell("c4", -0.05, 0.0, 500);

      graph.addCell(c0);
      graph.addCell(c1);
      graph.addCell(c2);
      graph.addCell(c3);
      graph.addCell(c4);

      // Bidirectional adjacency
      graph.addBidirectionalEdge("c0", "c1", 5000);
      graph.addBidirectionalEdge("c0", "c2", 5000);
      graph.addBidirectionalEdge("c0", "c3", 5000);
      graph.addBidirectionalEdge("c0", "c4", 5000);

      const windField = new Map([
        ["c0", { uEast: 5.0, vNorth: 5.0 }],
        ["c1", { uEast: 5.0, vNorth: 0.0 }],
        ["c2", { uEast: 0.0, vNorth: 5.0 }],
        ["c3", { uEast: 2.0, vNorth: 2.0 }],
        ["c4", { uEast: 1.0, vNorth: 1.0 }],
      ]);

      const initialTotalCarbon =
        c0.stocks.carbonMol +
        c1.stocks.carbonMol +
        c2.stocks.carbonMol +
        c3.stocks.carbonMol +
        c4.stocks.carbonMol;

      const result = graph.simulateAdvectiveStep(windField, 60);

      assert.strictEqual(result.massConserved, true);
      assert.strictEqual(result.totalTransfers > 0, true);

      const finalTotalCarbon =
        graph.getCell("c0")!.stocks.carbonMol +
        graph.getCell("c1")!.stocks.carbonMol +
        graph.getCell("c2")!.stocks.carbonMol +
        graph.getCell("c3")!.stocks.carbonMol +
        graph.getCell("c4")!.stocks.carbonMol;

      assert.strictEqual(Math.abs(finalTotalCarbon - initialTotalCarbon) < 1e-6, true);
    });
  });

  describe("8. SpatialMonad Composition & Thermodynamic Pipeline", () => {
    it("should correctly wrap, map, and enforce non-negative stock invariants", () => {
      const cell: SpatialHexCell = {
        h3Index: "cell-001",
        centroid: { lat: 10.0, lng: 20.0 },
        areaM2: 1e7,
        stocks: {
          carbonMol: 500,
          waterKg: 2000,
          mineralsKg: 100,
          oxygenMol: 400,
          internalEnergyJoules: 5e8,
        },
      };

      const monad = SpatialMonad.of(cell)
        .map((c) => {
          // Mutate stock with potential underflow
          c.stocks.carbonMol -= 600;
          return c;
        })
        .enforceThermodynamicInvariants();

      const unwrapped = monad.unwrap();
      assert.strictEqual(unwrapped.stocks.carbonMol, 0.0); // Clamped non-negative
      assert.strictEqual(unwrapped.stocks.waterKg, 2000);
    });

    it("should compute monadic advection to a neighbor", () => {
      const cellA: SpatialHexCell = {
        h3Index: "A",
        centroid: { lat: 0.0, lng: 0.0 },
        areaM2: 1e7,
        stocks: {
          carbonMol: 1000,
          waterKg: 1000,
          mineralsKg: 100,
          oxygenMol: 500,
          internalEnergyJoules: 1e8,
        },
      };

      const cellB: SpatialHexCell = {
        h3Index: "B",
        centroid: { lat: 0.0, lng: 0.05 },
        areaM2: 1e7,
        stocks: {
          carbonMol: 0,
          waterKg: 0,
          mineralsKg: 0,
          oxygenMol: 0,
          internalEnergyJoules: 0,
        },
      };

      const monadA = SpatialMonad.of(cellA);
      const transfer = monadA.computeAdvectionTo(
        cellB,
        5000,
        { uEast: 10.0, vNorth: 0.0 },
        60
      );

      assert.strictEqual(transfer.carbonMol > 0, true);
      assert.strictEqual(transfer.waterKg > 0, true);
    });
  });
});