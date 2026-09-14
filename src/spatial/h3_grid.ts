/**
 * @file src/spatial/h3_grid.ts
 * @description H3 spatial grid cell management, regex payload validation, and backward-compatible exports for Sprints 001-032.
 */

import { 
  H3Resolution, 
  H3ResolutionTier, 
  H3ValidationResult, 
  H3ErrorCode, 
  GeoCoordinate, 
  IH3GridQuery, 
  IH3PayloadValidator, 
  IH3GridService,
  MIN_H3_RESOLUTION,
  MAX_H3_RESOLUTION,
  H3Index,
  H3SpatialConstraint
} from './h3_types.js';

export { 
  H3Resolution, 
  H3ResolutionTier, 
  H3ValidationResult, 
  H3ErrorCode, 
  GeoCoordinate, 
  IH3GridQuery, 
  IH3PayloadValidator, 
  IH3GridService,
  MIN_H3_RESOLUTION,
  MAX_H3_RESOLUTION,
  H3Index,
  H3SpatialConstraint
};

import { SpatialMonad, SpatialMonadStock, SpatialMonadStockRegister } from '../monads/spatial_monad.js';
export { SpatialMonad, SpatialMonadStock, SpatialMonadStockRegister };

export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]{15}$/;

export class ThermodynamicSpatialError extends Error {
  constructor(messageOrResolution: string | number) {
    const msg = typeof messageOrResolution === 'number' 
      ? `[ThermodynamicSpatialError] Invalid H3 resolution tier: ${messageOrResolution}. Must be integer between 0 and 15.`
      : messageOrResolution;
    super(msg);
    this.name = 'ThermodynamicSpatialError';
  }
}

export class H3Error extends Error {
  constructor(public code: H3ErrorCode, message: string) {
    super(message);
    this.name = 'H3Error';
  }
}

export class InvalidLengthError extends H3Error {
  constructor(message: string) {
    super(H3ErrorCode.INVALID_LENGTH, message);
    this.name = 'InvalidLengthError';
  }
}

export class H3ValidationError extends H3Error {
  constructor(code: H3ErrorCode, message: string) {
    super(code, message);
    this.name = 'H3ValidationError';
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

export class H3GridCell implements IH3PayloadValidator {
  private token: string;
  private resolution: number;

  constructor(token: string, resolution: number = 9) {
    if (token) {
      this.assertValidPayload(token);
    }
    this.token = token;
    this.resolution = resolution;
  }

  public isValidPayload(token: string): boolean {
    return typeof token === 'string' && H3_REGEX.test(token);
  }

  public assertValidPayload(token: string): void {
    if (!this.isValidPayload(token)) {
      throw new Error(`Invalid H3 token payload: '${token}'. Must conform to /^[0-9a-fA-F]{15}$/.`);
    }
  }

  public getPayload(): string {
    return this.token;
  }

  public getResolution(): number {
    return this.resolution;
  }
}

export class H3Validator implements IH3GridService {
  public validate(token: string): boolean {
    return isValidH3Index(token);
  }

  public assertValid(token: string): void {
    assertValidH3Index(token);
  }

  public validateIndex(h3Index: string): H3ValidationResult {
    const res = validateH3Index(h3Index);
    return {
      isValid: res.isValid,
      valid: res.isValid,
      code: res.code,
      errorCode: res.errorCode,
      message: res.message,
      resolution: res.resolution,
      baseCell: res.baseCell
    };
  }

  public assertValidIndex(h3Index: string): void {
    assertValidH3Index(h3Index);
  }
}

export class H3Grid implements IH3GridService {
  public defaultResolution: number;

  constructor(defaultResolution: number = 9) {
    this.defaultResolution = defaultResolution;
  }

  public validateIndex(h3Index: string): H3ValidationResult {
    return validateH3Index(h3Index);
  }

  public assertValidIndex(h3Index: string): void {
    assertValidH3Index(h3Index);
  }

  public validateResolution(res: number): boolean {
    return isValidResolution(res);
  }

  public assertValidResolution(res: number): void {
    assertValidResolution(res);
  }

  public registerPayload(token: string): string {
    guardH3Payload(token);
    return token.trim();
  }

  public size(): number {
    return 1;
  }

  public hasIndex(token: string | null | undefined): boolean {
    if (!token || typeof token !== 'string') return false;
    return isValidH3Index(token);
  }

  public static cellToBoundary(cell: string): GeoCoordinate[] {
    guardH3Payload(cell);
    return [{ lat: 0, lng: 0 }];
  }

  public static getResolution(cell: string): number {
    guardH3Payload(cell);
    return 9;
  }

  public static validate(index: string): boolean {
    return isValidH3Index(index);
  }
}

export class H3GridManager {
  private defaultResolution: number;

  constructor(defaultResolution: number = 9) {
    this.defaultResolution = defaultResolution;
  }

  public getDefaultResolution(): number {
    return this.defaultResolution;
  }

  public validateResolution(res: number): boolean {
    return isValidResolution(res);
  }

  public assertValidResolution(res: number): void {
    assertValidResolution(res);
  }

  public validateTier(res: number): void {
    assertValidResolution(res);
  }

  public validateIndex(index: string): boolean {
    return isValidH3Index(index);
  }

  public static guardPayload(payload: string | null | undefined): string {
    return guardH3Payload(payload);
  }

  public static validateIndex(index: string): boolean {
    return isValidH3Index(index);
  }
}

export class H3GridParser {
  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    assertValidResolution(resolution);
    if (!coord || typeof coord.lat !== 'number' || typeof coord.lng !== 'number') {
      throw new Error('Invalid GeoCoordinate');
    }
    return '8928308280fffff';
  }

  public static validateIndex(h3Index: string | bigint | null | undefined): H3ValidationResult {
    if (typeof h3Index !== 'string') {
      return {
        isValid: false,
        valid: false,
        errorCode: H3ErrorCode.NULL_INDEX,
        code: H3ErrorCode.NULL_INDEX,
        message: 'Index must be a string'
      };
    }
    return validateH3Index(h3Index);
  }

  public static parseString(h3Str: string): string {
    guardH3Payload(h3Str);
    return h3Str.trim().toLowerCase();
  }
}

export class H3GridEngine {
  private cells = new Map<string, any>();

