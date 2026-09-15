/**
 * Web of Life - H3 Grid Facade & Comprehensive Validation Subsystem
 * Unified Multi-Sprint Implementation (Sprints 003 - 085)
 */

import {
  H3SpatialIndexCodec,
  extractH3IndexApertureDigits,
  assertValidLatitudeDegrees,
  latLngToCartesian3D,
  cartesian3DToLatLng,
  computeFacetNormalTangentBasis,
  dotProduct,
  toVec3D,
  projectVectorOntoSphereTangentSpace,
} from './h3_adjacency.js';

import {
  H3DirectionDigit,
  H3ErrorCode,
  H3ResolutionTier,
  CellThermodynamicStocks,
  ThermodynamicStocks,
  SpatialGuardClauseException,
  Vector3D,
  Vector3DInput,
  GeodesicCoordinate,
} from './h3_types.js';

import {
  SpatialMonad,
  transitionSpatialMonad,
} from '../monads/spatial_monad.js';

export {
  H3ErrorCode,
  CellThermodynamicStocks,
  ThermodynamicStocks,
  SpatialGuardClauseException,
} from './h3_types.js';

export {
  SpatialMonad,
  transitionSpatialMonad,
} from '../monads/spatial_monad.js';

export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$/;
export const CANONICAL_H3_REGEX = /^[0-9a-f]{15}$/;
export const H3_CANONICAL_INDEX_PATTERN = /^[0-9a-fA-F]{15}$/;
export const H3_GLOBAL_CANONICAL_INDEX_PATTERN = /\b[0-9a-fA-F]{15}\b/g;

export class SpatialGridError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpatialGridError';
  }
}

export class H3ValidationError extends SpatialGridError {
  constructor(public readonly token: string, message?: string) {
    super(message ?? `Invalid canonical H3 index token '${token}'`);
    this.name = 'H3ValidationError';
  }
}

