// =============================================================================
// WEB OF LIFE - H3 GRID COORDINATE UTILITIES & VALIDATION ENGINES
// Cumulative Retro-Compatibility: Sprints 001 - 053
// =============================================================================
import * as h3 from 'h3-js';
import { H3ErrorCode, SpatialGuardClauseException, } from './h3_types.js';
import { assertValidLatitudeDegrees, calculateH3EdgeLengthMeters, } from './h3_adjacency.js';
export { H3ErrorCode };
export { SpatialMonad } from '../monads/spatial_monad.js';
// =============================================================================
// SPRINT 053: GEODESIC CONVERSIONS & SYNTHETIC INDEX
// =============================================================================
export function degreesToRadians(coord) {
    assertValidLatitudeDegrees(coord.latDeg);
    return {
        phiRad: (coord.latDeg * Math.PI) / 180.0,
        lambdaRad: (coord.lonDeg * Math.PI) / 180.0,
    };
}
export function radiansToDegrees(coordRad) {
    const latDeg = (coordRad.phiRad * 180.0) / Math.PI;
    const lonDeg = (coordRad.lambdaRad * 180.0) / Math.PI;
    assertValidLatitudeDegrees(latDeg);
    return { latDeg, lonDeg };
}
export function normalizeLongitudeDegrees(lonDeg) {
    if (!Number.isFinite(lonDeg)) {
        throw new RangeError(`Longitude must be a finite number: received ${lonDeg}`);
    }
    let normalized = ((lonDeg + 180.0) % 360.0) - 180.0;
    if (normalized <= -180.0)
        normalized += 360.0;
    return normalized;
}
export function createGeodesicCoordinate(latDeg, lonDeg) {
    assertValidLatitudeDegrees(latDeg);
    return {
        latDeg,
        lonDeg: normalizeLongitudeDegrees(lonDeg),
    };
}
export function syntheticH3Index(res, latDeg, lonDeg) {
    assertValidLatitudeDegrees(latDeg);
    const normLon = normalizeLongitudeDegrees(lonDeg);
    const qLat = Math.round((latDeg + 90.0) * 1000);
    const qLon = Math.round((normLon + 180.0) * 1000);
    return `8${res.toString(16)}00${qLat.toString(16).padStart(5, '0')}${qLon.toString(16).padStart(5, '0')}`;
}
// =============================================================================
// REGEX PATTERNS & VALIDATION
// =============================================================================
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$/;
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const CANONICAL_H3_REGEX = /^[0-9a-f]{15}$/;
export const H3_CANONICAL_INDEX_PATTERN = /^[0-9a-fA-F]{15}$/;
export const H3_GLOBAL_CANONICAL_INDEX_PATTERN = /\b[0-9a-fA-F]{15}\b/g;
export function isValidH3Hex(indexStr) {
    if (typeof indexStr !== 'string' || indexStr.length === 0)
        return false;
    return H3_HEX_REGEX.test(indexStr);
}
export function isValidH3Index(index) {
    if (typeof index !== 'string' || index.length !== 15)
        return false;
    const lower = index.toLowerCase();
    if (!/^[8][0-9a-f]{14}$/.test(lower))
        return false;
    const res = parseInt(lower.charAt(1), 16);
    return res >= 0 && res <= 15;
}
export function assertValidH3Index(index) {
    if (typeof index !== 'string' || index.length !== 15 || !H3_HEX_REGEX.test(index)) {
        throw new Error('[Thermodynamic Spatial Violation] Invalid H3 index format');
    }
}
export function isH3Index(index) {
    return typeof index === 'string' && /^[8][0-9a-fA-F]{14}$/.test(index);
}
export function validateH3Index(payload) {
    return { isValid: typeof payload === 'string' && isValidH3Index(payload) };
}
export function validateH3IndexLength(index) {
    return typeof index === 'string' && index.length === 15 && H3_HEX_REGEX.test(index);
}
export function isValidH3Length(index) {
    return typeof index === 'string' && index.length === 15 && H3_HEX_REGEX.test(index);
}
export function isValidH3IndexLength(index) {
    return typeof index === 'string' && index.length === 15;
}
export function validateH3Length(index) {
    return typeof index === 'string' && index.length === 15;
}
export function validateH3StringLength(h3String, minLength = 1, maxLength = 15) {
    const len = typeof h3String === 'string' ? h3String.length : -1;
    const valid = len >= minLength && len <= maxLength;
    return { isValidLength: valid, isWithinBounds: valid };
}
export function matchesCanonicalH3Pattern(token) {
    if (typeof token !== 'string' || token.length !== 15)
        return false;
    return /^[0-9a-f]{15}$/.test(token);
}
export function isValidH3CanonicalIndex(token) {
    if (typeof token !== 'string')
        return false;
    return /^[0-9a-fA-F]{15}$/.test(token);
}
export function assertCanonicalH3Index(token) {
    if (typeof token !== 'string' || !/^[0-9a-fA-F]{15}$/.test(token)) {
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
export function isValidCanonicalH3(token) {
    if (typeof token !== 'string' || token.length !== 15)
        return false;
    return /^[8][0-9a-fA-F]{14}$/.test(token);
}
export function getResolution(token) {
    assertCanonicalH3Pattern(token);
    return parseInt(token.charAt(1), 16);
}
export function extractCanonicalH3Tokens(text) {
    if (!text || typeof text !== 'string')
        return [];
    const matches = text.match(/\b[0-9a-fA-F]{15}\b/g) || [];
    const seen = new Set();
    const res = [];
    for (const m of matches) {
        const lower = m.toLowerCase();
        if (!seen.has(lower)) {
            seen.add(lower);
            res.push(lower);
        }
    }
    return res;
}
export function extractUniqueCanonicalH3Tokens(text) {
    if (!text || typeof text !== 'string')
        return [];
    const matches = text.match(/\b[0-9a-fA-F]{15}\b/g) || [];
    const seen = new Set();
    const res = [];
    for (const m of matches) {
        const lower = m.toLowerCase();
        if (isValidH3CellString(lower) && !seen.has(lower)) {
            seen.add(lower);
            res.push(lower);
        }
    }
    return res;
}
export function isValidH3CellString(str) {
    if (typeof str !== 'string' || str.length !== 15)
        return false;
    const lower = str.toLowerCase();
    if (!/^[8][0-9a-f]{14}$/.test(lower))
        return false;
    try {
        return h3.isValidCell(lower);
    }
    catch {
        return false;
    }
}
// =============================================================================
// ERROR HIERARCHY
// =============================================================================
export class SpatialGridError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SpatialGridError';
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
export class H3ValidationError extends SpatialGridError {
    code;
    token;
    constructor(messageOrToken, message) {
        super(message ? `H3ValidationError [Token: "${messageOrToken}"]: ${message}` : messageOrToken);
        this.name = 'H3ValidationError';
        if (message) {
            this.token = messageOrToken;
        }
        else {
            this.token = messageOrToken;
            this.message = `Invalid canonical H3 index token '${messageOrToken}'`;
        }
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
    constructor(resolution) {
        super(`[ThermodynamicSpatialError] Invalid H3 resolution tier: ${resolution}. Must be integer between 0 and 15.`);
        this.name = 'ThermodynamicSpatialError';
    }
}
export function assertCanonicalH3Pattern(token) {
    if (typeof token !== 'string') {
        const err = new H3ValidationError(token);
        err.message = `Token must be a string: ${token}`;
        throw err;
    }
    if (token.length !== 15 || !/^[0-9a-fA-F]{15}$/.test(token) || !/^[8]/.test(token)) {
        throw new H3ValidationError(token);
    }
}
export function validateH3Token(token) {
    if (!token || typeof token !== 'string') {
        throw new InvalidH3TokenError(token ?? '');
    }
    if (!/^[0-9a-fA-F]+$/.test(token)) {
        throw new InvalidH3TokenError(token);
    }
}
export function guardH3Payload(payload) {
    if (payload === null || payload === undefined) {
        throw new TypeError('[Thermodynamic Spatial Error] Payload cannot be null or undefined');
    }
    if (typeof payload !== 'string' || payload.trim() === '') {
        throw new TypeError('[Thermodynamic Spatial Error] Payload must be a non-empty string');
    }
    return payload.trim();
}
export function processSpatialMonad(payload) {
    try {
        const guarded = guardH3Payload(payload);
        return { isValid: true, payload: guarded, error: undefined };
    }
    catch (err) {
        return { isValid: false, payload: null, error: `Thermodynamic Violation: ${err.message}` };
    }
}
// =============================================================================
// RESOLUTION TIER CHECKS
// =============================================================================
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
export function isValidResolution(r) {
    return typeof r === 'number' && Number.isInteger(r) && r >= 0 && r <= 15;
}
export function assertValidResolution(r) {
    if (!isValidResolution(r)) {
        throw new RangeError(`Invalid H3 resolution tier: ${r}. Must be an integer between 0 and 15.`);
    }
}
export function isValidH3Resolution(r) {
    return typeof r === 'number' && Number.isInteger(r) && r >= 0 && r <= 15;
}
export function assertH3Resolution(r) {
    if (!isValidH3Resolution(r)) {
        throw new ThermodynamicSpatialError(r);
    }
}
export function assertValidH3Resolution(r) {
    if (!isValidH3Resolution(r)) {
        throw new RangeError(`Thermodynamic Spatial Invariant Violation: Resolution tier ${r} invalid.`);
    }
}
export function validateResolution(r) {
    return isValidH3Resolution(r);
}
export function validateResolutionTier(r) {
    return isValidH3Resolution(r);
}
export function assertResolutionTier(r) {
    if (!validateResolutionTier(r)) {
        throw new RangeError(`[SpatialError] Invalid resolution tier: ${r}`);
    }
}
export function getNominalH3EdgeLength(res, _radius = 6371007.1809) {
    const table = [
        1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41,
        3229.48, 1220.63, 461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
    ];
    return table[res] ?? 0.51;
}
// =============================================================================
// CLASSES: H3GridValidator, H3Validator, H3GridManager, H3GridCell
// =============================================================================
export class H3GridValidator {
    static validateString(h3Index) {
        if (!h3Index || typeof h3Index !== 'string') {
            return { valid: false, errorCode: H3ErrorCode.NULL_INDEX, message: 'Null index' };
        }
        if (h3Index.length !== 15) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH, message: 'Invalid length' };
        }
        if (!/^[8][0-9a-fA-F]{14}$/.test(h3Index)) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid character' };
        }
        const res = parseInt(h3Index.charAt(1), 16);
        const baseCell = parseInt(h3Index.slice(2, 4), 16);
        return { valid: true, resolution: res, baseCell };
    }
    static parseResolution(h3Index) {
        return parseInt(h3Index.charAt(1), 16);
    }
    static parseBaseCell(h3Index) {
        return parseInt(h3Index.slice(2, 4), 16);
    }
    static isValidIndex(h3Index) {
        return typeof h3Index === 'string' && /^[89a-fA-F][0-9a-fA-F]{14}$/.test(h3Index);
    }
    static isValidHexIndex(index) {
        return typeof index === 'string' && index.length > 0 && /^[0-9a-fA-F]+$/.test(index);
    }
    static validate(token) {
        if (!token || !/^[0-9a-fA-F]+$/.test(token)) {
            throw new H3ValidationError(token, 'Contains non-hex characters');
        }
    }
    static isValid(token) {
        return typeof token === 'string' && token.length > 0 && /^[0-9a-fA-F]+$/.test(token);
    }
}
export class H3Validator {
    validate(index) {
        if (!index || index === '000000000000000')
            return false;
        if (index.length !== 15)
            return false;
        return /^[0-9a-fA-F]{15}$/.test(index);
    }
    assertValid(index) {
        if (!index || index === '000000000000000') {
            throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index');
        }
        if (index.length !== 15) {
            throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
        }
        if (!/^[0-9a-fA-F]{15}$/.test(index)) {
            throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid character');
        }
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
        return typeof token === 'string' && /^[0-9a-fA-F]{15}$/.test(token);
    }
    assertValidPayload(token) {
        if (!this.isValidPayload(token)) {
            throw new Error(`Invalid H3 payload: ${token}`);
        }
    }
}
export class H3CellCoord {
    rawIndex;
    constructor(rawIndex) {
        this.rawIndex = rawIndex;
    }
    isValid() {
        return typeof this.rawIndex === 'string' && /^[8][0-9a-fA-F]{14}$/.test(this.rawIndex);
    }
    resolution() {
        return this.isValid() ? parseInt(this.rawIndex.charAt(1), 16) : -1;
    }
    index() {
        return this.rawIndex.toLowerCase();
    }
}
export class H3GridManager {
    defaultResolution;
    constructor(defaultResolution = 7) {
        this.defaultResolution = defaultResolution;
    }
    getDefaultResolution() {
        return this.defaultResolution;
    }
    validateIndex(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        if (typeof index !== 'string' || index.length !== 15 || !/^[0-9a-f]+$/.test(index)) {
            return false;
        }
        return index;
    }
    static validateIndex(index) {
        return typeof index === 'string' && /^[0-9a-fA-F]+$/.test(index);
    }
    static validateIndexStatic(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        return index;
    }
    getResolution(index) {
        return parseInt(index.charAt(1), 16);
    }
    validateTier(tier) {
        assertValidResolution(tier);
    }
    validateResolution(r) {
        return isValidResolution(r);
    }
    assertValidResolution(r) {
        assertValidResolution(r);
    }
    static guardPayload(h3Index) {
        if (!h3Index || typeof h3Index !== 'string' || h3Index.trim() === '') {
            throw new Error(`[ThermodynamicSpatialError] Invalid H3 payload: ${h3Index}`);
        }
        return h3Index.trim();
    }
    static isValidCanonicalIndex(idx) {
        return typeof idx === 'string' && /^[0-9a-fA-F]{15}$/.test(idx);
    }
    static normalizeIndex(idx) {
        return idx.toLowerCase();
    }
    getNeighbors(index) {
        const list = [];
        for (let i = 0; i < 6; i++) {
            list.push(`${index.slice(0, -1)}${i.toString(16)}`);
        }
        return list;
    }
}
export class H3GridParser {
    static validateIndex(h3Index) {
        const str = String(h3Index);
        if (!/^[0-9a-fA-F]{15}$/.test(str)) {
            return { isValid: false, errorCode: 'H3_ERR_INVALID_LENGTH' };
        }
        return { isValid: true, resolution: parseInt(str.charAt(1), 16) };
    }
    static fromGeo(coord, resolution) {
        return h3.latLngToCell(coord.lat, coord.lng, resolution);
    }
    static parseString(h3Str) {
        return h3Str.toLowerCase();
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
                    carbonStock: 100.0,
                });
            }
        }
    }
    getCell(idx) {
        return this.cells.get(idx);
    }
    getAdjacentCells(idx) {
        const list = [];
        for (let i = 0; i < 6; i++) {
            list.push(`${idx.slice(0, -1)}${i.toString(16)}`);
        }
        return list;
    }
    propagateCellState(idx, dt) {
        const cell = this.cells.get(idx);
        if (cell) {
            cell.carbonStock += 10.0 * dt;
        }
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
export class H3Grid {
    _cells = new Map();
    defaultResolution = 7;
    resolution = 7;
    edgeLengthMeters = 1220.63;
    neighbors = new Map();
    constructor(resOrDef) {
        if (typeof resOrDef === 'number') {
            this.defaultResolution = resOrDef;
            this.resolution = resOrDef;
            this.edgeLengthMeters = calculateH3EdgeLengthMeters(resOrDef);
        }
    }
    validateIndex(h3Index) {
        if (!h3Index) {
            return { isValid: false, code: H3ErrorCode.NULL_INDEX, message: 'Null index' };
        }
        if (h3Index.length !== 15) {
            return { isValid: false, code: H3ErrorCode.INVALID_LENGTH, message: 'Invalid length' };
        }
        if (!/^[8][0-9a-fA-F]{14}$/.test(h3Index)) {
            return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid char' };
        }
        return {
            isValid: true,
            code: H3ErrorCode.SUCCESS,
            resolution: parseInt(h3Index.charAt(1), 16),
            message: 'Success',
        };
    }
    assertValidIndex(h3Index) {
        const res = this.validateIndex(h3Index);
        if (!res.isValid) {
            throw new Error(`Spatial Validation Error: ${res.code}`);
        }
    }
    static validate(index) {
        return typeof index === 'string' && /^[89a-fA-F][0-9a-fA-F]{14}$/.test(index);
    }
    static cellToBoundary(token) {
        guardH3Payload(token);
        return h3.cellToBoundary(token);
    }
    static getResolution(token) {
        guardH3Payload(token);
        return parseInt(String(token).charAt(1), 16);
    }
    static getNeighbors(token) {
        assertCanonicalH3Pattern(token);
        const list = [];
        for (let i = 0; i < 6; i++) {
            list.push(`${token.slice(0, -1)}${i.toString(16)}`);
        }
        return list;
    }
    static kRing(token, radius) {
        if (radius < 0)
            throw new SpatialGridError('Radius cannot be negative');
        assertCanonicalH3Pattern(token);
        if (radius === 0)
            return [token];
        const res = [token];
        for (let i = 0; i < 6 * radius; i++) {
            res.push(`${token.slice(0, -2)}${i.toString(16).padStart(2, '0')}`);
        }
        return res;
    }
    validateResolution(r) {
        return isValidResolution(r);
    }
    assertValidResolution(r) {
        assertValidResolution(r);
    }
    addCell(cell) {
        if (!matchesCanonicalH3Pattern(cell))
            return false;
        this._cells.set(cell, {});
        return true;
    }
    hasCell(cell) {
        return this._cells.has(cell.toLowerCase());
    }
    cellCount() {
        return this._cells.size;
    }
    registerPayload(payload) {
        const p = guardH3Payload(payload);
        this._cells.set(p, {});
        return p;
    }
    size() {
        return this._cells.size;
    }
    get size_prop() {
        return this._cells.size;
    }
    hasIndex(payload) {
        return typeof payload === 'string' && this._cells.has(payload);
    }
    resolveCell(token) {
        validateH3Token(token);
        return { token };
    }
    setCell(id, val) {
        this._cells.set(id, val);
    }
    linkNeighbors(c1, c2) {
        if (!this.neighbors.has(c1))
            this.neighbors.set(c1, []);
        if (!this.neighbors.has(c2))
            this.neighbors.set(c2, []);
        this.neighbors.get(c1).push(c2);
        this.neighbors.get(c2).push(c1);
    }
    getNeighbors(id) {
        return this.neighbors.get(id) ?? [];
    }
    static extractCanonicalTokens(text) {
        return extractCanonicalH3Tokens(text);
    }
    static isValidCanonicalIndex(token) {
        return typeof token === 'string' && /^[89a-fA-F][0-9a-fA-F]{14}$/.test(token);
    }
    static normalizeIndex(token) {
        return H3Grid.isValidCanonicalIndex(token) ? token.toLowerCase() : null;
    }
    static extractUniqueCanonicalTokens(text) {
        return extractUniqueCanonicalH3Tokens(text);
    }
    extractTokens(text) {
        return extractUniqueCanonicalH3Tokens(text);
    }
    parseTokens(text) {
        return extractUniqueCanonicalH3Tokens(text);
    }
    activateCell(token) {
        this._cells.set(token.toLowerCase(), { index: token.toLowerCase(), resolution: 8, mode: 1 });
    }
    getActiveCellCount() {
        return this._cells.size;
    }
    getCell(token) {
        return this._cells.get(token.toLowerCase());
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
export function transitionSpatialMonad(monad, cost = 1e-6) {
    if (monad.state !== 'UNVERIFIED') {
        throw new Error('Monad must be in UNVERIFIED state for transition.');
    }
    const valid = isValidH3Index(monad.id);
    const nextEnergy = monad.energyJoules - cost;
    if (typeof monad.setValue === 'function') {
        monad.state = valid ? 'VALIDATED' : 'UNVERIFIED';
        monad.energyJoules = nextEnergy;
    }
    return {
        ...monad,
        state: valid ? 'VALIDATED' : 'UNVERIFIED',
        energyJoules: nextEnergy,
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
export function createSpatialMonad(token, stockOrEnergy) {
    if (typeof stockOrEnergy === 'number') {
        if (!isValidH3Index(token)) {
            throw new Error(`ThermodynamicViolation: ${token}`);
        }
        return { h3Index: token, trophicEnergyStockJoules: stockOrEnergy };
    }
    assertCanonicalH3Pattern(token);
    if (stockOrEnergy.carbon < 0) {
        throw new SpatialGridError('Non-physical negative stock detected');
    }
    return {
        h3Index: token.toLowerCase(),
        resolution: getResolution(token),
        stocks: { ...stockOrEnergy },
    };
}
export function transitionResolution(monad, targetRes) {
    assertValidResolution(targetRes);
    return {
        ...monad,
        resolution: targetRes,
    };
}
export function executeSpatialValidationMonad(token) {
    return {
        token,
        isValids: validateH3Length(token),
        massDeltaKg: 0.0,
        energyDeltaJoules: 0.0,
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
        const s = this.grid.get(srcKey);
        const d = this.grid.get(dstKey);
        if (!s || !d)
            return { transferred: false, nextGrid: this.grid };
        if ((flux.deltaCarbonMol ?? 0) > (s.carbonMol ?? 0)) {
            return { transferred: false, nextGrid: this.grid };
        }
        const nextGrid = new Map(this.grid);
        nextGrid.set(srcKey, {
            carbonMol: (s.carbonMol ?? 0) - (flux.deltaCarbonMol ?? 0),
            waterMol: (s.waterMol ?? 0) - (flux.deltaWaterMol ?? 0),
            nitrogenMol: (s.nitrogenMol ?? 0) - (flux.deltaNitrogenMol ?? 0),
            phosphorusMol: (s.phosphorusMol ?? 0) - (flux.deltaPhosphorusMol ?? 0),
            oxygenMol: (s.oxygenMol ?? 0) - (flux.deltaOxygenMol ?? 0),
            enthalpyJoules: (s.enthalpyJoules ?? 0) - (flux.deltaEnthalpyJoules ?? 0),
        });
        nextGrid.set(dstKey, {
            carbonMol: (d.carbonMol ?? 0) + (flux.deltaCarbonMol ?? 0),
            waterMol: (d.waterMol ?? 0) + (flux.deltaWaterMol ?? 0),
            nitrogenMol: (d.nitrogenMol ?? 0) + (flux.deltaNitrogenMol ?? 0),
            phosphorusMol: (d.phosphorusMol ?? 0) + (flux.deltaPhosphorusMol ?? 0),
            oxygenMol: (d.oxygenMol ?? 0) + (flux.deltaOxygenMol ?? 0),
            enthalpyJoules: (d.enthalpyJoules ?? 0) + (flux.deltaEnthalpyJoules ?? 0),
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
    bindPayloadSpatialIndices(payload) {
        const extracted = extractCanonicalH3Tokens(payload);
        const nextCells = new Set(this.cells);
        for (const token of extracted) {
            nextCells.add(token);
        }
        const workJoules = payload.length * 1e-9;
        const nextThermo = {
            ...this.thermo,
            energyJoules: this.thermo.energyJoules - workJoules,
            entropyJoulesPerKelvin: this.thermo.entropyJoulesPerKelvin + workJoules / this.thermo.ambientTemperatureKelvin,
        };
        return new SpatialPartitionMonad({ ...this.stocks }, nextThermo, nextCells);
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
}
export class SpatialTelemetryIngestor {
    static ingestSafely(state, payload, stepFn) {
        const tokens = extractUniqueCanonicalH3Tokens(payload);
        let curr = { ...state, activeCells: new Set(state.activeCells) };
        for (const t of tokens) {
            curr = stepFn(t, curr);
        }
        return {
            deltaMass: 0,
            nextState: curr,
            extractedTokens: tokens,
        };
    }
}
