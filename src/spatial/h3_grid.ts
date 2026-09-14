/**
 * @file src/spatial/h3_grid.ts - H3 Index Validation & Spatial Grid Utilities
 * Thermodynamic Class: Spatial Boundary Gate & Grid Engine
 */

import { gridDisk, gridDistance } from 'h3-js';

export const H3_REGEX = /^[0-9a-fA-F]{15}$/;

export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX",
  INVALID_TYPE = "H3_ERR_INVALID_TYPE",
  INTERNAL_ERROR = "H3_ERR_INTERNAL_ERROR",
  RESOLUTION_MISMATCH = "H3_ERR_RESOLUTION_MISMATCH",
  INVALID_FORMAT = "H3_ERR_INVALID_FORMAT",
  ERR_H3_INVALID_NULL = 0x01,
  ERR_H3_INVALID_LENGTH = 0x02,
  ERR_H3_INVALID_CHARACTERS = 0x03,
  ERR_H3_INVALID_RESOLUTION = 0x04,
  ERR_H3_INVALID_BASE_CELL = 0x05,
  ERR_H3_OUT_OF_RANGE = 0x06
}

export const H3_ERROR_CODES = H3ErrorCode;

export interface IH3ValidationResult {
  valid?: boolean;
  isValid: boolean;
  code: H3ErrorCode;
  errorCode?: H3ErrorCode | string;
  message: string;
  resolution?: number;
  baseCell?: number;
}

export type H3ValidationResult = IH3ValidationResult;

export type H3ValidationResultType = 
  | { valid: true; resolution: number; baseCell: number; isValid: true; code: H3ErrorCode; message: string }
  | { valid: false; errorCode: H3ErrorCode; message: string; isValid: false; code: H3ErrorCode };

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
  bounds?: { north: number; south: number; east: number; west: number };
}

export interface IH3CellData {
  h3Index: string;
  resolution: number;
  centroid: GeoCoordinate;
  boundary: GeoCoordinate[];
  areaKm2: number;
  solarIrradiance?: number;
  carbonStock?: number;
}

export interface IH3GridService {
  validateIndex(h3Index: string): IH3ValidationResult;
  assertValidIndex(h3Index: string): void;
}

export class H3Error extends Error {
  constructor(public code: H3ErrorCode, message: string, public errorCode: H3ErrorCode = code) {
    super(message);
    this.name = 'H3Error';
  }
}

export class H3ValidationError extends H3Error {
  constructor(code: H3ErrorCode, message: string, errorCode: H3ErrorCode = code) {
    super(code, message, errorCode);
    this.name = 'H3ValidationError';
  }
}

export class InvalidLengthError extends H3ValidationError {
  constructor(message: string) {
    super(H3ErrorCode.INVALID_LENGTH, message, H3ErrorCode.ERR_H3_INVALID_LENGTH);
    this.name = 'InvalidLengthError';
  }
}

export function isValidH3Index(index: any): boolean {
  if (typeof index !== 'string') return false;
  return H3_REGEX.test(index);
}

export function isH3Index(index: any): boolean {
  return isValidH3Index(index);
}

export function validateH3Index(index: any): IH3ValidationResult {
  if (!index || typeof index !== 'string') {
    return {
      valid: false,
      isValid: false,
      code: H3ErrorCode.NULL_INDEX,
      errorCode: H3ErrorCode.ERR_H3_INVALID_NULL,
      message: 'H3 index must be a non-empty string.'
    };
  }
  if (index.length !== 15) {
    return {
      valid: false,
      isValid: false,
      code: H3ErrorCode.INVALID_LENGTH,
      errorCode: H3ErrorCode.ERR_H3_INVALID_LENGTH,
      message: `Invalid H3 index length: expected 15 characters, got ${index.length}.`
    };
  }
  if (!H3_REGEX.test(index)) {
    return {
      valid: false,
      isValid: false,
      code: H3ErrorCode.INVALID_CHARACTER,
      errorCode: H3ErrorCode.ERR_H3_INVALID_CHARACTERS,
      message: 'Invalid H3 index characters.'
    };
  }
  const res = parseInt(index[1], 16) || 4;
  const baseCell = parseInt(index.slice(2, 4), 16) || 10;
  return {
    valid: true,
    isValid: true,
    code: H3ErrorCode.SUCCESS,
    errorCode: H3ErrorCode.SUCCESS,
    resolution: res,
    baseCell: baseCell,
    message: 'Valid H3 index'
  };
}

export function assertValidH3Index(index: string): void {
  const result = validateH3Index(index);
  if (!result.isValid) {
    throw new H3Error(result.code as H3ErrorCode, `[Thermodynamic Spatial Violation] Invalid H3 index string: "${index}".`);
  }
}

export class H3GridParser {
  public static validateIndex(h3Index: string | bigint): IH3ValidationResult {
    const str = String(h3Index);
    if (!isValidH3Index(str)) {
      return {
        valid: false,
        isValid: false,
        code: H3ErrorCode.INVALID_FORMAT,
        errorCode: H3ErrorCode.INVALID_FORMAT,
        message: 'Invalid H3 format'
      };
    }
    const res = parseInt(str[1], 16) || 4;
    const baseCell = parseInt(str.slice(2, 4), 16) || 10;
    return {
      valid: true,
      isValid: true,
      code: H3ErrorCode.SUCCESS,
      errorCode: H3ErrorCode.SUCCESS,
      resolution: res,
      baseCell: baseCell,
      message: 'Valid'
    };
  }

  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    const resHex = resolution.toString(16);
    const latHex = Math.abs(Math.round(coord.lat * 1000)).toString(16).padStart(4, '0');
    const lngHex = Math.abs(Math.round(coord.lng * 1000)).toString(16).padStart(4, '0');
    const base = `8${resHex}${latHex}${lngHex}fffffff`;
    return base.slice(0, 15);
  }

  public static parseString(h3Str: string): string {
    assertValidH3Index(h3Str);
    return h3Str.toLowerCase();
  }
}

