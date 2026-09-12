import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';
import { StateValidator } from '../src/thermodynamics/state_validator.js';
import { FluxVector } from '../src/thermodynamics/types.js';

describe('Sprint 055: Thermodynamic State Vector Stock Conservation Delta Calculator', () => {
  it('1. Verify zero-flux equilibrium leaves state vectors untouched (delta = 0)', () => {
    const state = new ThermodynamicStateVector({
      carbon: 1000,
      nitrogen: 500
    });
    const fluxes: FluxVector[] = [];
    const dt = 10.0;

    const deltas = StateValidator.calculateDelta(state, fluxes, dt);

    const carbonResult = deltas.get('carbon');
    assert.ok(carbonResult);
    assert.strictEqual(carbonResult.expectedDelta, 0);
    assert.strictEqual(carbonResult.netInflow, 0);
    assert.strictEqual(carbonResult.netOutflow, 0);
    assert.strictEqual(carbonResult.isConserved, true);

    const nitrogenResult = deltas.get('nitrogen');
    assert.ok(nitrogenResult);
    assert.strictEqual(nitrogenResult.expectedDelta, 0);
    assert.strictEqual(nitrogenResult.isConserved, true);
  });

  it('2. Verify constant positive and negative flux scales linearly with deltaTime', () => {
    const state = new ThermodynamicStateVector({
      carbon: 800,
      atmosphere: 1200
    });
    const fluxes: FluxVector[] = [
      { sourceId: 'atmosphere', targetId: 'carbon', element: 'C', rate: 5.0 },
      { sourceId: 'carbon', targetId: 'atmosphere', element: 'C', rate: 2.0 }
    ];
    const dt = 5.0; // 5 seconds

    const deltas = StateValidator.calculateDelta(state, fluxes, dt);

    const carbonResult = deltas.get('carbon');
    assert.ok(carbonResult);
    // Inflow = 5.0 * 5 = 25; Outflow = 2.0 * 5 = 10; Expected Delta = 15
    assert.strictEqual(carbonResult.netInflow, 25.0);
    assert.strictEqual(carbonResult.netOutflow, 10.0);
    assert.strictEqual(carbonResult.expectedDelta, 15.0);
    assert.strictEqual(carbonResult.isConserved, true);

    const atmosResult = deltas.get('atmosphere');
    assert.ok(atmosResult);
    // Inflow = 2.0 * 5 = 10; Outflow = 5.0 * 5 = 25; Expected Delta = -15
    assert.strictEqual(atmosResult.netInflow, 10.0);
    assert.strictEqual(atmosResult.netOutflow, 25.0);
    assert.strictEqual(atmosResult.expectedDelta, -15.0);
    assert.strictEqual(atmosResult.isConserved, true);
  });

  it('3. Assert violation detection when stock drops below absolute zero (Second Law)', () => {
    const state = new ThermodynamicStateVector({
      water: 10.0
    });
    const fluxes: FluxVector[] = [
      { sourceId: 'water', targetId: 'ocean', element: 'H2O', rate: 5.0 }
    ];
    const dt = 5.0; // Outflow = 25, current = 10 -> projected = -15 (< 0)

    assert.throws(() => {
      StateValidator.calculateDelta(state, fluxes, dt);
    }, /Thermodynamic Violation \[Second Law\]/);
  });
});