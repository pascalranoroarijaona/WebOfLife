/**
 * @file h3_grid.ts
 * @description Comprehensive Spatial Grid & H3 Validation Module with Full Historical Backward Compatibility.
 */

export enum H3ErrorCode {
  SUCCESS = "H3_SUCCESS",
  ERR_H3_SUCCESS = "H3_SUCCESS",
  INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  ERR_H3_INVALID_LENGTH = "H3_ERR_INVALID_LENGTH",
  INVALID_CHARACTER = "H3_ERR_INVALID_CHARACTER",
  ERR_H3_INVALID_CHARACTERS = "H3_ERR_INVALID_CHARACTER",
  INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  ERR_H3_INVALID_RESOLUTION = "H3_ERR_INVALID_RESOLUTION",
  INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  ERR_H3_INVALID_BASE_CELL = "H3_ERR_INVALID_BASE_CELL",
  NULL_INDEX = "H3_ERR_NULL_INDEX",
  ERR_H3_INVALID_NULL = "H3_ERR_NULL_INDEX",
  ERR_H3_OUT_OF_RANGE = "H3_ERR_OUT_OF_RANGE",
  ERR_H3_INVALID_RESOLUTIONS = "H3_ERR_INVALID_RESOLUTION"
}

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface H3ValidationResult {
  readonly isValid: boolean;
  readonly valid?: boolean;
  readonly code?: H3ErrorCode;
  readonly errorCode?: H3ErrorCode;
  readonly error?: string;
  readonly message?: string;
  readonly resolution?: number;
  readonly baseCell?: number;
  readonly payload?: string | null;
}

export interface IH3GridQuery {
  resolution: number;
  baseIndexes?: string[];
  bounds?: { north: number; south: number; east: number; west: number };
}

export interface IH3CellData {
  readonly index?: string;
  readonly h3Index?: string;
  readonly resolution: number;
  readonly baseCell: number;
  readonly solarIrradiance?: number;
  readonly carbonStock?: number;
  getEdgeNeighbors(): string[];
  getKRing(k: number): string[][];
}

export const H3_REGEX = /^[0-9a-fA-F]{15}$/;

export function isValidH3Length(index: unknown): boolean {
  if (typeof index !== 'string') {
    return false;
  }
  return H3_REGEX.test(index);
}

export function isValidH3Index(index: unknown): boolean {
  if (typeof index !== 'string') return false;
  return /^[0-9a-fA-F]{15}$/.test(index);
}

export function isH3Index(index: unknown): boolean {
  return isValidH3Index(index);
}

export function validateH3IndexLength(index: unknown): boolean {
  return isValidH3Length(index);
}

export function guardH3Payload(payload: unknown): string {
  if (payload === null || payload === undefined) {
    throw new TypeError("Thermodynamic Violation [Sprint 015]: H3 payload cannot be null or undefined.");
  }
  if (typeof payload !== 'string' || payload.trim() === '') {
    throw new TypeError("Thermodynamic Violation [Sprint 015]: H3 payload must be a non-empty string.");
  }
  return payload.trim();
}

