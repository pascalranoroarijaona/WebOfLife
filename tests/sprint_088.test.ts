/**
 * Test Suite for Sprint 088: Aperture-Scale Invariance & In-Situ Metabolism
 * Built using Node.js native test runner (node:test) and assert library.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  hasZeroApertureSequence,
  H3Grid,
  H3AdjacencyService,
} from '../src/spatial/h3_adjacency.js';
import {
  SpatialFluxMonad,
  EcologicalStockState,
} from '../src/spatial/spatial_flux_monad.js';
import { H3DirectionDigit } from '../src/spatial/h3_types.js';

describe('Sprint 088: Aperture Digit Sequence Invariance & Hierarchical Projections', () => {
  const initialStocks: EcologicalStockState = {
    carbonBiomassKg: 14000.0,
    carbonSomKg: 28000.0,
    carbonAtmKg: 7000.0,
    waterLiquidKg: 35000.0,
    waterVaporKg: 1400.0,
    oxygenKg: 8400.0,
    mineralsKg: 21000.0,
    thermalEnergyJoules: 1.4e10,
  };

  describe('hasZeroApertureSequence Predicate', () => {
    it('TC-088-01: identifies zero-aperture center paths of arbitrary lengths', () => {
      assert.strictEqual(hasZeroApertureSequence([]), true);
      assert.strictEqual(hasZeroApertureSequence([0]), true);
      assert.strictEqual(hasZeroApertureSequence([0, 0]), true);
      assert.strictEqual(hasZeroApertureSequence([0, 0, 0, 0, 0]), true);
    });

    it('TC-088-02: detects non-zero aperture digits along the sequence', () => {
      assert.strictEqual(hasZeroApertureSequence([1]), false);
      assert.strictEqual(hasZeroApertureSequence([0, 1]), false);
      assert.strictEqual(hasZeroApertureSequence([0, 0, 3]), false);
      assert.strictEqual(hasZeroApertureSequence([6, 0, 0]), false);
      assert.strictEqual(hasZeroApertureSequence([0, 0, 0, 2, 0]), false);
    });
  });

  describe('Geodesic Centroid Projections', () => {
    const grid = new H3Grid();
    const service = new H3AdjacencyService(grid);
    const origin = { latitude: 37.7749, longitude: -122.4194 };

    it('TC-088-03: preserves exact geodesic coordinates on zero-digit center sequences', () => {
      const pathCenter: H3DirectionDigit[] = [0, 0, 0];
      const projected = grid.projectCentroid(origin, pathCenter);

      assert.strictEqual(projected.latitude, origin.latitude);
      assert.strictEqual(projected.longitude, origin.longitude);
      assert.strictEqual(service.isCenterPath(pathCenter), true);
    });

    it('TC-088-04: applies lateral displacement on peripheral aperture sequences', () => {
      const pathPeripheral: H3DirectionDigit[] = [0, 2, 0];
      const projected = grid.projectCentroid(origin, pathPeripheral);

      assert.notStrictEqual(projected.latitude, origin.latitude);
      assert.notStrictEqual(projected.longitude, origin.longitude);
      assert.strictEqual(service.isCenterPath(pathPeripheral), false);
    });
  });

  describe('SpatialFluxMonad Hierarchical Stock Scaling', () => {
    const monad = SpatialFluxMonad.of(initialStocks);

    it('TC-088-05: conserves stock density across center aperture scaling (invariant)', () => {
      const centerPath: H3DirectionDigit[] = [0];
      const result = monad.projectHierarchicalPath(centerPath);

      assert.strictEqual(result.isApertureInvariant, true);
      assert.strictEqual(result.entropyGeneratedJoulesPerKelvin, 0.0);

      // Verify exact 1/7 area scaling
      assert.strictEqual(result.targetState.carbonBiomassKg, initialStocks.carbonBiomassKg / 7);
      assert.strictEqual(result.targetState.waterLiquidKg, initialStocks.waterLiquidKg / 7);
      assert.strictEqual(result.targetState.thermalEnergyJoules, initialStocks.thermalEnergyJoules / 7);

      // Verify zero lateral flux deltas
      assert.strictEqual(result.lateralDeltas.deltaCarbonBiomassKg, 0);
      assert.strictEqual(result.lateralDeltas.deltaCarbonAtmKg, 0);
      assert.strictEqual(result.lateralDeltas.deltaWaterVaporKg, 0);
      assert.strictEqual(result.lateralDeltas.deltaThermalEnergyJoules, 0);
    });

    it('TC-088-06: introduces lateral dissipation on peripheral paths (Second Law of Thermodynamics)', () => {
      const peripheralPath: H3DirectionDigit[] = [2];
      const result = monad.projectHierarchicalPath(peripheralPath);

      assert.strictEqual(result.isApertureInvariant, false);
      assert.ok(result.entropyGeneratedJoulesPerKelvin > 0.0);
      assert.ok(result.lateralDeltas.deltaThermalEnergyJoules < 0.0);
      assert.ok(result.lateralDeltas.deltaCarbonAtmKg < 0.0);
      assert.ok(result.lateralDeltas.deltaWaterVaporKg < 0.0);
    });
  });

  describe('In-Situ Cell Metabolism Integration', () => {
    it('TC-088-07: maintains stoichiometric mass conservation during respiration', () => {
      const monad = SpatialFluxMonad.of(initialStocks);
      const carbonRespired = 120.0; // 120 kg C

      const updatedMonad = monad.stepInSituMetabolism(carbonRespired);
      const state = updatedMonad.getState() as EcologicalStockState;

      // C consumed from biomass
      assert.strictEqual(state.carbonBiomassKg, initialStocks.carbonBiomassKg - carbonRespired);

      // O2 consumed: 120 * (32 / 12) = 320 kg O2
      assert.strictEqual(state.oxygenKg, initialStocks.oxygenKg - (carbonRespired * 32.0) / 12.0);

      // CO2 produced: 120 * (44 / 12) = 440 kg CO2
      assert.strictEqual(state.carbonAtmKg, initialStocks.carbonAtmKg + (carbonRespired * 44.0) / 12.0);

      // H2O produced: 120 * (18 / 12) = 180 kg H2O
      assert.strictEqual(state.waterLiquidKg, initialStocks.waterLiquidKg + (carbonRespired * 18.0) / 12.0);

      // Metabolic heat dissipation
      assert.strictEqual(state.thermalEnergyJoules, initialStocks.thermalEnergyJoules + carbonRespired * 38.92e6);
    });
  });
});