import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isValidH3Index, assertValidH3Index } from '../src/spatial/h3_grid.js';
import { SpatialMonad } from '../src/monads/spatial_monad.js';
describe('Sprint 008 - H3 Index Regex and Character Set Validation', () => {
    it('should validate correct 15-character lowercase hex H3 strings', () => {
        const validLower = '8928308280fffff';
        assert.strictEqual(isValidH3Index(validLower), true);
        assert.doesNotThrow(() => assertValidH3Index(validLower));
    });
    it('should validate correct 15-character uppercase hex H3 strings', () => {
        const validUpper = '8928308280FFFFF';
        assert.strictEqual(isValidH3Index(validUpper), true);
        assert.doesNotThrow(() => assertValidH3Index(validUpper));
    });
    it('should reject strings with invalid characters (non-hex, symbols)', () => {
        const invalidChar = '8928308280ffggz';
        const symbolChar = '8928308280ff$ff';
        assert.strictEqual(isValidH3Index(invalidChar), false);
        assert.strictEqual(isValidH3Index(symbolChar), false);
        assert.throws(() => assertValidH3Index(invalidChar), /[Thermodynamic Spatial Violation]/);
    });
    it('should reject strings with incorrect lengths (<15 or >15)', () => {
        const tooShort = '8928308280fff';
        const tooLong = '8928308280fffffffff';
        assert.strictEqual(isValidH3Index(tooShort), false);
        assert.strictEqual(isValidH3Index(tooLong), false);
        assert.throws(() => assertValidH3Index(tooShort));
    });
    it('should reject empty, null, or non-string inputs', () => {
        assert.strictEqual(isValidH3Index(''), false);
        assert.strictEqual(isValidH3Index(null), false);
        assert.strictEqual(isValidH3Index(undefined), false);
        assert.strictEqual(isValidH3Index(123456789012345), false);
    });
    it('should correctly manage SpatialMonad state transitions', () => {
        const validMonad = SpatialMonad.of('8928308280fffff');
        assert.strictEqual(validMonad.isRight(), true);
        assert.strictEqual(validMonad.getOrThrow(), '8928308280fffff');
        const invalidMonad = SpatialMonad.of('MALFORMED_INDEX');
        assert.strictEqual(invalidMonad.isRight(), false);
        assert.throws(() => invalidMonad.getOrThrow(), /[Entropy Leak Prevented]/);
    });
});
