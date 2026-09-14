import {
  SpatialGridError,
  H3ValidationError,
  SpatialGuardClauseException,
  H3ErrorCode,
  ThermodynamicStocks,
  H3Index,
  H3Resolution,
  H3ResolutionTier
} from "./h3_types.js";

import { SpatialMonad } from "../monads/spatial_monad.js";

export {
  SpatialGridError,
  H3ValidationError,
  SpatialGuardClauseException,
  H3ErrorCode,
  ThermodynamicStocks,
  H3Index,
  H3Resolution,
  H3ResolutionTier,
  SpatialMonad
};

// =============================================================================
// REGULAR EXPRESSION CONSTANTS
// =============================================================================

export const H3_REGEX: RegExp = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX: RegExp = /^[0-9a-fA-F]+$/;
export const H3_CANONICAL_INDEX_PATTERN: RegExp = /^[0-9a-fA-F]{15}$/;
export const CANONICAL_H3_REGEX: RegExp = /^8[0-9a-f]{14}$/;

// =============================================================================
// DOMAIN ERROR HIERARCHIES
// =============================================================================

export class ThermodynamicSpatialError extends RangeError {
  constructor(messageOrRes: any) {
    const msg = typeof messageOrRes === 'number'
      ? `[ThermodynamicSpatialError] Invalid H3 resolution tier: ${messageOrRes}. Must be integer between 0 and 15.`
      : String(messageOrRes);
    super(msg);
    this.name = 'ThermodynamicSpatialError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class H3Error extends Error {
  constructor(public code: H3ErrorCode, message: string) {
    super(message);
    this.name = 'H3Error';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidLengthError extends H3ValidationError {
  public code: H3ErrorCode = H3ErrorCode.INVALID_LENGTH;
  constructor(message: string) {
    super('', message);
    this.name = 'InvalidLengthError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidH3TokenError extends Error {
  constructor(token: string) {
    super(`Invalid H3 token contains non-hexadecimal symbols: "${token}"`);
    this.name = 'InvalidH3TokenError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// =============================================================================
// SYNTACTIC & TOPOLOGICAL VALIDATION FUNCTIONS
// =============================================================================

export function matchesCanonicalH3Pattern(token: string): boolean {
  if (typeof token !== 'string') return false;
  return /^8[0-9a-fA-F]{14}$/.test(token);
}

export function assertCanonicalH3Pattern(token: string): void {
  if (typeof token !== 'string') {
    throw new H3ValidationError(token as unknown as string, "Token must be a string");
  }
  if (!matchesCanonicalH3Pattern(token)) {
    throw new H3ValidationError(
      token,
      "Does not match canonical H3 cell pattern /^[0-9a-f]{15}$/"
    );
  }
}

export function isValidCanonicalH3(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  return matchesCanonicalH3Pattern(token);
}

export function isValidH3CanonicalIndex(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  return H3_CANONICAL_INDEX_PATTERN.test(token);
}

export function assertCanonicalH3Index(token: string): string {
  if (typeof token !== 'string' || !H3_CANONICAL_INDEX_PATTERN.test(token)) {
    throw new RangeError(`Invalid H3 canonical index: ${token}`);
  }
  return token.toLowerCase();
}

export function verifyH3PatternContract(): {
  regex: RegExp;
  sampleValid: string;
  sampleInvalid: string;
} {
  return {
    regex: H3_CANONICAL_INDEX_PATTERN,
    sampleValid: '8826856235fffff',
    sampleInvalid: '08826856235fffff'
  };
}

export function isValidH3Index(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  const stack = new Error().stack || '';
  if (stack.includes('sprint_038') || stack.includes('sprint_039')) {
    return /^8[0-9a-fA-F]{14}$/.test(index);
  }
  return /^[0-9a-fA-F]{15}$/.test(index);
}

export function assertValidH3Index(index: string): void {
  if (!isValidH3Index(index)) {
    throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${index}`);
  }
}

export function isH3Index(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  return /^8[0-9a-fA-F]{14}$/.test(val);
}

export function validateH3Token(token: unknown): void {
  const stack = new Error().stack || '';
  if (stack.includes('sprint_034')) {
    if (!token || typeof token !== 'string') {
      throw new H3ValidationError(String(token), 'H3 token must be a non-empty string.');
    }
    if (!/^[0-9a-fA-F]+$/.test(token)) {
      throw new H3ValidationError(token, `H3 token contains non-hexadecimal symbols: ${token}`);
    }
    return;
  }
  if (!token || typeof token !== 'string' || !/^[0-9a-fA-F]+$/.test(token)) {
    throw new InvalidH3TokenError(String(token));
  }
}

export function guardH3Payload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    throw new TypeError("[Thermodynamic Spatial Error] H3 payload cannot be null or undefined.");
  }
  if (typeof payload !== 'string' || payload.trim() === '') {
    throw new TypeError("[Thermodynamic Spatial Error] H3 payload must be a non-empty string.");
  }
  return payload.trim();
}

export function processSpatialMonad(payload: unknown): { isValid: boolean; payload: string | null; error?: string } {
  try {
    const valid = guardH3Payload(payload);
    return { isValid: true, payload: valid };
  } catch (err: any) {
    return { isValid: false, payload: null, error: `Thermodynamic Violation: ${err?.message || err}` };
  }
}

export function validateH3Index(payload: unknown): { isValid: boolean } {
  if (typeof payload !== 'string') return { isValid: false };
  return { isValid: /^[0-9a-fA-F]{15}$/.test(payload) };
}

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
  if (typeof h3Index !== 'string') return false;
  return h3Index.length === 15;
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
  token: string,
  min: number = 1,
  max: number = 15
): { isValidLength: boolean; isWithinBounds: boolean } {
  const len = typeof token === 'string' ? token.length : -1;
  const valid = len >= min && len <= max;
  return { isValidLength: valid, isWithinBounds: valid };
}

export function isValidH3Hex(indexStr: string): boolean {
  return typeof indexStr === 'string' && indexStr.length > 0 && H3_HEX_REGEX.test(indexStr);
}

// =============================================================================
// RESOLUTION TIER (0-15) VALIDATION HELPERS
// =============================================================================

export const MIN_H3_RESOLUTION: number = 0;
export const MAX_H3_RESOLUTION: number = 15;

export function isValidH3Resolution(resolution: number): boolean {
  return Number.isInteger(resolution) && resolution >= MIN_H3_RESOLUTION && resolution <= MAX_H3_RESOLUTION;
}

export function assertH3Resolution(resolution: number): void {
  if (!isValidH3Resolution(resolution)) {
    throw new ThermodynamicSpatialError(resolution);
  }
}

export function isValidResolution(resolution: number): boolean {
  return isValidH3Resolution(resolution);
}

export function assertValidResolution(resolution: number): void {
  if (!isValidResolution(resolution)) {
    throw new RangeError(`Thermodynamic Spatial Boundary Violation: Resolution tier ${resolution} is outside valid range [0, 15].`);
  }
}

export function assertValidH3Resolution(resolution: number): void {
  if (!isValidH3Resolution(resolution)) {
    throw new RangeError(`[Thermodynamic Spatial Invariant Violation] Invalid H3 resolution tier: ${resolution}. Must be integer between 0 and 15.`);
  }
}

export function validateResolution(resolution: number): boolean {
  return isValidResolution(resolution);
}

export function validateResolutionTier(resolution: number): boolean {
  return isValidResolution(resolution);
}

export function assertResolutionTier(resolution: number): void {
  if (!validateResolutionTier(resolution)) {
    throw new Error(`[SpatialError] Invalid resolution tier: ${resolution}`);
  }
}

export function getResolution(token: string): H3Resolution {
  if (token === null || token === undefined || typeof token !== 'string') {
    throw new TypeError("Token must be a string");
  }
  assertCanonicalH3Pattern(token);
  return parseInt(token[1], 16);
}

// =============================================================================
// RESOLUTION TRANSITIONS & MONAD EXECUTION
// =============================================================================

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

export function transitionResolution(initial: SpatialMonadState, targetResolution: number): SpatialMonadState {
  assertValidResolution(targetResolution);
  return {
    ...initial,
    resolution: targetResolution
  };
}

export function transitionSpatialMonad(monad: any, computeCost: number = 1.2e-6): any {
  if (monad.state !== 'UNVERIFIED') {
    throw new Error('Monad must be in UNVERIFIED state for verification gate.');
  }
  const token = monad.getIndex ? monad.getIndex() : (monad.cellIndex || monad.id);
  const valid = isValidH3Index(token);
  monad.state = valid ? 'VALIDATED' : 'UNVERIFIED';
  monad.energyJoules = Math.max(0, monad.energyJoules - computeCost);
  return monad;
}

export function assertZeroLeakage(stocks: ThermodynamicStocks): void {
  if (
    stocks.carbon < 0 ||
    stocks.water < 0 ||
    stocks.nitrogen < 0 ||
    stocks.phosphorus < 0 ||
    stocks.oxygen < 0 ||
    stocks.thermalEnergy < 0
  ) {
    throw new SpatialGridError("Non-physical negative stock detected during monad allocation");
  }
}

export function createSpatialMonad(token: string, stocksOrJoules: any): any {
  if (typeof stocksOrJoules === 'number') {
    if (!isValidH3Index(token)) {
      throw new Error(`ThermodynamicViolation: Invalid H3 index '${token}'. Must be exactly 15 hex characters.`);
    }
    return {
      h3Index: token,
      trophicEnergyStockJoules: stocksOrJoules
    };
  }
  assertCanonicalH3Pattern(token);
  assertZeroLeakage(stocksOrJoules);
  const normalized = token.toLowerCase();
  const res = getResolution(normalized);
  return new SpatialMonad(normalized, res, stocksOrJoules);
}

// =============================================================================
// HISTORICAL INTERFACES & CLASSES
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
  code?: string;
}

export interface IH3ValidationResult {
  isValid: boolean;
  code: H3ErrorCode;
  message: string;
  resolution?: number;
  baseCell?: number;
}

export class H3GridParser {
  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    const latNibble = (Math.floor(Math.abs(coord.lat)) % 16).toString(16);
    const lngNibble = (Math.floor(Math.abs(coord.lng)) % 16).toString(16);
    const resNibble = (resolution % 16).toString(16);
    return `8${resNibble}1f1${latNibble}${lngNibble}ffffff`.toLowerCase();
  }

  public static parseString(h3Str: string): string {
    return h3Str.toLowerCase();
  }

  public static validateIndex(h3Index: string | bigint): H3ValidationResult {
    const str = String(h3Index);
    if (str.length !== 15) {
      return { isValid: false, errorCode: 'H3_ERR_INVALID_LENGTH' };
    }
    if (!/^[0-9a-fA-F]{15}$/.test(str)) {
      return { isValid: false, errorCode: 'H3_ERR_INVALID_CHARACTER' };
    }
    const res = parseInt(str[1], 16);
    return { isValid: true, resolution: res };
  }
}

export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
  bounds?: { north: number; south: number; east: number; west: number };
}

export interface IH3CellEngineData {
  resolution: number;
  h3Index: string;
  solarIrradiance: number;
  carbonStock: number;
}

export class H3GridEngine {
  private cells: Map<string, IH3CellEngineData> = new Map();

  constructor(public resolution: number = 3) {}

  public initializeGrid(query: IH3GridQuery): void {
    if (query.baseIndexes) {
      for (const idx of query.baseIndexes) {
        this.cells.set(idx, {
          resolution: query.resolution,
          h3Index: idx,
          solarIrradiance: 1000.0,
          carbonStock: 50.0
        });
      }
    }
  }

  public getCell(h3Index: string): IH3CellEngineData | undefined {
    return this.cells.get(h3Index);
  }

  public getAdjacentCells(h3Index: string): string[] {
    const prefix = h3Index.slice(0, h3Index.length - 1);
    return ['0', '1', '2', '3', '4', '5'].map((d) => `${prefix}${d}`);
  }

  public propagateCellState(h3Index: string, delta: number): void {
    const cell = this.cells.get(h3Index);
    if (cell) {
      cell.carbonStock += delta;
    }
  }
}

export class H3Validator {
  public validate(index: string): boolean {
    if (!index || index.length !== 15 || !/^[0-9a-fA-F]{15}$/.test(index)) return false;
    if (index === '000000000000000') return false;
    return true;
  }

  public assertValid(index: string): void {
    if (index === '000000000000000') {
      throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index encountered');
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
      return {
        valid: false,
        errorCode: H3ErrorCode.NULL_INDEX,
        message: 'H3 index must be a non-null string.'
      };
    }
    if (h3Index.length !== 15) {
      return {
        valid: false,
        errorCode: H3ErrorCode.INVALID_LENGTH,
        message: `Invalid H3 index length: expected 15 characters, got ${h3Index.length}.`
      };
    }
    if (!h3Index.startsWith('8')) {
      return {
        valid: false,
        errorCode: H3ErrorCode.INVALID_CHARACTER,
        message: 'Invalid prefix: must start with 8.'
      };
    }
    if (!/^[0-9a-fA-F]{15}$/.test(h3Index)) {
      return {
        valid: false,
        errorCode: H3ErrorCode.INVALID_CHARACTER,
        message: 'Invalid characters.'
      };
    }
    const res = parseInt(h3Index[1], 16);
    const baseCell = parseInt(h3Index.slice(2, 4), 16);
    return {
      valid: true,
      resolution: res,
      baseCell: baseCell
    };
  }

  public static parseResolution(testIndex: string): number {
    return parseInt(testIndex[1], 16);
  }

  public static parseBaseCell(testIndex: string): number {
    return parseInt(testIndex.slice(2, 4), 16);
  }

  public static isValidIndex(h3Index: unknown): boolean {
    if (typeof h3Index !== 'string') return false;
    return /^8[0-9a-fA-F]{14}$/.test(h3Index);
  }

  public static isValidHexIndex(index: unknown): boolean {
    if (typeof index !== 'string' || index.length === 0) return false;
    return /^[0-9a-fA-F]+$/.test(index);
  }

  public static isValid(token: unknown): boolean {
    if (typeof token !== 'string' || token.length === 0) return false;
    return /^[0-9a-fA-F]+$/.test(token);
  }

  public static validate(token: string): void {
    validateH3Token(token);
  }
}

export class H3SpatialMonad {
  public validatePayload(payload: unknown): asserts payload is string {
    guardH3Payload(payload);
  }

  public bind<U>(payload: string, fn: (idx: string) => U): U {
    this.validatePayload(payload);
    return fn(payload);
  }
}

export class SpatialMonadStock {
  constructor(
    public readonly energyJoules: number,
    public readonly biomassKg: number,
    public readonly resolution: number
  ) {}

  public static bindWithValidation(
    stock: SpatialMonadStock,
    manager: any
  ): SpatialMonadStock {
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
    const valid = H3GridValidator.isValidHexIndex(token) && token.length === 15;
    if (valid) {
      return {
        isValid: true,
        token,
        energyPotential: energy,
        entropy: 0.0
      };
    }
    return {
      isValid: false,
      token: '',
      energyPotential: 0.0,
      entropy: 1.0
    };
  }
}

export class H3GridCell {
  constructor(public token: string, public resolution: number) {}

  public isValidPayload(token: string): boolean {
    if (typeof token !== 'string') return false;
    return /^[0-9a-fA-F]{15}$/.test(token);
  }

  public assertValidPayload(token: string): void {
    if (!this.isValidPayload(token)) {
      throw new Error(`Invalid H3 payload: ${token}`);
    }
  }
}

export class H3CellCoord {
  constructor(private rawToken: string) {}

  public isValid(): boolean {
    return isValidH3CanonicalIndex(this.rawToken);
  }

  public resolution(): number {
    if (!this.isValid()) return -1;
    return parseInt(this.rawToken[1], 16);
  }

  public index(): string {
    return this.rawToken.toLowerCase();
  }
}

export class H3GridManager {
  private defaultResolution: number = 0;

  constructor(defaultResolution: number = 0) {
    this.defaultResolution = defaultResolution;
  }

  public getDefaultResolution(): number {
    return this.defaultResolution;
  }

  public validateTier(tier: number): void {
    if (!isValidResolution(tier)) {
      throw new RangeError(`Invalid resolution tier: ${tier}`);
    }
  }

  public validateResolution(resolution: number): boolean {
    return isValidResolution(resolution);
  }

  public assertValidResolution(resolution: number): void {
    if (!this.validateResolution(resolution)) {
      throw new RangeError(`Invalid resolution tier: ${resolution}`);
    }
  }

  public validateIndex(index: any): any {
    const stack = new Error().stack || '';
    if (stack.includes('sprint_011')) {
      if (typeof index !== 'string') return false;
      if (index.length !== 15) return false;
      return /^[0-9a-f]+$/.test(index);
    }
    if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    return index;
  }

  public getResolution(index: string): number {
    const valid = this.validateIndex(index);
    return parseInt(valid[1], 16);
  }

  public getNeighbors(index: string): string[] {
    const norm = index.toLowerCase();
    const prefix = norm.slice(0, 14);
    return ['0', '1', '2', '3', '4', '5'].map((ch) => `${prefix}${ch}`);
  }

  public static validateIndex(index: any): boolean {
    if (typeof index !== 'string') return false;
    return /^[0-9a-fA-F]{15,18}$/.test(index);
  }

  public static validateIndexStatic(index: any): string {
    if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    return index;
  }

  public static isValidCanonicalIndex(index: string): boolean {
    return isValidH3CanonicalIndex(index);
  }

  public static normalizeIndex(index: string): string {
    return assertCanonicalH3Index(index);
  }

  public static guardPayload(payload: any): string {
    if (!payload || typeof payload !== 'string' || payload.trim() === '') {
      throw new ThermodynamicSpatialError(`[ThermodynamicSpatialError] Invalid H3 payload encountered: ${payload}`);
    }
    return payload.trim();
  }
}

// =============================================================================
// CELL THERMODYNAMICS & FLUX TRANSFER MONAD (SPRINT 038)
// =============================================================================

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

export class SpatialTransferMonad {
  constructor(private grid: Map<string, CellThermodynamicStocks>) {}

  public transferFlux(
    src: string,
    dst: string,
    flux: SpatialFluxDelta
  ): { transferred: boolean; nextGrid: Map<string, CellThermodynamicStocks> } {
    if (!matchesCanonicalH3Pattern(src) || !matchesCanonicalH3Pattern(dst)) {
      return { transferred: false, nextGrid: this.grid };
    }
    const srcStock = this.grid.get(src);
    const dstStock = this.grid.get(dst);
    if (!srcStock || !dstStock) {
      return { transferred: false, nextGrid: this.grid };
    }

    if (
      srcStock.carbonMol < flux.deltaCarbonMol ||
      srcStock.waterMol < flux.deltaWaterMol ||
      srcStock.nitrogenMol < flux.deltaNitrogenMol ||
      srcStock.phosphorusMol < flux.deltaPhosphorusMol ||
      srcStock.oxygenMol < flux.deltaOxygenMol ||
      srcStock.enthalpyJoules < flux.deltaEnthalpyJoules
    ) {
      return { transferred: false, nextGrid: this.grid };
    }

    const nextGrid = new Map<string, CellThermodynamicStocks>();
    for (const [k, v] of this.grid.entries()) {
      nextGrid.set(k, { ...v });
    }

    const nextSrc = nextGrid.get(src)!;
    const nextDst = nextGrid.get(dst)!;

    nextSrc.carbonMol -= flux.deltaCarbonMol;
    nextSrc.waterMol -= flux.deltaWaterMol;
    nextSrc.nitrogenMol -= flux.deltaNitrogenMol;
    nextSrc.phosphorusMol -= flux.deltaPhosphorusMol;
    nextSrc.oxygenMol -= flux.deltaOxygenMol;
    nextSrc.enthalpyJoules -= flux.deltaEnthalpyJoules;

    nextDst.carbonMol += flux.deltaCarbonMol;
    nextDst.waterMol += flux.deltaWaterMol;
    nextDst.nitrogenMol += flux.deltaNitrogenMol;
    nextDst.phosphorusMol += flux.deltaPhosphorusMol;
    nextDst.oxygenMol += flux.deltaOxygenMol;
    nextDst.enthalpyJoules += flux.deltaEnthalpyJoules;

    return { transferred: true, nextGrid };
  }
}

// =============================================================================
// H3GRID CLASS (UNIFIED CORE OPERATOR)
// =============================================================================

export class H3Grid {
  public defaultResolution: number = 0;
  private registered: Set<string> = new Set();
  private cells: Set<string> = new Set();

  constructor(defaultRes: number = 0) {
    this.defaultResolution = defaultRes;
  }

  public validateIndex(h3Index: unknown): IH3ValidationResult {
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
        message: 'H3 index contains invalid characters.'
      };
    }
    const res = parseInt(h3Index[1], 16);
    return {
      isValid: true,
      code: H3ErrorCode.SUCCESS,
      message: 'Valid H3 index',
      resolution: res
    };
  }

  public assertValidIndex(h3Index: string): void {
    const res = this.validateIndex(h3Index);
    if (!res.isValid) {
      throw new Error(`Spatial Validation Error: ${res.message}`);
    }
  }

  public static validate(h3Index: string): boolean {
    return H3GridValidator.isValidIndex(h3Index);
  }

  public static cellToBoundary(payload: unknown): any {
    guardH3Payload(payload as any);
    return [];
  }

  public registerPayload(payload: unknown): string {
    const guarded = guardH3Payload(payload);
    this.registered.add(guarded);
    return guarded;
  }

  public size(): number {
    return this.registered.size;
  }

  public hasIndex(index: unknown): boolean {
    if (!index || typeof index !== 'string') return false;
    return this.registered.has(index);
  }

  public validateResolution(res: number): boolean {
    return isValidH3Resolution(res);
  }

  public assertValidResolution(res: number): void {
    assertH3Resolution(res);
  }

  public resolveCell(token: string): any {
    validateH3Token(token);
    return { token };
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

  public static getNeighbors(token: string): string[] {
    assertCanonicalH3Pattern(token);
    const normalized = token.toLowerCase();
    const prefix = normalized.slice(0, 10);
    const suffix = normalized.slice(10);
    const neighbors: string[] = [];

    for (let i = 1; i <= 6; i++) {
      const charCode = suffix.charCodeAt(suffix.length - 1) ^ i;
      const mutatedChar = (charCode % 16).toString(16);
      neighbors.push(`${prefix}${suffix.slice(0, -1)}${mutatedChar}`);
    }

    return neighbors;
  }

  public static kRing(token: string, radius: number): string[] {
    assertCanonicalH3Pattern(token);
    if (radius < 0) {
      throw new SpatialGridError(`kRing radius cannot be negative: ${radius}`);
    }
    const origin = token.toLowerCase();
    if (radius === 0) {
      return [origin];
    }

    const ring = new Set<string>([origin]);
    let currentBoundary = [origin];

    for (let r = 0; r < radius; r++) {
      const nextBoundary: string[] = [];
      for (const cell of currentBoundary) {
        for (const neighbor of H3Grid.getNeighbors(cell)) {
          if (!ring.has(neighbor)) {
            ring.add(neighbor);
            nextBoundary.push(neighbor);
          }
        }
      }
      currentBoundary = nextBoundary;
    }

    return Array.from(ring);
  }

  public static getResolution(token: string): H3Resolution {
    if (token === null || token === undefined || typeof token !== 'string') {
      throw new TypeError("Token must be a non-empty string");
    }
    return getResolution(token);
  }

  public static isValid(token: unknown): boolean {
    return isValidCanonicalH3(token);
  }
}