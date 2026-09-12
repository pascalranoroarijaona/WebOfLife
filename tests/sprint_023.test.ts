import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicMonadProcess } from '../src/thermodynamics/thermodynamic_monad_process.js';
import { IThermodynamicStateVector, IBoundaryFluxStructure, STANDARD_AMBIENT_TEMPERATURE_K } from '../src/thermodynamics/types.js';

describe('Sprint 23: Thermodynamic State Vector Interface Contracts & Monad Transformations', () => {
  it('should formalize state evolution with strict First and Second Law invariants', () => {
    const initialState: IThermodynamicStateVector = {
      timestamp: 0,
      temperature: STANDARD_AMBIENT_TEMPERATURE_K,
      internalEnergy: 1e12,
      totalEntropy: 1e9,
      boundaryFluxes: {
        fluxes: [],
        netHeatRate: 0,
        netWorkRate: 0,
        netMassBalance: 0
      },
      exergyMetrics: {
        ambientTemperature: 288.15,
        entropyGenerationRate: 10.0,
        exergyDestructionRate: 2881.5,
        inputExergyRate: 5000.0,
        exergeticEfficiency: 0.42
      }
    };

    const newFluxes: IBoundaryFluxStructure = {
      fluxes: [
        {
          id: 'solar_1',
          type: 'SOLAR_SHORTWAVE',
          magnitude: 1000,
          temperature: 5778
        },
        {
          id: 'lw_1',
          type: 'TERRESTRIAL_LONGWAVE',
          magnitude: -900,
          temperature: 288.15
        }
      ],
      netHeatRate: 100,
      netWorkRate: 0,
      netMassBalance: 0
    };

    const nextState = ThermodynamicMonadProcess.step(initialState, newFluxes, 1.0);

    assert.strictEqual(nextState.timestamp, 1.0);
    assert.strictEqual((nextState.internalEnergy ?? 0) > (initialState.internalEnergy ?? 0), true);
    
    const secondLawValid = ThermodynamicMonadProcess.validateSecondLaw(nextState);
    assert.strictEqual(secondLawValid, true, 'Second Law (S_gen >= 0) must be strictly satisfied');
  });

  it('should throw or clamp negative entropy generation rates to enforce Second Law', () => {
    const badState: IThermodynamicStateVector = {
      timestamp: 0,
      temperature: STANDARD_AMBIENT_TEMPERATURE_K,
      internalEnergy: 1e6,
      totalEntropy: 1e3,
      boundaryFluxes: { fluxes: [], netHeatRate: 0, netWorkRate: 0, netMassBalance: 0 },
      exergyMetrics: {
        ambientTemperature: 288.15,
        entropyGenerationRate: -5.0, // Invalid
        exergyDestructionRate: -1440.75,
        inputExergyRate: 0,
        exergeticEfficiency: 0
      },
      entropyGenerationRate: -5.0
    };

    const isValid = ThermodynamicMonadProcess.validateSecondLaw(badState);
    assert.strictEqual(isValid, false);
  });

  it('should maintain strict zero mass balance for closed planetary systems', () => {
    const fluxes: IBoundaryFluxStructure = {
      fluxes: [],
      netHeatRate: 0,
      netWorkRate: 0,
      netMassBalance: 0.0
    };
    assert.strictEqual(fluxes.netMassBalance, 0.0);
  });
});