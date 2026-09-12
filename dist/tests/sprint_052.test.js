import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateValidator } from '../src/thermodynamics/state_validator.js';
describe('Sprint 052: Thermodynamic State Vector Stock Conservation Asserter', () => {
    it('should validate closed-system mass conservation accurately', () => {
        const preState = {
            timestamp: 0,
            stocks: new Map([
                ['C_organic', 1500.0],
                ['H2O_liquid', 50000.0]
            ]),
            enthalpy: 1e5,
            entropy: 1000
        };
        const postState = {
            timestamp: 10,
            stocks: new Map([
                ['C_organic', 1550.0],
                ['H2O_liquid', 49950.0]
            ]),
            enthalpy: 1e5,
            entropy: 1005
        };
        const boundaryFluxes = new Map([
            ['C_organic', 5.0], // 5.0 units/s * 10s = 50.0 delta
            ['H2O_liquid', -5.0] // -5.0 units/s * 10s = -50.0 delta
        ]);
        const validator = new StateValidator(1e-6);
        const reports = validator.validateStockConservation(preState, postState, boundaryFluxes, 10.0);
        assert.strictEqual(reports.length, 2);
        for (const report of reports) {
            assert.strictEqual(report.isValid, true);
            assert.ok(report.discrepancy <= report.tolerance);
        }
        // Should not throw
        assert.doesNotThrow(() => {
            validator.assertOrThrow(preState, postState, boundaryFluxes, 10.0);
        });
    });
    it('should detect thermodynamic conservation violations and throw error', () => {
        const preState = {
            timestamp: 0,
            stocks: new Map([['Energy', 1000.0]]),
            enthalpy: 1000,
            entropy: 100
        };
        const postState = {
            timestamp: 1,
            stocks: new Map([['Energy', 1500.0]]), // Unaccounted energy gain
            enthalpy: 1500,
            entropy: 110
        };
        const boundaryFluxes = new Map([['Energy', 10.0]]); // Expected delta: 10 * 1 = 10
        const validator = new StateValidator(1e-6);
        assert.throws(() => {
            validator.assertOrThrow(preState, postState, boundaryFluxes, 1.0);
        }, /Thermodynamic Conservation Violation Detected/);
    });
    it('should handle open-system geochemical cycles and carbon balance invariant checks', () => {
        const preState = {
            timestamp: 100,
            stocks: new Map([
                ['Carbon', 850.0],
                ['Nitrogen', 3900000.0],
                ['Water', 1338000000.0]
            ]),
            enthalpy: 5e12,
            entropy: 2e10
        };
        const postState = {
            timestamp: 101,
            stocks: new Map([
                ['Carbon', 852.0],
                ['Nitrogen', 3900000.0],
                ['Water', 1338000000.0]
            ]),
            enthalpy: 5.01e12,
            entropy: 2.01e10
        };
        const boundaryFluxes = new Map([
            ['Carbon', 2.0],
            ['Nitrogen', 0.0],
            ['Water', 0.0]
        ]);
        const validator = new StateValidator(1e-5);
        const reports = validator.validateStockConservation(preState, postState, boundaryFluxes, 1.0);
        const carbonReport = reports.find((r) => r.element === 'Carbon');
        assert.ok(carbonReport);
        assert.strictEqual(carbonReport?.isValid, true);
        assert.strictEqual(carbonReport?.expectedDelta, 2.0);
        assert.strictEqual(carbonReport?.actualDelta, 2.0);
    });
});
