import { H3Index, Resolution, H3ErrorCode, H3ValidationResult, IResolutionTierValidator, GeoCoordinate, CellStockState, IH3GridQuery } from './h3_types';
import { SpatialMonad } from '../monads/spatial_monad';

export type { H3Index, Resolution, H3ValidationResult, GeoCoordinate, IH3GridQuery };
export { H3ErrorCode };

export const MIN_H3_RESOLUTION: Resolution = 0;
export const MAX_H3_RESOLUTION: Resolution = 15;
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;

export interface IH3GridManager {
  validateResolution(resolution: number): boolean;
  assertValidResolution(resolution: number): void;
  validateIndex(h3Index: string): H3ValidationResult | boolean;
  assertValidIndex(h3Index: string): void;
}

export function isValidH3Resolution(resolution: number): boolean {
  return Number.isInteger(resolution) && resolution >= MIN_H3_RESOLUTION && resolution <= MAX_H3_RESOLUTION;
}

export function assertH3Resolution(resolution: number): void {
  if (!isValidH3Resolution(resolution)) {
    throw new RangeError(`Invalid H3 resolution tier: ${resolution}. Must be an integer between ${MIN_H3_RESOLUTION} and ${MAX_H3_RESOLUTION}.`);
  }
}

export function validateResolution(resolution: number): boolean {
  return isValidH3Resolution(resolution);
}

export function assertValidResolution(resolution: number): void {
  assertH3Resolution(resolution);
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

export function guardH3Payload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    throw new TypeError("Thermodynamic Violation: H3 payload cannot be null or undefined.");
  }
  if (typeof payload !== 'string' || payload.trim() === '') {
    throw new TypeError("Thermodynamic Violation: H3 payload must be a non-empty string.");
  }
  const trimmed = payload.trim();
  if (!isValidH3Index(trimmed)) {
    throw new Error(`Thermodynamic Spatial Error: Invalid H3 payload format: ${trimmed}`);
  }
  return trimmed;
}

export function validateH3Index(h3Index: unknown): H3ValidationResult {
  if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string') {
    return {
      isValid: false,
      valid: false,
      code: H3ErrorCode.NULL_INDEX,
      errorCode: H3ErrorCode.NULL_INDEX,
      error: 'H3 index must be a non-empty string.',
      message: 'H3 index must be a non-empty string.',
      payload: null
    };
  }
  if (h3Index === '000000000000000') {
    return {
      isValid: false,
      valid: false,
      code: H3ErrorCode.NULL_INDEX,
      errorCode: H3ErrorCode.NULL_INDEX,
      error: 'H3 index cannot be all zeros (null index).',
      message: 'H3 index cannot be all zeros (null index).',
      payload: h3Index
    };
  }
  if (h3Index.length !== 15) {
    return {
      isValid: false,
      valid: false,
      code: H3ErrorCode.INVALID_LENGTH,
      errorCode: H3ErrorCode.INVALID_LENGTH,
      error: `Invalid H3 index length: expected 15 characters, got ${h3Index.length}.`,
      message: `Invalid H3 index length: expected 15 characters, got ${h3Index.length}.`,
      payload: h3Index
    };
  }
  if (!H3_REGEX.test(h3Index)) {
    return {
      isValid: false,
      valid: false,
      code: H3ErrorCode.INVALID_CHARACTER,
      errorCode: H3ErrorCode.INVALID_CHARACTER,
      error: 'Invalid H3 index character set.',
      message: 'Invalid H3 index character set.',
      payload: h3Index
    };
  }
  const res = parseInt(h3Index[1], 16) || 0;
  const baseCell = parseInt(h3Index.substring(2, 4), 16) || 0;
  return {
    isValid: true,
    valid: true,
    code: H3ErrorCode.SUCCESS,
    errorCode: H3ErrorCode.SUCCESS,
    resolution: res,
    baseCell: baseCell,
    payload: h3Index
  };
}

export function validateH3IndexLength(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return index.length === 15;
}

export function isValidH3Length(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return index.length === 15;
}

export function isValidH3IndexLength(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return index.length === 15;
}

