import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3Grid } from '../src/spatial/h3_grid.js';
import { H3ErrorCode } from '../src/spatial/h3_types.js';
describe('Sprint 005 - Uber H3 Index String Format Validation and Error Code Mapping', () => {
    const h3Grid = new H3Grid();
    it('should successfully validate valid 15-character hex strings across valid resolutions', () => {
        const validIndices = [
            '8019fffffffffff',
            '8119fffffffffff',
            '8219fffffffffff',
            '8319fffffffffff',
            '8419fffffffffff',
            '8519fffffffffff',
            '8619fffffffffff',
            '8719fffffffffff',
            '8819fffffffffff',
            '8919fffffffffff',
            '8a19fffffffffff',
            '8b19fffffffffff',
            '8c19fffffffffff',
            '8d19fffffffffff',
            '8e19fffffffffff',
            '8f19fffffffffff'
        ];
        validIndices.forEach((idx, expectedRes) => {
            const res = h3Grid.validateIndex(idx);
            assert.strictEqual(res.isValid, true, `Index ${idx} should be valid`);
            assert.strictEqual(res.code, H3ErrorCode.SUCCESS);
            assert.strictEqual(res.resolution, expectedRes);
        });
    });
    it('should reject invalid lengths (<15 and >15)', () => {
        const tooShort = '8f19ffffffffff';
        const tooLong = '8f19ffffffffffff';
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
            const validIndexStr = '8f19fffffffffff';
            const gridInst = h3Grid;
            gridInst.assertValidIndex(validIndexStr);
        });
        assert.throws(() => {
            const invalidIndexStr = 'invalid_index_string';
            const gridInst = h3Grid;
            gridInst.assertValidIndex(invalidIndexStr);
        }, (err) => {
            assert(err instanceof Error);
            assert(err.message.includes('Spatial Validation Error'));
            return true;
        });
    });
});
