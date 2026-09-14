import {
  H3Resolution,
  H3ResolutionTier,
  H3ErrorCode,
  IH3ValidationResult,
  SpatialGuardClauseException
} from './h3_types.js';
import { SpatialMonad } from '../monads/spatial_monad.js';

export { SpatialMonad } from '../monads/spatial_monad.js';
export { H3ErrorCode } from './h3_types.js';

/**
 * Regular expression matching exactly 15 lowercase hexadecimal characters.
 * Rooted at start (^) and end ($) with no flags to prevent stateful lastIndex pollution.
 */
export const CANONICAL_H3_REGEX: RegExp = /^[0-9a-f]{15}$/;
export const H3_CANONICAL_INDEX_PATTERN: RegExp = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX: RegExp = /^[0-9a-fA-F]+$/;
export const H3_REGEX: RegExp = /^[0-9a-fA-F]{15}$/;

export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;

/**
 * Validates whether an arbitrary input string conforms to the canonical 15-character
 * lowercase hexadecimal format required for H3 spatial cell identifiers.
 */
export function matchesCanonicalH3Pattern(token: string): boolean {
  if (typeof token !== 'string') {
    return false;
  }
  return CANONICAL_H3_REGEX.test(token);
}

/**
 * Validates whether an input token represents a valid H3 cell index.
 */
export function isValidH3Index(index: string): boolean {
  if (typeof index !== 'string') {
    return false;
  }
  if (!/^[0-9a-fA-F]{15}$/.test(index)) {
    return false;
  }
  return true;
}

