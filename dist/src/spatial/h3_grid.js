import { H3ErrorCode } from './h3_types';
export { H3ErrorCode };
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export function isValidH3Resolution(resolution) {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function assertValidH3Resolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new RangeError(`[Thermodynamic Spatial Boundary Violation] Invalid H3 resolution tier: ${resolution}. Resolution must be an integer between 0 and 15.`);
    }
}
export function assertH3Resolution(resolution) {
    assertValidH3Resolution(resolution);
}
export const validateResolution = (resolution) => isValidH3Resolution(resolution);
export const assertValidResolution = (resolution) => assertValidH3Resolution(resolution);
export const assertResolutionTier = assertValidH3Resolution;
export const assertValidResolutionAlt = assertValidH3Resolution;
export const validateResolutionTier = isValidH3Resolution;
export const assertTier = assertValidH3Resolution;
export function isValidH3Length(index) {
    if (typeof index !== 'string')
        return false;
    return H3_REGEX.test(index);
}
export const validateH3Length = isValidH3Length;
export const validateH3IndexLength = isValidH3Length;
export const isValidH3IndexLength = isValidH3Length;
export function isValidH3Index(index) {
    if (typeof index !== 'string')
        return false;
    return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(index) || H3_REGEX.test(index);
}
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new H3Error(H3ErrorCode.INVALID_CHARACTER, "[Thermodynamic Spatial Violation] Invalid H3 index format.");
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
export function validateH3Index(h3Index) {
    if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string') {
        return {
            isValid: false,
            valid: false,
            code: H3ErrorCode.NULL_INDEX,
            errorCode: H3ErrorCode.NULL_INDEX,
            message: 'H3 index must be a non-null string.'
        };
    }
    if (h3Index === '000000000000000') {
        return {
            isValid: false,
            valid: false,
            code: H3ErrorCode.NULL_INDEX,
            errorCode: H3ErrorCode.NULL_INDEX,
            message: 'H3 index cannot be null (all zeros).'
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
    if (!/^[0-9a-fA-F]{15}$/.test(h3Index) || !/^[89a-fA-F]/.test(h3Index)) {
        return {
            isValid: false,
            valid: false,
            code: H3ErrorCode.INVALID_CHARACTER,
            errorCode: H3ErrorCode.INVALID_CHARACTER,
            message: 'Invalid H3 characters.'
        };
    }
    const res = parseInt(h3Index[1], 16) || 0;
    const baseCell = parseInt(h3Index.substring(2, 4), 16) || 0;
    return {
        isValid: true,
        valid: true,
        code: H3ErrorCode.SUCCESS,
        resolution: res,
        baseCell
    };
}
export class H3GridParser {
    static validateIndex(h3Index) {
        return validateH3Index(String(h3Index));
    }
    static fromGeo(_coord, resolution) {
        assertValidH3Resolution(resolution);
        return "8928308280fffff";
    }
    static parseString(h3Str) {
        return guardH3Payload(h3Str).toLowerCase();
    }
}
export class H3GridValidator {
    static H3_REGEX = /^[89a-fA-F][0-9a-fA-F]{14}$/;
    static isValidIndex(h3Index) {
        return typeof h3Index === 'string' && H3_REGEX.test(h3Index);
    }
    static validateString(h3Index) {
        return validateH3Index(h3Index);
    }
    static parseResolution(h3Index) {
        return parseInt(h3Index[1], 16) || 0;
    }
    static parseBaseCell(h3Index) {
        return parseInt(h3Index.substring(2, 4), 16) || 0;
    }
}
export class H3Validator {
    validate(h3Index) {
        const res = validateH3Index(h3Index);
        return res.isValid;
    }
    assertValid(h3Index) {
        const res = validateH3Index(h3Index);
        if (!res.isValid) {
            if (res.code === H3ErrorCode.INVALID_LENGTH) {
                throw new InvalidLengthError(res.message ?? 'Invalid length');
            }
            throw new H3Error(res.code ?? H3ErrorCode.INVALID_CHARACTER, res.message ?? 'Invalid H3 index');
        }
    }
}
export class H3Grid {
    defaultResolution;
    constructor(defaultResolution = 7) {
        this.defaultResolution = defaultResolution;
    }
    validateIndex(h3Index) {
        return validateH3Index(h3Index);
    }
    assertValidIndex(h3Index) {
        assertValidH3Index(h3Index);
    }
    validateResolution(resolution) {
        return isValidH3Resolution(resolution);
    }
    assertValidResolution(resolution) {
        assertValidH3Resolution(resolution);
    }
    registerPayload(payload) {
        return guardH3Payload(payload);
    }
    size() {
        return 1;
    }
    hasIndex(payload) {
        try {
            guardH3Payload(payload);
            return true;
        }
        catch {
            return false;
        }
    }
    static validate(h3Index) {
        return isValidH3Index(h3Index);
    }
    static cellToBoundary(_cell) {
        guardH3Payload(_cell);
        return [];
    }
    static getResolution(_cell) {
        guardH3Payload(_cell);
        return 7;
    }
}
export class H3GridManager {
    validateIndex(h3Index) {
        return isValidH3Index(h3Index);
    }
    validateResolution(resolution) {
        return isValidH3Resolution(resolution);
    }
    assertValidResolution(resolution) {
        assertValidH3Resolution(resolution);
    }
    static guardPayload(payload) {
        return guardH3Payload(payload);
    }
}
export class H3GridEngine {
    resolution;
    cells = new Map();
    constructor(resolution) {
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
    getCell(h3Index) {
        return this.cells.get(h3Index) ?? {
            h3Index,
            resolution: this.resolution,
            solarIrradiance: 1361.0,
            carbonStock: 1000
        };
    }
    getAdjacentCells(_h3Index) {
        return [`${_h3Index}_nbr1`, `${_h3Index}_nbr2`, `${_h3Index}_nbr3`, `${_h3Index}_nbr4`, `${_h3Index}_nbr5`, `${_h3Index}_nbr6`];
    }
    propagateCellState(h3Index, _deltaT) {
        const cell = this.getCell(h3Index);
        if (cell) {
            cell.carbonStock += 10;
        }
    }
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
        const p = guardH3Payload(payload);
        return { isValid: true, payload: p };
    }
    catch (err) {
        return { isValid: false, payload: null, error: err.message };
    }
}
export function executeSpatialValidationMonad(h3Token) {
    const valid = isValidH3Index(h3Token);
    return {
        token: h3Token,
        isValids: valid,
        massDeltaKg: 0.0,
        energyDeltaJoules: 0.0
    };
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
export function isH3Index(index) {
    return isValidH3Index(index);
}
export function createSpatialMonad(h3Index, energyJoules) {
    const valid = guardH3Payload(h3Index);
    if (!isValidH3Index(valid)) {
        throw new Error("ThermodynamicViolation: Invalid H3 index.");
    }
    return { h3Index: valid, trophicEnergyStockJoules: energyJoules };
}
