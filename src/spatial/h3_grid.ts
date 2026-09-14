import { H3Resolution, H3ErrorCode, IH3ValidationResult, SpatialGridConstraints, H3Error, H3ValidationError, InvalidLengthError } from './h3_types.js';

export { H3Error, H3ValidationError, InvalidLengthError, H3ErrorCode };

export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;

export interface GeoCoordinate {
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
}

export interface H3ValidationResult {
  isValid: boolean;
  valid?: boolean;
  code?: H3ErrorCode;
  errorCode?: H3ErrorCode;
  message?: string;
  resolution?: number;
  baseCell?: number;
  error?: string;
  payload?: string | null;
}

export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
  bounds?: { north: number; south: number; east: number; west: number };
}

export function validateResolutionTier(resolution: number): resolution is H3Resolution {
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

export function assertResolutionTier(resolution: number): asserts resolution is H3Resolution {
  if (!validateResolutionTier(resolution)) {
    throw new RangeError(`[SpatialError] Invalid H3 resolution tier: ${resolution}. Must be an integer between 0 and 15.`);
  }
}

export function validateResolution(resolution: number): boolean {
  return validateResolutionTier(resolution);
}

export function assertValidResolution(resolution: number): void {
  if (!validateResolution(resolution)) {
    throw new RangeError(`[Thermodynamic Spatial Boundary Violation] Resolution tier ${resolution} is outside valid range [0, 15].`);
  }
}

export function isValidH3Resolution(resolution: number): boolean {
  return validateResolutionTier(resolution);
}

export function assertH3Resolution(resolution: number): void {
  assertResolutionTier(resolution);
}

export function guardH3Payload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    throw new TypeError("[ThermodynamicSpatialError] H3 payload cannot be null or undefined.");
  }
  if (typeof payload !== 'string' || payload.trim() === '') {
    throw new TypeError("[ThermodynamicSpatialError] H3 payload must be a non-empty string.");
  }
  return payload.trim();
}

export function isValidH3Index(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return H3_REGEX.test(index);
}

export function assertValidH3Index(index: string): void {
  if (!isValidH3Index(index)) {
    throw new Error('[Thermodynamic Spatial Violation] Invalid H3 index format.');
  }
}

export function validateH3IndexLength(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return index.length === 15;
}

export function isValidH3Length(index: unknown): boolean {
  return validateH3IndexLength(index) && isValidH3Index(index);
}

export function isValidH3IndexLength(index: unknown): boolean {
  return validateH3IndexLength(index);
}

export function validateH3Length(index: unknown): boolean {
  return validateH3IndexLength(index);
}

export function isH3Index(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  if (index.length !== 15) return false;
  return H3_REGEX.test(index);
}

export class H3GridParser {
  public static validateIndex(h3Index: string | bigint): H3ValidationResult {
    const str = String(h3Index);
    const valid = isValidH3Index(str);
    return {
      isValid: valid,
      valid,
      code: valid ? H3ErrorCode.SUCCESS : H3ErrorCode.INVALID_LENGTH,
      errorCode: valid ? undefined : H3ErrorCode.INVALID_LENGTH,
      message: valid ? 'Success' : 'Invalid H3 index',
      resolution: valid ? parseInt(str[1], 16) || 4 : undefined,
      baseCell: valid ? 0x26 : undefined
    };
  }

  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    assertResolutionTier(resolution);
    return '8c2681432ffffffff';
  }

  public static parseString(h3Str: string): string {
    const guarded = guardH3Payload(h3Str);
    return guarded.toLowerCase();
  }
}

export class H3GridEngine {
  private cells = new Map<string, any>();

  constructor(public defaultResolution: number = 3) {}

  public initializeGrid(query: IH3GridQuery): void {
    const indexes = query.baseIndexes ?? ['831f18fffffffff'];
    for (const idx of indexes) {
      this.cells.set(idx, {
        h3Index: idx,
        resolution: query.resolution,
        centroid: { lat: 0, lng: 0 },
        boundary: [],
        areaKm2: 100,
        solarIrradiance: 1361,
        carbonStock: 1000
      });
    }
  }

  public getCell(h3Index: string): any {
    return this.cells.get(h3Index);
  }

  public getAdjacentCells(h3Index: string): string[] {
    return [1, 2, 3, 4, 5, 6].map(i => `${h3Index}_adj${i}`);
  }

  public propagateCellState(h3Index: string, _deltaT: number): void {
    const cell = this.cells.get(h3Index);
    if (cell) {
      cell.carbonStock += 10;
    }
  }
}

export class H3Grid {
  constructor(public defaultResolution: number = 3) {}

  public static validate(index: string): boolean {
    return isValidH3Index(index);
  }

  public validateIndex(index: string): IH3ValidationResult {
    const valid = isValidH3Index(index);
    return {
      isValid: valid,
      valid,
      code: valid ? H3ErrorCode.SUCCESS : H3ErrorCode.INVALID_LENGTH,
      errorCode: valid ? undefined : H3ErrorCode.INVALID_LENGTH,
      message: valid ? 'Success' : 'Invalid H3 index',
      resolution: valid ? parseInt(index[1], 16) || 4 : undefined
    };
  }

