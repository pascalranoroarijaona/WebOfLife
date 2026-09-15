import { describe, it } from 'node:test';
import assert from 'node:assert';
import { hasZeroApertureSequence, isValidH3DirectionDigit, evaluateApertureThermodynamics, H3Adjacency, H3_DIRECTION_ANGLES_RAD, } from '../src/spatial/h3_adjacency.js';
describe('Sprint 088 - RFC-088: Discrete Global Grid Directional Aperture Purity Analysis', () => {
    describe('1. Uniform Zero Sequences', () => {
        it('should return true for single center child [0]', () => {
            assert.strictEqual(hasZeroApertureSequence([0]), true);
        });
        it('should return true for double center child [0, 0]', () => {
            assert.strictEqual(hasZeroApertureSequence([0, 0]), true);
        });
        it('should return true for deep multi-resolution central descent [0, 0, 0, 0, 0]', () => {
            assert.strictEqual(hasZeroApertureSequence([0, 0, 0, 0, 0]), true);
        });
        it('should return true for an array of 20 zero-aperture descent steps', () => {
            const longSequence = new Array(20).fill(0);
            assert.strictEqual(hasZeroApertureSequence(longSequence), true);
        });
    });
    describe('2. Empty Sequence Vacuous Truth', () => {
        it('should return true for empty sequence []', () => {
            assert.strictEqual(hasZeroApertureSequence([]), true);
        });
    });
    describe('3. Single Deviation Sequences', () => {
        it('should return false for single peripheral child [1]', () => {
            assert.strictEqual(hasZeroApertureSequence([1]), false);
        });
        it('should return false for deviation in middle [0, 0, 1, 0]', () => {
            assert.strictEqual(hasZeroApertureSequence([0, 0, 1, 0]), false);
        });
        it('should return false for deviation at leading index [6, 0, 0]', () => {
            assert.strictEqual(hasZeroApertureSequence([6, 0, 0]), false);
        });
        it('should return false for deviation at trailing index [0, 0, 0, 3]', () => {
            assert.strictEqual(hasZeroApertureSequence([0, 0, 0, 3]), false);
        });
    });
    describe('4. All Non-Zero Sequences', () => {
        it('should return false for full peripheral sequence [1, 2, 3, 4, 5, 6]', () => {
            assert.strictEqual(hasZeroApertureSequence([1, 2, 3, 4, 5, 6]), false);
        });
        it('should return false for non-zero repetitions [2, 2, 2]', () => {
            assert.strictEqual(hasZeroApertureSequence([2, 2, 2]), false);
        });
    });
    describe('5. Out-of-Bounds and Non-Integer Values', () => {
        it('should return false for negative numbers [-1, 0]', () => {
            assert.strictEqual(hasZeroApertureSequence([-1, 0]), false);
        });
        it('should return false for values greater than 6 [7, 0]', () => {
            assert.strictEqual(hasZeroApertureSequence([7, 0]), false);
        });
        it('should return false for fractional numbers [0.5]', () => {
            assert.strictEqual(hasZeroApertureSequence([0.5]), false);
        });
        it('should return false for NaN [NaN]', () => {
            assert.strictEqual(hasZeroApertureSequence([NaN]), false);
        });
        it('should return false for Infinity and -Infinity', () => {
            assert.strictEqual(hasZeroApertureSequence([Infinity]), false);
            assert.strictEqual(hasZeroApertureSequence([-Infinity]), false);
        });
    });
    describe('6. Integration with H3Adjacency Class', () => {
        const adjacency = new H3Adjacency();
        it('should match functional predicate via static delegation', () => {
            assert.strictEqual(H3Adjacency.hasZeroApertureSequence([0, 0, 0]), true);
            assert.strictEqual(H3Adjacency.hasZeroApertureSequence([0, 4, 0]), false);
            assert.strictEqual(H3Adjacency.hasZeroApertureSequence([]), true);
        });
        it('should match functional predicate via instance method', () => {
            assert.strictEqual(adjacency.hasZeroApertureSequence([0, 0]), true);
            assert.strictEqual(adjacency.hasZeroApertureSequence([1, 0]), false);
        });
        it('should evaluate isConcentricDescent identically to hasZeroApertureSequence', () => {
            assert.strictEqual(adjacency.isConcentricDescent([0, 0, 0]), true);
            assert.strictEqual(adjacency.isConcentricDescent([0, 5]), false);
            assert.strictEqual(adjacency.isConcentricDescent([]), true);
        });
        it('should compute direction offsets correctly', () => {
            const centerOffset = adjacency.getDirectionOffset(0, 100);
            assert.strictEqual(centerOffset.dx, 0.0);
            assert.strictEqual(centerOffset.dy, 0.0);
            const rad1Offset = adjacency.getDirectionOffset(1, 100);
            const expectedDist = Math.sqrt(3.0) * 100;
            assert.strictEqual(rad1Offset.dx, expectedDist);
            assert.strictEqual(rad1Offset.dy, 0.0);
        });
    });
    describe('7. Direction Digit Validation & Constant Angles', () => {
        it('should validate digits 0 through 6 correctly', () => {
            for (let d = 0; d <= 6; d++) {
                assert.strictEqual(isValidH3DirectionDigit(d), true);
            }
            assert.strictEqual(isValidH3DirectionDigit(-1), false);
            assert.strictEqual(isValidH3DirectionDigit(7), false);
            assert.strictEqual(isValidH3DirectionDigit(1.5), false);
            assert.strictEqual(isValidH3DirectionDigit(NaN), false);
        });
        it('should contain correct precomputed directional angles', () => {
            assert.strictEqual(H3_DIRECTION_ANGLES_RAD.length, 7);
            assert.strictEqual(H3_DIRECTION_ANGLES_RAD[0], 0.0);
            assert.strictEqual(H3_DIRECTION_ANGLES_RAD[1], 0.0);
            assert.strictEqual(H3_DIRECTION_ANGLES_RAD[4], Math.PI);
        });
    });
    describe('8. Thermodynamic Invariants & Multi-Resolution Spatial Flux', () => {
        const baseState = {
            carbonKg: 500.0,
            waterKg: 2000.0,
            mineralsKg: 300.0,
            oxygenKg: 100.0,
            thermalEnergyJoules: 1.5e8,
            temperatureKelvin: 288.15,
        };
        it('should yield zero lateral displacement, zero thermal delta, and zero entropy for pure zero-aperture descent', () => {
            const concentricPath = [0, 0, 0];
            const delta = evaluateApertureThermodynamics(baseState, concentricPath, 1000.0);
            assert.strictEqual(delta.isConcentric, true);
            assert.strictEqual(delta.displacementNormMeters, 0.0);
            assert.strictEqual(delta.deltaThermalEnergyJoules, 0.0);
            assert.strictEqual(delta.entropyGeneratedJoulesPerKelvin, 0.0);
            assert.strictEqual(delta.deltaCarbonKg, 0.0);
            assert.strictEqual(delta.deltaWaterKg, 0.0);
            assert.strictEqual(delta.deltaMineralsKg, 0.0);
            assert.strictEqual(delta.deltaOxygenKg, 0.0);
        });
        it('should yield non-zero displacement, positive frictional work, and positive entropy generation for eccentric paths', () => {
            const eccentricPath = [1, 2];
            const delta = evaluateApertureThermodynamics(baseState, eccentricPath, 1000.0, 0.05, 1.0);
            assert.strictEqual(delta.isConcentric, false);
            assert.ok(delta.displacementNormMeters > 0.0, 'Displacement norm must be positive');
            assert.ok(delta.deltaThermalEnergyJoules > 0.0, 'Thermal dissipation energy must be positive');
            assert.ok(delta.entropyGeneratedJoulesPerKelvin > 0.0, 'Entropy generation must be strictly positive (Second Law)');
            // Mass conservation check
            assert.strictEqual(delta.deltaCarbonKg, 0.0);
            assert.strictEqual(delta.deltaWaterKg, 0.0);
            assert.strictEqual(delta.deltaMineralsKg, 0.0);
            assert.strictEqual(delta.deltaOxygenKg, 0.0);
        });
        it('should execute evaluateApertureThermodynamics through H3Adjacency instance', () => {
            const adjacency = new H3Adjacency();
            const concentricDelta = adjacency.evaluateApertureThermodynamics(baseState, [0, 0], 500.0);
            assert.strictEqual(concentricDelta.isConcentric, true);
            assert.strictEqual(concentricDelta.displacementNormMeters, 0.0);
            const eccentricDelta = adjacency.evaluateApertureThermodynamics(baseState, [3], 500.0);
            assert.strictEqual(eccentricDelta.isConcentric, false);
            assert.ok(eccentricDelta.displacementNormMeters > 0.0);
        });
    });
});
