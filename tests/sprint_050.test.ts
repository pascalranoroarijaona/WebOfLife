import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as h3 from 'h3-js';

import {
  calculateH3BoundaryContactArea,
  getH3SharedEdgeLength,
  H3BoundaryContactCalculator,
  H3AdjacencyManager,
} from '../src/spatial/h3_adjacency.js';
import {
  IVerticalStratum,
  IH3BoundaryContactAreaOptions,
} from '../src/spatial/h3_types.js';
import {
  computeLateralBoundaryTransfer,
  ILateralFluxStocks,
  ILateralTransportParams,
} from '../src/monads/spatial_monad.js';
import {
  EARTH_AUTHALIC_RADIUS_METERS,
  DEFAULT_PLANETARY_RADIUS_METERS,
} from '../src/thermodynamics/constants.js';
import { getNominalH3EdgeLength } from '../src/spatial/h3_grid.js';

describe('Sprint 050 - calculateH3BoundaryContactArea & Lateral Flux Dynamics', () => {
  // Select two known adjacent cells at resolution 2
  // Coordinates around (lat 0, lng 0)
  const cellA = h3.latLngToCell(0.0, 0.0, 2);
  const neighborsA = h3.gridDisk(cellA, 1).filter((c) => c !== cellA);
  const cellB = neighborsA[0]; // Guaranteed neighbor
  const nonNeighborCell = h3.latLngToCell(45.0, 45.0, 2); // Far away cell

  it('1. Geometric Adjacency & Boundary Length: should detect adjacency and return positive edge length', () => {
    assert.strictEqual(h3.areNeighborCells(cellA, cellB), true);
    const edgeLength = getH3SharedEdgeLength(cellA, cellB, EARTH_AUTHALIC_RADIUS_METERS);
    assert.ok(edgeLength > 0, `Edge length must be positive, got ${edgeLength}`);

    // Nominal edge length at resolution 2 is around ~500 km
    const nominal = getNominalH3EdgeLength(2, EARTH_AUTHALIC_RADIUS_METERS);
    const ratio = edgeLength / nominal;
    assert.ok(
      ratio > 0.6 && ratio < 1.5,
      `Calculated edge length (${edgeLength}) should be close to nominal (${nominal})`
    );
  });

  it('2. Symmetry Invariant: A(u, v) === A(v, u) to machine precision', () => {
    const stratumA: IVerticalStratum = { zBaseMeters: -100, zTopMeters: 500 };
    const stratumB: IVerticalStratum = { zBaseMeters: 100, zTopMeters: 1000 };

    const resAB = calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB);
    const resBA = calculateH3BoundaryContactArea(cellB, stratumB, cellA, stratumA);

    assert.strictEqual(resAB.isAdjacent, true);
    assert.strictEqual(resBA.isAdjacent, true);
    assert.strictEqual(resAB.overlapHeightMeters, 400); // [100, 500] => 400 m
    assert.strictEqual(resBA.overlapHeightMeters, 400);
    assert.strictEqual(resAB.midPointElevationMeters, 300); // (100 + 500) / 2 = 300 m
    assert.strictEqual(resBA.midPointElevationMeters, 300);

    // Exact floating-point symmetry
    assert.strictEqual(
      resAB.contactAreaM2,
      resBA.contactAreaM2,
      'Contact area must be strictly symmetric: Area(A, B) === Area(B, A)'
    );
    assert.strictEqual(
      resAB.boundaryLengthMeters,
      resBA.boundaryLengthMeters,
      'Boundary length must be strictly symmetric'
    );
  });

  it('3. Non-Adjacent & Self-Intersection: should yield zero contact area', () => {
    const stratum: IVerticalStratum = { zBaseMeters: 0, zTopMeters: 100 };

    // Self cell
    const selfRes = calculateH3BoundaryContactArea(cellA, stratum, cellA, stratum);
    assert.strictEqual(selfRes.isAdjacent, false);
    assert.strictEqual(selfRes.contactAreaM2, 0.0);

    // Far-away non-neighbor cell
    const nonNeighborRes = calculateH3BoundaryContactArea(
      cellA,
      stratum,
      nonNeighborCell,
      stratum
    );
    assert.strictEqual(nonNeighborRes.isAdjacent, false);
    assert.strictEqual(nonNeighborRes.contactAreaM2, 0.0);
  });

  it('4. Disjoint and Inverted Strata: should yield zero overlap and zero area', () => {
    // Disjoint vertical strata
    const stratumA: IVerticalStratum = { zBaseMeters: 0, zTopMeters: 100 };
    const stratumB: IVerticalStratum = { zBaseMeters: 200, zTopMeters: 300 };

    const disjointRes = calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB);
    assert.strictEqual(disjointRes.isAdjacent, true);
    assert.strictEqual(disjointRes.overlapHeightMeters, 0.0);
    assert.strictEqual(disjointRes.contactAreaM2, 0.0);

    // Inverted bounds (base > top) should be clamped safely without error
    const invertedStratumA: IVerticalStratum = { zBaseMeters: 100, zTopMeters: 0 };
    const invertedRes = calculateH3BoundaryContactArea(
      cellA,
      invertedStratumA,
      cellB,
      stratumA
    );
    assert.strictEqual(invertedRes.overlapHeightMeters, 100.0);
    assert.ok(invertedRes.contactAreaM2 > 0);
  });

  it('5. Spherical Radial Expansion Scaling: gamma = 1 + z_mid / R', () => {
    const stratumLow: IVerticalStratum = { zBaseMeters: 0, zTopMeters: 1000 };
    const stratumHigh: IVerticalStratum = { zBaseMeters: 50_000, zTopMeters: 51_000 };

    const optionsExpanded: IH3BoundaryContactAreaOptions = { applyRadialExpansion: true };
    const optionsUnexpanded: IH3BoundaryContactAreaOptions = { applyRadialExpansion: false };

    const resUnexpanded = calculateH3BoundaryContactArea(
      cellA,
      stratumHigh,
      cellB,
      stratumHigh,
      optionsUnexpanded
    );
    const resExpanded = calculateH3BoundaryContactArea(
      cellA,
      stratumHigh,
      cellB,
      stratumHigh,
      optionsExpanded
    );

    // Expected expansion ratio: 1 + (50500 / 6371007.2) ≈ 1.0079267
    const expectedGamma = 1.0 + 50_500.0 / EARTH_AUTHALIC_RADIUS_METERS;
    const actualRatio = resExpanded.contactAreaM2 / resUnexpanded.contactAreaM2;

    assert.ok(
      Math.abs(actualRatio - expectedGamma) < 1e-6,
      `Expansion ratio ${actualRatio} should match theoretical gamma ${expectedGamma}`
    );
  });

  it('6. Class-based Architecture: H3BoundaryContactCalculator & H3AdjacencyManager', () => {
    const manager = new H3AdjacencyManager();
    assert.strictEqual(manager.areAdjacent(cellA, cellB), true);
    assert.strictEqual(manager.areAdjacent(cellA, nonNeighborCell), false);

    const neighbors = manager.getNeighbors(cellA);
    assert.ok(neighbors.length === 5 || neighbors.length === 6);
    assert.ok(neighbors.includes(cellB));

    const stratum: IVerticalStratum = { zBaseMeters: 0, zTopMeters: 200 };
    const result = manager.getBoundaryContactArea(cellA, stratum, cellB, stratum);
    assert.strictEqual(result.isAdjacent, true);
    assert.ok(result.contactAreaM2 > 0);

    const calc = manager.getCalculator();
    const overlap = calc.calculateVerticalOverlap(
      { zBaseMeters: 10, zTopMeters: 50 },
      { zBaseMeters: 30, zTopMeters: 80 }
    );
    assert.strictEqual(overlap.overlapHeightMeters, 20);
    assert.strictEqual(overlap.midPointElevationMeters, 40);
  });

  it('7. Thermodynamic Invariance: Conservation of Mass and Energy in Lateral Transport', () => {
    const stratumA: IVerticalStratum = { zBaseMeters: 0, zTopMeters: 100 };
    const stratumB: IVerticalStratum = { zBaseMeters: 0, zTopMeters: 100 };

    const initialStocksA: ILateralFluxStocks = {
      massWaterKg: 100_000.0,
      massCarbonKg: 500.0,
      massOxygenKg: 250.0,
      massMineralsKg: 150.0,
      internalEnergyJoules: 1.0e9,
    };

    const initialStocksB: ILateralFluxStocks = {
      massWaterKg: 80_000.0,
      massCarbonKg: 300.0,
      massOxygenKg: 180.0,
      massMineralsKg: 100.0,
      internalEnergyJoules: 8.0e8,
    };

    const params: ILateralTransportParams = {
      timeStepSeconds: 3600.0,
      normalVelocityMs: 0.05, // 0.05 m/s advective flow A -> B
      fluidDensityKgM3: 1000.0,
      thermalConductivityWMK: 2.5,
      distanceCentroidsMeters: 200_000.0,
      temperatureKelvinA: 290.0,
      temperatureKelvinB: 285.0,
    };

    const transfer = computeLateralBoundaryTransfer(
      cellA,
      stratumA,
      initialStocksA,
      cellB,
      stratumB,
      initialStocksB,
      params
    );

    assert.strictEqual(transfer.contactResult.isAdjacent, true);
    assert.ok(transfer.contactResult.contactAreaM2 > 0);

    // Verify exact anti-symmetry: deltaStocksA + deltaStocksB === 0
    const deltaSumWater = transfer.deltaStocksA.massWaterKg + transfer.deltaStocksB.massWaterKg;
    const deltaSumCarbon = transfer.deltaStocksA.massCarbonKg + transfer.deltaStocksB.massCarbonKg;
    const deltaSumOxygen = transfer.deltaStocksA.massOxygenKg + transfer.deltaStocksB.massOxygenKg;
    const deltaSumMinerals = transfer.deltaStocksA.massMineralsKg + transfer.deltaStocksB.massMineralsKg;
    const deltaSumEnergy = transfer.deltaStocksA.internalEnergyJoules + transfer.deltaStocksB.internalEnergyJoules;

    assert.ok(
      Math.abs(deltaSumWater) < 1e-9,
      `Water conservation violated: sum = ${deltaSumWater}`
    );
    assert.ok(
      Math.abs(deltaSumCarbon) < 1e-9,
      `Carbon conservation violated: sum = ${deltaSumCarbon}`
    );
    assert.ok(
      Math.abs(deltaSumOxygen) < 1e-9,
      `Oxygen conservation violated: sum = ${deltaSumOxygen}`
    );
    assert.ok(
      Math.abs(deltaSumMinerals) < 1e-9,
      `Mineral conservation violated: sum = ${deltaSumMinerals}`
    );
    assert.ok(
      Math.abs(deltaSumEnergy) < 1e-7,
      `Energy conservation violated: sum = ${deltaSumEnergy}`
    );

    // Negative delta for A, positive delta for B
    assert.ok(transfer.deltaStocksA.massWaterKg < 0);
    assert.ok(transfer.deltaStocksB.massWaterKg > 0);
  });
});