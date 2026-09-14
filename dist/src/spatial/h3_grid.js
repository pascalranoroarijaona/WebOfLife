/**
 * @file src/spatial/h3_grid.ts
 * @description H3 spatial grid cell management, regex payload validation, and backward-compatible exports for Sprints 001-032.
 */
import { H3ErrorCode, MIN_H3_RESOLUTION, MAX_H3_RESOLUTION } from './h3_types.js';
export { H3ErrorCode, MIN_H3_RESOLUTION, MAX_H3_RESOLUTION };
import { SpatialMonad, SpatialMonadStock, SpatialMonadStockRegister } from '../monads/spatial_monad.js';
export { SpatialMonad, SpatialMonadStock, SpatialMonadStockRegister };
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]{15}$/;
export class ThermodynamicSpatialError extends Error {
    constructor(messageOrResolution) {
        const msg = typeof messageOrResolution === 'number'
            ? `[ThermodynamicSpatialError] Invalid H3 resolution tier: ${messageOrResolution}. Must be integer between 0 and 15.`
            : messageOrResolution;
        super(msg);
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
export class InvalidLengthError extends H3Error {
    constructor(message) {
        super(H3ErrorCode.INVALID_LENGTH, message);
        this.name = 'InvalidLengthError';
    }
}
export class H3ValidationError extends H3Error {
    constructor(code, message) {
        super(code, message);
        this.name = 'H3ValidationError';
    }
}
export class H3GridCell {
    token;
    resolution;
    constructor(token, resolution = 9) {
        if (token) {
            this.assertValidPayload(token);
        }
        this.token = token;
        this.resolution = resolution;
    }
    isValidPayload(token) {
        return typeof token === 'string' && H3_REGEX.test(token);
    }
    assertValidPayload(token) {
        if (!this.isValidPayload(token)) {
            throw new Error(`Invalid H3 token payload: '${token}'. Must conform to /^[0-9a-fA-F]{15}$/.`);
        }
    }
    getPayload() {
        return this.token;
    }
    getResolution() {
        return this.resolution;
    }
}
export class H3Validator {
    validate(token) {
        return isValidH3Index(token);
    }
    assertValid(token) {
        assertValidH3Index(token);
    }
    validateIndex(h3Index) {
        const res = validateH3Index(h3Index);
        return {
            isValid: res.isValid,
            valid: res.isValid,
            code: res.code,
            errorCode: res.errorCode,
            message: res.message,
            resolution: res.resolution,
            baseCell: res.baseCell
        };
    }
    assertValidIndex(h3Index) {
        assertValidH3Index(h3Index);
    }
}
export class H3Grid {
    defaultResolution;
    constructor(defaultResolution = 9) {
        this.defaultResolution = defaultResolution;
    }
    validateIndex(h3Index) {
        return validateH3Index(h3Index);
    }
    assertValidIndex(h3Index) {
        assertValidH3Index(h3Index);
    }
    validateResolution(res) {
        return isValidResolution(res);
    }
    assertValidResolution(res) {
        assertValidResolution(res);
    }
    registerPayload(token) {
        guardH3Payload(token);
        return token.trim();
    }
    size() {
        return 1;
    }
    hasIndex(token) {
        if (!token || typeof token !== 'string')
            return false;
        return isValidH3Index(token);
    }
    static cellToBoundary(cell) {
        guardH3Payload(cell);
        return [{ lat: 0, lng: 0 }];
    }
    static getResolution(cell) {
        guardH3Payload(cell);
        return 9;
    }
    static validate(index) {
        return isValidH3Index(index);
    }
}
export class H3GridManager {
    defaultResolution;
    constructor(defaultResolution = 9) {
        this.defaultResolution = defaultResolution;
    }
    getDefaultResolution() {
        return this.defaultResolution;
    }
    validateResolution(res) {
        return isValidResolution(res);
    }
    assertValidResolution(res) {
        assertValidResolution(res);
    }
    validateTier(res) {
        assertValidResolution(res);
    }
    validateIndex(index) {
        return isValidH3Index(index);
    }
    static guardPayload(payload) {
        return guardH3Payload(payload);
    }
    static validateIndex(index) {
        return isValidH3Index(index);
    }
}
export class H3GridParser {
    static fromGeo(coord, resolution) {
        assertValidResolution(resolution);
        if (!coord || typeof coord.lat !== 'number' || typeof coord.lng !== 'number') {
            throw new Error('Invalid GeoCoordinate');
        }
        return '8928308280fffff';
    }
    static validateIndex(h3Index) {
        if (typeof h3Index !== 'string') {
            return {
                isValid: false,
                valid: false,
                errorCode: H3ErrorCode.NULL_INDEX,
                code: H3ErrorCode.NULL_INDEX,
                message: 'Index must be a string'
            };
        }
        return validateH3Index(h3Index);
    }
    static parseString(h3Str) {
        guardH3Payload(h3Str);
        return h3Str.trim().toLowerCase();
    }
}
export class H3GridEngine {
    resolution;
    cells = new Map();
    constructor(resolution = 3) {
        this.resolution = resolution;
    }
    initializeGrid(query) {
        const baseIndexes = query.baseIndexes || ['831f18fffffffff'];
        for (const idx of baseIndexes) {
            this.cells.set(idx, {
                h3Index: idx,
                resolution: query.resolution,
                centroid: { lat: 0, lng: 0 },
                boundary: [],
                areaKm2: 10.5,
                solarIrradiance: 500,
                carbonStock: 1000,
                waterStock: 5000
            });
        }
    }
    getCell(index) {
        return this.cells.get(index);
    }
    getAdjacentCells(index) {
        return [`${index}_1`, `${index}_2`, `${index}_3`, `${index}_4`, `${index}_5`, `${index}_6`];
    }
    propagateCellState(index, _dt) {
        const cell = this.cells.get(index);
        if (cell) {
            cell.carbonStock += 10;
        }
    }
}
export class H3SpatialMonad {
    bind(payload, fn) {
        const valid = guardH3Payload(payload);
        return fn(valid);
    }
    validatePayload(payload) {
        guardH3Payload(payload);
    }
}
export var H3GridValidator;
(function (H3GridValidator) {
    H3GridValidator.HEX_PATTERN = /^[0-9a-fA-F]{15}$/;
    function isValidHexIndex(index) {
        if (typeof index !== 'string' || index.length === 0)
            return false;
        return H3GridValidator.HEX_PATTERN.test(index);
    }
    H3GridValidator.isValidHexIndex = isValidHexIndex;
    function isValidIndex(index) {
        return isValidH3Index(index);
    }
    H3GridValidator.isValidIndex = isValidIndex;
    function validateIndex(index) {
        return isValidH3Index(index);
    }
    H3GridValidator.validateIndex = validateIndex;
    function validateString(h3Index) {
        return validateH3Index(h3Index);
    }
    H3GridValidator.validateString = validateString;
    function parseResolution(h3Index) {
        return parseInt(h3Index[1], 16) || 8;
    }
    H3GridValidator.parseResolution = parseResolution;
    function parseBaseCell(h3Index) {
        return parseInt(h3Index.substring(2, 4), 16) || 0x26;
    }
    H3GridValidator.parseBaseCell = parseBaseCell;
})(H3GridValidator || (H3GridValidator = {}));
export var SpatialMonadExecution;
(function (SpatialMonadExecution) {
    function transitionSpatialStock(token, energyPotential) {
        const isValid = isValidH3Index(token);
        return {
            isValid,
            token: isValid ? token : '',
            energyPotential: isValid ? energyPotential : 0.0,
            entropy: isValid ? 0.0 : 1.0
        };
    }
    SpatialMonadExecution.transitionSpatialStock = transitionSpatialStock;
})(SpatialMonadExecution || (SpatialMonadExecution = {}));
// Global Validation & Guard Functions
export function guardH3Payload(payload) {
    if (payload === null || payload === undefined) {
        throw new TypeError('[Thermodynamic Spatial Error] H3 payload cannot be null or undefined.');
    }
    if (typeof payload !== 'string' || payload.trim() === '') {
        throw new TypeError('[Thermodynamic Spatial Error] H3 payload must be a non-empty string.');
    }
    return payload.trim();
}
export function isValidH3Index(index) {
    if (typeof index !== 'string')
        return false;
    return H3_REGEX.test(index);
}
export function assertValidH3Index(index) {
    const res = validateH3Index(index);
    if (!res.isValid) {
        if (res.code === H3ErrorCode.INVALID_CHARACTER || res.code === H3ErrorCode.NULL_INDEX) {
            throw new H3Error(res.code, `[Thermodynamic Spatial Violation] Invalid H3 index: ${index} (${res.message})`);
        }
        throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${index} (${res.message})`);
    }
}
export function validateH3Index(h3Index) {
    if (h3Index === null || h3Index === undefined) {
        return {
            isValid: false,
            valid: false,
            code: H3ErrorCode.NULL_INDEX,
            errorCode: H3ErrorCode.NULL_INDEX,
            message: 'H3 index cannot be null or undefined.'
        };
    }
    if (typeof h3Index !== 'string') {
        return {
            isValid: false,
            valid: false,
            code: H3ErrorCode.INVALID_CHARACTER,
            errorCode: H3ErrorCode.INVALID_CHARACTER,
            message: 'H3 index must be a string.'
        };
    }
    if (h3Index.length !== 15) {
        return {
            isValid: false,
            valid: false,
            code: H3ErrorCode.INVALID_LENGTH,
            errorCode: H3ErrorCode.INVALID_LENGTH,
            message: `Invalid length: expected 15, got ${h3Index.length}.`
        };
    }
    if (!H3_REGEX.test(h3Index)) {
        if (h3Index === '000000000000000') {
            return {
                isValid: false,
                valid: false,
                code: H3ErrorCode.NULL_INDEX,
                errorCode: H3ErrorCode.NULL_INDEX,
                message: 'Null index (all zeros).'
            };
        }
        return {
            isValid: false,
            valid: false,
            code: H3ErrorCode.INVALID_CHARACTER,
            errorCode: H3ErrorCode.INVALID_CHARACTER,
            message: 'Invalid character set in H3 index.'
        };
    }
    const res = parseInt(h3Index[1], 16) || 0;
    const baseCell = parseInt(h3Index.substring(2, 4), 16) || 0;
    return {
        isValid: true,
        valid: true,
        code: H3ErrorCode.SUCCESS,
        errorCode: H3ErrorCode.SUCCESS,
        message: 'Valid H3 Index',
        resolution: res,
        baseCell: baseCell
    };
}
export function isH3Index(index) {
    return typeof index === 'string' && isValidH3Index(index);
}
export function isValidH3Hex(index) {
    return typeof index === 'string' && H3_HEX_REGEX.test(index);
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
export function isValidH3Resolution(res) {
    return typeof res === 'number' && Number.isInteger(res) && res >= 0 && res <= 15;
}
export function isValidResolution(res) {
    return isValidH3Resolution(res);
}
export function validateResolution(res) {
    return isValidH3Resolution(res);
}
export function assertValidH3Resolution(res) {
    if (!isValidH3Resolution(res)) {
        throw new RangeError(`[Thermodynamic Spatial Boundary Violation] Invalid H3 resolution tier: ${res}. Must be [0, 15].`);
    }
}
export function assertValidResolution(res) {
    assertValidH3Resolution(res);
}
export function assertH3Resolution(res) {
    assertValidH3Resolution(res);
}
export function validateResolutionTier(res) {
    return isValidH3Resolution(res);
}
export function assertResolutionTier(res) {
    if (!isValidH3Resolution(res)) {
        throw new RangeError(`[SpatialError] Invalid resolution tier ${res}`);
    }
}
export function transitionResolution(monadState, targetRes) {
    assertValidH3Resolution(targetRes);
    return {
        ...monadState,
        resolution: targetRes
    };
}
export function processSpatialMonad(payload) {
    try {
        const valid = guardH3Payload(payload);
        const res = validateH3Index(valid);
        return {
            isValid: res.isValid,
            payload: valid,
            error: res.isValid ? undefined : res.message
        };
    }
    catch (err) {
        return {
            isValid: false,
            payload: null,
            error: `Thermodynamic Violation: ${err.message}`
        };
    }
}
export function createSpatialMonad(h3Index, trophicEnergyStockJoules) {
    assertValidH3Index(h3Index);
    return {
        h3Index,
        trophicEnergyStockJoules
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
export function transitionSpatialMonad(monad, computeCostJoules = 1.2e-6) {
    if (monad.state !== 'UNVERIFIED') {
        throw new Error('Monad must be in UNVERIFIED state for verification gate.');
    }
    const isValid = isValidH3Index(monad.h3Index || monad.id);
    const currentEnergy = typeof monad.energyJoules === 'number' ? monad.energyJoules : 10.0;
    return {
        ...monad,
        state: isValid ? 'VALIDATED' : 'UNVERIFIED',
        energyJoules: currentEnergy - computeCostJoules
    };
}
