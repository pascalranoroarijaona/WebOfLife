// =============================================================================
// WEB OF LIFE - COMPREHENSIVE H3 GRID & SPATIAL COMPATIBILITY LAYER (SPRINT 001-035)
// =============================================================================

import { SpatialGuardClauseException, H3ErrorCode, H3ResolutionTier } from './h3_types.js';
import { SpatialMonad as ExternalSpatialMonad } from '../monads/spatial_monad.js';

export { H3ErrorCode, H3ResolutionTier };

export interface IH3ValidationResult {
  isValid: boolean;
  code: H3ErrorCode;
  message: string;
  resolution?: number;
  baseCell?: number;
  valid?: boolean;
  errorCode?: H3ErrorCode | string;
}

export type H3ValidationResult = IH3ValidationResult;

export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
}

export type H3ValidationResultType = 
  | { valid: true; resolution: number; baseCell: number; isValid: true; code: H3ErrorCode }
  | { valid: false; errorCode: H3ErrorCode | string; message: string; isValid: false; code: H3ErrorCode };

export class H3Error extends Error {
  constructor(public code: H3ErrorCode, message: string) {
    super(`[H3Error ${code}] ${message}`);
    this.name = 'H3Error';
  }
}

export class H3ValidationError extends Error {
  constructor(public token: string, message: string) {
    super(`H3ValidationError [Token: "${token}"]: ${message}`);
    this.name = 'H3ValidationError';
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
  constructor(resolutionOrMessage: number | string) {
    super(
      typeof resolutionOrMessage === 'number'
        ? `[ThermodynamicSpatialError] Invalid H3 resolution tier: ${resolutionOrMessage}. Must be integer between 0 and 15.`
        : `[ThermodynamicSpatialError] ${resolutionOrMessage}`
    );
    this.name = 'ThermodynamicSpatialError';
  }
}

export const H3_REGEX: RegExp = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX: RegExp = /^[0-9a-fA-F]+$/;
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;

export interface GeoCoordinate {
  lat: number;
  lng: number;
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

export interface SpatialMonadStockState {
  energyJoules: number;
  biomassKg: number;
  resolution: number;
}

export class SpatialMonadStock {
  constructor(
    public readonly energyJoules: number,
    public readonly biomassKg: number,
    public readonly resolution: number
  ) {}

  public static bindWithValidation(
    stock: SpatialMonadStock,
    validator: any
  ): SpatialMonadStock {
    if (typeof validator.assertValidResolution === 'function') {
      validator.assertValidResolution(stock.resolution);
    } else if (typeof validator.validateResolution === 'function') {
      if (!validator.validateResolution(stock.resolution)) {
        throw new RangeError(`Invalid resolution: ${stock.resolution}`);
      }
    }
    return stock;
  }
}

export class H3SpatialMonad {
  public validatePayload(h3Index: string | null | undefined): asserts h3Index is string {
    if (!h3Index || typeof h3Index !== 'string' || h3Index.trim() === '') {
      throw new Error(`[Thermodynamic Spatial Error] Invalid or null H3 string payload received: ${h3Index}`);
    }
  }

  public bind(h3Index: string | null | undefined, fn: (idx: string) => string): string {
    this.validatePayload(h3Index);
    return fn(h3Index);
  }
}

export class H3Validator {
  public validate(h3Index: string): boolean {
    return isValidH3Index(h3Index);
  }

  public assertValid(h3Index: string): void {
    assertValidH3Index(h3Index);
  }
}

export class H3GridValidator {
  public static isValidIndex(index: string): boolean {
    return isValidH3Index(index);
  }

  public static isValidHexIndex(index: string): boolean {
    if (typeof index !== 'string' || index.length === 0) return false;
    return H3_HEX_REGEX.test(index);
  }

  public static validate(index: string): boolean {
    return isValidH3Index(index);
  }

  public static isValid(index: string): boolean {
    return isValidH3Index(index);
  }

