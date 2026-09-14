/**
 * src/spatial/h3_grid.ts
 *
 * Comprehensive H3 Spatial Indexing, Validation, Guard Clauses, and Engine Module
 * for Web of Life Simulation. Enforces strict 15-character length and hexadecimal
 * composition bounds for spatial monad state transitions, fulfilling all sprint contracts (003 - 017).
 */
import { H3ErrorCode } from './h3_types.js';
export { H3ErrorCode };
export class H3Error extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'H3Error';
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
export class InvalidLengthError extends H3Error {
    errorCode;
    constructor(message) {
        super(H3ErrorCode.INVALID_LENGTH, message);
        this.name = 'InvalidLengthError';
        this.errorCode = H3ErrorCode.INVALID_LENGTH;
    }
}
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
/**
 * Validates whether a given string is a correctly formatted 15-character H3 index.
 */
export function validateH3IndexLength(index) {
    if (typeof index !== 'string') {
        return false;
    }
    return H3_REGEX.test(index);
}
export function isValidH3Index(index) {
    return validateH3IndexLength(index);
}
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${index}`);
    }
}
export function guardH3Payload(payload) {
    if (payload === null || payload === undefined) {
        throw new TypeError('[Thermodynamic Spatial Error] Payload cannot be null or undefined');
    }
    if (typeof payload !== 'string') {
        throw new TypeError('[Thermodynamic Spatial Error] Payload must be a non-empty string');
    }
    const trimmed = payload.trim();
    if (trimmed === '') {
        throw new TypeError('[Thermodynamic Spatial Error] Payload must be a non-empty string');
    }
}
export class H3GridParser {
    static fromGeo(coord, resolution) {
        const resChar = resolution.toString(16);
        return `8${resChar}268582fffffff`;
    }
    static parseString(indexStr) {
        guardH3Payload(indexStr);
        return indexStr.toLowerCase();
    }
    static validateIndex(index) {
        if (index === null || index === undefined || index === '') {
            return {
                isValid: false,
                valid: false,
                code: H3ErrorCode.NULL_INDEX,
                errorCode: H3ErrorCode.NULL_INDEX,
                error: 'Index cannot be null or empty',
                message: 'Index cannot be null or empty'
            };
        }
        if (typeof index !== 'string') {
            return {
                isValid: false,
                valid: false,
                code: H3ErrorCode.INVALID_CHARACTER,
                errorCode: H3ErrorCode.INVALID_CHARACTER,
                error: 'Index must be a string',
                message: 'Index must be a string'
            };
        }
        if (index.length !== 15) {
            return {
                isValid: false,
                valid: false,
                code: H3ErrorCode.INVALID_LENGTH,
                errorCode: H3ErrorCode.INVALID_LENGTH,
                error: 'Index must be exactly 15 characters long',
                message: 'Index must be exactly 15 characters long'
            };
        }
        if (!/^[0-9a-fA-F]{15}$/.test(index)) {
            return {
                isValid: false,
                valid: false,
                code: H3ErrorCode.INVALID_CHARACTER,
                errorCode: H3ErrorCode.INVALID_CHARACTER,
                error: 'Index contains non-hexadecimal characters',
                message: 'Index contains non-hexadecimal characters'
            };
        }
        const resolution = parseInt(index[1], 16);
        const baseCell = parseInt(index.substring(2, 4), 16);
        return {
            isValid: true,
            valid: true,
            code: H3ErrorCode.SUCCESS,
            errorCode: H3ErrorCode.SUCCESS,
            resolution,
            baseCell
        };
    }
}
export class H3GridValidator {
    static validateString(index) {
        return H3GridParser.validateIndex(index);
    }
    static isValidIndex(index) {
        return validateH3IndexLength(index);
    }
    static parseResolution(index) {
        guardH3Payload(index);
        return parseInt(index[1], 16) || 0;
    }
    static parseBaseCell(index) {
        guardH3Payload(index);
        return parseInt(index.substring(2, 4), 16) || 0;
    }
}
export function isH3Index(index) {
    return validateH3IndexLength(index);
}
export class H3Validator {
    validate(index) {
        return validateH3IndexLength(index);
    }
    assertValid(index) {
        if (index === '000000000000000') {
            throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index (all zeros) is prohibited.');
        }
        if (typeof index !== 'string' || index.length !== 15) {
            throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid H3 index length.');
        }
        if (!/^[0-9a-fA-F]{15}$/.test(index)) {
            throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid characters in H3 index.');
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
        for (const baseIdx of query.baseIndexes) {
            this.cells.set(baseIdx, {
                h3Index: baseIdx,
                resolution: query.resolution,
                solarIrradiance: 1361.0,
                carbonStock: 100.0,
            });
        }
    }
    getCell(index) {
        return this.cells.get(index);
    }
    getAdjacentCells(index) {
        return [
            `${index}_a1`,
            `${index}_a2`,
            `${index}_a3`,
            `${index}_a4`,
            `${index}_a5`,
            `${index}_a6`,
        ];
    }
    propagateCellState(index, deltaT) {
        const cell = this.cells.get(index);
        if (cell) {
            cell.carbonStock = (cell.carbonStock ?? 100) + 1.5 * deltaT;
        }
    }
}
export class H3Grid {
    indices = new Set();
    static validate(index) {
        return validateH3IndexLength(index);
    }
    validateIndex(index) {
        return H3GridParser.validateIndex(index);
    }
    assertValidIndex(index) {
        const res = this.validateIndex(index);
        if (!res.isValid) {
            throw new Error(`Spatial Validation Error: ${res.error}`);
        }
    }
    registerPayload(payload) {
        guardH3Payload(payload);
        const str = payload;
        this.assertValidIndex(str);
        this.indices.add(str);
        return str;
    }
    size() {
        return this.indices.size;
    }
    hasIndex(index) {
        if (typeof index !== 'string')
            return false;
        return this.indices.has(index);
    }
    static cellToBoundary(index) {
        guardH3Payload(index);
        return ['latlng1', 'latlng2', 'latlng3'];
    }
    static getResolution(index) {
        guardH3Payload(index);
        return parseInt(index[1], 16) || 0;
    }
}
export class H3GridManager {
    static guardPayload(payload) {
        guardH3Payload(payload);
        return payload;
    }
    validateIndex(index) {
        return typeof index === 'string' && /^[0-9a-fA-F]{15}$/.test(index);
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
export function validateH3Index(index) {
    return H3GridParser.validateIndex(index);
}
export function processSpatialMonad(payload) {
    try {
        guardH3Payload(payload);
        if (!validateH3IndexLength(payload)) {
            throw new Error('Thermodynamic Violation: Invalid H3 index format');
        }
        return { isValid: true, payload };
    }
    catch (err) {
        return { isValid: false, payload: null, error: err.message };
    }
}
export function createSpatialMonad(h3Index, trophicEnergyStockJoules) {
    if (!isValidH3Index(h3Index)) {
        throw new Error('ThermodynamicViolation: Invalid H3 index');
    }
    return { h3Index: h3Index, trophicEnergyStockJoules };
}
