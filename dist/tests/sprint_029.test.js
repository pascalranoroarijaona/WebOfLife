import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicStateValidator } from '../src/thermodynamics/state_validator.js';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';
describe('Sprint 029: Thermodynamic State Vector Validation Wrapper', () => {
    const validVector = new ThermodynamicStateVector({
        energy: 1000,
        entropy: 50,
        temperature: 298.15,
        stocks: {
            carbon: 500,
            nitrogen: 200,
            phosphorus: 50,
            water: 10000
        }
    });
    it('should pass validation for a completely valid ThermodynamicStateVector', () => {
        assert.doesNotThrow(() => {
            ThermodynamicStateValidator.validateStateVector(validVector);
        });
        const validator = new ThermodynamicStateValidator();
        assert.strictEqual(validator.validateStateVector(validVector), true);
    });
    it('should throw ValidationError if vector is null or undefined', () => {
        assert.throws(() => {
            ThermodynamicStateValidator.validateStateVector(null);
        }, /ValidationError: ThermodynamicStateVector is null or undefined/);
    });
    it('should throw ValidationError if energy property is missing', () => {
        const invalid = { ...validVector, energy: undefined };
        assert.throws(() => {
            ThermodynamicStateValidator.validateStateVector(invalid);
        }, /ValidationError: Missing required property 'energy'/);
    });
    it('should throw ValidationError if entropy property is missing', () => {
        const invalid = { ...validVector, entropy: undefined };
        assert.throws(() => {
            ThermodynamicStateValidator.validateStateVector(invalid);
        }, /ValidationError: Missing required property 'entropy'/);
    });
    it('should throw ValidationError if temperature property is missing', () => {
        const invalid = { ...validVector, temperature: undefined };
        assert.throws(() => {
            ThermodynamicStateValidator.validateStateVector(invalid);
        }, /ValidationError: Missing required property 'temperature'/);
    });
    it('should throw ValidationError if stocks property is missing', () => {
        const invalid = { ...validVector, stocks: undefined };
        assert.throws(() => {
            ThermodynamicStateValidator.validateStateVector(invalid);
        }, /ValidationError: Missing required property 'stocks'/);
    });
    it('should throw ThermodynamicViolation (Second Law) if entropy is negative', () => {
        const invalid = new ThermodynamicStateVector({ ...validVector, entropy: -10 });
        assert.throws(() => {
            ThermodynamicStateValidator.validateStateVector(invalid);
        }, /ThermodynamicViolation \(Second Law\): Entropy cannot be negative/);
    });
    it('should throw ThermodynamicViolation if temperature is zero or negative', () => {
        const invalidZero = new ThermodynamicStateVector({ ...validVector, temperature: 0 });
        assert.throws(() => {
            ThermodynamicStateValidator.validateStateVector(invalidZero);
        }, /ThermodynamicViolation: Absolute temperature must be strictly positive/);
        const invalidNegative = new ThermodynamicStateVector({ ...validVector, temperature: -5 });
        assert.throws(() => {
            ThermodynamicStateValidator.validateStateVector(invalidNegative);
        }, /ThermodynamicViolation: Absolute temperature must be strictly positive/);
    });
    it('should throw ThermodynamicViolation (First Law) if any stock is negative', () => {
        const invalidStock = new ThermodynamicStateVector({
            ...validVector,
            stocks: { carbon: 100, nitrogen: -5 }
        });
        assert.throws(() => {
            ThermodynamicStateValidator.validateStateVector(invalidStock);
        }, /ThermodynamicViolation \(First Law\): Stock 'nitrogen' has negative mass\/count/);
    });
    it('should successfully wrap and guard monad step execution', () => {
        const mockStep = (vec) => vec.clone({
            energy: vec.energy + 10,
            entropy: vec.entropy + 1
        });
        const guardedStep = ThermodynamicStateValidator.wrapMonadStep(mockStep);
        const result = guardedStep(validVector);
        assert.strictEqual(result.energy, 1010);
        assert.strictEqual(result.entropy, 51);
        // If step produces unphysical result (e.g. negative entropy), post-validation catches it
        const corruptStep = (vec) => vec.clone({
            entropy: -5
        });
        const guardedCorruptStep = ThermodynamicStateValidator.wrapMonadStep(corruptStep);
        assert.throws(() => {
            guardedCorruptStep(validVector);
        }, /ThermodynamicViolation \(Second Law\)/);
    });
});
