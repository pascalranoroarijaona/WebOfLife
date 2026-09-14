import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3GridManager } from '../src/spatial/h3_grid.js';
import { SpatialMonadStockRegister } from '../src/monads/spatial_monad.js';

describe('Sprint 011 - Uber H3 Index Character Set Verification', () => {
  const h3Manager = new H3GridManager();

  it('should validate correct 15-character lowercase hexadecimal H3 strings', () => {
    const validH3 = '8928308280fffff'; // 15 chars, [0-9a-f]
    assert.strictEqual(h3Manager.validateIndex(validH3), true);
  });

  it('should reject uppercase hexadecimal H3 strings', () => {
    const uppercaseH3 = '8928308280FFFFF';
    assert.strictEqual(h3Manager.validateIndex(uppercaseH3), false);
  });

  it('should reject strings containing non-hex characters ([g-z], symbols)', () => {
    const invalidCharH3 = '8928308280ggggg';
    const symbolH3 = '8928308280f-fff';
    assert.strictEqual(h3Manager.validateIndex(invalidCharH3), false);
    assert.strictEqual(h3Manager.validateIndex(symbolH3), false);
  });

  it('should reject strings with invalid lengths', () => {
    const tooShort = '8928308280ffff'; // 14 chars
    const tooLong = '8928308280ffffff'; // 16 chars
    assert.strictEqual(h3Manager.validateIndex(tooShort), false);
    assert.strictEqual(h3Manager.validateIndex(tooLong), false);
  });

  it('should reject non-string inputs', () => {
    // @ts-ignore
    assert.strictEqual(h3Manager.validateIndex(null), false);
    // @ts-ignore
    assert.strictEqual(h3Manager.validateIndex(123456789012345), false);
  });

  it('should correctly filter spatial monad stock registers upon ingestion', () => {
    const register = new SpatialMonadStockRegister(h3Manager);
    
    const accepted = register.ingestIndex('8928308280fffff');
    const rejected1 = register.ingestIndex('8928308280FFFFF'); // uppercase
    const rejected2 = register.ingestIndex('shorttoken'); // bad length

    assert.strictEqual(accepted, true);
    assert.strictEqual(rejected1, false);
    assert.strictEqual(rejected2, false);

    assert.deepStrictEqual(register.getValidIndices(), ['8928308280fffff']);
    assert.strictEqual(register.getRejectedCount(), 2);
  });
});