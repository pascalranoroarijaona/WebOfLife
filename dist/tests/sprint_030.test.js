import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isValidH3Index, transitionSpatialMonad, SpatialMonad } from '../src/spatial/h3_grid.js';
describe('Sprint 030 - H3 Index Verification & Thermodynamic Monad Transitions', () => {
    it('should correctly validate standard 15-character hex H3 indices', () => {
        const validIndex = '8928308280fffff';
        const validMixedCase = '8928308280FFFFF';
        assert.strictEqual(isValidH3Index(validIndex), true);
        assert.strictEqual(isValidH3Index(validMixedCase), true);
    });
    it('should reject strings of incorrect length or non-hex characters', () => {
        const tooShort = '8928308280ffff';
        const tooLong = '8928308280ffffff';
        const invalidChar = '8928308280fffffG';
        const emptyStr = '';
        assert.strictEqual(isValidH3Index(tooShort), false);
        assert.strictEqual(isValidH3Index(tooLong), false);
        assert.strictEqual(isValidH3Index(invalidChar), false);
        assert.strictEqual(isValidH3Index(emptyStr), false);
    });
    it('should transition unverified spatial monad to validated upon correct H3 index', () => {
        const monad = new SpatialMonad('8928308280fffff', 10.0, 'UNVERIFIED', 10.0);
        const transitioned = transitionSpatialMonad(monad, 1.2e-6);
        assert.strictEqual(transitioned.state, 'VALIDATED');
        assert.strictEqual(transitioned.energyJoules < 10.0, true);
    });
    it('should remain unverified if H3 index is invalid during transition', () => {
        const monad = new SpatialMonad('invalid-h3-id', 5.0, 'UNVERIFIED', 5.0);
        const transitioned = transitionSpatialMonad(monad, 1.2e-6);
        assert.strictEqual(transitioned.state, 'UNVERIFIED');
        assert.strictEqual(transitioned.energyJoules < 5.0, true);
    });
    it('should throw error if attempting to transition an already validated monad', () => {
        const monad = new SpatialMonad('8928308280fffff', 5.0, 'VALIDATED', 5.0);
        assert.throws(() => {
            transitionSpatialMonad(monad);
        }, /Monad must be in UNVERIFIED state/);
    });
});
