import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateValidator, ThermodynamicStateVector } from '../src/thermodynamics/state_validator.js';
describe('Sprint 053: Thermodynamic State Vector Stock Conservation Asserter', () => {
    it('1. Balanced Flux Test - validates successful conservation when stock deltas match boundary fluxes', () => {
        const validator = new StateValidator(1.0e-6);
        const prevStocks = {
            carbon: 850.0,
            water: 1338000000.0
        };
        const currStocks = {
            carbon: 852.0,
            water: 1337999990.0
        };
        const previous = new ThermodynamicStateVector({ timestamp: 0, stocks: prevStocks, internalEnergy: 1000, totalEntropy: 100, temperature: 298.15, entropy: 100 });
        const current = new ThermodynamicStateVector({ timestamp: 1, stocks: currStocks, internalEnergy: 1000, totalEntropy: 100, temperature: 298.15, entropy: 100 });
        const fluxesMap = new Map([
            ['carbon', 2.0],
            ['water', -10.0]
        ]);
        const fluxes = { fluxes: fluxesMap };
        const result = validator.validateConservation(previous, current, fluxes, 1.0);
        assert.strictEqual(result.valid, true, 'State vector should be valid when deltas match fluxes exactly');
        const discrepanciesMap = result.discrepancies instanceof Map ? result.discrepancies : new Map(Object.entries(result.discrepancies));
        assert.strictEqual(discrepanciesMap.size, 2, 'There should be entries for carbon and water');
        assert.doesNotThrow(() => {
            validator.assertConservation(previous, current, fluxes, 1.0, 1.0e-6);
        });
    });
    it('2. Mass Leak Detection Test - identifies and flags unmonitored mass delta violations', () => {
        const validator = new StateValidator(1.0e-6);
        const prevStocks = {
            nitrogen: 3900000.0
        };
        const currStocks = {
            nitrogen: 3900100.0
        };
        const previous = new ThermodynamicStateVector({ timestamp: 10, stocks: prevStocks, internalEnergy: 1000, totalEntropy: 100, temperature: 298.15, entropy: 100 });
        const current = new ThermodynamicStateVector({ timestamp: 12, stocks: currStocks, internalEnergy: 1000, totalEntropy: 100, temperature: 298.15, entropy: 100 });
        const fluxesMap = new Map([
            ['nitrogen', 5.0]
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
        const discrepanciesMap = result.discrepancies instanceof Map
            ? result.discrepancies
            : new Map(Object.entries(result.discrepancies));
        assert.strictEqual(discrepanciesMap.has('nitrogen'), true, 'Nitrogen discrepancy must be recorded');
        const disc = (discrepanciesMap instanceof Map ? discrepanciesMap.get('nitrogen') : discrepanciesMap['nitrogen']);
        assert.ok(disc);
        assert.strictEqual(disc.expectedDelta, 10.0);
        assert.strictEqual(disc.actualDelta, 100.0);
        assert.strictEqual(disc.error, 90.0);
        assert.strictEqual(hookCalled, true, 'Conservation hook must be triggered on violation');
        assert.ok(capturedResult);
        assert.throws(() => {
            validator.assertConservation(previous, current, fluxes, 2.0, 1.0e-6);
        });
    });
    it('3. Tolerance Boundary Test - tests edge cases near tolerance threshold epsilon', () => {
        const epsilon = 1.0e-4;
        const validator = new StateValidator(epsilon);
        const prevStocks = { phosphorus: 1000.0 };
        const currStocks = { phosphorus: 1000.0 + 0.00005 };
        const previous = new ThermodynamicStateVector({ timestamp: 0, stocks: prevStocks, internalEnergy: 1000, totalEntropy: 100, temperature: 298.15, entropy: 100 });
        const current = new ThermodynamicStateVector({ timestamp: 1, stocks: currStocks, internalEnergy: 1000, totalEntropy: 100, temperature: 298.15, entropy: 100 });
        const fluxes = { fluxes: new Map([['phosphorus', 0.0]]) };
        const resWithin = validator.validateConservation(previous, current, fluxes, 1.0);
        assert.strictEqual(resWithin.valid, true, 'Delta within tolerance threshold should be valid');
        const currStocksBad = { phosphorus: 1000.0 + 0.0002 };
        const currentBad = new ThermodynamicStateVector({ timestamp: 1, stocks: currStocksBad, internalEnergy: 1000, totalEntropy: 100, temperature: 298.15, entropy: 100 });
        const resOutside = validator.validateConservation(previous, currentBad, fluxes, 1.0);
        assert.strictEqual(resOutside.valid, false, 'Delta exceeding tolerance threshold should be invalid');
    });
});
