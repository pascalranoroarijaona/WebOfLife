import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3SpatialMonad, guardH3Payload } from '../src/spatial/h3_grid.js';
describe('Sprint 012 - H3 String Payload Null-Check Guard Clauses', () => {
    const monad = new H3SpatialMonad();
    const validH3 = '8928308280fffff';
    it('should successfully validate and bind valid H3 index strings', () => {
        assert.doesNotThrow(() => {
            guardH3Payload(validH3);
        });
        const result = monad.bind(validH3, (idx) => `processed_${idx}`);
        assert.strictEqual(result, `processed_${validH3}`);
    });
    it('should throw thermodynamic spatial errors on null or undefined payloads', () => {
        assert.throws(() => {
            guardH3Payload(null);
        }, /\[Thermodynamic Spatial Error\]/);
        assert.throws(() => {
            guardH3Payload(undefined);
        }, /\[Thermodynamic Spatial Error\]/);
        assert.throws(() => {
            monad.bind(undefined, (idx) => idx);
        }, /\[Thermodynamic Spatial Error\]/);
    });
    it('should throw thermodynamic spatial errors on empty or whitespace-only strings', () => {
        assert.throws(() => {
            guardH3Payload('');
        }, /\[Thermodynamic Spatial Error\]/);
        assert.throws(() => {
            guardH3Payload('   ');
        }, /\[Thermodynamic Spatial Error\]/);
    });
    it('should throw thermodynamic spatial errors on non-string primitives', () => {
        assert.throws(() => {
            // @ts-ignore
            guardH3Payload(12345);
        }, /\[Thermodynamic Spatial Error\]/);
        assert.throws(() => {
            // @ts-ignore
            monad.validatePayload({});
        }, /\[Thermodynamic Spatial Error\]/);
    });
});
