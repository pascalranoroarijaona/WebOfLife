import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateValidator } from '../src/thermodynamics/state_validator.js';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';

describe('Sprint 081 - Thermodynamic State Vector Inventory Discrepancy Evaluator', () => {
  it('should validate exact match state vectors with zero discrepancy', () => {
    const validator = new StateValidator({ mass: 1e-6, energy: 1e-6 });
    
    const vec1 = new ThermodynamicStateVector({ internalEnergy: 1000, massInventory: { carbon: 500 } });
    const vec2 = new ThermodynamicStateVector({ internalEnergy: 1000, massInventory: { carbon: 500 } });

    const actualMap = new Map<string, ThermodynamicStateVector>();
    actualMap.set('carbon_cycle', vec1);

    const expectedMap = new Map<string, ThermodynamicStateVector>();
    expectedMap.set('carbon_cycle', vec2);

    const report = validator.evaluateDiscrepancy(actualMap, expectedMap);
    assert.strictEqual(report.isValid, true);
    assert.strictEqual(report.totalMassDiscrepancy, 0);
    assert.strictEqual(report.totalEnergyDiscrepancy, 0);
  });

  it('should flag out-of-tolerance discrepancy correctly', () => {
    const validator = new StateValidator({ mass: 1e-6, energy: 1e-6 });

    const vecActual = new ThermodynamicStateVector({ internalEnergy: 1005, massInventory: { carbon: 502 } });
    const vecExpected = new ThermodynamicStateVector({ internalEnergy: 1000, massInventory: { carbon: 500 } });

    const actualMap = new Map<string, ThermodynamicStateVector>();
    actualMap.set('carbon_cycle', vecActual);

    const expectedMap = new Map<string, ThermodynamicStateVector>();
    expectedMap.set('carbon_cycle', vecExpected);

    const report = validator.evaluateDiscrepancy(actualMap, expectedMap);
    assert.strictEqual(report.isValid, false);
    assert.strictEqual(report.totalMassDiscrepancy, 2);
    assert.strictEqual(report.totalEnergyDiscrepancy, 5);
  });

  it('should throw error when expected compartment is missing', () => {
    const validator = new StateValidator();
    const vecActual = new ThermodynamicStateVector({ internalEnergy: 1000, massInventory: { water: 100 } });

    const actualMap = new Map<string, ThermodynamicStateVector>();
    actualMap.set('water_cycle', vecActual);

    const expectedMap = new Map<string, ThermodynamicStateVector>();

    assert.throws(() => {
      validator.evaluateDiscrepancy(actualMap, expectedMap);
    }, /Expected state missing for compartment: water_cycle/);
  });
});