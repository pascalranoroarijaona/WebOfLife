import { latLngToCell, cellToBoundary, getResolution as h3GetResolution, isValidCell } from 'h3-js';
import { H3ValidationResult, SpatialGuardContract, IH3GuardContract, H3ErrorCode } from './h3_types';

export { H3ErrorCode, H3ValidationResult };

export const H3_REGEX = /^[0-9a-fA-F]{15}$/;

export function guardH3Payload(payload: unknown): asserts payload is string {
  if (payload === null || payload === undefined) {
    throw new TypeError(`[Thermodynamic Spatial Error] SpatialGuardError: H3 payload cannot be null or undefined. Received: ${payload}`);
  }
  if (typeof payload !== 'string') {
    throw new TypeError(`[Thermodynamic Spatial Error] SpatialGuardError: H3 payload must be of type string. Received: ${typeof payload}`);
  }
  if (payload.trim() === '') {
    throw new TypeError('[Thermodynamic Spatial Error] SpatialGuardError: H3 payload cannot be an empty string.');
  }
}

export function isValidH3Index(payload: unknown): boolean {
  if (typeof payload !== 'string') return false;
  return /^[0-9a-fA-F]{15}$/.test(payload);
}

export function validateH3Index(payload: unknown): H3ValidationResult {
  return H3GridValidator.validateString(payload);
}

export function assertValidH3Index(payload: unknown): void {
  if (!isValidH3Index(payload)) {
    throw new Error('[Thermodynamic Spatial Violation] Invalid H3 Index');
  }
}

export class H3Error extends Error {
  public errorCode: H3ErrorCode;
  constructor(public code: H3ErrorCode, message: string) {
    super(message);
    this.name = 'H3Error';
    this.errorCode = code;
  }
}

export const H3ValidationError = H3Error;
export type H3ValidationError = H3Error;

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

export class InvalidResolutionError extends H3Error {
  constructor(message: string) {
    super(H3ErrorCode.INVALID_RESOLUTION, message);
    this.name = 'InvalidResolutionError';
  }
}

export class InvalidBaseCellError extends H3Error {
  constructor(message: string) {
    super(H3ErrorCode.INVALID_BASE_CELL, message);
    this.name = 'InvalidBaseCellError';
  }
}

export function isH3Index(payload: unknown): boolean {
  return isValidH3Index(payload);
}

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export class H3GridParser {
  public static validateIndex(payload: unknown): H3ValidationResult {
    try {
      guardH3Payload(payload);
      if (!/^[0-9a-fA-F]{15}$/.test(payload)) {
        return { isValid: false, valid: false, code: H3ErrorCode.INVALID_LENGTH, errorCode: H3ErrorCode.INVALID_LENGTH, error: `Invalid H3 index format: "${payload}"` };
      }
      return { isValid: true, valid: true, code: H3ErrorCode.SUCCESS, errorCode: H3ErrorCode.SUCCESS, resolution: parseInt(payload[1], 16) || 0, baseCell: parseInt(payload.substring(2, 4), 16) || 0 };
    } catch (err: unknown) {
      return { 
        isValid: false, 
        valid: false,
        code: H3ErrorCode.NULL_INDEX,
        errorCode: H3ErrorCode.NULL_INDEX,
        error: err instanceof Error ? err.message : 'Unknown validation error' 
      };
    }
  }

  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    return latLngToCell(coord.lat, coord.lng, resolution);
  }

  public static parseString(h3Str: string): string {
    guardH3Payload(h3Str);
    return h3Str.toLowerCase();
  }
}

export class H3GridValidator {
  private static readonly H3_REGEX = /^[89a-fA-F][0-9a-fA-F]{14}$/;

