import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateValidator } from '../src/thermodynamics/state_validator.js';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';

describe('Sprint 030: Thermodynamic State Vector Validation Wrapper', () => {
  const validator = new ThermodynamicStateValidator();

  it('should validate a well-formed thermodynamic state vector successfully', () => {
    const validState: any = {
      energy: 1e12,
      entropy: 5e9,
      temperature: 288.15,
      stocks: {
        carbon: 850,
        nitrogen: 3900000,
        phosphorus: 4e9,
        water: 1338000000
      },
      elementalStocks: {
        carbon: 850,
        nitrogen: 3900000,
        phosphorus: 4e9,
        water: 1338000000
      }
    };

    const result = validator.validate(validState);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.errors.length, 0);
    assert.doesNotThrow(() => validator.assertValid(validState));
  });

  it('should detect missing mandatory properties', () => {
    const incompleteState: any = {
      energy: 1e12,
      temperature: 288.15
      // missing entropy and elementalStocks
    };

    const result = validator.validate(incompleteState);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes('entropy')));
    assert.ok(result.errors.some(e => e.includes('elementalStocks')));
    assert.throws(() => validator.assertValid(incompleteState), /Validation Failed/);
  });

  it('should reject negative entropy (Second Law violation)', () => {
    const invalidEntropyState: any = {
      energy: 1e12,
      entropy: -100, // Negative entropy violates 2nd Law
      temperature: 288.15,
      stocks: { carbon: 100 },
      elementalStocks: { carbon: 100 }
    };

    const result = validator.validate(invalidEntropyState);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes('Entropy cannot be negative')));
    assert.throws(() => validator.assertValid(invalidEntropyState));
  });

  it('should reject negative absolute temperature (Third Law / kinetic limits)', () => {
    const invalidTempState: any = {
      energy: 1e12,
      entropy: 500,
      temperature: -5.0, // Negative Kelvin
      stocks: { carbon: 100 },
      elementalStocks: { carbon: 100 }
    };

    const result = validator.validate(invalidTempState);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes('Absolute temperature cannot be negative')));
    assert.throws(() => validator.assertValid(invalidTempState));
  });

  it('should reject negative elemental mass stocks (First Law matter conservation violation)', () => {
    const invalidStockState: any = {
      energy: 1e12,
      entropy: 500,
      temperature: 288.15,
      stocks: {
        carbon: 500,
        nitrogen: -15.5
      },
      elementalStocks: {
        carbon: 500,
        nitrogen: -15.5 // Negative mass stock
      }
    };

    const result = validator.validate(invalidStockState);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes("Elemental stock 'nitrogen' is negative")));
    assert.throws(() => validator.assertValid(invalidStockState));
  });
});