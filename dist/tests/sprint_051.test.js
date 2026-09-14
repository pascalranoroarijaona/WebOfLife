import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createH3CellInterfaceMetrics, createReciprocalInterfaceMetrics, computeInterfaceFlux, } from '../src/spatial/h3_types.js';
describe('Sprint 051: H3CellInterfaceMetrics Specification & Validation', () => {
    const originId = '872830828ffffff';
    const neighborId = '872830829ffffff';
    const sampleMetrics = createH3CellInterfaceMetrics({
        originIndex: originId,
        neighborIndex: neighborId,
        sharedEdgeLengthMeters: 461.2,
        centroidDistanceMeters: 798.5,
        bearingRadians: 1.047197551, // ~60 degrees (East-North-East)
        normalVector: [0.866025, 0.5, 0.0],
        atmosphericContactAreaM2: 46120.0, // 461.2m * 100m layer
        subterraneanContactAreaM2: 922.4, // 461.2m * 2m soil
        topographicSlope: 0.025, // 2.5% incline towards neighbor
    });
    it('INV-051-A: satisfies reciprocity of shared boundary length', () => {
        const reciprocal = createReciprocalInterfaceMetrics(sampleMetrics);
        assert.strictEqual(sampleMetrics.sharedEdgeLengthMeters, reciprocal.sharedEdgeLengthMeters);
        assert.strictEqual(reciprocal.originIndex, neighborId);
        assert.strictEqual(reciprocal.neighborIndex, originId);
    });
    it('INV-051-B: satisfies reciprocity of centroid distance', () => {
        const reciprocal = createReciprocalInterfaceMetrics(sampleMetrics);
        assert.strictEqual(sampleMetrics.centroidDistanceMeters, reciprocal.centroidDistanceMeters);
    });
    it('INV-051-C: satisfies normal vector inversion across reciprocal interface', () => {
        const reciprocal = createReciprocalInterfaceMetrics(sampleMetrics);
        for (let k = 0; k < 3; k++) {
            assert.strictEqual(sampleMetrics.normalVector[k], -reciprocal.normalVector[k]);
        }
    });
    it('INV-051-D: satisfies topographic slope antisymmetry', () => {
        const reciprocal = createReciprocalInterfaceMetrics(sampleMetrics);
        assert.strictEqual(sampleMetrics.topographicSlope, -reciprocal.topographicSlope);
    });
    it('INV-051-E: guarantees positivity of physical scale metrics', () => {
        assert.ok(sampleMetrics.sharedEdgeLengthMeters > 0);
        assert.ok(sampleMetrics.centroidDistanceMeters > 0);
        assert.ok(sampleMetrics.geometricConductance > 0);
        const expectedConductance = sampleMetrics.sharedEdgeLengthMeters / sampleMetrics.centroidDistanceMeters;
        assert.ok(Math.abs(sampleMetrics.geometricConductance - expectedConductance) < 1e-12);
    });
    it('rejects illegal self-interface instantiation and invalid dimensions', () => {
        assert.throws(() => {
            createH3CellInterfaceMetrics({
                originIndex: originId,
                neighborIndex: originId,
                sharedEdgeLengthMeters: 500,
                centroidDistanceMeters: 800,
                bearingRadians: 0,
                normalVector: [1, 0, 0],
                atmosphericContactAreaM2: 1000,
                subterraneanContactAreaM2: 200,
                topographicSlope: 0,
            });
        }, /Self-interface is invalid/);
        assert.throws(() => {
            createH3CellInterfaceMetrics({
                originIndex: originId,
                neighborIndex: neighborId,
                sharedEdgeLengthMeters: -10,
                centroidDistanceMeters: 800,
                bearingRadians: 0,
                normalVector: [1, 0, 0],
                atmosphericContactAreaM2: 1000,
                subterraneanContactAreaM2: 200,
                topographicSlope: 0,
            });
        }, /sharedEdgeLengthMeters must be strictly positive/);
    });
    it('INV-METRIC-FLUX: verifies First Law mass and enthalpy conservation across reciprocal pairs', () => {
        const reciprocalMetrics = createReciprocalInterfaceMetrics(sampleMetrics);
        const stateA = {
            waterMassKg: 100_000,
            carbonMassKg: 500,
            mineralMassKg: 150,
            dissolvedOxygenKg: 8,
            enthalpyJoules: 1e9,
            elevationMeters: 120.0,
            temperatureKelvin: 295.15,
            soilDepthMeters: 2.0,
        };
        const stateB = {
            waterMassKg: 80_000,
            carbonMassKg: 400,
            mineralMassKg: 120,
            dissolvedOxygenKg: 6,
            enthalpyJoules: 9.8e8,
            elevationMeters: 100.0,
            temperatureKelvin: 288.15,
            soilDepthMeters: 2.0,
        };
        const params = {
            kSatPorous: 1e-4, // m/s
            manningN: 0.035,
            eddyDiffusivityHeat: 15.0, // W/(m*K)
        };
        const dt = 60.0; // 60 seconds
        const fluxAToB = computeInterfaceFlux(stateA, stateB, sampleMetrics, dt, params);
        const fluxBToA = computeInterfaceFlux(stateB, stateA, reciprocalMetrics, dt, params);
        // First Law exact antisymmetry: Flux(A -> B) + Flux(B -> A) === 0
        assert.ok(Math.abs(fluxAToB.deltaWaterKg + fluxBToA.deltaWaterKg) < 1e-9, `Water conservation error: ${fluxAToB.deltaWaterKg + fluxBToA.deltaWaterKg}`);
        assert.ok(Math.abs(fluxAToB.deltaEnthalpyJoules + fluxBToA.deltaEnthalpyJoules) < 1e-9, `Enthalpy conservation error: ${fluxAToB.deltaEnthalpyJoules + fluxBToA.deltaEnthalpyJoules}`);
        assert.ok(Math.abs(fluxAToB.deltaCarbonKg + fluxBToA.deltaCarbonKg) < 1e-9, `Carbon conservation error: ${fluxAToB.deltaCarbonKg + fluxBToA.deltaCarbonKg}`);
        assert.ok(Math.abs(fluxAToB.deltaMineralKg + fluxBToA.deltaMineralKg) < 1e-9, `Mineral conservation error: ${fluxAToB.deltaMineralKg + fluxBToA.deltaMineralKg}`);
    });
    it('INV-METRIC-ENTROPY: guarantees non-negative entropy generation for thermal diffusion', () => {
        const reciprocalMetrics = createReciprocalInterfaceMetrics(sampleMetrics);
        const stateWarm = {
            waterMassKg: 50_000,
            carbonMassKg: 200,
            mineralMassKg: 50,
            dissolvedOxygenKg: 4,
            enthalpyJoules: 5e8,
            elevationMeters: 100.0,
            temperatureKelvin: 310.15, // Hot
            soilDepthMeters: 2.0,
        };
        const stateCold = {
            waterMassKg: 50_000,
            carbonMassKg: 200,
            mineralMassKg: 50,
            dissolvedOxygenKg: 4,
            enthalpyJoules: 4.5e8,
            elevationMeters: 100.0,
            temperatureKelvin: 280.15, // Cold
            soilDepthMeters: 2.0,
        };
        const params = {
            kSatPorous: 1e-4,
            manningN: 0.035,
            eddyDiffusivityHeat: 25.0,
        };
        const fluxWarmToCold = computeInterfaceFlux(stateWarm, stateCold, sampleMetrics, 1.0, params);
        const fluxColdToWarm = computeInterfaceFlux(stateCold, stateWarm, reciprocalMetrics, 1.0, params);
        assert.ok(fluxWarmToCold.entropyProducedJPerK >= 0, `Warm->Cold entropy generation must be positive: ${fluxWarmToCold.entropyProducedJPerK}`);
        assert.ok(fluxColdToWarm.entropyProducedJPerK >= 0, `Cold->Warm entropy generation must be positive: ${fluxColdToWarm.entropyProducedJPerK}`);
        // Both frames compute identical positive physical entropy generation
        assert.ok(Math.abs(fluxWarmToCold.entropyProducedJPerK - fluxColdToWarm.entropyProducedJPerK) < 1e-9);
    });
});
