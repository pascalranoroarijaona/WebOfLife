// File: tests/sprint_043.test.ts
// =============================================================================
// TEST SUITE: Sprint 043 - Thermodynamic State Invariant Verification (RFC-043)
// =============================================================================
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ThermodynamicViolationType, H3CellThermodynamicState, validateH3CellThermodynamicState, isH3CellThermodynamicallyValid, computePhotosyntheticVelocity, DEFAULT_PHOTOSYNTHESIS_PARAMS } from '../src/spatial/h3_state_tensor.js';
import { bootstrapMegaPod } from '../src/earth_pod.js';
describe('RFC-043: Thermodynamic State Invariant Verification for Discrete H3 Hexagonal Cells', () => {
    const createNominalState = () => ({
        cellIndex: '8828308281fffff',
        temperatureKelvin: 298.15,
        atmosphericCarbon: 415.0,
        organicCarbon: 1200.0,
        biomassStocks: {
            autotroph: 350.0,
            herbivore: 45.0,
            predator: 5.0,
            decomposer: 80.0
        },
        waterMassKg: 50000.0,
        enthalpyJoules: 1.2e8
    });
    // TC-43-01: Nominal Admissible State
    it('TC-43-01: should validate a nominal physically admissible H3 cell state', () => {
        const nominal = createNominalState();
        const result = validateH3CellThermodynamicState(nominal);
        assert.strictEqual(result.isValid, true);
        assert.strictEqual(result.violations.length, 0);
        assert.strictEqual(result.cellIndex, '8828308281fffff');
        assert.ok(result.evaluatedAt > 0);
        assert.strictEqual(isH3CellThermodynamicallyValid(nominal), true);
    });
    // TC-43-02: Negative Material Stock
    it('TC-43-02: should detect negative material stocks and output NEGATIVE_STOCK violation', () => {
        const corrupted = { ...createNominalState(), organicCarbon: -0.5 };
        const result = validateH3CellThermodynamicState(corrupted);
        assert.strictEqual(result.isValid, false);
        assert.strictEqual(result.violations.length, 1);
        const violation = result.violations[0];
        assert.strictEqual(violation.type, ThermodynamicViolationType.NEGATIVE_STOCK);
        assert.strictEqual(violation.field, 'organicCarbon');
        assert.strictEqual(violation.value, -0.5);
        assert.strictEqual(isH3CellThermodynamicallyValid(corrupted), false);
    });
    // TC-43-03: Floating-Point Tolerance
    it('TC-43-03: should accept sub-epsilon rounding errors within tolerance but reject beyond tolerance', () => {
        const withinTolerance = { ...createNominalState(), waterMassKg: -1e-12 }; // Well within default 1e-9 tolerance
        const resultPass = validateH3CellThermodynamicState(withinTolerance);
        assert.strictEqual(resultPass.isValid, true);
        assert.strictEqual(resultPass.violations.length, 0);
        assert.strictEqual(isH3CellThermodynamicallyValid(withinTolerance), true);
        const beyondTolerance = { ...createNominalState(), waterMassKg: -1e-7 }; // Violates 1e-9 tolerance
        const resultFail = validateH3CellThermodynamicState(beyondTolerance);
        assert.strictEqual(resultFail.isValid, false);
        assert.strictEqual(resultFail.violations.length, 1);
        assert.strictEqual(resultFail.violations[0].type, ThermodynamicViolationType.NEGATIVE_STOCK);
        assert.strictEqual(resultFail.violations[0].field, 'waterMassKg');
        assert.strictEqual(isH3CellThermodynamicallyValid(beyondTolerance), false);
    });
    // TC-43-04: Non-Positive Temperature
    it('TC-43-04: should reject non-positive absolute temperatures (T <= 0 K)', () => {
        const zeroTemp = { ...createNominalState(), temperatureKelvin: 0.0 };
        const resZero = validateH3CellThermodynamicState(zeroTemp);
        assert.strictEqual(resZero.isValid, false);
        assert.strictEqual(resZero.violations[0].type, ThermodynamicViolationType.NON_POSITIVE_TEMPERATURE);
        assert.strictEqual(resZero.violations[0].field, 'temperatureKelvin');
        assert.strictEqual(isH3CellThermodynamicallyValid(zeroTemp), false);
        const negativeTemp = { ...createNominalState(), temperatureKelvin: -10.0 };
        const resNeg = validateH3CellThermodynamicState(negativeTemp);
        assert.strictEqual(resNeg.isValid, false);
        assert.strictEqual(resNeg.violations[0].type, ThermodynamicViolationType.NON_POSITIVE_TEMPERATURE);
        assert.strictEqual(resNeg.violations[0].field, 'temperatureKelvin');
        assert.strictEqual(isH3CellThermodynamicallyValid(negativeTemp), false);
    });
    // TC-43-05: Non-Finite Values
    it('TC-43-05: should detect NaN and Infinity as NON_FINITE_VALUE violations', () => {
        const nanState = {
            ...createNominalState(),
            temperatureKelvin: NaN,
            atmosphericCarbon: Infinity,
            enthalpyJoules: -Infinity
        };
        const result = validateH3CellThermodynamicState(nanState);
        assert.strictEqual(result.isValid, false);
        assert.strictEqual(result.violations.length, 3);
        const types = result.violations.map(v => v.type);
        assert.ok(types.every(t => t === ThermodynamicViolationType.NON_FINITE_VALUE));
        const fields = result.violations.map(v => v.field);
        assert.ok(fields.includes('temperatureKelvin'));
        assert.ok(fields.includes('atmosphericCarbon'));
        assert.ok(fields.includes('enthalpyJoules'));
        assert.strictEqual(isH3CellThermodynamicallyValid(nanState), false);
    });
    // TC-43-06: Trophic Biomass Stocks Validation
    it('TC-43-06: should validate trophic biomass stocks and identify the exact trophic tier key', () => {
        const badBiomass = {
            ...createNominalState(),
            biomassStocks: { ...createNominalState().biomassStocks, predator: -2.5 }
        };
        const result = validateH3CellThermodynamicState(badBiomass);
        assert.strictEqual(result.isValid, false);
        assert.strictEqual(result.violations.length, 1);
        assert.strictEqual(result.violations[0].type, ThermodynamicViolationType.NEGATIVE_STOCK);
        assert.strictEqual(result.violations[0].field, 'biomassStocks.predator');
        assert.strictEqual(result.violations[0].value, -2.5);
        assert.strictEqual(isH3CellThermodynamicallyValid(badBiomass), false);
        // Non-finite in biomass tier
        const nanBiomass = {
            ...createNominalState(),
            biomassStocks: { ...createNominalState().biomassStocks, herbivore: NaN }
        };
        const resNan = validateH3CellThermodynamicState(nanBiomass);
        assert.strictEqual(resNan.isValid, false);
        assert.strictEqual(resNan.violations[0].type, ThermodynamicViolationType.NON_FINITE_VALUE);
        assert.strictEqual(resNan.violations[0].field, 'biomassStocks.herbivore');
    });
    // TC-43-07: Fast Boolean Predicate Consistency
    it('TC-43-07: should verify isH3CellThermodynamicallyValid matches validateH3CellThermodynamicState across test cases', () => {
        const testCases = [
            createNominalState(),
            { ...createNominalState(), temperatureKelvin: 0 },
            { ...createNominalState(), temperatureKelvin: -1 },
            { ...createNominalState(), atmosphericCarbon: -0.01 },
            { ...createNominalState(), organicCarbon: -10 },
            { ...createNominalState(), waterMassKg: -0.1 },
            { ...createNominalState(), enthalpyJoules: NaN },
            { ...createNominalState(), biomassStocks: { autotroph: -0.5 } },
            { ...createNominalState(), cellIndex: '' }
        ];
        for (const testCase of testCases) {
            const detailed = validateH3CellThermodynamicState(testCase);
            const fast = isH3CellThermodynamicallyValid(testCase);
            assert.strictEqual(detailed.isValid, fast, `Mismatch for state with cellIndex=${testCase.cellIndex}`);
        }
    });
    // Additional Invariant Tests: FailFast & Metadata & Class Methods
    it('should support failFast mode stopping at first violation', () => {
        const multiCorrupt = {
            ...createNominalState(),
            temperatureKelvin: -5,
            atmosphericCarbon: -10,
            organicCarbon: -20
        };
        const fullResult = validateH3CellThermodynamicState(multiCorrupt, { failFast: false });
        assert.strictEqual(fullResult.violations.length, 3);
        const fastResult = validateH3CellThermodynamicState(multiCorrupt, { failFast: true });
        assert.strictEqual(fastResult.violations.length, 1);
    });
    it('should support custom operational temperature floors (e.g. ecological floor 150K)', () => {
        const coldState = { ...createNominalState(), temperatureKelvin: 100.0 }; // Physically > 0, but below eco floor 150K
        const defaultCheck = validateH3CellThermodynamicState(coldState);
        assert.strictEqual(defaultCheck.isValid, true);
        const ecoCheck = validateH3CellThermodynamicState(coldState, { minTemperatureKelvin: 150.0 });
        assert.strictEqual(ecoCheck.isValid, false);
        assert.strictEqual(ecoCheck.violations[0].type, ThermodynamicViolationType.NON_POSITIVE_TEMPERATURE);
        assert.strictEqual(ecoCheck.violations[0].threshold, 150.0);
    });
    it('should detect corrupt metadata such as empty cellIndex or invalid biomassStocks', () => {
        const emptyCell = { ...createNominalState(), cellIndex: '   ' };
        const resEmpty = validateH3CellThermodynamicState(emptyCell);
        assert.strictEqual(resEmpty.isValid, false);
        assert.strictEqual(resEmpty.violations[0].type, ThermodynamicViolationType.CORRUPT_METADATA);
        const missingBiomass = { ...createNominalState(), biomassStocks: undefined };
        const resMissing = validateH3CellThermodynamicState(missingBiomass);
        assert.strictEqual(resMissing.isValid, false);
        assert.strictEqual(resMissing.violations[0].type, ThermodynamicViolationType.CORRUPT_METADATA);
    });
    it('should verify H3CellThermodynamicState class methods', () => {
        const stateObj = new H3CellThermodynamicState('8828308281fffff', 298.15, 400.0, 1000.0, { autotroph: 200.0, herbivore: 50.0 }, 25000.0, 1e7);
        assert.strictEqual(stateObj.isValid(), true);
        assert.strictEqual(stateObj.totalBiomass(), 250.0);
        assert.strictEqual(stateObj.totalCarbonMass(), 1650.0);
        const cloned = stateObj.clone();
        assert.strictEqual(cloned.cellIndex, stateObj.cellIndex);
        assert.strictEqual(cloned.isValid(), true);
        cloned.atmosphericCarbon = -5;
        assert.strictEqual(cloned.isValid(), false);
        assert.strictEqual(stateObj.isValid(), true); // Original unaffected
    });
    it('should compute photosynthetic rate transitions consistent with Methods specification', () => {
        const state = createNominalState();
        const rate = computePhotosyntheticVelocity(state, DEFAULT_PHOTOSYNTHESIS_PARAMS);
        assert.ok(rate > 0, 'Nominal state should have positive photosynthesis rate');
        const frozenState = { ...state, temperatureKelvin: 260.0 };
        const frozenRate = computePhotosyntheticVelocity(frozenState, DEFAULT_PHOTOSYNTHESIS_PARAMS);
        assert.strictEqual(frozenRate, 0.0, 'Frozen cell below 273.15 K should have 0 photosynthesis');
    });
    // TC-43-08: Baseline Regression Preservation
    it('TC-43-08: should ensure core engine bootstrapMegaPod remains intact and functioning', () => {
        const { sun, earth } = bootstrapMegaPod();
        assert.ok(sun, 'Sun monad must exist');
        assert.ok(earth, 'Earth monad must exist');
        assert.strictEqual(earth.name, 'Earth');
        assert.strictEqual(earth.biomes.length, 5);
        const tickReport = earth.tick(1);
        assert.ok(tickReport.imported > 0);
        assert.ok(tickReport.exported > 0);
    });
});
