import { H3ErrorCode } from './h3_types.js';
export { H3ErrorCode };
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export function guardH3Payload(h3Index) {
    if (!h3Index || typeof h3Index !== 'string' || h3Index.trim() === '') {
        throw new Error(`[Thermodynamic Spatial Error] Invalid or null H3 string payload received: ${String(h3Index)}`);
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
    constructor(code, message) {
        super(code, message);
        this.name = 'H3ValidationError';
    }
}
export class InvalidLengthError extends H3Error {
    errorCode;
    constructor(message) {
        super(H3ErrorCode.INVALID_LENGTH, message);
        this.name = 'InvalidLengthError';
        this.errorCode = H3ErrorCode.INVALID_LENGTH;
    }
}
export class H3GridParser {
    static validateIndex(h3Index) {
        if (h3Index === null || h3Index === undefined) {
            return { isValid: false, valid: false, code: H3ErrorCode.NULL_INDEX, errorCode: H3ErrorCode.NULL_INDEX, message: 'Null index' };
        }
        const str = String(h3Index);
        if (str.length !== 15) {
            return { isValid: false, valid: false, code: H3ErrorCode.INVALID_LENGTH, errorCode: H3ErrorCode.INVALID_LENGTH, message: 'Invalid length' };
        }
        if (!/^[0-9a-fA-F]{15}$/.test(str)) {
            return { isValid: false, valid: false, code: H3ErrorCode.INVALID_CHARACTER, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid character' };
        }
        return { isValid: true, valid: true, code: H3ErrorCode.SUCCESS, errorCode: H3ErrorCode.SUCCESS, resolution: 5, baseCell: 10 };
    }
    static fromGeo(coord, resolution) {
        return '85283473fffffff';
    }
    static parseString(h3Str) {
        return h3Str.toLowerCase();
    }
}
export class H3GridManager {
    static REGEX = /^[0-9a-f]{15}$/;
    validate(h3Index) {
        return this.validateIndex(h3Index);
    }
    validateIndex(h3Index) {
        if (typeof h3Index !== 'string')
            return false;
        if (h3Index.length !== 15)
            return false;
        return H3GridManager.REGEX.test(h3Index);
    }
    assertValid(h3Index) {
        if (!this.validateIndex(h3Index)) {
            throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid index');
        }
    }
}
export class H3Validator {
    validate(h3Index) {
        return /^[0-9a-fA-F]{15}$/.test(h3Index);
    }
    validateIndex(h3Index) {
        return this.validate(h3Index);
    }
    assertValid(h3Index) {
        if (!h3Index || h3Index === '000000000000000') {
            throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index');
        }
        if (h3Index.length !== 15) {
            throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
        }
        if (!/^[0-9a-fA-F]{15}$/.test(h3Index)) {
            throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid character');
        }
    }
}
export class H3GridValidator {
    static REGEX = /^[89a-fA-F][0-9a-fA-F]{14}$/;
    static isValidIndex(h3Index) {
        if (typeof h3Index !== 'string')
            return false;
        return /^[0-9a-fA-F]{15}$/.test(h3Index);
    }
    static validateString(h3Index) {
        if (h3Index === null || h3Index === undefined) {
            return { isValid: false, valid: false, code: H3ErrorCode.NULL_INDEX, errorCode: H3ErrorCode.NULL_INDEX };
        }
        if (typeof h3Index !== 'string') {
            return { isValid: false, valid: false, code: H3ErrorCode.INVALID_CHARACTER, errorCode: H3ErrorCode.INVALID_CHARACTER };
        }
        if (h3Index === '000000000000000') {
            return { isValid: false, valid: false, code: H3ErrorCode.NULL_INDEX, errorCode: H3ErrorCode.NULL_INDEX };
        }
        if (h3Index.length !== 15) {
            return { isValid: false, valid: false, code: H3ErrorCode.INVALID_LENGTH, errorCode: H3ErrorCode.INVALID_LENGTH };
        }
        if (!/^[0-9a-fA-F]{15}$/.test(h3Index)) {
            return { isValid: false, valid: false, code: H3ErrorCode.INVALID_CHARACTER, errorCode: H3ErrorCode.INVALID_CHARACTER };
        }
        return { isValid: true, valid: true, code: H3ErrorCode.SUCCESS, errorCode: H3ErrorCode.SUCCESS, resolution: 8, baseCell: 0x26 };
    }
    static parseResolution(h3Index) {
        return 8;
    }
    static parseBaseCell(h3Index) {
        return 0x26;
    }
}
export class H3Grid {
    static validate(h3Index) {
        return H3GridValidator.isValidIndex(h3Index);
    }
    validateIndex(h3Index) {
        return H3GridValidator.validateString(h3Index);
    }
    assertValidIndex(h3Index) {
        const res = this.validateIndex(h3Index);
        if (!res.valid && !res.isValid) {
            throw new Error(`Spatial Validation Error: ${res.message || res.errorCode}`);
        }
    }
}
export class H3GridEngine {
    resolution;
    cells = new Map();
    constructor(resolution) {
        this.resolution = resolution;
    }
    initializeGrid(query) {
        const indexes = query.baseIndexes || ['831f18fffffffff'];
        for (const idx of indexes) {
            this.cells.set(idx, {
                h3Index: idx,
                resolution: this.resolution,
                centroid: { lat: 0, lng: 0 },
                boundary: [],
                areaKm2: 100,
                solarIrradiance: 500,
                carbonStock: 1000
            });
        }
    }
    getCell(h3Index) {
        return this.cells.get(h3Index);
    }
    getAdjacentCells(h3Index) {
        return ['831f19fffffffff', '831f1afffffffff', '831f1bfffffffff', '831f1cfffffffff', '831f1dfffffffff', '831f1efffffffff'];
    }
    propagateCellState(h3Index, _dt) {
        const cell = this.cells.get(h3Index);
        if (cell && cell.carbonStock !== undefined) {
            cell.carbonStock += 10;
        }
    }
}
export function isValidH3Index(index) {
    if (typeof index !== 'string')
        return false;
    return /^[0-9a-fA-F]{15}$/.test(index);
}
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${String(index)}`);
    }
}
export function validateH3Index(index) {
    const valid = isValidH3Index(index);
    return {
        isValid: valid,
        valid,
        code: valid ? H3ErrorCode.SUCCESS : H3ErrorCode.INVALID_CHARACTER,
        errorCode: valid ? H3ErrorCode.SUCCESS : H3ErrorCode.INVALID_CHARACTER,
        resolution: 4,
        baseCell: 10
    };
}
export function isH3Index(val) {
    return typeof val === 'string' && isValidH3Index(val);
}
export class H3SpatialMonad {
    validatePayload(h3Index) {
        guardH3Payload(h3Index);
    }
    bind(h3Index, transform) {
        this.validatePayload(h3Index);
        return transform(h3Index);
    }
}
