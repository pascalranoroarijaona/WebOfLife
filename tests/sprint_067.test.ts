import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateValidator } from '../src/thermodynamics/state_validator.js';
import { StateVector } from '../src/thermodynamics/state_vector.js';

describe('Sprint 067: StateValidator Core Helper', () => {
  it('TC-01: Exact state matches return isValid: true and zero differences', () => {
    const validator = new StateValidator(1e-6);
    const actual = new StateVector({ stocks: { C: 100.0, H2O: 500.0 } });
    const expected = new StateVector({ stocks: { C: 100.0, H2O: 500.0 } });

    const result = validator.evaluateDiscrepancy(expected, actual);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.differences!['C'], 0.0);
    assert.strictEqual(result.differences!['H2O'], 0.0);
    assert.deepStrictEqual(result.violations, {});
  });

  it('TC-02: Stock differences exceeding default tolerance flag violations', () => {
    const validator = new StateValidator(1e-6);
    const actual = new StateVector({ stocks: { C: 100.000005, N: 10.0 } });
    const expected = new StateVector({ stocks: { C: 100.0, N: 10.0 } });

    const result = validator.evaluateDiscrepancy(expected, actual);
    assert.strictEqual(result.isValid, false);
    assert.ok((result.differences!['C'] ?? 0) > 1e-6);
    const violationsObj = result.violations as Record<string, string>;
    assert.ok(violationsObj['C'] !== undefined);
  });

  it('TC-03: Custom tolerance suppresses violation on specific stocks', () => {
    const validator = new StateValidator(1e-6);
    const actual = new StateVector({ stocks: { C: 100.005, N: 10.0 } });
    const expected = new StateVector({ stocks: { C: 100.0, N: 10.0 } });

    const result = validator.evaluateDiscrepancy(expected, actual, { C: 0.01 });
    assert.strictEqual(result.isValid, true);
    const violationsObj = result.violations as Record<string, string>;
    assert.strictEqual(violationsObj['C'], undefined);
  });

  it('Helper checkDiscrepancy works correctly', () => {
    const validator = new StateValidator();
    assert.strictEqual(validator.checkDiscrepancy(10.0, 10.0000001, 1e-6), true);
    assert.strictEqual(validator.checkDiscrepancy(10.0, 10.001, 1e-6), false);
  });
});