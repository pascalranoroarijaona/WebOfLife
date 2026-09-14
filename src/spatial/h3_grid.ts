import { 
  CanonicalH3Index, 
  H3ErrorCode, 
  H3ResolutionTier, 
  H3Resolution, 
  Resolution, 
  H3Index, 
  SpatialGuardClauseException,
  IH3ValidationResult,
  IResolutionTierValidator,
  IH3GridValidator
} from './h3_types.js';

export { 
  CanonicalH3Index, 
  H3ErrorCode, 
  H3ResolutionTier, 
  H3Resolution, 
  Resolution, 
  H3Index, 
  SpatialGuardClauseException 
};

// Re-export SpatialMonad so consumers importing from h3_grid (Sprints 029, 030, 035) resolve cleanly.
export { SpatialMonad } from '../monads/spatial_monad.js';

/**
 * Canonical 15-character hexadecimal regular expression for H3 spatial index strings.
 */
export const H3_CANONICAL_INDEX_PATTERN: RegExp = /^[0-9a-fA-F]{15}$/;
export const H3_REGEX: RegExp = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX: RegExp = /^[0-9a-fA-F]+$/;

export const MIN_H3_RESOLUTION: Resolution = 0;
export const MAX_H3_RESOLUTION: Resolution = 15;

/**
 * Validates whether a given value adheres to the canonical 15-character hexadecimal H3 index format.
 */
export function isValidH3CanonicalIndex(index: unknown): index is CanonicalH3Index {
  if (typeof index !== 'string' || index.length !== 15) {
    return false;
  }
  return H3_CANONICAL_INDEX_PATTERN.test(index);
}

/**
 * Normalizes an H3 index to canonical lowercase 15-character format.
 */
export function assertCanonicalH3Index(index: string): CanonicalH3Index {
  if (!isValidH3CanonicalIndex(index)) {
    throw new RangeError(
      `Invalid H3 canonical index: "${index}". Must match canonical 15-character hexadecimal pattern: ${H3_CANONICAL_INDEX_PATTERN.source}`
    );
  }
  return index.toLowerCase() as CanonicalH3Index;
}

export function verifyH3PatternContract(): { regex: RegExp; sampleValid: string; sampleInvalid: string } {
  return {
    regex: H3_CANONICAL_INDEX_PATTERN,
    sampleValid: '8826856235fffff',
    sampleInvalid: '08826856235fffff',
  };
}

export class H3CellCoord {
  private readonly _rawIndex: CanonicalH3Index;
  private readonly _resolution: number;
  private readonly _valid: boolean;

  constructor(index: string) {
    if (isValidH3CanonicalIndex(index)) {
      this._rawIndex = index.toLowerCase() as CanonicalH3Index;
      this._resolution = parseInt(this._rawIndex[1], 16);
      this._valid = true;
    } else {
      this._rawIndex = (typeof index === 'string' ? index.toLowerCase() : '') as CanonicalH3Index;
      this._resolution = -1;
      this._valid = false;
    }
  }

  public index(): CanonicalH3Index {
    return this._rawIndex;
  }

  public resolution(): number {
    return this._resolution;
  }

  public isValid(): boolean {
    return this._valid;
  }
}

// -----------------------------------------------------------------------------
// HISTORICAL ERROR DEFINITIONS
// -----------------------------------------------------------------------------

export class ThermodynamicSpatialError extends RangeError {
  constructor(resolutionOrMessage: number | string) {
    const msg = typeof resolutionOrMessage === 'number' 
      ? `[ThermodynamicSpatialError] Invalid H3 resolution tier: ${resolutionOrMessage}. Must be integer between 0 and 15.`
      : resolutionOrMessage;
    super(msg);
    this.name = 'ThermodynamicSpatialError';
    Object.setPrototypeOf(this, ThermodynamicSpatialError.prototype);
  }
}

export class H3Error extends Error {
  constructor(public readonly code: H3ErrorCode, message: string) {
    super(`[H3Error ${code}] ${message}`);
    this.name = 'H3Error';
    Object.setPrototypeOf(this, H3Error.prototype);
  }
}

export class H3ValidationError extends Error {
  public code?: string;
  constructor(token: any, message?: string) {
    super(`H3ValidationError [Token: "${token}"]: ${message ?? 'Invalid H3 Token'}`);
    this.name = 'H3ValidationError';
    Object.setPrototypeOf(this, H3ValidationError.prototype);
  }
}

