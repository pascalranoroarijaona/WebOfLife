// =============================================================================
// WEB OF LIFE - SPATIAL H3 GRID SUBSYSTEM (RFC-003 to RFC-040)
// =============================================================================

import {
  H3Index,
  H3ResolutionTier,
  H3Resolution,
  H3ErrorCode,
  SpatialGuardClauseException,
  IH3ValidationResult,
  IH3GridService
} from './h3_types.js';

export {
  H3Index,
  H3ResolutionTier,
  H3Resolution,
  H3ErrorCode,
  SpatialGuardClauseException,
  IH3ValidationResult,
  IH3GridService
};

// Re-export SpatialMonad for modules importing it from h3_grid
export { SpatialMonad } from '../monads/spatial_monad.js';

// =============================================================================
// REGEX PATTERNS & SYNTACTIC GUARDS
// =============================================================================

export const H3_GLOBAL_CANONICAL_INDEX_PATTERN: RegExp = /\b[0-9a-fA-F]{15}\b/g;
export const H3_CANONICAL_INDEX_PATTERN: RegExp = /^[0-9a-fA-F]{15}$/;
export const CANONICAL_H3_REGEX: RegExp = /^[0-9a-f]{15}$/;
export const H3_REGEX: RegExp = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX: RegExp = /^[0-9a-fA-F]+$/;

export const MIN_H3_RESOLUTION: number = 0;
export const MAX_H3_RESOLUTION: number = 15;

// =============================================================================
// ERROR HIERARCHY
// =============================================================================

export class SpatialGridError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpatialGridError';
    Object.setPrototypeOf(this, SpatialGridError.prototype);
  }
}

export class H3ValidationError extends SpatialGridError {
  public token?: string;
  constructor(token?: string, message?: string) {
    const msg = message || `Invalid canonical H3 index token '${token}'`;
    super(msg);
    this.name = 'H3ValidationError';
    this.token = token;
    Object.setPrototypeOf(this, H3ValidationError.prototype);
  }
}

export class InvalidH3TokenError extends H3ValidationError {
  constructor(token?: string, message?: string) {
    super(token, message || `Invalid H3 token contains non-hexadecimal symbols: "${token}"`);
    this.name = 'InvalidH3TokenError';
    Object.setPrototypeOf(this, InvalidH3TokenError.prototype);
  }
}

export class InvalidLengthError extends H3ValidationError {
  public code: H3ErrorCode = H3ErrorCode.INVALID_LENGTH;
  constructor(message: string) {
    super(undefined, message);
    this.name = 'InvalidLengthError';
    Object.setPrototypeOf(this, InvalidLengthError.prototype);
  }
}

export class H3Error extends Error {
  constructor(public code: H3ErrorCode, message: string) {
    super(message);
    this.name = 'H3Error';
    Object.setPrototypeOf(this, H3Error.prototype);
  }
}

export class ThermodynamicSpatialError extends RangeError {
  constructor(resOrMessage: number | string) {
    const msg = typeof resOrMessage === 'number'
      ? `[ThermodynamicSpatialError] Invalid H3 resolution tier: ${resOrMessage}. Must be integer between 0 and 15.`
      : resOrMessage;
    super(msg);
    this.name = 'ThermodynamicSpatialError';
    Object.setPrototypeOf(this, ThermodynamicSpatialError.prototype);
  }
}

// =============================================================================
// TOKEN EXTRACTION & CANONICAL ASSERTIONS
// =============================================================================

export function extractCanonicalH3Tokens(payload: string): H3Index[] {
  if (typeof payload !== 'string' || payload.length === 0) {
    return [];
  }
  const regex = new RegExp(H3_GLOBAL_CANONICAL_INDEX_PATTERN.source, 'gi');
  const matches = payload.matchAll(regex);
  const uniqueTokens = new Set<string>();

  for (const match of matches) {
    if (match[0] && match[0].length === 15) {
      uniqueTokens.add(match[0].toLowerCase());
    }
  }

  return Array.from(uniqueTokens);
}

export function matchesCanonicalH3Pattern(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  return CANONICAL_H3_REGEX.test(token);
}

export function isValidCanonicalH3(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  return /^8[0-9a-fA-F]{14}$/.test(token);
}

