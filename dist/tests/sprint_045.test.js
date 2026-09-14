import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3StateTensor, applyThermodynamicOverrides, computeCellHeatCapacity, ThermodynamicDomainViolationError, NegativeMassForbiddenError, CellOutOfBoundsError, ThermodynamicInconsistencyError, } from '../src/spatial/h3_state_tensor.js';
import { ThermodynamicChannel, THERMODYNAMIC_CONSTANTS, } from '../src/spatial/h3_types.js';
import { SpatialMonad } from '../src/monads/spatial_monad.js';
describe('Sprint 045: Thermodynamic Overrides & Boundary Ledgering', () => {
    // Helper to generate N synthetic H3 index strings
    function generateH3Indices(count) {
        const indices = [];
        for (let i = 0; i < count; i++) {
            indices.push(`8828308281${i.toString(16).padStart(5, '0')}f`);
        }
        return indices;
    }
    it('1. Conservation Accounting: inject +500kg water and +120kJ sensible heat across 5 target cells', () => {
        const cellIndices = generateH3Indices(100);
        const tensor = new H3StateTensor(cellIndices);
        // Pre-condition: verify all 100 cells start at zero
        assert.strictEqual(tensor.cellCount, 100);
        for (let i = 0; i < 100 * ThermodynamicChannel.CHANNEL_COUNT; i++) {
            assert.strictEqual(tensor.buffer[i], 0.0);
        }
        // Pick 5 target cells: cell 0, 10, 25, 50, 99
        const targets = [cellIndices[0], cellIndices[10], cellIndices[25], cellIndices[50], cellIndices[99]];
        const overrides = new Map();
        for (const h3 of targets) {
            overrides.set(h3, {
                waterMassKg: 500.0,
                sensibleHeatJoules: 120_000.0,
            });
        }
        // Apply partial thermodynamic overrides
        const report = applyThermodynamicOverrides(tensor, overrides);
        // Verify aggregate ledger numbers per RFC 6.1
        assert.strictEqual(report.cellCountModified, 5);
        assert.strictEqual(report.netMassDeltaKg, 2500.0);
        assert.strictEqual(report.netEnergyDeltaJoules, 600_000.0);
        assert.strictEqual(report.netThermalEnergyDeltaJoules, 600_000.0);
        // Verify cell reports
        assert.strictEqual(report.cellReports.length, 5);
        for (const cr of report.cellReports) {
            assert.strictEqual(cr.massDeltaKg, 500.0);
            assert.strictEqual(cr.energyDeltaJoules, 120_000.0);
            assert.strictEqual(cr.thermalEnergyDeltaJoules, 120_000.0);
            assert.deepStrictEqual(cr.overriddenFields, ['waterMassKg', 'sensibleHeatJoules']);
        }
        // Verify target cells in tensor buffer have exact values
        for (const h3 of targets) {
            assert.strictEqual(tensor.getCellValue(h3, ThermodynamicChannel.WATER_MASS_KG), 500.0);
            assert.strictEqual(tensor.getCellValue(h3, ThermodynamicChannel.SENSIBLE_HEAT_JOULES), 120_000.0);
            // Because sensibleHeat was set and recomputeSensibleHeat is true, temperature was updated
            const offset = tensor.getCellOffset(h3);
            const cp = computeCellHeatCapacity(tensor.buffer, offset);
            assert.strictEqual(tensor.getCellValue(h3, ThermodynamicChannel.TEMPERATURE_KELVIN), 120_000.0 / cp);
        }
        // Verify un-mutated 95 cells remain bitwise identical to 0.0
        const targetSet = new Set(targets);
        for (const h3 of cellIndices) {
            if (!targetSet.has(h3)) {
                const vec = tensor.getCellVector(h3);
                for (let c = 0; c < ThermodynamicChannel.CHANNEL_COUNT; c++) {
                    assert.strictEqual(vec[c], 0.0);
                }
            }
        }
    });
    it('2. Thermodynamic Limit Violations: strict mode rejects negative mass and sub-CMB temperature without mutating buffer', () => {
        const cellIndices = generateH3Indices(10);
        const tensor = new H3StateTensor(cellIndices);
        const originalBuffer = tensor.buffer.slice();
        // 2.1 Attempt negative biomass (-1.0 kg)
        assert.throws(() => {
            applyThermodynamicOverrides(tensor, { [cellIndices[2]]: { vegetationBiomassKg: -1.0 } }, { strictThermodynamicBounds: true });
        }, NegativeMassForbiddenError);
        // Ensure buffer untouched
        assert.deepStrictEqual(tensor.buffer, originalBuffer);
        // 2.2 Attempt sub-CMB temperature (-5.0 K)
        assert.throws(() => {
            applyThermodynamicOverrides(tensor, { [cellIndices[3]]: { temperatureKelvin: -5.0 } }, { strictThermodynamicBounds: true });
        }, ThermodynamicDomainViolationError);
        assert.deepStrictEqual(tensor.buffer, originalBuffer);
        // 2.3 Attempt albedo outside [0, 1]
        assert.throws(() => {
            applyThermodynamicOverrides(tensor, { [cellIndices[4]]: { albedo: 1.5 } }, { strictThermodynamicBounds: true });
        }, ThermodynamicDomainViolationError);
        assert.deepStrictEqual(tensor.buffer, originalBuffer);
        // 2.4 Attempt nonexistent H3 cell in strict mode
        assert.throws(() => {
            applyThermodynamicOverrides(tensor, { '8828308281ffffff': { waterMassKg: 100 } }, { strictThermodynamicBounds: true });
        }, CellOutOfBoundsError);
        assert.deepStrictEqual(tensor.buffer, originalBuffer);
    });
    it('3. Clamping Mode (strict: false) clamps out-of-bounds inputs', () => {
        const cellIndices = generateH3Indices(5);
        const tensor = new H3StateTensor(cellIndices);
        // Pre-populate cell 0 with some mass
        tensor.setCellValue(cellIndices[0], ThermodynamicChannel.WATER_MASS_KG, 200.0);
        tensor.setCellValue(cellIndices[0], ThermodynamicChannel.TEMPERATURE_KELVIN, 280.0);
        const report = applyThermodynamicOverrides(tensor, {
            [cellIndices[0]]: {
                waterMassKg: -50.0, // should clamp to 0.0
                temperatureKelvin: 1.0, // should clamp to minTemp (2.7315 K)
                albedo: 2.5, // should clamp to 1.0
            },
            'nonexistent_cell': { waterMassKg: 10.0 }, // should be ignored
        }, { strictThermodynamicBounds: false });
        assert.strictEqual(report.cellCountModified, 1);
        assert.strictEqual(tensor.getCellValue(cellIndices[0], ThermodynamicChannel.WATER_MASS_KG), 0.0);
        assert.strictEqual(tensor.getCellValue(cellIndices[0], ThermodynamicChannel.TEMPERATURE_KELVIN), THERMODYNAMIC_CONSTANTS.MIN_TEMPERATURE_KELVIN);
        assert.strictEqual(tensor.getCellValue(cellIndices[0], ThermodynamicChannel.ALBEDO), 1.0);
        assert.strictEqual(report.netMassDeltaKg, -200.0); // reduced from 200 to 0
    });
    it('4. Thermal Coupling & Consistency: reconciling T and sensible heat', () => {
        const cellIndices = generateH3Indices(5);
        const tensor = new H3StateTensor(cellIndices);
        const targetCell = cellIndices[1];
        const offset = tensor.getCellOffset(targetCell);
        // Set water mass to 100 kg
        tensor.setCellValue(targetCell, ThermodynamicChannel.WATER_MASS_KG, 100.0);
        const cp = computeCellHeatCapacity(tensor.buffer, offset);
        // 4.1 Consistent override with both T and sensible heat
        const targetTemp = 300.0;
        const consistentHeat = cp * targetTemp;
        const report = applyThermodynamicOverrides(tensor, {
            [targetCell]: {
                temperatureKelvin: targetTemp,
                sensibleHeatJoules: consistentHeat,
            },
        }, { strictThermodynamicBounds: true });
        assert.strictEqual(report.cellCountModified, 1);
        assert.strictEqual(tensor.getCellValue(targetCell, ThermodynamicChannel.TEMPERATURE_KELVIN), targetTemp);
        assert.strictEqual(tensor.getCellValue(targetCell, ThermodynamicChannel.SENSIBLE_HEAT_JOULES), consistentHeat);
        // 4.2 Inconsistent override in strict mode throws
        assert.throws(() => {
            applyThermodynamicOverrides(tensor, {
                [targetCell]: {
                    temperatureKelvin: targetTemp,
                    sensibleHeatJoules: consistentHeat + 10_000.0, // inconsistent!
                },
            }, { strictThermodynamicBounds: true });
        }, ThermodynamicInconsistencyError);
        // 4.3 Inconsistent override in non-strict mode reconciles sensible heat to cp * T
        applyThermodynamicOverrides(tensor, {
            [targetCell]: {
                temperatureKelvin: 310.0,
                sensibleHeatJoules: 999.0, // will be reconciled
            },
        }, { strictThermodynamicBounds: false });
        const expectedHeatReconciled = cp * 310.0;
        assert.strictEqual(tensor.getCellValue(targetCell, ThermodynamicChannel.TEMPERATURE_KELVIN), 310.0);
        assert.strictEqual(tensor.getCellValue(targetCell, ThermodynamicChannel.SENSIBLE_HEAT_JOULES), expectedHeatReconciled);
    });
    it('5. Chemical Enthalpy Ledgering when includeChemicalEnthalpy is true', () => {
        const cellIndices = generateH3Indices(5);
        const tensor = new H3StateTensor(cellIndices);
        const targetCell = cellIndices[0];
        // Inject 10 kg of water and 5 kg of vegetation biomass
        const report = applyThermodynamicOverrides(tensor, {
            [targetCell]: {
                waterMassKg: 10.0,
                vegetationBiomassKg: 5.0,
            },
        }, { includeChemicalEnthalpy: true, recomputeSensibleHeat: false });
        const expectedChemicalDelta = 10.0 * THERMODYNAMIC_CONSTANTS.SPECIFIC_ENTHALPY.WATER +
            5.0 * THERMODYNAMIC_CONSTANTS.SPECIFIC_ENTHALPY.VEGETATION_BIOMASS;
        assert.strictEqual(report.netMassDeltaKg, 15.0);
        assert.strictEqual(report.netChemicalEnergyDeltaJoules, expectedChemicalDelta);
        assert.strictEqual(report.netThermalEnergyDeltaJoules, 0.0);
        assert.strictEqual(report.netEnergyDeltaJoules, expectedChemicalDelta);
    });
    it('6. SpatialMonad Preservation, Associativity and Kleisli pipeline', () => {
        const cellIndices = generateH3Indices(10);
        const tensor = new H3StateTensor(cellIndices);
        const monad = SpatialMonad.of(tensor);
        // Test Identity Law: applying empty overrides yields zero delta
        const identityMonad = monad.applyOverrides(new Map());
        assert.strictEqual(identityMonad.getCumulativeNetMassDeltaKg(), 0.0);
        assert.strictEqual(identityMonad.getCumulativeNetEnergyDeltaJoules(), 0.0);
        assert.strictEqual(identityMonad.getOverrideLedger().length, 1);
        assert.strictEqual(identityMonad.getOverrideLedger()[0].cellCountModified, 0);
        // Test Monadic Chain with Disjoint Overrides
        const step1Overrides = {
            [cellIndices[0]]: { waterMassKg: 250.0, sensibleHeatJoules: 50_000.0 },
            [cellIndices[1]]: { soilOrganicCarbonKg: 100.0 },
        };
        const step2Overrides = {
            [cellIndices[2]]: { vegetationBiomassKg: 80.0, sensibleHeatJoules: 30_000.0 },
        };
        const sequencedMonad = monad
            .applyOverrides(step1Overrides)
            .applyOverrides(step2Overrides);
        assert.strictEqual(sequencedMonad.getOverrideLedger().length, 2);
        assert.strictEqual(sequencedMonad.getCumulativeNetMassDeltaKg(), 250.0 + 100.0 + 80.0);
        assert.strictEqual(sequencedMonad.getCumulativeNetEnergyDeltaJoules(), 50_000.0 + 30_000.0);
        // Test Monadic Bind method
        const boundMonad = sequencedMonad.bind((t) => {
            return applyThermodynamicOverrides(t, {
                [cellIndices[3]]: { atmosphericCo2Kg: 50.0 },
            });
        });
        assert.strictEqual(boundMonad.getOverrideLedger().length, 3);
        assert.strictEqual(boundMonad.getCumulativeNetMassDeltaKg(), 430.0 + 50.0);
    });
    it('7. High-Volume Stability: 10,000 in-place partial mutations perform cleanly without buffer churn', () => {
        const count = 1000;
        const cellIndices = generateH3Indices(count);
        const tensor = new H3StateTensor(cellIndices);
        // Apply 10 batches of 1,000 cell updates
        const batchMap = new Map();
        for (let i = 0; i < count; i++) {
            batchMap.set(cellIndices[i], {
                waterMassKg: i * 2.0,
                albedo: (i % 100) / 100.0,
            });
        }
        const t0 = performance.now();
        for (let run = 0; run < 10; run++) {
            applyThermodynamicOverrides(tensor, batchMap, {
                strictThermodynamicBounds: true,
                recomputeSensibleHeat: false,
            });
        }
        const elapsed = performance.now() - t0;
        // Total 10,000 cell updates completed in sub-second time
        assert.ok(elapsed < 1000, `Benchmark took ${elapsed}ms for 10,000 cell updates`);
        // Verify cell 500 final state
        assert.strictEqual(tensor.getCellValue(cellIndices[500], ThermodynamicChannel.WATER_MASS_KG), 1000.0);
        assert.strictEqual(tensor.getCellValue(cellIndices[500], ThermodynamicChannel.ALBEDO), 0.0);
    });
});