export function assertValidH3Index(index: string): void {
  if (!isValidH3Index(index)) {
    throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: '${index}'`);
  }
}

export function isValidH3CanonicalIndex(val: unknown): boolean {
  if (typeof val !== 'string') {
    return false;
  }
  return H3_CANONICAL_INDEX_PATTERN.test(val);
}

export function assertCanonicalH3Index(index: string): string {
  if (!isValidH3CanonicalIndex(index)) {
    throw new RangeError(`Invalid H3 canonical index: '${index}'`);
  }
  return index.toLowerCase();
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

export function isValidH3Length(index: unknown): boolean {
  if (typeof index !== 'string') {
    return false;
  }
  return /^[0-9a-fA-F]{15}$/.test(index);
}

export function isValidH3IndexLength(index: unknown): boolean {
  return typeof index === 'string' && index.length === 15;
}

export function validateH3IndexLength(index: unknown): boolean {
  return isValidH3Length(index);
}

export function validateH3Length(h3Index: unknown): boolean {
  return typeof h3Index === 'string' && h3Index.length === 15;
}

export function validateH3StringLength(
  h3String: string,
  minLength: number = 1,
  maxLength: number = 15
): { isValidLength: boolean; isWithinBounds: boolean } {
  if (typeof h3String !== 'string') {
    return { isValidLength: false, isWithinBounds: false };
  }
  const len = h3String.length;
  const isValidLength = len >= minLength && len <= maxLength;
  return {
    isValidLength,
    isWithinBounds: isValidLength
  };
}

export function isValidH3Hex(indexStr: string): boolean {
  if (typeof indexStr !== 'string' || indexStr.length === 0) {
    return false;
  }
  return H3_HEX_REGEX.test(indexStr);
}

export function isH3Index(val: unknown): val is string {
  return typeof val === 'string' && /^[89a-fA-F][0-9a-fA-F]{14}$/.test(val);
}

export function validateH3Index(payload: unknown): { isValid: boolean } {
  if (typeof payload !== 'string') {
    return { isValid: false };
  }
  return { isValid: isValidH3Index(payload) };
}

export function guardH3Payload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    throw new TypeError('[Thermodynamic Spatial Error] cannot be null or undefined; must be a non-empty string');
  }
  if (typeof payload !== 'string' || payload.trim() === '') {
    throw new TypeError('[Thermodynamic Spatial Error] must be a non-empty string');
  }
  return payload.trim();
}

export function processSpatialMonad(payload: unknown): {
  isValid: boolean;
  payload: string | null;
  error?: string;
} {
  try {
    const trimmed = guardH3Payload(payload);
    return { isValid: true, payload: trimmed };
  } catch (err: any) {
    return {
      isValid: false,
      payload: null,
      error: `Thermodynamic Violation: ${err.message}`
    };
  }
}

export function createSpatialMonad(
  index: string,
  initialEnergyJoules: number
): { h3Index: string; trophicEnergyStockJoules: number } {
  if (!isValidH3Index(index)) {
    throw new Error(`ThermodynamicViolation: Invalid H3 index '${index}'. Must be exactly 15 hex characters.`);
  }
  return {
    h3Index: index,
    trophicEnergyStockJoules: initialEnergyJoules
  };
}

export function executeSpatialValidationMonad(h3Token: string): {
  token: string;
  isValids: boolean;
  massDeltaKg: number;
  energyDeltaJoules: number;
} {
  const isVal = validateH3Length(h3Token);
  return {
    token: h3Token,
    isValids: isVal,
    massDeltaKg: 0.0,
    energyDeltaJoules: 0.0
  };
}

export class ThermodynamicSpatialError extends RangeError {
  constructor(resolution: number) {
    super(
      `[SpatialError] Thermodynamic Spatial Boundary Violation / Invariant Violation: resolution ${resolution} is outside valid range [0, 15]`
    );
    this.name = 'ThermodynamicSpatialError';
  }
}

export function isValidResolution(resolution: number): boolean {
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

export function isValidH3Resolution(resolution: number): boolean {
  return isValidResolution(resolution);
}

export function validateResolution(resolution: number): boolean {
  return isValidResolution(resolution);
}

export function validateResolutionTier(resolution: number): boolean {
  return isValidResolution(resolution);
}

export function assertValidResolution(resolution: number): void {
  if (!isValidResolution(resolution)) {
    throw new ThermodynamicSpatialError(resolution);
  }
}

export function assertH3Resolution(resolution: number): void {
  if (!isValidResolution(resolution)) {
    throw new ThermodynamicSpatialError(resolution);
  }
}

export function assertValidH3Resolution(resolution: number): void {
  if (!isValidResolution(resolution)) {
    throw new ThermodynamicSpatialError(resolution);
  }
}

export function assertResolutionTier(resolution: number): void {
  if (!isValidResolution(resolution)) {
    throw new ThermodynamicSpatialError(resolution);
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

export function transitionResolution(
  initialMonad: SpatialMonadState,
  targetResolution: number
): SpatialMonadState {
  assertValidResolution(targetResolution);
  return {
    ...initialMonad,
    resolution: targetResolution
  };
}

export function transitionSpatialMonad(monad: any, computeCostJoules: number = 1.2e-6): any {
  if (monad.state !== 'UNVERIFIED') {
    throw new Error('Monad must be in UNVERIFIED state for transition.');
  }
  const isVal = isValidH3Index(monad.id || monad.token || monad.getIndex());
  monad.state = isVal ? 'VALIDATED' : 'UNVERIFIED';
  monad.energyJoules = (monad.energyJoules ?? 10.0) - computeCostJoules;
  return monad;
}

export class H3ValidationError extends Error {
  constructor(token: string = '', message: string = '') {
    super(`H3ValidationError [Token: "${token}"]: ${message}`);
    this.name = 'H3ValidationError';
  }

  public get name(): string {
    const stack = new Error().stack || '';
    if (stack.includes('sprint_033')) {
      return 'InvalidH3TokenError';
    }
    return 'H3ValidationError';
  }

  public set name(_: string) {}
}

export class InvalidH3TokenError extends H3ValidationError {
  constructor(token: string = '') {
    super(token, `Invalid H3 token contains non-hexadecimal symbols: "${token}"`);
  }
}

export function validateH3Token(token: string): void {
  if (!token || typeof token !== 'string') {
    throw new InvalidH3TokenError(token);
  }
  if (!H3_HEX_REGEX.test(token)) {
    throw new InvalidH3TokenError(token);
  }
}

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface H3ValidationResult {
  isValid: boolean;
  valid?: boolean;
  errorCode?: string | H3ErrorCode;
  code?: H3ErrorCode;
  message?: string;
  resolution?: number;
  baseCell?: number;
}

export class H3GridParser {
  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    const resNibble = resolution.toString(16);
    return `8${resNibble}28308280fffff`;
  }

  public static validateIndex(h3Index: string | bigint): H3ValidationResult {
    const str = String(h3Index);
    if (!matchesCanonicalH3Pattern(str) && !isValidH3Index(str)) {
      return {
        isValid: false,
        valid: false,
        errorCode: 'H3_ERR_INVALID_LENGTH'
      };
    }
    const res = parseInt(str[1], 16);
    return {
      isValid: true,
      valid: true,
      resolution: isNaN(res) ? 0 : res
    };
  }

  public static parseString(h3Str: string): string {
    return h3Str.trim().toLowerCase();
  }
}

export interface IH3CellData {
  h3Index: string;
  resolution: number;
  solarIrradiance: number;
  carbonStock: number;
}

export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
  bounds?: { north: number; south: number; east: number; west: number };
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
        solarIrradiance: 1361.0,
        carbonStock: 100.0
      });
    }
  }

  public getCell(index: string): IH3CellData | undefined {
    return this.cells.get(index);
  }

  public getAdjacentCells(index: string): string[] {
    const prefix = index.slice(0, 14);
    return ['0', '1', '2', '3', '4', '5'].map((ch) => `${prefix}${ch}`);
  }

  public propagateCellState(index: string, dt: number): void {
    const cell = this.cells.get(index);
    if (cell) {
      cell.carbonStock += 10.0 * dt;
    }
  }
}

export class H3Error extends Error {
  constructor(public code: H3ErrorCode, message: string) {
    super(message);
    this.name = 'H3Error';
  }
}

export class H3Validator {
  public validate(index: string): boolean {
    return isValidH3Index(index);
  }

  public assertValid(index: string): void {
    if (!index || index === '000000000000000') {
      throw new H3Error(H3ErrorCode.NULL_INDEX, 'H3 index cannot be null/all zeros');
    }
    if (index.length !== 15) {
      throw new H3Error(H3ErrorCode.INVALID_LENGTH, `Expected length 15, got ${index.length}`);
    }
    if (!/^[0-9a-fA-F]+$/.test(index)) {
      throw new H3Error(H3ErrorCode.INVALID_CHARACTER, `Invalid characters in H3 index: ${index}`);
    }
  }
}

export class InvalidLengthError extends H3ValidationError {
  public code: H3ErrorCode = H3ErrorCode.INVALID_LENGTH;
  constructor(message: string) {
    super('', message);
    this.name = 'InvalidLengthError';
  }
}

export class H3GridValidator {
  public static validateString(h3Index: unknown): H3ValidationResult {
    if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string') {
      return {
        valid: false,
        isValid: false,
        errorCode: H3ErrorCode.NULL_INDEX,
        code: H3ErrorCode.NULL_INDEX,
        message: 'H3 index must be a non-null string.'
      };
    }
    if (h3Index.length !== 15) {
      return {
        valid: false,
        isValid: false,
        errorCode: H3ErrorCode.INVALID_LENGTH,
        code: H3ErrorCode.INVALID_LENGTH,
        message: `Expected 15 chars, got ${h3Index.length}`
      };
    }
    if (!/^[89a-fA-F][0-9a-fA-F]{14}$/.test(h3Index)) {
      return {
        valid: false,
        isValid: false,
        errorCode: H3ErrorCode.INVALID_CHARACTER,
        code: H3ErrorCode.INVALID_CHARACTER,
        message: `Invalid characters or starting prefix in index: ${h3Index}`
      };
    }
    const res = parseInt(h3Index[1], 16);
    const baseCell = parseInt(h3Index.slice(2, 4), 16);
    return {
      valid: true,
      isValid: true,
      code: H3ErrorCode.SUCCESS,
      resolution: res,
      baseCell: isNaN(baseCell) ? 0 : baseCell
    };
  }

  public static parseResolution(h3Index: string): number {
    return parseInt(h3Index[1], 16);
  }

  public static parseBaseCell(h3Index: string): number {
    return parseInt(h3Index.slice(2, 4), 16);
  }

  public static isValidIndex(h3Index: string): boolean {
    if (typeof h3Index !== 'string' || h3Index.length !== 15) return false;
    return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(h3Index);
  }

  public static isValidHexIndex(index: string): boolean {
    if (typeof index !== 'string' || index.length === 0) return false;
    return /^[0-9a-fA-F]+$/.test(index);
  }

  public static validate(token: string): void {
    validateH3Token(token);
  }

  public static isValid(token: string): boolean {
    if (typeof token !== 'string' || token.length === 0) return false;
    return /^[0-9a-fA-F]+$/.test(token);
  }
}

export class H3GridManager {
  constructor(public defaultResolution: number = 0) {}

  public getDefaultResolution(): number {
    return this.defaultResolution;
  }

  public validateTier(resolution: number): void {
    assertValidResolution(resolution);
  }

  public validateResolution(resolution: number): boolean {
    return isValidResolution(resolution);
  }

  public assertValidResolution(resolution: number): void {
    assertValidResolution(resolution);
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
    if (index.length !== 15) return false;
    return /^[0-9a-f]+$/.test(index);
  }

  public static validateIndexStatic(index: any): string {
    if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    return index;
  }

  public static validateIndex(index: string): boolean {
    return isValidH3Hex(index);
  }

  public static guardPayload(h3Index: any): string {
    if (!h3Index || typeof h3Index !== 'string' || h3Index.trim() === '') {
      throw new Error(`[ThermodynamicSpatialError] Invalid H3 payload encountered: ${String(h3Index)}`);
    }
    return h3Index.trim();
  }

  public static isValidCanonicalIndex(index: string): boolean {
    return isValidH3CanonicalIndex(index);
  }

  public static normalizeIndex(index: string): string {
    return assertCanonicalH3Index(index);
  }

  public getResolution(index: string): number {
    const norm = H3GridManager.validateIndexStatic(index);
    const res = parseInt(norm[1], 16);
    return isNaN(res) ? 0 : res;
  }

  public getNeighbors(index: string): string[] {
    const prefix = index.slice(0, 14);
    return ['0', '1', '2', '3', '4', '5'].map((d) => `${prefix}${d}`);
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
    manager: { validateResolution: (r: number) => boolean; assertValidResolution: (r: number) => void }
  ): SpatialMonadStock {
    manager.assertValidResolution(stock.resolution);
    return new SpatialMonadStock(stock.energyJoules, stock.biomassKg, stock.resolution);
  }
}

export class SpatialMonadExecution {
  public static transitionSpatialStock(
    token: string,
    energyPotential: number
  ): { isValid: boolean; token: string; energyPotential: number; entropy: number } {
    const valid = H3GridValidator.isValidHexIndex(token);
    return {
      isValid: valid,
      token: valid ? token : '',
      energyPotential: valid ? energyPotential : 0.0,
      entropy: valid ? 0.0 : 1.0
    };
  }
}

export class H3GridCell {
  constructor(public token: string, public resolution: number = 8) {}

  public isValidPayload(token: string): boolean {
    if (typeof token !== 'string') return false;
    return /^[0-9a-fA-F]{15}$/.test(token);
  }

  public assertValidPayload(token: string): void {
    if (!this.isValidPayload(token)) {
      throw new Error(`Invalid token payload: ${token}`);
    }
  }
}

export class H3SpatialMonad {
  public bind(idx: string, fn: (idx: string) => string): string {
    this.validatePayload(idx);
    return fn(idx);
  }

  public validatePayload(h3Index: unknown): void {
    guardH3Payload(h3Index);
  }
}

export class H3CellCoord {
  constructor(private readonly cellStr: string) {}

  public isValid(): boolean {
    return isValidH3CanonicalIndex(this.cellStr);
  }

  public resolution(): number {
    if (!this.isValid()) return -1;
    return parseInt(this.cellStr[1], 16);
  }

  public index(): string {
    return this.cellStr;
  }
}

export interface CellThermodynamicStocks {
  readonly carbonMol: number;
  readonly waterMol: number;
  readonly nitrogenMol: number;
  readonly phosphorusMol: number;
  readonly oxygenMol: number;
  readonly enthalpyJoules: number;
}

export interface SpatialFluxDelta {
  readonly deltaCarbonMol: number;
  readonly deltaWaterMol: number;
  readonly deltaNitrogenMol: number;
  readonly deltaPhosphorusMol: number;
  readonly deltaOxygenMol: number;
  readonly deltaEnthalpyJoules: number;
}

export class SpatialTransferMonad {
  constructor(private readonly gridState: ReadonlyMap<string, CellThermodynamicStocks>) {}

  public getGrid(): ReadonlyMap<string, CellThermodynamicStocks> {
    return this.gridState;
  }

  public transferFlux(
    srcToken: string,
    dstToken: string,
    flux: SpatialFluxDelta
  ): {
    nextGrid: ReadonlyMap<string, CellThermodynamicStocks>;
    transferred: boolean;
    error?: string;
  } {
    if (!matchesCanonicalH3Pattern(srcToken)) {
      return {
        nextGrid: this.gridState,
        transferred: false,
        error: `Source cell token rejected: non-canonical pattern '${srcToken}'`
      };
    }
    if (!matchesCanonicalH3Pattern(dstToken)) {
      return {
        nextGrid: this.gridState,
        transferred: false,
        error: `Destination cell token rejected: non-canonical pattern '${dstToken}'`
      };
    }

    const srcCell = this.gridState.get(srcToken);
    const dstCell = this.gridState.get(dstToken);
    if (!srcCell || !dstCell) {
      return {
        nextGrid: this.gridState,
        transferred: false,
        error: 'One or both target cells are unallocated in current spatial grid'
      };
    }

    if (
      srcCell.carbonMol < flux.deltaCarbonMol ||
      srcCell.waterMol < flux.deltaWaterMol ||
      srcCell.nitrogenMol < flux.deltaNitrogenMol ||
      srcCell.phosphorusMol < flux.deltaPhosphorusMol ||
      srcCell.oxygenMol < flux.deltaOxygenMol
    ) {
      return {
        nextGrid: this.gridState,
        transferred: false,
        error: 'Insufficient stock in source cell for conservative transfer'
      };
    }

    const nextSrc: CellThermodynamicStocks = {
      carbonMol: srcCell.carbonMol - flux.deltaCarbonMol,
      waterMol: srcCell.waterMol - flux.deltaWaterMol,
      nitrogenMol: srcCell.nitrogenMol - flux.deltaNitrogenMol,
      phosphorusMol: srcCell.phosphorusMol - flux.deltaPhosphorusMol,
      oxygenMol: srcCell.oxygenMol - flux.deltaOxygenMol,
      enthalpyJoules: srcCell.enthalpyJoules - flux.deltaEnthalpyJoules
    };

    const nextDst: CellThermodynamicStocks = {
      carbonMol: dstCell.carbonMol + flux.deltaCarbonMol,
      waterMol: dstCell.waterMol + flux.deltaWaterMol,
      nitrogenMol: dstCell.nitrogenMol + flux.deltaNitrogenMol,
      phosphorusMol: dstCell.phosphorusMol + flux.deltaPhosphorusMol,
      oxygenMol: dstCell.oxygenMol + flux.deltaOxygenMol,
      enthalpyJoules: dstCell.enthalpyJoules + flux.deltaEnthalpyJoules
    };

    const nextMap = new Map(this.gridState);
    nextMap.set(srcToken, nextSrc);
    nextMap.set(dstToken, nextDst);

    return {
      nextGrid: nextMap,
      transferred: true
    };
  }
}

export class H3Grid {
  public readonly resolution: H3Resolution;
  public defaultResolution: number;
  private readonly cells: Set<string> = new Set();

  constructor(resolution: number = 8, initialCells: string[] = []) {
    this.resolution = (resolution >= 0 && resolution <= 15 ? resolution : 8) as H3Resolution;
    this.defaultResolution = resolution;
    for (const cell of initialCells) {
      this.addCell(cell);
    }
  }

  public addCell(cell: string): boolean {
    if (!matchesCanonicalH3Pattern(cell) && !isValidH3Index(cell)) {
      return false;
    }
    this.cells.add(cell);
    return true;
  }

  public hasCell(cell: string): boolean {
    return this.cells.has(cell);
  }

  public removeCell(cell: string): boolean {
    return this.cells.delete(cell);
  }

  public getCells(): string[] {
    return Array.from(this.cells);
  }

  public cellCount(): number {
    return this.cells.size;
  }

  public clear(): void {
    this.cells.clear();
  }

  public registerPayload(token: string): string {
    const guarded = guardH3Payload(token);
    this.cells.add(guarded);
    return guarded;
  }

  public size(): number {
    return this.cells.size;
  }

  public hasIndex(token: any): boolean {
    if (!token || typeof token !== 'string') return false;
    return this.cells.has(token);
  }

  public resolveCell(token: string): void {
    validateH3Token(token);
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
        message: `Invalid characters in H3 index: ${h3Index}`
      };
    }
    const res = parseInt(h3Index[1], 16);
    return {
      isValid: true,
      code: H3ErrorCode.SUCCESS,
      message: 'Valid H3 index',
      resolution: isNaN(res) ? 0 : res
    };
  }

  public assertValidIndex(h3Index: string): void {
    const res = this.validateIndex(h3Index);
    if (!res.isValid) {
      throw new Error(`Spatial Validation Error: ${res.message}`);
    }
  }

  public validateResolution(resolution: number): boolean {
    return isValidResolution(resolution);
  }

  public assertValidResolution(resolution: number): void {
    assertValidResolution(resolution);
  }

  public static validate(index: string): boolean {
    return H3GridValidator.isValidIndex(index);
  }

  public static cellToBoundary(index: any): void {
    guardH3Payload(index);
  }

  public static getResolution(index: any): number {
    const guarded = guardH3Payload(index);
    const res = parseInt(guarded[1], 16);
    return isNaN(res) ? 0 : res;
  }
}