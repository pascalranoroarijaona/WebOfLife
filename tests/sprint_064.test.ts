import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';
import { ThermodynamicStateValidator } from '../src/thermodynamics/state_validator.js';
import { ThermodynamicToleranceConfig } from '../src/thermodynamics/types.js';

describe('Sprint 064: Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper', () => {
  it('should verify exact vector matches return isValid: true', () => {
    const expected = new ThermodynamicStateVector({
      inventory: { carbon: 850, water: 1338000000, nitrogen: 3900000 },
      stocks: { carbon: 850, water: 1338000000, nitrogen: 3900000 }
    });
    const actual = new ThermodynamicStateVector({
      inventory: { carbon: 850, water: 1338000000, nitrogen: 3900000 },
      stocks: { carbon: 850, water: 1338000000, nitrogen: 3900000 }
    });

    const validator = new ThermodynamicStateValidator(1e-6);
    const result = validator.evaluateDiscrepancy(expected, actual);

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.maxDelta, 0);
    assert.strictEqual(result.discrepancies['carbon'].delta, 0);
  });

  it('should verify vectors within tolerance margins pass validation', () => {
    const expected = new ThermodynamicStateVector({
      inventory: { carbon: 850.0 },
      stocks: { carbon: 850.0 }
    });
    const actual = new ThermodynamicStateVector({
      inventory: { carbon: 850.0000002 },
      stocks: { carbon: 850.0000002 }
    });

    const validator = new ThermodynamicStateValidator(1e-6);
    const result = validator.evaluateDiscrepancy(expected, actual);

    assert.strictEqual(result.isValid, true);
    assert.ok(result.maxDelta <= 1e-6);
  });

  it('should verify vectors exceeding tolerance thresholds return isValid: false with accurate delta reporting', () => {
    const expected = new ThermodynamicStateVector({
      inventory: { carbon: 850.0, phosphorus: 4e9 },
      stocks: { carbon: 850.0, phosphorus: 4e9 }
    });
    const actual = new ThermodynamicStateVector({
      inventory: { carbon: 850.00005, phosphorus: 4e9 },
      stocks: { carbon: 850.00005, phosphorus: 4e9 }
    });

    const validator = new ThermodynamicStateValidator(1e-6);
    const result = validator.evaluateDiscrepancy(expected, actual);

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(result.discrepancies['carbon'].expected, 850.0);
    assert.strictEqual(result.discrepancies['carbon'].actual, 850.00005);
    assert.strictEqual(result.discrepancies['carbon'].delta, 0.00005);
    assert.strictEqual(result.maxDelta, 0.00005);
  });

  it('should support custom tolerances via ThermodynamicToleranceConfig', () => {
    const expected = new ThermodynamicStateVector({
      inventory: { water: 1000 },
      stocks: { water: 1000 }
    });
    const actual = new ThermodynamicStateVector({
      inventory: { water: 1000.5 },
      stocks: { water: 1000.5 }
    });

    const customConfig: ThermodynamicToleranceConfig = {
      getElementTolerance: (key: string) => (key === 'water' ? 1.0 : 1e-6),
      getDefaultTolerance: () => 1e-6
    };

    const validator = new ThermodynamicStateValidator(1e-6);
    const result = validator.evaluateDiscrepancy(expected, actual, customConfig);

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.discrepancies['water'].tolerance, 1.0);
  });
});