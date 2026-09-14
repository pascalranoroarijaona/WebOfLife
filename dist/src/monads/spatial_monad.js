import { H3ErrorCode } from '../spatial/h3_types.js';
import { isValidH3CanonicalIndex, assertCanonicalH3Index, isValidH3Index, isValidH3Hex, validateH3Token, H3GridParser, H3GridCell, H3GridManager } from '../spatial/h3_grid.js';
/**
 * Universal Spatial Monad implementing Sprint 002-037 polymorphic capabilities.
 */
export class SpatialMonad {
    id = '';
    state = 'UNVERIFIED';
    energyJoules = 0;
    capacity = 0;
    resolution;
    stock;
    stocks;
    _cellIndex = '';
    _value;
    _history = [];
    _verified = false;
    _thermodynamics = {
        massGrams: 0.0,
        solarEnergyJoules: 0.0,
        dissipationJoules: 0.0,
    };
    _isRight = true;
    _isCorrupted = false;
    _h3Cell = null;
    constructor(arg1, arg2, arg3, arg4) {
        // 0-argument form (Sprint 004 state machine)
        if (arg1 === undefined && arg2 === undefined) {
            this._value = undefined;
            return;
        }
        // 4-argument form (Sprint 030 monad transition)
        if (arg3 !== undefined && arg4 !== undefined) {
            this.id = String(arg1);
            this._cellIndex = String(arg1);
            this.energyJoules = Number(arg2);
            this.state = String(arg3);
            this.capacity = Number(arg4);
            this._value = arg2;
            return;
        }
        // 3-argument form (Sprint 023, 024: index, resolution, stock)
        if (arg2 !== undefined && typeof arg2 === 'number' && arg3 !== undefined) {
            const res = arg2;
            if (!Number.isInteger(res) || res < 0 || res > 15) {
                throw new RangeError(`[SpatialError] Invalid resolution tier: ${res}`);
            }
            this._cellIndex = String(arg1);
            this.resolution = res;
            this.stock = arg3;
            this.stocks = arg3;
            this._value = arg3;
            return;
        }
        // 2-argument form
        if (arg2 !== undefined) {
            // Sprint 034: (validToken, { carbonStockKg, ... })
            if (typeof arg2 === 'object' && arg2 !== null && 'carbonStockKg' in arg2) {
                validateH3Token(arg1);
                this._cellIndex = arg1;
                this.stock = arg2;
                this.stocks = arg2;
                this._value = arg2;
                return;
            }
            // Sprint 032: (token, EnergyStock { joules, entropy })
            if (typeof arg2 === 'object' && arg2 !== null && 'joules' in arg2 && 'entropy' in arg2) {
                this._cellIndex = String(arg1);
                this.stock = { ...arg2 };
                this._value = this.stock;
                this.state = 'UnvalidatedState';
                return;
            }
            // Sprint 029: (indexStr, solarFluxNumber)
            if (typeof arg2 === 'number' && typeof arg1 === 'string') {
                this._cellIndex = arg1;
                this.id = arg1;
                this._verified = false;
                this._thermodynamics = {
                    massGrams: 0.0,
                    solarEnergyJoules: arg2,
                    dissipationJoules: 0.0,
                };
                this._value = arg2;
                return;
            }
            // Standard (index, value) (Sprint 037, etc.)
            this._cellIndex = isValidH3CanonicalIndex(arg1) ? assertCanonicalH3Index(arg1) : String(arg1);
            this._value = arg2;
            this.stock = arg2;
            this.stocks = arg2;
            return;
        }
        // 1-argument form
        this._cellIndex = String(arg1);
        this._value = arg1;
        this.stock = arg1;
    }
    static unit(index, value) {
        return new SpatialMonad(index, value);
    }
    static of(...args) {
        // Sprint 035: SpatialMonad.of(stock, index)
        if (args.length === 2 && (typeof args[1] === 'string' || args[1] === null || args[1] === undefined)) {
            const index = H3GridManager.validateIndexStatic(args[1]);
            const m = new SpatialMonad(index, args[0]);
            m.stock = args[0];
            m.stocks = args[0];
            return m;
        }
        // Sprint 023, 025: SpatialMonad.of(index, resolution, stock)
        if (args.length === 3) {
            return new SpatialMonad(args[0], args[1], args[2]);
        }
        // Sprint 008, 013: SpatialMonad.of(rawPayload)
        const val = args[0];
        const monad = new SpatialMonad(val);
        if (val === null || val === undefined) {
            monad._isCorrupted = true;
            monad._isRight = false;
            monad.stock = null;
            monad._value = null;
        }
        else {
            monad._isCorrupted = false;
            monad.stock = val;
            monad._value = val;
            monad._isRight = isValidH3Index(val);
        }
        return monad;
    }
    static fromPayload(payload) {
        if (payload === null || payload === undefined || typeof payload !== 'string') {
            throw new TypeError('[Thermodynamic Spatial Error] Invalid payload for SpatialMonad');
        }
        const emptyStocks = {
            carbon: 0,
            water: 0,
            minerals: 0,
            oxygen: 0,
            energy: 0,
            carbonMass: 0,
            waterMass: 0,
            biomass: 0,
        };
        const monad = new SpatialMonad(payload, emptyStocks);
        monad.stock = emptyStocks;
        monad.stocks = emptyStocks;
        return monad;
    }
    static fromGeo(coord, resolution, initialStock) {
        const idx = H3GridParser.fromGeo(coord, resolution);
        const m = new SpatialMonad(idx, { ...initialStock });
        m.stock = { ...initialStock };
        m.stocks = { ...initialStock };
        return m;
    }
    getCellIndex() {
        return this._cellIndex;
    }
    getIndex() {
        return String(this._cellIndex);
    }
    getH3Token() {
        return String(this._cellIndex);
    }
    getValue() {
        return this._value;
    }
    getStock() {
        return this.stock ?? this._value;
    }
    unwrapStock() {
        return { ...this.stock };
    }
    extract() {
        return this.stock ?? this._value;
    }
    getResolution() {
        return this.resolution ?? (parseInt(String(this._cellIndex)[1], 16) || 0);
    }
    bind(fn) {
        return fn(this._value, this._cellIndex);
    }
    map(f) {
        const nextVal = f(this._value ?? this.stock, String(this._cellIndex));
        const m = new SpatialMonad(String(this._cellIndex), nextVal);
        m.stock = nextVal;
        m.resolution = this.resolution;
        return m;
    }
    // Sprint 004 state machine methods
    run(fn) {
        if (this._value instanceof Map) {
            this._history.push(new Map(this._value));
        }
        else if (typeof this._value === 'object' && this._value !== null) {
            this._history.push(JSON.parse(JSON.stringify(this._value)));
        }
        else {
            this._history.push(this._value);
        }
        fn();
    }
    setValue(val) {
        this._value = val;
    }
    rollback() {
        if (this._history.length > 0) {
            this._value = this._history.pop();
            return true;
        }
        return false;
    }
    // Sprint 008 helper methods
    isRight() {
        return this._isRight;
    }
    getOrThrow() {
        if (!this._isRight) {
            throw new Error('[Entropy Leak Prevented] Invalid SpatialMonad state');
        }
        return this.stock ?? this._value;
    }
    // Sprint 013 helper methods
    isCorrupted() {
        return this._isCorrupted;
    }
    // Sprint 023, 024, 025 refinement
    refine(targetRes, childStocks) {
        if (!Number.isInteger(targetRes) || targetRes < 0 || targetRes > 15) {
            throw new RangeError(`[SpatialError] Invalid resolution tier: ${targetRes}`);
        }
        if (this.resolution !== undefined && targetRes < this.resolution) {
            throw new Error('[ThermodynamicSpatialError] Lower resolution refinement attempt');
        }
        if (Array.isArray(childStocks)) {
            return childStocks.map((s) => {
                const child = new SpatialMonad(String(this._cellIndex), targetRes, s);
                child.resolution = targetRes;
                child.stock = s;
                child.stocks = s;
                return child;
            });
        }
        const nextStock = this.stock ? { ...this.stock } : { ...this._value };
        const refined = new SpatialMonad(String(this._cellIndex), targetRes, nextStock);
        refined.resolution = targetRes;
        refined.stock = nextStock;
        refined.stocks = nextStock;
        return refined;
    }
    // Sprint 029 verification
    isVerified() {
        return this._verified;
    }
    verifySpatialIndex() {
        this._verified = isValidH3Hex(String(this._cellIndex));
        this._thermodynamics.dissipationJoules += String(this._cellIndex).length * 1e-9;
        return this._verified;
    }
    getThermodynamics() {
        return this._thermodynamics;
    }
    withState(newState, newEnergy) {
        const next = new SpatialMonad(this.id || String(this._cellIndex), newEnergy, newState, this.capacity);
        return next;
    }
    // Sprint 032 transit
    transit() {
        if (this.stock && typeof this.stock.joules === 'number') {
            this.stock.joules -= 4.2e-9;
            if (/^[0-9a-fA-F]{15}$/.test(String(this._cellIndex))) {
                this.state = 'ActiveSpatialStock';
                this._h3Cell = new H3GridCell(String(this._cellIndex), parseInt(String(this._cellIndex)[1], 16) || 0);
            }
            else {
                this.state = 'SinkState';
                this.stock.entropy += 1.0;
                this._h3Cell = null;
            }
        }
        return this;
    }
    getState() {
        return this.state;
    }
    getH3Cell() {
        return this._h3Cell;
    }
    // Sprint 034 stock transfers
    transferStocks(targetToken, delta) {
        validateH3Token(targetToken);
        if (this.stock && delta.carbonStockKg) {
            this.stock.carbonStockKg -= delta.carbonStockKg;
        }
    }
}
/**
 * Thermodynamic Spatial Cell Monad representing physical mass/energy stocks bound to a canonical H3 address.
 */