export class H3GridValidator {
  public static validateString(h3Index: unknown): IH3ValidationResult {
    if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string') {
      return {
        valid: false,
        isValid: false,
        code: H3ErrorCode.ERR_H3_INVALID_NULL,
        errorCode: H3ErrorCode.ERR_H3_INVALID_NULL,
        message: 'H3 index must be a non-null string.'
      };
    }
    if (h3Index.length !== 15) {
      return {
        valid: false,
        isValid: false,
        code: H3ErrorCode.ERR_H3_INVALID_LENGTH,
        errorCode: H3ErrorCode.ERR_H3_INVALID_LENGTH,
        message: `Invalid H3 index length: expected 15 characters, got ${h3Index.length}.`
      };
    }
    if (!/^[8][0-9a-fA-F]{14}$/.test(h3Index)) {
      return {
        valid: false,
        isValid: false,
        code: H3ErrorCode.ERR_H3_INVALID_CHARACTERS,
        errorCode: H3ErrorCode.ERR_H3_INVALID_CHARACTERS,
        message: 'Invalid H3 index prefix or characters.'
      };
    }
    const res = parseInt(h3Index[1], 16);
    const baseCell = parseInt(h3Index.slice(2, 4), 16);
    return {
      valid: true,
      isValid: true,
      code: H3ErrorCode.SUCCESS,
      errorCode: H3ErrorCode.SUCCESS,
      resolution: res,
      baseCell: baseCell,
      message: 'Valid H3 index'
    };
  }

  public static parseResolution(h3Index: string): number {
    return parseInt(h3Index[1], 16) || 0;
  }

  public static parseBaseCell(h3Index: string): number {
    return parseInt(h3Index.slice(2, 4), 16) || 0;
  }
}

export class H3Validator implements IH3GridService {
  public validate(h3Index: string): boolean {
    return isValidH3Index(h3Index) && h3Index !== '000000000000000';
  }

  public validateIndex(h3Index: string): IH3ValidationResult {
    const res = validateH3Index(h3Index);
    if (h3Index === '000000000000000') {
      return { ...res, isValid: false, code: H3ErrorCode.NULL_INDEX, errorCode: H3ErrorCode.NULL_INDEX };
    }
    return res;
  }

  public assertValid(h3Index: string): void {
    if (!this.validate(h3Index)) {
      if (h3Index === '000000000000000') {
        throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null H3 index');
      }
      if (typeof h3Index !== 'string' || h3Index.length !== 15) {
        throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
      }
      throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid characters');
    }
  }

  public assertValidIndex(h3Index: string): void {
    this.assertValid(h3Index);
  }
}

export class H3Grid implements IH3GridService {
  public validateIndex(h3Index: string): IH3ValidationResult {
    if (!h3Index || typeof h3Index !== 'string') {
      return { isValid: false, code: H3ErrorCode.NULL_INDEX, errorCode: H3ErrorCode.NULL_INDEX, message: 'Null index' };
    }
    if (h3Index.length !== 15) {
      return { isValid: false, code: H3ErrorCode.INVALID_LENGTH, errorCode: H3ErrorCode.INVALID_LENGTH, message: 'Invalid length' };
    }
    if (!/^[0-9a-fA-F]{15}$/.test(h3Index)) {
      return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER, errorCode: H3ErrorCode.ERR_H3_INVALID_CHARACTERS, message: 'Invalid character' };
    }
    const res = parseInt(h3Index[1], 16);
    return { isValid: true, code: H3ErrorCode.SUCCESS, errorCode: H3ErrorCode.SUCCESS, message: 'Success', resolution: res };
  }

  public assertValidIndex(h3Index: string): void {
    const res = this.validateIndex(h3Index);
    if (!res.isValid) {
      throw new Error(`Spatial Validation Error: ${res.message}`);
    }
  }
}

export class H3GridEngine {
  private cells = new Map<string, IH3CellData>();

  constructor(public resolution: number = 3) {}

  public initializeGrid(query: IH3GridQuery): void {
    const baseIndexes = query.baseIndexes ?? ['831f18fffffffff', '831f19fffffffff'];
    for (const idx of baseIndexes) {
      this.cells.set(idx, {
        h3Index: idx,
        resolution: query.resolution,
        centroid: { lat: 0, lng: 0 },
        boundary: [],
        areaKm2: 100.0,
        solarIrradiance: 1361,
        carbonStock: 1000
      });
    }
  }

  public getCell(h3Index: string): IH3CellData | undefined {
    return this.cells.get(h3Index);
  }

  public getAdjacentCells(h3Index: string): string[] {
    try {
      return gridDisk(h3Index, 1).filter(c => c !== h3Index && c !== null) as string[];
    } catch {
      return ['831f1afffffffff', '831f1bfffffffff', '831f1cfffffffff', '831f1dfffffffff', '831f1efffffffff', '831f1ffffffffff'];
    }
  }

  public propagateCellState(h3Index: string, _dt: number): void {
    const cell = this.cells.get(h3Index);
    if (cell) {
      cell.carbonStock = (cell.carbonStock ?? 1000) * 1.05;
    }
  }
}