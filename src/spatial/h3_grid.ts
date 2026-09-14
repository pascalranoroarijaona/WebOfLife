// =============================================================================
// WEB OF LIFE - H3 GRID COORDINATE UTILITIES & VALIDATION ENGINES
// Cumulative Retro-Compatibility: Sprints 001 - 053
// =============================================================================

import * as h3 from 'h3-js';
import {
  GeodesicCoordinate,
  SphericalCoordinateRad,
  H3Index,
  Resolution,
  H3ErrorCode,
  H3Resolution,
  H3ResolutionTier,
  SpatialGuardClauseException,
} from './h3_types.js';
import {
  assertValidLatitudeDegrees,
  calculateH3EdgeLengthMeters,
} from './h3_adjacency.js';

export { H3ErrorCode };
export { SpatialMonad } from '../monads/spatial_monad.js';

// =============================================================================
// SPRINT 053: GEODESIC CONVERSIONS & SYNTHETIC INDEX
// =============================================================================

export function degreesToRadians(coord: GeodesicCoordinate): SphericalCoordinateRad {
  assertValidLatitudeDegrees(coord.latDeg);
  return {
    phiRad: (coord.latDeg * Math.PI) / 180.0,
    lambdaRad: (coord.lonDeg * Math.PI) / 180.0,
  };
}

export function radiansToDegrees(coordRad: SphericalCoordinateRad): GeodesicCoordinate {
  const latDeg = (coordRad.phiRad * 180.0) / Math.PI;
  const lonDeg = (coordRad.lambdaRad * 180.0) / Math.PI;
  assertValidLatitudeDegrees(latDeg);
  return { latDeg, lonDeg };
}

export function normalizeLongitudeDegrees(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) {
    throw new RangeError(`Longitude must be a finite number: received ${lonDeg}`);
  }
  let normalized = ((lonDeg + 180.0) % 360.0) - 180.0;
  if (normalized <= -180.0) normalized += 360.0;
  return normalized;
}

export function createGeodesicCoordinate(latDeg: number, lonDeg: number): GeodesicCoordinate {
  assertValidLatitudeDegrees(latDeg);
  return {
    latDeg,
    lonDeg: normalizeLongitudeDegrees(lonDeg),
  };
}

export function syntheticH3Index(res: number, latDeg: number, lonDeg: number): H3Index {
  assertValidLatitudeDegrees(latDeg);
  const normLon = normalizeLongitudeDegrees(lonDeg);
  const qLat = Math.round((latDeg + 90.0) * 1000);
  const qLon = Math.round((normLon + 180.0) * 1000);
  return `8${res.toString(16)}00${qLat.toString(16).padStart(5, '0')}${qLon.toString(16).padStart(5, '0')}`;
}

// =============================================================================
// REGEX PATTERNS & VALIDATION
// =============================================================================

export const H3_HEX_REGEX: RegExp = /^[0-9a-fA-F]+$/;
export const H3_REGEX: RegExp = /^[0-9a-fA-F]{15}$/;
export const CANONICAL_H3_REGEX: RegExp = /^[0-9a-f]{15}$/;
export const H3_CANONICAL_INDEX_PATTERN: RegExp = /^[0-9a-fA-F]{15}$/;
export const H3_GLOBAL_CANONICAL_INDEX_PATTERN: RegExp = /\b[0-9a-fA-F]{15}\b/g;

export function isValidH3Hex(indexStr: string): boolean {
  if (typeof indexStr !== 'string' || indexStr.length === 0) return false;
  return H3_HEX_REGEX.test(indexStr);
}

export function isValidH3Index(index: unknown): boolean {
  if (typeof index !== 'string' || index.length !== 15) return false;
  const lower = index.toLowerCase();
  if (!/^[8][0-9a-f]{14}$/.test(lower)) return false;
  const res = parseInt(lower.charAt(1), 16);
  return res >= 0 && res <= 15;
}

export function assertValidH3Index(index: unknown): void {
  if (typeof index !== 'string' || index.length !== 15 || !H3_HEX_REGEX.test(index)) {
    throw new Error('[Thermodynamic Spatial Violation] Invalid H3 index format');
  }
}

