import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateVector, STANDARD_AMBIENT_TEMPERATURE_K } from '../src/thermodynamics/types.js';

describe('Sprint 023: Retro-compatibility check', () => {
  it('should pass basic state vector creation', () => {
    const vec = new ThermodynamicStateVector();
    assert.strictEqual(vec.temperature, STANDARD_AMBIENT_TEMPERATURE_K);
  });
});