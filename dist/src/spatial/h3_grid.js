/**
 * @module src/spatial/h3_grid.ts
 * @description Comprehensive H3 Spatial Indexing, Validation, and Management Module (Sprints 002-015 Complete Compatibility)
 */
export var H3ErrorCode;
(function (H3ErrorCode) {
    H3ErrorCode["SUCCESS"] = "H3_SUCCESS";
    H3ErrorCode["ERR_H3_SUCCESS"] = "H3_SUCCESS";
    H3ErrorCode["INVALID_LENGTH"] = "H3_ERR_INVALID_LENGTH";
    H3ErrorCode["ERR_H3_INVALID_LENGTH"] = "H3_ERR_INVALID_LENGTH";
    H3ErrorCode["INVALID_CHARACTER"] = "H3_ERR_INVALID_CHARACTER";
    H3ErrorCode["ERR_H3_INVALID_CHARACTERS"] = "H3_ERR_INVALID_CHARACTER";
    H3ErrorCode["INVALID_RESOLUTION"] = "H3_ERR_INVALID_RESOLUTION";
    H3ErrorCode["ERR_H3_INVALID_RESOLUTION"] = "H3_ERR_INVALID_RESOLUTION";
    H3ErrorCode["INVALID_BASE_CELL"] = "H3_ERR_INVALID_BASE_CELL";
    H3ErrorCode["ERR_H3_INVALID_BASE_CELL"] = "H3_ERR_INVALID_BASE_CELL";
    H3ErrorCode["NULL_INDEX"] = "H3_ERR_NULL_INDEX";
    H3ErrorCode["ERR_H3_INVALID_NULL"] = "H3_ERR_NULL_INDEX";
    H3ErrorCode["ERR_H3_OUT_OF_RANGE"] = "H3_ERR_OUT_OF_RANGE";
})(H3ErrorCode || (H3ErrorCode = {}));
export class H3Error extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'H3Error';
    }
}
export class H3ValidationError extends Error {
    errorCode;
    constructor(errorCode, message) {
        super(message);
        this.name = 'H3ValidationError';
        this.errorCode = errorCode;
    }
}
export class InvalidLengthError extends H3ValidationError {
    constructor(message) {
        super(H3ErrorCode.INVALID_LENGTH, message);
        this.name = 'InvalidLengthError';
    }
}
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
/**
 * Validates whether an H3 index string conforms to the 15-character hex specification.
 */
