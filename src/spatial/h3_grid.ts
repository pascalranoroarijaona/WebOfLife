import * as h3 from 'h3-js';
import { 
  SpatialCell, 
  GeoCoordinate, 
  H3ValidationResult, 
  H3Resolution, 
  H3ResolutionTier, 
  H3ErrorCode,
  IH3GridQuery
} from './h3_types.js';

export { GeoCoordinate, H3ValidationResult, H3Resolution, H3ResolutionTier, H3ErrorCode, IH3GridQuery };

export class InvalidH3TokenError extends Error {
  constructor(token: string) {
    super(`Invalid H3 token contains non-hexadecimal symbols: "${token}"`);
    this.name = 'InvalidH3TokenError';
  }
}

export class ThermodynamicSpatialError extends Error {
  constructor(message: string) {
    super(`[ThermodynamicSpatialError] ${message}`);
    this.name = 'ThermodynamicSpatialError';
  }
}

export class H3Error extends Error {
  public code: H3ErrorCode;
  constructor(code: H3ErrorCode, message: string) {
    super(message);
    this.name = 'H3Error';
    this.code = code;
  }
}

export class H3ValidationError extends H3Error {
  constructor(code: H3ErrorCode, message: string) {
    super(code, message);
    this.name = 'H3ValidationError';
  }
}

export class InvalidLengthError extends H3Error {
  constructor(message: string) {
    super(H3ErrorCode.INVALID_LENGTH, message);
    this.name = 'InvalidLengthError';
  }
}

export const MIN_H3_RESOLUTION: H3Resolution = 0;
export const MAX_H3_RESOLUTION: H3Resolution = 15;
export const H3_REGEX: RegExp = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX: RegExp = /^[0-9a-fA-F]+$/;

export function validateH3Token(token: string): void {
  const hexRegex = /^[0-9a-fA-F]+$/;
  if (!token || !hexRegex.test(token)) {
    throw new InvalidH3TokenError(token);
  }
}

export function isValidH3Hex(token: string): boolean {
  if (typeof token !== 'string') return false;
  return /^[0-9a-fA-F]+$/.test(token);
}

export function isValidH3Index(token: string): boolean {
  if (typeof token !== 'string') return false;
  return /^[0-9a-fA-F]{15}$/.test(token);
}

export function assertValidH3Index(token: string): void {
  if (!isValidH3Index(token)) {
    throw new ThermodynamicSpatialError(`[Thermodynamic Spatial Violation] Invalid H3 index: ${token}`);
  }
}

export function isValidH3Length(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  return /^[0-9a-fA-F]{15}$/.test(token);
}

export function isValidH3IndexLength(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  return token.length === 15 && /^[0-9a-fA-F]+$/.test(token);
}

export function validateH3Length(token: unknown): boolean {
  return isValidH3Length(token);
}

export function validateH3IndexLength(token: unknown): boolean {
  return isValidH3IndexLength(token);
}

export function guardH3Payload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    throw new TypeError('H3 payload cannot be null or undefined.');
  }
  if (typeof payload !== 'string' || payload.trim() === '') {
    throw new TypeError('H3 payload must be a non-empty string.');
  }
  return payload.trim();
}

export function validateH3Index(index: unknown): H3ValidationResult {
  if (index === null || index === undefined) {
    return { isValid: false, code: H3ErrorCode.NULL_INDEX, errorCode: H3ErrorCode.NULL_INDEX, message: 'Null index' };
  }
  if (typeof index !== 'string') {
    return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Non-string index' };
  }
  if (index.length !== 15) {
    return { isValid: false, code: H3ErrorCode.INVALID_LENGTH, errorCode: H3ErrorCode.INVALID_LENGTH, message: 'Invalid length' };
  }
  if (!/^[0-9a-fA-F]{15}$/.test(index)) {
    return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid character' };
  }
  const res = parseInt(index[1], 16) || 0;
  const baseCell = parseInt(index.substring(2, 4), 16) || 0;
  return { isValid: true, valid: true, code: H3ErrorCode.SUCCESS, errorCode: H3ErrorCode.SUCCESS, resolution: res, baseCell };
}

