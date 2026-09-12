// File: tests/sprint_002.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { evaluateThermodynamicState, assertSecondLaw, ThermodynamicStateVector } from '../src/thermodynamics/types.js';

describe('Sprint 002: Thermodynamic State Vector & State Validation Tests', () => {
  it('TC-01: Evaluates valid thermodynamic state correctly', () => {
    const prevState: ThermodynamicStateVector = {
      timestamp: 0,
      ambientTemperature: 288.15,
      systemTemperature: 288.15,
      internalEnergy: 1000000,
      totalEntropy: 3470.4,
      entropy: 3470.4,
      entropyGenerationRate: 10.0,
      exergyDestructionRate: 2881.5,
      referenceTemperature: 288.15,
      boundaryFluxes: {
        heatFluxes: new Map(),
        radiativeNet: 0,
        massFluxes: new Map(),
        solarRadiationIn: 1000,
        thermalRadiationOut: 900,
        sensibleHeatFlux: 50,
        latentHeatFlux: 50,
        netMassEnthalpyFlux: 0
      }
    };

    const nextState = evaluateThermodynamicState(
      prevState,
      1000050,
      288.15,
      288.15,
      {
        heatFluxes: new Map(),
        radiativeNet: 100,
        massFluxes: new Map(),
        solarRadiationIn: 1000,
        thermalRadiationOut: 900,
        sensibleHeatFlux: 50,
        latentHeatFlux: 50,
        netMassEnthalpyFlux: 0
      },
      1.0
    );

    assert.strictEqual(nextState.timestamp, 1.0);
    assert.ok(nextState.entropyGenerationRate >= 0);
    assert.strictEqual(assertSecondLaw(nextState), true);
  });
});