import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3Validator, H3Error, H3ErrorCode } from '../src/spatial/h3_grid.js';
import { H3ValidationMonad } from '../src/monads/spatial_monad.js';
describe('Sprint 006: Uber H3 Index String Format Validation & Error Code Mapping', () => {
    const validator = new H3Validator();
    it('should validate correct 15-character hex H3 index strings', () => {
        // A sample valid H3-like 15-char hex string with resolution 5 and base cell 10
        const validIndex = '85283473fffffff';
        assert.strictEqual(validator.validate(validIndex), true);
        assert.doesNotThrow(() => validator.assertValid(validIndex));
    });
    it('should reject non-hex characters with INVALID_CHARACTER', () => {
        const invalidCharIndex = '85283473fffffzZ';
        assert.strictEqual(validator.validate(invalidCharIndex), false);
        assert.throws(() => {
            validator.assertValid(invalidCharIndex);
        }, (err) => {
            assert(err instanceof H3Error);
            assert.strictEqual(err.code, H3ErrorCode.INVALID_CHARACTER);
            return true;
        });
    });
    it('should reject invalid lengths with INVALID_LENGTH', () => {
        const shortIndex = '85283473fff';
        const longIndex = '85283473ffffffffffff';
        assert.throws(() => validator.assertValid(shortIndex), (err) => {
            assert.strictEqual(err.code, H3ErrorCode.INVALID_LENGTH);
            return true;
        });
        assert.throws(() => validator.assertValid(longIndex), (err) => {
            assert.strictEqual(err.code, H3ErrorCode.INVALID_LENGTH);
            return true;
        });
    });
    it('should reject null index (all zeros) with NULL_INDEX', () => {
        const nullIndex = '000000000000000';
        assert.throws(() => validator.assertValid(nullIndex), (err) => {
            assert.strictEqual(err.code, H3ErrorCode.NULL_INDEX);
            return true;
        });
    });
    it('should validate H3ValidationMonad successfully on correct state transitions', () => {
        const initialState = {
            h3Index: '85283473fffffff',
            matter: { carbon: 100 },
            energy: { solar: 500 }
        };
        const monad = H3ValidationMonad.unit(initialState, validator);
        const nextMonad = monad.bind((state) => ({
            ...state,
            matter: { carbon: state.matter.carbon + 10 }
        }));
        const result = nextMonad.match((s) => s.matter.carbon, (err) => err.code);
        assert.strictEqual(result, 110);
    });
    it('should halt monad branch on invalid target H3 index and preserve error code', () => {
        const initialState = {
            h3Index: '85283473fffffff',
            matter: { carbon: 100 },
            energy: { solar: 500 }
        };
        const monad = H3ValidationMonad.unit(initialState, validator);
        const failedMonad = monad.bind((state) => ({
            ...state,
            h3Index: 'INVALID_INDEX_STR'
        }));
        const errorCode = failedMonad.match(() => H3ErrorCode.SUCCESS, (err) => err.code);
        assert.strictEqual(errorCode, H3ErrorCode.INVALID_CHARACTER);
    });
});
