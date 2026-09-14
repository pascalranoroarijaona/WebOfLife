import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateResolutionTier, assertResolutionTier } from '../src/spatial/h3_grid.js';
import { SpatialMonad } from '../src/monads/spatial_monad.js';

describe('Sprint 24: Spatial Resolution Tier Boundary Validation & Monad Integration', () => {
  it('Lower Bound Validation', () => {
    assert.strictEqual(validateResolutionTier(0), true);
    assert.strictEqual(validateResolutionTier(-1), false);
    assert.throws(() => assertResolutionTier(-1), /\[SpatialError\]/);
  });

  it('Upper Bound Validation', () => {
    assert.strictEqual(validateResolutionTier(15), true);
    assert.strictEqual(validateResolutionTier(16), false);
    assert.throws(() => assertResolutionTier(16), /\[SpatialError\]/);
  });

  it('Type & Granularity Check', () => {
    assert.strictEqual(validateResolutionTier(3.5), false);
    assert.strictEqual(validateResolutionTier(NaN), false);
    assert.strictEqual(validateResolutionTier(Infinity), false);
    assert.throws(() => assertResolutionTier(3.5), /\[SpatialError\]/);
  });

  it('SpatialMonad Integration & Refinement', () => {
    const stock = { biomass: 100, energy: 5000 };
    const monad = new SpatialMonad('881f185805fffff', 4, stock);
    assert.strictEqual(monad.resolution, 4);

    const refined = monad.refine(8);
    assert.strictEqual(refined.resolution, 8);
    assert.strictEqual(refined.stock.biomass, 100);

    assert.throws(() => {
      monad.refine(2); // Lower resolution refinement attempt
    }, /\[ThermodynamicSpatialError\]/);

    assert.throws(() => {
      new SpatialMonad('881f185805fffff', 20, stock);
    }, /\[SpatialError\]/);
  });
});