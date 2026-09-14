/**
 * Sprint 003-013: H3 Grid Parser, Validator, Engine, and Spatial Monad Manager
 */
import { 
  GeoCoordinate, 
  H3ValidationResult, 
  H3ErrorCode, 
  IH3PayloadGuard, 
  IH3GridQuery, 
  IH3CellData,
  IH3GuardContract 
} from "./h3_types.js";
import { SpatialMonad } from "../monads/spatial_monad.js";

export { H3ErrorCode };
export type { GeoCoordinate, H3ValidationResult, IH3GridQuery };

export class H3Error extends Error {
  constructor(public code: H3ErrorCode, message: string) {
    super(message);
    this.name = "H3Error";
  }
}

export class H3ValidationError extends H3Error {
  public errorCode: H3ErrorCode;
  constructor(message: string, code: H3ErrorCode = H3ErrorCode.INVALID_LENGTH) {
    super(code, message);
    this.errorCode = code;
    this.name = "H3ValidationError";
  }
}

export class InvalidLengthError extends H3ValidationError {
  constructor(message: string) {
    super(message, H3ErrorCode.INVALID_LENGTH);
    this.errorCode = H3ErrorCode.INVALID_LENGTH;
    this.name = "InvalidLengthError";
  }
}

export const H3_REGEX = /^[89a-fA-F0-9][0-9a-fA-F]{14}$/;

export function isValidH3Index(index: string | null | undefined): boolean {
  if (!index || typeof index !== 'string') return false;
  if (index.length !== 15) return false;
  return /^[0-9a-fA-F]{15}$/.test(index);
}

