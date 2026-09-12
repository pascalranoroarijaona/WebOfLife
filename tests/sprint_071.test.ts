import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeAbsoluteStockDelta, ThermodynamicStockMap } from '../src/thermodynamics/state_validator.js';

describe('Sprint 071: Thermodynamic State Vector Discrepancy Absolute Difference Math Function', () => {
  it('1. Exact Match: should return zero deltas when actual equals expected', () => {
    const state: ThermodynamicStockMap = {
      carbon: 850,
      nitrogen: 3900000,
      phosphorus: 4000,
      water: 1338000,
      energy: 1e12
    };

    const delta = computeAbsoluteStockDelta(state, state);

    assert.strictEqual(delta.carbon, 0);
    assert.strictEqual(delta.nitrogen, 0);
    assert.strictEqual(delta.phosphorus, 0);
    assert.strictEqual(delta.water, 0);
    assert.strictEqual(delta.energy, 0);
  });

  it('2. Positive & Negative Deviations: should normalize surpluses and deficits via Math.abs()', () => {
    const actual: ThermodynamicStockMap = {
      carbon: 900,      // +50 surplus
      nitrogen: 3800000,  // -100,000 deficit
      phosphorus: 4000,   // exact match
      water: 1330000,   // -8000 deficit
      energy: 1.1e12    // +0.1e12 surplus
    };

    const expected: ThermodynamicStockMap = {
      carbon: 850,
      nitrogen: 3900000,
      phosphorus: 4000,
      water: 1338000,
      energy: 1.0e12
    };

    const delta = computeAbsoluteStockDelta(actual, expected);

    assert.strictEqual(delta.carbon, 50);
    assert.strictEqual(delta.nitrogen, 100000);
    assert.strictEqual(delta.phosphorus, 0);
    assert.strictEqual(delta.water, 8000);
    assert.strictEqual(delta.energy, 1e11);
  });

  it('3. Partial / Missing Keys: should robustly handle incomplete stock maps via default fallback to 0', () => {
    const actual = {
      carbon: 500
    } as unknown as ThermodynamicStockMap;

    const expected = {
      carbon: 300,
      energy: 5000
    } as unknown as ThermodynamicStockMap;

    const delta = computeAbsoluteStockDelta(actual, expected);

    assert.strictEqual(delta.carbon, 200);
    assert.strictEqual(delta.nitrogen, 0);
    assert.strictEqual(delta.phosphorus, 0);
    assert.strictEqual(delta.water, 0);
    assert.strictEqual(delta.energy, 5000);
  });
});