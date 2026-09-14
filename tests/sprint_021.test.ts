import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3GridManager, SpatialMonadStock } from '../src/spatial/h3_grid.js';
import { H3ResolutionTier } from '../src/spatial/h3_types.js';

describe('Sprint 21: Spatial Resolution Tier (0-15) Boundary Check', () => {
  const gridManager: H3GridManager = new H3GridManager();

  it('should return true for valid boundary resolutions (0 and 15)', () => {
    const resZero: number = 0;
    const resFifteen: number = 15;
    assert.strictEqual(gridManager.validateResolution(resZero), true);
    assert.strictEqual(gridManager.validateResolution(resFifteen), true);
  });

  it('should return true for interior valid resolutions (1 through 14)', () => {
    for (let r: number = 1; r <= 14; r++) {
      assert.strictEqual(gridManager.validateResolution(r), true);
    }
  });

  it('should return false for lower-bound violations (< 0)', () => {
    const negOne: number = -1;
    const negFive: number = -5;
    assert.strictEqual(gridManager.validateResolution(negOne), false);
    assert.strictEqual(gridManager.validateResolution(negFive), false);
  });

  it('should return false for upper-bound violations (> 15)', () => {
    const sixteen: number = 16;
    const oneHundred: number = 100;
    assert.strictEqual(gridManager.validateResolution(sixteen), false);
    assert.strictEqual(gridManager.validateResolution(oneHundred), false);
  });

  it('should return false for non-integer and float inputs', () => {
    const floatRes: number = 1.5;
    const nanRes: number = NaN;
    const infRes: number = Infinity;
    assert.strictEqual(gridManager.validateResolution(floatRes), false);
    assert.strictEqual(gridManager.validateResolution(nanRes), false);
    assert.strictEqual(gridManager.validateResolution(infRes), false);
  });

  it('should throw RangeError on assertValidResolution for invalid resolutions', () => {
    assert.throws(() => {
      const invalidRes1: number = -1;
      gridManager.assertValidResolution(invalidRes1 as H3ResolutionTier);
    }, RangeError);

    assert.throws(() => {
      const invalidRes2: number = 16;
      gridManager.assertValidResolution(invalidRes2 as H3ResolutionTier);
    }, RangeError);

    assert.throws(() => {
      const invalidRes3: number = 3.14;
      gridManager.assertValidResolution(invalidRes3 as H3ResolutionTier);
    }, RangeError);
  });

  it('should successfully pass SpatialMonadStock binding for valid resolutions', () => {
    const energy: number = 1000;
    const biomass: number = 50;
    const res: number = 7;
    const stock: SpatialMonadStock = new SpatialMonadStock(energy, biomass, res);
    const boundStock: SpatialMonadStock = SpatialMonadStock.bindWithValidation(stock, gridManager);
    assert.strictEqual(boundStock.resolution, 7);
    assert.strictEqual(boundStock.energyJoules, 1000);
    assert.strictEqual(boundStock.biomassKg, 50);
  });

  it('should throw RangeError in SpatialMonadStock binding for invalid resolutions', () => {
    const energy: number = 1000;
    const biomass: number = 50;
    const invalidRes: number = 20;
    const invalidStock: SpatialMonadStock = new SpatialMonadStock(energy, biomass, invalidRes);
    assert.throws(() => {
      SpatialMonadStock.bindWithValidation(invalidStock, gridManager);
    }, RangeError);
  });
});