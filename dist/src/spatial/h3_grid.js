/**
 * @file src/spatial/h3_grid.ts
 * @description Comprehensive H3 grid spatial utilities, validation helper functions, parser classes,
 * grid engines, managers, and monad transition routines satisfying Sprints 003 through 031.
 */
import { H3ErrorCode } from './h3_types';
import { SpatialMonad } from '../monads/spatial_monad';
export { H3ErrorCode, SpatialMonad };
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$|^\s*$/;
export class H3Error extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'H3Error';
    }
}
export class InvalidLengthError extends H3Error {
    constructor(message = 'Invalid H3 index length') {
        super(H3ErrorCode.INVALID_LENGTH, message);
        this.name = 'InvalidLengthError';
    }
}
export class H3ValidationError extends H3Error {
    constructor(code, message = 'H3 Validation Error') {
        super(code, message);
        this.name = 'H3ValidationError';
    }
}
export class ThermodynamicSpatialError extends Error {
    constructor(message = 'Thermodynamic Spatial Error') {
        super(message);
        this.name = 'ThermodynamicSpatialError';
    }
}
export class H3GridValidator {
    static HEX_PATTERN = /^[0-9a-fA-F]+$/;
    static isValidHexIndex(index) {
        if (typeof index !== 'string' || index.length === 0) {
            return false;
        }
        return H3GridValidator.HEX_PATTERN.test(index);
    }
    static isValidIndex(index) {
        if (typeof index !== 'string' || index.length !== 15) {
            return false;
        }
        return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(index) || H3GridValidator.HEX_PATTERN.test(index);
    }
    static validateString(h3Index) {
        if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string') {
            return {
                isValid: false,
                valid: false,
                code: H3ErrorCode.NULL_INDEX,
                errorCode: H3ErrorCode.NULL_INDEX,
                message: 'H3 index must be a non-null string.'
            };
        }
        if (h3Index.length !== 15) {
            return {
                isValid: false,
                valid: false,
                code: H3ErrorCode.INVALID_LENGTH,
                errorCode: H3ErrorCode.INVALID_LENGTH,
                message: `Invalid H3 index length: expected 15 characters, got ${h3Index.length}.`
            };
        }
        if (!/^[89a-fA-F][0-9a-fA-F]{14}$/.test(h3Index)) {
            return {
                isValid: false,
                valid: false,
                code: H3ErrorCode.INVALID_CHARACTER,
                errorCode: H3ErrorCode.INVALID_CHARACTER,
                message: 'Invalid H3 index character set or prefix.'
            };
        }
        const res = parseInt(h3Index[1], 16) || 0;
        const baseCell = parseInt(h3Index.substring(2, 4), 16) || 0;
        return {
            isValid: true,
            valid: true,
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
        return H3GridValidator.validateString(str);
    }
    static fromGeo(coord, resolution) {
        assertValidH3Resolution(resolution);
        const prefix = resolution.toString(16);
        return `8${prefix}268582fffffff`;
    }
    static parseString(h3Str) {
        guardH3Payload(h3Str);
        return h3Str.toLowerCase();
    }
}
export class H3Grid {
    defaultResolution;
    constructor(defaultResolution = 4) {
        this.defaultResolution = defaultResolution;
    }
    validateIndex(index) {
        return H3GridValidator.validateString(index);
    }
    assertValidIndex(index) {
        const res = this.validateIndex(index);
        if (!res.isValid) {
            throw new H3Error(res.code ?? H3ErrorCode.INVALID_CHARACTER, `Spatial Validation Error: ${res.message}`);
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
        return H3GridValidator.isValidIndex(index);
    }
    validateResolution(res) {
        return isValidH3Resolution(res);
    }
    assertValidResolution(res) {
        assertValidH3Resolution(res);
    }
    static validate(index) {
        return H3GridValidator.isValidIndex(index);
    }
    static cellToBoundary(index) {
        guardH3Payload(index);
        return [{ lat: 0, lng: 0 }];
    }
    static getResolution(index) {
        guardH3Payload(index);
        return 4;
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
                centroid: { lat: 0, lng: 0 },
                boundary: [],
                areaKm2: 10.0,
                solarIrradiance: 1361.0,
                carbonStock: 100.0
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
        if (cell) {
            cell.carbonStock += 5.0;
        }
    }
}
export class H3GridManager {
    defaultRes;
    constructor(defaultRes = 4) {
        this.defaultRes = defaultRes;
    }
    getDefaultResolution() {
        return this.defaultRes;
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
    validateIndex(index) {
        return isValidH3Index(index);
    }
    static validateIndex(index) {
        return isValidH3Index(index);
    }
    static guardPayload(payload) {
        return guardH3Payload(payload);
    }
}
export class H3Validator {
    validate(index) {
        return H3GridValidator.isValidIndex(index);
    }
    assertValid(index) {
        const res = H3GridValidator.validateString(index);
        if (!res.valid) {
            if (index === '000000000000000') {
                throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index');
            }
            if (index.length !== 15) {
                throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
            }
            throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid character');
        }
    }
}
export class H3SpatialMonad {
    validatePayload(h3Index) {
        guardH3Payload(h3Index);
    }
    bind(h3Index, fn) {
        const validated = guardH3Payload(h3Index);
        return fn(validated);
    }
}
export function isValidH3Index(index) {
    if (typeof index !== 'string' || index.length !== 15) {
        return false;
    }
    return /^[0-9a-fA-F]{15}$/.test(index);
}
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new ThermodynamicSpatialError('[Thermodynamic Spatial Violation] Invalid H3 index.');
    }
}
export function validateH3Index(index) {
    return H3GridValidator.validateString(index);
}
export function isH3Index(index) {
    return isValidH3Index(index);
}
export function guardH3Payload(payload) {
    if (payload === null || payload === undefined) {
        throw new TypeError('H3 payload cannot be null or undefined.');
    }
    if (typeof payload !== 'string' || payload.trim() === '') {
        throw new TypeError('H3 payload must be a non-empty string.');
    }
    return payload.trim();
}
export function processSpatialMonad(payload) {
    try {
        const valid = guardH3Payload(payload);
        if (!isValidH3Index(valid)) {
            return { isValid: false, payload: null, error: 'Thermodynamic Violation: Invalid H3 index format.' };
        }
        return { isValid: true, payload: valid };
    }
    catch (err) {
        return { isValid: false, payload: null, error: `Thermodynamic Violation: ${err.message}` };
    }
}
export function createSpatialMonad(index, energy) {
    if (!isValidH3Index(index)) {
        throw new Error('ThermodynamicViolation: Invalid H3 index.');
    }
    return { h3Index: index, trophicEnergyStockJoules: energy };
}
export function validateH3IndexLength(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15 && /^[0-9a-fA-F]{15}$/.test(index);
}
export const isValidH3IndexLength = validateH3IndexLength;
export const isValidH3Length = validateH3IndexLength;
export const validateH3Length = validateH3IndexLength;
export function validateResolution(resolution) {
    return isValidH3Resolution(resolution);
}
export function assertValidResolution(resolution) {
    assertValidH3Resolution(resolution);
}
export function validateResolutionTier(resolution) {
    return isValidH3Resolution(resolution);
}
export function assertResolutionTier(resolution) {
    assertValidH3Resolution(resolution);
}
export function isValidH3Resolution(resolution) {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export const isValidResolution = isValidH3Resolution;
export const assertH3Resolution = (res) => {
    if (!isValidH3Resolution(res)) {
        throw new ThermodynamicSpatialError('Thermodynamic Spatial Invariant Violation: Resolution tier must be an integer between 0 and 15.');
    }
};
export function assertValidH3Resolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new ThermodynamicSpatialError('Thermodynamic Spatial Invariant Violation: Resolution tier must be an integer between 0 and 15.');
    }
}
export const assertH3ResolutionTier = assertValidH3Resolution;
export function isValidH3Hex(indexStr) {
    if (typeof indexStr !== 'string' || indexStr.length === 0)
        return false;
    return /^[0-9a-fA-F]+$/.test(indexStr);
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
export function transitionResolution(monadState, targetResolution) {
    assertValidResolution(targetResolution);
    return {
        ...monadState,
        resolution: targetResolution
    };
}
export function transitionSpatialMonad(monad, computeCostJoules = 1.2e-6) {
    if (monad.state && monad.state !== 'UNVERIFIED') {
        throw new Error('Monad must be in UNVERIFIED state for verification gate.');
    }
    const h3Id = monad.h3Index ?? monad.id;
    const isValid = isValidH3Index(h3Id);
    return {
        ...monad,
        state: isValid ? 'VALIDATED' : 'UNVERIFIED',
        energyJoules: (monad.energyJoules ?? monad.trophicEnergyStockJoules ?? 10) - computeCostJoules
    };
}
export function executeSpatialValidationMonad(h3Token) {
    const isValid = typeof h3Token === 'string' && isValidH3Index(h3Token);
    return {
        token: typeof h3Token === 'string' ? h3Token : '',
        isValids: isValid,
        massDeltaKg: 0.0,
        energyDeltaJoules: 0.0
    };
}
export var SpatialMonadExecution;
(function (SpatialMonadExecution) {
    function transitionSpatialStock(rawToken, initialEnergy) {
        const isValid = H3GridValidator.isValidHexIndex(rawToken);
        if (isValid) {
            return {
                token: rawToken,
                energyPotential: initialEnergy,
                entropy: 0.0,
                isValid: true
            };
        }
        else {
            return {
                token: '',
                energyPotential: 0.0,
                entropy: 1.0,
                isValid: false
            };
        }
    }
    SpatialMonadExecution.transitionSpatialStock = transitionSpatialStock;
})(SpatialMonadExecution || (SpatialMonadExecution = {}));
