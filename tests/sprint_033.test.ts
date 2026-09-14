import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateH3Token, InvalidH3TokenError, H3Grid } from '../src/spatial/h3_grid.js';

describe('Sprint 033: H3 Token Validation & Non-Hexadecimal Error Throwing', () => {
  it('should pass valid hexadecimal H3 tokens', () => {
    const validToken = '8928308280fffff';
    assert.doesNotThrow(() => {
      validateH3Token(validToken);
    });
  });

  it('should throw InvalidH3TokenError on non-hexadecimal symbols like "g"', () => {
    const invalidToken = '8928308280gffff';
    assert.throws(() => {
      validateH3Token(invalidToken);
    }, (err: any) => {
      return err instanceof InvalidH3TokenError && err.name === 'InvalidH3TokenError';
    });
  });

  it('should throw InvalidH3TokenError on uppercase non-hexadecimal symbols or dashes/spaces', () => {
    const badTokens = ['89283-8280fffff', '89283 8280fffff', '8928308280Zffff', ''];
    for (const token of badTokens) {
      assert.throws(() => {
        validateH3Token(token);
      }, InvalidH3TokenError);
    }
  });

  it('should enforce validation inside H3Grid.resolveCell', () => {
    const grid = new H3Grid();
    assert.throws(() => {
      grid.resolveCell('invalid-token-XYZ');
    }, InvalidH3TokenError);
  });
});