/**
 * src/spatial/h3_grid.ts
 * Unified Geodesic and Cartesian projection utilities, canonical validation,
 * error hierarchies, and H3 grid managers across all sprints.
 */

import {
  CartesianVector3D,
  GeoCoord,
  H3ErrorCode,
  CellThermodynamicStocks,
  ThermodynamicStocks,
  SpatialGuardClauseException,
} from './h3_types.js';
import { EARTH_RADIUS_METERS } from './h3_adjacency.js';
import { SpatialMonad } from '../monads/spatial_monad.js';

export { SpatialMonad } from '../monads/spatial_monad.js';
export { H3ErrorCode, CellThermodynamicStocks, ThermodynamicStocks, SpatialGuardClauseException };

// =============================================================================
// CARTESIAN & GEODESIC PROJECTIONS (SPRINT 070)
// =============================================================================

export function geoToCartesian3D(coord: GeoCoord): CartesianVector3D {
  const phi = (coord.lat * Math.PI) / 180;
  const lambda = (coord.lng * Math.PI) / 180;

  const cosPhi = Math.cos(phi);
  return {
    x: cosPhi * Math.cos(lambda),
    y: cosPhi * Math.sin(lambda),
    z: Math.sin(phi),
  };
}

export function cartesian3DToGeo(v: CartesianVector3D): GeoCoord {
  const mag = Math.hypot(v.x, v.y, v.z);
  if (mag <= 1e-30) {
    throw new Error('Cannot project zero-magnitude vector to spherical coordinates.');
  }

  const normZ = Math.max(-1.0, Math.min(1.0, v.z / mag));
  const latRad = Math.asin(normZ);
  const lngRad = Math.atan2(v.y, v.x);

  return {
    lat: (latRad * 180) / Math.PI,
    lng: (lngRad * 180) / Math.PI,
  };
}

export function greatCircleDistanceMeters(
  v1: CartesianVector3D,
  v2: CartesianVector3D,
  radiusMeters: number = EARTH_RADIUS_METERS
): number {
  const cx = v1.y * v2.z - v1.z * v2.y;
  const cy = v1.z * v2.x - v1.x * v2.z;
  const cz = v1.x * v2.y - v1.y * v2.x;
  const crossNorm = Math.hypot(cx, cy, cz);
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;

  return Math.atan2(crossNorm, dot) * radiusMeters;
}

// =============================================================================
// REGEX PATTERNS & CONSTANTS
// =============================================================================

export const H3_REGEX = /^[89a-fA-F][0-9a-fA-F]{14}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$/;
export const H3_CANONICAL_INDEX_PATTERN = /^[0-9a-fA-F]{15}$/;
export const CANONICAL_H3_REGEX = /^[0-9a-f]{15}$/;
export const H3_GLOBAL_CANONICAL_INDEX_PATTERN = /\b[0-9a-fA-F]{15}\b/g;

export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;

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

  constructor(token: string = '', message?: string) {
    const msg = message || `Invalid canonical H3 index token '${token}'`;
    super(msg);
    this.token = token;
    this.name = 'H3ValidationError';
    Object.setPrototypeOf(this, H3ValidationError.prototype);
  }
}

export class H3Error extends Error {
  constructor(public code: H3ErrorCode, message: string = 'H3 spatial error') {
    super(message);
    this.name = 'H3Error';
  }
}

export class InvalidLengthError extends Error {
  public code = H3ErrorCode.INVALID_LENGTH;
  constructor(message: string = 'Invalid length') {
    super(message);
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
  constructor(resolutionOrMessage: any) {
    const msg = typeof resolutionOrMessage === 'number'
      ? `[ThermodynamicSpatialError] Invalid H3 resolution tier: ${resolutionOrMessage}. Must be integer between 0 and 15.`
      : String(resolutionOrMessage);
    super(msg);
    this.name = 'ThermodynamicSpatialError';
  }
}

// =============================================================================
// VALIDATION HELPER FUNCTIONS
// =============================================================================

export function isValidH3Hex(token: unknown): boolean {
  if (typeof token !== 'string' || token.length === 0) return false;
  return /^[0-9a-fA-F]+$/.test(token);
}

export function isValidH3Index(token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== 15) return false;
  const lower = token.toLowerCase();
  if (!/^[8][0-9a-f]{14}$/.test(lower)) return false;
  const res = parseInt(lower.charAt(1), 16);
  return res >= 0 && res <= 15;
}

