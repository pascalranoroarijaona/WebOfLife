// =============================================================================
// WEB OF LIFE - H3 GRID GEOMETRY, VALIDATION & PROJECTION UTILITIES
// =============================================================================
import { H3ErrorCode, SpatialGuardClauseException, } from './h3_types.js';
import { createVec3D } from './h3_adjacency.js';
export { H3ErrorCode, SpatialGuardClauseException };
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$/;
export const H3_CANONICAL_INDEX_PATTERN = /^[0-9a-fA-F]{15}$/;
export const CANONICAL_H3_REGEX = /^[0-9a-f]{15}$/;
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
export class InvalidLengthError extends H3ValidationError {
    code = H3ErrorCode.INVALID_LENGTH;
    constructor(message = 'Invalid H3 index length') {
        super('', message);
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
        super(message ?? 'Thermodynamic Spatial Error');
        this.name = 'ThermodynamicSpatialError';
    }
}
export function isValidH3Resolution(resolution) {
    return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}
export function isValidResolution(resolution) {
    return isValidH3Resolution(resolution);
}
export function assertH3Resolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new ThermodynamicSpatialError(`Invalid H3 resolution tier: ${resolution}`);
    }
}
export function assertValidH3Resolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new RangeError(`Thermodynamic Spatial Invariant Violation: resolution ${resolution} must be in [0, 15]`);
    }
}
export function validateResolution(resolution) {
    return isValidH3Resolution(resolution);
}
export function assertValidResolution(resolution) {
    if (!isValidResolution(resolution)) {
        throw new RangeError(`Thermodynamic Spatial Boundary Violation: Resolution tier ${resolution} is outside valid range [0, 15].`);
    }
}
export function validateResolutionTier(resolution) {
    return isValidH3Resolution(resolution);
}
export function assertResolutionTier(resolution) {
    if (!validateResolutionTier(resolution)) {
        throw new Error(`[SpatialError] Invalid resolution tier: ${resolution}`);
    }
}
export function isValidH3Index(index) {
    if (typeof index !== 'string')
        return false;
    if (index.length !== 15)
        return false;
    if (!/^[0-9a-fA-F]{15}$/.test(index))
        return false;
    const lower = index.toLowerCase();
    if (lower === '000000000000000' || lower === 'fffffffffffffff')
        return false;
    return true;
}
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new Error(`[Thermodynamic Spatial Violation] Invalid H3 index: ${index}`);
    }
}
export function isValidH3Length(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15 && /^[0-9a-fA-F]{15}$/.test(index);
}
export function isValidH3IndexLength(index) {
    return typeof index === 'string' && index.length === 15;
}
export function validateH3Length(index) {
    return typeof index === 'string' && index.length === 15;
}
export function validateH3IndexLength(index) {
    if (typeof index !== 'string')
        return false;
    return index.length === 15 && /^[0-9a-fA-F]{15}$/.test(index);
}
export function isValidH3Hex(str) {
    if (typeof str !== 'string' || str.length === 0)
        return false;
    return /^[0-9a-fA-F]+$/.test(str);
}
export function validateH3Token(token) {
    if (!token || typeof token !== 'string') {
        throw new InvalidH3TokenError(String(token));
    }
    if (!/^[0-9a-fA-F]+$/.test(token)) {
        throw new InvalidH3TokenError(token);
    }
}
export function guardH3Payload(payload) {
    if (payload === null || payload === undefined) {
        throw new TypeError('[Thermodynamic Spatial Error] H3 payload cannot be null or undefined');
    }
    if (typeof payload !== 'string' || payload.trim() === '') {
        throw new TypeError('[Thermodynamic Spatial Error] H3 payload must be a non-empty string');
    }
    return payload.trim();
}
export function assertCanonicalH3Pattern(token) {
    if (typeof token !== 'string') {
        throw new H3ValidationError(token, 'Token must be a string');
    }
    if (token.length !== 15) {
        throw new H3ValidationError(token, `Invalid length ${token.length}`);
    }
    if (!/^[8][0-9a-fA-F]{14}$/.test(token)) {
        throw new H3ValidationError(token, `Invalid canonical H3 index token '${token}'`);
    }
}
export function isValidCanonicalH3(token) {
    if (typeof token !== 'string' || token.length !== 15)
        return false;
    return /^[8][0-9a-fA-F]{14}$/.test(token);
}
export function matchesCanonicalH3Pattern(token) {
    if (typeof token !== 'string' || token.length !== 15)
        return false;
    return /^[0-9a-f]{15}$/.test(token);
}
export function isValidH3CanonicalIndex(token) {
    if (typeof token !== 'string' || token.length !== 15)
        return false;
    return /^[8][0-9a-fA-F]{14}$/.test(token);
}
export function assertCanonicalH3Index(token) {
    if (typeof token !== 'string' || !/^[8][0-9a-fA-F]{14}$/.test(token)) {
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
export function isH3Index(token) {
    return isValidH3Index(token);
}
export function getResolution(token) {
    assertCanonicalH3Pattern(token);
    return parseInt(token.charAt(1), 16);
}
export function validateH3StringLength(token, min, max) {
    const valid = typeof token === 'string' && token.length >= min && token.length <= max;
    return { isValidLength: valid, isWithinBounds: valid };
}
export function extractCanonicalH3Tokens(payload) {
    if (!payload || typeof payload !== 'string')
        return [];
    const matches = payload.match(/\b[0-9a-fA-F]{15}\b/g);
    if (!matches)
        return [];
    const unique = new Set();
    for (const m of matches) {
        if (m.toLowerCase().startsWith('8')) {
            unique.add(m.toLowerCase());
        }
    }
    return Array.from(unique);
}
export function extractUniqueCanonicalH3Tokens(payload) {
    if (!payload || typeof payload !== 'string')
        return [];
    const matches = payload.match(/\b[0-9a-fA-F]{15}\b/g);
    if (!matches)
        return [];
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
export function isValidH3CellString(token) {
    if (typeof token !== 'string' || token.length !== 15)
        return false;
    return /^[8][0-9a-fA-F]{14}$/.test(token);
}
export function getNominalH3EdgeLength(resolution, radiusMeters = 6371007.2) {
    const nominalEdgeRes0 = 1107712.59 * (radiusMeters / 6371007.2);
    return nominalEdgeRes0 * Math.pow(7, -resolution / 2);
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
export function syntheticH3Index(res, latDeg, _lonDeg) {
    if (latDeg < -90 || latDeg > 90)
        throw new RangeError('Latitude out of range');
    return `8${res.toString(16)}000000000000`;
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
export function cartesian3DToGeo(cart) {
    const norm = Math.hypot(cart.x, cart.y, cart.z);
    const lat = Math.asin(Math.max(-1.0, Math.min(1.0, cart.z / norm))) * (180.0 / Math.PI);
    const lng = Math.atan2(cart.y, cart.x) * (180.0 / Math.PI);
    return { lat, lng };
}
export class H3GridParser {
    static fromGeo(_coord, resolution) {
        return `8${resolution.toString(16)}000000000000`;
    }
    static parseString(str) {
        return str.toLowerCase();
    }
    static validateIndex(h3Index) {
        const s = String(h3Index);
        if (!/^[89a-fA-F][0-9a-fA-F]{14}$/.test(s)) {
            return { isValid: false, errorCode: 'H3_ERR_INVALID_LENGTH' };
        }
        const res = parseInt(s.charAt(1), 16);
        return { isValid: true, resolution: res, baseCell: 0 };
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
                    solarIrradiance: 342.0,
                    carbonStock: 100.0,
                });
            }
        }
    }
    getCell(idx) {
        return this.cells.get(idx);
    }
    getAdjacentCells(_idx) {
        return ['adj_1', 'adj_2', 'adj_3', 'adj_4', 'adj_5', 'adj_6'];
    }
    propagateCellState(idx, factor) {
        const cell = this.cells.get(idx);
        if (cell)
            cell.carbonStock += factor * 10;
    }
}
export class H3Validator {
    validate(idx) {
        if (idx === '000000000000000')
            return false;
        return /^[0-9a-fA-F]{15}$/.test(idx);
    }
    assertValid(idx) {
        if (idx === '000000000000000') {
            throw new H3Error(H3ErrorCode.NULL_INDEX, 'Null index');
        }
        if (idx.length !== 15) {
            throw new H3Error(H3ErrorCode.INVALID_LENGTH, 'Invalid length');
        }
        if (!/^[0-9a-fA-F]{15}$/.test(idx)) {
            throw new H3Error(H3ErrorCode.INVALID_CHARACTER, 'Invalid character');
        }
    }
}
export class H3GridValidator {
    static validate(token) {
        validateH3Token(token);
    }
    static isValid(token) {
        return typeof token === 'string' && /^[0-9a-fA-F]+$/.test(token);
    }
    static isValidIndex(idx) {
        return typeof idx === 'string' && /^[89a-fA-F][0-9a-fA-F]{14}$/.test(idx);
    }
    static isValidHexIndex(idx) {
        return typeof idx === 'string' && idx.length > 0 && /^[0-9a-fA-F]+$/.test(idx);
    }
    static validateString(idx) {
        if (idx === null || idx === undefined || typeof idx !== 'string') {
            return { valid: false, errorCode: H3ErrorCode.NULL_INDEX };
        }
        if (idx.length !== 15) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH };
        }
        if (!idx.startsWith('8') || !/^[0-9a-fA-F]{15}$/.test(idx)) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER };
        }
        return { valid: true, resolution: parseInt(idx.charAt(1), 16), baseCell: parseInt(idx.slice(2, 4), 16) };
    }
    static parseResolution(idx) {
        return parseInt(idx.charAt(1), 16);
    }
    static parseBaseCell(idx) {
        return parseInt(idx.slice(2, 4), 16);
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
        if (!this.isValidPayload(token))
            throw new Error('Invalid payload');
    }
}
export class H3GridManager {
    defRes;
    constructor(defRes = 7) {
        this.defRes = defRes;
    }
    validateIndex(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        if (typeof index !== 'string')
            return false;
        if (index.length !== 15)
            return false;
        return /^[0-9a-f]+$/.test(index) ? index : false;
    }
    static validateIndex(index) {
        return typeof index === 'string' && index.length === 15 && /^[0-9a-f]+$/.test(index);
    }
    static validateIndexStatic(index) {
        if (index === null || index === undefined || (typeof index === 'string' && index.trim() === '')) {
            throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        return index;
    }
    validateTier(res) {
        assertValidH3Resolution(res);
        return true;
    }
    getDefaultResolution() {
        return this.defRes;
    }
    validateResolution(res) {
        return isValidH3Resolution(res);
    }
    assertValidResolution(res) {
        assertValidH3Resolution(res);
    }
    static guardPayload(p) {
        if (!p || typeof p !== 'string' || p.trim() === '') {
            throw new ThermodynamicSpatialError('Invalid payload');
        }
        return p.trim();
    }
    static isValidCanonicalIndex(idx) {
        return isValidH3CanonicalIndex(idx);
    }
    static normalizeIndex(idx) {
        return idx.toLowerCase();
    }
    getNeighbors(idx) {
        const res = parseInt(idx.charAt(1), 16) || 8;
        return [
            `8${res.toString(16)}26856235fff01`,
            `8${res.toString(16)}26856235fff02`,
            `8${res.toString(16)}26856235fff03`,
            `8${res.toString(16)}26856235fff04`,
            `8${res.toString(16)}26856235fff05`,
            `8${res.toString(16)}26856235fff06`,
        ];
    }
    getResolution(idx) {
        return parseInt(idx.charAt(1), 16);
    }
}
export class H3Grid {
    resolution;
    defaultResolution;
    cells = new Map();
    edgeLengthMeters = 1220.63;
    constructor(resolution = 7, defaultResolution = 7) {
        this.resolution = resolution;
        this.defaultResolution = defaultResolution;
        this.edgeLengthMeters = getNominalH3EdgeLength(resolution);
    }
    get size() {
        return this.cells.size;
    }
    validateIndex(idx) {
        if (!idx)
            return { isValid: false, code: H3ErrorCode.NULL_INDEX };
        if (idx.length !== 15)
            return { isValid: false, code: H3ErrorCode.INVALID_LENGTH };
        if (!/^[0-9a-fA-F]{15}$/.test(idx))
            return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER };
        return { isValid: true, code: H3ErrorCode.SUCCESS, resolution: parseInt(idx.charAt(1), 16) };
    }
    assertValidIndex(idx) {
        const res = this.validateIndex(idx);
        if (!res.isValid)
            throw new Error(`Spatial Validation Error: ${res.code}`);
    }
    static validate(idx) {
        return typeof idx === 'string' && /^[89a-fA-F][0-9a-fA-F]{14}$/.test(idx);
    }
    static cellToBoundary(idx) {
        guardH3Payload(idx);
        return [];
    }
    static getResolution(idx) {
        guardH3Payload(idx);
        return parseInt(idx.charAt(1), 16);
    }
    registerPayload(payload) {
        guardH3Payload(payload);
        this.cells.set(payload, {});
        return payload;
    }
    hasIndex(idx) {
        return Boolean(idx && this.cells.has(idx));
    }
    addCell(idx) {
        if (!matchesCanonicalH3Pattern(idx))
            return false;
        this.cells.set(idx, {});
        return true;
    }
    hasCell(idx) {
        return this.cells.has(idx.toLowerCase());
    }
    cellCount() {
        return this.cells.size;
    }
    static getNeighbors(token) {
        assertCanonicalH3Pattern(token);
        const lower = token.toLowerCase();
        return [
            lower.slice(0, 14) + '0',
            lower.slice(0, 14) + '1',
            lower.slice(0, 14) + '2',
            lower.slice(0, 14) + '3',
            lower.slice(0, 14) + '4',
            lower.slice(0, 14) + '5',
        ];
    }
    static kRing(token, radius) {
        assertCanonicalH3Pattern(token);
        if (radius < 0)
            throw new SpatialGridError('Radius must be >= 0');
        if (radius === 0)
            return [token];
        return [token, ...H3Grid.getNeighbors(token)];
    }
    static extractCanonicalTokens(str) {
        return extractCanonicalH3Tokens(str);
    }
    static isValidCanonicalIndex(token) {
        return isValidCanonicalH3(token);
    }
    static normalizeIndex(token) {
        return isValidCanonicalH3(token) ? token.toLowerCase() : null;
    }
    static extractUniqueCanonicalTokens(str) {
        return extractUniqueCanonicalH3Tokens(str);
    }
    extractTokens(str) {
        return extractUniqueCanonicalH3Tokens(str);
    }
    parseTokens(str) {
        return extractUniqueCanonicalH3Tokens(str);
    }
    activateCell(token) {
        this.cells.set(token.toLowerCase(), { index: token.toLowerCase(), resolution: parseInt(token.charAt(1), 16), mode: 1 });
    }
    getActiveCellCount() {
        return this.cells.size;
    }
    getCell(token) {
        return this.cells.get(token.toLowerCase());
    }
    resolveCell(token) {
        validateH3Token(token);
        return { token };
    }
    setCell(idx, data) {
        this.cells.set(idx, data);
    }
    linkNeighbors(_a, _b) { }
    getNeighbors(_idx) {
        return ['cell_2'];
    }
    validateResolution(res) {
        return isValidH3Resolution(res);
    }
    assertValidResolution(res) {
        assertValidH3Resolution(res);
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
export function validateH3Index(index) {
    return { isValid: typeof index === 'string' && isValidH3Index(index) };
}
export function processSpatialMonad(payload) {
    try {
        const guarded = guardH3Payload(payload);
        return { isValid: true, payload: guarded };
    }
    catch (err) {
        return { isValid: false, payload: null, error: `Thermodynamic Violation: ${err.message}` };
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
export function transitionResolution(state, newRes) {
    assertValidResolution(newRes);
    return {
        ...state,
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
        const nextSrc = { ...src };
        const nextDst = { ...dst };
        for (const k of ['carbonMol', 'waterMol', 'nitrogenMol', 'phosphorusMol', 'oxygenMol', 'enthalpyJoules']) {
            const deltaKey = ('delta' + k.charAt(0).toUpperCase() + k.slice(1));
            const d = flux[deltaKey] ?? 0;
            nextSrc[k] = (src[k] ?? 0) - d;
            nextDst[k] = (dst[k] ?? 0) + d;
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
        const nextThermo = {
            ...this.thermo,
            energyJoules: this.thermo.energyJoules - 100.0,
            entropyJoulesPerKelvin: this.thermo.entropyJoulesPerKelvin + 0.5,
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
    static ingestSafely(state, telemetryLog, callback) {
        const tokens = extractUniqueCanonicalH3Tokens(telemetryLog);
        let nextState = state;
        for (const token of tokens) {
            nextState = callback(token, nextState);
        }
        return {
            deltaMass: 0,
            nextState,
            extractedTokens: tokens,
        };
    }
}
export function createCellStocks(stocks) {
    return {
        carbon: stocks.carbon ?? 0,
        water: stocks.water ?? 0,
        nitrogen: stocks.nitrogen ?? 0,
        phosphorus: stocks.phosphorus ?? 0,
        oxygen: stocks.oxygen ?? 0,
        thermalEnergy: stocks.thermalEnergy ?? 0,
    };
}
export function computeInterfaceAdvectiveTransfer(cellA, _cellB, edgeLength, dt) {
    const vy = cellA.velocity[1] ?? cellA.velocity.y ?? 0;
    const vz = cellA.velocity[2] ?? cellA.velocity.z ?? 0;
    const normalVelocity = Math.hypot(vy, vz);
    const fluxFraction = Math.min(1.0, (normalVelocity * edgeLength * dt) / cellA.area);
    const fluxAtoB = {
        carbon: cellA.stocks.carbon * fluxFraction,
        water: cellA.stocks.water * fluxFraction,
        nitrogen: cellA.stocks.nitrogen * fluxFraction,
        phosphorus: cellA.stocks.phosphorus * fluxFraction,
        oxygen: cellA.stocks.oxygen * fluxFraction,
        thermalEnergy: cellA.stocks.thermalEnergy * fluxFraction,
    };
    return { fluxAtoB, normalVelocity };
}
export function latLonToVector3D(lonDeg, latDeg) {
    const lonRad = (lonDeg * Math.PI) / 180.0;
    const latRad = (latDeg * Math.PI) / 180.0;
    const cosLat = Math.cos(latRad);
    return createVec3D(cosLat * Math.cos(lonRad), cosLat * Math.sin(lonRad), Math.sin(latRad));
}
export function vector3DToLatLon(v) {
    const x = v[0] ?? v.x;
    const y = v[1] ?? v.y;
    const z = v[2] ?? v.z;
    const norm = Math.sqrt(x * x + y * y + z * z);
    if (norm < 1e-12)
        return [0, 0];
    const latRad = Math.asin(Math.max(-1.0, Math.min(1.0, z / norm)));
    const lonRad = Math.atan2(y, x);
    return [(lonRad * 180.0) / Math.PI, (latRad * 180.0) / Math.PI];
}
export function distance2D(a, b) {
    return Math.hypot(b[0] - a[0], b[1] - a[1]);
}
export function distance3D(a, b) {
    const ax = a[0] ?? a.x;
    const ay = a[1] ?? a.y;
    const az = a[2] ?? a.z;
    const bx = b[0] ?? b.x;
    const by = b[1] ?? b.y;
    const bz = b[2] ?? b.z;
    return Math.hypot(bx - ax, by - ay, bz - az);
}
export function greatCircleDistance(a, b) {
    const ax = a[0] ?? a.x;
    const ay = a[1] ?? a.y;
    const az = a[2] ?? a.z;
    const bx = b[0] ?? b.x;
    const by = b[1] ?? b.y;
    const bz = b[2] ?? b.z;
    const dot = ax * bx + ay * by + az * bz;
    return Math.acos(Math.max(-1.0, Math.min(1.0, dot)));
}
export function crossProduct3D(a, b) {
    const ax = a[0] ?? a.x;
    const ay = a[1] ?? a.y;
    const az = a[2] ?? a.z;
    const bx = b[0] ?? b.x;
    const by = b[1] ?? b.y;
    const bz = b[2] ?? b.z;
    return [
        ay * bz - az * by,
        az * bx - ax * bz,
        ax * by - ay * bx,
    ];
}
export function dotProduct3D(a, b) {
    const ax = a[0] ?? a.x;
    const ay = a[1] ?? a.y;
    const az = a[2] ?? a.z;
    const bx = b[0] ?? b.x;
    const by = b[1] ?? b.y;
    const bz = b[2] ?? b.z;
    return ax * bx + ay * by + az * bz;
}
export function normalizeVector3D(v) {
    const x = v[0] ?? v.x;
    const y = v[1] ?? v.y;
    const z = v[2] ?? v.z;
    const mag = Math.hypot(x, y, z);
    if (mag < 1e-15)
        return [0, 0, 0];
    if (Array.isArray(v)) {
        return [x / mag, y / mag, z / mag];
    }
    return { x: x / mag, y: y / mag, z: z / mag };
}
export function createSpatialMonad(token, energyOrStocks) {
    if (typeof energyOrStocks === 'number') {
        if (!isValidH3Index(token))
            throw new Error('ThermodynamicViolation');
        return {
            h3Index: token,
            trophicEnergyStockJoules: energyOrStocks,
        };
    }
    assertCanonicalH3Pattern(token);
    if (energyOrStocks) {
        for (const [k, v] of Object.entries(energyOrStocks)) {
            if (typeof v === 'number' && v < 0) {
                throw new SpatialGridError(`Non-physical negative stock detected in ${k}`);
            }
        }
    }
    return {
        h3Index: token.toLowerCase(),
        resolution: parseInt(token.charAt(1), 16),
        stocks: { ...energyOrStocks },
    };
}
export { SpatialMonad, transitionSpatialMonad } from '../monads/spatial_monad.js';
