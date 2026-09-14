import { describe, it } from 'node:test';
import assert from 'node:assert';
import { H3GridCell } from '../src/spatial/h3_grid.js';
import { SpatialMonad, EnergyStock } from '../src/monads/spatial_monad.js';

describe('Sprint 032: H3 Token Payload Validation & Thermodynamic Monad Transits', () => {
  const validator = new H3GridCell('8f268f123456789', 9);

  it('should validate correct 15-character hex strings (lowercase, uppercase, mixed)', () => {
    const validTokens = [
      '8f268f123456789',
      '8F268F123456789',
      '8f268F123456789',
      '0123456789abcdef',
      'ABCDEF012345678'
    ];

    for (const token of validTokens) {
      assert.strictEqual(validator.isValidPayload(token), true, `Token ${token} should be valid`);
      assert.doesNotThrow(() => validator.assertValidPayload(token));
    }
  });

  it('should reject tokens with invalid lengths (< 15 or > 15 characters)', () => {
    const invalidLengths = [
      '',
      '8f268f12345678', // 14 chars
      '8f268f1234567890' // 16 chars
    ];

    for (const token of invalidLengths) {
      assert.strictEqual(validator.isValidPayload(token), false, `Token ${token} should be invalid by length`);
      assert.throws(() => validator.assertValidPayload(token));
    }
  });

  it('should reject tokens with non-hex characters, symbols, or whitespace', () => {
    const invalidCharacters = [
      '8f268f12345678g', // 'g' is non-hex
      '8f268f12345678_', // symbol
      '8f268f1234567 8', // space
      '8f268f1234567\n9'  // newline
    ];

    for (const token of invalidCharacters) {
      assert.strictEqual(validator.isValidPayload(token), false, `Token ${token} should be invalid by character set`);
      assert.throws(() => validator.assertValidPayload(token));
    }
  });

  it('should correctly transition SpatialMonad state and manage thermodynamic stock', () => {
    const initialStock: EnergyStock = { joules: 100.0, entropy: 0.0 };

    // Valid monad transit
    const validMonad = new SpatialMonad('8f268f123456789', { ...initialStock });
    validMonad.transit();
    assert.strictEqual(validMonad.getState(), 'ActiveSpatialStock');
    assert.ok(validMonad.getStock().joules < 100.0, 'Energy should be deducted for validation');
    assert.strictEqual(validMonad.getStock().entropy, 0.0, 'Valid token should not add system entropy');
    assert.notStrictEqual(validMonad.getH3Cell(), null);

    // Invalid monad transit
    const invalidMonad = new SpatialMonad('INVALID_TOKEN_ABC', { ...initialStock });
    invalidMonad.transit();
    assert.strictEqual(invalidMonad.getState(), 'SinkState');
    assert.strictEqual(invalidMonad.getStock().entropy, 1.0, 'Invalid token should increment system entropy');
    assert.strictEqual(invalidMonad.getH3Cell(), null);
  });
});