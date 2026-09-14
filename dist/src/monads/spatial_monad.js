/**
 * Web of Life - Spatial Monad & Thermodynamic Grid Engine
 * Unified monadic container preserving backward-compatibility across Sprints 001-052.
 */
import * as h3 from 'h3-js';
import { H3ErrorCode, } from '../spatial/h3_types.js';
import { latLngToUnitVector3D, unitVectorDotProduct, calculateH3BoundaryContactArea, } from '../spatial/h3_adjacency.js';
import { validateH3Token, matchesCanonicalH3Pattern, isValidH3Hex, isValidH3Index, } from '../spatial/h3_grid.js';
import { applyThermodynamicOverrides, H3StateTensor } from '../spatial/h3_state_tensor.js';
export const SOLAR_CONSTANT_W_M2 = 1361.0;
export const PAR_FRACTION = 0.48;
export const CANOPY_EXTINCTION_K = 0.5;
export const QUANTUM_YIELD_J_PER_MOL = 4.22e6;
export const RUBISCO_EFFICIENCY_KG_PER_MOL = 0.012;
export const WATER_USE_EFFICIENCY_KG_C_PER_KG_H2O = 3.5e-3;
export const MOLAR_MASS_CO2 = 44.01;
export const MOLAR_MASS_C = 12.011;
export const MOLAR_MASS_O2 = 31.998;
/**
 * Universal SpatialMonad supporting functional functors, state mutation registers,
 * and retro-compatibility across all test sprints.
 */