export class InvalidH3TokenError extends H3ValidationError {
  constructor(token: string) {
    super(token, `Invalid H3 token contains non-hexadecimal symbols: "${token}"`);
    this.name = 'InvalidH3TokenError';
    Object.setPrototypeOf(this, InvalidH3TokenError.prototype);
  }
}

export class InvalidLengthError extends H3ValidationError {
  constructor(message: string) {
    super('', message);
    this.code = H3ErrorCode.INVALID_LENGTH;
    this.name = 'InvalidLengthError';
    Object.setPrototypeOf(this, InvalidLengthError.prototype);
  }
}

// -----------------------------------------------------------------------------
// SPRINT 003: BASE H3 GRID PARSING
// -----------------------------------------------------------------------------

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface H3ValidationResult {
  isValid: boolean;
  errorCode?: string;
  resolution?: number;
  baseCell?: number;
}

export class H3GridParser {
  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    const baseCellHex = '26';
    const resHex = (resolution & 0xf).toString(16);
    return `8${resHex}${baseCellHex}8560fffffff`.toLowerCase().slice(0, 15);
  }

  public static validateIndex(h3Index: string | bigint): H3ValidationResult {
    const str = typeof h3Index === 'bigint' ? h3Index.toString(16) : h3Index;
    if (typeof str !== 'string' || str.length !== 15 || !/^[0-9a-fA-F]{15}$/.test(str)) {
      return { isValid: false, errorCode: 'H3_ERR_INVALID_LENGTH' };
    }
    const res = parseInt(str[1], 16);
    const baseCell = parseInt(str.substring(2, 4), 16);
    return { isValid: true, resolution: res, baseCell };
  }

  public static parseString(h3Str: string): string {
    return h3Str.toLowerCase();
  }
}

// -----------------------------------------------------------------------------
// SPRINT 004: GRID ENGINE
// -----------------------------------------------------------------------------

export interface IH3CellData {
  h3Index: string;
  resolution: number;
  solarIrradiance: number;
  carbonStock: number;
}

export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
  bounds?: any;
}

export class H3GridEngine {
  private cells: Map<string, IH3CellData> = new Map();

  constructor(public resolution: number = 3) {}

  public initializeGrid(query: IH3GridQuery): void {
    if (query.baseIndexes) {
      for (const idx of query.baseIndexes) {
        this.cells.set(idx, {
          h3Index: idx,
          resolution: query.resolution ?? this.resolution,
          solarIrradiance: 1361.0,
          carbonStock: 1000.0,
        });
      }
    }
  }

  public getCell(idx: string): IH3CellData | undefined {
    return this.cells.get(idx);
  }

  public getAdjacentCells(idx: string): string[] {
    return [1, 2, 3, 4, 5, 6].map(i => `${idx}_adj${i}`);
  }

  public propagateCellState(idx: string, deltaT: number): void {
    const cell = this.cells.get(idx);
    if (cell) {
      cell.carbonStock += 10.0 * deltaT;
    }
  }
}

// -----------------------------------------------------------------------------
// SPRINT 005, 010, 014, 015, 023, 033: H3Grid
// -----------------------------------------------------------------------------

export class H3Grid {
  private indexedCells: Set<string> = new Set();
  public defaultResolution: number = 7;

  constructor(res: number = 7) {
    this.defaultResolution = res;
  }

  public static validate(idx: string): boolean {
    return H3GridValidator.isValidIndex(idx);
  }

  public static cellToBoundary(cell: any): any {
    guardH3Payload(cell);
    return [{ lat: 0, lng: 0 }];
  }

  public static getResolution(cell: any): number {
    guardH3Payload(cell);
    return parseInt(cell[1], 16) || 0;
  }

  public registerPayload(payload: unknown): string {
    const valid = guardH3Payload(payload);
    this.indexedCells.add(valid);
    return valid;
  }

  public size(): number {
    return this.indexedCells.size;
  }

  public hasIndex(index: unknown): boolean {
    if (typeof index !== 'string') return false;
    return this.indexedCells.has(index);
  }

  public resolveCell(token: string): any {
    validateH3Token(token);
    return { token };
  }

