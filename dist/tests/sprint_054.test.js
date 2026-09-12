import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateValidator } from '../src/thermodynamics/state_validator.js';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';
import { ThermodynamicViolationException, STANDARD_AMBIENT_TEMPERATURE_K } from '../src/thermodynamics/types.js';
describe('Sprint 054: Thermodynamic State Vector Stock Conservation Asserter', () => {
    it('should pass validation when stock delta matches net boundary flux within tolerance', () => {
        const validator = new StateValidator(1e-4);
        const prevState = new ThermodynamicStateVector({
            timestamp: 0,
            stocks: { carbon: 1000.0, energy: 50000.0 },
            internalEnergy: 50000,
            totalEntropy: 100,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            fluxes: { solarRadiation: 0, thermalEmission: 0, latentHeat: 0, sensibleHeat: 0 }
        });
        const currentState = new ThermodynamicStateVector({
            timestamp: 10,
            stocks: { carbon: 1050.0, energy: 51000.0 },
            internalEnergy: 51000,
            totalEntropy: 105,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            fluxes: { solarRadiation: 0, thermalEmission: 0, latentHeat: 0, sensibleHeat: 0 }
        });
        const fluxes = [
            { stockKey: 'carbon', rateIn: 10.0, rateOut: 5.0, sourceType: 'biogenic' }, // net 5 per time unit -> 5 * 10 = 50 delta
            { stockKey: 'energy', rateIn: 200.0, rateOut: 100.0, sourceType: 'solar' } // net 100 per time unit -> 100 * 10 = 1000 delta
        ];
        const result = validator.validateStockConservation(prevState, currentState, fluxes, 10.0);
        assert.strictEqual(result.isValid, true);
        assert.ok(result.discrepancies['carbon'] < 1e-4);
        assert.ok(result.discrepancies['energy'] < 1e-4);
    });
    it('should throw First Law violation when actual stock delta deviates beyond tolerance', () => {
        const validator = new StateValidator(1e-5);
        const prevState = new ThermodynamicStateVector({
            timestamp: 0,
            stocks: { water: 500.0 },
            internalEnergy: 1000,
            totalEntropy: 10,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            fluxes: { solarRadiation: 0, thermalEmission: 0, latentHeat: 0, sensibleHeat: 0 }
        });
        const currentState = new ThermodynamicStateVector({
            timestamp: 1,
            stocks: { water: 600.0 }, // Spontaneous mass creation!
            internalEnergy: 1000,
            totalEntropy: 10,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            fluxes: { solarRadiation: 0, thermalEmission: 0, latentHeat: 0, sensibleHeat: 0 }
        });
        const fluxes = [
            { stockKey: 'water', rateIn: 0.0, rateOut: 0.0, sourceType: 'closed' }
        ];
        assert.throws(() => {
            validator.validateStockConservation(prevState, currentState, fluxes, 1.0);
        }, (err) => {
            assert.ok(err instanceof ThermodynamicViolationException);
            assert.match(err.message, /First Law Conservation Failure/);
            return true;
        });
    });
    it('should throw Second Law / Solar-Only violation when energy is injected without valid solar forcing', () => {
        const validator = new StateValidator(1e-5);
        const prevState = new ThermodynamicStateVector({
            timestamp: 0,
            stocks: { energy: 1000.0 },
            internalEnergy: 1000,
            totalEntropy: 10,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            fluxes: { solarRadiation: 0, thermalEmission: 0, latentHeat: 0, sensibleHeat: 0 }
        });
        const currentState = new ThermodynamicStateVector({
            timestamp: 1,
            stocks: { energy: 2000.0 }, // Spontaneous energy creation
            internalEnergy: 2000,
            totalEntropy: 10,
            temperature: STANDARD_AMBIENT_TEMPERATURE_K,
            fluxes: { solarRadiation: 0, thermalEmission: 0, latentHeat: 0, sensibleHeat: 0 }
        });
        const fluxes = [
            { stockKey: 'energy', rateIn: 1000.0, rateOut: 0.0, sourceType: 'internal_geothermal_anomaly' }
        ];
        assert.throws(() => {
            validator.validateStockConservation(prevState, currentState, fluxes, 1.0);
        }, (err) => {
            assert.ok(err instanceof ThermodynamicViolationException);
            assert.match(err.message, /Second Law Violation/);
            return true;
        });
    });
});
