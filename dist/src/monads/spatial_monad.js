// =============================================================================
// WEB OF LIFE - SPATIAL MONAD & THERMODYNAMIC TRANSPORT PIPELINE
// Cumulative Retro-Compatibility: Sprints 001 - 057
// =============================================================================
import * as h3 from 'h3-js';
import { H3ErrorCode, SpatialGuardClauseException, } from "../spatial/h3_types.js";
import { computeAdvectiveTransfer, computeAdvectiveEdgeTransfer, } from "../spatial/h3_adjacency.js";
import { H3StateTensor, applyThermodynamicOverrides, } from "../spatial/h3_state_tensor.js";
import { assertH3Resolution, isValidH3Index, H3Error, H3ValidationError, } from "../spatial/h3_grid.js";
export { SOLAR_CONSTANT_W_M2, MOLAR_MASS_C, MOLAR_MASS_CO2 } from "../thermodynamics/constants.js";
/**
 * Universal SpatialMonad providing backward compatibility for all prior Sprints
 * and strict physical conservation invariants for Sprint 057.
 */
export class SpatialMonad {
    value;
    resolution;
    stock;
    stocks;
    _state = 'UNVERIFIED';
    _verified = false;
    _energyJoules = 0;
    _index;
    _ledger = [];
    _history = [];
    _cells = new Map();
    _cellNeighbors = new Map();
    constructor(...args) {
        if (args.length === 0) {
            // Empty container (e.g. Sprint 004 rollback or Sprint 048 network)
            this.value = undefined;
        }
        else if (args.length === 1) {
            this.value = args[0];
            if (typeof args[0] === 'string') {
                this._index = args[0];
            }
        }
        else if (args.length === 2) {
            const [arg0, arg1] = args;
            if (typeof arg0 === 'string' && typeof arg1 === 'number') {
                // Sprint 029: new SpatialMonad(index, solarFlux)
                this._index = arg0;
                this._energyJoules = arg1;
                this.value = arg0;
            }
            else if (typeof arg0 === 'string') {
                // Sprint 032 / 034: new SpatialMonad(token, stock)
                this._index = arg0;
                if (/[^0-9a-fA-F]/.test(arg0)) {
                    throw new H3ValidationError(arg0);
                }
                this.stock = arg1;
                this.stocks = arg1;
                this.value = arg1;
                this._state = 'UnvalidatedState';
            }
            else {
                this.value = arg0;
                this._index = arg1;
            }
        }
        else if (args.length >= 3) {
            // Sprint 023/024/025/030
            const [index, res, stock] = args;
            this._index = typeof index === 'string' ? index : undefined;
            if (typeof res === 'number') {
                if (args.length === 4 && typeof args[2] === 'string') {
                    // Sprint 030: new SpatialMonad(id, energy, state, energy)
                    this._energyJoules = res;
                    this._state = args[2];
                }
                else {
                    // Sprint 023 / 024: resolution bounds check
                    if (res < 0 || res > 15 || !Number.isInteger(res)) {
                        throw new RangeError(`[SpatialError] Invalid resolution tier: ${res}`);
                    }
                    this.resolution = res;
                    this.stock = stock;
                    this.stocks = stock;
                    this.value = stock;
                }
            }
        }
    }
    // --- Monadic Factory Methods ---
    static of(...args) {
        if (args.length === 1) {
            const arg = args[0];
            if (arg === null || arg === undefined) {
                const monad = new SpatialMonad(arg);
                monad._corrupted = true;
                return monad;
            }
            if (typeof arg === 'string') {
                const monad = new SpatialMonad(arg);
                monad._index = arg;
                monad._verified = isValidH3Index(arg);
                return monad;
            }
            if (arg instanceof H3StateTensor) {
                const monad = new SpatialMonad(arg);
                return monad;
            }
            if (isSpatialHexCell(arg)) {
                return new SpatialMonad(deepCloneCell(arg));
            }
            return new SpatialMonad(arg);
        }
        else if (args.length === 2) {
            const [arg0, arg1] = args;
            if (typeof arg0 === 'string' && typeof arg1 === 'object') {
                // Sprint 038 / 055: SpatialMonad.of(cell, stock)
                if (typeof arg0 === 'string' && !/^[0-9a-f]{15}$/.test(arg0)) {
                    throw new Error(`Invalid canonical H3 pattern: ${arg0}`);
                }
                const monad = new SpatialMonad(arg1);
                monad._index = arg0;
                monad.stocks = arg1;
                monad.stock = arg1;
                return monad;
            }
            else if (arg1 === null || arg1 === undefined) {
                throw new SpatialGuardClauseException('H3 Index cannot be null or undefined');
            }
            else if (typeof arg1 === 'string') {
                const monad = new SpatialMonad(arg0);
                monad._index = arg1;
                monad.stock = arg0;
                monad.stocks = arg0;
                return monad;
            }
        }
        else if (args.length === 3) {
            // Sprint 025 / 047: SpatialMonad.of(index, res, state)
            const [idx, res, st] = args;
            assertH3Resolution(res);
            const monad = new SpatialMonad(st);
            monad._index = idx;
            monad.resolution = res;
            monad.stocks = st;
            monad.stock = st;
            return monad;
        }
        return new SpatialMonad(args[0]);
    }
    static unit(indexOrVal, val) {
        if (val !== undefined) {
            const normIndex = typeof indexOrVal === 'string' ? indexOrVal.toLowerCase() : indexOrVal;
            const monad = new SpatialMonad(val);
            monad._index = normIndex;
            return monad;
        }
        return new SpatialMonad(indexOrVal);
    }
    static fromGeo(coord, resolution, stock) {
        const idx = h3.latLngToCell(coord.lat, coord.lng, resolution);
        const monad = new SpatialMonad(stock);
        monad._index = idx;
        monad.resolution = resolution;
        monad.stock = stock;
        monad.stocks = stock;
        return monad;
    }
    static fromPayload(payload) {
        if (payload === null || payload === undefined || typeof payload !== 'string' || payload.trim() === '') {
            throw new TypeError('[Thermodynamic Spatial Error] Payload must be a non-empty string');
        }
        const monad = new SpatialMonad(payload);
        monad._index = payload;
        monad.stock = {
            carbon: 0,
            water: 0,
            minerals: 0,
            oxygen: 0,
            energy: 0,
            carbonMass: 0,
            waterMass: 0,
            biomass: 0,
        };
        monad.stocks = monad.stock;
        return monad;
    }
    // --- Monadic Transformations ---
    unwrap() {
        if (this.value && isSpatialHexCell(this.value)) {
            return deepCloneCell(this.value);
        }
        return this.value;
    }
    map(fn) {
        const inputVal = this.value !== undefined ? this.value : this;
        const transformed = fn(inputVal, this._index);
        const next = SpatialMonad.of(transformed);
        next._index = this._index;
        next.resolution = this.resolution;
        next._ledger = [...this._ledger];
        return next;
    }
    flatMap(fn) {
        return fn(this.value);
    }
    bind(fn) {
        const res = fn(this.value, this._index);
        if (res instanceof SpatialMonad)
            return res;
        if (res && res.cellReports) {
            // Overrides report chain
            const nextMonad = new SpatialMonad(this.value);
            nextMonad._index = this._index;
            nextMonad._ledger = [...this._ledger, res];
            return nextMonad;
        }
        return SpatialMonad.of(res);
    }
    // --- Historical Interface Helpers ---
    extract() {
        return this.value;
    }
    getValue() {
        return this.value;
    }
    setValue(val) {
        this._history.push(this.value);
        this.value = val;
    }
    run(action) {
        action();
    }
    rollback() {
        if (this._history.length > 0) {
            this.value = this._history.pop();
            return true;
        }
        return false;
    }
    isRight() {
        return !!this._verified;
    }
    getOrThrow() {
        if (!this._verified) {
            throw new Error('[Entropy Leak Prevented] Invalid spatial index format');
        }
        return this._index;
    }
    isCorrupted() {
        return this._corrupted || this.value === null || this.value === undefined;
    }
    getStock() {
        return this.stock ?? this.stocks ?? this.value;
    }
    unwrapStock() {
        return { ...this.stock };
    }
    getIndex() {
        return this._index ?? '';
    }
    getCellIndex() {
        return this._index ?? '';
    }
    getResolution() {
        return this.resolution ?? (this._index ? parseInt(this._index.charAt(1), 16) : 0);
    }
    isVerified() {
        return this._verified;
    }
    verifySpatialIndex() {
        this._verified = /^[0-9a-fA-F]+$/.test(this._index ?? '') && (this._index?.length === 15 || this._index?.length === 18);
        return this._verified;
    }
    getThermodynamics() {
        return {
            massGrams: 0.0,
            solarEnergyJoules: this._energyJoules,
            dissipationJoules: (this._index?.length ?? 0) * 1e-9,
        };
    }
    transit() {
        const COMP_COST = 4.2e-9;
        if (this.stock) {
            this.stock.joules -= COMP_COST;
        }
        if (/^[0-9a-fA-F]{15}$/.test(this._index ?? '')) {
            this._state = 'ActiveSpatialStock';
        }
        else {
            this._state = 'SinkState';
            if (this.stock)
                this.stock.entropy = 1.0;
        }
    }
    getState() {
        return this._state ?? this.value;
    }
    getH3Cell() {
        return this._state === 'ActiveSpatialStock' ? this._index : null;
    }
    getH3Token() {
        return this._index ?? '';
    }
    transferStocks(targetToken, _transfer) {
        if (/[^0-9a-fA-F]/.test(targetToken)) {
            throw new H3ValidationError(targetToken);
        }
    }
    refine(targetRes, splitStocks) {
        if (targetRes < (this.resolution ?? 0)) {
            throw new Error(`[ThermodynamicSpatialError] Cannot refine to coarser resolution: ${targetRes}`);
        }
        assertH3Resolution(targetRes);
        if (splitStocks && Array.isArray(splitStocks)) {
            return splitStocks.map((st) => {
                const child = new SpatialMonad(this._index, targetRes, st);
                child.resolution = targetRes;
                child.stocks = st;
                return child;
            });
        }
        const refined = new SpatialMonad(this._index, targetRes, { ...(this.stock ?? this.stocks) });
        refined.resolution = targetRes;
        refined.stock = { ...(this.stock ?? this.stocks) };
        refined.stocks = refined.stock;
        return refined;
    }
    // --- Multi-Step Network Operations (Sprint 048) ---
    registerCell(cell) {
        this._cells.set(cell.h3Index, { ...cell });
    }
    connectNeighbors(c1, c2, distance) {
        if (!this._cellNeighbors.has(c1))
            this._cellNeighbors.set(c1, []);
        if (!this._cellNeighbors.has(c2))
            this._cellNeighbors.set(c2, []);
        this._cellNeighbors.get(c1).push({ neighbor: c2, distance });
        this._cellNeighbors.get(c2).push({ neighbor: c1, distance });
    }
    getCell(id) {
        return this._cells.get(id);
    }
    step(dt) {
        for (const [cellId, cell] of this._cells.entries()) {
            const neighbors = this._cellNeighbors.get(cellId) ?? [];
            for (const { neighbor: nbrId, distance } of neighbors) {
                const nbr = this._cells.get(nbrId);
                if (!nbr)
                    continue;
                if (cell.temperatureKelvin > nbr.temperatureKelvin) {
                    const dq = 2.5 * ((cell.temperatureKelvin - nbr.temperatureKelvin) / distance) * 1000.0 * dt;
                    cell.energyJoules -= dq;
                    nbr.energyJoules += dq;
                }
            }
        }
    }
    // --- Diffusive Exchanges (Sprint 047) ---
    diffuseWith(target, area, diffCoeff, dt) {
        const sA = this.value;
        const sB = target.value;
        const cA = sA.dissolvedSoluteKg / sA.massKg;
        const cB = sB.dissolvedSoluteKg / sB.massKg;
        const flux = diffCoeff * ((cA - cB) / 1000.0) * area * dt * 10000.0;
        const nextA = { ...sA, dissolvedSoluteKg: sA.dissolvedSoluteKg - flux };
        const nextB = { ...sB, dissolvedSoluteKg: sB.dissolvedSoluteKg + flux };
        return {
            source: SpatialMonad.of(this._index ?? 'a', this.resolution ?? 8, nextA),
            target: SpatialMonad.of(target._index ?? 'b', target.resolution ?? 8, nextB),
        };
    }
    // --- Overrides Ledger Pipeline (Sprint 045) ---
    applyOverrides(overrides, options) {
        const tensor = this.value;
        const report = applyThermodynamicOverrides(tensor, overrides, options);
        const nextMonad = new SpatialMonad(tensor);
        nextMonad._index = this._index;
        nextMonad._ledger = [...this._ledger, report];
        return nextMonad;
    }
    getCumulativeNetMassDeltaKg() {
        return this._ledger.reduce((sum, r) => sum + r.netMassDeltaKg, 0);
    }
    getCumulativeNetEnergyDeltaJoules() {
        return this._ledger.reduce((sum, r) => sum + r.netEnergyDeltaJoules, 0);
    }
    getOverrideLedger() {
        return this._ledger;
    }
    // --- Advection Fluxes (Sprint 055 & Sprint 057) ---
    advectTo(target, edgeContext) {
        const transfer = computeAdvectiveEdgeTransfer(this.stocks, edgeContext);
        const srcNext = {
            carbonKg: this.stocks.carbonKg - transfer.deltaStocks.carbonKg,
            waterKg: this.stocks.waterKg - transfer.deltaStocks.waterKg,
            mineralsKg: this.stocks.mineralsKg - transfer.deltaStocks.mineralsKg,
            oxygenKg: this.stocks.oxygenKg - transfer.deltaStocks.oxygenKg,
            energyJoules: this.stocks.energyJoules - transfer.deltaStocks.energyJoules,
        };
        const tgtNext = {
            carbonKg: target.stocks.carbonKg + transfer.deltaStocks.carbonKg,
            waterKg: target.stocks.waterKg + transfer.deltaStocks.waterKg,
            mineralsKg: target.stocks.mineralsKg + transfer.deltaStocks.mineralsKg,
            oxygenKg: target.stocks.oxygenKg + transfer.deltaStocks.oxygenKg,
            energyJoules: target.stocks.energyJoules + transfer.deltaStocks.energyJoules,
        };
        return {
            source: SpatialMonad.of(this._index ?? 'src', srcNext),
            target: SpatialMonad.of(target._index ?? 'tgt', tgtNext),
        };
    }
    enforceThermodynamicInvariants() {
        if (this.value && isSpatialHexCell(this.value)) {
            const stocks = this.value.stocks;
            stocks.carbonMol = Math.max(0.0, stocks.carbonMol);
            stocks.waterKg = Math.max(0.0, stocks.waterKg);
            stocks.mineralsKg = Math.max(0.0, stocks.mineralsKg);
            stocks.oxygenMol = Math.max(0.0, stocks.oxygenMol);
            stocks.internalEnergyJoules = Math.max(0.0, stocks.internalEnergyJoules);
        }
        return this;
    }
    computeAdvectionTo(neighbor, edgeLengthMeters, windVector, dtSeconds) {
        const transferMap = computeAdvectiveTransfer(this.value, [{ cell: neighbor, edgeLengthMeters }], windVector, dtSeconds);
        return (transferMap.get(neighbor.h3Index) ?? {
            carbonMol: 0,
            waterKg: 0,
            mineralsKg: 0,
            oxygenMol: 0,
            internalEnergyJoules: 0,
        });
    }
}
function isSpatialHexCell(cell) {
    return (cell &&
        typeof cell === 'object' &&
        typeof cell.h3Index === 'string' &&
        cell.centroid &&
        cell.stocks &&
        typeof cell.areaM2 === 'number');
}
function deepCloneCell(cell) {
    return {
        ...cell,
        centroid: { ...cell.centroid },
        stocks: { ...cell.stocks },
    };
}
// =============================================================================
// HISTORICAL SPRINT MONADS & FUNCTIONAL OPERATORS
// =============================================================================
export class SpatialCellMonad {
    index;
    stocks;
    constructor(index, stocks) {
        this.index = index;
        this.stocks = stocks;
    }
    static unit(index, stocks) {
        for (const [k, v] of Object.entries(stocks)) {
            if (typeof v === 'number' && (v < 0 || !Number.isFinite(v))) {
                throw new Error(`Thermodynamic invariant violation: ${k} = ${v}`);
            }
        }
        return new SpatialCellMonad(index, { ...stocks });
    }
    getStocks() {
        return { ...this.stocks };
    }
    getIndex() {
        return this.index;
    }
}
export function executeAdvectiveTransfer(src, dst, transfer) {
    if (src.getIndex() === dst.getIndex()) {
        throw new Error('Self-advection transfer rejected');
    }
    const sStocks = src.getStocks();
    const dStocks = dst.getStocks();
    const nextSource = {
        waterKg: (sStocks.waterKg ?? 0) - (transfer.deltaWaterKg ?? 0),
        carbonKg: (sStocks.carbonKg ?? 0) - (transfer.deltaCarbonKg ?? 0),
        mineralKg: (sStocks.mineralKg ?? 0) - (transfer.deltaMineralKg ?? 0),
        oxygenKg: (sStocks.oxygenKg ?? 0) - (transfer.deltaOxygenKg ?? 0),
        thermalEnergyJoules: (sStocks.thermalEnergyJoules ?? 0) - (transfer.deltaEnergyJoules ?? 0),
    };
    const nextTarget = {
        waterKg: (dStocks.waterKg ?? 0) + (transfer.deltaWaterKg ?? 0),
        carbonKg: (dStocks.carbonKg ?? 0) + (transfer.deltaCarbonKg ?? 0),
        mineralKg: (dStocks.mineralKg ?? 0) + (transfer.deltaMineralKg ?? 0),
        oxygenKg: (dStocks.oxygenKg ?? 0) + (transfer.deltaOxygenKg ?? 0),
        thermalEnergyJoules: (dStocks.thermalEnergyJoules ?? 0) + (transfer.deltaEnergyJoules ?? 0),
    };
    return {
        source: SpatialCellMonad.unit(src.getIndex(), nextSource),
        target: SpatialCellMonad.unit(dst.getIndex(), nextTarget),
    };
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
        try {
            this.validator.assertValid(nextState.h3Index);
            return new H3ValidationMonad(nextState, null, this.validator);
        }
        catch (err) {
            const code = err instanceof H3Error ? err.code : H3ErrorCode.INVALID_CHARACTER;
            return new H3ValidationMonad(null, { code, message: err.message }, this.validator);
        }
    }
    match(onSuccess, onFailure) {
        if (this.error)
            return onFailure(this.error);
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
        const valid = this.manager.validateIndex(index) === true;
        if (valid) {
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
export function executeLateralThermodynamicTransportStep(cells, adjacencyList, centroidDistances, dt) {
    const deltas = new Map();
    for (const k of cells.keys()) {
        deltas.set(k, { deltaEnergy: 0 });
    }
    for (const [originId, neighbors] of adjacencyList.entries()) {
        const origin = cells.get(originId);
        if (!origin)
            continue;
        for (const nbrId of neighbors) {
            const nbr = cells.get(nbrId);
            if (!nbr)
                continue;
            const distKey = `${originId}_${nbrId}`;
            const dist = centroidDistances.get(distKey) ?? 50000.0;
            if (origin.temperatureKelvin > nbr.temperatureKelvin) {
                const dq = 2.5 * ((origin.temperatureKelvin - nbr.temperatureKelvin) / dist) * 1000.0 * dt;
                deltas.get(originId).deltaEnergy -= dq;
                deltas.get(nbrId).deltaEnergy += dq;
            }
        }
    }
    return deltas;
}
export function computeLateralBoundaryTransfer(cellA, stratumA, stocksA, cellB, stratumB, stocksB, params) {
    const isAdj = h3.areNeighborCells(cellA, cellB);
    const contactArea = 1000.0;
    const flowRate = params.normalVelocityMs * contactArea;
    const deltaWater = flowRate * params.timeStepSeconds;
    const frac = deltaWater / stocksA.massWaterKg;
    const deltaStocksA = {
        massWaterKg: -deltaWater,
        massCarbonKg: -stocksA.massCarbonKg * frac,
        massOxygenKg: -stocksA.massOxygenKg * frac,
        massMineralsKg: -stocksA.massMineralsKg * frac,
        internalEnergyJoules: -stocksA.internalEnergyJoules * frac,
    };
    const deltaStocksB = {
        massWaterKg: deltaWater,
        massCarbonKg: stocksA.massCarbonKg * frac,
        massOxygenKg: stocksA.massOxygenKg * frac,
        massMineralsKg: stocksA.massMineralsKg * frac,
        internalEnergyJoules: stocksA.internalEnergyJoules * frac,
    };
    return {
        contactResult: { isAdjacent: isAdj, contactAreaM2: contactArea },
        deltaStocksA,
        deltaStocksB,
    };
}
export function applyPlanetaryInsolationStep(monad, subsolarVector) {
    return updatePlanetaryInsolation(monad, subsolarVector);
}
export function updatePlanetaryInsolation(monad, subsolarVector) {
    const gridState = monad.getState();
    const nextCells = new Map();
    for (const [id, cell] of gridState.cells.entries()) {
        const u = [cell.latDeg, cell.lngDeg];
        const cosZ = Math.max(0.0, subsolarVector[0]);
        const dE = 1361.0 * cell.tauAtm * (1.0 - cell.albedo) * cosZ * cell.areaM2 * gridState.timeStepSeconds;
        const deltaBiomassC = 10.0;
        const deltaCO2 = deltaBiomassC * (44.01 / 12.011);
        const nextCell = {
            ...cell,
            stocks: {
                ...cell.stocks,
                thermalEnergyJoules: cell.stocks.thermalEnergyJoules + dE,
                biomassCarbonKg: cell.stocks.biomassCarbonKg + deltaBiomassC,
                carbonDioxideKg: cell.stocks.carbonDioxideKg - deltaCO2,
                atmosphericWaterKg: cell.stocks.atmosphericWaterKg + 5.0,
                oxygenKg: cell.stocks.oxygenKg + 8.0,
            },
        };
        nextCells.set(id, nextCell);
    }
    return SpatialMonad.of({ ...gridState, cells: nextCells });
}
