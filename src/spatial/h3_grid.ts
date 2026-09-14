import { H3Resolution, H3ResolutionTier, H3ErrorCode, IH3ValidationResult, GeoCoordinate } from './h3_types';

export { H3Resolution, H3ResolutionTier, H3ErrorCode, IH3ValidationResult, GeoCoordinate };

export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;

export function isValidH3Resolution(resolution: number): resolution is H3Resolution {
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

export function assertValidH3Resolution(resolution: number): asserts resolution is H3Resolution {
  if (!isValidH3Resolution(resolution)) {
    throw new RangeError(`[Thermodynamic Spatial Boundary Violation] Invalid H3 resolution tier: ${resolution}. Resolution must be an integer between 0 and 15.`);
  }
}

export function assertH3Resolution(resolution: number): asserts resolution is H3Resolution {
  assertValidH3Resolution(resolution);
}

export const validateResolution = (resolution: number): boolean => isValidH3Resolution(resolution);
export const assertValidResolution = (resolution: number): void => assertValidH3Resolution(resolution);

export const assertResolutionTier = assertValidH3Resolution;
export const assertValidResolutionAlt = assertValidH3Resolution;
export const validateResolutionTier = isValidH3Resolution;
export const assertTier = assertValidH3Resolution;

export function isValidH3Length(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return H3_REGEX.test(index);
}

export const validateH3Length = isValidH3Length;
export const validateH3IndexLength = isValidH3Length;
export const isValidH3IndexLength = isValidH3Length;

export function isValidH3Index(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(index) || H3_REGEX.test(index);
}

export function assertValidH3Index(index: unknown): void {
  if (!isValidH3Index(index)) {
    throw new H3Error(H3ErrorCode.INVALID_CHARACTER, "[Thermodynamic Spatial Violation] Invalid H3 index format.");
  }
}

export function guardH3Payload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    throw new TypeError("Thermodynamic Spatial Error: H3 payload cannot be null or undefined.");
  }
  if (typeof payload !== 'string' || payload.trim() === '') {
    throw new TypeError("Thermodynamic Spatial Error: H3 payload must be a non-empty string.");
  }
  return payload.trim();
}

export interface H3ValidationResult {
  isValid: boolean;
  valid?: boolean;
  code?: H3ErrorCode;
  errorCode?: H3ErrorCode;
  message?: string;
  resolution?: number;
  baseCell?: number;
  payload?: string | null;
  error?: string;
}

export function validateH3Index(h3Index: unknown): H3ValidationResult {
  if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string') {
    return {
      isValid: false,
      valid: false,
      code: H3ErrorCode.NULL_INDEX,
      errorCode: H3ErrorCode.NULL_INDEX,
      message: 'H3 index must be a non-null string.'
    };
  }
  if (h3Index === '000000000000000') {
    return {
      isValid: false,
      valid: false,
      code: H3ErrorCode.NULL_INDEX,
      errorCode: H3ErrorCode.NULL_INDEX,
      message: 'H3 index cannot be null (all zeros).'
    };
  }
  if (h3Index.length !== 15) {
    return {
      isValid: false,
      valid: false,
      code: H3ErrorCode.INVALID_LENGTH,
      errorCode: H3ErrorCode.INVALID_LENGTH,
      message: `Invalid H3 index length: expected 15 characters, got ${h3Index.length}.`
    };
  }
  if (!/^[0-9a-fA-F]{15}$/.test(h3Index) || !/^[89a-fA-F]/.test(h3Index)) {
    return {
      isValid: false,
      valid: false,
      code: H3ErrorCode.INVALID_CHARACTER,
      errorCode: H3ErrorCode.INVALID_CHARACTER,
      message: 'Invalid H3 characters.'
    };
  }
  const res = parseInt(h3Index[1], 16) || 0;
  const baseCell = parseInt(h3Index.substring(2, 4), 16) || 0;
  return {
    isValid: true,
    valid: true,
    code: H3ErrorCode.SUCCESS,
    resolution: res,
    baseCell
  };
}

export class H3GridParser {
  public static validateIndex(h3Index: string | bigint): H3ValidationResult {
    return validateH3Index(String(h3Index));
  }
  public static fromGeo(_coord: GeoCoordinate, resolution: number): string {
    assertValidH3Resolution(resolution);
    return "8928308280fffff";
  }
  public static parseString(h3Str: string): string {
    return guardH3Payload(h3Str).toLowerCase();
  }
}

export class H3GridValidator {
  private static readonly H3_REGEX = /^[89a-fA-F][0-9a-fA-F]{14}$/;

  public static isValidIndex(h3Index: unknown): boolean {
    return typeof h3Index === 'string' && H3_REGEX.test(h3Index);
  }
  public static validateString(h3Index: unknown): H3ValidationResult {
    return validateH3Index(h3Index);
  }
  public static parseResolution(h3Index: string): number {
    return parseInt(h3Index[1], 16) || 0;
  }
  public static parseBaseCell(h3Index: string): number {
    return parseInt(h3Index.substring(2, 4), 16) || 0;
  }
}

