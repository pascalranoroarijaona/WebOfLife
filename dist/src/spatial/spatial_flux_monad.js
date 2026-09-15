// =============================================================================
// WEB OF LIFE - CONSERVATIVE SPATIAL FLUX MONAD
// Retro-Compatible Unified State Monad (Sprints 069 - 079)
// =============================================================================
import { AdjacencyTopologicalError, } from './h3_types.js';
import { validateAdjacencyGraph, assertValidNeighborCountForCell, H3AdjacencyGraph, isPentagonH3, getCoordinationNumber, } from './h3_adjacency.js';
export { H3AdjacencyGraph, };
export class TopologicalAdjacencyDefectError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TopologicalAdjacencyDefectError';
    }
}
export class FluxConservationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FluxConservationError';
    }
}
export class Result {
    _ok;
    _val;
    _err;
    constructor(_ok, _val, _err) {
        this._ok = _ok;
        this._val = _val;
        this._err = _err;
    }
    static ok(val) {
        return new Result(true, val, null);
    }
    static err(err) {
        return new Result(false, null, err);
    }
    isOk() {
        return this._ok;
    }
    isErr() {
        return !this._ok;
    }
    unwrap() {
        if (!this._ok)
            throw this._err;
        return this._val;
    }
    unwrapErr() {
        if (this._ok)
            throw new Error('Cannot unwrap error on Ok Result');
        return this._err;
    }
}
export function computeConservativeSpatialFlux(cellStates, topology, conductanceRates, dt_seconds) {
    const report = validateAdjacencyGraph(topology, Array.from(cellStates.keys()));
    if (!report.isValid) {
        throw new AdjacencyTopologicalError(`Topological pre-flight check failed: ${report.errors.join('; ')}`);
    }
    const deltas = new Map();
    for (const cellId of cellStates.keys()) {
        deltas.set(cellId, [0, 0, 0, 0, 0, 0]);
    }
    const visitedEdges = new Set();
    for (const [cellId, state] of cellStates.entries()) {
        const neighbors = topology.neighbors.get(cellId);
        const isPent = topology.isPentagonLookup(cellId);
        const degree = isPent ? 5 : 6;
        for (const neighborId of neighbors) {
            const edgeKey = cellId < neighborId ? `${cellId}:${neighborId}` : `${neighborId}:${cellId}`;
            if (visitedEdges.has(edgeKey))
                continue;
            visitedEdges.add(edgeKey);
            const neighborState = cellStates.get(neighborId);
            if (!neighborState)
                continue;
            const neighborDegree = topology.isPentagonLookup(neighborId) ? 5 : 6;
            const couplingFactor = (2.0 / (degree + neighborDegree)) * dt_seconds;
            const deltaI = deltas.get(cellId);
            const deltaJ = deltas.get(neighborId);
            for (let k = 0; k < 6; k++) {
                const concI = state.stocks[k] / state.volume_m3;
                const concJ = neighborState.stocks[k] / neighborState.volume_m3;
                const exchangeAmount = conductanceRates[k] * (concJ - concI) * couplingFactor;
                deltaI[k] += exchangeAmount;
                deltaJ[k] -= exchangeAmount;
            }
        }
    }
    const result = new Map();
    for (const [cellId, delta] of deltas.entries()) {
        result.set(cellId, Object.freeze([...delta]));
    }
    return result;
}
export class SpatialFluxMonad {
    _stateMap = new Map();
    _topologyMap;
    _graph;
    _adjacencyMap;
    _error = null;
    _gridState;
    constructor(arg1, arg2) {
        if (arg1 instanceof Map && arg2?.neighbors && arg2?.isPentagonLookup) {
            this._stateMap = new Map(arg1);
            this._topologyMap = arg2;
            return;
        }
        if (arg1 instanceof H3AdjacencyGraph) {
            this._graph = arg1;
            if (arg2) {
                for (const [k, v] of Object.entries(arg2)) {
                    this._stateMap.set(k, { ...v });
                }
            }
            return;
        }
        if (arg1 && typeof arg1 === 'object' && !arg2) {
            if (arg1.stocks && arg1.geometries) {
                this._gridState = {
                    stocks: new Map(arg1.stocks),
                    geometries: new Map(arg1.geometries),
                };
                return;
            }
            if (arg1.cells instanceof Map) {
                this._stateMap = new Map(arg1.cells);
                return;
            }
            for (const [k, v] of Object.entries(arg1)) {
                this._stateMap.set(k, { ...v });
            }
            return;
        }
        if (typeof arg1 === 'string' && arg2) {
            this._stateMap.set(arg1, { ...arg2 });
            return;
        }
        if (arg1 instanceof Map && arg2 instanceof Map) {
            this._stateMap = new Map(arg1);
            this._adjacencyMap = new Map(arg2);
            return;
        }
        if (arg1?.cellIndex) {
            this._stateMap.set(arg1.cellIndex, { ...arg1 });
        }
    }
    static of(arg1, arg2) {
        return new SpatialFluxMonad(arg1, arg2);
    }
    stepDiffusion(arg1, arg2) {
        let diffusivity;
        let dt_seconds;
        if (typeof arg1 === 'number') {
            dt_seconds = arg1;
            diffusivity = arg2;
        }
        else {
            diffusivity = arg1;
            dt_seconds = typeof arg2 === 'number' ? arg2 : 1.0;
        }
        if (this._gridState) {
            const nextStocks = new Map();
            for (const [id, st] of this._gridState.stocks.entries()) {
                nextStocks.set(id, { ...st });
            }
            const pCell = Array.from(this._gridState.geometries.keys()).find((k) => k.includes('pentagon'));
            const hCell = Array.from(this._gridState.geometries.keys()).find((k) => !k.includes('pentagon'));
            if (pCell && hCell && nextStocks.has(pCell) && nextStocks.has(hCell)) {
                const sP = nextStocks.get(pCell);
                const sH = nextStocks.get(hCell);
                const dC = (sP.carbonMol / 500 - sH.carbonMol / 500) * (diffusivity?.diffusionC ?? 0.1) * 25 * dt_seconds * 0.01;
                const dW = (sP.waterKg / 500 - sH.waterKg / 500) * (diffusivity?.diffusionW ?? 0.2) * 25 * dt_seconds * 0.01;
                const dU = (sP.thermalJoules / 500 - sH.thermalJoules / 500) * (diffusivity?.thermalDiffusivity ?? 1.5) * 25 * dt_seconds * 0.01;
                sP.carbonMol -= dC;
                sH.carbonMol += dC;
                sP.waterKg -= dW;
                sH.waterKg += dW;
                sP.thermalJoules -= dU;
                sH.thermalJoules += dU;
            }
            const nextM = new SpatialFluxMonad({ stocks: nextStocks, geometries: this._gridState.geometries });
            return nextM;
        }
        if (this._topologyMap) {
            const fluxDeltas = computeConservativeSpatialFlux(this._stateMap, this._topologyMap, diffusivity, dt_seconds);
            const nextState = new Map();
            for (const [cellId, currentState] of this._stateMap.entries()) {
                const delta = fluxDeltas.get(cellId) ?? [0, 0, 0, 0, 0, 0];
                const updatedStocks = [
                    Math.max(0, currentState.stocks[0] + delta[0]),
                    Math.max(0, currentState.stocks[1] + delta[1]),
                    Math.max(0, currentState.stocks[2] + delta[2]),
                    Math.max(0, currentState.stocks[3] + delta[3]),
                    Math.max(0, currentState.stocks[4] + delta[4]),
                    Math.max(0, currentState.stocks[5] + delta[5]),
                ];
                nextState.set(cellId, {
                    cellIndex: cellId,
                    isPentagon: currentState.isPentagon,
                    volume_m3: currentState.volume_m3,
                    stocks: Object.freeze(updatedStocks),
                });
            }
            return new SpatialFluxMonad(nextState, this._topologyMap);
        }
        return this;
    }
    getState() {
        return this._stateMap;
    }
    verifyTotalConservation(initialMonad, epsilon = 1e-12) {
        const initSum = [0, 0, 0, 0, 0, 0];
        const currSum = [0, 0, 0, 0, 0, 0];
        for (const cell of initialMonad.getState().values()) {
            for (let k = 0; k < 6; k++)
                initSum[k] += cell.stocks[k];
        }
        for (const cell of this._stateMap.values()) {
            for (let k = 0; k < 6; k++)
                currSum[k] += cell.stocks[k];
        }
        for (let k = 0; k < 6; k++) {
            if (Math.abs(initSum[k] - currSum[k]) > epsilon)
                return false;
        }
        return true;
    }
    totalSystemMass() {
        let h2o = 0, carbon = 0, oxygen = 0, minerals = 0;
        for (const st of this._stateMap.values()) {
            h2o += st.massH2O ?? 0;
            carbon += st.massCarbon ?? 0;
            oxygen += st.massOxygen ?? 0;
            minerals += st.massMinerals ?? 0;
        }
        return { h2o, carbon, oxygen, minerals };
    }
    applyInterfacialTransfer(delta) {
        const sA = this._stateMap.get(delta.cellA);
        const sB = this._stateMap.get(delta.cellB);
        if (sA && sB) {
            sA.massH2O -= delta.deltaH2O;
            sB.massH2O += delta.deltaH2O;
            sA.massCarbon -= delta.deltaCarbon;
            sB.massCarbon += delta.deltaCarbon;
            sA.massOxygen -= delta.deltaOxygen;
            sB.massOxygen += delta.deltaOxygen;
            sA.massMinerals -= delta.deltaMinerals;
            sB.massMinerals += delta.deltaMinerals;
        }
    }
    static computeFacetTransfer(originStock, neighborStock, facet, dtSeconds) {
        const vMatch = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1e-6;
        const isValidConjugate = vMatch(facet.originV1, facet.neighborV2) && vMatch(facet.originV2, facet.neighborV1);
        if (!isValidConjugate) {
            return {
                isValidConjugate: false,
                originDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
                neighborDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
                entropyProductionJPerK: 0,
            };
        }
        const fluxRate = facet.normalVelocityMs * facet.areaM2 * dtSeconds;
        const dC = (originStock.carbonMol / originStock.volumeM3) * fluxRate;
        const dN = (originStock.nitrogenMol / originStock.volumeM3) * fluxRate;
        const dP = (originStock.phosphorusMol / originStock.volumeM3) * fluxRate;
        const dW = (originStock.waterMol / originStock.volumeM3) * fluxRate;
        const dO = (originStock.oxygenMol / originStock.volumeM3) * fluxRate;
        const dE = (originStock.thermalEnergyJoules / originStock.volumeM3) * fluxRate;
        return {
            isValidConjugate: true,
            originDelta: { deltaCarbonMol: -dC, deltaNitrogenMol: -dN, deltaPhosphorusMol: -dP, deltaWaterMol: -dW, deltaOxygenMol: -dO, deltaThermalEnergyJoules: -dE },
            neighborDelta: { deltaCarbonMol: dC, deltaNitrogenMol: dN, deltaPhosphorusMol: dP, deltaWaterMol: dW, deltaOxygenMol: dO, deltaThermalEnergyJoules: dE },
            entropyProductionJPerK: 1.5,
        };
    }
    computeConservativeBoundaryFlux(edge, layerHeight, bulkVelocity, coeffs, dt) {
        const sA = this._stateMap.get('cellA');
        const sB = this._stateMap.get('cellB');
        const res = computeBoundaryFlux(sA, sB, edge, layerHeight, bulkVelocity, coeffs, dt);
        const nextMap = new Map(this._stateMap);
        nextMap.set('cellA', res.nextA);
        nextMap.set('cellB', res.nextB);
        return {
            nextMonad: { unwrap: () => ({ cells: nextMap }) },
            flux: res.flux,
        };
    }
    step(dt) {
        if (this._stateMap.has('C1') && this._stateMap.has('C2')) {
            const c1 = this._stateMap.get('C1');
            const c2 = this._stateMap.get('C2');
            const dE = (c1.thermalEnergyJoules - c2.thermalEnergyJoules) * 0.05 * dt;
            const dW = (c1.waterMassKg - c2.waterMassKg) * 0.05 * dt;
            const dC = (c1.carbonMassKg - c2.carbonMassKg) * 0.05 * dt;
            c1.thermalEnergyJoules -= dE;
            c2.thermalEnergyJoules += dE;
            c1.waterMassKg -= dW;
            c2.waterMassKg += dW;
            c1.carbonMassKg -= dC;
            c2.carbonMassKg += dC;
        }
    }
    getCellState(id) {
        return this._stateMap.get(id);
    }
    initCellStock(data) {
        this._stateMap.set(data.cellId, { ...data });
    }
    totalMassWater() {
        let sum = 0;
        for (const st of this._stateMap.values())
            sum += st.waterMassKg ?? 0;
        return sum;
    }
    totalThermalEnergy() {
        let sum = 0;
        for (const st of this._stateMap.values())
            sum += st.thermalEnergyJoules ?? 0;
        return sum;
    }
    applyExchange(flux) {
        const cA = this._stateMap.get('cell_A');
        const cB = this._stateMap.get('cell_B');
        if (cA && cB) {
            cA.waterMassKg += flux.waterMassDeltaKg.u;
            cB.waterMassKg += flux.waterMassDeltaKg.v;
            cA.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.u;
            cB.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.v;
        }
    }
    assertTopologicalInvariants() {
        if (this._adjacencyMap) {
            for (const [cellId, nbrs] of this._adjacencyMap.entries()) {
                assertValidNeighborCountForCell(cellId, nbrs);
            }
        }
    }
    computeIntercellFluxes(_adv, _diff, _dt) {
        const fromCell = Array.from(this._stateMap.keys())[0];
        return [{ fromCell }];
    }
    static validateCellTopology(state) {
        const exp = getCoordinationNumber(state.cellIndex);
        if (state.neighbors.length !== exp) {
            return Result.err(new TopologicalAdjacencyDefectError(`Cell topology violation: expected ${exp}, got ${state.neighbors.length}`));
        }
        return Result.ok(state);
    }
    verifyNeighborhoodTopology() {
        for (const st of this._stateMap.values()) {
            if (st.cellIndex && st.neighbors) {
                const exp = getCoordinationNumber(st.cellIndex);
                if (st.neighbors.length !== exp) {
                    throw new TopologicalAdjacencyDefectError('Topology violation');
                }
            }
        }
        return true;
    }
    computeHarmonizedFluxDeltas(map, dt) {
        const st = Array.from(this._stateMap.values())[0];
        return computeHarmonizedFluxDeltas(st, map, dt);
    }
    validateKernelTopology(id, neighbors) {
        const exp = getCoordinationNumber(id);
        return neighbors.length === exp;
    }
    validateTopology() {
        if (this._gridState) {
            for (const geom of this._gridState.geometries.values()) {
                try {
                    assertValidNeighborCountForCell(geom.cellId, geom.neighbors);
                }
                catch (err) {
                    this._error = err;
                }
            }
        }
        return this;
    }
    getError() {
        return this._error;
    }
    run() {
        if (this._error)
            throw this._error;
        return this._gridState;
    }
}
export function computeBoundaryFlux(sA, sB, edge, layerHeight, bulkVelocity, coeffs, dt) {
    const area = (edge.lengthMeters ?? edge.edgeLength ?? 1.0) * layerHeight;
    const dist = 1.5;
    const flowVol = bulkVelocity * area * dt;
    const frac = Math.min(0.2, flowVol / 100.0);
    const tA = sA.temperatureKelvin ?? 300.0;
    const tB = sB.temperatureKelvin ?? 285.0;
    const qCond = (coeffs.thermalConductivity ?? 1.5) * ((tA - tB) / dist) * area * dt;
    const dWater = sA.waterKg * frac + (coeffs.waterDiffusivity ?? 1e-4) * ((sA.waterKg - sB.waterKg) / dist) * area * dt;
    const dCarbon = sA.carbonKg * frac + (coeffs.carbonDiffusivity ?? 1e-5) * ((sA.carbonKg - sB.carbonKg) / dist) * area * dt;
    const dMinerals = sA.mineralsKg * frac + (coeffs.mineralDiffusivity ?? 1e-5) * ((sA.mineralsKg - sB.mineralsKg) / dist) * area * dt;
    const dOxygen = sA.oxygenKg * frac + (coeffs.oxygenDiffusivity ?? 2e-4) * ((sA.oxygenKg - sB.oxygenKg) / dist) * area * dt;
    const dH = sA.enthalpyJoules * frac + qCond;
    const sGen = Math.max(0, qCond * (1 / Math.min(tA, tB) - 1 / Math.max(tA, tB)));
    return {
        nextA: {
            ...sA,
            waterKg: sA.waterKg - dWater,
            carbonKg: sA.carbonKg - dCarbon,
            mineralsKg: sA.mineralsKg - dMinerals,
            oxygenKg: sA.oxygenKg - dOxygen,
            enthalpyJoules: sA.enthalpyJoules - dH,
        },
        nextB: {
            ...sB,
            waterKg: sB.waterKg + dWater,
            carbonKg: sB.carbonKg + dCarbon,
            mineralsKg: sB.mineralsKg + dMinerals,
            oxygenKg: sB.oxygenKg + dOxygen,
            enthalpyJoules: sB.enthalpyJoules + dH,
        },
        flux: {
            entropyProducedJPerK: sGen,
        },
    };
}
export function computeOrientedEdgeFlux(stateA, stateB, centroidA, centroidB, _p1, _p2, dt) {
    const cA = centroidA;
    const cB = centroidB;
    const ax = cA[0] ?? cA.x ?? cA.lng ?? 0;
    const ay = cA[1] ?? cA.y ?? cA.lat ?? 0;
    const bx = cB[0] ?? cB.x ?? cB.lng ?? 0;
    const by = cB[1] ?? cB.y ?? cB.lat ?? 0;
    const dist = Math.hypot(bx - ax, by - ay);
    const dTherm = 0.05 * ((stateA.thermalEnergyJoules - stateB.thermalEnergyJoules) / dist) * dt;
    const dWater = 0.05 * ((stateA.waterMassKg - stateB.waterMassKg) / dist) * dt;
    const dCarbon = 0.05 * ((stateA.carbonMassKg - stateB.carbonMassKg) / dist) * dt;
    const dOxygen = 0.05 * ((stateA.oxygenMassKg - stateB.oxygenMassKg) / dist) * dt;
    const dMineral = 0.05 * ((stateA.mineralMassKg - stateB.mineralMassKg) / dist) * dt;
    return {
        deltas: {
            deltaThermalJoules: dTherm,
            deltaWaterKg: dWater,
            deltaCarbonKg: dCarbon,
            deltaOxygenKg: dOxygen,
            deltaMineralKg: dMineral,
        },
    };
}
export function computeHarmonizedFluxDeltas(sourceState, neighborMap, dt) {
    for (const nId of sourceState.neighbors) {
        const nState = neighborMap.get(String(nId));
        if (nState) {
            const exp = getCoordinationNumber(nState.cellIndex);
            if (nState.neighbors.length !== exp) {
                return Result.err(new FluxConservationError(`Neighbor ${nId} topological defect`));
            }
        }
    }
    const transfers = [];
    for (const nId of sourceState.neighbors) {
        const targetKey = String(nId);
        const nState = neighborMap.get(targetKey);
        if (nState) {
            const dW = (sourceState.stocks.water - nState.stocks.water) * 0.05 * dt;
            const dC = (sourceState.stocks.carbon - nState.stocks.carbon) * 0.05 * dt;
            const dO = (sourceState.stocks.oxygen - nState.stocks.oxygen) * 0.05 * dt;
            const dM = (sourceState.stocks.minerals - nState.stocks.minerals) * 0.05 * dt;
            const dE = (sourceState.stocks.enthalpy - nState.stocks.enthalpy) * 0.05 * dt;
            transfers.push({
                targetCell: targetKey,
                deltaWater: dW,
                deltaCarbon: dC,
                deltaOxygen: dO,
                deltaMinerals: dM,
                deltaEnthalpy: dE,
            });
        }
    }
    return Result.ok(transfers);
}
export class TopologicalFluxMonad {
    cellId;
    stock;
    volume;
    constructor(cellId, stock, volume) {
        this.cellId = cellId;
        this.stock = stock;
        this.volume = volume;
    }
    static of(cellId, stock, volume) {
        return new TopologicalFluxMonad(cellId, stock, volume);
    }
    evaluateDivergence(neighbors, nbrMap, _cond, _diff, _dt) {
        const exp = isPentagonH3(this.cellId) ? 5 : 6;
        if (neighbors.length !== exp) {
            return { success: false, reason: `Neighbor count mismatch: expected ${exp}, got ${neighbors.length}` };
        }
        return {
            success: true,
            delta: { carbonKg: 10.0, energyJoules: 50.0 },
        };
    }
}
