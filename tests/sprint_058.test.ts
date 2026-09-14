import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as h3 from 'h3-js';
import {
  LatLng,
  computeBoundaryMidpointLatLng,
  computeGreatCircleDistance,
  computeInitialBearing,
  computeMidpointCoriolis,
  computeMidpointSolarIrradiance,
  evaluateBoundaryInterface,
  SpatialBoundaryMonad,
  SpatialAdjacencyGraph,
  CellStockState,
  DiffusionCoefficients,
} from '../src/spatial/h3_adjacency.js';

describe('Sprint 058 - Spherical Boundary Midpoint & Interfacial Adjacency', () => {
  // Test 1: Equatorial Co-linear Test
  it('computes exact midpoint along equatorial co-linear points: (0, 10) and (0, 20) -> (0, 15)', () => {
    const c1: LatLng = { lat: 0, lng: 10 };
    const c2: LatLng = { lat: 0, lng: 20 };
    const midpoint = computeBoundaryMidpointLatLng(c1, c2);

    assert.ok(Math.abs(midpoint.lat - 0) < 1e-12, `Expected lat ~ 0, got ${midpoint.lat}`);
    assert.ok(Math.abs(midpoint.lng - 15) < 1e-12, `Expected lng ~ 15, got ${midpoint.lng}`);
  });

  // Test 2: Meridian Arc Test
  it('computes exact midpoint along a meridian: (10, 0) and (30, 0) -> (20, 0)', () => {
    const c1: LatLng = { lat: 10, lng: 0 };
    const c2: LatLng = { lat: 30, lng: 0 };
    const midpoint = computeBoundaryMidpointLatLng(c1, c2);

    assert.ok(Math.abs(midpoint.lat - 20) < 1e-12, `Expected lat ~ 20, got ${midpoint.lat}`);
    assert.ok(Math.abs(midpoint.lng - 0) < 1e-12, `Expected lng ~ 0, got ${midpoint.lng}`);
  });

  // Test 3: Antimeridian Crossing Test
  it('correctly handles antimeridian crossing between (10, 179) and (10, -179) without falling near prime meridian', () => {
    const c1: LatLng = { lat: 10, lng: 179 };
    const c2: LatLng = { lat: 10, lng: -179 };
    const midpoint = computeBoundaryMidpointLatLng(c1, c2);

    // Midpoint longitude must be +/-180, not near 0
    assert.ok(Math.abs(Math.abs(midpoint.lng) - 180) < 1e-9, `Expected lng +/-180, got ${midpoint.lng}`);
    // Latitude must be slightly above 10 degrees due to great circle curvature (~10.00147 deg)
    assert.ok(midpoint.lat > 10.0 && midpoint.lat < 10.1, `Expected lat ~ 10.001 deg, got ${midpoint.lat}`);
  });

  // Test 4: Polar Proximity Test
  it('computes spherical midpoint for high-latitude points across prime meridian', () => {
    const c1: LatLng = { lat: 85, lng: -10 };
    const c2: LatLng = { lat: 85, lng: 10 };
    const midpoint = computeBoundaryMidpointLatLng(c1, c2);

    // Midpoint should lie on the prime meridian (lng = 0)
    assert.ok(Math.abs(midpoint.lng) < 1e-10, `Expected lng ~ 0, got ${midpoint.lng}`);
    // The great circle arc bends towards the pole: midpoint latitude > 85
    assert.ok(midpoint.lat > 85.0 && midpoint.lat <= 90.0, `Expected lat > 85, got ${midpoint.lat}`);
  });

  // Test 5: Commutativity / Symmetry Axiom
  it('satisfies commutativity M(A, B) === M(B, A) to within 1e-9 degrees', () => {
    const a: LatLng = { lat: 37.7749, lng: -122.4194 };
    const b: LatLng = { lat: 34.0522, lng: -118.2437 };

    const mAB = computeBoundaryMidpointLatLng(a, b);
    const mBA = computeBoundaryMidpointLatLng(b, a);

    assert.ok(Math.abs(mAB.lat - mBA.lat) < 1e-9, `Latitude asymmetry: ${Math.abs(mAB.lat - mBA.lat)}`);
    assert.ok(Math.abs(mAB.lng - mBA.lng) < 1e-9, `Longitude asymmetry: ${Math.abs(mAB.lng - mBA.lng)}`);
  });

  // Test 6: Equidistance Verification
  it('satisfies equidistance d(A, M) === d(B, M) === 0.5 * d(A, B) within relative tolerance < 1e-7', () => {
    const a: LatLng = { lat: -25.2744, lng: 133.7751 };
    const b: LatLng = { lat: -20.1234, lng: 138.5678 };

    const mid = computeBoundaryMidpointLatLng(a, b);
    const dAM = computeGreatCircleDistance(a, mid);
    const dBM = computeGreatCircleDistance(b, mid);
    const dAB = computeGreatCircleDistance(a, b);

    const relDiff = Math.abs(dAM - dBM) / dAB;
    assert.ok(relDiff < 1e-7, `Relative difference ${relDiff} exceeded tolerance 1e-7`);

    const splitError = Math.abs((dAM + dBM) - dAB) / dAB;
    assert.ok(splitError < 1e-7, `Split distance error ${splitError} exceeded tolerance 1e-7`);
  });

  // Test 7: Idempotence Axiom
  it('satisfies idempotence M(A, A) === A', () => {
    const a: LatLng = { lat: 51.5074, lng: -0.1278 };
    const mid = computeBoundaryMidpointLatLng(a, a);

    assert.strictEqual(mid.lat, a.lat);
    assert.strictEqual(mid.lng, a.lng);
  });

  // Test 8: Realistic H3 Adjacency Test
  it('computes interface boundary between adjacent resolution 3 H3 hexel centroids', () => {
    const anyH3 = h3 as any;
    // Generate valid resolution 3 cell index
    let originHex: string;
    if (typeof anyH3.latLngToCell === 'function') {
      originHex = anyH3.latLngToCell(45.0, 5.0, 3);
    } else if (typeof anyH3.geoToH3 === 'function') {
      originHex = anyH3.geoToH3(45.0, 5.0, 3);
    } else {
      originHex = '831f95fffffffff';
    }

    let neighbors: string[] = [];
    if (typeof anyH3.gridDisk === 'function') {
      neighbors = anyH3.gridDisk(originHex, 1).filter((h: string) => h !== originHex);
    } else if (typeof anyH3.kRing === 'function') {
      neighbors = anyH3.kRing(originHex, 1).filter((h: string) => h !== originHex);
    }

    if (neighbors.length > 0) {
      const neighborHex = neighbors[0];
      const boundary = evaluateBoundaryInterface(originHex, neighborHex);

      assert.strictEqual(boundary.originHex, originHex);
      assert.strictEqual(boundary.neighborHex, neighborHex);
      assert.ok(boundary.distanceMeters > 50000 && boundary.distanceMeters < 250000, `Unexpected distance: ${boundary.distanceMeters} m`);
      assert.ok(boundary.contactLengthMeters > 0);
      assert.ok(boundary.normalAzimuthDegrees >= 0 && boundary.normalAzimuthDegrees < 360);
      assert.ok(typeof boundary.midpointCoriolisParameter === 'number');
    }
  });

  // Test 9: Interfacial Bearing & Azimuth Calculation
  it('computes initial bearing accurately for cardinal directions', () => {
    const center: LatLng = { lat: 0, lng: 0 };
    const north: LatLng = { lat: 10, lng: 0 };
    const east: LatLng = { lat: 0, lng: 10 };
    const south: LatLng = { lat: -10, lng: 0 };
    const west: LatLng = { lat: 0, lng: -10 };

    assert.ok(Math.abs(computeInitialBearing(center, north) - 0) < 1e-6);
    assert.ok(Math.abs(computeInitialBearing(center, east) - 90) < 1e-6);
    assert.ok(Math.abs(computeInitialBearing(center, south) - 180) < 1e-6);
    assert.ok(Math.abs(computeInitialBearing(center, west) - 270) < 1e-6);
  });

  // Test 10: Midpoint Coriolis Parameter
  it('evaluates Coriolis parameter: zero at equator, positive in North, negative in South', () => {
    const fEquator = computeMidpointCoriolis(0);
    const fNorth = computeMidpointCoriolis(45);
    const fSouth = computeMidpointCoriolis(-45);

    assert.ok(Math.abs(fEquator) < 1e-12);
    assert.ok(fNorth > 1e-4);
    assert.ok(fSouth < -1e-4);
    assert.ok(Math.abs(fNorth + fSouth) < 1e-12);
  });

  // Test 11: Midpoint Solar Irradiance
  it('computes midpoint solar irradiance with day/night contrast', () => {
    // Equinox noon at lat 0, lng 0 -> high irradiance
    const noonSun = computeMidpointSolarIrradiance(0, 0, 80, 12);
    // Midnight at lat 0, lng 0 -> zero irradiance
    const nightSun = computeMidpointSolarIrradiance(0, 0, 80, 0);

    assert.ok(noonSun > 1300, `Expected noon irradiance > 1300 W/m2, got ${noonSun}`);
    assert.strictEqual(nightSun, 0);
  });

  // Test 12: Thermodynamic First Law Conservation in SpatialBoundaryMonad
  it('strictly preserves conservative mass and energy stocks across interface (First Law)', () => {
    const boundary = evaluateBoundaryInterface(
      'origin',
      'neighbor',
      { lat: 10, lng: 20 },
      { lat: 11, lng: 21 }
    );

    const state1: CellStockState = {
      carbonKg: 5000,
      waterKg: 20000,
      oxygenKg: 10000,
      mineralsKg: 3000,
      energyJoules: 1e9,
      temperatureKelvin: 298.15,
      specificHumidity: 0.012,
      dicConcentration: 2.1,
    };

    const state2: CellStockState = {
      carbonKg: 4000,
      waterKg: 25000,
      oxygenKg: 11000,
      mineralsKg: 3500,
      energyJoules: 1.2e9,
      temperatureKelvin: 293.15,
      specificHumidity: 0.008,
      dicConcentration: 2.3,
    };

    const monad = SpatialBoundaryMonad.of(state1, state2, boundary);
    const coeffs: DiffusionCoefficients = {
      diffWater: 1000,
      diffCarbon: 500,
      diffOxygen: 500,
      diffMinerals: 100,
      thermalCond: 2000,
    };

    const [next1, next2, deltas] = monad.computeTransfer(5.0, 1000, 900, coeffs);

    // Conservation check: Delta 1 + Delta 2 === 0
    assert.ok(
      Math.abs((next1.carbonKg! + next2.carbonKg!) - (state1.carbonKg! + state2.carbonKg!)) < 1e-9,
      'Carbon conservation violated'
    );
    assert.ok(
      Math.abs((next1.waterKg! + next2.waterKg!) - (state1.waterKg! + state2.waterKg!)) < 1e-9,
      'Water conservation violated'
    );
    assert.ok(
      Math.abs((next1.oxygenKg! + next2.oxygenKg!) - (state1.oxygenKg! + state2.oxygenKg!)) < 1e-9,
      'Oxygen conservation violated'
    );
    assert.ok(
      Math.abs((next1.mineralsKg! + next2.mineralsKg!) - (state1.mineralsKg! + state2.mineralsKg!)) < 1e-9,
      'Minerals conservation violated'
    );
    assert.ok(
      Math.abs((next1.energyJoules! + next2.energyJoules!) - (state1.energyJoules! + state2.energyJoules!)) < 1e-4,
      'Energy conservation violated'
    );

    // Delta matches state difference
    assert.ok(Math.abs(state1.carbonKg! - next1.carbonKg! - deltas.deltaCarbonKg) < 1e-9);
    assert.ok(Math.abs(next2.carbonKg! - state2.carbonKg! - deltas.deltaCarbonKg) < 1e-9);
  });

  // Test 13: SpatialAdjacencyGraph functionality
  it('manages adjacency cache and executes inter-cell flux through SpatialAdjacencyGraph', () => {
    const graph = new SpatialAdjacencyGraph();
    const hexA = 'hexA';
    const hexB = 'hexB';

    const boundary = evaluateBoundaryInterface(
      hexA,
      hexB,
      { lat: 40.0, lng: -74.0 },
      { lat: 40.5, lng: -73.5 }
    );

    graph.addAdjacency(hexA, hexB, boundary);

    const neighborsA = graph.getNeighbors(hexA);
    assert.ok(neighborsA.includes(hexB));

    const retrievedBoundary = graph.getBoundary(hexA, hexB);
    assert.strictEqual(retrievedBoundary.midpoint.lat, boundary.midpoint.lat);
    assert.strictEqual(retrievedBoundary.midpoint.lng, boundary.midpoint.lng);

    const stateA: CellStockState = {
      carbonKg: 1000,
      waterKg: 5000,
      oxygenKg: 2000,
      mineralsKg: 500,
      energyJoules: 1e8,
      temperatureKelvin: 300,
      specificHumidity: 0.015,
      dicConcentration: 2.0,
    };
    const stateB: CellStockState = {
      carbonKg: 1000,
      waterKg: 5000,
      oxygenKg: 2000,
      mineralsKg: 500,
      energyJoules: 1e8,
      temperatureKelvin: 290,
      specificHumidity: 0.010,
      dicConcentration: 2.0,
    };

    const [nextA, nextB, deltas] = graph.computeInterCellFlux(
      stateA,
      stateB,
      retrievedBoundary,
      2.0,
      500,
      300
    );

    assert.ok(Math.abs((nextA.carbonKg! + nextB.carbonKg!) - 2000) < 1e-9);
    assert.ok(Math.abs((nextA.energyJoules! + nextB.energyJoules!) - 2e8) < 1e-4);
    assert.ok(deltas.deltaWaterKg !== 0);
  });
});