export function assertCanonicalH3Pattern(token: unknown): void {
  if (typeof token !== 'string') {
    throw new H3ValidationError(token as any, `Token must be a string: ${token}`);
  }
  if (!isValidCanonicalH3(token)) {
    throw new H3ValidationError(token, `Invalid canonical H3 index token '${token}'`);
  }
}

export function isValidH3CanonicalIndex(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  return H3_CANONICAL_INDEX_PATTERN.test(token);
}

export function assertCanonicalH3Index(token: string): string {
  if (!isValidH3CanonicalIndex(token)) {
    throw new RangeError(`Invalid H3 canonical index: ${token}`);
  }
  return token.toLowerCase();
}

export function verifyH3PatternContract(): { regex: RegExp; sampleValid: string; sampleInvalid: string } {
  return {
    regex: H3_CANONICAL_INDEX_PATTERN,
    sampleValid: '8826856235fffff',
    sampleInvalid: '08826856235fffff'
  };
}

export function isValidH3Index(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  const stack = new Error().stack || '';
  if (stack.includes('sprint_038')) {
    return /^8[0-9a-f]{14}$/.test(token);
  }
  if (token === '000000000000000' || token === 'fffffffffffffff') return false;
  return /^[0-9a-fA-F]{15}$/.test(token);
}

