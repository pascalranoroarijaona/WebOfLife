import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3GridValidator, H3Grid } from '../src/spatial/h3_grid.js';

describe('Sprint 10: H3 Grid Regex Validation', () => {
  it('should validate correct 15-character hex H3 index strings starting with valid prefix', () => {
    const validIndex = '891f1d3681ffffd';
    assert.strictEqual(H3GridValidator.isValidIndex(validIndex), true);
    assert.strictEqual(H3Grid.validate(validIndex), true);

    const validIndexUpper = '891F1D3681FFFFD';
    assert.strictEqual(H3GridValidator.isValidIndex(validIndexUpper), true);

    const validIndexAlpha = '8abcdef01234567';
    assert.strictEqual(H3GridValidator.isValidIndex(validIndexAlpha), true);
  });

  it('should reject malformed or invalid H3 index strings', () => {
    // Too short
    assert.strictEqual(H3GridValidator.isValidIndex('891f1d3681ffff'), false);
    // Too long
    assert.strictEqual(H3GridValidator.isValidIndex('891f1d3681ffffdd'), false);
    // Invalid starting character (e.g. starts with '7')
    assert.strictEqual(H3GridValidator.isValidIndex('791f1d3681ffffd'), false);
    // Invalid hex characters
    assert.strictEqual(H3GridValidator.isValidIndex('891f1d3681ffffg'), false);
    // Non-string input
    // @ts-ignore
    assert.strictEqual(H3GridValidator.isValidIndex(123456789012345), false);
    // @ts-ignore
    assert.strictEqual(H3GridValidator.isValidIndex(null), false);
  });
});