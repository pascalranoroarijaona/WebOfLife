import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isValidH3Resolution, assertH3Resolution, MIN_H3_RESOLUTION, MAX_H3_RESOLUTION, H3Grid } from '../src/spatial/h3_grid';
import { SpatialMonad } from '../src/monads/spatial_monad';
describe('Sprint 023 - H3 Resolution Tier Boundary Checks', () => {
    it('TC-01: Should validate valid resolution tiers [0, 15] successfully', () => {
        for (let r = MIN_H3_RESOLUTION; r <= MAX_H3_RESOLUTION; r++) {
            assert.strictEqual(isValidH3Resolution(r), true, `Resolution ${r} should be valid`);
            assert.doesNotThrow(() => assertH3Resolution(r), `Resolution ${r} should not throw`);
        }
    });
    it('TC-02: Should reject negative resolution tiers (< 0)', () => {
        const invalidRes = -1;
        assert.strictEqual(isValidH3Resolution(invalidRes), false);
        assert.throws(() => assertH3Resolution(invalidRes), RangeError);
    });
    it('TC-03: Should reject excessive resolution tiers (> 15)', () => {
        const invalidRes = 16;
        assert.strictEqual(isValidH3Resolution(invalidRes), false);
        assert.throws(() => assertH3Resolution(invalidRes), RangeError);
    });
    it('TC-04: Should reject non-integer floating-point resolution values', () => {
        const floatRes = 7.5;
        assert.strictEqual(isValidH3Resolution(floatRes), false);
        assert.throws(() => assertH3Resolution(floatRes), RangeError);
    });
    it('TC-05: SpatialMonad should correctly validate resolution and conserve stocks during transition', () => {
        const initialStock = {
            carbon: 1000,
            water: 5000,
            minerals: 2000,
            oxygen: 1500,
            energy: 3.5e6
        };
        const monad = new SpatialMonad('88268560fffffff', 5, initialStock);
        assert.strictEqual(monad.getResolution(), 5);
        // Refine to valid resolution
        const refinedMonad = monad.refine(10);
        assert.strictEqual(refinedMonad.getResolution(), 10);
        assert.deepStrictEqual(refinedMonad.getStock(), initialStock, 'Stock conservation invariant verified');
        // Refinement to invalid resolution should throw RangeError
        assert.throws(() => monad.refine(20), RangeError);
        assert.throws(() => new SpatialMonad('88268560fffffff', -2, initialStock), RangeError);
    });
    it('Should verify H3Grid instance behavior', () => {
        const grid = new H3Grid(7);
        assert.strictEqual(grid.defaultResolution, 7);
        assert.strictEqual(grid.validateResolution(15), true);
        assert.strictEqual(grid.validateResolution(99), false);
        assert.doesNotThrow(() => grid.assertValidResolution(0));
        assert.throws(() => grid.assertValidResolution(16), RangeError);
    });
});
