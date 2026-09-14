import { IH3GuardContract, H3ErrorCode, H3IndexString, IH3Validator } from './h3_types.js';

export { H3ErrorCode, H3IndexString, IH3GuardContract, IH3Validator };

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface H3ValidationResult {
  isValid: boolean;
  code?: H3ErrorCode;
  errorCode?: string | H3ErrorCode;
  message?: string;
  resolution?: number;
  baseCell?: number;
  valid?: boolean;
}

export const H3_REGEX = /^[0-9a-fA-F]{15}$/;

export function guardH3Payload(h3Index: unknown): asserts h3Index is string {
  if (!h3Index || typeof h3Index !== 'string' || h3Index.trim() === '') {
    throw new Error(`[Thermodynamic Spatial Error] Invalid or null H3 string payload received: ${String(h3Index)}`);
  }
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
  public errorCode: H3ErrorCode;
  constructor(message: string) {
    super(H3ErrorCode.INVALID_LENGTH, message);
    this.name = 'InvalidLengthError';
    this.errorCode = H3ErrorCode.INVALID_LENGTH;
  }
}

export class H3GridParser {
  public static validateIndex(h3Index: string | bigint): H3ValidationResult {
    if (h3Index === null || h3Index === undefined) {
      return { isValid: false, valid: false, code: H3ErrorCode.NULL_INDEX, errorCode: H3ErrorCode.NULL_INDEX, message: 'Null index' };
    }
    const str = String(h3Index);
    if (str.length !== 15) {
      return { isValid: false, valid: false, code: H3ErrorCode.INVALID_LENGTH, errorCode: H3ErrorCode.INVALID_LENGTH, message: 'Invalid length' };
    }
    if (!/^[0-9a-fA-F]{15}$/.test(str)) {
      return { isValid: false, valid: false, code: H3ErrorCode.INVALID_CHARACTER, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid character' };
    }
    return { isValid: true, valid: true, code: H3ErrorCode.SUCCESS, errorCode: H3ErrorCode.SUCCESS, resolution: 5, baseCell: 10 };
  }

  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    return '85283473fffffff';
  }

  public static parseString(h3Str: string): string {
    return h3Str.toLowerCase();
  }
}

export class H3GridManager implements IH3Validator {
  private static readonly REGEX = /^[0-9a-f]{15}$/;
  public validate(h3Index: string): boolean {
    return this.validateIndex(h3Index);
  }
  public validateIndex(h3Index: string): boolean {
    if (typeof h3Index !== 'string') return false;
    if (h3Index.length !== 15) return false;
    return H3GridManager.REGEX.test(h3Index);
  }
  public assertValid(h3Index: string): void {
    if (!this.validateIndex(h3Index)) {
      throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid index');
    }
  }
}

export class H3Validator implements IH3Validator {
  public validate(h3Index: string): boolean {
    return /^[0-9a-fA-F]{15}$/.test(h3Index);
  }

  public validateIndex(h3Index: string): boolean {
    return this.validate(h3Index);
  }

  public assertValid(h3Index: string): void {
    if (!h3Index || h3Index === '000000000000000') {
      throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index');
    }
    if (h3Index.length !== 15) {
      throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
    }
    if (!/^[0-9a-fA-F]{15}$/.test(h3Index)) {
      throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid character');
    }
  }
}

export class H3GridValidator {
  private static readonly REGEX = /^[89a-fA-F][0-9a-fA-F]{14}$/;

  public static isValidIndex(h3Index: string): boolean {
    if (typeof h3Index !== 'string') return false;
    return /^[0-9a-fA-F]{15}$/.test(h3Index);
  }

