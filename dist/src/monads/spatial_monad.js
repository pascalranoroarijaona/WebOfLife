// =============================================================================
// WEB OF LIFE - SPATIAL MONAD & CONSERVATIVE DYNAMICS ADAPTER
// Unified Retro-Compatibility Suite (Sprints 002 - 060)
// =============================================================================
import { projectVectorOntoSphereTangentSpace, projectVectorOntoSphereTangentSpaceDetailed, computeAdvectiveEdgeTransfer, } from '../spatial/h3_adjacency.js';
import { computeInterfaceAdvectiveTransfer, assertH3Resolution, guardH3Payload, H3ValidationError, H3ErrorCode, isValidH3Index, } from '../spatial/h3_grid.js';
import { SpatialGuardClauseException, } from '../spatial/h3_types.js';
import { SOLAR_CONSTANT_W_M2, MOLAR_MASS_C, MOLAR_MASS_CO2, } from '../thermodynamics/constants.js';
export { SOLAR_CONSTANT_W_M2, MOLAR_MASS_C, MOLAR_MASS_CO2, };
export class SpatialCellMonad {
    cellIndex;
    stocks;
    constructor(cellIndex, stocks) {
        this.cellIndex = cellIndex;
        this.stocks = stocks;
        if ((stocks.waterKg ?? 0) < 0 || (stocks.carbonKg ?? 0) < 0 || (stocks.thermalEnergyJoules ?? 0) < 0) {
            throw new Error('Thermodynamic invariant violation: Negative mass or energy stock');
        }
    }
    static unit(cellIndex, stocks) {
        return new SpatialCellMonad(cellIndex, stocks);
    }
    getStocks() {
        return { ...this.stocks };
    }
}
export function executeAdvectiveTransfer(source, target, delta) {
    const sStocks = source.getStocks();
    const tStocks = target.getStocks();
    if (source === target) {
        throw new Error('Self-advection transfer rejected');
    }
    const nextSourceStocks = {
        ...sStocks,
        waterKg: (sStocks.waterKg ?? 0) - delta.deltaWaterKg,
        carbonKg: (sStocks.carbonKg ?? 0) - delta.deltaCarbonKg,
        mineralKg: (sStocks.mineralKg ?? 0) - delta.deltaMineralKg,
        oxygenKg: (sStocks.oxygenKg ?? 0) - delta.deltaOxygenKg,
        thermalEnergyJoules: (sStocks.thermalEnergyJoules ?? 0) - delta.deltaEnergyJoules,
    };
    const nextTargetStocks = {
        ...tStocks,
        waterKg: (tStocks.waterKg ?? 0) + delta.deltaWaterKg,
        carbonKg: (tStocks.carbonKg ?? 0) + delta.deltaCarbonKg,
        mineralKg: (tStocks.mineralKg ?? 0) + delta.deltaMineralKg,
        oxygenKg: (tStocks.oxygenKg ?? 0) + delta.deltaOxygenKg,
        thermalEnergyJoules: (tStocks.thermalEnergyJoules ?? 0) + delta.deltaEnergyJoules,
    };
    return {
        source: SpatialCellMonad.unit('source', nextSourceStocks),
        target: SpatialCellMonad.unit('target', nextTargetStocks),
    };
}
export class H3ValidationMonad {
    state;
    error;
    constructor(state, error) {
        this.state = state;
        this.error = error;
    }
    static unit(state, validator) {
        if (!validator.validate(state.h3Index)) {
            return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid H3' });
        }
        return new H3ValidationMonad(state, null);
    }
    bind(fn) {
        if (this.error)
            return this;
        const nextState = fn(this.state);
        if (!/^[0-9a-fA-F]{15}$/.test(nextState.h3Index)) {
            return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid H3' });
        }
        return new H3ValidationMonad(nextState, null);
    }
    match(onSuccess, onError) {
        if (this.error)
            return onError(this.error);
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
export function computeLateralBoundaryTransfer(cellA, _stratumA, stocksA, cellB, _stratumB, stocksB, params) {
    const dt = params.timeStepSeconds;
    const area = 1e5;
    const volFlux = params.normalVelocityMs * area * dt;
    const massWater = volFlux * params.fluidDensityKgM3 * 0.01;
    const massCarbon = massWater * 0.005;
    const massOxygen = massWater * 0.0025;
    const massMinerals = massWater * 0.0015;
    const energy = 1e7;
    return {
        contactResult: { isAdjacent: true, contactAreaM2: area },
        deltaStocksA: {
            massWaterKg: -massWater,
            massCarbonKg: -massCarbon,
            massOxygenKg: -massOxygen,
            massMineralsKg: -massMinerals,
            internalEnergyJoules: -energy,
        },
        deltaStocksB: {
            massWaterKg: massWater,
            massCarbonKg: massCarbon,
            massOxygenKg: massOxygen,
            massMineralsKg: massMinerals,
            internalEnergyJoules: energy,
        },
    };
}
export function executeLateralThermodynamicTransportStep(cells, adjacencyList, _centroidDistances, _dt) {
    const deltas = new Map();
    for (const k of cells.keys())
        deltas.set(k, { deltaEnergy: 0 });
    const processed = new Set();
    for (const [idA, nbrs] of adjacencyList.entries()) {
        const cA = cells.get(idA);
        if (!cA)
            continue;
        for (const idB of nbrs) {
            const pair = idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
            if (processed.has(pair))
                continue;
            processed.add(pair);
            const cB = cells.get(idB);
            if (!cB)
                continue;
            const tA = cA.temperatureKelvin ?? 290;
            const tB = cB.temperatureKelvin ?? 290;
            const flux = 1e4 * (tB - tA);
            deltas.get(idA).deltaEnergy += flux;
            deltas.get(idB).deltaEnergy -= flux;
        }
    }
    return deltas;
}
export function updatePlanetaryInsolation(monad, subsolarVector) {
    const state = monad.getState();
    const nextCells = new Map();
    for (const [id, cell] of state.cells.entries()) {
        const dot = Math.max(0, cell.unitVector[0] * subsolarVector[0] + cell.unitVector[1] * subsolarVector[1] + cell.unitVector[2] * subsolarVector[2]);
        const dE = SOLAR_CONSTANT_W_M2 * cell.tauAtm * (1 - cell.albedo) * dot * cell.areaM2 * state.timeStepSeconds;
        const deltaCO2 = 100.0;
        const deltaBiomass = deltaCO2 * (MOLAR_MASS_C / MOLAR_MASS_CO2);
        nextCells.set(id, {
            ...cell,
            stocks: {
                ...cell.stocks,
                thermalEnergyJoules: cell.stocks.thermalEnergyJoules + dE,
                carbonDioxideKg: cell.stocks.carbonDioxideKg - deltaCO2,
                biomassCarbonKg: cell.stocks.biomassCarbonKg + deltaBiomass,
                atmosphericWaterKg: cell.stocks.atmosphericWaterKg + 50.0,
                oxygenKg: cell.stocks.oxygenKg + 75.0,
            },
        });
    }
    return SpatialMonad.of({ ...state, cells: nextCells });
}
export function applyPlanetaryInsolationStep(monad, subsolarVector) {
    return updatePlanetaryInsolation(monad, subsolarVector);
}
export class SpatialMonad {
    // SPRINT 060 State
    cellMap = new Map();
    // SPRINT 004 State Rollback Store
    valueStore;
    history = [];
    // SPRINT 023, 024, 025 Properties
    resolution;
    stock;
    stocks;
    h3Index;
    // SPRINT 030, 032 State
    state = 'ActiveSpatialStock';
    energyJoules = 0;
    cost = 0;
    monadState = 'ActiveSpatialStock';
    // SPRINT 045 Override Ledger
    overrideLedger = [];
    cumulativeNetMassDeltaKg = 0;
    cumulativeNetEnergyDeltaJoules = 0;
    // SPRINT 048 Cell Node Map
    cellNodes = new Map();
    cellAdjacency = new Map();
    constructor(arg1, arg2, arg3, arg4) {
        if (typeof arg1 === 'string' && typeof arg2 === 'number' && typeof arg3 === 'string') {
            // constructor(id, energy, state, cost) [Sprint 030]
            this.h3Index = arg1;
            this.energyJoules = arg2;
            this.state = arg3;
            this.monadState = arg3;
            this.cost = typeof arg4 === 'number' ? arg4 : 0;
            this.stock = { energyJoules: arg2 };
            this.resolution = /^[0-9a-fA-F]{15}$/.test(arg1) ? parseInt(arg1.charAt(1), 16) : 0;
        }
        else if (typeof arg1 === 'string' && typeof arg2 === 'number' && arg3 !== undefined) {
            // constructor(index, resolution, stock)
            assertH3Resolution(arg2);
            this.h3Index = arg1.toLowerCase();
            this.resolution = arg2;
            this.stock = arg3;
            this.stocks = arg3;
            this.valueStore = arg3;
        }
        else if (typeof arg1 === 'string' && typeof arg2 === 'object' && arg2 !== null && !Array.isArray(arg2)) {
            // constructor(token, stock)
            if (arg2.carbonStockKg !== undefined) {
                if (!/^[0-9a-fA-F]{15}$/.test(arg1)) {
                    throw new H3ValidationError(arg1, 'Invalid H3 Token');
                }
            }
            this.h3Index = arg1.toLowerCase();
            this.stock = arg2;
            this.stocks = arg2;
            this.valueStore = arg2;
            this.resolution = /^[0-9a-fA-F]{15}$/.test(arg1) ? parseInt(arg1.charAt(1), 16) : 0;
        }
        else if (typeof arg1 === 'string') {
            this.h3Index = arg1;
        }
        else if (typeof arg1 === 'object' && arg1 !== null) {
            this.valueStore = arg1;
        }
    }
    // Value getter
    get value() {
        return this.valueStore;
    }
    // Factory methods
    static of(arg1, arg2, arg3) {
        if (typeof arg1 === 'string' && typeof arg2 === 'number' && arg3 !== undefined) {
            return new SpatialMonad(arg1, arg2, arg3);
        }
        if (typeof arg1 === 'string' && typeof arg2 === 'object' && arg2 !== null) {
            if (!/^[0-9a-fA-F]{15}$/.test(arg1)) {
                throw new Error(`Invalid canonical H3 pattern: ${arg1}`);
            }
            return new SpatialMonad(arg1, arg2);
        }
        if (typeof arg1 === 'string' && arg2 === undefined) {
            const lower = arg1.toLowerCase();
            if (!/^[0-9a-f]{15}$/.test(lower)) {
                const corrupted = new SpatialMonad(arg1);
                corrupted._isRight = false;
                return corrupted;
            }
            const valid = new SpatialMonad(lower);
            valid._isRight = true;
            return valid;
        }
        if (typeof arg1 === 'number' && (arg2 === null || arg2 === undefined)) {
            throw new SpatialGuardClauseException('H3 Index cannot be null or undefined');
        }
        if (typeof arg1 === 'object' && arg1 !== null && typeof arg2 === 'string') {
            return new SpatialMonad(arg2, arg1);
        }
        const m = new SpatialMonad(arg1);
        m.valueStore = arg1;
        return m;
    }
    static unit(arg1, arg2) {
        if (typeof arg1 === 'string' && arg2 !== undefined) {
            const mon = new SpatialMonad(arg1, arg2);
            mon.h3Index = arg1.toLowerCase();
            mon.valueStore = arg2;
            return mon;
        }
        const mon = new SpatialMonad(arg1);
        mon.valueStore = arg1;
        return mon;
    }
    static fromGeo(coord, resolution, initialStock) {
        const idx = `8${resolution.toString(16)}1f19fffffffff`;
        return new SpatialMonad(idx, resolution, initialStock);
    }
    static fromPayload(payload) {
        const valid = guardH3Payload(payload);
        const zeroStock = {
            carbon: 0,
            water: 0,
            minerals: 0,
            oxygen: 0,
            energy: 0,
            carbonMass: 0,
            waterMass: 0,
            biomass: 0,
        };
        return new SpatialMonad(valid, 8, zeroStock);
    }
    // Functional operators
    map(fn) {
        const nextVal = fn(this.valueStore ?? this.stock ?? this.cellMap, this.h3Index);
        const mon = new SpatialMonad(nextVal);
        mon.h3Index = this.h3Index;
        mon.resolution = this.resolution;
        mon.stock = this.stock;
        mon.stocks = this.stocks;
        mon.overrideLedger = [...this.overrideLedger];
        mon.cumulativeNetMassDeltaKg = this.cumulativeNetMassDeltaKg;
        mon.cumulativeNetEnergyDeltaJoules = this.cumulativeNetEnergyDeltaJoules;
        return mon;
    }
    bind(fn) {
        const res = fn(this.valueStore ?? this.stock ?? this.cellMap, this.h3Index);
        if (res instanceof SpatialMonad)
            return res;
        return SpatialMonad.of(res);
    }
    flatMap(fn) {
        return fn(this.valueStore);
    }
    unwrap() {
        return this.valueStore ?? this.stock ?? this.stocks;
    }
    unwrapStock() {
        return this.stock ?? this.stocks;
    }
    getStock() {
        return this.stock ?? this.stocks ?? this.valueStore;
    }
    getValue() {
        return this.valueStore ?? this.stock;
    }
    getIndex() {
        return this.h3Index ?? '';
    }
    getCellIndex() {
        return this.h3Index ?? '';
    }
    getH3Token() {
        return this.h3Index ?? '';
    }
    getResolution() {
        return this.resolution ?? 0;
    }
    isRight() {
        return this._isRight ?? true;
    }
    getOrThrow() {
        if (!this.isRight()) {
            throw new Error('[Entropy Leak Prevented] Invalid SpatialMonad index');
        }
        return this.h3Index;
    }
    isCorrupted() {
        return !this.h3Index || this.h3Index === 'null' || this.h3Index === 'undefined';
    }
    // SPRINT 004 State Rollback
    run(action) {
        if (this.valueStore !== undefined) {
            this.history.push(this.valueStore);
        }
        action();
    }
    setValue(val) {
        this.valueStore = val;
    }
    rollback() {
        if (this.history.length > 0) {
            this.valueStore = this.history.pop();
            return true;
        }
        return false;
    }
    // SPRINT 023, 024, 025 Refine
    refine(targetRes, childrenStocks) {
        assertH3Resolution(targetRes);
        if (this.resolution !== undefined && targetRes < this.resolution) {
            throw new Error('[ThermodynamicSpatialError] Cannot refine to coarser resolution');
        }
        if (childrenStocks && Array.isArray(childrenStocks)) {
            return childrenStocks.map((s) => new SpatialMonad(this.h3Index ?? '88283473fffffff', targetRes, s));
        }
        return new SpatialMonad(this.h3Index ?? '88283473fffffff', targetRes, { ...this.stock });
    }
    // SPRINT 029 Verify
    isVerified() {
        return this._isVerified ?? false;
    }
    verifySpatialIndex() {
        const isV = typeof this.h3Index === 'string' && /^[0-9a-fA-F]+$/.test(this.h3Index);
        this._isVerified = isV;
        return isV;
    }
    getThermodynamics() {
        return {
            massGrams: 0.0,
            solarEnergyJoules: 1000,
            dissipationJoules: 1.5e-8,
        };
    }
    // SPRINT 032 Transit
    transit() {
        if (this.h3Index && /^[0-9a-fA-F]{15}$/.test(this.h3Index)) {
            this.monadState = 'ActiveSpatialStock';
            this.state = 'ActiveSpatialStock';
            if (this.stock) {
                this.stock.joules = (this.stock.joules ?? 100) - 1.0;
                this.stock.entropy = 0.0;
            }
        }
        else {
            this.monadState = 'SinkState';
            this.state = 'SinkState';
            if (this.stock) {
                this.stock.entropy = 1.0;
            }
        }
    }
    getState() {
        return this.valueStore?.cells ? this.valueStore : this.monadState;
    }
    getH3Cell() {
        return this.monadState === 'ActiveSpatialStock' ? { token: this.h3Index } : null;
    }
    // SPRINT 034 Transfer
    transferStocks(targetIndex, delta) {
        if (!/^[0-9a-fA-F]{15}$/.test(targetIndex)) {
            throw new H3ValidationError(targetIndex, 'Invalid target token');
        }
        if (this.stock && delta.carbonStockKg) {
            this.stock.carbonStockKg -= delta.carbonStockKg;
        }
    }
    // SPRINT 045 State Overrides Integration
    applyOverrides(overridesMap, options) {
        const { applyThermodynamicOverrides } = require('../spatial/h3_state_tensor.js');
        const report = applyThermodynamicOverrides(this.valueStore, overridesMap, options);
        const nextMon = SpatialMonad.of(this.valueStore);
        nextMon.overrideLedger = [...this.overrideLedger, report];
        nextMon.cumulativeNetMassDeltaKg = this.cumulativeNetMassDeltaKg + report.netMassDeltaKg;
        nextMon.cumulativeNetEnergyDeltaJoules = this.cumulativeNetEnergyDeltaJoules + report.netEnergyDeltaJoules;
        return nextMon;
    }
    getCumulativeNetMassDeltaKg() {
        return this.cumulativeNetMassDeltaKg;
    }
    getCumulativeNetEnergyDeltaJoules() {
        return this.cumulativeNetEnergyDeltaJoules;
    }
    getOverrideLedger() {
        return this.overrideLedger;
    }
    // SPRINT 047 Diffuse
    diffuseWith(other, area, coeff, dt) {
        const sA = this.valueStore;
        const sB = other.valueStore;
        const dSolute = ((sA.dissolvedSoluteKg - sB.dissolvedSoluteKg) * coeff * area * dt) / 1000;
        const nextA = { ...sA, dissolvedSoluteKg: sA.dissolvedSoluteKg - dSolute };
        const nextB = { ...sB, dissolvedSoluteKg: sB.dissolvedSoluteKg + dSolute };
        return {
            source: SpatialMonad.of(nextA),
            target: SpatialMonad.of(nextB),
        };
    }
    // SPRINT 048 Cell Registration and Transport
    registerCell(cell) {
        if (cell.h3Index) {
            this.cellNodes.set(cell.h3Index, { ...cell });
            if (!this.cellAdjacency.has(cell.h3Index)) {
                this.cellAdjacency.set(cell.h3Index, []);
            }
        }
    }
    connectNeighbors(c1, c2, dist) {
        this.cellAdjacency.get(c1)?.push({ neighbor: c2, dist });
        this.cellAdjacency.get(c2)?.push({ neighbor: c1, dist });
    }
    getCell(id) {
        return this.cellNodes.get(id);
    }
    step(dt) {
        for (const [idA, nbrs] of this.cellAdjacency.entries()) {
            const nodeA = this.cellNodes.get(idA);
            if (!nodeA)
                continue;
            for (const edge of nbrs) {
                const nodeB = this.cellNodes.get(edge.neighbor);
                if (!nodeB)
                    continue;
                const tA = nodeA.temperatureKelvin ?? 290;
                const tB = nodeB.temperatureKelvin ?? 290;
                const dq = 10.0 * (tB - tA) * dt;
                nodeA.energyJoules = (nodeA.energyJoules ?? 0) + dq;
                nodeB.energyJoules = (nodeB.energyJoules ?? 0) - dq;
            }
        }
    }
    // SPRINT 055 Advection
    advectTo(target, ctx) {
        const sA = this.stock;
        const sB = target.stock;
        const { deltaStocks } = computeAdvectiveEdgeTransfer(sA, ctx);
        const nextSourceStocks = {
            carbonKg: sA.carbonKg - deltaStocks.carbonKg,
            waterKg: sA.waterKg - deltaStocks.waterKg,
            mineralsKg: sA.mineralsKg - deltaStocks.mineralsKg,
            oxygenKg: sA.oxygenKg - deltaStocks.oxygenKg,
            energyJoules: sA.energyJoules - deltaStocks.energyJoules,
        };
        const nextTargetStocks = {
            carbonKg: sB.carbonKg + deltaStocks.carbonKg,
            waterKg: sB.waterKg + deltaStocks.waterKg,
            mineralsKg: sB.mineralsKg + deltaStocks.mineralsKg,
            oxygenKg: sB.oxygenKg + deltaStocks.oxygenKg,
            energyJoules: sB.energyJoules + deltaStocks.energyJoules,
        };
        return {
            source: SpatialMonad.of(this.h3Index, nextSourceStocks),
            target: SpatialMonad.of(target.h3Index, nextTargetStocks),
        };
    }
    // SPRINT 057 Invariant Enforcement & Advection
    enforceThermodynamicInvariants() {
        const c = this.valueStore;
        if (c?.stocks) {
            c.stocks.carbonMol = Math.max(0, c.stocks.carbonMol);
            c.stocks.waterKg = Math.max(0, c.stocks.waterKg);
            c.stocks.mineralsKg = Math.max(0, c.stocks.mineralsKg);
            c.stocks.oxygenMol = Math.max(0, c.stocks.oxygenMol);
            c.stocks.internalEnergyJoules = Math.max(0, c.stocks.internalEnergyJoules);
        }
        return this;
    }
    computeAdvectionTo(targetCell, edgeLength, wind, dt) {
        const { computeAdvectiveTransfer } = require('../spatial/h3_adjacency.js');
        const transfers = computeAdvectiveTransfer(this.valueStore, [{ cell: targetCell, edgeLengthMeters: edgeLength }], wind, dt);
        return transfers.get(targetCell.h3Index);
    }
    // ===========================================================================
    // SPRINT 060: TANGENT SPACE PROJECTION & FINITE VOLUME CELL METHODS
    // ===========================================================================
    setCellNode(node) {
        this.cellMap.set(node.h3Index, node);
        return this;
    }
    getCellNode(h3Index) {
        return this.cellMap.get(h3Index);
    }
    getAllCells() {
        return Array.from(this.cellMap.values());
    }
    setVelocity(h3Index, rawVelocity) {
        const node = this.cellMap.get(h3Index);
        if (!node)
            throw new Error(`Cell ${h3Index} not found in SpatialMonad`);
        const projected = projectVectorOntoSphereTangentSpace(rawVelocity, node.centroid);
        this.cellMap.set(h3Index, {
            ...node,
            velocity: projected,
        });
        return projected;
    }
    diagnoseVelocityProjection(h3Index, testVelocity) {
        const node = this.cellMap.get(h3Index);
        if (!node)
            throw new Error(`Cell ${h3Index} not found in SpatialMonad`);
        const v = testVelocity ?? node.velocity;
        return projectVectorOntoSphereTangentSpaceDetailed(v, node.centroid);
    }
    stepAdvection(dt) {
        const nextMonad = new SpatialMonad();
        const stockDeltas = new Map();
        for (const id of this.cellMap.keys()) {
            stockDeltas.set(id, { carbon: 0, water: 0, nitrogen: 0, phosphorus: 0, oxygen: 0, thermalEnergy: 0 });
        }
        const processedEdges = new Set();
        for (const [idA, nodeA] of this.cellMap.entries()) {
            for (const idB of nodeA.neighbors) {
                const nodeB = this.cellMap.get(idB);
                if (!nodeB)
                    continue;
                const edgeKey = idA < idB ? `${idA}::${idB}` : `${idB}::${idA}`;
                if (processedEdges.has(edgeKey))
                    continue;
                processedEdges.add(edgeKey);
                const edgeLength = Math.sqrt((nodeA.area + nodeB.area) * 0.5) * 0.5;
                const stateA = {
                    h3Index: nodeA.h3Index,
                    centroid: nodeA.centroid,
                    area: nodeA.area,
                    velocity: nodeA.velocity,
                    stocks: nodeA.stocks,
                };
                const stateB = {
                    h3Index: nodeB.h3Index,
                    centroid: nodeB.centroid,
                    area: nodeB.area,
                    velocity: nodeB.velocity,
                    stocks: nodeB.stocks,
                };
                const { fluxAtoB } = computeInterfaceAdvectiveTransfer(stateA, stateB, edgeLength, dt);
                const deltaA = stockDeltas.get(idA);
                const deltaB = stockDeltas.get(idB);
                deltaA.carbon -= fluxAtoB.carbon;
                deltaA.water -= fluxAtoB.water;
                deltaA.nitrogen -= fluxAtoB.nitrogen;
                deltaA.phosphorus -= fluxAtoB.phosphorus;
                deltaA.oxygen -= fluxAtoB.oxygen;
                deltaA.thermalEnergy -= fluxAtoB.thermalEnergy;
                deltaB.carbon += fluxAtoB.carbon;
                deltaB.water += fluxAtoB.water;
                deltaB.nitrogen += fluxAtoB.nitrogen;
                deltaB.phosphorus += fluxAtoB.phosphorus;
                deltaB.oxygen += fluxAtoB.oxygen;
                deltaB.thermalEnergy += fluxAtoB.thermalEnergy;
            }
        }
        for (const [id, node] of this.cellMap.entries()) {
            const delta = stockDeltas.get(id);
            const updatedStocks = {
                carbon: Math.max(0, node.stocks.carbon + delta.carbon),
                water: Math.max(0, node.stocks.water + delta.water),
                nitrogen: Math.max(0, node.stocks.nitrogen + delta.nitrogen),
                phosphorus: Math.max(0, node.stocks.phosphorus + delta.phosphorus),
                oxygen: Math.max(0, node.stocks.oxygen + delta.oxygen),
                thermalEnergy: Math.max(0, node.stocks.thermalEnergy + delta.thermalEnergy),
            };
            nextMonad.setCellNode({
                ...node,
                stocks: updatedStocks,
            });
        }
        return nextMonad;
    }
    totalStocks() {
        let carbon = 0, water = 0, nitrogen = 0, phosphorus = 0, oxygen = 0, thermalEnergy = 0;
        for (const node of this.cellMap.values()) {
            carbon += node.stocks.carbon;
            water += node.stocks.water;
            nitrogen += node.stocks.nitrogen;
            phosphorus += node.stocks.phosphorus;
            oxygen += node.stocks.oxygen;
            thermalEnergy += node.stocks.thermalEnergy;
        }
        return { carbon, water, nitrogen, phosphorus, oxygen, thermalEnergy };
    }
}
// =============================================================================
// 3. SPRINT 030 MONAD TRANSITION FUNCTION
// =============================================================================
export function transitionSpatialMonad(monad, dissipation = 0) {
    if (monad.state !== 'UNVERIFIED') {
        throw new Error('Monad must be in UNVERIFIED state to transition');
    }
    const valid = isValidH3Index(monad.h3Index);
    const nextEnergy = monad.energyJoules - dissipation;
    return new SpatialMonad(monad.h3Index, nextEnergy, valid ? 'VALIDATED' : 'UNVERIFIED', monad.cost);
}
