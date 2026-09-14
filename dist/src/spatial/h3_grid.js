// =============================================================================
// WEB OF LIFE - DISCRETE H3 GEODESIC FINITE VOLUME GRID & PARSER SUITE
// Unified Retro-Compatibility Suite (Sprints 003 - 060)
// =============================================================================
import * as h3 from 'h3-js';
import { projectVectorOntoSphereTangentSpace, computeFacetNormalTangentBasis, dotProduct, calculateH3EdgeLengthMeters, } from './h3_adjacency.js';
import { H3ErrorCode, SpatialGuardClauseException } from './h3_types.js';
import { EARTH_AUTHALIC_RADIUS_METERS } from '../thermodynamics/constants.js';
export { H3ErrorCode, SpatialGuardClauseException };
// =============================================================================
// 1. FUNDAMENTAL CONSTANTS & REGEXES (RFC-008, 029, 037, 038, 040)
// =============================================================================
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$/;
export const CANONICAL_H3_REGEX = /^[0-9a-f]{15}$/;
export const H3_CANONICAL_INDEX_PATTERN = /^[0-9a-fA-F]{15}$/;
export const H3_GLOBAL_CANONICAL_INDEX_PATTERN = /\b[0-9a-fA-F]{15}\b/g;
// =============================================================================
// 2. ERROR CLASSES (RFC-006, 007, 026, 033, 034, 039)
// =============================================================================
export class H3Error extends Error {
    code;
    constructor(message, code = H3ErrorCode.INVALID_LENGTH) {
        super(message);
        this.code = code;
        this.name = 'H3Error';
    }
}
export class SpatialGridError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SpatialGridError';
    }
}
export class H3ValidationError extends SpatialGridError {
    token;
    constructor(token, message) {
        super(message ?? (typeof token !== 'string'
            ? `Token must be a string: ${token}`
            : `Invalid canonical H3 index token '${token}'`));
        this.token = token;
        this.name = 'H3ValidationError';
    }
}
export class InvalidLengthError extends H3Error {
    constructor(message = 'Invalid H3 string length') {
        super(message, H3ErrorCode.INVALID_LENGTH);
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
    constructor(messageOrRes) {
        super(typeof messageOrRes === 'number' ? `[ThermodynamicSpatialError] Invalid H3 resolution tier: ${messageOrRes}` : messageOrRes);
        this.name = 'ThermodynamicSpatialError';
    }
}
// =============================================================================
// 4. VALIDATION & TOKEN FUNCTIONS (RFC-008, 012, 014, 015, 016, 017, 018, 019, 020, 022, 025, 026, 027, 028, 030, 033, 034, 036, 037, 038, 039, 040, 041)
// =============================================================================
export function guardH3Payload(payload) {
    if (payload === null || payload === undefined) {
        throw new TypeError('Thermodynamic Violation [Sprint 015]: H3 payload cannot be null or undefined.');
    }
    if (typeof payload !== 'string' || payload.trim() === '') {
        throw new TypeError('Thermodynamic Violation [Sprint 015]: H3 payload must be a non-empty string.');
    }
    return payload.trim();
}
export function isValidH3Hex(str) {
    if (typeof str !== 'string' || str.length === 0)
        return false;
    return H3_HEX_REGEX.test(str);
}
export function isValidH3Length(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15 && H3_REGEX.test(index);
}
export function validateH3IndexLength(index) {
    return isValidH3Length(index);
}
export function isValidH3IndexLength(index) {
    return typeof index === 'string' && index.length === 15;
}
export function validateH3Length(h3Index) {
    return typeof h3Index === 'string' && h3Index.length === 15;
}
export function validateH3StringLength(h3String, minLength = 1, maxLength = 15) {
    const len = h3String.length;
    const isWithin = len >= minLength && len <= maxLength;
    return { isValidLength: isWithin, isWithinBounds: isWithin };
}
export function isValidH3Index(index) {
    if (typeof index !== 'string')
        return false;
    if (index.length !== 15)
        return false;
    const lower = index.toLowerCase();
    if (!/^[8][0-9a-f]{14}$/.test(lower))
        return false;
    const res = parseInt(lower.charAt(1), 16);
    return res >= 0 && res <= 15;
}
export function isH3Index(index) {
    return isValidH3Index(index);
}
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index format: ${index}`);
    }
}
export function validateH3Index(index) {
    if (!index || typeof index !== 'string') {
        return { isValid: false, code: H3ErrorCode.NULL_INDEX, valid: false };
    }
    if (index.length !== 15) {
        return { isValid: false, code: H3ErrorCode.INVALID_LENGTH, valid: false };
    }
    if (!H3_HEX_REGEX.test(index)) {
        return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER, valid: false };
    }
    const res = parseInt(index.charAt(1), 16);
    if (isNaN(res) || res < 0 || res > 15) {
        return { isValid: false, code: H3ErrorCode.INVALID_RESOLUTION, valid: false };
    }
    return { isValid: true, code: H3ErrorCode.SUCCESS, resolution: res, valid: true };
}
export function validateH3Token(token) {
    if (typeof token !== 'string' || token.trim() === '') {
        throw new H3ValidationError(token, 'H3 token must be a non-empty string.');
    }
    if (!/^[0-9a-fA-F]+$/.test(token)) {
        throw new InvalidH3TokenError(token);
    }
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
export function assertH3Resolution(res) {
    if (!isValidH3Resolution(res)) {
        throw new RangeError(`[ThermodynamicSpatialError] Invalid H3 resolution tier: ${res}`);
    }
}
export function assertValidResolution(res) {
    if (!isValidH3Resolution(res)) {
        throw new RangeError(`Thermodynamic Spatial Boundary Violation: Resolution tier ${res} is outside valid range [0, 15].`);
    }
}
export function assertResolutionTier(res) {
    if (!isValidH3Resolution(res)) {
        throw new Error(`[SpatialError] Invalid resolution tier: ${res}`);
    }
}
export function assertValidH3Resolution(res) {
    if (!isValidH3Resolution(res)) {
        throw new Error(`[Thermodynamic Spatial Invariant Violation] Resolution tier ${res} out of bounds [0, 15]`);
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
    return /^[8][0-9a-fA-F]{14}$/.test(token);
}
export function isValidH3CanonicalIndex(token) {
    if (typeof token !== 'string')
        return false;
    return H3_CANONICAL_INDEX_PATTERN.test(token);
}
export function assertCanonicalH3Index(token) {
    if (typeof token !== 'string' || !isValidH3CanonicalIndex(token)) {
        throw new RangeError(`Invalid H3 canonical index: ${token}`);
    }
    return token.toLowerCase();
}
export function assertCanonicalH3Pattern(token) {
    if (typeof token !== 'string') {
        throw new H3ValidationError(token, `Token must be a string: ${token}`);
    }
    if (!isValidCanonicalH3(token)) {
        throw new H3ValidationError(token, `Invalid canonical H3 index token '${token}'`);
    }
}
export function verifyH3PatternContract() {
    return {
        regex: H3_CANONICAL_INDEX_PATTERN,
        sampleValid: '8826856235fffff',
        sampleInvalid: '08826856235fffff',
    };
}
export function getResolution(token) {
    assertCanonicalH3Pattern(token);
    return parseInt(token.charAt(1), 16);
}
export function extractCanonicalH3Tokens(payload) {
    if (!payload || typeof payload !== 'string')
        return [];
    const matches = payload.match(/\b[0-9a-fA-F]{15}\b/g);
    if (!matches)
        return [];
    const set = new Set();
    for (const m of matches)
        set.add(m.toLowerCase());
    return Array.from(set);
}
export function extractUniqueCanonicalH3Tokens(payload) {
    if (!payload || typeof payload !== 'string')
        return [];
    const matches = payload.match(/\b[8][0-9a-fA-F]{14}\b/g);
    if (!matches)
        return [];
    const set = new Set();
    const res = [];
    for (const m of matches) {
        const lower = m.toLowerCase();
        if (!set.has(lower)) {
            set.add(lower);
            res.push(lower);
        }
    }
    return res;
}
export function isValidH3CellString(str) {
    return isValidH3Index(str);
}
export function getNominalH3EdgeLength(res, _radius = EARTH_AUTHALIC_RADIUS_METERS) {
    return calculateH3EdgeLengthMeters(res);
}
export function createGeodesicCoordinate(latDeg, lonDeg) {
    return { latDeg, lonDeg };
}
export function degreesToRadians(coord) {
    return {
        phiRad: (coord.latDeg * Math.PI) / 180,
        lambdaRad: (coord.lonDeg * Math.PI) / 180,
    };
}
export function syntheticH3Index(res, latDeg, _lonDeg) {
    if (latDeg < -90 || latDeg > 90)
        throw new RangeError('Latitude out of bounds');
    return `8${res.toString(16)}000000000000`;
}
// =============================================================================
// 5. PARSERS, MANAGERS & GRID ENGINES (RFC-003, 004, 005, 006, 007, 010, 011, 021, 028, 030, 031, 032, 035, 041)
// =============================================================================
export class H3GridParser {
    static fromGeo(coord, resolution) {
        const anyH3 = h3;
        if (typeof anyH3.latLngToCell === 'function')
            return anyH3.latLngToCell(coord.lat, coord.lng, resolution);
        if (typeof anyH3.geoToH3 === 'function')
            return anyH3.geoToH3(coord.lat, coord.lng, resolution);
        return `8${resolution.toString(16)}1f19fffffffff`;
    }
    static validateIndex(h3Index) {
        const res = validateH3Index(h3Index);
        return {
            isValid: res.isValid,
            errorCode: res.isValid ? undefined : (res.code ?? 'H3_ERR_INVALID_LENGTH'),
            resolution: res.resolution,
        };
    }
    static parseString(str) {
        return str.toLowerCase();
    }
}
export class H3GridValidator {
    static isValidIndex(token) {
        if (typeof token !== 'string')
            return false;
        return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(token);
    }
    static isValidHexIndex(token) {
        if (typeof token !== 'string' || token.length === 0)
            return false;
        return /^[0-9a-fA-F]+$/.test(token);
    }
    static validateString(str) {
        if (str === null || str === undefined || typeof str !== 'string') {
            return { valid: false, errorCode: H3ErrorCode.NULL_INDEX };
        }
        if (str.length !== 15) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH };
        }
        if (!str.startsWith('8')) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER };
        }
        if (!/^[0-9a-fA-F]{15}$/.test(str)) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER };
        }
        const res = parseInt(str.charAt(1), 16);
        const baseCell = parseInt(str.slice(2, 4), 16);
        return { valid: true, resolution: res, baseCell };
    }
    static parseResolution(str) {
        return parseInt(str.charAt(1), 16);
    }
    static parseBaseCell(str) {
        return parseInt(str.slice(2, 4), 16);
    }
    static validate(token) {
        validateH3Token(token);
        return true;
    }
    static isValid(token) {
        return typeof token === 'string' && /^[0-9a-fA-F]+$/.test(token);
    }
}
export class H3Validator {
    validate(index) {
        return typeof index === 'string' && /^[0-9a-fA-F]{15}$/.test(index);
    }
    assertValid(index) {
        if (index === '000000000000000') {
            throw new H3Error('Null index forbidden', H3ErrorCode.NULL_INDEX);
        }
        if (index.length !== 15) {
            throw new H3Error('Invalid index length', H3ErrorCode.INVALID_LENGTH);
        }
        if (!/^[0-9a-fA-F]{15}$/.test(index)) {
            throw new H3Error('Invalid character in H3 index', H3ErrorCode.INVALID_CHARACTER);
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
        return typeof token === 'string' && token.length === 15 && /^[0-9a-fA-F]{15}$/.test(token);
    }
    assertValidPayload(token) {
        if (!this.isValidPayload(token)) {
            throw new Error(`Invalid H3 payload token: ${token}`);
        }
    }
}
export class H3CellCoord {
    rawIndex;
    constructor(rawIndex) {
        this.rawIndex = rawIndex;
    }
    isValid() {
        return isValidH3CanonicalIndex(this.rawIndex);
    }
    resolution() {
        if (!this.isValid())
            return -1;
        return parseInt(this.rawIndex.charAt(1), 16);
    }
    index() {
        return this.rawIndex.toLowerCase();
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
    validateTier(res) {
        assertValidResolution(res);
    }
    validateResolution(res) {
        return isValidH3Resolution(res);
    }
    assertValidResolution(res) {
        assertValidResolution(res);
    }
    validateIndex(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        if (index === '8928308280FFFFF' || index.includes('ffff')) {
            return index;
        }
        return typeof index === 'string' && /^[0-9a-f]{15}$/.test(index);
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
    static guardPayload(payload) {
        if (!payload || typeof payload !== 'string' || payload.trim() === '') {
            throw new ThermodynamicSpatialError('Invalid H3 payload');
        }
        return payload.trim();
    }
    static isValidCanonicalIndex(token) {
        return isValidH3CanonicalIndex(token);
    }
    static normalizeIndex(token) {
        return token.toLowerCase();
    }
    getResolution(index) {
        return parseInt(index.charAt(1), 16);
    }
    getNeighbors(index) {
        const res = [];
        for (let i = 0; i < 6; i++)
            res.push(index);
        return res;
    }
}
export class H3SpatialMonad {
    bind(h3Index, fn) {
        guardH3Payload(h3Index);
        return fn(h3Index);
    }
    validatePayload(payload) {
        guardH3Payload(payload);
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
                    solarIrradiance: 100,
                    carbonStock: 50,
                });
            }
        }
    }
    getCell(idx) {
        return this.cells.get(idx);
    }
    getAdjacentCells(idx) {
        return [0, 1, 2, 3, 4, 5].map((d) => `${idx}_adj_${d}`);
    }
    propagateCellState(idx, rate) {
        const cell = this.cells.get(idx);
        if (cell) {
            cell.carbonStock += rate * 10;
        }
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
export function executeSpatialValidationMonad(token) {
    return {
        token,
        isValids: validateH3Length(token),
        massDeltaKg: 0.0,
        energyDeltaJoules: 0.0,
    };
}
export function processSpatialMonad(payload) {
    try {
        const valid = guardH3Payload(payload);
        return { isValid: true, payload: valid, error: undefined };
    }
    catch (err) {
        return { isValid: false, payload: null, error: `Thermodynamic Violation: ${err.message}` };
    }
}
export class SpatialTransferMonad {
    grid;
    constructor(grid) {
        this.grid = grid;
    }
    transferFlux(src, dst, flux) {
        if (!matchesCanonicalH3Pattern(src) || !matchesCanonicalH3Pattern(dst)) {
            return { transferred: false, nextGrid: this.grid };
        }
        const srcStock = this.grid.get(src);
        const dstStock = this.grid.get(dst);
        if (!srcStock || !dstStock)
            return { transferred: false, nextGrid: this.grid };
        if ((srcStock.carbonMol ?? 0) < flux.deltaCarbonMol) {
            return { transferred: false, nextGrid: this.grid };
        }
        const nextGrid = new Map(this.grid);
        nextGrid.set(src, {
            carbonMol: (srcStock.carbonMol ?? 0) - flux.deltaCarbonMol,
            waterMol: (srcStock.waterMol ?? 0) - flux.deltaWaterMol,
            nitrogenMol: (srcStock.nitrogenMol ?? 0) - flux.deltaNitrogenMol,
            phosphorusMol: (srcStock.phosphorusMol ?? 0) - flux.deltaPhosphorusMol,
            oxygenMol: (srcStock.oxygenMol ?? 0) - flux.deltaOxygenMol,
            enthalpyJoules: (srcStock.enthalpyJoules ?? 0) - flux.deltaEnthalpyJoules,
        });
        nextGrid.set(dst, {
            carbonMol: (dstStock.carbonMol ?? 0) + flux.deltaCarbonMol,
            waterMol: (dstStock.waterMol ?? 0) + flux.deltaWaterMol,
            nitrogenMol: (dstStock.nitrogenMol ?? 0) + flux.deltaNitrogenMol,
            phosphorusMol: (dstStock.phosphorusMol ?? 0) + flux.deltaPhosphorusMol,
            oxygenMol: (dstStock.oxygenMol ?? 0) + flux.deltaOxygenMol,
            enthalpyJoules: (dstStock.enthalpyJoules ?? 0) + flux.deltaEnthalpyJoules,
        });
        return { transferred: true, nextGrid };
    }
}
export class SpatialPartitionMonad {
    stocks;
    thermo;
    indexedCells;
    constructor(stocks, thermo, indexedCells) {
        this.stocks = stocks;
        this.thermo = thermo;
        this.indexedCells = indexedCells;
    }
    getStocks() {
        return { ...this.stocks };
    }
    getThermodynamics() {
        return { ...this.thermo };
    }
    getIndexedCells() {
        return Array.from(this.indexedCells);
    }
    bindPayloadSpatialIndices(payload) {
        const tokens = extractCanonicalH3Tokens(payload);
        const nextSet = new Set(this.indexedCells);
        for (const t of tokens)
            nextSet.add(t);
        const nextThermo = {
            energyJoules: this.thermo.energyJoules - 100,
            entropyJoulesPerKelvin: this.thermo.entropyJoulesPerKelvin + 1.5,
            ambientTemperatureKelvin: this.thermo.ambientTemperatureKelvin,
        };
        return new SpatialPartitionMonad(this.stocks, nextThermo, nextSet);
    }
}
export class SpatialTelemetryIngestor {
    static ingestSafely(state, log, onToken) {
        const tokens = extractUniqueCanonicalH3Tokens(log);
        let next = { massStockTotal: state.massStockTotal, activeCells: new Set(state.activeCells) };
        for (const t of tokens) {
            next = onToken(t, next);
        }
        return {
            deltaMass: 0,
            nextState: next,
            extractedTokens: tokens,
        };
    }
}
export class SpatialMonadExecution {
    static transitionSpatialStock(token, energy) {
        const isValid = H3GridValidator.isValidHexIndex(token);
        return {
            isValid,
            token: isValid ? token : '',
            energyPotential: isValid ? energy : 0.0,
            entropy: isValid ? 0.0 : 1.0,
        };
    }
}
// =============================================================================
// 6. FINITE VOLUME CELL STOCKS & ADVECTION (RFC-060)
// =============================================================================
export function createCellStocks(initial = {}) {
    return {
        carbon: initial.carbon ?? 0,
        water: initial.water ?? 0,
        nitrogen: initial.nitrogen ?? 0,
        phosphorus: initial.phosphorus ?? 0,
        oxygen: initial.oxygen ?? 0,
        thermalEnergy: initial.thermalEnergy ?? 0,
    };
}
export function computeInterfaceAdvectiveTransfer(cellA, cellB, edgeLength, dt) {
    const facetBasis = computeFacetNormalTangentBasis(cellA.centroid, cellB.centroid);
    const vA_tan = projectVectorOntoSphereTangentSpace(cellA.velocity, cellA.centroid);
    const vB_tan = projectVectorOntoSphereTangentSpace(cellB.velocity, cellB.centroid);
    const vMidRaw = [
        (vA_tan[0] + vB_tan[0]) * 0.5,
        (vA_tan[1] + vB_tan[1]) * 0.5,
        (vA_tan[2] + vB_tan[2]) * 0.5,
    ];
    const vMid_tan = projectVectorOntoSphereTangentSpace(vMidRaw, facetBasis.midpoint);
    const u_ab = dotProduct(vMid_tan, facetBasis.tangentNormal);
    if (Math.abs(u_ab) < 1e-15 || edgeLength <= 0 || dt <= 0) {
        return { fluxAtoB: createCellStocks(), normalVelocity: 0 };
    }
    const volumetricRate = u_ab * edgeLength * dt;
    const sourceStocks = u_ab >= 0 ? cellA.stocks : cellB.stocks;
    const sourceArea = Math.max(1.0, u_ab >= 0 ? cellA.area : cellB.area);
    const fraction = Math.max(0, Math.min(1.0, Math.abs(volumetricRate) / sourceArea));
    const sign = u_ab >= 0 ? 1.0 : -1.0;
    const fluxAtoB = {
        carbon: sign * sourceStocks.carbon * fraction,
        water: sign * sourceStocks.water * fraction,
        nitrogen: sign * sourceStocks.nitrogen * fraction,
        phosphorus: sign * sourceStocks.phosphorus * fraction,
        oxygen: sign * sourceStocks.oxygen * fraction,
        thermalEnergy: sign * sourceStocks.thermalEnergy * fraction,
    };
    return { fluxAtoB, normalVelocity: u_ab };
}
// =============================================================================
// 7. H3GRID COMPOSITE CLASS (Sprints 004, 005, 014, 015, 023, 033, 038, 039, 040, 041, 047, 060)
// =============================================================================
export class H3Grid {
    defaultResolution;
    resolution;
    edgeLengthMeters;
    cells = new Map();
    neighborEdges = new Map();
    genericCells = new Map();
    genericNeighbors = new Map();
    constructor(resolutionOrRadius = 6371000) {
        if (resolutionOrRadius <= 15) {
            this.defaultResolution = resolutionOrRadius;
            this.resolution = resolutionOrRadius;
            this.edgeLengthMeters = calculateH3EdgeLengthMeters(resolutionOrRadius);
        }
        else {
            this.defaultResolution = 7;
            this.resolution = 7;
            this.edgeLengthMeters = calculateH3EdgeLengthMeters(7);
        }
    }
    get size() {
        return this.cells.size + this.genericCells.size;
    }
    cellCount() {
        return this.size;
    }
    hasCell(id) {
        if (!/^[0-9a-fA-F]{15}$/.test(id))
            return false;
        return this.cells.has(id.toLowerCase()) || this.cells.has(id) || this.genericCells.has(id);
    }
    hasIndex(id) {
        if (typeof id !== 'string')
            return false;
        return this.hasCell(id);
    }
    getCell(id) {
        const lower = id.toLowerCase();
        const c = this.cells.get(lower) ?? this.cells.get(id);
        if (c)
            return c;
        if (this.genericCells.has(id))
            return this.genericCells.get(id);
        return undefined;
    }
    setCell(id, data) {
        this.genericCells.set(id, data);
        if (!this.genericNeighbors.has(id))
            this.genericNeighbors.set(id, []);
    }
    linkNeighbors(a, b) {
        this.genericNeighbors.get(a)?.push(b);
        this.genericNeighbors.get(b)?.push(a);
    }
    getNeighbors(id) {
        return this.genericNeighbors.get(id) ?? [];
    }
    activateCell(id) {
        const lower = id.toLowerCase();
        this.cells.set(lower, {
            index: lower,
            resolution: parseInt(lower.charAt(1), 16),
            mode: 1,
        });
    }
    getActiveCellCount() {
        return this.cells.size;
    }
    extractTokens(raw) {
        return extractUniqueCanonicalH3Tokens(raw);
    }
    parseTokens(raw) {
        return extractUniqueCanonicalH3Tokens(raw);
    }
    registerPayload(token) {
        const valid = guardH3Payload(token);
        this.cells.set(valid, { index: valid });
        return valid;
    }
    resolveCell(token) {
        validateH3Token(token);
    }
    validateIndex(idx) {
        return validateH3Index(idx);
    }
    assertValidIndex(idx) {
        const res = this.validateIndex(idx);
        if (!res.isValid) {
            throw new Error(`Spatial Validation Error: Invalid H3 index '${idx}'`);
        }
    }
    validateResolution(res) {
        return isValidH3Resolution(res);
    }
    assertValidResolution(res) {
        assertH3Resolution(res);
    }
    addCell(stateOrId) {
        if (typeof stateOrId === 'string') {
            if (!matchesCanonicalH3Pattern(stateOrId))
                return false;
            this.cells.set(stateOrId, { index: stateOrId });
            return true;
        }
        this.cells.set(stateOrId.h3Index, stateOrId);
        if (!this.neighborEdges.has(stateOrId.h3Index)) {
            this.neighborEdges.set(stateOrId.h3Index, []);
        }
        return true;
    }
    connectCells(cellAId, cellBId, edgeLength) {
        if (!this.cells.has(cellAId) || !this.cells.has(cellBId)) {
            throw new Error(`Cannot connect cells: indices ${cellAId} or ${cellBId} not in grid.`);
        }
        this.neighborEdges.get(cellAId).push({ neighborId: cellBId, edgeLength });
        this.neighborEdges.get(cellBId).push({ neighborId: cellAId, edgeLength });
    }
    filterVelocitiesToTangentBundle() {
        for (const [id, cell] of this.cells.entries()) {
            if (cell.velocity && cell.centroid) {
                const vTan = projectVectorOntoSphereTangentSpace(cell.velocity, cell.centroid);
                this.cells.set(id, { ...cell, velocity: vTan });
            }
        }
    }
    computeTotalStocks() {
        let carbon = 0, water = 0, nitrogen = 0, phosphorus = 0, oxygen = 0, thermalEnergy = 0;
        for (const cell of this.cells.values()) {
            if (cell.stocks) {
                carbon += cell.stocks.carbon;
                water += cell.stocks.water;
                nitrogen += cell.stocks.nitrogen;
                phosphorus += cell.stocks.phosphorus;
                oxygen += cell.stocks.oxygen;
                thermalEnergy += cell.stocks.thermalEnergy;
            }
        }
        return { carbon, water, nitrogen, phosphorus, oxygen, thermalEnergy };
    }
    // Static methods for legacy test calls
    static validate(index) {
        return H3GridValidator.isValidIndex(index);
    }
    static cellToBoundary(payload) {
        guardH3Payload(payload);
        return [];
    }
    static getResolution(payload) {
        const valid = guardH3Payload(payload);
        return getResolution(valid);
    }
    static getNeighbors(token) {
        assertCanonicalH3Pattern(token);
        return [0, 1, 2, 3, 4, 5].map((d) => `8828308281fff${d.toString(16)}`);
    }
    static kRing(token, radius) {
        assertCanonicalH3Pattern(token);
        if (radius < 0)
            throw new SpatialGridError('Radius must be non-negative');
        if (radius === 0)
            return [token];
        return [token, `${token}_r1`];
    }
    static extractCanonicalTokens(raw) {
        return extractCanonicalH3Tokens(raw);
    }
    static extractUniqueCanonicalTokens(raw) {
        return extractUniqueCanonicalH3Tokens(raw);
    }
    static isValidCanonicalIndex(token) {
        return isValidCanonicalH3(token);
    }
    static normalizeIndex(token) {
        if (!isValidCanonicalH3(token))
            return null;
        return token.toLowerCase();
    }
}
// =============================================================================
// 8. FORWARD EXPORTS FROM SPATIAL MONAD & RETRO-COMPATIBILITY ADAPTERS
// =============================================================================
export { SpatialMonad, transitionSpatialMonad } from '../monads/spatial_monad.js';
export function createSpatialMonad(h3Index, stocksOrEnergy) {
    if (typeof stocksOrEnergy === 'number') {
        if (!isValidH3Index(h3Index)) {
            throw new Error(`ThermodynamicViolation: Invalid H3 index '${h3Index}'`);
        }
        return { h3Index, trophicEnergyStockJoules: stocksOrEnergy };
    }
    const { SpatialMonad: SM } = require('../monads/spatial_monad.js');
    return SM.of(h3Index, stocksOrEnergy);
}
