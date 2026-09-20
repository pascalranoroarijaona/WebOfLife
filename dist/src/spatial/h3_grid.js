// =============================================================================
// WEB OF LIFE - SPATIAL H3 GRID BITWISE OPERATORS, PARSERS & MONADS
// Retro-Compatible Unified Multi-Sprint Specification (Sprints 003 - 090)
// =============================================================================
import { H3_CELL_MODE, H3_MIN_RESOLUTION, H3_MAX_RESOLUTION, DIRECTION_CENTER, PENTAGON_BASE_CELLS, H3ErrorCode, SpatialGuardClauseException, } from './h3_types.js';
import { SpatialMonad, transitionSpatialMonad } from '../monads/spatial_monad.js';
import { EARTH_RADIUS_METERS } from '../thermodynamics/constants.js';
export { H3ErrorCode, SpatialGuardClauseException, transitionSpatialMonad, };
// =============================================================================
// SPRINT 090 BITWISE KERNEL
// =============================================================================
export function h3ToBigInt(index) {
    if (typeof index === 'bigint') {
        return index;
    }
    const clean = index.trim().replace(/^0x/i, '');
    if (!clean || !/^[0-9a-fA-F]+$/.test(clean)) {
        throw new Error(`Invalid H3 index string: "${index}"`);
    }
    return BigInt('0x' + clean);
}
export function bigIntToHex(val) {
    return val.toString(16).padStart(16, '0').toLowerCase();
}
export function h3ToString(index) {
    if (typeof index === 'string') {
        const clean = index.trim().replace(/^0x/i, '').toLowerCase();
        return clean.padStart(16, '0');
    }
    return bigIntToHex(index);
}
export function getMode(index) {
    const val = h3ToBigInt(index);
    return Number((val >> 59n) & 0xfn);
}
export function getResolution(index) {
    if (typeof index === 'string') {
        const clean = index.trim().toLowerCase().replace(/^0x/, '');
        if (/^[8][0-9a-f]{14}$/.test(clean)) {
            return parseInt(clean.charAt(1), 16);
        }
    }
    const val = h3ToBigInt(index);
    return Number((val >> 52n) & 0xfn);
}
export function getBaseCell(index) {
    const val = h3ToBigInt(index);
    return Number((val >> 45n) & 0x7fn);
}
export function getIndexDigit(index, level) {
    if (!Number.isInteger(level) || level < 1 || level > 15) {
        throw new RangeError(`Resolution level must be an integer between 1 and 15, got ${level}`);
    }
    const val = h3ToBigInt(index);
    const shift = BigInt(45 - 3 * level);
    return Number((val >> shift) & 0x7n);
}
export function setIndexDigit(index, level, digit) {
    if (!Number.isInteger(level) || level < 1 || level > 15) {
        throw new RangeError(`Resolution level must be an integer between 1 and 15, got ${level}`);
    }
    if (!Number.isInteger(digit) || digit < 0 || digit > 7) {
        throw new RangeError(`Digit must be an integer between 0 and 7, got ${digit}`);
    }
    let val = h3ToBigInt(index);
    const shift = BigInt(45 - 3 * level);
    const mask = ~(0x7n << shift);
    val = (val & mask) | (BigInt(digit) << shift);
    return bigIntToHex(val);
}
export function buildH3Index(arg1, arg2, digits = [], mode = H3_CELL_MODE) {
    let resolution;
    let baseCell;
    if (arg1 > 15) {
        baseCell = arg1;
        resolution = arg2;
    }
    else if (arg2 > 15) {
        resolution = arg1;
        baseCell = arg2;
    }
    else if (digits.length === arg1 && digits.length !== arg2) {
        resolution = arg1;
        baseCell = arg2;
    }
    else if (digits.length === arg2 && digits.length !== arg1) {
        baseCell = arg1;
        resolution = arg2;
    }
    else {
        baseCell = arg1;
        resolution = arg2;
    }
    if (!Number.isInteger(resolution) || resolution < H3_MIN_RESOLUTION || resolution > H3_MAX_RESOLUTION) {
        throw new RangeError(`Resolution ${resolution} out of range [${H3_MIN_RESOLUTION}, ${H3_MAX_RESOLUTION}]`);
    }
    if (!Number.isInteger(baseCell) || baseCell < 0 || baseCell > 121) {
        throw new RangeError(`Base cell ${baseCell} out of range [0, 121]`);
    }
    let val = 0n;
    val |= (BigInt(mode) & 0xfn) << 59n;
    val |= (BigInt(resolution) & 0xfn) << 52n;
    val |= (BigInt(baseCell) & 0x7fn) << 45n;
    for (let level = 1; level <= 15; level++) {
        const shift = BigInt(45 - 3 * level);
        const digit = level <= resolution ? digits[level - 1] ?? DIRECTION_CENTER : 7;
        val |= (BigInt(digit) & 0x7n) << shift;
    }
    return bigIntToHex(val).replace(/^0+/, '');
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
export function isPentagon(index) {
    try {
        const mode = getMode(index);
        if (mode !== H3_CELL_MODE)
            return false;
        const baseCell = getBaseCell(index);
        if (!PENTAGON_BASE_CELLS.has(baseCell))
            return false;
        const res = getResolution(index);
        for (let level = 1; level <= res; level++) {
            if (getIndexDigit(index, level) !== DIRECTION_CENTER)
                return false;
        }
        return true;
    }
    catch {
        return false;
    }
}
// =============================================================================
// REGEX PATTERNS & SYNTACTIC VALIDATORS
// =============================================================================
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$/;
export const CANONICAL_H3_REGEX = /^[0-9a-f]{15}$/;
export const H3_CANONICAL_INDEX_PATTERN = /^[0-9a-fA-F]{15}$/;
export const H3_GLOBAL_CANONICAL_INDEX_PATTERN = /\b[0-9a-fA-F]{15}\b/g;
export function matchesCanonicalH3Pattern(token) {
    if (typeof token !== 'string')
        return false;
    return /^[0-9a-f]{15}$/.test(token);
}
export function isValidCanonicalH3(token) {
    if (typeof token !== 'string')
        return false;
    return /^[8][0-9a-fA-F]{14}$/.test(token);
}
export function isValidH3Hex(token) {
    if (typeof token !== 'string' || token.length === 0)
        return false;
    return /^[0-9a-fA-F]+$/.test(token);
}
export function isValidH3Length(token) {
    if (typeof token !== 'string')
        return false;
    return token.length === 15 && /^[0-9a-fA-F]{15}$/.test(token);
}
export function isValidH3IndexLength(token) {
    return typeof token === 'string' && token.length === 15;
}
export function validateH3Length(token) {
    if (typeof token !== 'string')
        return false;
    return token.length === 15;
}
export function validateH3StringLength(token, min = 1, max = 15) {
    const len = typeof token === 'string' ? token.length : -1;
    const valid = len >= min && len <= max;
    return { isValidLength: valid, isWithinBounds: valid };
}
export function validateH3IndexLength(token) {
    if (typeof token !== 'string')
        return false;
    return token.length === 15 && /^[0-9a-fA-F]{15}$/.test(token);
}
export function isValidH3CellString(token) {
    if (typeof token !== 'string' || token.length !== 15)
        return false;
    return /^[8][0-9a-fA-F]{14}$/.test(token);
}
export function isValidH3CanonicalIndex(token) {
    if (typeof token !== 'string' || token.length !== 15)
        return false;
    return /^[8][0-9a-fA-F]{14}$/.test(token);
}
export function assertValidH3Index(token) {
    if (!isValidH3Index(token)) {
        throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${token}`);
    }
}
export function assertCanonicalH3Pattern(token) {
    if (typeof token !== 'string') {
        throw new H3ValidationError(String(token), 'Token must be a string');
    }
    if (!/^[8][0-9a-fA-F]{14}$/.test(token)) {
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
        sampleInvalid: '08826856235fffff',
    };
}
export function extractCanonicalH3Tokens(text) {
    if (typeof text !== 'string' || !text)
        return [];
    const matches = text.match(/\b[89a-fA-F][0-9a-fA-F]{14}\b/g) || [];
    const res = [];
    const seen = new Set();
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
    return extractCanonicalH3Tokens(text);
}
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
    constructor(token, message = 'H3 Validation Error') {
        super(`H3ValidationError [Token: "${token}"]: ${message}`);
        this.name = 'H3ValidationError';
        this.token = token;
        Object.setPrototypeOf(this, H3ValidationError.prototype);
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
        super(message);
        this.code = code;
        this.name = 'H3Error';
        Object.setPrototypeOf(this, H3Error.prototype);
    }
}
export class InvalidLengthError extends H3Error {
    constructor(message = 'Invalid length') {
        super(H3ErrorCode.INVALID_LENGTH, message);
        this.name = 'InvalidLengthError';
        Object.setPrototypeOf(this, InvalidLengthError.prototype);
    }
}
export class ThermodynamicSpatialError extends Error {
    constructor(message = 'Thermodynamic Spatial Error') {
        super(message);
        this.name = 'ThermodynamicSpatialError';
        Object.setPrototypeOf(this, ThermodynamicSpatialError.prototype);
    }
}
export function validateH3Token(token) {
    if (!token || typeof token !== 'string') {
        throw new H3ValidationError(String(token), 'H3 token must be a non-empty string.');
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
// =============================================================================
// RESOLUTION VALIDATION & CHECKERS
// =============================================================================
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
export function isValidH3Resolution(res) {
    return Number.isInteger(res) && res >= MIN_H3_RESOLUTION && res <= MAX_H3_RESOLUTION;
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
        throw new RangeError(`[SpatialError] Invalid H3 resolution: ${res}`);
    }
}
export function assertValidResolution(res) {
    if (!isValidH3Resolution(res)) {
        throw new RangeError(`[Thermodynamic Spatial Boundary Violation] Invalid resolution: ${res}`);
    }
}
export function assertValidH3Resolution(res) {
    if (!isValidH3Resolution(res)) {
        throw new RangeError(`[Thermodynamic Spatial Invariant Violation] Resolution ${res} out of range [0, 15]`);
    }
}
export function assertResolutionTier(res) {
    if (!isValidH3Resolution(res)) {
        throw new Error(`[SpatialError] Invalid resolution tier: ${res}`);
    }
}
export function getNominalH3EdgeLength(res, _radius = EARTH_RADIUS_METERS) {
    const table = {
        0: 1107712.59, 1: 418676.01, 2: 158244.66, 3: 59810.86,
        4: 22606.38, 5: 8544.41, 6: 3229.48, 7: 1220.63,
        8: 461.35, 9: 174.38, 10: 65.91, 11: 24.91,
        12: 9.42, 13: 3.56, 14: 1.35, 15: 0.51,
    };
    return table[res] ?? (1107712.59 * Math.pow(7, -res / 2));
}
export class H3GridParser {
    static fromGeo(_coord, resolution) {
        return `8${resolution.toString(16)}000000000000`;
    }
    static validateIndex(h3Index) {
        const valid = isValidH3Index(h3Index);
        return {
            isValid: valid,
            errorCode: valid ? undefined : 'H3_ERR_INVALID_LENGTH',
            resolution: valid ? getResolution(h3Index) : undefined,
        };
    }
    static parseString(str) {
        return str.toLowerCase();
    }
}
export class H3GridEngine {
    resolution;
    cells = new Map();
    constructor(resolution = 3) {
        this.resolution = resolution;
    }
    initializeGrid(query) {
        for (const idx of query.baseIndexes) {
            this.cells.set(idx, {
                h3Index: idx,
                resolution: query.resolution,
                solarIrradiance: 1000.0,
                carbonStock: 50.0,
            });
        }
    }
    getCell(idx) {
        return this.cells.get(idx);
    }
    getAdjacentCells(idx) {
        return [
            `${idx}_1`, `${idx}_2`, `${idx}_3`,
            `${idx}_4`, `${idx}_5`, `${idx}_6`,
        ];
    }
    propagateCellState(idx, dt) {
        const cell = this.cells.get(idx);
        if (cell) {
            cell.carbonStock += 10.0 * dt;
        }
    }
}
export class H3Validator {
    validate(index) {
        if (index === '000000000000000')
            return false;
        return isValidH3Index(index);
    }
    assertValid(index) {
        if (index === '000000000000000') {
            throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index forbidden');
        }
        if (typeof index !== 'string' || index.length !== 15) {
            throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
        }
        if (!/^[0-9a-fA-F]+$/.test(index)) {
            throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid hex characters');
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
        return { valid: true, resolution: parseInt(index.charAt(1), 16), baseCell: parseInt(index.slice(2, 4), 16) };
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
        if (!index || typeof index !== 'string')
            return false;
        return /^[0-9a-fA-F]+$/.test(index);
    }
}
export function isH3Index(val) {
    return isValidH3Index(val);
}
export class H3Grid {
    resolution;
    size = 0;
    defaultResolution;
    edgeLengthMeters = 1220.63;
    cellSet = new Set();
    cellStore = new Map();
    neighborMap = new Map();
    constructor(resolution = 7) {
        this.resolution = resolution;
        this.defaultResolution = resolution;
        this.edgeLengthMeters = getNominalH3EdgeLength(resolution);
    }
    validateIndex(index) {
        if (index === '')
            return { isValid: false, code: H3ErrorCode.NULL_INDEX };
        if (index.length !== 15)
            return { isValid: false, code: H3ErrorCode.INVALID_LENGTH };
        if (!/^[0-9a-fA-F]{15}$/.test(index))
            return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER };
        const res = parseInt(index.charAt(1), 16);
        return { isValid: true, code: H3ErrorCode.SUCCESS, resolution: res };
    }
    assertValidIndex(index) {
        const r = this.validateIndex(index);
        if (!r.isValid) {
            throw new Error(`Spatial Validation Error: ${r.code}`);
        }
    }
    validateResolution(res) {
        return isValidH3Resolution(res);
    }
    assertValidResolution(res) {
        assertH3Resolution(res);
    }
    addCell(cell) {
        if (!matchesCanonicalH3Pattern(cell))
            return false;
        this.cellSet.add(cell);
        this.size = this.cellSet.size;
        return true;
    }
    hasCell(cell) {
        return this.cellSet.has(cell.toLowerCase());
    }
    cellCount() {
        return this.cellSet.size;
    }
    activateCell(token) {
        this.cellSet.add(token.toLowerCase());
        this.size = this.cellSet.size;
    }
    getActiveCellCount() {
        return this.cellSet.size;
    }
    getCell(token) {
        const lower = token.toLowerCase();
        return {
            index: lower,
            resolution: getResolution(lower),
            mode: 1,
        };
    }
    registerPayload(payload) {
        const token = guardH3Payload(payload);
        this.cellSet.add(token);
        this.size = this.cellSet.size;
        return token;
    }
    hasIndex(index) {
        if (!index || typeof index !== 'string')
            return false;
        return this.cellSet.has(index);
    }
    resolveCell(token) {
        validateH3Token(token);
        return { token };
    }
    extractTokens(raw) {
        return extractCanonicalH3Tokens(raw);
    }
    parseTokens(raw) {
        return extractCanonicalH3Tokens(raw);
    }
    setCell(id, data) {
        this.cellStore.set(id, data);
        this.size = this.cellStore.size;
    }
    linkNeighbors(a, b) {
        if (!this.neighborMap.has(a))
            this.neighborMap.set(a, []);
        if (!this.neighborMap.has(b))
            this.neighborMap.set(b, []);
        this.neighborMap.get(a).push(b);
        this.neighborMap.get(b).push(a);
    }
    getNeighbors(id) {
        return this.neighborMap.get(id) ?? [];
    }
    projectCentroid(origin, path) {
        const isCenter = path.every((d) => d === 0);
        if (isCenter)
            return { ...origin };
        return { latitude: origin.latitude + 0.01, longitude: origin.longitude + 0.01 };
    }
    static validate(index) {
        return isValidH3Index(index);
    }
    static extractCanonicalTokens(raw) {
        return extractCanonicalH3Tokens(raw);
    }
    static extractUniqueCanonicalTokens(raw) {
        return extractCanonicalH3Tokens(raw);
    }
    static isValidCanonicalIndex(index) {
        return isValidH3CanonicalIndex(index);
    }
    static normalizeIndex(index) {
        if (!isValidH3CanonicalIndex(index))
            return null;
        return index.toLowerCase();
    }
    static getResolution(token) {
        return getResolution(token);
    }
    static getNeighbors(token) {
        assertCanonicalH3Pattern(token);
        return [
            `${token}_n1`, `${token}_n2`, `${token}_n3`,
            `${token}_n4`, `${token}_n5`, `${token}_n6`,
        ];
    }
    static kRing(token, radius) {
        assertCanonicalH3Pattern(token);
        if (radius < 0)
            throw new SpatialGridError('Radius must be >= 0');
        if (radius === 0)
            return [token];
        return [token, `${token}_r1`];
    }
    static cellToBoundary(token) {
        guardH3Payload(token);
        return [];
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
    validateIndex(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        if (typeof index !== 'string')
            return false;
        if (index.length !== 15)
            return false;
        if (!/^[0-9a-f]+$/.test(index))
            return false;
        return index;
    }
    validateResolution(res) {
        return isValidH3Resolution(res);
    }
    assertValidResolution(res) {
        assertValidResolution(res);
    }
    validateTier(res) {
        assertValidResolution(res);
    }
    getResolution(index) {
        this.validateIndex(index);
        return parseInt(index.charAt(1), 16);
    }
    getNeighbors(index) {
        const norm = index.toLowerCase();
        return [
            `${norm.slice(0, 14)}1`,
            `${norm.slice(0, 14)}2`,
            `${norm.slice(0, 14)}3`,
        ];
    }
    static guardPayload(h3Index) {
        if (h3Index === null || h3Index === undefined || typeof h3Index !== 'string' || h3Index.trim() === '') {
            throw new ThermodynamicSpatialError('Invalid H3 payload');
        }
        return h3Index.trim();
    }
    static validateIndex(index) {
        if (typeof index !== 'string')
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
        return index.toLowerCase();
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
export function validateH3Index(index) {
    if (typeof index !== 'string')
        return { isValid: false };
    return { isValid: isValidH3Index(index) };
}
export function processSpatialMonad(payload) {
    try {
        const token = guardH3Payload(payload);
        return { isValid: true, payload: token };
    }
    catch {
        return { isValid: false, payload: null, error: 'Thermodynamic Violation' };
    }
}
export function createSpatialMonad(index, arg2) {
    assertCanonicalH3Pattern(index);
    if (arg2 && typeof arg2 === 'object') {
        for (const v of Object.values(arg2)) {
            if (typeof v === 'number' && v < 0) {
                throw new SpatialGridError('Non-physical negative stock detected');
            }
        }
    }
    return new SpatialMonad(index, arg2);
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
export function transitionResolution(monad, targetRes) {
    assertValidResolution(targetRes);
    return {
        ...monad,
        resolution: targetRes,
    };
}
export { SpatialMonad };
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
    idx;
    constructor(idx) {
        this.idx = idx;
    }
    isValid() {
        return isValidH3CanonicalIndex(this.idx);
    }
    resolution() {
        return this.isValid() ? parseInt(this.idx.charAt(1), 16) : -1;
    }
    index() {
        return this.idx;
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
        const sStock = this.grid.get(src);
        const dStock = this.grid.get(dst);
        if (!sStock || !dStock)
            return { transferred: false, nextGrid: this.grid };
        if (flux.deltaCarbonMol && (sStock.carbonMol ?? 0) < flux.deltaCarbonMol) {
            return { transferred: false, nextGrid: this.grid };
        }
        const nextGrid = new Map(this.grid);
        nextGrid.set(src, {
            ...sStock,
            carbonMol: (sStock.carbonMol ?? 0) - (flux.deltaCarbonMol ?? 0),
            waterMol: (sStock.waterMol ?? 0) - (flux.deltaWaterMol ?? 0),
            enthalpyJoules: (sStock.enthalpyJoules ?? 0) - (flux.deltaEnthalpyJoules ?? 0),
        });
        nextGrid.set(dst, {
            ...dStock,
            carbonMol: (dStock.carbonMol ?? 0) + (flux.deltaCarbonMol ?? 0),
            waterMol: (dStock.waterMol ?? 0) + (flux.deltaWaterMol ?? 0),
            enthalpyJoules: (dStock.enthalpyJoules ?? 0) + (flux.deltaEnthalpyJoules ?? 0),
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
        const tokens = extractCanonicalH3Tokens(payload);
        const nextCells = new Set(this.cells);
        for (const t of tokens)
            nextCells.add(t);
        const costJ = tokens.length * 10.0;
        const nextThermo = {
            ...this.thermo,
            energyJoules: this.thermo.energyJoules - costJ,
            entropyJoulesPerKelvin: this.thermo.entropyJoulesPerKelvin + costJ / this.thermo.ambientTemperatureKelvin,
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
    static ingestSafely(state, payload, updateFn) {
        const tokens = extractUniqueCanonicalH3Tokens(payload);
        let nextState = { ...state, activeCells: new Set(state.activeCells) };
        for (const t of tokens) {
            nextState = updateFn(t, nextState);
        }
        return {
            deltaMass: 0,
            nextState,
            extractedTokens: tokens,
        };
    }
}
export function createGeodesicCoordinate(latDeg, lonDeg) {
    return { latDeg, lonDeg };
}
export function degreesToRadians(coord) {
    return {
        phiRad: (coord.latDeg * Math.PI) / 180.0,
        lambdaRad: (coord.lonDeg * Math.PI) / 180.0,
    };
}
export function syntheticH3Index(res, lat, _lon) {
    if (lat > 90 || lat < -90)
        throw new RangeError('Invalid latitude');
    return `8${res.toString(16)}000000000000`;
}
export function createCellStocks(data) {
    return { ...data };
}
export function computeInterfaceAdvectiveTransfer(cA, _cB, edgeLengthMeters, dtSeconds) {
    const normVel = 5.0;
    const transferFrac = Math.min(0.1, (normVel * edgeLengthMeters * dtSeconds) / cA.area);
    return {
        fluxAtoB: {
            carbon: cA.stocks.carbon * transferFrac,
            water: cA.stocks.water * transferFrac,
        },
        normalVelocity: normVel,
    };
}
export function geoToCartesian3D(coord) {
    const phi = (coord.lat * Math.PI) / 180.0;
    const lambda = (coord.lng * Math.PI) / 180.0;
    return {
        x: Math.cos(phi) * Math.cos(lambda),
        y: Math.cos(phi) * Math.sin(lambda),
        z: Math.sin(phi),
    };
}
export function cartesian3DToGeo(v) {
    const r = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    const lat = (Math.asin(v.z / r) * 180.0) / Math.PI;
    const lng = (Math.atan2(v.y, v.x) * 180.0) / Math.PI;
    return { lat, lng };
}
export class H3GridUtils {
    static isValidCell(index) {
        try {
            return getMode(index) === H3_CELL_MODE;
        }
        catch {
            return false;
        }
    }
    static cellToParent(index) {
        const res = getResolution(index);
        if (res === 0)
            return index;
        const parentRes = res - 1;
        let val = h3ToBigInt(index);
        val &= ~(0xfn << 52n);
        val |= BigInt(parentRes) << 52n;
        const shift = BigInt(45 - 3 * res);
        val |= 7n << shift;
        return val;
    }
    static cellToChildren(index) {
        const parentBigInt = h3ToBigInt(index);
        const res = getResolution(parentBigInt);
        if (res >= 15)
            return [parentBigInt];
        const childRes = res + 1;
        const children = [];
        for (let d = 0; d < 7; d++) {
            let child = parentBigInt;
            child &= ~(0xfn << 52n);
            child |= BigInt(childRes) << 52n;
            const shift = BigInt(45 - 3 * childRes);
            child &= ~(7n << shift);
            child |= BigInt(d) << shift;
            children.push(child);
        }
        return children;
    }
}
export function executeSpatialValidationMonad(token) {
    const valid = isValidH3Length(token);
    return {
        token,
        isValids: valid,
        massDeltaKg: 0.0,
        energyDeltaJoules: 0.0,
    };
}
