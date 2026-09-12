import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateValidator } from '../src/thermodynamics/state_validator.js';
describe('Sprint 076: Thermodynamic State Vector Discrepancy Mapping Iterator', () => {
    it('1. Zero-Discrepancy Baseline: identical maps return conserved: true', () => {
        const validator = new StateValidator(1e-6);
        const baseline = new Map([
            ['C', 850],
            ['N', 3900000],
            ['P', 4e9],
            ['H2O', 1338000000]
        ]);
        const stocks = new Map([
            ['C', 850],
            ['N', 3900000],
            ['P', 4e9],
            ['H2O', 1338000000]
        ]);
        const summary = validator.mapDiscrepancies(stocks, baseline);
        assert.strictEqual(summary.conserved, true);
        assert.strictEqual(summary.maxDiscrepancy, 0);
        assert.strictEqual(summary.totalRecords, 4);
        for (const record of summary.records) {
            assert.strictEqual(record.isWithinTolerance, true);
            assert.strictEqual(record.discrepancy, 0);
        }
    });
    it('2. Threshold Violation Injection: carbon delta exceeding epsilon triggers alert', () => {
        const validator = new StateValidator(1e-6);
        const baseline = new Map([
            ['C', 850],
            ['N', 3900000]
        ]);
        const stocks = new Map([
            ['C', 850.5], // ΔC = 0.5 > 1e-6
            ['N', 3900000]
        ]);
        const summary = validator.mapDiscrepancies(stocks, baseline);
        assert.strictEqual(summary.conserved, false);
        assert.strictEqual(summary.maxDiscrepancy, 0.5);
        const carbonRecord = summary.records.find((r) => r.element === 'C');
        assert.ok(carbonRecord);
        assert.strictEqual(carbonRecord.isWithinTolerance, false);
        assert.strictEqual(carbonRecord.discrepancy, 0.5);
    });
    it('3. Multi-Element Aggregation: simultaneous iteration across C, N, P, H2O stocks', () => {
        const validator = new StateValidator(1e-3);
        const baseline = new Map([
            ['C', 100],
            ['N', 200],
            ['P', 300],
            ['H2O', 400]
        ]);
        const stocks = new Map([
            ['C', 100.0001],
            ['N', 200.0002],
            ['P', 300.0003],
            ['H2O', 400.0004]
        ]);
        const summary = validator.mapDiscrepancies(stocks, baseline);
        assert.strictEqual(summary.conserved, true);
        assert.strictEqual(summary.totalRecords, 4);
        assert.ok(summary.maxDiscrepancy <= 1e-3);
    });
});
