import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateVector, validateThermodynamicInvariants, ThermodynamicMonad } from '../src/thermodynamics/types.js';
import { EarthPOD, bootstrapMegaPod } from '../src/earth_pod.js';

describe('Sprint 003: Thermodynamic State Vector & Invariants', () => {
  it('should validate valid thermodynamic state vectors correctly', () => {
    const state: ThermodynamicStateVector = {
      timestamp: 1000,
      internalEnergy: 500000,
      totalMass: 1000,
      temperature: 298.15,
      fluxes: {
        radiativeFlux: 100,
        convectiveFlux: 10,
        massEnthalpyFlux: 5,
        speciesMassFluxes: { carbon: 0.1 },
      },
      entropyMetrics: {
        sGenRate: 2.5,
        referenceTemperature: 288.15,
        exergyDestructionRate: 288.15 * 2.5,
      },
      system: {
        temperature: 298.15,
        internalEnergy: 500000,
        entropy: 1676.67,
        exergy: 100000,
      },
      ambientReference: {
        temperature0: 288.15,
        pressure0: 101325,
      },
      entropyGenerationRate: 2.5,
      exergyDestructionRate: 288.15 * 2.5,
    };

    assert.strictEqual(validateThermodynamicInvariants(state), true);
  });

  it('should reject negative internal entropy generation (Second Law violation)', () => {
    const invalidState: ThermodynamicStateVector = {
      timestamp: 1000,
      internalEnergy: 500000,
      totalMass: 1000,
      temperature: 298.15,
      fluxes: {
        radiativeFlux: 100,
        convectiveFlux: 10,
        massEnthalpyFlux: 5,
        speciesMassFluxes: {},
      },
      entropyMetrics: {
        sGenRate: -1.0, // Violation
        referenceTemperature: 288.15,
        exergyDestructionRate: 288.15,
      },
      system: {
        temperature: 298.15,
        internalEnergy: 500000,
        entropy: 1676.67,
        exergy: 100000,
      },
      ambientReference: {
        temperature0: 288.15,
        pressure0: 101325,
      },
      entropyGenerationRate: -1.0,
      exergyDestructionRate: 288.15,
    };

    assert.throws(() => {
      validateThermodynamicInvariants(invalidState);
    }, /Second Law Violation/);
  });

  it('should reject exergy destruction mismatch', () => {
    const invalidState: ThermodynamicStateVector = {
      timestamp: 1000,
      internalEnergy: 500000,
      totalMass: 1000,
      temperature: 298.15,
      fluxes: {
        radiativeFlux: 100,
        convectiveFlux: 10,
        massEnthalpyFlux: 5,
        speciesMassFluxes: {},
      },
      entropyMetrics: {
        sGenRate: 2.0,
        referenceTemperature: 288.15,
        exergyDestructionRate: 9999.0, // Mismatch with T_0 * S_dot
      },
      system: {
        temperature: 298.15,
        internalEnergy: 500000,
        entropy: 1676.67,
        exergy: 100000,
      },
      ambientReference: {
        temperature0: 288.15,
        pressure0: 101325,
      },
      entropyGenerationRate: 2.0,
      exergyDestructionRate: 9999.0,
    };

    assert.throws(() => {
      validateThermodynamicInvariants(invalidState);
    }, /Exergy Destruction mismatch/);
  });

  it('should successfully transform states via ThermodynamicMonad', () => {
    const initialState: ThermodynamicStateVector = {
      timestamp: 0,
      internalEnergy: 10000,
      totalMass: 500,
      temperature: 300,
      fluxes: {
        radiativeFlux: 50,
        convectiveFlux: 5,
        massEnthalpyFlux: 0,
        speciesMassFluxes: { water: 0.01 },
      },
      entropyMetrics: {
        sGenRate: 1.2,
        referenceTemperature: 288.15,
        exergyDestructionRate: 288.15 * 1.2,
      },
      system: {
        temperature: 300,
        internalEnergy: 10000,
        entropy: 33.33,
        exergy: 1000,
      },
      ambientReference: {
        temperature0: 288.15,
        pressure0: 101325,
      },
      entropyGenerationRate: 1.2,
      exergyDestructionRate: 288.15 * 1.2,
    };

    const monad = ThermodynamicMonad.of(initialState).transform(1.5, 10.0);
    const resultState = monad.getStateVector();

    assert.strictEqual(resultState.timestamp, 10.0);
    assert.strictEqual(resultState.entropyMetrics.sGenRate, 1.5);
    assert.strictEqual(resultState.entropyMetrics.exergyDestructionRate, 288.15 * 1.5);
    assert.strictEqual(monad.validate().isValid, true);
  });

  it('should integrate correctly with EarthPOD and bootstrapMegaPod', () => {
    const { sun, earth } = bootstrapMegaPod();
    assert.ok(earth);
    assert.ok(sun);

    const stateVec = earth.getStateVector();
    assert.strictEqual(validateThermodynamicInvariants(stateVec), true);
  });
});