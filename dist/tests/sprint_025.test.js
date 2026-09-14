import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isValidH3Resolution, assertValidH3Resolution } from '../src/spatial/h3_grid';
import { SpatialMonad } from '../src/monads/spatial_monad';
describe('Sprint 025: Resolution Tier Boundary Check & Spatial Monad', () => {
    it('Validates boundary integers 0 and 15 return true', () => {
        assert.strictEqual(isValidH3Resolution(0), true);
        assert.strictEqual(isValidH3Resolution(15), true);
    });
    it('Validates mid-tier integers return true', () => {
        assert.strictEqual(isValidH3Resolution(7), true);
        assert.strictEqual(isValidH3Resolution(8), true);
    });
    it('Validates negative and out-of-bounds integers return false', () => {
        assert.strictEqual(isValidH3Resolution(-1), false);
        assert.strictEqual(isValidH3Resolution(16), false);
        assert.strictEqual(isValidH3Resolution(100), false);
    });
    it('Validates floating-point inputs return false', () => {
        assert.strictEqual(isValidH3Resolution(3.14), false);
        assert.strictEqual(isValidH3Resolution(7.0), true); // integer float
    });
    it('Verify assertion function throws RangeError on invalid bounds', () => {
        assert.doesNotThrow(() => assertValidH3Resolution(0));
        assert.doesNotThrow(() => assertValidH3Resolution(15));
        assert.throws(() => {
            assertValidH3Resolution(16);
        }, RangeError);
        assert.throws(() => {
            assertValidH3Resolution(-1);
        }, RangeError);
        assert.throws(() => {
            assertValidH3Resolution(3.14);
        }, RangeError);
    });
    it('Instantiates SpatialMonad with valid resolution and enforces stock constraints', () => {
        const monad = SpatialMonad.of('85283473fffffff', 5, {
            carbon: 100,
            water: 500,
            minerals: 50,
            energy: 1000,
        });
        assert.strictEqual(monad.resolution, 5);
        assert.strictEqual(monad.stocks.carbon, 100);
    });
    it('Refines SpatialMonad successfully conserving Law 1 mass', () => {
        const parent = SpatialMonad.of('85283473fffffff', 5, {
            carbon: 100,
            water: 500,
            minerals: 50,
            energy: 1000,
        });
        const children = parent.refine(6, [
            { carbon: 50, water: 250, minerals: 25, energy: 500 },
            { carbon: 50, water: 250, minerals: 25, energy: 500 },
        ]);
        assert.strictEqual(children.length, 2);
        assert.strictEqual(children[0].resolution, 6);
    });
});
