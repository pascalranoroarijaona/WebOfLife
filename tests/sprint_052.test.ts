import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateVector } from '../src/thermodynamics/types.js';

describe('Sprint 052: Retro-compatibility check', () => {
  it('should pass basic state vector creation', () => {
    const vec = new ThermodynamicStateVector();
    assert.ok(vec);
  });
});