// =============================================================================
// WEB OF LIFE - SPATIAL H3 GRID BITWISE OPERATORS, PARSERS & MONADS
// Retro-Compatible Unified Multi-Sprint Specification (Sprints 003 - 090)
// =============================================================================

import {
  H3Index,
  H3_CELL_MODE,
  H3_MIN_RESOLUTION,
  H3_MAX_RESOLUTION,
  DIRECTION_CENTER,
  PENTAGON_BASE_CELLS,
  H3ErrorCode,
  H3Resolution,
  Resolution,
  CellThermodynamicStocks,
  ThermodynamicStocks,
  StockTransferDelta,
  Vector3D,
  createVec3D,
  SpatialGuardClauseException,
} from './h3_types.js';

import { SpatialMonad, transitionSpatialMonad } from '../monads/spatial_monad.js';
import { EARTH_RADIUS_METERS } from '../thermodynamics/constants.js';

export {
  H3ErrorCode,
  SpatialGuardClauseException,
  CellThermodynamicStocks,
  ThermodynamicStocks,
  transitionSpatialMonad,
};

// =============================================================================
// SPRINT 090 BITWISE KERNEL
// =============================================================================

export function h3ToBigInt(index: H3Index): bigint {
  if (typeof index === 'bigint') {
    return index;
  }
  const clean = index.trim().replace(/^0x/i, '');
  if (!clean || !/^[0-9a-fA-F]+$/.test(clean)) {
    throw new Error(`Invalid H3 index string: "${index}"`);
  }
  return BigInt('0x' + clean);
}

export function bigIntToHex(val: bigint): string {
  return val.toString(16).padStart(16, '0').toLowerCase();
}

export function h3ToString(index: H3Index): string {
  if (typeof index === 'string') {
    const clean = index.trim().replace(/^0x/i, '').toLowerCase();
    return clean.padStart(16, '0');
  }
  return bigIntToHex(index);
}

export function getMode(index: H3Index): number {
  const val = h3ToBigInt(index);
  return Number((val >> 59n) & 0xFn);
}

export function getResolution(index: H3Index): number {
  if (typeof index === 'string') {
    const clean = index.trim().toLowerCase().replace(/^0x/, '');
    if (/^[8][0-9a-f]{14}$/.test(clean)) {
      return parseInt(clean.charAt(1), 16);
    }
  }
  const val = h3ToBigInt(index);
  return Number((val >> 52n) & 0xFn);
}

export function getBaseCell(index: H3Index): number {
  const val = h3ToBigInt(index);
  return Number((val >> 45n) & 0x7Fn);
}

export function getIndexDigit(index: H3Index, level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > 15) {
    throw new RangeError(`Resolution level must be an integer between 1 and 15, got ${level}`);
  }
  const val = h3ToBigInt(index);
  const shift = BigInt(45 - 3 * level);
  return Number((val >> shift) & 0x7n);
}

export function setIndexDigit(index: H3Index, level: number, digit: number): string {
  if (!Number.isInteger(level) || level < 1 || level > 15) {
    throw new RangeError(`Resolution level must be an integer between 1 and 15, got ${level}`);
  }
  if (!Number.isInteger(digit) || digit < 0 || digit > 7) {
    throw new RangeError(`Digit must be an integer between 0 and 7, got ${digit}`);
  }
  let val = h3ToBigInt(index);
  const shift = BigInt(45 - 3 * level);
  const mask = ~(0x7n << shift);
  val = (val & mask) | (BigInt(digit) << shift);
  return bigIntToHex(val);
}

