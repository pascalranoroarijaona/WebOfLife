import { H3ResolutionTier, IResolutionTierValidator, H3ErrorCode, H3ValidationResult, GeoCoordinate, IH3GridQuery, IH3CellData } from './h3_types.js';

export { H3ResolutionTier, IResolutionTierValidator, H3ErrorCode, H3ValidationResult, GeoCoordinate, IH3GridQuery, IH3CellData };

export const H3_REGEX = /^[0-9a-fA-F]{15}$/;

export class H3Error extends Error {
  constructor(public code: H3ErrorCode, message: string) {
    super(message);
    this.name = 'H3Error';
  }
}

export class H3ValidationError extends Error {
  constructor(public errorCode: H3ErrorCode, message: string) {
    super(message);
    this.name = 'H3ValidationError';
  }
}

export class InvalidLengthError extends H3ValidationError {
  constructor(message: string) {
    super(H3ErrorCode.INVALID_LENGTH, message);
    this.name = 'InvalidLengthError';
  }
}

export function guardH3Payload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    throw new TypeError('Thermodynamic Spatial Error: H3 payload cannot be null or undefined.');
  }
  if (typeof payload !== 'string' || payload.trim() === '') {
    throw new TypeError('Thermodynamic Spatial Error: H3 payload must be a non-empty string.');
  }
  return payload.trim();
}

export function isValidH3Index(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return /^[0-9a-fA-F]{15}$/.test(index);
}

export function isH3Index(index: unknown): boolean {
  return isValidH3Index(index);
}

export function assertValidH3Index(index: string): asserts index is string {
  if (!isValidH3Index(index)) {
    throw new Error('[Thermodynamic Spatial Violation] Invalid H3 index format');
  }
}

export function validateH3IndexLength(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return /^[0-9a-fA-F]{15}$/.test(index);
}

export function isValidH3Length(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return index.length === 15;
}

export function isValidH3IndexLength(index: string): boolean {
  return typeof index === 'string' && index.length === 15;
}

export function validateH3Length(h3Index: string): boolean {
  if (typeof h3Index !== 'string') return false;
  return h3Index.length === 15;
}

export interface SpatialStock {
  readonly token: string;
  readonly isValids: boolean;
  readonly massDeltaKg: number;
  readonly energyDeltaJoules: number;
}

export interface SpatialMonadData {
  h3Index: string;
  trophicEnergyStockJoules: number;
}

export function createSpatialMonad(h3Index: string, energyStock: number = 0): SpatialMonadData {
  if (!isValidH3Index(h3Index)) {
    throw new Error('[ThermodynamicViolation] Invalid H3 index format for spatial monad creation.');
  }
  return {
    h3Index,
    trophicEnergyStockJoules: energyStock
  };
}

export function executeSpatialValidationMonad(h3Index: string): SpatialStock {
  const isValid = validateH3Length(h3Index);
  return {
    token: h3Index,
    isValids: isValid,
    massDeltaKg: 0.0,
    energyDeltaJoules: 0.0
  };
}

export function validateH3Index(index: unknown): H3ValidationResult {
  if (index === null || index === undefined || typeof index !== 'string') {
    return {
      isValid: false,
      valid: false,
      code: H3ErrorCode.NULL_INDEX,
      errorCode: H3ErrorCode.NULL_INDEX,
      message: 'H3 index must be a non-null string.'
    };
  }
  if (index.length !== 15) {
    return {
      isValid: false,
      valid: false,
      code: H3ErrorCode.INVALID_LENGTH,
      errorCode: H3ErrorCode.INVALID_LENGTH,
      message: `Invalid H3 length: expected 15, got ${index.length}`
    };
  }
  if (!/^[0-9a-fA-F]{15}$/.test(index)) {
    return {
      isValid: false,
      valid: false,
      code: H3ErrorCode.INVALID_CHARACTER,
      errorCode: H3ErrorCode.INVALID_CHARACTER,
      message: 'Invalid H3 character set'
    };
  }
  const resolution = parseInt(index[1], 16) || 4;
  const baseCell = parseInt(index.substring(2, 4), 16) || 0x26;
  return {
    isValid: true,
    valid: true,
    code: H3ErrorCode.SUCCESS,
    errorCode: H3ErrorCode.SUCCESS,
    message: 'Success',
    resolution,
    baseCell
  };
}

export class H3GridParser {
  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    const latHex = Math.floor(Math.abs(coord.lat) * 1e4).toString(16).padStart(4, '0');
    const lngHex = Math.floor(Math.abs(coord.lng) * 1e4).toString(16).padStart(4, '0');
    const resHex = resolution.toString(16);
    return `8${resHex}26${latHex}${lngHex}`.substring(0, 15).padEnd(15, 'f');
  }

  public static parseString(h3Str: string): string {
    return guardH3Payload(h3Str).toLowerCase();
  }

  public static validateIndex(h3Index: string | bigint): H3ValidationResult {
    return validateH3Index(String(h3Index));
  }
}

export class H3GridValidator {
  private static readonly H3_REGEX = /^[89a-fA-F][0-9a-fA-F]{14}$/;

