/**
 * Test suite for Sprint 049: Topological Pentagon Cell Validation via H3 Index Decomposition
 * Verifies bitwise decomposition, pentagon invariants, coordination limits,
 * adjacency management, and conservative mass/energy advection.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isPentagonCell, getCoordinationNumber, createH3Index, H3_CONSTANTS, H3TopologyValidator, H3AdjacencyCoordinator, SpatialAdvectionDiffusionMonad, } from '../src/spatial/h3_adjacency.js';
describe('Sprint 049: Topological Pentagon Cell Validation', () => {
    it('Base Cell Resolution 0 Verification: Exactly 12 pentagons across all 122 base cells', () => {
        let pentagonCount = 0;
        const detectedPentagons = [];
        for (let baseCell = 0; baseCell < 122; baseCell++) {
            const index = createH3Index(baseCell, 0);
            const isPent = isPentagonCell(index);
            if (isPent) {
                pentagonCount++;
                detectedPentagons.push(baseCell);
            }
        }
        assert.strictEqual(pentagonCount, 12, 'Must detect exactly 12 pentagonal base cells at resolution 0');
        const expectedPentagons = [4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107];
        assert.deepStrictEqual(detectedPentagons, expectedPentagons, 'Detected pentagon base cells must match canonical icosahedral set');
    });
    it('Multi-Resolution Invariance: Center digit branch preserves pentagon status', () => {
        const validator = H3TopologyValidator.getInstance();
        // Base cell 4 is a known pentagon
        for (let res = 1; res <= 5; res++) {
            const centerDigits = new Array(res).fill(0);
            const pentagonIndex = createH3Index(4, res, centerDigits);
            assert.strictEqual(isPentagonCell(pentagonIndex), true, `Base cell 4 at res ${res} with all 0 digits must be a pentagon`);
            assert.strictEqual(validator.getCoordinationNumber(pentagonIndex), 5, `Coordination number must be 5 for pentagon at res ${res}`);
        }
    });
    it('Non-Zero Child Branch: Any non-zero digit transitions into regular hexagon', () => {
        // Base cell 14 is a pentagon at res 0
        // At res 1 with directional digit 1, 2, 3, 4, 5, 6 it becomes a hexagon
        for (let digit = 1; digit <= 6; digit++) {
            const hexIndex = createH3Index(14, 1, [digit]);
            assert.strictEqual(isPentagonCell(hexIndex), false, `Child cell with digit ${digit} must not be a pentagon`);
            assert.strictEqual(getCoordinationNumber(hexIndex), 6, `Hexagonal child cell must have coordination number 6`);
        }
        // Deeper resolution: [0, 0, 3] should be a hexagon
        const deepHex = createH3Index(14, 3, [0, 0, 3]);
        assert.strictEqual(isPentagonCell(deepHex), false);
        assert.strictEqual(getCoordinationNumber(deepHex), 6);
    });
    it('Hexagonal Base Cells remain non-pentagonal across all child configurations', () => {
        // Base cell 5 is not in PENTAGON_BASE_CELLS
        assert.strictEqual(isPentagonCell(createH3Index(5, 0)), false);
        assert.strictEqual(isPentagonCell(createH3Index(5, 1, [0])), false);
        assert.strictEqual(isPentagonCell(createH3Index(5, 2, [0, 0])), false);
    });
    it('Invalid Index Resilience: Handles malformed strings, mode != 1, res > 15 gracefully', () => {
        assert.strictEqual(isPentagonCell('invalid_hex_string'), false);
        assert.strictEqual(isPentagonCell(''), false);
        assert.strictEqual(isPentagonCell('0xZZZZ'), false);
        // Mode 2 instead of Mode 1
        const invalidModeIndex = createH3Index(4, 0, [], 2);
        assert.strictEqual(isPentagonCell(invalidModeIndex), false);
        // BigInt decomposition validation check
        const validator = new H3TopologyValidator();
        assert.throws(() => validator.validateIndex(invalidModeIndex), /Invalid H3 mode/);
    });
    it('H3CellDecomposition contract matches bitwise layout', () => {
        const validator = H3TopologyValidator.getInstance();
        const index = createH3Index(42, 3, [0, 0, 0]);
        const dec = validator.decompose(index);
        assert.strictEqual(dec.mode, 1);
        assert.strictEqual(dec.resolution, 3);
        assert.strictEqual(dec.baseCell, 42);
        assert.deepStrictEqual(dec.digits, [0, 0, 0]);
        assert.strictEqual(dec.isPentagon, true);
    });
    it('Adjacency Coordinator: Restricts pentagons to exactly 5 neighbors', () => {
        const coordinator = new H3AdjacencyCoordinator();
        const pentagonCell = createH3Index(4, 1, [0]);
        const hexCell = createH3Index(5, 1, [1]);
        const pentNeighbors = coordinator.getNeighbors(pentagonCell);
        const hexNeighbors = coordinator.getNeighbors(hexCell);
        assert.strictEqual(pentNeighbors.length, 5, 'Pentagon must yield exactly 5 neighbors');
        assert.strictEqual(hexNeighbors.length, 6, 'Hexagon must yield exactly 6 neighbors');
        // Verify all returned neighbor strings are distinct
        const uniquePentNeighbors = new Set(pentNeighbors);
        assert.strictEqual(uniquePentNeighbors.size, 5, 'Pentagon neighbors must all be distinct IDs');
        // Register 6 neighbors for a pentagon cell and assert truncation to 5
        const fake6Neighbors = [
            '81043ffffffffff',
            '81047ffffffffff',
            '8104bffffffffff',
            '8104ffffffffff1',
            '81053ffffffffff',
            '81057ffffffffff', // 6th phantom neighbor
        ];
        coordinator.registerAdjacency(pentagonCell, fake6Neighbors);
        const clampedNeighbors = coordinator.getNeighbors(pentagonCell);
        assert.strictEqual(clampedNeighbors.length, 5, 'Adjacency coordinator must truncate 6th edge on pentagons');
    });
    it('Boundary Flux & Second-Law Metric Scaling: Applies perimeter factor to pentagon interfaces', () => {
        const coordinator = new H3AdjacencyCoordinator();
        const pentagonCell = createH3Index(4, 0);
        const hexCellA = createH3Index(5, 0);
        const hexCellB = createH3Index(6, 0);
        const hexToHexFlux = coordinator.computeBoundaryFlux({
            sourceCell: hexCellA,
            targetCell: hexCellB,
            contactAreaM2: 1000.0,
            dtSeconds: 1.0,
            sourceConcentration: 10.0,
            targetConcentration: 20.0,
            diffusionCoeff: 0.1,
        });
        const pentToHexFlux = coordinator.computeBoundaryFlux({
            sourceCell: pentagonCell,
            targetCell: hexCellA,
            contactAreaM2: 1000.0,
            dtSeconds: 1.0,
            sourceConcentration: 10.0,
            targetConcentration: 20.0,
            diffusionCoeff: 0.1,
        });
        assert.strictEqual(hexToHexFlux.isPentagonalInterface, false);
        assert.strictEqual(pentToHexFlux.isPentagonalInterface, true);
        const expectedScaledArea = 1000.0 * H3_CONSTANTS.PENTAGON_PERIMETER_FACTOR;
        assert.ok(Math.abs(pentToHexFlux.effectiveAreaM2 - expectedScaledArea) < 1e-6, 'Effective area must scale by pentagon perimeter factor');
        assert.ok(pentToHexFlux.massFlux > hexToHexFlux.massFlux, 'Mass flux must scale proportionally to effective interface conductance');
    });
    it('Mass and Energy Conservation: 100-step diffusive transport preserves machine precision', () => {
        const pentagonId = createH3Index(4, 0);
        const n1 = createH3Index(5, 0);
        const n2 = createH3Index(6, 0);
        const n3 = createH3Index(7, 0);
        const n4 = createH3Index(8, 0);
        const n5 = createH3Index(9, 0);
        const initialStates = [
            {
                h3Index: pentagonId,
                waterKg: 5000.0,
                carbonKg: 200.0,
                mineralKg: 50.0,
                oxygenKg: 100.0,
                thermalEnergyJoules: 5000.0 * 4184 * 295,
                volumeM3: 5000.0,
                temperatureK: 295,
            },
            {
                h3Index: n1,
                waterKg: 1000.0,
                carbonKg: 50.0,
                mineralKg: 10.0,
                oxygenKg: 20.0,
                thermalEnergyJoules: 1000.0 * 4184 * 285,
                volumeM3: 1000.0,
                temperatureK: 285,
            },
            {
                h3Index: n2,
                waterKg: 1200.0,
                carbonKg: 60.0,
                mineralKg: 12.0,
                oxygenKg: 24.0,
                thermalEnergyJoules: 1200.0 * 4184 * 286,
                volumeM3: 1200.0,
                temperatureK: 286,
            },
            {
                h3Index: n3,
                waterKg: 800.0,
                carbonKg: 40.0,
                mineralKg: 8.0,
                oxygenKg: 16.0,
                thermalEnergyJoules: 800.0 * 4184 * 288,
                volumeM3: 800.0,
                temperatureK: 288,
            },
            {
                h3Index: n4,
                waterKg: 1500.0,
                carbonKg: 75.0,
                mineralKg: 15.0,
                oxygenKg: 30.0,
                thermalEnergyJoules: 1500.0 * 4184 * 290,
                volumeM3: 1500.0,
                temperatureK: 290,
            },
            {
                h3Index: n5,
                waterKg: 1100.0,
                carbonKg: 55.0,
                mineralKg: 11.0,
                oxygenKg: 22.0,
                thermalEnergyJoules: 1100.0 * 4184 * 287,
                volumeM3: 1100.0,
                temperatureK: 287,
            },
        ];
        const initialTotalWater = initialStates.reduce((acc, s) => acc + (s.waterKg ?? 0), 0);
        const initialTotalCarbon = initialStates.reduce((acc, s) => acc + (s.carbonKg ?? 0), 0);
        const initialTotalEnergy = initialStates.reduce((acc, s) => acc + (s.thermalEnergyJoules ?? 0), 0);
        let monad = new SpatialAdvectionDiffusionMonad(initialStates);
        const neighborMap = new Map([
            [BigInt(pentagonId), [BigInt(n1), BigInt(n2), BigInt(n3), BigInt(n4), BigInt(n5)]],
            [BigInt(n1), [BigInt(pentagonId), BigInt(n2), BigInt(n5)]],
            [BigInt(n2), [BigInt(pentagonId), BigInt(n1), BigInt(n3)]],
            [BigInt(n3), [BigInt(pentagonId), BigInt(n2), BigInt(n4)]],
            [BigInt(n4), [BigInt(pentagonId), BigInt(n3), BigInt(n5)]],
            [BigInt(n5), [BigInt(pentagonId), BigInt(n4), BigInt(n1)]],
        ]);
        const getValidNeighbors = (id) => neighborMap.get(id) ?? [];
        const diffusionCoeffs = {
            water: 0.05,
            carbon: 0.02,
            minerals: 0.01,
            oxygen: 0.03,
            thermal: 0.04,
        };
        // Integrate 100 transport steps
        for (let step = 0; step < 100; step++) {
            monad = monad.step(0.1, getValidNeighbors, 100.0, diffusionCoeffs);
        }
        const finalStates = monad.getAllStates();
        const finalTotalWater = finalStates.reduce((acc, s) => acc + (s.waterKg ?? 0), 0);
        const finalTotalCarbon = finalStates.reduce((acc, s) => acc + (s.carbonKg ?? 0), 0);
        const finalTotalEnergy = finalStates.reduce((acc, s) => acc + (s.thermalEnergyJoules ?? 0), 0);
        const waterDeviation = Math.abs(finalTotalWater - initialTotalWater);
        const carbonDeviation = Math.abs(finalTotalCarbon - initialTotalCarbon);
        const energyDeviation = Math.abs(finalTotalEnergy - initialTotalEnergy);
        assert.ok(waterDeviation < 1e-11, `Water mass must be strictly conserved (deviation: ${waterDeviation} kg)`);
        assert.ok(carbonDeviation < 1e-12, `Carbon mass must be strictly conserved (deviation: ${carbonDeviation} kg)`);
        assert.ok(energyDeviation < 1e-6, `Thermal energy must be conserved (deviation: ${energyDeviation} J)`);
    });
});