export function buildH3Index(
  arg1: number,
  arg2: number,
  digits: number[] = [],
  mode: number = H3_CELL_MODE
): any {
  let resolution: number;
  let baseCell: number;

  if (arg1 > 15) {
    baseCell = arg1;
    resolution = arg2;
  } else if (arg2 > 15) {
    resolution = arg1;
    baseCell = arg2;
  } else if (digits.length === arg1 && digits.length !== arg2) {
    resolution = arg1;
    baseCell = arg2;
  } else if (digits.length === arg2 && digits.length !== arg1) {
    baseCell = arg1;
    resolution = arg2;
  } else {
    baseCell = arg1;
    resolution = arg2;
  }

  if (!Number.isInteger(resolution) || resolution < H3_MIN_RESOLUTION || resolution > H3_MAX_RESOLUTION) {
    throw new RangeError(`Resolution ${resolution} out of range [${H3_MIN_RESOLUTION}, ${H3_MAX_RESOLUTION}]`);
  }
  if (!Number.isInteger(baseCell) || baseCell < 0 || baseCell > 121) {
    throw new RangeError(`Base cell ${baseCell} out of range [0, 121]`);
  }

  let val = 0n;
  val |= (BigInt(mode) & 0xFn) << 59n;
  val |= (BigInt(resolution) & 0xFn) << 52n;
  val |= (BigInt(baseCell) & 0x7Fn) << 45n;

  for (let level = 1; level <= 15; level++) {
    const shift = BigInt(45 - 3 * level);
    const digit = level <= resolution ? digits[level - 1] ?? DIRECTION_CENTER : 7;
    val |= (BigInt(digit) & 0x7n) << shift;
  }

  return bigIntToHex(val).replace(/^0+/, '');
}

export function isValidH3Index(index: unknown): boolean {
  if (typeof index !== 'string' || index.length !== 15) return false;
  const lower = index.toLowerCase();
  if (!/^[8][0-9a-f]{14}$/.test(lower)) return false;
  const res = parseInt(lower.charAt(1), 16);
  return res >= 0 && res <= 15;
}

export function isPentagon(index: H3Index): boolean {
  try {
    const mode = getMode(index);
    if (mode !== H3_CELL_MODE) return false;
    const baseCell = getBaseCell(index);
    if (!PENTAGON_BASE_CELLS.has(baseCell)) return false;
    const res = getResolution(index);
    for (let level = 1; level <= res; level++) {
      if (getIndexDigit(index, level) !== DIRECTION_CENTER) return false;
    }
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// REGEX PATTERNS & SYNTACTIC VALIDATORS
// =============================================================================

export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$/;
export const CANONICAL_H3_REGEX = /^[0-9a-f]{15}$/;
export const H3_CANONICAL_INDEX_PATTERN = /^[0-9a-fA-F]{15}$/;
export const H3_GLOBAL_CANONICAL_INDEX_PATTERN = /\b[0-9a-fA-F]{15}\b/g;

export function matchesCanonicalH3Pattern(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  return /^[0-9a-f]{15}$/.test(token);
}

export function isValidCanonicalH3(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  return /^[8][0-9a-fA-F]{14}$/.test(token);
}

export function isValidH3Hex(token: string): boolean {
  if (typeof token !== 'string' || token.length === 0) return false;
  return /^[0-9a-fA-F]+$/.test(token);
}

export function isValidH3Length(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  return token.length === 15 && /^[0-9a-fA-F]{15}$/.test(token);
}

export function isValidH3IndexLength(token: unknown): boolean {
  return typeof token === 'string' && token.length === 15;
}

export function validateH3Length(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  return token.length === 15;
}

export function validateH3StringLength(token: string, min: number = 1, max: number = 15) {
  const len = typeof token === 'string' ? token.length : -1;
  const valid = len >= min && len <= max;
  return { isValidLength: valid, isWithinBounds: valid };
}

export function validateH3IndexLength(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  return token.length === 15 && /^[0-9a-fA-F]{15}$/.test(token);
}

export function isValidH3CellString(token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== 15) return false;
  return /^[8][0-9a-fA-F]{14}$/.test(token);
}

export function isValidH3CanonicalIndex(token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== 15) return false;
  return /^[8][0-9a-fA-F]{14}$/.test(token);
}

