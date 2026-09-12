import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateValidator, DiscrepancyReport } from '../src/thermodynamics/state_validator.js';
import { StateVector } from '../src/thermodynamics/state_vector.js';

describe('Sprint 059: Thermodynamic State Vector Inventory Discrepancy Evaluator', () => {
  it('should report zero discrepancy under ideal mass conservation conditions', () => {
    const validator = new StateValidator(1e-6);

    const prevState = new StateVector({
      timestamp: 100,
      stocks: { carbon: 850, water: 1338000000 }
    });

    const currState = new StateVector({
      timestamp: 101,
      stocks: { carbon: 852, water: 1338000002 }
    });

    const integratedFluxes = {
      carbon: 2,
      water: 2
    };

    const report: DiscrepancyReport = validator.evaluateDiscrepancy(prevState, currState, integratedFluxes);

    assert.strictEqual(report.withinTolerance, true);
    assert.strictEqual(report.totalDiscrepancy, 0);
    assert.strictEqual(report.poolDiscrepancies['carbon'].violated, false);
    assert.strictEqual(report.poolDiscrepancies['water'].violated, false);
  });

  it('should correctly identify anomalous stock injections or leaks exceeding tolerance', () => {
    const validator = new StateValidator(1e-6);

    const prevState = new StateVector({
      timestamp: 200,
      stocks: { nitrogen: 3900000, phosphorus: 4000 }
    });

    const currState = new StateVector({
      timestamp: 201,
      stocks: { nitrogen: 3900050, phosphorus: 4000 } // unexpected 50 unit nitrogen leak/injection
    });

    const integratedFluxes = {
      nitrogen: 0,
      phosphorus: 0
    };

    const report: DiscrepancyReport = validator.evaluateDiscrepancy(prevState, currState, integratedFluxes);

    assert.strictEqual(report.withinTolerance, false);
    assert.strictEqual(report.poolDiscrepancies['nitrogen'].violated, true);
    assert.strictEqual(report.poolDiscrepancies['nitrogen'].absoluteDifference, 50);
    assert.strictEqual(report.poolDiscrepancies['phosphorus'].violated, false);
  });

  it('should strictly adhere to custom tolerance thresholds', () => {
    const validator = new StateValidator(1e-2);

    const prevState = new StateVector({
      timestamp: 300,
      stocks: { energy_stock: 100.0 }
    });

    const currState = new StateVector({
      timestamp: 301,
      stocks: { energy_stock: 100.005 } // 0.005 diff
    });

    const integratedFluxes = {
      energy_stock: 0.0
    };

    // Within strict tolerance (1e-6), this should violate
    const strictReport = validator.evaluateDiscrepancy(prevState, currState, integratedFluxes, 1e-6);
    assert.strictEqual(strictReport.withinTolerance, false);

    // Within loose tolerance (1e-2), this should pass
    const looseReport = validator.evaluateDiscrepancy(prevState, currState, integratedFluxes, 1e-2);
    assert.strictEqual(looseReport.withinTolerance, true);
  });
});