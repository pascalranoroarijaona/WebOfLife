import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isValidH3Length } from '../src/spatial/h3_grid.js';

describe('Sprint 018: H3 Index 15-Character Length Validation', () => {
  it('should return true for an exact 15-character valid hex string', () => {
    const validIndex = '8928308280fffff';
    assert.strictEqual(isValidH3Length(validIndex), true);
  });

  it('should return true for mixed case valid 15-character hex strings', () => {
    const validMixed = '8928308280FFFFF';
    assert.strictEqual(isValidH3Length(validMixed), true);
  });

  it('should return false for strings shorter than 15 characters', () => {
    const shortIndex = '8928308280ffff';
    assert.strictEqual(isValidH3Length(shortIndex), false);
  });

  it('should return false for strings longer than 15 characters', () => {
    const longIndex = '8928308280ffffff';
    assert.strictEqual(isValidH3Length(longIndex), false);
  });

  it('should return false for empty strings', () => {
    assert.strictEqual(isValidH3Length(''), false);
  });

  it('should return false for non-string inputs (null, undefined, numbers, objects)', () => {
    assert.strictEqual(isValidH3Length(null as unknown as string), false);
    assert.strictEqual(isValidH3Length(undefined as unknown as string), false);
    assert.strictEqual(isValidH3Length(123456789012345 as unknown as string), false);
    assert.strictEqual(isValidH3Length({} as unknown as string), false);
  });

  it('should return false for 15-character strings containing invalid hex characters', () => {
    const invalidCharIndex = '8928308280ffgff'; // 'g' is invalid in hex
    assert.strictEqual(isValidH3Length(invalidCharIndex), false);
  });
});