// =============================================================================
// WEB OF LIFE - SPATIAL MONAD FRAMEWORK & RETRO-COMPATIBILITY LAYER
// =============================================================================
import { H3GridParser, isValidH3Index, isValidH3Hex, matchesCanonicalH3Pattern, validateH3Token } from '../spatial/h3_grid.js';
import { SpatialGuardClauseException } from '../spatial/h3_types.js';
export class SpatialRangeError extends RangeError {
    constructor(message) {
        super(`[SpatialError] ${message}`);
        this.name = 'SpatialRangeError';
        Object.setPrototypeOf(this, SpatialRangeError.prototype);
    }
}
// =============================================================================
// SPATIAL MONAD IMPLEMENTATION
// =============================================================================
/**
 * Functional monad wrapper encapsulating spatial cell state evolutions.
 * Preserves multi-sprint backwards compatibility across Sprints 001 - 042.
 */
export class SpatialMonad {
    value;
    index;
    cellIndex;
    resolution;
    stock;
    stocks;
    state = 'UNVERIFIED';
    energyJoules = 0;
    id;
    verified = false;
    corrupted = false;
    history = [];
    thermodynamics;
    constructor(...args) {
        if (args.length === 0) {
            // Empty constructor for state machines (Sprint 004)
            this.value = undefined;
            return;
        }
        if (args.length === 1) {
            // Direct value wrapping (Sprint 002, 042)
            this.value = args[0];
            this.stock = args[0];
            this.stocks = args[0];
            return;
        }
        if (args.length === 2) {
            const [arg0, arg1] = args;
            this.index = typeof arg0 === 'string' ? arg0 : undefined;
            this.cellIndex = this.index;
            this.id = this.index;
            if (typeof arg1 === 'number') {
                // Sprint 029: (indexStr, solarFlux)
                this.value = arg0;
                this.verified = false;
                this.thermodynamics = {
                    massGrams: 0.0,
                    solarEnergyJoules: arg1,
                    dissipationJoules: 0.0
                };
                return;
            }
            if (typeof arg1 === 'object' && arg1 !== null) {
                // Sprint 032 or Sprint 034: (token, stock)
                this.stock = arg1;
                this.stocks = arg1;
                this.value = arg1;
                if ('carbonStockKg' in arg1) {
                    // Sprint 034: enforces token validation
                    validateH3Token(this.index);
                }
                else if ('joules' in arg1) {
                    // Sprint 032: energy stock transit state
                    this.state = 'UnvalidatedState';
                }
                return;
            }
        }
        if (args.length === 3) {
            // Sprint 023, 024: (index, resolution, stock)
            const [index, resolution, stock] = args;
            if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
                throw new SpatialRangeError(`Invalid resolution tier: ${resolution}. Resolution must be an integer between 0 and 15.`);
            }
            this.index = index;
            this.cellIndex = index;
            this.id = index;
            this.resolution = resolution;
            this.stock = stock;
            this.stocks = stock;
            this.value = stock;
            return;
        }
        if (args.length >= 4) {
            // Sprint 030: (index, energy, state, capacity)
            const [index, energy, state] = args;
            this.id = String(index);
            this.cellIndex = String(index);
            this.index = String(index);
            this.energyJoules = typeof energy === 'number' ? energy : 0;
            this.state = String(state);
            this.value = this.index;
            return;
        }
        this.value = args[0];
    }
    // --- Static Unit & Factory Methods ---
    static of(...args) {
        if (args.length === 0) {
            return new SpatialMonad();
        }
        if (args.length === 3) {
            // Sprint 025: SpatialMonad.of(index, res, stock)
            return new SpatialMonad(args[0], args[1], args[2]);
        }
        if (args.length === 2) {
            const [first, second] = args;
            // Sprint 038: of(cell, { biomass: 42.0 })
            if (typeof first === 'string' && typeof second === 'object' && second !== null) {
                if (!matchesCanonicalH3Pattern(first)) {
                    throw new Error(`Invalid canonical H3 pattern: ${first}`);
                }
                const m = new SpatialMonad(second);
                m.index = first;
                m.cellIndex = first;
                m.stock = second;
                m.stocks = second;
                return m;
            }
            // Sprint 035: of(stock, index) where index must be guarded
            if (second === null || second === undefined || (typeof second === 'string' && second.trim() === '')) {
                throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
            }
            const m = new SpatialMonad(first);
            m.index = String(second);
            m.cellIndex = String(second);
            m.stock = first;
            m.stocks = first;
            return m;
        }
        // args.length === 1
        const arg = args[0];
        if (arg === null || arg === undefined) {
            const m = new SpatialMonad(arg);
            m.corrupted = true;
            m.stock = arg;
            m.stocks = arg;
            return m;
        }
        if (typeof arg === 'string') {
            const m = new SpatialMonad(arg);
            m.index = arg;
            m.cellIndex = arg;
            m.stock = arg;
            m.stocks = arg;
            m.corrupted = false;
            m.verified = isValidH3Index(arg);
            return m;
        }
        return new SpatialMonad(arg);
    }
    static unit(arg1, arg2) {
        if (arguments.length >= 2) {
            // Sprint 037: unit(index, value)
            const index = typeof arg1 === 'string' ? arg1.toLowerCase() : String(arg1);
            const m = new SpatialMonad(arg2);
            m.index = index;
            m.cellIndex = index;
            m.stock = arg2;
            m.stocks = arg2;
            return m;
        }
        return new SpatialMonad(arg1);
    }
    static fromGeo(coord, resolution, initialStock) {
        const normalizedIndex = H3GridParser.fromGeo(coord, resolution);
        const validation = H3GridParser.validateIndex(normalizedIndex);
        if (!validation.isValid) {
            throw new Error(`SpatialMonad Binding Failed: Invalid H3 index generated [${validation.errorCode}]`);
        }
        const m = new SpatialMonad(initialStock);
        m.index = normalizedIndex;
        m.cellIndex = normalizedIndex;
        m.stock = { ...initialStock };
        m.stocks = { ...initialStock };
        m.resolution = resolution;
        return m;
    }
    static fromPayload(payload) {
        if (payload === null || payload === undefined || typeof payload !== 'string' || payload.trim() === '') {
            throw new TypeError('[Thermodynamic Spatial Error] H3 payload must be a non-empty string.');
        }
        const zeroStock = {
            carbon: 0,
            water: 0,
            minerals: 0,
            oxygen: 0,
            energy: 0,
            carbonMass: 0,
            waterMass: 0,
            biomass: 0
        };
        const m = new SpatialMonad(zeroStock);
        m.index = payload.trim();
        m.cellIndex = payload.trim();
        m.stock = zeroStock;
        m.stocks = zeroStock;
        return m;
    }
    // --- Monadic Core Operations ---
    map(fn) {
        const nextVal = fn(this.value, this.index);
        const m = new SpatialMonad(nextVal);
        m.index = this.index;
        m.cellIndex = this.cellIndex;
        m.resolution = this.resolution;
        m.stock = nextVal;
        m.stocks = nextVal;
        return m;
    }
    bind(fn) {
        return fn(this.value, this.index || this.cellIndex || '');
    }
    flatMap(fn) {
        return this.bind(fn);
    }
    unwrap() {
        return this.value;
    }
    extract() {
        return this.stock !== undefined ? this.stock : this.value;
    }
    getStock() {
        return this.stock !== undefined ? this.stock : this.value;
    }
    unwrapStock() {
        return this.stock ? { ...this.stock } : this.value;
    }
    getValue() {
        return this.value;
    }
    setValue(val) {
        this.value = val;
    }
    getIndex() {
        return this.index || this.cellIndex || '';
    }
    getCellIndex() {
        return this.cellIndex || this.index || '';
    }
    getH3Token() {
        return this.index || '';
    }
    getResolution() {
        return this.resolution ?? 0;
    }
    // --- Transaction & Rollback Mechanics (Sprint 004) ---
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
    // --- Verification & Guard Introspection ---
    isRight() {
        return this.verified || (!this.corrupted && Boolean(this.value));
    }
    getOrThrow() {
        if (!this.isRight()) {
            throw new Error('[Entropy Leak Prevented] Invalid spatial index');
        }
        return this.value;
    }
    isCorrupted() {
        return this.corrupted;
    }
    isVerified() {
        return this.verified;
    }
    verifySpatialIndex() {
        const valid = this.index ? isValidH3Hex(this.index) : false;
        this.verified = valid;
        if (this.thermodynamics && this.index) {
            this.thermodynamics.dissipationJoules += this.index.length * 1e-9;
        }
        return valid;
    }
    getThermodynamics() {
        return this.thermodynamics;
    }
    // --- State Transitions (Sprint 032) ---
    transit() {
        if (this.stock && typeof this.stock.joules === 'number') {
            this.stock.joules -= 4.2e-9;
            const h3Regex = /^[0-9a-fA-F]{15}$/;
            if (this.index && h3Regex.test(this.index)) {
                this.state = 'ActiveSpatialStock';
            }
            else {
                this.state = 'SinkState';
                if (typeof this.stock.entropy === 'number') {
                    this.stock.entropy += 1.0;
                }
            }
        }
        return this;
    }
    getState() {
        return this.state;
    }
    getH3Cell() {
        if (this.state === 'ActiveSpatialStock') {
            return this.index || null;
        }
        return null;
    }
    // --- Stock Transfers (Sprint 034) ---
    transferStocks(targetToken, _delta) {
        validateH3Token(targetToken);
    }
    // --- Multi-Resolution Refinement (Sprint 023, 024, 025) ---
    refine(targetResolution, childrenStocks) {
        if (!Number.isInteger(targetResolution) || targetResolution < 0 || targetResolution > 15) {
            throw new SpatialRangeError(`Invalid resolution tier: ${targetResolution}. Resolution must be an integer between 0 and 15.`);
        }
        if (typeof this.resolution === 'number' && targetResolution < this.resolution) {
            throw new Error(`[ThermodynamicSpatialError] Cannot refine to lower resolution tier: target ${targetResolution} < current ${this.resolution}`);
        }
        if (Array.isArray(childrenStocks)) {
            return childrenStocks.map((s) => new SpatialMonad(this.index, targetResolution, s));
        }
        return new SpatialMonad(this.index, targetResolution, this.stock ? { ...this.stock } : this.value);
    }
}
// =============================================================================
// HISTORICAL MONAD EXTENSIONS & HELPERS
// =============================================================================
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
        try {
            validator.assertValid(state.h3Index);
            return new H3ValidationMonad(state, null, validator);
        }
        catch (err) {
            return new H3ValidationMonad(null, err, validator);
        }
    }
    bind(fn) {
        if (this.error)
            return this;
        const nextState = fn(this.state);
        try {
            this.validator.assertValid(nextState.h3Index);
            return new H3ValidationMonad(nextState, null, this.validator);
        }
        catch (err) {
            return new H3ValidationMonad(null, err, this.validator);
        }
    }
    match(onSuccess, onError) {
        if (this.error) {
            return onError(this.error);
        }
        return onSuccess(this.state);
    }
}
export class SpatialMonadStockRegister {
    manager;
    validIndices = [];
    rejectedCount = 0;
    constructor(manager) {
        this.manager = manager;
    }
    ingestIndex(index) {
        if (this.manager.validateIndex(index)) {
            this.validIndices.push(index);
            return true;
        }
        else {
            this.rejectedCount++;
            return false;
        }
    }
    getValidIndices() {
        return this.validIndices;
    }
    getRejectedCount() {
        return this.rejectedCount;
    }
}
export class SpatialCellMonad {
    index;
    stocks;
    constructor(index, stocks) {
        this.index = index;
        this.stocks = stocks;
    }
    static unit(index, stocks) {
        const vals = [
            stocks.waterKg,
            stocks.carbonKg,
            stocks.mineralKg,
            stocks.oxygenKg,
            stocks.thermalEnergyJoules
        ];
        for (const v of vals) {
            if (typeof v !== 'number' || Number.isNaN(v) || v < 0) {
                throw new Error('Thermodynamic invariant violation: stocks cannot be negative or NaN');
            }
        }
        return new SpatialCellMonad(index, { ...stocks });
    }
    getStocks() {
        return { ...this.stocks };
    }
    updateStocks(stocks) {
        return SpatialCellMonad.unit(this.index, stocks);
    }
}
export function executeAdvectiveTransfer(source, target, transfer) {
    if (source.index === target.index) {
        throw new Error('Self-advection transfer rejected: source and target indices are identical.');
    }
    const srcStocks = source.getStocks();
    const tgtStocks = target.getStocks();
    const nextSrc = {
        waterKg: srcStocks.waterKg - transfer.deltaWaterKg,
        carbonKg: srcStocks.carbonKg - transfer.deltaCarbonKg,
        mineralKg: srcStocks.mineralKg - transfer.deltaMineralKg,
        oxygenKg: srcStocks.oxygenKg - transfer.deltaOxygenKg,
        thermalEnergyJoules: srcStocks.thermalEnergyJoules - transfer.deltaEnergyJoules
    };
    const nextTgt = {
        waterKg: tgtStocks.waterKg + transfer.deltaWaterKg,
        carbonKg: tgtStocks.carbonKg + transfer.deltaCarbonKg,
        mineralKg: tgtStocks.mineralKg + transfer.deltaMineralKg,
        oxygenKg: tgtStocks.oxygenKg + transfer.deltaOxygenKg,
        thermalEnergyJoules: tgtStocks.thermalEnergyJoules + transfer.deltaEnergyJoules
    };
    return {
        source: source.updateStocks(nextSrc),
        target: target.updateStocks(nextTgt)
    };
}