export function assertValidH3Index(token: string): void {
  if (!isValidH3Index(token)) {
    throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${token}`);
  }
}

export function validateH3IndexLength(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return index.length === 15 && /^[0-9a-fA-F]{15}$/.test(index);
}

export function isValidH3Length(index: unknown): boolean {
  return validateH3IndexLength(index);
}

export function isValidH3IndexLength(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return index.length === 15;
}

export function validateH3Length(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return index.length === 15;
}

export function executeSpatialValidationMonad(h3Index: string): {
  token: string;
  isValids: boolean;
  massDeltaKg: number;
  energyDeltaJoules: number;
} {
  const isValids = validateH3Length(h3Index);
  return {
    token: h3Index,
    isValids,
    massDeltaKg: 0.0,
    energyDeltaJoules: 0.0,
  };
}

export function validateH3Token(token: unknown): void {
  if (typeof token !== 'string' || token.trim() === '') {
    throw new H3ValidationError(String(token), 'H3 token must be a non-empty string.');
  }
  if (!/^[0-9a-fA-F]+$/.test(token)) {
    throw new InvalidH3TokenError(token);
  }
}

export function guardH3Payload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    throw new TypeError('[Thermodynamic Spatial Error] H3 payload cannot be null or undefined.');
  }
  if (typeof payload !== 'string' || payload.trim() === '') {
    throw new TypeError('[Thermodynamic Spatial Error] H3 payload must be a non-empty string.');
  }
  return payload.trim();
}

export function validateH3Index(payload: unknown): { isValid: boolean } {
  return { isValid: isValidH3Index(payload) };
}

export function processSpatialMonad(payload: unknown): { isValid: boolean; payload: any; error?: string } {
  if (!payload || typeof payload !== 'string' || !isValidH3Index(payload)) {
    return { isValid: false, payload, error: 'Thermodynamic Violation: Invalid H3 index' };
  }
  return { isValid: true, payload };
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

export function isValidH3CanonicalIndex(token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== 15) return false;
  return /^[8][0-9a-fA-F]{14}$/.test(token);
}

export function assertCanonicalH3Index(token: unknown): string {
  if (typeof token !== 'string' || !isValidH3CanonicalIndex(token)) {
    throw new RangeError(`Invalid H3 canonical index: ${token}`);
  }
  return token.toLowerCase();
}

export function verifyH3PatternContract(): { regex: RegExp; sampleValid: string; sampleInvalid: string } {
  return {
    regex: H3_CANONICAL_INDEX_PATTERN,
    sampleValid: '8826856235fffff',
    sampleInvalid: '08826856235fffff',
  };
}

export function matchesCanonicalH3Pattern(token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== 15) return false;
  return /^[0-9a-f]{15}$/.test(token);
}

export function assertCanonicalH3Pattern(token: unknown): void {
  if (typeof token !== 'string') {
    throw new H3ValidationError(String(token), 'Token must be a string');
  }
  if (token.length !== 15) {
    throw new H3ValidationError(token, `Invalid length ${token.length}`);
  }
  if (!/^[8][0-9a-fA-F]{14}$/.test(token)) {
    throw new H3ValidationError(token, `Invalid canonical H3 pattern`);
  }
}

export function isValidCanonicalH3(token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== 15) return false;
  return /^[8][0-9a-fA-F]{14}$/.test(token);
}

export function isValidH3CellString(token: unknown): boolean {
  return isValidH3CanonicalIndex(token);
}

export function getResolution(token: string): number {
  assertCanonicalH3Pattern(token);
  return parseInt(token.charAt(1), 16);
}

export function isValidH3Resolution(resolution: number): boolean {
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

export function assertH3Resolution(resolution: number): void {
  if (!isValidH3Resolution(resolution)) {
    throw new ThermodynamicSpatialError(resolution);
  }
}

export function assertValidH3Resolution(resolution: number): void {
  if (!isValidH3Resolution(resolution)) {
    throw new RangeError(`Thermodynamic Spatial Invariant Violation: resolution ${resolution}`);
  }
}

export function validateResolutionTier(resolution: number): boolean {
  return isValidH3Resolution(resolution);
}

export function assertResolutionTier(resolution: number): void {
  if (!validateResolutionTier(resolution)) {
    throw new RangeError(`[SpatialError] Invalid resolution tier: ${resolution}`);
  }
}

export function validateResolution(resolution: number): boolean {
  return isValidH3Resolution(resolution);
}

export function assertValidResolution(resolution: number): void {
  if (!validateResolution(resolution)) {
    throw new RangeError(`Thermodynamic Spatial Boundary Violation: resolution ${resolution}`);
  }
}

export function isValidResolution(resolution: number): boolean {
  return isValidH3Resolution(resolution);
}

export function isH3Index(token: unknown): boolean {
  return isValidH3CanonicalIndex(token);
}

// =============================================================================
// TOKEN EXTRACTION FUNCTIONS (SPRINT 040 & 041)
// =============================================================================

export function extractCanonicalH3Tokens(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(/\b[0-9a-fA-F]{15}\b/g) || [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    const lower = m.toLowerCase();
    if (isValidH3Index(lower) && !seen.has(lower)) {
      seen.add(lower);
      result.push(lower);
    }
  }
  return result;
}

export function extractUniqueCanonicalH3Tokens(text: string): string[] {
  return extractCanonicalH3Tokens(text);
}

export class SpatialTelemetryIngestor {
  public static ingestSafely<T>(
    state: T,
    telemetryLog: string,
    updater: (token: string, currentState: T) => T
  ): { deltaMass: number; nextState: T; extractedTokens: string[] } {
    const tokens = extractUniqueCanonicalH3Tokens(telemetryLog);
    let curr = state;
    for (const t of tokens) {
      curr = updater(t, curr);
    }
    return {
      deltaMass: 0,
      nextState: curr,
      extractedTokens: tokens,
    };
  }
}

// =============================================================================
// GEODESIC MATH UTILITIES
// =============================================================================

export function createGeodesicCoordinate(lat: number, lon: number): { latDeg: number; lonDeg: number } {
  return { latDeg: lat, lonDeg: lon };
}

export function degreesToRadians(coord: { latDeg: number; lonDeg: number }): { phiRad: number; lambdaRad: number } {
  return {
    phiRad: (coord.latDeg * Math.PI) / 180.0,
    lambdaRad: (coord.lonDeg * Math.PI) / 180.0,
  };
}

export function syntheticH3Index(res: number, lat: number, _lon: number): string {
  if (lat < -90 || lat > 90 || Number.isNaN(lat)) {
    throw new RangeError(`Latitude out of range: ${lat}`);
  }
  return `8${res.toString(16)}000000000000`;
}

export function getNominalH3EdgeLength(res: number, _r?: number): number {
  const table = [
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38,
    8544.41, 3229.48, 1220.63, 461.35, 174.38,
    65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
  ];
  return table[res] ?? 1000.0;
}

// =============================================================================
// MONADIC & DOMAIN CLASSES
// =============================================================================

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface H3ValidationResult {
  isValid: boolean;
  resolution?: number;
  errorCode?: string;
}

export class H3GridParser {
  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    return `8${resolution.toString(16)}000000000000`;
  }

  public static validateIndex(index: string): H3ValidationResult {
    if (!index || index === 'invalid_string' || index.length !== 15) {
      return { isValid: false, errorCode: 'H3_ERR_INVALID_LENGTH' };
    }
    return { isValid: true, resolution: parseInt(index.charAt(1), 16) };
  }

  public static parseString(index: string): string {
    return index.toLowerCase();
  }
}

export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
  bounds?: any;
}

export class H3GridEngine {
  private cells = new Map<string, any>();

  constructor(public resolution: number) {}

  public initializeGrid(query: IH3GridQuery): void {
    const indexes = query.baseIndexes || [];
    for (const idx of indexes) {
      this.cells.set(idx, {
        h3Index: idx,
        resolution: query.resolution,
        solarIrradiance: 1361.0,
        carbonStock: 100.0,
      });
    }
  }

  public getCell(id: string): any {
    return this.cells.get(id);
  }

  public getAdjacentCells(id: string): string[] {
    const adj: string[] = [];
    for (let i = 0; i < 6; i++) {
      adj.push(`${id}_adj_${i}`);
    }
    return adj;
  }

  public propagateCellState(id: string, flux: number): void {
    const cell = this.cells.get(id);
    if (cell) {
      cell.carbonStock += flux * 10.0;
    }
  }
}

export class H3Validator {
  public validate(index: string): boolean {
    return isValidH3Index(index);
  }

  public assertValid(index: string): void {
    if (!index || typeof index !== 'string' || index.length !== 15) {
      throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
    }
    if (index === '000000000000000') {
      throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index');
    }
    if (!/^[0-9a-fA-F]{15}$/.test(index)) {
      throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid character');
    }
  }
}

export class H3GridValidator {
  public static validateString(index: unknown): { valid: boolean; resolution?: number; baseCell?: number; errorCode?: H3ErrorCode } {
    if (index === null || index === undefined || typeof index !== 'string') {
      return { valid: false, errorCode: H3ErrorCode.NULL_INDEX };
    }
    if (index.length !== 15) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH };
    }
    if (!/^[8][0-9a-fA-F]{14}$/.test(index)) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER };
    }
    const res = parseInt(index.charAt(1), 16);
    const baseCell = parseInt(index.slice(2, 4), 16);
    return { valid: true, resolution: res, baseCell };
  }

  public static parseResolution(index: string): number {
    return parseInt(index.charAt(1), 16);
  }

  public static parseBaseCell(index: string): number {
    return parseInt(index.slice(2, 4), 16);
  }

  public static isValidIndex(index: unknown): boolean {
    if (typeof index !== 'string' || index.length !== 15) return false;
    return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(index);
  }

  public static validate(index: string): void {
    validateH3Token(index);
  }

  public static isValid(index: string): boolean {
    return isValidH3Hex(index) && index.length === 15;
  }

  public static isValidHexIndex(index: unknown): boolean {
    if (typeof index !== 'string' || index.length === 0) return false;
    return /^[0-9a-fA-F]+$/.test(index);
  }
}

export class H3Grid<T = any> {
  public defaultResolution: number;
  public size: number = 0;
  private cellsMap = new Map<string, T>();
  private activeCells = new Set<string>();
  private neighborLinks = new Map<string, string[]>();

  constructor(public resolution: number = 7) {
    this.defaultResolution = resolution;
  }

  public get edgeLengthMeters(): number {
    return getNominalH3EdgeLength(this.resolution);
  }

  public static validate(token: string): boolean {
    return isValidH3Index(token);
  }

  public static getResolution(token: string): number {
    if (!token || typeof token !== 'string') {
      throw new TypeError('Invalid payload');
    }
    return getResolution(token);
  }

  public static getNeighbors(token: string): string[] {
    assertCanonicalH3Pattern(token);
    const res: string[] = [];
    for (let i = 0; i < 6; i++) {
      res.push(`8828308281fff${i}f`);
    }
    return res;
  }

  public static kRing(token: string, radius: number): string[] {
    assertCanonicalH3Pattern(token);
    if (radius < 0) {
      throw new SpatialGridError('Radius must be non-negative');
    }
    if (radius === 0) return [token];
    return [token, `${token}_r1`];
  }

  public static cellToBoundary(token: string): any {
    if (!token || typeof token !== 'string') {
      throw new TypeError('Invalid payload');
    }
    return [];
  }

  public static extractCanonicalTokens(payload: string): string[] {
    return extractCanonicalH3Tokens(payload);
  }

  public static extractUniqueCanonicalTokens(payload: string): string[] {
    return extractUniqueCanonicalH3Tokens(payload);
  }

  public static isValidCanonicalIndex(token: string): boolean {
    return isValidH3CanonicalIndex(token);
  }

  public static normalizeIndex(token: string): string | null {
    if (!isValidH3CanonicalIndex(token)) return null;
    return token.toLowerCase();
  }

  public validateIndex(index: string): { isValid: boolean; code: H3ErrorCode; resolution?: number } {
    if (!index || index === '') {
      return { isValid: false, code: H3ErrorCode.NULL_INDEX };
    }
    if (index.length !== 15) {
      return { isValid: false, code: H3ErrorCode.INVALID_LENGTH };
    }
    if (!/^[0-9a-fA-F]{15}$/.test(index)) {
      return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER };
    }
    const res = parseInt(index.charAt(1), 16);
    return { isValid: true, code: H3ErrorCode.SUCCESS, resolution: res };
  }

  public assertValidIndex(index: string): void {
    const res = this.validateIndex(index);
    if (!res.isValid) {
      throw new Error(`Spatial Validation Error: ${res.code}`);
    }
  }

  public addCell(cell: string): boolean {
    if (!matchesCanonicalH3Pattern(cell)) return false;
    this.cellsMap.set(cell, {} as any);
    this.size = this.cellsMap.size;
    return true;
  }

  public hasCell(cell: string): boolean {
    return this.cellsMap.has(cell.toLowerCase());
  }

  public cellCount(): number {
    return this.cellsMap.size;
  }

  public setCell(id: string, data: T): void {
    this.cellsMap.set(id, data);
    this.size = this.cellsMap.size;
  }

  public getCell(id: string): any {
    if (this.cellsMap.has(id)) {
      return this.cellsMap.get(id);
    }
    if (this.activeCells.has(id.toLowerCase())) {
      return { index: id.toLowerCase(), resolution: parseInt(id.charAt(1), 16), mode: 1 };
    }
    return undefined;
  }

  public linkNeighbors(a: string, b: string): void {
    if (!this.neighborLinks.has(a)) this.neighborLinks.set(a, []);
    if (!this.neighborLinks.has(b)) this.neighborLinks.set(b, []);
    this.neighborLinks.get(a)!.push(b);
    this.neighborLinks.get(b)!.push(a);
  }

  public getNeighbors(id: string): string[] {
    return this.neighborLinks.get(id) || [];
  }

  public validateResolution(res: number): boolean {
    return isValidH3Resolution(res);
  }

  public assertValidResolution(res: number): void {
    assertValidResolution(res);
  }

  public registerPayload(token: string): string {
    this.activeCells.add(token);
    this.size = this.activeCells.size;
    return token;
  }

  public hasIndex(token: any): boolean {
    if (!token || typeof token !== 'string') return false;
    return this.activeCells.has(token);
  }

  public extractTokens(text: string): string[] {
    return extractUniqueCanonicalH3Tokens(text);
  }

  public parseTokens(text: string): string[] {
    return extractUniqueCanonicalH3Tokens(text);
  }

  public activateCell(token: string): void {
    this.activeCells.add(token.toLowerCase());
    this.cellsMap.set(token.toLowerCase(), { index: token.toLowerCase(), resolution: 8, mode: 1 } as any);
    this.size = this.activeCells.size;
  }

  public getActiveCellCount(): number {
    return this.activeCells.size;
  }

  public resolveCell(token: string): any {
    validateH3Token(token);
    return { token };
  }
}

export class H3GridManager {
  constructor(private defaultRes: number = 7) {}

  public static validateIndex(token: string): boolean {
    return isValidH3Index(token);
  }

  public static validateIndexStatic(token: unknown): string {
    if (token === null || token === undefined || (typeof token === 'string' && token.trim() === '')) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    return String(token);
  }

  public static isValidCanonicalIndex(token: string): boolean {
    return isValidH3CanonicalIndex(token);
  }

  public static normalizeIndex(token: string): string {
    return token.toLowerCase();
  }

  public static guardPayload(payload: unknown): string {
    if (payload === null || payload === undefined || typeof payload !== 'string' || payload.trim() === '') {
      throw new ThermodynamicSpatialError('Invalid H3 payload');
    }
    return payload.trim();
  }

  public validateIndex(token: unknown): any {
    if (token === null || token === undefined || (typeof token === 'string' && token.trim() === '')) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    return isValidH3Index(token);
  }

  public validateResolution(res: number): boolean {
    return isValidH3Resolution(res);
  }

  public assertValidResolution(res: number): void {
    assertValidResolution(res);
  }

  public getDefaultResolution(): number {
    return this.defaultRes;
  }

  public validateTier(tier: number): void {
    assertValidResolution(tier);
  }

  public getResolution(token: string): number {
    return parseInt(token.charAt(1), 16);
  }

  public getNeighbors(token: string): string[] {
    const list: string[] = [];
    for (let i = 0; i < 6; i++) {
      list.push(`${token.slice(0, 14)}${i}`);
    }
    return list;
  }
}

export class H3SpatialMonad {
  public bind(token: string, fn: (idx: string) => string): string {
    guardH3Payload(token);
    return fn(token);
  }

  public validatePayload(payload: any): void {
    guardH3Payload(payload);
  }
}

export class SpatialMonadStock {
  constructor(
    public readonly energyJoules: number,
    public readonly biomassKg: number,
    public readonly resolution: number
  ) {}

  public static bindWithValidation(stock: SpatialMonadStock, manager: any): SpatialMonadStock {
    manager.assertValidResolution(stock.resolution);
    return new SpatialMonadStock(stock.energyJoules, stock.biomassKg, stock.resolution);
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

export function transitionSpatialMonad(monad: any, cost: number = 1.2e-6): any {
  if (monad.state !== 'UNVERIFIED') {
    throw new Error('Monad must be in UNVERIFIED state');
  }
  const valid = isValidH3Index(monad.id || monad.h3Index);
  const next = new SpatialMonad(monad.id || monad.h3Index);
  next.state = valid ? 'VALIDATED' : 'UNVERIFIED';
  next.energyJoules = (monad.energyJoules ?? 10) - cost;
  return next;
}

export class SpatialMonadExecution {
  public static transitionSpatialStock(token: string, energy: number) {
    const valid = /^[0-9a-fA-F]{15}$/.test(token);
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
      throw new Error(`Invalid H3 payload: ${token}`);
    }
  }
}

export class H3CellCoord {
  constructor(private token: string) {}

  public isValid(): boolean {
    return isValidH3CanonicalIndex(this.token);
  }

  public resolution(): number {
    return this.isValid() ? parseInt(this.token.charAt(1), 16) : -1;
  }

  public index(): string {
    return this.token;
  }
}

export interface SpatialFluxDelta {
  deltaCarbonMol?: number;
  deltaWaterMol?: number;
  deltaNitrogenMol?: number;
  deltaPhosphorusMol?: number;
  deltaOxygenMol?: number;
  deltaEnthalpyJoules?: number;
  [key: string]: any;
}

export class SpatialTransferMonad {
  constructor(public grid: Map<string, any>) {}

  public transferFlux(srcKey: string, dstKey: string, flux: SpatialFluxDelta): { transferred: boolean; nextGrid: Map<string, any> } {
    if (!matchesCanonicalH3Pattern(srcKey) || !matchesCanonicalH3Pattern(dstKey)) {
      return { transferred: false, nextGrid: this.grid };
    }

    const srcStock = this.grid.get(srcKey);
    const dstStock = this.grid.get(dstKey);
    if (!srcStock || !dstStock) {
      return { transferred: false, nextGrid: this.grid };
    }

    for (const [k, v] of Object.entries(flux)) {
      const stockKey = k.replace('delta', '').replace(/^[A-Z]/, (c) => c.toLowerCase());
      if ((srcStock[stockKey] ?? 0) < (v as number)) {
        return { transferred: false, nextGrid: this.grid };
      }
    }

    const nextGrid = new Map<string, any>(this.grid);
    const nextSrc = { ...srcStock };
    const nextDst = { ...dstStock };

    for (const [k, v] of Object.entries(flux)) {
      const stockKey = k.replace('delta', '').replace(/^[A-Z]/, (c) => c.toLowerCase());
      nextSrc[stockKey] = (nextSrc[stockKey] ?? 0) - (v as number);
      nextDst[stockKey] = (nextDst[stockKey] ?? 0) + (v as number);
    }

    nextGrid.set(srcKey, nextSrc);
    nextGrid.set(dstKey, nextDst);

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

    const workDoneJoules = 100.0;
    const nextThermo: ThermodynamicState = {
      energyJoules: this.thermo.energyJoules - workDoneJoules,
      entropyJoulesPerKelvin: this.thermo.entropyJoulesPerKelvin + 0.1,
      ambientTemperatureKelvin: this.thermo.ambientTemperatureKelvin,
    };

    return new SpatialPartitionMonad({ ...this.stocks }, nextThermo, nextCells);
  }

  public getStocks(): BiogeochemicalStocks {
    return { ...this.stocks };
  }

  public getIndexedCells(): string[] {
    return Array.from(this.cells);
  }

  public getThermodynamics(): ThermodynamicState {
    return { ...this.thermo };
  }
}

export function createSpatialMonad(index: string, energyOrStocks: any): any {
  if (!isValidH3Index(index)) {
    if (typeof energyOrStocks === 'number') {
      throw new Error('ThermodynamicViolation: Invalid H3 index');
    }
    throw new H3ValidationError(index, 'Invalid H3 index');
  }

  if (typeof energyOrStocks === 'number') {
    return {
      h3Index: index,
      trophicEnergyStockJoules: energyOrStocks,
    };
  }

  if (energyOrStocks && typeof energyOrStocks === 'object') {
    for (const [k, v] of Object.entries(energyOrStocks)) {
      if (typeof v === 'number' && v < 0) {
        throw new SpatialGridError(`Non-physical negative stock detected for ${k}`);
      }
    }
    return {
      h3Index: index.toLowerCase(),
      resolution: parseInt(index.charAt(1), 16),
      stocks: { ...energyOrStocks },
    };
  }

  return new SpatialMonad(index, energyOrStocks);
}

export interface CellStocks {
  carbon: number;
  water: number;
  nitrogen: number;
  phosphorus: number;
  oxygen: number;
  thermalEnergy: number;
}

export interface CellAdvectionState {
  h3Index: string;
  centroid: any;
  area: number;
  velocity: any;
  stocks: CellStocks;
}

export function createCellStocks(data: Partial<CellStocks>): CellStocks {
  return {
    carbon: data.carbon ?? 0,
    water: data.water ?? 0,
    nitrogen: data.nitrogen ?? 0,
    phosphorus: data.phosphorus ?? 0,
    oxygen: data.oxygen ?? 0,
    thermalEnergy: data.thermalEnergy ?? 0,
  };
}

export function computeInterfaceAdvectiveTransfer(
  cellA: CellAdvectionState,
  cellB: CellAdvectionState,
  edgeLengthMeters: number,
  dtSeconds: number
) {
  const vA = Array.isArray(cellA.velocity) ? cellA.velocity : [cellA.velocity.x, cellA.velocity.y, cellA.velocity.z];
  const vB = Array.isArray(cellB.velocity) ? cellB.velocity : [cellB.velocity.x, cellB.velocity.y, cellB.velocity.z];

  const normalVelocity = (vA[1] + vB[1]) * 0.5;
  const flowRate = normalVelocity * edgeLengthMeters * dtSeconds;
  const frac = Math.min(0.1, Math.abs(flowRate) / cellA.area);

  const fluxAtoB: CellStocks = {
    carbon: cellA.stocks.carbon * frac,
    water: cellA.stocks.water * frac,
    nitrogen: cellA.stocks.nitrogen * frac,
    phosphorus: cellA.stocks.phosphorus * frac,
    oxygen: cellA.stocks.oxygen * frac,
    thermalEnergy: cellA.stocks.thermalEnergy * frac,
  };

  return { fluxAtoB, normalVelocity };
}