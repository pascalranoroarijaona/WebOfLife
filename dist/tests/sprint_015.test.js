import { describe, it } from 'node:test';
import assert from 'node:assert';
import { guardH3Payload, processSpatialMonad, H3Grid } from '../src/spatial/h3_grid.js';
describe('Sprint 015: Null-Check Guard Clauses for H3 String Payloads', () => {
    it('should successfully pass valid H3 strings', () => {
        const validHex = '8928308280fffff';
        const result = guardH3Payload(validHex);
        assert.strictEqual(result, validHex);
    });
    it('should trim and pass valid H3 strings with surrounding whitespace', () => {
        const paddedHex = '  8928308280fffff   ';
        const result = guardH3Payload(paddedHex);
        assert.strictEqual(result, '8928308280fffff');
    });
    it('should throw an error for null payloads', () => {
        assert.throws(() => {
            guardH3Payload(null);
        }, /cannot be null or undefined/);
    });
    it('should throw an error for undefined payloads', () => {
        assert.throws(() => {
            guardH3Payload(undefined);
        }, /cannot be null or undefined/);
    });
    it('should throw an error for non-string payloads (e.g. numbers)', () => {
        assert.throws(() => {
            guardH3Payload(12345);
        }, /must be a non-empty string/);
    });
    it('should throw an error for empty string payloads', () => {
        assert.throws(() => {
            guardH3Payload('');
        }, /must be a non-empty string/);
    });
    it('should throw an error for whitespace-only payloads', () => {
        assert.throws(() => {
            guardH3Payload('   \t\n   ');
        }, /must be a non-empty string/);
    });
    it('processSpatialMonad should return isValid: true for valid payloads', () => {
        const res = processSpatialMonad('8928308280fffff');
        assert.strictEqual(res.isValid, true);
        assert.strictEqual(res.payload, '8928308280fffff');
        assert.strictEqual(res.error, undefined);
    });
    it('processSpatialMonad should return isValid: false and capture error for null/invalid payloads', () => {
        const res = processSpatialMonad(null);
        assert.strictEqual(res.isValid, false);
        assert.strictEqual(res.payload, null);
        assert.ok(res.error && res.error.includes('Thermodynamic Violation'));
    });
    it('H3Grid should correctly register and track valid tokens while rejecting null noise', () => {
        const grid = new H3Grid();
        const token = grid.registerPayload('8928308280fffff');
        assert.strictEqual(grid.size, 1);
        assert.strictEqual(grid.hasIndex('8928308280fffff'), true);
        assert.strictEqual(grid.hasIndex(null), false);
    });
});