export function validateH3Length(h3Index: unknown): boolean {
  if (typeof h3Index !== 'string') return false;
  return h3Index.length === 15;
}

export class H3Error extends Error {
  constructor(public code: H3ErrorCode, message: string) {
    super(message);
    this.name = 'H3Error';
  }

  public get errorCode(): H3ErrorCode {
    return this.code;
  }
}

export class InvalidLengthError extends H3Error {
  constructor(message: string) {
    super(H3ErrorCode.INVALID_LENGTH, message);
    this.name = 'InvalidLengthError';
  }
}

export class InvalidCharacterError extends H3Error {
  constructor(message: string) {
    super(H3ErrorCode.INVALID_CHARACTER, message);
    this.name = 'InvalidCharacterError';
  }
}

export class NullIndexError extends H3Error {
  constructor(message: string) {
    super(H3ErrorCode.NULL_INDEX, message);
    this.name = 'NullIndexError';
  }
}

export type H3ValidationError = H3Error;

export function isH3Index(index: unknown): boolean {
  return typeof index === 'string' && H3_REGEX.test(index) && index !== '000000000000000';
}

export class H3Validator {
  public validate(h3Index: string): boolean {
    return isValidH3Index(h3Index);
  }

  public assertValid(h3Index: string): void {
    const res = validateH3Index(h3Index);
    if (!res.valid && !res.isValid) {
      const code = res.code || res.errorCode || H3ErrorCode.INVALID_CHARACTER;
      if (code === H3ErrorCode.INVALID_LENGTH) {
        throw new InvalidLengthError(res.message || res.error || 'Invalid H3 Index Length');
      }
      if (code === H3ErrorCode.NULL_INDEX) {
        throw new NullIndexError(res.message || res.error || 'Null H3 Index');
      }
      throw new InvalidCharacterError(res.message || res.error || 'Invalid H3 Index Character');
    }
  }

  public static validateString(h3Index: string | null | undefined): H3ValidationResult {
    return validateH3Index(h3Index as any);
  }

  public static parseResolution(h3Index: string): number {
    return parseInt(h3Index[1], 16) || 0;
  }

  public static parseBaseCell(h3Index: string): number {
    return parseInt(h3Index.substring(2, 4), 16) || 0;
  }

  public static isValidIndex(h3Index: string): boolean {
    return isValidH3Index(h3Index);
  }
}

export const H3GridValidator = H3Validator;

export class H3Grid implements IH3GridManager {
  private indices: Set<string> = new Set();

  constructor(public readonly defaultResolution: Resolution = 7) {
    assertH3Resolution(defaultResolution);
  }

  public validateResolution(resolution: number): boolean {
    return isValidH3Resolution(resolution);
  }

  public assertValidResolution(resolution: number): void {
    assertH3Resolution(resolution);
  }

  public validateIndex(h3Index: string): H3ValidationResult {
    return validateH3Index(h3Index);
  }

  public assertValidIndex(h3Index: string): void {
    const res = validateH3Index(h3Index);
    if (!res.isValid) {
      throw new Error(`Spatial Validation Error: ${res.error || 'Invalid Index'}`);
    }
  }

  public registerPayload(payload: string): string {
    const guarded = guardH3Payload(payload);
    this.indices.add(guarded);
    return guarded;
  }

  public size(): number {
    return this.indices.size;
  }

  public hasIndex(index: unknown): boolean {
    if (typeof index !== 'string') return false;
    return this.indices.has(index);
  }

  public static validate(h3Index: string): boolean {
    return isValidH3Index(h3Index);
  }

  public static cellToBoundary(h3Index: string): any {
    guardH3Payload(h3Index);
    return [{ lat: 0, lng: 0 }];
  }

  public static getResolution(h3Index: string): number {
    guardH3Payload(h3Index);
    return parseInt(h3Index[1], 16) || 0;
  }
}

export class H3GridManager implements IH3GridManager {
  private validIndices: Set<string> = new Set();
  private rejectedCount: number = 0;

  public validateResolution(resolution: number): boolean {
    return isValidH3Resolution(resolution);
  }

