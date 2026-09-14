import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3GridValidator, SpatialMonadExecution } from '../src/spatial/h3_grid.js';

describe('Sprint 031: H3 Grid Validator & Spatial Monad Execution Tests', () => {
  it('should validate standard lowercase H3 indices', () => {
    const validIndex = '8928308280fffff';
    assert.strictEqual(H3GridValidator.isValidHexIndex(validIndex), true);
  });

  it('should validate uppercase and mixed-case hexadecimal strings', () => {
    assert.strictEqual(H3GridValidator.isValidHexIndex('8928308280FFFFF'), true);
    assert.strictEqual(H3GridValidator.isValidHexIndex('8928308280fFfFf'), true);
    assert.strictEqual(H3GridValidator.isValidHexIndex('0123456789ABCDEFabcdef'), true);
  });

  it('should reject invalid edge cases: empty strings, non-hex characters, and non-string types', () => {
    assert.strictEqual(H3GridValidator.isValidHexIndex(''), false);
    assert.strictEqual(H3GridValidator.isValidHexIndex('8928308280fffffG'), false); // 'G' is non-hex
    assert.strictEqual(H3GridValidator.isValidHexIndex('8928308280fffff!'), false); // symbol
    assert.strictEqual(H3GridValidator.isValidHexIndex('8928308280fffff '), false); // whitespace
    assert.strictEqual(H3GridValidator.isValidHexIndex(null as unknown as string), false);
    assert.strictEqual(H3GridValidator.isValidHexIndex(undefined as unknown as string), false);
    assert.strictEqual(H3GridValidator.isValidHexIndex(123456 as unknown as string), false);
  });

  it('should correctly execute spatial monad transitions (T_val) for valid tokens', () => {
    const state = SpatialMonadExecution.transitionSpatialStock('8928308280fffff', 100.0);
    assert.strictEqual(state.isValid, true);
    assert.strictEqual(state.token, '8928308280fffff');
    assert.strictEqual(state.energyPotential, 100.0);
    assert.strictEqual(state.entropy, 0.0);
  });

  it('should correctly execute spatial monad transitions (T_val) for invalid tokens (quarantine state)', () => {
    const state = SpatialMonadExecution.transitionSpatialStock('INVALID_TOKEN!', 100.0);
    assert.strictEqual(state.isValid, false);
    assert.strictEqual(state.token, '');
    assert.strictEqual(state.energyPotential, 0.0);
    assert.strictEqual(state.entropy, 1.0);
  });
});