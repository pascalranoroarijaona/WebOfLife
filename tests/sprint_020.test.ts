import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateH3Length, executeSpatialValidationMonad } from '../src/spatial/h3_grid.js';

describe('Sprint 20: H3 Index Length Validation (RFC 020)', () => {
  it('should return true for an exact 15-character valid H3 string', () => {
    const validH3 = '8928308280fffff'; // exactly 15 chars
    assert.strictEqual(validH3.length, 15);
    assert.strictEqual(validateH3Length(validH3), true);
  });

  it('should return false for sub-15 character strings (length 0 and 14)', () => {
    assert.strictEqual(validateH3Length(''), false);
    assert.strictEqual(validateH3Length('8928308280ffff'), false); // 14 chars
  });

  it('should return false for over-15 character strings (length 16 and 20)', () => {
    assert.strictEqual(validateH3Length('8928308280ffffff'), false); // 16 chars
    assert.strictEqual(validateH3Length('8928308280ffffffffff'), false); // 20 chars
  });

  it('should return false for non-string inputs (null, undefined, numeric)', () => {
    assert.strictEqual(validateH3Length(null as unknown as string), false);
    assert.strictEqual(validateH3Length(undefined as unknown as string), false);
    assert.strictEqual(validateH3Length('8928308280fffff' as unknown as string), false);
  });

  it('should successfully execute spatial validation monad with correct stock conservation properties', () => {
    const h3Token = '8928308280fffff';
    const stock = executeSpatialValidationMonad(h3Token);

    assert.strictEqual(stock.token, h3Token);
    assert.strictEqual(stock.isValids, true);
    assert.strictEqual(stock.massDeltaKg, 0.0);
    assert.strictEqual(stock.energyDeltaJoules, 0.0);
  });
});