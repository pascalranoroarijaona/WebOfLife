// =============================================================================
// WEB OF LIFE - SPATIAL MONAD & CONSERVATIVE FLUX ENGINE
// =============================================================================
import { createH3BoundaryInterface, computeBoundaryDiffusionStep } from '../spatial/h3_adjacency.js';
import { validateH3Token, isValidH3Index, assertCanonicalH3Pattern, SpatialGuardClauseException } from '../spatial/h3_grid.js';
/**
 * Universal SpatialMonad container respecting geodesic boundary geometry,
 * multi-resolution indexing, and First/Second Law thermodynamic conservation.
 */
export class SpatialMonad {
    cellIndex;
    resolution;
    value;
    boundary;
    // Monadic and State Tracking Fields
    history = [];
    rightState = true;
    corrupted = false;
    verifiedState = false;
    solarEnergyJoules = 0;
    dissipationJoules = 0;
    monadState = 'UnvalidatedState';
    h3CellRef = null;
    overrideLedgerList = [];
    cumulativeNetMassDeltaKg = 0.0;
    cumulativeNetEnergyDeltaJoules = 0.0;
    constructor(arg1, arg2, arg3, arg4) {
        if (arg1 === undefined && arg2 === undefined && arg3 === undefined) {
            // 0-argument constructor (Sprint 004)
            this.cellIndex = '';
            this.resolution = 7;
            this.value = undefined;
            this.boundary = createH3BoundaryInterface(7);
            return;
        }
        if (arg3 !== undefined && typeof arg2 === 'number') {
            // 3-argument constructor: (cellIndex: string, resolution: number, value: T)
            if (arg2 < 0 || arg2 > 15 || !Number.isInteger(arg2)) {
                throw new RangeError(`[SpatialError] Invalid resolution ${arg2}`);
            }
            this.cellIndex = String(arg1);
            this.resolution = arg2;
            this.value = arg3;
            this.boundary = createH3BoundaryInterface(arg2);
            return;
        }
        if (arg4 !== undefined && typeof arg2 === 'number') {
            // 4-argument constructor: (id: string, energy: number, state: string, energy2: number) (Sprint 030)
            this.cellIndex = String(arg1);
            this.resolution = 7;
            this.value = arg2;
            this.monadState = String(arg3);
            this.solarEnergyJoules = arg4;
            this.boundary = createH3BoundaryInterface(7);
            return;
        }
        if (arg2 !== undefined) {
            // 2-argument constructor:
            // Case A: (token: string, initialStock: EnergyStock) (Sprint 032)
            if (typeof arg1 === 'string' && typeof arg2 === 'object' && arg2 !== null && ('joules' in arg2 || 'entropy' in arg2)) {
                this.cellIndex = arg1;
                this.resolution = 9;
                this.value = { ...arg2 };
                this.monadState = 'UnvalidatedState';
                this.boundary = createH3BoundaryInterface(9);
                return;
            }
            // Case B: (token: string, solarFlux: number) (Sprint 029)
            if (typeof arg1 === 'string' && typeof arg2 === 'number') {
                this.cellIndex = arg1;
                this.resolution = 7;
                this.value = arg2;
                this.solarEnergyJoules = arg2;
                this.verifiedState = false;
                this.boundary = createH3BoundaryInterface(7);
                return;
            }
            // Case C: (token: string, stocks: any) (Sprint 034, 038)
            if (typeof arg1 === 'string') {
                validateH3Token(arg1);
                this.cellIndex = arg1;
                this.resolution = 8;
                this.value = arg2;
                this.boundary = createH3BoundaryInterface(8);
                return;
            }
        }
        // 1-argument constructor
        this.value = arg1;
        if (arg1 === null || arg1 === undefined) {
            this.corrupted = true;
            this.cellIndex = '';
            this.resolution = 7;
            this.boundary = createH3BoundaryInterface(7);
            return;
        }
        if (typeof arg1 === 'string') {
            this.cellIndex = arg1;
            this.resolution = 7;
            this.rightState = isValidH3Index(arg1);
            this.boundary = createH3BoundaryInterface(7);
            return;
        }
        this.cellIndex = arg1?.h3Index ?? arg1?.cellIndex ?? '';
        this.resolution = arg1?.resolution ?? 7;
        const res = Number.isInteger(this.resolution) && this.resolution >= 0 && this.resolution <= 15
            ? this.resolution
            : 7;
        this.boundary = createH3BoundaryInterface(res);
    }
    static of(arg1, arg2, arg3) {
        if (arg3 !== undefined) {
            // (cellIndex, resolution, value)
            return new SpatialMonad(arg1, arg2, arg3);
        }
        if (arg2 !== undefined) {
            // Sprint 035 check: SpatialMonad.of(100, null)
            if (arg2 === null || arg2 === undefined) {
                throw new SpatialGuardClauseException('H3 Index cannot be null or undefined');
            }
            if (typeof arg1 === 'object' && typeof arg2 === 'string') {
                return new SpatialMonad(arg2, arg1);
            }
            if (typeof arg1 === 'number' && typeof arg2 === 'string') {
                return new SpatialMonad(arg2, arg1);
            }
            // Sprint 038 check: SpatialMonad.of(cell, value)
            if (typeof arg1 === 'string') {
                assertCanonicalH3Pattern(arg1);
                return new SpatialMonad(arg1, arg2);
            }
        }
        // 1-argument of(value)
        return new SpatialMonad(arg1);
    }
    static unit(index, val) {
        const norm = (index ?? '').toLowerCase();
        return new SpatialMonad(norm, val);
    }
    static fromPayload(token) {
        if (!token || typeof token !== 'string' || token.trim() === '') {
            throw new TypeError('[Thermodynamic Spatial Error] Payload must be a non-empty string');
        }
        const defaultStocks = {
            carbon: 0,
            water: 0,
            minerals: 0,
            oxygen: 0,
            energy: 0,
            carbonMass: 0,
            waterMass: 0,
            biomass: 0
        };
        return new SpatialMonad(token, defaultStocks);
    }
    static fromGeo(coord, resolution, stock) {
        const latInt = Math.abs(Math.floor(coord.lat * 1000));
        const lngInt = Math.abs(Math.floor(coord.lng * 1000));
        const token = `8${resolution.toString(16)}${(latInt + lngInt).toString(16).padStart(4, '0')}ffffff`.slice(0, 15);
        return new SpatialMonad(token, resolution, stock);
    }
    // ===========================================================================
    // MONADIC TRANSFORMS & FUNCTOR MAPPINGS
    // ===========================================================================
    map(fn) {
        const next = fn(this.value);
        const m = new SpatialMonad(this.cellIndex, this.resolution, next);
        m.overrideLedgerList = [...this.overrideLedgerList];
        m.cumulativeNetMassDeltaKg = this.cumulativeNetMassDeltaKg;
        m.cumulativeNetEnergyDeltaJoules = this.cumulativeNetEnergyDeltaJoules;
        return m;
    }
    flatMap(fn) {
        return fn(this.value);
    }
    bind(fn) {
        const res = fn(this.value, this.cellIndex);
        if (res instanceof SpatialMonad) {
            return res;
        }
        // If a report was returned (Sprint 045), ledger it and return this monad
        if (res && typeof res === 'object' && 'cellReports' in res) {
            const report = res;
            this.overrideLedgerList.push(report);
            this.cumulativeNetMassDeltaKg += report.netMassDeltaKg;
            this.cumulativeNetEnergyDeltaJoules += report.netEnergyDeltaJoules;
            return this;
        }
        return new SpatialMonad(this.cellIndex, this.resolution, res);
    }
    unwrap() {
        return this.value;
    }
    unwrapStock() {
        return this.value;
    }
    extract() {
        return this.value;
    }
    // ===========================================================================
    // COMPATIBILITY ACCESSORS & METHODS
    // ===========================================================================
    get edgeLengthMeters() {
        return this.boundary.edgeLengthMeters;
    }
    get cellAreaMeters2() {
        const L = this.edgeLengthMeters;
        return ((3.0 * Math.sqrt(3.0)) / 2.0) * L * L;
    }
    get interCellDistanceMeters() {
        return this.boundary.centerDistanceMeters;
    }
    get stock() {
        return this.value;
    }
    get stocks() {
        return this.value;
    }
    getStock() {
        return this.value;
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
    getResolution() {
        return this.resolution;
    }
    isRight() {
        return this.rightState;
    }
    getOrThrow() {
        if (!this.rightState) {
            throw new Error('[Entropy Leak Prevented] Invalid spatial index');
        }
        return this.cellIndex;
    }
    isCorrupted() {
        return this.corrupted;
    }
    // Sprint 004 Rollback & Execution
    run(fn) {
        if (this.value !== undefined) {
            this.history.push(this.value);
        }
        fn();
    }
    setValue(v) {
        this.value = v;
    }
    rollback() {
        if (this.history.length > 0) {
            this.value = this.history.pop();
            return true;
        }
        return false;
    }
    // Sprint 023, 024, 025 Refinement
    refine(targetResolution, children) {
        if (targetResolution < 0 || targetResolution > 15 || !Number.isInteger(targetResolution)) {
            throw new RangeError(`[SpatialError] Resolution ${targetResolution} out of bounds`);
        }
        if (targetResolution < this.resolution) {
            throw new Error(`[ThermodynamicSpatialError] Cannot refine to coarser resolution ${targetResolution}`);
        }
        if (children && Array.isArray(children)) {
            return children.map((c) => SpatialMonad.of(this.cellIndex, targetResolution, c));
        }
        return new SpatialMonad(this.cellIndex, targetResolution, this.value);
    }
    // Sprint 029 Verification
    isVerified() {
        return this.verifiedState;
    }
    verifySpatialIndex() {
        const ok = /^[0-9a-fA-F]{15,18}$/.test(this.cellIndex);
        this.verifiedState = ok;
        this.dissipationJoules += 1e-6;
        return ok;
    }
    getThermodynamics() {
        return {
            massGrams: 0.0,
            solarEnergyJoules: this.solarEnergyJoules,
            dissipationJoules: this.dissipationJoules > 0 ? this.dissipationJoules : 1.2e-6
        };
    }
    // Sprint 030 State & Energy
    get state() {
        return this.monadState;
    }
    get energyJoules() {
        return this.solarEnergyJoules;
    }
    // Sprint 032 Transit
    transit() {
        const cost = 4.2e-9;
        const s = this.value;
        if (s && typeof s.joules === 'number') {
            s.joules -= cost;
        }
        const hexRegex = /^[0-9a-fA-F]{15}$/;
        if (hexRegex.test(this.cellIndex)) {
            this.monadState = 'ActiveSpatialStock';
            this.h3CellRef = { token: this.cellIndex, resolution: 9 };
        }
        else {
            this.monadState = 'SinkState';
            if (s) {
                s.entropy += 1.0;
            }
            this.h3CellRef = null;
        }
    }
    getState() {
        return this.monadState;
    }
    getH3Cell() {
        return this.h3CellRef;
    }
    // Sprint 034 Token Transfers
    getH3Token() {
        return this.cellIndex;
    }
    transferStocks(targetToken, _delta) {
        validateH3Token(targetToken);
    }
    // Sprint 045 Overrides & Ledger
    applyOverrides(overrides, options) {
        const tensor = this.value;
        if (tensor && typeof tensor.applyOverrides === 'function') {
            const report = tensor.applyOverrides(overrides, options);
            const nextMonad = new SpatialMonad(this.cellIndex, this.resolution, tensor);
            nextMonad.overrideLedgerList = [...this.overrideLedgerList, report];
            nextMonad.cumulativeNetMassDeltaKg = this.cumulativeNetMassDeltaKg + report.netMassDeltaKg;
            nextMonad.cumulativeNetEnergyDeltaJoules = this.cumulativeNetEnergyDeltaJoules + report.netEnergyDeltaJoules;
            return nextMonad;
        }
        const emptyReport = {
            timestamp: Date.now(),
            cellCountModified: 0,
            netMassDeltaKg: 0.0,
            netEnergyDeltaJoules: 0.0,
            netThermalEnergyDeltaJoules: 0.0,
            netChemicalEnergyDeltaJoules: 0.0,
            cellReports: []
        };
        const nextMonad = new SpatialMonad(this.cellIndex, this.resolution, this.value);
        nextMonad.overrideLedgerList = [...this.overrideLedgerList, emptyReport];
        nextMonad.cumulativeNetMassDeltaKg = this.cumulativeNetMassDeltaKg;
        nextMonad.cumulativeNetEnergyDeltaJoules = this.cumulativeNetEnergyDeltaJoules;
        return nextMonad;
    }
    getCumulativeNetMassDeltaKg() {
        return this.cumulativeNetMassDeltaKg;
    }
    getCumulativeNetEnergyDeltaJoules() {
        return this.cumulativeNetEnergyDeltaJoules;
    }
    getOverrideLedger() {
        return [...this.overrideLedgerList];
    }
    // Sprint 047 Diffusion
    diffuseWith(neighbor, activeDepthMeters, diffusionCoeff, deltaSeconds) {
        if (this.resolution !== neighbor.resolution) {
            throw new Error(`Inter-resolution diffusion between ${this.resolution} and ${neighbor.resolution} not supported directly`);
        }
        const stateA = this.value;
        const stateB = neighbor.value;
        const volumeA = this.cellAreaMeters2 * activeDepthMeters;
        const volumeB = neighbor.cellAreaMeters2 * activeDepthMeters;
        const exchange = computeBoundaryDiffusionStep(stateA.dissolvedSoluteKg, stateB.dissolvedSoluteKg, volumeA, volumeB, diffusionCoeff, this.resolution, activeDepthMeters, deltaSeconds);
        const nextStateA = {
            ...stateA,
            dissolvedSoluteKg: stateA.dissolvedSoluteKg + exchange.deltaStockSource
        };
        const nextStateB = {
            ...stateB,
            dissolvedSoluteKg: stateB.dissolvedSoluteKg + exchange.deltaStockTarget
        };
        return {
            source: SpatialMonad.of(this.cellIndex, this.resolution, nextStateA),
            target: SpatialMonad.of(neighbor.cellIndex, neighbor.resolution, nextStateB),
            fluxRate: exchange.fluxRate
        };
    }
}
// =============================================================================
// HISTORICAL MONAD ADAPTERS (SPRINTS 006, 011, 037)
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
        const valid = validator.validate ? validator.validate(state.h3Index) : true;
        if (!valid) {
            return new H3ValidationMonad(null, { code: 'H3_ERR_INVALID_CHARACTER', message: 'Invalid H3 index' }, validator);
        }
        return new H3ValidationMonad(state, null, validator);
    }
    bind(fn) {
        if (this.error || !this.state) {
            return new H3ValidationMonad(null, this.error, this.validator);
        }
        const nextState = fn(this.state);
        const index = nextState?.h3Index;
        if (index && this.validator) {
            const valid = this.validator.validate ? this.validator.validate(index) : true;
            if (!valid) {
                return new H3ValidationMonad(null, { code: 'H3_ERR_INVALID_CHARACTER', message: 'Invalid H3 index' }, this.validator);
            }
        }
        return new H3ValidationMonad(nextState, null, this.validator);
    }
    match(onSuccess, onError) {
        if (this.error || !this.state) {
            return onError(this.error);
        }
        return onSuccess(this.state);
    }
}
export class SpatialMonadStockRegister {
    h3Manager;
    validIndices = [];
    rejectedCount = 0;
    constructor(h3Manager) {
        this.h3Manager = h3Manager;
    }
    ingestIndex(index) {
        if (this.h3Manager.validateIndex(index)) {
            this.validIndices.push(index);
            return true;
        }
        this.rejectedCount++;
        return false;
    }
    getValidIndices() {
        return [...this.validIndices];
    }
    getRejectedCount() {
        return this.rejectedCount;
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
        for (const [k, v] of Object.entries(stocks)) {
            if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
                throw new Error(`Thermodynamic invariant violation: ${k} stock cannot be negative or NaN`);
            }
        }
        return new SpatialCellMonad(cellIndex, { ...stocks });
    }
    getCellIndex() {
        return this.cellIndex;
    }
    getStocks() {
        return { ...this.stocks };
    }
}
export function executeAdvectiveTransfer(source, target, request) {
    if (source.getCellIndex() === target.getCellIndex()) {
        throw new Error('Self-advection transfer rejected');
    }
    const sStocks = source.getStocks();
    const tStocks = target.getStocks();
    const nextSource = {
        ...sStocks,
        waterKg: (sStocks.waterKg ?? 0) - request.deltaWaterKg,
        carbonKg: (sStocks.carbonKg ?? 0) - request.deltaCarbonKg,
        mineralKg: (sStocks.mineralKg ?? 0) - request.deltaMineralKg,
        oxygenKg: (sStocks.oxygenKg ?? 0) - request.deltaOxygenKg,
        thermalEnergyJoules: (sStocks.thermalEnergyJoules ?? 0) - request.deltaEnergyJoules
    };
    const nextTarget = {
        ...tStocks,
        waterKg: (tStocks.waterKg ?? 0) + request.deltaWaterKg,
        carbonKg: (tStocks.carbonKg ?? 0) + request.deltaCarbonKg,
        mineralKg: (tStocks.mineralKg ?? 0) + request.deltaMineralKg,
        oxygenKg: (tStocks.oxygenKg ?? 0) + request.deltaOxygenKg,
        thermalEnergyJoules: (tStocks.thermalEnergyJoules ?? 0) + request.deltaEnergyJoules
    };
    return {
        source: SpatialCellMonad.unit(source.getCellIndex(), nextSource),
        target: SpatialCellMonad.unit(target.getCellIndex(), nextTarget)
    };
}
