import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateValidator } from '../src/thermodynamics/state_validator.js';
describe('Sprint 053: Thermodynamic State Vector Stock Conservation Asserter', () => {
    it('1. Balanced Flux Test - validates successful conservation when stock deltas match boundary fluxes', () => {
        const validator = new StateValidator(1.0e-6);
        const prevStocks = new Map([
            ['carbon', 850.0],
            ['water', 1338000000.0]
        ]);
        const currStocks = new Map([
            ['carbon', 852.0], // Delta = +2.0
            ['water', 1337999990.0] // Delta = -10.0
        ]);
        const previous = { timestamp: 0, stocks: prevStocks };
        const current = { timestamp: 1, stocks: currStocks };
        const fluxesMap = new Map([
            ['carbon', 2.0], // 2.0 * 1s = 2.0 expected delta
            ['water', -10.0] // -10.0 * 1s = -10.0 expected delta
        ]);
        const fluxes = { fluxes: fluxesMap };
        const result = validator.validateConservation(previous, current, fluxes, 1.0);
        assert.strictEqual(result.valid, true, 'State vector should be valid when deltas match fluxes exactly');
        assert.strictEqual(result.discrepancies?.size, 0, 'There should be zero discrepancies');
        // Should not throw
        assert.doesNotThrow(() => {
            validator.assertConservation(previous, current, fluxes, 1.0);
        });
    });
    it('2. Mass Leak Detection Test - identifies and flags unmonitored mass delta violations', () => {
        const validator = new StateValidator(1.0e-6);
        const prevStocks = new Map([
            ['nitrogen', 3900000.0]
        ]);
        const currStocks = new Map([
            ['nitrogen', 3900100.0] // Actual delta = +100.0 (Mass leak!)
        ]);
        const previous = { timestamp: 10, stocks: prevStocks };
        const current = { timestamp: 12, stocks: currStocks }; // dt = 2s
        const fluxesMap = new Map([
            ['nitrogen', 5.0] // Expected net flux rate = 5.0 -> expected delta over 2s = 10.0
        ]);
        const fluxes = { fluxes: fluxesMap };
        let hookCalled = false;
        let capturedResult = null;
        validator.registerConservationHook((res) => {
            hookCalled = true;
            capturedResult = res;
        });
        const result = validator.validateConservation(previous, current, fluxes, 2.0);
        assert.strictEqual(result.valid, false, 'Validation should fail due to mass leak');
        assert.strictEqual(result.discrepancies?.has('nitrogen'), true, 'Nitrogen discrepancy must be recorded');
        const disc = result.discrepancies?.get('nitrogen');
        assert.ok(disc);
        assert.strictEqual(disc.expectedDelta, 10.0);
        assert.strictEqual(disc.actualDelta, 100.0);
        assert.strictEqual(disc.error, 90.0);
        assert.strictEqual(hookCalled, true, 'Conservation hook must be triggered on violation');
        assert.ok(capturedResult);
        assert.throws(() => {
            validator.assertConservation(previous, current, fluxes, 2.0);
        }, /Thermodynamic Conservation Violation Detected/);
    });
    it('3. Tolerance Boundary Test - tests edge cases near tolerance threshold epsilon', () => {
        const epsilon = 1.0e-4;
        const validator = new StateValidator(epsilon);
        const prevStocks = new Map([['phosphorus', 1000.0]]);
        const currStocks = new Map([['phosphorus', 1000.0 + 0.00005]]); // error = 5e-5 (< epsilon)
        const previous = { timestamp: 0, stocks: prevStocks };
        const current = { timestamp: 1, stocks: currStocks };
        const fluxes = { fluxes: new Map([['phosphorus', 0.0]]) };
        // Within tolerance -> valid
        const resWithin = validator.validateConservation(previous, current, fluxes, 1.0);
        assert.strictEqual(resWithin.valid, true, 'Delta within tolerance threshold should be valid');
        // Just outside tolerance -> invalid
        const currStocksBad = new Map([['phosphorus', 1000.0 + 0.0002]]); // error = 2e-4 (> epsilon)
        const currentBad = { timestamp: 1, stocks: currStocksBad };
        const resOutside = validator.validateConservation(previous, currentBad, fluxes, 1.0);
        assert.strictEqual(resOutside.valid, false, 'Delta exceeding tolerance threshold should be invalid');
    });
});