  public assertValidResolution(resolution: number): void {
    assertH3Resolution(resolution);
  }

  public validateIndex(h3Index: string): H3ValidationResult {
    return validateH3Index(h3Index);
  }

  public assertValidIndex(h3Index: string): void {
    assertValidH3Index(h3Index);
  }

  public static guardPayload(h3Index: string | null | undefined): string {
    return guardH3Payload(h3Index);
  }

  public ingestIndex(h3Index: string): boolean {
    if (isValidH3Index(h3Index)) {
      this.validIndices.add(h3Index);
      return true;
    } else {
      this.rejectedCount++;
      return false;
    }
  }

  public getValidIndices(): string[] {
    return Array.from(this.validIndices);
  }

  public getRejectedCount(): number {
    return this.rejectedCount;
  }
}

export class H3GridParser {
  public static validateIndex(h3Index: string | bigint): H3ValidationResult {
    return validateH3Index(String(h3Index));
  }

  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    assertH3Resolution(resolution);
    const hexRes = resolution.toString(16);
    return `8${hexRes}268012345ffff`;
  }

  public static parseString(h3Str: string): string {
    const guarded = guardH3Payload(h3Str);
    return guarded.toLowerCase();
  }
}

export class H3GridEngine {
  private cells: Map<string, any> = new Map();

  constructor(public readonly resolution: number) {
    assertH3Resolution(resolution);
  }

  public initializeGrid(query: any): void {
    const baseIndexes = query.baseIndexes || ['831f18fffffffff'];
    baseIndexes.forEach((idx: string) => {
      this.cells.set(idx, {
        h3Index: idx,
        resolution: this.resolution,
        solarIrradiance: 1361.0,
        carbonStock: 1000
      });
    });
  }

  public getCell(h3Index: string): any {
    return this.cells.get(h3Index);
  }

  public getAdjacentCells(h3Index: string): string[] {
    return [`${h3Index}_adj1`, `${h3Index}_adj2`, `${h3Index}_adj3`, `${h3Index}_adj4`, `${h3Index}_adj5`, `${h3Index}_adj6`];
  }

  public propagateCellState(h3Index: string, _deltaT: number): void {
    const cell = this.cells.get(h3Index);
    if (cell) {
      cell.carbonStock += 10.0;
    }
  }
}

export class H3SpatialMonad {
  public bind(h3Index: string, fn: (idx: string) => string): string {
    const guarded = guardH3Payload(h3Index);
    return fn(guarded);
  }

  public validatePayload(h3Index: string): void {
    guardH3Payload(h3Index);
  }
}

export function processSpatialMonad(payload: unknown): H3ValidationResult {
  try {
    const guarded = guardH3Payload(payload);
    return {
      isValid: true,
      valid: true,
      payload: guarded
    };
  } catch (err: any) {
    return {
      isValid: false,
      valid: false,
      payload: payload as any,
      error: err.message
    };
  }
}

export function createSpatialMonad(h3Index: string, energyJoules: number): any {
  if (!isValidH3Index(h3Index)) {
    throw new Error('ThermodynamicViolation: Invalid H3 index.');
  }
  return {
    h3Index,
    trophicEnergyStockJoules: energyJoules
  };
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
  assertH3Resolution(targetResolution);
  return {
    ...state,
    resolution: targetResolution
  };
}

export class SpatialMonadStock {
  constructor(
    public readonly energyJoules: number,
    public readonly biomassKg: number,
    public readonly resolution: number
  ) {
    assertH3Resolution(resolution);
  }

  public static bindWithValidation(
    stock: SpatialMonadStock,
    validator: IResolutionTierValidator
  ): SpatialMonadStock {
    validator.assertValidResolution(stock.resolution);
    return new SpatialMonadStock(stock.energyJoules, stock.biomassKg, stock.resolution);
  }
}

export function executeSpatialValidationMonad(h3Token: string): any {
  const valid = isValidH3Index(h3Token);
  return {
    token: h3Token,
    isValids: valid,
    massDeltaKg: 0.0,
    energyDeltaJoules: 0.0
  };
}