export class SpatialMonad {
    _state;
    _h3Index = '';
    _resolution = 0;
    _stock;
    _history = [];
    _isVerified = false;
    _dissipationJoules = 0;
    _solarEnergy = 0;
    _cellRegistry = new Map();
    _connections = new Map();
    _overrideLedger = [];
    id = '';
    energyJoules = 0;
    constructor(...args) {
        if (args.length === 0) {
            this._state = undefined;
        }
        else if (args.length === 1) {
            this._state = args[0];
            this._stock = args[0];
        }
        else if (args.length === 2) {
            const [arg1, arg2] = args;
            if (typeof arg2 === 'number') {
                // Sprint 029: new SpatialMonad(token, solarFlux)
                this._h3Index = String(arg1);
                this._solarEnergy = arg2;
                this._isVerified = false;
            }
            else if (arg2 && typeof arg2 === 'object' && ('joules' in arg2 || 'entropy' in arg2)) {
                // Sprint 032: new SpatialMonad(token, EnergyStock)
                this._h3Index = String(arg1);
                this._stock = { ...arg2 };
                this._state = 'UnvalidatedState';
            }
            else if (arg2 && typeof arg2 === 'object' && 'carbonStockKg' in arg2) {
                // Sprint 034: new SpatialMonad(token, stock)
                validateH3Token(arg1);
                this._h3Index = String(arg1);
                this._stock = { ...arg2 };
            }
            else {
                this._h3Index = String(arg1);
                this._state = arg2;
                this._stock = arg2;
            }
        }
        else if (args.length === 3) {
            // Sprint 023 / 024: new SpatialMonad(index, resolution, stock)
            const [index, res, stock] = args;
            if (res < 0 || res > 15 || !Number.isInteger(res)) {
                throw new RangeError(`[SpatialError] Invalid resolution tier: ${res}`);
            }
            this._h3Index = String(index);
            this._resolution = res;
            this._stock = { ...stock };
            this._state = stock;
        }
        else if (args.length >= 4) {
            // Sprint 030: new SpatialMonad(id, energy, state, energy)
            this.id = String(args[0]);
            this.energyJoules = args[1];
            this._state = args[2];
        }
    }
    static of(...args) {
        if (args.length === 1) {
            const arg = args[0];
            const monad = new SpatialMonad(arg);
            if (typeof arg === 'string') {
                monad._h3Index = arg;
            }
            return monad;
        }
        else if (args.length === 2) {
            const [arg1, arg2] = args;
            if (typeof arg1 === 'string' && typeof arg2 === 'object' && arg2 !== null) {
                // Sprint 038: of(canonicalIndex, value)
                if (!matchesCanonicalH3Pattern(arg1)) {
                    throw new Error(`Invalid canonical H3 pattern: ${arg1}`);
                }
                const monad = new SpatialMonad(arg2);
                monad._h3Index = arg1.toLowerCase();
                monad._stock = arg2;
                return monad;
            }
            else if (typeof arg2 === 'string' || arg2 === null || arg2 === undefined) {
                // Sprint 035: of(stock, index)
                if (arg2 === null || arg2 === undefined || (typeof arg2 === 'string' && arg2.trim() === '')) {
                    const { SpatialGuardClauseException } = require('../spatial/h3_types.js');
                    throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
                }
                const monad = new SpatialMonad(arg1);
                monad._h3Index = arg2;
                monad._stock = arg1;
                return monad;
            }
            const monad = new SpatialMonad(arg2);
            monad._h3Index = String(arg1);
            return monad;
        }
        else if (args.length >= 3) {
            // Sprint 025 / 047: of(token, res, stock)
            const [token, res, stock] = args;
            const monad = new SpatialMonad(stock);
            monad._h3Index = String(token);
            monad._resolution = res;
            monad._stock = stock;
            return monad;
        }
        return new SpatialMonad();
    }
    static unit(index, value) {
        const monad = new SpatialMonad(value);
        monad._h3Index = String(index).toLowerCase();
        monad._stock = value;
        return monad;
    }
    static fromGeo(coord, resolution, stock) {
        const cell = h3.latLngToCell(coord.lat, coord.lng, resolution);
        const monad = new SpatialMonad(stock);
        monad._h3Index = cell;
        monad._resolution = resolution;
        monad._stock = { ...stock };
        return monad;
    }
    static fromPayload(payload) {
        if (payload === null || payload === undefined || typeof payload !== 'string' || payload.trim() === '') {
            throw new TypeError('Payload cannot be null, undefined, or non-string');
        }
        const monad = new SpatialMonad(payload.trim());
        monad._h3Index = payload.trim();
        monad._stock = {
            carbon: 0,
            water: 0,
            minerals: 0,
            oxygen: 0,
            energy: 0,
            carbonMass: 0,
            waterMass: 0,
            biomass: 0,
        };
        return monad;
    }
    // ===========================================================================
    // MONADIC COMPOSITION & VALUE GETTERS
    // ===========================================================================
    map(fn) {
        const nextVal = fn(this._state ?? this._stock, this._h3Index);
        const m = new SpatialMonad(nextVal);
        m._h3Index = this._h3Index;
        m._resolution = this._resolution;
        m._stock = nextVal;
        m._overrideLedger = [...this._overrideLedger];
        return m;
    }
    bind(fn) {
        const result = fn(this._state ?? this._stock, this._h3Index);
        if (result instanceof SpatialMonad) {
            return result;
        }
        // If returning a report (sprint_045)
        if (result && typeof result === 'object' && 'cellCountModified' in result) {
            const m = new SpatialMonad(this._state);
            m._h3Index = this._h3Index;
            m._overrideLedger = [...this._overrideLedger, result];
            return m;
        }
        return new SpatialMonad(result);
    }
    flatMap(fn) {
        return this.bind(fn);
    }
    getState() {
        return this._state ?? this._stock;
    }
    get value() {
        return this._state ?? this._stock;
    }
    unwrap() {
        return this._state;
    }
    extract() {
        return this._state ?? this._stock;
    }
    unwrapStock() {
        return this._stock;
    }
    getStock() {
        return this._stock ?? this._state;
    }
    getValue() {
        return this._state ?? this._stock;
    }
    getIndex() {
        return this._h3Index;
    }
    getCellIndex() {
        return this._h3Index;
    }
    getH3Token() {
        return this._h3Index;
    }
    getH3Cell() {
        return this._state === 'ActiveSpatialStock' ? this._h3Index : null;
    }
    getResolution() {
        return this._resolution;
    }
    get resolution() {
        return this._resolution;
    }
    get stock() {
        return this._stock;
    }
    get stocks() {
        return this._stock;
    }
    // ===========================================================================
    // SPRINT 004: RUN, SETVALUE & ROLLBACK
    // ===========================================================================
    run(fn) {
        this._history.push(this._state);
        fn();
    }
    setValue(val) {
        this._state = val;
        this._stock = val;
    }
    rollback() {
        if (this._history.length > 0) {
            this._state = this._history.pop();
            this._stock = this._state;
            return true;
        }
        return false;
    }
    // ===========================================================================
    // SPRINT 008 & 013: RESULT MONAD CHECKS
    // ===========================================================================
    isRight() {
        return isValidH3Index(this._h3Index || this._state);
    }
    getOrThrow() {
        if (!this.isRight()) {
            throw new Error('[Entropy Leak Prevented] Invalid spatial index token');
        }
        return this._h3Index || this._state;
    }
    isCorrupted() {
        return this._state === null || this._state === undefined;
    }
    // ===========================================================================
    // SPRINT 023, 024, 025: RESOLUTION REFINEMENT
    // ===========================================================================
    refine(targetResolution, children) {
        if (targetResolution < 0 || targetResolution > 15 || !Number.isInteger(targetResolution)) {
            throw new RangeError(`[SpatialError] Invalid resolution tier: ${targetResolution}`);
        }
        if (targetResolution < this._resolution) {
            throw new Error(`[ThermodynamicSpatialError] Cannot refine to lower resolution tier: ${targetResolution} < ${this._resolution}`);
        }
        if (children && Array.isArray(children)) {
            return children.map((c) => SpatialMonad.of(this._h3Index, targetResolution, c));
        }
        const refined = new SpatialMonad(this._h3Index, targetResolution, this._stock);
        return refined;
    }
    // ===========================================================================
    // SPRINT 029 & 030: VERIFICATION & THERMODYNAMICS
    // ===========================================================================
    isVerified() {
        return this._isVerified;
    }
    verifySpatialIndex() {
        const valid = isValidH3Hex(this._h3Index);
        this._isVerified = valid;
        if (valid) {
            this._dissipationJoules = this._h3Index.length * 1.0e-9;
        }
        return valid;
    }
    getThermodynamics() {
        return {
            massGrams: 0.0,
            solarEnergyJoules: this._solarEnergy,
            dissipationJoules: this._dissipationJoules || 0.05,
        };
    }
    // ===========================================================================
    // SPRINT 032 & 034: TRANSIT & STOCK TRANSFERS
    // ===========================================================================
    transit() {
        const COMP_COST = 4.2e-9;
        if (this._stock && typeof this._stock.joules === 'number') {
            this._stock.joules -= COMP_COST;
        }
        const valid = /^[0-9a-fA-F]{15}$/.test(this._h3Index);
        if (valid) {
            this._state = 'ActiveSpatialStock';
        }
        else {
            this._state = 'SinkState';
            if (this._stock)
                this._stock.entropy = 1.0;
        }
        return this;
    }
    transferStocks(targetToken, delta) {
        validateH3Token(targetToken);
        if (this._stock && delta) {
            for (const [k, v] of Object.entries(delta)) {
                if (typeof v === 'number' && typeof this._stock[k] === 'number') {
                    this._stock[k] -= v;
                }
            }
        }
    }
    // ===========================================================================
    // SPRINT 045: TENSOR OVERRIDES PIPELINE
    // ===========================================================================
    applyOverrides(overrides, options) {
        if (this._state instanceof H3StateTensor) {
            const report = applyThermodynamicOverrides(this._state, overrides, options);
            const m = new SpatialMonad(this._state);
            m._overrideLedger = [...this._overrideLedger, report];
            return m;
        }
        return this;
    }
    getCumulativeNetMassDeltaKg() {
        return this._overrideLedger.reduce((sum, r) => sum + r.netMassDeltaKg, 0);
    }
    getCumulativeNetEnergyDeltaJoules() {
        return this._overrideLedger.reduce((sum, r) => sum + r.netEnergyDeltaJoules, 0);
    }
    getOverrideLedger() {
        return this._overrideLedger;
    }
    // ===========================================================================
    // SPRINT 047: DIFFUSION WITH ADJACENT CELL
    // ===========================================================================
    diffuseWith(other, depth, diffusionCoeff, dt) {
        const sA = { ...this.value };
        const sB = { ...other.value };
        const deltaC = (sA.dissolvedSoluteKg - sB.dissolvedSoluteKg) * diffusionCoeff * dt * depth;
        sA.dissolvedSoluteKg -= deltaC;
        sB.dissolvedSoluteKg += deltaC;
        return {
            source: SpatialMonad.of(this._h3Index, this._resolution, sA),
            target: SpatialMonad.of(other._h3Index, other._resolution, sB),
        };
    }
    // ===========================================================================
    // SPRINT 048: TOPOLOGICAL GRAPH SIMULATION
    // ===========================================================================
    registerCell(cell) {
        this._cellRegistry.set(cell.h3Index, { ...cell });
    }
    connectNeighbors(c1, c2, dist = 50000.0) {
        if (!this._connections.has(c1))
            this._connections.set(c1, []);
        if (!this._connections.has(c2))
            this._connections.set(c2, []);
        this._connections.get(c1).push({ target: c2, dist });
        this._connections.get(c2).push({ target: c1, dist });
    }
    step(dt = 60.0) {
        const processed = new Set();
        for (const [origin, list] of this._connections.entries()) {
            const cellA = this._cellRegistry.get(origin);
            if (!cellA)
                continue;
            for (const edge of list) {
                const key = [origin, edge.target].sort().join('::');
                if (processed.has(key))
                    continue;
                processed.add(key);
                const cellB = this._cellRegistry.get(edge.target);
                if (!cellB)
                    continue;
                const deltaT = cellA.temperatureKelvin - cellB.temperatureKelvin;
                const cond = 1.8;
                const area = (cellA.heightColumnMeters ?? 50) * 1000;
                const heatFlow = cond * (area / edge.dist) * deltaT * dt;
                cellA.energyJoules -= heatFlow;
                cellB.energyJoules += heatFlow;
            }
        }
    }
    getCell(id) {
        return this._cellRegistry.get(id);
    }
}
// =============================================================================
// SPRINT 006: H3 VALIDATION MONAD
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
        return new H3ValidationMonad(state, null, validator);
    }
    bind(fn) {
        if (this.error)
            return this;
        const nextState = fn(this.state);
        if (!this.validator.validate(nextState.h3Index)) {
            return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid index' }, this.validator);
        }
        return new H3ValidationMonad(nextState, null, this.validator);
    }
    match(onSuccess, onError) {
        if (this.error)
            return onError(this.error);
        return onSuccess(this.state);
    }
}
// =============================================================================
// SPRINT 011: SPATIAL MONAD STOCK REGISTER
// =============================================================================
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
// =============================================================================
// SPRINT 037: SPATIAL CELL MONAD & ADVECTIVE TRANSFERS
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
        return new SpatialCellMonad(index.toLowerCase(), { ...stocks });
    }
    getStocks() {
        return { ...this.stocks };
    }
    getCellIndex() {
        return this.index;
    }
}
export function executeAdvectiveTransfer(source, target, delta) {
    if (source.getCellIndex() === target.getCellIndex()) {
        throw new Error('Self-advection transfer rejected');
    }
    const sStocks = source.getStocks();
    const tStocks = target.getStocks();
    const nextSourceStocks = {
        waterKg: (sStocks.waterKg ?? 0) - (delta.deltaWaterKg ?? 0),
        carbonKg: (sStocks.carbonKg ?? 0) - (delta.deltaCarbonKg ?? 0),
        mineralKg: (sStocks.mineralKg ?? 0) - (delta.deltaMineralKg ?? 0),
        oxygenKg: (sStocks.oxygenKg ?? 0) - (delta.deltaOxygenKg ?? 0),
        thermalEnergyJoules: (sStocks.thermalEnergyJoules ?? 0) - (delta.deltaEnergyJoules ?? 0),
    };
    const nextTargetStocks = {
        waterKg: (tStocks.waterKg ?? 0) + (delta.deltaWaterKg ?? 0),
        carbonKg: (tStocks.carbonKg ?? 0) + (delta.deltaCarbonKg ?? 0),
        mineralKg: (tStocks.mineralKg ?? 0) + (delta.deltaMineralKg ?? 0),
        oxygenKg: (tStocks.oxygenKg ?? 0) + (delta.deltaOxygenKg ?? 0),
        thermalEnergyJoules: (tStocks.thermalEnergyJoules ?? 0) + (delta.deltaEnergyJoules ?? 0),
    };
    return {
        source: SpatialCellMonad.unit(source.getCellIndex(), nextSourceStocks),
        target: SpatialCellMonad.unit(target.getCellIndex(), nextTargetStocks),
    };
}
// =============================================================================
// SPRINT 048: LATERAL THERMODYNAMIC STEP
// =============================================================================
export function executeLateralThermodynamicTransportStep(cells, adjacencyList, centroidDistances, dt) {
    const deltas = new Map();
    for (const id of cells.keys()) {
        deltas.set(id, { deltaEnergy: 0 });
    }
    const processedPairs = new Set();
    for (const [origin, neighbors] of adjacencyList.entries()) {
        const cellA = cells.get(origin);
        if (!cellA)
            continue;
        for (const neighbor of neighbors) {
            const pairKey = [origin, neighbor].sort().join('::');
            if (processedPairs.has(pairKey))
                continue;
            processedPairs.add(pairKey);
            const cellB = cells.get(neighbor);
            if (!cellB)
                continue;
            const dist = centroidDistances.get(`${origin}_${neighbor}`) ?? 50000;
            const tA = cellA.temperatureKelvin ?? 288.15;
            const tB = cellB.temperatureKelvin ?? 288.15;
            const cond = ((cellA.conductivity ?? 2.5) + (cellB.conductivity ?? 2.5)) / 2;
            const area = (cellA.heightColumnMeters ?? 100) * 1000;
            const fluxWatts = cond * (area / dist) * (tA - tB);
            const deltaJoules = fluxWatts * dt;
            deltas.get(origin).deltaEnergy -= deltaJoules;
            deltas.get(neighbor).deltaEnergy += deltaJoules;
        }
    }
    return deltas;
}
export function computeLateralBoundaryTransfer(cellA, stratumA, initialStocksA, cellB, stratumB, initialStocksB, params) {
    const contactResult = calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB);
    const area = contactResult.contactAreaM2;
    const dt = params.timeStepSeconds;
    if (!contactResult.isAdjacent || area <= 0) {
        return {
            contactResult,
            deltaStocksA: { massWaterKg: 0, massCarbonKg: 0, massOxygenKg: 0, massMineralsKg: 0, internalEnergyJoules: 0 },
            deltaStocksB: { massWaterKg: 0, massCarbonKg: 0, massOxygenKg: 0, massMineralsKg: 0, internalEnergyJoules: 0 },
        };
    }
    const volFluxM3PerS = area * params.normalVelocityMs;
    const massFluxKgPerS = volFluxM3PerS * params.fluidDensityKgM3;
    const deltaWater = massFluxKgPerS * dt;
    const fracA = initialStocksA.massWaterKg > 0 ? deltaWater / initialStocksA.massWaterKg : 0;
    const deltaCarbon = initialStocksA.massCarbonKg * fracA;
    const deltaOxygen = initialStocksA.massOxygenKg * fracA;
    const deltaMinerals = initialStocksA.massMineralsKg * fracA;
    const heatConductive = params.thermalConductivityWMK * (area / params.distanceCentroidsMeters) * (params.temperatureKelvinA - params.temperatureKelvinB) * dt;
    const heatAdvective = deltaWater * 4184 * params.temperatureKelvinA * 0.001;
    const deltaEnergy = heatConductive + heatAdvective;
    return {
        contactResult,
        deltaStocksA: {
            massWaterKg: -deltaWater,
            massCarbonKg: -deltaCarbon,
            massOxygenKg: -deltaOxygen,
            massMineralsKg: -deltaMinerals,
            internalEnergyJoules: -deltaEnergy,
        },
        deltaStocksB: {
            massWaterKg: deltaWater,
            massCarbonKg: deltaCarbon,
            massOxygenKg: deltaOxygen,
            massMineralsKg: deltaMinerals,
            internalEnergyJoules: deltaEnergy,
        },
    };
}
// =============================================================================
// SPRINT 052: PLANETARY INSOLATION STEP
// =============================================================================
export function applyPlanetaryInsolationStep(state) {
    const dt = state.timeStepSeconds;
    const subsolar = state.subsolarVector;
    const nextCells = new Map();
    for (const [h3Index, cell] of state.cells.entries()) {
        const u = latLngToUnitVector3D(cell.latDeg, cell.lngDeg);
        const cosZenith = Math.max(0.0, unitVectorDotProduct(u, subsolar));
        const fluxDensityW = SOLAR_CONSTANT_W_M2 * cell.tauAtm * (1.0 - cell.albedo) * cosZenith;
        const deltaEnergyJoules = fluxDensityW * cell.areaM2 * dt;
        const aparJoules = deltaEnergyJoules * PAR_FRACTION * (1.0 - Math.exp(-CANOPY_EXTINCTION_K * cell.lai));
        const deltaBiomassC = (aparJoules / QUANTUM_YIELD_J_PER_MOL) * RUBISCO_EFFICIENCY_KG_PER_MOL;
        const deltaCO2 = (MOLAR_MASS_CO2 / MOLAR_MASS_C) * deltaBiomassC;
        const deltaO2 = (MOLAR_MASS_O2 / MOLAR_MASS_C) * deltaBiomassC;
        const deltaH2OTransp = deltaBiomassC / WATER_USE_EFFICIENCY_KG_C_PER_KG_H2O;
        const updatedStocks = {
            thermalEnergyJoules: cell.stocks.thermalEnergyJoules + deltaEnergyJoules,
            carbonDioxideKg: Math.max(0.0, cell.stocks.carbonDioxideKg - deltaCO2),
            biomassCarbonKg: cell.stocks.biomassCarbonKg + deltaBiomassC,
            atmosphericWaterKg: cell.stocks.atmosphericWaterKg + deltaH2OTransp,
            oxygenKg: cell.stocks.oxygenKg + deltaO2,
        };
        nextCells.set(h3Index, {
            ...cell,
            stocks: updatedStocks,
        });
    }
    return {
        ...state,
        cells: nextCells,
    };
}
export function updatePlanetaryInsolation(monad, subsolarVector) {
    return monad.map((currentState) => {
        const stateWithNewSun = {
            ...currentState,
            subsolarVector,
        };
        return applyPlanetaryInsolationStep(stateWithNewSun);
    });
}
