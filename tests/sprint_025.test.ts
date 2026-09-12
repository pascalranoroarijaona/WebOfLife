/**
 * @file tests/sprint_025.test.ts
 * @description Unit tests for Sprint 25 Thermodynamic State Vector Interface Contracts,
 * Entropy Generation (\dot{S}_{gen} >= 0), Exergy Destruction (\dot{I} = T_0 \dot{S}_{gen}),
 * and Thermodynamic Monad safety.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  computeEntropyGeneration,
  computeExergyDestruction,
  ThermodynamicMonad
} from '../src/thermodynamics/methods.js';
import {
  ThermodynamicStateSnapshot,
  ThermodynamicVector,
  BoundaryFluxArray,
  EntropyGenerationMetrics,
  ExergyDestructionMetrics
} from '../src/thermodynamics/types.js';

describe('Sprint 25: Thermodynamic State Vector Interface Contracts & Methods', () => {
  it('should compute non-negative entropy generation rates adhering to Second Law', () => {
    const metrics = computeEntropyGeneration(1000, 300, 5.0, 2.0);
    assert.strictEqual(metrics.thermalDissipation, 1000 / 300);
    assert.strictEqual(metrics.chemicalReactionEntropy, 5.0);
    assert.strictEqual(metrics.diffusiveTransportEntropy, 2.0);
    assert.ok(metrics.totalEntropyGenerationRate >= 0);
  });

  it('should throw an error if entropy generation rate is artificially negative', () => {
    assert.throws(() => {
      // Internal override or mocking negative chemistry dissipation
      computeEntropyGeneration(0, 300, -10.0, 0);
    }, /ThermodynamicViolationError/);
  });

  it('should compute exergy destruction rate via Gouy-Stodola theorem (I = T_0 * S_gen)', () => {
    const entropyMetrics: EntropyGenerationMetrics = {
      thermalDissipation: 2.0,
      chemicalReactionEntropy: 1.0,
      diffusiveTransportEntropy: 0.5,
      totalEntropyGenerationRate: 3.5
    };

    const exergyMetrics = computeExergyDestruction(entropyMetrics, 50, 200);
    assert.strictEqual(exergyMetrics.ambientTemperatureReference, 298.15);
    assert.strictEqual(exergyMetrics.exergyDestructionRate, 298.15 * 3.5);
    assert.ok(exergyMetrics.secondLawEfficiency >= 0 && exergyMetrics.secondLawEfficiency <= 1);
  });

  it('should wrap states in ThermodynamicMonad and validate Second Law compliance', () => {
    const mockVector: ThermodynamicVector = {
      timestamp: 0,
      internalEnergy: 1e6,
      totalEntropy: 500,
      entropy: 500,
      ambientTemperature: 298.15,
      ambientReferenceTemp: 298.15,
      entropyGenerationRate: 1.7,
      exergyDestructionRate: 298.15 * 1.7,
      stocks: {},
      temperature: 298.15,
      pressure: 101325,
      volume_V: 1.0,
      enthalpy: 1.1e6,
      exergy: 2e5,
      boundaryFluxes: { solarRadiationIn: 1000, longwaveRadiationOut: 900, sensibleHeatFlux: 0, latentHeatFlux: 0, netMassFlux: 0, heatFluxes: [], massFluxes: [] }
    };

    const mockFluxItem = {
      speciesId: 'CO2',
      molarRate: 1.0,
      massRate: 44.0,
      enthalpyFlux: 100,
      entropyFlux: 1.0,
      exergyFlux: 80
    };

    const mockBoundaryFluxes: BoundaryFluxArray = {
      solarRadiationIn: 1000,
      longwaveRadiationOut: 900,
      sensibleHeatFlux: 0,
      latentHeatFlux: 0,
      netMassFlux: 0,
      matterFluxes: [mockFluxItem],
      massFluxes: [mockFluxItem],
      netHeatFlux: 500,
      netWorkFlux: 0,
      heatFluxes: []
    };

    const entropyMetrics: EntropyGenerationMetrics = {
      thermalDissipation: 1.0,
      chemicalReactionEntropy: 0.5,
      diffusiveTransportEntropy: 0.2,
      totalEntropyGenerationRate: 1.7
    };

    const exergyMetrics: ExergyDestructionMetrics = {
      ambientTemperatureReference: 298.15,
      exergyDestructionRate: 298.15 * 1.7,
      secondLawEfficiency: 0.85
    };

    const initialState: ThermodynamicStateSnapshot = {
      timestamp: 0,
      stateVector: mockVector,
      boundaryFluxes: mockBoundaryFluxes,
      entropyMetrics,
      exergyMetrics
    };

    const monad = ThermodynamicMonad.unit(initialState);
    assert.strictEqual(monad.getState().timestamp, 0);

    const nextMonad = monad.chain((curr: any) => ({
      ...curr,
      timestamp: 1,
      entropyMetrics: {
        ...curr.entropyMetrics,
        totalEntropyGenerationRate: 2.0
      }
    }));

    assert.strictEqual(nextMonad.getState().timestamp, 1);
  });

  it('should reject monad state transitions that violate the Second Law', () => {
    const mockVector: ThermodynamicVector = {
      timestamp: 0,
      internalEnergy: 1e6,
      totalEntropy: 500,
      entropy: 500,
      ambientTemperature: 298.15,
      ambientReferenceTemp: 298.15,
      entropyGenerationRate: 1.0,
      exergyDestructionRate: 298.15,
      stocks: {},
      temperature: 298.15,
      pressure: 101325,
      volume_V: 1.0,
      enthalpy: 1.1e6,
      exergy: 2e5,
      boundaryFluxes: { solarRadiationIn: 1000, longwaveRadiationOut: 900, sensibleHeatFlux: 0, latentHeatFlux: 0, netMassFlux: 0, heatFluxes: [], massFluxes: [] }
    };

    const boundaryFluxes: BoundaryFluxArray = {
      solarRadiationIn: 1000,
      longwaveRadiationOut: 900,
      sensibleHeatFlux: 0,
      latentHeatFlux: 0,
      netMassFlux: 0,
      matterFluxes: [],
      massFluxes: [],
      netHeatFlux: 100,
      netWorkFlux: 0,
      heatFluxes: []
    };

    const initialState: ThermodynamicStateSnapshot = {
      timestamp: 0,
      stateVector: mockVector,
      boundaryFluxes,
      entropyMetrics: {
        thermalDissipation: 1.0,
        chemicalReactionEntropy: 0,
        diffusiveTransportEntropy: 0,
        totalEntropyGenerationRate: 1.0
      },
      exergyMetrics: {
        ambientTemperatureReference: 298.15,
        exergyDestructionRate: 298.15,
        secondLawEfficiency: 0.9
      }
    };

    const monad = ThermodynamicMonad.unit(initialState);

    assert.throws(() => {
      monad.chain((curr: any) => ({
        ...curr,
        timestamp: 1,
        entropyMetrics: {
          ...curr.entropyMetrics,
          totalEntropyGenerationRate: -0.5 // Violation!
        }
      }));
    }, /ThermodynamicViolationError/);
  });
});