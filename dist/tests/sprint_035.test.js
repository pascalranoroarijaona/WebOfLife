// =============================================================================
// WEB OF LIFE - SPRINT 035 UNIT TESTS: SPATIAL GUARD CLAUSE EXCEPTIONS
// =============================================================================
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3GridManager, SpatialMonad } from '../src/spatial/h3_grid.js';
import { SpatialGuardClauseException } from '../src/spatial/h3_types.js';
describe('Sprint 035: Explicit Null/Undefined Exception Throwing for Guard Clauses', () => {
    const gridManager = new H3GridManager();
    it('1. Null Index Test: Verifies passing null throws SpatialGuardClauseException', () => {
        assert.throws(() => {
            gridManager.validateIndex(null);
        }, SpatialGuardClauseException);
        assert.throws(() => {
            H3GridManager.validateIndexStatic(null);
        }, SpatialGuardClauseException);
        assert.throws(() => {
            SpatialMonad.of(100, null);
        }, SpatialGuardClauseException);
    });
    it('2. Undefined Index Test: Verifies passing undefined throws SpatialGuardClauseException', () => {
        assert.throws(() => {
            gridManager.validateIndex(undefined);
        }, SpatialGuardClauseException);
        assert.throws(() => {
            H3GridManager.validateIndexStatic(undefined);
        }, SpatialGuardClauseException);
        assert.throws(() => {
            SpatialMonad.of(100, undefined);
        }, SpatialGuardClauseException);
    });
    it('3. Empty String Test: Verifies passing blank/empty string throws SpatialGuardClauseException', () => {
        assert.throws(() => {
            gridManager.validateIndex('   ');
        }, SpatialGuardClauseException);
        assert.throws(() => {
            H3GridManager.validateIndexStatic('');
        }, SpatialGuardClauseException);
    });
    it('4. Valid Index Pass-through: Verifies valid H3 hex strings proceed without throwing', () => {
        const validIndex = '8928308280fffff';
        const result = gridManager.validateIndex(validIndex);
        assert.strictEqual(result, validIndex);
        const staticResult = H3GridManager.validateIndexStatic(validIndex);
        assert.strictEqual(staticResult, validIndex);
        const resolution = gridManager.getResolution(validIndex);
        assert.strictEqual(resolution, 9);
        const monad = SpatialMonad.of({ biomass: 500 }, validIndex);
        assert.strictEqual(monad.getIndex(), validIndex);
        assert.deepStrictEqual(monad.getStock(), { biomass: 500 });
    });
});