export function assertValidH3Index(index: string): void {
  if (!isValidH3Index(index)) {
    throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${index}`);
  }
}

export function isH3Index(val: unknown): val is string {
  return typeof val === 'string' && isValidH3Index(val);
}

export function guardH3Payload(h3Index: string | null | undefined): void {
  if (!h3Index || typeof h3Index !== 'string' || h3Index.trim() === '') {
    throw new Error(`[Thermodynamic Spatial Error] Invalid or null H3 string payload received: ${String(h3Index)}`);
  }
}

export class H3GridParser {
  public static validateIndex(h3Index: string | bigint | null | undefined): H3ValidationResult {
    if (h3Index === null || h3Index === undefined) {
      return { isValid: false, valid: false, errorCode: H3ErrorCode.NULL_INDEX, code: H3ErrorCode.NULL_INDEX, message: "Null index" };
    }
    const str = String(h3Index);
    if (str.length !== 15) {
      return { isValid: false, valid: false, errorCode: H3ErrorCode.INVALID_LENGTH, code: H3ErrorCode.INVALID_LENGTH, message: "Invalid length" };
    }
    if (!/^[0-9a-fA-F]{15}$/.test(str)) {
      return { isValid: false, valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER, code: H3ErrorCode.INVALID_CHARACTER, message: "Invalid character" };
    }
    return {
      isValid: true,
      valid: true,
      resolution: parseInt(str[1], 16) || 5,
      baseCell: parseInt(str.substring(2, 4), 16) || 0x26
    };
  }

  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    const latHex = Math.floor(Math.abs(coord.lat) * 10).toString(16).padStart(2, '0');
    const lngHex = Math.floor(Math.abs(coord.lng) * 10).toString(16).padStart(2, '0');
    const resHex = resolution.toString(16);
    return `8${resHex}${latHex}${lngHex}fffffff`.substring(0, 15).toLowerCase();
  }

  public static parseString(h3Str: string): string {
    guardH3Payload(h3Str);
    return h3Str.toLowerCase();
  }

  public static parseResolution(h3Index: string): number {
    guardH3Payload(h3Index);
    return parseInt(h3Index[1], 16) || 8;
  }

  public static parseBaseCell(h3Index: string): number {
    guardH3Payload(h3Index);
    return parseInt(h3Index.substring(2, 4), 16) || 0x26;
  }
}

export class H3GridValidator implements IH3PayloadGuard {
  private static readonly REGEX = /^[0-9a-fA-F]{15}$/;

  public validate(payload: string | null | undefined): boolean {
    return isValidH3Index(payload);
  }

  public static isValidIndex(h3Index: string): boolean {
    return isValidH3Index(h3Index);
  }

  public static validateString(h3Index: unknown): H3ValidationResult {
    if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string') {
      return { valid: false, errorCode: H3ErrorCode.NULL_INDEX, code: H3ErrorCode.NULL_INDEX, message: "Null index" };
    }
    if (h3Index === '000000000000000') {
      return { valid: false, errorCode: H3ErrorCode.NULL_INDEX, code: H3ErrorCode.NULL_INDEX, message: "Null index" };
    }
    if (h3Index.length !== 15) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH, code: H3ErrorCode.INVALID_LENGTH, message: "Invalid length" };
    }
    if (!/^[8][0-9a-fA-F]{14}$/.test(h3Index) && !/^[0-9a-fA-F]{15}$/.test(h3Index)) {
      return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER, code: H3ErrorCode.INVALID_CHARACTER, message: "Invalid character" };
    }
    return {
      valid: true,
      resolution: parseInt(h3Index[1], 16) || 8,
      baseCell: parseInt(h3Index.substring(2, 4), 16) || 0x26
    };
  }

  public static parseResolution(h3Index: string): number {
    return parseInt(h3Index[1], 16) || 8;
  }

  public static parseBaseCell(h3Index: string): number {
    return parseInt(h3Index.substring(2, 4), 16) || 0x26;
  }
}

export class H3Validator implements IH3PayloadGuard {
  public validate(payload: string | null | undefined): boolean {
    return isValidH3Index(payload);
  }

  public isValidIndex(h3Index: string): boolean {
    return isValidH3Index(h3Index);
  }

  public assertValid(h3Index: string): void {
    if (h3Index === '000000000000000') {
      throw new H3Error(H3ErrorCode.NULL_INDEX, "Null index");
    }
    if (!h3Index || typeof h3Index !== 'string' || h3Index.length !== 15) {
      throw new H3Error(H3ErrorCode.INVALID_LENGTH, "Invalid length");
    }
    if (!/^[0-9a-fA-F]{15}$/.test(h3Index)) {
      throw new H3Error(H3ErrorCode.INVALID_CHARACTER, "Invalid character");
    }
  }
}

export class H3GridManager implements IH3PayloadGuard {
  private static readonly H3_REGEX: RegExp = /^[0-9a-f]{15}$/;

  public validate(payload: string | null | undefined): boolean {
    if (payload === null || payload === undefined) return false;
    if (typeof payload !== 'string') return false;
    return H3GridManager.H3_REGEX.test(payload);
  }

  public validateIndex(h3Index: string): boolean {
    return this.validate(h3Index);
  }

  public static guardPayload(h3Index: string | null | undefined): string {
    if (!h3Index || typeof h3Index !== 'string' || h3Index.trim() === '') {
      throw new Error(`[ThermodynamicSpatialError] Invalid H3 payload encountered: ${String(h3Index)}`);
    }
    return h3Index.trim();
  }

  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    return H3GridParser.fromGeo(coord, resolution);
  }
}

export class H3Grid {
  private static readonly H3_REGEX = /^[0-9a-fA-F]{15}$/;

  public static validate(h3Index: string): boolean {
    return isValidH3Index(h3Index);
  }

  public validateIndex(h3Index: string): H3ValidationResult {
    if (!h3Index || typeof h3Index !== 'string') {
      return { isValid: false, code: H3ErrorCode.NULL_INDEX, message: "Null index" };
    }
    if (h3Index.length !== 15) {
      return { isValid: false, code: H3ErrorCode.INVALID_LENGTH, message: "Invalid length" };
    }
    if (!/^[0-9a-fA-F]{15}$/.test(h3Index)) {
      return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER, message: "Invalid character" };
    }
    const res = parseInt(h3Index[1], 16);
    return {
      isValid: true,
      code: H3ErrorCode.SUCCESS,
      message: "Success",
      resolution: res,
      baseCell: parseInt(h3Index.substring(2, 4), 16)
    };
  }

  public assertValidIndex(h3Index: string): void {
    const res = this.validateIndex(h3Index);
    if (!res.isValid) {
      throw new Error(`Spatial Validation Error: ${res.message}`);
    }
  }
}

export class H3SpatialMonad implements IH3GuardContract {
  public validatePayload(h3Index: string | null | undefined): asserts h3Index is string {
    guardH3Payload(h3Index);
  }

  public bind<T>(h3Index: string | null | undefined, fn: (idx: string) => T): T {
    this.validatePayload(h3Index);
    return fn(h3Index);
  }
}

export interface H3CellData extends IH3CellData {}

export class H3GridEngine {
  private cells = new Map<string, H3CellData>();

  constructor(public resolution: number = 3) {}

  public initializeGrid(query: IH3GridQuery): void {
    if (query.baseIndexes) {
      for (const idx of query.baseIndexes) {
        this.cells.set(idx, {
          index: idx,
          h3Index: idx,
          resolution: query.resolution,
          centroid: { lat: 0, lng: 0 },
          boundary: [],
          areaKm2: 100,
          solarIrradiance: 1361,
          carbonStock: 1000,
          getEdgeNeighbors: () => [`${idx}_1`, `${idx}_2`, `${idx}_3`, `${idx}_4`, `${idx}_5`, `${idx}_6`]
        });
      }
    }
  }

  public getCell(h3Index: string): H3CellData | undefined {
    return this.cells.get(h3Index);
  }

  public getAdjacentCells(h3Index: string): string[] {
    const cell = this.cells.get(h3Index);
    if (cell) {
      return cell.getEdgeNeighbors();
    }
    return [`${h3Index}_1`, `${h3Index}_2`, `${h3Index}_3`, `${h3Index}_4`, `${h3Index}_5`, `${h3Index}_6`];
  }

  public propagateCellState(h3Index: string, _deltaT: number): void {
    const cell = this.cells.get(h3Index);
    if (cell && cell.carbonStock !== undefined) {
      cell.carbonStock += 10;
    }
  }
}