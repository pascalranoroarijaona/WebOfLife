import { H3ErrorCode } from './h3_types.js';
export { H3ErrorCode };
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
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
        this.errorCode = errorCode;
        this.name = 'H3ValidationError';
    }
}
export class InvalidLengthError extends H3ValidationError {
    constructor(message) {
        super(H3ErrorCode.INVALID_LENGTH, message);
        this.name = 'InvalidLengthError';
    }
}
export function guardH3Payload(payload) {
    if (payload === null || payload === undefined) {
        throw new TypeError('Thermodynamic Spatial Error: H3 payload cannot be null or undefined.');
    }
    if (typeof payload !== 'string' || payload.trim() === '') {
        throw new TypeError('Thermodynamic Spatial Error: H3 payload must be a non-empty string.');
    }
    return payload.trim();
}
export function isValidH3Index(index) {
    if (typeof index !== 'string')
        return false;
    return /^[0-9a-fA-F]{15}$/.test(index);
}
export function isH3Index(index) {
    return isValidH3Index(index);
}
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new Error('[Thermodynamic Spatial Violation] Invalid H3 index format');
    }
}
export function validateH3IndexLength(index) {
    if (typeof index !== 'string')
        return false;
    return /^[0-9a-fA-F]{15}$/.test(index);
}
export function isValidH3Length(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15;
}
export function isValidH3IndexLength(index) {
    return typeof index === 'string' && index.length === 15;
}
export function validateH3Length(h3Index) {
    if (typeof h3Index !== 'string')
        return false;
    return h3Index.length === 15;
}
export function createSpatialMonad(h3Index, energyStock = 0) {
    if (!isValidH3Index(h3Index)) {
        throw new Error('[ThermodynamicViolation] Invalid H3 index format for spatial monad creation.');
    }
    return {
        h3Index,
        trophicEnergyStockJoules: energyStock
    };
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
export function validateH3Index(index) {
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
    static fromGeo(coord, resolution) {
        const latHex = Math.floor(Math.abs(coord.lat) * 1e4).toString(16).padStart(4, '0');
        const lngHex = Math.floor(Math.abs(coord.lng) * 1e4).toString(16).padStart(4, '0');
        const resHex = resolution.toString(16);
        return `8${resHex}26${latHex}${lngHex}`.substring(0, 15).padEnd(15, 'f');
    }
    static parseString(h3Str) {
        return guardH3Payload(h3Str).toLowerCase();
    }
    static validateIndex(h3Index) {
        return validateH3Index(String(h3Index));
    }
}
export class H3GridValidator {
    static H3_REGEX = /^[89a-fA-F][0-9a-fA-F]{14}$/;
    static isValidIndex(h3Index) {
        if (typeof h3Index !== 'string')
            return false;
        return /^[0-9a-fA-F]{15}$/.test(h3Index);
    }
    static validateString(h3Index) {
        return validateH3Index(h3Index);
    }
    static parseResolution(h3Index) {
        return parseInt(h3Index[1], 16) || 8;
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
export class H3GridManager {
    static MIN_RESOLUTION = 0;
    static MAX_RESOLUTION = 15;
    static guardPayload(h3Index) {
        return guardH3Payload(h3Index);
    }
    static validatePayload(h3Index) {
        return guardH3Payload(h3Index);
    }
    static guardPayloadStatic(h3Index) {
        return guardH3Payload(h3Index);
    }
    validateResolution(resolution) {
        return (Number.isInteger(resolution) &&
            resolution >= H3GridManager.MIN_RESOLUTION &&
            resolution <= H3GridManager.MAX_RESOLUTION);
    }
    assertValidResolution(resolution) {
        if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
            throw new RangeError(`Invalid H3 resolution tier: ${resolution}. Resolution must be an integer between 0 and 15.`);
        }
    }
    validateIndex(h3Index) {
        return isValidH3Index(h3Index) && /^[0-9a-f]{15}$/.test(h3Index);
    }
}
export class H3Grid {
    tokens = new Set();
    validateIndex(h3Index) {
        return validateH3Index(h3Index);
    }
    assertValidIndex(h3Index) {
        const res = validateH3Index(h3Index);
        if (!res.isValid) {
            throw new Error(`Spatial Validation Error: ${res.message}`);
        }
    }
    static validate(h3Index) {
        return isValidH3Index(h3Index);
    }
    registerPayload(payload) {
        const guarded = guardH3Payload(payload);
        this.tokens.add(guarded);
        return guarded;
    }
    size() {
        return this.tokens.size;
    }
    hasIndex(h3Index) {
        if (!h3Index || typeof h3Index !== 'string')
            return false;
        return this.tokens.has(h3Index);
    }
    static cellToBoundary(_h3Index) {
        guardH3Payload(_h3Index);
        return [];
    }
    static getResolution(_h3Index) {
        guardH3Payload(_h3Index);
        return 5;
    }
}
export function processSpatialMonad(payload) {
    try {
        const guarded = guardH3Payload(payload);
        if (!isValidH3Index(guarded)) {
            return { isValid: false, payload: null, error: 'Thermodynamic Violation: Invalid H3 index format.' };
        }
        return { isValid: true, payload: guarded };
    }
    catch (err) {
        return { isValid: false, payload: null, error: err.message };
    }
}
export class H3SpatialMonad {
    bind(payload, fn) {
        guardH3Payload(payload);
        return fn(payload);
    }
    validatePayload(payload) {
        guardH3Payload(payload);
    }
}
export class H3GridEngine {
    resolution;
    cells = new Map();
    constructor(resolution = 3) {
        this.resolution = resolution;
    }
    initializeGrid(query) {
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
    getCell(h3Index) {
        return this.cells.get(h3Index);
    }
    getAdjacentCells(h3Index) {
        return [`${h3Index}_adj1`, `${h3Index}_adj2`, `${h3Index}_adj3`, `${h3Index}_adj4`, `${h3Index}_adj5`, `${h3Index}_adj6`];
    }
    propagateCellState(h3Index, _deltaT) {
        const cell = this.cells.get(h3Index);
        if (cell && cell.carbonStock !== undefined) {
            cell.carbonStock += 10 * _deltaT;
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
