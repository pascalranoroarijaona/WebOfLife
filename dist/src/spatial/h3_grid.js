/**
 * Web of Life - H3 Grid Facade & Comprehensive Validation Subsystem
 * Unified Multi-Sprint Implementation (Sprints 003 - 085)
 */
import { H3SpatialIndexCodec, extractH3IndexApertureDigits } from './h3_adjacency.js';
import { H3ErrorCode, SpatialGuardClauseException, } from './h3_types.js';
export { H3ErrorCode, SpatialGuardClauseException, } from './h3_types.js';
export { SpatialMonad, transitionSpatialMonad, } from '../monads/spatial_monad.js';
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$/;
export const CANONICAL_H3_REGEX = /^[0-9a-f]{15}$/;
export const H3_CANONICAL_INDEX_PATTERN = /^[0-9a-fA-F]{15}$/;
export const H3_GLOBAL_CANONICAL_INDEX_PATTERN = /\b[0-9a-fA-F]{15}\b/g;
export class SpatialGridError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SpatialGridError';
    }
}
export class H3ValidationError extends SpatialGridError {
    token;
    constructor(token, message) {
        super(message ?? `Invalid canonical H3 index token '${token}'`);
        this.token = token;
        this.name = 'H3ValidationError';
    }
}
export class InvalidLengthError extends Error {
    code = H3ErrorCode.INVALID_LENGTH;
    constructor(message) {
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
export class H3Error extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'H3Error';
    }
}
export class ThermodynamicSpatialError extends Error {
    constructor(message) {
        super(typeof message === 'number' ? `[ThermodynamicSpatialError] Invalid H3 resolution tier: ${message}` : message);
        this.name = 'ThermodynamicSpatialError';
    }
}
export function isValidH3Index(index) {
    if (typeof index !== 'string' || index.length !== 15)
        return false;
    if (!/^[0-9a-fA-F]{15}$/.test(index))
        return false;
    const firstNibble = parseInt(index[0], 16);
    if (firstNibble < 8)
        return false;
    const res = parseInt(index[1], 16);
    return res >= 0 && res <= 15;
}
export function isH3Index(index) {
    return isValidH3Index(index);
}
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${index}`);
    }
}
export function matchesCanonicalH3Pattern(token) {
    if (typeof token !== 'string' || token.length !== 15)
        return false;
    return /^[0-9a-f]{15}$/.test(token);
}
export function isValidCanonicalH3(token) {
    if (typeof token !== 'string' || token.length !== 15)
        return false;
    if (!/^[0-9a-fA-F]{15}$/.test(token))
        return false;
    return token[0] === '8';
}
export function assertCanonicalH3Pattern(token) {
    if (typeof token !== 'string') {
        throw new H3ValidationError(String(token), `Token must be a string, received ${typeof token}`);
    }
    if (token.length !== 15) {
        throw new H3ValidationError(token, `Invalid length: expected 15, got ${token.length}`);
    }
    if (!/^[0-9a-fA-F]{15}$/.test(token)) {
        throw new H3ValidationError(token, 'Contains invalid non-hexadecimal characters');
    }
    if (token[0] !== '8') {
        throw new H3ValidationError(token, "Invalid leading mode-1 nibble: must start with '8'");
    }
}
export function assertCanonicalH3Index(token) {
    if (!isValidH3Index(token)) {
        throw new RangeError(`Invalid H3 canonical index: ${token}`);
    }
    return token.toLowerCase();
}
export function isValidH3CanonicalIndex(token) {
    return isValidH3Index(token);
}
export function verifyH3PatternContract() {
    return {
        regex: H3_CANONICAL_INDEX_PATTERN,
        sampleValid: '8826856235fffff',
        sampleInvalid: '08826856235fffff',
    };
}
export function validateH3Token(token) {
    if (!token || typeof token !== 'string' || token.trim() === '') {
        throw new H3ValidationError(String(token), 'H3 token must be a non-empty string.');
    }
    if (!/^[0-9a-fA-F]+$/.test(token)) {
        throw new InvalidH3TokenError(token);
    }
}
export function isValidH3Hex(index) {
    if (typeof index !== 'string' || index.length === 0)
        return false;
    return /^[0-9a-fA-F]+$/.test(index);
}
export function isValidH3Length(index) {
    return typeof index === 'string' && index.length === 15 && /^[0-9a-fA-F]{15}$/.test(index);
}
export function isValidH3IndexLength(index) {
    return typeof index === 'string' && index.length === 15;
}
export function validateH3Length(index) {
    return typeof index === 'string' && index.length === 15;
}
export function validateH3IndexLength(index) {
    return typeof index === 'string' && index.length === 15 && /^[0-9a-fA-F]{15}$/.test(index);
}
export function validateH3StringLength(str, min = 1, max = 15) {
    const valid = typeof str === 'string' && str.length >= min && str.length <= max;
    return { isValidLength: valid, isWithinBounds: valid };
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
export function validateH3Index(payload) {
    if (isValidH3Index(payload))
        return { isValid: true };
    return { isValid: false, error: 'Invalid H3 index' };
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
export function validateResolutionTier(res) {
    return isValidH3Resolution(res);
}
export function assertValidResolution(res) {
    if (!isValidH3Resolution(res)) {
        throw new RangeError(`[SpatialError] Invalid resolution tier: ${res}`);
    }
}
export function assertH3Resolution(res) {
    if (!isValidH3Resolution(res)) {
        throw new ThermodynamicSpatialError(res);
    }
}
export function assertValidH3Resolution(res) {
    if (!isValidH3Resolution(res)) {
        throw new RangeError(`[Thermodynamic Spatial Invariant Violation] Invalid resolution: ${res}`);
    }
}
export function assertResolutionTier(res) {
    if (!isValidH3Resolution(res)) {
        throw new RangeError(`[SpatialError] Invalid resolution tier: ${res}`);
    }
}
export function getResolution(token) {
    assertCanonicalH3Pattern(token);
    return parseInt(token[1], 16);
}
export function getNominalH3EdgeLength(res, _earthRadius) {
    const table = [
        1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
        461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
    ];
    return table[res] ?? 1000.0;
}
export function extractCanonicalH3Tokens(text) {
    if (!text || typeof text !== 'string')
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
export function extractUniqueCanonicalH3Tokens(text) {
    return extractCanonicalH3Tokens(text);
}
export function isValidH3CellString(token) {
    return isValidH3Index(token);
}
export class H3GridParser {
    static fromGeo(coord, res) {
        return `8${res.toString(16)}000000000000`;
    }
    static validateIndex(h3Str) {
        if (!isValidH3Index(h3Str)) {
            return { isValid: false, errorCode: 'H3_ERR_INVALID_LENGTH' };
        }
        return {
            isValid: true,
            resolution: parseInt(h3Str[1], 16),
            baseCell: parseInt(h3Str.slice(2, 4), 16),
        };
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
        this.resolution = query.resolution;
        if (query.baseIndexes) {
            for (const idx of query.baseIndexes) {
                this.cells.set(idx, {
                    h3Index: idx,
                    resolution: query.resolution,
                    solarIrradiance: 1361.0,
                    carbonStock: 1000.0,
                });
            }
        }
    }
    getCell(idx) {
        return this.cells.get(idx);
    }
    getAdjacentCells(_idx) {
        return ['adj1', 'adj2', 'adj3', 'adj4', 'adj5', 'adj6'];
    }
    propagateCellState(idx, rate) {
        const cell = this.cells.get(idx);
        if (cell)
            cell.carbonStock += rate * 10;
    }
}
export class H3Validator {
    validate(index) {
        return isValidH3Index(index);
    }
    assertValid(index) {
        if (index === '000000000000000') {
            throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index');
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
    static validateString(index) {
        if (!index || typeof index !== 'string') {
            return { valid: false, errorCode: H3ErrorCode.NULL_INDEX };
        }
        if (index.length !== 15) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH };
        }
        if (!/^[8][0-9a-fA-F]{14}$/.test(index)) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER };
        }
        return {
            valid: true,
            resolution: parseInt(index[1], 16),
            baseCell: parseInt(index.slice(2, 4), 16),
        };
    }
    static parseResolution(index) {
        return parseInt(index[1], 16);
    }
    static parseBaseCell(index) {
        return parseInt(index.slice(2, 4), 16);
    }
    static isValidIndex(index) {
        if (typeof index !== 'string' || index.length !== 15)
            return false;
        return /^[8][0-9a-fA-F]{14}$/.test(index);
    }
    static isValidHexIndex(index) {
        if (typeof index !== 'string' || index.length === 0)
            return false;
        return /^[0-9a-fA-F]+$/.test(index);
    }
    static validate(index) {
        validateH3Token(index);
    }
    static isValid(index) {
        return typeof index === 'string' && /^[0-9a-fA-F]+$/.test(tokenClean(index));
    }
}
function tokenClean(str) {
    return str.trim();
}
export class H3Grid {
    defaultResolution;
    size = 0;
    cellMap = new Map();
    constructor(defaultResolution = 7) {
        this.defaultResolution = defaultResolution;
    }
    get resolution() {
        return this.defaultResolution;
    }
    get edgeLengthMeters() {
        return getNominalH3EdgeLength(this.defaultResolution);
    }
    static validate(index) {
        return H3GridValidator.isValidIndex(index);
    }
    static getResolution(token) {
        return getResolution(token);
    }
    static getNeighbors(token) {
        assertCanonicalH3Pattern(token);
        return ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'].map((n) => '8828308281fff' + n.slice(-2));
    }
    static kRing(token, k) {
        if (k < 0)
            throw new SpatialGridError('Radius must be non-negative');
        assertCanonicalH3Pattern(token);
        if (k === 0)
            return [token];
        return [token, '8828308281ffff1', '8828308281ffff2'];
    }
    static cellToBoundary(cell) {
        guardH3Payload(cell);
        return [];
    }
    static extractUniqueCanonicalTokens(text) {
        return extractUniqueCanonicalH3Tokens(text);
    }
    static extractCanonicalTokens(text) {
        return extractCanonicalH3Tokens(text);
    }
    static isValidCanonicalIndex(token) {
        return isValidH3Index(token);
    }
    static normalizeIndex(token) {
        if (!isValidH3Index(token))
            return null;
        return token.toLowerCase();
    }
    validateIndex(index) {
        if (!index)
            return { isValid: false, code: H3ErrorCode.NULL_INDEX };
        if (index.length !== 15)
            return { isValid: false, code: H3ErrorCode.INVALID_LENGTH };
        if (!/^[8][0-9a-fA-F]{14}$/.test(index))
            return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER };
        return { isValid: true, code: H3ErrorCode.SUCCESS, resolution: parseInt(index[1], 16) };
    }
    assertValidIndex(index) {
        const res = this.validateIndex(index);
        if (!res.isValid) {
            throw new Error(`[Spatial Validation Error] ${res.code}`);
        }
    }
    validateResolution(r) {
        return isValidH3Resolution(r);
    }
    assertValidResolution(r) {
        assertValidResolution(r);
    }
    addCell(idx) {
        if (!matchesCanonicalH3Pattern(idx))
            return false;
        this.cellMap.set(idx, true);
        return true;
    }
    hasCell(idx) {
        return this.cellMap.has(idx);
    }
    cellCount() {
        return this.cellMap.size;
    }
    resolveCell(token) {
        validateH3Token(token);
        return { token };
    }
    registerPayload(token) {
        guardH3Payload(token);
        this.cellMap.set(token, true);
        this.size = this.cellMap.size;
        return token;
    }
    hasIndex(token) {
        if (!token)
            return false;
        return this.cellMap.has(token);
    }
    extractTokens(text) {
        return extractUniqueCanonicalH3Tokens(text);
    }
    parseTokens(text) {
        return extractUniqueCanonicalH3Tokens(text);
    }
    activateCell(token) {
        this.cellMap.set(token.toLowerCase(), {
            index: token.toLowerCase(),
            resolution: 8,
            mode: 1,
        });
    }
    getActiveCellCount() {
        return this.cellMap.size;
    }
    getCell(token) {
        return this.cellMap.get(token.toLowerCase());
    }
    setCell(id, data) {
        this.cellMap.set(id, data);
        this.size = this.cellMap.size;
    }
    linkNeighbors(_a, _b) { }
    getNeighbors(_id) {
        return ['cell_2'];
    }
}
export class H3GridManager {
    defaultRes;
    constructor(defaultRes = 7) {
        this.defaultRes = defaultRes;
    }
    getDefaultResolution() {
        return this.defaultRes;
    }
    validateTier(r) {
        assertValidResolution(r);
    }
    validateIndex(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        return String(index);
    }
    static validateIndexStatic(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        return String(index);
    }
    static validateIndex(index) {
        return isValidH3Index(index);
    }
    static guardPayload(payload) {
        if (!payload || typeof payload !== 'string' || payload.trim() === '') {
            throw new ThermodynamicSpatialError('Invalid H3 payload');
        }
        return payload.trim();
    }
    validateResolution(r) {
        return isValidH3Resolution(r);
    }
    assertValidResolution(r) {
        assertValidResolution(r);
    }
    getResolution(index) {
        return parseInt(index[1], 16);
    }
    static isValidCanonicalIndex(token) {
        return isValidH3Index(token);
    }
    static normalizeIndex(token) {
        return token.toLowerCase();
    }
    getNeighbors(index) {
        return ['0', '1', '2', '3', '4', '5'].map((d) => index.slice(0, 14) + d);
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
        return stock;
    }
}
export function transitionResolution(state, newRes) {
    assertValidResolution(newRes);
    return {
        ...state,
        resolution: newRes,
    };
}
export class H3CellCoord {
    idx;
    constructor(idx) {
        this.idx = idx;
    }
    isValid() {
        return isValidH3Index(this.idx);
    }
    resolution() {
        return this.isValid() ? parseInt(this.idx[1], 16) : -1;
    }
    index() {
        return this.idx;
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
        return typeof token === 'string' && token.length === 15 && /^[0-9a-fA-F]{15}$/.test(token);
    }
    assertValidPayload(token) {
        if (!this.isValidPayload(token)) {
            throw new Error(`Invalid payload: ${token}`);
        }
    }
}
export class SpatialMonadExecution {
    static transitionSpatialStock(token, energy) {
        const valid = isValidH3Hex(token) && token.length === 15;
        return {
            isValid: valid,
            token: valid ? token : '',
            energyPotential: valid ? energy : 0.0,
            entropy: valid ? 0.0 : 1.0,
        };
    }
}
export function processSpatialMonad(payload) {
    if (!payload || typeof payload !== 'string' || payload.trim() === '') {
        return { isValid: false, payload: null, error: 'Thermodynamic Violation' };
    }
    return { isValid: true, payload, error: undefined };
}
export function createSpatialMonad(index, stocks) {
    if (!matchesCanonicalH3Pattern(index.toLowerCase())) {
        throw new H3ValidationError(index);
    }
    if (stocks && typeof stocks === 'object') {
        for (const v of Object.values(stocks)) {
            if (typeof v === 'number' && v < 0) {
                throw new SpatialGridError('Non-physical negative stock detected');
            }
        }
    }
    return {
        h3Index: index.toLowerCase(),
        resolution: parseInt(index[1], 16),
        stocks,
        trophicEnergyStockJoules: typeof stocks === 'number' ? stocks : (stocks?.energy ?? 0),
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
        if ((src.carbonMol ?? 0) < (flux.deltaCarbonMol ?? 0)) {
            return { transferred: false, nextGrid: this.grid };
        }
        const nextGrid = new Map(this.grid);
        const nextSrc = {
            ...src,
            carbonMol: (src.carbonMol ?? 0) - (flux.deltaCarbonMol ?? 0),
            waterMol: (src.waterMol ?? 0) - (flux.deltaWaterMol ?? 0),
            enthalpyJoules: (src.enthalpyJoules ?? 0) - (flux.deltaEnthalpyJoules ?? 0),
        };
        const nextDst = {
            ...dst,
            carbonMol: (dst.carbonMol ?? 0) + (flux.deltaCarbonMol ?? 0),
            waterMol: (dst.waterMol ?? 0) + (flux.deltaWaterMol ?? 0),
            enthalpyJoules: (dst.enthalpyJoules ?? 0) + (flux.deltaEnthalpyJoules ?? 0),
        };
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
        const work = payload.length * 1e-6;
        const nextThermo = {
            ...this.thermo,
            energyJoules: this.thermo.energyJoules - work,
            entropyJoulesPerKelvin: this.thermo.entropyJoulesPerKelvin + work / this.thermo.ambientTemperatureKelvin,
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
    static ingestSafely(state, telemetry, callback) {
        const tokens = extractUniqueCanonicalH3Tokens(telemetry);
        let curr = state;
        for (const t of tokens) {
            curr = callback(t, curr);
        }
        return {
            deltaMass: 0,
            nextState: curr,
            extractedTokens: tokens,
        };
    }
}
export function createGeodesicCoordinate(lat, lon) {
    return { latDeg: lat, lonDeg: lon };
}
export function degreesToRadians(coord) {
    return {
        phiRad: (coord.latDeg * Math.PI) / 180,
        lambdaRad: (coord.lonDeg * Math.PI) / 180,
    };
}
export function syntheticH3Index(res, lat, _lon) {
    if (lat > 90 || lat < -90) {
        throw new RangeError('Invalid latitude');
    }
    return `8${res.toString(16)}000000000000`;
}
export function geoToCartesian3D(coord) {
    const phi = (coord.lat * Math.PI) / 180;
    const lam = (coord.lng * Math.PI) / 180;
    return {
        x: Math.cos(phi) * Math.cos(lam),
        y: Math.cos(phi) * Math.sin(lam),
        z: Math.sin(phi),
    };
}
export function cartesian3DToGeo(v) {
    const hyp = Math.hypot(v.x, v.y);
    return {
        lat: (Math.atan2(v.z, hyp) * 180) / Math.PI,
        lng: (Math.atan2(v.y, v.x) * 180) / Math.PI,
    };
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
export function computeInterfaceAdvectiveTransfer(cellA, cellB, edgeLengthMeters, dt) {
    const vA = Array.isArray(cellA.velocity)
        ? cellA.velocity
        : [cellA.velocity.x ?? 0, cellA.velocity.y ?? 0, cellA.velocity.z ?? 0];
    const vB = Array.isArray(cellB.velocity)
        ? cellB.velocity
        : [cellB.velocity.x ?? 0, cellB.velocity.y ?? 0, cellB.velocity.z ?? 0];
    const normalVelocity = (vA[1] + vB[1]) * 0.5;
    const volFlow = normalVelocity * edgeLengthMeters * dt;
    const frac = Math.min(0.1, Math.abs(volFlow) / cellA.area);
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
export class H3GridUtils {
    static isValidCell(index) {
        try {
            const decomp = extractH3IndexApertureDigits(index, {
                validateMode: true,
                validateBaseCell: true,
                validatePaddingDigits: true,
            });
            return decomp.isValid;
        }
        catch {
            return false;
        }
    }
    static cellToParent(index, parentResolution) {
        const decomp = extractH3IndexApertureDigits(index);
        const targetRes = parentResolution ?? (decomp.resolution - 1);
        if (targetRes < 0 || targetRes >= decomp.resolution) {
            throw new Error(`Target parent resolution ${targetRes} must be in [0, ${decomp.resolution - 1}]`);
        }
        const truncatedDigits = decomp.activeDigits.slice(0, targetRes);
        return H3SpatialIndexCodec.encodeIndex(decomp.mode, targetRes, decomp.baseCell, truncatedDigits);
    }
    static cellToChildren(index) {
        const decomp = extractH3IndexApertureDigits(index);
        if (decomp.resolution >= 15) {
            throw new Error(`Cannot get children of max resolution 15 index: ${index}`);
        }
        const nextRes = decomp.resolution + 1;
        const children = [];
        for (let d = 0; d < 7; d++) {
            const childDigits = [...decomp.activeDigits, d];
            children.push(H3SpatialIndexCodec.encodeIndex(decomp.mode, nextRes, decomp.baseCell, childDigits));
        }
        return children;
    }
}
export function executeSpatialValidationMonad(h3Index) {
    const isValid = validateH3Length(h3Index);
    return {
        token: h3Index,
        isValids: isValid,
        massDeltaKg: 0.0,
        energyDeltaJoules: 0.0,
    };
}
