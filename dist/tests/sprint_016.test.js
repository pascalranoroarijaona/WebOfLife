import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isValidH3Index, createSpatialMonad } from '../src/spatial/h3_grid.js';
describe('Sprint 016: H3 Spatial 15-Character Length Validation', () => {
    it('H3-VAL-01: should return true for a valid 15-character lowercase hex string', () => {
        const validLower = '8f283082801ffff';
        assert.strictEqual(isValidH3Index(validLower), true);
    });
    it('H3-VAL-02: should return true for a valid 15-character uppercase hex string', () => {
        const validUpper = '8F283082801FFFF';
        assert.strictEqual(isValidH3Index(validUpper), true);
    });
    it('H3-VAL-03: should return false for a 14-character string', () => {
        const tooShort = '8f283082801fff';
        assert.strictEqual(isValidH3Index(tooShort), false);
    });
    it('H3-VAL-04: should return false for a 16-character string', () => {
        const tooLong = '8f283082801fffff';
        assert.strictEqual(isValidH3Index(tooLong), false);
    });
    it('H3-VAL-05: should return false for a string containing non-hex characters', () => {
        const nonHex = '8f283082801fffg';
        assert.strictEqual(isValidH3Index(nonHex), false);
    });
    it('H3-VAL-06: should return false for non-string inputs safely', () => {
        assert.strictEqual(isValidH3Index(null), false);
        assert.strictEqual(isValidH3Index(undefined), false);
        assert.strictEqual(isValidH3Index(123456789012345), false);
    });
    it('should successfully create a spatial monad with valid H3 index and throw on invalid', () => {
        const monad = createSpatialMonad('8f283082801ffff', 500);
        assert.strictEqual(monad.h3Index, '8f283082801ffff');
        assert.strictEqual(monad.trophicEnergyStockJoules, 500);
        assert.throws(() => {
            createSpatialMonad('invalid_index', 100);
        }, /ThermodynamicViolation/);
    });
});
