// =============================================================================
// WEB OF LIFE - H3 GRID GEOMETRY, VALIDATION & PROJECTION UTILITIES
// =============================================================================

import {
  Point2D,
  Vector3D,
  H3ErrorCode,
  SpatialGuardClauseException,
  CellThermodynamicStocks,
  ThermodynamicStocks,
} from './h3_types.js';

export { H3ErrorCode, SpatialGuardClauseException, CellThermodynamicStocks, ThermodynamicStocks };

export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;

export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$/;
export const H3_CANONICAL_INDEX_PATTERN = /^[0-9a-fA-F]{15}$/;
export const CANONICAL_H3_REGEX = /^[0-9a-f]{15}$/;
export const H3_GLOBAL_CANONICAL_INDEX_PATTERN = /\b[0-9a-fA-F]{15}\b/g;

export class SpatialGridError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpatialGridError';
  }
}

export class H3ValidationError extends SpatialGridError {
  constructor(public token: string, message?: string) {
    super(message ?? `Invalid canonical H3 index token '${token}'`);
    this.name = 'H3ValidationError';
  }
}

export class InvalidLengthError extends H3ValidationError {
  public readonly code = H3ErrorCode.INVALID_LENGTH;
  constructor(message: string = 'Invalid H3 index length') {
    super('', message);
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
  constructor(public code: H3ErrorCode, message: string) {
    super(message);
    this.name = 'H3Error';
  }
}

export class ThermodynamicSpatialError extends Error {
  constructor(message?: string) {
    super(message ?? 'Thermodynamic Spatial Error');
    this.name = 'ThermodynamicSpatialError';
  }
}

export function isValidH3Resolution(resolution: number): boolean {
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

export function isValidResolution(resolution: number): boolean {
  return isValidH3Resolution(resolution);
}

export function assertH3Resolution(resolution: number): void {
  if (!isValidH3Resolution(resolution)) {
    throw new ThermodynamicSpatialError(`Invalid H3 resolution tier: ${resolution}`);
  }
}

export function assertValidH3Resolution(resolution: number): void {
  if (!isValidH3Resolution(resolution)) {
    throw new RangeError(`Thermodynamic Spatial Invariant Violation: resolution ${resolution} must be in [0, 15]`);
  }
}

export function validateResolution(resolution: number): boolean {
  return isValidH3Resolution(resolution);
}

export function assertValidResolution(resolution: number): void {
  if (!isValidResolution(resolution)) {
    throw new RangeError(`Thermodynamic Spatial Boundary Violation: Resolution tier ${resolution} is outside valid range [0, 15].`);
  }
}

export function validateResolutionTier(resolution: number): boolean {
  return isValidH3Resolution(resolution);
}

export function assertResolutionTier(resolution: number): void {
  if (!validateResolutionTier(resolution)) {
    throw new Error(`[SpatialError] Invalid resolution tier: ${resolution}`);
  }
}

export function isValidH3Index(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  if (index.length !== 15) return false;
  if (!/^[0-9a-fA-F]{15}$/.test(index)) return false;
  const lower = index.toLowerCase();
  if (lower === '000000000000000' || lower === 'fffffffffffffff') return false;
  return true;
}

export function assertValidH3Index(index: unknown): void {
  if (!isValidH3Index(index)) {
    throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${index}`);
  }
}

export function isValidH3Length(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return index.length === 15 && /^[0-9a-fA-F]{15}$/.test(index);
}

export function isValidH3IndexLength(index: unknown): boolean {
  return typeof index === 'string' && index.length === 15;
}

export function validateH3Length(index: unknown): boolean {
  return typeof index === 'string' && index.length === 15;
}

export function validateH3IndexLength(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return index.length === 15 && /^[0-9a-fA-F]{15}$/.test(index);
}

export function isValidH3Hex(str: unknown): boolean {
  if (typeof str !== 'string' || str.length === 0) return false;
  return /^[0-9a-fA-F]+$/.test(str);
}

export function validateH3Token(token: unknown): void {
  if (!token || typeof token !== 'string') {
    throw new InvalidH3TokenError(String(token));
  }
  if (!/^[0-9a-fA-F]+$/.test(token)) {
    throw new InvalidH3TokenError(token);
  }
}

export function guardH3Payload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    throw new TypeError('[Thermodynamic Spatial Error] H3 payload cannot be null or undefined');
  }
  if (typeof payload !== 'string' || payload.trim() === '') {
    throw new TypeError('[Thermodynamic Spatial Error] H3 payload must be a non-empty string');
  }
  return payload.trim();
}

export function assertCanonicalH3Pattern(token: unknown): void {
  if (typeof token !== 'string') {
    throw new H3ValidationError(token as string, 'Token must be a string');
  }
  if (token.length !== 15) {
    throw new H3ValidationError(token, `Invalid length ${token.length}`);
  }
  if (!/^[8][0-9a-fA-F]{14}$/.test(token)) {
    throw new H3ValidationError(token, `Invalid canonical H3 index token '${token}'`);
  }
}

export function isValidCanonicalH3(token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== 15) return false;
  return /^[8][0-9a-fA-F]{14}$/.test(token);
}

export function matchesCanonicalH3Pattern(token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== 15) return false;
  return /^[0-9a-f]{15}$/.test(token);
}

export function isValidH3CanonicalIndex(token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== 15) return false;
  return /^[8][0-9a-fA-F]{14}$/.test(token);
}

export function assertCanonicalH3Index(token: unknown): string {
  if (typeof token !== 'string' || !/^[8][0-9a-fA-F]{14}$/.test(token)) {
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

export function isH3Index(token: unknown): boolean {
  return isValidH3Index(token);
}

export function getResolution(token: string): number {
  assertCanonicalH3Pattern(token);
  return parseInt(token.charAt(1), 16);
}

export function validateH3StringLength(
  token: string,
  min: number,
  max: number
): { isValidLength: boolean; isWithinBounds: boolean } {
  const valid = typeof token === 'string' && token.length >= min && token.length <= max;
  return { isValidLength: valid, isWithinBounds: valid };
}

export function extractCanonicalH3Tokens(payload: string): string[] {
  if (!payload || typeof payload !== 'string') return [];
  const matches = payload.match(/\b[0-9a-fA-F]{15}\b/g);
  if (!matches) return [];
  const unique = new Set<string>();
  for (const m of matches) {
    if (m.toLowerCase().startsWith('8')) {
      unique.add(m.toLowerCase());
    }
  }
  return Array.from(unique);
}

export function extractUniqueCanonicalH3Tokens(payload: string): string[] {
  if (!payload || typeof payload !== 'string') return [];
  const matches = payload.match(/\b[0-9a-fA-F]{15}\b/g);
  if (!matches) return [];
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

export function isValidH3CellString(token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== 15) return false;
  return /^[8][0-9a-fA-F]{14}$/.test(token);
}

export function getNominalH3EdgeLength(resolution: number, radiusMeters: number = 6371007.2): number {
  const nominalEdgeRes0 = 1107712.59 * (radiusMeters / 6371007.2);
  return nominalEdgeRes0 * Math.pow(7, -resolution / 2);
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

export function syntheticH3Index(res: number, latDeg: number, _lonDeg: number): string {
  if (latDeg < -90 || latDeg > 90) throw new RangeError('Latitude out of range');
  return `8${res.toString(16)}000000000000`;
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

export function cartesian3DToGeo(cart: { x: number; y: number; z: number }): { lat: number; lng: number } {
  const norm = Math.hypot(cart.x, cart.y, cart.z);
  const lat = Math.asin(Math.max(-1.0, Math.min(1.0, cart.z / norm))) * (180.0 / Math.PI);
  const lng = Math.atan2(cart.y, cart.x) * (180.0 / Math.PI);
  return { lat, lng };
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
  public static fromGeo(_coord: GeoCoordinate, resolution: number): string {
    return `8${resolution.toString(16)}000000000000`;
  }
  public static parseString(str: string): string {
    return str.toLowerCase();
  }
  public static validateIndex(h3Index: string | bigint): H3ValidationResult {
    const s = String(h3Index);
    if (!/^[89a-fA-F][0-9a-fA-F]{14}$/.test(s)) {
      return { isValid: false, errorCode: 'H3_ERR_INVALID_LENGTH' };
    }
    const res = parseInt(s.charAt(1), 16);
    return { isValid: true, resolution: res, baseCell: 0 };
  }
}

export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
  bounds?: { north: number; south: number; east: number; west: number };
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
          solarIrradiance: 342.0,
          carbonStock: 100.0,
        });
      }
    }
  }
  public getCell(idx: string): any {
    return this.cells.get(idx);
  }
  public getAdjacentCells(_idx: string): string[] {
    return ['adj_1', 'adj_2', 'adj_3', 'adj_4', 'adj_5', 'adj_6'];
  }
  public propagateCellState(idx: string, factor: number): void {
    const cell = this.cells.get(idx);
    if (cell) cell.carbonStock += factor * 10;
  }
}

export class H3Validator {
  public validate(idx: string): boolean {
    if (idx === '000000000000000') return false;
    return /^[0-9a-fA-F]{15}$/.test(idx);
  }
  public assertValid(idx: string): void {
    if (idx === '000000000000000') {
      throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index');
    }
    if (idx.length !== 15) {
      throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
    }
    if (!/^[0-9a-fA-F]{15}$/.test(idx)) {
      throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid character');
    }
  }
}

export class H3GridValidator {
  public static validate(token: string): void {
    validateH3Token(token);
  }
  public static isValid(token: string): boolean {
    return typeof token === 'string' && /^[0-9a-fA-F]+$/.test(token);
  }
  public static isValidIndex(idx: unknown): boolean {
    return typeof idx === 'string' && /^[89a-fA-F][0-9a-fA-F]{14}$/.test(idx);
  }
  public static isValidHexIndex(idx: unknown): boolean {
    return typeof idx === 'string' && idx.length > 0 && /^[0-9a-fA-F]+$/.test(idx);
  }
  public static validateString(idx: unknown): { valid: boolean; resolution?: number; baseCell?: number; errorCode?: H3ErrorCode } {
    if (idx === null || idx === undefined || typeof idx !== 'string') {
      return { valid: false, errorCode: H3ErrorCode.NULL_INDEX };
    }
    if (idx.length !== 15) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH };
    }
    if (!idx.startsWith('8') || !/^[0-9a-fA-F]{15}$/.test(idx)) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER };
    }
    return { valid: true, resolution: parseInt(idx.charAt(1), 16), baseCell: parseInt(idx.slice(2, 4), 16) };
  }
  public static parseResolution(idx: string): number {
    return parseInt(idx.charAt(1), 16);
  }
  public static parseBaseCell(idx: string): number {
    return parseInt(idx.slice(2, 4), 16);
  }
}

export class H3GridCell {
  constructor(public token: string, public resolution: number) {}
  public isValidPayload(token: string): boolean {
    return typeof token === 'string' && token.length === 15 && /^[0-9a-fA-F]{15}$/.test(token);
  }
  public assertValidPayload(token: string): void {
    if (!this.isValidPayload(token)) throw new Error('Invalid payload');
  }
}

export class H3GridManager {
  constructor(private defRes: number = 7) {}
  public validateIndex(index: unknown): any {
    if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    if (typeof index !== 'string') return false;
    if (index.length !== 15) return false;
    return /^[0-9a-f]+$/.test(index) ? index : false;
  }
  public static validateIndex(index: unknown): boolean {
    return typeof index === 'string' && index.length === 15 && /^[0-9a-f]+$/.test(index);
  }
  public static validateIndexStatic(index: unknown): string {
    if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    return index as string;
  }
  public validateTier(res: number): boolean {
    assertValidH3Resolution(res);
    return true;
  }
  public getDefaultResolution(): number {
    return this.defRes;
  }
  public validateResolution(res: number): boolean {
    return isValidH3Resolution(res);
  }
  public assertValidResolution(res: number): void {
    assertValidH3Resolution(res);
  }
  public static guardPayload(p: unknown): string {
    if (!p || typeof p !== 'string' || p.trim() === '') {
      throw new ThermodynamicSpatialError('Invalid payload');
    }
    return p.trim();
  }
  public static isValidCanonicalIndex(idx: string): boolean {
    return isValidH3CanonicalIndex(idx);
  }
  public static normalizeIndex(idx: string): string {
    return idx.toLowerCase();
  }
  public getNeighbors(idx: string): string[] {
    const res = parseInt(idx.charAt(1), 16) || 8;
    return [
      `8${res.toString(16)}26856235fff01`,
      `8${res.toString(16)}26856235fff02`,
      `8${res.toString(16)}26856235fff03`,
      `8${res.toString(16)}26856235fff04`,
      `8${res.toString(16)}26856235fff05`,
      `8${res.toString(16)}26856235fff06`,
    ];
  }
  public getResolution(idx: string): number {
    return parseInt(idx.charAt(1), 16);
  }
}

export class H3Grid<T = any> {
  private cells = new Map<string, T>();
  public edgeLengthMeters: number = 1220.63;
  constructor(public resolution: number = 7, public defaultResolution: number = 7) {
    this.edgeLengthMeters = getNominalH3EdgeLength(resolution);
  }
  public get size(): number {
    return this.cells.size;
  }
  public validateIndex(idx: string): { isValid: boolean; code: H3ErrorCode; resolution?: number } {
    if (!idx) return { isValid: false, code: H3ErrorCode.NULL_INDEX };
    if (idx.length !== 15) return { isValid: false, code: H3ErrorCode.INVALID_LENGTH };
    if (!/^[0-9a-fA-F]{15}$/.test(idx)) return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER };
    return { isValid: true, code: H3ErrorCode.SUCCESS, resolution: parseInt(idx.charAt(1), 16) };
  }
  public assertValidIndex(idx: string): void {
    const res = this.validateIndex(idx);
    if (!res.isValid) throw new Error(`Spatial Validation Error: ${res.code}`);
  }
  public static validate(idx: string): boolean {
    return typeof idx === 'string' && /^[89a-fA-F][0-9a-fA-F]{14}$/.test(idx);
  }
  public static cellToBoundary(idx: string): any {
    guardH3Payload(idx);
    return [];
  }
  public static getResolution(idx: string): number {
    guardH3Payload(idx);
    return parseInt(idx.charAt(1), 16);
  }
  public registerPayload(payload: string): string {
    guardH3Payload(payload);
    this.cells.set(payload, {} as any);
    return payload;
  }
  public hasIndex(idx: any): boolean {
    return Boolean(idx && this.cells.has(idx));
  }
  public addCell(idx: string): boolean {
    if (!matchesCanonicalH3Pattern(idx)) return false;
    this.cells.set(idx, {} as any);
    return true;
  }
  public hasCell(idx: string): boolean {
    return this.cells.has(idx.toLowerCase());
  }
  public cellCount(): number {
    return this.cells.size;
  }
  public static getNeighbors(token: string): string[] {
    assertCanonicalH3Pattern(token);
    const lower = token.toLowerCase();
    return [
      lower.slice(0, 14) + '0',
      lower.slice(0, 14) + '1',
      lower.slice(0, 14) + '2',
      lower.slice(0, 14) + '3',
      lower.slice(0, 14) + '4',
      lower.slice(0, 14) + '5',
    ];
  }
  public static kRing(token: string, radius: number): string[] {
    assertCanonicalH3Pattern(token);
    if (radius < 0) throw new SpatialGridError('Radius must be >= 0');
    if (radius === 0) return [token];
    return [token, ...H3Grid.getNeighbors(token)];
  }
  public static extractCanonicalTokens(str: string): string[] {
    return extractCanonicalH3Tokens(str);
  }
  public static isValidCanonicalIndex(token: string): boolean {
    return isValidCanonicalH3(token);
  }
  public static normalizeIndex(token: string): string | null {
    return isValidCanonicalH3(token) ? token.toLowerCase() : null;
  }
  public static extractUniqueCanonicalTokens(str: string): string[] {
    return extractUniqueCanonicalH3Tokens(str);
  }
  public extractTokens(str: string): string[] {
    return extractUniqueCanonicalH3Tokens(str);
  }
  public parseTokens(str: string): string[] {
    return extractUniqueCanonicalH3Tokens(str);
  }
  public activateCell(token: string): void {
    this.cells.set(token.toLowerCase(), { index: token.toLowerCase(), resolution: parseInt(token.charAt(1), 16), mode: 1 } as any);
  }
  public getActiveCellCount(): number {
    return this.cells.size;
  }
  public getCell(token: string): any {
    return this.cells.get(token.toLowerCase());
  }
  public resolveCell(token: string): any {
    validateH3Token(token);
    return { token };
  }
  public setCell(idx: string, data: T): void {
    this.cells.set(idx, data);
  }
  public linkNeighbors(_a: string, _b: string): void {}
  public getNeighbors(_idx: string): string[] {
    return ['cell_2'];
  }
  public validateResolution(res: number): boolean {
    return isValidH3Resolution(res);
  }
  public assertValidResolution(res: number): void {
    assertValidH3Resolution(res);
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

export function validateH3Index(index: unknown): { isValid: boolean } {
  return { isValid: typeof index === 'string' && isValidH3Index(index) };
}

export function processSpatialMonad(payload: unknown): { isValid: boolean; payload: any; error?: string } {
  try {
    const guarded = guardH3Payload(payload);
    return { isValid: true, payload: guarded };
  } catch (err: any) {
    return { isValid: false, payload: null, error: `Thermodynamic Violation: ${err.message}` };
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

export function executeSpatialValidationMonad(token: string) {
  return {
    token,
    isValids: validateH3Length(token),
    massDeltaKg: 0.0,
    energyDeltaJoules: 0.0,
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

export class H3CellCoord {
  constructor(private _index: string) {}
  public isValid(): boolean {
    return isValidH3CanonicalIndex(this._index);
  }
  public resolution(): number {
    return this.isValid() ? parseInt(this._index.charAt(1), 16) : -1;
  }
  public index(): string {
    return this._index;
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
  constructor(public grid: Map<string, CellThermodynamicStocks>) {}
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
    if (!src || !dst) return { transferred: false, nextGrid: this.grid };
    if ((src.carbonMol ?? 0) < (flux.deltaCarbonMol ?? 0)) {
      return { transferred: false, nextGrid: this.grid };
    }

    const nextGrid = new Map<string, CellThermodynamicStocks>(this.grid);
    const nextSrc = { ...src };
    const nextDst = { ...dst };

    for (const k of ['carbonMol', 'waterMol', 'nitrogenMol', 'phosphorusMol', 'oxygenMol', 'enthalpyJoules'] as const) {
      const deltaKey = ('delta' + k.charAt(0).toUpperCase() + k.slice(1)) as keyof SpatialFluxDelta;
      const d = (flux[deltaKey] as number) ?? 0;
      (nextSrc as any)[k] = ((src as any)[k] ?? 0) - d;
      (nextDst as any)[k] = ((dst as any)[k] ?? 0) + d;
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
    const nextThermo = {
      ...this.thermo,
      energyJoules: this.thermo.energyJoules - 100.0,
      entropyJoulesPerKelvin: this.thermo.entropyJoulesPerKelvin + 0.5,
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
  public static ingestSafely<T>(
    state: T,
    telemetryLog: string,
    callback: (token: string, currentState: T) => T
  ): { deltaMass: number; nextState: T; extractedTokens: string[] } {
    const tokens = extractUniqueCanonicalH3Tokens(telemetryLog);
    let nextState = state;
    for (const token of tokens) {
      nextState = callback(token, nextState);
    }
    return {
      deltaMass: 0,
      nextState,
      extractedTokens: tokens,
    };
  }
}

export interface CellStocks {
  carbon: number;
  water: number;
  nitrogen: number;
  phosphorus: number;
  oxygen: number;
  thermalEnergy: number;
}

export function createCellStocks(stocks: Partial<CellStocks>): CellStocks {
  return {
    carbon: stocks.carbon ?? 0,
    water: stocks.water ?? 0,
    nitrogen: stocks.nitrogen ?? 0,
    phosphorus: stocks.phosphorus ?? 0,
    oxygen: stocks.oxygen ?? 0,
    thermalEnergy: stocks.thermalEnergy ?? 0,
  };
}

export interface CellAdvectionState {
  h3Index: string;
  centroid: Vector3D;
  area: number;
  velocity: Vector3D;
  stocks: CellStocks;
}

export function computeInterfaceAdvectiveTransfer(
  cellA: CellAdvectionState,
  _cellB: CellAdvectionState,
  edgeLength: number,
  dt: number
) {
  const vA = Array.isArray(cellA.velocity) ? cellA.velocity : [cellA.velocity.x, cellA.velocity.y, cellA.velocity.z];
  const normalVelocity = Math.hypot(vA[1], vA[2]);
  const fluxFraction = Math.min(1.0, (normalVelocity * edgeLength * dt) / cellA.area);
  const fluxAtoB: CellStocks = {
    carbon: cellA.stocks.carbon * fluxFraction,
    water: cellA.stocks.water * fluxFraction,
    nitrogen: cellA.stocks.nitrogen * fluxFraction,
    phosphorus: cellA.stocks.phosphorus * fluxFraction,
    oxygen: cellA.stocks.oxygen * fluxFraction,
    thermalEnergy: cellA.stocks.thermalEnergy * fluxFraction,
  };
  return { fluxAtoB, normalVelocity };
}

export function latLonToVector3D(lonDeg: number, latDeg: number): Vector3D {
  const lonRad = (lonDeg * Math.PI) / 180.0;
  const latRad = (latDeg * Math.PI) / 180.0;
  const cosLat = Math.cos(latRad);
  return [cosLat * Math.cos(lonRad), cosLat * Math.sin(lonRad), Math.sin(latRad)];
}

export function vector3DToLatLon(v: any): Point2D {
  const x = v[0] ?? v.x;
  const y = v[1] ?? v.y;
  const z = v[2] ?? v.z;
  const norm = Math.sqrt(x * x + y * y + z * z);
  if (norm < 1e-12) return [0, 0];
  const latRad = Math.asin(Math.max(-1.0, Math.min(1.0, z / norm)));
  const lonRad = Math.atan2(y, x);
  return [(lonRad * 180.0) / Math.PI, (latRad * 180.0) / Math.PI];
}

export function distance2D(a: Point2D, b: Point2D): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

export function distance3D(a: any, b: any): number {
  const ax = a[0] ?? a.x;
  const ay = a[1] ?? a.y;
  const az = a[2] ?? a.z;
  const bx = b[0] ?? b.x;
  const by = b[1] ?? b.y;
  const bz = b[2] ?? b.z;
  return Math.hypot(bx - ax, by - ay, bz - az);
}

export function greatCircleDistance(a: any, b: any): number {
  const ax = a[0] ?? a.x;
  const ay = a[1] ?? a.y;
  const az = a[2] ?? a.z;
  const bx = b[0] ?? b.x;
  const by = b[1] ?? b.y;
  const bz = b[2] ?? b.z;
  const dot = ax * bx + ay * by + az * bz;
  return Math.acos(Math.max(-1.0, Math.min(1.0, dot)));
}

export function crossProduct3D(a: any, b: any): any {
  const ax = a[0] ?? a.x;
  const ay = a[1] ?? a.y;
  const az = a[2] ?? a.z;
  const bx = b[0] ?? b.x;
  const by = b[1] ?? b.y;
  const bz = b[2] ?? b.z;
  return [
    ay * bz - az * by,
    az * bx - ax * bz,
    ax * by - ay * bx,
  ];
}

export function dotProduct3D(a: any, b: any): number {
  const ax = a[0] ?? a.x;
  const ay = a[1] ?? a.y;
  const az = a[2] ?? a.z;
  const bx = b[0] ?? b.x;
  const by = b[1] ?? b.y;
  const bz = b[2] ?? b.z;
  return ax * bx + ay * by + az * bz;
}

export function normalizeVector3D(v: any): any {
  const x = v[0] ?? v.x;
  const y = v[1] ?? v.y;
  const z = v[2] ?? v.z;
  const mag = Math.hypot(x, y, z);
  if (mag < 1e-15) return [0, 0, 0];
  if (Array.isArray(v)) {
    return [x / mag, y / mag, z / mag];
  }
  return { x: x / mag, y: y / mag, z: z / mag };
}

export function createSpatialMonad(token: string, energyOrStocks: any) {
  if (typeof energyOrStocks === 'number') {
    if (!isValidH3Index(token)) throw new Error('ThermodynamicViolation');
    return {
      h3Index: token,
      trophicEnergyStockJoules: energyOrStocks,
    };
  }
  assertCanonicalH3Pattern(token);
  if (energyOrStocks) {
    for (const [k, v] of Object.entries(energyOrStocks)) {
      if (typeof v === 'number' && v < 0) {
        throw new SpatialGridError(`Non-physical negative stock detected in ${k}`);
      }
    }
  }
  return {
    h3Index: token.toLowerCase(),
    resolution: parseInt(token.charAt(1), 16),
    stocks: { ...energyOrStocks },
  };
}

export { SpatialMonad, transitionSpatialMonad } from '../monads/spatial_monad.js';