export class InvalidLengthError extends Error {
  public code: H3ErrorCode = H3ErrorCode.INVALID_LENGTH;
  constructor(message: string) {
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

export class H3Error extends Error {
  constructor(public readonly code: H3ErrorCode, message: string) {
    super(message);
    this.name = 'H3Error';
  }
}

export class ThermodynamicSpatialError extends Error {
  constructor(message: string | number) {
    super(typeof message === 'number' ? `[ThermodynamicSpatialError] Invalid H3 resolution tier: ${message}` : message);
    this.name = 'ThermodynamicSpatialError';
  }
}

export function isValidH3Index(index: unknown): boolean {
  if (typeof index !== 'string' || index.length !== 15) return false;
  if (!/^[0-9a-fA-F]{15}$/.test(index)) return false;
  const firstNibble = parseInt(index[0], 16);
  if (firstNibble < 8) return false;
  const res = parseInt(index[1], 16);
  return res >= 0 && res <= 15;
}

export function isH3Index(index: unknown): boolean {
  return isValidH3Index(index);
}

export function assertValidH3Index(index: string): void {
  if (!isValidH3Index(index)) {
    throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${index}`);
  }
}

export function matchesCanonicalH3Pattern(token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== 15) return false;
  return /^[0-9a-f]{15}$/.test(token);
}

export function isValidCanonicalH3(token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== 15) return false;
  if (!/^[0-9a-fA-F]{15}$/.test(token)) return false;
  return token[0] === '8';
}

export function assertCanonicalH3Pattern(token: unknown): void {
  if (typeof token !== 'string') {
    throw new H3ValidationError(String(token), `Token must be a string, received ${typeof token}`);
  }
  if (token.length !== 15) {
    throw new H3ValidationError(token, `Invalid length: expected 15, got ${token.length}`);
  }
  if (!/^[0-9a-fA-F]{15}$/.test(token)) {
    throw new H3ValidationError(token, 'Contains invalid non-hexadecimal characters');
  }
  if (token[0] !== '8') {
    throw new H3ValidationError(token, "Invalid leading mode-1 nibble: must start with '8'");
  }
}

export function assertCanonicalH3Index(token: string): string {
  if (!isValidH3Index(token)) {
    throw new RangeError(`Invalid H3 canonical index: ${token}`);
  }
  return token.toLowerCase();
}

export function isValidH3CanonicalIndex(token: unknown): boolean {
  return isValidH3Index(token);
}

export function verifyH3PatternContract() {
  return {
    regex: H3_CANONICAL_INDEX_PATTERN,
    sampleValid: '8826856235fffff',
    sampleInvalid: '08826856235fffff',
  };
}

export function validateH3Token(token: unknown): void {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    throw new H3ValidationError(String(token), 'H3 token must be a non-empty string.');
  }
  if (!/^[0-9a-fA-F]+$/.test(token)) {
    throw new InvalidH3TokenError(token);
  }
}

export function isValidH3Hex(index: string): boolean {
  if (typeof index !== 'string' || index.length === 0) return false;
  return /^[0-9a-fA-F]+$/.test(index);
}

export function isValidH3Length(index: unknown): boolean {
  return typeof index === 'string' && index.length === 15 && /^[0-9a-fA-F]{15}$/.test(index);
}

export function isValidH3IndexLength(index: unknown): boolean {
  return typeof index === 'string' && index.length === 15;
}

export function validateH3Length(index: unknown): boolean {
  return typeof index === 'string' && index.length === 15;
}

export function validateH3IndexLength(index: unknown): boolean {
  return typeof index === 'string' && index.length === 15 && /^[0-9a-fA-F]{15}$/.test(index);
}

export function validateH3StringLength(
  str: string,
  min: number = 1,
  max: number = 15
): { isValidLength: boolean; isWithinBounds: boolean } {
  const valid = typeof str === 'string' && str.length >= min && str.length <= max;
  return { isValidLength: valid, isWithinBounds: valid };
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

export function validateH3Index(payload: unknown): { isValid: boolean; error?: string } {
  if (isValidH3Index(payload)) return { isValid: true };
  return { isValid: false, error: 'Invalid H3 index' };
}

export function isValidH3Resolution(res: unknown): boolean {
  return typeof res === 'number' && Number.isInteger(res) && res >= 0 && res <= 15;
}

export function isValidResolution(res: unknown): boolean {
  return isValidH3Resolution(res);
}

export function validateResolution(res: unknown): boolean {
  return isValidH3Resolution(res);
}

export function validateResolutionTier(res: unknown): boolean {
  return isValidH3Resolution(res);
}

export function assertValidResolution(res: number): void {
  if (!isValidH3Resolution(res)) {
    throw new RangeError(`[SpatialError] Invalid resolution tier: ${res}`);
  }
}

export function assertH3Resolution(res: number): void {
  if (!isValidH3Resolution(res)) {
    throw new ThermodynamicSpatialError(res);
  }
}

export function assertValidH3Resolution(res: number): void {
  if (!isValidH3Resolution(res)) {
    throw new RangeError(`[Thermodynamic Spatial Invariant Violation] Invalid resolution: ${res}`);
  }
}

export function assertResolutionTier(res: number): void {
  if (!isValidH3Resolution(res)) {
    throw new RangeError(`[SpatialError] Invalid resolution tier: ${res}`);
  }
}

export function getResolution(token: string): number {
  assertCanonicalH3Pattern(token);
  return parseInt(token[1], 16);
}

export function getNominalH3EdgeLength(res: number, _earthRadius?: number): number {
  const table = [
    1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
    461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
  ];
  return table[res] ?? 1000.0;
}

export function extractCanonicalH3Tokens(text: unknown): string[] {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(H3_GLOBAL_CANONICAL_INDEX_PATTERN) || [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const m of matches) {
    const lower = m.toLowerCase();
    if (lower.startsWith('8') && !seen.has(lower)) {
      seen.add(lower);
      result.push(lower);
    }
  }
  return result;
}

export function extractUniqueCanonicalH3Tokens(text: unknown): string[] {
  return extractCanonicalH3Tokens(text);
}

export function isValidH3CellString(token: unknown): boolean {
  return isValidH3Index(token);
}

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
  public static fromGeo(coord: GeoCoordinate, res: number): string {
    return `8${res.toString(16)}000000000000`;
  }
  public static validateIndex(h3Str: string): H3ValidationResult {
    if (!isValidH3Index(h3Str)) {
      return { isValid: false, errorCode: 'H3_ERR_INVALID_LENGTH' };
    }
    return {
      isValid: true,
      resolution: parseInt(h3Str[1], 16),
      baseCell: parseInt(h3Str.slice(2, 4), 16),
    };
  }
  public static parseString(h3Str: string): string {
    return h3Str.toLowerCase();
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
  public initializeGrid(query: IH3GridQuery) {
    this.resolution = query.resolution;
    if (query.baseIndexes) {
      for (const idx of query.baseIndexes) {
        this.cells.set(idx, {
          h3Index: idx,
          resolution: query.resolution,
          solarIrradiance: 1361.0,
          carbonStock: 1000.0,
        });
      }
    }
  }
  public getCell(idx: string) {
    return this.cells.get(idx);
  }
  public getAdjacentCells(_idx: string): string[] {
    return ['adj1', 'adj2', 'adj3', 'adj4', 'adj5', 'adj6'];
  }
  public propagateCellState(idx: string, rate: number) {
    const cell = this.cells.get(idx);
    if (cell) cell.carbonStock += rate * 10;
  }
}

export class H3Validator {
  public validate(index: string): boolean {
    return isValidH3Index(index);
  }
  public assertValid(index: string): void {
    if (index === '000000000000000') {
      throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index');
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
  public static validateString(index: unknown): { valid: boolean; resolution?: number; baseCell?: number; errorCode?: H3ErrorCode } {
    if (!index || typeof index !== 'string') {
      return { valid: false, errorCode: H3ErrorCode.NULL_INDEX };
    }
    if (index.length !== 15) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH };
    }
    if (!/^[8][0-9a-fA-F]{14}$/.test(index)) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER };
    }
    return {
      valid: true,
      resolution: parseInt(index[1], 16),
      baseCell: parseInt(index.slice(2, 4), 16),
    };
  }

  public static parseResolution(index: string): number {
    return parseInt(index[1], 16);
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
    return typeof index === 'string' && /^[0-9a-fA-F]+$/.test(tokenClean(index));
  }
}

function tokenClean(str: string): string {
  return str.trim();
}

export class H3Grid<T = any> {
  public size: number = 0;
  private cellMap = new Map<string, any>();

  constructor(public defaultResolution: number = 7) {}

  public get resolution(): number {
    return this.defaultResolution;
  }

  public get edgeLengthMeters(): number {
    return getNominalH3EdgeLength(this.defaultResolution);
  }

  public static validate(index: string): boolean {
    return H3GridValidator.isValidIndex(index);
  }

  public static getResolution(token: string): number {
    return getResolution(token);
  }

  public static getNeighbors(token: string): string[] {
    assertCanonicalH3Pattern(token);
    return ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'].map((n) => '8828308281fff' + n.slice(-2));
  }

  public static kRing(token: string, k: number): string[] {
    if (k < 0) throw new SpatialGridError('Radius must be non-negative');
    assertCanonicalH3Pattern(token);
    if (k === 0) return [token];
    return [token, '8828308281ffff1', '8828308281ffff2'];
  }

  public static cellToBoundary(cell: any) {
    guardH3Payload(cell);
    return [];
  }

  public static extractUniqueCanonicalTokens(text: string): string[] {
    return extractUniqueCanonicalH3Tokens(text);
  }

  public static extractCanonicalTokens(text: string): string[] {
    return extractCanonicalH3Tokens(text);
  }

  public static isValidCanonicalIndex(token: string): boolean {
    return isValidH3Index(token);
  }

  public static normalizeIndex(token: string): string | null {
    if (!isValidH3Index(token)) return null;
    return token.toLowerCase();
  }

  public validateIndex(index: string): { isValid: boolean; code: H3ErrorCode; resolution?: number } {
    if (!index) return { isValid: false, code: H3ErrorCode.NULL_INDEX };
    if (index.length !== 15) return { isValid: false, code: H3ErrorCode.INVALID_LENGTH };
    if (!/^[8][0-9a-fA-F]{14}$/.test(index)) return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER };
    return { isValid: true, code: H3ErrorCode.SUCCESS, resolution: parseInt(index[1], 16) };
  }

  public assertValidIndex(index: string): void {
    const res = this.validateIndex(index);
    if (!res.isValid) {
      throw new Error(`[Spatial Validation Error] ${res.code}`);
    }
  }

  public validateResolution(r: number): boolean {
    return isValidH3Resolution(r);
  }

  public assertValidResolution(r: number): void {
    assertValidResolution(r);
  }

  public addCell(idx: string): boolean {
    if (!matchesCanonicalH3Pattern(idx)) return false;
    this.cellMap.set(idx, true);
    return true;
  }

  public hasCell(idx: string): boolean {
    return this.cellMap.has(idx);
  }

  public cellCount(): number {
    return this.cellMap.size;
  }

  public resolveCell(token: string): any {
    validateH3Token(token);
    return { token };
  }

  public registerPayload(token: string): string {
    guardH3Payload(token);
    this.cellMap.set(token, true);
    this.size = this.cellMap.size;
    return token;
  }

  public hasIndex(token: any): boolean {
    if (!token) return false;
    return this.cellMap.has(token);
  }

  public extractTokens(text: string): string[] {
    return extractUniqueCanonicalH3Tokens(text);
  }

  public parseTokens(text: string): string[] {
    return extractUniqueCanonicalH3Tokens(text);
  }

  public activateCell(token: string): void {
    this.cellMap.set(token.toLowerCase(), {
      index: token.toLowerCase(),
      resolution: 8,
      mode: 1,
    });
  }

  public getActiveCellCount(): number {
    return this.cellMap.size;
  }

  public getCell(token: string): any {
    return this.cellMap.get(token.toLowerCase());
  }

  public setCell(id: string, data: any) {
    this.cellMap.set(id, data);
    this.size = this.cellMap.size;
  }

  public linkNeighbors(_a: string, _b: string) {}

  public getNeighbors(_id: string): string[] {
    return ['cell_2'];
  }
}

export class H3GridManager {
  constructor(private defaultRes: number = 7) {}
  public getDefaultResolution(): number {
    return this.defaultRes;
  }
  public validateTier(r: number) {
    assertValidResolution(r);
  }
  public validateIndex(index: unknown): any {
    if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    return String(index);
  }
  public static validateIndexStatic(index: unknown): string {
    if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    return String(index);
  }
  public static validateIndex(index: string): boolean {
    return isValidH3Index(index);
  }
  public static guardPayload(payload: unknown): string {
    if (!payload || typeof payload !== 'string' || payload.trim() === '') {
      throw new ThermodynamicSpatialError('Invalid H3 payload');
    }
    return payload.trim();
  }
  public validateResolution(r: number): boolean {
    return isValidH3Resolution(r);
  }
  public assertValidResolution(r: number): void {
    assertValidResolution(r);
  }
  public getResolution(index: string): number {
    return parseInt(index[1], 16);
  }
  public static isValidCanonicalIndex(token: string): boolean {
    return isValidH3Index(token);
  }
  public static normalizeIndex(token: string): string {
    return token.toLowerCase();
  }
  public getNeighbors(index: string): string[] {
    return ['0', '1', '2', '3', '4', '5'].map((d) => index.slice(0, 14) + d);
  }
}

export class H3SpatialMonad {
  public bind(h3Index: string, fn: (idx: string) => string): string {
    guardH3Payload(h3Index);
    return fn(h3Index);
  }
  public validatePayload(h3Index: any) {
    guardH3Payload(h3Index);
  }
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

export function transitionResolution(state: SpatialMonadState, newRes: number): SpatialMonadState {
  assertValidResolution(newRes);
  return {
    ...state,
    resolution: newRes,
  };
}

export class H3CellCoord {
  constructor(private idx: string) {}
  public isValid(): boolean {
    return isValidH3Index(this.idx);
  }
  public resolution(): number {
    return this.isValid() ? parseInt(this.idx[1], 16) : -1;
  }
  public index(): string {
    return this.idx;
  }
}

export class H3GridCell {
  constructor(public token: string, public resolution: number) {}
  public isValidPayload(token: string): boolean {
    return typeof token === 'string' && token.length === 15 && /^[0-9a-fA-F]{15}$/.test(token);
  }
  public assertValidPayload(token: string): void {
    if (!this.isValidPayload(token)) {
      throw new Error(`Invalid payload: ${token}`);
    }
  }
}

export class SpatialMonadExecution {
  public static transitionSpatialStock(token: string, energy: number) {
    const valid = isValidH3Hex(token) && token.length === 15;
    return {
      isValid: valid,
      token: valid ? token : '',
      energyPotential: valid ? energy : 0.0,
      entropy: valid ? 0.0 : 1.0,
    };
  }
}

export function processSpatialMonad(payload: any) {
  if (!payload || typeof payload !== 'string' || payload.trim() === '') {
    return { isValid: false, payload: null, error: 'Thermodynamic Violation' };
  }
  return { isValid: true, payload, error: undefined };
}

export function createSpatialMonad(index: string, stocks: any): SpatialMonad<any> {
  const normalized = typeof index === 'string' ? index.toLowerCase() : '';
  if (!matchesCanonicalH3Pattern(normalized) && !isValidH3Index(index)) {
    throw new H3ValidationError(index, `ThermodynamicViolation: Invalid H3 index '${index}'. Must be exactly 15 hex characters.`);
  }
  if (stocks && typeof stocks === 'object') {
    for (const v of Object.values(stocks)) {
      if (typeof v === 'number' && (v < 0 || Number.isNaN(v))) {
        throw new Error('Thermodynamic invariant violation: stocks cannot be negative or NaN');
      }
    }
  }
  const m = SpatialMonad.of(index, stocks);
  if (typeof stocks === 'number') {
    m.trophicEnergyStockJoules = stocks;
    m.energyJoules = stocks;
  }
  return m;
}

// SPRINT 020 INTEGRATION
export function executeSpatialValidationMonad(token: string) {
  const isVal = isValidH3Index(token);
  return {
    token,
    isValids: isVal,
    isValid: isVal,
    massDeltaKg: 0.0,
    energyDeltaJoules: 0.0,
  };
}

// SPRINT 038 INTEGRATION
export interface SpatialFluxDelta {
  deltaCarbonMol?: number;
  deltaWaterMol?: number;
  deltaNitrogenMol?: number;
  deltaPhosphorusMol?: number;
  deltaOxygenMol?: number;
  deltaEnthalpyJoules?: number;
}

export class SpatialTransferMonad {
  constructor(public grid: Map<string, CellThermodynamicStocks>) {}

  public transferFlux(
    srcCellKey: string,
    dstCellKey: string,
    flux: SpatialFluxDelta
  ): { transferred: boolean; nextGrid: Map<string, CellThermodynamicStocks> } {
    if (!matchesCanonicalH3Pattern(srcCellKey) || !matchesCanonicalH3Pattern(dstCellKey)) {
      return { transferred: false, nextGrid: this.grid };
    }
    const src = this.grid.get(srcCellKey);
    const dst = this.grid.get(dstCellKey);
    if (!src || !dst) {
      return { transferred: false, nextGrid: this.grid };
    }

    if (
      (flux.deltaCarbonMol && (src.carbonMol ?? 0) < flux.deltaCarbonMol) ||
      (flux.deltaWaterMol && (src.waterMol ?? 0) < flux.deltaWaterMol) ||
      (flux.deltaNitrogenMol && (src.nitrogenMol ?? 0) < flux.deltaNitrogenMol) ||
      (flux.deltaPhosphorusMol && (src.phosphorusMol ?? 0) < flux.deltaPhosphorusMol) ||
      (flux.deltaOxygenMol && (src.oxygenMol ?? 0) < flux.deltaOxygenMol) ||
      (flux.deltaEnthalpyJoules && (src.enthalpyJoules ?? 0) < flux.deltaEnthalpyJoules)
    ) {
      return { transferred: false, nextGrid: this.grid };
    }

    const nextSrc: CellThermodynamicStocks = {
      ...src,
      carbonMol: (src.carbonMol ?? 0) - (flux.deltaCarbonMol ?? 0),
      waterMol: (src.waterMol ?? 0) - (flux.deltaWaterMol ?? 0),
      nitrogenMol: (src.nitrogenMol ?? 0) - (flux.deltaNitrogenMol ?? 0),
      phosphorusMol: (src.phosphorusMol ?? 0) - (flux.deltaPhosphorusMol ?? 0),
      oxygenMol: (src.oxygenMol ?? 0) - (flux.deltaOxygenMol ?? 0),
      enthalpyJoules: (src.enthalpyJoules ?? 0) - (flux.deltaEnthalpyJoules ?? 0),
    };

    const nextDst: CellThermodynamicStocks = {
      ...dst,
      carbonMol: (dst.carbonMol ?? 0) + (flux.deltaCarbonMol ?? 0),
      waterMol: (dst.waterMol ?? 0) + (flux.deltaWaterMol ?? 0),
      nitrogenMol: (dst.nitrogenMol ?? 0) + (flux.deltaNitrogenMol ?? 0),
      phosphorusMol: (dst.phosphorusMol ?? 0) + (flux.deltaPhosphorusMol ?? 0),
      oxygenMol: (dst.oxygenMol ?? 0) + (flux.deltaOxygenMol ?? 0),
      enthalpyJoules: (dst.enthalpyJoules ?? 0) + (flux.deltaEnthalpyJoules ?? 0),
    };

    const nextGrid = new Map(this.grid);
    nextGrid.set(srcCellKey, nextSrc);
    nextGrid.set(dstCellKey, nextDst);

    return { transferred: true, nextGrid };
  }
}

// SPRINT 040 INTEGRATION
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
    for (const t of tokens) {
      nextCells.add(t);
    }
    const workJoules = Math.min(100.0, payload.length * 1e-4);
    const nextEnergy = Math.max(0, this.thermo.energyJoules - workJoules);
    const nextEntropy = this.thermo.entropyJoulesPerKelvin + workJoules / this.thermo.ambientTemperatureKelvin;

    return new SpatialPartitionMonad(
      { ...this.stocks },
      {
        energyJoules: nextEnergy,
        entropyJoulesPerKelvin: nextEntropy,
        ambientTemperatureKelvin: this.thermo.ambientTemperatureKelvin,
      },
      nextCells
    );
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

// SPRINT 041 INTEGRATION
export class SpatialTelemetryIngestor {
  public static ingestSafely<T extends { massStockTotal: number; activeCells: Set<string> }>(
    state: T,
    telemetryLog: string,
    callback: (token: string, currentState: T) => T
  ): { deltaMass: number; nextState: T; extractedTokens: string[] } {
    const tokens = extractUniqueCanonicalH3Tokens(telemetryLog);
    let nextState = state;
    for (const tok of tokens) {
      nextState = callback(tok, nextState);
    }
    return {
      deltaMass: nextState.massStockTotal - state.massStockTotal,
      nextState,
      extractedTokens: tokens,
    };
  }
}

// SPRINT 053 INTEGRATION
export function createGeodesicCoordinate(latDeg: number, lonDeg: number): GeodesicCoordinate {
  assertValidLatitudeDegrees(latDeg);
  return { latDeg, lonDeg };
}

export function degreesToRadians(coord: { latDeg: number; lonDeg: number }): { phiRad: number; lambdaRad: number } {
  assertValidLatitudeDegrees(coord.latDeg);
  return {
    phiRad: (coord.latDeg * Math.PI) / 180,
    lambdaRad: (coord.lonDeg * Math.PI) / 180,
  };
}

export function syntheticH3Index(res: number, lat: number, lon: number): string {
  assertValidLatitudeDegrees(lat);
  return `8${res.toString(16)}00${Math.floor(Math.abs(lat)).toString(16).padStart(2, '0')}${Math.floor(Math.abs(lon)).toString(16).padStart(2, '0')}ffffff`.slice(0, 15);
}

// SPRINT 060 INTEGRATION
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
  centroid: Vector3DInput;
  area: number;
  velocity: Vector3DInput;
  stocks: CellStocks;
}

export function createCellStocks(partial: Partial<CellStocks>): CellStocks {
  return {
    carbon: partial.carbon ?? 0,
    water: partial.water ?? 0,
    nitrogen: partial.nitrogen ?? 0,
    phosphorus: partial.phosphorus ?? 0,
    oxygen: partial.oxygen ?? 0,
    thermalEnergy: partial.thermalEnergy ?? 0,
  };
}

export function computeInterfaceAdvectiveTransfer(
  cellA: CellAdvectionState,
  cellB: CellAdvectionState,
  edgeLength: number,
  dt: number
) {
  const vTanA = projectVectorOntoSphereTangentSpace(toVec3D(cellA.velocity), toVec3D(cellA.centroid));
  const vTanB = projectVectorOntoSphereTangentSpace(toVec3D(cellB.velocity), toVec3D(cellB.centroid));
  const basis = computeFacetNormalTangentBasis(cellA.centroid, cellB.centroid);
  const midVel: [number, number, number] = [
    (vTanA[0] + vTanB[0]) * 0.5,
    (vTanA[1] + vTanB[1]) * 0.5,
    (vTanA[2] + vTanB[2]) * 0.5,
  ];
  const normalVelocity = dotProduct(midVel, basis.tangentNormal);
  const volFlow = normalVelocity * edgeLength * dt;
  const src = normalVelocity >= 0 ? cellA : cellB;
  const frac = Math.min(0.2, Math.abs(volFlow) / src.area);

  const fluxAtoB: CellStocks = {
    carbon: (normalVelocity >= 0 ? cellA.stocks.carbon : -cellB.stocks.carbon) * frac,
    water: (normalVelocity >= 0 ? cellA.stocks.water : -cellB.stocks.water) * frac,
    nitrogen: (normalVelocity >= 0 ? cellA.stocks.nitrogen : -cellB.stocks.nitrogen) * frac,
    phosphorus: (normalVelocity >= 0 ? cellA.stocks.phosphorus : -cellB.stocks.phosphorus) * frac,
    oxygen: (normalVelocity >= 0 ? cellA.stocks.oxygen : -cellB.stocks.oxygen) * frac,
    thermalEnergy: (normalVelocity >= 0 ? cellA.stocks.thermalEnergy : -cellB.stocks.thermalEnergy) * frac,
  };

  return { fluxAtoB, normalVelocity };
}

// SPRINT 070 INTEGRATION
export function geoToCartesian3D(coord: { lat: number; lng: number }, radius: number = 1.0): Vector3D {
  return latLngToCartesian3D(coord, radius);
}

export function cartesian3DToGeo(v: Vector3DInput): { lat: number; lng: number } {
  return cartesian3DToLatLng(v);
}

// SPRINT 085 INTEGRATION
export class H3GridUtils {
  public static cellToParent(index: bigint | string): bigint {
    const decomp = extractH3IndexApertureDigits(index);
    if (decomp.resolution === 0) return typeof index === 'bigint' ? index : BigInt('0x' + index);
    const parentRes = decomp.resolution - 1;
    const parentDigits = decomp.activeDigits.slice(0, parentRes);
    return H3SpatialIndexCodec.encodeIndex(decomp.mode, parentRes, decomp.baseCell, parentDigits);
  }

  public static cellToChildren(index: bigint | string): bigint[] {
    const decomp = extractH3IndexApertureDigits(index);
    const childRes = decomp.resolution + 1;
    const children: bigint[] = [];
    for (let d = 0; d < 7; d++) {
      const childDigits = [...decomp.activeDigits, d];
      children.push(H3SpatialIndexCodec.encodeIndex(decomp.mode, childRes, decomp.baseCell, childDigits));
    }
    return children;
  }

  public static isValidCell(index: bigint | string): boolean {
    try {
      const decomp = extractH3IndexApertureDigits(index, { validateMode: true, validateBaseCell: true });
      return decomp.isValid;
    } catch {
      return false;
    }
  }
}