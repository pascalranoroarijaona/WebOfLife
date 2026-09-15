import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validatePentagonalNeighborCount, PentagonalCoordinationViolationError, computePentagonalFluxStep, } from '../src/spatial/h3_adjacency.js';
describe('Sprint 082: Pentagonal Neighbor Count Validation and Adjacency Invariants', () => {
    it('should accept an array of exactly 5 neighbor indices without throwing', () => {
        const validStringNeighbors = [
            '85283473fffffff',
            '85283477fffffff',
            '8528347bfffffff',
            '8528347ffffffff',
            '85283443fffffff',
        ];
        assert.doesNotThrow(() => {
            validatePentagonalNeighborCount(validStringNeighbors);
        });
        const validObjectNeighbors = [
            { id: 1 },
            { id: 2 },
            { id: 3 },
            { id: 4 },
            { id: 5 },
        ];
        assert.doesNotThrow(() => {
            validatePentagonalNeighborCount(validObjectNeighbors, 'test-cell-123');
        });
    });
    it('should throw PentagonalCoordinationViolationError when array length is 6 (hexagonal neighbor count)', () => {
        const hexNeighbors = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
        const cellId = '85080003fffffff';
        assert.throws(() => {
            validatePentagonalNeighborCount(hexNeighbors, cellId);
        }, (err) => {
            assert(err instanceof PentagonalCoordinationViolationError);
            assert(err instanceof Error);
            assert.strictEqual(err.name, 'PentagonalCoordinationViolationError');
            assert.strictEqual(err.actualCount, 6);
            assert.strictEqual(err.expectedCount, 5);
            assert.strictEqual(err.cellIndex, cellId);
            assert.match(err.message, /85080003fffffff/);
            assert.match(err.message, /expected exactly 5 neighbors, but received 6/);
            return true;
        });
    });
    it('should throw PentagonalCoordinationViolationError when array length is 4 (truncated neighbors)', () => {
        const truncatedNeighbors = ['c1', 'c2', 'c3', 'c4'];
        const cellId = '85080007fffffff';
        assert.throws(() => {
            validatePentagonalNeighborCount(truncatedNeighbors, cellId);
        }, (err) => {
            assert(err instanceof PentagonalCoordinationViolationError);
            assert.strictEqual(err.actualCount, 4);
            assert.strictEqual(err.expectedCount, 5);
            assert.strictEqual(err.cellIndex, cellId);
            assert.match(err.message, /85080007fffffff/);
            assert.match(err.message, /expected exactly 5 neighbors, but received 4/);
            return true;
        });
    });
    it('should throw PentagonalCoordinationViolationError when array is empty (unlinked pentagon)', () => {
        assert.throws(() => {
            validatePentagonalNeighborCount([]);
        }, (err) => {
            assert(err instanceof PentagonalCoordinationViolationError);
            assert.strictEqual(err.actualCount, 0);
            assert.strictEqual(err.expectedCount, 5);
            return true;
        });
    });
    it('should throw PentagonalCoordinationViolationError when input is not an array', () => {
        assert.throws(() => {
            validatePentagonalNeighborCount('invalid');
        }, (err) => {
            assert(err instanceof PentagonalCoordinationViolationError);
            return true;
        });
    });
    it('should enforce strict conservation in computePentagonalFluxStep across all 5 interfaces', () => {
        const pentagonId = '85080003fffffff';
        const neighbors = [
            '85283473fffffff',
            '85283477fffffff',
            '8528347bfffffff',
            '8528347ffffffff',
            '85283443fffffff',
        ];
        const stocks = new Map();
        stocks.set(pentagonId, {
            carbonMol: 500.0,
            waterMol: 1000.0,
            nitrogenMol: 50.0,
            phosphorusMol: 10.0,
            oxygenMol: 200.0,
            energyJoules: 1e7,
        });
        for (let i = 0; i < neighbors.length; i++) {
            stocks.set(neighbors[i], {
                carbonMol: 400.0 + i * 20.0,
                waterMol: 800.0 + i * 50.0,
                nitrogenMol: 40.0 + i * 2.0,
                phosphorusMol: 8.0 + i * 0.5,
                oxygenMol: 180.0 + i * 5.0,
                energyJoules: 8e6 + i * 5e5,
            });
        }
        const conductances = [1.0, 1.2, 0.8, 1.1, 0.9];
        const diffusionCoeff = 0.05;
        const dt = 10.0;
        const transfers = computePentagonalFluxStep(pentagonId, neighbors, stocks, conductances, diffusionCoeff, dt);
        assert.strictEqual(transfers.size, 6);
        let sumDeltaC = 0;
        let sumDeltaW = 0;
        let sumDeltaN = 0;
        let sumDeltaP = 0;
        let sumDeltaO = 0;
        let sumDeltaE = 0;
        for (const delta of transfers.values()) {
            sumDeltaC += delta.deltaCarbon;
            sumDeltaW += delta.deltaWater;
            sumDeltaN += delta.deltaNitrogen;
            sumDeltaP += delta.deltaPhosphorus;
            sumDeltaO += delta.deltaOxygen;
            sumDeltaE += delta.deltaEnergy;
        }
        const EPSILON = 1e-9;
        assert(Math.abs(sumDeltaC) < EPSILON, `Carbon delta sum should be zero, got ${sumDeltaC}`);
        assert(Math.abs(sumDeltaW) < EPSILON, `Water delta sum should be zero, got ${sumDeltaW}`);
        assert(Math.abs(sumDeltaN) < EPSILON, `Nitrogen delta sum should be zero, got ${sumDeltaN}`);
        assert(Math.abs(sumDeltaP) < EPSILON, `Phosphorus delta sum should be zero, got ${sumDeltaP}`);
        assert(Math.abs(sumDeltaO) < EPSILON, `Oxygen delta sum should be zero, got ${sumDeltaO}`);
        assert(Math.abs(sumDeltaE) < EPSILON, `Energy delta sum should be zero, got ${sumDeltaE}`);
    });
    it('should reject computePentagonalFluxStep if neighbor count does not equal 5', () => {
        const pentagonId = '85080003fffffff';
        const hexNeighbors = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
        const stocks = new Map();
        assert.throws(() => {
            computePentagonalFluxStep(pentagonId, hexNeighbors, stocks, [], 0.01, 1.0);
        }, (err) => {
            assert(err instanceof PentagonalCoordinationViolationError);
            return true;
        });
    });
});
