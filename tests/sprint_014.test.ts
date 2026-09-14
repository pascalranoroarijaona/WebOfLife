import { describe, it } from 'node:test';
import assert from 'node:assert';
import { guardH3Payload, validateH3Index, H3Grid } from '../src/spatial/h3_grid.js';
import { SpatialMonad } from '../src/monads/spatial_monad.js';

describe('Sprint 014: Null-Check Guard Clauses for H3 Payloads', () => {
  it('should accept valid H3 strings in guardH3Payload', () => {
    const validPayload = '8928308280fffff';
    assert.doesNotThrow(() => {
      guardH3Payload(validPayload);
    });
  });

  it('should throw TypeError on null or undefined payloads', () => {
    assert.throws(() => {
      guardH3Payload(null);
    }, TypeError);

    assert.throws(() => {
      guardH3Payload(undefined);
    }, TypeError);
  });

  it('should throw TypeError on non-string payloads', () => {
    assert.throws(() => {
      guardH3Payload(12345);
    }, TypeError);

    assert.throws(() => {
      guardH3Payload({});
    }, TypeError);
  });

  it('should throw TypeError on empty or whitespace strings', () => {
    assert.throws(() => {
      guardH3Payload('');
    }, TypeError);

    assert.throws(() => {
      guardH3Payload('   ');
    }, TypeError);
  });

  it('should validate H3 index correctly with validateH3Index', () => {
    const resValid = validateH3Index('8928308280fffff');
    assert.strictEqual(resValid.isValid, true);

    const resInvalidNull = validateH3Index(null);
    assert.strictEqual(resInvalidNull.isValid, false);

    const resInvalidFormat = validateH3Index('not-an-h3');
    assert.strictEqual(resInvalidFormat.isValid, false);
  });

  it('should integrate with SpatialMonad safely', () => {
    const monad = SpatialMonad.fromPayload('8928308280fffff');
    assert.deepStrictEqual(monad.getStock(), {
      carbon: 0,
      water: 0,
      minerals: 0,
      oxygen: 0,
      energy: 0,
      carbonMass: 0,
      waterMass: 0,
      biomass: 0
    });

    assert.throws(() => {
      SpatialMonad.fromPayload(null as any);
    }, TypeError);
  });

  it('should protect H3Grid methods with guard clause', () => {
    assert.throws(() => {
      H3Grid.cellToBoundary(null as any);
    }, TypeError);

    assert.throws(() => {
      H3Grid.getResolution(undefined as any);
    }, TypeError);
  });
});