import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3SpatialMonad, guardH3Payload } from '../src/spatial/h3_grid.js';

describe('Sprint 012 - H3 String Payload Null-Check Guard Clauses', () => {
  const monad = new H3SpatialMonad();
  const validH3: string = '8928308280fffff';

  it('should successfully validate and bind valid H3 index strings', () => {
    assert.doesNotThrow((): void => {
      guardH3Payload(validH3);
    });

    const result: string = monad.bind(validH3, (idx: string): string => `processed_${idx}`);
    assert.strictEqual(result, `processed_${validH3}`);
  });

  it('should throw thermodynamic spatial errors on null or undefined payloads', () => {
    assert.throws((): void => {
      guardH3Payload(null);
    }, /\[Thermodynamic Spatial Error\]/);

    assert.throws((): void => {
      guardH3Payload(undefined);
    }, /\[Thermodynamic Spatial Error\]/);

    assert.throws((): void => {
      monad.bind(null, (idx: string): string => idx);
    }, /\[Thermodynamic Spatial Error\]/);
  });

  it('should throw thermodynamic spatial errors on empty or whitespace-only strings', () => {
    assert.throws((): void => {
      guardH3Payload('');
    }, /\[Thermodynamic Spatial Error\]/);

    assert.throws((): void => {
      guardH3Payload('   ');
    }, /\[Thermodynamic Spatial Error\]/);
  });

  it('should throw thermodynamic spatial errors on non-string primitives', () => {
    assert.throws((): void => {
      // @ts-ignore
      guardH3Payload(12345);
    }, /\[Thermodynamic Spatial Error\]/);

    assert.throws((): void => {
      // @ts-ignore
      monad.validatePayload({});
    }, /\[Thermodynamic Spatial Error\]/);
  });
});