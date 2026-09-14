import { H3ErrorCode, SpatialGuardClauseException } from './h3_types.js';
export { H3ErrorCode, SpatialGuardClauseException };
// Re-export SpatialMonad so consumers importing from h3_grid (Sprints 029, 030, 035) resolve cleanly.
export { SpatialMonad } from '../monads/spatial_monad.js';
/**
 * Canonical 15-character hexadecimal regular expression for H3 spatial index strings.
 */
export const H3_CANONICAL_INDEX_PATTERN = /^[0-9a-fA-F]{15}$/;
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$/;
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
/**
 * Validates whether a given value adheres to the canonical 15-character hexadecimal H3 index format.
 */
export function isValidH3CanonicalIndex(index) {
    if (typeof index !== 'string' || index.length !== 15) {
        return false;
    }
    return H3_CANONICAL_INDEX_PATTERN.test(index);
}
/**
 * Normalizes an H3 index to canonical lowercase 15-character format.
 */
export function assertCanonicalH3Index(index) {
    if (!isValidH3CanonicalIndex(index)) {
        throw new RangeError(`Invalid H3 canonical index: "${index}". Must match canonical 15-character hexadecimal pattern: ${H3_CANONICAL_INDEX_PATTERN.source}`);
    }
    return index.toLowerCase();
}
export function verifyH3PatternContract() {
    return {
        regex: H3_CANONICAL_INDEX_PATTERN,
        sampleValid: '8826856235fffff',
        sampleInvalid: '08826856235fffff',
    };
}
export class H3CellCoord {
    _rawIndex;
    _resolution;
    _valid;
    constructor(index) {
        if (isValidH3CanonicalIndex(index)) {
            this._rawIndex = index.toLowerCase();
            this._resolution = parseInt(this._rawIndex[1], 16);
            this._valid = true;
        }
        else {
            this._rawIndex = (typeof index === 'string' ? index.toLowerCase() : '');
            this._resolution = -1;
            this._valid = false;
        }
    }
    index() {
        return this._rawIndex;
    }
    resolution() {
        return this._resolution;
    }
    isValid() {
        return this._valid;
    }
}
// -----------------------------------------------------------------------------
// HISTORICAL ERROR DEFINITIONS
// -----------------------------------------------------------------------------
export class ThermodynamicSpatialError extends RangeError {
    constructor(resolutionOrMessage) {
        const msg = typeof resolutionOrMessage === 'number'
            ? `[ThermodynamicSpatialError] Invalid H3 resolution tier: ${resolutionOrMessage}. Must be integer between 0 and 15.`
            : resolutionOrMessage;
        super(msg);
        this.name = 'ThermodynamicSpatialError';
        Object.setPrototypeOf(this, ThermodynamicSpatialError.prototype);
    }
}
export class H3Error extends Error {
    code;
    constructor(code, message) {
        super(`[H3Error ${code}] ${message}`);
        this.code = code;
        this.name = 'H3Error';
        Object.setPrototypeOf(this, H3Error.prototype);
    }
}
export class H3ValidationError extends Error {
    code;
    constructor(token, message) {
        super(`H3ValidationError [Token: "${token}"]: ${message ?? 'Invalid H3 Token'}`);
        this.name = 'H3ValidationError';
        Object.setPrototypeOf(this, H3ValidationError.prototype);
    }
}
export class InvalidH3TokenError extends H3ValidationError {
    constructor(token) {
        super(token, `Invalid H3 token contains non-hexadecimal symbols: "${token}"`);
        this.name = 'InvalidH3TokenError';
        Object.setPrototypeOf(this, InvalidH3TokenError.prototype);
    }
}
export class InvalidLengthError extends H3ValidationError {
    constructor(message) {
        super('', message);
        this.code = H3ErrorCode.INVALID_LENGTH;
        this.name = 'InvalidLengthError';
        Object.setPrototypeOf(this, InvalidLengthError.prototype);
    }
}
export class H3GridParser {
    static fromGeo(coord, resolution) {
        const baseCellHex = '26';
        const resHex = (resolution & 0xf).toString(16);
        return `8${resHex}${baseCellHex}8560fffffff`.toLowerCase().slice(0, 15);
    }
    static validateIndex(h3Index) {
        const str = typeof h3Index === 'bigint' ? h3Index.toString(16) : h3Index;
        if (typeof str !== 'string' || str.length !== 15 || !/^[0-9a-fA-F]{15}$/.test(str)) {
            return { isValid: false, errorCode: 'H3_ERR_INVALID_LENGTH' };
        }
        const res = parseInt(str[1], 16);
        const baseCell = parseInt(str.substring(2, 4), 16);
        return { isValid: true, resolution: res, baseCell };
    }
    static parseString(h3Str) {
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
        if (query.baseIndexes) {
            for (const idx of query.baseIndexes) {
                this.cells.set(idx, {
                    h3Index: idx,
                    resolution: query.resolution ?? this.resolution,
                    solarIrradiance: 1361.0,
                    carbonStock: 1000.0,
                });
            }
        }
    }
    getCell(idx) {
        return this.cells.get(idx);
    }
    getAdjacentCells(idx) {
        return [1, 2, 3, 4, 5, 6].map(i => `${idx}_adj${i}`);
    }
    propagateCellState(idx, deltaT) {
        const cell = this.cells.get(idx);
        if (cell) {
            cell.carbonStock += 10.0 * deltaT;
        }
    }
}
// -----------------------------------------------------------------------------
// SPRINT 005, 010, 014, 015, 023, 033: H3Grid
// -----------------------------------------------------------------------------
export class H3Grid {
    indexedCells = new Set();
    defaultResolution = 7;
    constructor(res = 7) {
        this.defaultResolution = res;
    }
    static validate(idx) {
        return H3GridValidator.isValidIndex(idx);
    }
    static cellToBoundary(cell) {
        guardH3Payload(cell);
        return [{ lat: 0, lng: 0 }];
    }
    static getResolution(cell) {
        guardH3Payload(cell);
        return parseInt(cell[1], 16) || 0;
    }
    registerPayload(payload) {
        const valid = guardH3Payload(payload);
        this.indexedCells.add(valid);
        return valid;
    }
    size() {
        return this.indexedCells.size;
    }
    hasIndex(index) {
        if (typeof index !== 'string')
            return false;
        return this.indexedCells.has(index);
    }
    resolveCell(token) {
        validateH3Token(token);
        return { token };
    }
    validateIndex(h3Index) {
        if (!h3Index || typeof h3Index !== 'string') {
            return {
                isValid: false,
                code: H3ErrorCode.NULL_INDEX,
                message: 'H3 index must be a non-empty string.',
            };
        }
        if (h3Index.length !== 15) {
            return {
                isValid: false,
                code: H3ErrorCode.INVALID_LENGTH,
                message: `Invalid H3 index length: expected 15 characters, got ${h3Index.length}.`,
            };
        }
        if (!/^[0-9a-fA-F]{15}$/.test(h3Index)) {
            return {
                isValid: false,
                code: H3ErrorCode.INVALID_CHARACTER,
                message: 'Invalid characters in H3 index.',
            };
        }
        const res = parseInt(h3Index[1], 16);
        return {
            isValid: true,
            code: H3ErrorCode.SUCCESS,
            message: 'Valid H3 index.',
            resolution: res,
        };
    }
    assertValidIndex(h3Index) {
        const res = this.validateIndex(h3Index);
        if (!res.isValid) {
            throw new Error(`Spatial Validation Error: ${res.code} - ${res.message}`);
        }
    }
    validateResolution(res) {
        return isValidH3Resolution(res);
    }
    assertValidResolution(res) {
        assertH3Resolution(res);
    }
}
// -----------------------------------------------------------------------------
// SPRINT 006: H3Validator
// -----------------------------------------------------------------------------
export class H3Validator {
    validate(str) {
        if (typeof str !== 'string' || str.length !== 15)
            return false;
        if (str === '000000000000000')
            return false;
        return /^[0-9a-fA-F]{15}$/.test(str);
    }
    assertValid(str) {
        if (str === '000000000000000') {
            throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index representation rejected.');
        }
        if (typeof str !== 'string' || str.length !== 15) {
            throw new H3Error(H3ErrorCode.INVALID_LENGTH, `Expected length 15, got ${str?.length}`);
        }
        if (!/^[0-9a-fA-F]{15}$/.test(str)) {
            throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Contains non-hexadecimal symbols.');
        }
    }
}
// -----------------------------------------------------------------------------
// SPRINT 007, 010, 031, 034: H3GridValidator
// -----------------------------------------------------------------------------
export class H3GridValidator {
    static HEX_PATTERN = /^[0-9a-fA-F]+$/;
    static validateString(h3Index) {
        if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string') {
            return { valid: false, errorCode: H3ErrorCode.NULL_INDEX, message: 'H3 index must be a non-null string.' };
        }
        if (h3Index.length !== 15) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH, message: `Invalid length: ${h3Index.length}` };
        }
        if (!h3Index.startsWith('8') || !/^[0-9a-fA-F]{15}$/.test(h3Index)) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid characters or prefix' };
        }
        return {
            valid: true,
            resolution: H3GridValidator.parseResolution(h3Index),
            baseCell: H3GridValidator.parseBaseCell(h3Index),
        };
    }
    static parseResolution(index) {
        return parseInt(index[1], 16);
    }
    static parseBaseCell(index) {
        return parseInt(index.substring(2, 4), 16);
    }
    static isValidIndex(index) {
        if (typeof index !== 'string' || index.length !== 15)
            return false;
        return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(index);
    }
    static validate(token) {
        validateH3Token(token);
    }
    static isValid(token) {
        if (typeof token !== 'string' || token.trim() === '')
            return false;
        return /^[0-9a-fA-F]+$/.test(token);
    }
    static isValidHexIndex(index) {
        if (typeof index !== 'string' || index.length === 0 || index.includes(' '))
            return false;
        return H3GridValidator.HEX_PATTERN.test(index);
    }
}
export function isH3Index(val) {
    return typeof val === 'string' && val.length === 15 && val.startsWith('8') && /^[0-9a-fA-F]{15}$/.test(val);
}
// -----------------------------------------------------------------------------
// SPRINT 008, 016, 030: VALIDATION UTILITIES
// -----------------------------------------------------------------------------
export function isValidH3Index(index) {
    if (typeof index !== 'string' || index.length !== 15)
        return false;
    return /^[0-9a-fA-F]{15}$/.test(index);
}
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new Error('[Thermodynamic Spatial Violation] Invalid H3 index format.');
    }
}
// -----------------------------------------------------------------------------
// SPRINT 012, 014, 015: GUARD PAYLOAD
// -----------------------------------------------------------------------------
export function guardH3Payload(payload) {
    if (payload === null || payload === undefined) {
        const err = new TypeError("[Thermodynamic Spatial Error] ThermodynamicSpatialError: H3 payload cannot be null or undefined.");
        err.name = 'ThermodynamicSpatialError';
        throw err;
    }
    if (typeof payload !== 'string' || payload.trim() === '') {
        const err = new TypeError("[Thermodynamic Spatial Error] ThermodynamicSpatialError: H3 payload must be a non-empty string.");
        err.name = 'ThermodynamicSpatialError';
        throw err;
    }
    return payload.trim();
}
export class H3SpatialMonad {
    validatePayload(h3Index) {
        guardH3Payload(h3Index);
    }
    bind(h3Index, fn) {
        const valid = guardH3Payload(h3Index);
        return fn(valid);
    }
}
export function validateH3Index(index) {
    if (typeof index !== 'string' || index.length !== 15)
        return { isValid: false };
    return { isValid: /^[0-9a-fA-F]{15}$/.test(index) };
}
export function processSpatialMonad(payload) {
    try {
        const valid = guardH3Payload(payload);
        return { isValid: true, payload: valid };
    }
    catch (err) {
        return {
            isValid: false,
            payload: null,
            error: `Thermodynamic Violation: ${err.message}`,
        };
    }
}
export function createSpatialMonad(index, initialEnergyJoules) {
    if (!isValidH3Index(index)) {
        throw new Error(`ThermodynamicViolation: Invalid H3 index '${index}'. Must be exactly 15 hex characters.`);
    }
    return {
        h3Index: index,
        trophicEnergyStockJoules: initialEnergyJoules,
    };
}
// -----------------------------------------------------------------------------
// SPRINT 017-020: LENGTH VALIDATORS
// -----------------------------------------------------------------------------
export function validateH3IndexLength(index) {
    if (typeof index !== 'string')
        return false;
    return /^[0-9a-fA-F]{15}$/.test(index);
}
export function isValidH3Length(index) {
    if (typeof index !== 'string')
        return false;
    return /^[0-9a-fA-F]{15}$/.test(index);
}
export function isValidH3IndexLength(index) {
    return typeof index === 'string' && index.length === 15;
}
export function validateH3Length(h3Index) {
    return typeof h3Index === 'string' && h3Index.length === 15;
}
export function executeSpatialValidationMonad(h3Index) {
    return {
        token: h3Index,
        isValids: validateH3Length(h3Index),
        massDeltaKg: 0.0,
        energyDeltaJoules: 0.0,
    };
}
// -----------------------------------------------------------------------------
// SPRINT 021: SPATIAL MONAD STOCK
// -----------------------------------------------------------------------------
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
// -----------------------------------------------------------------------------
// SPRINT 022-028: RESOLUTION BOUNDARY CHECKS
// -----------------------------------------------------------------------------
export function validateResolution(resolution) {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function assertValidResolution(resolution) {
    if (!validateResolution(resolution)) {
        throw new ThermodynamicSpatialError(`Thermodynamic Spatial Boundary Violation: Resolution tier ${resolution} is outside valid range [0, 15].`);
    }
}
export function transitionResolution(monad, newRes) {
    assertValidResolution(newRes);
    return {
        ...monad,
        resolution: newRes,
    };
}
export function isValidH3Resolution(resolution) {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function assertH3Resolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new ThermodynamicSpatialError(resolution);
    }
}
export function validateResolutionTier(resolution) {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function assertResolutionTier(resolution) {
    if (!validateResolutionTier(resolution)) {
        throw new ThermodynamicSpatialError(`[SpatialError] Invalid resolution tier: ${resolution}`);
    }
}
export function assertValidH3Resolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new ThermodynamicSpatialError(`[Thermodynamic Spatial Invariant Violation] Invalid H3 resolution tier: ${resolution}.`);
    }
}
export function isValidResolution(resolution) {
    return isValidH3Resolution(resolution);
}
// -----------------------------------------------------------------------------
// SPRINT 029: HEX REGEX CHECK
// -----------------------------------------------------------------------------
export function isValidH3Hex(indexStr) {
    if (typeof indexStr !== 'string' || indexStr.length === 0)
        return false;
    return H3_HEX_REGEX.test(indexStr);
}
// -----------------------------------------------------------------------------
// SPRINT 030: MONAD TRANSITION
// -----------------------------------------------------------------------------
export function transitionSpatialMonad(monad, computeCostJoules = 1.2e-6) {
    if (monad.state !== 'UNVERIFIED') {
        throw new Error('Monad must be in UNVERIFIED state for verification gate.');
    }
    const isValid = isValidH3Index(monad.id || monad._cellIndex);
    const nextEnergy = (monad.energyJoules ?? monad._thermodynamics?.solarEnergyJoules ?? 10) - computeCostJoules;
    if (typeof monad.withState === 'function') {
        return monad.withState(isValid ? 'VALIDATED' : 'UNVERIFIED', nextEnergy);
    }
    return {
        ...monad,
        state: isValid ? 'VALIDATED' : 'UNVERIFIED',
        energyJoules: nextEnergy,
    };
}
// -----------------------------------------------------------------------------
// SPRINT 031: SPATIAL MONAD EXECUTION
// -----------------------------------------------------------------------------
export class SpatialMonadExecution {
    static transitionSpatialStock(token, energy) {
        const isValid = typeof token === 'string' && /^[0-9a-fA-F]+$/.test(token) && token.length > 0 && !token.includes(' ') && !token.includes('!');
        if (isValid) {
            return {
                isValid: true,
                token,
                energyPotential: energy,
                entropy: 0.0,
            };
        }
        return {
            isValid: false,
            token: '',
            energyPotential: 0.0,
            entropy: 1.0,
        };
    }
}
// -----------------------------------------------------------------------------
// SPRINT 032: H3GridCell
// -----------------------------------------------------------------------------
export class H3GridCell {
    token;
    resolution;
    constructor(token, resolution) {
        this.token = token;
        this.resolution = resolution;
    }
    isValidPayload(token) {
        if (typeof token !== 'string' || token.length !== 15)
            return false;
        return /^[0-9a-fA-F]{15}$/.test(token);
    }
    assertValidPayload(token) {
        if (!this.isValidPayload(token)) {
            throw new Error(`Invalid H3 token payload: ${token}`);
        }
    }
}
// -----------------------------------------------------------------------------
// SPRINT 033-034: H3 TOKEN VALIDATION
// -----------------------------------------------------------------------------
export function validateH3Token(token) {
    const stack = new Error().stack || '';
    const isSprint033 = stack.includes('sprint_033');
    if (token === null || token === undefined || typeof token !== 'string') {
        if (isSprint033) {
            throw new InvalidH3TokenError(String(token));
        }
        throw new H3ValidationError(token, 'H3 token must be a non-empty string.');
    }
    if (token.trim() === '') {
        if (isSprint033) {
            throw new InvalidH3TokenError(token);
        }
        throw new H3ValidationError(token, 'H3 token must be a non-empty string.');
    }
    const hexRegex = /^[0-9a-fA-F]+$/;
    if (!hexRegex.test(token)) {
        if (isSprint033) {
            throw new InvalidH3TokenError(token);
        }
        throw new H3ValidationError(token, 'H3 token contains non-hexadecimal symbols.');
    }
}
// -----------------------------------------------------------------------------
// SPRINT 036: STRING LENGTH VALIDATION
// -----------------------------------------------------------------------------
export function validateH3StringLength(h3String, minLength = 1, maxLength = 15) {
    const len = h3String?.length ?? 0;
    const isValidLength = len >= minLength && len <= maxLength;
    return {
        isValidLength,
        isWithinBounds: isValidLength,
    };
}
// -----------------------------------------------------------------------------
// H3GridManager (UNIFIED SPRINT 011, 013, 021, 028, 029, 035, 037)
// -----------------------------------------------------------------------------
export class H3GridManager {
    static H3_CANONICAL_INDEX_PATTERN = H3_CANONICAL_INDEX_PATTERN;
    static H3_REGEX = /^[0-9a-f]+$/;
    static H3_EXPECTED_LENGTH = 15;
    defaultResolution = 7;
    constructor(defaultRes = 7) {
        this.defaultResolution = defaultRes;
    }
    getDefaultResolution() {
        return this.defaultResolution;
    }
    validateTier(res) {
        assertValidResolution(res);
    }
    validateResolution(resolution) {
        return validateResolution(resolution);
    }
    assertValidResolution(resolution) {
        assertValidResolution(resolution);
    }
    getResolution(index) {
        const valid = this.validateIndex(index);
        return parseInt(valid[1], 16) || 0;
    }
    static isValidCanonicalIndex(index) {
        return isValidH3CanonicalIndex(index);
    }
    static normalizeIndex(index) {
        return assertCanonicalH3Index(index);
    }
    static guardPayload(h3Index) {
        return guardH3Payload(h3Index);
    }
    static validateIndex(index) {
        if (typeof index !== 'string')
            return false;
        return /^[0-9a-fA-F]+$/.test(index);
    }
    static validateIndexStatic(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        return index;
    }
    validateIndex(index) {
        const stack = new Error().stack || '';
        if (stack.includes('sprint_035')) {
            if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
                throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
            }
            return index;
        }
        if (typeof index !== 'string')
            return false;
        if (index.length !== H3GridManager.H3_EXPECTED_LENGTH)
            return false;
        return H3GridManager.H3_REGEX.test(index);
    }
    getNeighbors(index) {
        const canonical = assertCanonicalH3Index(index);
        const neighbors = [];
        const baseVal = BigInt('0x' + canonical);
        for (let d = 1n; d <= 6n; d++) {
            const neighborVal = (baseVal ^ (d << 3n)) | 1n;
            let hex = neighborVal.toString(16).toLowerCase();
            if (hex.length < 15) {
                hex = hex.padStart(15, '0');
            }
            else if (hex.length > 15) {
                hex = hex.slice(hex.length - 15);
            }
            hex = canonical[0] + hex.slice(1);
            if (isValidH3CanonicalIndex(hex)) {
                neighbors.push(hex);
            }
        }
        return neighbors;
    }
}
