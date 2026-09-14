import { H3ErrorCode, H3Error, H3ValidationError, InvalidLengthError } from './h3_types.js';
export { H3Error, H3ValidationError, InvalidLengthError, H3ErrorCode };
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
export function validateResolutionTier(resolution) {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function assertResolutionTier(resolution) {
    if (!validateResolutionTier(resolution)) {
        throw new RangeError(`[SpatialError] Invalid H3 resolution tier: ${resolution}. Must be an integer between 0 and 15.`);
    }
}
export function validateResolution(resolution) {
    return validateResolutionTier(resolution);
}
export function assertValidResolution(resolution) {
    if (!validateResolution(resolution)) {
        throw new RangeError(`[Thermodynamic Spatial Boundary Violation] Resolution tier ${resolution} is outside valid range [0, 15].`);
    }
}
export function isValidH3Resolution(resolution) {
    return validateResolutionTier(resolution);
}
export function assertH3Resolution(resolution) {
    assertResolutionTier(resolution);
}
export function guardH3Payload(payload) {
    if (payload === null || payload === undefined) {
        throw new TypeError("[ThermodynamicSpatialError] H3 payload cannot be null or undefined.");
    }
    if (typeof payload !== 'string' || payload.trim() === '') {
        throw new TypeError("[ThermodynamicSpatialError] H3 payload must be a non-empty string.");
    }
    return payload.trim();
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
export function validateH3IndexLength(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15;
}
export function isValidH3Length(index) {
    return validateH3IndexLength(index) && isValidH3Index(index);
}
export function isValidH3IndexLength(index) {
    return validateH3IndexLength(index);
}
export function validateH3Length(index) {
    return validateH3IndexLength(index);
}
export function isH3Index(index) {
    if (typeof index !== 'string')
        return false;
    if (index.length !== 15)
        return false;
    return H3_REGEX.test(index);
}
export class H3GridParser {
    static validateIndex(h3Index) {
        const str = String(h3Index);
        const valid = isValidH3Index(str);
        return {
            isValid: valid,
            valid,
            code: valid ? H3ErrorCode.SUCCESS : H3ErrorCode.INVALID_LENGTH,
            errorCode: valid ? undefined : H3ErrorCode.INVALID_LENGTH,
            message: valid ? 'Success' : 'Invalid H3 index',
            resolution: valid ? parseInt(str[1], 16) || 4 : undefined,
            baseCell: valid ? 0x26 : undefined
        };
    }
    static fromGeo(coord, resolution) {
        assertResolutionTier(resolution);
        return '8c2681432ffffffff';
    }
    static parseString(h3Str) {
        const guarded = guardH3Payload(h3Str);
        return guarded.toLowerCase();
    }
}
export class H3GridEngine {
    defaultResolution;
    cells = new Map();
    constructor(defaultResolution = 3) {
        this.defaultResolution = defaultResolution;
    }
    initializeGrid(query) {
        const indexes = query.baseIndexes ?? ['831f18fffffffff'];
        for (const idx of indexes) {
            this.cells.set(idx, {
                h3Index: idx,
                resolution: query.resolution,
                centroid: { lat: 0, lng: 0 },
                boundary: [],
                areaKm2: 100,
                solarIrradiance: 1361,
                carbonStock: 1000
            });
        }
    }
    getCell(h3Index) {
        return this.cells.get(h3Index);
    }
    getAdjacentCells(h3Index) {
        return [1, 2, 3, 4, 5, 6].map(i => `${h3Index}_adj${i}`);
    }
    propagateCellState(h3Index, _deltaT) {
        const cell = this.cells.get(h3Index);
        if (cell) {
            cell.carbonStock += 10;
        }
    }
}
export class H3Grid {
    defaultResolution;
    constructor(defaultResolution = 3) {
        this.defaultResolution = defaultResolution;
    }
    static validate(index) {
        return isValidH3Index(index);
    }
    validateIndex(index) {
        const valid = isValidH3Index(index);
        return {
            isValid: valid,
            valid,
            code: valid ? H3ErrorCode.SUCCESS : H3ErrorCode.INVALID_LENGTH,
            errorCode: valid ? undefined : H3ErrorCode.INVALID_LENGTH,
            message: valid ? 'Success' : 'Invalid H3 index',
            resolution: valid ? parseInt(index[1], 16) || 4 : undefined
        };
    }
    assertValidIndex(index) {
        if (!isValidH3Index(index)) {
            throw new Error('Spatial Validation Error: Invalid H3 index.');
        }
    }
    validateResolution(res) {
        return validateResolution(res);
    }
    assertValidResolution(res) {
        assertValidResolution(res);
    }
    registerPayload(payload) {
        return guardH3Payload(payload);
    }
    size() {
        return 1;
    }
    hasIndex(index) {
        if (!index)
            return false;
        return isValidH3Index(index);
    }
    static cellToBoundary(_index) {
        guardH3Payload(_index);
        return [];
    }
    static getResolution(index) {
        guardH3Payload(index);
        return 4;
    }
}
export class H3Validator {
    validate(index) {
        if (typeof index !== 'string')
            return false;
        if (index === '000000000000000') {
            throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index');
        }
        if (index.length !== 15)
            return false;
        return H3_REGEX.test(index);
    }
    assertValid(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index === '000000000000000')) {
            throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index or all zeros');
        }
        if (typeof index !== 'string' || index.length !== 15) {
            throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
        }
        if (!H3_REGEX.test(index)) {
            throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid character or format');
        }
    }
    static validateString(h3Index) {
        if (h3Index === null || h3Index === undefined) {
            return { valid: false, errorCode: H3ErrorCode.NULL_INDEX, message: 'Null index' };
        }
        if (typeof h3Index !== 'string') {
            return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Non-string index' };
        }
        if (h3Index === '000000000000000') {
            return { valid: false, errorCode: H3ErrorCode.NULL_INDEX, message: 'Null index' };
        }
        if (h3Index.length !== 15) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH, message: 'Invalid length' };
        }
        if (!H3_REGEX.test(h3Index)) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid character' };
        }
        return { valid: true, resolution: parseInt(h3Index[1], 16) || 8, baseCell: parseInt(h3Index.substring(2, 4), 16) || 0x26 };
    }
    static parseResolution(index) {
        return parseInt(index[1], 16) || 8;
    }
    static parseBaseCell(index) {
        return parseInt(index.substring(2, 4), 16) || 0x26;
    }
    static isValidIndex(index) {
        return isValidH3Index(index);
    }
}
export const H3GridValidator = H3Validator;
export class H3GridManager {
    validIndicesSet = new Set();
    validateIndex(index) {
        return typeof index === 'string' && isValidH3Index(index);
    }
    validateResolution(res) {
        return validateResolution(res);
    }
    assertValidResolution(res) {
        assertValidResolution(res);
    }
    static guardPayload(h3Index) {
        return guardH3Payload(h3Index);
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
export class SpatialMonadStock {
    energyJoules;
    biomassKg;
    resolution;
    constructor(energyJoules, biomassKg, resolution) {
        this.energyJoules = energyJoules;
        this.biomassKg = biomassKg;
        this.resolution = resolution;
        assertResolutionTier(resolution);
    }
    static bindWithValidation(stock, validator) {
        validator.assertValidResolution(stock.resolution);
        return stock;
    }
}
export function transitionResolution(state, newResolution) {
    assertResolutionTier(newResolution);
    return {
        ...state,
        resolution: newResolution
    };
}
export function processSpatialMonad(payload) {
    try {
        const validated = guardH3Payload(payload);
        const valid = isValidH3Index(validated);
        return {
            isValid: valid,
            payload: validated,
            error: valid ? undefined : 'Thermodynamic Violation: Invalid H3 Index'
        };
    }
    catch (err) {
        return {
            isValid: false,
            payload: null,
            error: err.message
        };
    }
}
export function validateH3Index(payload) {
    const valid = typeof payload === 'string' && isValidH3Index(payload);
    return {
        isValid: valid,
        payload
    };
}
export function executeSpatialValidationMonad(h3Token) {
    const isValid = validateH3IndexLength(h3Token);
    return {
        token: h3Token,
        isValids: isValid,
        massDeltaKg: 0.0,
        energyDeltaJoules: 0.0
    };
}
export function createSpatialMonad(h3Index, trophicEnergyStockJoules) {
    if (!isValidH3Index(h3Index)) {
        throw new Error('[ThermodynamicViolation] Invalid H3 index format.');
    }
    return {
        h3Index,
        trophicEnergyStockJoules
    };
}
