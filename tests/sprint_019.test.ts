import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isValidH3IndexLength } from '../src/spatial/h3_grid.js';

describe('Sprint 019 - H3 15-Character Length Validation', () => {
  it('should return true for a valid 15-character H3 index string', () => {
    const validIndex = '872830828ffffff'; // 15 chars
    assert.strictEqual(validIndex.length, 15);
    assert.strictEqual(isValidH3IndexLength(validIndex), true);
  });

  it('should return false for strings shorter than 15 characters', () => {
    const shortIndex = '872830828fffff'; // 14 chars
    assert.strictEqual(shortIndex.length, 14);
    assert.strictEqual(isValidH3IndexLength(shortIndex), false);
  });

  it('should return false for strings longer than 15 characters', () => {
    const longIndex = '872830828ffffffff'; // 17 chars
    assert.strictEqual(isValidH3IndexLength(longIndex), false);
  });

  it('should return false for empty strings', () => {
    assert.strictEqual(isValidH3IndexLength(''), false);
  });

  it('should return false for non-string inputs using type guards', () => {
    // @ts-ignore - testing runtime safety against non-string inputs
    assert.strictEqual(isValidH3IndexLength(null), false);
    // @ts-ignore - testing runtime safety against non-string inputs
    assert.strictEqual(isValidH3IndexLength(undefined), false);
    // @ts-ignore - testing runtime safety against non-string inputs
    assert.strictEqual(isValidH3IndexLength(123456789012345), false);
    // @ts-ignore - testing runtime safety against non-string inputs
    assert.strictEqual(isValidH3IndexLength({}), false);
  });
});