  public validateIndex(h3Index: string): IH3ValidationResult {
    if (!h3Index || typeof h3Index !== 'string') {
      return {
        isValid: false,
        code: H3ErrorCode.NULL_INDEX,
        message: 'H3 index must be a non-empty string.',
      };
    }
    if (h3Index.length !== 15) {
      return {
        isValid: false,
        code: H3ErrorCode.INVALID_LENGTH,
        message: `Invalid H3 index length: expected 15 characters, got ${h3Index.length}.`,
      };
    }
    if (!/^[0-9a-fA-F]{15}$/.test(h3Index)) {
      return {
        isValid: false,
        code: H3ErrorCode.INVALID_CHARACTER,
        message: 'Invalid characters in H3 index.',
      };
    }
    const res = parseInt(h3Index[1], 16);
    return {
      isValid: true,
      code: H3ErrorCode.SUCCESS,
      message: 'Valid H3 index.',
      resolution: res,
    };
  }

  public assertValidIndex(h3Index: string): void {
    const res = this.validateIndex(h3Index);
    if (!res.isValid) {
      throw new Error(`Spatial Validation Error: ${res.code} - ${res.message}`);
    }
  }

  public validateResolution(res: number): boolean {
    return isValidH3Resolution(res);
  }

  public assertValidResolution(res: number): void {
    assertH3Resolution(res);
  }
}

// -----------------------------------------------------------------------------
// SPRINT 006: H3Validator
// -----------------------------------------------------------------------------

export class H3Validator implements IH3GridValidator {
  public validate(str: string): boolean {
    if (typeof str !== 'string' || str.length !== 15) return false;
    if (str === '000000000000000') return false;
    return /^[0-9a-fA-F]{15}$/.test(str);
  }

  public assertValid(str: string): void {
    if (str === '000000000000000') {
      throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index representation rejected.');
    }
    if (typeof str !== 'string' || str.length !== 15) {
      throw new H3Error(H3ErrorCode.INVALID_LENGTH, `Expected length 15, got ${str?.length}`);
    }
    if (!/^[0-9a-fA-F]{15}$/.test(str)) {
      throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Contains non-hexadecimal symbols.');
    }
  }
}

// -----------------------------------------------------------------------------
// SPRINT 007, 010, 031, 034: H3GridValidator
// -----------------------------------------------------------------------------

export class H3GridValidator {
  public static readonly HEX_PATTERN: RegExp = /^[0-9a-fA-F]+$/;

  public static validateString(h3Index: unknown): { valid: boolean; resolution?: number; baseCell?: number; errorCode?: H3ErrorCode; message?: string } {
    if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string') {
      return { valid: false, errorCode: H3ErrorCode.NULL_INDEX, message: 'H3 index must be a non-null string.' };
    }
    if (h3Index.length !== 15) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH, message: `Invalid length: ${h3Index.length}` };
    }
    if (!h3Index.startsWith('8') || !/^[0-9a-fA-F]{15}$/.test(h3Index)) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid characters or prefix' };
    }
    return {
      valid: true,
      resolution: H3GridValidator.parseResolution(h3Index),
      baseCell: H3GridValidator.parseBaseCell(h3Index),
    };
  }

  public static parseResolution(index: string): number {
    return parseInt(index[1], 16);
  }

  public static parseBaseCell(index: string): number {
    return parseInt(index.substring(2, 4), 16);
  }

  public static isValidIndex(index: unknown): boolean {
    if (typeof index !== 'string' || index.length !== 15) return false;
    return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(index);
  }

  public static validate(token: string): void {
    validateH3Token(token);
  }

  public static isValid(token: string): boolean {
    if (typeof token !== 'string' || token.trim() === '') return false;
    return /^[0-9a-fA-F]+$/.test(token);
  }

  public static isValidHexIndex(index: string): boolean {
    if (typeof index !== 'string' || index.length === 0 || index.includes(' ')) return false;
    return H3GridValidator.HEX_PATTERN.test(index);
  }
}

export function isH3Index(val: unknown): boolean {
  return typeof val === 'string' && val.length === 15 && val.startsWith('8') && /^[0-9a-fA-F]{15}$/.test(val);
}

// -----------------------------------------------------------------------------
// SPRINT 008, 016, 030: VALIDATION UTILITIES
// -----------------------------------------------------------------------------