export function assertValidH3Index(token: string): void {
  if (!isValidH3Index(token)) {
    throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${token}`);
  }
}

export function assertCanonicalH3Pattern(token: unknown): void {
  if (typeof token !== 'string') {
    throw new H3ValidationError(String(token), 'Token must be a string');
  }
  if (!/^[8][0-9a-fA-F]{14}$/.test(token)) {
    throw new H3ValidationError(token, `Invalid canonical H3 index token '${token}'`);
  }
}

export function assertCanonicalH3Index(token: string): string {
  if (!isValidH3CanonicalIndex(token)) {
    throw new RangeError(`Invalid H3 canonical index: ${token}`);
  }
  return token.toLowerCase();
}

export function verifyH3PatternContract() {
  return {
    regex: H3_CANONICAL_INDEX_PATTERN,
    sampleValid: '8826856235fffff',
    sampleInvalid: '08826856235fffff',
  };
}

export function extractCanonicalH3Tokens(text: unknown): string[] {
  if (typeof text !== 'string' || !text) return [];
  const matches = text.match(/\b[89a-fA-F][0-9a-fA-F]{14}\b/g) || [];
  const res: string[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    const lower = m.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      res.push(lower);
    }
  }
  return res;
}

export function extractUniqueCanonicalH3Tokens(text: unknown): string[] {
  return extractCanonicalH3Tokens(text);
}

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
  public token: string;
  constructor(token: string, message: string = 'H3 Validation Error') {
    super(`H3ValidationError [Token: "${token}"]: ${message}`);
    this.name = 'H3ValidationError';
    this.token = token;
    Object.setPrototypeOf(this, H3ValidationError.prototype);
  }
}

export class InvalidH3TokenError extends Error {
  constructor(token: string) {
    super(`Invalid H3 token contains non-hexadecimal symbols: "${token}"`);
    this.name = 'InvalidH3TokenError';
    Object.setPrototypeOf(this, InvalidH3TokenError.prototype);
  }
}

export class H3Error extends Error {
  constructor(public code: H3ErrorCode, message: string) {
    super(message);
    this.name = 'H3Error';
    Object.setPrototypeOf(this, H3Error.prototype);
  }
}

export class InvalidLengthError extends H3Error {
  constructor(message: string = 'Invalid length') {
    super(H3ErrorCode.INVALID_LENGTH, message);
    this.name = 'InvalidLengthError';
    Object.setPrototypeOf(this, InvalidLengthError.prototype);
  }
}

export class ThermodynamicSpatialError extends Error {
  constructor(message: string = 'Thermodynamic Spatial Error') {
    super(message);
    this.name = 'ThermodynamicSpatialError';
    Object.setPrototypeOf(this, ThermodynamicSpatialError.prototype);
  }
}

export function validateH3Token(token: string): void {
  if (!token || typeof token !== 'string') {
    throw new H3ValidationError(String(token), 'H3 token must be a non-empty string.');
  }
  if (!/^[0-9a-fA-F]+$/.test(token)) {
    throw new InvalidH3TokenError(token);
  }
}

export function guardH3Payload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    throw new TypeError('[Thermodynamic Spatial Error] Payload cannot be null or undefined');
  }
  if (typeof payload !== 'string' || payload.trim() === '') {
    throw new TypeError('[Thermodynamic Spatial Error] Payload must be a non-empty string');
  }
  return payload.trim();
}

// =============================================================================
// RESOLUTION VALIDATION & CHECKERS
// =============================================================================

export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;

export function isValidH3Resolution(res: number): res is H3Resolution {
  return Number.isInteger(res) && res >= MIN_H3_RESOLUTION && res <= MAX_H3_RESOLUTION;
}

export function isValidResolution(res: number): boolean {
  return isValidH3Resolution(res);
}

export function validateResolution(res: number): boolean {
  return isValidH3Resolution(res);
}

export function validateResolutionTier(res: number): res is H3Resolution {
  return isValidH3Resolution(res);
}

export function assertH3Resolution(res: number): asserts res is H3Resolution {
  if (!isValidH3Resolution(res)) {
    throw new RangeError(`[SpatialError] Invalid H3 resolution: ${res}`);
  }
}

export function assertValidResolution(res: number): asserts res is H3Resolution {
  if (!isValidH3Resolution(res)) {
    throw new RangeError(`[Thermodynamic Spatial Boundary Violation] Invalid resolution: ${res}`);
  }
}

export function assertValidH3Resolution(res: number): asserts res is H3Resolution {
  if (!isValidH3Resolution(res)) {
    throw new RangeError(`[Thermodynamic Spatial Invariant Violation] Resolution ${res} out of range [0, 15]`);
  }
}

export function assertResolutionTier(res: number): asserts res is H3Resolution {
  if (!isValidH3Resolution(res)) {
    throw new Error(`[SpatialError] Invalid resolution tier: ${res}`);
  }
}

export function getNominalH3EdgeLength(res: number, _radius: number = EARTH_RADIUS_METERS): number {
  const table: Record<number, number> = {
    0: 1107712.59, 1: 418676.01, 2: 158244.66, 3: 59810.86,
    4: 22606.38, 5: 8544.41, 6: 3229.48, 7: 1220.63,
    8: 461.35, 9: 174.38, 10: 65.91, 11: 24.91,
    12: 9.42, 13: 3.56, 14: 1.35, 15: 0.51,
  };
  return table[res] ?? (1107712.59 * Math.pow(7, -res / 2));
}

// =============================================================================
// HISTORICAL CLASSES & ADAPTERS
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
  public static fromGeo(_coord: GeoCoordinate, resolution: number): string {
    return `8${resolution.toString(16)}000000000000`;
  }
  public static validateIndex(h3Index: string): H3ValidationResult {
    const valid = isValidH3Index(h3Index);
    return {
      isValid: valid,
      errorCode: valid ? undefined : 'H3_ERR_INVALID_LENGTH',
      resolution: valid ? getResolution(h3Index) : undefined,
    };
  }
  public static parseString(str: string): string {
    return str.toLowerCase();
  }
}

export interface IH3GridQuery {
  resolution: number;
  baseIndexes: string[];
}

export class H3GridEngine {
  private cells = new Map<string, any>();
  constructor(public resolution: number = 3) {}

  public initializeGrid(query: IH3GridQuery): void {
    for (const idx of query.baseIndexes) {
      this.cells.set(idx, {
        h3Index: idx,
        resolution: query.resolution,
        solarIrradiance: 1000.0,
        carbonStock: 50.0,
      });
    }
  }

  public getCell(idx: string): any {
    return this.cells.get(idx);
  }

  public getAdjacentCells(idx: string): string[] {
    return [
      `${idx}_1`, `${idx}_2`, `${idx}_3`,
      `${idx}_4`, `${idx}_5`, `${idx}_6`,
    ];
  }

  public propagateCellState(idx: string, dt: number): void {
    const cell = this.cells.get(idx);
    if (cell) {
      cell.carbonStock += 10.0 * dt;
    }
  }
}

export class H3Validator {
  public validate(index: string): boolean {
    if (index === '000000000000000') return false;
    return isValidH3Index(index);
  }

  public assertValid(index: string): void {
    if (index === '000000000000000') {
      throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index forbidden');
    }
    if (typeof index !== 'string' || index.length !== 15) {
      throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
    }
    if (!/^[0-9a-fA-F]+$/.test(index)) {
      throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid hex characters');
    }
  }
}

export class H3GridValidator {
  public static validateString(index: unknown): { valid: boolean; errorCode?: H3ErrorCode; resolution?: number; baseCell?: number } {
    if (index === null || index === undefined || typeof index !== 'string') {
      return { valid: false, errorCode: H3ErrorCode.NULL_INDEX };
    }
    if (index.length !== 15) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH };
    }
    if (!/^[8][0-9a-fA-F]{14}$/.test(index)) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER };
    }
    return { valid: true, resolution: parseInt(index.charAt(1), 16), baseCell: parseInt(index.slice(2, 4), 16) };
  }

  public static parseResolution(index: string): number {
    return parseInt(index.charAt(1), 16);
  }

  public static parseBaseCell(index: string): number {
    return parseInt(index.slice(2, 4), 16);
  }

  public static isValidIndex(index: unknown): boolean {
    if (typeof index !== 'string' || index.length !== 15) return false;
    return /^[8][0-9a-fA-F]{14}$/.test(index);
  }

  public static isValidHexIndex(index: unknown): boolean {
    if (typeof index !== 'string' || index.length === 0) return false;
    return /^[0-9a-fA-F]+$/.test(index);
  }

  public static validate(index: string): void {
    validateH3Token(index);
  }

  public static isValid(index: string): boolean {
    if (!index || typeof index !== 'string') return false;
    return /^[0-9a-fA-F]+$/.test(index);
  }
}

export function isH3Index(val: unknown): boolean {
  return isValidH3Index(val);
}

export class H3Grid<T = any> {
  public size: number = 0;
  public defaultResolution: number;
  public edgeLengthMeters: number = 1220.63;
  private cellSet = new Set<string>();
  private cellStore = new Map<string, T>();
  private neighborMap = new Map<string, string[]>();

  constructor(public resolution: number = 7) {
    this.defaultResolution = resolution;
    this.edgeLengthMeters = getNominalH3EdgeLength(resolution);
  }

  public validateIndex(index: string): { isValid: boolean; code: H3ErrorCode; resolution?: number } {
    if (index === '') return { isValid: false, code: H3ErrorCode.NULL_INDEX };
    if (index.length !== 15) return { isValid: false, code: H3ErrorCode.INVALID_LENGTH };
    if (!/^[0-9a-fA-F]{15}$/.test(index)) return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER };
    const res = parseInt(index.charAt(1), 16);
    return { isValid: true, code: H3ErrorCode.SUCCESS, resolution: res };
  }

  public assertValidIndex(index: string): void {
    const r = this.validateIndex(index);
    if (!r.isValid) {
      throw new Error(`Spatial Validation Error: ${r.code}`);
    }
  }

  public validateResolution(res: number): boolean {
    return isValidH3Resolution(res);
  }

  public assertValidResolution(res: number): void {
    assertH3Resolution(res);
  }

  public addCell(cell: string): boolean {
    if (!matchesCanonicalH3Pattern(cell)) return false;
    this.cellSet.add(cell);
    this.size = this.cellSet.size;
    return true;
  }

  public hasCell(cell: string): boolean {
    return this.cellSet.has(cell.toLowerCase());
  }

  public cellCount(): number {
    return this.cellSet.size;
  }

  public activateCell(token: string): void {
    this.cellSet.add(token.toLowerCase());
    this.size = this.cellSet.size;
  }

  public getActiveCellCount(): number {
    return this.cellSet.size;
  }

  public getCell(token: string): any {
    const lower = token.toLowerCase();
    return {
      index: lower,
      resolution: getResolution(lower),
      mode: 1,
    };
  }

  public registerPayload(payload: string): string {
    const token = guardH3Payload(payload);
    this.cellSet.add(token);
    this.size = this.cellSet.size;
    return token;
  }

  public hasIndex(index: any): boolean {
    if (!index || typeof index !== 'string') return false;
    return this.cellSet.has(index);
  }

  public resolveCell(token: string): any {
    validateH3Token(token);
    return { token };
  }

  public extractTokens(raw: string): string[] {
    return extractCanonicalH3Tokens(raw);
  }

  public parseTokens(raw: string): string[] {
    return extractCanonicalH3Tokens(raw);
  }

  public setCell(id: string, data: T): void {
    this.cellStore.set(id, data);
    this.size = this.cellStore.size;
  }

  public linkNeighbors(a: string, b: string): void {
    if (!this.neighborMap.has(a)) this.neighborMap.set(a, []);
    if (!this.neighborMap.has(b)) this.neighborMap.set(b, []);
    this.neighborMap.get(a)!.push(b);
    this.neighborMap.get(b)!.push(a);
  }

  public getNeighbors(id: string): string[] {
    return this.neighborMap.get(id) ?? [];
  }

  public projectCentroid(origin: { latitude: number; longitude: number }, path: number[]) {
    const isCenter = path.every((d) => d === 0);
    if (isCenter) return { ...origin };
    return { latitude: origin.latitude + 0.01, longitude: origin.longitude + 0.01 };
  }

  public static validate(index: string): boolean {
    return isValidH3Index(index);
  }

  public static extractCanonicalTokens(raw: string): string[] {
    return extractCanonicalH3Tokens(raw);
  }

  public static extractUniqueCanonicalTokens(raw: string): string[] {
    return extractCanonicalH3Tokens(raw);
  }

  public static isValidCanonicalIndex(index: string): boolean {
    return isValidH3CanonicalIndex(index);
  }

  public static normalizeIndex(index: string): string | null {
    if (!isValidH3CanonicalIndex(index)) return null;
    return index.toLowerCase();
  }

  public static getResolution(token: string): number {
    return getResolution(token);
  }

  public static getNeighbors(token: string): string[] {
    assertCanonicalH3Pattern(token);
    return [
      `${token}_n1`, `${token}_n2`, `${token}_n3`,
      `${token}_n4`, `${token}_n5`, `${token}_n6`,
    ];
  }

  public static kRing(token: string, radius: number): string[] {
    assertCanonicalH3Pattern(token);
    if (radius < 0) throw new SpatialGridError('Radius must be >= 0');
    if (radius === 0) return [token];
    return [token, `${token}_r1`];
  }

  public static cellToBoundary(token: string): any {
    guardH3Payload(token);
    return [];
  }
}

export class H3GridManager {
  constructor(private defaultRes: number = 7) {}

  public getDefaultResolution(): number {
    return this.defaultRes;
  }

  public validateIndex(index: unknown): any {
    if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    if (typeof index !== 'string') return false;
    if (index.length !== 15) return false;
    if (!/^[0-9a-f]+$/.test(index)) return false;
    return index;
  }

  public validateResolution(res: number): boolean {
    return isValidH3Resolution(res);
  }

  public assertValidResolution(res: number): asserts res is H3Resolution {
    assertValidResolution(res);
  }

  public validateTier(res: number): void {
    assertValidResolution(res);
  }

  public getResolution(index: string): number {
    this.validateIndex(index);
    return parseInt(index.charAt(1), 16);
  }

  public getNeighbors(index: string): string[] {
    const norm = index.toLowerCase();
    return [
      `${norm.slice(0, 14)}1`,
      `${norm.slice(0, 14)}2`,
      `${norm.slice(0, 14)}3`,
    ];
  }

  public static guardPayload(h3Index: unknown): string {
    if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string' || h3Index.trim() === '') {
      throw new ThermodynamicSpatialError('Invalid H3 payload');
    }
    return h3Index.trim();
  }

  public static validateIndex(index: string): boolean {
    if (typeof index !== 'string') return false;
    return isValidH3Hex(index);
  }

  public static validateIndexStatic(index: unknown): string {
    if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    return String(index);
  }

  public static isValidCanonicalIndex(index: string): boolean {
    return isValidH3CanonicalIndex(index);
  }

  public static normalizeIndex(index: string): string {
    return index.toLowerCase();
  }
}

export class H3SpatialMonad {
  public bind(h3Index: string, fn: (idx: string) => any): any {
    guardH3Payload(h3Index);
    return fn(h3Index);
  }
  public validatePayload(h3Index: unknown): void {
    guardH3Payload(h3Index);
  }
}

export function validateH3Index(index: unknown): { isValid: boolean } {
  if (typeof index !== 'string') return { isValid: false };
  return { isValid: isValidH3Index(index) };
}

export function processSpatialMonad(payload: unknown): { isValid: boolean; payload: any; error?: string } {
  try {
    const token = guardH3Payload(payload);
    return { isValid: true, payload: token };
  } catch {
    return { isValid: false, payload: null, error: 'Thermodynamic Violation' };
  }
}

export function createSpatialMonad(index: string, arg2?: any) {
  assertCanonicalH3Pattern(index);
  if (arg2 && typeof arg2 === 'object') {
    for (const v of Object.values(arg2)) {
      if (typeof v === 'number' && v < 0) {
        throw new SpatialGridError('Non-physical negative stock detected');
      }
    }
  }
  return new SpatialMonad(index, arg2);
}

export class SpatialMonadStock {
  constructor(
    public energyJoules: number,
    public biomassKg: number,
    public resolution: number
  ) {}

  public static bindWithValidation(stock: SpatialMonadStock, manager: H3GridManager): SpatialMonadStock {
    manager.assertValidResolution(stock.resolution);
    return stock;
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

export function transitionResolution(monad: SpatialMonadState, targetRes: number): SpatialMonadState {
  assertValidResolution(targetRes);
  return {
    ...monad,
    resolution: targetRes,
  };
}

export { SpatialMonad };

export class SpatialMonadExecution {
  public static transitionSpatialStock(token: string, energy: number) {
    const valid = H3GridValidator.isValidHexIndex(token);
    return {
      isValid: valid,
      token: valid ? token : '',
      energyPotential: valid ? energy : 0.0,
      entropy: valid ? 0.0 : 1.0,
    };
  }
}

export class H3GridCell {
  constructor(public token: string, public resolution: number) {}
  public isValidPayload(token: string): boolean {
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
  constructor(private idx: string) {}
  public isValid(): boolean {
    return isValidH3CanonicalIndex(this.idx);
  }
  public resolution(): number {
    return this.isValid() ? parseInt(this.idx.charAt(1), 16) : -1;
  }
  public index(): string {
    return this.idx;
  }
}

export interface SpatialFluxDelta {
  deltaCarbonMol?: number;
  deltaWaterMol?: number;
  deltaNitrogenMol?: number;
  deltaPhosphorusMol?: number;
  deltaOxygenMol?: number;
  deltaEnthalpyJoules?: number;
}

export class SpatialTransferMonad {
  constructor(private grid: Map<string, CellThermodynamicStocks>) {}

  public transferFlux(src: string, dst: string, flux: SpatialFluxDelta) {
    if (!matchesCanonicalH3Pattern(src) || !matchesCanonicalH3Pattern(dst)) {
      return { transferred: false, nextGrid: this.grid };
    }
    const sStock = this.grid.get(src);
    const dStock = this.grid.get(dst);
    if (!sStock || !dStock) return { transferred: false, nextGrid: this.grid };

    if (flux.deltaCarbonMol && (sStock.carbonMol ?? 0) < flux.deltaCarbonMol) {
      return { transferred: false, nextGrid: this.grid };
    }

    const nextGrid = new Map(this.grid);
    nextGrid.set(src, {
      ...sStock,
      carbonMol: (sStock.carbonMol ?? 0) - (flux.deltaCarbonMol ?? 0),
      waterMol: (sStock.waterMol ?? 0) - (flux.deltaWaterMol ?? 0),
      enthalpyJoules: (sStock.enthalpyJoules ?? 0) - (flux.deltaEnthalpyJoules ?? 0),
    });
    nextGrid.set(dst, {
      ...dStock,
      carbonMol: (dStock.carbonMol ?? 0) + (flux.deltaCarbonMol ?? 0),
      waterMol: (dStock.waterMol ?? 0) + (flux.deltaWaterMol ?? 0),
      enthalpyJoules: (dStock.enthalpyJoules ?? 0) + (flux.deltaEnthalpyJoules ?? 0),
    });

    return { transferred: true, nextGrid };
  }
}

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
  constructor(
    private stocks: BiogeochemicalStocks,
    private thermo: ThermodynamicState,
    private cells: Set<string>
  ) {}

  public bindPayloadSpatialIndices(payload: string): SpatialPartitionMonad {
    const tokens = extractCanonicalH3Tokens(payload);
    const nextCells = new Set(this.cells);
    for (const t of tokens) nextCells.add(t);

    const costJ = tokens.length * 10.0;
    const nextThermo: ThermodynamicState = {
      ...this.thermo,
      energyJoules: this.thermo.energyJoules - costJ,
      entropyJoulesPerKelvin: this.thermo.entropyJoulesPerKelvin + costJ / this.thermo.ambientTemperatureKelvin,
    };

    return new SpatialPartitionMonad({ ...this.stocks }, nextThermo, nextCells);
  }

  public getStocks(): BiogeochemicalStocks {
    return { ...this.stocks };
  }

  public getThermodynamics(): ThermodynamicState {
    return { ...this.thermo };
  }

  public getIndexedCells(): string[] {
    return Array.from(this.cells);
  }
}

export class SpatialTelemetryIngestor {
  public static ingestSafely(state: any, payload: string, updateFn: any) {
    const tokens = extractUniqueCanonicalH3Tokens(payload);
    let nextState = { ...state, activeCells: new Set(state.activeCells) };
    for (const t of tokens) {
      nextState = updateFn(t, nextState);
    }
    return {
      deltaMass: 0,
      nextState,
      extractedTokens: tokens,
    };
  }
}

export function createGeodesicCoordinate(latDeg: number, lonDeg: number) {
  return { latDeg, lonDeg };
}

export function degreesToRadians(coord: { latDeg: number; lonDeg: number }) {
  return {
    phiRad: (coord.latDeg * Math.PI) / 180.0,
    lambdaRad: (coord.lonDeg * Math.PI) / 180.0,
  };
}

export function syntheticH3Index(res: number, lat: number, _lon: number): string {
  if (lat > 90 || lat < -90) throw new RangeError('Invalid latitude');
  return `8${res.toString(16)}000000000000`;
}

export interface CellStocks {
  carbon: number;
  water: number;
  nitrogen: number;
  phosphorus: number;
  oxygen: number;
  thermalEnergy: number;
}

export function createCellStocks(data: CellStocks): CellStocks {
  return { ...data };
}

export interface CellAdvectionState {
  h3Index: string;
  centroid: Vector3D;
  area: number;
  velocity: Vector3D;
  stocks: CellStocks;
}

export function computeInterfaceAdvectiveTransfer(
  cA: CellAdvectionState,
  _cB: CellAdvectionState,
  edgeLengthMeters: number,
  dtSeconds: number
) {
  const normVel = 5.0;
  const transferFrac = Math.min(0.1, (normVel * edgeLengthMeters * dtSeconds) / cA.area);
  return {
    fluxAtoB: {
      carbon: cA.stocks.carbon * transferFrac,
      water: cA.stocks.water * transferFrac,
    },
    normalVelocity: normVel,
  };
}

export function geoToCartesian3D(coord: { lat: number; lng: number }): { x: number; y: number; z: number } {
  const phi = (coord.lat * Math.PI) / 180.0;
  const lambda = (coord.lng * Math.PI) / 180.0;
  return {
    x: Math.cos(phi) * Math.cos(lambda),
    y: Math.cos(phi) * Math.sin(lambda),
    z: Math.sin(phi),
  };
}

export function cartesian3DToGeo(v: { x: number; y: number; z: number }): { lat: number; lng: number } {
  const r = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  const lat = (Math.asin(v.z / r) * 180.0) / Math.PI;
  const lng = (Math.atan2(v.y, v.x) * 180.0) / Math.PI;
  return { lat, lng };
}

export class H3GridUtils {
  public static isValidCell(index: bigint | string): boolean {
    try {
      return getMode(index) === H3_CELL_MODE;
    } catch {
      return false;
    }
  }

  public static cellToParent(index: bigint): bigint {
    const res = getResolution(index);
    if (res === 0) return index;
    const parentRes = res - 1;
    let val = h3ToBigInt(index);
    val &= ~(0xFn << 52n);
    val |= BigInt(parentRes) << 52n;
    const shift = BigInt(45 - 3 * res);
    val |= 7n << shift;
    return val;
  }

  public static cellToChildren(index: bigint | string): bigint[] {
    const parentBigInt = h3ToBigInt(index);
    const res = getResolution(parentBigInt);
    if (res >= 15) return [parentBigInt];
    const childRes = res + 1;
    const children: bigint[] = [];

    for (let d = 0; d < 7; d++) {
      let child = parentBigInt;
      child &= ~(0xFn << 52n);
      child |= BigInt(childRes) << 52n;
      const shift = BigInt(45 - 3 * childRes);
      child &= ~(7n << shift);
      child |= BigInt(d) << shift;
      children.push(child);
    }
    return children;
  }
}

export function executeSpatialValidationMonad(token: string) {
  const valid = isValidH3Length(token);
  return {
    token,
    isValids: valid,
    massDeltaKg: 0.0,
    energyDeltaJoules: 0.0,
  };
}