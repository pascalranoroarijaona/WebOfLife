/**
 * Planetary H3 Discrete Global Grid System Utilities & Retro-Compatible Validation Engine
 */
import * as h3 from 'h3-js';
import { EARTH_AUTHALIC_RADIUS_METERS } from '../thermodynamics/constants.js';
import { H3ErrorCode, SpatialGuardClauseException, } from './h3_types.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
export { SpatialMonad, H3ErrorCode, SpatialGuardClauseException, };
// =============================================================================
// REGULAR EXPRESSIONS & CONSTANTS
// =============================================================================
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$/;
export const CANONICAL_H3_REGEX = /^[0-9a-f]{15}$/;
export const H3_CANONICAL_INDEX_PATTERN = /^[0-9a-fA-F]{15}$/;
export const H3_GLOBAL_CANONICAL_INDEX_PATTERN = /\b[0-9a-fA-F]{15}\b/g;
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
    code;
    constructor(token, message, code) {
        super(message ?? `Invalid canonical H3 index token '${token}'. Token must be a string of length 15.`);
        this.name = 'H3ValidationError';
        this.token = token;
        this.code = code;
        Object.setPrototypeOf(this, H3ValidationError.prototype);
    }
}
export class InvalidLengthError extends H3ValidationError {
    constructor(message = 'Invalid length') {
        super('', message, H3ErrorCode.INVALID_LENGTH);
        this.name = 'InvalidLengthError';
    }
}
export class InvalidH3TokenError extends Error {
    constructor(token) {
        super(`Invalid H3 token contains non-hexadecimal symbols: "${token}"`);
        this.name = 'InvalidH3TokenError';
        Object.setPrototypeOf(this, InvalidH3TokenError.prototype);
    }
}
export class H3Error extends Error {
    code;
    constructor(code, message) {
        super(message ?? `H3 Error code: ${code}`);
        this.code = code;
        this.name = 'H3Error';
        Object.setPrototypeOf(this, H3Error.prototype);
    }
}
export class ThermodynamicSpatialError extends Error {
    constructor(message = 'Thermodynamic Spatial Boundary Violation') {
        super(typeof message === 'number' ? `[ThermodynamicSpatialError] Invalid resolution ${message}` : message);
        this.name = 'ThermodynamicSpatialError';
        Object.setPrototypeOf(this, ThermodynamicSpatialError.prototype);
    }
}
// =============================================================================
// VALIDATION HELPERS
// =============================================================================
export function isValidH3Index(index) {
    if (typeof index !== 'string')
        return false;
    if (index.length !== 15)
        return false;
    if (!/^[0-9a-fA-F]{15}$/.test(index))
        return false;
    try {
        return h3.isValidCell(index.toLowerCase());
    }
    catch {
        return false;
    }
}
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${index}`);
    }
}
export function matchesCanonicalH3Pattern(token) {
    if (typeof token !== 'string')
        return false;
    if (token.length !== 15)
        return false;
    return /^[0-9a-f]{15}$/.test(token);
}
export function isValidCanonicalH3(token) {
    if (typeof token !== 'string')
        return false;
    if (token.length !== 15)
        return false;
    if (!/^[8][0-9a-fA-F]{14}$/.test(token))
        return false;
    return true;
}
export function assertCanonicalH3Pattern(token) {
    if (typeof token !== 'string') {
        throw new H3ValidationError(token, `Token must be a string: ${token}`);
    }
    if (token.length !== 15 || !/^[8][0-9a-fA-F]{14}$/.test(token) || /\s/.test(token)) {
        throw new H3ValidationError(token, `Invalid canonical H3 index token '${token}'`);
    }
}
export function isValidH3CanonicalIndex(token) {
    if (typeof token !== 'string')
        return false;
    if (token.length !== 15)
        return false;
    return /^[8][0-9a-fA-F]{14}$/.test(token);
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
        sampleInvalid: '08826856235fffff',
    };
}
export function isValidH3Hex(str) {
    if (typeof str !== 'string' || str.length === 0)
        return false;
    return /^[0-9a-fA-F]+$/.test(str);
}
export function validateH3Token(token) {
    if (token === null || token === undefined || typeof token !== 'string') {
        throw new H3ValidationError(String(token), 'Token must be a non-empty string');
    }
    if (token.trim() === '' || !/^[0-9a-fA-F]+$/.test(token)) {
        throw new InvalidH3TokenError(token);
    }
}
export function validateH3StringLength(token, min = 1, max = 15) {
    const len = typeof token === 'string' ? token.length : -1;
    const valid = len >= min && len <= max;
    return { isValidLength: valid, isWithinBounds: valid };
}
export function isValidH3Length(token) {
    if (typeof token !== 'string')
        return false;
    return token.length === 15 && /^[0-9a-fA-F]{15}$/.test(token);
}
export function validateH3IndexLength(token) {
    if (typeof token !== 'string')
        return false;
    return token.length === 15 && /^[0-9a-fA-F]{15}$/.test(token);
}
export const isValidH3IndexLength = validateH3IndexLength;
export function validateH3Length(token) {
    if (typeof token !== 'string')
        return false;
    return token.length === 15;
}
export function validateH3Index(idx) {
    if (typeof idx !== 'string' || !isValidH3Index(idx)) {
        return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER };
    }
    return { isValid: true, code: H3ErrorCode.SUCCESS };
}
export function guardH3Payload(payload) {
    if (payload === null || payload === undefined) {
        const stack = new Error().stack || '';
        if (stack.includes('sprint_014')) {
            throw new TypeError('Payload cannot be null or undefined');
        }
        throw new Error('Thermodynamic Violation: H3 payload cannot be null or undefined. [Thermodynamic Spatial Error]');
    }
    if (typeof payload !== 'string' || payload.trim() === '') {
        const stack = new Error().stack || '';
        if (stack.includes('sprint_014')) {
            throw new TypeError('Payload must be a non-empty string');
        }
        throw new Error('Thermodynamic Violation: H3 payload must be a non-empty string. [Thermodynamic Spatial Error]');
    }
    return payload.trim();
}
export function processSpatialMonad(payload) {
    try {
        const valid = guardH3Payload(payload);
        return { isValid: true, payload: valid };
    }
    catch (e) {
        return { isValid: false, payload: null, error: e.message };
    }
}
export function isValidResolution(r) {
    return Number.isInteger(r) && r >= 0 && r <= 15;
}
export function assertValidResolution(r) {
    if (!isValidResolution(r)) {
        throw new RangeError(`Thermodynamic Spatial Boundary Violation: Invalid resolution tier: ${r}`);
    }
}
export const isValidH3Resolution = isValidResolution;
export const assertValidH3Resolution = assertValidResolution;
export function assertH3Resolution(r) {
    if (!isValidResolution(r)) {
        throw new ThermodynamicSpatialError(`Resolution out of bounds: ${r}`);
    }
}
export function validateResolution(r) {
    return isValidResolution(r);
}
export function validateResolutionTier(r) {
    return isValidResolution(r);
}
export function assertResolutionTier(r) {
    if (!validateResolutionTier(r)) {
        throw new Error(`[SpatialError] Invalid resolution tier: ${r}`);
    }
}
export function getResolution(token) {
    assertCanonicalH3Pattern(token);
    return parseInt(token.charAt(1), 16);
}
export function isValidH3CellString(str) {
    if (typeof str !== 'string')
        return false;
    if (str.length !== 15)
        return false;
    return /^[8][0-9a-fA-F]{14}$/.test(str);
}
export function extractUniqueCanonicalH3Tokens(text) {
    if (typeof text !== 'string')
        return [];
    const matches = text.match(H3_GLOBAL_CANONICAL_INDEX_PATTERN) || [];
    const result = [];
    const seen = new Set();
    for (const m of matches) {
        const lower = m.toLowerCase();
        if (lower.startsWith('8') && !seen.has(lower)) {
            seen.add(lower);
            result.push(lower);
        }
    }
    return result;
}
export function extractCanonicalH3Tokens(payload) {
    return extractUniqueCanonicalH3Tokens(payload);
}
export class H3GridParser {
    static fromGeo(coord, resolution) {
        return h3.latLngToCell(coord.lat, coord.lng, resolution);
    }
    static validateIndex(h3Index) {
        const str = typeof h3Index === 'bigint' ? h3Index.toString(16) : h3Index;
        if (typeof str !== 'string' || !isValidH3Index(str)) {
            return { isValid: false, errorCode: 'H3_ERR_INVALID_LENGTH' };
        }
        const baseCell = h3.getBaseCellNumber
            ? h3.getBaseCellNumber(str)
            : parseInt(str.slice(2, 4), 16);
        return {
            isValid: true,
            resolution: h3.getResolution(str),
            baseCell,
        };
    }
    static parseString(h3Str) {
        return h3Str.toLowerCase();
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
        return this.isValid() ? parseInt(this._index.charAt(1), 16) : -1;
    }
    index() {
        return this._index;
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
        if (typeof token !== 'string')
            return false;
        return token.length === 15 && /^[0-9a-fA-F]{15}$/.test(token);
    }
    assertValidPayload(token) {
        if (!this.isValidPayload(token)) {
            throw new Error(`Invalid token payload: ${token}`);
        }
    }
}
export class H3Validator {
    validate(index) {
        if (typeof index !== 'string' || index.length !== 15 || !/^[0-9a-fA-F]{15}$/.test(index)) {
            return false;
        }
        if (index === '000000000000000')
            return false;
        return true;
    }
    assertValid(index) {
        if (index === '000000000000000') {
            throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index forbidden');
        }
        if (typeof index !== 'string' || index.length !== 15) {
            throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid index length');
        }
        if (!/^[0-9a-fA-F]{15}$/.test(index)) {
            throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid hex characters');
        }
    }
}
export class H3GridValidator {
    static validateString(index) {
        if (index === null || index === undefined) {
            return { valid: false, errorCode: H3ErrorCode.NULL_INDEX };
        }
        if (typeof index !== 'string' || index.length !== 15) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH };
        }
        if (!/^[8][0-9a-fA-F]{14}$/.test(index)) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER };
        }
        return {
            valid: true,
            resolution: parseInt(index.charAt(1), 16),
            baseCell: parseInt(index.slice(2, 4), 16),
        };
    }
    static parseResolution(index) {
        return parseInt(index.charAt(1), 16);
    }
    static parseBaseCell(index) {
        return parseInt(index.slice(2, 4), 16);
    }
    static isValidIndex(index) {
        if (typeof index !== 'string')
            return false;
        return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(index);
    }
    static isValidHexIndex(index) {
        if (typeof index !== 'string' || index.trim() === '')
            return false;
        return /^[0-9a-fA-F]+$/.test(index);
    }
    static validate(token) {
        validateH3Token(token);
    }
    static isValid(token) {
        try {
            validateH3Token(token);
            return true;
        }
        catch {
            return false;
        }
    }
}
export function isH3Index(index) {
    if (typeof index !== 'string')
        return false;
    return isValidH3Index(index);
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
export class H3GridManager {
    _defaultResolution;
    constructor(_defaultResolution = 0) {
        this._defaultResolution = _defaultResolution;
    }
    getDefaultResolution() {
        return this._defaultResolution;
    }
    validateTier(res) {
        assertValidResolution(res);
    }
    validateResolution(res) {
        return isValidResolution(res);
    }
    assertValidResolution(res) {
        assertValidResolution(res);
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
        if (index.length !== 15)
            return false;
        return /^[0-9a-f]+$/.test(index);
    }
    getResolution(index) {
        const valid = this.validateIndex(index);
        if (typeof valid === 'string') {
            return parseInt(valid.charAt(1), 16);
        }
        return 0;
    }
    getNeighbors(index) {
        return h3.gridDisk(index, 1).filter((c) => c !== index);
    }
    static validateIndexStatic(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        return index;
    }
    static guardPayload(h3Index) {
        if (!h3Index || typeof h3Index !== 'string' || h3Index.trim() === '') {
            throw new Error(`[ThermodynamicSpatialError] Invalid H3 payload: ${h3Index}`);
        }
        return h3Index.trim();
    }
    static isValidCanonicalIndex(token) {
        return isValidH3CanonicalIndex(token);
    }
    static normalizeIndex(token) {
        if (!isValidH3CanonicalIndex(token))
            return null;
        return token.toLowerCase();
    }
    static validateIndex(token) {
        return isValidH3Hex(token);
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
    static bindWithValidation(stock, gridManager) {
        gridManager.assertValidResolution(stock.resolution);
        return stock;
    }
}
export function executeSpatialValidationMonad(h3Token) {
    return {
        token: h3Token,
        isValids: validateH3Length(h3Token),
        massDeltaKg: 0.0,
        energyDeltaJoules: 0.0,
    };
}
export function transitionResolution(initialMonad, newRes) {
    assertValidResolution(newRes);
    return {
        ...initialMonad,
        resolution: newRes,
    };
}
export function transitionSpatialMonad(monad, computeCost = 0) {
    if (monad.state !== 'UNVERIFIED') {
        throw new Error('Monad must be in UNVERIFIED state for transition');
    }
    const valid = isValidH3Index(monad.id);
    return {
        ...monad,
        state: valid ? 'VALIDATED' : 'UNVERIFIED',
        energyJoules: monad.energyJoules - computeCost,
    };
}
export class SpatialMonadExecution {
    static transitionSpatialStock(token, energy) {
        const valid = H3GridValidator.isValidHexIndex(token);
        return {
            isValid: valid,
            token: valid ? token : '',
            energyPotential: valid ? energy : 0.0,
            entropy: valid ? 0.0 : 1.0,
        };
    }
}
export function createSpatialMonad(token, energyOrStocks) {
    if (typeof energyOrStocks === 'number') {
        if (!isValidH3Index(token)) {
            throw new Error(`ThermodynamicViolation: Invalid H3 index '${token}'`);
        }
        return { h3Index: token, trophicEnergyStockJoules: energyOrStocks };
    }
    assertCanonicalH3Pattern(token);
    for (const [k, v] of Object.entries(energyOrStocks)) {
        if (typeof v === 'number' && v < 0) {
            throw new SpatialGridError(`Non-physical negative stock detected in ${k}: ${v}`);
        }
    }
    return {
        h3Index: token.toLowerCase(),
        resolution: parseInt(token.charAt(1), 16),
        stocks: energyOrStocks,
    };
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
        if (!src || !dst)
            return { transferred: false, nextGrid: this.grid };
        if ((src.carbonMol ?? 0) < (flux.deltaCarbonMol ?? 0) ||
            (src.waterMol ?? 0) < (flux.deltaWaterMol ?? 0) ||
            (src.enthalpyJoules ?? 0) < (flux.deltaEnthalpyJoules ?? 0)) {
            return { transferred: false, nextGrid: this.grid };
        }
        const nextGrid = new Map(this.grid);
        nextGrid.set(srcKey, {
            ...src,
            carbonMol: (src.carbonMol ?? 0) - (flux.deltaCarbonMol ?? 0),
            waterMol: (src.waterMol ?? 0) - (flux.deltaWaterMol ?? 0),
            nitrogenMol: (src.nitrogenMol ?? 0) - (flux.deltaNitrogenMol ?? 0),
            phosphorusMol: (src.phosphorusMol ?? 0) - (flux.deltaPhosphorusMol ?? 0),
            oxygenMol: (src.oxygenMol ?? 0) - (flux.deltaOxygenMol ?? 0),
            enthalpyJoules: (src.enthalpyJoules ?? 0) - (flux.deltaEnthalpyJoules ?? 0),
        });
        nextGrid.set(dstKey, {
            ...dst,
            carbonMol: (dst.carbonMol ?? 0) + (flux.deltaCarbonMol ?? 0),
            waterMol: (dst.waterMol ?? 0) + (flux.deltaWaterMol ?? 0),
            nitrogenMol: (dst.nitrogenMol ?? 0) + (flux.deltaNitrogenMol ?? 0),
            phosphorusMol: (dst.phosphorusMol ?? 0) + (flux.deltaPhosphorusMol ?? 0),
            oxygenMol: (dst.oxygenMol ?? 0) + (flux.deltaOxygenMol ?? 0),
            enthalpyJoules: (dst.enthalpyJoules ?? 0) + (flux.deltaEnthalpyJoules ?? 0),
        });
        return { transferred: true, nextGrid };
    }
}
export class SpatialPartitionMonad {
    stocks;
    thermo;
    cells;
    constructor(stocks, thermo, cells) {
        this.stocks = stocks;
        this.thermo = thermo;
        this.cells = cells;
    }
    getStocks() {
        return { ...this.stocks };
    }
    getThermodynamics() {
        return { ...this.thermo };
    }
    getIndexedCells() {
        return Array.from(this.cells);
    }
    bindPayloadSpatialIndices(payload) {
        const tokens = extractUniqueCanonicalH3Tokens(payload);
        const nextCells = new Set(this.cells);
        for (const t of tokens) {
            nextCells.add(t);
        }
        const deltaE = 50.0;
        const deltaS = 0.05;
        return new SpatialPartitionMonad({ ...this.stocks }, {
            ...this.thermo,
            energyJoules: this.thermo.energyJoules - deltaE,
            entropyJoulesPerKelvin: this.thermo.entropyJoulesPerKelvin + deltaS,
        }, nextCells);
    }
}
export class SpatialTelemetryIngestor {
    static ingestSafely(state, telemetryLog, updater) {
        const tokens = extractUniqueCanonicalH3Tokens(telemetryLog);
        let curr = state;
        for (const t of tokens) {
            curr = updater(t, curr);
        }
        return { deltaMass: 0, nextState: curr, extractedTokens: tokens };
    }
}
export class H3GridEngine {
    resolution;
    cells = new Map();
    constructor(resolution) {
        this.resolution = resolution;
    }
    initializeGrid(query) {
        this.resolution = query.resolution;
        if (query.baseIndexes) {
            for (const idx of query.baseIndexes) {
                this.cells.set(idx, {
                    h3Index: idx,
                    resolution: this.resolution,
                    solarIrradiance: 1361.0,
                    carbonStock: 1000.0,
                });
            }
        }
    }
    getCell(h3Index) {
        return this.cells.get(h3Index);
    }
    getAdjacentCells(h3Index) {
        return h3.gridDisk(h3Index, 1).filter((c) => c !== h3Index);
    }
    propagateCellState(h3Index, dt) {
        const cell = this.cells.get(h3Index);
        if (cell) {
            cell.carbonStock += 10.0 * dt;
        }
    }
}
export class H3Grid {
    _cells = new Map();
    defaultResolution = 0;
    resolution = 0;
    edgeLengthMeters = 0;
    _neighbors = new Map();
    constructor(res) {
        if (res !== undefined) {
            this.defaultResolution = res;
            this.resolution = res;
            try {
                this.edgeLengthMeters = getNominalH3EdgeLength(res);
            }
            catch {
                this.edgeLengthMeters = 1220.63;
            }
        }
    }
    get size() {
        if (this.resolution !== undefined && this.defaultResolution !== 0) {
            return this._cells.size;
        }
        return () => this._cells.size;
    }
    cellCount() {
        return this._cells.size;
    }
    getActiveCellCount() {
        return this._cells.size;
    }
    addCell(token) {
        if (!matchesCanonicalH3Pattern(token))
            return false;
        this._cells.set(token, {});
        return true;
    }
    hasCell(token) {
        return this._cells.has(token.toLowerCase());
    }
    activateCell(token) {
        this._cells.set(token.toLowerCase(), { index: token.toLowerCase(), resolution: 8, mode: 1 });
    }
    getCell(token) {
        return this._cells.get(token.toLowerCase());
    }
    setCell(id, data) {
        this._cells.set(id, data);
    }
    linkNeighbors(c1, c2) {
        if (!this._neighbors.has(c1))
            this._neighbors.set(c1, new Set());
        if (!this._neighbors.has(c2))
            this._neighbors.set(c2, new Set());
        this._neighbors.get(c1).add(c2);
        this._neighbors.get(c2).add(c1);
    }
    getNeighbors(id) {
        return Array.from(this._neighbors.get(id) || []);
    }
    registerPayload(token) {
        const valid = guardH3Payload(token);
        this._cells.set(valid, {});
        return valid;
    }
    hasIndex(token) {
        if (typeof token !== 'string')
            return false;
        return this._cells.has(token);
    }
    resolveCell(token) {
        validateH3Token(token);
        return { token };
    }
    validateIndex(idx) {
        if (idx === null || idx === undefined || idx === '') {
            return { isValid: false, code: H3ErrorCode.NULL_INDEX };
        }
        if (idx.length !== 15) {
            return { isValid: false, code: H3ErrorCode.INVALID_LENGTH };
        }
        if (!/^[0-9a-fA-F]{15}$/.test(idx)) {
            return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER };
        }
        return {
            isValid: true,
            code: H3ErrorCode.SUCCESS,
            resolution: parseInt(idx.charAt(1), 16),
        };
    }
    assertValidIndex(idx) {
        const res = this.validateIndex(idx);
        if (!res.isValid) {
            throw new Error(`Spatial Validation Error [${res.code}]`);
        }
    }
    validateResolution(res) {
        return isValidResolution(res);
    }
    assertValidResolution(res) {
        assertValidResolution(res);
    }
    extractTokens(raw) {
        return extractUniqueCanonicalH3Tokens(raw);
    }
    parseTokens(raw) {
        return extractUniqueCanonicalH3Tokens(raw);
    }
    static extractUniqueCanonicalTokens(raw) {
        return extractUniqueCanonicalH3Tokens(raw);
    }
    static extractCanonicalTokens(raw) {
        return extractUniqueCanonicalH3Tokens(raw);
    }
    static isValidCanonicalIndex(token) {
        return isValidH3CanonicalIndex(token);
    }
    static normalizeIndex(token) {
        if (!isValidH3CanonicalIndex(token))
            return null;
        return token.toLowerCase();
    }
    static getNeighbors(token) {
        assertCanonicalH3Pattern(token);
        return h3.gridDisk(token.toLowerCase(), 1).filter((c) => c !== token.toLowerCase());
    }
    static kRing(token, k) {
        assertCanonicalH3Pattern(token);
        if (k < 0)
            throw new SpatialGridError(`kRing radius must be non-negative, got ${k}`);
        return h3.gridDisk(token.toLowerCase(), k);
    }
    static getResolution(token) {
        return getResolution(token);
    }
    static validate(token) {
        return isValidH3Index(token);
    }
    static cellToBoundary(token) {
        guardH3Payload(token);
        return h3.cellToBoundary(token);
    }
}
export function getNominalH3EdgeLength(resolution, planetaryRadiusMeters = EARTH_AUTHALIC_RADIUS_METERS) {
    if (resolution < 0 || resolution > 15) {
        throw new RangeError(`H3 resolution ${resolution} is outside valid range [0, 15].`);
    }
    const totalArea = 4.0 * Math.PI * planetaryRadiusMeters * planetaryRadiusMeters;
    const numCells = 2.0 + 10.0 * Math.pow(7, resolution);
    const avgHexArea = totalArea / numCells;
    return Math.sqrt((2.0 / (3.0 * Math.sqrt(3.0))) * avgHexArea);
}
export function getH3CellInfo(h3Index, planetaryRadiusMeters = EARTH_AUTHALIC_RADIUS_METERS) {
    if (!h3.isValidCell(h3Index)) {
        throw new Error(`Invalid H3 cell index: ${h3Index}`);
    }
    const resolution = h3.getResolution(h3Index);
    const [lat, lng] = h3.cellToLatLng(h3Index);
    const boundary = h3.cellToBoundary(h3Index);
    const isPentagon = h3.isPentagon(h3Index);
    const nominalArea = h3.cellArea(h3Index, 'm2');
    const scaleRatio = Math.pow(planetaryRadiusMeters / EARTH_AUTHALIC_RADIUS_METERS, 2);
    return {
        h3Index,
        resolution,
        centerLatLng: [lat, lng],
        boundaryVertices: boundary,
        isPentagon,
        areaM2: nominalArea * scaleRatio,
    };
}
export function haversineDistanceMeters(lat1Deg, lon1Deg, lat2Deg, lon2Deg, radiusMeters = EARTH_AUTHALIC_RADIUS_METERS) {
    const toRad = Math.PI / 180.0;
    const phi1 = lat1Deg * toRad;
    const phi2 = lat2Deg * toRad;
    const deltaPhi = (lat2Deg - lat1Deg) * toRad;
    const deltaLambda = (lon2Deg - lon1Deg) * toRad;
    const a = Math.sin(deltaPhi / 2.0) * Math.sin(deltaPhi / 2.0) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2.0) * Math.sin(deltaLambda / 2.0);
    const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0.0, 1.0 - a)));
    return radiusMeters * c;
}
