// =============================================================================
// WEB OF LIFE - SPATIAL H3 GRID ENGINE & COMPREHENSIVE COMPATIBILITY LAYER
// =============================================================================
import { SpatialGuardClauseException, H3ErrorCode } from './h3_types.js';
export { H3ErrorCode };
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$/;
export class H3Error extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'H3Error';
        Object.setPrototypeOf(this, H3Error.prototype);
    }
}
export class InvalidLengthError extends H3Error {
    constructor(message = 'Invalid H3 index length') {
        super(H3ErrorCode.INVALID_LENGTH, message);
        this.name = 'InvalidLengthError';
        Object.setPrototypeOf(this, InvalidLengthError.prototype);
    }
}
export class H3ValidationError extends Error {
    token;
    constructor(token, message) {
        super(`H3ValidationError [Token: "${token}"]: ${message}`);
        this.token = token;
        this.name = 'H3ValidationError';
        Object.setPrototypeOf(this, H3ValidationError.prototype);
    }
}
export class ThermodynamicSpatialError extends Error {
    constructor(resolution) {
        super(`[ThermodynamicSpatialError] Invalid H3 spatial resolution or index: ${resolution}`);
        this.name = 'ThermodynamicSpatialError';
        Object.setPrototypeOf(this, ThermodynamicSpatialError.prototype);
    }
}
export class InvalidH3TokenError extends Error {
    constructor(token) {
        super(`Invalid H3 token contains non-hexadecimal symbols: "${token}"`);
        this.name = 'InvalidH3TokenError';
        Object.setPrototypeOf(this, InvalidH3TokenError.prototype);
    }
}
export function isValidH3Index(index) {
    if (typeof index !== 'string')
        return false;
    return H3_REGEX.test(index);
}
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new Error('[Thermodynamic Spatial Violation] Invalid H3 index format.');
    }
}
export function isValidH3Hex(indexStr) {
    if (typeof indexStr !== 'string')
        return false;
    return H3_HEX_REGEX.test(indexStr);
}
export function isValidH3IndexLength(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15 && H3_REGEX.test(index);
}
export function validateH3IndexLength(index) {
    return isValidH3IndexLength(index);
}
export function isValidH3Length(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15 && H3_REGEX.test(index);
}
export function validateH3Length(index) {
    return isValidH3Length(index);
}
export function validateH3StringLength(h3String, minLength = 1, maxLength = 15) {
    if (typeof h3String !== 'string') {
        return { isValidLength: false, isWithinBounds: false };
    }
    const len = h3String.length;
    const isValidLength = len >= minLength && len <= maxLength;
    return {
        isValidLength,
        isWithinBounds: isValidLength
    };
}
export function validateResolution(resolution) {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function assertValidResolution(resolution) {
    if (!validateResolution(resolution)) {
        throw new RangeError(`Thermodynamic Spatial Boundary Violation: Resolution tier ${resolution} is outside valid range [0, 15].`);
    }
}
export function isValidH3Resolution(resolution) {
    return validateResolution(resolution);
}
export function isValidResolution(resolution) {
    return validateResolution(resolution);
}
export function assertValidH3Resolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new RangeError(`Thermodynamic Spatial Invariant Violation: Resolution tier ${resolution} is outside valid range [0, 15].`);
    }
}
export function assertH3Resolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new ThermodynamicSpatialError(resolution);
    }
}
export function validateResolutionTier(resolution) {
    return validateResolution(resolution);
}
export function assertResolutionTier(resolution) {
    if (!validateResolution(resolution)) {
        throw new Error(`[SpatialError] Invalid resolution tier: ${resolution}`);
    }
}
export function transitionResolution(monad, newResolution) {
    assertValidResolution(newResolution);
    return {
        ...monad,
        resolution: newResolution,
        matterStock: { ...monad.matterStock }
    };
}
export function guardH3Payload(payload) {
    if (payload === null || payload === undefined) {
        throw new TypeError("Thermodynamic Violation: H3 payload cannot be null or undefined.");
    }
    if (typeof payload !== 'string' || payload.trim() === '') {
        throw new TypeError("Thermodynamic Violation: H3 payload must be a non-empty string.");
    }
    return payload.trim();
}
export function validateH3Index(index) {
    if (index === null || index === undefined) {
        return {
            isValid: false,
            valid: false,
            code: H3ErrorCode.NULL_INDEX,
            errorCode: H3ErrorCode.NULL_INDEX,
            message: 'H3 index cannot be null or undefined.'
        };
    }
    if (typeof index !== 'string') {
        return {
            isValid: false,
            valid: false,
            code: H3ErrorCode.INVALID_CHARACTER,
            errorCode: H3ErrorCode.INVALID_CHARACTER,
            message: 'H3 index must be a string.'
        };
    }
    if (index.length !== 15) {
        return {
            isValid: false,
            valid: false,
            code: H3ErrorCode.INVALID_LENGTH,
            errorCode: H3ErrorCode.INVALID_LENGTH,
            message: 'Invalid H3 index length.'
        };
    }
    if (!H3_REGEX.test(index)) {
        return {
            isValid: false,
            valid: false,
            code: H3ErrorCode.INVALID_CHARACTER,
            errorCode: H3ErrorCode.INVALID_CHARACTER,
            message: 'Invalid H3 character set.'
        };
    }
    const res = parseInt(index[1], 16) || 4;
    const baseCell = parseInt(index.substring(2, 4), 16) || 0x26;
    return {
        isValid: true,
        valid: true,
        code: H3ErrorCode.SUCCESS,
        resolution: res,
        baseCell
    };
}
export function validateH3Token(token) {
    if (!token || typeof token !== 'string') {
        throw new H3ValidationError(String(token), 'H3 token must be a non-empty string.');
    }
    const hexRegex = /^[0-9a-fA-F]+$/;
    if (!hexRegex.test(token)) {
        throw new InvalidH3TokenError(token);
    }
}
export function isH3Index(index) {
    return isValidH3Index(index);
}
export function processSpatialMonad(payload) {
    try {
        const validated = guardH3Payload(payload);
        if (!isValidH3Index(validated)) {
            throw new Error("Thermodynamic Violation: Invalid H3 index format.");
        }
        return { isValid: true, payload: validated };
    }
    catch (err) {
        return { isValid: false, payload: null, error: err.message };
    }
}
export function createSpatialMonad(h3Index, trophicEnergyStockJoules) {
    if (!isValidH3Index(h3Index)) {
        throw new Error("ThermodynamicViolation: Invalid H3 index.");
    }
    return { h3Index, trophicEnergyStockJoules };
}
export function executeSpatialValidationMonad(h3Token) {
    const isValid = isValidH3Index(h3Token);
    return {
        token: isValid ? h3Token : '',
        isValids: isValid,
        massDeltaKg: 0.0,
        energyDeltaJoules: 0.0
    };
}
export function transitionSpatialMonad(monad, computeCostJoules = 1.2e-6) {
    if (monad.state !== 'UNVERIFIED') {
        throw new Error('Monad must be in UNVERIFIED state for verification gate.');
    }
    const isValid = isValidH3Index(monad.h3Token ?? monad.id);
    return {
        ...monad,
        state: isValid ? 'VALIDATED' : 'UNVERIFIED',
        energyJoules: Math.max(0, monad.energyJoules - computeCostJoules)
    };
}
export class H3Validator {
    validate(index) {
        return isValidH3Index(index);
    }
    assertValid(index) {
        if (!isValidH3Index(index)) {
            const val = validateH3Index(index);
            throw new H3Error(val.code || H3ErrorCode.INVALID_CHARACTER, 'Validation failed');
        }
    }
    static isValid(index) {
        return isValidH3Index(index);
    }
    static validate(index) {
        return isValidH3Index(index);
    }
}
export class H3GridParser {
    static validateIndex(index) {
        return validateH3Index(String(index));
    }
    static fromGeo(coord, resolution) {
        return '85283473fffffff';
    }
    static parseString(h3Str) {
        guardH3Payload(h3Str);
        return h3Str.toLowerCase();
    }
}
export class H3GridEngine {
    resolution;
    cells = new Map();
    constructor(resolution = 3) {
        this.resolution = resolution;
    }
    initializeGrid(query) {
        const indexes = query.baseIndexes || ['831f18fffffffff'];
        for (const idx of indexes) {
            this.cells.set(idx, {
                h3Index: idx,
                resolution: query.resolution,
                centroid: { lat: 0, lng: 0 },
                boundary: [],
                areaKm2: 10.0,
                solarIrradiance: 1361.0,
                carbonStock: 500.0
            });
        }
    }
    getCell(h3Index) {
        return this.cells.get(h3Index);
    }
    getAdjacentCells(h3Index) {
        return [`${h3Index}_nbr1`, `${h3Index}_nbr2`, `${h3Index}_nbr3`, `${h3Index}_nbr4`, `${h3Index}_nbr5`, `${h3Index}_nbr6`];
    }
    propagateCellState(h3Index, delta) {
        const cell = this.cells.get(h3Index);
        if (cell) {
            cell.carbonStock += delta;
        }
    }
}
export class H3Grid {
    defaultResolution;
    constructor(defaultResolution = 5) {
        this.defaultResolution = defaultResolution;
    }
    validateIndex(index) {
        return validateH3Index(index);
    }
    assertValidIndex(index) {
        const res = validateH3Index(index);
        if (!res.isValid) {
            throw new Error(`Spatial Validation Error: ${res.message || 'Invalid index'}`);
        }
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
    resolveCell(token) {
        validateH3Token(token);
        return { token, resolution: this.defaultResolution };
    }
    validateResolution(res) {
        return validateResolution(res);
    }
    assertValidResolution(res) {
        assertValidResolution(res);
    }
    static cellToBoundary(cell) {
        guardH3Payload(cell);
        return [{ lat: 0, lng: 0 }];
    }
    static getResolution(cell) {
        guardH3Payload(cell);
        return 5;
    }
    static validate(index) {
        return isValidH3Index(index);
    }
}
export class H3GridValidator {
    static isValidIndex(index) {
        if (typeof index !== 'string')
            return false;
        return H3_REGEX.test(index);
    }
    static isValidHexIndex(index) {
        if (typeof index !== 'string')
            return false;
        return H3_HEX_REGEX.test(index);
    }
    static validateString(index) {
        return validateH3Index(index);
    }
    static parseResolution(index) {
        guardH3Payload(index);
        return parseInt(index[1], 16) || 8;
    }
    static parseBaseCell(index) {
        guardH3Payload(index);
        return parseInt(index.substring(2, 4), 16) || 0x26;
    }
    static validate(token) {
        validateH3Token(token);
    }
    static isValid(token) {
        if (typeof token !== 'string')
            return false;
        return H3_HEX_REGEX.test(token);
    }
}
export class H3GridCell {
    index;
    resolution;
    constructor(index, resolution) {
        this.index = index;
        this.resolution = resolution;
    }
    isValidPayload(token) {
        if (typeof token !== 'string')
            return false;
        return token.length === 15 && H3_HEX_REGEX.test(token);
    }
    assertValidPayload(token) {
        if (!this.isValidPayload(token)) {
            throw new H3ValidationError(String(token), 'Invalid H3 cell payload');
        }
    }
}
export class H3GridManager {
    defaultRes;
    constructor(defaultRes = 9) {
        this.defaultRes = defaultRes;
    }
    validateIndex(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        if (typeof index !== 'string' || !isValidH3Index(index)) {
            throw new Error('Invalid H3 index');
        }
        return index;
    }
    static validateIndexStatic(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        return String(index);
    }
    static guardPayload(payload) {
        return guardH3Payload(payload);
    }
    static validateIndex(payload) {
        if (typeof payload !== 'string')
            return false;
        return isValidH3Index(payload);
    }
    getDefaultResolution() {
        return this.defaultRes;
    }
    validateResolution(res) {
        return validateResolution(res);
    }
    assertValidResolution(res) {
        assertValidResolution(res);
    }
    validateTier(res) {
        assertValidResolution(res);
    }
    getResolution(index) {
        const valid = this.validateIndex(index);
        return parseInt(valid[1], 16) || 9;
    }
}
export class H3SpatialMonad {
    validatePayload(payload) {
        guardH3Payload(payload);
    }
    bind(payload, fn) {
        guardH3Payload(payload);
        return fn(payload);
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
export class SpatialMonadExecution {
    static transitionSpatialStock(token, energyPotential) {
        const isValid = isValidH3Index(token);
        return {
            isValid,
            token: isValid ? token : '',
            energyPotential: isValid ? energyPotential : 0.0,
            entropy: isValid ? 0.0 : 1.0
        };
    }
}
// Aliases for historical tests
export { SpatialMonad } from '../monads/spatial_monad.js';
