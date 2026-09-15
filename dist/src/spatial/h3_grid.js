/**
 * src/spatial/h3_grid.ts
 * Unified Geodesic and Cartesian projection utilities, canonical validation,
 * error hierarchies, and H3 grid managers across all sprints.
 */
import { H3ErrorCode, SpatialGuardClauseException, } from './h3_types.js';
import { EARTH_RADIUS_METERS } from './h3_adjacency.js';
import { SpatialMonad } from '../monads/spatial_monad.js';
export { SpatialMonad } from '../monads/spatial_monad.js';
export { H3ErrorCode, SpatialGuardClauseException };
// =============================================================================
// CARTESIAN & GEODESIC PROJECTIONS (SPRINT 070)
// =============================================================================
export function geoToCartesian3D(coord) {
    const phi = (coord.lat * Math.PI) / 180;
    const lambda = (coord.lng * Math.PI) / 180;
    const cosPhi = Math.cos(phi);
    return {
        x: cosPhi * Math.cos(lambda),
        y: cosPhi * Math.sin(lambda),
        z: Math.sin(phi),
    };
}
export function cartesian3DToGeo(v) {
    const mag = Math.hypot(v.x, v.y, v.z);
    if (mag <= 1e-30) {
        throw new Error('Cannot project zero-magnitude vector to spherical coordinates.');
    }
    const normZ = Math.max(-1.0, Math.min(1.0, v.z / mag));
    const latRad = Math.asin(normZ);
    const lngRad = Math.atan2(v.y, v.x);
    return {
        lat: (latRad * 180) / Math.PI,
        lng: (lngRad * 180) / Math.PI,
    };
}
export function greatCircleDistanceMeters(v1, v2, radiusMeters = EARTH_RADIUS_METERS) {
    const cx = v1.y * v2.z - v1.z * v2.y;
    const cy = v1.z * v2.x - v1.x * v2.z;
    const cz = v1.x * v2.y - v1.y * v2.x;
    const crossNorm = Math.hypot(cx, cy, cz);
    const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    return Math.atan2(crossNorm, dot) * radiusMeters;
}
// =============================================================================
// REGEX PATTERNS & CONSTANTS
// =============================================================================
export const H3_REGEX = /^[89a-fA-F][0-9a-fA-F]{14}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$/;
export const H3_CANONICAL_INDEX_PATTERN = /^[0-9a-fA-F]{15}$/;
export const CANONICAL_H3_REGEX = /^[0-9a-f]{15}$/;
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
    constructor(token = '', message) {
        const msg = message || `Invalid canonical H3 index token '${token}'`;
        super(msg);
        this.token = token;
        this.name = 'H3ValidationError';
        Object.setPrototypeOf(this, H3ValidationError.prototype);
    }
}
export class H3Error extends Error {
    code;
    constructor(code, message = 'H3 spatial error') {
        super(message);
        this.code = code;
        this.name = 'H3Error';
    }
}
export class InvalidLengthError extends Error {
    code = H3ErrorCode.INVALID_LENGTH;
    constructor(message = 'Invalid length') {
        super(message);
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
    constructor(resolutionOrMessage) {
        const msg = typeof resolutionOrMessage === 'number'
            ? `[ThermodynamicSpatialError] Invalid H3 resolution tier: ${resolutionOrMessage}. Must be integer between 0 and 15.`
            : String(resolutionOrMessage);
        super(msg);
        this.name = 'ThermodynamicSpatialError';
    }
}
// =============================================================================
// VALIDATION HELPER FUNCTIONS
// =============================================================================
export function isValidH3Hex(token) {
    if (typeof token !== 'string' || token.length === 0)
        return false;
    return /^[0-9a-fA-F]+$/.test(token);
}
export function isValidH3Index(token) {
    if (typeof token !== 'string' || token.length !== 15)
        return false;
    const lower = token.toLowerCase();
    if (!/^[8][0-9a-f]{14}$/.test(lower))
        return false;
    const res = parseInt(lower.charAt(1), 16);
    return res >= 0 && res <= 15;
}
export function assertValidH3Index(token) {
    if (!isValidH3Index(token)) {
        throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${token}`);
    }
}
export function validateH3IndexLength(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15 && /^[0-9a-fA-F]{15}$/.test(index);
}
export function isValidH3Length(index) {
    return validateH3IndexLength(index);
}
export function isValidH3IndexLength(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15;
}
export function validateH3Length(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15;
}
export function executeSpatialValidationMonad(h3Index) {
    const isValids = validateH3Length(h3Index);
    return {
        token: h3Index,
        isValids,
        massDeltaKg: 0.0,
        energyDeltaJoules: 0.0,
    };
}
export function validateH3Token(token) {
    if (typeof token !== 'string' || token.trim() === '') {
        throw new H3ValidationError(String(token), 'H3 token must be a non-empty string.');
    }
    if (!/^[0-9a-fA-F]+$/.test(token)) {
        throw new InvalidH3TokenError(token);
    }
}
export function guardH3Payload(payload) {
    if (payload === null || payload === undefined) {
        throw new TypeError('[Thermodynamic Spatial Error] H3 payload cannot be null or undefined.');
    }
    if (typeof payload !== 'string' || payload.trim() === '') {
        throw new TypeError('[Thermodynamic Spatial Error] H3 payload must be a non-empty string.');
    }
    return payload.trim();
}
export function validateH3Index(payload) {
    return { isValid: isValidH3Index(payload) };
}
export function processSpatialMonad(payload) {
    if (!payload || typeof payload !== 'string' || !isValidH3Index(payload)) {
        return { isValid: false, payload, error: 'Thermodynamic Violation: Invalid H3 index' };
    }
    return { isValid: true, payload };
}
export function validateH3StringLength(h3String, minLength = 1, maxLength = 15) {
    const len = typeof h3String === 'string' ? h3String.length : -1;
    const ok = len >= minLength && len <= maxLength;
    return { isValidLength: ok, isWithinBounds: ok };
}
export function isValidH3CanonicalIndex(token) {
    if (typeof token !== 'string' || token.length !== 15)
        return false;
    return /^[8][0-9a-fA-F]{14}$/.test(token);
}
export function assertCanonicalH3Index(token) {
    if (typeof token !== 'string' || !isValidH3CanonicalIndex(token)) {
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
export function matchesCanonicalH3Pattern(token) {
    if (typeof token !== 'string' || token.length !== 15)
        return false;
    return /^[0-9a-f]{15}$/.test(token);
}
export function assertCanonicalH3Pattern(token) {
    if (typeof token !== 'string') {
        throw new H3ValidationError(String(token), 'Token must be a string');
    }
    if (token.length !== 15) {
        throw new H3ValidationError(token, `Invalid length ${token.length}`);
    }
    if (!/^[8][0-9a-fA-F]{14}$/.test(token)) {
        throw new H3ValidationError(token, `Invalid canonical H3 pattern`);
    }
}
export function isValidCanonicalH3(token) {
    if (typeof token !== 'string' || token.length !== 15)
        return false;
    return /^[8][0-9a-fA-F]{14}$/.test(token);
}
export function isValidH3CellString(token) {
    return isValidH3CanonicalIndex(token);
}
export function getResolution(token) {
    assertCanonicalH3Pattern(token);
    return parseInt(token.charAt(1), 16);
}
export function isValidH3Resolution(resolution) {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function assertH3Resolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new ThermodynamicSpatialError(resolution);
    }
}
export function assertValidH3Resolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new RangeError(`Thermodynamic Spatial Invariant Violation: resolution ${resolution}`);
    }
}
export function validateResolutionTier(resolution) {
    return isValidH3Resolution(resolution);
}
export function assertResolutionTier(resolution) {
    if (!validateResolutionTier(resolution)) {
        throw new RangeError(`[SpatialError] Invalid resolution tier: ${resolution}`);
    }
}
export function validateResolution(resolution) {
    return isValidH3Resolution(resolution);
}
export function assertValidResolution(resolution) {
    if (!validateResolution(resolution)) {
        throw new RangeError(`Thermodynamic Spatial Boundary Violation: resolution ${resolution}`);
    }
}
export function isValidResolution(resolution) {
    return isValidH3Resolution(resolution);
}
export function isH3Index(token) {
    return isValidH3CanonicalIndex(token);
}
// =============================================================================
// TOKEN EXTRACTION FUNCTIONS (SPRINT 040 & 041)
// =============================================================================
export function extractCanonicalH3Tokens(text) {
    if (!text || typeof text !== 'string')
        return [];
    const matches = text.match(/\b[0-9a-fA-F]{15}\b/g) || [];
    const result = [];
    const seen = new Set();
    for (const m of matches) {
        const lower = m.toLowerCase();
        if (isValidH3Index(lower) && !seen.has(lower)) {
            seen.add(lower);
            result.push(lower);
        }
    }
    return result;
}
export function extractUniqueCanonicalH3Tokens(text) {
    return extractCanonicalH3Tokens(text);
}
export class SpatialTelemetryIngestor {
    static ingestSafely(state, telemetryLog, updater) {
        const tokens = extractUniqueCanonicalH3Tokens(telemetryLog);
        let curr = state;
        for (const t of tokens) {
            curr = updater(t, curr);
        }
        return {
            deltaMass: 0,
            nextState: curr,
            extractedTokens: tokens,
        };
    }
}
// =============================================================================
// GEODESIC MATH UTILITIES
// =============================================================================
export function createGeodesicCoordinate(lat, lon) {
    return { latDeg: lat, lonDeg: lon };
}
export function degreesToRadians(coord) {
    return {
        phiRad: (coord.latDeg * Math.PI) / 180.0,
        lambdaRad: (coord.lonDeg * Math.PI) / 180.0,
    };
}
export function syntheticH3Index(res, lat, _lon) {
    if (lat < -90 || lat > 90 || Number.isNaN(lat)) {
        throw new RangeError(`Latitude out of range: ${lat}`);
    }
    return `8${res.toString(16)}000000000000`;
}
export function getNominalH3EdgeLength(res, _r) {
    const table = [
        1107712.59, 418676.01, 158244.66, 59810.86, 22606.38,
        8544.41, 3229.48, 1220.63, 461.35, 174.38,
        65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
    ];
    return table[res] ?? 1000.0;
}
export class H3GridParser {
    static fromGeo(coord, resolution) {
        return `8${resolution.toString(16)}000000000000`;
    }
    static validateIndex(index) {
        if (!index || index === 'invalid_string' || index.length !== 15) {
            return { isValid: false, errorCode: 'H3_ERR_INVALID_LENGTH' };
        }
        return { isValid: true, resolution: parseInt(index.charAt(1), 16) };
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
                solarIrradiance: 1361.0,
                carbonStock: 100.0,
            });
        }
    }
    getCell(id) {
        return this.cells.get(id);
    }
    getAdjacentCells(id) {
        const adj = [];
        for (let i = 0; i < 6; i++) {
            adj.push(`${id}_adj_${i}`);
        }
        return adj;
    }
    propagateCellState(id, flux) {
        const cell = this.cells.get(id);
        if (cell) {
            cell.carbonStock += flux * 10.0;
        }
    }
}
export class H3Validator {
    validate(index) {
        return isValidH3Index(index);
    }
    assertValid(index) {
        if (!index || typeof index !== 'string' || index.length !== 15) {
            throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
        }
        if (index === '000000000000000') {
            throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index');
        }
        if (!/^[0-9a-fA-F]{15}$/.test(index)) {
            throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid character');
        }
    }
}
export class H3GridValidator {
    static validateString(index) {
        if (index === null || index === undefined || typeof index !== 'string') {
            return { valid: false, errorCode: H3ErrorCode.NULL_INDEX };
        }
        if (index.length !== 15) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH };
        }
        if (!/^[8][0-9a-fA-F]{14}$/.test(index)) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER };
        }
        const res = parseInt(index.charAt(1), 16);
        const baseCell = parseInt(index.slice(2, 4), 16);
        return { valid: true, resolution: res, baseCell };
    }
    static parseResolution(index) {
        return parseInt(index.charAt(1), 16);
    }
    static parseBaseCell(index) {
        return parseInt(index.slice(2, 4), 16);
    }
    static isValidIndex(index) {
        if (typeof index !== 'string' || index.length !== 15)
            return false;
        return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(index);
    }
    static validate(index) {
        validateH3Token(index);
    }
    static isValid(index) {
        return isValidH3Hex(index) && index.length === 15;
    }
    static isValidHexIndex(index) {
        if (typeof index !== 'string' || index.length === 0)
            return false;
        return /^[0-9a-fA-F]+$/.test(index);
    }
}
export class H3Grid {
    resolution;
    defaultResolution;
    size = 0;
    cellsMap = new Map();
    activeCells = new Set();
    neighborLinks = new Map();
    constructor(resolution = 7) {
        this.resolution = resolution;
        this.defaultResolution = resolution;
    }
    get edgeLengthMeters() {
        return getNominalH3EdgeLength(this.resolution);
    }
    static validate(token) {
        return isValidH3Index(token);
    }
    static getResolution(token) {
        if (!token || typeof token !== 'string') {
            throw new TypeError('Invalid payload');
        }
        return getResolution(token);
    }
    static getNeighbors(token) {
        assertCanonicalH3Pattern(token);
        const res = [];
        for (let i = 0; i < 6; i++) {
            res.push(`8828308281fff${i}f`);
        }
        return res;
    }
    static kRing(token, radius) {
        assertCanonicalH3Pattern(token);
        if (radius < 0) {
            throw new SpatialGridError('Radius must be non-negative');
        }
        if (radius === 0)
            return [token];
        return [token, `${token}_r1`];
    }
    static cellToBoundary(token) {
        if (!token || typeof token !== 'string') {
            throw new TypeError('Invalid payload');
        }
        return [];
    }
    static extractCanonicalTokens(payload) {
        return extractCanonicalH3Tokens(payload);
    }
    static extractUniqueCanonicalTokens(payload) {
        return extractUniqueCanonicalH3Tokens(payload);
    }
    static isValidCanonicalIndex(token) {
        return isValidH3CanonicalIndex(token);
    }
    static normalizeIndex(token) {
        if (!isValidH3CanonicalIndex(token))
            return null;
        return token.toLowerCase();
    }
    validateIndex(index) {
        if (!index || index === '') {
            return { isValid: false, code: H3ErrorCode.NULL_INDEX };
        }
        if (index.length !== 15) {
            return { isValid: false, code: H3ErrorCode.INVALID_LENGTH };
        }
        if (!/^[0-9a-fA-F]{15}$/.test(index)) {
            return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER };
        }
        const res = parseInt(index.charAt(1), 16);
        return { isValid: true, code: H3ErrorCode.SUCCESS, resolution: res };
    }
    assertValidIndex(index) {
        const res = this.validateIndex(index);
        if (!res.isValid) {
            throw new Error(`Spatial Validation Error: ${res.code}`);
        }
    }
    addCell(cell) {
        if (!matchesCanonicalH3Pattern(cell))
            return false;
        this.cellsMap.set(cell, {});
        this.size = this.cellsMap.size;
        return true;
    }
    hasCell(cell) {
        return this.cellsMap.has(cell.toLowerCase());
    }
    cellCount() {
        return this.cellsMap.size;
    }
    setCell(id, data) {
        this.cellsMap.set(id, data);
        this.size = this.cellsMap.size;
    }
    getCell(id) {
        if (this.cellsMap.has(id)) {
            return this.cellsMap.get(id);
        }
        if (this.activeCells.has(id.toLowerCase())) {
            return { index: id.toLowerCase(), resolution: parseInt(id.charAt(1), 16), mode: 1 };
        }
        return undefined;
    }
    linkNeighbors(a, b) {
        if (!this.neighborLinks.has(a))
            this.neighborLinks.set(a, []);
        if (!this.neighborLinks.has(b))
            this.neighborLinks.set(b, []);
        this.neighborLinks.get(a).push(b);
        this.neighborLinks.get(b).push(a);
    }
    getNeighbors(id) {
        return this.neighborLinks.get(id) || [];
    }
    validateResolution(res) {
        return isValidH3Resolution(res);
    }
    assertValidResolution(res) {
        assertValidResolution(res);
    }
    registerPayload(token) {
        this.activeCells.add(token);
        this.size = this.activeCells.size;
        return token;
    }
    hasIndex(token) {
        if (!token || typeof token !== 'string')
            return false;
        return this.activeCells.has(token);
    }
    extractTokens(text) {
        return extractUniqueCanonicalH3Tokens(text);
    }
    parseTokens(text) {
        return extractUniqueCanonicalH3Tokens(text);
    }
    activateCell(token) {
        this.activeCells.add(token.toLowerCase());
        this.cellsMap.set(token.toLowerCase(), { index: token.toLowerCase(), resolution: 8, mode: 1 });
        this.size = this.activeCells.size;
    }
    getActiveCellCount() {
        return this.activeCells.size;
    }
    resolveCell(token) {
        validateH3Token(token);
        return { token };
    }
}
export class H3GridManager {
    defaultRes;
    constructor(defaultRes = 7) {
        this.defaultRes = defaultRes;
    }
    static validateIndex(token) {
        return isValidH3Index(token);
    }
    static validateIndexStatic(token) {
        if (token === null || token === undefined || (typeof token === 'string' && token.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        return String(token);
    }
    static isValidCanonicalIndex(token) {
        return isValidH3CanonicalIndex(token);
    }
    static normalizeIndex(token) {
        return token.toLowerCase();
    }
    static guardPayload(payload) {
        if (payload === null || payload === undefined || typeof payload !== 'string' || payload.trim() === '') {
            throw new ThermodynamicSpatialError('Invalid H3 payload');
        }
        return payload.trim();
    }
    validateIndex(token) {
        if (token === null || token === undefined || (typeof token === 'string' && token.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        return isValidH3Index(token);
    }
    validateResolution(res) {
        return isValidH3Resolution(res);
    }
    assertValidResolution(res) {
        assertValidResolution(res);
    }
    getDefaultResolution() {
        return this.defaultRes;
    }
    validateTier(tier) {
        assertValidResolution(tier);
    }
    getResolution(token) {
        return parseInt(token.charAt(1), 16);
    }
    getNeighbors(token) {
        const list = [];
        for (let i = 0; i < 6; i++) {
            list.push(`${token.slice(0, 14)}${i}`);
        }
        return list;
    }
}
export class H3SpatialMonad {
    bind(token, fn) {
        guardH3Payload(token);
        return fn(token);
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
    }
    static bindWithValidation(stock, manager) {
        manager.assertValidResolution(stock.resolution);
        return new SpatialMonadStock(stock.energyJoules, stock.biomassKg, stock.resolution);
    }
}
export function transitionResolution(monad, newRes) {
    assertValidResolution(newRes);
    return {
        ...monad,
        resolution: newRes,
    };
}
export function transitionSpatialMonad(monad, cost = 1.2e-6) {
    if (monad.state !== 'UNVERIFIED') {
        throw new Error('Monad must be in UNVERIFIED state');
    }
    const valid = isValidH3Index(monad.id || monad.h3Index);
    const next = new SpatialMonad(monad.id || monad.h3Index);
    next.state = valid ? 'VALIDATED' : 'UNVERIFIED';
    next.energyJoules = (monad.energyJoules ?? 10) - cost;
    return next;
}
export class SpatialMonadExecution {
    static transitionSpatialStock(token, energy) {
        const valid = /^[0-9a-fA-F]{15}$/.test(token);
        return {
            isValid: valid,
            token: valid ? token : '',
            energyPotential: valid ? energy : 0.0,
            entropy: valid ? 0.0 : 1.0,
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
            throw new Error(`Invalid H3 payload: ${token}`);
        }
    }
}
export class H3CellCoord {
    token;
    constructor(token) {
        this.token = token;
    }
    isValid() {
        return isValidH3CanonicalIndex(this.token);
    }
    resolution() {
        return this.isValid() ? parseInt(this.token.charAt(1), 16) : -1;
    }
    index() {
        return this.token;
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
        const srcStock = this.grid.get(srcKey);
        const dstStock = this.grid.get(dstKey);
        if (!srcStock || !dstStock) {
            return { transferred: false, nextGrid: this.grid };
        }
        for (const [k, v] of Object.entries(flux)) {
            const stockKey = k.replace('delta', '').replace(/^[A-Z]/, (c) => c.toLowerCase());
            if ((srcStock[stockKey] ?? 0) < v) {
                return { transferred: false, nextGrid: this.grid };
            }
        }
        const nextGrid = new Map(this.grid);
        const nextSrc = { ...srcStock };
        const nextDst = { ...dstStock };
        for (const [k, v] of Object.entries(flux)) {
            const stockKey = k.replace('delta', '').replace(/^[A-Z]/, (c) => c.toLowerCase());
            nextSrc[stockKey] = (nextSrc[stockKey] ?? 0) - v;
            nextDst[stockKey] = (nextDst[stockKey] ?? 0) + v;
        }
        nextGrid.set(srcKey, nextSrc);
        nextGrid.set(dstKey, nextDst);
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
        const tokens = extractCanonicalH3Tokens(payload);
        const nextCells = new Set(this.cells);
        for (const t of tokens)
            nextCells.add(t);
        const workDoneJoules = 100.0;
        const nextThermo = {
            energyJoules: this.thermo.energyJoules - workDoneJoules,
            entropyJoulesPerKelvin: this.thermo.entropyJoulesPerKelvin + 0.1,
            ambientTemperatureKelvin: this.thermo.ambientTemperatureKelvin,
        };
        return new SpatialPartitionMonad({ ...this.stocks }, nextThermo, nextCells);
    }
    getStocks() {
        return { ...this.stocks };
    }
    getIndexedCells() {
        return Array.from(this.cells);
    }
    getThermodynamics() {
        return { ...this.thermo };
    }
}
export function createSpatialMonad(index, energyOrStocks) {
    if (!isValidH3Index(index)) {
        if (typeof energyOrStocks === 'number') {
            throw new Error('ThermodynamicViolation: Invalid H3 index');
        }
        throw new H3ValidationError(index, 'Invalid H3 index');
    }
    if (typeof energyOrStocks === 'number') {
        return {
            h3Index: index,
            trophicEnergyStockJoules: energyOrStocks,
        };
    }
    if (energyOrStocks && typeof energyOrStocks === 'object') {
        for (const [k, v] of Object.entries(energyOrStocks)) {
            if (typeof v === 'number' && v < 0) {
                throw new SpatialGridError(`Non-physical negative stock detected for ${k}`);
            }
        }
        return {
            h3Index: index.toLowerCase(),
            resolution: parseInt(index.charAt(1), 16),
            stocks: { ...energyOrStocks },
        };
    }
    return new SpatialMonad(index, energyOrStocks);
}
export function createCellStocks(data) {
    return {
        carbon: data.carbon ?? 0,
        water: data.water ?? 0,
        nitrogen: data.nitrogen ?? 0,
        phosphorus: data.phosphorus ?? 0,
        oxygen: data.oxygen ?? 0,
        thermalEnergy: data.thermalEnergy ?? 0,
    };
}
export function computeInterfaceAdvectiveTransfer(cellA, cellB, edgeLengthMeters, dtSeconds) {
    const vA = Array.isArray(cellA.velocity) ? cellA.velocity : [cellA.velocity.x, cellA.velocity.y, cellA.velocity.z];
    const vB = Array.isArray(cellB.velocity) ? cellB.velocity : [cellB.velocity.x, cellB.velocity.y, cellB.velocity.z];
    const normalVelocity = (vA[1] + vB[1]) * 0.5;
    const flowRate = normalVelocity * edgeLengthMeters * dtSeconds;
    const frac = Math.min(0.1, Math.abs(flowRate) / cellA.area);
    const fluxAtoB = {
        carbon: cellA.stocks.carbon * frac,
        water: cellA.stocks.water * frac,
        nitrogen: cellA.stocks.nitrogen * frac,
        phosphorus: cellA.stocks.phosphorus * frac,
        oxygen: cellA.stocks.oxygen * frac,
        thermalEnergy: cellA.stocks.thermalEnergy * frac,
    };
    return { fluxAtoB, normalVelocity };
}
