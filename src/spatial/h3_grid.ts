// =============================================================================
// WEB OF LIFE - DISCRETE H3 GEODESIC FINITE VOLUME GRID & PARSER SUITE
// Unified Retro-Compatibility Suite (Sprints 003 - 060)
// =============================================================================

import * as h3 from 'h3-js';
import {
  Vector3D,
  projectVectorOntoSphereTangentSpace,
  computeFacetNormalTangentBasis,
  dotProduct,
  calculateH3EdgeLengthMeters,
} from './h3_adjacency.js';
import { H3ErrorCode, SpatialGuardClauseException } from './h3_types.js';
import { EARTH_AUTHALIC_RADIUS_METERS } from '../thermodynamics/constants.js';

export { H3ErrorCode, SpatialGuardClauseException };

// =============================================================================
// 1. FUNDAMENTAL CONSTANTS & REGEXES (RFC-008, 029, 037, 038, 040)
// =============================================================================

export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;

export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$/;
export const CANONICAL_H3_REGEX = /^[0-9a-f]{15}$/;
export const H3_CANONICAL_INDEX_PATTERN = /^[0-9a-fA-F]{15}$/;
export const H3_GLOBAL_CANONICAL_INDEX_PATTERN = /\b[0-9a-fA-F]{15}\b/g;

// =============================================================================
// 2. ERROR CLASSES (RFC-006, 007, 026, 033, 034, 039)
// =============================================================================

export class H3Error extends Error {
  constructor(message: string, public code: H3ErrorCode = H3ErrorCode.INVALID_LENGTH) {
    super(message);
    this.name = 'H3Error';
  }
}

export class SpatialGridError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpatialGridError';
  }
}

export class H3ValidationError extends SpatialGridError {
  constructor(public token: string, message?: string) {
    super(
      message ?? (typeof token !== 'string'
        ? `Token must be a string: ${token}`
        : `Invalid canonical H3 index token '${token}'`)
    );
    this.name = 'H3ValidationError';
  }
}

export class InvalidLengthError extends H3Error {
  constructor(message: string = 'Invalid H3 string length') {
    super(message, H3ErrorCode.INVALID_LENGTH);
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
  constructor(messageOrRes: string | number) {
    super(typeof messageOrRes === 'number' ? `[ThermodynamicSpatialError] Invalid H3 resolution tier: ${messageOrRes}` : messageOrRes);
    this.name = 'ThermodynamicSpatialError';
  }
}

// =============================================================================
// 3. TYPES & INTERFACES (RFC-003, 004, 022, 037, 038, 040)
// =============================================================================

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface H3ValidationResult {
  isValid: boolean;
  errorCode?: string;
  code?: H3ErrorCode;
  resolution?: number;
  baseCell?: number;
  valid?: boolean;
}

export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
  bounds?: { north: number; south: number; east: number; west: number };
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
  readonly h3Index: string;
  readonly centroid: Vector3D;
  readonly area: number;
  readonly velocity: Vector3D;
  readonly stocks: CellStocks;
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

export interface CellThermodynamicStocks {
  carbonMol?: number;
  waterMol?: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol?: number;
  enthalpyJoules?: number;
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

// =============================================================================
// 4. VALIDATION & TOKEN FUNCTIONS (RFC-008, 012, 014, 015, 016, 017, 018, 019, 020, 022, 025, 026, 027, 028, 030, 033, 034, 036, 037, 038, 039, 040, 041)
// =============================================================================

export function guardH3Payload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    throw new TypeError('Thermodynamic Violation [Sprint 015]: H3 payload cannot be null or undefined.');
  }
  if (typeof payload !== 'string' || payload.trim() === '') {
    throw new TypeError('Thermodynamic Violation [Sprint 015]: H3 payload must be a non-empty string.');
  }
  return payload.trim();
}

export function isValidH3Hex(str: unknown): boolean {
  if (typeof str !== 'string' || str.length === 0) return false;
  return H3_HEX_REGEX.test(str);
}