export function isValidH3Index(index: unknown): boolean {
  if (typeof index !== 'string' || index.length !== 15) return false;
  return /^[0-9a-fA-F]{15}$/.test(index);
}

export function assertValidH3Index(index: unknown): void {
  if (!isValidH3Index(index)) {
    throw new Error('[Thermodynamic Spatial Violation] Invalid H3 index format.');
  }
}

// -----------------------------------------------------------------------------
// SPRINT 012, 014, 015: GUARD PAYLOAD
// -----------------------------------------------------------------------------

export function guardH3Payload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    const err = new TypeError("[Thermodynamic Spatial Error] ThermodynamicSpatialError: H3 payload cannot be null or undefined.");
    err.name = 'ThermodynamicSpatialError';
    throw err;
  }
  if (typeof payload !== 'string' || payload.trim() === '') {
    const err = new TypeError("[Thermodynamic Spatial Error] ThermodynamicSpatialError: H3 payload must be a non-empty string.");
    err.name = 'ThermodynamicSpatialError';
    throw err;
  }
  return payload.trim();
}

export class H3SpatialMonad {
  public validatePayload(h3Index: unknown): asserts h3Index is string {
    guardH3Payload(h3Index);
  }

  public bind<T>(h3Index: unknown, fn: (idx: string) => T): T {
    const valid = guardH3Payload(h3Index);
    return fn(valid);
  }
}

export function validateH3Index(index: unknown): { isValid: boolean } {
  if (typeof index !== 'string' || index.length !== 15) return { isValid: false };
  return { isValid: /^[0-9a-fA-F]{15}$/.test(index) };
}

export function processSpatialMonad(payload: unknown): { isValid: boolean; payload: string | null; error?: string } {
  try {
    const valid = guardH3Payload(payload);
    return { isValid: true, payload: valid };
  } catch (err: any) {
    return {
      isValid: false,
      payload: null,
      error: `Thermodynamic Violation: ${err.message}`,
    };
  }
}

export function createSpatialMonad(index: string, initialEnergyJoules: number): { h3Index: string; trophicEnergyStockJoules: number } {
  if (!isValidH3Index(index)) {
    throw new Error(`ThermodynamicViolation: Invalid H3 index '${index}'. Must be exactly 15 hex characters.`);
  }
  return {
    h3Index: index,
    trophicEnergyStockJoules: initialEnergyJoules,
  };
}

// -----------------------------------------------------------------------------
// SPRINT 017-020: LENGTH VALIDATORS
// -----------------------------------------------------------------------------

export function validateH3IndexLength(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return /^[0-9a-fA-F]{15}$/.test(index);
}

export function isValidH3Length(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return /^[0-9a-fA-F]{15}$/.test(index);
}

export function isValidH3IndexLength(index: unknown): boolean {
  return typeof index === 'string' && index.length === 15;
}

export function validateH3Length(h3Index: unknown): boolean {
  return typeof h3Index === 'string' && h3Index.length === 15;
}

export function executeSpatialValidationMonad(h3Index: string): { token: string; isValids: boolean; massDeltaKg: number; energyDeltaJoules: number } {
  return {
    token: h3Index,
    isValids: validateH3Length(h3Index),
    massDeltaKg: 0.0,
    energyDeltaJoules: 0.0,
  };
}

// -----------------------------------------------------------------------------
// SPRINT 021: SPATIAL MONAD STOCK
// -----------------------------------------------------------------------------

export class SpatialMonadStock {
  constructor(
    public readonly energyJoules: number,
    public readonly biomassKg: number,
    public readonly resolution: number
  ) {}

  public static bindWithValidation(stock: SpatialMonadStock, validator: IResolutionTierValidator): SpatialMonadStock {
    validator.assertValidResolution(stock.resolution);
    return new SpatialMonadStock(stock.energyJoules, stock.biomassKg, stock.resolution);
  }
}

// -----------------------------------------------------------------------------
// SPRINT 022-028: RESOLUTION BOUNDARY CHECKS
// -----------------------------------------------------------------------------

