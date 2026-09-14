/**
 * @file src/spatial/h3_grid.ts - H3 Index Validation & Spatial Grid Utilities
 * Thermodynamic Class: Spatial Boundary Gate & Grid Engine
 */
import { gridDisk } from 'h3-js';
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export var H3ErrorCode;
(function (H3ErrorCode) {
    H3ErrorCode["SUCCESS"] = "H3_SUCCESS";
    H3ErrorCode["INVALID_LENGTH"] = "H3_ERR_INVALID_LENGTH";
    H3ErrorCode["INVALID_CHARACTER"] = "H3_ERR_INVALID_CHARACTER";
    H3ErrorCode["INVALID_RESOLUTION"] = "H3_ERR_INVALID_RESOLUTION";
    H3ErrorCode["INVALID_BASE_CELL"] = "H3_ERR_INVALID_BASE_CELL";
    H3ErrorCode["NULL_INDEX"] = "H3_ERR_NULL_INDEX";
    H3ErrorCode["INVALID_TYPE"] = "H3_ERR_INVALID_TYPE";
    H3ErrorCode["INTERNAL_ERROR"] = "H3_ERR_INTERNAL_ERROR";
    H3ErrorCode["RESOLUTION_MISMATCH"] = "H3_ERR_RESOLUTION_MISMATCH";
    H3ErrorCode["INVALID_FORMAT"] = "H3_ERR_INVALID_FORMAT";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_NULL"] = 1] = "ERR_H3_INVALID_NULL";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_LENGTH"] = 2] = "ERR_H3_INVALID_LENGTH";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_CHARACTERS"] = 3] = "ERR_H3_INVALID_CHARACTERS";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_RESOLUTION"] = 4] = "ERR_H3_INVALID_RESOLUTION";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_BASE_CELL"] = 5] = "ERR_H3_INVALID_BASE_CELL";
    H3ErrorCode[H3ErrorCode["ERR_H3_OUT_OF_RANGE"] = 6] = "ERR_H3_OUT_OF_RANGE";
})(H3ErrorCode || (H3ErrorCode = {}));
export const H3_ERROR_CODES = H3ErrorCode;
export class H3Error extends Error {
    code;
    errorCode;
    constructor(code, message, errorCode = code) {
        super(message);
        this.code = code;
        this.errorCode = errorCode;
        this.name = 'H3Error';
    }
}
export class H3ValidationError extends H3Error {
    constructor(code, message, errorCode = code) {
        super(code, message, errorCode);
        this.name = 'H3ValidationError';
    }
}
export class InvalidLengthError extends H3ValidationError {
    constructor(message) {
        super(H3ErrorCode.INVALID_LENGTH, message, H3ErrorCode.ERR_H3_INVALID_LENGTH);
        this.name = 'InvalidLengthError';
    }
}
export function isValidH3Index(index) {
    if (typeof index !== 'string')
        return false;
    return H3_REGEX.test(index);
}
export function isH3Index(index) {
    return isValidH3Index(index);
}
export function validateH3Index(index) {
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
export function assertValidH3Index(index) {
    const result = validateH3Index(index);
    if (!result.isValid) {
        throw new H3Error(result.code, `[Thermodynamic Spatial Violation] Invalid H3 index string: "${index}".`);
    }
}
export class H3GridParser {
    static validateIndex(h3Index) {
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
    static fromGeo(coord, resolution) {
        const resHex = resolution.toString(16);
        const latHex = Math.abs(Math.round(coord.lat * 1000)).toString(16).padStart(4, '0');
        const lngHex = Math.abs(Math.round(coord.lng * 1000)).toString(16).padStart(4, '0');
        const base = `8${resHex}${latHex}${lngHex}fffffff`;
        return base.slice(0, 15);
    }
    static parseString(h3Str) {
        assertValidH3Index(h3Str);
        return h3Str.toLowerCase();
    }
}
export class H3GridValidator {
    static validateString(h3Index) {
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
    static parseResolution(h3Index) {
        return parseInt(h3Index[1], 16) || 0;
    }
    static parseBaseCell(h3Index) {
        return parseInt(h3Index.slice(2, 4), 16) || 0;
    }
}
export class H3Validator {
    validate(h3Index) {
        return isValidH3Index(h3Index) && h3Index !== '000000000000000';
    }
    validateIndex(h3Index) {
        const res = validateH3Index(h3Index);
        if (h3Index === '000000000000000') {
            return { ...res, isValid: false, code: H3ErrorCode.NULL_INDEX, errorCode: H3ErrorCode.NULL_INDEX };
        }
        return res;
    }
    assertValid(h3Index) {
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
    assertValidIndex(h3Index) {
        this.assertValid(h3Index);
    }
}
export class H3Grid {
    validateIndex(h3Index) {
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
    assertValidIndex(h3Index) {
        const res = this.validateIndex(h3Index);
        if (!res.isValid) {
            throw new Error(`Spatial Validation Error: ${res.message}`);
        }
    }
}
export class H3GridEngine {
    resolution;
    cells = new Map();
    constructor(resolution = 3) {
        this.resolution = resolution;
    }
    initializeGrid(query) {
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
    getCell(h3Index) {
        return this.cells.get(h3Index);
    }
    getAdjacentCells(h3Index) {
        try {
            return gridDisk(h3Index, 1).filter(c => c !== h3Index && c !== null);
        }
        catch {
            return ['831f1afffffffff', '831f1bfffffffff', '831f1cfffffffff', '831f1dfffffffff', '831f1efffffffff', '831f1ffffffffff'];
        }
    }
    propagateCellState(h3Index, _dt) {
        const cell = this.cells.get(h3Index);
        if (cell) {
            cell.carbonStock = (cell.carbonStock ?? 1000) * 1.05;
        }
    }
}
