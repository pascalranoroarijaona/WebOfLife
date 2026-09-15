// =============================================================================
// SPRINT 067 TEST SUITE: DETAILED INTERFACE NORMAL & CONSERVATIVE TRANSFER
// RFC-067 Verification Suite
// =============================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  computeDetailedInterfaceNormal,
  computeInterfaceTransfer,
  Cartesian3D,
  CellGeometryState,
  InterfaceFluxState,
  EARTH_RADIUS_METERS,
} from '../src/spatial/h3_adjacency.js';

describe('Sprint 067 - RFC-067 Interface Normal and Conservative Advection', () => {
  const EPSILON = 1e-9;

  it('computes accurate interface normal between adjacent equatorial cells', () => {
    // Cell A at lon = -1 deg, Cell B at lon = +1 deg on equator (lat = 0)
    const rad = (deg: number) => (deg * Math.PI) / 180;
    const r = EARTH_RADIUS_METERS;

    const centroidA: Cartesian3D = [r * Math.cos(rad(-1)), r * Math.sin(rad(-1)), 0];
    const centroidB: Cartesian3D = [r * Math.cos(rad(1)), r * Math.sin(rad(1)), 0];

    // Shared boundary vertices at lon = 0 deg, lat = -0.5 deg to +0.5 deg
    const vertexA: Cartesian3D = [r * Math.cos(rad(-0.5)), 0, r * Math.sin(rad(-0.5))];
    const vertexB: Cartesian3D = [r * Math.cos(rad(0.5)), 0, r * Math.sin(rad(0.5))];

    const result = computeDetailedInterfaceNormal(centroidA, centroidB, vertexA, vertexB, r);

    // Normal should point predominantly eastward in +y (from cell A to cell B)
    assert.ok(result.normal[1] > 0.99, `Normal Y component should be close to 1, got ${result.normal[1]}`);
    assert.ok(Math.abs(result.normal[0]) < 0.05, `Normal X component should be near 0, got ${result.normal[0]}`);
    assert.ok(Math.abs(result.normal[2]) < 0.05, `Normal Z component should be near 0, got ${result.normal[2]}`);

    // Arc length should match 1 degree on the sphere: r * rad(1)
    const expectedArc = r * rad(1.0);
    assert.ok(Math.abs(result.arcLengthMeters - expectedArc) < 1.0, `Arc length mismatch`);

    // Alignment cosine should be close to 1
    assert.ok(result.alignmentCos > 0.99, `Alignment cosine should be close to 1, got ${result.alignmentCos}`);
  });

  it('computes accurate interface normal between meridian-adjacent cells', () => {
    const rad = (deg: number) => (deg * Math.PI) / 180;
    const r = EARTH_RADIUS_METERS;

    // Cell A at lat = -1 deg, Cell B at lat = +1 deg on prime meridian (lon = 0)
    const centroidA: Cartesian3D = [r * Math.cos(rad(-1)), 0, r * Math.sin(rad(-1))];
    const centroidB: Cartesian3D = [r * Math.cos(rad(1)), 0, r * Math.sin(rad(1))];

    // Shared boundary vertices along latitude 0 from lon = -0.5 deg to +0.5 deg
    const vertexA: Cartesian3D = [r * Math.cos(rad(-0.5)), r * Math.sin(rad(-0.5)), 0];
    const vertexB: Cartesian3D = [r * Math.cos(rad(0.5)), r * Math.sin(rad(0.5)), 0];

    const result = computeDetailedInterfaceNormal(centroidA, centroidB, vertexA, vertexB, r);

    // Normal should point predominantly northward in +z (from cell A to cell B)
    assert.ok(result.normal[2] > 0.99, `Normal Z component should be close to 1, got ${result.normal[2]}`);
    assert.ok(result.alignmentCos > 0.99, `Alignment cosine should be close to 1, got ${result.alignmentCos}`);
  });

  it('strictly conserves mass across all stocks during interfacial transport', () => {
    const rad = (deg: number) => (deg * Math.PI) / 180;
    const r = EARTH_RADIUS_METERS;

    const centroidA: Cartesian3D = [r * Math.cos(rad(-1)), r * Math.sin(rad(-1)), 0];
    const centroidB: Cartesian3D = [r * Math.cos(rad(1)), r * Math.sin(rad(1)), 0];
    const vertexA: Cartesian3D = [r * Math.cos(rad(-0.5)), 0, r * Math.sin(rad(-0.5))];
    const vertexB: Cartesian3D = [r * Math.cos(rad(0.5)), 0, r * Math.sin(rad(0.5))];

    const metric = computeDetailedInterfaceNormal(centroidA, centroidB, vertexA, vertexB, r);

    const stocksA: InterfaceFluxState = {
      massAirKg: 1.2e6,
      massWaterKg: 8.0e5,
      massCarbonKg: 1.5e4,
      massOxygenKg: 2.5e5,
      massMineralsKg: 4.0e4,
      thermalEnergyJoules: 3.5e11,
    };

    const stocksB: InterfaceFluxState = {
      massAirKg: 1.1e6,
      massWaterKg: 6.0e5,
      massCarbonKg: 1.2e4,
      massOxygenKg: 2.3e5,
      massMineralsKg: 4.5e4,
      thermalEnergyJoules: 3.2e11,
    };

    const cellA: CellGeometryState = {
      centroid: centroidA,
      volumeM3: 1e9,
      columnHeightM: 1000,
      stocks: stocksA,
    };

    const cellB: CellGeometryState = {
      centroid: centroidB,
      volumeM3: 1e9,
      columnHeightM: 1000,
      stocks: stocksB,
    };

    const velocity: readonly [number, number, number] = [0, 5.0, 0]; // 5 m/s eastward
    const diffCoeff = 1.0;
    const thermalCond = 25.0;
    const heatCap = 1005.0;
    const dt = 60.0; // 60 seconds

    const transfer = computeInterfaceTransfer(
      metric,
      cellA,
      cellB,
      velocity,
      diffCoeff,
      thermalCond,
      heatCap,
      dt
    );

    // Conservation check: deltaOrigin + deltaDestination must be 0 for all mass components
    assert.ok(Math.abs(transfer.deltaOrigin.massAirKg + transfer.deltaDestination.massAirKg) < EPSILON);
    assert.ok(Math.abs(transfer.deltaOrigin.massWaterKg + transfer.deltaDestination.massWaterKg) < EPSILON);
    assert.ok(Math.abs(transfer.deltaOrigin.massCarbonKg + transfer.deltaDestination.massCarbonKg) < EPSILON);
    assert.ok(Math.abs(transfer.deltaOrigin.massOxygenKg + transfer.deltaDestination.massOxygenKg) < EPSILON);
    assert.ok(Math.abs(transfer.deltaOrigin.massMineralsKg + transfer.deltaDestination.massMineralsKg) < EPSILON);

    // Non-zero transport occurred in direction of flow
    assert.ok(transfer.deltaDestination.massAirKg > 0);
    assert.ok(transfer.deltaDestination.massWaterKg > 0);
    assert.ok(transfer.deltaOrigin.massAirKg < 0);
  });

  it('strictly conserves thermal energy and satisfies the Second Law of Thermodynamics', () => {
    const rad = (deg: number) => (deg * Math.PI) / 180;
    const r = EARTH_RADIUS_METERS;

    const centroidA: Cartesian3D = [r * Math.cos(rad(-1)), r * Math.sin(rad(-1)), 0];
    const centroidB: Cartesian3D = [r * Math.cos(rad(1)), r * Math.sin(rad(1)), 0];
    const vertexA: Cartesian3D = [r * Math.cos(rad(-0.5)), 0, r * Math.sin(rad(-0.5))];
    const vertexB: Cartesian3D = [r * Math.cos(rad(0.5)), 0, r * Math.sin(rad(0.5))];

    const metric = computeDetailedInterfaceNormal(centroidA, centroidB, vertexA, vertexB, r);

    // Create hot cell A and cold cell B
    const cellA: CellGeometryState = {
      centroid: centroidA,
      volumeM3: 1e9,
      columnHeightM: 1000,
      stocks: {
        massAirKg: 1e6,
        massWaterKg: 1e5,
        massCarbonKg: 1e4,
        massOxygenKg: 2e5,
        massMineralsKg: 1e4,
        thermalEnergyJoules: 5.0e11, // High temperature (~350K)
      },
    };

    const cellB: CellGeometryState = {
      centroid: centroidB,
      volumeM3: 1e9,
      columnHeightM: 1000,
      stocks: {
        massAirKg: 1e6,
        massWaterKg: 1e5,
        massCarbonKg: 1e4,
        massOxygenKg: 2e5,
        massMineralsKg: 1e4,
        thermalEnergyJoules: 3.5e11, // Low temperature (~250K)
      },
    };

    const transfer = computeInterfaceTransfer(
      metric,
      cellA,
      cellB,
      [0, 2.0, 0],
      0.5,
      50.0,
      1000.0,
      30.0
    );

    // Conservation of energy
    assert.ok(
      Math.abs(transfer.deltaOrigin.thermalEnergyJoules + transfer.deltaDestination.thermalEnergyJoules) < 1e-4,
      'Thermal energy must be strictly conserved between origin and destination'
    );

    // Second Law: Non-negative entropy production
    assert.ok(
      transfer.entropyGeneratedJPerK >= 0,
      `Entropy generated must be >= 0, got ${transfer.entropyGeneratedJPerK}`
    );
    assert.ok(
      transfer.entropyGeneratedJPerK > 0,
      'Entropy generated must be strictly positive in presence of finite temperature gradient'
    );
  });

  it('correctly adapts upwind donor concentration when velocity reverses', () => {
    const rad = (deg: number) => (deg * Math.PI) / 180;
    const r = EARTH_RADIUS_METERS;

    const centroidA: Cartesian3D = [r * Math.cos(rad(-1)), r * Math.sin(rad(-1)), 0];
    const centroidB: Cartesian3D = [r * Math.cos(rad(1)), r * Math.sin(rad(1)), 0];
    const vertexA: Cartesian3D = [r * Math.cos(rad(-0.5)), 0, r * Math.sin(rad(-0.5))];
    const vertexB: Cartesian3D = [r * Math.cos(rad(0.5)), 0, r * Math.sin(rad(0.5))];

    const metric = computeDetailedInterfaceNormal(centroidA, centroidB, vertexA, vertexB, r);

    const cellA: CellGeometryState = {
      centroid: centroidA,
      volumeM3: 1e9,
      columnHeightM: 1000,
      stocks: {
        massAirKg: 1e6,
        massWaterKg: 1e5,
        massCarbonKg: 1e4,
        massOxygenKg: 2e5,
        massMineralsKg: 1e4,
        thermalEnergyJoules: 3e11,
      },
    };

    const cellB: CellGeometryState = {
      centroid: centroidB,
      volumeM3: 1e9,
      columnHeightM: 1000,
      stocks: {
        massAirKg: 1e6,
        massWaterKg: 2e5,
        massCarbonKg: 2e4,
        massOxygenKg: 2e5,
        massMineralsKg: 1e4,
        thermalEnergyJoules: 3e11,
      },
    };

    // Flow in negative Y direction (westward from B to A)
    const reversedVelocity: readonly [number, number, number] = [0, -10.0, 0];

    const transfer = computeInterfaceTransfer(
      metric,
      cellA,
      cellB,
      reversedVelocity,
      0.0, // pure advection
      0.0,
      1000.0,
      10.0
    );

    // Negative normal velocity implies destination gains mass from origin (net delta Destination < 0, delta Origin > 0)
    assert.ok(transfer.deltaDestination.massAirKg < 0, 'Destination should lose mass when flow is towards origin');
    assert.ok(transfer.deltaOrigin.massAirKg > 0, 'Origin should gain mass when flow is towards origin');

    // Conservation still holds
    assert.ok(Math.abs(transfer.deltaOrigin.massAirKg + transfer.deltaDestination.massAirKg) < EPSILON);
    assert.ok(Math.abs(transfer.deltaOrigin.massWaterKg + transfer.deltaDestination.massWaterKg) < EPSILON);
  });
});