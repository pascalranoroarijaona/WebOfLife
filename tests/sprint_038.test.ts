import { describe, it } from 'node:test';
import assert from 'node:assert';
import { assertNonNegativeEntropy } from '../src/thermodynamics/state_validator.js';
import { Result } from '../src/thermodynamics/types.js';

describe('Sprint 038: Thermodynamic State Vector Non-Negative Entropy Assertion Utility', () => {
  it('should return success for valid positive entropy', () => {
    const state = { energy: 1000, entropy: 10.5 };
    const result: Result<boolean, string> = assertNonNegativeEntropy(state) as any;
    assert.strictEqual(result.isOk(), true);
    if (result.isOk() && 'value' in result) {
      assert.ok(result.value);
    }
  });

  it('should return success for boundary zero entropy', () => {
    const state = { energy: 500, entropy: 0 };
    const result = assertNonNegativeEntropy(state) as any;
    assert.strictEqual(result.isOk(), true);
    if (result.isOk() && 'value' in result) {
      assert.ok(result.value);
    }
  });

  it('should return failure for negative entropy', () => {
    const state = { energy: 100, entropy: -1.2 };
    const result = assertNonNegativeEntropy(state) as any;
    assert.strictEqual(result.isErr(), true);
    if (result.isErr()) {
      const err = result.errorValue ?? result.error;
      const errMsg = typeof err === 'string' ? err : err?.message ?? '';
      assert.match(errMsg, /Negative entropy detected/);
    }
  });

  it('should return failure for non-numeric or missing entropy attributes', () => {
    const state1 = { energy: 100, entropy: NaN };
    const result1 = assertNonNegativeEntropy(state1) as any;
    assert.strictEqual(result1.isErr(), true);
    if (result1.isErr()) {
      const err = result1.errorValue ?? result1.error;
      const errMsg = typeof err === 'string' ? err : err?.message ?? '';
      assert.match(errMsg, /Invalid entropy value/);
    }

    const state2 = { energy: 100, entropy: 'ten' as any };
    const result2 = assertNonNegativeEntropy(state2) as any;
    assert.strictEqual(result2.isErr(), true);
    if (result2.isErr()) {
      const err = result2.errorValue ?? result2.error;
      const errMsg = typeof err === 'string' ? err : err?.message ?? '';
      assert.match(errMsg, /Invalid entropy value/);
    }
  });
});