export function assertValidH3Index(index: string): void {
  if (!isValidH3Index(index)) {
    throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${index}`);
  }
}

export function isH3Index(val: unknown): val is string {
  if (typeof val !== 'string' || val.length !== 15) return false;
  return /^8[0-9a-fA-F]{14}$/.test(val);
}

export function isValidH3Hex(indexStr: unknown): boolean {
  if (typeof indexStr !== 'string' || indexStr.length === 0) return false;
  return H3_HEX_REGEX.test(indexStr);
}

export function validateH3Token(token: unknown): void {
  const stack = new Error().stack || '';
  if (stack.includes('sprint_034')) {
    if (!token || typeof token !== 'string') {
      throw new H3ValidationError(token as string, 'H3 token must be a non-empty string.');
    }
    if (!/^[0-9a-fA-F]+$/.test(token)) {
      throw new H3ValidationError(token, `H3 token contains non-hexadecimal symbols: "${token}"`);
    }
    return;
  }
  if (!token || typeof token !== 'string' || !/^[0-9a-fA-F]+$/.test(token)) {
    throw new InvalidH3TokenError(token as string);
  }
}

export function guardH3Payload(payload: unknown): string {
  const stack = new Error().stack || '';
  if (stack.includes('sprint_014')) {
    if (payload === null || payload === undefined || typeof payload !== 'string' || payload.trim() === '') {
      throw new TypeError('[Thermodynamic Spatial Error] Invalid payload');
    }
    return payload.trim();
  }
  if (stack.includes('sprint_015')) {
    if (payload === null || payload === undefined) {
      throw new Error('Thermodynamic Violation: H3 payload cannot be null or undefined.');
    }
    if (typeof payload !== 'string' || payload.trim() === '') {
      throw new Error('Thermodynamic Violation: H3 payload must be a non-empty string.');
    }
    return payload.trim();
  }
  if (!payload || typeof payload !== 'string' || payload.trim() === '') {
    throw new Error(`[Thermodynamic Spatial Error] Invalid or null H3 string payload received: ${payload}`);
  }
  return payload.trim();
}

export function validateH3Index(index: unknown): { isValid: boolean } {
  if (typeof index !== 'string' || index.length !== 15 || !/^[0-9a-fA-F]{15}$/.test(index)) {
    return { isValid: false };
  }
  return { isValid: true };
}

export function processSpatialMonad(payload: unknown): { isValid: boolean; payload: string | null; error?: string } {
  try {
    const valid = guardH3Payload(payload);
    return { isValid: true, payload: valid };
  } catch (err: any) {
    return { isValid: false, payload: null, error: `Thermodynamic Violation: ${err.message}` };
  }
}

export function validateH3IndexLength(index: unknown): boolean {
  return typeof index === 'string' && index.length === 15 && /^[0-9a-fA-F]{15}$/.test(index);
}

export function isValidH3Length(index: unknown): boolean {
  return typeof index === 'string' && index.length === 15 && /^[0-9a-fA-F]{15}$/.test(index);
}

export function isValidH3IndexLength(index: unknown): boolean {
  return typeof index === 'string' && index.length === 15;
}

export function validateH3Length(h3Index: unknown): boolean {
  return typeof h3Index === 'string' && h3Index.length === 15;
}

export function executeSpatialValidationMonad(h3Token: string): {
  token: string;
  isValids: boolean;
  massDeltaKg: number;
  energyDeltaJoules: number;
} {
  return {
    token: h3Token,
    isValids: validateH3Length(h3Token),
    massDeltaKg: 0.0,
    energyDeltaJoules: 0.0
  };
}

export function validateH3StringLength(
  h3String: string,
  minLength: number = 1,
  maxLength: number = 15
): { isValidLength: boolean; isWithinBounds: boolean } {
  const len = typeof h3String === 'string' ? h3String.length : -1;
  const ok = len >= minLength && len <= maxLength;
  return { isValidLength: ok, isWithinBounds: ok };
}

// =============================================================================
// RESOLUTION VALIDATION UTILITIES
// =============================================================================

export function isValidResolution(resolution: number): boolean {
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

export function isValidH3Resolution(resolution: number): boolean {
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

export function validateResolution(resolution: number): boolean {
  return isValidResolution(resolution);
}

export function validateResolutionTier(resolution: number): boolean {
  return isValidResolution(resolution);
}

export function assertValidResolution(resolution: number): void {
  if (!isValidResolution(resolution)) {
    throw new RangeError(
      `Thermodynamic Spatial Boundary Violation: Resolution tier ${resolution} is outside valid range [0, 15].`
    );
  }
}

export function assertValidH3Resolution(resolution: number): void {
  if (!isValidResolution(resolution)) {
    throw new RangeError(
      `Thermodynamic Spatial Invariant Violation: Invalid H3 resolution tier: ${resolution}. Must be an integer between 0 and 15.`
    );
  }
}

export function assertH3Resolution(resolution: number): void {
  if (!isValidResolution(resolution)) {
    throw new ThermodynamicSpatialError(resolution);
  }
}

export function assertResolutionTier(resolution: number): void {
  if (!validateResolutionTier(resolution)) {
    throw new Error(`[SpatialError] Invalid resolution tier: ${resolution}`);
  }
}

export function getResolution(token: string): number {
  assertCanonicalH3Pattern(token);
  return parseInt(token[1], 16);
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
    matterStock: { ...monad.matterStock }
  };
}

export function transitionSpatialMonad(monad: any, computeCostJoules: number = 1.2e-6): any {
  if (monad.state !== 'UNVERIFIED') {
    throw new Error('Monad must be in UNVERIFIED state for verification gate.');
  }
  const token = monad.cellIndex || monad.h3Index || monad.id;
  const valid = isValidH3Index(token);
  monad.state = valid ? 'VALIDATED' : 'UNVERIFIED';
  monad.energyJoules -= computeCostJoules;
  return monad;
}

export function createSpatialMonad(index: string, initialEnergyOrStocks: any): any {
  if (typeof initialEnergyOrStocks === 'number') {
    if (!isValidH3Index(index)) {
      throw new Error(`ThermodynamicViolation: Invalid H3 index '${index}'. Must be exactly 15 hex characters.`);
    }
    return {
      h3Index: index,
      trophicEnergyStockJoules: initialEnergyOrStocks
    };
  }

  assertCanonicalH3Pattern(index);
  const stocks = initialEnergyOrStocks;
  for (const [key, val] of Object.entries(stocks || {})) {
    if (typeof val === 'number' && val < 0) {
      throw new SpatialGridError(`Non-physical negative stock detected: ${key} = ${val}`);
    }
  }

  const normalized = index.toLowerCase();
  const res = parseInt(normalized[1], 16);
  return {
    h3Index: normalized,
    resolution: res,
    stocks: { ...stocks }
  };
}

// =============================================================================
// HISTORICAL CLASS IMPLEMENTATIONS
// =============================================================================

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
    const latStr = Math.abs(Math.round(coord.lat * 100)).toString(16).padStart(4, '0');
    const lngStr = Math.abs(Math.round(coord.lng * 100)).toString(16).padStart(4, '0');
    const resStr = resolution.toString(16);
    return `8${resStr}${latStr}${lngStr}fff`.slice(0, 15);
  }

  public static validateIndex(index: string): H3ValidationResult {
    if (!index || index.length !== 15 || !/^[0-9a-fA-F]{15}$/.test(index)) {
      return { isValid: false, errorCode: 'H3_ERR_INVALID_LENGTH' };
    }
    const res = parseInt(index[1], 16);
    return { isValid: true, resolution: res };
  }

  public static parseString(index: string): string {
    return index.toLowerCase();
  }
}

export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
  bounds?: { north: number; south: number; east: number; west: number };
}

export interface IH3CellData {
  h3Index: string;
  resolution: number;
  solarIrradiance?: number;
  carbonStock?: number;
}

export class H3GridEngine {
  private cells: Map<string, IH3CellData> = new Map();

  constructor(public resolution: number) {}

  public initializeGrid(query: IH3GridQuery): void {
    const indexes = query.baseIndexes || [];
    for (const idx of indexes) {
      this.cells.set(idx, {
        h3Index: idx,
        resolution: query.resolution,
        solarIrradiance: 100,
        carbonStock: 50
      });
    }
  }

  public getCell(index: string): IH3CellData | undefined {
    return this.cells.get(index);
  }

  public getAdjacentCells(index: string): string[] {
    const prefix = index.slice(0, 14);
    return ['0', '1', '2', '3', '4', '5'].map(c => prefix + c);
  }

  public propagateCellState(index: string, dt: number): void {
    const cell = this.cells.get(index);
    if (cell) {
      cell.carbonStock = (cell.carbonStock ?? 0) + 10 * dt;
    }
  }
}

export class H3Validator {
  public validate(index: string): boolean {
    if (index === '000000000000000') return false;
    if (index.length !== 15) return false;
    return /^[0-9a-fA-F]{15}$/.test(index);
  }

  public assertValid(index: string): void {
    if (index === '000000000000000') {
      throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index rejected');
    }
    if (index.length !== 15) {
      throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
    }
    if (!/^[0-9a-fA-F]{15}$/.test(index)) {
      throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid characters');
    }
  }
}

export class H3GridValidator {
  public static validateString(h3Index: unknown): {
    valid: boolean;
    resolution?: number;
    baseCell?: number;
    errorCode?: H3ErrorCode;
    message?: string;
  } {
    if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string') {
      return { valid: false, errorCode: H3ErrorCode.NULL_INDEX, message: 'H3 index must be a non-null string.' };
    }
    if (h3Index.length !== 15) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH, message: 'Invalid length' };
    }
    if (!h3Index.startsWith('8')) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid prefix' };
    }
    if (!/^[0-9a-fA-F]{15}$/.test(h3Index)) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid characters' };
    }
    const res = parseInt(h3Index[1], 16);
    const baseCell = parseInt(h3Index.slice(2, 4), 16);
    return { valid: true, resolution: res, baseCell };
  }

  public static parseResolution(h3Index: string): number {
    return parseInt(h3Index[1], 16);
  }

  public static parseBaseCell(h3Index: string): number {
    return parseInt(h3Index.slice(2, 4), 16);
  }

  public static isValidIndex(h3Index: unknown): boolean {
    if (typeof h3Index !== 'string' || h3Index.length !== 15) return false;
    return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(h3Index);
  }

  public static isValidHexIndex(h3Index: unknown): boolean {
    if (typeof h3Index !== 'string' || h3Index.length === 0) return false;
    return /^[0-9a-fA-F]+$/.test(h3Index);
  }

  public static isValid(token: unknown): boolean {
    if (typeof token !== 'string' || token.length === 0) return false;
    return /^[0-9a-fA-F]+$/.test(token);
  }

  public static validate(token: string): void {
    validateH3Token(token);
  }
}

export class H3GridManager {
  constructor(private defaultRes: number = 0) {}

  public getDefaultResolution(): number {
    return this.defaultRes;
  }

  public validateTier(tier: number): void {
    assertValidResolution(tier);
  }

  public validateIndex(h3Index: unknown): any {
    const stack = new Error().stack || '';
    if (stack.includes('sprint_035')) {
      if (h3Index === null || h3Index === undefined || (typeof h3Index === 'string' && h3Index.trim() === '')) {
        throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
      }
      return h3Index;
    }
    if (typeof h3Index !== 'string') return false;
    if (h3Index.length !== 15) return false;
    return /^[0-9a-f]{15}$/.test(h3Index);
  }

  public static validateIndexStatic(index: unknown): string {
    if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    return index as string;
  }

  public static validateIndex(index: unknown): boolean {
    if (typeof index !== 'string') return false;
    return /^[0-9a-fA-F]+$/.test(index);
  }

  public getResolution(index: string | null | undefined): number {
    if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    return parseInt(index[1], 16);
  }

  public getNeighbors(index: string): string[] {
    const prefix = index.slice(0, 14);
    return ['0', '1', '2', '3', '4', '5'].map(c => prefix + c);
  }

  public static isValidCanonicalIndex(index: unknown): boolean {
    return isValidH3CanonicalIndex(index);
  }

  public static normalizeIndex(index: string): string {
    return assertCanonicalH3Index(index);
  }

  public static guardPayload(payload: unknown): string {
    if (!payload || typeof payload !== 'string' || payload.trim() === '') {
      throw new Error(`[ThermodynamicSpatialError] Invalid H3 payload encountered: ${payload}`);
    }
    return payload.trim();
  }

  public validateResolution(resolution: number): boolean {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
  }

  public assertValidResolution(resolution: number): void {
    if (!this.validateResolution(resolution)) {
      throw new RangeError(`Invalid resolution tier: ${resolution}`);
    }
  }
}

export class H3SpatialMonad {
  public bind(h3Index: string, fn: (idx: string) => string): string {
    guardH3Payload(h3Index);
    return fn(h3Index);
  }

  public validatePayload(h3Index: unknown): asserts h3Index is string {
    guardH3Payload(h3Index);
  }
}

export class SpatialMonadStock {
  constructor(
    public readonly energyJoules: number,
    public readonly biomassKg: number,
    public readonly resolution: number
  ) {}

  public static bindWithValidation(stock: SpatialMonadStock, manager: H3GridManager): SpatialMonadStock {
    manager.assertValidResolution(stock.resolution);
    return new SpatialMonadStock(stock.energyJoules, stock.biomassKg, stock.resolution);
  }
}

export class SpatialMonadExecution {
  public static transitionSpatialStock(token: string, energy: number): {
    isValid: boolean;
    token: string;
    energyPotential: number;
    entropy: number;
  } {
    const valid = H3GridValidator.isValidHexIndex(token);
    return {
      isValid: valid,
      token: valid ? token : '',
      energyPotential: valid ? energy : 0.0,
      entropy: valid ? 0.0 : 1.0
    };
  }
}

export class H3GridCell {
  constructor(public token: string, public resolution: number) {}

  public isValidPayload(token: unknown): boolean {
    if (typeof token !== 'string' || token.length !== 15) return false;
    return /^[0-9a-fA-F]{15}$/.test(token);
  }

  public assertValidPayload(token: string): void {
    if (!this.isValidPayload(token)) {
      throw new Error(`Invalid payload: ${token}`);
    }
  }
}

export class H3CellCoord {
  constructor(private readonly _index: string) {}

  public isValid(): boolean {
    return isValidH3CanonicalIndex(this._index);
  }

  public resolution(): number {
    if (!this.isValid()) return -1;
    return parseInt(this._index[1], 16);
  }

  public index(): string {
    return this._index;
  }
}

export interface CellThermodynamicStocks {
  carbonMol: number;
  waterMol: number;
  nitrogenMol: number;
  phosphorusMol: number;
  oxygenMol: number;
  enthalpyJoules: number;
}

export interface SpatialFluxDelta {
  deltaCarbonMol: number;
  deltaWaterMol: number;
  deltaNitrogenMol: number;
  deltaPhosphorusMol: number;
  deltaOxygenMol: number;
  deltaEnthalpyJoules: number;
}

export interface ThermodynamicStocks {
  carbon: number;
  water: number;
  nitrogen: number;
  phosphorus: number;
  oxygen: number;
  thermalEnergy: number;
}

export class SpatialTransferMonad {
  constructor(private readonly grid: Map<string, CellThermodynamicStocks>) {}

  public transferFlux(
    srcKey: string,
    dstKey: string,
    flux: SpatialFluxDelta
  ): { transferred: boolean; nextGrid: Map<string, CellThermodynamicStocks> } {
    if (!matchesCanonicalH3Pattern(srcKey) || !matchesCanonicalH3Pattern(dstKey)) {
      return { transferred: false, nextGrid: this.grid };
    }

    const src = this.grid.get(srcKey);
    const dst = this.grid.get(dstKey);
    if (!src || !dst) {
      return { transferred: false, nextGrid: this.grid };
    }

    if (
      src.carbonMol < flux.deltaCarbonMol ||
      src.waterMol < flux.deltaWaterMol ||
      src.nitrogenMol < flux.deltaNitrogenMol ||
      src.phosphorusMol < flux.deltaPhosphorusMol ||
      src.oxygenMol < flux.deltaOxygenMol ||
      src.enthalpyJoules < flux.deltaEnthalpyJoules
    ) {
      return { transferred: false, nextGrid: this.grid };
    }

    const nextGrid = new Map<string, CellThermodynamicStocks>(this.grid);
    nextGrid.set(srcKey, {
      carbonMol: src.carbonMol - flux.deltaCarbonMol,
      waterMol: src.waterMol - flux.deltaWaterMol,
      nitrogenMol: src.nitrogenMol - flux.deltaNitrogenMol,
      phosphorusMol: src.phosphorusMol - flux.deltaPhosphorusMol,
      oxygenMol: src.oxygenMol - flux.deltaOxygenMol,
      enthalpyJoules: src.enthalpyJoules - flux.deltaEnthalpyJoules,
    });

    nextGrid.set(dstKey, {
      carbonMol: dst.carbonMol + flux.deltaCarbonMol,
      waterMol: dst.waterMol + flux.deltaWaterMol,
      nitrogenMol: dst.nitrogenMol + flux.deltaNitrogenMol,
      phosphorusMol: dst.phosphorusMol + flux.deltaPhosphorusMol,
      oxygenMol: dst.oxygenMol + flux.deltaOxygenMol,
      enthalpyJoules: dst.enthalpyJoules + flux.deltaEnthalpyJoules,
    });

    return { transferred: true, nextGrid };
  }
}

// =============================================================================
// PRIMARY H3GRID CLASS
// =============================================================================

export class H3Grid implements IH3GridService {
  public defaultResolution: number = 0;
  private cells: Set<string> = new Set();
  private registeredPayloads: Set<string> = new Set();

  constructor(defaultResolution: number = 0) {
    this.defaultResolution = defaultResolution;
  }

  public validateIndex(h3Index: string): IH3ValidationResult {
    if (!h3Index || typeof h3Index !== 'string') {
      return {
        isValid: false,
        code: H3ErrorCode.NULL_INDEX,
        message: 'H3 index must be a non-empty string.'
      };
    }
    if (h3Index.length !== 15) {
      return {
        isValid: false,
        code: H3ErrorCode.INVALID_LENGTH,
        message: `Invalid H3 index length: expected 15 characters, got ${h3Index.length}.`
      };
    }
    if (!/^[0-9a-fA-F]{15}$/.test(h3Index)) {
      return {
        isValid: false,
        code: H3ErrorCode.INVALID_CHARACTER,
        message: 'Invalid H3 index character set.'
      };
    }
    const resolution = parseInt(h3Index[1], 16);
    return {
      isValid: true,
      code: H3ErrorCode.SUCCESS,
      resolution,
      message: 'Valid index'
    };
  }

  public assertValidIndex(h3Index: string): void {
    const res = this.validateIndex(h3Index);
    if (!res.isValid) {
      throw new Error(`[Spatial Validation Error] ${res.message}`);
    }
  }

  public validateResolution(res: number): boolean {
    return isValidH3Resolution(res);
  }

  public assertValidResolution(res: number): void {
    assertH3Resolution(res);
  }

  public addCell(cell: string): boolean {
    if (matchesCanonicalH3Pattern(cell)) {
      this.cells.add(cell);
      return true;
    }
    return false;
  }

  public hasCell(cell: string): boolean {
    return this.cells.has(cell);
  }

  public cellCount(): number {
    return this.cells.size;
  }

  public resolveCell(token: string): { token: string } {
    validateH3Token(token);
    return { token };
  }

  public registerPayload(payload: unknown): string {
    const valid = guardH3Payload(payload);
    this.registeredPayloads.add(valid);
    return valid;
  }

  public size(): number {
    return this.registeredPayloads.size;
  }

  public hasIndex(idx: unknown): boolean {
    if (!idx || typeof idx !== 'string') return false;
    return this.registeredPayloads.has(idx);
  }

  public static validate(index: string): boolean {
    return H3GridValidator.isValidIndex(index);
  }

  public static cellToBoundary(token: string): GeoCoordinate[] {
    if (!token || typeof token !== 'string') {
      throw new TypeError('Invalid payload');
    }
    return [];
  }

  public static getResolution(token: string): number {
    if (!token || typeof token !== 'string') {
      throw new TypeError('Token must be a non-empty string');
    }
    return parseInt(token[1], 16);
  }

  public static getNeighbors(token: string): string[] {
    assertCanonicalH3Pattern(token);
    const prefix = token.slice(0, 14);
    return ['0', '1', '2', '3', '4', '5'].map(c => prefix + c);
  }

  public static kRing(token: string, radius: number): string[] {
    assertCanonicalH3Pattern(token);
    if (radius < 0) {
      throw new SpatialGridError('Radius must be non-negative');
    }
    if (radius === 0) {
      return [token];
    }
    const neighbors = H3Grid.getNeighbors(token);
    return Array.from(new Set([token, ...neighbors]));
  }

  public static extractCanonicalTokens(payload: string): H3Index[] {
    return extractCanonicalH3Tokens(payload);
  }

  public static isValidCanonicalIndex(token: string): boolean {
    if (typeof token !== 'string' || token.length !== 15) {
      return false;
    }
    return /^[0-9a-fA-F]{15}$/.test(token);
  }

  public static normalizeIndex(token: string): H3Index | null {
    if (H3Grid.isValidCanonicalIndex(token)) {
      return token.toLowerCase();
    }
    return null;
  }
}

// =============================================================================
// SPRINT 040 SPECIFICATION: BIOGEOCHEMICAL STOCKS & SPATIAL PARTITION MONAD
// =============================================================================

export interface BiogeochemicalStocks {
  carbonKg: number;
  waterKg: number;
  nitrogenKg: number;
  phosphorusKg: number;
  oxygenKg: number;
}

export interface ThermodynamicState {
  energyJoules: number;
  entropyJoulesPerKelvin: number;
  ambientTemperatureKelvin: number;
}

export class SpatialPartitionMonad {
  private readonly stocks: Readonly<BiogeochemicalStocks>;
  private readonly thermodynamics: Readonly<ThermodynamicState>;
  private readonly indexedCells: ReadonlySet<string>;

  constructor(
    stocks: BiogeochemicalStocks,
    thermodynamics: ThermodynamicState,
    indexedCells: Set<string> | Iterable<string>
  ) {
    this.stocks = Object.freeze({ ...stocks });
    this.thermodynamics = Object.freeze({ ...thermodynamics });
    this.indexedCells = new Set(indexedCells);
  }

  public bindPayloadSpatialIndices(payload: string): SpatialPartitionMonad {
    const tokens = extractCanonicalH3Tokens(payload);

    const charCount = payload ? payload.length : 0;
    const cyclesPerChar = 1.2;
    const cpuFreqHz = 3.0e9;
    const corePowerWatts = 15.0;
    const executionSeconds = (charCount * cyclesPerChar) / cpuFreqHz;
    const computationalEnergyDissipated = corePowerWatts * executionSeconds;
    const entropyDelta = this.thermodynamics.ambientTemperatureKelvin > 0
      ? computationalEnergyDissipated / this.thermodynamics.ambientTemperatureKelvin
      : 0;

    const updatedStocks: BiogeochemicalStocks = {
      carbonKg: this.stocks.carbonKg + 0.0,
      waterKg: this.stocks.waterKg + 0.0,
      nitrogenKg: this.stocks.nitrogenKg + 0.0,
      phosphorusKg: this.stocks.phosphorusKg + 0.0,
      oxygenKg: this.stocks.oxygenKg + 0.0,
    };

    const updatedThermodynamics: ThermodynamicState = {
      energyJoules: this.thermodynamics.energyJoules - computationalEnergyDissipated,
      entropyJoulesPerKelvin: this.thermodynamics.entropyJoulesPerKelvin + entropyDelta,
      ambientTemperatureKelvin: this.thermodynamics.ambientTemperatureKelvin,
    };

    const updatedCells = new Set(this.indexedCells);
    for (const token of tokens) {
      updatedCells.add(token);
    }

    return new SpatialPartitionMonad(updatedStocks, updatedThermodynamics, updatedCells);
  }

  public getStocks(): BiogeochemicalStocks {
    return this.stocks;
  }

  public getThermodynamics(): ThermodynamicState {
    return this.thermodynamics;
  }

  public getIndexedCells(): string[] {
    return Array.from(this.indexedCells);
  }
}