export function isH3Index(index: unknown): index is string {
  return typeof index === 'string' && /^[8][0-9a-fA-F]{14}$/.test(index);
}

export function validateH3Index(payload: unknown): { isValid: boolean } {
  return { isValid: typeof payload === 'string' && isValidH3Index(payload) };
}

export function validateH3IndexLength(index: unknown): boolean {
  return typeof index === 'string' && index.length === 15 && H3_HEX_REGEX.test(index);
}

export function isValidH3Length(index: unknown): boolean {
  return typeof index === 'string' && index.length === 15 && H3_HEX_REGEX.test(index);
}

export function isValidH3IndexLength(index: unknown): boolean {
  return typeof index === 'string' && index.length === 15;
}

export function validateH3Length(index: unknown): boolean {
  return typeof index === 'string' && index.length === 15;
}

export function validateH3StringLength(
  h3String: string,
  minLength: number = 1,
  maxLength: number = 15
): { isValidLength: boolean; isWithinBounds: boolean } {
  const len = typeof h3String === 'string' ? h3String.length : -1;
  const valid = len >= minLength && len <= maxLength;
  return { isValidLength: valid, isWithinBounds: valid };
}

export function matchesCanonicalH3Pattern(token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== 15) return false;
  return /^[0-9a-f]{15}$/.test(token);
}

export function isValidH3CanonicalIndex(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  return /^[0-9a-fA-F]{15}$/.test(token);
}

export function assertCanonicalH3Index(token: string): string {
  if (typeof token !== 'string' || !/^[0-9a-fA-F]{15}$/.test(token)) {
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

export function isValidCanonicalH3(token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== 15) return false;
  return /^[8][0-9a-fA-F]{14}$/.test(token);
}

export function getResolution(token: string): number {
  assertCanonicalH3Pattern(token);
  return parseInt(token.charAt(1), 16);
}

export function extractCanonicalH3Tokens(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(/\b[0-9a-fA-F]{15}\b/g) || [];
  const seen = new Set<string>();
  const res: string[] = [];
  for (const m of matches) {
    const lower = m.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      res.push(lower);
    }
  }
  return res;
}

export function extractUniqueCanonicalH3Tokens(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(/\b[0-9a-fA-F]{15}\b/g) || [];
  const seen = new Set<string>();
  const res: string[] = [];
  for (const m of matches) {
    const lower = m.toLowerCase();
    if (isValidH3CellString(lower) && !seen.has(lower)) {
      seen.add(lower);
      res.push(lower);
    }
  }
  return res;
}

export function isValidH3CellString(str: string): boolean {
  if (typeof str !== 'string' || str.length !== 15) return false;
  const lower = str.toLowerCase();
  if (!/^[8][0-9a-f]{14}$/.test(lower)) return false;
  try {
    return h3.isValidCell(lower);
  } catch {
    return false;
  }
}

// =============================================================================
// ERROR HIERARCHY
// =============================================================================

export class SpatialGridError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpatialGridError';
  }
}

export class H3Error extends Error {
  constructor(public code: H3ErrorCode, message: string) {
    super(message);
    this.name = 'H3Error';
  }
}

export class H3ValidationError extends SpatialGridError {
  public code?: H3ErrorCode;
  public token?: string;
  constructor(messageOrToken: string, message?: string) {
    super(message ? `H3ValidationError [Token: "${messageOrToken}"]: ${message}` : messageOrToken);
    this.name = 'H3ValidationError';
    if (message) {
      this.token = messageOrToken;
    } else {
      this.token = messageOrToken;
      this.message = `Invalid canonical H3 index token '${messageOrToken}'`;
    }
  }
}

export class InvalidLengthError extends H3Error {
  constructor(message: string) {
    super(H3ErrorCode.INVALID_LENGTH, message);
    this.name = 'InvalidLengthError';
  }
}

export class InvalidH3TokenError extends Error {
  constructor(token: string) {
    super(`Invalid H3 token contains non-hexadecimal symbols: "${token}"`);
    this.name = 'InvalidH3TokenError';
  }
}

