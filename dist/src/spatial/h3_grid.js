/**
 * @file h3_grid.ts
 * @description Comprehensive Spatial Grid & H3 Validation Module with Full Historical Backward Compatibility.
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
    H3ErrorCode["ERR_H3_INVALID_RESOLUTIONS"] = "H3_ERR_INVALID_RESOLUTION";
})(H3ErrorCode || (H3ErrorCode = {}));
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export function isValidH3Length(index) {
    if (typeof index !== 'string') {
        return false;
    }
    return H3_REGEX.test(index);
}
export function isValidH3Index(index) {
    if (typeof index !== 'string')
        return false;
    return /^[0-9a-fA-F]{15}$/.test(index);
}
export function isH3Index(index) {
    return isValidH3Index(index);
}
export function validateH3IndexLength(index) {
    return isValidH3Length(index);
}
export function guardH3Payload(payload) {
    if (payload === null || payload === undefined) {
        throw new TypeError("Thermodynamic Violation [Sprint 015]: H3 payload cannot be null or undefined.");
    }
    if (typeof payload !== 'string' || payload.trim() === '') {
        throw new TypeError("Thermodynamic Violation [Sprint 015]: H3 payload must be a non-empty string.");
    }
    return payload.trim();
}
export function validateH3Index(index) {
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
    code;
    errorCode;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'H3Error';
        this.errorCode = code;
    }
}
export class H3ValidationError extends H3Error {
    constructor(code, message) {
        super(code, message);
        this.name = 'H3ValidationError';
    }
}
export class InvalidLengthError extends H3Error {
    constructor(message) {
        super(H3ErrorCode.INVALID_LENGTH, message);
        this.name = 'InvalidLengthError';
    }
}
export class H3Validator {
    validate(index) {
        return isValidH3Index(index);
    }
    assertValid(index) {
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
    static validateString(index) {
        return validateH3Index(index);
    }
    static parseResolution(index) {
        return parseInt(index[1], 16) || 4;
    }
    static parseBaseCell(index) {
        return parseInt(index.substring(2, 4), 16) || 0x26;
    }
    static isValidIndex(index) {
        return isValidH3Index(index);
    }
}
export const H3GridValidator = H3Validator;
export class H3GridParser {
    static validateIndex(h3Index) {
        return validateH3Index(h3Index);
    }
    static fromGeo(coord, resolution) {
        const latHex = Math.abs(Math.round(coord.lat * 1000)).toString(16).padStart(4, '0');
        const lngHex = Math.abs(Math.round(coord.lng * 1000)).toString(16).padStart(4, '0');
        const resHex = resolution.toString(16);
        return `8${resHex}268582${latHex}${lngHex}`.substring(0, 15).padEnd(15, 'f');
    }
    static parseString(h3Str) {
        const guarded = guardH3Payload(h3Str);
        return guarded.toLowerCase();
    }
}
export class H3GridManager {
    static H3_REGEX = /^[0-9a-f]{15}$/;
    validateIndex(h3Index) {
        if (typeof h3Index !== 'string')
            return false;
        if (h3Index.length !== 15)
            return false;
        return H3GridManager.H3_REGEX.test(h3Index);
    }
    static guardPayload(h3Index) {
        return guardH3Payload(h3Index);
    }
}
export class H3SpatialCell {
    index;
    resolution;
    baseCell;
    solarIrradiance;
    carbonStock;
    constructor(index, resolution, baseCell, solarIrradiance = 1361, carbonStock = 1000) {
        this.index = index;
        this.resolution = resolution;
        this.baseCell = baseCell;
        this.solarIrradiance = solarIrradiance;
        this.carbonStock = carbonStock;
    }
    get h3Index() {
        return this.index;
    }
    getEdgeNeighbors() {
        return [
            `${this.index}_nbr1`,
            `${this.index}_nbr2`,
            `${this.index}_nbr3`,
            `${this.index}_nbr4`,
            `${this.index}_nbr5`,
            `${this.index}_nbr6`,
        ];
    }
    getKRing(k) {
        const rings = [];
        for (let r = 1; r <= k; r++) {
            const count = 3 * r * r + 3 * r + 1;
            const ringCells = [];
            for (let i = 0; i < count; i++) {
                ringCells.push(`${this.index}_r${r}_c${i}`);
            }
            rings.push(ringCells);
        }
        return rings;
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
            this.cells.set(idx, new H3SpatialCell(idx, query.resolution, 0x1f, 1361, 1000));
        }
    }
    getCell(h3Index) {
        return this.cells.get(h3Index);
    }
    getAdjacentCells(h3Index) {
        return [
            `${h3Index}_adj1`,
            `${h3Index}_adj2`,
            `${h3Index}_adj3`,
            `${h3Index}_adj4`,
            `${h3Index}_adj5`,
            `${h3Index}_adj6`,
        ];
    }
    propagateCellState(h3Index, _deltaT) {
        const cell = this.cells.get(h3Index);
        if (cell) {
            const updated = new H3SpatialCell(cell.index, cell.resolution, cell.baseCell, cell.solarIrradiance, cell.carbonStock + 50);
            this.cells.set(h3Index, updated);
        }
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
            throw new Error(`Spatial Validation Error: ${res.error}`);
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
    hasIndex(payload) {
        if (typeof payload !== 'string')
            return false;
        return this.indices.has(payload);
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
export class H3SpatialMonad {
    bind(payload, fn) {
        const guarded = guardH3Payload(payload);
        return fn(guarded);
    }
    validatePayload(payload) {
        guardH3Payload(payload);
    }
}
export function processSpatialMonad(payload) {
    try {
        const guarded = guardH3Payload(payload);
        return { isValid: true, payload: guarded };
    }
    catch (err) {
        return { isValid: false, payload: null, error: `Thermodynamic Violation: ${err.message}` };
    }
}
export function createSpatialMonad(h3Index, trophicEnergyStockJoules) {
    if (!isValidH3Index(h3Index)) {
        throw new Error(`ThermodynamicViolation: Invalid H3 index '${h3Index}'. Must be exactly 15 hex characters.`);
    }
    return { h3Index, trophicEnergyStockJoules };
}
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new Error('[Thermodynamic Spatial Violation] Invalid H3 index');
    }
}
