import { describe, it } from 'node:test';
import assert from 'node:assert';
import { withEntropyCheck } from '../src/thermodynamics/state_validator.js';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector.js';
describe('Sprint 050: Thermodynamic State Vector Non-Negative Entropy Monad Pipe', () => {
    it('should allow spontaneous state transitions where deltaS >= 0', () => {
        const initialVector = new ThermodynamicStateVector({
            internalEnergy: 1000,
            entropy: 100,
            temperature: 300,
            timestamp: 1
        });
        const transformFn = (s) => {
            return s.clone({ entropy: 110, internalEnergy: 1050 });
        };
        const result = withEntropyCheck(initialVector, transformFn);
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.deltaEntropy, 10);
        assert.strictEqual(result.state.getEntropy(), 110);
    });
    it('should allow endothermic / phototrophic transitions where local deltaS < 0 is compensated by solar flux', () => {
        const initialVector = new ThermodynamicStateVector({
            internalEnergy: 1000,
            entropy: 100,
            temperature: 300,
            timestamp: 1
        });
        const transformFn = (s) => {
            const next = s.clone({ entropy: 80, internalEnergy: 1200 });
            // Attach solar flux property for compensation verification
            next.getSolarFlux = () => 50;
            return next;
        };
        const result = withEntropyCheck(initialVector, transformFn);
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.deltaEntropy, -20);
        assert.strictEqual(result.state.getEntropy(), 80);
    });
    it('should reject and rollback unphysical reductions where deltaS < 0 exceeds solar flux', () => {
        const initialVector = new ThermodynamicStateVector({
            internalEnergy: 1000,
            entropy: 100,
            temperature: 300,
            timestamp: 1
        });
        const transformFn = (s) => {
            const next = s.clone({ entropy: 50, internalEnergy: 1010 });
            // Inadequate solar flux to compensate for -50 entropy drop
            next.getSolarFlux = () => 10;
            return next;
        };
        const result = withEntropyCheck(initialVector, transformFn);
        assert.strictEqual(result.valid, false);
        assert.strictEqual(result.deltaEntropy, -50);
        // Should rollback to initialState
        assert.strictEqual(result.state.getEntropy(), 100);
        assert.match(result.reason ?? '', /Second Law Violation/);
    });
});
