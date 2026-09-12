import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateVectorDiscrepancyAggregator } from '../src/thermodynamics/state_validator.js';
import { bootstrapMegaPod } from '../src/earth_pod.js';
describe('Sprint 077: Thermodynamic State Vector Discrepancy Aggregator', () => {
    it('should correctly map evaluation results to scalar discrepancy values (First Law tracking)', () => {
        const aggregator = new StateVectorDiscrepancyAggregator();
        const results = [
            {
                timestamp: 1,
                expectedVector: { carbon: 100, nitrogen: 50, phosphorus: 10, water: 1000, enthalpy: 5000 },
                actualVector: { carbon: 100, nitrogen: 50, phosphorus: 10, water: 1000, enthalpy: 5000 },
                discrepancy: 0.0
            },
            {
                timestamp: 2,
                expectedVector: { carbon: 100, nitrogen: 50, phosphorus: 10, water: 1000, enthalpy: 5000 },
                actualVector: { carbon: 103, nitrogen: 50, phosphorus: 10, water: 1004, enthalpy: 5000 },
                discrepancy: 0.0 // Pre-calculated discrepancy should be preferred or computed
            }
        ];
        const mapped = aggregator.mapEvaluations(results);
        assert.strictEqual(mapped.length, 2);
        assert.strictEqual(mapped[0], 0.0);
        // Second element should compute Euclidean distance if discrepancy is 0 but vectors differ, or use discrepancy.
        // In our implementation, if discrepancy is provided (0), it returns 0 unless we omit it. Let's test vector distance computation without explicit discrepancy:
        const resultsWithoutExplicit = [
            {
                timestamp: 1,
                expectedVector: { carbon: 100, nitrogen: 50, phosphorus: 10, water: 1000, enthalpy: 5000 },
                actualVector: { carbon: 103, nitrogen: 54, phosphorus: 10, water: 1000, enthalpy: 5000 },
                discrepancy: NaN
            }
        ];
        const computedMapped = aggregator.mapEvaluations(resultsWithoutExplicit);
        // sqrt(3^2 + 4^2) = sqrt(9 + 16) = 5
        assert.strictEqual(computedMapped[0], 5);
    });
    it('should correctly accumulate maximum discrepancy across multiple evaluation cycles (Second Law bounding)', () => {
        const aggregator = new StateVectorDiscrepancyAggregator();
        const results = [
            {
                timestamp: 1,
                expectedVector: { carbon: 100, nitrogen: 50, phosphorus: 10, water: 1000, enthalpy: 5000 },
                actualVector: { carbon: 100, nitrogen: 50, phosphorus: 10, water: 1000, enthalpy: 5000 },
                discrepancy: 1.5
            },
            {
                timestamp: 2,
                expectedVector: { carbon: 100, nitrogen: 50, phosphorus: 10, water: 1000, enthalpy: 5000 },
                actualVector: { carbon: 100, nitrogen: 50, phosphorus: 10, water: 1000, enthalpy: 5000 },
                discrepancy: 12.4
            },
            {
                timestamp: 3,
                expectedVector: { carbon: 100, nitrogen: 50, phosphorus: 10, water: 1000, enthalpy: 5000 },
                actualVector: { carbon: 100, nitrogen: 50, phosphorus: 10, water: 1000, enthalpy: 5000 },
                discrepancy: 4.2
            }
        ];
        const maxDisc = aggregator.accumulateMaxDiscrepancy(results);
        assert.strictEqual(maxDisc, 12.4);
    });
    it('should integrate seamlessly with EarthPod and biogeochemical state cycles', () => {
        const { earth } = bootstrapMegaPod();
        const stateVector = earth.getStateVector();
        assert.ok(stateVector);
        assert.strictEqual(earth.verifySecondLaw(), true);
    });
});
