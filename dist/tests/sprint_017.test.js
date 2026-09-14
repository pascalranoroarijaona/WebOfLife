import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateH3IndexLength } from '../src/spatial/h3_grid.js';
describe('Sprint 017 - H3 Spatial Index 15-Character Length Validation', () => {
    it('should return true for valid 15-character lower/uppercase hex H3 indices', () => {
        assert.strictEqual(validateH3IndexLength('8928308280fffff'), true);
        assert.strictEqual(validateH3IndexLength('8928308280FFFFF'), true);
        assert.strictEqual(validateH3IndexLength('0123456789abcdef0'.slice(0, 15)), true);
    });
    it('should return false for strings shorter than 15 characters', () => {
        assert.strictEqual(validateH3IndexLength('8928308280ff'), false);
        assert.strictEqual(validateH3IndexLength(''), false);
    });
    it('should return false for strings longer than 15 characters', () => {
        assert.strictEqual(validateH3IndexLength('8928308280fffffff'), false);
        assert.strictEqual(validateH3IndexLength('8928308280ffffffff'), false);
    });
    it('should return false for 15-character strings with non-hexadecimal characters', () => {
        assert.strictEqual(validateH3IndexLength('8928308280ffXXz'), false);
        assert.strictEqual(validateH3IndexLength('g928308280fffff'), false);
    });
    it('should return false for non-string primitives', () => {
        assert.strictEqual(validateH3IndexLength(null), false);
        assert.strictEqual(validateH3IndexLength(undefined), false);
        assert.strictEqual(validateH3IndexLength(123456789012345), false);
        assert.strictEqual(validateH3IndexLength({}), false);
        assert.strictEqual(validateH3IndexLength([]), false);
    });
});
