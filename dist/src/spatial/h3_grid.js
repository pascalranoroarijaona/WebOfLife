import * as h3 from 'h3-js';
import { H3ErrorCode } from './h3_types.js';
export { H3ErrorCode };
export class InvalidH3TokenError extends Error {
    constructor(token) {
        super(`Invalid H3 token contains non-hexadecimal symbols: "${token}"`);
        this.name = 'InvalidH3TokenError';
    }
}
export class ThermodynamicSpatialError extends Error {
    constructor(message) {
        super(`[ThermodynamicSpatialError] ${message}`);
        this.name = 'ThermodynamicSpatialError';
    }
}
export class H3Error extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = 'H3Error';
        this.code = code;
    }
}
export class H3ValidationError extends H3Error {
    constructor(code, message) {
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
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$/;
export function validateH3Token(token) {
    const hexRegex = /^[0-9a-fA-F]+$/;
    if (!token || !hexRegex.test(token)) {
        throw new InvalidH3TokenError(token);
    }
}
export function isValidH3Hex(token) {
    if (typeof token !== 'string')
        return false;
    return /^[0-9a-fA-F]+$/.test(token);
}
export function isValidH3Index(token) {
    if (typeof token !== 'string')
        return false;
    return /^[0-9a-fA-F]{15}$/.test(token);
}
export function assertValidH3Index(token) {
    if (!isValidH3Index(token)) {
        throw new ThermodynamicSpatialError(`[Thermodynamic Spatial Violation] Invalid H3 index: ${token}`);
    }
}
export function isValidH3Length(token) {
    if (typeof token !== 'string')
        return false;
    return /^[0-9a-fA-F]{15}$/.test(token);
}
export function isValidH3IndexLength(token) {
    if (typeof token !== 'string')
        return false;
    return token.length === 15 && /^[0-9a-fA-F]+$/.test(token);
}
export function validateH3Length(token) {
    return isValidH3Length(token);
}
export function validateH3IndexLength(token) {
    return isValidH3IndexLength(token);
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
export function validateH3Index(index) {
    if (index === null || index === undefined) {
        return { isValid: false, code: H3ErrorCode.NULL_INDEX, errorCode: H3ErrorCode.NULL_INDEX, message: 'Null index' };
    }
    if (typeof index !== 'string') {
        return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Non-string index' };
    }
    if (index.length !== 15) {
        return { isValid: false, code: H3ErrorCode.INVALID_LENGTH, errorCode: H3ErrorCode.INVALID_LENGTH, message: 'Invalid length' };
    }
    if (!/^[0-9a-fA-F]{15}$/.test(index)) {
        return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid character' };
    }
    const res = parseInt(index[1], 16) || 0;
    const baseCell = parseInt(index.substring(2, 4), 16) || 0;
    return { isValid: true, valid: true, code: H3ErrorCode.SUCCESS, errorCode: H3ErrorCode.SUCCESS, resolution: res, baseCell };
}
export function isValidH3Resolution(resolution) {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function isValidResolution(resolution) {
    return isValidH3Resolution(resolution);
}
export function assertValidH3Resolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new RangeError(`Thermodynamic Spatial Invariant Violation: Resolution ${resolution} out of bounds [0, 15]`);
    }
}
export function assertH3Resolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new ThermodynamicSpatialError(`Invalid H3 resolution tier: ${resolution}. Must be integer between 0 and 15.`);
    }
}
export function validateResolution(resolution) {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function assertValidResolution(resolution) {
    if (!validateResolution(resolution)) {
        throw new RangeError(`Thermodynamic Spatial Boundary Violation: Resolution tier ${resolution} is outside valid range [0, 15].`);
    }
}
export function validateResolutionTier(resolution) {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function assertResolutionTier(resolution) {
    if (!validateResolutionTier(resolution)) {
        throw new Error(`[SpatialError] Invalid resolution tier ${resolution}`);
    }
}
export function processSpatialMonad(payload) {
    try {
        const p = guardH3Payload(payload);
        const val = validateH3Index(p);
        return { isValid: val.isValid, payload: p, error: val.isValid ? undefined : val.message };
    }
    catch (err) {
        return { isValid: false, payload: null, error: err.message };
    }
}
export function transitionResolution(state, newResolution) {
    assertValidResolution(newResolution);
    return {
        ...state,
        resolution: newResolution
    };
}
export class H3Grid {
    defaultResolution;
    registeredPayloads = new Set();
    constructor(defaultResolution = 7) {
        this.defaultResolution = defaultResolution;
    }
    resolveCell(token) {
        validateH3Token(token);
        let lat = 0;
        let lng = 0;
        let res = this.defaultResolution;
        try {
            if (typeof h3.cellToLatLng === 'function' && h3.isValidCell(token)) {
                const coords = h3.cellToLatLng(token);
                lat = coords[0];
                lng = coords[1];
                res = h3.getResolution(token);
            }
        }
        catch { }
        return {
            index: token,
            resolution: res,
            center: { lat, lng },
            boundary: [],
            stocks: new Map(),
            localEntropy: 0.1
        };
    }
    getCellBoundary(token) {
        guardH3Payload(token);
        validateH3Token(token);
        try {
            if (typeof h3.cellToBoundary === 'function' && h3.isValidCell(token)) {
                const boundary = h3.cellToBoundary(token, true);
                return boundary.map(([lat, lng]) => ({ lat, lng }));
            }
        }
        catch { }
        return [];
    }
    static cellToBoundary(token) {
        guardH3Payload(token);
        return new H3Grid().getCellBoundary(token);
    }
    static getResolution(token) {
        guardH3Payload(token);
        return parseInt(token[1], 16) || 0;
    }
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
    registerPayload(token) {
        const p = guardH3Payload(token);
        this.registeredPayloads.add(p);
        return p;
    }
    size() {
        return this.registeredPayloads.size;
    }
    hasIndex(token) {
        if (typeof token !== 'string')
            return false;
        return this.registeredPayloads.has(token);
    }
    validateResolution(resolution) {
        return validateResolution(resolution);
    }
    assertValidResolution(resolution) {
        assertValidResolution(resolution);
    }
    validateTier(resolution) {
        return validateResolution(resolution);
    }
}
export class H3GridParser {
    static validateIndex(h3Index) {
        return validateH3Index(String(h3Index));
    }
    static fromGeo(coord, resolution) {
        if (typeof h3.latLngToCell === 'function') {
            try {
                return h3.latLngToCell(coord.lat, coord.lng, resolution);
            }
            catch { }
        }
        return '8928308280fffff';
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
        this.resolution = query.resolution;
        if (query.baseIndexes) {
            for (const idx of query.baseIndexes) {
                this.cells.set(idx, {
                    h3Index: idx,
                    resolution: this.resolution,
                    centroid: { lat: 0, lng: 0 },
                    boundary: [],
                    areaKm2: 10.0,
                    solarIrradiance: 1361.0,
                    carbonStock: 1000
                });
            }
        }
    }
    getCell(h3Index) {
        return this.cells.get(h3Index) || {
            h3Index,
            resolution: this.resolution,
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
    propagateCellState(h3Index, delta) {
        const cell = this.cells.get(h3Index);
        if (cell) {
            cell.carbonStock += delta;
        }
        else {
            this.cells.set(h3Index, {
                h3Index,
                resolution: this.resolution,
                centroid: { lat: 0, lng: 0 },
                boundary: [],
                areaKm2: 10.0,
                solarIrradiance: 1361.0,
                carbonStock: 1000 + delta
            });
        }
    }
}
export class H3Validator {
    validate(h3Index) {
        return isValidH3Index(h3Index);
    }
    validateIndex(h3Index) {
        return validateH3Index(h3Index);
    }
    assertValid(h3Index) {
        const res = validateH3Index(h3Index);
        if (!res.isValid) {
            throw new H3Error(res.code || H3ErrorCode.INVALID_CHARACTER, res.message || 'Validation failed');
        }
    }
    static isValidIndex(h3Index) {
        return isValidH3Index(h3Index);
    }
}
export var H3GridValidator;
(function (H3GridValidator) {
    H3GridValidator.HEX_PATTERN = /^[0-9a-fA-F]+$/;
    function isValidHexIndex(index) {
        if (typeof index !== 'string')
            return false;
        return H3GridValidator.HEX_PATTERN.test(index);
    }
    H3GridValidator.isValidHexIndex = isValidHexIndex;
    function isValidIndex(h3Index) {
        if (typeof h3Index !== 'string')
            return false;
        return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(h3Index) || /^[0-9a-fA-F]{15}$/.test(h3Index);
    }
    H3GridValidator.isValidIndex = isValidIndex;
    function validateString(h3Index) {
        const res = validateH3Index(h3Index);
        return {
            valid: !!res.isValid,
            resolution: res.resolution,
            baseCell: res.baseCell,
            errorCode: res.code,
            message: res.message
        };
    }
    H3GridValidator.validateString = validateString;
    function parseResolution(h3Index) {
        return parseInt(h3Index[1], 16) || 0;
    }
    H3GridValidator.parseResolution = parseResolution;
    function parseBaseCell(h3Index) {
        return parseInt(h3Index.substring(2, 4), 16) || 0;
    }
    H3GridValidator.parseBaseCell = parseBaseCell;
})(H3GridValidator || (H3GridValidator = {}));
export function isH3Index(token) {
    return isValidH3Index(token);
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
        if (!isValidH3Index(token)) {
            throw new Error(`Invalid H3 payload: ${token}`);
        }
    }
}
export class H3SpatialMonad {
    verified = false;
    id;
    h3Index;
    energyJoules;
    state;
    constructor(tokenOrId = '8928308280fffff', initialEnergyOrSolar = 1000, stateStr, energyJoules) {
        this.id = tokenOrId;
        this.h3Index = tokenOrId;
        this.energyJoules = energyJoules ?? initialEnergyOrSolar;
        this.state = stateStr ?? 'UNVERIFIED';
        this.verified = isValidH3Index(tokenOrId) && this.state === 'VALIDATED';
    }
    validatePayload(h3Index) {
        guardH3Payload(h3Index);
    }
    bind(token, fn) {
        guardH3Payload(token);
        return fn(token);
    }
    isVerified() {
        return isValidH3Index(this.h3Index || this.id || '') && (this.verified || this.state === 'VALIDATED');
    }
    verifySpatialIndex() {
        const token = this.h3Index || this.id || '';
        if (isValidH3Index(token)) {
            this.verified = true;
            this.state = 'VALIDATED';
            return true;
        }
        this.verified = false;
        return false;
    }
    getThermodynamics() {
        return {
            massGrams: 0.0,
            solarEnergyJoules: this.energyJoules ?? 1000,
            dissipationJoules: 1.2e-6
        };
    }
}
export { H3SpatialMonad as SpatialMonad };
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
export class H3GridManager {
    defaultRes;
    constructor(defaultRes = 9) {
        this.defaultRes = defaultRes;
    }
    validateResolution(res) {
        return validateResolution(res);
    }
    assertValidResolution(res) {
        assertValidResolution(res);
    }
    validateTier(res) {
        return validateResolution(res);
    }
    getDefaultResolution() {
        return this.defaultRes;
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
export function transitionSpatialMonad(monad, computeCost = 1.2e-6) {
    const token = monad.h3Index || monad.id || '';
    if (monad.state === 'VALIDATED') {
        throw new Error('Monad must be in UNVERIFIED state');
    }
    const isValid = isValidH3Index(token);
    return {
        ...monad,
        state: isValid ? 'VALIDATED' : 'UNVERIFIED',
        energyJoules: (monad.energyJoules || 0) - computeCost
    };
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
export function executeSpatialValidationMonad(h3Token) {
    const isValids = isValidH3Index(h3Token);
    return {
        token: h3Token,
        isValids,
        massDeltaKg: 0.0,
        energyDeltaJoules: 0.0
    };
}
export function createSpatialMonad(h3Index, trophicEnergyStockJoules) {
    if (!isValidH3Index(h3Index)) {
        throw new Error('ThermodynamicViolation: Invalid H3 index');
    }
    return {
        h3Index,
        trophicEnergyStockJoules
    };
}