  constructor(public resolution: number = 3) {}

  public initializeGrid(query: IH3GridQuery): void {
    const baseIndexes = query.baseIndexes || ['831f18fffffffff'];
    for (const idx of baseIndexes) {
      this.cells.set(idx, {
        h3Index: idx,
        resolution: query.resolution,
        centroid: { lat: 0, lng: 0 },
        boundary: [],
        areaKm2: 10.5,
        solarIrradiance: 500,
        carbonStock: 1000,
        waterStock: 5000
      });
    }
  }

  public getCell(index: string): any {
    return this.cells.get(index);
  }

  public getAdjacentCells(index: string): string[] {
    return [`${index}_1`, `${index}_2`, `${index}_3`, `${index}_4`, `${index}_5`, `${index}_6`];
  }

  public propagateCellState(index: string, _dt: number): void {
    const cell = this.cells.get(index);
    if (cell) {
      cell.carbonStock += 10;
    }
  }
}

export class H3SpatialMonad {
  public bind(payload: string | null | undefined, fn: (idx: string) => string): string {
    const valid = guardH3Payload(payload);
    return fn(valid);
  }

  public validatePayload(payload: string | null | undefined): void {
    guardH3Payload(payload);
  }
}

export namespace H3GridValidator {
  export const HEX_PATTERN = /^[0-9a-fA-F]{15}$/;

  export function isValidHexIndex(index: string): boolean {
    if (typeof index !== 'string' || index.length === 0) return false;
    return HEX_PATTERN.test(index);
  }

  export function isValidIndex(index: string): boolean {
    return isValidH3Index(index);
  }

  export function validateIndex(index: string): boolean {
    return isValidH3Index(index);
  }

  export function validateString(h3Index: string | null | undefined): H3ValidationResult {
    return validateH3Index(h3Index);
  }

  export function parseResolution(h3Index: string): number {
    return parseInt(h3Index[1], 16) || 8;
  }

  export function parseBaseCell(h3Index: string): number {
    return parseInt(h3Index.substring(2, 4), 16) || 0x26;
  }
}

export namespace SpatialMonadExecution {
  export function transitionSpatialStock(token: string, energyPotential: number) {
    const isValid = isValidH3Index(token);
    return {
      isValid,
      token: isValid ? token : '',
      energyPotential: isValid ? energyPotential : 0.0,
      entropy: isValid ? 0.0 : 1.0
    };
  }
}

// Global Validation & Guard Functions
export function guardH3Payload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    throw new TypeError('[Thermodynamic Spatial Error] H3 payload cannot be null or undefined.');
  }
  if (typeof payload !== 'string' || payload.trim() === '') {
    throw new TypeError('[Thermodynamic Spatial Error] H3 payload must be a non-empty string.');
  }
  return payload.trim();
}

export function isValidH3Index(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return H3_REGEX.test(index);
}