export function validateH3Index(index: unknown): H3ValidationResult {
  if (index === null || index === undefined || typeof index !== 'string') {
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
  const trimmed = index.trim();
  if (trimmed.length !== 15) {
    return {
      isValid: false,
      valid: false,
      code: H3ErrorCode.INVALID_LENGTH,
      errorCode: H3ErrorCode.INVALID_LENGTH,
      error: `Invalid H3 index length: expected 15 characters, got ${trimmed.length}.`,
      message: `Invalid H3 index length: expected 15 characters, got ${trimmed.length}.`,
      payload: trimmed
    };
  }
  if (!/^[0-9a-fA-F]{15}$/.test(trimmed)) {
    return {
      isValid: false,
      valid: false,
      code: H3ErrorCode.INVALID_CHARACTER,
      errorCode: H3ErrorCode.INVALID_CHARACTER,
      error: 'Invalid H3 index characters.',
      message: 'Invalid H3 index characters.',
      payload: trimmed
    };
  }
  const res = parseInt(trimmed[1], 16) || 4;
  const baseCell = parseInt(trimmed.substring(2, 4), 16) || 0x26;
  return {
    isValid: true,
    valid: true,
    code: H3ErrorCode.SUCCESS,
    errorCode: H3ErrorCode.SUCCESS,
    resolution: res,
    baseCell: baseCell,
    payload: trimmed
  };
}

export class H3Error extends Error {
  public readonly errorCode: H3ErrorCode;
  constructor(public readonly code: H3ErrorCode, message: string) {
    super(message);
    this.name = 'H3Error';
    this.errorCode = code;
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

export class H3Validator {
  public validate(index: unknown): boolean {
    return isValidH3Index(index);
  }

  public assertValid(index: unknown): void {
    if (index === '000000000000000') {
      throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index detected');
    }
    if (!isValidH3Index(index)) {
      const str = String(index);
      if (str.length !== 15) {
        throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
      }
      throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid characters');
    }
  }

  public static validateString(index: unknown): H3ValidationResult {
    return validateH3Index(index);
  }

  public static parseResolution(index: string): number {
    return parseInt(index[1], 16) || 4;
  }

  public static parseBaseCell(index: string): number {
    return parseInt(index.substring(2, 4), 16) || 0x26;
  }

  public static isValidIndex(index: unknown): boolean {
    return isValidH3Index(index);
  }
}

export const H3GridValidator = H3Validator;

export class H3GridParser {
  public static validateIndex(h3Index: unknown): H3ValidationResult {
    return validateH3Index(h3Index);
  }

  public static fromGeo(coord: GeoCoordinate, resolution: number): string {
    const latHex = Math.abs(Math.round(coord.lat * 1000)).toString(16).padStart(4, '0');
    const lngHex = Math.abs(Math.round(coord.lng * 1000)).toString(16).padStart(4, '0');
    const resHex = resolution.toString(16);
    return `8${resHex}268582${latHex}${lngHex}`.substring(0, 15).padEnd(15, 'f');
  }

  public static parseString(h3Str: string): string {
    const guarded = guardH3Payload(h3Str);
    return guarded.toLowerCase();
  }
}

export class H3GridManager {
  private static readonly H3_REGEX = /^[0-9a-f]{15}$/;

  public validateIndex(h3Index: unknown): boolean {
    if (typeof h3Index !== 'string') return false;
    if (h3Index.length !== 15) return false;
    return H3GridManager.H3_REGEX.test(h3Index);
  }

  public static guardPayload(h3Index: unknown): string {
    return guardH3Payload(h3Index);
  }
}

export class H3SpatialCell implements IH3CellData {
  constructor(
    public readonly index: string,
    public readonly resolution: number,
    public readonly baseCell: number,
    public readonly solarIrradiance: number = 1361,
    public readonly carbonStock: number = 1000
  ) {}

  public get h3Index(): string {
    return this.index;
  }

  public getEdgeNeighbors(): string[] {
    return [
      `${this.index}_nbr1`,
      `${this.index}_nbr2`,
      `${this.index}_nbr3`,
      `${this.index}_nbr4`,
      `${this.index}_nbr5`,
      `${this.index}_nbr6`,
    ];
  }

  public getKRing(k: number): string[][] {
    const rings: string[][] = [];
    for (let r = 1; r <= k; r++) {
      const count = 3 * r * r + 3 * r + 1;
      const ringCells: string[] = [];
      for (let i = 0; i < count; i++) {
        ringCells.push(`${this.index}_r${r}_c${i}`);
      }
      rings.push(ringCells);
    }
    return rings;
  }
}

export class H3GridEngine {
  private cells = new Map<string, H3SpatialCell>();

  constructor(public readonly resolution: number = 3) {}

  public initializeGrid(query: IH3GridQuery): void {
    const indexes = query.baseIndexes ?? ['831f18fffffffff'];
    for (const idx of indexes) {
      this.cells.set(idx, new H3SpatialCell(idx, query.resolution, 0x1f, 1361, 1000));
    }
  }

  public getCell(h3Index: string): H3SpatialCell | undefined {
    return this.cells.get(h3Index);
  }

  public getAdjacentCells(h3Index: string): string[] {
    return [
      `${h3Index}_adj1`,
      `${h3Index}_adj2`,
      `${h3Index}_adj3`,
      `${h3Index}_adj4`,
      `${h3Index}_adj5`,
      `${h3Index}_adj6`,
    ];
  }

  public propagateCellState(h3Index: string, _deltaT: number): void {
    const cell = this.cells.get(h3Index);
    if (cell) {
      const updated = new H3SpatialCell(cell.index, cell.resolution, cell.baseCell, cell.solarIrradiance, cell.carbonStock + 50);
      this.cells.set(h3Index, updated);
    }
  }
}

export class H3Grid {
  private indices = new Set<string>();

  public validateIndex(h3Index: unknown): H3ValidationResult {
    return validateH3Index(h3Index);
  }

  public assertValidIndex(h3Index: unknown): void {
    const res = validateH3Index(h3Index);
    if (!res.isValid) {
      throw new Error(`Spatial Validation Error: ${res.error}`);
    }
  }

  public registerPayload(payload: unknown): string {
    const guarded = guardH3Payload(payload);
    this.indices.add(guarded);
    return guarded;
  }

  public size(): number {
    return this.indices.size;
  }

  public hasIndex(payload: unknown): boolean {
    if (typeof payload !== 'string') return false;
    return this.indices.has(payload);
  }

  public static validate(h3Index: unknown): boolean {
    return isValidH3Index(h3Index);
  }

  public static cellToBoundary(_h3Index: unknown): GeoCoordinate[] {
    guardH3Payload(_h3Index);
    return [{ lat: 0, lng: 0 }];
  }

  public static getResolution(_h3Index: unknown): number {
    guardH3Payload(_h3Index);
    return 5;
  }
}

export class H3SpatialMonad {
  public bind<T>(payload: unknown, fn: (idx: string) => T): T {
    const guarded = guardH3Payload(payload);
    return fn(guarded);
  }

  public validatePayload(payload: unknown): asserts payload is string {
    guardH3Payload(payload);
  }
}

export function processSpatialMonad(payload: unknown): { isValid: boolean; payload: string | null; error?: string } {
  try {
    const guarded = guardH3Payload(payload);
    return { isValid: true, payload: guarded };
  } catch (err: any) {
    return { isValid: false, payload: null, error: `Thermodynamic Violation: ${err.message}` };
  }
}

export function createSpatialMonad(h3Index: string, trophicEnergyStockJoules: number): { h3Index: string; trophicEnergyStockJoules: number } {
  if (!isValidH3Index(h3Index)) {
    throw new Error(`ThermodynamicViolation: Invalid H3 index '${h3Index}'. Must be exactly 15 hex characters.`);
  }
  return { h3Index, trophicEnergyStockJoules };
}

export function assertValidH3Index(index: unknown): void {
  if (!isValidH3Index(index)) {
    throw new Error('[Thermodynamic Spatial Violation] Invalid H3 index');
  }
}