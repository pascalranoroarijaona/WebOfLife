import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateStateProperties } from '../src/thermodynamics/state_validator.js';
describe('Sprint 033: Thermodynamic State Vector Property Validator Helper', () => {
    it('TC-01: Valid State Vector should pass with zero errors', () => {
        const state = {
            energy: 1000.0,
            entropy: 50.0,
            temperature: 298.15,
            stocks: { C: 100, H2O: 500 }
        };
        const res = validateStateProperties(state);
        assert.strictEqual(res.valid, true);
        assert.strictEqual(res.errors?.length ?? 0, 0);
    });
    it('TC-02: Negative energy should fail with energy bound error', () => {
        const state = {
            energy: -100.0,
            entropy: 50.0,
            temperature: 298.15,
            stocks: { C: 100 }
        };
        const res = validateStateProperties(state);
        assert.strictEqual(res.valid, false);
        assert.ok(res.errors.some(e => e.reason.includes("energy")));
    });
    it('TC-03: Negative entropy should fail with entropy bound error', () => {
        const state = {
            energy: 1000.0,
            entropy: -10.0,
            temperature: 298.15,
            stocks: { C: 100 }
        };
        const res = validateStateProperties(state);
        assert.strictEqual(res.valid, false);
        assert.ok(res.errors.some(e => e.reason.includes("entropy")));
    });
    it('TC-04: Negative temperature should fail with absolute zero boundary error', () => {
        const state = {
            energy: 1000.0,
            entropy: 50.0,
            temperature: -5.0,
            stocks: { C: 100 }
        };
        const res = validateStateProperties(state);
        assert.strictEqual(res.valid, false);
        assert.ok(res.errors.some(e => e.reason.includes("temperature")));
    });
    it('TC-05: Negative stock inventory should fail with non-negative stock error', () => {
        const state = {
            energy: 1000.0,
            entropy: 50.0,
            temperature: 298.15,
            stocks: { C: -50 }
        };
        const res = validateStateProperties(state);
        assert.strictEqual(res.valid, false);
        assert.ok(res.errors.some(e => e.reason.includes("Stock inventory 'C'")));
    });
    it('TC-06: Undefined energy and null stocks should fail presence checks', () => {
        const state = {
            energy: undefined,
            entropy: 50.0,
            temperature: 298.15,
            stocks: null
        };
        const res = validateStateProperties(state);
        assert.strictEqual(res.valid, false);
        assert.ok((res.errors?.length ?? 0) >= 2);
    });
});
