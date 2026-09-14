import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3GridValidator, H3ErrorCode, isH3Index, InvalidLengthError } from '../src/spatial/h3_grid.js';
describe('Sprint 007 - Uber H3 Index String Format Validation and Error Code Mapping', () => {
    it('should validate a correct H3 index string', () => {
        // Standard valid H3 index format: starts with '8', 15 chars, valid res & base cell
        const validIndex = '88268582fffffff';
        const result = H3GridValidator.validateString(validIndex);
        assert.strictEqual(result.valid, true);
        if (result.valid) {
            assert.strictEqual(typeof result.resolution, 'number');
            assert.strictEqual(typeof result.baseCell, 'number');
        }
    });
    it('should catch null or undefined H3 index values', () => {
        const resNull = H3GridValidator.validateString(null);
        assert.strictEqual(resNull.valid, false);
        if (!resNull.valid) {
            assert.strictEqual(resNull.errorCode, H3ErrorCode.NULL_INDEX);
        }
        const resUndefined = H3GridValidator.validateString(undefined);
        assert.strictEqual(resUndefined.valid, false);
        if (!resUndefined.valid) {
            assert.strictEqual(resUndefined.errorCode, H3ErrorCode.NULL_INDEX);
        }
    });
    it('should catch invalid length H3 index strings', () => {
        const shortIndex = '8826858';
        const result = H3GridValidator.validateString(shortIndex);
        assert.strictEqual(result.valid, false);
        if (!result.valid) {
            assert.strictEqual(result.errorCode, H3ErrorCode.INVALID_LENGTH);
        }
    });
    it('should catch invalid characters or incorrect prefix', () => {
        // Does not start with '8'
        const wrongPrefix = '78268582fffffff';
        let res = H3GridValidator.validateString(wrongPrefix);
        assert.strictEqual(res.valid, false);
        if (!res.valid) {
            assert.strictEqual(res.errorCode, H3ErrorCode.INVALID_CHARACTER);
        }
        // Contains non-hex characters
        const invalidChar = '88268582zffffff';
        res = H3GridValidator.validateString(invalidChar);
        assert.strictEqual(res.valid, false);
        if (!res.valid) {
            assert.strictEqual(res.errorCode, H3ErrorCode.INVALID_CHARACTER);
        }
    });
    it('should correctly parse resolution and base cell', () => {
        // '8' (prefix), '8' (res 8), '26' (base cell 0x26 = 38)
        const testIndex = '88268582fffffff';
        const res = H3GridValidator.parseResolution(testIndex);
        const baseCell = H3GridValidator.parseBaseCell(testIndex);
        assert.strictEqual(res, 8);
        assert.strictEqual(baseCell, 0x26);
    });
    it('should provide working type guard isH3Index', () => {
        assert.strictEqual(isH3Index('88268582fffffff'), true);
        assert.strictEqual(isH3Index('invalid'), false);
        assert.strictEqual(isH3Index(12345), false);
    });
    it('should instantiate error classes correctly', () => {
        const err = new InvalidLengthError('Test length error');
        assert.strictEqual(err.errorCode, H3ErrorCode.INVALID_LENGTH);
        assert.strictEqual(err.name, 'InvalidLengthError');
    });
});
