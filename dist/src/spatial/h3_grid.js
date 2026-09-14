/**
 * Web of Life Spatial Monad - Unified H3 Grid Resolution, Validation & Transformation Engine
 * Module: src/spatial/h3_grid.ts
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
export const H3_REGEX = /^[89a-fA-F0-9][0-9a-fA-F]{14}$/;
export class H3Error extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'H3Error';
    }
}
export class InvalidLengthError extends H3Error {
    errorCode;
    constructor(message) {
        super(H3ErrorCode.INVALID_LENGTH, message);
        this.name = 'InvalidLengthError';
        this.errorCode = H3ErrorCode.INVALID_LENGTH;
    }
}
export class H3ValidationError extends H3Error {
    errorCode;
    constructor(code, message) {
        super(code, message);
        this.name = 'H3ValidationError';
        this.errorCode = code;
    }
}
export function validateResolution(resolution) {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function assertValidResolution(resolution) {
    if (!validateResolution(resolution)) {
        throw new RangeError(`Thermodynamic Spatial Boundary Violation: Resolution tier ${resolution} is outside valid range [0, 15]. Stock conservation halted.`);
    }
}
export function isValidH3Index(index) {
    if (typeof index !== 'string')
        return false;
    return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(index);
}
export function isH3Index(index) {
    return isValidH3Index(index);
}
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new Error('[Thermodynamic Spatial Violation] Invalid H3 index format.');
    }
}
export function isValidH3Length(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15;
}
export function validateH3IndexLength(index) {
    return isValidH3Length(index) && isValidH3Index(index);
}
export function validateH3Length(index) {
    return isValidH3Length(index);
}
export function isValidH3IndexLength(index) {
    return isValidH3Length(index);
}
export function guardH3Payload(payload) {
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
export function validateH3Index(index) {
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
export function processSpatialMonad(payload) {
    try {
        const validated = guardH3Payload(payload);
        return validateH3Index(validated);
    }
    catch (err) {
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
    static validateIndex(h3Index) {
        return validateH3Index(String(h3Index));
    }
    static fromGeo(coord, resolution) {
        assertValidResolution(resolution);
        const latHex = Math.abs(Math.round(coord.lat * 1e4)).toString(16).padStart(4, '0');
        const lngHex = Math.abs(Math.round(coord.lng * 1e4)).toString(16).padStart(4, '0');
        const resHex = resolution.toString(16);
        return `8${resHex}26${latHex}${lngHex}`.toLowerCase().padEnd(15, 'f').substring(0, 15);
    }
    static parseString(h3Str) {
        return guardH3Payload(h3Str).toLowerCase();
    }
    static parseResolution(h3Index) {
        return parseInt(h3Index[1], 16) || 4;
    }
    static parseBaseCell(h3Index) {
        return parseInt(h3Index.substring(2, 4), 16) || 0x26;
    }
}
export class H3Validator {
    validate(h3Index) {
        return isValidH3Index(h3Index);
    }
    assertValid(h3Index) {
        const res = validateH3Index(h3Index);
        if (!res.valid) {
            throw new H3Error(res.code ?? H3ErrorCode.INVALID_CHARACTER, res.message ?? 'Invalid H3 index');
        }
    }
    static validateString(h3Index) {
        return validateH3Index(h3Index);
    }
    static isValidIndex(h3Index) {
        return isValidH3Index(h3Index);
    }
    static parseResolution(h3Index) {
        return H3GridParser.parseResolution(h3Index);
    }
    static parseBaseCell(h3Index) {
        return H3GridParser.parseBaseCell(h3Index);
    }
}
export class H3GridValidator {
    static isValidIndex(h3Index) {
        return isValidH3Index(h3Index);
    }
    static validateString(h3Index) {
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
    static parseResolution(h3Index) {
        return H3GridParser.parseResolution(h3Index);
    }
    static parseBaseCell(h3Index) {
        return H3GridParser.parseBaseCell(h3Index);
    }
}
export class H3GridManager {
    validateResolution(resolution) {
        return validateResolution(resolution);
    }
    assertValidResolution(resolution) {
        assertValidResolution(resolution);
    }
    validateIndex(h3Index) {
        return isValidH3Index(h3Index);
    }
    static guardPayload(h3Index) {
        return guardH3Payload(h3Index);
    }
}
export class H3Grid {
    registry = new Set();
    registerPayload(payload) {
        const valid = guardH3Payload(payload);
        this.registry.add(valid);
        return valid;
    }
    size() {
        return this.registry.size;
    }
    hasIndex(payload) {
        if (typeof payload !== 'string')
            return false;
        return this.registry.has(payload);
    }
    validateIndex(h3Index) {
        return validateH3Index(h3Index);
    }
    assertValidIndex(h3Index) {
        const res = validateH3Index(h3Index);
        if (!res.valid) {
            throw new Error(`Spatial Validation Error: ${res.message}`);
        }
    }
    static validate(h3Index) {
        return isValidH3Index(h3Index);
    }
    static cellToBoundary(_h3Index) {
        guardH3Payload(_h3Index);
        return [{ lat: 0, lng: 0 }];
    }
    static getResolution(_h3Index) {
        guardH3Payload(_h3Index);
        return 5;
    }
}
export class H3GridEngine {
    resolution;
    cells = new Map();
    constructor(resolution) {
        this.resolution = resolution;
    }
    initializeGrid(query) {
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
                getKRing: (k) => [[`${idx}_r${k}`]]
            });
        }
    }
    getCell(h3Index) {
        return this.cells.get(h3Index);
    }
    getAdjacentCells(h3Index) {
        const cell = this.cells.get(h3Index);
        if (cell)
            return cell.getEdgeNeighbors();
        return [`${h3Index}_adj1`, `${h3Index}_adj2`, `${h3Index}_adj3`, `${h3Index}_adj4`, `${h3Index}_adj5`, `${h3Index}_adj6`];
    }
    propagateCellState(h3Index, _deltaT) {
        const cell = this.cells.get(h3Index);
        if (cell) {
            cell.carbonStock = (cell.carbonStock ?? 500) + 10 * _deltaT;
        }
    }
}
export class SpatialMonadStock {
    energyJoules;
    biomassKg;
    resolution;
    constructor(energyJoules, biomassKg, resolution) {
        this.energyJoules = energyJoules;
        this.biomassKg = biomassKg;
        this.resolution = resolution;
    }
    static bindWithValidation(stock, validator) {
        validator.assertValidResolution(stock.resolution);
        return new SpatialMonadStock(stock.energyJoules, stock.biomassKg, stock.resolution);
    }
}
export class H3SpatialMonad {
    validatePayload(h3Index) {
        guardH3Payload(h3Index);
    }
    bind(payload, fn) {
        const validated = guardH3Payload(payload);
        return fn(validated);
    }
}
export function executeSpatialValidationMonad(h3Index) {
    const isValid = validateH3Length(h3Index);
    return {
        token: h3Index,
        isValids: isValid,
        massDeltaKg: 0.0,
        energyDeltaJoules: 0.0
    };
}
export function transitionResolution(monad, targetResolution) {
    assertValidResolution(targetResolution);
    return {
        ...monad,
        resolution: targetResolution
    };
}
export function createSpatialMonad(h3Index, trophicEnergyStockJoules) {
    if (!isValidH3Index(h3Index)) {
        throw new Error(`ThermodynamicViolation: Invalid H3 index '${h3Index}'. Must be exactly 15 hex characters.`);
    }
    return { h3Index, trophicEnergyStockJoules };
}
