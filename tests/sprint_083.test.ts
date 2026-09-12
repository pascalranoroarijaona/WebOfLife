import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';
import { ThermodynamicStateValidator } from '../src/thermodynamics/state_validator.js';

describe('Sprint 083 - Thermodynamic State Vector Inventory Discrepancy Evaluator Wrapper Sub-Task A', () => {
  it('should evaluate zero discrepancies when actual and expected states match precisely', () => {
    const state = new ThermodynamicStateVector({
      stocks: { carbon: 850, nitrogen: 3900000, water: 1338000000 }
    });

    const expectedMap = {
      carbon: 850,
      nitrogen: 3900000,
      water: 1338000000
    };

    const validator = new ThermodynamicStateValidator();
    const result = validator.evaluateDiscrepancy(state, expectedMap);

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.totalMassVariance, 0);
    assert.strictEqual(result.discrepancies.carbon.absoluteDifference, 0);
    assert.strictEqual(result.discrepancies.nitrogen.absoluteDifference, 0);
    assert.strictEqual(result.discrepancies.water.absoluteDifference, 0);
    assert.ok(typeof result.timestamp === 'number');
  });

  it('should detect discrepancies and classify as invalid when variances exceed tolerance', () => {
    const state = new ThermodynamicStateVector({
      stocks: { carbon: 900, nitrogen: 3900000, water: 1338000000 }
    });

    const expectedMap = {
      carbon: 850, // 50 variance
      nitrogen: 3900000,
      water: 1338000000
    };

    const validator = new ThermodynamicStateValidator();
    const result = validator.evaluateDiscrepancy(state, expectedMap);

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.totalMassVariance, 50);
    assert.strictEqual(result.discrepancies.carbon.absoluteDifference, 50);
  });
});