export class ThermodynamicSpatialError extends Error {
  constructor(resolution: number | string) {
    super(`[ThermodynamicSpatialError] Invalid H3 resolution tier: ${resolution}. Must be integer between 0 and 15.`);
    this.name = 'ThermodynamicSpatialError';
  }
}

export function assertCanonicalH3Pattern(token: unknown): void {
  if (typeof token !== 'string') {
    const err = new H3ValidationError(token as string);
    err.message = `Token must be a string: ${token}`;
    throw err;
  }
  if (token.length !== 15 || !/^[0-9a-fA-F]{15}$/.test(token) || !/^[8]/.test(token)) {
    throw new H3ValidationError(token);
  }
}

export function validateH3Token(token: string): void {
  if (!token || typeof token !== 'string') {
    throw new InvalidH3TokenError(token ?? '');
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

export function processSpatialMonad(payload: unknown) {
  try {
    const guarded = guardH3Payload(payload);
    return { isValid: true, payload: guarded, error: undefined };
  } catch (err: any) {
    return { isValid: false, payload: null, error: `Thermodynamic Violation: ${err.message}` };
  }
}

// =============================================================================
// RESOLUTION TIER CHECKS
// =============================================================================

export const MIN_H3_RESOLUTION: Resolution = 0;
export const MAX_H3_RESOLUTION: Resolution = 15;

export function isValidResolution(r: unknown): boolean {
  return typeof r === 'number' && Number.isInteger(r) && r >= 0 && r <= 15;
}

export function assertValidResolution(r: number): void {
  if (!isValidResolution(r)) {
    throw new RangeError(`Invalid H3 resolution tier: ${r}. Must be an integer between 0 and 15.`);
  }
}

export function isValidH3Resolution(r: unknown): r is H3Resolution {
  return typeof r === 'number' && Number.isInteger(r) && r >= 0 && r <= 15;
}

export function assertH3Resolution(r: number): asserts r is H3Resolution {
  if (!isValidH3Resolution(r)) {
    throw new ThermodynamicSpatialError(r);
  }
}

export function assertValidH3Resolution(r: number): void {
  if (!isValidH3Resolution(r)) {
    throw new RangeError(`Thermodynamic Spatial Invariant Violation: Resolution tier ${r} invalid.`);
  }
}

export function validateResolution(r: number): boolean {
  return isValidH3Resolution(r);
}

export function validateResolutionTier(r: number): boolean {
  return isValidH3Resolution(r);
}

export function assertResolutionTier(r: number): void {
  if (!validateResolutionTier(r)) {
    throw new RangeError(`[SpatialError] Invalid resolution tier: ${r}`);
  }
}

export function getNominalH3EdgeLength(res: number, _radius: number = 6371007.1809): number {
  const table = [
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41,
    3229.48, 1220.63, 461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
  ];
  return table[res] ?? 0.51;
}

// =============================================================================
// CLASSES: H3GridValidator, H3Validator, H3GridManager, H3GridCell
// =============================================================================

export class H3GridValidator {
  public static validateString(h3Index: unknown) {
    if (!h3Index || typeof h3Index !== 'string') {
      return { valid: false, errorCode: H3ErrorCode.NULL_INDEX, message: 'Null index' };
    }
    if (h3Index.length !== 15) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH, message: 'Invalid length' };
    }
    if (!/^[8][0-9a-fA-F]{14}$/.test(h3Index)) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid character' };
    }
    const res = parseInt(h3Index.charAt(1), 16);
    const baseCell = parseInt(h3Index.slice(2, 4), 16);
    return { valid: true, resolution: res, baseCell };
  }

  public static parseResolution(h3Index: string): number {
    return parseInt(h3Index.charAt(1), 16);
  }

  public static parseBaseCell(h3Index: string): number {
    return parseInt(h3Index.slice(2, 4), 16);
  }

  public static isValidIndex(h3Index: unknown): boolean {
    return typeof h3Index === 'string' && /^[89a-fA-F][0-9a-fA-F]{14}$/.test(h3Index);
  }

  public static isValidHexIndex(index: string): boolean {
    return typeof index === 'string' && index.length > 0 && /^[0-9a-fA-F]+$/.test(index);
  }

  public static validate(token: string): void {
    if (!token || !/^[0-9a-fA-F]+$/.test(token)) {
      throw new H3ValidationError(token, 'Contains non-hex characters');
    }
  }

  public static isValid(token: string): boolean {
    return typeof token === 'string' && token.length > 0 && /^[0-9a-fA-F]+$/.test(token);
  }
}

