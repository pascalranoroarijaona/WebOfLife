import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3_CANONICAL_INDEX_PATTERN, isValidH3CanonicalIndex, assertCanonicalH3Index, verifyH3PatternContract, H3CellCoord, H3GridManager, } from '../src/spatial/h3_grid.js';
import { SpatialMonad, SpatialCellMonad, executeAdvectiveTransfer, } from '../src/monads/spatial_monad.js';
describe('Sprint 037: H3_CANONICAL_INDEX_PATTERN & Spatial Validation Suite', () => {
    it('TC-H3-01: accepts valid 15-character lowercase resolution 8 index', () => {
        assert.strictEqual(isValidH3CanonicalIndex('8826856235fffff'), true);
    });
    it('TC-H3-02: accepts valid 15-character uppercase index matching pattern', () => {
        assert.strictEqual(isValidH3CanonicalIndex('8826856235FFFFF'), true);
    });
    it('TC-H3-03: accepts valid 15-character standard resolution 5 index', () => {
        assert.strictEqual(isValidH3CanonicalIndex('85283473fffffff'), true);
    });
    it('TC-H3-04: rejects 16-character padded hex index', () => {
        assert.strictEqual(isValidH3CanonicalIndex('08826856235fffff'), false);
    });
    it('TC-H3-05: rejects 14-character truncated hex index', () => {
        assert.strictEqual(isValidH3CanonicalIndex('8826856235ffff'), false);
    });
    it('TC-H3-06: rejects 15-character non-hex token with "g"', () => {
        assert.strictEqual(isValidH3CanonicalIndex('8826856235ffffg'), false);
    });
    it('TC-H3-07: rejects empty string', () => {
        assert.strictEqual(isValidH3CanonicalIndex(''), false);
    });
    it('TC-H3-08: rejects string with embedded whitespace', () => {
        assert.strictEqual(isValidH3CanonicalIndex('88268562 35ffff'), false);
    });
    it('TC-H3-09: rejects untrimmed whitespace string', () => {
        assert.strictEqual(isValidH3CanonicalIndex(' 8826856235fffff '), false);
    });
    it('TC-H3-10: handles non-string types cleanly without throwing', () => {
        assert.strictEqual(isValidH3CanonicalIndex(null), false);
        assert.strictEqual(isValidH3CanonicalIndex(undefined), false);
        assert.strictEqual(isValidH3CanonicalIndex(123456789012345), false);
        assert.strictEqual(isValidH3CanonicalIndex({}), false);
    });
    it('assertCanonicalH3Index normalizes uppercase to lowercase canonical index', () => {
        const normalized = assertCanonicalH3Index('8826856235FFFFF');
        assert.strictEqual(normalized, '8826856235fffff');
    });
    it('assertCanonicalH3Index throws RangeError for malformed index', () => {
        assert.throws(() => assertCanonicalH3Index('invalid-hex-val'), (err) => err instanceof RangeError && /Invalid H3 canonical index/.test(err.message));
    });
    it('verifyH3PatternContract matches expected pattern specification', () => {
        const contract = verifyH3PatternContract();
        assert.strictEqual(contract.regex, H3_CANONICAL_INDEX_PATTERN);
        assert.strictEqual(contract.sampleValid, '8826856235fffff');
        assert.strictEqual(contract.sampleInvalid, '08826856235fffff');
        assert.strictEqual(contract.regex.test(contract.sampleValid), true);
        assert.strictEqual(contract.regex.test(contract.sampleInvalid), false);
    });
    it('H3CellCoord extracts correct resolution and validity', () => {
        const cellRes8 = new H3CellCoord('8826856235fffff');
        assert.strictEqual(cellRes8.isValid(), true);
        assert.strictEqual(cellRes8.resolution(), 8);
        assert.strictEqual(cellRes8.index(), '8826856235fffff');
        const cellRes5 = new H3CellCoord('85283473fffffff');
        assert.strictEqual(cellRes5.isValid(), true);
        assert.strictEqual(cellRes5.resolution(), 5);
        const invalidCell = new H3CellCoord('invalid');
        assert.strictEqual(invalidCell.isValid(), false);
        assert.strictEqual(invalidCell.resolution(), -1);
    });
    it('H3GridManager validates, normalizes, and generates neighbors', () => {
        assert.strictEqual(H3GridManager.isValidCanonicalIndex('8826856235fffff'), true);
        assert.strictEqual(H3GridManager.isValidCanonicalIndex('bad_index'), false);
        const norm = H3GridManager.normalizeIndex('8826856235FFFFF');
        assert.strictEqual(norm, '8826856235fffff');
        const manager = new H3GridManager();
        const neighbors = manager.getNeighbors(norm);
        assert.ok(neighbors.length > 0);
        for (const neighbor of neighbors) {
            assert.strictEqual(isValidH3CanonicalIndex(neighbor), true);
            assert.strictEqual(neighbor.length, 15);
        }
    });
    it('SpatialMonad preserves address and supports monadic transformation', () => {
        const monad = SpatialMonad.unit('8826856235FFFFF', 42);
        assert.strictEqual(monad.getCellIndex(), '8826856235fffff');
        assert.strictEqual(monad.getValue(), 42);
        const doubled = monad.bind((val, index) => SpatialMonad.unit(index, val * 2));
        assert.strictEqual(doubled.getValue(), 84);
        assert.strictEqual(doubled.getCellIndex(), '8826856235fffff');
    });
    it('SpatialCellMonad rejects non-physical stock initialization (NaN or negative)', () => {
        const invalidStocks = {
            waterKg: -10,
            carbonKg: 50,
            mineralKg: 20,
            oxygenKg: 10,
            thermalEnergyJoules: 1000,
        };
        assert.throws(() => SpatialCellMonad.unit('8826856235fffff', invalidStocks), /Thermodynamic invariant violation/);
    });
    it('executeAdvectiveTransfer obeys mass conservation invariant (Delta M_total = 0)', () => {
        const initialStocksSource = {
            waterKg: 1000,
            carbonKg: 500,
            mineralKg: 250,
            oxygenKg: 150,
            thermalEnergyJoules: 50000,
        };
        const initialStocksTarget = {
            waterKg: 200,
            carbonKg: 100,
            mineralKg: 50,
            oxygenKg: 30,
            thermalEnergyJoules: 10000,
        };
        const source = SpatialCellMonad.unit('8826856235fffff', initialStocksSource);
        const target = SpatialCellMonad.unit('85283473fffffff', initialStocksTarget);
        const transferRequest = {
            deltaWaterKg: 150,
            deltaCarbonKg: 50,
            deltaMineralKg: 25,
            deltaOxygenKg: 10,
            deltaEnergyJoules: 5000,
        };
        const result = executeAdvectiveTransfer(source, target, transferRequest);
        // Verify source deductions
        assert.strictEqual(result.source.getStocks().waterKg, 850);
        assert.strictEqual(result.source.getStocks().carbonKg, 450);
        assert.strictEqual(result.source.getStocks().mineralKg, 225);
        assert.strictEqual(result.source.getStocks().oxygenKg, 140);
        assert.strictEqual(result.source.getStocks().thermalEnergyJoules, 45000);
        // Verify target additions
        assert.strictEqual(result.target.getStocks().waterKg, 350);
        assert.strictEqual(result.target.getStocks().carbonKg, 150);
        assert.strictEqual(result.target.getStocks().mineralKg, 75);
        assert.strictEqual(result.target.getStocks().oxygenKg, 40);
        assert.strictEqual(result.target.getStocks().thermalEnergyJoules, 15000);
        // Verify system mass conservation: sum(source_initial + target_initial) === sum(source_final + target_final)
        const initialTotalMass = (initialStocksSource.waterKg ?? 0) +
            (initialStocksSource.carbonKg ?? 0) +
            (initialStocksSource.mineralKg ?? 0) +
            (initialStocksSource.oxygenKg ?? 0) +
            (initialStocksTarget.waterKg ?? 0) +
            (initialStocksTarget.carbonKg ?? 0) +
            (initialStocksTarget.mineralKg ?? 0) +
            (initialStocksTarget.oxygenKg ?? 0);
        const finalTotalMass = (result.source.getStocks().waterKg ?? 0) +
            (result.source.getStocks().carbonKg ?? 0) +
            (result.source.getStocks().mineralKg ?? 0) +
            (result.source.getStocks().oxygenKg ?? 0) +
            (result.target.getStocks().waterKg ?? 0) +
            (result.target.getStocks().carbonKg ?? 0) +
            (result.target.getStocks().mineralKg ?? 0) +
            (result.target.getStocks().oxygenKg ?? 0);
        assert.ok(Math.abs(initialTotalMass - finalTotalMass) < 1e-12);
    });
    it('executeAdvectiveTransfer rejects self-advection transfers', () => {
        const stocks = {
            waterKg: 500,
            carbonKg: 200,
            mineralKg: 100,
            oxygenKg: 50,
            thermalEnergyJoules: 10000,
        };
        const cellA = SpatialCellMonad.unit('8826856235fffff', stocks);
        const cellB = SpatialCellMonad.unit('8826856235fffff', stocks);
        const transferRequest = {
            deltaWaterKg: 10,
            deltaCarbonKg: 5,
            deltaMineralKg: 2,
            deltaOxygenKg: 1,
            deltaEnergyJoules: 100,
        };
        assert.throws(() => executeAdvectiveTransfer(cellA, cellB, transferRequest), /Self-advection transfer rejected/);
    });
});