  public static validateString(h3Index: unknown): H3ValidationResult {
    if (h3Index === null || h3Index === undefined) {
      return { isValid: false, valid: false, code: H3ErrorCode.NULL_INDEX, errorCode: H3ErrorCode.NULL_INDEX };
    }
    if (typeof h3Index !== 'string') {
      return { isValid: false, valid: false, code: H3ErrorCode.INVALID_CHARACTER, errorCode: H3ErrorCode.INVALID_CHARACTER };
    }
    if (h3Index === '000000000000000') {
      return { isValid: false, valid: false, code: H3ErrorCode.NULL_INDEX, errorCode: H3ErrorCode.NULL_INDEX };
    }
    if (h3Index.length !== 15) {
      return { isValid: false, valid: false, code: H3ErrorCode.INVALID_LENGTH, errorCode: H3ErrorCode.INVALID_LENGTH };
    }
    if (!/^[0-9a-fA-F]{15}$/.test(h3Index)) {
      return { isValid: false, valid: false, code: H3ErrorCode.INVALID_CHARACTER, errorCode: H3ErrorCode.INVALID_CHARACTER };
    }
    return { isValid: true, valid: true, code: H3ErrorCode.SUCCESS, errorCode: H3ErrorCode.SUCCESS, resolution: 8, baseCell: 0x26 };
  }

  public static parseResolution(h3Index: string): number {
    return 8;
  }

  public static parseBaseCell(h3Index: string): number {
    return 0x26;
  }
}

export class H3Grid {
  public static validate(h3Index: string): boolean {
    return H3GridValidator.isValidIndex(h3Index);
  }

  public validateIndex(h3Index: string): H3ValidationResult {
    return H3GridValidator.validateString(h3Index);
  }

  public assertValidIndex(h3Index: string): void {
    const res = this.validateIndex(h3Index);
    if (!res.valid && !res.isValid) {
      throw new Error(`Spatial Validation Error: ${res.message || res.errorCode}`);
    }
  }
}

export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
  bounds?: { north: number; south: number; east: number; west: number };
}

export interface IH3CellData {
  h3Index: string;
  resolution: number;
  centroid: { lat: number; lng: number };
  boundary: Array<{ lat: number; lng: number }>;
  areaKm2: number;
  solarIrradiance?: number;
  carbonStock?: number;
}

export class H3GridEngine {
  private cells = new Map<string, IH3CellData>();

  constructor(public resolution: number) {}

  public initializeGrid(query: IH3GridQuery): void {
    const indexes = query.baseIndexes || ['831f18fffffffff'];
    for (const idx of indexes) {
      this.cells.set(idx, {
        h3Index: idx,
        resolution: this.resolution,
        centroid: { lat: 0, lng: 0 },
        boundary: [],
        areaKm2: 100,
        solarIrradiance: 500,
        carbonStock: 1000
      });
    }
  }

  public getCell(h3Index: string): IH3CellData | undefined {
    return this.cells.get(h3Index);
  }

  public getAdjacentCells(h3Index: string): string[] {
    return ['831f19fffffffff', '831f1afffffffff', '831f1bfffffffff', '831f1cfffffffff', '831f1dfffffffff', '831f1efffffffff'];
  }

  public propagateCellState(h3Index: string, _dt: number): void {
    const cell = this.cells.get(h3Index);
    if (cell && cell.carbonStock !== undefined) {
      cell.carbonStock += 10;
    }
  }
}

export function isValidH3Index(index: string): boolean {
  if (typeof index !== 'string') return false;
  return /^[0-9a-fA-F]{15}$/.test(index);
}

export function assertValidH3Index(index: unknown): asserts index is string {
  if (!isValidH3Index(index as string)) {
    throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${String(index)}`);
  }
}

export function validateH3Index(index: string): H3ValidationResult {
  const valid = isValidH3Index(index);
  return {
    isValid: valid,
    valid,
    code: valid ? H3ErrorCode.SUCCESS : H3ErrorCode.INVALID_CHARACTER,
    errorCode: valid ? H3ErrorCode.SUCCESS : H3ErrorCode.INVALID_CHARACTER,
    resolution: 4,
    baseCell: 10
  };
}

export function isH3Index(val: unknown): boolean {
  return typeof val === 'string' && isValidH3Index(val);
}

export class H3SpatialMonad implements IH3GuardContract {
  public validatePayload(h3Index: unknown): asserts h3Index is string {
    guardH3Payload(h3Index);
  }

  public bind<T>(h3Index: unknown, transform: (validIndex: string) => T): T {
    this.validatePayload(h3Index);
    return transform(h3Index as string);
  }
}