export class H3Validator {
  public validate(index: string): boolean {
    if (!index || index === '000000000000000') return false;
    if (index.length !== 15) return false;
    return /^[0-9a-fA-F]{15}$/.test(index);
  }

  public assertValid(index: string): void {
    if (!index || index === '000000000000000') {
      throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index');
    }
    if (index.length !== 15) {
      throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
    }
    if (!/^[0-9a-fA-F]{15}$/.test(index)) {
      throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid character');
    }
  }
}

export class H3GridCell {
  constructor(public token: string, public resolution: number) {}

  public isValidPayload(token: string): boolean {
    return typeof token === 'string' && /^[0-9a-fA-F]{15}$/.test(token);
  }

  public assertValidPayload(token: string): void {
    if (!this.isValidPayload(token)) {
      throw new Error(`Invalid H3 payload: ${token}`);
    }
  }
}

export class H3CellCoord {
  constructor(private rawIndex: string) {}

  public isValid(): boolean {
    return typeof this.rawIndex === 'string' && /^[8][0-9a-fA-F]{14}$/.test(this.rawIndex);
  }

  public resolution(): number {
    return this.isValid() ? parseInt(this.rawIndex.charAt(1), 16) : -1;
  }

  public index(): string {
    return this.rawIndex.toLowerCase();
  }
}

export class H3GridManager {
  constructor(private defaultResolution: number = 7) {}

  public getDefaultResolution(): number {
    return this.defaultResolution;
  }

  public validateIndex(index: string | null | undefined): string | boolean {
    if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    if (typeof index !== 'string' || index.length !== 15 || !/^[0-9a-f]+$/.test(index)) {
      return false;
    }
    return index;
  }

  public static validateIndex(index: string): boolean {
    return typeof index === 'string' && /^[0-9a-fA-F]+$/.test(index);
  }

  public static validateIndexStatic(index: string | null | undefined): string {
    if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    return index;
  }

  public getResolution(index: string): number {
    return parseInt(index.charAt(1), 16);
  }

  public validateTier(tier: number): void {
    assertValidResolution(tier);
  }

  public validateResolution(r: number): boolean {
    return isValidResolution(r);
  }

  public assertValidResolution(r: H3ResolutionTier): void {
    assertValidResolution(r);
  }

  public static guardPayload(h3Index: string | null | undefined): string {
    if (!h3Index || typeof h3Index !== 'string' || h3Index.trim() === '') {
      throw new Error(`[ThermodynamicSpatialError] Invalid H3 payload: ${h3Index}`);
    }
    return h3Index.trim();
  }

  public static isValidCanonicalIndex(idx: string): boolean {
    return typeof idx === 'string' && /^[0-9a-fA-F]{15}$/.test(idx);
  }

  public static normalizeIndex(idx: string): string {
    return idx.toLowerCase();
  }

  public getNeighbors(index: string): string[] {
    const list: string[] = [];
    for (let i = 0; i < 6; i++) {
      list.push(`${index.slice(0, -1)}${i.toString(16)}`);
    }
    return list;
  }
}

// =============================================================================
// SPRINT 003, 004, 005, 012, 014, 015, 038, 040, 041: H3Grid & MONADS
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
  public static validateIndex(h3Index: string | bigint): H3ValidationResult {
    const str = String(h3Index);
    if (!/^[0-9a-fA-F]{15}$/.test(str)) {
      return { isValid: false, errorCode: 'H3_ERR_INVALID_LENGTH' };
    }
    return { isValid: true, resolution: parseInt(str.charAt(1), 16) };
  }

  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    return h3.latLngToCell(coord.lat, coord.lng, resolution);
  }

  public static parseString(h3Str: string): string {
    return h3Str.toLowerCase();
  }
}

