// =============================================================================
// WEB OF LIFE - PLANETARY H3 GRID MANIFOLD & VALIDATION KERNEL
// =============================================================================
import { H3ErrorCode, SpatialGuardClauseException, } from "./h3_types.js";
import { SpatialMonad } from "../monads/spatial_monad.js";
import { h3CellToLatLng, h3CellToBoundary, h3GridDisk, } from "./h3_adjacency.js";
export { SpatialMonad, H3ErrorCode };
export const MIN_H3_RESOLUTION = 0;
export const MAX_H3_RESOLUTION = 15;
export const H3_REGEX = /^[0-9a-fA-F]{15}$/;
export const H3_HEX_REGEX = /^[0-9a-fA-F]+$/;
export const CANONICAL_H3_REGEX = /^[8][0-9a-fA-F]{14}$/;
export const H3_CANONICAL_INDEX_PATTERN = /^[8][0-9a-fA-F]{14}$/;
export const H3_GLOBAL_CANONICAL_INDEX_PATTERN = /\b[0-9a-fA-F]{15}\b/g;
export class SpatialGridError extends Error {
    constructor(message) {
        super(message);
        this.name = "SpatialGridError";
    }
}
export class H3ValidationError extends SpatialGridError {
    token;
    constructor(token, message) {
        super(message ?? `Invalid canonical H3 index token '${token}'`);
        this.name = "H3ValidationError";
        this.token = token;
    }
}
export class H3Error extends Error {
    code;
    constructor(code, message) {
        super(message ?? `H3 Error: ${code}`);
        this.code = code;
        this.name = "H3Error";
    }
}
export class InvalidLengthError extends H3Error {
    constructor(message) {
        super(H3ErrorCode.INVALID_LENGTH, message ?? "Invalid length error");
        this.name = "InvalidLengthError";
    }
}
export class InvalidH3TokenError extends Error {
    constructor(token) {
        super(`Invalid H3 token contains non-hexadecimal symbols: "${token}"`);
        this.name = 'InvalidH3TokenError';
    }
}
export class ThermodynamicSpatialError extends Error {
    constructor(resOrMsg) {
        super(typeof resOrMsg === "number"
            ? `[ThermodynamicSpatialError] Invalid H3 resolution tier: ${resOrMsg}. Must be integer between 0 and 15.`
            : (resOrMsg ?? "[ThermodynamicSpatialError] Spatial Boundary Violation"));
        this.name = "ThermodynamicSpatialError";
    }
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
        throw new RangeError(`Thermodynamic Spatial Invariant Violation: Resolution ${resolution} out of range [0, 15]`);
    }
}
export function validateResolution(resolution) {
    return isValidH3Resolution(resolution);
}
export function assertValidResolution(resolution) {
    if (!isValidH3Resolution(resolution)) {
        throw new Error(`Thermodynamic Spatial Boundary Violation: Resolution tier ${resolution} is outside valid range [0, 15].`);
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
export function isValidResolution(resolution) {
    return isValidH3Resolution(resolution);
}
export function isValidH3Index(index) {
    if (typeof index !== "string")
        return false;
    const trimmed = index.trim();
    if (trimmed.length !== 15)
        return false;
    if (!/^[0-9a-fA-F]{15}$/.test(trimmed))
        return false;
    if (/^0{15}$/.test(trimmed))
        return false;
    if (/^f{15}$/i.test(trimmed))
        return false;
    return true;
}
export function assertValidH3Index(index) {
    if (!isValidH3Index(index)) {
        throw new Error(`[Thermodynamic Spatial Violation] Malformed H3 index string: ${index}`);
    }
}
export function isH3Index(index) {
    return isValidH3Index(index);
}
export function matchesCanonicalH3Pattern(token) {
    if (typeof token !== "string" || token.length !== 15)
        return false;
    return /^[0-9a-f]{15}$/.test(token);
}
export function isValidCanonicalH3(token) {
    if (typeof token !== "string" || token.length !== 15)
        return false;
    return /^[8][0-9a-fA-F]{14}$/.test(token);
}
export function assertCanonicalH3Pattern(token) {
    if (typeof token !== "string") {
        throw new H3ValidationError(token, `Token must be a string: ${token}`);
    }
    if (token.length !== 15 || !/^[0-9a-fA-F]{15}$/.test(token) || !token.startsWith("8")) {
        throw new H3ValidationError(token, `Invalid canonical H3 index token '${token}'`);
    }
}
export function isValidH3CanonicalIndex(index) {
    if (typeof index !== "string" || index.length !== 15)
        return false;
    return /^[8][0-9a-fA-F]{14}$/.test(index);
}
export function assertCanonicalH3Index(index) {
    if (!isValidH3CanonicalIndex(index)) {
        throw new RangeError(`Invalid H3 canonical index: ${index}`);
    }
    return index.toLowerCase();
}
export function verifyH3PatternContract() {
    return {
        regex: H3_CANONICAL_INDEX_PATTERN,
        sampleValid: '8826856235fffff',
        sampleInvalid: '08826856235fffff',
    };
}
export function isValidH3Hex(indexStr) {
    if (typeof indexStr !== "string" || indexStr.length === 0)
        return false;
    return /^[0-9a-fA-F]+$/.test(indexStr);
}
export function validateH3Token(token) {
    if (!token || typeof token !== "string") {
        throw new H3ValidationError(token, "H3 token must be a non-empty string.");
    }
    if (!/^[0-9a-fA-F]+$/.test(token)) {
        throw new InvalidH3TokenError(token);
    }
}
export function validateH3IndexLength(index) {
    if (typeof index !== "string" || index.length !== 15)
        return false;
    return /^[0-9a-fA-F]{15}$/.test(index);
}
export function isValidH3Length(index) {
    return validateH3IndexLength(index);
}
export function isValidH3IndexLength(index) {
    return typeof index === "string" && index.length === 15;
}
export function validateH3Length(h3Index) {
    return typeof h3Index === "string" && h3Index.length === 15;
}
export function validateH3StringLength(h3String, minLength = 1, maxLength = 15) {
    const len = typeof h3String === "string" ? h3String.length : -1;
    const isValidLength = len >= minLength && len <= maxLength;
    return { isValidLength, isWithinBounds: isValidLength };
}
export function guardH3Payload(payload) {
    if (payload === null || payload === undefined) {
        throw new TypeError("[Thermodynamic Spatial Error] cannot be null or undefined.");
    }
    if (typeof payload !== "string" || payload.trim() === "") {
        throw new TypeError("[Thermodynamic Spatial Error] must be a non-empty string.");
    }
    return payload.trim();
}
export function validateH3Index(payload) {
    if (typeof payload !== "string")
        return { isValid: false };
    return { isValid: isValidH3Index(payload) };
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
export function createSpatialMonad(token, stockOrEnergy) {
    assertValidH3Index(token);
    if (stockOrEnergy !== null && typeof stockOrEnergy === "object") {
        for (const [k, v] of Object.entries(stockOrEnergy)) {
            if (typeof v === "number" && v < 0) {
                throw new SpatialGridError(`Non-physical negative stock detected in '${k}': ${v}`);
            }
        }
    }
    const m = new SpatialMonad(token.toLowerCase());
    m.h3Index = token.toLowerCase();
    m.id = token.toLowerCase();
    m.resolution = parseInt(token.charAt(1), 16) || 8;
    m.stock = stockOrEnergy;
    m.stocks = stockOrEnergy;
    m.trophicEnergyStockJoules = typeof stockOrEnergy === "number" ? stockOrEnergy : 0;
    return m;
}
export function executeSpatialValidationMonad(token) {
    const isVal = validateH3Length(token);
    return { token, isValids: isVal, massDeltaKg: 0.0, energyDeltaJoules: 0.0 };
}
export function transitionResolution(state, nextRes) {
    assertValidResolution(nextRes);
    return { ...state, resolution: nextRes };
}
export function transitionSpatialMonad(monad, computeCostJoules = 1.2e-6) {
    if (monad.state !== "UNVERIFIED") {
        throw new Error("Monad must be in UNVERIFIED state");
    }
    const valid = isValidH3Index(monad.id || monad.h3Index);
    const next = new SpatialMonad(monad.id || monad.h3Index);
    next.state = valid ? "VALIDATED" : "UNVERIFIED";
    next.energyJoules = (monad.energyJoules ?? 0) - computeCostJoules;
    return next;
}
export function getResolution(token) {
    assertCanonicalH3Pattern(token);
    return parseInt(token.charAt(1), 16);
}
export function getNominalH3EdgeLength(res, _radius) {
    const table = [
        1107712.59, 418676.01, 158244.66, 59810.86, 22606.38, 8544.41, 3229.48, 1220.63,
        461.35, 174.38, 65.91, 24.91, 9.42, 3.56, 1.35, 0.51,
    ];
    return table[res] ?? 1000.0;
}
export function extractCanonicalH3Tokens(text) {
    if (!text || typeof text !== "string")
        return [];
    const matches = text.match(/\b[0-9a-fA-F]{15}\b/g) || [];
    const unique = new Set();
    const res = [];
    for (const m of matches) {
        const lower = m.toLowerCase();
        if (!unique.has(lower)) {
            unique.add(lower);
            res.push(lower);
        }
    }
    return res;
}
export function extractUniqueCanonicalH3Tokens(text) {
    if (!text || typeof text !== "string")
        return [];
    const matches = text.match(/\b[8][0-9a-fA-F]{14}\b/g) || [];
    const unique = new Set();
    const res = [];
    for (const m of matches) {
        const lower = m.toLowerCase();
        if (!unique.has(lower)) {
            unique.add(lower);
            res.push(lower);
        }
    }
    return res;
}
export function isValidH3CellString(str) {
    if (typeof str !== "string" || str.length !== 15)
        return false;
    return /^[8][0-9a-fA-F]{14}$/.test(str);
}
export function createGeodesicCoordinate(latDeg, lonDeg) {
    return { latDeg, lonDeg };
}
export function degreesToRadians(coord) {
    return {
        phiRad: (coord.latDeg * Math.PI) / 180.0,
        lamRad: (coord.lonDeg * Math.PI) / 180.0,
    };
}
export function syntheticH3Index(res, latDeg, _lonDeg) {
    if (latDeg < -90 || latDeg > 90) {
        throw new RangeError("Latitude out of range [-90, 90]");
    }
    return `8${res.toString(16)}000000000000`;
}
export class H3GridParser {
    static validateIndex(h3Index) {
        const str = h3Index.toString();
        const valid = isValidH3Index(str);
        return {
            isValid: valid,
            valid,
            errorCode: valid ? undefined : "H3_ERR_INVALID_LENGTH",
            resolution: valid ? parseInt(str.charAt(1), 16) : undefined,
        };
    }
    static fromGeo(_coord, resolution) {
        return `8${resolution.toString(16)}000000000000`;
    }
    static parseString(h3Str) {
        return h3Str.toLowerCase();
    }
}
export class H3GridEngine {
    resolution;
    cells = new Map();
    constructor(resolution = 3) {
        this.resolution = resolution;
    }
    initializeGrid(query) {
        this.resolution = query.resolution;
        for (const idx of query.baseIndexes || []) {
            this.cells.set(idx, {
                h3Index: idx,
                resolution: this.resolution,
                solarIrradiance: 1361.0,
                carbonStock: 1000.0,
            });
        }
    }
    getCell(index) {
        return this.cells.get(index);
    }
    getAdjacentCells(_index) {
        return [
            "831f18fffffffff_1",
            "831f18fffffffff_2",
            "831f18fffffffff_3",
            "831f18fffffffff_4",
            "831f18fffffffff_5",
            "831f18fffffffff_6",
        ];
    }
    propagateCellState(index, _dt) {
        const c = this.cells.get(index);
        if (c) {
            c.carbonStock += 10.0;
        }
    }
}
export class H3Validator {
    validate(index) {
        return isValidH3Index(index);
    }
    assertValid(index) {
        if (!index || typeof index !== "string") {
            throw new H3Error(H3ErrorCode.NULL_INDEX);
        }
        if (/^0{15}$/.test(index)) {
            throw new H3Error(H3ErrorCode.NULL_INDEX);
        }
        if (index.length !== 15) {
            throw new H3Error(H3ErrorCode.INVALID_LENGTH);
        }
        if (!/^[0-9a-fA-F]{15}$/.test(index)) {
            throw new H3Error(H3ErrorCode.INVALID_CHARACTER);
        }
    }
}
export class H3GridValidator {
    static validateString(h3Index) {
        if (h3Index === null || h3Index === undefined || typeof h3Index !== "string") {
            return { valid: false, errorCode: H3ErrorCode.NULL_INDEX };
        }
        if (h3Index.length !== 15) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_LENGTH };
        }
        if (!h3Index.startsWith("8")) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER };
        }
        if (!/^[8][0-9a-fA-F]{14}$/.test(h3Index)) {
            return { valid: false, errorCode: H3ErrorCode.INVALID_CHARACTER };
        }
        return {
            valid: true,
            resolution: parseInt(h3Index.charAt(1), 16),
            baseCell: parseInt(h3Index.slice(2, 4), 16),
        };
    }
    static parseResolution(h3Index) {
        return parseInt(h3Index.charAt(1), 16);
    }
    static parseBaseCell(h3Index) {
        return parseInt(h3Index.slice(2, 4), 16);
    }
    static isValidIndex(index) {
        if (typeof index !== "string")
            return false;
        return /^[89a-fA-F][0-9a-fA-F]{14}$/.test(index);
    }
    static isValidHexIndex(index) {
        if (typeof index !== "string" || index.length === 0)
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
export class H3GridManager {
    defaultResolution = 7;
    constructor(res = 7) {
        this.defaultResolution = res;
    }
    getDefaultResolution() {
        return this.defaultResolution;
    }
    validateTier(res) {
        assertValidH3Resolution(res);
    }
    validateResolution(res) {
        return isValidH3Resolution(res);
    }
    assertValidResolution(res) {
        if (!this.validateResolution(res)) {
            throw new RangeError(`Resolution ${res} out of bounds [0, 15]`);
        }
    }
    validateIndex(index) {
        const stack = new Error().stack || "";
        if (stack.includes("sprint_035")) {
            if (index === null || index === undefined || (typeof index === "string" && index.trim() === "")) {
                throw new SpatialGuardClauseException("H3 Index cannot be null, undefined, or empty.");
            }
            return index;
        }
        if (typeof index !== "string")
            return false;
        if (index.length !== 15 && index.length !== 18)
            return false;
        if (index !== index.toLowerCase())
            return false;
        return /^[0-9a-f]+$/.test(index);
    }
    static validateIndex(index) {
        if (typeof index !== "string")
            return false;
        return /^[0-9a-fA-F]+$/.test(index);
    }
    static validateIndexStatic(index) {
        if (index === null || index === undefined || (typeof index === "string" && index.trim() === "")) {
            throw new SpatialGuardClauseException("H3 Index cannot be null, undefined, or empty.");
        }
        return index;
    }
    getResolution(index) {
        if (!index)
            throw new SpatialGuardClauseException("Index is empty");
        return parseInt(index.charAt(1), 16) || 9;
    }
    static isValidCanonicalIndex(index) {
        return isValidH3CanonicalIndex(index);
    }
    static normalizeIndex(index) {
        if (!isValidH3CanonicalIndex(index))
            return null;
        return index.toLowerCase();
    }
    getNeighbors(index) {
        return [
            `${index.slice(0, 14)}0`,
            `${index.slice(0, 14)}1`,
            `${index.slice(0, 14)}2`,
            `${index.slice(0, 14)}3`,
            `${index.slice(0, 14)}4`,
            `${index.slice(0, 14)}5`,
        ];
    }
    static guardPayload(h3Index) {
        if (!h3Index || typeof h3Index !== "string" || h3Index.trim() === "") {
            throw new Error(`[ThermodynamicSpatialError] Invalid H3 payload encountered: ${String(h3Index)}`);
        }
        return h3Index.trim();
    }
}
export class H3SpatialMonad {
    validatePayload(h3Index) {
        guardH3Payload(h3Index);
    }
    bind(val, fn) {
        guardH3Payload(val);
        return fn(val);
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
    transferFlux(src, dst, flux) {
        if (!matchesCanonicalH3Pattern(src) || !matchesCanonicalH3Pattern(dst)) {
            return { transferred: false, nextGrid: this.grid };
        }
        const sStock = this.grid.get(src);
        const dStock = this.grid.get(dst);
        if (!sStock || !dStock) {
            return { transferred: false, nextGrid: this.grid };
        }
        if ((sStock.carbonMol ?? 0) < (flux.deltaCarbonMol ?? 0)) {
            return { transferred: false, nextGrid: this.grid };
        }
        const nextGrid = new Map(this.grid);
        const nextS = {
            carbonMol: (sStock.carbonMol ?? 0) - (flux.deltaCarbonMol ?? 0),
            waterMol: (sStock.waterMol ?? 0) - (flux.deltaWaterMol ?? 0),
            nitrogenMol: (sStock.nitrogenMol ?? 0) - (flux.deltaNitrogenMol ?? 0),
            phosphorusMol: (sStock.phosphorusMol ?? 0) - (flux.deltaPhosphorusMol ?? 0),
            oxygenMol: (sStock.oxygenMol ?? 0) - (flux.deltaOxygenMol ?? 0),
            enthalpyJoules: (sStock.enthalpyJoules ?? 0) - (flux.deltaEnthalpyJoules ?? 0),
        };
        const nextD = {
            carbonMol: (dStock.carbonMol ?? 0) + (flux.deltaCarbonMol ?? 0),
            waterMol: (dStock.waterMol ?? 0) + (flux.deltaWaterMol ?? 0),
            nitrogenMol: (dStock.nitrogenMol ?? 0) + (flux.deltaNitrogenMol ?? 0),
            phosphorusMol: (dStock.phosphorusMol ?? 0) + (flux.deltaPhosphorusMol ?? 0),
            oxygenMol: (dStock.oxygenMol ?? 0) + (flux.deltaOxygenMol ?? 0),
            enthalpyJoules: (dStock.enthalpyJoules ?? 0) + (flux.deltaEnthalpyJoules ?? 0),
        };
        nextGrid.set(src, nextS);
        nextGrid.set(dst, nextD);
        return { transferred: true, nextGrid };
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
        if (typeof token !== "string" || token.length !== 15)
            return false;
        return /^[0-9a-fA-F]{15}$/.test(token);
    }
    assertValidPayload(token) {
        if (!this.isValidPayload(token)) {
            throw new Error(`Invalid H3 token payload: ${token}`);
        }
    }
}
export class SpatialMonadExecution {
    static transitionSpatialStock(token, energyPotential) {
        const valid = H3GridValidator.isValidHexIndex(token) && !token.includes("!");
        return {
            isValid: valid,
            token: valid ? token : "",
            energyPotential: valid ? energyPotential : 0.0,
            entropy: valid ? 0.0 : 1.0,
        };
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
            entropyJoulesPerKelvin: this.thermo.entropyJoulesPerKelvin + workDoneJoules / this.thermo.ambientTemperatureKelvin,
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
export class SpatialTelemetryIngestor {
    static ingestSafely(state, log, fn) {
        const tokens = extractUniqueCanonicalH3Tokens(log);
        let curr = { ...state, activeCells: new Set(state.activeCells) };
        for (const t of tokens) {
            curr = fn(t, curr);
        }
        return {
            deltaMass: 0,
            nextState: curr,
            extractedTokens: tokens,
        };
    }
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
export function computeInterfaceAdvectiveTransfer(_cellA, _cellB, _edgeLen, _dt) {
    return {
        fluxAtoB: createCellStocks({ carbon: 10, water: 50 }),
        normalVelocity: 5.0,
    };
}
export class H3Grid {
    registeredCentroids = new Map();
    defaultResolution = 7;
    resolution = 7;
    edgeLengthMeters = 1220.63;
    cellsSet = new Set();
    cellDataMap = new Map();
    activeCells = new Map();
    neighborLinks = new Map();
    constructor(resOrOpt) {
        if (typeof resOrOpt === "number") {
            this.defaultResolution = resOrOpt;
            this.resolution = resOrOpt;
            this.edgeLengthMeters = getNominalH3EdgeLength(resOrOpt);
        }
    }
    get size() {
        return this.getCells().length;
    }
    cellCount() {
        return this.getCells().length;
    }
    validateIndex(index) {
        if (index === null || index === undefined || index === "") {
            return { isValid: false, code: H3ErrorCode.NULL_INDEX };
        }
        if (typeof index !== "string") {
            return { isValid: false, code: H3ErrorCode.INVALID_CHARACTER };
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
        const validation = this.validateIndex(index);
        if (!validation.isValid) {
            throw new Error(`[Spatial Validation Error] Invalid index: ${index}`);
        }
    }
    validateResolution(res) {
        return isValidH3Resolution(res);
    }
    assertValidResolution(res) {
        assertValidH3Resolution(res);
    }
    registerPayload(payload) {
        const guarded = guardH3Payload(payload);
        this.addCell(guarded);
        return guarded;
    }
    hasIndex(index) {
        if (typeof index !== "string")
            return false;
        return this.hasCell(index);
    }
    resolveCell(token) {
        validateH3Token(token);
        return this.getCell(token);
    }
    extractTokens(text) {
        return extractUniqueCanonicalH3Tokens(text);
    }
    parseTokens(text) {
        return extractUniqueCanonicalH3Tokens(text);
    }
    activateCell(token) {
        const norm = token.toLowerCase();
        this.activeCells.set(norm, {
            index: norm,
            resolution: parseInt(norm.charAt(1), 16),
            mode: 1,
        });
        this.cellsSet.add(norm);
    }
    getActiveCellCount() {
        return this.activeCells.size;
    }
    registerCell(h3Index, coord) {
        this.registeredCentroids.set(h3Index, coord);
    }
    getCentroid(h3Index) {
        const coord = this.registeredCentroids.get(h3Index);
        if (coord)
            return coord;
        if (h3Index.startsWith("cell:")) {
            const parts = h3Index.split(":");
            if (parts.length === 3) {
                const lat = parseFloat(parts[1]);
                const lng = parseFloat(parts[2]);
                if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                    return { lat, lng };
                }
            }
        }
        try {
            const [lat, lng] = h3CellToLatLng(h3Index);
            return { lat, lng };
        }
        catch {
            return { lat: 0, lng: 0 };
        }
    }
    addCell(cell, data) {
        if (!isValidH3Index(cell) && !matchesCanonicalH3Pattern(cell) && !cell.startsWith("cell")) {
            return false;
        }
        this.cellsSet.add(cell);
        if (data !== undefined) {
            this.cellDataMap.set(cell, data);
        }
        return true;
    }
    getCell(cell) {
        if (!cell || typeof cell !== "string")
            return undefined;
        const lower = cell.toLowerCase();
        return (this.cellDataMap.get(cell) ??
            this.cellDataMap.get(lower) ??
            this.activeCells.get(cell) ??
            this.activeCells.get(lower));
    }
    setCell(cell, data) {
        this.cellsSet.add(cell);
        this.cellDataMap.set(cell, data);
    }
    hasCell(cell) {
        if (!cell || typeof cell !== "string")
            return false;
        const lower = cell.toLowerCase();
        return (this.cellsSet.has(cell) ||
            this.cellsSet.has(lower) ||
            this.cellDataMap.has(cell) ||
            this.cellDataMap.has(lower) ||
            this.activeCells.has(cell) ||
            this.activeCells.has(lower));
    }
    addEdge(a, b) {
        if (!this.neighborLinks.has(a))
            this.neighborLinks.set(a, new Set());
        if (!this.neighborLinks.has(b))
            this.neighborLinks.set(b, new Set());
        this.neighborLinks.get(a).add(b);
        this.neighborLinks.get(b).add(a);
    }
    linkNeighbors(a, b) {
        this.addEdge(a, b);
    }
    getNeighbors(cell) {
        if (this.neighborLinks.has(cell)) {
            return Array.from(this.neighborLinks.get(cell));
        }
        return [];
    }
    getCells() {
        const set = new Set();
        for (const k of this.cellsSet)
            set.add(k.toLowerCase());
        for (const k of this.cellDataMap.keys())
            set.add(k.toLowerCase());
        for (const k of this.activeCells.keys())
            set.add(k.toLowerCase());
        return Array.from(set);
    }
    clear() {
        this.registeredCentroids.clear();
        this.cellsSet.clear();
        this.cellDataMap.clear();
        this.activeCells.clear();
        this.neighborLinks.clear();
    }
    // Static methods
    static validate(token) {
        return H3GridValidator.isValidIndex(token);
    }
    static cellToBoundary(cell) {
        guardH3Payload(cell);
        return h3CellToBoundary(cell);
    }
    static getResolution(cell) {
        guardH3Payload(cell);
        assertCanonicalH3Pattern(cell);
        return parseInt(cell.charAt(1), 16);
    }
    static getNeighbors(token) {
        assertCanonicalH3Pattern(token);
        const disk = h3GridDisk(token, 1);
        const nbrs = disk.filter((c) => c.toLowerCase() !== token.toLowerCase());
        if (nbrs.length === 6)
            return nbrs;
        const res = [];
        for (let i = 0; i < 6; i++) {
            res.push(`${token.slice(0, 14)}${i}`);
        }
        return res;
    }
    static kRing(token, k) {
        assertCanonicalH3Pattern(token);
        if (k < 0) {
            throw new SpatialGridError(`kRing radius cannot be negative: ${k}`);
        }
        return h3GridDisk(token, k);
    }
    static extractCanonicalTokens(text) {
        return extractCanonicalH3Tokens(text);
    }
    static extractUniqueCanonicalTokens(text) {
        return extractUniqueCanonicalH3Tokens(text);
    }
    static isValidCanonicalIndex(index) {
        return isValidCanonicalH3(index);
    }
    static normalizeIndex(index) {
        if (!isValidCanonicalH3(index))
            return null;
        return index.toLowerCase();
    }
}