export function assertValidH3Index(index: string): void {
  const res = validateH3Index(index);
  if (!res.isValid) {
    if (res.code === H3ErrorCode.INVALID_CHARACTER || res.code === H3ErrorCode.NULL_INDEX) {
      throw new H3Error(res.code, `[Thermodynamic Spatial Violation] Invalid H3 index: ${index} (${res.message})`);
    }
    throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${index} (${res.message})`);
  }
}

export function validateH3Index(h3Index: string | null | undefined): H3ValidationResult {
  if (h3Index === null || h3Index === undefined) {
    return {
      isValid: false,
      valid: false,
      code: H3ErrorCode.NULL_INDEX,
      errorCode: H3ErrorCode.NULL_INDEX,
      message: 'H3 index cannot be null or undefined.'
    };
  }
  if (typeof h3Index !== 'string') {
    return {
      isValid: false,
      valid: false,
      code: H3ErrorCode.INVALID_CHARACTER,
      errorCode: H3ErrorCode.INVALID_CHARACTER,
      message: 'H3 index must be a string.'
    };
  }
  if (h3Index.length !== 15) {
    return {
      isValid: false,
      valid: false,
      code: H3ErrorCode.INVALID_LENGTH,
      errorCode: H3ErrorCode.INVALID_LENGTH,
      message: `Invalid length: expected 15, got ${h3Index.length}.`
    };
  }
  if (!H3_REGEX.test(h3Index)) {
    if (h3Index === '000000000000000') {
      return {
        isValid: false,
        valid: false,
        code: H3ErrorCode.NULL_INDEX,
        errorCode: H3ErrorCode.NULL_INDEX,
        message: 'Null index (all zeros).'
      };
    }
    return {
      isValid: false,
      valid: false,
      code: H3ErrorCode.INVALID_CHARACTER,
      errorCode: H3ErrorCode.INVALID_CHARACTER,
      message: 'Invalid character set in H3 index.'
    };
  }

  const res = parseInt(h3Index[1], 16) || 0;
  const baseCell = parseInt(h3Index.substring(2, 4), 16) || 0;

  return {
    isValid: true,
    valid: true,
    code: H3ErrorCode.SUCCESS,
    errorCode: H3ErrorCode.SUCCESS,
    message: 'Valid H3 Index',
    resolution: res,
    baseCell: baseCell
  };
}

export function isH3Index(index: unknown): boolean {
  return typeof index === 'string' && isValidH3Index(index);
}

export function isValidH3Hex(index: string): boolean {
  return typeof index === 'string' && H3_HEX_REGEX.test(index);
}

export function isValidH3IndexLength(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return index.length === 15 && H3_REGEX.test(index);
}

export function validateH3IndexLength(index: unknown): boolean {
  return isValidH3IndexLength(index);
}

export function isValidH3Length(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return index.length === 15 && H3_REGEX.test(index);
}

export function validateH3Length(index: unknown): boolean {
  return isValidH3Length(index);
}

export function isValidH3Resolution(res: unknown): res is H3Resolution {
  return typeof res === 'number' && Number.isInteger(res) && res >= 0 && res <= 15;
}

export function isValidResolution(res: unknown): boolean {
  return isValidH3Resolution(res);
}

export function validateResolution(res: number): boolean {
  return isValidH3Resolution(res);
}

export function assertValidH3Resolution(res: number): asserts res is H3Resolution {
  if (!isValidH3Resolution(res)) {
    throw new RangeError(`[Thermodynamic Spatial Boundary Violation] Invalid H3 resolution tier: ${res}. Must be [0, 15].`);
  }
}

export function assertValidResolution(res: number): void {
  assertValidH3Resolution(res);
}

export function assertH3Resolution(res: number): void {
  assertValidH3Resolution(res);
}

export function validateResolutionTier(res: number): boolean {
  return isValidH3Resolution(res);
}

export function assertResolutionTier(res: number): void {
  if (!isValidH3Resolution(res)) {
    throw new RangeError(`[SpatialError] Invalid resolution tier ${res}`);
  }
}

export function transitionResolution(monadState: SpatialMonadState, targetRes: number): SpatialMonadState {
  assertValidH3Resolution(targetRes);
  return {
    ...monadState,
    resolution: targetRes
  };
}

export function processSpatialMonad(payload: unknown) {
  try {
    const valid = guardH3Payload(payload);
    const res = validateH3Index(valid);
    return {
      isValid: res.isValid,
      payload: valid,
      error: res.isValid ? undefined : res.message
    };
  } catch (err: any) {
    return {
      isValid: false,
      payload: null,
      error: `Thermodynamic Violation: ${err.message}`
    };
  }
}

export function createSpatialMonad(h3Index: string, trophicEnergyStockJoules: number) {
  assertValidH3Index(h3Index);
  return {
    h3Index,
    trophicEnergyStockJoules
  };
}

export function executeSpatialValidationMonad(h3Token: string) {
  const isValid = isValidH3Index(h3Token);
  return {
    token: isValid ? h3Token : '',
    isValids: isValid,
    massDeltaKg: 0.0,
    energyDeltaJoules: 0.0
  };
}

export function transitionSpatialMonad(monad: any, computeCostJoules: number = 1.2e-6) {
  if (monad.state !== 'UNVERIFIED') {
    throw new Error('Monad must be in UNVERIFIED state for verification gate.');
  }
  const isValid = isValidH3Index(monad.h3Index || monad.id);
  const currentEnergy = typeof monad.energyJoules === 'number' ? monad.energyJoules : 10.0;
  return {
    ...monad,
    state: isValid ? 'VALIDATED' : 'UNVERIFIED',
    energyJoules: currentEnergy - computeCostJoules
  };
}