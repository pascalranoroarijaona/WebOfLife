import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateValidator } from '../src/thermodynamics/state_validator.js';
import { ThermodynamicMonadProcess } from '../src/thermodynamics/monad_process.js';
import { ThermodynamicStateVector } from '../src/thermodynamics/types.js';

describe('Sprint 031: Thermodynamic State Vector Validation & Monad Methods', () => {
  it('should validate a correct thermodynamic state vector successfully', () => {
    const validator = new StateValidator();
    const validState: ThermodynamicStateVector = {
      temperature: 298.15,
      stocks: { carbon: 850, water: 1338000000 },
      entropy: 5000,
      dissipationRate: 10.5,
      solarInput: 0
    };

    const result = validator.validateState(validState);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should catch missing temperature or invalid stocks', () => {
    const validator = new StateValidator();
    const invalidState: any = {
      temperature: NaN,
      stocks: null,
      entropy: 100
    };

    const result = validator.validateState(invalidState);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some((e: any) => e.includes('temperature') || e.includes('Invalid')));
    assert.ok(result.errors.some((e: any) => e.includes('stocks') || e.includes('Missing')));
  });

  it('should enforce Second Law non-negative entropy and dissipation checks', () => {
    const validator = new StateValidator();
    const badEntropyState: ThermodynamicStateVector = {
      temperature: 300,
      stocks: { carbon: 100 },
      entropy: -10,
      dissipationRate: -5
    };

    const result = validator.validateState(badEntropyState);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some((e: any) => e.includes('Entropy must be non-negative')));
    assert.ok(result.errors.some((e: any) => e.includes('Dissipation rate cannot be negative')));
  });

  it('should enforce First Law conservation across valid stock transitions', () => {
    const validator = new StateValidator();
    const prior: ThermodynamicStateVector = {
      temperature: 298,
      stocks: { carbon: 100, nitrogen: 50 },
      entropy: 1000,
      solarInput: 10
    };

    const next: ThermodynamicStateVector = {
      temperature: 298.5,
      stocks: { carbon: 105, nitrogen: 55 },
      entropy: 1010,
      solarInput: 10
    };

    const result = validator.validateTransition(prior, next);
    assert.strictEqual(result.isValid, true);
  });

  it('should reject First Law violations when stock delta does not match solar input', () => {
    const validator = new StateValidator({ strictMode: true });
    const prior: ThermodynamicStateVector = {
      temperature: 298,
      stocks: { carbon: 100 },
      entropy: 1000,
      solarInput: 5
    };

    const next: ThermodynamicStateVector = {
      temperature: 298,
      stocks: { carbon: 200 }, // delta = 100, solar = 5 -> violation
      entropy: 1000,
      solarInput: 5
    };

    const result = validator.validateTransition(prior, next);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some((e: any) => e.includes('First Law Violation')));
  });

  it('should successfully execute ThermodynamicMonadProcess steps on compliant states', () => {
    const monadProcess = new ThermodynamicMonadProcess();
    const initialState: ThermodynamicStateVector = {
      temperature: 298,
      stocks: { biomass: 50 },
      entropy: 500,
      solarInput: 5
    };

    const transitionFn = (s: ThermodynamicStateVector): ThermodynamicStateVector => {
      const stocksRecord = s.stocks instanceof Map ? Object.fromEntries(s.stocks) : s.stocks;
      const biomassVal = Number((stocksRecord as any)?.biomass ?? 0);
      const currentEntropy = s.entropy ?? 0;
      return {
        ...s,
        stocks: { ...stocksRecord, biomass: biomassVal + 5 },
        entropy: currentEntropy + 2
      };
    };

    const finalState = monadProcess.step(initialState, transitionFn);
    const finalStocks = finalState.stocks instanceof Map ? Object.fromEntries(finalState.stocks) : finalState.stocks;
    assert.strictEqual((finalStocks as any).biomass, 55);
  });

  it('should throw an error in ThermodynamicMonadProcess when transition violates thermodynamic laws', () => {
    const monadProcess = new ThermodynamicMonadProcess();
    const initialState: ThermodynamicStateVector = {
      temperature: 298,
      stocks: { biomass: 50 },
      entropy: 500,
      solarInput: 0
    };

    const badTransitionFn = (s: ThermodynamicStateVector): ThermodynamicStateVector => {
      const stocksRecord = s.stocks instanceof Map ? Object.fromEntries(s.stocks) : s.stocks;
      const biomassVal = Number((stocksRecord as any)?.biomass ?? 0);
      return {
        ...s,
        stocks: { ...stocksRecord, biomass: biomassVal + 1000 } // Violation
      };
    };

    assert.throws(() => {
      monadProcess.step(initialState, badTransitionFn);
    }, /Monad step aborted due to thermodynamic transition violation/);
  });
});