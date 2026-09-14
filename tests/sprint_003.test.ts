import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3GridParser, GeoCoordinate, H3ValidationResult } from '../src/spatial/h3_grid.js';
import { SpatialMonad, ThermodynamicStock } from '../src/monads/spatial_monad.js';

describe('Sprint 003: Base H3 Grid Parsing and Index Validation', () => {
  it('should generate and validate an H3 index from geographic coordinates', () => {
    const coord: GeoCoordinate = { lat: 45.0, lng: -93.0 };
    const resolution = 5;
    const indexStr = H3GridParser.fromGeo(coord, resolution);
    
    assert.strictEqual(typeof indexStr, 'string');
    assert.ok(indexStr.length > 0);

    const validation = H3GridParser.validateIndex(indexStr);
    assert.strictEqual(validation.isValid, true);
    assert.strictEqual(validation.resolution, resolution);
  });

  it('should parse and normalize valid H3 string identifiers', () => {
    const coord: GeoCoordinate = { lat: 40.71, lng: -74.0 };
    const indexStr = H3GridParser.fromGeo(coord, 7);
    const parsed = H3GridParser.parseString(indexStr);
    assert.strictEqual(parsed, indexStr.toLowerCase());
  });

  it('should reject malformed H3 strings or invalid resolutions during validation', () => {
    const invalidResValidation = H3GridParser.validateIndex('invalid_string');
    assert.strictEqual(invalidResValidation.isValid, false);
    assert.strictEqual(invalidResValidation.errorCode, 'H3_ERR_INVALID_LENGTH');
  });

  it('should enforce SpatialMonad First Law conservation and binding', () => {
    const coord: GeoCoordinate = { lat: 0.0, lng: 0.0 };
    const initialStock: ThermodynamicStock = {
      carbonKg: 1000,
      waterKg: 50000,
      biomassJoules: 250000,
    };

    const monad = SpatialMonad.fromGeo(coord, 4, initialStock);
    assert.ok(monad.getIndex().length > 0);

    const unwrapped = monad.unwrapStock();
    assert.deepStrictEqual(unwrapped, initialStock);
  });
});