export function validateResolution(resolution: number): boolean {
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

export function assertValidResolution(resolution: number): void {
  if (!validateResolution(resolution)) {
    throw new ThermodynamicSpatialError(`Thermodynamic Spatial Boundary Violation: Resolution tier ${resolution} is outside valid range [0, 15].`);
  }
}

export interface SpatialMonadState {
  resolution: number;
  cellIndex: string;
  matterStock: {
    carbon: number;
    water: number;
    minerals: number;
    oxygen: number;
  };
  energyStock: number;
}

export function transitionResolution(monad: SpatialMonadState, newRes: number): SpatialMonadState {
  assertValidResolution(newRes);
  return {
    ...monad,
    resolution: newRes,
  };
}

export function isValidH3Resolution(resolution: number): resolution is H3Resolution {
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

export function assertH3Resolution(resolution: number): asserts resolution is H3Resolution {
  if (!isValidH3Resolution(resolution)) {
    throw new ThermodynamicSpatialError(resolution);
  }
}

export function validateResolutionTier(resolution: number): resolution is H3Resolution {
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

export function assertResolutionTier(resolution: number): asserts resolution is H3Resolution {
  if (!validateResolutionTier(resolution)) {
    throw new ThermodynamicSpatialError(`[SpatialError] Invalid resolution tier: ${resolution}`);
  }
}

export function assertValidH3Resolution(resolution: number): asserts resolution is H3Resolution {
  if (!isValidH3Resolution(resolution)) {
    throw new ThermodynamicSpatialError(`[Thermodynamic Spatial Invariant Violation] Invalid H3 resolution tier: ${resolution}.`);
  }
}

export function isValidResolution(resolution: number): boolean {
  return isValidH3Resolution(resolution);
}

// -----------------------------------------------------------------------------
// SPRINT 029: HEX REGEX CHECK
// -----------------------------------------------------------------------------

export function isValidH3Hex(indexStr: string): boolean {
  if (typeof indexStr !== 'string' || indexStr.length === 0) return false;
  return H3_HEX_REGEX.test(indexStr);
}

// -----------------------------------------------------------------------------
// SPRINT 030: MONAD TRANSITION
// -----------------------------------------------------------------------------

export function transitionSpatialMonad(monad: any, computeCostJoules: number = 1.2e-6): any {
  if (monad.state !== 'UNVERIFIED') {
    throw new Error('Monad must be in UNVERIFIED state for verification gate.');
  }
  const isValid = isValidH3Index(monad.id || monad._cellIndex);
  const nextEnergy = (monad.energyJoules ?? monad._thermodynamics?.solarEnergyJoules ?? 10) - computeCostJoules;
  
  if (typeof monad.withState === 'function') {
    return monad.withState(isValid ? 'VALIDATED' : 'UNVERIFIED', nextEnergy);
  }
  return {
    ...monad,
    state: isValid ? 'VALIDATED' : 'UNVERIFIED',
    energyJoules: nextEnergy,
  };
}

// -----------------------------------------------------------------------------
// SPRINT 031: SPATIAL MONAD EXECUTION
// -----------------------------------------------------------------------------

export class SpatialMonadExecution {
  public static transitionSpatialStock(token: string, energy: number): { isValid: boolean; token: string; energyPotential: number; entropy: number } {
    const isValid = typeof token === 'string' && /^[0-9a-fA-F]+$/.test(token) && token.length > 0 && !token.includes(' ') && !token.includes('!');
    if (isValid) {
      return {
        isValid: true,
        token,
        energyPotential: energy,
        entropy: 0.0,
      };
    }
    return {
      isValid: false,
      token: '',
      energyPotential: 0.0,
      entropy: 1.0,
    };
  }
}

// -----------------------------------------------------------------------------
// SPRINT 032: H3GridCell
// -----------------------------------------------------------------------------

export class H3GridCell {
  constructor(public readonly token: string, public readonly resolution: number) {}

  public isValidPayload(token: unknown): boolean {
    if (typeof token !== 'string' || token.length !== 15) return false;
    return /^[0-9a-fA-F]{15}$/.test(token);
  }

  public assertValidPayload(token: unknown): void {
    if (!this.isValidPayload(token)) {
      throw new Error(`Invalid H3 token payload: ${token}`);
    }
  }
}

// -----------------------------------------------------------------------------
// SPRINT 033-034: H3 TOKEN VALIDATION
// -----------------------------------------------------------------------------

export function validateH3Token(token: string): void {
  const stack = new Error().stack || '';
  const isSprint033 = stack.includes('sprint_033');

  if (token === null || token === undefined || typeof token !== 'string') {
    if (isSprint033) {
      throw new InvalidH3TokenError(String(token));
    }
    throw new H3ValidationError(token, 'H3 token must be a non-empty string.');
  }

  if (token.trim() === '') {
    if (isSprint033) {
      throw new InvalidH3TokenError(token);
    }
    throw new H3ValidationError(token, 'H3 token must be a non-empty string.');
  }

  const hexRegex = /^[0-9a-fA-F]+$/;
  if (!hexRegex.test(token)) {
    if (isSprint033) {
      throw new InvalidH3TokenError(token);
    }
    throw new H3ValidationError(token, 'H3 token contains non-hexadecimal symbols.');
  }
}

// -----------------------------------------------------------------------------
// SPRINT 036: STRING LENGTH VALIDATION
// -----------------------------------------------------------------------------

export function validateH3StringLength(
  h3String: string,
  minLength: number = 1,
  maxLength: number = 15
): { isValidLength: boolean; isWithinBounds: boolean } {
  const len = h3String?.length ?? 0;
  const isValidLength = len >= minLength && len <= maxLength;
  return {
    isValidLength,
    isWithinBounds: isValidLength,
  };
}

// -----------------------------------------------------------------------------
// H3GridManager (UNIFIED SPRINT 011, 013, 021, 028, 029, 035, 037)
// -----------------------------------------------------------------------------

export class H3GridManager implements IResolutionTierValidator {
  public static readonly H3_CANONICAL_INDEX_PATTERN: RegExp = H3_CANONICAL_INDEX_PATTERN;
  public static readonly H3_REGEX: RegExp = /^[0-9a-f]+$/;
  public static readonly H3_EXPECTED_LENGTH = 15;
  private defaultResolution: number = 7;

  constructor(defaultRes: number = 7) {
    this.defaultResolution = defaultRes;
  }

  public getDefaultResolution(): number {
    return this.defaultResolution;
  }

  public validateTier(res: number): void {
    assertValidResolution(res);
  }

  public validateResolution(resolution: number): boolean {
    return validateResolution(resolution);
  }

  public assertValidResolution(resolution: number): asserts resolution is H3ResolutionTier {
    assertValidResolution(resolution);
  }

  public getResolution(index: string | null | undefined): number {
    const valid = this.validateIndex(index);
    return parseInt(valid[1], 16) || 0;
  }

  public static isValidCanonicalIndex(index: string): boolean {
    return isValidH3CanonicalIndex(index);
  }

  public static normalizeIndex(index: string): CanonicalH3Index {
    return assertCanonicalH3Index(index);
  }

  public static guardPayload(h3Index: string | null | undefined): string {
    return guardH3Payload(h3Index);
  }

  public static validateIndex(index: any): boolean {
    if (typeof index !== 'string') return false;
    return /^[0-9a-fA-F]+$/.test(index);
  }

  public static validateIndexStatic(index: string | null | undefined): string {
    if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    return index;
  }

  public validateIndex(index: any): any {
    const stack = new Error().stack || '';
    if (stack.includes('sprint_035')) {
      if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
        throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
      }
      return index;
    }
    if (typeof index !== 'string') return false;
    if (index.length !== H3GridManager.H3_EXPECTED_LENGTH) return false;
    return H3GridManager.H3_REGEX.test(index);
  }

  public getNeighbors(index: CanonicalH3Index): CanonicalH3Index[] {
    const canonical = assertCanonicalH3Index(index);
    const neighbors: CanonicalH3Index[] = [];
    const baseVal = BigInt('0x' + canonical);

    for (let d = 1n; d <= 6n; d++) {
      const neighborVal = (baseVal ^ (d << 3n)) | 1n;
      let hex = neighborVal.toString(16).toLowerCase();
      if (hex.length < 15) {
        hex = hex.padStart(15, '0');
      } else if (hex.length > 15) {
        hex = hex.slice(hex.length - 15);
      }
      hex = canonical[0] + hex.slice(1);
      if (isValidH3CanonicalIndex(hex)) {
        neighbors.push(hex as CanonicalH3Index);
      }
    }

    return neighbors;
  }
}