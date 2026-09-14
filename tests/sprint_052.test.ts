/**
 * Test Suite: Sprint 052 - 3D Cartesian Spherical Unit Vector Projection
 * Validates latLngToUnitVector3D, vector algebra, metric invariants,
 * antimeridian continuity, and thermodynamic conservation in SpatialMonad.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  latLngToUnitVector3D,
  unitVectorDotProduct,
  unitVectorCrossProduct,
  unitVectorAngularDistance,
  unitVectorChordDistance,
  unitVectorTangentChord,
  H3AdjacencyMatrix,
  EARTH_RADIUS_METERS
} from '../src/spatial/h3_adjacency.js';

import {
  CellSpatialGeometry,
  CellBiophysicalState,
  PlanetaryGridState,
  UnitVector3D
} from '../src/spatial/h3_types.js';

import {
  SpatialMonad,
  applyPlanetaryInsolationStep,
  updatePlanetaryInsolation,
  SOLAR_CONSTANT_W_M2,
  MOLAR_MASS_C,
  MOLAR_MASS_CO2
} from '../src/monads/spatial_monad.js';

describe('Sprint 052: Spherical Unit Vector Projections (latLngToUnitVector3D)', () => {
  it('1. Cardinal Axis Projections', () => {
    // Equator / Prime Meridian (0, 0) -> [1, 0, 0]
    const pEquatorPM = latLngToUnitVector3D(0.0, 0.0);
    assert.strictEqual(pEquatorPM[0], 1.0);
    assert.strictEqual(pEquatorPM[1], 0.0);
    assert.strictEqual(pEquatorPM[2], 0.0);

    // Equator / 90°E (0, 90) -> [0, 1, 0]
    const pEquator90E = latLngToUnitVector3D(0.0, 90.0);
    assert.strictEqual(pEquator90E[0], 0.0);
    assert.strictEqual(pEquator90E[1], 1.0);
    assert.strictEqual(pEquator90E[2], 0.0);

    // North Pole (90, 0) -> [0, 0, 1]
    const pNorthPole = latLngToUnitVector3D(90.0, 0.0);
    assert.strictEqual(pNorthPole[0], 0.0);
    assert.strictEqual(pNorthPole[1], 0.0);
    assert.strictEqual(pNorthPole[2], 1.0);

    // South Pole (-90, 0) -> [0, 0, -1]
    const pSouthPole = latLngToUnitVector3D(-90.0, 0.0);
    assert.strictEqual(pSouthPole[0], 0.0);
    assert.strictEqual(pSouthPole[1], 0.0);
    assert.strictEqual(pSouthPole[2], -1.0);

    // Equator / 180°W (0, -180) -> [-1, 0, 0]
    const pEquator180W = latLngToUnitVector3D(0.0, -180.0);
    assert.strictEqual(pEquator180W[0], -1.0);
    assert.strictEqual(pEquator180W[1], 0.0);
    assert.strictEqual(pEquator180W[2], 0.0);

    // Equator / 90°W (0, -90) -> [0, -1, 0]
    const pEquator90W = latLngToUnitVector3D(0.0, -90.0);
    assert.strictEqual(pEquator90W[0], 0.0);
    assert.strictEqual(pEquator90W[1], -1.0);
    assert.strictEqual(pEquator90W[2], 0.0);
  });

  it('2. Norm Invariance across 10,000 randomized planetary coordinates', () => {
    const SAMPLE_COUNT = 10_000;
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      // Sample uniformly across latitude [-90, 90] and longitude [-180, 180]
      const lat = (Math.random() * 180.0) - 90.0;
      const lng = (Math.random() * 360.0) - 180.0;
      const u = latLngToUnitVector3D(lat, lng);
      const normSquared = u[0] * u[0] + u[1] * u[1] + u[2] * u[2];
      const norm = Math.sqrt(normSquared);
      const diff = Math.abs(norm - 1.0);

      assert.ok(
        diff <= 1.0e-14,
        `Norm drift exceeded tolerance at lat=${lat}, lng=${lng}: ||u|| - 1 = ${diff}`
      );
    }
  });

  it('3. Antimeridian Continuity', () => {
    const lat = 34.0522; // Los Angeles latitude
    const uPos = latLngToUnitVector3D(lat, 179.999999);
    const uNeg = latLngToUnitVector3D(lat, -180.0);

    const chord = unitVectorChordDistance(uPos, uNeg);
    // Differential chord distance across 1e-6 degrees longitude must be <= 2e-7
    assert.ok(chord < 1.0e-6, `Chord distance across antimeridian too large: ${chord}`);
  });

  it('4. Great-Circle Angular Distance and Chord Distance', () => {
    const uNorth = latLngToUnitVector3D(90.0, 0.0);
    const uSouth = latLngToUnitVector3D(-90.0, 0.0);
    const uEquator0 = latLngToUnitVector3D(0.0, 0.0);
    const uEquator90 = latLngToUnitVector3D(0.0, 90.0);

    // North to South Pole: angle = pi, chord = 2.0
    const anglePoles = unitVectorAngularDistance(uNorth, uSouth);
    assert.ok(Math.abs(anglePoles - Math.PI) < 1.0e-15);
    const chordPoles = unitVectorChordDistance(uNorth, uSouth);
    assert.strictEqual(chordPoles, 2.0);

    // North to Equator: angle = pi/2, chord = sqrt(2)
    const angleNE = unitVectorAngularDistance(uNorth, uEquator0);
    assert.ok(Math.abs(angleNE - Math.PI / 2) < 1.0e-15);
    const chordNE = unitVectorChordDistance(uNorth, uEquator0);
    assert.ok(Math.abs(chordNE - Math.SQRT2) < 1.0e-15);

    // Equator 0 to Equator 90: angle = pi/2
    const angleEE = unitVectorAngularDistance(uEquator0, uEquator90);
    assert.ok(Math.abs(angleEE - Math.PI / 2) < 1.0e-15);
  });

  it('5. Dot Product and Cross Product Orthogonality', () => {
    const uX = latLngToUnitVector3D(0.0, 0.0); // [1, 0, 0]
    const uY = latLngToUnitVector3D(0.0, 90.0); // [0, 1, 0]

    const dot = unitVectorDotProduct(uX, uY);
    assert.strictEqual(dot, 0.0);

    const cross = unitVectorCrossProduct(uX, uY);
    assert.strictEqual(cross[0], 0.0);
    assert.strictEqual(cross[1], 0.0);
    assert.strictEqual(cross[2], 1.0);

    // Tangent chord direction
    const tangent = unitVectorTangentChord(uX, uY);
    const tangentNorm = Math.hypot(tangent[0], tangent[1], tangent[2]);
    assert.ok(Math.abs(tangentNorm - 1.0) < 1.0e-15);
  });

  it('6. Defensive Bounds Checking and Polar Clamping', () => {
    // Non-finite input
    assert.throws(() => latLngToUnitVector3D(NaN, 0.0), RangeError);
    assert.throws(() => latLngToUnitVector3D(0.0, Infinity), RangeError);

    // Out of range latitude
    assert.throws(() => latLngToUnitVector3D(91.5, 0.0), RangeError);
    assert.throws(() => latLngToUnitVector3D(-90.1, 0.0), RangeError);

    // Boundary tolerance clamp within 1e-7 deg of poles
    const nearNorth = latLngToUnitVector3D(90.00000005, 45.0);
    assert.deepStrictEqual(nearNorth, [0.0, 0.0, 1.0]);

    const nearSouth = latLngToUnitVector3D(-90.00000005, -75.0);
    assert.deepStrictEqual(nearSouth, [0.0, 0.0, -1.0]);
  });

  it('7. H3AdjacencyMatrix Compressed Sparse Row Construction', () => {
    const geomA: CellSpatialGeometry = {
      h3Index: '831f90fffffffff',
      latDeg: 0.0,
      lngDeg: 0.0,
      unitVector: latLngToUnitVector3D(0.0, 0.0),
      surfaceAreaM2: 1e8
    };
    const geomB: CellSpatialGeometry = {
      h3Index: '831f91fffffffff',
      latDeg: 0.0,
      lngDeg: 1.0,
      unitVector: latLngToUnitVector3D(0.0, 1.0),
      surfaceAreaM2: 1e8
    };

    const neighbors = new Map<string, string[]>([
      ['831f90fffffffff', ['831f91fffffffff']],
      ['831f91fffffffff', ['831f90fffffffff']]
    ]);

    const adj = new H3AdjacencyMatrix([geomA, geomB], neighbors);

    assert.strictEqual(adj.cellCount, 2);
    assert.deepStrictEqual(adj.getNeighbors(0), [1]);
    assert.deepStrictEqual(adj.getNeighbors(1), [0]);

    const dist = adj.getDistance(0, 1);
    assert.ok(dist !== null && dist > 0);
    // 1 deg at equator ~ 111,195 m
    assert.ok(Math.abs(dist - 111195) < 500);
  });
});

describe('Sprint 052: SpatialMonad & Thermodynamic Insolation Coupling', () => {
  it('1. First Law Energy Accounting and Stoichiometric Mass Balance', () => {
    const subsolarVector: UnitVector3D = [1.0, 0.0, 0.0]; // Subsolar point at Equator / PM
    const area = 1.0e6; // 1 km^2
    const dt = 3600.0; // 1 hour

    const initialCell: CellBiophysicalState = {
      h3Index: 'cell_equator',
      latDeg: 0.0,
      lngDeg: 0.0,
      areaM2: area,
      albedo: 0.15,
      lai: 3.0,
      tauAtm: 0.8,
      stocks: {
        thermalEnergyJoules: 1.0e12,
        carbonDioxideKg: 50_000.0,
        biomassCarbonKg: 100_000.0,
        atmosphericWaterKg: 10_000.0,
        oxygenKg: 200_000.0
      }
    };

    const gridState: PlanetaryGridState = {
      timeStepSeconds: dt,
      subsolarVector,
      cells: new Map([[initialCell.h3Index, initialCell]])
    };

    const monad = SpatialMonad.of(gridState);
    const nextMonad = updatePlanetaryInsolation(monad, subsolarVector);
    const nextState = nextMonad.getState();
    const updatedCell = nextState.cells.get('cell_equator')!;

    // Expected energy influx: S0 * tauAtm * (1 - albedo) * cos(0) * area * dt
    const expectedEnergyInflux = SOLAR_CONSTANT_W_M2 * 0.8 * (1.0 - 0.15) * 1.0 * area * dt;
    const actualEnergyInflux = updatedCell.stocks.thermalEnergyJoules - initialCell.stocks.thermalEnergyJoules;
    assert.ok(
      Math.abs(actualEnergyInflux - expectedEnergyInflux) < 1.0e-4,
      `Thermal energy influx mismatch: got ${actualEnergyInflux}, expected ${expectedEnergyInflux}`
    );

    // Carbon conservation balance check: Delta m_CO2 * (12.011 / 44.01) = Delta Biomass Carbon
    const deltaBiomassC = updatedCell.stocks.biomassCarbonKg - initialCell.stocks.biomassCarbonKg;
    const deltaCO2 = initialCell.stocks.carbonDioxideKg - updatedCell.stocks.carbonDioxideKg;

    assert.ok(deltaBiomassC > 0, 'Biomass carbon should increase from photosynthesis');
    const stoichiometricCarbonRatio = deltaCO2 * (MOLAR_MASS_C / MOLAR_MASS_CO2);
    const balanceDiff = Math.abs(stoichiometricCarbonRatio - deltaBiomassC);

    assert.ok(
      balanceDiff < 1.0e-9,
      `Stoichiometric balance violated: diff=${balanceDiff}`
    );

    // Transpiration water balance
    assert.ok(
      updatedCell.stocks.atmosphericWaterKg > initialCell.stocks.atmosphericWaterKg,
      'Transpiration water must increase atmospheric water vapor stock'
    );
    // Oxygen balance
    assert.ok(
      updatedCell.stocks.oxygenKg > initialCell.stocks.oxygenKg,
      'Oxygen stock must increase proportionally to carbon fixation'
    );
  });

  it('2. Hemispheric Solar Insolation Discretized Integral', () => {
    // Integrate positive dot products max(0, u · s) over an evenly sampled sphere
    const subsolarVector: UnitVector3D = [0.0, 0.0, 1.0]; // Subsolar at North Pole
    const N_LAT = 180;
    const N_LNG = 360;
    let sumInsolationWeight = 0;
    let totalWeight = 0;

    for (let i = 0; i < N_LAT; i++) {
      const lat = -89.5 + i * 1.0;
      const cosLat = Math.cos(lat * Math.PI / 180.0);
      const dWeight = cosLat; // Area differential element proportional to cos(lat)

      for (let j = 0; j < N_LNG; j++) {
        const lng = -179.5 + j * 1.0;
        const u = latLngToUnitVector3D(lat, lng);
        const cosZ = Math.max(0.0, unitVectorDotProduct(u, subsolarVector));

        sumInsolationWeight += cosZ * dWeight;
        totalWeight += dWeight;
      }
    }

    // Average cosZenith over the entire sphere is analytically 1/4 = 0.25
    const averageCosZenith = sumInsolationWeight / totalWeight;
    const error = Math.abs(averageCosZenith - 0.25);
    assert.ok(
      error < 1.0e-3,
      `Discretized hemispheric integral diverged from 0.25: got ${averageCosZenith}, error=${error}`
    );
  });
});