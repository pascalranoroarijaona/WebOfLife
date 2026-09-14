import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isValidH3Hex, SpatialMonad, H3GridManager } from '../src/spatial/h3_grid.js';
describe('Sprint 029: Hexadecimal Character Set Verification Helper Regex', () => {
    it('should correctly validate standard lowercase hex strings', () => {
        assert.strictEqual(isValidH3Hex('891f1d6801ffffffff'), true);
        assert.strictEqual(isValidH3Hex('8928308280fffff'), true);
        assert.strictEqual(isValidH3Hex('abcdef0123456789'), true);
    });
    it('should correctly validate uppercase and mixed-case hex strings', () => {
        assert.strictEqual(isValidH3Hex('ABCDEF0123456789'), true);
        assert.strictEqual(isValidH3Hex('891F1D6801FFFFFFFF'), true);
        assert.strictEqual(isValidH3Hex('AbCdEf0123456789'), true);
    });
    it('should reject invalid strings containing non-hex characters', () => {
        assert.strictEqual(isValidH3Hex('891f1d6801fffffg'), false); // 'g' is not hex
        assert.strictEqual(isValidH3Hex('891f1d6801fffffZ'), false); // 'Z' is not hex
        assert.strictEqual(isValidH3Hex('hello_world'), false);
        assert.strictEqual(isValidH3Hex(''), false);
    });
    it('should correctly transition SpatialMonad from unverified to verified state', () => {
        const validMonad = new SpatialMonad('891f1d6801ffffffff', 1000);
        assert.strictEqual(validMonad.isVerified(), false);
        const success = validMonad.verifySpatialIndex();
        assert.strictEqual(success, true);
        assert.strictEqual(validMonad.isVerified(), true);
        const thermo = validMonad.getThermodynamics();
        assert.strictEqual(thermo.massGrams, 0.0);
        assert.strictEqual(thermo.solarEnergyJoules, 1000);
        assert.ok(thermo.dissipationJoules > 0);
    });
    it('should handle invalid spatial monads without verifying', () => {
        const invalidMonad = new SpatialMonad('INVALID_H3_STRING_XYZ', 500);
        assert.strictEqual(invalidMonad.isVerified(), false);
        const success = invalidMonad.verifySpatialIndex();
        assert.strictEqual(success, false);
        assert.strictEqual(invalidMonad.isVerified(), false);
    });
    it('should provide static validation through H3GridManager', () => {
        assert.strictEqual(H3GridManager.validateIndex('891f1d6801ffffffff'), true);
        assert.strictEqual(H3GridManager.validateIndex('invalid'), false);
    });
});