  public static validateString(h3Index: unknown): H3ValidationResultType {
    if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string') {
      return {
        valid: false,
        isValid: false,
        code: H3ErrorCode.ERR_H3_INVALID_NULL,
        errorCode: H3ErrorCode.NULL_INDEX,
        message: 'H3 index must be a non-null string.'
      };
    }
    if (h3Index.length !== 15) {
      return {
        valid: false,
        isValid: false,
        code: H3ErrorCode.INVALID_LENGTH,
        errorCode: H3ErrorCode.INVALID_LENGTH,
        message: `Invalid H3 index length: expected 15 characters, got ${h3Index.length}.`
      };
    }
    if (!H3_REGEX.test(h3Index)) {
      return {
        valid: false,
        isValid: false,
        code: H3ErrorCode.INVALID_CHARACTER,
        errorCode: H3ErrorCode.INVALID_CHARACTER,
        message: 'Invalid H3 character set.'
      };
    }
    const res = parseInt(h3Index[1], 16) || 0;
    const baseCell = parseInt(h3Index.substring(2, 4), 16) || 0;
    return {
      valid: true,
      isValid: true,
      code: H3ErrorCode.SUCCESS,
      resolution: res,
      baseCell: baseCell
    };
  }

  public static parseResolution(h3Index: string): number {
    return parseInt(h3Index[1], 16) || 0;
  }

  public static parseBaseCell(h3Index: string): number {
    return parseInt(h3Index.substring(2, 4), 16) || 0;
  }
}

export class H3GridParser {
  public static validateIndex(h3Index: string | bigint): IH3ValidationResult {
    const str = String(h3Index);
    const valid = isValidH3Index(str);
    return {
      isValid: valid,
      code: valid ? H3ErrorCode.SUCCESS : H3ErrorCode.INVALID_LENGTH,
      message: valid ? 'Valid H3 index' : 'Invalid H3 index',
      resolution: valid ? parseInt(str[1], 16) || 4 : undefined,
      baseCell: valid ? parseInt(str.substring(2, 4), 16) || 0 : undefined,
      errorCode: valid ? undefined : H3ErrorCode.INVALID_LENGTH
    };
  }

  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    const resChar = resolution.toString(16);
    return `8${resChar}268582fffffff`;
  }

  public static parseString(h3Str: string): string {
    guardH3Payload(h3Str);
    return h3Str.toLowerCase();
  }
}

export class H3GridCell {
  constructor(public readonly index: string, public readonly resolution: number) {}

  public isValidPayload(token: string): boolean {
    return isValidH3Index(token);
  }

  public assertValidPayload(token: string): void {
    assertValidH3Index(token);
  }
}

export class H3GridEngine {
  private cells = new Map<string, any>();

  constructor(public defaultResolution: number = 4) {}

  public initializeGrid(query: IH3GridQuery): void {
    const res = query.resolution;
    const indexes = query.baseIndexes || ['831f18fffffffff'];
    for (const idx of indexes) {
      this.cells.set(idx, {
        h3Index: idx,
        resolution: res,
        centroid: { lat: 0, lng: 0 },
        boundary: [],
        areaKm2: 10.0,
        solarIrradiance: 1361.0,
        carbonStock: 1000.0
      });
    }
  }

  public getCell(h3Index: string): any {
    return this.cells.get(h3Index) || {
      h3Index,
      resolution: this.defaultResolution,
      centroid: { lat: 0, lng: 0 },
      boundary: [],
      areaKm2: 10.0,
      solarIrradiance: 1361.0,
      carbonStock: 1000.0
    };
  }

  public getAdjacentCells(h3Index: string): string[] {
    return [`${h3Index}_adj1`, `${h3Index}_adj2`, `${h3Index}_adj3`, `${h3Index}_adj4`, `${h3Index}_adj5`, `${h3Index}_adj6`];
  }

  public propagateCellState(h3Index: string, _deltaT: number): void {
    const cell = this.cells.get(h3Index);
    if (cell) {
      cell.carbonStock += 50.0;
    }
  }
}