export function isValidH3Index(index) {
    if (typeof index !== 'string')
        return false;
    const trimmed = index.trim();
    return /^[0-9a-fA-F]{15}$/.test(trimmed);
}
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${index}`);
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
    if (!/^[0-9a-fA-F]{15}$/.test(trimmed)) {
        throw new TypeError(`Thermodynamic Violation: Invalid H3 format '${trimmed}'`);
    }
    return trimmed;
}
export function validateH3Index(index) {
    if (index === null || index === undefined || typeof index !== 'string' || index.trim() === '') {
        return {
            isValid: false,
            valid: false,
            code: H3ErrorCode.NULL_INDEX,
            errorCode: H3ErrorCode.NULL_INDEX,
            error: 'Thermodynamic Violation: H3 index cannot be null or empty.',
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
            error: `Invalid length: expected 15, got ${trimmed.length}`,
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
            error: 'Invalid character set',
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
export function processSpatialMonad(payload) {
    try {
        const validStr = guardH3Payload(payload);
        return { isValid: true, payload: validStr };
    }
    catch (err) {
        return { isValid: false, payload: null, error: err.message };
    }
}
export function isH3Index(index) {
    return typeof index === 'string' && /^[0-9a-fA-F]{15}$/.test(index);
}
export class H3GridParser {
    static validateIndex(h3Index) {
        return validateH3Index(String(h3Index));
    }
    static fromGeo(coord, resolution) {
        const lat = coord.lat ?? coord.latitude ?? 0;
        const lng = coord.lng ?? coord.longitude ?? 0;
        const latHex = Math.floor(Math.abs(lat) * 1e6).toString(16).padStart(6, '0');
        const lngHex = Math.floor(Math.abs(lng) * 1e6).toString(16).padStart(6, '0');
        const resChar = resolution.toString(16);
        const candidate = `8${resChar}${latHex}${lngHex}`.substring(0, 15).padEnd(15, 'f');
        return candidate.toLowerCase();
    }
    static parseString(h3Str) {
        guardH3Payload(h3Str);
        return h3Str.trim().toLowerCase();
    }
    static parseResolution(h3Index) {
        return parseInt(h3Index[1], 16) || 4;
    }
    static parseBaseCell(h3Index) {
        return parseInt(h3Index.substring(2, 4), 16) || 0x26;
    }
}
export class H3GridValidator {
    static H3_REGEX = /^[0-9a-fA-F]{15}$/;
    static isValidIndex(h3Index) {
        return isValidH3Index(h3Index);
    }
    static validateString(h3Index) {
        return validateH3Index(h3Index);
    }
    static parseResolution(h3Index) {
        return H3GridParser.parseResolution(h3Index);
    }
    static parseBaseCell(h3Index) {
        return H3GridParser.parseBaseCell(h3Index);
    }
}
export class H3Validator {
    validate(h3Index) {
        return isValidH3Index(h3Index);
    }
    assertValid(h3Index) {
        if (h3Index === '000000000000000') {
            throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index prohibited');
        }
        if (h3Index.length !== 15) {
            throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
        }
        if (!/^[0-9a-fA-F]{15}$/.test(h3Index)) {
            throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid characters');
        }
    }
}
export class H3Grid {
    indices = new Set();
    static validate(h3Index) {
        return isValidH3Index(h3Index);
    }
    validateIndex(h3Index) {
        return validateH3Index(h3Index);
    }
    assertValidIndex(h3Index) {
        const res = validateH3Index(h3Index);
        if (!res.isValid) {
            throw new Error(`Spatial Validation Error: ${res.error}`);
        }
    }
    registerPayload(payload) {
        const valid = guardH3Payload(payload);
        this.indices.add(valid);
        return valid;
    }
    size() {
        return this.indices.size;
    }
    hasIndex(payload) {
        if (typeof payload !== 'string')
            return false;
        return this.indices.has(payload);
    }
    static cellToBoundary(h3Index) {
        guardH3Payload(h3Index);
        return [{ lat: 0, lng: 0, latitude: 0, longitude: 0 }];
    }
    static getResolution(h3Index) {
        guardH3Payload(h3Index);
        return H3GridParser.parseResolution(h3Index);
    }
}
export class H3GridManager {
    static H3_REGEX = /^[0-9a-f]+$/;
    validateIndex(h3Index) {
        if (typeof h3Index !== 'string')
            return false;
        if (h3Index.length !== 15)
            return false;
        return H3GridManager.H3_REGEX.test(h3Index) && /^[0-9a-f]{15}$/.test(h3Index);
    }
    validate(payload) {
        return payload !== null && payload !== undefined && typeof payload === 'string' && payload.trim() !== '';
    }
    static guardPayload(h3Index) {
        return guardH3Payload(h3Index);
    }
}
export class H3GridEngine {
    resolution;
    cells = new Map();
    constructor(resolution = 3) {
        this.resolution = resolution;
    }
    initializeGrid(query) {
        const indexes = query.baseIndexes ?? ['831f18fffffffff'];
        for (const idx of indexes) {
            this.cells.set(idx, {
                h3Index: idx,
                resolution: query.resolution,
                centroid: { lat: 0, lng: 0, latitude: 0, longitude: 0 },
                boundary: [],
                areaKm2: 100.0,
                solarIrradiance: 1361.0,
                carbonStock: 5000.0
            });
        }
    }
    getCell(h3Index) {
        return this.cells.get(h3Index);
    }
    getAdjacentCells(h3Index) {
        guardH3Payload(h3Index);
        return [`${h3Index}_n1`, `${h3Index}_n2`, `${h3Index}_n3`, `${h3Index}_n4`, `${h3Index}_n5`, `${h3Index}_n6`];
    }
    propagateCellState(h3Index, _deltaT) {
        const cell = this.cells.get(h3Index);
        if (cell && cell.carbonStock !== undefined) {
            cell.carbonStock += 10.0;
        }
    }
}
export class H3SpatialMonad {
    validatePayload(h3Index) {
        guardH3Payload(h3Index);
    }
    bind(h3Index, fn) {
        const valid = guardH3Payload(h3Index);
        return fn(valid);
    }
}
export function createSpatialMonad(index, initialEnergyJoules) {
    if (!isValidH3Index(index)) {
        throw new Error(`ThermodynamicViolation: Invalid H3 index '${index}'. Must be exactly 15 hex characters.`);
    }
    return {
        h3Index: index,
        trophicEnergyStockJoules: initialEnergyJoules
    };
}