export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
}

export class H3GridEngine {
  private cells = new Map<string, any>();
  constructor(public resolution: number) {}

  public initializeGrid(query: IH3GridQuery): void {
    if (query.baseIndexes) {
      for (const idx of query.baseIndexes) {
        this.cells.set(idx, {
          h3Index: idx,
          resolution: query.resolution,
          solarIrradiance: 1361.0,
          carbonStock: 100.0,
        });
      }
    }
  }

  public getCell(idx: string): any {
    return this.cells.get(idx);
  }

  public getAdjacentCells(idx: string): string[] {
    const list: string[] = [];
    for (let i = 0; i < 6; i++) {
      list.push(`${idx.slice(0, -1)}${i.toString(16)}`);
    }
    return list;
  }

  public propagateCellState(idx: string, dt: number): void {
    const cell = this.cells.get(idx);
    if (cell) {
      cell.carbonStock += 10.0 * dt;
    }
  }
}

export class H3SpatialMonad {
  public bind(payload: string, fn: (idx: string) => string): string {
    guardH3Payload(payload);
    return fn(payload);
  }

  public validatePayload(payload: any): void {
    guardH3Payload(payload);
  }
}

export class H3Grid<T = any> {
  private _cells = new Map<string, T>();
  public defaultResolution: number = 7;
  public resolution: number = 7;
  public edgeLengthMeters: number = 1220.63;
  private neighbors = new Map<string, string[]>();

  constructor(resOrDef?: number) {
    if (typeof resOrDef === 'number') {
      this.defaultResolution = resOrDef;
      this.resolution = resOrDef;
      this.edgeLengthMeters = calculateH3EdgeLengthMeters(resOrDef);
    }
  }

  public validateIndex(h3Index: string) {
    if (!h3Index) {
      return { isValid: false, code: H3ErrorCode.NULL_INDEX, message: 'Null index' };
    }
    if (h3Index.length !== 15) {
      return { isValid: false, code: H3ErrorCode.INVALID_LENGTH, message: 'Invalid length' };
    }
    if (!/^[8][0-9a-fA-F]{14}$/.test(h3Index)) {
      return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid char' };
    }
    return {
      isValid: true,
      code: H3ErrorCode.SUCCESS,
      resolution: parseInt(h3Index.charAt(1), 16),
      message: 'Success',
    };
  }

  public assertValidIndex(h3Index: string): void {
    const res = this.validateIndex(h3Index);
    if (!res.isValid) {
      throw new Error(`Spatial Validation Error: ${res.code}`);
    }
  }

  public static validate(index: string): boolean {
    return typeof index === 'string' && /^[89a-fA-F][0-9a-fA-F]{14}$/.test(index);
  }

  public static cellToBoundary(token: any): any {
    guardH3Payload(token);
    return h3.cellToBoundary(token);
  }

  public static getResolution(token: any): number {
    guardH3Payload(token);
    return parseInt(String(token).charAt(1), 16);
  }

  public static getNeighbors(token: string): string[] {
    assertCanonicalH3Pattern(token);
    const list: string[] = [];
    for (let i = 0; i < 6; i++) {
      list.push(`${token.slice(0, -1)}${i.toString(16)}`);
    }
    return list;
  }

  public static kRing(token: string, radius: number): string[] {
    if (radius < 0) throw new SpatialGridError('Radius cannot be negative');
    assertCanonicalH3Pattern(token);
    if (radius === 0) return [token];
    const res: string[] = [token];
    for (let i = 0; i < 6 * radius; i++) {
      res.push(`${token.slice(0, -2)}${i.toString(16).padStart(2, '0')}`);
    }
    return res;
  }

  public validateResolution(r: number): boolean {
    return isValidResolution(r);
  }

  public assertValidResolution(r: number): void {
    assertValidResolution(r);
  }

  public addCell(cell: string): boolean {
    if (!matchesCanonicalH3Pattern(cell)) return false;
    this._cells.set(cell, {} as any);
    return true;
  }

