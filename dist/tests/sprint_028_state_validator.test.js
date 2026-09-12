import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateValidator } from '../src/thermodynamics/state_validator.js';
import { ThermodynamicValidationError } from '../src/thermodynamics/types.js';
describe('Sprint 28: Thermodynamic State Vector Validation Wrapper', () => {
    const validator = new ThermodynamicStateValidator(0.0, 1e15);
    it('should validate a completely valid state vector successfully', () => {
        const validVector = {
            energy: 5.0e11,
            mass: 1.0e12,
            entropy: 1500.0,
            temperature: 288.15,
            pressure: 101325.0
        };
        const result = validator.validate(validVector);
        assert.strictEqual(result.isValid, true);
        assert.strictEqual(result.errors.length, 0);
        assert.doesNotThrow(() => validator.assertValid(validVector));
    });
    it('should detect missing mandatory properties', () => {
        const incompleteVector = {
            energy: 5.0e11,
            // missing mass, entropy, temperature, pressure
        };
        const result = validator.validate(incompleteVector);
        assert.strictEqual(result.isValid, false);
        assert.ok(result.errors.some((e) => e.includes("Missing mandatory property: 'mass'")));
        assert.ok(result.errors.some((e) => e.includes("Missing mandatory property: 'entropy'")));
        assert.throws(() => {
            validator.assertValid(incompleteVector);
        }, ThermodynamicValidationError);
    });
    it('should enforce Second Law entropy non-negativity constraint', () => {
        const invalidEntropyVector = {
            energy: 5.0e11,
            mass: 1.0e12,
            entropy: -5.4, // Negative entropy violation
            temperature: 288.15,
            pressure: 101325.0
        };
        const result = validator.validate(invalidEntropyVector);
        assert.strictEqual(result.isValid, false);
        assert.ok(result.errors.some((e) => e.includes("Second Law Violation")));
        assert.throws(() => {
            validator.assertValid(invalidEntropyVector);
        }, ThermodynamicValidationError);
    });
    it('should enforce First Law energy bounds', () => {
        const outOfBoundsEnergyVector = {
            energy: 2e15, // Above maxEnergy (1e15)
            mass: 1.0e12,
            entropy: 100.0,
            temperature: 288.15,
            pressure: 101325.0
        };
        const result = validator.validate(outOfBoundsEnergyVector);
        assert.strictEqual(result.isValid, false);
        assert.ok(result.errors.some((e) => e.includes("First Law Violation")));
    });
    it('should reject negative absolute temperatures and pressures', () => {
        const negativePhysicalVector = {
            energy: 5.0e11,
            mass: 1.0e12,
            entropy: 100.0,
            temperature: -10.0, // Negative Kelvin
            pressure: -1.0 // Negative Pascals
        };
        const result = validator.validate(negativePhysicalVector);
        assert.strictEqual(result.isValid, false);
        assert.ok(result.errors.some((e) => e.includes("Absolute temperature")));
        assert.ok(result.errors.some((e) => e.includes("Pressure")));
    });
});
