// =============================================================================
// SPRINT 065 TEST SUITE: 3D BOUNDARY CENTROID DISPLACEMENT VECTOR
// =============================================================================

import { describe, it } from "node:test";
import assert from "node:assert";

import {
  computeBoundaryCentroidDisplacement3D,
  computeDetailedCentroidDisplacement3D,
  executeAdvectiveBoundaryTransfer,
  H3AdjacencyManager,
  dotProduct3D,
  vectorNorm3D,
} from "../src/spatial/h3_adjacency.js";

import { SphericalCoordinates } from "../src/spatial/h3_types.js";

describe("Sprint 065 - computeBoundaryCentroidDisplacement3D", () => {
  const TOLERANCE = 1e-10;

  it("TC-01: Equator Eastward 90 degrees displacement", () => {
    const origin: SphericalCoordinates = { lat: 0.0, lng: 0.0 };
    const target: SphericalCoordinates = { lat: 0.0, lng: 90.0 };

    const u = computeBoundaryCentroidDisplacement3D(origin, target);
    const detailed = computeDetailedCentroidDisplacement3D(origin, target);

    // Expected displacement vector: [-1/sqrt(2), 1/sqrt(2), 0]
    const expectedVal = 1.0 / Math.sqrt(2.0);
    assert.ok(Math.abs(u.x - -expectedVal) < TOLERANCE, `u.x (${u.x}) should be approx -${expectedVal}`);
    assert.ok(Math.abs(u.y - expectedVal) < TOLERANCE, `u.y (${u.y}) should be approx ${expectedVal}`);
    assert.ok(Math.abs(u.z - 0.0) < TOLERANCE, `u.z (${u.z}) should be approx 0`);

    // Norm invariant
    const norm = vectorNorm3D(u);
    assert.ok(Math.abs(norm - 1.0) < TOLERANCE, `Norm should be 1.0, got ${norm}`);

    // Angular arc distance should be pi / 2
    assert.ok(
      Math.abs(detailed.angularDistanceRad - Math.PI / 2.0) < TOLERANCE,
      `Angular distance should be pi/2, got ${detailed.angularDistanceRad}`
    );
  });

  it("TC-02: Equator to North Pole displacement", () => {
    const origin: SphericalCoordinates = { lat: 0.0, lng: 0.0 };
    const target: SphericalCoordinates = { lat: 90.0, lng: 0.0 };

    const u = computeBoundaryCentroidDisplacement3D(origin, target);
    const detailed = computeDetailedCentroidDisplacement3D(origin, target);

    const expectedVal = 1.0 / Math.sqrt(2.0);
    assert.ok(Math.abs(u.x - -expectedVal) < TOLERANCE, `u.x should be approx -${expectedVal}`);
    assert.ok(Math.abs(u.y - 0.0) < TOLERANCE, `u.y should be approx 0`);
    assert.ok(Math.abs(u.z - expectedVal) < TOLERANCE, `u.z should be approx ${expectedVal}`);

    const norm = vectorNorm3D(u);
    assert.ok(Math.abs(norm - 1.0) < TOLERANCE);
    assert.ok(Math.abs(detailed.angularDistanceRad - Math.PI / 2.0) < TOLERANCE);
  });

  it("TC-03: Prime Meridian to Date Line (Antipodal)", () => {
    const origin: SphericalCoordinates = { lat: 0.0, lng: 0.0 };
    const target: SphericalCoordinates = { lat: 0.0, lng: 180.0 };

    const u = computeBoundaryCentroidDisplacement3D(origin, target);
    const detailed = computeDetailedCentroidDisplacement3D(origin, target);

    assert.ok(Math.abs(u.x - -1.0) < TOLERANCE, `u.x should be -1.0, got ${u.x}`);
    assert.ok(Math.abs(u.y - 0.0) < TOLERANCE);
    assert.ok(Math.abs(u.z - 0.0) < TOLERANCE);

    assert.ok(Math.abs(detailed.chordDistance - 2.0) < TOLERANCE, `Chord distance should be 2.0`);
    assert.ok(Math.abs(detailed.angularDistanceRad - Math.PI) < TOLERANCE, `Angular distance should be pi`);
  });

  it("TC-04: Coincident Singular Centroid produces zero vector", () => {
    const coord: SphericalCoordinates = { lat: 37.77, lng: -122.41 };
    const u = computeBoundaryCentroidDisplacement3D(coord, coord);
    const detailed = computeDetailedCentroidDisplacement3D(coord, coord);

    assert.strictEqual(u.x, 0.0);
    assert.strictEqual(u.y, 0.0);
    assert.strictEqual(u.z, 0.0);
    assert.strictEqual(detailed.chordDistance, 0.0);
    assert.strictEqual(detailed.angularDistanceRad, 0.0);
  });

  it("TC-05: Date-Line crossing boundary resolution", () => {
    const origin: SphericalCoordinates = { lat: 10.0, lng: 179.9 };
    const target: SphericalCoordinates = { lat: 10.0, lng: -179.9 };

    const u = computeBoundaryCentroidDisplacement3D(origin, target);
    const norm = vectorNorm3D(u);

    assert.ok(Math.abs(norm - 1.0) < TOLERANCE, `Norm across date-line must be 1.0, got ${norm}`);
    // Eastward traversal across date line has negative y in Cartesian coordinates
    assert.ok(u.y < 0, `y component should be negative across date-line: ${u.y}`);
    assert.ok(Math.abs(u.z) < 1e-6, `z component should be negligible for equal latitudes: ${u.z}`);
  });

  it("Unit Norm Invariant across 1,000 randomized spherical pairs", () => {
    for (let i = 0; i < 1000; i++) {
      const lat1 = (Math.random() - 0.5) * 180;
      const lng1 = (Math.random() - 0.5) * 360;
      // Ensure target is distinct from origin
      const lat2 = (Math.random() - 0.5) * 180;
      const lng2 = (Math.random() - 0.5) * 360;

      const origin = { lat: lat1, lng: lng1 };
      const target = { lat: lat2, lng: lng2 };

      const u = computeBoundaryCentroidDisplacement3D(origin, target);
      const norm = vectorNorm3D(u);

      if (norm > 0) {
        assert.ok(
          Math.abs(norm - 1.0) < 1e-10,
          `Normalized vector must have norm 1.0, got ${norm}`
        );
      }
    }
  });

  it("H3AdjacencyManager neighbor displacement and edge lookup", () => {
    const manager = new H3AdjacencyManager();

    manager.registerCell("cell_A", { lat: 0.0, lng: 0.0 });
    manager.registerCell("cell_B", { lat: 0.0, lng: 90.0 });
    manager.addAdjacency("cell_A", "cell_B", "edge_AB");

    const u = manager.getNeighborDisplacement3D("cell_A", "cell_B");
    assert.ok(Math.abs(vectorNorm3D(u) - 1.0) < TOLERANCE);

    const edgeU = manager.getDirectedEdgeVector3D("edge_AB");
    assert.strictEqual(edgeU.x, u.x);
    assert.strictEqual(edgeU.y, u.y);
    assert.strictEqual(edgeU.z, u.z);

    const autoEdgeU = manager.getDirectedEdgeVector3D("cell_A->cell_B");
    assert.strictEqual(autoEdgeU.x, u.x);
    assert.strictEqual(autoEdgeU.y, u.y);
  });

  it("Conservative Advective Boundary Transfer obeys zero-sum First Law", () => {
    const cellA = {
      coord: { lat: 0.0, lng: 0.0 },
      waterMassKg: 1000.0,
      carbonMassKg: 50.0,
      oxygenMassKg: 200.0,
      mineralMassKg: 80.0,
      thermalEnergyJoules: 5e6,
      volumeM3: 100.0,
      windVelocity3D: { x: -10.0, y: 10.0, z: 0.0 }, // Blowing towards cell B
    };

    const cellB = {
      coord: { lat: 0.0, lng: 90.0 },
      waterMassKg: 500.0,
      carbonMassKg: 25.0,
      oxygenMassKg: 100.0,
      mineralMassKg: 40.0,
      thermalEnergyJoules: 2.5e6,
      volumeM3: 100.0,
      windVelocity3D: { x: -10.0, y: 10.0, z: 0.0 },
    };

    const initialTotalWater = cellA.waterMassKg + cellB.waterMassKg;
    const initialTotalEnergy = cellA.thermalEnergyJoules + cellB.thermalEnergyJoules;

    const result = executeAdvectiveBoundaryTransfer({
      cellA,
      cellB,
      facetAreaM2: 10.0,
      deltaTimeSec: 0.5,
    });

    // Verify positive flux from A to B
    assert.ok(result.deltaWaterKg > 0, `Water should flow from A to B`);
    assert.ok(result.deltaEnergyJoules > 0, `Thermal energy should flow from A to B`);

    // Apply conservative state transition
    cellA.waterMassKg -= result.deltaWaterKg;
    cellB.waterMassKg += result.deltaWaterKg;
    cellA.thermalEnergyJoules -= result.deltaEnergyJoules;
    cellB.thermalEnergyJoules += result.deltaEnergyJoules;

    const finalTotalWater = cellA.waterMassKg + cellB.waterMassKg;
    const finalTotalEnergy = cellA.thermalEnergyJoules + cellB.thermalEnergyJoules;

    // First Law exact balance: zero net generation
    assert.ok(
      Math.abs(finalTotalWater - initialTotalWater) < 1e-12,
      `Water mass must be strictly conserved. Initial: ${initialTotalWater}, Final: ${finalTotalWater}`
    );
    assert.ok(
      Math.abs(finalTotalEnergy - initialTotalEnergy) < 1e-12,
      `Thermal energy must be strictly conserved. Initial: ${initialTotalEnergy}, Final: ${finalTotalEnergy}`
    );
  });
});