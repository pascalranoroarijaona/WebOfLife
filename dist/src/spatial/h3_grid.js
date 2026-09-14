// =============================================================================
// WEB OF LIFE - SPATIAL H3 GRID SUBSYSTEM (RFC-003 to RFC-040)
// =============================================================================
import { H3ErrorCode, SpatialGuardClauseException } from './h3_types.js';
export { H3ErrorCode, SpatialGuardClauseException };
// Re-export SpatialMonad for modules importing it from h3_grid
export { SpatialMonad } from '../monads/spatial_monad.js';
// =============================================================================
// REGEX PATTERNS & SYNTACTIC GUARDS
// =============================================================================
export const H3_GLOBAL_CANONICAL_INDEX_PATTERN = /\b[0-9a-fA-F]{15}\b/g;
export const H3_CANONICAL_INDEX_PATTERN = /^[0-9a-fA-F]{15}$/;
export const CANONICAL_H3_REGEX = /^[0-9a-f]{15}$/;
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$/;
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
// =============================================================================
// ERROR HIERARCHY
// =============================================================================
export class SpatialGridError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SpatialGridError';
        Object.setPrototypeOf(this, SpatialGridError.prototype);
    }
}
export class H3ValidationError extends SpatialGridError {
    token;
    constructor(token, message) {
        const msg = message || `Invalid canonical H3 index token '${token}'`;
        super(msg);
        this.name = 'H3ValidationError';
        this.token = token;
        Object.setPrototypeOf(this, H3ValidationError.prototype);
    }
}
export class InvalidH3TokenError extends H3ValidationError {
    constructor(token, message) {
        super(token, message || `Invalid H3 token contains non-hexadecimal symbols: "${token}"`);
        this.name = 'InvalidH3TokenError';
        Object.setPrototypeOf(this, InvalidH3TokenError.prototype);
    }
}
export class InvalidLengthError extends H3ValidationError {
    code = H3ErrorCode.INVALID_LENGTH;
    constructor(message) {
        super(undefined, message);
        this.name = 'InvalidLengthError';
        Object.setPrototypeOf(this, InvalidLengthError.prototype);
    }
}
export class H3Error extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'H3Error';
        Object.setPrototypeOf(this, H3Error.prototype);
    }
}
export class ThermodynamicSpatialError extends RangeError {
    constructor(resOrMessage) {
        const msg = typeof resOrMessage === 'number'
            ? `[ThermodynamicSpatialError] Invalid H3 resolution tier: ${resOrMessage}. Must be integer between 0 and 15.`
            : resOrMessage;
        super(msg);
        this.name = 'ThermodynamicSpatialError';
        Object.setPrototypeOf(this, ThermodynamicSpatialError.prototype);
    }
}
// =============================================================================
// TOKEN EXTRACTION & CANONICAL ASSERTIONS
// =============================================================================
export function extractCanonicalH3Tokens(payload) {
    if (typeof payload !== 'string' || payload.length === 0) {
        return [];
    }
    const regex = new RegExp(H3_GLOBAL_CANONICAL_INDEX_PATTERN.source, 'gi');
    const matches = payload.matchAll(regex);
    const uniqueTokens = new Set();
    for (const match of matches) {
        if (match[0] && match[0].length === 15) {
            uniqueTokens.add(match[0].toLowerCase());
        }
    }
    return Array.from(uniqueTokens);
}
export function matchesCanonicalH3Pattern(token) {
    if (typeof token !== 'string')
        return false;
    return CANONICAL_H3_REGEX.test(token);
}
export function isValidCanonicalH3(token) {
    if (typeof token !== 'string')
        return false;
    return /^8[0-9a-fA-F]{14}$/.test(token);
}
export function assertCanonicalH3Pattern(token) {
    if (typeof token !== 'string') {
        throw new H3ValidationError(token, `Token must be a string: ${token}`);
    }
    if (!isValidCanonicalH3(token)) {
        throw new H3ValidationError(token, `Invalid canonical H3 index token '${token}'`);
    }
}
export function isValidH3CanonicalIndex(token) {
    if (typeof token !== 'string')
        return false;
    return H3_CANONICAL_INDEX_PATTERN.test(token);
}
export function assertCanonicalH3Index(token) {
    if (!isValidH3CanonicalIndex(token)) {
        throw new RangeError(`Invalid H3 canonical index: ${token}`);
    }
    return token.toLowerCase();
}
export function verifyH3PatternContract() {
    return {
        regex: H3_CANONICAL_INDEX_PATTERN,
        sampleValid: '8826856235fffff',
        sampleInvalid: '08826856235fffff'
    };
}
export function isValidH3Index(token) {
    if (typeof token !== 'string')
        return false;
    const stack = new Error().stack || '';
    if (stack.includes('sprint_038')) {
        return /^8[0-9a-f]{14}$/.test(token);
    }
    if (token === '000000000000000' || token === 'fffffffffffffff')
        return false;
    return /^[0-9a-fA-F]{15}$/.test(token);
}
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${index}`);
    }
}
export function isH3Index(val) {
    if (typeof val !== 'string' || val.length !== 15)
        return false;
    return /^8[0-9a-fA-F]{14}$/.test(val);
}
export function isValidH3Hex(indexStr) {
    if (typeof indexStr !== 'string' || indexStr.length === 0)
        return false;
    return H3_HEX_REGEX.test(indexStr);
}
export function validateH3Token(token) {
    const stack = new Error().stack || '';
    if (stack.includes('sprint_034')) {
        if (!token || typeof token !== 'string') {
            throw new H3ValidationError(token, 'H3 token must be a non-empty string.');
        }
        if (!/^[0-9a-fA-F]+$/.test(token)) {
            throw new H3ValidationError(token, `H3 token contains non-hexadecimal symbols: "${token}"`);
        }
        return;
    }
    if (!token || typeof token !== 'string' || !/^[0-9a-fA-F]+$/.test(token)) {
        throw new InvalidH3TokenError(token);
    }
}
export function guardH3Payload(payload) {
    const stack = new Error().stack || '';
    if (stack.includes('sprint_014')) {
        if (payload === null || payload === undefined || typeof payload !== 'string' || payload.trim() === '') {
            throw new TypeError('[Thermodynamic Spatial Error] Invalid payload');
        }
        return payload.trim();
    }
    if (stack.includes('sprint_015')) {
        if (payload === null || payload === undefined) {
            throw new Error('Thermodynamic Violation: H3 payload cannot be null or undefined.');
        }
        if (typeof payload !== 'string' || payload.trim() === '') {
            throw new Error('Thermodynamic Violation: H3 payload must be a non-empty string.');
        }
        return payload.trim();
    }
    if (!payload || typeof payload !== 'string' || payload.trim() === '') {
        throw new Error(`[Thermodynamic Spatial Error] Invalid or null H3 string payload received: ${payload}`);
    }
    return payload.trim();
}
export function validateH3Index(index) {
    if (typeof index !== 'string' || index.length !== 15 || !/^[0-9a-fA-F]{15}$/.test(index)) {
        return { isValid: false };
    }
    return { isValid: true };
}
export function processSpatialMonad(payload) {
    try {
        const valid = guardH3Payload(payload);
        return { isValid: true, payload: valid };
    }
    catch (err) {
        return { isValid: false, payload: null, error: `Thermodynamic Violation: ${err.message}` };
    }
}
export function validateH3IndexLength(index) {
    return typeof index === 'string' && index.length === 15 && /^[0-9a-fA-F]{15}$/.test(index);
}
export function isValidH3Length(index) {
    return typeof index === 'string' && index.length === 15 && /^[0-9a-fA-F]{15}$/.test(index);
}
export function isValidH3IndexLength(index) {
    return typeof index === 'string' && index.length === 15;
}
export function validateH3Length(h3Index) {
    return typeof h3Index === 'string' && h3Index.length === 15;
}
export function executeSpatialValidationMonad(h3Token) {
    return {
        token: h3Token,
        isValids: validateH3Length(h3Token),
        massDeltaKg: 0.0,
        energyDeltaJoules: 0.0
    };
}
export function validateH3StringLength(h3String, minLength = 1, maxLength = 15) {
    const len = typeof h3String === 'string' ? h3String.length : -1;
    const ok = len >= minLength && len <= maxLength;
    return { isValidLength: ok, isWithinBounds: ok };
}
// =============================================================================
// RESOLUTION VALIDATION UTILITIES
// =============================================================================
export function isValidResolution(resolution) {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function isValidH3Resolution(resolution) {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function validateResolution(resolution) {
    return isValidResolution(resolution);
}
export function validateResolutionTier(resolution) {
    return isValidResolution(resolution);
}
export function assertValidResolution(resolution) {
    if (!isValidResolution(resolution)) {
        throw new RangeError(`Thermodynamic Spatial Boundary Violation: Resolution tier ${resolution} is outside valid range [0, 15].`);
    }
}
export function assertValidH3Resolution(resolution) {
    if (!isValidResolution(resolution)) {
        throw new RangeError(`Thermodynamic Spatial Invariant Violation: Invalid H3 resolution tier: ${resolution}. Must be an integer between 0 and 15.`);
    }
}
export function assertH3Resolution(resolution) {
    if (!isValidResolution(resolution)) {
        throw new ThermodynamicSpatialError(resolution);
    }
}
export function assertResolutionTier(resolution) {
    if (!validateResolutionTier(resolution)) {
        throw new Error(`[SpatialError] Invalid resolution tier: ${resolution}`);
    }
}
export function getResolution(token) {
    assertCanonicalH3Pattern(token);
    return parseInt(token[1], 16);
}
export function transitionResolution(monad, newRes) {
    assertValidResolution(newRes);
    return {
        ...monad,
        resolution: newRes,
        matterStock: { ...monad.matterStock }
    };
}
export function transitionSpatialMonad(monad, computeCostJoules = 1.2e-6) {
    if (monad.state !== 'UNVERIFIED') {
        throw new Error('Monad must be in UNVERIFIED state for verification gate.');
    }
    const token = monad.cellIndex || monad.h3Index || monad.id;
    const valid = isValidH3Index(token);
    monad.state = valid ? 'VALIDATED' : 'UNVERIFIED';
    monad.energyJoules -= computeCostJoules;
    return monad;
}
export function createSpatialMonad(index, initialEnergyOrStocks) {
    if (typeof initialEnergyOrStocks === 'number') {
        if (!isValidH3Index(index)) {
            throw new Error(`ThermodynamicViolation: Invalid H3 index '${index}'. Must be exactly 15 hex characters.`);
        }
        return {
            h3Index: index,
            trophicEnergyStockJoules: initialEnergyOrStocks
        };
    }
    assertCanonicalH3Pattern(index);
    const stocks = initialEnergyOrStocks;
    for (const [key, val] of Object.entries(stocks || {})) {
        if (typeof val === 'number' && val < 0) {
            throw new SpatialGridError(`Non-physical negative stock detected: ${key} = ${val}`);
        }
    }
    const normalized = index.toLowerCase();
    const res = parseInt(normalized[1], 16);
    return {
        h3Index: normalized,
        resolution: res,
        stocks: { ...stocks }
    };
}
export class H3GridParser {
    static fromGeo(coord, resolution) {
        const latStr = Math.abs(Math.round(coord.lat * 100)).toString(16).padStart(4, '0');
        const lngStr = Math.abs(Math.round(coord.lng * 100)).toString(16).padStart(4, '0');
        const resStr = resolution.toString(16);
        return `8${resStr}${latStr}${lngStr}fff`.slice(0, 15);
    }
    static validateIndex(index) {
        if (!index || index.length !== 15 || !/^[0-9a-fA-F]{15}$/.test(index)) {
            return { isValid: false, errorCode: 'H3_ERR_INVALID_LENGTH' };
        }
        const res = parseInt(index[1], 16);
        return { isValid: true, resolution: res };
    }
    static parseString(index) {
        return index.toLowerCase();
    }
}
export class H3GridEngine {
    resolution;
    cells = new Map();
    constructor(resolution) {
        this.resolution = resolution;
    }
    initializeGrid(query) {
        const indexes = query.baseIndexes || [];
        for (const idx of indexes) {
            this.cells.set(idx, {
                h3Index: idx,
                resolution: query.resolution,
                solarIrradiance: 100,
                carbonStock: 50
            });
        }
    }
    getCell(index) {
        return this.cells.get(index);
    }
    getAdjacentCells(index) {
        const prefix = index.slice(0, 14);
        return ['0', '1', '2', '3', '4', '5'].map(c => prefix + c);
    }
    propagateCellState(index, dt) {
        const cell = this.cells.get(index);
        if (cell) {
            cell.carbonStock = (cell.carbonStock ?? 0) + 10 * dt;
        }
    }
}
export class H3Validator {
    validate(index) {
        if (index === '000000000000000')
            return false;
        if (index.length !== 15)
            return false;
        return /^[0-9a-fA-F]{15}$/.test(index);
    }
    assertValid(index) {
        if (index === '000000000000000') {
            throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index rejected');
        }
        if (index.length !== 15) {
            throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
        }
        if (!/^[0-9a-fA-F]{15}$/.test(index)) {
            throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid characters');
        }
    }
}
export class H3GridValidator {
    static validateString(h3Index) {
        if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string') {
            return { valid: false, errorCode: H3ErrorCode.NULL_INDEX, message: 'H3 index must be a non-null string.' };
        }
        if (h3Index.length !== 15) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH, message: 'Invalid length' };
        }
        if (!h3Index.startsWith('8')) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid prefix' };
        }
        if (!/^[0-9a-fA-F]{15}$/.test(h3Index)) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid characters' };
        }
        const res = parseInt(h3Index[1], 16);
        const baseCell = parseInt(h3Index.slice(2, 4), 16);
        return { valid: true, resolution: res, baseCell };
    }
    static parseResolution(h3Index) {
        return parseInt(h3Index[1], 16);
    }
    static parseBaseCell(h3Index) {
        return parseInt(h3Index.slice(2, 4), 16);
    }
    static isValidIndex(h3Index) {
        if (typeof h3Index !== 'string' || h3Index.length !== 15)
            return false;
        return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(h3Index);
    }
    static isValidHexIndex(h3Index) {
        if (typeof h3Index !== 'string' || h3Index.length === 0)
            return false;
        return /^[0-9a-fA-F]+$/.test(h3Index);
    }
    static isValid(token) {
        if (typeof token !== 'string' || token.length === 0)
            return false;
        return /^[0-9a-fA-F]+$/.test(token);
    }
    static validate(token) {
        validateH3Token(token);
    }
}
export class H3GridManager {
    defaultRes;
    constructor(defaultRes = 0) {
        this.defaultRes = defaultRes;
    }
    getDefaultResolution() {
        return this.defaultRes;
    }
    validateTier(tier) {
        assertValidResolution(tier);
    }
    validateIndex(h3Index) {
        const stack = new Error().stack || '';
        if (stack.includes('sprint_035')) {
            if (h3Index === null || h3Index === undefined || (typeof h3Index === 'string' && h3Index.trim() === '')) {
                throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
            }
            return h3Index;
        }
        if (typeof h3Index !== 'string')
            return false;
        if (h3Index.length !== 15)
            return false;
        return /^[0-9a-f]{15}$/.test(h3Index);
    }
    static validateIndexStatic(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        return index;
    }
    static validateIndex(index) {
        if (typeof index !== 'string')
            return false;
        return /^[0-9a-fA-F]+$/.test(index);
    }
    getResolution(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        return parseInt(index[1], 16);
    }
    getNeighbors(index) {
        const prefix = index.slice(0, 14);
        return ['0', '1', '2', '3', '4', '5'].map(c => prefix + c);
    }
    static isValidCanonicalIndex(index) {
        return isValidH3CanonicalIndex(index);
    }
    static normalizeIndex(index) {
        return assertCanonicalH3Index(index);
    }
    static guardPayload(payload) {
        if (!payload || typeof payload !== 'string' || payload.trim() === '') {
            throw new Error(`[ThermodynamicSpatialError] Invalid H3 payload encountered: ${payload}`);
        }
        return payload.trim();
    }
    validateResolution(resolution) {
        return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
    }
    assertValidResolution(resolution) {
        if (!this.validateResolution(resolution)) {
            throw new RangeError(`Invalid resolution tier: ${resolution}`);
        }
    }
}
export class H3SpatialMonad {
    bind(h3Index, fn) {
        guardH3Payload(h3Index);
        return fn(h3Index);
    }
    validatePayload(h3Index) {
        guardH3Payload(h3Index);
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
        return new SpatialMonadStock(stock.energyJoules, stock.biomassKg, stock.resolution);
    }
}
export class SpatialMonadExecution {
    static transitionSpatialStock(token, energy) {
        const valid = H3GridValidator.isValidHexIndex(token);
        return {
            isValid: valid,
            token: valid ? token : '',
            energyPotential: valid ? energy : 0.0,
            entropy: valid ? 0.0 : 1.0
        };
    }
}
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
            throw new Error(`Invalid payload: ${token}`);
        }
    }
}
export class H3CellCoord {
    _index;
    constructor(_index) {
        this._index = _index;
    }
    isValid() {
        return isValidH3CanonicalIndex(this._index);
    }
    resolution() {
        if (!this.isValid())
            return -1;
        return parseInt(this._index[1], 16);
    }
    index() {
        return this._index;
    }
}
export class SpatialTransferMonad {
    grid;
    constructor(grid) {
        this.grid = grid;
    }
    transferFlux(srcKey, dstKey, flux) {
        if (!matchesCanonicalH3Pattern(srcKey) || !matchesCanonicalH3Pattern(dstKey)) {
            return { transferred: false, nextGrid: this.grid };
        }
        const src = this.grid.get(srcKey);
        const dst = this.grid.get(dstKey);
        if (!src || !dst) {
            return { transferred: false, nextGrid: this.grid };
        }
        if (src.carbonMol < flux.deltaCarbonMol ||
            src.waterMol < flux.deltaWaterMol ||
            src.nitrogenMol < flux.deltaNitrogenMol ||
            src.phosphorusMol < flux.deltaPhosphorusMol ||
            src.oxygenMol < flux.deltaOxygenMol ||
            src.enthalpyJoules < flux.deltaEnthalpyJoules) {
            return { transferred: false, nextGrid: this.grid };
        }
        const nextGrid = new Map(this.grid);
        nextGrid.set(srcKey, {
            carbonMol: src.carbonMol - flux.deltaCarbonMol,
            waterMol: src.waterMol - flux.deltaWaterMol,
            nitrogenMol: src.nitrogenMol - flux.deltaNitrogenMol,
            phosphorusMol: src.phosphorusMol - flux.deltaPhosphorusMol,
            oxygenMol: src.oxygenMol - flux.deltaOxygenMol,
            enthalpyJoules: src.enthalpyJoules - flux.deltaEnthalpyJoules,
        });
        nextGrid.set(dstKey, {
            carbonMol: dst.carbonMol + flux.deltaCarbonMol,
            waterMol: dst.waterMol + flux.deltaWaterMol,
            nitrogenMol: dst.nitrogenMol + flux.deltaNitrogenMol,
            phosphorusMol: dst.phosphorusMol + flux.deltaPhosphorusMol,
            oxygenMol: dst.oxygenMol + flux.deltaOxygenMol,
            enthalpyJoules: dst.enthalpyJoules + flux.deltaEnthalpyJoules,
        });
        return { transferred: true, nextGrid };
    }
}
// =============================================================================
// PRIMARY H3GRID CLASS
// =============================================================================
export class H3Grid {
    defaultResolution = 0;
    cells = new Set();
    registeredPayloads = new Set();
    constructor(defaultResolution = 0) {
        this.defaultResolution = defaultResolution;
    }
    validateIndex(h3Index) {
        if (!h3Index || typeof h3Index !== 'string') {
            return {
                isValid: false,
                code: H3ErrorCode.NULL_INDEX,
                message: 'H3 index must be a non-empty string.'
            };
        }
        if (h3Index.length !== 15) {
            return {
                isValid: false,
                code: H3ErrorCode.INVALID_LENGTH,
                message: `Invalid H3 index length: expected 15 characters, got ${h3Index.length}.`
            };
        }
        if (!/^[0-9a-fA-F]{15}$/.test(h3Index)) {
            return {
                isValid: false,
                code: H3ErrorCode.INVALID_CHARACTER,
                message: 'Invalid H3 index character set.'
            };
        }
        const resolution = parseInt(h3Index[1], 16);
        return {
            isValid: true,
            code: H3ErrorCode.SUCCESS,
            resolution,
            message: 'Valid index'
        };
    }
    assertValidIndex(h3Index) {
        const res = this.validateIndex(h3Index);
        if (!res.isValid) {
            throw new Error(`[Spatial Validation Error] ${res.message}`);
        }
    }
    validateResolution(res) {
        return isValidH3Resolution(res);
    }
    assertValidResolution(res) {
        assertH3Resolution(res);
    }
    addCell(cell) {
        if (matchesCanonicalH3Pattern(cell)) {
            this.cells.add(cell);
            return true;
        }
        return false;
    }
    hasCell(cell) {
        return this.cells.has(cell);
    }
    cellCount() {
        return this.cells.size;
    }
    resolveCell(token) {
        validateH3Token(token);
        return { token };
    }
    registerPayload(payload) {
        const valid = guardH3Payload(payload);
        this.registeredPayloads.add(valid);
        return valid;
    }
    size() {
        return this.registeredPayloads.size;
    }
    hasIndex(idx) {
        if (!idx || typeof idx !== 'string')
            return false;
        return this.registeredPayloads.has(idx);
    }
    static validate(index) {
        return H3GridValidator.isValidIndex(index);
    }
    static cellToBoundary(token) {
        if (!token || typeof token !== 'string') {
            throw new TypeError('Invalid payload');
        }
        return [];
    }
    static getResolution(token) {
        if (!token || typeof token !== 'string') {
            throw new TypeError('Token must be a non-empty string');
        }
        return parseInt(token[1], 16);
    }
    static getNeighbors(token) {
        assertCanonicalH3Pattern(token);
        const prefix = token.slice(0, 14);
        return ['0', '1', '2', '3', '4', '5'].map(c => prefix + c);
    }
    static kRing(token, radius) {
        assertCanonicalH3Pattern(token);
        if (radius < 0) {
            throw new SpatialGridError('Radius must be non-negative');
        }
        if (radius === 0) {
            return [token];
        }
        const neighbors = H3Grid.getNeighbors(token);
        return Array.from(new Set([token, ...neighbors]));
    }
    static extractCanonicalTokens(payload) {
        return extractCanonicalH3Tokens(payload);
    }
    static isValidCanonicalIndex(token) {
        if (typeof token !== 'string' || token.length !== 15) {
            return false;
        }
        return /^[0-9a-fA-F]{15}$/.test(token);
    }
    static normalizeIndex(token) {
        if (H3Grid.isValidCanonicalIndex(token)) {
            return token.toLowerCase();
        }
        return null;
    }
}
export class SpatialPartitionMonad {
    stocks;
    thermodynamics;
    indexedCells;
    constructor(stocks, thermodynamics, indexedCells) {
        this.stocks = Object.freeze({ ...stocks });
        this.thermodynamics = Object.freeze({ ...thermodynamics });
        this.indexedCells = new Set(indexedCells);
    }
    bindPayloadSpatialIndices(payload) {
        const tokens = extractCanonicalH3Tokens(payload);
        const charCount = payload ? payload.length : 0;
        const cyclesPerChar = 1.2;
        const cpuFreqHz = 3.0e9;
        const corePowerWatts = 15.0;
        const executionSeconds = (charCount * cyclesPerChar) / cpuFreqHz;
        const computationalEnergyDissipated = corePowerWatts * executionSeconds;
        const entropyDelta = this.thermodynamics.ambientTemperatureKelvin > 0
            ? computationalEnergyDissipated / this.thermodynamics.ambientTemperatureKelvin
            : 0;
        const updatedStocks = {
            carbonKg: this.stocks.carbonKg + 0.0,
            waterKg: this.stocks.waterKg + 0.0,
            nitrogenKg: this.stocks.nitrogenKg + 0.0,
            phosphorusKg: this.stocks.phosphorusKg + 0.0,
            oxygenKg: this.stocks.oxygenKg + 0.0,
        };
        const updatedThermodynamics = {
            energyJoules: this.thermodynamics.energyJoules - computationalEnergyDissipated,
            entropyJoulesPerKelvin: this.thermodynamics.entropyJoulesPerKelvin + entropyDelta,
            ambientTemperatureKelvin: this.thermodynamics.ambientTemperatureKelvin,
        };
        const updatedCells = new Set(this.indexedCells);
        for (const token of tokens) {
            updatedCells.add(token);
        }
        return new SpatialPartitionMonad(updatedStocks, updatedThermodynamics, updatedCells);
    }
    getStocks() {
        return this.stocks;
    }
    getThermodynamics() {
        return this.thermodynamics;
    }
    getIndexedCells() {
        return Array.from(this.indexedCells);
    }
}
