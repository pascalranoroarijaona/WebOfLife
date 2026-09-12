import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';
import { STANDARD_AMBIENT_TEMPERATURE_K } from '../src/thermodynamics/types.js';

describe('Sprint 026: Thermodynamic State Vector Baseline Structurer', () => {
  it('should instantiate state vector with default ambient temperature T_0 = 288.15 K', () => {
    const vec = createThermodynamicStateVector();
    assert.strictEqual(vec.ambientTemperature, STANDARD_AMBIENT_TEMPERATURE_K);
    assert.strictEqual(vec.ambientReferenceTemp, STANDARD_AMBIENT_TEMPERATURE_K);
    assert.strictEqual(vec.temperature, STANDARD_AMBIENT_TEMPERATURE_K);
  });

  it('should zero out or initialize flux records correctly', () => {
    const vec = createThermodynamicStateVector();
    assert.strictEqual(vec.boundaryFluxes.solarRadiationIn, 0);
    assert.strictEqual(vec.boundaryFluxes.netMassFlux, 0);
    assert.strictEqual(vec.entropyGenerationRate, 0);
    assert.strictEqual(vec.exergyDestructionRate, 0);
  });

  it('should satisfy second law validation by default', () => {
    const vec = createThermodynamicStateVector();
    assert.strictEqual(vec.validateSecondLaw!(), true);
  });
});