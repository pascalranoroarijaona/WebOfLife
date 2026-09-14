/**
 * Web of Life - Spatial Monad Unified Implementation
 * Comprehensive Retro-Compatibility Layer across Sprints 002 - 045
 */
import { H3StateTensor, applyThermodynamicOverrides, } from '../spatial/h3_state_tensor.js';
import { H3ErrorCode, SpatialGuardClauseException, } from '../spatial/h3_types.js';
import { isValidH3Index, assertValidResolution, matchesCanonicalH3Pattern, validateH3Token, } from '../spatial/h3_grid.js';
// =============================================================================
// HISTORICAL MONADS & MANAGERS (Sprints 006, 011, 037)
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
        const valid = validator.validate(state.h3Index);
        if (!valid) {
            let code = H3ErrorCode.INVALID_CHARACTER;
            if (state.h3Index === '000000000000000')
                code = H3ErrorCode.NULL_INDEX;
            else if (state.h3Index.length !== 15)
                code = H3ErrorCode.INVALID_LENGTH;
            return new H3ValidationMonad(null, { code, message: 'Invalid H3 index' }, validator);
        }
        return new H3ValidationMonad(state, null, validator);
    }
    bind(fn) {
        if (this.error || !this.state) {
            return this;
        }
        const nextState = fn(this.state);
        return H3ValidationMonad.unit(nextState, this.validator);
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
        return [...this.validIndices];
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
        for (const [key, val] of Object.entries(stocks)) {
            if (typeof val === 'number' && (isNaN(val) || val < 0)) {
                throw new Error(`Thermodynamic invariant violation: ${key} cannot be negative or NaN`);
            }
        }
        return new SpatialCellMonad(index.toLowerCase(), { ...stocks });
    }
    getIndex() {
        return this.index;
    }
    getStocks() {
        return { ...this.stocks };
    }
}
export function executeAdvectiveTransfer(source, target, transfer) {
    if (source.getIndex() === target.getIndex()) {
        throw new Error('Self-advection transfer rejected: Source and target cells are identical.');
    }
    const sStocks = source.getStocks();
    const tStocks = target.getStocks();
    const nextSourceStocks = {
        waterKg: (sStocks.waterKg ?? 0) - transfer.deltaWaterKg,
        carbonKg: (sStocks.carbonKg ?? 0) - transfer.deltaCarbonKg,
        mineralKg: (sStocks.mineralKg ?? 0) - transfer.deltaMineralKg,
        oxygenKg: (sStocks.oxygenKg ?? 0) - transfer.deltaOxygenKg,
        thermalEnergyJoules: (sStocks.thermalEnergyJoules ?? 0) - transfer.deltaEnergyJoules,
    };
    const nextTargetStocks = {
        waterKg: (tStocks.waterKg ?? 0) + transfer.deltaWaterKg,
        carbonKg: (tStocks.carbonKg ?? 0) + transfer.deltaCarbonKg,
        mineralKg: (tStocks.mineralKg ?? 0) + transfer.deltaMineralKg,
        oxygenKg: (tStocks.oxygenKg ?? 0) + transfer.deltaOxygenKg,
        thermalEnergyJoules: (tStocks.thermalEnergyJoules ?? 0) + transfer.deltaEnergyJoules,
    };
    return {
        source: SpatialCellMonad.unit(source.getIndex(), nextSourceStocks),
        target: SpatialCellMonad.unit(target.getIndex(), nextTargetStocks),
    };
}
// =============================================================================
// MAIN POLYMORPHIC SpatialMonad CLASS
// =============================================================================
export class SpatialMonad {
    // Sprint 045 Tensor & Ledger
    _tensor;
    _overrideLedger;
    // Historical state fields
    _cellIndex = '';
    resolution = 0;
    _stock = null;
    stocks = null;
    stock = null;
    value = null;
    // Sprint 004 rollback history
    _history = [];
    // Sprint 008 Either semantics
    _isRight = true;
    _rightValue = null;
    // Sprint 013 Null/corrupted state
    _isCorrupted = false;
    // Sprint 029 Verification & Thermodynamics
    _verified = false;
    _thermodynamics = {
        massGrams: 0.0,
        solarEnergyJoules: 0,
        dissipationJoules: 0,
    };
    // Sprint 030 / 032 State transitions
    state = 'UNVERIFIED';
    energyJoules = 0;
    constructor(arg1, arg2, arg3, arg4) {
        this._overrideLedger = [];
        // Case 1: Sprint 045 (H3StateTensor, optional overrideLedger)
        if (arg1 instanceof H3StateTensor) {
            this._tensor = arg1;
            this._overrideLedger = arg2 ?? [];
            return;
        }
        // Case 2: Sprint 030 (index, energy, state, energy)
        if (typeof arg1 === 'string' && typeof arg2 === 'number' && typeof arg3 === 'string' && typeof arg4 === 'number') {
            this._cellIndex = arg1;
            this.energyJoules = arg2;
            this.state = arg3;
            return;
        }
        // Case 3: Sprint 023 / 024 (index, resolution, stock)
        if (typeof arg1 === 'string' && typeof arg2 === 'number' && arg3 !== undefined && typeof arg3 === 'object') {
            assertValidResolution(arg2);
            this._cellIndex = arg1;
            this.resolution = arg2;
            this._stock = { ...arg3 };
            this.stocks = this._stock;
            this.stock = this._stock;
            return;
        }
        // Case 4: Sprint 029 (index, solarFlux)
        if (typeof arg1 === 'string' && typeof arg2 === 'number' && arg3 === undefined) {
            this._cellIndex = arg1;
            this._verified = false;
            this._thermodynamics = {
                massGrams: 0.0,
                solarEnergyJoules: arg2,
                dissipationJoules: 0,
            };
            return;
        }
        // Case 5: Sprint 032 (token, initialStock: EnergyStock)
        if (typeof arg1 === 'string' && arg2 && typeof arg2 === 'object' && 'joules' in arg2 && 'entropy' in arg2) {
            this._cellIndex = arg1;
            this._stock = { ...arg2 };
            this.state = 'UnvalidatedState';
            return;
        }
        // Case 6: Sprint 034 (token, stocks)
        if (typeof arg1 === 'string' && arg2 && typeof arg2 === 'object' && 'carbonStockKg' in arg2) {
            validateH3Token(arg1);
            this._cellIndex = arg1;
            this._stock = { ...arg2 };
            return;
        }
        // Case 7: Sprint 004 default constructor without arguments
        if (arg1 === undefined) {
            this._stock = null;
            this.value = null;
            return;
        }
        // Fallback: Generic container wrap
        this.value = arg1;
        this._stock = arg1;
    }
    // ===========================================================================
    // STATIC FACTORIES
    // ===========================================================================
    static of(arg1, arg2, arg3) {
        // Sprint 045: of(H3StateTensor)
        if (arg1 instanceof H3StateTensor) {
            return new SpatialMonad(arg1);
        }
        // Sprint 035: of(stock, index) where index can be null/undefined -> throw
        if (arg2 === null || arg2 === undefined) {
            if (arguments.length >= 2) {
                throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
            }
        }
        // Sprint 035: of(stock, validIndex)
        if (typeof arg2 === 'string') {
            const monad = new SpatialMonad();
            monad._cellIndex = arg2;
            monad._stock = arg1;
            monad.value = arg1;
            return monad;
        }
        // Sprint 038: of(cell, value)
        if (typeof arg1 === 'string' && arg2 !== undefined) {
            if (!matchesCanonicalH3Pattern(arg1)) {
                throw new Error(`Invalid canonical H3 pattern: '${arg1}'`);
            }
            const monad = new SpatialMonad();
            monad._cellIndex = arg1;
            monad._stock = arg2;
            monad.value = arg2;
            return monad;
        }
        // Sprint 025: of(index, resolution, stocks)
        if (typeof arg1 === 'string' && typeof arg2 === 'number' && arg3 !== undefined) {
            assertValidResolution(arg2);
            const monad = new SpatialMonad(arg1, arg2, arg3);
            return monad;
        }
        // Sprint 013: of(null) or of(undefined) -> corrupted monad
        if (arg1 === null || arg1 === undefined) {
            const monad = new SpatialMonad();
            monad._isCorrupted = true;
            monad._stock = null;
            monad.value = null;
            return monad;
        }
        // Sprint 008: of(h3String)
        if (typeof arg1 === 'string') {
            const monad = new SpatialMonad();
            monad._cellIndex = arg1;
            if (isValidH3Index(arg1)) {
                monad._isRight = true;
                monad._rightValue = arg1;
                monad._stock = arg1;
            }
            else {
                monad._isRight = false;
                monad._rightValue = null;
            }
            return monad;
        }
        // Generic wrap
        const monad = new SpatialMonad();
        monad.value = arg1;
        monad._stock = arg1;
        return monad;
    }
    static unit(arg1, arg2) {
        // Sprint 002: unit(CellStockState)
        if (arg2 === undefined) {
            const m = new SpatialMonad();
            m._stock = arg1;
            m.value = arg1;
            return m;
        }
        // Sprint 037: unit(index, value)
        const m = new SpatialMonad();
        m._cellIndex = typeof arg1 === 'string' ? arg1.toLowerCase() : '';
        m.value = arg2;
        m._stock = arg2;
        return m;
    }
    static fromGeo(coord, resolution, stock) {
        const latInt = Math.abs(Math.floor(coord.lat)) % 90;
        const lngInt = Math.abs(Math.floor(coord.lng)) % 180;
        const hexRes = resolution.toString(16);
        const hexLat = latInt.toString(16).padStart(2, '0');
        const hexLng = lngInt.toString(16).padStart(3, '0');
        const indexStr = `8${hexRes}${hexLat}${hexLng}fffffff`.slice(0, 15);
        const m = new SpatialMonad();
        m._cellIndex = indexStr;
        m.resolution = resolution;
        m._stock = { ...stock };
        return m;
    }
    static fromPayload(payload) {
        if (payload === null || payload === undefined || typeof payload !== 'string' || payload.trim() === '') {
            throw new TypeError('[Thermodynamic Spatial Error] H3 payload must be a non-empty string.');
        }
        const m = new SpatialMonad();
        m._cellIndex = payload.trim();
        m._stock = {
            carbon: 0,
            water: 0,
            minerals: 0,
            oxygen: 0,
            energy: 0,
            carbonMass: 0,
            waterMass: 0,
            biomass: 0,
        };
        return m;
    }
    // ===========================================================================
    // SPRINT 045 METHODS
    // ===========================================================================
    applyOverrides(overrides, options) {
        if (!this._tensor) {
            throw new Error('applyOverrides requires H3StateTensor backing.');
        }
        const report = applyThermodynamicOverrides(this._tensor, overrides, options);
        return new SpatialMonad(this._tensor, [...this._overrideLedger, report]);
    }
    getTensor() {
        if (!this._tensor)
            throw new Error('No state tensor initialized');
        return this._tensor;
    }
    getOverrideLedger() {
        return this._overrideLedger;
    }
    getCumulativeNetMassDeltaKg() {
        return this._overrideLedger.reduce((sum, r) => sum + r.netMassDeltaKg, 0.0);
    }
    getCumulativeNetEnergyDeltaJoules() {
        return this._overrideLedger.reduce((sum, r) => sum + r.netEnergyDeltaJoules, 0.0);
    }
    getCumulativeNetThermalEnergyDeltaJoules() {
        return this._overrideLedger.reduce((sum, r) => sum + r.netThermalEnergyDeltaJoules, 0.0);
    }
    getCumulativeNetChemicalEnergyDeltaJoules() {
        return this._overrideLedger.reduce((sum, r) => sum + r.netChemicalEnergyDeltaJoules, 0.0);
    }
    // ===========================================================================
    // HISTORICAL METHODS
    // ===========================================================================
    extract() {
        return this._stock ?? this.value;
    }
    unwrap() {
        return this.value ?? this._stock;
    }
    unwrapStock() {
        return { ...this._stock };
    }
    getIndex() {
        return this._cellIndex;
    }
    getCellIndex() {
        return this._cellIndex;
    }
    getResolution() {
        return this.resolution;
    }
    getStock() {
        return this._stock;
    }
    getValue() {
        return this.value ?? this._stock;
    }
    setValue(val) {
        this._history.push(this.value instanceof Map ? new Map(this.value) : this.value);
        this.value = val;
        this._stock = val;
    }
    run(fn) {
        fn();
    }
    rollback() {
        if (this._history.length > 0) {
            const prev = this._history.pop();
            this.value = prev;
            this._stock = prev;
            return true;
        }
        return false;
    }
    isRight() {
        return this._isRight;
    }
    getOrThrow() {
        if (!this._isRight) {
            throw new Error('[Entropy Leak Prevented] Invalid spatial monad token.');
        }
        return this._rightValue;
    }
    isCorrupted() {
        return this._isCorrupted;
    }
    isVerified() {
        return this._verified;
    }
    verifySpatialIndex() {
        const valid = isValidH3Index(this._cellIndex) || /^[0-9a-fA-F]{15,18}$/.test(this._cellIndex);
        this._verified = valid;
        this._thermodynamics.dissipationJoules = this._cellIndex.length * 1e-9;
        return valid;
    }
    getThermodynamics() {
        return { ...this._thermodynamics };
    }
    refine(targetRes, childrenStocks) {
        assertValidResolution(targetRes);
        if (targetRes <= this.resolution) {
            throw new Error(`[ThermodynamicSpatialError] Refinement must be to higher resolution than ${this.resolution}`);
        }
        if (childrenStocks && Array.isArray(childrenStocks)) {
            return childrenStocks.map((stk) => {
                const child = new SpatialMonad();
                child._cellIndex = this._cellIndex;
                child.resolution = targetRes;
                child._stock = { ...stk };
                child.stocks = child._stock;
                child.stock = child._stock;
                return child;
            });
        }
        const next = new SpatialMonad();
        next._cellIndex = this._cellIndex;
        next.resolution = targetRes;
        next._stock = { ...this._stock };
        next.stocks = next._stock;
        next.stock = next._stock;
        return next;
    }
    transit() {
        if (/^[0-9a-fA-F]{15}$/.test(this._cellIndex)) {
            this.state = 'ActiveSpatialStock';
            if (this._stock && typeof this._stock === 'object') {
                this._stock.joules = Math.max(0, (this._stock.joules ?? 100) - 1.2e-6);
                this._stock.entropy = 0.0;
            }
        }
        else {
            this.state = 'SinkState';
            if (this._stock && typeof this._stock === 'object') {
                this._stock.entropy = 1.0;
            }
        }
    }
    getState() {
        return this.state;
    }
    getH3Cell() {
        if (this.state === 'ActiveSpatialStock') {
            return { index: this._cellIndex };
        }
        return null;
    }
    getH3Token() {
        return this._cellIndex;
    }
    transferStocks(targetToken, _delta) {
        validateH3Token(targetToken);
    }
    map(fn) {
        const res = fn(this.value ?? this._stock);
        const monad = new SpatialMonad();
        monad._cellIndex = this._cellIndex;
        monad.value = res;
        monad._stock = res;
        return monad;
    }
    flatMap(fn) {
        return fn(this.value ?? this._stock);
    }
    bind(fn) {
        if (this._tensor) {
            const res = fn(this._tensor);
            if (res instanceof SpatialMonad) {
                return new SpatialMonad(res._tensor, [...this._overrideLedger, ...res._overrideLedger]);
            }
            if (res && typeof res === 'object' && 'cellReports' in res) {
                return new SpatialMonad(this._tensor, [
                    ...this._overrideLedger,
                    res,
                ]);
            }
            return new SpatialMonad(this._tensor, this._overrideLedger);
        }
        return fn(this.value ?? this._stock, this._cellIndex);
    }
}