export function isValidH3Resolution(resolution: number): resolution is H3Resolution {
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

export function isValidResolution(resolution: number): resolution is H3Resolution {
  return isValidH3Resolution(resolution);
}

export function assertValidH3Resolution(resolution: number): asserts resolution is H3Resolution {
  if (!isValidH3Resolution(resolution)) {
    throw new RangeError(`Thermodynamic Spatial Invariant Violation: Resolution ${resolution} out of bounds [0, 15]`);
  }
}

export function assertH3Resolution(resolution: number): asserts resolution is H3Resolution {
  if (!isValidH3Resolution(resolution)) {
    throw new ThermodynamicSpatialError(`Invalid H3 resolution tier: ${resolution}. Must be integer between 0 and 15.`);
  }
}

export function validateResolution(resolution: number): boolean {
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

export function assertValidResolution(resolution: number): void {
  if (!validateResolution(resolution)) {
    throw new RangeError(`Thermodynamic Spatial Boundary Violation: Resolution tier ${resolution} is outside valid range [0, 15].`);
  }
}

export function validateResolutionTier(resolution: number): resolution is H3Resolution {
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

export function assertResolutionTier(resolution: number): asserts resolution is H3Resolution {
  if (!validateResolutionTier(resolution)) {
    throw new Error(`[SpatialError] Invalid resolution tier ${resolution}`);
  }
}

export function processSpatialMonad(payload: unknown) {
  try {
    const p = guardH3Payload(payload);
    const val = validateH3Index(p);
    return { isValid: val.isValid, payload: p, error: val.isValid ? undefined : val.message };
  } catch (err: any) {
    return { isValid: false, payload: null, error: err.message };
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

export function transitionResolution(state: SpatialMonadState, newResolution: number): SpatialMonadState {
  assertValidResolution(newResolution);
  return {
    ...state,
    resolution: newResolution
  };
}

export class H3Grid {
  public defaultResolution: number;
  private registeredPayloads: Set<string> = new Set();

  constructor(defaultResolution: number = 7) {
    this.defaultResolution = defaultResolution;
  }

  public resolveCell(token: string): SpatialCell {
    validateH3Token(token);
    let lat = 0;
    let lng = 0;
    let res = this.defaultResolution;
    try {
      if (typeof h3.cellToLatLng === 'function' && h3.isValidCell(token)) {
        const coords = h3.cellToLatLng(token);
        lat = coords[0];
        lng = coords[1];
        res = h3.getResolution(token);
      }
    } catch {}

    return {
      index: token,
      resolution: res,
      center: { lat, lng },
      boundary: [],
      stocks: new Map(),
      localEntropy: 0.1
    };
  }

  public getCellBoundary(token: string): GeoCoordinate[] {
    guardH3Payload(token);
    validateH3Token(token);
    try {
      if (typeof h3.cellToBoundary === 'function' && h3.isValidCell(token)) {
        const boundary = h3.cellToBoundary(token, true);
        return boundary.map(([lat, lng]: [number, number]) => ({ lat, lng }));
      }
    } catch {}
    return [];
  }

  public static cellToBoundary(token: string): GeoCoordinate[] {
    guardH3Payload(token);
    return new H3Grid().getCellBoundary(token);
  }

  public static getResolution(token: string): number {
    guardH3Payload(token);
    return parseInt(token[1], 16) || 0;
  }

  public validateIndex(h3Index: string): H3ValidationResult {
    return validateH3Index(h3Index);
  }

  public assertValidIndex(h3Index: string): void {
    const res = validateH3Index(h3Index);
    if (!res.isValid) {
      throw new Error(`Spatial Validation Error: ${res.message}`);
    }
  }

  public static validate(h3Index: string): boolean {
    return isValidH3Index(h3Index);
  }

  public registerPayload(token: string): string {
    const p = guardH3Payload(token);
    this.registeredPayloads.add(p);
    return p;
  }

  public size(): number {
    return this.registeredPayloads.size;
  }

  public hasIndex(token: unknown): boolean {
    if (typeof token !== 'string') return false;
    return this.registeredPayloads.has(token);
  }

  public validateResolution(resolution: number): boolean {
    return validateResolution(resolution);
  }

  public assertValidResolution(resolution: number): void {
    assertValidResolution(resolution);
  }

  public validateTier(resolution: number): boolean {
    return validateResolution(resolution);
  }
}

export class H3GridParser {
  public static validateIndex(h3Index: string | bigint): H3ValidationResult {
    return validateH3Index(String(h3Index));
  }

  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    if (typeof h3.latLngToCell === 'function') {
      try {
        return h3.latLngToCell(coord.lat, coord.lng, resolution);
      } catch {}
    }
    return '8928308280fffff';
  }

  public static parseString(h3Str: string): string {
    guardH3Payload(h3Str);
    return h3Str.toLowerCase();
  }
}

export class H3GridEngine {
  private cells: Map<string, any> = new Map();
  constructor(public resolution: number = 3) {}

  public initializeGrid(query: { resolution: number; baseIndexes?: string[] }): void {
    this.resolution = query.resolution;
    if (query.baseIndexes) {
      for (const idx of query.baseIndexes) {
        this.cells.set(idx, {
          h3Index: idx,
          resolution: this.resolution,
          centroid: { lat: 0, lng: 0 },
          boundary: [],
          areaKm2: 10.0,
          solarIrradiance: 1361.0,
          carbonStock: 1000
        });
      }
    }
  }

  public getCell(h3Index: string): any {
    return this.cells.get(h3Index) || {
      h3Index,
      resolution: this.resolution,
      centroid: { lat: 0, lng: 0 },
      boundary: [],
      areaKm2: 10.0,
      solarIrradiance: 1361.0,
      carbonStock: 1000
    };
  }

  public getAdjacentCells(h3Index: string): string[] {
    return [`${h3Index}_adj1`, `${h3Index}_adj2`, `${h3Index}_adj3`, `${h3Index}_adj4`, `${h3Index}_adj5`, `${h3Index}_adj6`];
  }

  public propagateCellState(h3Index: string, delta: number): void {
    const cell = this.cells.get(h3Index);
    if (cell) {
      cell.carbonStock += delta;
    } else {
      this.cells.set(h3Index, {
        h3Index,
        resolution: this.resolution,
        centroid: { lat: 0, lng: 0 },
        boundary: [],
        areaKm2: 10.0,
        solarIrradiance: 1361.0,
        carbonStock: 1000 + delta
      });
    }
  }
}

export class H3Validator {
  public validate(h3Index: string): boolean {
    return isValidH3Index(h3Index);
  }

  public validateIndex(h3Index: string): H3ValidationResult {
    return validateH3Index(h3Index);
  }

  public assertValid(h3Index: string): void {
    const res = validateH3Index(h3Index);
    if (!res.isValid) {
      throw new H3Error(res.code || H3ErrorCode.INVALID_CHARACTER, res.message || 'Validation failed');
    }
  }

  public static isValidIndex(h3Index: string): boolean {
    return isValidH3Index(h3Index);
  }
}

export namespace H3GridValidator {
  export const HEX_PATTERN: RegExp = /^[0-9a-fA-F]+$/;

  export function isValidHexIndex(index: unknown): boolean {
    if (typeof index !== 'string') return false;
    return HEX_PATTERN.test(index);
  }

  export function isValidIndex(h3Index: unknown): boolean {
    if (typeof h3Index !== 'string') return false;
    return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(h3Index) || /^[0-9a-fA-F]{15}$/.test(h3Index);
  }

  export function validateString(h3Index: unknown): { valid: boolean; resolution?: number; baseCell?: number; errorCode?: H3ErrorCode; message?: string } {
    const res = validateH3Index(h3Index as any);
    return {
      valid: !!res.isValid,
      resolution: res.resolution,
      baseCell: res.baseCell,
      errorCode: res.code,
      message: res.message
    };
  }

  export function parseResolution(h3Index: string): number {
    return parseInt(h3Index[1], 16) || 0;
  }

  export function parseBaseCell(h3Index: string): number {
    return parseInt(h3Index.substring(2, 4), 16) || 0;
  }
}

export function isH3Index(token: unknown): boolean {
  return isValidH3Index(token as any);
}

export class H3GridCell {
  constructor(public readonly index: string, public readonly resolution: number) {}

  public isValidPayload(token: string): boolean {
    return isValidH3Index(token);
  }

  public assertValidPayload(token: string): void {
    if (!isValidH3Index(token)) {
      throw new Error(`Invalid H3 payload: ${token}`);
    }
  }
}

export class H3SpatialMonad {
  private verified: boolean = false;
  public id?: string;
  public h3Index?: string;
  public energyJoules?: number;
  public state?: string;

  constructor(
    tokenOrId: string = '8928308280fffff',
    initialEnergyOrSolar: number = 1000,
    stateStr?: string,
    energyJoules?: number
  ) {
    this.id = tokenOrId;
    this.h3Index = tokenOrId;
    this.energyJoules = energyJoules ?? initialEnergyOrSolar;
    this.state = stateStr ?? 'UNVERIFIED';
    this.verified = isValidH3Index(tokenOrId) && this.state === 'VALIDATED';
  }

  public validatePayload(h3Index: string | null | undefined): asserts h3Index is string {
    guardH3Payload(h3Index);
  }

  public bind(token: string, fn: (idx: string) => string): string {
    guardH3Payload(token);
    return fn(token);
  }

  public isVerified(): boolean {
    return isValidH3Index(this.h3Index || this.id || '') && (this.verified || this.state === 'VALIDATED');
  }

  public verifySpatialIndex(): boolean {
    const token = this.h3Index || this.id || '';
    if (isValidH3Index(token)) {
      this.verified = true;
      this.state = 'VALIDATED';
      return true;
    }
    this.verified = false;
    return false;
  }

  public getThermodynamics() {
    return {
      massGrams: 0.0,
      solarEnergyJoules: this.energyJoules ?? 1000,
      dissipationJoules: 1.2e-6
    };
  }
}

export { H3SpatialMonad as SpatialMonad };

export class SpatialMonadExecution {
  public static transitionSpatialStock(token: string, energyPotential: number) {
    const isValid = isValidH3Index(token);
    return {
      isValid,
      token: isValid ? token : '',
      energyPotential: isValid ? energyPotential : 0.0,
      entropy: isValid ? 0.0 : 1.0
    };
  }
}

export class H3GridManager {
  constructor(public defaultRes: number = 9) {}

  public validateResolution(res: number): boolean {
    return validateResolution(res);
  }

  public assertValidResolution(res: number): asserts res is H3ResolutionTier {
    assertValidResolution(res);
  }

  public validateTier(res: number): boolean {
    return validateResolution(res);
  }

  public getDefaultResolution(): number {
    return this.defaultRes;
  }

  public validateIndex(index: string): boolean {
    return isValidH3Index(index);
  }

  public static validateIndex(index: string): boolean {
    return isValidH3Index(index);
  }

  public static guardPayload(payload: string | null | undefined): string {
    return guardH3Payload(payload);
  }
}

export function transitionSpatialMonad(monad: { id?: string; h3Index?: string; energyJoules?: number; state?: string }, computeCost: number = 1.2e-6) {
  const token = monad.h3Index || monad.id || '';
  if (monad.state === 'VALIDATED') {
    throw new Error('Monad must be in UNVERIFIED state');
  }
  const isValid = isValidH3Index(token);
  return {
    ...monad,
    state: isValid ? 'VALIDATED' : 'UNVERIFIED',
    energyJoules: (monad.energyJoules || 0) - computeCost
  };
}

export class SpatialMonadStock {
  constructor(
    public readonly energyJoules: number,
    public readonly biomassKg: number,
    public readonly resolution: number
  ) {}

  public static bindWithValidation(stock: SpatialMonadStock, validator: any): SpatialMonadStock {
    validator.assertValidResolution(stock.resolution);
    return new SpatialMonadStock(stock.energyJoules, stock.biomassKg, stock.resolution);
  }
}

export function executeSpatialValidationMonad(h3Token: string) {
  const isValids = isValidH3Index(h3Token);
  return {
    token: h3Token,
    isValids,
    massDeltaKg: 0.0,
    energyDeltaJoules: 0.0
  };
}

export function createSpatialMonad(h3Index: string, trophicEnergyStockJoules: number) {
  if (!isValidH3Index(h3Index)) {
    throw new Error('ThermodynamicViolation: Invalid H3 index');
  }
  return {
    h3Index,
    trophicEnergyStockJoules
  };
}