export class SpatialCellMonad {
    address;
    stocks;
    constructor(address, stocks) {
        this.address = address;
        this.stocks = stocks;
    }
    static unit(rawAddress, initialStocks) {
        const canonicalAddress = assertCanonicalH3Index(rawAddress);
        SpatialCellMonad.assertStockInvariants(initialStocks);
        return new SpatialCellMonad(canonicalAddress, initialStocks);
    }
    getAddress() {
        return this.address;
    }
    getStocks() {
        return this.stocks;
    }
    bind(transform) {
        const nextStocks = transform(this.stocks, this.address);
        SpatialCellMonad.assertStockInvariants(nextStocks);
        return new SpatialCellMonad(this.address, nextStocks);
    }
    static assertStockInvariants(stocks) {
        if (!Number.isFinite(stocks.waterKg) || stocks.waterKg < 0 ||
            !Number.isFinite(stocks.carbonKg) || stocks.carbonKg < 0 ||
            !Number.isFinite(stocks.mineralKg) || stocks.mineralKg < 0 ||
            !Number.isFinite(stocks.oxygenKg) || stocks.oxygenKg < 0 ||
            !Number.isFinite(stocks.thermalEnergyJoules) || stocks.thermalEnergyJoules < 0) {
            throw new Error(`Thermodynamic invariant violation: non-physical stocks detected ${JSON.stringify(stocks)}`);
        }
    }
}
/**
 * Executes a strictly conservative pairwise thermodynamic transfer between two cells.
 */