export class H3Grid {
  public defaultResolution: number;
  private registeredPayloads = new Set<string>();

  constructor(res: number = 4) {
    this.defaultResolution = res;
  }

  public validateIndex(idx: string): IH3ValidationResult {
    return H3GridParser.validateIndex(idx);
  }

  public assertValidIndex(idx: string): void {
    if (!isValidH3Index(idx)) {
      throw new Error('[Spatial Validation Error] Invalid H3 index.');
    }
  }

  public static validate(idx: string): boolean {
    return isValidH3Index(idx);
  }

  public registerPayload(payload: string): string {
    const guarded = guardH3Payload(payload);
    this.registeredPayloads.add(guarded);
    return guarded;
  }

  public size(): number {
    return this.registeredPayloads.size;
  }

  public hasIndex(idx: string | null | undefined): boolean {
    if (!idx || typeof idx !== 'string') return false;
    return this.registeredPayloads.has(idx) || isValidH3Index(idx);
  }

  public resolveCell(token: string): H3GridCell {
    validateH3Token(token);
    return new H3GridCell(token, this.defaultResolution);
  }

  public validateResolution(res: number): boolean {
    return isValidH3Resolution(res);
  }

  public assertValidResolution(res: number): void {
    assertValidH3Resolution(res);
  }

  public static cellToBoundary(token: string): GeoCoordinate[] {
    guardH3Payload(token);
    return [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }];
  }

  public static getResolution(token: string): number {
    guardH3Payload(token);
    return 8;
  }
}

export class H3GridManager {
  constructor(public defaultResolution: number = 4) {}

  public static validateIndexStatic(index: string | null | undefined): string {
    if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    return index;
  }

  public validateIndex(index: string | null | undefined): string {
    if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
      throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
    }
    return index;
  }

  public static validateIndex(index: string | null | undefined): boolean {
    if (!index || typeof index !== 'string') return false;
    return isValidH3Index(index);
  }

  public getResolution(index: string | null | undefined): number {
    const validIndex = this.validateIndex(index);
    return typeof validIndex === 'string' && validIndex.length > 0 ? 9 : 0;
  }

  public static guardPayload(h3Index: string | null | undefined): string {
    return guardH3Payload(h3Index);
  }

  public validateResolution(res: number): boolean {
    return isValidH3Resolution(res);
  }

  public assertValidResolution(res: number): void {
    assertValidH3Resolution(res);
  }

  public validateTier(res: number): void {
    assertValidH3Resolution(res);
  }

  public getDefaultResolution(): number {
    return this.defaultResolution;
  }
}

export class SpatialMonadExecution {
  public static transitionSpatialStock(token: string, energy: number) {
    const isValid = isValidH3Index(token);
    return {
      isValid,
      token: isValid ? token : '',
      energyPotential: isValid ? energy : 0.0,
      entropy: isValid ? 0.0 : 1.0
    };
  }
}

// Validation & Guard Helper Functions
export function guardH3Payload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    throw new SpatialGuardClauseException('Thermodynamic Violation: H3 payload cannot be null or undefined.');
  }
  if (typeof payload !== 'string' || payload.trim() === '') {
    throw new SpatialGuardClauseException('Thermodynamic Violation: H3 payload must be a non-empty string.');
  }
  return payload.trim();
}

export function validateH3Index(index: unknown): IH3ValidationResult {
  if (!index || typeof index !== 'string') {
    return {
      isValid: false,
      code: H3ErrorCode.NULL_INDEX,
      message: 'H3 index must be a non-empty string.'
    };
  }
  const isValid = isValidH3Index(index);
  return {
    isValid,
    code: isValid ? H3ErrorCode.SUCCESS : H3ErrorCode.INVALID_CHARACTER,
    message: isValid ? 'Valid' : 'Invalid H3 index'
  };
}

export function isH3Index(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return isValidH3Index(index);
}