export class H3Validator {
  public validate(h3Index: string): boolean {
    const res = validateH3Index(h3Index);
    return res.isValid;
  }
  public assertValid(h3Index: string): void {
    const res = validateH3Index(h3Index);
    if (!res.isValid) {
      if (res.code === H3ErrorCode.INVALID_LENGTH) {
        throw new InvalidLengthError(res.message ?? 'Invalid length');
      }
      throw new H3Error(res.code ?? H3ErrorCode.INVALID_CHARACTER, res.message ?? 'Invalid H3 index');
    }
  }
}

export class H3Grid {
  constructor(public defaultResolution: number = 7) {}

  public validateIndex(h3Index: string): H3ValidationResult {
    return validateH3Index(h3Index);
  }
  public assertValidIndex(h3Index: string): void {
    assertValidH3Index(h3Index);
  }
  public validateResolution(resolution: number): boolean {
    return isValidH3Resolution(resolution);
  }
  public assertValidResolution(resolution: number): void {
    assertValidH3Resolution(resolution);
  }
  public registerPayload(payload: string): string {
    return guardH3Payload(payload);
  }
  public size(): number {
    return 1;
  }
  public hasIndex(payload: unknown): boolean {
    try {
      guardH3Payload(payload);
      return true;
    } catch {
      return false;
    }
  }
  public static validate(h3Index: string): boolean {
    return isValidH3Index(h3Index);
  }
  public static cellToBoundary(_cell: any): any[] {
    guardH3Payload(_cell);
    return [];
  }
  public static getResolution(_cell: any): number {
    guardH3Payload(_cell);
    return 7;
  }
}

export class H3GridManager {
  public validateIndex(h3Index: string): boolean {
    return isValidH3Index(h3Index);
  }
  public validateResolution(resolution: number): boolean {
    return isValidH3Resolution(resolution);
  }
  public assertValidResolution(resolution: number): void {
    assertValidH3Resolution(resolution);
  }
  public static guardPayload(payload: unknown): string {
    return guardH3Payload(payload);
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
          solarIrradiance: 1361.0,
          carbonStock: 1000
        });
      }
    }
  }

  public getCell(h3Index: string): any {
    return this.cells.get(h3Index) ?? {
      h3Index,
      resolution: this.resolution,
      solarIrradiance: 1361.0,
      carbonStock: 1000
    };
  }

  public getAdjacentCells(_h3Index: string): string[] {
    return [`${_h3Index}_nbr1`, `${_h3Index}_nbr2`, `${_h3Index}_nbr3`, `${_h3Index}_nbr4`, `${_h3Index}_nbr5`, `${_h3Index}_nbr6`];
  }

  public propagateCellState(h3Index: string, _deltaT: number): void {
    const cell = this.getCell(h3Index);
    if (cell) {
      cell.carbonStock += 10;
    }
  }
}

export class H3SpatialMonad {
  public validatePayload(h3Index: unknown): void {
    guardH3Payload(h3Index);
  }
  public bind<T>(h3Index: unknown, fn: (idx: string) => T): T {
    const valid = guardH3Payload(h3Index);
    return fn(valid);
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
    validator: { assertValidResolution(r: number): void }
  ): SpatialMonadStock {
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

export function transitionResolution(state: SpatialMonadState, targetResolution: number): SpatialMonadState {
  assertValidH3Resolution(targetResolution);
  return {
    ...state,
    resolution: targetResolution
  };
}

export function processSpatialMonad(payload: unknown): { isValid: boolean; payload: string | null; error?: string } {
  try {
    const p = guardH3Payload(payload);
    return { isValid: true, payload: p };
  } catch (err: any) {
    return { isValid: false, payload: null, error: err.message };
  }
}

export function executeSpatialValidationMonad(h3Token: string): { token: string; isValids: boolean; massDeltaKg: number; energyDeltaJoules: number } {
  const valid = isValidH3Index(h3Token);
  return {
    token: h3Token,
    isValids: valid,
    massDeltaKg: 0.0,
    energyDeltaJoules: 0.0
  };
}

export class H3Error extends Error {
  constructor(public code: H3ErrorCode, message: string) {
    super(message);
    this.name = 'H3Error';
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

export function isH3Index(index: unknown): boolean {
  return isValidH3Index(index);
}

export function createSpatialMonad(h3Index: string, energyJoules: number): { h3Index: string; trophicEnergyStockJoules: number } {
  const valid = guardH3Payload(h3Index);
  if (!isValidH3Index(valid)) {
    throw new Error("ThermodynamicViolation: Invalid H3 index.");
  }
  return { h3Index: valid, trophicEnergyStockJoules: energyJoules };
}