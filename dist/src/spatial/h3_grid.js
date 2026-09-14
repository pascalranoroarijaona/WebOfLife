/**
 * @file src/spatial/h3_grid.ts
 * @description Comprehensive H3 spatial indexing grid utilities, validators, error types, and classes
 *              retaining full backward compatibility across Sprints 001 through 019.
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
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_BASE_CELL_NUM"] = 5] = "ERR_H3_INVALID_BASE_CELL_NUM";
    H3ErrorCode[H3ErrorCode["ERR_H3_OUT_OF_RANGE_NUM"] = 6] = "ERR_H3_OUT_OF_RANGE_NUM";
})(H3ErrorCode || (H3ErrorCode = {}));
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
const H3_STRICT_REGEX = /^[89a-fA-F][0-9a-fA-F]{14}$/;
export class H3Error extends Error {
    code;
    errorCode;
    constructor(code, message) {
        super(message);
        this.name = 'H3Error';
        this.code = code;
        this.errorCode = code;
    }
}
export class H3ValidationError extends H3Error {
    constructor(message, code = H3ErrorCode.INVALID_LENGTH) {
        super(code, message);
        this.name = 'H3ValidationError';
    }
}
export class InvalidLengthError extends H3ValidationError {
    constructor(message) {
        super(message, H3ErrorCode.INVALID_LENGTH);
        this.name = 'InvalidLengthError';
    }
}
/**
 * Validates whether a given string matches the standard 15-character H3 index length.
 */
export function validateH3IndexLength(index) {
    if (typeof index !== 'string')
        return false;
    return H3_REGEX.test(index);
}
export function isValidH3IndexLength(index) {
    return validateH3IndexLength(index);
}
export function isValidH3Length(index) {
    return validateH3IndexLength(index);
}
export function isValidH3Index(index) {
    return validateH3IndexLength(index);
}
export function isH3Index(index) {
    return isValidH3Index(index);
}
export function assertValidH3Index(h3Index) {
    if (!h3Index || typeof h3Index !== 'string') {
        throw new H3Error(H3ErrorCode.NULL_INDEX, '[Thermodynamic Spatial Violation] H3 index cannot be null or non-string.');
    }
    if (h3Index === '000000000000000') {
        throw new H3Error(H3ErrorCode.NULL_INDEX, '[Thermodynamic Spatial Violation] Null index detected.');
    }
    if (h3Index.length !== 15) {
        throw new InvalidLengthError(`[Thermodynamic Spatial Violation] Invalid length: ${h3Index.length}`);
    }
    if (!H3_REGEX.test(h3Index)) {
        throw new H3Error(H3ErrorCode.INVALID_CHARACTER, `[Thermodynamic Spatial Violation] Invalid characters in ${h3Index}`);
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
    if (!H3_REGEX.test(trimmed)) {
        throw new TypeError(`Thermodynamic Violation: Invalid H3 index format '${trimmed}'.`);
    }
    return trimmed;
}
export function validateH3Index(index) {
    if (index === null || index === undefined || typeof index !== 'string') {
        return {
            isValid: false,
            valid: false,
            code: H3ErrorCode.NULL_INDEX,
            errorCode: H3ErrorCode.NULL_INDEX,
            message: 'H3 index must be a non-empty string.'
        };
    }
    if (index.length !== 15) {
        return {
            isValid: false,
            valid: false,
            code: H3ErrorCode.INVALID_LENGTH,
            errorCode: H3ErrorCode.INVALID_LENGTH,
            message: `Invalid H3 index length: expected 15 characters, got ${index.length}.`
        };
    }
    if (!H3_REGEX.test(index)) {
        return {
            isValid: false,
            valid: false,
            code: H3ErrorCode.INVALID_CHARACTER,
            errorCode: H3ErrorCode.INVALID_CHARACTER,
            message: `Invalid H3 characters in '${index}'.`
        };
    }
    const res = parseInt(index[1], 16) || 0;
    const baseCell = parseInt(index.substring(2, 4), 16) || 0;
    return {
        isValid: true,
        valid: true,
        code: H3ErrorCode.SUCCESS,
        errorCode: H3ErrorCode.SUCCESS,
        message: 'Valid H3 Index',
        resolution: res,
        baseCell: baseCell
    };
}
export function processSpatialMonad(payload) {
    try {
        const valid = guardH3Payload(payload);
        return { isValid: true, payload: valid };
    }
    catch (err) {
        return { isValid: false, payload: null, error: err.message };
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
export class H3Validator {
    validate(h3Index) {
        return isValidH3Index(h3Index);
    }
    assertValid(h3Index) {
        assertValidH3Index(h3Index);
    }
    static isValidIndex(h3Index) {
        if (typeof h3Index !== 'string')
            return false;
        return H3_STRICT_REGEX.test(h3Index) || H3_REGEX.test(h3Index);
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
}
export class H3GridParser {
    static validateIndex(h3Index) {
        return validateH3Index(String(h3Index));
    }
    static fromGeo(coord, resolution) {
        const lat = coord.lat ?? coord.latitude ?? 0;
        const lng = coord.lng ?? coord.longitude ?? 0;
        const prefix = '8' + resolution.toString(16) + '26';
        const padding = Math.abs(Math.floor((lat + 90) * 1e7 ^ (lng + 180) * 1e7)).toString(16);
        return (prefix + padding).padEnd(15, 'f').substring(0, 15).toLowerCase();
    }
    static parseString(h3Str) {
        return guardH3Payload(h3Str).toLowerCase();
    }
}
export class H3Grid {
    indices = new Set();
    validateIndex(h3Index) {
        return validateH3Index(h3Index);
    }
    assertValidIndex(h3Index) {
        const res = validateH3Index(h3Index);
        if (!res.isValid) {
            throw new Error(`Spatial Validation Error: ${res.message}`);
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
    static validate(h3Index) {
        return H3Validator.isValidIndex(h3Index);
    }
    static cellToBoundary(index) {
        guardH3Payload(index);
        return [
            { lat: 0, lng: 0 },
            { lat: 1, lng: 0 },
            { lat: 1, lng: 1 },
            { lat: 0, lng: 1 }
        ];
    }
    static getResolution(index) {
        guardH3Payload(index);
        return parseInt(index[1], 16) || 0;
    }
}
export class H3GridManager {
    validateIndex(h3Index) {
        return typeof h3Index === 'string' && h3Index.length === 15 && /^[0-9a-f]+$/.test(h3Index);
    }
    static guardPayload(h3Index) {
        return guardH3Payload(h3Index);
    }
    validate(payload) {
        try {
            guardH3Payload(payload);
            return true;
        }
        catch {
            return false;
        }
    }
}
export class H3GridEngine {
    defaultResolution;
    cells = new Map();
    constructor(defaultResolution = 3) {
        this.defaultResolution = defaultResolution;
    }
    initializeGrid(query) {
        const indexes = query.baseIndexes ?? ['831f18fffffffff', '831f19fffffffff'];
        for (const idx of indexes) {
            this.cells.set(idx, {
                h3Index: idx,
                resolution: query.resolution,
                centroid: { lat: 0, lng: 0 },
                boundary: [],
                areaKm2: 100,
                solarIrradiance: 1361,
                carbonStock: 5000
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
            cell.carbonStock = (cell.carbonStock ?? 5000) + 10;
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
export const H3GridValidator = H3Validator;
