import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateVector, validateThermodynamicInvariants, ThermodynamicMonad } from '../src/thermodynamics/types.js';
import { EarthPOD, bootstrapMegaPod } from '../src/earth_pod.js';

describe('Sprint 003: Thermodynamic State Vector & Invariants', () => {
  it('should validate valid thermodynamic state vectors correctly', () => {
    const state: ThermodynamicStateVector = {
      timestamp: 1000,
      T_0: 288.15,
      internalEnergy: 500000,
      totalMass: 1000,
      mass: 1000,
      temperature: 298.15,
      ambientTemperature: 288.15,
      entropy: 1676.67,
      exergy: 100000,
      boundaryHeatFlux: {},
      boundaryFluxes: [],
      massInventory: { carbon: 450 },
      stocks: {
        carbon: 450,
        nitrogen: 40,
        phosphorus: 5,
        oxygen: 200,
        water: 300,
        energyStored: 500000,
        qLoss: 0
      },
      fluxes: {
        radiativeFlux: 100,
        convectiveFlux: 10,
        massEnthalpyFlux: 5,
        speciesMassFluxes: { carbon: 0.1 },
      },
      entropyMetrics: {
        sGenRate: 2.5,
        exergyDestruction: 288.15 * 2.5,
        cumulativeQLoss: 0,
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
      T_0: 288.15,
      internalEnergy: 500000,
      totalMass: 1000,
      mass: 1000,
      temperature: 298.15,
      ambientTemperature: 288.15,
      entropy: 1676.67,
      exergy: 100000,
      boundaryHeatFlux: {},
      boundaryFluxes: [],
      massInventory: { carbon: 450 },
      stocks: {
        carbon: 450,
        nitrogen: 40,
        phosphorus: 5,
        oxygen: 200,
        water: 300,
        energyStored: 500000,
        qLoss: 0
      },
      fluxes: {
        radiativeFlux: 100,
        convectiveFlux: 10,
        massEnthalpyFlux: 5,
        speciesMassFluxes: {},
      },
      entropyMetrics: {
        sGenRate: -1.0, // Violation
        exergyDestruction: -288.15,
        cumulativeQLoss: 0,
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
      T_0: 288.15,
      internalEnergy: 500000,
      totalMass: 1000,
      mass: 1000,
      temperature: 298.15,
      ambientTemperature: 288.15,
      entropy: 1676.67,
      exergy: 100000,
      boundaryHeatFlux: {},
      boundaryFluxes: [],
      massInventory: { carbon: 450 },
      stocks: {
        carbon: 450,
        nitrogen: 40,
        phosphorus: 5,
        oxygen: 200,
        water: 300,
        energyStored: 500000,
        qLoss: 0
      },
      fluxes: {
        radiativeFlux: 100,
        convectiveFlux: 10,
        massEnthalpyFlux: 5,
        speciesMassFluxes: {},
      },
      entropyMetrics: {
        sGenRate: 2.0,
        exergyDestruction: 9999.0,
        cumulativeQLoss: 0,
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
      T_0: 288.15,
      internalEnergy: 10000,
      totalMass: 500,
      mass: 500,
      temperature: 300,
      ambientTemperature: 288.15,
      entropy: 33.33,
      exergy: 1000,
      boundaryHeatFlux: {},
      boundaryFluxes: [],
      massInventory: { carbon: 225 },
      stocks: {
        carbon: 225,
        nitrogen: 20,
        phosphorus: 2.5,
        oxygen: 100,
        water: 150,
        energyStored: 10000,
        qLoss: 0
      },
      fluxes: {
        radiativeFlux: 50,
        convectiveFlux: 5,
        massEnthalpyFlux: 0,
        speciesMassFluxes: { water: 0.01 },
      },
      entropyMetrics: {
        sGenRate: 1.2,
        exergyDestruction: 288.15 * 1.2,
        cumulativeQLoss: 0,
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
    assert.ok(resultState.entropyMetrics);
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