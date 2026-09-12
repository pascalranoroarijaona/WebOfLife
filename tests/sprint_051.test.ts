import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';
import { ThermodynamicStateValidator } from '../src/thermodynamics/state_validator.js';
import { FluxBoundary, ValidationFailure } from '../src/thermodynamics/types.js';

describe('Sprint 051: Thermodynamic State Vector Stock Conservation Asserter', () => {
  it('should verify closed-system mass balance within tolerance bounds', () => {
    const prevMap = new Map<string, number>([
      ['carbon', 850],
      ['nitrogen', 3900000],
      ['water', 1338000000]
    ]);
    const currMap = new Map<string, number>([
      ['carbon', 850],
      ['nitrogen', 3900000],
      ['water', 1338000000]
    ]);

    const prevState = new ThermodynamicStateVector(prevMap);
    const currState = new ThermodynamicStateVector(currMap);

    const boundary: FluxBoundary = {
      netFluxes: new Map(),
      solarInput: 0,
      dissipationRate: 0
    };

    const validator = new ThermodynamicStateValidator(1e-7);
    const result = validator.assertConservation(prevState, currState, boundary, 1.0);

    assert.strictEqual(result.isValid, true);
    assert.strictEqual(Object.keys(result.violations ?? {}).length, 0);
  });

  it('should verify solar input and thermal dissipation balance for energy stocks', () => {
    const prevMap = new Map<string, number>([['energy', 1e12]]);
    const currMap = new Map<string, number>([['energy', 1e12 + (1.74e17 * 0.1 - 1.74e17 * 0.05) * 1.0]]);

    const prevState = new ThermodynamicStateVector(prevMap);
    const currState = new ThermodynamicStateVector(currMap);

    const boundary: FluxBoundary = {
      netFluxes: new Map([['energy', 0]]),
      solarInput: 1.74e17 * 0.1,
      dissipationRate: 1.74e17 * 0.05
    };

    const validator = new ThermodynamicStateValidator(1e-5);
    const result = validator.assertConservation(prevState, currState, boundary, 1.0);

    assert.strictEqual(result.isValid, true);
  });

  it('should detect boundary flux violations and return populated violation records', () => {
    const prevMap = new Map<string, number>([['carbon', 850]]);
    const currMap = new Map<string, number>([['carbon', 950]]);

    const prevState = new ThermodynamicStateVector(prevMap);
    const currState = new ThermodynamicStateVector(currMap);

    const boundary: FluxBoundary = {
      netFluxes: new Map([['carbon', 0]]),
      solarInput: 0,
      dissipationRate: 0
    };

    const validator = new ThermodynamicStateValidator(1e-6);
    const result = validator.assertConservation(prevState, currState, boundary, 1.0);

    assert.strictEqual(result.isValid, false);
    const violations = (result.errors ?? []) as ValidationFailure[];
    assert.strictEqual(violations.length, 1);
    assert.strictEqual(violations[0].stockName, 'carbon');
    assert.strictEqual(violations[0].observedDelta, 100);
  });
});