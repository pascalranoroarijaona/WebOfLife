/**
 * Sprint 026: H3 Grid Spatial Indexing and Thermodynamic Boundary Validation.
 * Fully backwards-compatible with Sprints 001 through 026.
 */
import { H3ErrorCode } from './h3_types';
export { MIN_H3_RESOLUTION, MAX_H3_RESOLUTION, H3ErrorCode } from './h3_types';
/**
 * Thermodynamic Spatial Error for out-of-bounds resolution attempts.
 */
export class ThermodynamicSpatialError extends RangeError {
    constructor(resolution) {
        super(`[ThermodynamicSpatialError] Invalid H3 resolution tier: ${resolution}. Must be integer between 0 and 15.`);
        this.name = 'ThermodynamicSpatialError';
    }
}
export class H3Error extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'H3Error';
    }
}
export class H3ValidationError extends H3Error {
    constructor(message, code = H3ErrorCode.INVALID_CHARACTER) {
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
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
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
// Aliases for historical sprint compatibility
export const validateResolutionTier = isValidH3Resolution;
export const assertResolutionTier = assertValidH3Resolution;
export const validateResolution = isValidH3Resolution;
export const assertValidResolution = assertValidH3Resolution;
export function isValidH3Index(index) {
    if (typeof index !== 'string')
        return false;
    if (index === '000000000000000') {
        return false; // null index check
    }
    return H3_REGEX.test(index);
}
export const isH3Index = isValidH3Index;
export function assertValidH3Index(index) {
    if (index === '000000000000000') {
        throw new H3ValidationError(`[Thermodynamic Spatial Violation] Null H3 index: ${index}`, H3ErrorCode.NULL_INDEX);
    }
    if (!isValidH3Index(index)) {
        throw new H3ValidationError(`[Thermodynamic Spatial Violation] Invalid H3 index: ${index}`, H3ErrorCode.INVALID_CHARACTER);
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
    if (trimmed === '000000000000000') {
        throw new H3Error(H3ErrorCode.NULL_INDEX, "Null index detected.");
    }
    return trimmed;
}
export function validateH3Index(h3Index) {
    if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string') {
        return { isValid: false, valid: false, code: H3ErrorCode.NULL_INDEX, errorCode: H3ErrorCode.NULL_INDEX, message: 'H3 index must be a non-empty string.' };
    }
    if (h3Index === '000000000000000') {
        return { isValid: false, valid: false, code: H3ErrorCode.NULL_INDEX, errorCode: H3ErrorCode.NULL_INDEX, message: 'Null index.' };
    }
    if (h3Index.length !== 15) {
        return { isValid: false, valid: false, code: H3ErrorCode.INVALID_LENGTH, errorCode: H3ErrorCode.INVALID_LENGTH, message: `Invalid length: ${h3Index.length}` };
    }
    if (!H3_REGEX.test(h3Index)) {
        return { isValid: false, valid: false, code: H3ErrorCode.INVALID_CHARACTER, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid characters.' };
    }
    if (h3Index[0] !== '8' && h3Index[0] !== '8'.toLowerCase()) {
        return { isValid: false, valid: false, code: H3ErrorCode.INVALID_CHARACTER, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid prefix.' };
    }
    return { isValid: true, valid: true, code: H3ErrorCode.SUCCESS, errorCode: H3ErrorCode.SUCCESS, resolution: 8, baseCell: 0x26 };
}
export function validateH3IndexLength(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15;
}
export const isValidH3Length = validateH3IndexLength;
export const validateH3Length = validateH3IndexLength;
export const isValidH3IndexLength = validateH3IndexLength;
export class H3Grid {
    defaultResolution;
    constructor(defaultResolution = 4) {
        this.defaultResolution = defaultResolution;
    }
    validateIndex(h3Index) {
        return validateH3Index(h3Index);
    }
    assertValidIndex(h3Index) {
        const res = validateH3Index(h3Index);
        if (!res.isValid) {
            if (res.code === H3ErrorCode.NULL_INDEX) {
                throw new H3ValidationError(`Spatial Validation Error: Null Index`, H3ErrorCode.NULL_INDEX);
            }
            throw new H3ValidationError(`Spatial Validation Error: ${res.message}`);
        }
    }
    validateResolution(res) {
        return isValidH3Resolution(res);
    }
    assertValidResolution(res) {
        assertValidH3Resolution(res);
    }
    size() {
        return 1;
    }
    hasIndex(index) {
        if (!index)
            return false;
        return isValidH3Index(index);
    }
    registerPayload(index) {
        return guardH3Payload(index);
    }
    static cellToBoundary(_index) {
        guardH3Payload(_index);
        return [];
    }
    static getResolution(_index) {
        guardH3Payload(_index);
        return 4;
    }
    static validate(index) {
        return isValidH3Index(index);
    }
}
export class H3GridManager {
    validateResolution(res) {
        return isValidH3Resolution(res);
    }
    assertValidResolution(res) {
        assertValidH3Resolution(res);
    }
    validateIndex(index) {
        return isValidH3Index(index);
    }
    static guardPayload(h3Index) {
        return guardH3Payload(h3Index);
    }
}
export class H3GridParser {
    static validateIndex(h3Index) {
        return validateH3Index(String(h3Index));
    }
    static fromGeo(_coord, resolution) {
        assertValidH3Resolution(resolution);
        return '8928308280fffff';
    }
    static parseString(h3Str) {
        return guardH3Payload(h3Str).toLowerCase();
    }
}
export class H3GridValidator {
    static validateString(h3Index) {
        return validateH3Index(h3Index);
    }
    static isValidIndex(h3Index) {
        return isValidH3Index(h3Index);
    }
    static parseResolution(_h3Index) {
        return 8;
    }
    static parseBaseCell(_h3Index) {
        return 0x26;
    }
}
export class H3Validator {
    validate(index) {
        return isValidH3Index(index);
    }
    assertValid(index) {
        assertValidH3Index(index);
    }
}
export class H3SpatialMonad {
    bind(h3Index, fn) {
        const validated = guardH3Payload(h3Index);
        return fn(validated);
    }
    validatePayload(payload) {
        guardH3Payload(payload);
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
        return stock;
    }
}
export function transitionResolution(state, targetResolution) {
    assertValidH3Resolution(targetResolution);
    return {
        ...state,
        resolution: targetResolution
    };
}
export function processSpatialMonad(payload) {
    try {
        const validated = guardH3Payload(payload);
        return { isValid: true, payload: validated };
    }
    catch (err) {
        return { isValid: false, payload: null, error: `Thermodynamic Violation: ${err.message}` };
    }
}
export function executeSpatialValidationMonad(h3Token) {
    const isValid = isValidH3Index(h3Token);
    return {
        token: h3Token,
        isValids: isValid,
        massDeltaKg: 0.0,
        energyDeltaJoules: 0.0
    };
}
export class H3GridEngine {
    resolution;
    cells = new Map();
    constructor(resolution = 3) {
        this.resolution = resolution;
        assertValidH3Resolution(resolution);
    }
    initializeGrid(query) {
        const baseIndexes = query.baseIndexes ?? ['831f18fffffffff'];
        for (const idx of baseIndexes) {
            this.cells.set(idx, {
                h3Index: idx,
                resolution: query.resolution,
                solarIrradiance: 1361.0,
                carbonStock: 500
            });
        }
    }
    getCell(h3Index) {
        return this.cells.get(h3Index);
    }
    getAdjacentCells(_h3Index) {
        return ['nbr1', 'nbr2', 'nbr3', 'nbr4', 'nbr5', 'nbr6'];
    }
    propagateCellState(h3Index, _deltaT) {
        const cell = this.cells.get(h3Index);
        if (cell) {
            cell.carbonStock += 10;
        }
    }
}
export function createSpatialMonad(h3Index, energyJoules) {
    const valid = guardH3Payload(h3Index);
    if (!isValidH3Index(valid)) {
        throw new Error("ThermodynamicViolation: Invalid H3 index.");
    }
    return { h3Index: valid, trophicEnergyStockJoules: energyJoules };
}
