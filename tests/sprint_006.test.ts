import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3Validator, H3Error, H3ErrorCode } from '../src/spatial/h3_grid.js';
import { H3ValidationMonad } from '../src/monads/spatial_monad.js';

describe('Sprint 006: Uber H3 Index String Format Validation & Error Code Mapping', () => {
  const validator = new H3Validator();

  it('should validate correct 15-character hex H3 index strings', () => {
    const validIndex = '85283473fffffff';
    assert.strictEqual(validator.validate(validIndex), true);
    assert.doesNotThrow(() => {
      const valArg: string = validIndex;
      const v: H3Validator = validator;
      v.assertValid(valArg);
    });
  });

  it('should reject non-hex characters with INVALID_CHARACTER', () => {
    const invalidCharIndex = '85283473fffffzZ';
    assert.strictEqual(validator.validate(invalidCharIndex), false);
    assert.throws(() => {
      const valArg: string = invalidCharIndex;
      const v: H3Validator = validator;
      v.assertValid(valArg);
    }, (err: any) => {
      assert(err instanceof H3Error);
      assert.strictEqual((err as H3Error).code, H3ErrorCode.INVALID_CHARACTER);
      return true;
    });
  });

  it('should reject invalid lengths with INVALID_LENGTH', () => {
    const shortIndex = '85283473fff';
    const longIndex = '85283473ffffffffffff';
    
    assert.throws(() => {
      const valArg: string = shortIndex;
      const v: H3Validator = validator;
      v.assertValid(valArg);
    }, (err: any) => {
      const h3Err = err as H3Error;
      assert.strictEqual(h3Err.code, H3ErrorCode.INVALID_LENGTH);
      return true;
    });

    assert.throws(() => {
      const valArg: string = longIndex;
      const v: H3Validator = validator;
      v.assertValid(valArg);
    }, (err: any) => {
      const h3Err = err as H3Error;
      assert.strictEqual(h3Err.code, H3ErrorCode.INVALID_LENGTH);
      return true;
    });
  });

  it('should reject null index (all zeros) with NULL_INDEX', () => {
    const nullIndex = '000000000000000';
    assert.throws(() => {
      const valArg: string = nullIndex;
      const v: H3Validator = validator;
      v.assertValid(valArg);
    }, (err: any) => {
      const h3Err = err as H3Error;
      assert.strictEqual(h3Err.code, H3ErrorCode.NULL_INDEX);
      return true;
    });
  });

  it('should validate H3ValidationMonad successfully on correct state transitions', () => {
    const initialState = {
      h3Index: '85283473fffffff',
      matter: { carbon: 100 },
      energy: { solar: 500 }
    };

    const monad = H3ValidationMonad.unit(initialState, validator);
    const nextMonad = monad.bind((state: { h3Index: string; matter: { carbon: number }; energy: { solar: number } }) => ({
      ...state,
      matter: { carbon: state.matter.carbon + 10 }
    }));

    const result = nextMonad.match<number | H3ErrorCode>(
      (s: { h3Index: string; matter: { carbon: number }; energy: { solar: number } }) => s.matter.carbon,
      (err: { code: H3ErrorCode; message: string }) => err.code
    );

    assert.strictEqual(result, 110);
  });

  it('should halt monad branch on invalid target H3 index and preserve error code', () => {
    const initialState = {
      h3Index: '85283473fffffff',
      matter: { carbon: 100 },
      energy: { solar: 500 }
    };

    const monad = H3ValidationMonad.unit(initialState, validator);
    const failedMonad = monad.bind((state: { h3Index: string; matter: { carbon: number }; energy: { solar: number } }) => ({
      ...state,
      h3Index: 'INVALID_INDEX_STR'
    }));

    const errorCode: H3ErrorCode = failedMonad.match<H3ErrorCode>(
      () => H3ErrorCode.SUCCESS,
      (err: { code: H3ErrorCode; message: string }) => err.code
    );

    assert.strictEqual(errorCode, H3ErrorCode.INVALID_CHARACTER);
  });
});