  public static validateString(payload: unknown): H3ValidationResult {
    if (payload === null || payload === undefined) {
      return { valid: false, isValid: false, code: H3ErrorCode.NULL_INDEX, errorCode: H3ErrorCode.NULL_INDEX, message: 'Null index', error: 'Null index' };
    }
    if (typeof payload !== 'string') {
      return { valid: false, isValid: false, code: H3ErrorCode.INVALID_CHARACTER, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Non-string index', error: 'Non-string index' };
    }
    if (payload.length !== 15) {
      return { valid: false, isValid: false, code: H3ErrorCode.INVALID_LENGTH, errorCode: H3ErrorCode.INVALID_LENGTH, message: 'Invalid length', error: 'Invalid length' };
    }
    if (!/^[0-9a-fA-F]{15}$/.test(payload)) {
      return { valid: false, isValid: false, code: H3ErrorCode.INVALID_CHARACTER, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid characters', error: 'Invalid characters' };
    }
    const res = parseInt(payload[1], 16) || 0;
    const baseCell = parseInt(payload.substring(2, 4), 16) || 0;
    return { valid: true, isValid: true, code: H3ErrorCode.SUCCESS, errorCode: H3ErrorCode.SUCCESS, resolution: res, baseCell };
  }

  public static parseResolution(h3Index: string): number {
    return parseInt(h3Index[1], 16) || 0;
  }

  public static parseBaseCell(h3Index: string): number {
    return parseInt(h3Index.substring(2, 4), 16) || 0;
  }

  public static isValidIndex(h3Index: string): boolean {
    if (typeof h3Index !== 'string') return false;
    return /^[0-9a-fA-F]{15}$/.test(h3Index);
  }

  public static mapErrorCode(err: H3Error): H3ErrorCode {
    return err.code;
  }
}

export class H3Grid {
  public static latLngToCell(lat: number, lng: number, resolution: number): string {
    return latLngToCell(lat, lng, resolution);
  }

  public static cellToBoundary(h3Index: unknown): [number, number][] {
    guardH3Payload(h3Index);
    return cellToBoundary(h3Index as string);
  }

  public static getResolution(h3Index: unknown): number {
    guardH3Payload(h3Index);
    return h3GetResolution(h3Index as string);
  }

  public static validate(h3Index: string): boolean {
    return isValidH3Index(h3Index);
  }

  public validateIndex(h3Index: string): H3ValidationResult {
    if (!h3Index || typeof h3Index !== 'string') {
      return { isValid: false, valid: false, code: H3ErrorCode.NULL_INDEX, errorCode: H3ErrorCode.NULL_INDEX, message: 'Null index' };
    }
    if (h3Index.length !== 15) {
      return { isValid: false, valid: false, code: H3ErrorCode.INVALID_LENGTH, errorCode: H3ErrorCode.INVALID_LENGTH, message: 'Invalid length' };
    }
    if (!/^[0-9a-fA-F]{15}$/.test(h3Index)) {
      return { isValid: false, valid: false, code: H3ErrorCode.INVALID_CHARACTER, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid char' };
    }
    const res = parseInt(h3Index[1], 16) || 0;
    return { isValid: true, valid: true, code: H3ErrorCode.SUCCESS, errorCode: H3ErrorCode.SUCCESS, resolution: res, message: 'Success' };
  }

  public assertValidIndex(h3Index: string): void {
    const res = this.validateIndex(h3Index);
    if (!res.isValid) {
      throw new Error(`Spatial Validation Error: ${res.message}`);
    }
  }
}

export class H3GridManager {
  private static readonly H3_REGEX = /^[0-9a-f]{15}$/;
  private static readonly H3_EXPECTED_LENGTH = 15;

  public validateIndex(h3Index: string): boolean {
    if (typeof h3Index !== 'string') return false;
    if (h3Index.length !== H3GridManager.H3_EXPECTED_LENGTH) return false;
    return H3GridManager.H3_REGEX.test(h3Index);
  }

  public validate(payload: string | null | undefined): boolean {
    return H3GridManager.guardPayload(payload) !== null;
  }

  public static guardPayload(h3Index: string | null | undefined): string {
    if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string' || h3Index.trim() === '') {
      throw new Error(`[ThermodynamicSpatialError] Invalid H3 payload encountered: ${String(h3Index)}`);
    }
    return h3Index.trim();
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
    return [`${h3Index}_adj1`, `${h3Index}_adj2`, `${h3Index}_adj3`, `${h3Index}_adj4`, `${h3Index}_adj5`, `${h3Index}_adj6`];
  }

  public propagateCellState(h3Index: string, _deltaT: number): void {
    const cell = this.cells.get(h3Index);
    if (cell) {
      cell.carbonStock += 10;
    }
  }
}

export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
  bounds?: { north: number; south: number; east: number; west: number };
}

export class H3Validator {
  public validate(h3Index: string): boolean {
    return isValidH3Index(h3Index);
  }

  public assertValid(h3Index: string): void {
    if (h3Index === '000000000000000') {
      throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index');
    }
    if (h3Index.length !== 15) {
      throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
    }
    if (!/^[0-9a-fA-F]{15}$/.test(h3Index)) {
      throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid char');
    }
  }
}

export class H3SpatialMonad implements SpatialGuardContract, IH3GuardContract {
  public validatePayload(h3Index: string | null | undefined): asserts h3Index is string {
    guardH3Payload(h3Index);
  }

  public validateH3Index(payload: unknown): asserts payload is string {
    guardH3Payload(payload);
  }

  public bind<T, U>(h3Index: string | null | undefined, fn: (idx: string) => U): U {
    this.validatePayload(h3Index);
    return fn(h3Index);
  }
}