export function executeAdvectiveTransfer(sourceCell, targetCell, transferRequest) {
    const sourceIndex = sourceCell.getAddress();
    const targetIndex = targetCell.getAddress();
    if (!isValidH3CanonicalIndex(sourceIndex) || !isValidH3CanonicalIndex(targetIndex)) {
        throw new RangeError(`Spatial advection aborted: invalid canonical H3 indices detected. ` +
            `source="${sourceIndex}", target="${targetIndex}"`);
    }
    if (sourceIndex === targetIndex) {
        throw new Error(`Self-advection transfer rejected for cell: ${sourceIndex}`);
    }
    const srcStocks = sourceCell.getStocks();
    const actualDeltaWater = Math.min(srcStocks.waterKg, Math.max(0, transferRequest.deltaWaterKg));
    const actualDeltaCarbon = Math.min(srcStocks.carbonKg, Math.max(0, transferRequest.deltaCarbonKg));
    const actualDeltaMineral = Math.min(srcStocks.mineralKg, Math.max(0, transferRequest.deltaMineralKg));
    const actualDeltaOxygen = Math.min(srcStocks.oxygenKg, Math.max(0, transferRequest.deltaOxygenKg));
    const actualDeltaEnergy = Math.min(srcStocks.thermalEnergyJoules, Math.max(0, transferRequest.deltaEnergyJoules));
    const totalMassDeltaSource = -(actualDeltaWater + actualDeltaCarbon + actualDeltaMineral + actualDeltaOxygen);
    const totalMassDeltaTarget = +(actualDeltaWater + actualDeltaCarbon + actualDeltaMineral + actualDeltaOxygen);
    const netMassLeakage = Math.abs(totalMassDeltaSource + totalMassDeltaTarget);
    if (netMassLeakage > 1e-12) {
        throw new Error(`First Law violation: mass leak during transfer: ${netMassLeakage} kg`);
    }
    const updatedSource = sourceCell.bind((curr) => ({
        waterKg: curr.waterKg - actualDeltaWater,
        carbonKg: curr.carbonKg - actualDeltaCarbon,
        mineralKg: curr.mineralKg - actualDeltaMineral,
        oxygenKg: curr.oxygenKg - actualDeltaOxygen,
        thermalEnergyJoules: curr.thermalEnergyJoules - actualDeltaEnergy,
    }));
    const updatedTarget = targetCell.bind((curr) => ({
        waterKg: curr.waterKg + actualDeltaWater,
        carbonKg: curr.carbonKg + actualDeltaCarbon,
        mineralKg: curr.mineralKg + actualDeltaMineral,
        oxygenKg: curr.oxygenKg + actualDeltaOxygen,
        thermalEnergyJoules: curr.thermalEnergyJoules + actualDeltaEnergy,
    }));
    return {
        source: updatedSource,
        target: updatedTarget,
        transferred: {
            deltaWaterKg: actualDeltaWater,
            deltaCarbonKg: actualDeltaCarbon,
            deltaMineralKg: actualDeltaMineral,
            deltaOxygenKg: actualDeltaOxygen,
            deltaEnergyJoules: actualDeltaEnergy,
        },
    };
}
// -----------------------------------------------------------------------------
// SPRINT 006: H3ValidationMonad
// -----------------------------------------------------------------------------
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
            return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: `Invalid character in index: ${nextState.h3Index}` }, this.validator);
        }
        return new H3ValidationMonad(nextState, null, this.validator);
    }
    match(onSuccess, onError) {
        if (this.error) {
            return onError(this.error);
        }
        return onSuccess(this.state);
    }
}
// -----------------------------------------------------------------------------
// SPRINT 011: SpatialMonadStockRegister
// -----------------------------------------------------------------------------
export class SpatialMonadStockRegister {
    validator;
    validIndices = [];
    rejectedCount = 0;
    constructor(validator) {
        this.validator = validator;
    }
    ingestIndex(index) {
        if (this.validator.validateIndex(index)) {
            this.validIndices.push(index);
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