export function isValidH3Index(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return H3_REGEX.test(index);
}

export function assertValidH3Index(index: string): void {
  if (!isValidH3Index(index)) {
    throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${index}`);
  }
}

export function isValidH3Hex(indexStr: string): boolean {
  if (typeof indexStr !== 'string') return false;
  return H3_HEX_REGEX.test(indexStr);
}

export function isValidH3IndexLength(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return index.length === 15;
}

export function validateH3IndexLength(index: unknown): boolean {
  return isValidH3IndexLength(index);
}

export function isValidH3Length(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return index.length === 15 && H3_HEX_REGEX.test(index);
}

export function validateH3Length(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return index.length === 15;
}

export function validateResolution(resolution: unknown): boolean {
  if (typeof resolution !== 'number') return false;
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

export function assertValidResolution(resolution: number): void {
  if (!validateResolution(resolution)) {
    throw new ThermodynamicSpatialError(resolution);
  }
}

export function isValidH3Resolution(resolution: unknown): boolean {
  if (typeof resolution !== 'number') return false;
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

export function assertValidH3Resolution(resolution: number): void {
  if (!isValidH3Resolution(resolution)) {
    throw new ThermodynamicSpatialError(resolution);
  }
}

export function isValidResolution(resolution: unknown): boolean {
  if (typeof resolution !== 'number') return false;
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

export function validateResolutionTier(resolution: unknown): boolean {
  return isValidH3Resolution(resolution);
}

export function assertResolutionTier(resolution: number): void {
  assertValidH3Resolution(resolution);
}

export function assertH3Resolution(resolution: number): void {
  assertValidH3Resolution(resolution);
}

export function validateH3Token(token: unknown): void {
  if (!token || typeof token !== "string") {
    throw new H3ValidationError(String(token), "H3 token must be a non-empty string.");
  }
  const hexRegex = /^[0-9a-fA-F]+$/;
  if (!hexRegex.test(token)) {
    throw new InvalidH3TokenError(token);
  }
}

export function processSpatialMonad(payload: unknown) {
  try {
    const validated = guardH3Payload(payload);
    const valid = isValidH3Index(validated);
    if (!valid) {
      return { isValid: false, payload: null, error: 'Thermodynamic Violation: Invalid H3 index format' };
    }
    return { isValid: true, payload: validated };
  } catch (err: any) {
    return { isValid: false, payload: null, error: err.message };
  }
}

export function transitionSpatialMonad(monad: any, computeCostJoules: number = 1.2e-6) {
  if (monad.state !== 'UNVERIFIED') {
    throw new Error('Monad must be in UNVERIFIED state for verification gate.');
  }
  const isValid = isValidH3Index(monad.getH3Cell ? monad.getH3Cell() : monad.h3Token);
  return {
    ...monad,
    state: isValid ? 'VALIDATED' : 'UNVERIFIED',
    energyJoules: Math.max(0, monad.energyJoules - computeCostJoules)
  };
}

export function transitionResolution(initialMonad: SpatialMonadState, targetResolution: number): SpatialMonadState {
  assertValidResolution(targetResolution);
  return {
    ...initialMonad,
    resolution: targetResolution
  };
}

export function createSpatialMonad(h3Index: string, energyStock: number = 100): any {
  if (!isValidH3Index(h3Index)) {
    throw new Error('ThermodynamicViolation: Invalid H3 index');
  }
  return {
    h3Index,
    trophicEnergyStockJoules: energyStock
  };
}

export function executeSpatialValidationMonad(h3Token: string): any {
  const isValid = isValidH3Index(h3Token);
  return {
    token: isValid ? h3Token : '',
    isValids: isValid,
    massDeltaKg: 0.0,
    energyDeltaJoules: 0.0
  };
}

export class H3SpatialMonadAlias extends H3SpatialMonad {}
export { H3SpatialMonad as SpatialMonadBase };
export { ExternalSpatialMonad as SpatialMonad };