import { latLngToCell, cellToBoundary, getResolution as h3GetResolution } from 'h3-js';
import { H3ErrorCode } from './h3_types';
export { H3ErrorCode };
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export function guardH3Payload(payload) {
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
export function isValidH3Index(payload) {
    if (typeof payload !== 'string')
        return false;
    return /^[0-9a-fA-F]{15}$/.test(payload);
}
export function validateH3Index(payload) {
    return H3GridValidator.validateString(payload);
}
export function assertValidH3Index(payload) {
    if (!isValidH3Index(payload)) {
        throw new Error('[Thermodynamic Spatial Violation] Invalid H3 Index');
    }
}
export class H3Error extends Error {
    code;
    errorCode;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'H3Error';
        this.errorCode = code;
    }
}
export const H3ValidationError = H3Error;
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
export class InvalidResolutionError extends H3Error {
    constructor(message) {
        super(H3ErrorCode.INVALID_RESOLUTION, message);
        this.name = 'InvalidResolutionError';
    }
}
export class InvalidBaseCellError extends H3Error {
    constructor(message) {
        super(H3ErrorCode.INVALID_BASE_CELL, message);
        this.name = 'InvalidBaseCellError';
    }
}
export function isH3Index(payload) {
    return isValidH3Index(payload);
}
export class H3GridParser {
    static validateIndex(payload) {
        try {
            guardH3Payload(payload);
            if (!/^[0-9a-fA-F]{15}$/.test(payload)) {
                return { isValid: false, valid: false, code: H3ErrorCode.INVALID_LENGTH, errorCode: H3ErrorCode.INVALID_LENGTH, error: `Invalid H3 index format: "${payload}"` };
            }
            return { isValid: true, valid: true, code: H3ErrorCode.SUCCESS, errorCode: H3ErrorCode.SUCCESS, resolution: parseInt(payload[1], 16) || 0, baseCell: parseInt(payload.substring(2, 4), 16) || 0 };
        }
        catch (err) {
            return {
                isValid: false,
                valid: false,
                code: H3ErrorCode.NULL_INDEX,
                errorCode: H3ErrorCode.NULL_INDEX,
                error: err instanceof Error ? err.message : 'Unknown validation error'
            };
        }
    }
    static fromGeo(coord, resolution) {
        return latLngToCell(coord.lat, coord.lng, resolution);
    }
    static parseString(h3Str) {
        guardH3Payload(h3Str);
        return h3Str.toLowerCase();
    }
}
export class H3GridValidator {
    static H3_REGEX = /^[89a-fA-F][0-9a-fA-F]{14}$/;
    static validateString(payload) {
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
    static parseResolution(h3Index) {
        return parseInt(h3Index[1], 16) || 0;
    }
    static parseBaseCell(h3Index) {
        return parseInt(h3Index.substring(2, 4), 16) || 0;
    }
    static isValidIndex(h3Index) {
        if (typeof h3Index !== 'string')
            return false;
        return /^[0-9a-fA-F]{15}$/.test(h3Index);
    }
    static mapErrorCode(err) {
        return err.code;
    }
}
export class H3Grid {
    static latLngToCell(lat, lng, resolution) {
        return latLngToCell(lat, lng, resolution);
    }
    static cellToBoundary(h3Index) {
        guardH3Payload(h3Index);
        return cellToBoundary(h3Index);
    }
    static getResolution(h3Index) {
        guardH3Payload(h3Index);
        return h3GetResolution(h3Index);
    }
    static validate(h3Index) {
        return isValidH3Index(h3Index);
    }
    validateIndex(h3Index) {
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
    assertValidIndex(h3Index) {
        const res = this.validateIndex(h3Index);
        if (!res.isValid) {
            throw new Error(`Spatial Validation Error: ${res.message}`);
        }
    }
}
export class H3GridManager {
    static H3_REGEX = /^[0-9a-f]{15}$/;
    static H3_EXPECTED_LENGTH = 15;
    validateIndex(h3Index) {
        if (typeof h3Index !== 'string')
            return false;
        if (h3Index.length !== H3GridManager.H3_EXPECTED_LENGTH)
            return false;
        return H3GridManager.H3_REGEX.test(h3Index);
    }
    validate(payload) {
        return H3GridManager.guardPayload(payload) !== null;
    }
    static guardPayload(h3Index) {
        if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string' || h3Index.trim() === '') {
            throw new Error(`[ThermodynamicSpatialError] Invalid H3 payload encountered: ${String(h3Index)}`);
        }
        return h3Index.trim();
    }
}
export class H3GridEngine {
    defaultResolution;
    cells = new Map();
    constructor(defaultResolution = 3) {
        this.defaultResolution = defaultResolution;
    }
    initializeGrid(query) {
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
    getCell(h3Index) {
        return this.cells.get(h3Index);
    }
    getAdjacentCells(h3Index) {
        return [`${h3Index}_adj1`, `${h3Index}_adj2`, `${h3Index}_adj3`, `${h3Index}_adj4`, `${h3Index}_adj5`, `${h3Index}_adj6`];
    }
    propagateCellState(h3Index, _deltaT) {
        const cell = this.cells.get(h3Index);
        if (cell) {
            cell.carbonStock += 10;
        }
    }
}
export class H3Validator {
    validate(h3Index) {
        return isValidH3Index(h3Index);
    }
    assertValid(h3Index) {
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
export class H3SpatialMonad {
    validatePayload(h3Index) {
        guardH3Payload(h3Index);
    }
    validateH3Index(payload) {
        guardH3Payload(payload);
    }
    bind(h3Index, fn) {
        this.validatePayload(h3Index);
        return fn(h3Index);
    }
}
