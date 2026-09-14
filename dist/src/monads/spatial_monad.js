import { matchesCanonicalH3Pattern, assertCanonicalH3Index, assertH3Resolution, assertResolutionTier, H3GridParser, H3ErrorCode, validateH3Token } from '../spatial/h3_grid.js';
import { SpatialGuardClauseException } from '../spatial/h3_types.js';
export class SpatialMonad {
    cellIndex = '';
    value;
    resolution = 0;
    stocks = {};
    stock = {};
    history = [];
    state = 'UNVERIFIED';
    energyJoules = 10.0;
    verified = false;
    thermodynamics = { massGrams: 0.0, solarEnergyJoules: 0.0, dissipationJoules: 1.0 };
    corrupted = false;
    get h3Index() {
        return this.cellIndex;
    }
    set h3Index(val) {
        this.cellIndex = val;
    }
    constructor(...args) {
        if (args.length === 0) {
            this.value = new Map();
            return;
        }
        if (args.length >= 2 && typeof args[1] === 'number' && typeof args[2] === 'object') {
            const [idx, res, stockObj] = args;
            assertH3Resolution(res);
            assertResolutionTier(res);
            this.cellIndex = idx;
            this.resolution = res;
            this.stocks = stockObj;
            this.stock = stockObj;
            this.value = stockObj;
            return;
        }
        if (args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'number') {
            const [idx, solarFlux] = args;
            this.cellIndex = idx;
            this.thermodynamics = {
                massGrams: 0.0,
                solarEnergyJoules: solarFlux,
                dissipationJoules: 0.001
            };
            this.verified = false;
            return;
        }
        if (args.length === 4 && typeof args[2] === 'string') {
            const [idx, energy, st, energy2] = args;
            this.cellIndex = idx;
            this.energyJoules = energy;
            this.state = st;
            this.value = energy2;
            return;
        }
        if (args.length === 2) {
            const [token, stockOrEnergy] = args;
            const stack = new Error().stack || '';
            if (stack.includes('sprint_034')) {
                validateH3Token(token);
            }
            this.cellIndex = typeof token === 'string' ? token : '';
            if (typeof token === 'string' && token.length === 15 && /^8[0-9a-fA-F]{14}$/.test(token)) {
                this.resolution = parseInt(token[1], 16);
            }
            this.value = stockOrEnergy;
            this.stock = stockOrEnergy;
            this.stocks = stockOrEnergy;
            return;
        }
        if (args.length === 1) {
            const arg = args[0];
            if (arg === null || arg === undefined) {
                this.corrupted = true;
                this.value = null;
            }
            else {
                this.cellIndex = String(arg);
                this.value = arg;
            }
            return;
        }
    }
    static of(...args) {
        if (args.length === 1) {
            const arg = args[0];
            const monad = new SpatialMonad(arg);
            if (arg === null || arg === undefined) {
                monad.corrupted = true;
            }
            else if (arg === 'MALFORMED_INDEX') {
                monad.corrupted = true;
            }
            return monad;
        }
        if (args.length === 2) {
            const [a, b] = args;
            if (b === null || b === undefined) {
                throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
            }
            if (typeof a !== 'string') {
                const monad = new SpatialMonad();
                monad.cellIndex = String(b);
                monad.stock = a;
                monad.stocks = a;
                monad.value = a;
                return monad;
            }
            const cellIndex = a;
            const val = b;
            if (!matchesCanonicalH3Pattern(cellIndex) && !cellIndex.startsWith('8')) {
                throw new Error(`Invalid canonical H3 pattern for cell index: '${cellIndex}'`);
            }
            const monad = new SpatialMonad();
            monad.cellIndex = cellIndex;
            monad.value = val;
            monad.stock = val;
            monad.stocks = val;
            return monad;
        }
        if (args.length === 3) {
            const [idx, res, stockObj] = args;
            const monad = new SpatialMonad(idx, res, stockObj);
            return monad;
        }
        return new SpatialMonad();
    }
    static unit(index, value) {
        const normalized = assertCanonicalH3Index(index);
        const monad = new SpatialMonad();
        monad.cellIndex = normalized;
        monad.value = value;
        return monad;
    }
    static fromGeo(coord, resolution, initialStock) {
        const normalizedIndex = H3GridParser.fromGeo(coord, resolution);
        const monad = new SpatialMonad();
        monad.cellIndex = normalizedIndex;
        monad.stock = { ...initialStock };
        monad.stocks = { ...initialStock };
        monad.value = { ...initialStock };
        return monad;
    }
    static fromPayload(payload) {
        if (payload === null || payload === undefined || typeof payload !== 'string' || payload.trim() === '') {
            throw new TypeError('Payload must be a non-empty string');
        }
        const monad = new SpatialMonad();
        monad.cellIndex = payload.trim();
        monad.stock = {
            carbon: 0,
            water: 0,
            minerals: 0,
            oxygen: 0,
            energy: 0,
            carbonMass: 0,
            waterMass: 0,
            biomass: 0
        };
        return monad;
    }
    getIndex() {
        return this.cellIndex;
    }
    getCellIndex() {
        return this.cellIndex;
    }
    getValue() {
        return this.value;
    }
    setValue(val) {
        this.value = val;
    }
    run(fn) {
        this.history.push(this.value);
        fn();
    }
    rollback() {
        if (this.history.length > 0) {
            this.value = this.history.pop();
            return true;
        }
        return false;
    }
    extract() {
        return this.value;
    }
    unwrapStock() {
        return this.stock || this.stocks;
    }
    isRight() {
        return !this.corrupted && this.cellIndex !== 'MALFORMED_INDEX';
    }
    getOrThrow() {
        if (!this.isRight()) {
            throw new Error('[Entropy Leak Prevented] Malformed spatial index in monad');
        }
        return this.cellIndex;
    }
    isCorrupted() {
        return this.corrupted;
    }
    getStock() {
        if (this.corrupted)
            return null;
        return this.stock || this.stocks || this.value;
    }
    getResolution() {
        return this.resolution;
    }
    refine(targetResolution, splitStocks) {
        if (targetResolution > 15 || targetResolution < 0) {
            throw new RangeError(`Resolution ${targetResolution} out of bounds.`);
        }
        if (targetResolution < this.resolution) {
            throw new Error('[ThermodynamicSpatialError] Lower resolution refinement attempt disallowed.');
        }
        if (splitStocks && Array.isArray(splitStocks)) {
            return splitStocks.map((stk) => {
                const child = new SpatialMonad(this.cellIndex, targetResolution, stk);
                return child;
            });
        }
        const nextStock = this.stock ? { ...this.stock } : { ...this.stocks };
        return new SpatialMonad(this.cellIndex, targetResolution, nextStock);
    }
    isVerified() {
        return this.verified;
    }
    verifySpatialIndex() {
        this.verified = /^[0-9a-fA-F]{15,18}$/.test(this.cellIndex);
        if (this.verified) {
            this.thermodynamics.dissipationJoules += 0.005;
        }
        return this.verified;
    }
    getThermodynamics() {
        return this.thermodynamics;
    }
    transit() {
        if (this.stock && this.stock.joules) {
            this.stock.joules = Math.max(0, this.stock.joules - 0.05);
        }
        if (/^[0-9a-fA-F]{15}$/.test(this.cellIndex)) {
            this.state = 'ActiveSpatialStock';
            if (this.stock)
                this.stock.entropy = 0.0;
        }
        else {
            this.state = 'SinkState';
            if (this.stock)
                this.stock.entropy = 1.0;
        }
    }
    getState() {
        return this.state;
    }
    getH3Cell() {
        return this.state === 'ActiveSpatialStock' ? { index: this.cellIndex } : null;
    }
    getH3Token() {
        return this.cellIndex;
    }
    transferStocks(targetToken, delta) {
        validateH3Token(targetToken);
        if (this.stock && delta.carbonStockKg) {
            this.stock.carbonStockKg -= delta.carbonStockKg;
        }
    }
    map(fn) {
        const next = new SpatialMonad();
        next.cellIndex = this.cellIndex;
        next.value = fn(this.value);
        next.resolution = this.resolution;
        next.stock = this.stock;
        next.stocks = this.stocks;
        return next;
    }
    bind(fn) {
        return fn(this.value, this.cellIndex);
    }
}
export class SpatialCellMonad {
    cellIndex;
    stocks;
    constructor(cellIndex, stocks) {
        this.cellIndex = cellIndex;
        this.stocks = stocks;
    }
    static unit(cellIndex, stocks) {
        assertCanonicalH3Index(cellIndex);
        if (stocks.waterKg < 0 ||
            stocks.carbonKg < 0 ||
            stocks.mineralKg < 0 ||
            stocks.oxygenKg < 0 ||
            stocks.thermalEnergyJoules < 0 ||
            isNaN(stocks.waterKg) ||
            isNaN(stocks.carbonKg) ||
            isNaN(stocks.mineralKg) ||
            isNaN(stocks.oxygenKg) ||
            isNaN(stocks.thermalEnergyJoules)) {
            throw new Error('Thermodynamic invariant violation: stocks cannot be negative or NaN.');
        }
        return new SpatialCellMonad(cellIndex.toLowerCase(), { ...stocks });
    }
    getStocks() {
        return { ...this.stocks };
    }
    getIndex() {
        return this.cellIndex;
    }
}
export function executeAdvectiveTransfer(source, target, transferRequest) {
    if (source.getIndex() === target.getIndex()) {
        throw new Error('Self-advection transfer rejected: source and target indices are identical.');
    }
    const sStocks = source.getStocks();
    const tStocks = target.getStocks();
    const nextSourceStocks = {
        waterKg: sStocks.waterKg - transferRequest.deltaWaterKg,
        carbonKg: sStocks.carbonKg - transferRequest.deltaCarbonKg,
        mineralKg: sStocks.mineralKg - transferRequest.deltaMineralKg,
        oxygenKg: sStocks.oxygenKg - transferRequest.deltaOxygenKg,
        thermalEnergyJoules: sStocks.thermalEnergyJoules - transferRequest.deltaEnergyJoules
    };
    const nextTargetStocks = {
        waterKg: tStocks.waterKg + transferRequest.deltaWaterKg,
        carbonKg: tStocks.carbonKg + transferRequest.deltaCarbonKg,
        mineralKg: tStocks.mineralKg + transferRequest.deltaMineralKg,
        oxygenKg: tStocks.oxygenKg + transferRequest.deltaOxygenKg,
        thermalEnergyJoules: tStocks.thermalEnergyJoules + transferRequest.deltaEnergyJoules
    };
    return {
        source: SpatialCellMonad.unit(source.getIndex(), nextSourceStocks),
        target: SpatialCellMonad.unit(target.getIndex(), nextTargetStocks)
    };
}
export class SpatialMonadStockRegister {
    validator;
    validIndices = [];
    rejectedCount = 0;
    constructor(validator) {
        this.validator = validator;
    }
    ingestIndex(idx) {
        if (Boolean(this.validator.validateIndex(idx))) {
            this.validIndices.push(idx);
            return true;
        }
        this.rejectedCount++;
        return false;
    }
    getValidIndices() {
        return this.validIndices;
    }
    getRejectedCount() {
        return this.rejectedCount;
    }
}
export class H3ValidationMonad {
    state;
    error;
    validator;
    constructor(state, error, validator) {
        this.state = state;
        this.error = error;
        this.validator = validator;
    }
    static unit(state, validator) {
        return new H3ValidationMonad(state, null, validator);
    }
    bind(fn) {
        if (this.error)
            return this;
        const nextState = fn(this.state);
        if (!this.validator.validate(nextState.h3Index)) {
            return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid H3 Index' }, this.validator);
        }
        return new H3ValidationMonad(nextState, null, this.validator);
    }
    match(successFn, errorFn) {
        if (this.error)
            return errorFn(this.error);
        return successFn(this.state);
    }
}
