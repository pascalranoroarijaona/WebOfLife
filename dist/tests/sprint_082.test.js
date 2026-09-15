import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validatePentagonalNeighborCount, PentagonalCoordinationViolationError, computePentagonalFluxStep, } from '../src/spatial/h3_adjacency.js';
describe('Sprint 082: Pentagonal Neighbor Count Validation and Adjacency Invariants', () => {
    it('should accept an array of exactly 5 neighbor indices without throwing', () => {
        const validStringNeighbors = ['85283473fffffff', '85283477fffffff', '8528347bfffffff', '8528347ffffffff', '85283443fffffff'];
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
            assert.match(err.message, /for cell 85080003fffffff/);
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
            assert.strictEqual(err.cellIndex, undefined);
            assert.strictEqual(err.message, 'Pentagonal coordination violation: expected exactly 5 neighbors, but received 0.');
            return true;
        });
    });
    it('should support custom error messages in PentagonalCoordinationViolationError constructor', () => {
        const error = new PentagonalCoordinationViolationError(3, 'cell-99', 'Topological manifold defect at vertex 99');
        assert.strictEqual(error.actualCount, 3);
        assert.strictEqual(error.cellIndex, 'cell-99');
        assert.strictEqual(error.message, 'Topological manifold defect at vertex 99');
    });
    it('should guarantee mass and energy conservation in computePentagonalFluxStep with valid coordination', () => {
        const pentagonId = 'pentagon-0';
        const neighbors = ['n1', 'n2', 'n3', 'n4', 'n5'];
        const stocks = new Map();
        stocks.set(pentagonId, {
            carbonMol: 100,
            waterMol: 500,
            nitrogenMol: 50,
            phosphorusMol: 10,
            oxygenMol: 200,
            energyJoules: 10000,
        });
        for (let i = 0; i < neighbors.length; i++) {
            stocks.set(neighbors[i], {
                carbonMol: 120 + i * 10,
                waterMol: 480 - i * 15,
                nitrogenMol: 60 + i * 2,
                phosphorusMol: 15 - i,
                oxygenMol: 190 + i * 5,
                energyJoules: 9500 + i * 100,
            });
        }
        const edgeConductances = [1.0, 1.2, 0.9, 1.1, 0.95];
        const diffusionCoeff = 0.05;
        const dtSeconds = 10;
        const transfers = computePentagonalFluxStep(pentagonId, neighbors, stocks, edgeConductances, diffusionCoeff, dtSeconds);
        assert.strictEqual(transfers.size, 6);
        // Invariant: Total delta across pentagon and its 5 neighbors must be 0 (First Law of Thermodynamics)
        let totalDeltaCarbon = 0;
        let totalDeltaWater = 0;
        let totalDeltaNitrogen = 0;
        let totalDeltaPhosphorus = 0;
        let totalDeltaOxygen = 0;
        let totalDeltaEnergy = 0;
        for (const transfer of transfers.values()) {
            totalDeltaCarbon += transfer.deltaCarbon;
            totalDeltaWater += transfer.deltaWater;
            totalDeltaNitrogen += transfer.deltaNitrogen;
            totalDeltaPhosphorus += transfer.deltaPhosphorus;
            totalDeltaOxygen += transfer.deltaOxygen;
            totalDeltaEnergy += transfer.deltaEnergy;
        }
        assert(Math.abs(totalDeltaCarbon) < 1e-12, 'Carbon delta must sum to zero');
        assert(Math.abs(totalDeltaWater) < 1e-12, 'Water delta must sum to zero');
        assert(Math.abs(totalDeltaNitrogen) < 1e-12, 'Nitrogen delta must sum to zero');
        assert(Math.abs(totalDeltaPhosphorus) < 1e-12, 'Phosphorus delta must sum to zero');
        assert(Math.abs(totalDeltaOxygen) < 1e-12, 'Oxygen delta must sum to zero');
        assert(Math.abs(totalDeltaEnergy) < 1e-12, 'Energy delta must sum to zero');
    });
    it('should reject computePentagonalFluxStep when neighbor array length deviates from 5', () => {
        const pentagonId = 'pentagon-invalid';
        const invalidNeighbors = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'];
        const stocks = new Map();
        assert.throws(() => {
            computePentagonalFluxStep(pentagonId, invalidNeighbors, stocks, [1, 1, 1, 1, 1], 0.1, 1);
        }, (err) => {
            assert(err instanceof PentagonalCoordinationViolationError);
            assert.strictEqual(err.actualCount, 6);
            return true;
        });
    });
});
