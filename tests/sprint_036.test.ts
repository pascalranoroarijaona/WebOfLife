import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateH3StringLength } from '../src/spatial/h3_grid.js';

describe('Sprint 036: H3 String Length Boundary Validation Helper', () => {
  it('should return false when string length is below minimum boundary', () => {
    const result = validateH3StringLength('', 1, 15);
    assert.strictEqual(result.isValidLength, false);
    assert.strictEqual(result.isWithinBounds, false);
  });

  it('should return true when string length is within valid operational boundaries', () => {
    const validToken = '8f28308280effffff'; // 17 chars? Let's check length: let's use a standard 15-char or shorter token
    const token = '8828308280fffff'; // 15 chars
    const result = validateH3StringLength(token, 1, 15);
    assert.strictEqual(result.isValidLength, true);
    assert.strictEqual(result.isWithinBounds, true);
  });

  it('should return false when string length exceeds maximum boundary length', () => {
    const longToken = '8828308280ffffffffffff';
    const result = validateH3StringLength(longToken, 1, 15);
    assert.strictEqual(result.isValidLength, false);
    assert.strictEqual(result.isWithinBounds, false);
  });

  it('should respect custom min and max lengths', () => {
    const token = '12345';
    const resWithin = validateH3StringLength(token, 3, 7);
    assert.strictEqual(resWithin.isValidLength, true);

    const resTooShort = validateH3StringLength(token, 6, 10);
    assert.strictEqual(resTooShort.isValidLength, false);
  });
});