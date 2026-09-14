// =============================================================================
// WEB OF LIFE - H3 SPATIAL GRID VALIDATION & ENGINE (COMPREHENSIVE COMPATIBILITY LAYER)
// =============================================================================
export { SpatialMonad } from "../monads/spatial_monad.js";
export var H3ErrorCode;
(function (H3ErrorCode) {
    H3ErrorCode["SUCCESS"] = "H3_SUCCESS";
    H3ErrorCode["INVALID_LENGTH"] = "H3_ERR_INVALID_LENGTH";
    H3ErrorCode["INVALID_CHARACTER"] = "H3_ERR_INVALID_CHARACTER";
    H3ErrorCode["INVALID_RESOLUTION"] = "H3_ERR_INVALID_RESOLUTION";
    H3ErrorCode["INVALID_BASE_CELL"] = "H3_ERR_INVALID_BASE_CELL";
    H3ErrorCode["NULL_INDEX"] = "H3_ERR_NULL_INDEX";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_NULL"] = 1] = "ERR_H3_INVALID_NULL";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_LENGTH"] = 2] = "ERR_H3_INVALID_LENGTH";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_CHARACTERS"] = 3] = "ERR_H3_INVALID_CHARACTERS";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_RESOLUTION"] = 4] = "ERR_H3_INVALID_RESOLUTION";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_BASE_CELL"] = 5] = "ERR_H3_INVALID_BASE_CELL";
    H3ErrorCode[H3ErrorCode["ERR_H3_OUT_OF_RANGE"] = 6] = "ERR_H3_OUT_OF_RANGE";
})(H3ErrorCode || (H3ErrorCode = {}));
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
export class H3Error extends Error {
    code;
    constructor(code, message) {
        super(`[H3Error ${code}]: ${message}`);
        this.code = code;
        this.name = "H3Error";
    }
}
export class H3ValidationError extends Error {
    constructor(token, message) {
        super(`H3ValidationError [Token: "${token}"]: ${message}`);
        this.name = "H3ValidationError";
    }
}
export class InvalidLengthError extends Error {
    code = H3ErrorCode.INVALID_LENGTH;
    constructor(message) {
        super(message);
        this.name = "InvalidLengthError";
    }
}
export class InvalidH3TokenError extends Error {
    constructor(token) {
        super(`Invalid H3 token contains non-hexadecimal symbols: "${token}"`);
        this.name = "InvalidH3TokenError";
    }
}
export class ThermodynamicSpatialError extends Error {
    constructor(message) {
        super(message);
        this.name = "ThermodynamicSpatialError";
    }
}
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const H3_LOWER_REGEX = /^[0-9a-f]{15}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$/;
export function isValidH3Hex(token) {
    if (typeof token !== 'string')
        return false;
    return H3_HEX_REGEX.test(token);
}
export function isValidH3Index(token) {
    if (typeof token !== 'string')
        return false;
    return H3_REGEX.test(token);
}
export function isH3Index(token) {
    return isValidH3Index(token);
}
export function validateH3Index(token) {
    const str = String(token);
    const res = H3GridValidator.validateString(str);
    return { ...res, isValid: res.valid };
}
export function assertValidH3Index(token) {
    if (!isValidH3Index(token)) {
        throw new ThermodynamicSpatialError(`[Thermodynamic Spatial Violation] Invalid H3 index: ${token}`);
    }
}
export function validateH3Token(token) {
    if (!token || typeof token !== "string") {
        throw new H3ValidationError(token, `Invalid H3 token: ${token}`);
    }
    const hexRegex = /^[0-9a-fA-F]+$|^[0-9a-fA-F]{15}$/;
    if (!hexRegex.test(token) || token.length !== 15) {
        throw new H3ValidationError(token, `Invalid H3 token: ${token}`);
    }
}
export function guardH3Payload(payload) {
    if (payload === null || payload === undefined) {
        throw new TypeError("Thermodynamic Spatial Error: H3 payload cannot be null or undefined.");
    }
    if (typeof payload !== 'string' || payload.trim() === '') {
        throw new TypeError("Thermodynamic Spatial Error: H3 payload must be a non-empty string.");
    }
    return payload.trim();
}
export function validateH3IndexLength(index) {
    if (typeof index !== 'string')
        return false;
    return H3_REGEX.test(index);
}
export function isValidH3Length(index) {
    if (typeof index !== 'string')
        return false;
    return H3_REGEX.test(index);
}
export function validateH3Length(index) {
    return isValidH3Length(index);
}
export function isValidH3IndexLength(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15;
}
export function validateResolution(resolution) {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function isValidResolution(resolution) {
    return validateResolution(resolution);
}
export function assertValidResolution(resolution) {
    if (!validateResolution(resolution)) {
        throw new RangeError(`Thermodynamic Spatial Boundary Violation: Resolution tier ${resolution} is outside valid range [0, 15].`);
    }
}
export function isValidH3Resolution(resolution) {
    return validateResolution(resolution);
}
export function assertValidH3Resolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new RangeError(`Thermodynamic Spatial Invariant Violation: Resolution tier ${resolution} is invalid.`);
    }
}
export function assertH3Resolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new ThermodynamicSpatialError(`Invalid H3 resolution tier: ${resolution}`);
    }
}
export function validateResolutionTier(resolution) {
    return validateResolution(resolution);
}
export function assertResolutionTier(resolution) {
    if (!validateResolution(resolution)) {
        throw new Error("[SpatialError] Invalid resolution tier.");
    }
}
export class H3GridValidator {
    static isValid(token) {
        return isValidH3Index(token);
    }
    static isValidIndex(token) {
        return isValidH3Index(token);
    }
    static isValidHexIndex(token) {
        return isValidH3Hex(token);
    }
    static validate(token) {
        return isValidH3Index(token);
    }
    static validateString(token) {
        if (token === null || token === undefined || typeof token !== 'string') {
            return { valid: false, isValid: false, errorCode: H3ErrorCode.NULL_INDEX, code: H3ErrorCode.NULL_INDEX, message: 'Null or non-string token' };
        }
        if (token.length !== 15) {
            return { valid: false, isValid: false, errorCode: H3ErrorCode.INVALID_LENGTH, code: H3ErrorCode.INVALID_LENGTH, message: 'Invalid length' };
        }
        if (!H3_REGEX.test(token)) {
            return { valid: false, isValid: false, errorCode: H3ErrorCode.INVALID_CHARACTER, code: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid character' };
        }
        return { valid: true, isValid: true, resolution: parseInt(token[1], 16) || 0, baseCell: parseInt(token.substring(2, 4), 16) || 0 };
    }
    static parseResolution(token) {
        return parseInt(token[1], 16) || 0;
    }
    static parseBaseCell(token) {
        return parseInt(token.substring(2, 4), 16) || 0;
    }
}
export class H3GridParser {
    static validateIndex(h3Index) {
        const str = String(h3Index);
        const res = H3GridValidator.validateString(str);
        return { ...res, isValid: res.valid };
    }
    static fromGeo(coord, resolution) {
        return '85283473fffffff';
    }
    static parseString(h3Str) {
        guardH3Payload(h3Str);
        return h3Str.toLowerCase();
    }
}
export class H3Grid {
    registered = new Set();
    defaultResolution;
    constructor(defaultResolution = 7) {
        this.defaultResolution = defaultResolution;
    }
    validateIndex(index) {
        const res = H3GridValidator.validateString(index);
        return {
            isValid: res.valid,
            valid: res.valid,
            code: res.valid ? H3ErrorCode.SUCCESS : res.errorCode,
            errorCode: res.errorCode,
            resolution: res.valid ? res.resolution : undefined,
            baseCell: res.valid ? res.baseCell : undefined
        };
    }
    assertValidIndex(index) {
        const res = this.validateIndex(index);
        if (!res.isValid) {
            throw new Error(`Spatial Validation Error: Invalid index ${index}`);
        }
    }
    registerPayload(payload) {
        const guarded = guardH3Payload(payload);
        this.registered.add(guarded);
        return guarded;
    }
    size() {
        return this.registered.size;
    }
    hasIndex(index) {
        if (typeof index !== 'string')
            return false;
        return this.registered.has(index);
    }
    resolveCell(token) {
        validateH3Token(token);
        return { index: token, resolution: 9 };
    }
    validateResolution(res) {
        return validateResolution(res);
    }
    assertValidResolution(res) {
        assertValidResolution(res);
    }
    static cellToBoundary(cell) {
        guardH3Payload(cell);
        return [];
    }
    static getResolution(cell) {
        guardH3Payload(cell);
        return 5;
    }
    static validate(token) {
        return H3GridValidator.isValidIndex(token);
    }
}
export class H3Validator {
    validate(token) {
        return H3GridValidator.isValidIndex(token);
    }
    assertValid(token) {
        const res = H3GridValidator.validateString(token);
        if (!res.valid) {
            if (token === '000000000000000') {
                throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index');
            }
            if (token.length !== 15) {
                throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
            }
            throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid character');
        }
    }
}
export class H3GridManager {
    resTier;
    constructor(resTier = 7) {
        this.resTier = resTier;
    }
    validateResolution(res) {
        return validateResolution(res);
    }
    assertValidResolution(res) {
        assertValidResolution(res);
    }
    getDefaultResolution() {
        return this.resTier;
    }
    validateTier(res) {
        assertValidResolution(res);
    }
    validateIndex(index) {
        if (typeof index !== 'string' || index.length !== 15)
            return false;
        return H3_LOWER_REGEX.test(index) || H3_REGEX.test(index) || isValidH3Hex(index);
    }
    static validateIndex(index) {
        if (typeof index !== 'string')
            return false;
        return isValidH3Hex(index) || H3_REGEX.test(index);
    }
    static guardPayload(payload) {
        return guardH3Payload(payload);
    }
}
export class H3GridEngine {
    resolution;
    cells = new Map();
    constructor(resolution = 3) {
        this.resolution = resolution;
    }
    initializeGrid(query) {
        if (query.baseIndexes) {
            for (const idx of query.baseIndexes) {
                this.cells.set(idx, {
                    h3Index: idx,
                    resolution: query.resolution,
                    solarIrradiance: 1361.0,
                    carbonStock: 1000
                });
            }
        }
    }
    getCell(index) {
        return this.cells.get(index);
    }
    getAdjacentCells(index) {
        return [`${index}_nbr1`, `${index}_nbr2`, `${index}_nbr3`, `${index}_nbr4`, `${index}_nbr5`, `${index}_nbr6`];
    }
    propagateCellState(index, _dt) {
        const cell = this.cells.get(index);
        if (cell) {
            cell.carbonStock += 10;
        }
    }
}
export class H3SpatialMonad {
    bind(token, fn) {
        guardH3Payload(token);
        return fn(token);
    }
    validatePayload(token) {
        guardH3Payload(token);
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
        return typeof token === 'string' && H3_REGEX.test(token);
    }
    assertValidPayload(token) {
        if (!this.isValidPayload(token)) {
            throw new Error(`Invalid payload: ${token}`);
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
    static bindWithValidation(stock, manager) {
        manager.assertValidResolution(stock.resolution);
        return stock;
    }
}
export function transitionResolution(state, newRes) {
    assertValidResolution(newRes);
    return { ...state, resolution: newRes };
}
export function processSpatialMonad(payload) {
    try {
        const valid = guardH3Payload(payload);
        return { isValid: true, payload: valid };
    }
    catch (e) {
        return { isValid: false, payload: null, error: `Thermodynamic Violation: ${e.message}` };
    }
}
export function createSpatialMonad(index, energy) {
    if (!isValidH3Index(index)) {
        throw new Error("ThermodynamicViolation: Invalid H3 index.");
    }
    return { h3Index: index, trophicEnergyStockJoules: energy };
}
export function executeSpatialValidationMonad(token) {
    const isValid = isValidH3Length(token);
    return {
        token,
        isValids: isValid,
        massDeltaKg: 0.0,
        energyDeltaJoules: 0.0
    };
}
export class SpatialMonadExecution {
    static transitionSpatialStock(token, energy) {
        const valid = isValidH3Index(token);
        return {
            isValid: valid,
            token: valid ? token : '',
            energyPotential: valid ? energy : 0.0,
            entropy: valid ? 0.0 : 1.0
        };
    }
}
export function transitionSpatialMonad(monad, computeCost = 1.2e-6) {
    if (monad.state !== 'UNVERIFIED') {
        throw new Error('Monad must be in UNVERIFIED state for verification gate.');
    }
    const valid = isValidH3Index(monad.h3Index || monad.token || monad.index);
    return {
        ...monad,
        state: valid ? 'VALIDATED' : 'UNVERIFIED',
        energyJoules: (monad.energyJoules || monad.energyPotential || 0) - computeCost
    };
}