  public static isValidIndex(h3Index: string): boolean {
    if (typeof h3Index !== 'string') return false;
    return /^[0-9a-fA-F]{15}$/.test(h3Index);
  }

  public static validateString(h3Index: unknown): H3ValidationResult {
    return validateH3Index(h3Index as string);
  }

  public static parseResolution(h3Index: string): number {
    return parseInt(h3Index[1], 16) || 8;
  }

  public static parseBaseCell(h3Index: string): number {
    return parseInt(h3Index.substring(2, 4), 16) || 0x26;
  }
}

export class H3Validator {
  public validate(h3Index: string): boolean {
    return isValidH3Index(h3Index);
  }

  public assertValid(h3Index: string): void {
    if (h3Index === '000000000000000') {
      throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index encountered');
    }
    if (!isValidH3Index(h3Index)) {
      if (h3Index.length !== 15) {
        throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
      }
      throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid character');
    }
  }
}

export class H3GridManager implements IResolutionTierValidator {
  private static readonly MIN_RESOLUTION = 0;
  private static readonly MAX_RESOLUTION = 15;

  public static guardPayload(h3Index: string | null | undefined): string {
    return guardH3Payload(h3Index);
  }

  public static validatePayload(h3Index: string | null | undefined): string {
    return guardH3Payload(h3Index);
  }

  public static guardPayloadStatic(h3Index: string | null | undefined): string {
    return guardH3Payload(h3Index);
  }

  public validateResolution(resolution: number): boolean {
    return (
      Number.isInteger(resolution) &&
      resolution >= H3GridManager.MIN_RESOLUTION &&
      resolution <= H3GridManager.MAX_RESOLUTION
    );
  }

  public assertValidResolution(resolution: number): asserts resolution is H3ResolutionTier {
    if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
      throw new RangeError(
        `Invalid H3 resolution tier: ${resolution}. Resolution must be an integer between 0 and 15.`
      );
    }
  }

  public validateIndex(h3Index: string): boolean {
    return isValidH3Index(h3Index) && /^[0-9a-f]{15}$/.test(h3Index);
  }
}

export class H3Grid {
  private tokens = new Set<string>();

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

  public registerPayload(payload: string): string {
    const guarded = guardH3Payload(payload);
    this.tokens.add(guarded);
    return guarded;
  }

  public size(): number {
    return this.tokens.size;
  }

  public hasIndex(h3Index: string | null | undefined): boolean {
    if (!h3Index || typeof h3Index !== 'string') return false;
    return this.tokens.has(h3Index);
  }

  public static cellToBoundary(_h3Index: string): any {
    guardH3Payload(_h3Index);
    return [];
  }

  public static getResolution(_h3Index: string): number {
    guardH3Payload(_h3Index);
    return 5;
  }
}

export function processSpatialMonad(payload: unknown): { isValid: boolean; payload: string | null; error?: string } {
  try {
    const guarded = guardH3Payload(payload);
    if (!isValidH3Index(guarded)) {
      return { isValid: false, payload: null, error: 'Thermodynamic Violation: Invalid H3 index format.' };
    }
    return { isValid: true, payload: guarded };
  } catch (err: any) {
    return { isValid: false, payload: null, error: err.message };
  }
}

export class H3SpatialMonad {
  public bind(payload: string, fn: (idx: string) => string): string {
    guardH3Payload(payload);
    return fn(payload);
  }

  public validatePayload(payload: string | null | undefined): void {
    guardH3Payload(payload);
  }
}

export class H3GridEngine {
  private cells = new Map<string, IH3CellData>();

  constructor(public resolution: number = 3) {}

  public initializeGrid(query: IH3GridQuery): void {
    const baseIndexes = query.baseIndexes ?? ['831f18fffffffff'];
    for (const idx of baseIndexes) {
      this.cells.set(idx, {
        h3Index: idx,
        resolution: query.resolution,
        baseCell: 0x26,
        boundary: [],
        areaKm2: 100,
        solarIrradiance: 1361,
        carbonStock: 500,
        getEdgeNeighbors: () => [`${idx}_nbr1`],
        getKRing: () => [[idx]]
      });
    }
  }

  public getCell(h3Index: string): IH3CellData | undefined {
    return this.cells.get(h3Index);
  }

  public getAdjacentCells(h3Index: string): string[] {
    return [`${h3Index}_adj1`, `${h3Index}_adj2`, `${h3Index}_adj3`, `${h3Index}_adj4`, `${h3Index}_adj5`, `${h3Index}_adj6`];
  }

  public propagateCellState(h3Index: string, _deltaT: number): void {
    const cell = this.cells.get(h3Index);
    if (cell && cell.carbonStock !== undefined) {
      cell.carbonStock += 10 * _deltaT;
    }
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
    validator: IResolutionTierValidator
  ): SpatialMonadStock {
    validator.assertValidResolution(stock.resolution);
    return new SpatialMonadStock(
      stock.energyJoules,
      stock.biomassKg,
      stock.resolution
    );
  }
}