  public hasCell(cell: string): boolean {
    return this._cells.has(cell.toLowerCase());
  }

  public cellCount(): number {
    return this._cells.size;
  }

  public registerPayload(payload: string): string {
    const p = guardH3Payload(payload);
    this._cells.set(p, {} as any);
    return p;
  }

  public size(): number {
    return this._cells.size;
  }

  public get size_prop(): number {
    return this._cells.size;
  }

  public hasIndex(payload: any): boolean {
    return typeof payload === 'string' && this._cells.has(payload);
  }

  public resolveCell(token: string): any {
    validateH3Token(token);
    return { token };
  }

  public setCell(id: string, val: T): void {
    this._cells.set(id, val);
  }

  public linkNeighbors(c1: string, c2: string): void {
    if (!this.neighbors.has(c1)) this.neighbors.set(c1, []);
    if (!this.neighbors.has(c2)) this.neighbors.set(c2, []);
    this.neighbors.get(c1)!.push(c2);
    this.neighbors.get(c2)!.push(c1);
  }

  public getNeighbors(id: string): string[] {
    return this.neighbors.get(id) ?? [];
  }

  public static extractCanonicalTokens(text: string): string[] {
    return extractCanonicalH3Tokens(text);
  }

  public static isValidCanonicalIndex(token: string): boolean {
    return typeof token === 'string' && /^[89a-fA-F][0-9a-fA-F]{14}$/.test(token);
  }

  public static normalizeIndex(token: string): string | null {
    return H3Grid.isValidCanonicalIndex(token) ? token.toLowerCase() : null;
  }

  public static extractUniqueCanonicalTokens(text: string): string[] {
    return extractUniqueCanonicalH3Tokens(text);
  }

  public extractTokens(text: string): string[] {
    return extractUniqueCanonicalH3Tokens(text);
  }

  public parseTokens(text: string): string[] {
    return extractUniqueCanonicalH3Tokens(text);
  }

  public activateCell(token: string): void {
    this._cells.set(token.toLowerCase(), { index: token.toLowerCase(), resolution: 8, mode: 1 } as any);
  }

  public getActiveCellCount(): number {
    return this._cells.size;
  }

  public getCell(token: string): any {
    return this._cells.get(token.toLowerCase());
  }
}

export class SpatialMonadStock {
  constructor(
    public readonly energyJoules: number,
    public readonly biomassKg: number,
    public readonly resolution: number
  ) {}

  public static bindWithValidation(stock: SpatialMonadStock, manager: H3GridManager): SpatialMonadStock {
    manager.assertValidResolution(stock.resolution as H3ResolutionTier);
    return new SpatialMonadStock(stock.energyJoules, stock.biomassKg, stock.resolution);
  }
}

export function transitionSpatialMonad(
  monad: { id: string; energyJoules: number; state: string } | any,
  cost: number = 1e-6
) {
  if (monad.state !== 'UNVERIFIED') {
    throw new Error('Monad must be in UNVERIFIED state for transition.');
  }
  const valid = isValidH3Index(monad.id);
  const nextEnergy = monad.energyJoules - cost;
  if (typeof monad.setValue === 'function') {
    monad.state = valid ? 'VALIDATED' : 'UNVERIFIED';
    monad.energyJoules = nextEnergy;
  }
  return {
    ...monad,
    state: valid ? 'VALIDATED' : 'UNVERIFIED',
    energyJoules: nextEnergy,
  };
}

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

export function createSpatialMonad(token: string, stockOrEnergy: any) {
  if (typeof stockOrEnergy === 'number') {
    if (!isValidH3Index(token)) {
      throw new Error(`ThermodynamicViolation: ${token}`);
    }
    return { h3Index: token, trophicEnergyStockJoules: stockOrEnergy };
  }
  assertCanonicalH3Pattern(token);
  if (stockOrEnergy.carbon < 0) {
    throw new SpatialGridError('Non-physical negative stock detected');
  }
  return {
    h3Index: token.toLowerCase(),
    resolution: getResolution(token),
    stocks: { ...stockOrEnergy },
  };
}

