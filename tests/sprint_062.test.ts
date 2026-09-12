import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateVector } from '../src/thermodynamics/state_vector.js';
import { StateValidator } from '../src/thermodynamics/state_validator.js';
import { EarthPOD } from '../src/earth_pod.js';

describe('Sprint 062: Thermodynamic State Vector Inventory Discrepancy Evaluator', () => {
  it('Unit Test 1: Balanced stock transitions within tolerance', () => {
    const validator = new StateValidator(1e-6);

    const prevState = new StateVector({
      stocks: { carbon: 850, water: 1338000000 }
    });

    const currState = new StateVector({
      stocks: { carbon: 852, water: 1337999998 }
    });

    const netFluxes = {
      carbon: 2.0,
      water: -2.0
    };

    const report = validator.evaluateDiscrepancy(prevState, currState, netFluxes);

    assert.strictEqual(report.isBalanced, true, 'System should be balanced');
    assert.strictEqual((report.maxDiscrepancy ?? 0) <= 1e-6, true, 'Max discrepancy should be within tolerance');
    assert.strictEqual((report.items ?? []).length, 2);
  });

  it('Unit Test 2: Imbalanced transitions triggering First Law discrepancy violations', () => {
    const validator = new StateValidator(1e-6);

    const prevState = new StateVector({
      stocks: { carbon: 850 }
    });

    const currState = new StateVector({
      stocks: { carbon: 900 } // Delta = +50
    });

    const netFluxes = {
      carbon: 10.0 // Expected Delta = 10 -> Discrepancy = 40
    };

    const report = validator.evaluateDiscrepancy(prevState, currState, netFluxes);

    assert.strictEqual(report.isBalanced, false, 'System should be flagged as imbalanced');
    assert.strictEqual(report.maxDiscrepancy, 40.0, 'Discrepancy should equal 40.0');
    assert.strictEqual((report.items ?? [])[0].exceedsTolerance, true, 'Carbon stock should exceed tolerance');
  });

  it('Unit Test 3: Integration check with EarthPOD biogeochemical state vectors', () => {
    const earth = EarthPOD.getInstance();
    const vecPrev = earth.getStateVector();

    // Simulate state transition
    const vecCurr = new StateVector({
      ...vecPrev.toObject(),
      stocks: { carbon: 855, nitrogen: 3900001, phosphorus: 4e9, water: 1338000005 }
    });

    const netFluxes = {
      carbon: 5.0,
      nitrogen: 1.0,
      phosphorus: 0.0,
      water: 5.0
    };

    const validator = new StateValidator(1e-6);
    const report = validator.evaluateDiscrepancy(vecPrev, vecCurr, netFluxes);

    assert.strictEqual(report.isBalanced, true, 'Earth planetary balance check should pass successfully');
  });
});