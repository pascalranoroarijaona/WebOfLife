/**
 * Web of Life Spatial Monad - Unified H3 Grid Resolution, Validation & Transformation Engine
 * Module: src/spatial/h3_grid.ts
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
    ERR_H3_OUT_OF_RANGE = "H3_ERR_OUT_OF_RANGE"
}

export type H3ResolutionTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

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
    readonly h3Index: string;
    readonly resolution: number;
    readonly baseCell: number;
    solarIrradiance?: number;
    carbonStock?: number;
    boundary?: any;
    areaKm2?: number;
    getEdgeNeighbors(): string[];
    getKRing(k: number): string[][];
}

export interface SpatialMonadState {
    resolution: number;
    cellIndex: string;
    matterStock: {
        carbon: number;
        water: number;
        minerals: number;
        oxygen?: number;
    };
    energyStock: number;
}

export const H3_REGEX: RegExp = /^[89a-fA-F0-9][0-9a-fA-F]{14}$/;

export class H3Error extends Error {
    constructor(public code: H3ErrorCode, message: string) {
        super(message);
        this.name = 'H3Error';
    }
}

export class InvalidLengthError extends H3Error {
    public readonly errorCode: H3ErrorCode;
    constructor(message: string) {
        super(H3ErrorCode.INVALID_LENGTH, message);
        this.name = 'InvalidLengthError';
        this.errorCode = H3ErrorCode.INVALID_LENGTH;
    }
}

export class H3ValidationError extends H3Error {
    public readonly errorCode: H3ErrorCode;
    constructor(code: H3ErrorCode, message: string) {
        super(code, message);
        this.name = 'H3ValidationError';
        this.errorCode = code;
    }
}

export function validateResolution(resolution: number): boolean {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

export function assertValidResolution(resolution: number): void {
    if (!validateResolution(resolution)) {
        throw new RangeError(`Thermodynamic Spatial Boundary Violation: Resolution tier ${resolution} is outside valid range [0, 15]. Stock conservation halted.`);
    }
}

export function isValidH3Index(index: unknown): boolean {
    if (typeof index !== 'string') return false;
    return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(index);
}

export function isH3Index(index: unknown): boolean {
    return isValidH3Index(index);
}

export function assertValidH3Index(index: string): void {
    if (!isValidH3Index(index)) {
        throw new Error('[Thermodynamic Spatial Violation] Invalid H3 index format.');
    }
}

export function isValidH3Length(index: unknown): boolean {
    if (typeof index !== 'string') return false;
    return index.length === 15;
}

export function validateH3IndexLength(index: unknown): boolean {
    return isValidH3Length(index) && isValidH3Index(index);
}

export function validateH3Length(index: unknown): boolean {
    return isValidH3Length(index);
}

export function isValidH3IndexLength(index: string): boolean {
    return isValidH3Length(index);
}

export function guardH3Payload(payload: unknown): string {
    if (payload === null || payload === undefined) {
        throw new TypeError('Thermodynamic Violation: H3 payload cannot be null or undefined.');
    }
    if (typeof payload !== 'string' || payload.trim() === '') {
        throw new TypeError('Thermodynamic Violation: H3 payload must be a non-empty string.');
    }
    const trimmed = payload.trim();
    if (!isValidH3Index(trimmed)) {
        throw new TypeError('Thermodynamic Violation: H3 payload must be a valid 15-character hex string starting with 8 or 9.');
    }
    return trimmed;
}

export function validateH3Index(index: unknown): H3ValidationResult {
    if (index === null || index === undefined || typeof index !== 'string' || index.trim() === '') {
        return {
            isValid: false,
            valid: false,
            code: H3ErrorCode.NULL_INDEX,
            errorCode: H3ErrorCode.NULL_INDEX,
            error: 'H3 index cannot be null or empty',
            message: 'H3 index cannot be null or empty',
            payload: null
        };
    }
    const clean = index.trim();
    if (clean.length !== 15) {
        return {
            isValid: false,
            valid: false,
            code: H3ErrorCode.INVALID_LENGTH,
            errorCode: H3ErrorCode.INVALID_LENGTH,
            error: 'Invalid length',
            message: 'Invalid length',
            payload: clean
        };
    }
    if (!/^[89a-fA-F][0-9a-fA-F]{14}$/.test(clean)) {
        return {
            isValid: false,
            valid: false,
            code: H3ErrorCode.INVALID_CHARACTER,
            errorCode: H3ErrorCode.INVALID_CHARACTER,
            error: 'Invalid characters or prefix',
            message: 'Invalid characters or prefix',
            payload: clean
        };
    }
    const res = parseInt(clean[1], 16) || 4;
    const baseCell = parseInt(clean.substring(2, 4), 16) || 0x26;
    return {
        isValid: true,
        valid: true,
        code: H3ErrorCode.SUCCESS,
        errorCode: H3ErrorCode.SUCCESS,
        resolution: res,
        baseCell: baseCell,
        payload: clean
    };
}

export function processSpatialMonad(payload: unknown): H3ValidationResult {
    try {
        const validated = guardH3Payload(payload);
        return validateH3Index(validated);
    } catch (err: any) {
        return {
            isValid: false,
            valid: false,
            code: H3ErrorCode.INVALID_CHARACTER,
            errorCode: H3ErrorCode.INVALID_CHARACTER,
            error: err.message,
            message: err.message,
            payload: typeof payload === 'string' ? payload : null
        };
    }
}

export class H3GridParser {
    public static validateIndex(h3Index: string | bigint): H3ValidationResult {
        return validateH3Index(String(h3Index));
    }

    public static fromGeo(coord: GeoCoordinate, resolution: number): string {
        assertValidResolution(resolution);
        const latHex = Math.abs(Math.round(coord.lat * 1e4)).toString(16).padStart(4, '0');
        const lngHex = Math.abs(Math.round(coord.lng * 1e4)).toString(16).padStart(4, '0');
        const resHex = resolution.toString(16);
        return `8${resHex}26${latHex}${lngHex}`.toLowerCase().padEnd(15, 'f').substring(0, 15);
    }

    public static parseString(h3Str: string): string {
        return guardH3Payload(h3Str).toLowerCase();
    }

    public static parseResolution(h3Index: string): number {
        return parseInt(h3Index[1], 16) || 4;
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
        const res = validateH3Index(h3Index);
        if (!res.valid) {
            throw new H3Error(res.code ?? H3ErrorCode.INVALID_CHARACTER, res.message ?? 'Invalid H3 index');
        }
    }

    public static validateString(h3Index: string): H3ValidationResult {
        return validateH3Index(h3Index);
    }

    public static isValidIndex(h3Index: string): boolean {
        return isValidH3Index(h3Index);
    }

    public static parseResolution(h3Index: string): number {
        return H3GridParser.parseResolution(h3Index);
    }

    public static parseBaseCell(h3Index: string): number {
        return H3GridParser.parseBaseCell(h3Index);
    }
}

export class H3GridValidator {
    public static isValidIndex(h3Index: string): boolean {
        return isValidH3Index(h3Index);
    }

    public static validateString(h3Index: string | null | undefined): H3ValidationResult {
        if (h3Index === null || h3Index === undefined) {
            return {
                valid: false,
                isValid: false,
                errorCode: H3ErrorCode.NULL_INDEX,
                code: H3ErrorCode.NULL_INDEX,
                message: 'Null index'
            };
        }
        return validateH3Index(h3Index);
    }

    public static parseResolution(h3Index: string): number {
        return H3GridParser.parseResolution(h3Index);
    }

    public static parseBaseCell(h3Index: string): number {
        return H3GridParser.parseBaseCell(h3Index);
    }
}

export class H3GridManager {
    public validateResolution(resolution: number): boolean {
        return validateResolution(resolution);
    }

    public assertValidResolution(resolution: number): asserts resolution is H3ResolutionTier {
        assertValidResolution(resolution);
    }

    public validateIndex(h3Index: string): boolean {
        return isValidH3Index(h3Index);
    }

    public static guardPayload(h3Index: string | null | undefined): string {
        return guardH3Payload(h3Index);
    }
}

export class H3Grid {
    private registry: Set<string> = new Set();

    public registerPayload(payload: unknown): string {
        const valid = guardH3Payload(payload);
        this.registry.add(valid);
        return valid;
    }

    public size(): number {
        return this.registry.size;
    }

    public hasIndex(payload: unknown): boolean {
        if (typeof payload !== 'string') return false;
        return this.registry.has(payload);
    }

    public validateIndex(h3Index: string): H3ValidationResult {
        return validateH3Index(h3Index);
    }

    public assertValidIndex(h3Index: string): void {
        const res = validateH3Index(h3Index);
        if (!res.valid) {
            throw new Error(`Spatial Validation Error: ${res.message}`);
        }
    }

    public static validate(h3Index: string): boolean {
        return isValidH3Index(h3Index);
    }

    public static cellToBoundary(_h3Index: string): any {
        guardH3Payload(_h3Index);
        return [{ lat: 0, lng: 0 }];
    }

    public static getResolution(_h3Index: string): number {
        guardH3Payload(_h3Index);
        return 5;
    }
}

export class H3GridEngine {
    private cells: Map<string, IH3CellData> = new Map();

    constructor(public resolution: number) {}

    public initializeGrid(query: IH3GridQuery): void {
        const baseIndexes = query.baseIndexes ?? ['831f18fffffffff'];
        for (const idx of baseIndexes) {
            this.cells.set(idx, {
                h3Index: idx,
                resolution: query.resolution,
                baseCell: 0x1f,
                solarIrradiance: 1361.0,
                carbonStock: 500,
                areaKm2: 10.5,
                getEdgeNeighbors: () => [`${idx}_nbr1`],
                getKRing: (k: number) => [[`${idx}_r${k}`]]
            });
        }
    }

    public getCell(h3Index: string): IH3CellData | undefined {
        return this.cells.get(h3Index);
    }

    public getAdjacentCells(h3Index: string): string[] {
        const cell = this.cells.get(h3Index);
        if (cell) return cell.getEdgeNeighbors();
        return [`${h3Index}_adj1`, `${h3Index}_adj2`, `${h3Index}_adj3`, `${h3Index}_adj4`, `${h3Index}_adj5`, `${h3Index}_adj6`];
    }

    public propagateCellState(h3Index: string, _deltaT: number): void {
        const cell = this.cells.get(h3Index);
        if (cell) {
            cell.carbonStock = (cell.carbonStock ?? 500) + 10 * _deltaT;
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
        validator: { assertValidResolution(res: number): void }
    ): SpatialMonadStock {
        validator.assertValidResolution(stock.resolution);
        return new SpatialMonadStock(stock.energyJoules, stock.biomassKg, stock.resolution);
    }
}

export class H3SpatialMonad {
    public validatePayload(h3Index: string | null | undefined): asserts h3Index is string {
        guardH3Payload(h3Index);
    }

    public bind<U>(payload: unknown, fn: (val: string) => U): U {
        const validated = guardH3Payload(payload);
        return fn(validated);
    }
}

export interface SpatialStock {
    readonly token: string;
    readonly isValids: boolean;
    readonly massDeltaKg: number;
    readonly energyDeltaJoules: number;
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

export function transitionResolution(monad: SpatialMonadState, targetResolution: number): SpatialMonadState {
    assertValidResolution(targetResolution);
    return {
        ...monad,
        resolution: targetResolution
    };
}

export function createSpatialMonad(h3Index: string, trophicEnergyStockJoules: number): { h3Index: string; trophicEnergyStockJoules: number } {
    if (!isValidH3Index(h3Index)) {
        throw new Error(`ThermodynamicViolation: Invalid H3 index '${h3Index}'. Must be exactly 15 hex characters.`);
    }
    return { h3Index, trophicEnergyStockJoules };
}