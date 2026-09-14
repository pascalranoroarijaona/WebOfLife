import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3GridManager, SpatialMonadStock } from '../src/spatial/h3_grid.js';
describe('Sprint 21: Spatial Resolution Tier (0-15) Boundary Check', () => {
    const gridManager = new H3GridManager();
    it('should return true for valid boundary resolutions (0 and 15)', () => {
        const resZero = 0;
        const resFifteen = 15;
        assert.strictEqual(gridManager.validateResolution(resZero), true);
        assert.strictEqual(gridManager.validateResolution(resFifteen), true);
    });
    it('should return true for interior valid resolutions (1 through 14)', () => {
        for (let r = 1; r <= 14; r++) {
            assert.strictEqual(gridManager.validateResolution(r), true);
        }
    });
    it('should return false for lower-bound violations (< 0)', () => {
        const negOne = -1;
        const negFive = -5;
        assert.strictEqual(gridManager.validateResolution(negOne), false);
        assert.strictEqual(gridManager.validateResolution(negFive), false);
    });
    it('should return false for upper-bound violations (> 15)', () => {
        const sixteen = 16;
        const oneHundred = 100;
        assert.strictEqual(gridManager.validateResolution(sixteen), false);
        assert.strictEqual(gridManager.validateResolution(oneHundred), false);
    });
    it('should return false for non-integer and float inputs', () => {
        const floatRes = 1.5;
        const nanRes = NaN;
        const infRes = Infinity;
        assert.strictEqual(gridManager.validateResolution(floatRes), false);
        assert.strictEqual(gridManager.validateResolution(nanRes), false);
        assert.strictEqual(gridManager.validateResolution(infRes), false);
    });
    it('should throw RangeError on assertValidResolution for invalid resolutions', () => {
        assert.throws(() => {
            const invalidRes1 = -1;
            gridManager.assertValidResolution(invalidRes1);
        }, RangeError);
        assert.throws(() => {
            const invalidRes2 = 16;
            gridManager.assertValidResolution(invalidRes2);
        }, RangeError);
        assert.throws(() => {
            const invalidRes3 = 3.14;
            gridManager.assertValidResolution(invalidRes3);
        }, RangeError);
    });
    it('should successfully pass SpatialMonadStock binding for valid resolutions', () => {
        const energy = 1000;
        const biomass = 50;
        const res = 7;
        const stock = new SpatialMonadStock(energy, biomass, res);
        const boundStock = SpatialMonadStock.bindWithValidation(stock, gridManager);
        assert.strictEqual(boundStock.resolution, 7);
        assert.strictEqual(boundStock.energyJoules, 1000);
        assert.strictEqual(boundStock.biomassKg, 50);
    });
    it('should throw RangeError in SpatialMonadStock binding for invalid resolutions', () => {
        const energy = 1000;
        const biomass = 50;
        const invalidRes = 20;
        const invalidStock = new SpatialMonadStock(energy, biomass, invalidRes);
        assert.throws(() => {
            SpatialMonadStock.bindWithValidation(invalidStock, gridManager);
        }, RangeError);
    });
});
