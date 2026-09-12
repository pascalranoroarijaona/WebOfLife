import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateValidator } from '../src/thermodynamics/state_validator.js';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';

describe('Sprint 080: Thermodynamic State Vector Inventory Discrepancy Evaluator Wrapper', () => {
  it('should initialize ThermodynamicStateValidator with default or custom tolerance', () => {
    const validatorDefault = new ThermodynamicStateValidator();
    const validatorCustom = new ThermodynamicStateValidator(1e-4);
    assert.ok(validatorDefault instanceof ThermodynamicStateValidator);
    assert.ok(validatorCustom instanceof ThermodynamicStateValidator);
  });

  it('should correctly evaluate discrepancies and verify thermodynamic balance (First & Second Law)', () => {
    const current = new ThermodynamicStateVector({
      stocks: { carbon: 850, water: 1000 },
      temperature: 288.15,
      entropy: 100
    });

    const expected = new ThermodynamicStateVector({
      stocks: { carbon: 850.0000001, water: 1000.0000001 },
      temperature: 288.15,
      entropy: 100
    });

    const validator = new ThermodynamicStateValidator(1e-5);
    const result = validator.evaluateDiscrepancy(current, expected);

    assert.strictEqual(typeof result.isBalanced, 'boolean');
    assert.strictEqual(typeof result.totalDiscrepancy, 'number');
    assert.strictEqual(typeof result.entropyDelta, 'number');
    assert.strictEqual(typeof result.timestamp, 'number');
    assert.ok(result.componentDiscrepancies !== null && typeof result.componentDiscrepancies === 'object');
    assert.ok((result.entropyDelta ?? 0) >= 0, 'Second Law: entropyDelta must be non-negative');
    assert.strictEqual(result.isBalanced, true);
  });
});