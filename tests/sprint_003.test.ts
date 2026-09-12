// File: tests/sprint_003.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateMonad, ThermodynamicStateVector } from '../src/thermodynamics/types.js';

describe('Sprint 003: Thermodynamic Monad Tests', () => {
  it('TC-01: ThermodynamicMonad wraps values and states successfully', () => {
    const mockVector: ThermodynamicStateVector = {
      timestamp: 0,
      ambientTemperature: 288.15,
      systemTemperature: 288.15,
      internalEnergy: 10000,
      totalEntropy: 33.33,
      entropy: 33.33,
      temperature: 288.15,
      ambientReferenceTemp: 288.15,
      referenceTemperature: 288.15,
      entropyGenerationRate: 1.0,
      exergyDestructionRate: 288.15,
      exergy: 1e10,
      stocks: {},
      boundaryFluxes: {
        solarRadiationIn: 0,
        longwaveRadiationOut: 0,
        sensibleHeatFlux: 0,
        latentHeatFlux: 0,
        netMassFlux: 0,
        heatFluxes: [],
        radiativeNet: 0,
        massFluxes: []
      }
    };

    const monad = ThermodynamicStateMonad.of(mockVector);
    assert.ok(monad);
    const validation = monad.validate();
    const isValid = validation.isValid ?? validation.isSecondLawSatisfied;
    assert.strictEqual(isValid, true);
  });
});