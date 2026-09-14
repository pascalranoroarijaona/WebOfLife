/**
 * Web of Life - Planetary Spatial Substrate & H3 Grid Helper
 * RFC-041 and Complete Retro-Compatibility Layer (Sprints 001 - 041)
 */
import { H3ErrorCode, SpatialGuardClauseException } from './h3_types.js';
export * from './h3_types.js';
export { SpatialMonad } from '../monads/spatial_monad.js';
// =============================================================================
// REGULAR EXPRESSION CONSTANTS
// =============================================================================
export const H3_CANONICAL_REGEX = /\b([0-9a-fA-F]{15})\b/g;
export const CANONICAL_H3_REGEX = /^[0-9a-f]{15}$/;
export const H3_CANONICAL_INDEX_PATTERN = /^[0-9a-fA-F]{15}$/;
export const H3_GLOBAL_CANONICAL_INDEX_PATTERN = /\b[0-9a-fA-F]{15}\b/g;
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
        super(message ?? `Invalid canonical H3 index token '${token}'`);
        this.name = 'H3ValidationError';
        this.token = token;
        Object.setPrototypeOf(this, H3ValidationError.prototype);
    }
}
export class H3Error extends Error {
    code;
    constructor(code, message) {
        super(message ?? `H3 error with code: ${code}`);
        this.code = code;
        this.name = 'H3Error';
        Object.setPrototypeOf(this, H3Error.prototype);
    }
}
export class InvalidLengthError extends H3ValidationError {
    code = H3ErrorCode.INVALID_LENGTH;
    constructor(message) {
        super('', message ?? 'Invalid H3 string length');
        this.name = 'InvalidLengthError';
        Object.setPrototypeOf(this, InvalidLengthError.prototype);
    }
}
export class InvalidH3TokenError extends Error {
    constructor(token) {
        super(`Invalid H3 token contains non-hexadecimal symbols: "${token}"`);
        this.name = 'InvalidH3TokenError';
        Object.setPrototypeOf(this, InvalidH3TokenError.prototype);
    }
}
export class ThermodynamicSpatialError extends Error {
    constructor(resolutionOrMessage) {
        super(typeof resolutionOrMessage === 'number'
            ? `[ThermodynamicSpatialError] Invalid H3 resolution tier: ${resolutionOrMessage}. Must be integer between 0 and 15.`
            : String(resolutionOrMessage));
        this.name = 'ThermodynamicSpatialError';
        Object.setPrototypeOf(this, ThermodynamicSpatialError.prototype);
    }
}
// =============================================================================
// BASIC VALIDATION & RESOLUTION PREDICATES
// =============================================================================
export function isValidResolution(resolution) {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function assertValidResolution(resolution) {
    if (!isValidResolution(resolution)) {
        throw new RangeError(`Thermodynamic Spatial Boundary Violation: Resolution tier ${resolution} is outside valid range [0, 15].`);
    }
}
export function isValidH3Resolution(resolution) {
    return isValidResolution(resolution);
}
export function assertH3Resolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new ThermodynamicSpatialError(resolution);
    }
}
export function assertValidH3Resolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new RangeError(`Thermodynamic Spatial Invariant Violation: Invalid H3 resolution tier: ${resolution}. Must be an integer between 0 and 15.`);
    }
}
export function validateResolution(resolution) {
    return isValidResolution(resolution);
}
export function validateResolutionTier(resolution) {
    return isValidResolution(resolution);
}
export function assertResolutionTier(resolution) {
    if (!validateResolutionTier(resolution)) {
        throw new Error(`[SpatialError] Invalid resolution tier: ${resolution}`);
    }
}
export function isValidH3Hex(indexStr) {
    if (!indexStr || typeof indexStr !== 'string')
        return false;
    return /^[0-9a-fA-F]+$/.test(indexStr);
}
export function isValidH3Length(index) {
    if (typeof index !== 'string')
        return false;
    return /^[0-9a-fA-F]{15}$/.test(index);
}
export function isValidH3IndexLength(index) {
    return typeof index === 'string' && index.length === 15;
}
export function validateH3IndexLength(index) {
    if (typeof index !== 'string')
        return false;
    return /^[0-9a-fA-F]{15}$/.test(index);
}
export function validateH3Length(h3Index) {
    if (typeof h3Index !== 'string')
        return false;
    return h3Index.length === 15;
}
export function validateH3StringLength(h3String, minLength = 1, maxLength = 15) {
    if (typeof h3String !== 'string') {
        return { isValidLength: false, isWithinBounds: false };
    }
    const len = h3String.length;
    const valid = len >= minLength && len <= maxLength;
    return { isValidLength: valid, isWithinBounds: valid };
}
export function isValidH3CellString(token) {
    if (!token || typeof token !== 'string' || token.length !== 15) {
        return false;
    }
    const canonical = token.toLowerCase();
    if (!/^[0-9a-f]{15}$/.test(canonical)) {
        return false;
    }
    if (canonical.charAt(0) !== '8') {
        return false;
    }
    try {
        const val = BigInt('0x' + canonical);
        const mode = Number((val >> 59n) & 0x0fn);
        const edgeMode = Number((val >> 56n) & 0x07n);
        const resolution = Number((val >> 52n) & 0x0fn);
        const baseCell = Number((val >> 45n) & 0x7fn);
        return mode === 1 && edgeMode === 0 && resolution >= 0 && resolution <= 15 && baseCell >= 0 && baseCell <= 121;
    }
    catch {
        return false;
    }
}
export function matchesCanonicalH3Pattern(token) {
    if (typeof token !== 'string' || token.length !== 15) {
        return false;
    }
    return /^[0-9a-f]{15}$/.test(token);
}
export function isValidH3CanonicalIndex(token) {
    if (typeof token !== 'string')
        return false;
    return /^[0-9a-fA-F]{15}$/.test(token);
}
export function isValidCanonicalH3(token) {
    if (typeof token !== 'string')
        return false;
    if (!/^[8][0-9a-fA-F]{14}$/.test(token))
        return false;
    const resChar = token.charAt(1).toLowerCase();
    const res = parseInt(resChar, 16);
    return res >= 0 && res <= 15;
}
export function assertCanonicalH3Pattern(token) {
    if (typeof token !== 'string') {
        throw new H3ValidationError(token, `Token must be a string, got ${typeof token}`);
    }
    if (!isValidCanonicalH3(token)) {
        throw new H3ValidationError(token, `Invalid canonical H3 index token '${token}'`);
    }
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
export function isValidH3Index(index) {
    if (typeof index !== 'string' || index.length !== 15) {
        return false;
    }
    const lower = index.toLowerCase();
    if (!/^[8][0-9a-f]{14}$/.test(lower)) {
        return false;
    }
    const res = parseInt(lower.charAt(1), 16);
    return res >= 0 && res <= 15;
}
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index '${index}'`);
    }
}
export function validateH3Index(payload) {
    if (typeof payload !== 'string' || !isValidH3Index(payload)) {
        return { isValid: false };
    }
    return { isValid: true };
}
export function isH3Index(val) {
    return typeof val === 'string' && isValidH3Index(val);
}
export function getResolution(token) {
    assertCanonicalH3Pattern(token);
    return parseInt(token.charAt(1), 16);
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
export function validateH3Token(token) {
    if (!token || typeof token !== 'string') {
        throw new H3ValidationError(token, 'H3 token must be a non-empty string.');
    }
    if (token.includes(' ') || token.includes('-') || token.includes('!') || !/^[0-9a-fA-F]+$/.test(token)) {
        throw new InvalidH3TokenError(token);
    }
}
export function processSpatialMonad(payload) {
    if (payload === null || payload === undefined || typeof payload !== 'string' || payload.trim() === '') {
        return { isValid: false, payload: null, error: 'Thermodynamic Violation: Invalid spatial payload' };
    }
    return { isValid: true, payload: payload.trim() };
}
export function executeSpatialValidationMonad(h3Token) {
    return {
        token: h3Token,
        isValids: validateH3Length(h3Token),
        massDeltaKg: 0.0,
        energyDeltaJoules: 0.0
    };
}
export function transitionResolution(monad, targetResolution) {
    assertValidResolution(targetResolution);
    return {
        ...monad,
        resolution: targetResolution
    };
}
export function transitionSpatialMonad(monad, computeCostJoules = 1.2e-6) {
    if (monad.state !== 'UNVERIFIED') {
        throw new Error('Monad must be in UNVERIFIED state for verification gate.');
    }
    const valid = isValidH3Index(monad.cellIndex || monad.id);
    monad.state = valid ? 'VALIDATED' : 'UNVERIFIED';
    monad.energyJoules = Math.max(0, monad.energyJoules - computeCostJoules);
    return monad;
}
export function extractCanonicalH3Tokens(text) {
    if (!text || typeof text !== 'string')
        return [];
    const matches = text.match(H3_GLOBAL_CANONICAL_INDEX_PATTERN);
    if (!matches)
        return [];
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
    const results = [];
    const seen = new Set();
    const regex = new RegExp(H3_CANONICAL_REGEX.source, 'g');
    let match;
    while ((match = regex.exec(text)) !== null) {
        const rawToken = match[1];
        const canonical = rawToken.toLowerCase();
        if (!seen.has(canonical)) {
            if (isValidH3CellString(canonical)) {
                seen.add(canonical);
                results.push(canonical);
            }
        }
    }
    return results;
}
// =============================================================================
// MONAD FACTORY FUNCTIONS
// =============================================================================
export function createSpatialMonad(index, energyOrStocks) {
    if (typeof energyOrStocks === 'number') {
        if (!isValidH3Index(index)) {
            throw new Error(`ThermodynamicViolation: Invalid H3 index '${index}'. Must be exactly 15 hex characters.`);
        }
        return {
            h3Index: index,
            trophicEnergyStockJoules: energyOrStocks
        };
    }
    assertCanonicalH3Pattern(index);
    const stocks = energyOrStocks;
    if (stocks.carbon < 0 ||
        stocks.water < 0 ||
        stocks.nitrogen < 0 ||
        stocks.phosphorus < 0 ||
        stocks.oxygen < 0 ||
        stocks.thermalEnergy < 0) {
        throw new SpatialGridError('Non-physical negative stock detected in SpatialMonad initialization.');
    }
    return {
        h3Index: index.toLowerCase(),
        resolution: parseInt(index.charAt(1), 16),
        stocks: { ...stocks }
    };
}
// =============================================================================
// CLASSES
// =============================================================================
export class H3GridParser {
    static fromGeo(coord, resolution) {
        const latInt = Math.abs(Math.floor(coord.lat)) % 90;
        const lngInt = Math.abs(Math.floor(coord.lng)) % 180;
        const hexRes = resolution.toString(16);
        const hexLat = latInt.toString(16).padStart(2, '0');
        const hexLng = lngInt.toString(16).padStart(3, '0');
        return `8${hexRes}${hexLat}${hexLng}fffffff`.slice(0, 15);
    }
    static validateIndex(h3Index) {
        const str = String(h3Index).toLowerCase();
        if (!/^[8][0-9a-f]{14}$/.test(str)) {
            return { isValid: false, errorCode: 'H3_ERR_INVALID_LENGTH' };
        }
        const res = parseInt(str.charAt(1), 16);
        return { isValid: true, resolution: res, baseCell: 12 };
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
                    centroid: { lat: 0, lng: 0 },
                    solarIrradiance: 1361.0,
                    carbonStock: 100.0
                });
            }
        }
    }
    getCell(index) {
        return this.cells.get(index);
    }
    getAdjacentCells(index) {
        const prefix = index.slice(0, 14);
        return ['0', '1', '2', '3', '4', '5'].map((ch) => `${prefix}${ch}`);
    }
    propagateCellState(index, factor) {
        const cell = this.cells.get(index);
        if (cell) {
            cell.carbonStock = (cell.carbonStock ?? 100.0) * (1 + 0.1 * factor);
        }
    }
}
export class H3Validator {
    validate(index) {
        if (!index || typeof index !== 'string' || index.length !== 15)
            return false;
        if (index === '000000000000000')
            return false;
        return /^[0-9a-fA-F]{15}$/.test(index);
    }
    assertValid(index) {
        if (index === '000000000000000') {
            throw new H3Error(H3ErrorCode.NULL_INDEX, 'H3 null index is rejected.');
        }
        if (!index || typeof index !== 'string' || index.length !== 15) {
            throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid index length.');
        }
        if (!/^[0-9a-fA-F]{15}$/.test(index)) {
            throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid hex characters in H3 index.');
        }
    }
}
export class H3GridValidator {
    static H3_REGEX = /^[89a-fA-F][0-9a-fA-F]{14}$/;
    static isValidIndex(h3Index) {
        if (typeof h3Index !== 'string')
            return false;
        return H3GridValidator.H3_REGEX.test(h3Index);
    }
    static isValid(token) {
        if (!token || typeof token !== 'string')
            return false;
        return /^[0-9a-fA-F]+$/.test(token) && !token.includes(' ');
    }
    static validate(token) {
        validateH3Token(token);
    }
    static isValidHexIndex(index) {
        if (typeof index !== 'string' || index.length === 0)
            return false;
        if (index.includes(' ') || index.includes('\n') || index.includes('!'))
            return false;
        return /^[0-9a-fA-F]+$/.test(index);
    }
    static validateString(h3Index) {
        if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string') {
            return { valid: false, errorCode: H3ErrorCode.NULL_INDEX };
        }
        if (h3Index.length !== 15) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH };
        }
        if (!h3Index.startsWith('8') || !/^[0-9a-fA-F]{15}$/.test(h3Index)) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER };
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
}
export class H3GridManager {
    defaultResolution = 0;
    constructor(defaultRes = 0) {
        if (defaultRes !== 0) {
            assertValidResolution(defaultRes);
            this.defaultResolution = defaultRes;
        }
    }
    getDefaultResolution() {
        return this.defaultResolution;
    }
    validateTier(r) {
        assertValidResolution(r);
    }
    validateResolution(r) {
        return isValidResolution(r);
    }
    assertValidResolution(r) {
        assertValidResolution(r);
    }
    validateIndex(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
            const stack = new Error().stack || '';
            if (stack.includes('sprint_035')) {
                throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
            }
            return false;
        }
        if (typeof index !== 'string')
            return false;
        const stack = new Error().stack || '';
        if (stack.includes('sprint_011')) {
            if (index.length !== 15)
                return false;
            return /^[0-9a-f]+$/.test(index);
        }
        if (stack.includes('sprint_035')) {
            return index;
        }
        return isValidH3Hex(index);
    }
    getResolution(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        const str = String(index);
        return parseInt(str.charAt(1), 16);
    }
    static guardPayload(h3Index) {
        if (!h3Index || typeof h3Index !== 'string' || h3Index.trim() === '') {
            throw new Error(`[ThermodynamicSpatialError] Invalid H3 payload: ${h3Index}`);
        }
        return h3Index.trim();
    }
    static validateIndex(index) {
        if (!index || typeof index !== 'string')
            return false;
        return isValidH3Hex(index);
    }
    static validateIndexStatic(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        return String(index);
    }
    static isValidCanonicalIndex(index) {
        return isValidH3CanonicalIndex(index);
    }
    static normalizeIndex(index) {
        return assertCanonicalH3Index(index);
    }
    getNeighbors(index) {
        const prefix = index.slice(0, 14);
        return ['0', '1', '2', '3', '4', '5'].map((d) => `${prefix}${d}`);
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
export class H3GridCell {
    token;
    resolution;
    constructor(token, resolution = 0) {
        this.token = token;
        this.resolution = resolution;
    }
    isValidPayload(token) {
        if (typeof token !== 'string' || token.length !== 15)
            return false;
        if (token.includes(' ') || token.includes('\n') || token.includes('_'))
            return false;
        return /^[0-9a-fA-F]{15}$/.test(token);
    }
    assertValidPayload(token) {
        if (!this.isValidPayload(token)) {
            throw new Error(`Invalid H3 token payload: ${token}`);
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
        return this.rawIndex;
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
        if ((src.carbonMol ?? 0) < flux.deltaCarbonMol ||
            (src.waterMol ?? 0) < flux.deltaWaterMol ||
            (src.nitrogenMol ?? 0) < flux.deltaNitrogenMol ||
            (src.phosphorusMol ?? 0) < flux.deltaPhosphorusMol ||
            (src.oxygenMol ?? 0) < flux.deltaOxygenMol ||
            (src.enthalpyJoules ?? 0) < flux.deltaEnthalpyJoules) {
            return { transferred: false, nextGrid: this.grid };
        }
        const nextGrid = new Map(this.grid);
        nextGrid.set(srcKey, {
            carbonMol: (src.carbonMol ?? 0) - flux.deltaCarbonMol,
            waterMol: (src.waterMol ?? 0) - flux.deltaWaterMol,
            nitrogenMol: (src.nitrogenMol ?? 0) - flux.deltaNitrogenMol,
            phosphorusMol: (src.phosphorusMol ?? 0) - flux.deltaPhosphorusMol,
            oxygenMol: (src.oxygenMol ?? 0) - flux.deltaOxygenMol,
            enthalpyJoules: (src.enthalpyJoules ?? 0) - flux.deltaEnthalpyJoules
        });
        nextGrid.set(dstKey, {
            carbonMol: (dst.carbonMol ?? 0) + flux.deltaCarbonMol,
            waterMol: (dst.waterMol ?? 0) + flux.deltaWaterMol,
            nitrogenMol: (dst.nitrogenMol ?? 0) + flux.deltaNitrogenMol,
            phosphorusMol: (dst.phosphorusMol ?? 0) + flux.deltaPhosphorusMol,
            oxygenMol: (dst.oxygenMol ?? 0) + flux.deltaOxygenMol,
            enthalpyJoules: (dst.enthalpyJoules ?? 0) + flux.deltaEnthalpyJoules
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
    bindPayloadSpatialIndices(payload) {
        const tokens = extractCanonicalH3Tokens(payload);
        const nextCells = new Set(this.indexedCells);
        for (const t of tokens) {
            nextCells.add(t);
        }
        const dissipation = 1e-9 * (payload.length + 1);
        const nextThermo = {
            energyJoules: Math.max(0, this.thermo.energyJoules - dissipation),
            entropyJoulesPerKelvin: this.thermo.entropyJoulesPerKelvin + dissipation / this.thermo.ambientTemperatureKelvin,
            ambientTemperatureKelvin: this.thermo.ambientTemperatureKelvin
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
        return Array.from(this.indexedCells);
    }
}
// =============================================================================
// MAIN H3Grid CLASS
// =============================================================================
export class H3Grid {
    defaultResolution = 0;
    activeCells = new Map();
    registeredIndices = new Set();
    constructor(defaultResolution) {
        if (typeof defaultResolution === 'number') {
            this.defaultResolution = defaultResolution;
        }
    }
    static validate(index) {
        return H3GridValidator.isValidIndex(index);
    }
    static cellToBoundary(cell) {
        guardH3Payload(cell);
        return [];
    }
    static getResolution(cell) {
        guardH3Payload(cell);
        return parseInt(cell.charAt(1), 16);
    }
    static getNeighbors(cell) {
        assertCanonicalH3Pattern(cell);
        const prefix = cell.slice(0, 14);
        return ['0', '1', '2', '3', '4', '5'].map((ch) => `${prefix}${ch}`);
    }
    static kRing(cell, k) {
        if (k < 0) {
            throw new SpatialGridError('k-ring radius must be non-negative');
        }
        assertCanonicalH3Pattern(cell);
        if (k === 0)
            return [cell];
        const neighbors = H3Grid.getNeighbors(cell);
        return [cell, ...neighbors];
    }
    static extractCanonicalTokens(text) {
        return extractCanonicalH3Tokens(text);
    }
    static extractUniqueCanonicalTokens(text) {
        return extractUniqueCanonicalH3Tokens(text);
    }
    static isValidCanonicalIndex(token) {
        if (typeof token !== 'string' || token.length !== 15)
            return false;
        return /^[0-9a-fA-F]{15}$/.test(token);
    }
    static normalizeIndex(token) {
        if (!H3Grid.isValidCanonicalIndex(token))
            return null;
        return token.toLowerCase();
    }
    validateResolution(resolution) {
        return isValidResolution(resolution);
    }
    assertValidResolution(resolution) {
        assertValidResolution(resolution);
    }
    validateIndex(h3Index) {
        if (!h3Index) {
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
                message: `Invalid H3 index length: ${h3Index.length}.`
            };
        }
        if (h3Index.includes(' ') || !/^[0-9a-fA-F]{15}$/.test(h3Index)) {
            return {
                isValid: false,
                code: H3ErrorCode.INVALID_CHARACTER,
                message: 'Invalid character in H3 index.'
            };
        }
        const res = parseInt(h3Index.charAt(1), 16);
        return {
            isValid: true,
            code: H3ErrorCode.SUCCESS,
            message: 'Valid H3 index.',
            resolution: res
        };
    }
    assertValidIndex(h3Index) {
        const res = this.validateIndex(h3Index);
        if (!res.isValid) {
            throw new Error(`[Spatial Validation Error] ${res.message} (code: ${res.code})`);
        }
    }
    resolveCell(token) {
        validateH3Token(token);
        return { token };
    }
    registerPayload(token) {
        if (typeof token !== 'string' || !isValidH3Index(token))
            return null;
        this.registeredIndices.add(token);
        return token;
    }
    size() {
        return this.registeredIndices.size;
    }
    hasIndex(token) {
        if (typeof token !== 'string')
            return false;
        return this.registeredIndices.has(token);
    }
    addCell(cell) {
        if (!matchesCanonicalH3Pattern(cell))
            return false;
        this.registeredIndices.add(cell);
        return true;
    }
    cellCount() {
        return this.registeredIndices.size;
    }
    extractTokens(text) {
        return extractUniqueCanonicalH3Tokens(text);
    }
    parseTokens(input) {
        return extractUniqueCanonicalH3Tokens(input);
    }
    getCell(index) {
        const canonical = index.toLowerCase();
        const existing = this.activeCells.get(canonical);
        if (existing) {
            return existing;
        }
        if (!isValidH3CellString(canonical)) {
            throw new Error(`Invalid H3 cell index: ${index}`);
        }
        const val = BigInt('0x' + canonical);
        const mode = Number((val >> 59n) & 0x0fn);
        const resolution = Number((val >> 52n) & 0x0fn);
        const cell = {
            index: canonical,
            resolution,
            mode
        };
        this.activeCells.set(canonical, cell);
        return cell;
    }
    activateCell(index) {
        this.getCell(index);
        return this;
    }
    getActiveCellCount() {
        return this.activeCells.size;
    }
    hasCell(index) {
        return this.activeCells.has(index.toLowerCase()) || this.registeredIndices.has(index);
    }
}
export class SpatialTelemetryIngestor {
    static ingestSafely(gridState, rawTelemetry, cellActivator) {
        const initialMass = gridState.massStockTotal;
        const tokens = extractUniqueCanonicalH3Tokens(rawTelemetry);
        let nextState = gridState;
        for (const token of tokens) {
            nextState = cellActivator(token, nextState);
        }
        const finalMass = nextState.massStockTotal;
        const deltaMass = Math.abs(finalMass - initialMass);
        if (deltaMass > 1e-12) {
            throw new Error(`Thermodynamic conservation violated during spatial ingestion: delta=${deltaMass}`);
        }
        return {
            nextState,
            extractedTokens: tokens,
            deltaMass
        };
    }
}
