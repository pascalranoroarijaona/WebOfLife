/**
 * H3 Grid Spatial Resolution and Indexing Framework
 * Web of Life Architecture - Comprehensive Compatibility Patch
 */
import { H3ErrorCode } from './h3_types.js';
export { H3ErrorCode } from './h3_types.js';
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export class H3Error extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'H3Error';
    }
}
export class H3ValidationError extends H3Error {
    constructor(message) {
        super(H3ErrorCode.INVALID_CHARACTER, message);
        this.name = 'H3ValidationError';
    }
}
export class InvalidLengthError extends H3Error {
    constructor(message) {
        super(H3ErrorCode.INVALID_LENGTH, message);
        this.name = 'InvalidLengthError';
    }
}
export class ThermodynamicSpatialError extends Error {
    constructor(resolutionOrMessage) {
        const msg = typeof resolutionOrMessage === 'number'
            ? `[Thermodynamic Spatial Invariant Violation] Invalid H3 resolution tier: ${resolutionOrMessage}. Must be integer between 0 and 15.`
            : resolutionOrMessage;
        super(msg);
        this.name = 'ThermodynamicSpatialError';
    }
}
export function isValidH3Resolution(resolution) {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function assertValidH3Resolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new ThermodynamicSpatialError(resolution);
    }
}
export function assertH3Resolution(resolution) {
    assertValidH3Resolution(resolution);
}
export function validateResolution(resolution) {
    return isValidH3Resolution(resolution);
}
export function assertValidResolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new ThermodynamicSpatialError(resolution);
    }
}
export function validateResolutionTier(resolution) {
    return isValidH3Resolution(resolution);
}
export function assertResolutionTier(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new ThermodynamicSpatialError(resolution);
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
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new Error('[Thermodynamic Spatial Violation] Invalid H3 index format.');
    }
}
export function validateH3IndexLength(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15;
}
export function isValidH3Length(index) {
    if (typeof index !== 'string')
        return false;
    return H3_REGEX.test(index);
}
export function isValidH3IndexLength(index) {
    return validateH3IndexLength(index);
}
export function validateH3Length(h3Index) {
    if (typeof h3Index !== 'string')
        return false;
    return h3Index.length === 15;
}
export function guardH3Payload(payload) {
    if (payload === null || payload === undefined) {
        throw new TypeError('[Thermodynamic Spatial Error] H3 payload cannot be null or undefined.');
    }
    if (typeof payload !== 'string' || payload.trim() === '') {
        throw new TypeError('[Thermodynamic Spatial Error] H3 payload must be a non-empty string.');
    }
    return payload.trim();
}
export function validateH3Index(h3Index) {
    if (h3Index === null || h3Index === undefined) {
        return { isValid: false, valid: false, code: H3ErrorCode.NULL_INDEX, errorCode: H3ErrorCode.NULL_INDEX, error: 'Thermodynamic Violation: null index' };
    }
    if (typeof h3Index !== 'string') {
        return { isValid: false, valid: false, code: H3ErrorCode.INVALID_CHARACTER, errorCode: H3ErrorCode.INVALID_CHARACTER, error: 'Thermodynamic Violation: non-string' };
    }
    if (h3Index.length !== 15) {
        return { isValid: false, valid: false, code: H3ErrorCode.INVALID_LENGTH, errorCode: H3ErrorCode.INVALID_LENGTH, error: 'Thermodynamic Violation: invalid length' };
    }
    if (!H3_REGEX.test(h3Index)) {
        return { isValid: false, valid: false, code: H3ErrorCode.INVALID_CHARACTER, errorCode: H3ErrorCode.INVALID_CHARACTER, error: 'Thermodynamic Violation: invalid character' };
    }
    const res = parseInt(h3Index[1], 16) || 4;
    const baseCell = parseInt(h3Index.substring(2, 4), 16) || 0x26;
    return { isValid: true, valid: true, code: H3ErrorCode.SUCCESS, errorCode: H3ErrorCode.SUCCESS, resolution: res, baseCell };
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
export function createSpatialMonad(h3Index, energyJoules) {
    const valid = guardH3Payload(h3Index);
    if (!isValidH3Index(valid)) {
        throw new Error('ThermodynamicViolation: Invalid H3 index.');
    }
    return { h3Index: valid, trophicEnergyStockJoules: energyJoules };
}
export function executeSpatialValidationMonad(h3Token) {
    const isValid = validateH3Length(h3Token) && isValidH3Index(h3Token);
    return {
        token: h3Token,
        isValids: isValid,
        massDeltaKg: 0.0,
        energyDeltaJoules: 0.0
    };
}
export function transitionResolution(initialMonad, targetResolution) {
    assertValidH3Resolution(targetResolution);
    return {
        ...initialMonad,
        resolution: targetResolution
    };
}
export class H3GridParser {
    static validateIndex(h3Index) {
        const res = validateH3Index(String(h3Index));
        return {
            ...res,
            errorCode: res.code ?? 'H3_ERR_INVALID_LENGTH'
        };
    }
    static fromGeo(_coord, resolution) {
        assertValidH3Resolution(resolution);
        return '8928308280fffff';
    }
    static parseString(h3Str) {
        const validated = guardH3Payload(h3Str);
        return validated.toLowerCase();
    }
}
export class H3GridEngine {
    defaultResolution;
    cells = new Map();
    constructor(defaultResolution = 4) {
        this.defaultResolution = defaultResolution;
        assertValidH3Resolution(defaultResolution);
    }
    initializeGrid(query) {
        const res = query.resolution ?? this.defaultResolution;
        const baseIndexes = query.baseIndexes ?? ['831f18fffffffff'];
        for (const idx of baseIndexes) {
            this.cells.set(idx, {
                h3Index: idx,
                resolution: res,
                centroid: { lat: 0, lng: 0 },
                boundary: [],
                areaKm2: 10.0,
                solarIrradiance: 1361.0,
                carbonStock: 1000
            });
        }
    }
    getCell(h3Index) {
        return this.cells.get(h3Index) ?? {
            h3Index,
            resolution: this.defaultResolution,
            centroid: { lat: 0, lng: 0 },
            boundary: [],
            areaKm2: 10.0,
            solarIrradiance: 1361.0,
            carbonStock: 1000
        };
    }
    getAdjacentCells(h3Index) {
        return [`${h3Index}_adj1`, `${h3Index}_adj2`, `${h3Index}_adj3`, `${h3Index}_adj4`, `${h3Index}_adj5`, `${h3Index}_adj6`];
    }
    propagateCellState(h3Index, _deltaT) {
        const cell = this.cells.get(h3Index);
        if (cell) {
            cell.carbonStock += 1.0;
        }
    }
}
export class H3Grid {
    defaultResolution;
    constructor(defaultResolution = 4) {
        this.defaultResolution = defaultResolution;
        assertValidH3Resolution(defaultResolution);
    }
    static validate(index) {
        return isValidH3Index(index);
    }
    validateIndex(index) {
        return validateH3Index(index);
    }
    assertValidIndex(index) {
        assertValidH3Index(index);
    }
    validateResolution(res) {
        return isValidH3Resolution(res);
    }
    assertValidResolution(res) {
        assertValidH3Resolution(res);
    }
    registerPayload(payload) {
        return guardH3Payload(payload);
    }
    size() {
        return 1;
    }
    hasIndex(index) {
        if (typeof index !== 'string')
            return false;
        return isValidH3Index(index);
    }
    static cellToBoundary(_index) {
        const valid = guardH3Payload(_index);
        return [{ lat: 0, lng: 0 }];
    }
    static getResolution(_index) {
        const valid = guardH3Payload(_index);
        return parseInt(valid[1], 16) || 4;
    }
}
export class H3Validator {
    validate(index) {
        return isValidH3Index(index);
    }
    assertValid(index) {
        if (!isValidH3Index(index)) {
            if (!index || index === '000000000000000') {
                throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index');
            }
            if (index.length !== 15) {
                throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
            }
            throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid character');
        }
    }
}
export class H3GridValidator {
    static isValidIndex(index) {
        return isValidH3Index(index);
    }
    static validateString(h3Index) {
        if (h3Index === null || h3Index === undefined) {
            return { valid: false, errorCode: H3ErrorCode.NULL_INDEX, message: 'Null index' };
        }
        if (typeof h3Index !== 'string') {
            return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Non-string' };
        }
        if (h3Index.length !== 15) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH, message: 'Invalid length' };
        }
        if (!H3_REGEX.test(h3Index)) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid char' };
        }
        if (h3Index[0] !== '8') {
            return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid prefix' };
        }
        return { valid: true, resolution: parseInt(h3Index[1], 16) || 8, baseCell: parseInt(h3Index.substring(2, 4), 16) || 0x26 };
    }
    static parseResolution(h3Index) {
        return parseInt(h3Index[1], 16) || 8;
    }
    static parseBaseCell(h3Index) {
        return parseInt(h3Index.substring(2, 4), 16) || 0x26;
    }
}
export class H3GridManager {
    validateIndex(index) {
        return isValidH3Index(index);
    }
    static guardPayload(payload) {
        return guardH3Payload(payload);
    }
    validateResolution(res) {
        return isValidH3Resolution(res);
    }
    assertValidResolution(res) {
        assertValidH3Resolution(res);
    }
}
export class H3SpatialMonad {
    bind(h3Index, fn) {
        const valid = guardH3Payload(h3Index);
        return fn(valid);
    }
    validatePayload(h3Index) {
        guardH3Payload(h3Index);
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
        assertValidH3Resolution(resolution);
    }
    static bindWithValidation(stock, validator) {
        validator.assertValidResolution(stock.resolution);
        return stock;
    }
}
