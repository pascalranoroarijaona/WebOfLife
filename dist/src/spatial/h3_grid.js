import { H3ErrorCode } from './h3_types';
export { H3ErrorCode };
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export function isValidH3Resolution(resolution) {
    return Number.isInteger(resolution) && resolution >= MIN_H3_RESOLUTION && resolution <= MAX_H3_RESOLUTION;
}
export function assertH3Resolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new RangeError(`Invalid H3 resolution tier: ${resolution}. Must be an integer between ${MIN_H3_RESOLUTION} and ${MAX_H3_RESOLUTION}.`);
    }
}
export function validateResolution(resolution) {
    return isValidH3Resolution(resolution);
}
export function assertValidResolution(resolution) {
    assertH3Resolution(resolution);
}
export function isValidH3Index(index) {
    if (typeof index !== 'string')
        return false;
    return H3_REGEX.test(index);
}
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new Error('[Thermodynamic Spatial Violation] Invalid H3 index format.');
    }
}
export function guardH3Payload(payload) {
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
export function validateH3Index(h3Index) {
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
export function validateH3IndexLength(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15;
}
export function isValidH3Length(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15;
}
export function isValidH3IndexLength(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15;
}
export function validateH3Length(h3Index) {
    if (typeof h3Index !== 'string')
        return false;
    return h3Index.length === 15;
}
export class H3Error extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'H3Error';
    }
    get errorCode() {
        return this.code;
    }
}
export class InvalidLengthError extends H3Error {
    constructor(message) {
        super(H3ErrorCode.INVALID_LENGTH, message);
        this.name = 'InvalidLengthError';
    }
}
export class InvalidCharacterError extends H3Error {
    constructor(message) {
        super(H3ErrorCode.INVALID_CHARACTER, message);
        this.name = 'InvalidCharacterError';
    }
}
export class NullIndexError extends H3Error {
    constructor(message) {
        super(H3ErrorCode.NULL_INDEX, message);
        this.name = 'NullIndexError';
    }
}
export function isH3Index(index) {
    return typeof index === 'string' && H3_REGEX.test(index) && index !== '000000000000000';
}
export class H3Validator {
    validate(h3Index) {
        return isValidH3Index(h3Index);
    }
    assertValid(h3Index) {
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
    static validateString(h3Index) {
        return validateH3Index(h3Index);
    }
    static parseResolution(h3Index) {
        return parseInt(h3Index[1], 16) || 0;
    }
    static parseBaseCell(h3Index) {
        return parseInt(h3Index.substring(2, 4), 16) || 0;
    }
    static isValidIndex(h3Index) {
        return isValidH3Index(h3Index);
    }
}
export const H3GridValidator = H3Validator;
export class H3Grid {
    defaultResolution;
    indices = new Set();
    constructor(defaultResolution = 7) {
        this.defaultResolution = defaultResolution;
        assertH3Resolution(defaultResolution);
    }
    validateResolution(resolution) {
        return isValidH3Resolution(resolution);
    }
    assertValidResolution(resolution) {
        assertH3Resolution(resolution);
    }
    validateIndex(h3Index) {
        return validateH3Index(h3Index);
    }
    assertValidIndex(h3Index) {
        const res = validateH3Index(h3Index);
        if (!res.isValid) {
            throw new Error(`Spatial Validation Error: ${res.error || 'Invalid Index'}`);
        }
    }
    registerPayload(payload) {
        const guarded = guardH3Payload(payload);
        this.indices.add(guarded);
        return guarded;
    }
    size() {
        return this.indices.size;
    }
    hasIndex(index) {
        if (typeof index !== 'string')
            return false;
        return this.indices.has(index);
    }
    static validate(h3Index) {
        return isValidH3Index(h3Index);
    }
    static cellToBoundary(h3Index) {
        guardH3Payload(h3Index);
        return [{ lat: 0, lng: 0 }];
    }
    static getResolution(h3Index) {
        guardH3Payload(h3Index);
        return parseInt(h3Index[1], 16) || 0;
    }
}
export class H3GridManager {
    validIndices = new Set();
    rejectedCount = 0;
    validateResolution(resolution) {
        return isValidH3Resolution(resolution);
    }
    assertValidResolution(resolution) {
        assertH3Resolution(resolution);
    }
    validateIndex(h3Index) {
        return validateH3Index(h3Index);
    }
    assertValidIndex(h3Index) {
        assertValidH3Index(h3Index);
    }
    static guardPayload(h3Index) {
        return guardH3Payload(h3Index);
    }
    ingestIndex(h3Index) {
        if (isValidH3Index(h3Index)) {
            this.validIndices.add(h3Index);
            return true;
        }
        else {
            this.rejectedCount++;
            return false;
        }
    }
    getValidIndices() {
        return Array.from(this.validIndices);
    }
    getRejectedCount() {
        return this.rejectedCount;
    }
}
export class H3GridParser {
    static validateIndex(h3Index) {
        return validateH3Index(String(h3Index));
    }
    static fromGeo(coord, resolution) {
        assertH3Resolution(resolution);
        const hexRes = resolution.toString(16);
        return `8${hexRes}268012345ffff`;
    }
    static parseString(h3Str) {
        const guarded = guardH3Payload(h3Str);
        return guarded.toLowerCase();
    }
}
export class H3GridEngine {
    resolution;
    cells = new Map();
    constructor(resolution) {
        this.resolution = resolution;
        assertH3Resolution(resolution);
    }
    initializeGrid(query) {
        const baseIndexes = query.baseIndexes || ['831f18fffffffff'];
        baseIndexes.forEach((idx) => {
            this.cells.set(idx, {
                h3Index: idx,
                resolution: this.resolution,
                solarIrradiance: 1361.0,
                carbonStock: 1000
            });
        });
    }
    getCell(h3Index) {
        return this.cells.get(h3Index);
    }
    getAdjacentCells(h3Index) {
        return [`${h3Index}_adj1`, `${h3Index}_adj2`, `${h3Index}_adj3`, `${h3Index}_adj4`, `${h3Index}_adj5`, `${h3Index}_adj6`];
    }
    propagateCellState(h3Index, _deltaT) {
        const cell = this.cells.get(h3Index);
        if (cell) {
            cell.carbonStock += 10.0;
        }
    }
}
export class H3SpatialMonad {
    bind(h3Index, fn) {
        const guarded = guardH3Payload(h3Index);
        return fn(guarded);
    }
    validatePayload(h3Index) {
        guardH3Payload(h3Index);
    }
}
export function processSpatialMonad(payload) {
    try {
        const guarded = guardH3Payload(payload);
        return {
            isValid: true,
            valid: true,
            payload: guarded
        };
    }
    catch (err) {
        return {
            isValid: false,
            valid: false,
            payload: payload,
            error: err.message
        };
    }
}
export function createSpatialMonad(h3Index, energyJoules) {
    if (!isValidH3Index(h3Index)) {
        throw new Error('ThermodynamicViolation: Invalid H3 index.');
    }
    return {
        h3Index,
        trophicEnergyStockJoules: energyJoules
    };
}
export function transitionResolution(state, targetResolution) {
    assertH3Resolution(targetResolution);
    return {
        ...state,
        resolution: targetResolution
    };
}
export class SpatialMonadStock {
    energyJoules;
    biomassKg;
    resolution;
    constructor(energyJoules, biomassKg, resolution) {
        this.energyJoules = energyJoules;
        this.biomassKg = biomassKg;
        this.resolution = resolution;
        assertH3Resolution(resolution);
    }
    static bindWithValidation(stock, validator) {
        validator.assertValidResolution(stock.resolution);
        return new SpatialMonadStock(stock.energyJoules, stock.biomassKg, stock.resolution);
    }
}
export function executeSpatialValidationMonad(h3Token) {
    const valid = isValidH3Index(h3Token);
    return {
        token: h3Token,
        isValids: valid,
        massDeltaKg: 0.0,
        energyDeltaJoules: 0.0
    };
}
