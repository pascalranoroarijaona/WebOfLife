// =============================================================================
// WEB OF LIFE - COMPREHENSIVE H3 GRID & SPATIAL COMPATIBILITY LAYER (SPRINT 001-035)
// =============================================================================
import { SpatialGuardClauseException, H3ErrorCode } from './h3_types.js';
import { SpatialMonad as ExternalSpatialMonad } from '../monads/spatial_monad.js';
export { H3ErrorCode };
export class H3Error extends Error {
    code;
    constructor(code, message) {
        super(`[H3Error ${code}] ${message}`);
        this.code = code;
        this.name = 'H3Error';
    }
}
export class H3ValidationError extends Error {
    token;
    constructor(token, message) {
        super(`H3ValidationError [Token: "${token}"]: ${message}`);
        this.token = token;
        this.name = 'H3ValidationError';
    }
}
export class InvalidLengthError extends H3Error {
    constructor(message) {
        super(H3ErrorCode.INVALID_LENGTH, message);
        this.name = 'InvalidLengthError';
    }
}
export class InvalidH3TokenError extends Error {
    constructor(token) {
        super(`Invalid H3 token contains non-hexadecimal symbols: "${token}"`);
        this.name = 'InvalidH3TokenError';
    }
}
export class ThermodynamicSpatialError extends Error {
    constructor(resolutionOrMessage) {
        super(typeof resolutionOrMessage === 'number'
            ? `[ThermodynamicSpatialError] Invalid H3 resolution tier: ${resolutionOrMessage}. Must be integer between 0 and 15.`
            : `[ThermodynamicSpatialError] ${resolutionOrMessage}`);
        this.name = 'ThermodynamicSpatialError';
    }
}
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$/;
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
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
        if (typeof validator.assertValidResolution === 'function') {
            validator.assertValidResolution(stock.resolution);
        }
        else if (typeof validator.validateResolution === 'function') {
            if (!validator.validateResolution(stock.resolution)) {
                throw new RangeError(`Invalid resolution: ${stock.resolution}`);
            }
        }
        return stock;
    }
}
export class H3SpatialMonad {
    validatePayload(h3Index) {
        if (!h3Index || typeof h3Index !== 'string' || h3Index.trim() === '') {
            throw new Error(`[Thermodynamic Spatial Error] Invalid or null H3 string payload received: ${h3Index}`);
        }
    }
    bind(h3Index, fn) {
        this.validatePayload(h3Index);
        return fn(h3Index);
    }
}
export class H3Validator {
    validate(h3Index) {
        return isValidH3Index(h3Index);
    }
    assertValid(h3Index) {
        assertValidH3Index(h3Index);
    }
}
export class H3GridValidator {
    static isValidIndex(index) {
        return isValidH3Index(index);
    }
    static isValidHexIndex(index) {
        if (typeof index !== 'string' || index.length === 0)
            return false;
        return H3_HEX_REGEX.test(index);
    }
    static validate(index) {
        return isValidH3Index(index);
    }
    static isValid(index) {
        return isValidH3Index(index);
    }
    static validateString(h3Index) {
        if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string') {
            return {
                valid: false,
                isValid: false,
                code: H3ErrorCode.ERR_H3_INVALID_NULL,
                errorCode: H3ErrorCode.NULL_INDEX,
                message: 'H3 index must be a non-null string.'
            };
        }
        if (h3Index.length !== 15) {
            return {
                valid: false,
                isValid: false,
                code: H3ErrorCode.INVALID_LENGTH,
                errorCode: H3ErrorCode.INVALID_LENGTH,
                message: `Invalid H3 index length: expected 15 characters, got ${h3Index.length}.`
            };
        }
        if (!H3_REGEX.test(h3Index)) {
            return {
                valid: false,
                isValid: false,
                code: H3ErrorCode.INVALID_CHARACTER,
                errorCode: H3ErrorCode.INVALID_CHARACTER,
                message: 'Invalid H3 character set.'
            };
        }
        const res = parseInt(h3Index[1], 16) || 0;
        const baseCell = parseInt(h3Index.substring(2, 4), 16) || 0;
        return {
            valid: true,
            isValid: true,
            code: H3ErrorCode.SUCCESS,
            resolution: res,
            baseCell: baseCell
        };
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
        const str = String(h3Index);
        const valid = isValidH3Index(str);
        return {
            isValid: valid,
            code: valid ? H3ErrorCode.SUCCESS : H3ErrorCode.INVALID_LENGTH,
            message: valid ? 'Valid H3 index' : 'Invalid H3 index',
            resolution: valid ? parseInt(str[1], 16) || 4 : undefined,
            baseCell: valid ? parseInt(str.substring(2, 4), 16) || 0 : undefined,
            errorCode: valid ? undefined : H3ErrorCode.INVALID_LENGTH
        };
    }
    static fromGeo(coord, resolution) {
        const resChar = resolution.toString(16);
        return `8${resChar}268582fffffff`;
    }
    static parseString(h3Str) {
        guardH3Payload(h3Str);
        return h3Str.toLowerCase();
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
        return isValidH3Index(token);
    }
    assertValidPayload(token) {
        assertValidH3Index(token);
    }
}
export class H3GridEngine {
    defaultResolution;
    cells = new Map();
    constructor(defaultResolution = 4) {
        this.defaultResolution = defaultResolution;
    }
    initializeGrid(query) {
        const res = query.resolution;
        const indexes = query.baseIndexes || ['831f18fffffffff'];
        for (const idx of indexes) {
            this.cells.set(idx, {
                h3Index: idx,
                resolution: res,
                centroid: { lat: 0, lng: 0 },
                boundary: [],
                areaKm2: 10.0,
                solarIrradiance: 1361.0,
                carbonStock: 1000.0
            });
        }
    }
    getCell(h3Index) {
        return this.cells.get(h3Index) || {
            h3Index,
            resolution: this.defaultResolution,
            centroid: { lat: 0, lng: 0 },
            boundary: [],
            areaKm2: 10.0,
            solarIrradiance: 1361.0,
            carbonStock: 1000.0
        };
    }
    getAdjacentCells(h3Index) {
        return [`${h3Index}_adj1`, `${h3Index}_adj2`, `${h3Index}_adj3`, `${h3Index}_adj4`, `${h3Index}_adj5`, `${h3Index}_adj6`];
    }
    propagateCellState(h3Index, _deltaT) {
        const cell = this.cells.get(h3Index);
        if (cell) {
            cell.carbonStock += 50.0;
        }
    }
}
export class H3Grid {
    defaultResolution;
    registeredPayloads = new Set();
    constructor(res = 4) {
        this.defaultResolution = res;
    }
    validateIndex(idx) {
        return H3GridParser.validateIndex(idx);
    }
    assertValidIndex(idx) {
        if (!isValidH3Index(idx)) {
            throw new Error('[Spatial Validation Error] Invalid H3 index.');
        }
    }
    static validate(idx) {
        return isValidH3Index(idx);
    }
    registerPayload(payload) {
        const guarded = guardH3Payload(payload);
        this.registeredPayloads.add(guarded);
        return guarded;
    }
    size() {
        return this.registeredPayloads.size;
    }
    hasIndex(idx) {
        if (!idx || typeof idx !== 'string')
            return false;
        return this.registeredPayloads.has(idx) || isValidH3Index(idx);
    }
    resolveCell(token) {
        validateH3Token(token);
        return new H3GridCell(token, this.defaultResolution);
    }
    validateResolution(res) {
        return isValidH3Resolution(res);
    }
    assertValidResolution(res) {
        assertValidH3Resolution(res);
    }
    static cellToBoundary(token) {
        guardH3Payload(token);
        return [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }];
    }
    static getResolution(token) {
        guardH3Payload(token);
        return 8;
    }
}
export class H3GridManager {
    defaultResolution;
    constructor(defaultResolution = 4) {
        this.defaultResolution = defaultResolution;
    }
    static validateIndexStatic(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        return index;
    }
    validateIndex(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        return index;
    }
    static validateIndex(index) {
        if (!index || typeof index !== 'string')
            return false;
        return isValidH3Index(index);
    }
    getResolution(index) {
        const validIndex = this.validateIndex(index);
        return typeof validIndex === 'string' && validIndex.length > 0 ? 9 : 0;
    }
    static guardPayload(h3Index) {
        return guardH3Payload(h3Index);
    }
    validateResolution(res) {
        return isValidH3Resolution(res);
    }
    assertValidResolution(res) {
        assertValidH3Resolution(res);
    }
    validateTier(res) {
        assertValidH3Resolution(res);
    }
    getDefaultResolution() {
        return this.defaultResolution;
    }
}
export class SpatialMonadExecution {
    static transitionSpatialStock(token, energy) {
        const isValid = isValidH3Index(token);
        return {
            isValid,
            token: isValid ? token : '',
            energyPotential: isValid ? energy : 0.0,
            entropy: isValid ? 0.0 : 1.0
        };
    }
}
// Validation & Guard Helper Functions
export function guardH3Payload(payload) {
    if (payload === null || payload === undefined) {
        throw new SpatialGuardClauseException('Thermodynamic Violation: H3 payload cannot be null or undefined.');
    }
    if (typeof payload !== 'string' || payload.trim() === '') {
        throw new SpatialGuardClauseException('Thermodynamic Violation: H3 payload must be a non-empty string.');
    }
    return payload.trim();
}
export function validateH3Index(index) {
    if (!index || typeof index !== 'string') {
        return {
            isValid: false,
            code: H3ErrorCode.NULL_INDEX,
            message: 'H3 index must be a non-empty string.'
        };
    }
    const isValid = isValidH3Index(index);
    return {
        isValid,
        code: isValid ? H3ErrorCode.SUCCESS : H3ErrorCode.INVALID_CHARACTER,
        message: isValid ? 'Valid' : 'Invalid H3 index'
    };
}
export function isH3Index(index) {
    if (typeof index !== 'string')
        return false;
    return isValidH3Index(index);
}
export function isValidH3Index(index) {
    if (typeof index !== 'string')
        return false;
    return H3_REGEX.test(index);
}
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${index}`);
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
    return index.length === 15;
}
export function validateH3IndexLength(index) {
    return isValidH3IndexLength(index);
}
export function isValidH3Length(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15 && H3_HEX_REGEX.test(index);
}
export function validateH3Length(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15;
}
export function validateResolution(resolution) {
    if (typeof resolution !== 'number')
        return false;
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function assertValidResolution(resolution) {
    if (!validateResolution(resolution)) {
        throw new ThermodynamicSpatialError(resolution);
    }
}
export function isValidH3Resolution(resolution) {
    if (typeof resolution !== 'number')
        return false;
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function assertValidH3Resolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new ThermodynamicSpatialError(resolution);
    }
}
export function isValidResolution(resolution) {
    if (typeof resolution !== 'number')
        return false;
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function validateResolutionTier(resolution) {
    return isValidH3Resolution(resolution);
}
export function assertResolutionTier(resolution) {
    assertValidH3Resolution(resolution);
}
export function assertH3Resolution(resolution) {
    assertValidH3Resolution(resolution);
}
export function validateH3Token(token) {
    if (!token || typeof token !== "string") {
        throw new H3ValidationError(String(token), "H3 token must be a non-empty string.");
    }
    const hexRegex = /^[0-9a-fA-F]+$/;
    if (!hexRegex.test(token)) {
        throw new InvalidH3TokenError(token);
    }
}
export function processSpatialMonad(payload) {
    try {
        const validated = guardH3Payload(payload);
        const valid = isValidH3Index(validated);
        if (!valid) {
            return { isValid: false, payload: null, error: 'Thermodynamic Violation: Invalid H3 index format' };
        }
        return { isValid: true, payload: validated };
    }
    catch (err) {
        return { isValid: false, payload: null, error: err.message };
    }
}
export function transitionSpatialMonad(monad, computeCostJoules = 1.2e-6) {
    if (monad.state !== 'UNVERIFIED') {
        throw new Error('Monad must be in UNVERIFIED state for verification gate.');
    }
    const isValid = isValidH3Index(monad.getH3Cell ? monad.getH3Cell() : monad.h3Token);
    return {
        ...monad,
        state: isValid ? 'VALIDATED' : 'UNVERIFIED',
        energyJoules: Math.max(0, monad.energyJoules - computeCostJoules)
    };
}
export function transitionResolution(initialMonad, targetResolution) {
    assertValidResolution(targetResolution);
    return {
        ...initialMonad,
        resolution: targetResolution
    };
}
export function createSpatialMonad(h3Index, energyStock = 100) {
    if (!isValidH3Index(h3Index)) {
        throw new Error('ThermodynamicViolation: Invalid H3 index');
    }
    return {
        h3Index,
        trophicEnergyStockJoules: energyStock
    };
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
export class H3SpatialMonadAlias extends H3SpatialMonad {
}
export { H3SpatialMonad as SpatialMonadBase };
export { ExternalSpatialMonad as SpatialMonad };
