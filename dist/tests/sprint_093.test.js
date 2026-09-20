import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ApertureClass } from '../src/spatial/h3_types.js';
import { getApertureClass, getApertureRotationSequence, getApertureRotationDescriptor, H3AdjacencyService, H3_APERTURE_ROTATION_ANGLE_RAD, H3_APERTURE_ROTATION_ANGLE_DEG, MIN_H3_RESOLUTION, MAX_H3_RESOLUTION } from '../src/spatial/h3_adjacency.js';
import { SpatialFluxMonad } from '../src/spatial/spatial_flux_monad.js';
describe('Sprint 093 - Aperture Rotation Sequence Resolution', () => {
    describe('Mathematical Parity & Single Resolution Evaluator', () => {
        it('should correctly classify even resolutions as CLASS_II and odd as CLASS_III', () => {
            assert.strictEqual(getApertureClass(0), ApertureClass.CLASS_II);
            assert.strictEqual(getApertureClass(1), ApertureClass.CLASS_III);
            assert.strictEqual(getApertureClass(2), ApertureClass.CLASS_II);
            assert.strictEqual(getApertureClass(3), ApertureClass.CLASS_III);
            assert.strictEqual(getApertureClass(4), ApertureClass.CLASS_II);
            assert.strictEqual(getApertureClass(5), ApertureClass.CLASS_III);
            assert.strictEqual(getApertureClass(14), ApertureClass.CLASS_II);
            assert.strictEqual(getApertureClass(15), ApertureClass.CLASS_III);
        });
        it('should check isClassII and isClassIII via H3AdjacencyService static and instance methods', () => {
            const service = new H3AdjacencyService();
            assert.strictEqual(H3AdjacencyService.isClassII(0), true);
            assert.strictEqual(H3AdjacencyService.isClassIII(0), false);
            assert.strictEqual(H3AdjacencyService.isClassII(1), false);
            assert.strictEqual(H3AdjacencyService.isClassIII(1), true);
            assert.strictEqual(service.isClassII(6), true);
            assert.strictEqual(service.isClassIII(6), false);
            assert.strictEqual(service.isClassII(7), false);
            assert.strictEqual(service.isClassIII(7), true);
            assert.strictEqual(service.getApertureClass(2), ApertureClass.CLASS_II);
        });
    });
    describe('getApertureRotationSequence Verification', () => {
        it('should return sequence of length targetResolution + 1 for all valid resolutions 0..15', () => {
            for (let r = MIN_H3_RESOLUTION; r <= MAX_H3_RESOLUTION; r++) {
                const seq = getApertureRotationSequence(r);
                assert.strictEqual(seq.length, r + 1, `Length mismatch at resolution ${r}`);
                assert.strictEqual(seq[0], ApertureClass.CLASS_II, `Base resolution 0 must always be CLASS_II`);
                assert.strictEqual(seq[r], (r % 2 === 0) ? ApertureClass.CLASS_II : ApertureClass.CLASS_III);
            }
        });
        it('should match exact test vectors for target resolutions 0, 1, 2, 7', () => {
            assert.deepStrictEqual(getApertureRotationSequence(0), [
                ApertureClass.CLASS_II
            ]);
            assert.deepStrictEqual(getApertureRotationSequence(1), [
                ApertureClass.CLASS_II,
                ApertureClass.CLASS_III
            ]);
            assert.deepStrictEqual(getApertureRotationSequence(2), [
                ApertureClass.CLASS_II,
                ApertureClass.CLASS_III,
                ApertureClass.CLASS_II
            ]);
            assert.deepStrictEqual(getApertureRotationSequence(7), [
                ApertureClass.CLASS_II,
                ApertureClass.CLASS_III,
                ApertureClass.CLASS_II,
                ApertureClass.CLASS_III,
                ApertureClass.CLASS_II,
                ApertureClass.CLASS_III,
                ApertureClass.CLASS_II,
                ApertureClass.CLASS_III
            ]);
        });
        it('should work through H3AdjacencyService.getApertureRotationSequence', () => {
            const service = new H3AdjacencyService();
            const seqStatic = H3AdjacencyService.getApertureRotationSequence(3);
            const seqInstance = service.getApertureRotationSequence(3);
            assert.deepStrictEqual(seqStatic, [
                ApertureClass.CLASS_II,
                ApertureClass.CLASS_III,
                ApertureClass.CLASS_II,
                ApertureClass.CLASS_III
            ]);
            assert.deepStrictEqual(seqInstance, seqStatic);
        });
        it('should provide immutable sequence descriptor via getApertureRotationDescriptor', () => {
            const desc = getApertureRotationDescriptor(2);
            assert.strictEqual(desc.targetResolution, 2);
            assert.deepStrictEqual(desc.sequence, [
                ApertureClass.CLASS_II,
                ApertureClass.CLASS_III,
                ApertureClass.CLASS_II
            ]);
            assert.ok(Object.isFrozen(desc.sequence));
        });
    });
    describe('Boundary & Error Conditions', () => {
        it('should throw RangeError for resolutions outside [0, 15]', () => {
            assert.throws(() => getApertureRotationSequence(-1), RangeError);
            assert.throws(() => getApertureRotationSequence(16), RangeError);
            assert.throws(() => getApertureRotationSequence(100), RangeError);
            assert.throws(() => getApertureClass(-1), RangeError);
            assert.throws(() => getApertureClass(16), RangeError);
        });
        it('should throw TypeError for non-integer resolutions', () => {
            assert.throws(() => getApertureRotationSequence(2.5), TypeError);
            assert.throws(() => getApertureRotationSequence(NaN), TypeError);
            assert.throws(() => getApertureRotationSequence(Infinity), TypeError);
            assert.throws(() => getApertureClass(2.5), TypeError);
            assert.throws(() => getApertureClass(NaN), TypeError);
        });
    });
    describe('SpatialFluxMonad & Coordinate Transformation', () => {
        it('should verify the mathematical aperture rotation angle constant', () => {
            const expectedRad = Math.asin(Math.sqrt(3) / (2 * Math.sqrt(7)));
            assert.ok(Math.abs(H3_APERTURE_ROTATION_ANGLE_RAD - expectedRad) < 1e-15);
            const expectedDeg = (expectedRad * 180) / Math.PI;
            assert.ok(Math.abs(H3_APERTURE_ROTATION_ANGLE_DEG - expectedDeg) < 1e-12);
        });
        it('should align flux vectors across res 0 -> 1 with exact norm preservation', () => {
            const monad0to1 = SpatialFluxMonad.create(0, 1);
            const inputFlux = { jX: 1.0, jY: 0.0 };
            const aligned = monad0to1.alignFluxVector(inputFlux);
            const expectedCos = 5 / (2 * Math.sqrt(7));
            const expectedSin = Math.sqrt(3) / (2 * Math.sqrt(7));
            assert.ok(Math.abs(aligned.jX - expectedCos) < 1e-12);
            assert.ok(Math.abs(aligned.jY - expectedSin) < 1e-12);
            const normSource = Math.hypot(inputFlux.jX, inputFlux.jY);
            const normTarget = Math.hypot(aligned.jX, aligned.jY);
            assert.ok(Math.abs(normSource - normTarget) < 1e-15);
        });
        it('should align flux vectors across res 1 -> 0 with negative rotation', () => {
            const monad1to0 = SpatialFluxMonad.create(1, 0);
            const inputFlux = { jX: 1.0, jY: 0.0 };
            const aligned = monad1to0.alignFluxVector(inputFlux);
            const expectedCos = 5 / (2 * Math.sqrt(7));
            const expectedSin = -Math.sqrt(3) / (2 * Math.sqrt(7));
            assert.ok(Math.abs(aligned.jX - expectedCos) < 1e-12);
            assert.ok(Math.abs(aligned.jY - expectedSin) < 1e-12);
        });
        it('should apply zero rotation when both resolutions share the same aperture parity (res 0 -> 2)', () => {
            const monad0to2 = SpatialFluxMonad.create(0, 2);
            const inputFlux = { jX: 3.5, jY: -4.2 };
            const aligned = monad0to2.alignFluxVector(inputFlux);
            assert.strictEqual(aligned.jX, 3.5);
            assert.strictEqual(aligned.jY, -4.2);
        });
        it('should guarantee 100% mass and enthalpy conservation across boundary stock transfers', () => {
            const monad = SpatialFluxMonad.create(0, 1);
            const sourceStocks = {
                carbonMol: 1000,
                waterMol: 5000,
                mineralsMol: 250,
                oxygenMol: 800,
                enthalpyJoules: 1e6
            };
            const targetStocks = {
                carbonMol: 200,
                waterMol: 1000,
                mineralsMol: 50,
                oxygenMol: 150,
                enthalpyJoules: 2e5
            };
            const transfer = {
                carbonMol: 50,
                waterMol: 200,
                mineralsMol: 15,
                oxygenMol: 40,
                enthalpyJoules: 5e4
            };
            const totalInitialCarbon = sourceStocks.carbonMol + targetStocks.carbonMol;
            const totalInitialWater = sourceStocks.waterMol + targetStocks.waterMol;
            const totalInitialMinerals = sourceStocks.mineralsMol + targetStocks.mineralsMol;
            const totalInitialOxygen = sourceStocks.oxygenMol + targetStocks.oxygenMol;
            const totalInitialEnthalpy = sourceStocks.enthalpyJoules + targetStocks.enthalpyJoules;
            const { nextSource, nextTarget } = monad.executeTransfer(sourceStocks, targetStocks, transfer);
            assert.strictEqual(nextSource.carbonMol + nextTarget.carbonMol, totalInitialCarbon);
            assert.strictEqual(nextSource.waterMol + nextTarget.waterMol, totalInitialWater);
            assert.strictEqual(nextSource.mineralsMol + nextTarget.mineralsMol, totalInitialMinerals);
            assert.strictEqual(nextSource.oxygenMol + nextTarget.oxygenMol, totalInitialOxygen);
            assert.strictEqual(nextSource.enthalpyJoules + nextTarget.enthalpyJoules, totalInitialEnthalpy);
        });
        it('should reject transfers exceeding source availability', () => {
            const monad = SpatialFluxMonad.create(0, 1);
            const sourceStocks = {
                carbonMol: 10,
                waterMol: 10,
                mineralsMol: 10,
                oxygenMol: 10,
                enthalpyJoules: 10
            };
            const targetStocks = {
                carbonMol: 0,
                waterMol: 0,
                mineralsMol: 0,
                oxygenMol: 0,
                enthalpyJoules: 0
            };
            const invalidTransfer = {
                carbonMol: 11, // exceeds source 10
                waterMol: 5,
                mineralsMol: 5,
                oxygenMol: 5,
                enthalpyJoules: 5
            };
            assert.throws(() => {
                monad.executeTransfer(sourceStocks, targetStocks, invalidTransfer);
            }, /Transfer amounts exceed available source stocks/);
        });
    });
});
