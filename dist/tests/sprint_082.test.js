import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateVector } from '../src/thermodynamics/state_vector.js';
import { StateDiscrepancyEvaluator } from '../src/thermodynamics/state_validator.js';
describe('Sprint 082: Thermodynamic State Vector Inventory Discrepancy Evaluator', () => {
    it('should evaluate zero discrepancy for identical state vectors', () => {
        const evaluator = new StateDiscrepancyEvaluator();
        const actual = new StateVector({
            carbon: 850,
            energy: 1e12,
            entropy: 5e9
        });
        const expected = new StateVector({
            carbon: 850,
            energy: 1e12,
            entropy: 5e9
        });
        const report = evaluator.evaluateDiscrepancy(actual, expected);
        assert.strictEqual(report.totalMassDelta, 0);
        assert.strictEqual(report.energyViolationDetected, false);
        assert.strictEqual(report.entropyDelta, 0);
        assert.strictEqual(report.absoluteDiscrepancy.get('carbon'), 0);
    });
    it('should detect mass imbalance breach (First Law violation)', () => {
        const evaluator = new StateDiscrepancyEvaluator(1e-6);
        const actual = new StateVector({
            carbon: 900, // +50 spontaneous creation
            energy: 1e12,
            entropy: 5e9
        });
        const expected = new StateVector({
            carbon: 850,
            energy: 1e12,
            entropy: 5e9
        });
        const report = evaluator.evaluateDiscrepancy(actual, expected);
        assert.strictEqual(report.totalMassDelta, 50);
        assert.strictEqual(report.energyViolationDetected, true);
    });
    it('should detect spontaneous energy generation breach', () => {
        const evaluator = new StateDiscrepancyEvaluator(1e-6);
        const actual = new StateVector({
            carbon: 850,
            energy: 2e12, // +1e12 spontaneous energy increase
            entropy: 5e9
        });
        const expected = new StateVector({
            carbon: 850,
            energy: 1e12,
            entropy: 5e9
        });
        const report = evaluator.evaluateDiscrepancy(actual, expected);
        assert.strictEqual(report.energyViolationDetected, true);
    });
});
