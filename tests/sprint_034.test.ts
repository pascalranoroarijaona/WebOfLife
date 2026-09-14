// =============================================================================
// WEB OF LIFE - SPRINT 034 UNIT TESTS (RFC 034 H3 Token Validation)
// =============================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateH3Token, H3ValidationError, H3GridValidator } from '../src/spatial/h3_grid.js';
import { SpatialMonad } from '../src/monads/spatial_monad.js';

describe('RFC 034: H3 Token Non-Hexadecimal Symbol Validation', () => {
  it('should pass valid lowercase and uppercase hexadecimal H3 tokens', () => {
    const validTokens = [
      '8f2685ffffffffff',
      '8F2685FFFFFFFFFF',
      '1ab23cd4ef',
      '0123456789abcdefABCDEF'
    ];

    for (const token of validTokens) {
      assert.doesNotThrow(() => {
        validateH3Token(token);
        H3GridValidator.validate(token);
      });
      assert.strictEqual(H3GridValidator.isValid(token), true);
    }
  });

  it('should throw H3ValidationError for tokens containing non-hexadecimal letters (g-z)', () => {
    const invalidTokens = [
      '8f2685ffffffffffZ',
      'not-a-token!',
      '8f268g99ffffffff',
      'abcxyz',
      '   '
    ];

    for (const token of invalidTokens) {
      assert.throws(() => {
        validateH3Token(token);
      }, (err: unknown) => {
        assert.ok(err instanceof H3ValidationError);
        assert.strictEqual((err as H3ValidationError).name, 'H3ValidationError');
        assert.ok((err as Error).message.includes(token));
        return true;
      });

      assert.strictEqual(H3GridValidator.isValid(token), false);
    }
  });

  it('should throw H3ValidationError for empty or non-string inputs', () => {
    const badInputs = ['', null, undefined];

    for (const input of badInputs) {
      assert.throws(() => {
        validateH3Token(input as unknown as string);
      }, (err: unknown) => {
        assert.ok(err instanceof H3ValidationError);
        return true;
      });
    }
  });

  it('should integrate strictly with SpatialMonad instantiation and transfers', () => {
    const validToken = '8f2685ffffffffff';
    const invalidToken = '8f2685fffffffzZ!';

    const monad = new SpatialMonad(validToken, {
      carbonStockKg: 1000,
      waterStockKg: 5000,
      mineralStockKg: 200,
      energyJoules: 100000
    });

    assert.strictEqual(monad.getH3Token(), validToken);

    assert.throws(() => {
      new SpatialMonad(invalidToken, {
        carbonStockKg: 100,
        waterStockKg: 100,
        mineralStockKg: 100,
        energyJoules: 100
      });
    }, H3ValidationError);

    assert.throws(() => {
      monad.transferStocks(invalidToken, { carbonStockKg: 50 });
    }, H3ValidationError);

    assert.doesNotThrow(() => {
      monad.transferStocks('8f2685fffffffffe', { carbonStockKg: 50 });
    });
  });
});