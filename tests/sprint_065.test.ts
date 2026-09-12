import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';
import { StateValidator } from '../src/thermodynamics/state_validator.js';

describe('Sprint 065: Thermodynamic State Vector Inventory Discrepancy Evaluator', () => {
  it('1. Zero-Delta Equivalence: identical expected and actual vectors return isValid: true with zero maxDelta', () => {
    const v1 = new ThermodynamicStateVector({
      stocks: { carbon: 850, nitrogen: 3900000, phosphorus: 4e9, water: 1338000000 }
    });
    const v2 = new ThermodynamicStateVector({
      stocks: { carbon: 850, nitrogen: 3900000, phosphorus: 4e9, water: 1338000000 }
    });

    const validator = new StateValidator();
    const result = validator.validate(v1, v2, { carbon: 0.01, nitrogen: 0.01, phosphorus: 0.01, water: 0.01 });

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.maxDelta, 0);
    assert.strictEqual((result.discrepancies as any)['carbon'].delta, 0);
  });

  it('2. Tolerance Breach Detection: vectors exceeding Te return isValid: false with accurate delta tracking', () => {
    const v1 = new ThermodynamicStateVector({
      stocks: { carbon: 850.0, nitrogen: 3900000.0 }
    });
    const v2 = new ThermodynamicStateVector({
      stocks: { carbon: 855.5, nitrogen: 3900000.0 }
    });

    const validator = new StateValidator();
    const result = validator.validate(v1, v2, { carbon: 1.0, nitrogen: 1.0 });

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.maxDelta, 5.5);
    assert.strictEqual((result.discrepancies as any)['carbon'].delta, 5.5);
    assert.strictEqual((result.discrepancies as any)['carbon'].tolerance, 1.0);
  });

  it('3. Default Tolerance Fallback: unspecified keys correctly default to 0.001 tolerance thresholds', () => {
    const v1 = new ThermodynamicStateVector({
      stocks: { custom_element: 10.0 }
    });
    const v2 = new ThermodynamicStateVector({
      stocks: { custom_element: 10.002 } // delta 0.002 > default 0.001
    });

    const validator = new StateValidator();
    const result = validator.validate(v1, v2, {});

    assert.strictEqual(result.isValid, false);
    assert.strictEqual((result.discrepancies as any)['custom_element'].tolerance, 1e-3);
    assert.strictEqual((result.discrepancies as any)['custom_element'].delta, 0.002);
  });
});