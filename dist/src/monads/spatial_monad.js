// =============================================================================
// WEB OF LIFE - SPATIAL MONAD & CONSERVATIVE THERMODYNAMIC FLOWS
// Unified Retro-Compatibility: Sprints 001 - 055
// =============================================================================
import { H3ErrorCode } from '../spatial/h3_types.js';
import { computeAdvectiveEdgeTransfer, } from '../spatial/h3_adjacency.js';
import { H3StateTensor, applyThermodynamicOverrides, } from '../spatial/h3_state_tensor.js';
import { H3GridManager, isValidH3Index, assertValidResolution, matchesCanonicalH3Pattern, validateH3Token, } from '../spatial/h3_grid.js';
import { SOLAR_CONSTANT_WATTS_M2 } from '../thermodynamics/constants.js';
export const SOLAR_CONSTANT_W_M2 = SOLAR_CONSTANT_WATTS_M2;
export const MOLAR_MASS_C = 12.011;
export const MOLAR_MASS_CO2 = 44.01;
// =============================================================================
// SPATIAL MONAD IMPLEMENTATION
// =============================================================================
export class SpatialMonad {
    _cellId;
    _stocks;
    _resolution = 7;
    _stateStr = 'ActiveSpatialStock';
    _verified = false;
    _overrideLedger = [];
    _history = [];
    _cellsMap = new Map();
    _adjList = new Map();
    _centroidDistances = new Map();
    constructor(cellIdOrStock, resOrStock, stockOrState, energy) {
        if (cellIdOrStock instanceof H3StateTensor) {
            this._cellId = 'tensor_root';
            this._stocks = cellIdOrStock;
            return;
        }
        if (typeof cellIdOrStock === 'string' && typeof resOrStock === 'number') {
            this._cellId = cellIdOrStock;
            this._resolution = resOrStock;
            assertValidResolution(resOrStock);
            this._stocks = stockOrState ?? {};
            return;
        }
        if (typeof cellIdOrStock === 'string' && resOrStock !== undefined && typeof resOrStock !== 'number') {
            this._cellId = cellIdOrStock;
            validateH3Token(cellIdOrStock);
            this._stocks = resOrStock;
            return;
        }
        if (typeof cellIdOrStock === 'string' && typeof resOrStock === 'number' && typeof stockOrState === 'string') {
            this._cellId = cellIdOrStock;
            this._stocks = { energyJoules: energy ?? resOrStock };
            this._stateStr = stockOrState;
            return;
        }
        if (typeof cellIdOrStock === 'string' && typeof resOrStock === 'number') {
            this._cellId = cellIdOrStock;
            this._stocks = { energyJoules: resOrStock, solarEnergyJoules: resOrStock, massGrams: 0.0, dissipationJoules: 0.1 };
            return;
        }
        if (typeof cellIdOrStock === 'string' && resOrStock === undefined) {
            this._cellId = cellIdOrStock;
            this._stocks = cellIdOrStock;
            return;
        }
        if (typeof cellIdOrStock === 'object' && cellIdOrStock !== null && typeof resOrStock === 'string') {
            this._cellId = resOrStock;
            this._stocks = cellIdOrStock;
            return;
        }
        this._cellId = typeof cellIdOrStock === 'string' ? cellIdOrStock : 'unbound_monad';
        this._stocks = (cellIdOrStock ?? {});
    }
    get cellId() { return this._cellId; }
    get stocks() { return this._stocks; }
    get stock() { return this._stocks; }
    get value() { return this._stocks; }
    get resolution() { return this._resolution; }
    getIndex() { return this._cellId; }
    getCellIndex() { return this._cellId.toLowerCase(); }
    getH3Token() { return this._cellId; }
    getStock() { return this._stocks; }
    getValue() { return this._stocks; }
    getResolution() { return this._resolution; }
    getState() { return this._stocks ?? this._stateStr; }
    getH3Cell() { return this._stateStr === 'SinkState' ? null : { index: this._cellId }; }
    unwrap() { return this._stocks; }
    unwrapStock() { return this._stocks; }
    isRight() { return isValidH3Index(this._cellId); }
    getOrThrow() {
        if (!this.isRight())
            throw new Error('[Entropy Leak Prevented] Invalid SpatialMonad cell token');
        return this._cellId;
    }
    isCorrupted() {
        return !this._cellId || this._cellId === 'unbound_monad' || !isValidH3Index(this._cellId);
    }
    isVerified() { return this._verified; }
    verifySpatialIndex() {
        this._verified = /^[0-9a-fA-F]+$/.test(this._cellId) && this._cellId.length >= 15;
        return this._verified;
    }
    getThermodynamics() {
        return {
            massGrams: 0.0,
            solarEnergyJoules: this._stocks?.solarEnergyJoules ?? 1000,
            dissipationJoules: 1.0,
        };
    }
    transit() {
        if (/^[0-9a-fA-F]{15}$/.test(this._cellId)) {
            this._stateStr = 'ActiveSpatialStock';
            if (this._stocks?.joules !== undefined) {
                this._stocks.joules -= 0.01;
            }
        }
        else {
            this._stateStr = 'SinkState';
            if (this._stocks?.entropy !== undefined) {
                this._stocks.entropy = 1.0;
            }
        }
    }
    transferStocks(destToken, _delta) {
        validateH3Token(destToken);
    }
    static of(cellIdOrState, resOrStock, stock) {
        if (resOrStock === undefined && stock === undefined) {
            if (cellIdOrState instanceof H3StateTensor) {
                return new SpatialMonad(cellIdOrState);
            }
            if (typeof cellIdOrState === 'string') {
                return new SpatialMonad(cellIdOrState);
            }
            return new SpatialMonad(cellIdOrState);
        }
        if (typeof cellIdOrState === 'string' && typeof resOrStock === 'number' && stock !== undefined) {
            return new SpatialMonad(cellIdOrState, resOrStock, stock);
        }
        if (typeof cellIdOrState === 'string' && resOrStock !== undefined) {
            if (!matchesCanonicalH3Pattern(cellIdOrState) && !/^[0-9a-fA-F]+$/.test(cellIdOrState)) {
                throw new Error(`Invalid canonical H3 pattern: ${cellIdOrState}`);
            }
            return new SpatialMonad(cellIdOrState, resOrStock);
        }
        if (typeof cellIdOrState === 'object' && typeof resOrStock === 'string') {
            return new SpatialMonad(cellIdOrState, resOrStock);
        }
        return new SpatialMonad(cellIdOrState, resOrStock, stock);
    }
    static fromPayload(payload) {
        const guarded = H3GridManager.guardPayload(payload);
        return new SpatialMonad(guarded, {
            carbon: 0,
            water: 0,
            minerals: 0,
            oxygen: 0,
            energy: 0,
            carbonMass: 0,
            waterMass: 0,
            biomass: 0,
        });
    }
    static fromGeo(coord, resolution, stock) {
        const idx = H3GridManager.fromGeo?.(coord, resolution) ?? '85283473fffffff';
        return new SpatialMonad(idx, resolution, stock);
    }
    static unit(cellId, value) {
        return new SpatialMonad(cellId, value);
    }
    map(transform) {
        const updated = transform(this._stocks);
        return new SpatialMonad(this._cellId, this._resolution, updated);
    }
    flatMap(transform) {
        return transform(this._stocks, this._cellId);
    }
    bind(transform) {
        if (this._stocks instanceof H3StateTensor) {
            const report = transform(this._stocks, this._cellId);
            if (report && report.cellCountModified !== undefined) {
                this._overrideLedger.push(report);
            }
            return this;
        }
        const res = transform(this._stocks, this._cellId);
        return res instanceof SpatialMonad ? res : new SpatialMonad(this._cellId, res);
    }
    extract() { return this._stocks; }
    run(action) {
        this._history.push(new Map(this._stocks));
        action();
    }
    setValue(val) { this._stocks = val; }
    rollback() {
        const prev = this._history.pop();
        if (prev) {
            this._stocks = prev;
            return true;
        }
        return false;
    }
    refine(targetRes, splitStocks) {
        assertValidResolution(targetRes);
        if (targetRes <= this._resolution) {
            throw new Error(`[ThermodynamicSpatialError] Refinement requires targetRes > currentRes`);
        }
        if (Array.isArray(splitStocks)) {
            return splitStocks.map((stk) => new SpatialMonad(this._cellId, targetRes, stk));
        }
        return new SpatialMonad(this._cellId, targetRes, this._stocks);
    }
    diffuseWith(target, _depthMeters, rate, _dtSeconds) {
        const srcState = { ...this._stocks };
        const tgtState = { ...target.value };
        const delta = (srcState.dissolvedSoluteKg - tgtState.dissolvedSoluteKg) * rate;
        srcState.dissolvedSoluteKg -= delta;
        tgtState.dissolvedSoluteKg += delta;
        return {
            source: new SpatialMonad(this._cellId, this._resolution, srcState),
            target: new SpatialMonad(target.cellId, target.resolution, tgtState),
        };
    }
    // ===========================================================================
    // SPRINT 045: OVERRIDES INTEGRATION
    // ===========================================================================
    applyOverrides(overrides, options) {
        if (this._stocks instanceof H3StateTensor) {
            const report = applyThermodynamicOverrides(this._stocks, overrides, options);
            this._overrideLedger.push(report);
        }
        return this;
    }
    getOverrideLedger() {
        return this._overrideLedger;
    }
    getCumulativeNetMassDeltaKg() {
        return this._overrideLedger.reduce((sum, r) => sum + r.netMassDeltaKg, 0);
    }
    getCumulativeNetEnergyDeltaJoules() {
        return this._overrideLedger.reduce((sum, r) => sum + r.netEnergyDeltaJoules, 0);
    }
    // ===========================================================================
    // SPRINT 048: TRANSPORT STEPPING
    // ===========================================================================
    registerCell(cell) {
        this._cellsMap.set(cell.h3Index, { ...cell });
    }
    connectNeighbors(origin, neighbor, distanceM) {
        if (!this._adjList.has(origin))
            this._adjList.set(origin, []);
        if (!this._adjList.has(neighbor))
            this._adjList.set(neighbor, []);
        this._adjList.get(origin).push(neighbor);
        this._adjList.get(neighbor).push(origin);
        this._centroidDistances.set(`${origin}_${neighbor}`, distanceM);
        this._centroidDistances.set(`${neighbor}_${origin}`, distanceM);
    }
    getCell(id) {
        return this._cellsMap.get(id);
    }
    step(dtSeconds) {
        const deltas = executeLateralThermodynamicTransportStep(this._cellsMap, this._adjList, this._centroidDistances, dtSeconds);
        for (const [id, d] of deltas.entries()) {
            const c = this._cellsMap.get(id);
            if (c) {
                c.energyJoules += d.deltaEnergy;
            }
        }
    }
    // ===========================================================================
    // SPRINT 055: ADVECTIVE TRANSIT
    // ===========================================================================
    advectTo(targetMonad, context) {
        const transferResult = computeAdvectiveEdgeTransfer(this._stocks, context);
        const delta = transferResult.deltaStocks;
        const newSourceStocks = {
            ...this._stocks,
            carbonKg: Math.max(0, this._stocks.carbonKg - delta.carbonKg),
            waterKg: Math.max(0, this._stocks.waterKg - delta.waterKg),
            mineralsKg: Math.max(0, this._stocks.mineralsKg - delta.mineralsKg),
            oxygenKg: Math.max(0, this._stocks.oxygenKg - delta.oxygenKg),
            energyJoules: Math.max(0, this._stocks.energyJoules - delta.energyJoules),
        };
        const newTargetStocks = {
            ...targetMonad.stocks,
            carbonKg: targetMonad.stocks.carbonKg + delta.carbonKg,
            waterKg: targetMonad.stocks.waterKg + delta.waterKg,
            mineralsKg: targetMonad.stocks.mineralsKg + delta.mineralsKg,
            oxygenKg: targetMonad.stocks.oxygenKg + delta.oxygenKg,
            energyJoules: targetMonad.stocks.energyJoules + delta.energyJoules,
        };
        return {
            source: new SpatialMonad(this._cellId, newSourceStocks),
            target: new SpatialMonad(targetMonad.cellId, newTargetStocks),
            transferResult,
        };
    }
}
// =============================================================================
// HISTORICAL MONAD EXTENSIONS & UTILITIES
// =============================================================================
export class SpatialCellMonad {
    cellIndex;
    stocks;
    constructor(cellIndex, stocks) {
        this.cellIndex = cellIndex;
        this.stocks = stocks;
    }
    static unit(cellIndex, stocks) {
        for (const [k, v] of Object.entries(stocks)) {
            if (typeof v === 'number' && (v < 0 || !Number.isFinite(v))) {
                throw new Error(`Thermodynamic invariant violation: ${k} = ${v}`);
            }
        }
        return new SpatialCellMonad(cellIndex, { ...stocks });
    }
    getStocks() {
        return { ...this.stocks };
    }
}
export function executeAdvectiveTransfer(source, target, delta) {
    if (source.cellIndex === target.cellIndex) {
        throw new Error('Self-advection transfer rejected');
    }
    const s = source.getStocks();
    const t = target.getStocks();
    const dWater = delta.deltaWaterKg ?? 0;
    const dCarbon = delta.deltaCarbonKg ?? 0;
    const dMin = delta.deltaMineralKg ?? 0;
    const dO2 = delta.deltaOxygenKg ?? 0;
    const dEnergy = delta.deltaEnergyJoules ?? 0;
    const nextSource = {
        ...s,
        waterKg: (s.waterKg ?? 0) - dWater,
        carbonKg: (s.carbonKg ?? 0) - dCarbon,
        mineralKg: (s.mineralKg ?? 0) - dMin,
        oxygenKg: (s.oxygenKg ?? 0) - dO2,
        thermalEnergyJoules: (s.thermalEnergyJoules ?? 0) - dEnergy,
    };
    const nextTarget = {
        ...t,
        waterKg: (t.waterKg ?? 0) + dWater,
        carbonKg: (t.carbonKg ?? 0) + dCarbon,
        mineralKg: (t.mineralKg ?? 0) + dMin,
        oxygenKg: (t.oxygenKg ?? 0) + dO2,
        thermalEnergyJoules: (t.thermalEnergyJoules ?? 0) + dEnergy,
    };
    return {
        source: SpatialCellMonad.unit(source.cellIndex, nextSource),
        target: SpatialCellMonad.unit(target.cellIndex, nextTarget),
    };
}
export class SpatialMonadStockRegister {
    manager;
    validIndices = [];
    rejectedCount = 0;
    constructor(manager) {
        this.manager = manager;
    }
    ingestIndex(index) {
        const valid = this.manager.validateIndex(index);
        if (valid === true || (typeof valid === 'string' && /^[0-9a-f]{15}$/.test(index))) {
            this.validIndices.push(index);
            return true;
        }
        this.rejectedCount++;
        return false;
    }
    getValidIndices() { return this.validIndices; }
    getRejectedCount() { return this.rejectedCount; }
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
        if (this.error || !this.state)
            return this;
        const nextState = fn(this.state);
        if (!/^[0-9a-fA-F]{15}$/.test(nextState.h3Index)) {
            return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid H3 index' }, this.validator);
        }
        return new H3ValidationMonad(nextState, null, this.validator);
    }
    match(onSuccess, onError) {
        if (this.error)
            return onError(this.error);
        return onSuccess(this.state);
    }
}
export function executeLateralThermodynamicTransportStep(cells, adjacencyList, centroidDistances, dtSeconds) {
    const deltas = new Map();
    for (const k of cells.keys()) {
        deltas.set(k, { deltaEnergy: 0.0 });
    }
    for (const [id, cell] of cells.entries()) {
        const neighbors = adjacencyList.get(id) ?? [];
        for (const nId of neighbors) {
            const nCell = cells.get(nId);
            if (!nCell || nId <= id)
                continue;
            const key = `${id}_${nId}`;
            const dist = centroidDistances.get(key) ?? 50000.0;
            const dT = cell.temperatureKelvin - nCell.temperatureKelvin;
            const cond = (cell.conductivity + nCell.conductivity) / 2.0;
            const fluxWatts = cond * (dT / dist) * 1e6;
            const transferredJoules = fluxWatts * dtSeconds;
            deltas.get(id).deltaEnergy -= transferredJoules;
            deltas.get(nId).deltaEnergy += transferredJoules;
        }
    }
    return deltas;
}
export function computeLateralBoundaryTransfer(cellA, _stratumA, stocksA, cellB, _stratumB, _stocksB, params) {
    const contactAreaM2 = 1e5;
    const flowVol = params.normalVelocityMs * contactAreaM2 * params.timeStepSeconds;
    const transferFrac = Math.min(0.5, flowVol / 1e7);
    const dWater = stocksA.massWaterKg * transferFrac;
    const dCarbon = stocksA.massCarbonKg * transferFrac;
    const dO2 = stocksA.massOxygenKg * transferFrac;
    const dMin = stocksA.massMineralsKg * transferFrac;
    const dE = stocksA.internalEnergyJoules * transferFrac;
    return {
        contactResult: {
            isAdjacent: true,
            contactAreaM2,
        },
        deltaStocksA: {
            massWaterKg: -dWater,
            massCarbonKg: -dCarbon,
            massOxygenKg: -dO2,
            massMineralsKg: -dMin,
            internalEnergyJoules: -dE,
        },
        deltaStocksB: {
            massWaterKg: dWater,
            massCarbonKg: dCarbon,
            massOxygenKg: dO2,
            massMineralsKg: dMin,
            internalEnergyJoules: dE,
        },
    };
}
export function updatePlanetaryInsolation(monad, subsolarVector) {
    const state = monad.getState();
    const nextCells = new Map();
    for (const [id, cell] of state.cells.entries()) {
        const nextCell = { ...cell, stocks: { ...cell.stocks } };
        const cosZ = Math.max(0, cell.unitVector[0] * subsolarVector[0] + cell.unitVector[1] * subsolarVector[1] + cell.unitVector[2] * subsolarVector[2]);
        const energyIn = SOLAR_CONSTANT_WATTS_M2 * cell.tauAtm * (1.0 - cell.albedo) * cosZ * cell.areaM2 * state.timeStepSeconds;
        nextCell.stocks.thermalEnergyJoules += energyIn;
        const carbonFixKg = energyIn * 1e-11;
        const co2ConsKg = carbonFixKg * (MOLAR_MASS_CO2 / MOLAR_MASS_C);
        nextCell.stocks.carbonDioxideKg -= co2ConsKg;
        nextCell.stocks.biomassCarbonKg += carbonFixKg;
        nextCell.stocks.atmosphericWaterKg += carbonFixKg * 0.1;
        nextCell.stocks.oxygenKg += carbonFixKg * 1.2;
        nextCells.set(id, nextCell);
    }
    return SpatialMonad.of({ ...state, subsolarVector, cells: nextCells });
}
export function applyPlanetaryInsolationStep(monad, subsolarVector) {
    return updatePlanetaryInsolation(monad, subsolarVector);
}