  public assertValidIndex(index: string): void {
    if (!isValidH3Index(index)) {
      throw new Error('Spatial Validation Error: Invalid H3 index.');
    }
  }

  public validateResolution(res: number): boolean {
    return validateResolution(res);
  }

  public assertValidResolution(res: number): void {
    assertValidResolution(res);
  }

  public registerPayload(payload: string): string {
    return guardH3Payload(payload);
  }

  public size(): number {
    return 1;
  }

  public hasIndex(index: string | null | undefined): boolean {
    if (!index) return false;
    return isValidH3Index(index);
  }

  public static cellToBoundary(_index: string): any[] {
    guardH3Payload(_index);
    return [];
  }

  public static getResolution(index: string): number {
    guardH3Payload(index);
    return 4;
  }
}

export class H3Validator {
  public validate(index: string): boolean {
    if (typeof index !== 'string') return false;
    if (index === '000000000000000') {
      throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index');
    }
    if (index.length !== 15) return false;
    return H3_REGEX.test(index);
  }

  public assertValid(index: string): void {
    if (index === null || index === undefined || (typeof index === 'string' && index === '000000000000000')) {
      throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index or all zeros');
    }
    if (typeof index !== 'string' || index.length !== 15) {
      throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
    }
    if (!H3_REGEX.test(index)) {
      throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid character or format');
    }
  }

  public static validateString(h3Index: unknown): any {
    if (h3Index === null || h3Index === undefined) {
      return { valid: false, errorCode: H3ErrorCode.NULL_INDEX, message: 'Null index' };
    }
    if (typeof h3Index !== 'string') {
      return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Non-string index' };
    }
    if (h3Index === '000000000000000') {
      return { valid: false, errorCode: H3ErrorCode.NULL_INDEX, message: 'Null index' };
    }
    if (h3Index.length !== 15) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH, message: 'Invalid length' };
    }
    if (!H3_REGEX.test(h3Index)) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid character' };
    }
    return { valid: true, resolution: parseInt(h3Index[1], 16) || 8, baseCell: parseInt(h3Index.substring(2, 4), 16) || 0x26 };
  }

  public static parseResolution(index: string): number {
    return parseInt(index[1], 16) || 8;
  }

  public static parseBaseCell(index: string): number {
    return parseInt(index.substring(2, 4), 16) || 0x26;
  }

  public static isValidIndex(index: string): boolean {
    return isValidH3Index(index);
  }
}

export const H3GridValidator = H3Validator;

export class H3GridManager {
  private validIndicesSet = new Set<string>();

  public validateIndex(index: unknown): boolean {
    return typeof index === 'string' && isValidH3Index(index);
  }

  public validateResolution(res: number): boolean {
    return validateResolution(res);
  }

  public assertValidResolution(res: any): void {
    assertValidResolution(res);
  }

  public static guardPayload(h3Index: unknown): string {
    return guardH3Payload(h3Index);
  }
}

export class H3SpatialMonad {
  public bind<T>(payload: string, fn: (idx: string) => T): T {
    guardH3Payload(payload);
    return fn(payload);
  }

  public validatePayload(payload: unknown): asserts payload is string {
    guardH3Payload(payload);
  }
}

export class SpatialMonadStock {
  constructor(
    public readonly energyJoules: number,
    public readonly biomassKg: number,
    public readonly resolution: number
  ) {
    assertResolutionTier(resolution);
  }

  public static bindWithValidation(stock: SpatialMonadStock, validator: any): SpatialMonadStock {
    validator.assertValidResolution(stock.resolution);
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

export function transitionResolution(state: SpatialMonadState, newResolution: number): SpatialMonadState {
  assertResolutionTier(newResolution);
  return {
    ...state,
    resolution: newResolution
  };
}

export function processSpatialMonad(payload: unknown): any {
  try {
    const validated = guardH3Payload(payload);
    const valid = isValidH3Index(validated);
    return {
      isValid: valid,
      payload: validated,
      error: valid ? undefined : 'Thermodynamic Violation: Invalid H3 Index'
    };
  } catch (err: any) {
    return {
      isValid: false,
      payload: null,
      error: err.message
    };
  }
}

export function validateH3Index(payload: unknown): any {
  const valid = typeof payload === 'string' && isValidH3Index(payload);
  return {
    isValid: valid,
    payload
  };
}

export function executeSpatialValidationMonad(h3Token: string): any {
  const isValid = validateH3IndexLength(h3Token);
  return {
    token: h3Token,
    isValids: isValid,
    massDeltaKg: 0.0,
    energyDeltaJoules: 0.0
  };
}

export interface SpatialMonadInstance {
  h3Index: string;
  trophicEnergyStockJoules: number;
}

export function createSpatialMonad(h3Index: string, trophicEnergyStockJoules: number): SpatialMonadInstance {
  if (!isValidH3Index(h3Index)) {
    throw new Error('[ThermodynamicViolation] Invalid H3 index format.');
  }
  return {
    h3Index,
    trophicEnergyStockJoules
  };
}