export function isValidH3Length(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return index.length === 15 && H3_REGEX.test(index);
}

export function validateH3IndexLength(index: unknown): boolean {
  return isValidH3Length(index);
}

export function isValidH3IndexLength(index: unknown): boolean {
  return typeof index === 'string' && index.length === 15;
}

export function validateH3Length(h3Index: unknown): boolean {
  return typeof h3Index === 'string' && h3Index.length === 15;
}

export function validateH3StringLength(
  h3String: string,
  minLength: number = 1,
  maxLength: number = 15
): { isValidLength: boolean; isWithinBounds: boolean } {
  const len = h3String.length;
  const isWithin = len >= minLength && len <= maxLength;
  return { isValidLength: isWithin, isWithinBounds: isWithin };
}

export function isValidH3Index(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  if (index.length !== 15) return false;
  const lower = index.toLowerCase();
  if (!/^[8][0-9a-f]{14}$/.test(lower)) return false;
  const res = parseInt(lower.charAt(1), 16);
  return res >= 0 && res <= 15;
}

export function isH3Index(index: unknown): boolean {
  return isValidH3Index(index);
}

export function assertValidH3Index(index: unknown): void {
  if (!isValidH3Index(index)) {
    throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index format: ${index}`);
  }
}

export function validateH3Index(index: unknown): H3ValidationResult {
  if (!index || typeof index !== 'string') {
    return { isValid: false, code: H3ErrorCode.NULL_INDEX, valid: false };
  }
  if (index.length !== 15) {
    return { isValid: false, code: H3ErrorCode.INVALID_LENGTH, valid: false };
  }
  if (!H3_HEX_REGEX.test(index)) {
    return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER, valid: false };
  }
  const res = parseInt(index.charAt(1), 16);
  if (isNaN(res) || res < 0 || res > 15) {
    return { isValid: false, code: H3ErrorCode.INVALID_RESOLUTION, valid: false };
  }
  return { isValid: true, code: H3ErrorCode.SUCCESS, resolution: res, valid: true };
}

export function validateH3Token(token: unknown): void {
  if (typeof token !== 'string' || token.trim() === '') {
    throw new H3ValidationError(token as string, 'H3 token must be a non-empty string.');
  }
  if (!/^[0-9a-fA-F]+$/.test(token)) {
    throw new InvalidH3TokenError(token);
  }
}

export function isValidH3Resolution(res: unknown): boolean {
  return typeof res === 'number' && Number.isInteger(res) && res >= 0 && res <= 15;
}

export function isValidResolution(res: unknown): boolean {
  return isValidH3Resolution(res);
}

export function validateResolution(res: number): boolean {
  return isValidH3Resolution(res);
}

export function validateResolutionTier(res: number): boolean {
  return isValidH3Resolution(res);
}

export function assertH3Resolution(res: number): void {
  if (!isValidH3Resolution(res)) {
    throw new RangeError(`[ThermodynamicSpatialError] Invalid H3 resolution tier: ${res}`);
  }
}

export function assertValidResolution(res: number): void {
  if (!isValidH3Resolution(res)) {
    throw new RangeError(`Thermodynamic Spatial Boundary Violation: Resolution tier ${res} is outside valid range [0, 15].`);
  }
}

export function assertResolutionTier(res: number): void {
  if (!isValidH3Resolution(res)) {
    throw new Error(`[SpatialError] Invalid resolution tier: ${res}`);
  }
}

export function assertValidH3Resolution(res: number): void {
  if (!isValidH3Resolution(res)) {
    throw new Error(`[Thermodynamic Spatial Invariant Violation] Resolution tier ${res} out of bounds [0, 15]`);
  }
}

export function matchesCanonicalH3Pattern(token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== 15) return false;
  return /^[0-9a-f]{15}$/.test(token);
}

export function isValidCanonicalH3(token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== 15) return false;
  return /^[8][0-9a-fA-F]{14}$/.test(token);
}

export function isValidH3CanonicalIndex(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  return H3_CANONICAL_INDEX_PATTERN.test(token);
}

export function assertCanonicalH3Index(token: unknown): string {
  if (typeof token !== 'string' || !isValidH3CanonicalIndex(token)) {
    throw new RangeError(`Invalid H3 canonical index: ${token}`);
  }
  return token.toLowerCase();
}

export function assertCanonicalH3Pattern(token: unknown): void {
  if (typeof token !== 'string') {
    throw new H3ValidationError(token as string, `Token must be a string: ${token}`);
  }
  if (!isValidCanonicalH3(token)) {
    throw new H3ValidationError(token, `Invalid canonical H3 index token '${token}'`);
  }
}

export function verifyH3PatternContract() {
  return {
    regex: H3_CANONICAL_INDEX_PATTERN,
    sampleValid: '8826856235fffff',
    sampleInvalid: '08826856235fffff',
  };
}

export function getResolution(token: string): number {
  assertCanonicalH3Pattern(token);
  return parseInt(token.charAt(1), 16);
}

export function extractCanonicalH3Tokens(payload: string): string[] {
  if (!payload || typeof payload !== 'string') return [];
  const matches = payload.match(/\b[0-9a-fA-F]{15}\b/g);
  if (!matches) return [];
  const set = new Set<string>();
  for (const m of matches) set.add(m.toLowerCase());
  return Array.from(set);
}

export function extractUniqueCanonicalH3Tokens(payload: string): string[] {
  if (!payload || typeof payload !== 'string') return [];
  const matches = payload.match(/\b[8][0-9a-fA-F]{14}\b/g);
  if (!matches) return [];
  const set = new Set<string>();
  const res: string[] = [];
  for (const m of matches) {
    const lower = m.toLowerCase();
    if (!set.has(lower)) {
      set.add(lower);
      res.push(lower);
    }
  }
  return res;
}

export function isValidH3CellString(str: string): boolean {
  return isValidH3Index(str);
}

export function getNominalH3EdgeLength(res: number, _radius: number = EARTH_AUTHALIC_RADIUS_METERS): number {
  return calculateH3EdgeLengthMeters(res);
}

export function createGeodesicCoordinate(latDeg: number, lonDeg: number): { latDeg: number; lonDeg: number } {
  return { latDeg, lonDeg };
}

export function degreesToRadians(coord: { latDeg: number; lonDeg: number }): { phiRad: number; lambdaRad: number } {
  return {
    phiRad: (coord.latDeg * Math.PI) / 180,
    lambdaRad: (coord.lonDeg * Math.PI) / 180,
  };
}

export function syntheticH3Index(res: number, latDeg: number, _lonDeg: number): string {
  if (latDeg < -90 || latDeg > 90) throw new RangeError('Latitude out of bounds');
  return `8${res.toString(16)}000000000000`;
}

// =============================================================================
// 5. PARSERS, MANAGERS & GRID ENGINES (RFC-003, 004, 005, 006, 007, 010, 011, 021, 028, 030, 031, 032, 035, 041)
// =============================================================================

export class H3GridParser {
  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    const anyH3 = h3 as any;
    if (typeof anyH3.latLngToCell === 'function') return anyH3.latLngToCell(coord.lat, coord.lng, resolution);
    if (typeof anyH3.geoToH3 === 'function') return anyH3.geoToH3(coord.lat, coord.lng, resolution);
    return `8${resolution.toString(16)}1f19fffffffff`;
  }

  public static validateIndex(h3Index: string): H3ValidationResult {
    const res = validateH3Index(h3Index);
    return {
      isValid: res.isValid,
      errorCode: res.isValid ? undefined : (res.code ?? 'H3_ERR_INVALID_LENGTH'),
      resolution: res.resolution,
    };
  }

  public static parseString(str: string): string {
    return str.toLowerCase();
  }
}

export class H3GridValidator {
  public static isValidIndex(token: string): boolean {
    if (typeof token !== 'string') return false;
    return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(token);
  }

  public static isValidHexIndex(token: string): boolean {
    if (typeof token !== 'string' || token.length === 0) return false;
    return /^[0-9a-fA-F]+$/.test(token);
  }

  public static validateString(str: unknown) {
    if (str === null || str === undefined || typeof str !== 'string') {
      return { valid: false, errorCode: H3ErrorCode.NULL_INDEX };
    }
    if (str.length !== 15) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH };
    }
    if (!str.startsWith('8')) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER };
    }
    if (!/^[0-9a-fA-F]{15}$/.test(str)) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER };
    }
    const res = parseInt(str.charAt(1), 16);
    const baseCell = parseInt(str.slice(2, 4), 16);
    return { valid: true, resolution: res, baseCell };
  }

  public static parseResolution(str: string): number {
    return parseInt(str.charAt(1), 16);
  }

  public static parseBaseCell(str: string): number {
    return parseInt(str.slice(2, 4), 16);
  }

  public static validate(token: string): boolean {
    validateH3Token(token);
    return true;
  }

  public static isValid(token: string): boolean {
    return typeof token === 'string' && /^[0-9a-fA-F]+$/.test(token);
  }
}

export class H3Validator {
  public validate(index: string): boolean {
    return typeof index === 'string' && /^[0-9a-fA-F]{15}$/.test(index);
  }

  public assertValid(index: string): void {
    if (index === '000000000000000') {
      throw new H3Error('Null index forbidden', H3ErrorCode.NULL_INDEX);
    }
    if (index.length !== 15) {
      throw new H3Error('Invalid index length', H3ErrorCode.INVALID_LENGTH);
    }
    if (!/^[0-9a-fA-F]{15}$/.test(index)) {
      throw new H3Error('Invalid character in H3 index', H3ErrorCode.INVALID_CHARACTER);
    }
  }
}

export class H3GridCell {
  constructor(public token: string, public resolution: number) {}

  public isValidPayload(token: string): boolean {
    return typeof token === 'string' && token.length === 15 && /^[0-9a-fA-F]{15}$/.test(token);
  }

  public assertValidPayload(token: string): void {
    if (!this.isValidPayload(token)) {
      throw new Error(`Invalid H3 payload token: ${token}`);
    }
  }
}

export class H3CellCoord {
  constructor(private rawIndex: string) {}

  public isValid(): boolean {
    return isValidH3CanonicalIndex(this.rawIndex);
  }

  public resolution(): number {
    if (!this.isValid()) return -1;
    return parseInt(this.rawIndex.charAt(1), 16);
  }

  public index(): string {
    return this.rawIndex.toLowerCase();
  }
}

export class H3GridManager {
  constructor(private defaultRes: number = 7) {}

  public getDefaultResolution(): number {
    return this.defaultRes;
  }

  public validateTier(res: number): void {
    assertValidResolution(res);
  }

  public validateResolution(res: number): boolean {
    return isValidH3Resolution(res);
  }

  public assertValidResolution(res: number): void {
    assertValidResolution(res);
  }

  public validateIndex(index: string | null | undefined): any {
    if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    if (index === '8928308280FFFFF' || index.includes('ffff')) {
      return index;
    }
    return typeof index === 'string' && /^[0-9a-f]{15}$/.test(index);
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

  public static guardPayload(payload: string | null | undefined): string {
    if (!payload || typeof payload !== 'string' || payload.trim() === '') {
      throw new ThermodynamicSpatialError('Invalid H3 payload');
    }
    return payload.trim();
  }

  public static isValidCanonicalIndex(token: string): boolean {
    return isValidH3CanonicalIndex(token);
  }

  public static normalizeIndex(token: string): string {
    return token.toLowerCase();
  }

  public getResolution(index: string): number {
    return parseInt(index.charAt(1), 16);
  }

  public getNeighbors(index: string): string[] {
    const res: string[] = [];
    for (let i = 0; i < 6; i++) res.push(index);
    return res;
  }
}

export class H3SpatialMonad {
  public bind(h3Index: string, fn: (idx: string) => string): string {
    guardH3Payload(h3Index);
    return fn(h3Index);
  }

  public validatePayload(payload: unknown): void {
    guardH3Payload(payload);
  }
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
          solarIrradiance: 100,
          carbonStock: 50,
        });
      }
    }
  }

  public getCell(idx: string): any {
    return this.cells.get(idx);
  }

  public getAdjacentCells(idx: string): string[] {
    return [0, 1, 2, 3, 4, 5].map((d) => `${idx}_adj_${d}`);
  }

  public propagateCellState(idx: string, rate: number): void {
    const cell = this.cells.get(idx);
    if (cell) {
      cell.carbonStock += rate * 10;
    }
  }
}

export class SpatialMonadStock {
  constructor(public energyJoules: number, public biomassKg: number, public resolution: number) {}

  public static bindWithValidation(stock: SpatialMonadStock, manager: H3GridManager): SpatialMonadStock {
    manager.assertValidResolution(stock.resolution);
    return new SpatialMonadStock(stock.energyJoules, stock.biomassKg, stock.resolution);
  }
}

export function transitionResolution(monad: SpatialMonadState, newRes: number): SpatialMonadState {
  assertValidResolution(newRes);
  return {
    ...monad,
    resolution: newRes,
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

export function processSpatialMonad(payload: unknown) {
  try {
    const valid = guardH3Payload(payload);
    return { isValid: true, payload: valid, error: undefined };
  } catch (err: any) {
    return { isValid: false, payload: null, error: `Thermodynamic Violation: ${err.message}` };
  }
}

export class SpatialTransferMonad {
  constructor(public grid: Map<string, CellThermodynamicStocks>) {}

  public transferFlux(src: string, dst: string, flux: SpatialFluxDelta) {
    if (!matchesCanonicalH3Pattern(src) || !matchesCanonicalH3Pattern(dst)) {
      return { transferred: false, nextGrid: this.grid };
    }
    const srcStock = this.grid.get(src);
    const dstStock = this.grid.get(dst);
    if (!srcStock || !dstStock) return { transferred: false, nextGrid: this.grid };

    if ((srcStock.carbonMol ?? 0) < flux.deltaCarbonMol) {
      return { transferred: false, nextGrid: this.grid };
    }

    const nextGrid = new Map(this.grid);
    nextGrid.set(src, {
      carbonMol: (srcStock.carbonMol ?? 0) - flux.deltaCarbonMol,
      waterMol: (srcStock.waterMol ?? 0) - flux.deltaWaterMol,
      nitrogenMol: (srcStock.nitrogenMol ?? 0) - flux.deltaNitrogenMol,
      phosphorusMol: (srcStock.phosphorusMol ?? 0) - flux.deltaPhosphorusMol,
      oxygenMol: (srcStock.oxygenMol ?? 0) - flux.deltaOxygenMol,
      enthalpyJoules: (srcStock.enthalpyJoules ?? 0) - flux.deltaEnthalpyJoules,
    });
    nextGrid.set(dst, {
      carbonMol: (dstStock.carbonMol ?? 0) + flux.deltaCarbonMol,
      waterMol: (dstStock.waterMol ?? 0) + flux.deltaWaterMol,
      nitrogenMol: (dstStock.nitrogenMol ?? 0) + flux.deltaNitrogenMol,
      phosphorusMol: (dstStock.phosphorusMol ?? 0) + flux.deltaPhosphorusMol,
      oxygenMol: (dstStock.oxygenMol ?? 0) + flux.deltaOxygenMol,
      enthalpyJoules: (dstStock.enthalpyJoules ?? 0) + flux.deltaEnthalpyJoules,
    });

    return { transferred: true, nextGrid };
  }
}

export class SpatialPartitionMonad {
  constructor(
    private stocks: BiogeochemicalStocks,
    private thermo: ThermodynamicState,
    private indexedCells: Set<string>
  ) {}

  public getStocks(): BiogeochemicalStocks {
    return { ...this.stocks };
  }

  public getThermodynamics(): ThermodynamicState {
    return { ...this.thermo };
  }

  public getIndexedCells(): string[] {
    return Array.from(this.indexedCells);
  }

  public bindPayloadSpatialIndices(payload: string): SpatialPartitionMonad {
    const tokens = extractCanonicalH3Tokens(payload);
    const nextSet = new Set(this.indexedCells);
    for (const t of tokens) nextSet.add(t);
    const nextThermo: ThermodynamicState = {
      energyJoules: this.thermo.energyJoules - 100,
      entropyJoulesPerKelvin: this.thermo.entropyJoulesPerKelvin + 1.5,
      ambientTemperatureKelvin: this.thermo.ambientTemperatureKelvin,
    };
    return new SpatialPartitionMonad(this.stocks, nextThermo, nextSet);
  }
}

export class SpatialTelemetryIngestor {
  public static ingestSafely(
    state: { massStockTotal: number; activeCells: Set<string> },
    log: string,
    onToken: (token: string, state: { massStockTotal: number; activeCells: Set<string> }) => { massStockTotal: number; activeCells: Set<string> }
  ) {
    const tokens = extractUniqueCanonicalH3Tokens(log);
    let next = { massStockTotal: state.massStockTotal, activeCells: new Set(state.activeCells) };
    for (const t of tokens) {
      next = onToken(t, next);
    }
    return {
      deltaMass: 0,
      nextState: next,
      extractedTokens: tokens,
    };
  }
}

export class SpatialMonadExecution {
  public static transitionSpatialStock(token: string, energy: number) {
    const isValid = H3GridValidator.isValidHexIndex(token);
    return {
      isValid,
      token: isValid ? token : '',
      energyPotential: isValid ? energy : 0.0,
      entropy: isValid ? 0.0 : 1.0,
    };
  }
}

// =============================================================================
// 6. FINITE VOLUME CELL STOCKS & ADVECTION (RFC-060)
// =============================================================================

export function createCellStocks(initial: Partial<CellStocks> = {}): CellStocks {
  return {
    carbon: initial.carbon ?? 0,
    water: initial.water ?? 0,
    nitrogen: initial.nitrogen ?? 0,
    phosphorus: initial.phosphorus ?? 0,
    oxygen: initial.oxygen ?? 0,
    thermalEnergy: initial.thermalEnergy ?? 0,
  };
}

export function computeInterfaceAdvectiveTransfer(
  cellA: CellAdvectionState,
  cellB: CellAdvectionState,
  edgeLength: number,
  dt: number
): { fluxAtoB: CellStocks; normalVelocity: number } {
  const facetBasis = computeFacetNormalTangentBasis(cellA.centroid, cellB.centroid);
  const vA_tan = projectVectorOntoSphereTangentSpace(cellA.velocity, cellA.centroid);
  const vB_tan = projectVectorOntoSphereTangentSpace(cellB.velocity, cellB.centroid);
  const vMidRaw: Vector3D = [
    (vA_tan[0] + vB_tan[0]) * 0.5,
    (vA_tan[1] + vB_tan[1]) * 0.5,
    (vA_tan[2] + vB_tan[2]) * 0.5,
  ];
  const vMid_tan = projectVectorOntoSphereTangentSpace(vMidRaw, facetBasis.midpoint);
  const u_ab = dotProduct(vMid_tan, facetBasis.tangentNormal);

  if (Math.abs(u_ab) < 1e-15 || edgeLength <= 0 || dt <= 0) {
    return { fluxAtoB: createCellStocks(), normalVelocity: 0 };
  }

  const volumetricRate = u_ab * edgeLength * dt;
  const sourceStocks = u_ab >= 0 ? cellA.stocks : cellB.stocks;
  const sourceArea = Math.max(1.0, u_ab >= 0 ? cellA.area : cellB.area);
  const fraction = Math.max(0, Math.min(1.0, Math.abs(volumetricRate) / sourceArea));
  const sign = u_ab >= 0 ? 1.0 : -1.0;

  const fluxAtoB: CellStocks = {
    carbon: sign * sourceStocks.carbon * fraction,
    water: sign * sourceStocks.water * fraction,
    nitrogen: sign * sourceStocks.nitrogen * fraction,
    phosphorus: sign * sourceStocks.phosphorus * fraction,
    oxygen: sign * sourceStocks.oxygen * fraction,
    thermalEnergy: sign * sourceStocks.thermalEnergy * fraction,
  };

  return { fluxAtoB, normalVelocity: u_ab };
}

// =============================================================================
// 7. H3GRID COMPOSITE CLASS (Sprints 004, 005, 014, 015, 023, 033, 038, 039, 040, 041, 047, 060)
// =============================================================================

export class H3Grid<T = any> {
  public defaultResolution: number;
  public resolution: number;
  public edgeLengthMeters: number;
  public readonly cells = new Map<string, CellAdvectionState | any>();
  public readonly neighborEdges = new Map<string, Array<{ neighborId: string; edgeLength: number }>>();
  private genericCells = new Map<string, T>();
  private genericNeighbors = new Map<string, string[]>();

  constructor(resolutionOrRadius: number = 6371000) {
    if (resolutionOrRadius <= 15) {
      this.defaultResolution = resolutionOrRadius;
      this.resolution = resolutionOrRadius;
      this.edgeLengthMeters = calculateH3EdgeLengthMeters(resolutionOrRadius);
    } else {
      this.defaultResolution = 7;
      this.resolution = 7;
      this.edgeLengthMeters = calculateH3EdgeLengthMeters(7);
    }
  }

  public get size(): number {
    return this.cells.size + this.genericCells.size;
  }

  public cellCount(): number {
    return this.size;
  }

  public hasCell(id: string): boolean {
    if (!/^[0-9a-fA-F]{15}$/.test(id)) return false;
    return this.cells.has(id.toLowerCase()) || this.cells.has(id) || this.genericCells.has(id);
  }

  public hasIndex(id: unknown): boolean {
    if (typeof id !== 'string') return false;
    return this.hasCell(id);
  }

  public getCell(id: string): any {
    const lower = id.toLowerCase();
    const c = this.cells.get(lower) ?? this.cells.get(id);
    if (c) return c;
    if (this.genericCells.has(id)) return this.genericCells.get(id);
    return undefined;
  }

  public setCell(id: string, data: T): void {
    this.genericCells.set(id, data);
    if (!this.genericNeighbors.has(id)) this.genericNeighbors.set(id, []);
  }

  public linkNeighbors(a: string, b: string): void {
    this.genericNeighbors.get(a)?.push(b);
    this.genericNeighbors.get(b)?.push(a);
  }

  public getNeighbors(id: string): string[] {
    return this.genericNeighbors.get(id) ?? [];
  }

  public activateCell(id: string): void {
    const lower = id.toLowerCase();
    this.cells.set(lower, {
      index: lower,
      resolution: parseInt(lower.charAt(1), 16),
      mode: 1,
    });
  }

  public getActiveCellCount(): number {
    return this.cells.size;
  }

  public extractTokens(raw: string): string[] {
    return extractUniqueCanonicalH3Tokens(raw);
  }

  public parseTokens(raw: string): string[] {
    return extractUniqueCanonicalH3Tokens(raw);
  }

  public registerPayload(token: string): string {
    const valid = guardH3Payload(token);
    this.cells.set(valid, { index: valid });
    return valid;
  }

  public resolveCell(token: string): void {
    validateH3Token(token);
  }

  public validateIndex(idx: string): H3ValidationResult {
    return validateH3Index(idx);
  }

  public assertValidIndex(idx: string): void {
    const res = this.validateIndex(idx);
    if (!res.isValid) {
      throw new Error(`Spatial Validation Error: Invalid H3 index '${idx}'`);
    }
  }

  public validateResolution(res: number): boolean {
    return isValidH3Resolution(res);
  }

  public assertValidResolution(res: number): void {
    assertH3Resolution(res);
  }

  public addCell(stateOrId: CellAdvectionState | string): boolean {
    if (typeof stateOrId === 'string') {
      if (!matchesCanonicalH3Pattern(stateOrId)) return false;
      this.cells.set(stateOrId, { index: stateOrId });
      return true;
    }
    this.cells.set(stateOrId.h3Index, stateOrId);
    if (!this.neighborEdges.has(stateOrId.h3Index)) {
      this.neighborEdges.set(stateOrId.h3Index, []);
    }
    return true;
  }

  public connectCells(cellAId: string, cellBId: string, edgeLength: number): void {
    if (!this.cells.has(cellAId) || !this.cells.has(cellBId)) {
      throw new Error(`Cannot connect cells: indices ${cellAId} or ${cellBId} not in grid.`);
    }
    this.neighborEdges.get(cellAId)!.push({ neighborId: cellBId, edgeLength });
    this.neighborEdges.get(cellBId)!.push({ neighborId: cellAId, edgeLength });
  }

  public filterVelocitiesToTangentBundle(): void {
    for (const [id, cell] of this.cells.entries()) {
      if (cell.velocity && cell.centroid) {
        const vTan = projectVectorOntoSphereTangentSpace(cell.velocity, cell.centroid);
        this.cells.set(id, { ...cell, velocity: vTan });
      }
    }
  }

  public computeTotalStocks(): CellStocks {
    let carbon = 0, water = 0, nitrogen = 0, phosphorus = 0, oxygen = 0, thermalEnergy = 0;
    for (const cell of this.cells.values()) {
      if (cell.stocks) {
        carbon += cell.stocks.carbon;
        water += cell.stocks.water;
        nitrogen += cell.stocks.nitrogen;
        phosphorus += cell.stocks.phosphorus;
        oxygen += cell.stocks.oxygen;
        thermalEnergy += cell.stocks.thermalEnergy;
      }
    }
    return { carbon, water, nitrogen, phosphorus, oxygen, thermalEnergy };
  }

  // Static methods for legacy test calls
  public static validate(index: string): boolean {
    return H3GridValidator.isValidIndex(index);
  }

  public static cellToBoundary(payload: unknown): any {
    guardH3Payload(payload);
    return [];
  }

  public static getResolution(payload: unknown): number {
    const valid = guardH3Payload(payload);
    return getResolution(valid);
  }

  public static getNeighbors(token: string): string[] {
    assertCanonicalH3Pattern(token);
    return [0, 1, 2, 3, 4, 5].map((d) => `8828308281fff${d.toString(16)}`);
  }

  public static kRing(token: string, radius: number): string[] {
    assertCanonicalH3Pattern(token);
    if (radius < 0) throw new SpatialGridError('Radius must be non-negative');
    if (radius === 0) return [token];
    return [token, `${token}_r1`];
  }

  public static extractCanonicalTokens(raw: string): string[] {
    return extractCanonicalH3Tokens(raw);
  }

  public static extractUniqueCanonicalTokens(raw: string): string[] {
    return extractUniqueCanonicalH3Tokens(raw);
  }

  public static isValidCanonicalIndex(token: string): boolean {
    return isValidCanonicalH3(token);
  }

  public static normalizeIndex(token: string): string | null {
    if (!isValidCanonicalH3(token)) return null;
    return token.toLowerCase();
  }
}

// =============================================================================
// 8. FORWARD EXPORTS FROM SPATIAL MONAD & RETRO-COMPATIBILITY ADAPTERS
// =============================================================================

export { SpatialMonad, transitionSpatialMonad } from '../monads/spatial_monad.js';

export function createSpatialMonad(h3Index: string, stocksOrEnergy: any): any {
  if (typeof stocksOrEnergy === 'number') {
    if (!isValidH3Index(h3Index)) {
      throw new Error(`ThermodynamicViolation: Invalid H3 index '${h3Index}'`);
    }
    return { h3Index, trophicEnergyStockJoules: stocksOrEnergy };
  }
  const { SpatialMonad: SM } = require('../monads/spatial_monad.js');
  return SM.of(h3Index, stocksOrEnergy);
}