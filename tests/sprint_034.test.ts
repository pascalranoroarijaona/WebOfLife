import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateValidator } from '../src/thermodynamics/state_validator.js';
import { ThermodynamicMonad } from '../src/thermodynamic_monad_process.js';
import { IThermodynamicStateVector, STANDARD_AMBIENT_TEMPERATURE_K, ThermodynamicStateVector } from '../src/thermodynamics/types.js';

describe('Sprint 034: Thermodynamic State Vector Non-Negative Entropy Assertion', () => {
  const validator = new StateValidator();

  const createMockVector = (entropy: number, entropyGenerationRate: number): ThermodynamicStateVector => new ThermodynamicStateVector({
    timestamp: 0,
    internalEnergy: 1e6,
    totalEntropy: entropy,
    entropy,
    temperature: STANDARD_AMBIENT_TEMPERATURE_K,
    systemTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
    ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
    ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
    stocks: {},
    entropyGenerationRate,
    exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * entropyGenerationRate,
    exergy: 1e5,
    boundaryFluxes: {
      solarRadiationIn: 1e3,
      longwaveRadiationOut: 1e3,
      sensibleHeatFlux: 0,
      latentHeatFlux: 0,
      netMassFlux: 0,
      heatFluxes: [],
      massFluxes: []
    }
  });

  it('TC-S34-01: Valid state passes validation without error', () => {
    const vector = createMockVector(150.5, 4.2);
    assert.doesNotThrow(() => {
      validator.assertValidState(vector);
    });
  });

  it('TC-S34-02: Negative absolute entropy triggers ThermodynamicViolationError', () => {
    const vector = createMockVector(-0.001, 2.0);
    assert.throws(() => {
      validator.assertValidState(vector);
    });
  });

  it('TC-S34-03: Negative entropy generation rate triggers ThermodynamicViolationError', () => {
    const vector = createMockVector(50.0, -0.1);
    assert.throws(() => {
      validator.assertValidState(vector);
    });
  });

  it('TC-S34-04: Non-finite entropy (NaN) triggers ThermodynamicViolationError', () => {
    const vector = createMockVector(NaN, 1.0);
    assert.throws(() => {
      validator.assertValidState(vector);
    });
  });

  it('TC-S34-05: Non-finite entropy generation rate (Infinity) triggers ThermodynamicViolationError', () => {
    const vector = createMockVector(100.0, Infinity);
    assert.throws(() => {
      validator.assertValidState(vector);
    });
  });

  it('ThermodynamicMonad.map correctly intercepts and validates state transitions', () => {
    const initialVector = createMockVector(100, 5);

    const validTransition = (v: IThermodynamicStateVector) => new ThermodynamicStateVector({
      ...v,
      entropy: (v.entropy ?? 0) + 10,
      totalEntropy: (v.entropy ?? 0) + 10,
      entropyGenerationRate: (v.entropyGenerationRate ?? 0) + 1
    });

    const invalidTransition = (v: IThermodynamicStateVector) => new ThermodynamicStateVector({
      ...v,
      entropyGenerationRate: -5.0
    });

    const res = ThermodynamicMonad.map(initialVector, validTransition);
    assert.strictEqual(res.entropy, 110);

    assert.throws(() => {
      ThermodynamicMonad.map(initialVector, invalidTransition);
    });
  });
});