import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeAbsoluteStockDelta } from '../src/thermodynamics/state_validator.js';

describe('Sprint 072: Thermodynamic State Vector Discrepancy Absolute Difference Math Function', () => {
  it('1. Computes zero deltas for exact matching vectors across all keys', () => {
    const actual = { C: 850, N: 3900000, P: 4e9, H2O: 1338000000 };
    const expected = { C: 850, N: 3900000, P: 4e9, H2O: 1338000000 };
    
    const deltas = computeAbsoluteStockDelta(actual, expected);
    
    assert.strictEqual(deltas['C'], 0);
    assert.strictEqual(deltas['N'], 0);
    assert.strictEqual(deltas['P'], 0);
    assert.strictEqual(deltas['H2O'], 0);
  });

  it('2. Computes correct absolute scalar outputs for positive and negative variances', () => {
    const actual = { C: 870, N: 3899500, P: 4.000001e9 };
    const expected = { C: 850, N: 3900000, P: 4.0e9 };
    
    const deltas = computeAbsoluteStockDelta(actual, expected);
    
    assert.strictEqual(deltas['C'], 20); // 870 - 850
    assert.strictEqual(deltas['N'], 500); // |3899500 - 3900000|
    assert.strictEqual(deltas['P'], 1000); // 4.000001e9 - 4.0e9 = 1000
  });

  it('3. Robustly handles sparse or asymmetric key sets without throwing runtime exceptions', () => {
    const actual = { C: 900, H2O: 50000 };
    const expected = { C: 850, N: 1000 }; // 'N' is missing in actual, 'H2O' is missing in expected
    
    const deltas = computeAbsoluteStockDelta(actual, expected);
    
    assert.strictEqual(deltas['C'], 50);
    assert.strictEqual(deltas['N'], 1000); // |0 - 1000|
    assert.strictEqual(deltas['H2O'], 50000); // |50000 - 0|
  });

  it('4. Preserves input immutability (pure function side-effect free)', () => {
    const actual = { C: 100 };
    const expected = { C: 80 };
    
    const actualCopy = { ...actual };
    const expectedCopy = { ...expected };
    
    computeAbsoluteStockDelta(actual, expected);
    
    assert.deepStrictEqual(actual, actualCopy);
    assert.deepStrictEqual(expected, expectedCopy);
  });
});