export interface SpatialMonadState {
  resolution: number;
  cellIndex: string;
  matterStock: { carbon: number; water: number; minerals: number; oxygen: number };
  energyStock: number;
}

export function transitionResolution(monad: SpatialMonadState, targetRes: number): SpatialMonadState {
  assertValidResolution(targetRes);
  return {
    ...monad,
    resolution: targetRes,
  };
}

export function executeSpatialValidationMonad(token: string) {
  return {
    token,
    isValids: validateH3Length(token),
    massDeltaKg: 0.0,
    energyDeltaJoules: 0.0,
  };
}

export interface CellThermodynamicStocks {
  carbonMol?: number;
  waterMol?: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol?: number;
  enthalpyJoules?: number;
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

  public transferFlux(srcKey: string, dstKey: string, flux: SpatialFluxDelta) {
    if (!matchesCanonicalH3Pattern(srcKey) || !matchesCanonicalH3Pattern(dstKey)) {
      return { transferred: false, nextGrid: this.grid };
    }
    const s = this.grid.get(srcKey);
    const d = this.grid.get(dstKey);
    if (!s || !d) return { transferred: false, nextGrid: this.grid };

    if ((flux.deltaCarbonMol ?? 0) > (s.carbonMol ?? 0)) {
      return { transferred: false, nextGrid: this.grid };
    }

    const nextGrid = new Map(this.grid);
    nextGrid.set(srcKey, {
      carbonMol: (s.carbonMol ?? 0) - (flux.deltaCarbonMol ?? 0),
      waterMol: (s.waterMol ?? 0) - (flux.deltaWaterMol ?? 0),
      nitrogenMol: (s.nitrogenMol ?? 0) - (flux.deltaNitrogenMol ?? 0),
      phosphorusMol: (s.phosphorusMol ?? 0) - (flux.deltaPhosphorusMol ?? 0),
      oxygenMol: (s.oxygenMol ?? 0) - (flux.deltaOxygenMol ?? 0),
      enthalpyJoules: (s.enthalpyJoules ?? 0) - (flux.deltaEnthalpyJoules ?? 0),
    });
    nextGrid.set(dstKey, {
      carbonMol: (d.carbonMol ?? 0) + (flux.deltaCarbonMol ?? 0),
      waterMol: (d.waterMol ?? 0) + (flux.deltaWaterMol ?? 0),
      nitrogenMol: (d.nitrogenMol ?? 0) + (flux.deltaNitrogenMol ?? 0),
      phosphorusMol: (d.phosphorusMol ?? 0) + (flux.deltaPhosphorusMol ?? 0),
      oxygenMol: (d.oxygenMol ?? 0) + (flux.deltaOxygenMol ?? 0),
      enthalpyJoules: (d.enthalpyJoules ?? 0) + (flux.deltaEnthalpyJoules ?? 0),
    });

    return { transferred: true, nextGrid };
  }
}

export interface ThermodynamicStocks {
  carbon: number;
  water: number;
  nitrogen: number;
  phosphorus: number;
  oxygen: number;
  thermalEnergy: number;
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
    const extracted = extractCanonicalH3Tokens(payload);
    const nextCells = new Set(this.cells);
    for (const token of extracted) {
      nextCells.add(token);
    }
    const workJoules = payload.length * 1e-9;
    const nextThermo: ThermodynamicState = {
      ...this.thermo,
      energyJoules: this.thermo.energyJoules - workJoules,
      entropyJoulesPerKelvin: this.thermo.entropyJoulesPerKelvin + workJoules / this.thermo.ambientTemperatureKelvin,
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
  public static ingestSafely<T extends { massStockTotal: number; activeCells: Set<string> }>(
    state: T,
    payload: string,
    stepFn: (token: string, curr: T) => T
  ) {
    const tokens = extractUniqueCanonicalH3Tokens(payload);
    let curr = { ...state, activeCells: new Set(state.activeCells) };
    for (const t of tokens) {
      curr = stepFn(t, curr);
    }
    return {
      deltaMass: 0,
      nextState: curr,
      extractedTokens: tokens,
    };
  }
}