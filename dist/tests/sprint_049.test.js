// =============================================================================
// WEB OF LIFE - SPRINT 049 TEST SUITE
// Discrete Global Grid Pentagon Defect & Topological Invariant Specification
// =============================================================================
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PENTAGON_BASE_CELLS, PENTAGON_BASE_CELL_SET, Direction, isPentagonBaseCell, isBaseCellPentagon, determinePentagonBaseCellMissingDirection, getBaseCellNeighbor, getPentagonDefectMetadata, verifyPentagonMissingDirectionConsistency, getCoordinationNumber, getPentagonIndexes, assertValidNeighborCountForCell, PentagonalCoordinationViolationError, HexagonalCoordinationViolationError, } from '../src/spatial/h3_adjacency.js';
describe('Sprint 049: Pentagon Defect & Discrete Manifold Topology', () => {
    const CANONICAL_PENTAGON_BASE_CELLS = [4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117];
    it('verifies the exact canonical set of 12 pentagonal base cells', () => {
        assert.strictEqual(PENTAGON_BASE_CELLS.length, 12);
        assert.strictEqual(PENTAGON_BASE_CELL_SET.size, 12);
        for (const bc of CANONICAL_PENTAGON_BASE_CELLS) {
            assert.ok(PENTAGON_BASE_CELLS.includes(bc), `Base cell ${bc} must be in PENTAGON_BASE_CELLS`);
            assert.ok(PENTAGON_BASE_CELL_SET.has(bc), `Base cell ${bc} must be in PENTAGON_BASE_CELL_SET`);
            assert.strictEqual(isPentagonBaseCell(bc), true, `isPentagonBaseCell(${bc}) must be true`);
            assert.strictEqual(isBaseCellPentagon(bc), true, `isBaseCellPentagon(${bc}) must be true`);
        }
    });
    it('rejects non-pentagonal hexagonal base cells correctly', () => {
        const nonPentagons = [0, 1, 2, 3, 5, 10, 20, 30, 50, 60, 100, 120, 121];
        for (const bc of nonPentagons) {
            assert.strictEqual(isPentagonBaseCell(bc), false, `Base cell ${bc} should not be pentagonal`);
            assert.strictEqual(isBaseCellPentagon(bc), false, `Base cell ${bc} should not be pentagonal`);
        }
    });
    it('verifies defect metadata and omitted direction for icosahedral vertices', () => {
        for (const bc of CANONICAL_PENTAGON_BASE_CELLS) {
            const meta = getPentagonDefectMetadata(bc);
            assert.strictEqual(meta.baseCell, bc);
            assert.strictEqual(meta.isPentagon, true);
            assert.strictEqual(meta.validNeighborCount, 5);
            assert.strictEqual(meta.missingDirection, Direction.K_AXES);
            assert.strictEqual(determinePentagonBaseCellMissingDirection(bc), Direction.K_AXES);
            assert.strictEqual(verifyPentagonMissingDirectionConsistency(bc), true);
            assert.strictEqual(getBaseCellNeighbor(bc, Direction.K_AXES), -1);
        }
    });
    it('enforces 5-fold vs 6-fold coordination validation across pentagons and hexagons', () => {
        const pentagonId = '8009fffffffffff';
        const hexagonId = '801dfffffffffff';
        assert.strictEqual(getCoordinationNumber('pentagon_cell'), 5);
        assert.strictEqual(getCoordinationNumber(hexagonId), 6);
        assert.doesNotThrow(() => {
            assertValidNeighborCountForCell('cell_pentagon', ['n1', 'n2', 'n3', 'n4', 'n5']);
        });
        assert.throws(() => {
            assertValidNeighborCountForCell('cell_pentagon', ['n1', 'n2', 'n3', 'n4', 'n5', 'n6']);
        }, PentagonalCoordinationViolationError);
        assert.doesNotThrow(() => {
            assertValidNeighborCountForCell(hexagonId, ['n1', 'n2', 'n3', 'n4', 'n5', 'n6']);
        });
        assert.throws(() => {
            assertValidNeighborCountForCell(hexagonId, ['n1', 'n2', 'n3', 'n4', 'n5']);
        }, HexagonalCoordinationViolationError);
    });
    it('generates 12 discrete pentagon cell indexes at resolution 0', () => {
        const pentagons = getPentagonIndexes(0);
        assert.strictEqual(pentagons.length, 12);
        const unique = new Set(pentagons);
        assert.strictEqual(unique.size, 12);
    });
});
