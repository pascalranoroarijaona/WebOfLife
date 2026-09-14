import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isValidH3Resolution, assertValidH3Resolution } from '../src/spatial/h3_grid.js';
describe('Sprint 027: H3 Resolution Tier Boundary Validation', () => {
    it('should return true for valid resolution tiers 0 through 15', () => {
        for (let r = 0; r <= 15; r++) {
            assert.strictEqual(isValidH3Resolution(r), true, `Resolution ${r} should be valid`);
        }
    });
    it('should return false for negative numbers', () => {
        assert.strictEqual(isValidH3Resolution(-1), false);
        assert.strictEqual(isValidH3Resolution(-10), false);
    });
    it('should return false for numbers greater than 15', () => {
        assert.strictEqual(isValidH3Resolution(16), false);
        assert.strictEqual(isValidH3Resolution(100), false);
    });
    it('should return false for floating-point values', () => {
        assert.strictEqual(isValidH3Resolution(3.5), false);
        assert.strictEqual(isValidH3Resolution(0.1), false);
        assert.strictEqual(isValidH3Resolution(14.9), false);
    });
    it('should assert successfully for valid resolution tiers', () => {
        assert.doesNotThrow(() => {
            assertValidH3Resolution(0);
            assertValidH3Resolution(7);
            assertValidH3Resolution(15);
        });
    });
    it('should throw an error for invalid resolution tiers in assertValidH3Resolution', () => {
        assert.throws(() => {
            assertValidH3Resolution(-1);
        }, /Thermodynamic Spatial Invariant Violation/);
        assert.throws(() => {
            assertValidH3Resolution(16);
        }, /Thermodynamic Spatial Invariant Violation/);
        assert.throws(() => {
            assertValidH3Resolution(3.5);
        }, /Thermodynamic Spatial Invariant Violation/);
    });
});
