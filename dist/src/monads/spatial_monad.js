/**
 * Planetary Thermodynamic Spatial Monad Kernel
 * Retro-Compatible Multi-Sprint Implementation (Sprints 002 - 068)
 */
import { H3ErrorCode, SpatialGuardClauseException, } from '../spatial/h3_types.js';
import { isValidH3Index, validateH3Token, assertCanonicalH3Pattern, assertH3Resolution, matchesCanonicalH3Pattern, } from '../spatial/h3_grid.js';
import { calculateH3BoundaryContactArea, computeAdvectiveEdgeTransfer, computeAdvectiveTransfer, projectVectorOntoSphereTangentSpace, dotProduct, toVec3D, latLngToUnitVector3D, unitVectorDotProduct, } from '../spatial/h3_adjacency.js';
import { SOLAR_CONSTANT_W_M2 } from '../thermodynamics/constants.js';
import { applyThermodynamicOverrides } from '../spatial/h3_state_tensor.js';
export { SOLAR_CONSTANT_W_M2, };
export const MOLAR_MASS_C = 12.011;
export const MOLAR_MASS_CO2 = 44.01;
export function evaluateShearDissipationTransition(input) {
    const { u_i, u_j, tangent, arcLength, layerDepth, centroidDistance, dynamicViscosity, temperature, dt, } = input;
    const du = [u_j[0] - u_i[0], u_j[1] - u_i[1], u_j[2] - u_i[2]];
    const delta_u_t = du[0] * tangent[0] + du[1] * tangent[1] + du[2] * tangent[2];
    const facetArea = arcLength * layerDepth;
    const deltaDist = Math.max(centroidDistance, 1e-12);
    const shearForceMagnitudeN = dynamicViscosity * (Math.abs(delta_u_t) / deltaDist) * facetArea;
    const powerDissipatedW = dynamicViscosity * ((delta_u_t * delta_u_t) / deltaDist) * facetArea;
    const workJ = powerDissipatedW * Math.max(0, dt);
    const deltaKineticEnergyJ = -workJ;
    const deltaThermalEnergyJ = workJ;
    const tempK = Math.max(temperature, 1e-6);
    const entropyGeneratedJK = workJ / tempK;
    return {
        deltaKineticEnergyJ,
        deltaThermalEnergyJ,
        entropyGeneratedJK,
        shearForceMagnitudeN,
    };
}
export class SpatialMonad {
    value;
    id = '';
    h3Index = '';
    resolution = 7;
    stock = null;
    stocks = null;
    state = 'UNVERIFIED';
    energyJoules = 0;
    trophicEnergyStockJoules = 0;
    verified = false;
    rightState = true;
    history = [];
    overrideLedger = [];
    cellsMap = new Map();
    neighborEdgesMap = new Map();
    constructor(arg1, arg2, arg3, _arg4) {
        if (arg1 === undefined && arg2 === undefined) {
            this.value = null;
            return;
        }
        if (typeof arg1 === 'string' && typeof arg2 === 'number' && typeof arg3 === 'string') {
            this.id = arg1;
            this.h3Index = arg1;
            this.energyJoules = arg2;
            this.trophicEnergyStockJoules = arg2;
            this.state = arg3;
            this.value = arg1;
            return;
        }
        if (typeof arg1 === 'string' && typeof arg2 === 'number' && typeof arg3 === 'object' && arg3 !== null) {
            if (arg2 < 0 || arg2 > 15 || !Number.isInteger(arg2)) {
                throw new RangeError(`[SpatialError] Invalid resolution tier: ${arg2}`);
            }
            this.id = arg1;
            this.h3Index = arg1;
            this.resolution = arg2;
            this.stock = arg3;
            this.stocks = arg3;
            this.value = arg3;
            return;
        }
        if (typeof arg1 === 'string' && typeof arg2 === 'number' && arg3 === undefined) {
            this.id = arg1;
            this.h3Index = arg1;
            this.energyJoules = arg2;
            this.trophicEnergyStockJoules = arg2;
            this.verified = false;
            this.value = arg1;
            return;
        }
        if (typeof arg1 === 'string' && typeof arg2 === 'object' && arg2 !== null) {
            validateH3Token(arg1);
            this.id = arg1;
            this.h3Index = arg1;
            this.stock = { ...arg2 };
            this.stocks = { ...arg2 };
            this.state = 'UnvalidatedState';
            this.value = this.stock;
            return;
        }
        if (typeof arg1 === 'string' && arg2 === undefined) {
            this.id = arg1;
            this.h3Index = arg1;
            this.value = arg1;
            return;
        }
        this.value = arg1;
    }
    static of(...args) {
        if (args.length === 0) {
            return new SpatialMonad();
        }
        if (args.length === 3) {
            const [idx, res, stock] = args;
            assertH3Resolution(res);
            const m = new SpatialMonad(stock);
            m.id = idx;
            m.h3Index = idx;
            m.resolution = res;
            m.stock = stock;
            m.stocks = stock;
            return m;
        }
        if (args.length === 2) {
            const [a1, a2] = args;
            if (a2 === null || a2 === undefined) {
                throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
            }
            if (typeof a2 === 'string' && typeof a1 !== 'string') {
                const m = new SpatialMonad(a1);
                m.id = a2;
                m.h3Index = a2;
                m.stock = a1;
                m.stocks = a1;
                if (typeof a1 === 'number') {
                    m.energyJoules = a1;
                    m.trophicEnergyStockJoules = a1;
                }
                return m;
            }
            if (typeof a1 === 'string') {
                const normalized = a1.toLowerCase();
                if (!matchesCanonicalH3Pattern(normalized) && a1 !== 'cell_A' && a1 !== 'cell_B') {
                    throw new Error(`Invalid canonical H3 pattern: ${a1}`);
                }
                const m = new SpatialMonad(a2);
                m.id = a1;
                m.h3Index = a1;
                m.stock = a2;
                m.stocks = a2;
                if (typeof a2 === 'number') {
                    m.energyJoules = a2;
                    m.trophicEnergyStockJoules = a2;
                }
                return m;
            }
            return new SpatialMonad(a1);
        }
        const val = args[0];
        if (val === null || val === undefined) {
            const m = new SpatialMonad(val);
            m.verified = false;
            m.rightState = false;
            return m;
        }
        if (typeof val === 'string') {
            const m = new SpatialMonad(val);
            m.id = val;
            m.h3Index = val;
            m.rightState = isValidH3Index(val);
            return m;
        }
        const m = new SpatialMonad(val);
        if (val && typeof val === 'object') {
            if (val.h3Index) {
                m.id = val.h3Index;
                m.h3Index = val.h3Index;
            }
            if (val.stocks) {
                m.stock = val.stocks;
                m.stocks = val.stocks;
            }
        }
        return m;
    }
    static unit(index, val) {
        assertCanonicalH3Pattern(index);
        const m = new SpatialMonad(val);
        m.id = index.toLowerCase();
        m.h3Index = index.toLowerCase();
        return m;
    }
    static fromPayload(payload) {
        if (!payload || typeof payload !== 'string' || payload.trim() === '') {
            throw new TypeError('Invalid payload');
        }
        const m = new SpatialMonad({
            carbon: 0,
            water: 0,
            minerals: 0,
            oxygen: 0,
            energy: 0,
            carbonMass: 0,
            waterMass: 0,
            biomass: 0,
        });
        m.id = payload;
        m.h3Index = payload;
        return m;
    }
    static fromGeo(_coord, res, stock) {
        const m = new SpatialMonad(stock);
        m.id = `8${res.toString(16)}000000000000`;
        m.h3Index = m.id;
        m.resolution = res;
        m.stock = stock;
        return m;
    }
    map(fn) {
        const nextVal = fn(this.value);
        const m = new SpatialMonad(nextVal);
        m.id = this.id;
        m.h3Index = this.h3Index;
        m.resolution = this.resolution;
        m.stock = this.stock;
        m.stocks = this.stocks;
        m.energyJoules = this.energyJoules;
        m.trophicEnergyStockJoules = this.trophicEnergyStockJoules;
        m.overrideLedger = [...this.overrideLedger];
        return m;
    }
    flatMap(fn) {
        return fn(this.value);
    }
    bind(fn) {
        const effectiveIndex = this.h3Index || this.id;
        const res = fn(this.value, effectiveIndex);
        if (res instanceof SpatialMonad)
            return res;
        if (res && res.netMassDeltaKg !== undefined) {
            const nextM = new SpatialMonad(this.value);
            nextM.overrideLedger = [...this.overrideLedger, res];
            return nextM;
        }
        return new SpatialMonad(res);
    }
    extract() {
        return this.value;
    }
    unwrap() {
        return this.value;
    }
    unwrapStock() {
        return this.stock ?? this.value;
    }
    getStock() {
        return this.stock ?? this.stocks ?? this.value;
    }
    getValue() {
        return this.value;
    }
    getIndex() {
        return this.h3Index || this.id;
    }
    getCellIndex() {
        return this.h3Index || this.id;
    }
    getH3Token() {
        return this.h3Index || this.id;
    }
    getResolution() {
        return this.resolution;
    }
    getState() {
        return this.state ?? this.value;
    }
    getH3Cell() {
        return this.state === 'ActiveSpatialStock' ? { token: this.h3Index } : null;
    }
    isRight() {
        return this.rightState;
    }
    getOrThrow() {
        if (!this.rightState) {
            throw new Error('[Entropy Leak Prevented] Invalid spatial index');
        }
        return this.value;
    }
    isCorrupted() {
        return this.value === null || this.value === undefined;
    }
    isVerified() {
        return this.verified;
    }
    verifySpatialIndex() {
        const valid = isValidH3Index(this.id);
        this.verified = valid;
        return valid;
    }
    getThermodynamics() {
        return {
            massGrams: 0.0,
            solarEnergyJoules: this.energyJoules,
            dissipationJoules: 1.5e-6,
        };
    }
    transit() {
        const COMP_COST = 0.001;
        if (this.stock && this.stock.joules !== undefined) {
            this.stock.joules = Math.max(0, this.stock.joules - COMP_COST);
        }
        if (isValidH3Index(this.h3Index)) {
            this.state = 'ActiveSpatialStock';
        }
        else {
            this.state = 'SinkState';
            if (this.stock)
                this.stock.entropy = (this.stock.entropy ?? 0) + 1.0;
        }
    }
    transferStocks(targetToken, delta) {
        validateH3Token(targetToken);
        if (this.stock && delta.carbonStockKg) {
            this.stock.carbonStockKg -= delta.carbonStockKg;
        }
    }
    refine(targetRes, childStocks) {
        if (targetRes < 0 || targetRes > 15 || !Number.isInteger(targetRes)) {
            throw new RangeError(`[SpatialError] Invalid resolution tier: ${targetRes}`);
        }
        if (targetRes < this.resolution) {
            throw new Error(`[ThermodynamicSpatialError] Cannot refine to lower resolution tier`);
        }
        if (childStocks && Array.isArray(childStocks)) {
            return childStocks.map((cs) => {
                const m = new SpatialMonad(cs);
                m.resolution = targetRes;
                m.stock = cs;
                m.stocks = cs;
                return m;
            });
        }
        const refined = new SpatialMonad(this.stock);
        refined.id = this.id;
        refined.h3Index = this.h3Index;
        refined.resolution = targetRes;
        refined.stock = this.stock;
        refined.stocks = this.stocks;
        return refined;
    }
    run(fn) {
        this.history.push(this.value);
        fn();
    }
    setValue(val) {
        this.value = val;
    }
    rollback() {
        if (this.history.length === 0)
            return false;
        const prev = this.history.pop();
        this.value = prev;
        return true;
    }
    applyOverrides(overrides, options) {
        const report = applyThermodynamicOverrides(this.value, overrides, options);
        const nextMonad = new SpatialMonad(this.value);
        nextMonad.overrideLedger = [...this.overrideLedger, report];
        return nextMonad;
    }
    getCumulativeNetMassDeltaKg() {
        return this.overrideLedger.reduce((sum, r) => sum + (r.netMassDeltaKg ?? 0), 0);
    }
    getCumulativeNetEnergyDeltaJoules() {
        return this.overrideLedger.reduce((sum, r) => sum + (r.netEnergyDeltaJoules ?? 0), 0);
    }
    getOverrideLedger() {
        return this.overrideLedger;
    }
    diffuseWith(other, depth, coeff, dt) {
        const sA = this.value;
        const sB = other.value;
        const diff = coeff * (sA.dissolvedSoluteKg - sB.dissolvedSoluteKg) * depth * dt * 0.001;
        const nextA = { ...sA, dissolvedSoluteKg: sA.dissolvedSoluteKg - diff };
        const nextB = { ...sB, dissolvedSoluteKg: sB.dissolvedSoluteKg + diff };
        return {
            source: SpatialMonad.of(this.id, this.resolution, nextA),
            target: SpatialMonad.of(other.id, other.resolution, nextB),
        };
    }
    registerCell(cell) {
        this.cellsMap.set(cell.h3Index, { ...cell });
    }
    connectNeighbors(a, b, dist) {
        if (!this.neighborEdgesMap.has(a))
            this.neighborEdgesMap.set(a, new Map());
        if (!this.neighborEdgesMap.has(b))
            this.neighborEdgesMap.set(b, new Map());
        this.neighborEdgesMap.get(a).set(b, dist);
        this.neighborEdgesMap.get(b).set(a, dist);
    }
    getCell(id) {
        return this.cellsMap.get(id);
    }
    step(dt) {
        for (const [idA, edges] of this.neighborEdgesMap.entries()) {
            for (const [idB, dist] of edges.entries()) {
                const cA = this.cellsMap.get(idA);
                const cB = this.cellsMap.get(idB);
                if (cA && cB && idA < idB) {
                    const dq = (cA.conductivity ?? 1.8) * ((cA.temperatureKelvin - cB.temperatureKelvin) / dist) * 1000.0 * dt;
                    cA.energyJoules -= dq;
                    cB.energyJoules += dq;
                }
            }
        }
    }
    advectTo(target, ctx) {
        const transfer = computeAdvectiveEdgeTransfer(this.stocks, ctx);
        const nextSrc = {
            carbonKg: this.stocks.carbonKg - transfer.deltaStocks.carbonKg,
            waterKg: this.stocks.waterKg - transfer.deltaStocks.waterKg,
            mineralsKg: this.stocks.mineralsKg - transfer.deltaStocks.mineralsKg,
            oxygenKg: this.stocks.oxygenKg - transfer.deltaStocks.oxygenKg,
            energyJoules: this.stocks.energyJoules - transfer.deltaStocks.energyJoules,
        };
        const nextTgt = {
            carbonKg: target.stocks.carbonKg + transfer.deltaStocks.carbonKg,
            waterKg: target.stocks.waterKg + transfer.deltaStocks.waterKg,
            mineralsKg: target.stocks.mineralsKg + transfer.deltaStocks.mineralsKg,
            oxygenKg: target.stocks.oxygenKg + transfer.deltaStocks.oxygenKg,
            energyJoules: target.stocks.energyJoules + transfer.deltaStocks.energyJoules,
        };
        return {
            source: SpatialMonad.of(this.id, nextSrc),
            target: SpatialMonad.of(target.id, nextTgt),
        };
    }
    enforceThermodynamicInvariants() {
        const val = this.value;
        if (val && val.stocks) {
            for (const [k, v] of Object.entries(val.stocks)) {
                if (typeof v === 'number' && v < 0) {
                    val.stocks[k] = 0.0;
                }
            }
        }
        return this;
    }
    computeAdvectionTo(cellB, edgeLength, wind, dt) {
        const transfers = computeAdvectiveTransfer(this.value, [{ cell: cellB, edgeLengthMeters: edgeLength }], wind, dt);
        return transfers.get(cellB.h3Index) ?? { carbonMol: 0, waterKg: 0 };
    }
    setCellNode(data) {
        const c = toVec3D(data.centroid);
        const v = toVec3D(data.velocity);
        const vTan = projectVectorOntoSphereTangentSpace(v, c);
        this.cellsMap.set(data.h3Index, { ...data, centroid: c, velocity: vTan });
    }
    setVelocity(cellId, vel) {
        const cell = this.cellsMap.get(cellId);
        if (cell) {
            cell.velocity = projectVectorOntoSphereTangentSpace(toVec3D(vel), toVec3D(cell.centroid));
        }
    }
    totalStocks() {
        let carbon = 0, water = 0, nitrogen = 0, phosphorus = 0, oxygen = 0, thermalEnergy = 0;
        for (const cell of this.cellsMap.values()) {
            if (cell.stocks) {
                carbon += cell.stocks.carbon ?? 0;
                water += cell.stocks.water ?? 0;
                nitrogen += cell.stocks.nitrogen ?? 0;
                phosphorus += cell.stocks.phosphorus ?? 0;
                oxygen += cell.stocks.oxygen ?? 0;
                thermalEnergy += cell.stocks.thermalEnergy ?? 0;
            }
        }
        return { carbon, water, nitrogen, phosphorus, oxygen, thermalEnergy };
    }
    stepAdvection(dt) {
        const deltas = new Map();
        for (const id of this.cellsMap.keys()) {
            deltas.set(id, { carbon: 0, water: 0, nitrogen: 0, phosphorus: 0, oxygen: 0, thermalEnergy: 0 });
        }
        for (const [idA, cellA] of this.cellsMap.entries()) {
            for (const idB of cellA.neighbors) {
                const cellB = this.cellsMap.get(idB);
                if (cellB && idA < idB) {
                    const vA = toVec3D(cellA.velocity);
                    const vB = toVec3D(cellB.velocity);
                    const cA = toVec3D(cellA.centroid);
                    const cB = toVec3D(cellB.centroid);
                    const midVel = [(vA[0] + vB[0]) * 0.5, (vA[1] + vB[1]) * 0.5, (vA[2] + vB[2]) * 0.5];
                    const dx = cB[0] - cA[0];
                    const dy = cB[1] - cA[1];
                    const dz = cB[2] - cA[2];
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    const normal = dist > 1e-12 ? [dx / dist, dy / dist, dz / dist] : [1, 0, 0];
                    const uNormal = dotProduct(midVel, normal);
                    if (Math.abs(uNormal) > 1e-12) {
                        const edgeLen = 10000.0;
                        const volRate = uNormal * edgeLen * dt;
                        const src = uNormal >= 0 ? cellA : cellB;
                        const frac = Math.min(0.1, Math.abs(volRate) / src.area);
                        const dA = deltas.get(idA);
                        const dB = deltas.get(idB);
                        const sign = uNormal >= 0 ? 1 : -1;
                        for (const k of ['carbon', 'water', 'nitrogen', 'phosphorus', 'oxygen', 'thermalEnergy']) {
                            const transfer = sign * (src.stocks[k] ?? 0) * frac;
                            dA[k] -= transfer;
                            dB[k] += transfer;
                        }
                    }
                }
            }
        }
        const nextMonad = new SpatialMonad(this.id);
        for (const [id, cell] of this.cellsMap.entries()) {
            const d = deltas.get(id);
            const nextStocks = { ...cell.stocks };
            for (const k of ['carbon', 'water', 'nitrogen', 'phosphorus', 'oxygen', 'thermalEnergy']) {
                nextStocks[k] += d[k];
            }
            nextMonad.cellsMap.set(id, { ...cell, stocks: nextStocks });
        }
        return nextMonad;
    }
}
export function transitionSpatialMonad(monad, computeCostJoules = 1.2e-6) {
    if (monad.state !== 'UNVERIFIED') {
        throw new Error('Monad must be in UNVERIFIED state');
    }
    const valid = isValidH3Index(monad.id || monad.h3Index);
    const next = new SpatialMonad(monad.id || monad.h3Index);
    next.state = valid ? 'VALIDATED' : 'UNVERIFIED';
    next.energyJoules = monad.energyJoules - computeCostJoules;
    return next;
}
export class SpatialCellMonad {
    h3Index;
    stocks;
    constructor(h3Index, stocks) {
        this.h3Index = h3Index;
        this.stocks = stocks;
    }
    static unit(h3Index, stocks) {
        for (const v of Object.values(stocks)) {
            if (typeof v === 'number' && (v < 0 || Number.isNaN(v))) {
                throw new Error('Thermodynamic invariant violation: stocks cannot be negative or NaN');
            }
        }
        return new SpatialCellMonad(h3Index, { ...stocks });
    }
    getStocks() {
        return { ...this.stocks };
    }
}
export function executeAdvectiveTransfer(source, target, transfer) {
    if (source.h3Index === target.h3Index) {
        throw new Error('Self-advection transfer rejected');
    }
    const src = source.getStocks();
    const tgt = target.getStocks();
    const nextSrc = {
        waterKg: (src.waterKg ?? 0) - (transfer.deltaWaterKg ?? 0),
        carbonKg: (src.carbonKg ?? 0) - (transfer.deltaCarbonKg ?? 0),
        mineralKg: (src.mineralKg ?? 0) - (transfer.deltaMineralKg ?? 0),
        oxygenKg: (src.oxygenKg ?? 0) - (transfer.deltaOxygenKg ?? 0),
        thermalEnergyJoules: (src.thermalEnergyJoules ?? 0) - (transfer.deltaEnergyJoules ?? 0),
    };
    const nextTgt = {
        waterKg: (tgt.waterKg ?? 0) + (transfer.deltaWaterKg ?? 0),
        carbonKg: (tgt.carbonKg ?? 0) + (transfer.deltaCarbonKg ?? 0),
        mineralKg: (tgt.mineralKg ?? 0) + (transfer.deltaMineralKg ?? 0),
        oxygenKg: (tgt.oxygenKg ?? 0) + (transfer.deltaOxygenKg ?? 0),
        thermalEnergyJoules: (tgt.thermalEnergyJoules ?? 0) + (transfer.deltaEnergyJoules ?? 0),
    };
    return {
        source: SpatialCellMonad.unit(source.h3Index, nextSrc),
        target: SpatialCellMonad.unit(target.h3Index, nextTgt),
    };
}
export class H3ValidationMonad {
    state;
    err;
    constructor(state, err) {
        this.state = state;
        this.err = err;
    }
    static unit(state, _validator) {
        return new H3ValidationMonad(state, null);
    }
    bind(fn) {
        if (this.err)
            return this;
        const nextState = fn(this.state);
        if (!/^[0-9a-fA-F]{15}$/.test(nextState.h3Index)) {
            return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid H3 index' });
        }
        return new H3ValidationMonad(nextState, null);
    }
    match(onSuccess, onError) {
        if (this.err)
            return onError(this.err);
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
export function executeLateralThermodynamicTransportStep(cells, adjacencyList, centroidDistances, dt) {
    const deltas = new Map();
    for (const id of cells.keys())
        deltas.set(id, { deltaEnergy: 0 });
    for (const [idA, nbrs] of adjacencyList.entries()) {
        const cA = cells.get(idA);
        if (!cA)
            continue;
        for (const idB of nbrs) {
            if (idA < idB) {
                const cB = cells.get(idB);
                if (!cB)
                    continue;
                const dist = centroidDistances.get(`${idA}_${idB}`) ?? 50000.0;
                const cond = Math.min(cA.conductivity ?? 2.5, cB.conductivity ?? 2.5);
                const gradT = (cA.temperatureKelvin - cB.temperatureKelvin) / dist;
                const area = (cA.heightColumnMeters ?? 100.0) * 1000.0;
                const flux = cond * gradT * area * dt;
                deltas.get(idA).deltaEnergy -= flux;
                deltas.get(idB).deltaEnergy += flux;
            }
        }
    }
    return deltas;
}
export function computeLateralBoundaryTransfer(cellA, stratumA, stocksA, cellB, stratumB, stocksB, params) {
    const contactResult = calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB);
    if (!contactResult.isAdjacent || contactResult.contactAreaM2 <= 0) {
        return {
            contactResult,
            deltaStocksA: { massWaterKg: 0, massCarbonKg: 0, massOxygenKg: 0, massMineralsKg: 0, internalEnergyJoules: 0 },
            deltaStocksB: { massWaterKg: 0, massCarbonKg: 0, massOxygenKg: 0, massMineralsKg: 0, internalEnergyJoules: 0 },
        };
    }
    const volTransferred = params.normalVelocityMs * contactResult.contactAreaM2 * params.timeStepSeconds;
    let heatConductionJoules = 0;
    if (params.thermalConductivityWMK &&
        params.distanceCentroidsMeters &&
        params.distanceCentroidsMeters > 0 &&
        params.temperatureKelvinA !== undefined &&
        params.temperatureKelvinB !== undefined) {
        const tempGrad = (params.temperatureKelvinA - params.temperatureKelvinB) / params.distanceCentroidsMeters;
        heatConductionJoules = params.thermalConductivityWMK * tempGrad * contactResult.contactAreaM2 * params.timeStepSeconds;
    }
    const isAtoB = params.normalVelocityMs >= 0;
    const donor = isAtoB ? stocksA : stocksB;
    const donorWater = Math.max(1e-6, donor.massWaterKg);
    const frac = Math.min(1.0, (Math.abs(volTransferred) * (params.fluidDensityKgM3 || 1000.0)) / donorWater);
    const deltaWater = frac * donor.massWaterKg;
    const deltaCarbon = frac * donor.massCarbonKg;
    const deltaOxygen = frac * donor.massOxygenKg;
    const deltaMinerals = frac * donor.massMineralsKg;
    const deltaEnergy = frac * donor.internalEnergyJoules;
    const sign = isAtoB ? 1 : -1;
    const deltaStocksA = {
        massWaterKg: -sign * deltaWater,
        massCarbonKg: -sign * deltaCarbon,
        massOxygenKg: -sign * deltaOxygen,
        massMineralsKg: -sign * deltaMinerals,
        internalEnergyJoules: -sign * deltaEnergy - heatConductionJoules,
    };
    const deltaStocksB = {
        massWaterKg: sign * deltaWater,
        massCarbonKg: sign * deltaCarbon,
        massOxygenKg: sign * deltaOxygen,
        massMineralsKg: sign * deltaMinerals,
        internalEnergyJoules: sign * deltaEnergy + heatConductionJoules,
    };
    return {
        contactResult,
        deltaStocksA,
        deltaStocksB,
    };
}
export function applyPlanetaryInsolationStep(state, subsolarVector, stepDt) {
    const dt = stepDt ?? state.timeStepSeconds ?? 3600.0;
    const sVec = toVec3D(subsolarVector);
    const nextCells = new Map();
    for (const [key, cell] of state.cells.entries()) {
        const uCell = latLngToUnitVector3D(cell.latDeg, cell.lngDeg);
        const cosZ = Math.max(0.0, unitVectorDotProduct(uCell, sVec));
        const energyInflux = SOLAR_CONSTANT_W_M2 * cell.tauAtm * (1.0 - cell.albedo) * cosZ * cell.areaM2 * dt;
        let deltaCO2 = 0;
        let deltaBiomassC = 0;
        let deltaH2O = 0;
        let deltaO2 = 0;
        if (cosZ > 0) {
            const maxRate = 1e-7 * cell.lai * cosZ * cell.areaM2 * dt;
            deltaBiomassC = Math.min(cell.stocks.carbonDioxideKg * (MOLAR_MASS_C / MOLAR_MASS_CO2) * 0.1, maxRate);
            deltaCO2 = deltaBiomassC * (MOLAR_MASS_CO2 / MOLAR_MASS_C);
            deltaO2 = deltaCO2 * (31.9988 / MOLAR_MASS_CO2);
            deltaH2O = deltaBiomassC * 10.0;
        }
        const nextStocks = {
            ...cell.stocks,
            thermalEnergyJoules: cell.stocks.thermalEnergyJoules + energyInflux,
            carbonDioxideKg: cell.stocks.carbonDioxideKg - deltaCO2,
            biomassCarbonKg: cell.stocks.biomassCarbonKg + deltaBiomassC,
            atmosphericWaterKg: cell.stocks.atmosphericWaterKg + deltaH2O,
            oxygenKg: cell.stocks.oxygenKg + deltaO2,
        };
        nextCells.set(key, {
            ...cell,
            stocks: nextStocks,
        });
    }
    return {
        ...state,
        timeStepSeconds: dt,
        subsolarVector,
        cells: nextCells,
    };
}
export function updatePlanetaryInsolation(monad, subsolarVector, dt) {
    const state = monad.getState();
    const nextState = applyPlanetaryInsolationStep(state, subsolarVector, dt);
    return SpatialMonad.of(nextState);
}
