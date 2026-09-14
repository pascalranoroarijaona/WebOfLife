import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3Grid } from '../src/spatial/h3_grid.js';
import { H3ErrorCode } from '../src/spatial/h3_types.js';
describe('Sprint 005 - Uber H3 Index String Format Validation and Error Code Mapping', () => {
    const h3Grid = new H3Grid();
    it('should successfully validate valid 15-character hex strings across valid resolutions', () => {
        // Constructing mock H3 strings where char at index 1 represents resolution (0-9, a-f)
        const validIndices = [
            '8019fffffffffff', // resolution 0
            '8119fffffffffff', // resolution 1
            '8219fffffffffff', // resolution 2
            '8319fffffffffff', // resolution 3
            '8419fffffffffff', // resolution 4
            '8519fffffffffff', // resolution 5
            '8619fffffffffff', // resolution 6
            '8719fffffffffff', // resolution 7
            '8819fffffffffff', // resolution 8
            '8919fffffffffff', // resolution 9
            '8a19fffffffffff', // resolution 10 (10 in hex)
            '8b19fffffffffff', // resolution 11 (11 in hex)
            '8c19fffffffffff', // resolution 12 (12 in hex)
            '8d19fffffffffff', // resolution 13 (13 in hex)
            '8e19fffffffffff', // resolution 14 (14 in hex)
            '8f19fffffffffff' // resolution 15 (15 in hex)
        ];
        validIndices.forEach((idx, expectedRes) => {
            const res = h3Grid.validateIndex(idx);
            assert.strictEqual(res.isValid, true, `Index ${idx} should be valid`);
            assert.strictEqual(res.code, H3ErrorCode.SUCCESS);
            assert.strictEqual(res.resolution, expectedRes);
        });
    });
    it('should reject invalid lengths (<15 and >15)', () => {
        const tooShort = '8f19ffffffffff'; // 14 chars
        const tooLong = '8f19ffffffffffff'; // 16 chars
        const empty = '';
        const resShort = h3Grid.validateIndex(tooShort);
        assert.strictEqual(resShort.isValid, false);
        assert.strictEqual(resShort.code, H3ErrorCode.INVALID_LENGTH);
        const resLong = h3Grid.validateIndex(tooLong);
        assert.strictEqual(resLong.isValid, false);
        assert.strictEqual(resLong.code, H3ErrorCode.INVALID_LENGTH);
        const resEmpty = h3Grid.validateIndex(empty);
        assert.strictEqual(resEmpty.isValid, false);
        assert.strictEqual(resEmpty.code, H3ErrorCode.NULL_INDEX);
    });
    it('should reject invalid characters (non-hex characters such as g, z, symbols)', () => {
        const invalidCharG = '8f19ffffffffffg';
        const invalidSymbol = '8f19ffffffff#ff';
        const invalidSpaces = '8f19ffffff ffff';
        const resG = h3Grid.validateIndex(invalidCharG);
        assert.strictEqual(resG.isValid, false);
        assert.strictEqual(resG.code, H3ErrorCode.INVALID_CHARACTER);
        const resSym = h3Grid.validateIndex(invalidSymbol);
        assert.strictEqual(resSym.isValid, false);
        assert.strictEqual(resSym.code, H3ErrorCode.INVALID_CHARACTER);
        const resSpace = h3Grid.validateIndex(invalidSpaces);
        assert.strictEqual(resSpace.isValid, false);
        assert.strictEqual(resSpace.code, H3ErrorCode.INVALID_CHARACTER);
    });
    it('should assert valid indices successfully and throw on invalid ones', () => {
        assert.doesNotThrow(() => {
            h3Grid.assertValidIndex('8f19fffffffffff');
        });
        assert.throws(() => {
            h3Grid.assertValidIndex('invalid_index_string');
        }, /Spatial Validation Error/);
    });
});
