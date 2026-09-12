import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateStateProperties } from '../src/thermodynamics/state_validator.js';
import { EarthPOD, bootstrapMegaPod } from '../src/earth_pod.js';
describe('Sprint 032: Thermodynamic State Vector Property Validator', () => {
    it('should validate a correct state vector successfully', () => {
        const validState = {
            energy: 1e12,
            entropy: 5e9,
            temperature: 288.15,
            stocks: {
                carbon: 850,
                nitrogen: 3.9e6,
                water: 1.33e9
            }
        };
        const result = validateStateProperties(validState);
        assert.strictEqual(result.isValid, true);
        assert.strictEqual(result.errors?.length ?? 0, 0);
    });
    it('should reject null or non-object states gracefully without throwing', () => {
        assert.deepStrictEqual(validateStateProperties(null), {
            isValid: false,
            valid: false,
            errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
            violations: ['root: State must be a non-null object.']
        });
        assert.deepStrictEqual(validateStateProperties('not-an-object'), {
            isValid: false,
            valid: false,
            errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
            violations: ['root: State must be a non-null object.']
        });
        assert.deepStrictEqual(validateStateProperties(42), {
            isValid: false,
            valid: false,
            errors: [{ property: 'root', reason: 'State must be a non-null object.' }],
            violations: ['root: State must be a non-null object.']
        });
    });
    it('should detect missing or invalid thermodynamic properties (energy, entropy, temperature)', () => {
        const faultyState = {
            energy: NaN,
            entropy: -10,
            temperature: -5,
            stocks: {}
        };
        const result = validateStateProperties(faultyState);
        assert.strictEqual(result.isValid, false);
        assert.strictEqual(result.errors?.length ?? 0, 3);
        assert.ok(result.errors.some((e) => e.property === 'energy'));
        assert.ok(result.errors.some((e) => e.property === 'entropy'));
        assert.ok(result.errors.some((e) => e.property === 'temperature'));
    });
    it('should validate biogeochemical stocks correctly', () => {
        const faultyStocksState = {
            energy: 1000,
            entropy: 10,
            temperature: 300,
            stocks: {
                validStock: 50,
                negativeStock: -5,
                invalidTypeStock: '100'
            }
        };
        const result = validateStateProperties(faultyStocksState);
        assert.strictEqual(result.isValid, false);
        assert.strictEqual(result.errors?.length ?? 0, 2);
        assert.ok(result.errors.some((e) => e.property === 'stocks.negativeStock'));
        assert.ok(result.errors.some((e) => e.property === 'stocks.invalidTypeStock'));
    });
    it('should validate EarthPOD state vector compatibility', () => {
        bootstrapMegaPod();
        const earth = EarthPOD.getInstance();
        const stateVector = earth.getStateVector();
        const result = validateStateProperties(stateVector);
        assert.strictEqual(result.isValid, true);
    });
});
