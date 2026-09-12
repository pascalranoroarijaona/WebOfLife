import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StateVector, ThermodynamicStateVector } from '../src/thermodynamics/state_vector';
import { StateValidator, withEntropyCheck, EntropyMonad } from '../src/thermodynamics/state_validator';

describe('Sprint 049: Thermodynamic State Vector Non-Negative Entropy Monad Pipe', () => {
  it('should approve spontaneous thermal dissipation (positive universe entropy change)', () => {
    const initialState: StateVector = new ThermodynamicStateVector({
      internalEnergy: 1000,
      entropy: 100,
      temperature: 300,
      mass: 10,
      solarInput: 0,
      dissipatedHeat: 0
    });

    const result = withEntropyCheck(initialState, (s) => new ThermodynamicStateVector({
      ...s,
      internalEnergy: s.internalEnergy - 100,
      entropy: s.entropy + 2.0, // System entropy increases
      dissipatedHeat: 100
    }));

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.entropyChange, 2.0);
    assert.ok(result.universeEntropyChange >= 0);
  });

  it('should approve solar-driven biosynthesis (local entropy reduction balanced by solar flux)', () => {
    const initialState: StateVector = new ThermodynamicStateVector({
      internalEnergy: 5000,
      entropy: 500,
      temperature: 298.15,
      mass: 50,
      solarInput: 0,
      dissipatedHeat: 0
    });

    const result = withEntropyCheck(initialState, (s) => new ThermodynamicStateVector({
      ...s,
      internalEnergy: s.internalEnergy + 1000,
      entropy: s.entropy - 1.0, // Local ordering / entropy reduction
      solarInput: 2000,
      dissipatedHeat: 500
    }));

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.entropyChange, -1.0);
    assert.ok(result.universeEntropyChange >= 0);
  });

  it('should reject perpetual motion / negative entropy generation without work or heat compensation', () => {
    const initialState: StateVector = new ThermodynamicStateVector({
      internalEnergy: 1000,
      entropy: 100,
      temperature: 298.15,
      mass: 10,
      solarInput: 0,
      dissipatedHeat: 0
    });

    const result = withEntropyCheck(initialState, (s) => new ThermodynamicStateVector({
      ...s,
      entropy: s.entropy - 5.0 // Impossible spontaneous reduction in entropy with zero compensation
    }));

    assert.strictEqual(result.success, false);
    assert.ok(result.error !== undefined);
    assert.deepStrictEqual(result.value, initialState); // Fallback to prior valid state
  });

  it('should support fluent chaining via EntropyMonad', () => {
    const initialState: StateVector = new ThermodynamicStateVector({
      internalEnergy: 2000,
      entropy: 200,
      temperature: 298.15,
      mass: 20,
      solarInput: 100,
      dissipatedHeat: 50
    });

    const monad = new EntropyMonad(initialState);
    const finalMonad = monad.bind((s) => new ThermodynamicStateVector({
      ...s,
      entropy: s.entropy + 1.0,
      dissipatedHeat: (s.dissipatedHeat ?? 0) + 100
    }));

    assert.strictEqual(finalMonad.getState().entropy, 201);
  });
});