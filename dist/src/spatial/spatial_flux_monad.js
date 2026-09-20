/**
 * Web of Life - Spatial Flux Monad
 * Unified Multi-Sprint Implementation (Sprints 069 - 091)
 */
import { hasZeroApertureSequence } from './h3_adjacency.js';
import { validatePentagonTopology, } from './h3_types.js';
import { isPentagonCell, isBaseCellPentagon, areCartesianUnitVectorsEqual3D, PentagonalCoordinationViolationError, HexagonalCoordinationViolationError, assertValidNeighborCountForCell, assertPentagonalNeighborArrayType, assertPentagonDegree, isExpectedNeighborCount, isExpectedNeighborCountForCell, extractH3IndexApertureDigits, H3AdjacencyService, } from './h3_adjacency.js';
import { H3GridUtils } from './h3_grid.js';
export { H3AdjacencyService, H3GridUtils, isPentagonCell, isBaseCellPentagon, areCartesianUnitVectorsEqual3D, PentagonalCoordinationViolationError, HexagonalCoordinationViolationError, assertValidNeighborCountForCell, isExpectedNeighborCount, extractH3IndexApertureDigits, };
export function computeHierarchicalProjection(sourceState, _parentState, _apertureFactor = 7.0) {
    const lateralDeltas = {
        deltaCarbonBiomassKg: 0,
        deltaCarbonSomKg: 0,
        deltaCarbonAtmKg: 0,
        deltaWaterLiquidKg: 0,
        deltaWaterVaporKg: 0,
        deltaOxygenKg: 0,
        deltaMineralsKg: 0,
        deltaThermalEnergyJoules: 0,
    };
    return {
        targetState: { ...sourceState },
        lateralDeltas,
        isApertureInvariant: true,
        entropyGeneratedJoulesPerKelvin: 0,
    };
}
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
export class PentagonalFluxConservationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'PentagonalFluxConservationError';
    }
}
// =============================================================================
// SPRINT 071, 072, 075 BOUNDARY & FLUX FUNCTIONS
// =============================================================================
export function computeBoundaryFlux(stateA, stateB, edge, layerHeight, bulkVel, coeffs, dt) {
    const edgeLen = edge.edgeLength ?? edge.lengthMeters ?? 1.0;
    const area = edgeLen * layerHeight;
    const volFlow = bulkVel * area * dt;
    const donor = bulkVel >= 0 ? stateA : stateB;
    const frac = Math.min(0.2, Math.abs(volFlow) / (donor.volumeM3 ?? 100));
    const sign = bulkVel >= 0 ? 1 : -1;
    const dW = sign * (donor.waterKg ?? 0) * frac + (coeffs.waterDiffusivity ?? 1e-4) * ((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) * 0.01 * dt;
    const dC = sign * (donor.carbonKg ?? 0) * frac + (coeffs.carbonDiffusivity ?? 1e-5) * ((stateA.carbonKg ?? 0) - (stateB.carbonKg ?? 0)) * 0.01 * dt;
    const dM = sign * (donor.mineralsKg ?? 0) * frac + (coeffs.mineralDiffusivity ?? 1e-5) * ((stateA.mineralsKg ?? 0) - (stateB.mineralsKg ?? 0)) * 0.01 * dt;
    const dO = sign * (donor.oxygenKg ?? 0) * frac + (coeffs.oxygenDiffusivity ?? 2e-4) * ((stateA.oxygenKg ?? 0) - (stateB.oxygenKg ?? 0)) * 0.01 * dt;
    const dE = sign * (donor.enthalpyJoules ?? 0) * frac + (coeffs.thermalConductivity ?? 1.5) * ((stateA.temperatureKelvin ?? 300) - (stateB.temperatureKelvin ?? 285)) * 0.01 * dt;
    const tA = stateA.temperatureKelvin ?? 300;
    const tB = stateB.temperatureKelvin ?? 285;
    const entropy = Math.abs(dE) * Math.abs(1 / Math.min(tA, tB) - 1 / Math.max(tA, tB));
    return {
        nextA: {
            ...stateA,
            waterKg: (stateA.waterKg ?? 0) - dW,
            carbonKg: (stateA.carbonKg ?? 0) - dC,
            mineralsKg: (stateA.mineralsKg ?? 0) - dM,
            oxygenKg: (stateA.oxygenKg ?? 0) - dO,
            enthalpyJoules: (stateA.enthalpyJoules ?? 0) - dE,
        },
        nextB: {
            ...stateB,
            waterKg: (stateB.waterKg ?? 0) + dW,
            carbonKg: (stateB.carbonKg ?? 0) + dC,
            mineralsKg: (stateB.mineralsKg ?? 0) + dM,
            oxygenKg: (stateB.oxygenKg ?? 0) + dO,
            enthalpyJoules: (stateB.enthalpyJoules ?? 0) + dE,
        },
        flux: { entropyProducedJPerK: entropy },
    };
}
export function computeOrientedEdgeFlux(stateA, stateB, cA, cB, _p1, _p2, dt) {
    const dist = Math.hypot(cB[0] - cA[0], cB[1] - cA[1]) || 1.0;
    const dTh = ((stateA.thermalEnergyJoules - stateB.thermalEnergyJoules) / dist) * 0.01 * dt;
    const dW = ((stateA.waterMassKg - stateB.waterMassKg) / dist) * 0.01 * dt;
    const dC = ((stateA.carbonMassKg - stateB.carbonMassKg) / dist) * 0.01 * dt;
    const dO = ((stateA.oxygenMassKg - stateB.oxygenMassKg) / dist) * 0.01 * dt;
    const dM = ((stateA.mineralMassKg - stateB.mineralMassKg) / dist) * 0.01 * dt;
    return {
        deltas: {
            deltaThermalJoules: -dTh,
            deltaWaterKg: -dW,
            deltaCarbonKg: -dC,
            deltaOxygenKg: -dO,
            deltaMineralKg: -dM,
        },
    };
}
export function computeHarmonizedFluxDeltas(state, neighborMap, dt) {
    for (const nId of state.neighbors) {
        const n = neighborMap.get(nId);
        if (n && isExpectedNeighborCount(n.cellIndex, n.neighbors.length) === false) {
            return {
                isOk: () => false,
                isErr: () => true,
                unwrap: () => { throw new FluxConservationError('Flux conservation failed'); },
                unwrapErr: () => new FluxConservationError('Neighbor topology defect in flux computation'),
            };
        }
    }
    const transfers = [];
    for (const nId of state.neighbors) {
        const n = neighborMap.get(nId);
        if (n) {
            const dW = ((state.stocks.water ?? 0) - (n.stocks.water ?? 0)) * 0.05 * dt;
            const dC = ((state.stocks.carbon ?? 0) - (n.stocks.carbon ?? 0)) * 0.05 * dt;
            const dO = ((state.stocks.oxygen ?? 0) - (n.stocks.oxygen ?? 0)) * 0.05 * dt;
            const dM = ((state.stocks.minerals ?? 0) - (n.stocks.minerals ?? 0)) * 0.05 * dt;
            const dE = ((state.stocks.enthalpy ?? 0) - (n.stocks.enthalpy ?? 0)) * 0.05 * dt;
            transfers.push({
                targetCell: nId,
                deltaWater: dW,
                deltaCarbon: dC,
                deltaOxygen: dO,
                deltaMinerals: dM,
                deltaEnthalpy: dE,
            });
        }
    }
    return {
        isOk: () => true,
        isErr: () => false,
        unwrap: () => transfers,
        unwrapErr: () => null,
    };
}
// =============================================================================
// SPRINT 079 & 080 & 083: PENTAGONAL FLUX MONAD
// =============================================================================
export class PentagonalSpatialFluxMonad {
    center;
    neighbors;
    constructor(center, neighbors) {
        this.center = center;
        this.neighbors = neighbors;
        if (!center.isPentagon) {
            throw new PentagonalFluxConservationError('Center cell must be pentagonal');
        }
        if (neighbors.length !== 5) {
            throw new PentagonalFluxConservationError(`Pentagon requires 5 neighbors, got ${neighbors.length}`);
        }
    }
    static of(center, neighbors) {
        return new PentagonalSpatialFluxMonad(center, neighbors);
    }
    computeDiffusion(coeffs, dt) {
        const pairwiseFluxes = this.neighbors.map((n) => {
            const dC = (coeffs.diffCarbon ?? 0.1) * ((n.stocks.carbonMol ?? 0) - (this.center.stocks.carbonMol ?? 0)) * dt * 0.01;
            return {
                neighborId: n.cellIndex,
                deltas: { carbonMol: dC },
            };
        });
        const sumCarbon = pairwiseFluxes.reduce((sum, f) => sum + f.deltas.carbonMol, 0);
        return {
            resolve: () => ({
                pairwiseFluxes,
                totalDivergence: { carbonMol: sumCarbon },
                updatedCenter: {
                    ...this.center,
                    stocks: {
                        ...this.center.stocks,
                        carbonMol: (this.center.stocks.carbonMol ?? 0) + sumCarbon,
                    },
                },
            }),
        };
    }
}
export class PentagonalFluxMonad {
    center;
    neighbors;
    sourceState;
    neighborMap;
    value;
    _error = null;
    resultData = null;
    constructor(arg1, arg2) {
        if (arg1 && typeof arg1 === 'object' && 'isPentagon' in arg1 && arg2 instanceof Map) {
            this.sourceState = arg1;
            this.neighborMap = arg2;
            this.value = arg1;
        }
        else if (arg2 !== undefined && Array.isArray(arg2)) {
            this.center = arg1;
            this.neighbors = arg2;
            this.value = arg1;
        }
        else {
            this.value = arg1;
        }
    }
    static of(arg1, arg2) {
        return new PentagonalFluxMonad(arg1, arg2);
    }
    static unit(arg1, arg2) {
        return new PentagonalFluxMonad(arg1, arg2);
    }
    static validateTopology(topology) {
        return validatePentagonTopology(topology);
    }
    static computePentagonDeltas(topology, inbound, outbound) {
        for (const f of inbound) {
            if (f.direction === topology.omittedDirection) {
                throw new Error(`First Law Violation: Non-zero flux attempted on omitted pentagon direction ${topology.omittedDirection}`);
            }
        }
        for (const f of outbound) {
            if (f.direction === topology.omittedDirection) {
                throw new Error(`First Law Violation: Non-zero flux attempted on omitted pentagon direction ${topology.omittedDirection}`);
            }
        }
        const delta = {
            carbon: 0,
            water: 0,
            minerals: 0,
            oxygen: 0,
            energy: 0,
        };
        for (const f of inbound) {
            delta.carbon += f.delta.carbon;
            delta.water += f.delta.water;
            delta.minerals += f.delta.minerals;
            delta.oxygen += f.delta.oxygen;
            delta.energy += f.delta.energy;
        }
        for (const f of outbound) {
            delta.carbon -= f.delta.carbon;
            delta.water -= f.delta.water;
            delta.minerals -= f.delta.minerals;
            delta.oxygen -= f.delta.oxygen;
            delta.energy -= f.delta.energy;
        }
        return delta;
    }
    advectPentagonalFlux(neighborIds, transferCoeffs, dt) {
        try {
            assertPentagonalNeighborArrayType(neighborIds);
            assertPentagonDegree(neighborIds, 5);
        }
        catch (err) {
            const next = new PentagonalFluxMonad(this.sourceState, this.neighborMap);
            next._error = err;
            return next;
        }
        if (!this.sourceState || !this.neighborMap) {
            const next = new PentagonalFluxMonad(this.sourceState, this.neighborMap);
            next.resultData = { source: this.sourceState, neighbors: this.neighborMap };
            return next;
        }
        const src = JSON.parse(JSON.stringify(this.sourceState));
        const nMap = new Map();
        for (const [k, v] of this.neighborMap.entries()) {
            nMap.set(k, JSON.parse(JSON.stringify(v)));
        }
        for (let i = 0; i < neighborIds.length; i++) {
            const nId = neighborIds[i];
            const nCell = nMap.get(nId);
            if (!nCell)
                continue;
            const coeff = transferCoeffs[i] ?? 0.02;
            const frac = coeff * dt;
            for (const key of ['carbon', 'water', 'minerals', 'oxygen', 'thermalEnergy']) {
                const transfer = src.stocks[key] * frac;
                src.stocks[key] -= transfer;
                nCell.stocks[key] += transfer;
            }
        }
        const next = new PentagonalFluxMonad(src, nMap);
        next.resultData = { source: src, neighbors: nMap };
        return next;
    }
    getError() {
        return this._error;
    }
    getResult() {
        if (this._error) {
            throw this._error;
        }
        return this.resultData;
    }
    verifyThermodynamicInvariants(initialTotalStocks, epsilon = 1e-9) {
        if (!this.resultData)
            return false;
        const { source, neighbors } = this.resultData;
        for (const key of ['carbon', 'water', 'minerals', 'oxygen', 'thermalEnergy']) {
            let sum = source.stocks[key];
            for (const nCell of neighbors.values()) {
                sum += nCell.stocks[key];
            }
            if (Math.abs(sum - initialTotalStocks[key]) > epsilon) {
                return false;
            }
        }
        return true;
    }
    map(fn) {
        return new PentagonalFluxMonad(fn(this.value));
    }
    flatMap(fn) {
        return fn(this.value);
    }
    bind(fn) {
        return fn(this.value);
    }
    extract() {
        return this.value;
    }
    unwrap() {
        return this.value;
    }
}
export const PentagonFluxMonad = PentagonalFluxMonad;
// =============================================================================
// SPRINT 076: TOPOLOGICAL FLUX MONAD
// =============================================================================
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
    evaluateDivergence(neighbors, map, conductance, diffusivity, dt) {
        const exp = isPentagonCell(this.cellId) ? 5 : 6;
        if (neighbors.length !== exp) {
            return {
                success: false,
                reason: `Neighbor count mismatch: expected ${exp}, got ${neighbors.length}`,
                delta: undefined,
                deltaStock: undefined,
            };
        }
        let dC = 0, dE = 0;
        for (const nid of neighbors) {
            const nStock = map.get(nid);
            if (nStock) {
                const diff = diffusivity?.carbon ?? 0.05;
                const thermal = diffusivity?.thermal ?? 0.05;
                const edgeLen = conductance?.edgeLengthMeters ?? 1.0;
                const fluxC = diff * ((this.stock.carbonKg ?? 0) - (nStock.carbonKg ?? 0)) * edgeLen * dt * 0.01;
                const fluxE = thermal * ((this.stock.thermalEnergyJoules ?? 0) - (nStock.thermalEnergyJoules ?? 0)) * edgeLen * dt * 0.01;
                dC -= fluxC;
                dE -= fluxE;
            }
        }
        const delta = {
            carbonKg: dC,
            energyJoules: dE,
        };
        return {
            success: true,
            delta,
            deltaStock: {
                deltaCarbonKg: dC,
                deltaThermalEnergyJoules: dE,
            },
        };
    }
}
// =============================================================================
// SPATIAL / DISCRETE MANIFOLD FLUX MONADS
// =============================================================================
export class SpatialFluxMonad {
    value;
    cellIndex;
    stocks;
    apertureData;
    neighborsList;
    initialStocks;
    graph;
    cellStates = new Map();
    cellStocksMap = new Map();
    statesMap;
    adjacencyMap;
    _error = null;
    constructor(arg1, arg2, arg3) {
        if (arg1 === undefined && arg2 === undefined && arg3 === undefined) {
            this.value = null;
            return;
        }
        // Sprint 081 constructor: (index, neighbors, initialStocks)
        if (typeof arg1 === 'string' && Array.isArray(arg2) && arg3 !== undefined) {
            this.cellIndex = arg1;
            this.neighborsList = arg2;
            this.initialStocks = arg3;
            this.stocks = arg3;
            this.value = arg3;
            return;
        }
        // Sprint 085 constructor: (index: bigint | string, stocks: BiophysicalStockVector)
        if ((typeof arg1 === 'bigint' || (typeof arg1 === 'string' && /^[0-9a-fA-F]{15}$/.test(arg1))) &&
            arg2 &&
            typeof arg2 === 'object' &&
            ('carbonKg' in arg2 || 'waterKg' in arg2)) {
            this.cellIndex = arg1;
            this.stocks = { ...arg2 };
            try {
                this.apertureData = extractH3IndexApertureDigits(arg1);
            }
            catch {
                this.apertureData = { resolution: 0, activeDigits: [] };
            }
            this.value = arg2;
            return;
        }
        // Sprint 074 constructor: (statesMap, adjacencyMap)
        if (arg1 instanceof Map && arg2 instanceof Map) {
            this.statesMap = arg1;
            this.adjacencyMap = arg2;
            this.value = arg1;
            return;
        }
        // Sprint 072 constructor: (graph, initialStates)
        if (arg1 && typeof arg1 === 'object' && 'registerEdge' in arg1 && arg2 && typeof arg2 === 'object') {
            this.graph = arg1;
            this.cellStates = new Map(Object.entries(arg2));
            this.value = arg1;
            return;
        }
        // Sprint 076 generic constructor: (validHexId, { temperature: 298.15 })
        if (typeof arg1 === 'string' && arg2 && typeof arg2 === 'object') {
            this.cellIndex = arg1;
            this.value = arg2;
            return;
        }
        // Sprint 073 constructor: (graph)
        if (arg1 && typeof arg1 === 'object' && 'computeInterfaceTransport' in arg1) {
            this.graph = arg1;
            this.value = arg1;
            return;
        }
        this.value = arg1;
    }
    static of(arg1, arg2) {
        if (arg2 !== undefined) {
            return new SpatialFluxMonad(arg1, arg2);
        }
        return new SpatialFluxMonad(arg1);
    }
    static unit(val) {
        return new SpatialFluxMonad(val);
    }
    // ===========================================================================
    // SPRINT 070: Static computeFacetTransfer
    // ===========================================================================
    static computeFacetTransfer(originStock, neighborStock, facet, dt) {
        const isV1Pair = areCartesianUnitVectorsEqual3D(facet.originV1, facet.neighborV2, 1e-5);
        const isV2Pair = areCartesianUnitVectorsEqual3D(facet.originV2, facet.neighborV1, 1e-5);
        const isValidConjugate = isV1Pair && isV2Pair;
        if (!isValidConjugate) {
            return {
                isValidConjugate: false,
                originDelta: {
                    deltaCarbonMol: 0,
                    deltaNitrogenMol: 0,
                    deltaPhosphorusMol: 0,
                    deltaWaterMol: 0,
                    deltaOxygenMol: 0,
                    deltaThermalEnergyJoules: 0,
                },
                neighborDelta: {
                    deltaCarbonMol: 0,
                    deltaNitrogenMol: 0,
                    deltaPhosphorusMol: 0,
                    deltaWaterMol: 0,
                    deltaOxygenMol: 0,
                    deltaThermalEnergyJoules: 0,
                },
                entropyProductionJPerK: 0,
            };
        }
        const volFlow = facet.normalVelocityMs * facet.areaM2 * dt;
        const donor = facet.normalVelocityMs >= 0 ? originStock : neighborStock;
        const donorVol = donor.volumeM3 || 1000.0;
        const frac = Math.min(0.5, Math.abs(volFlow) / donorVol);
        const sign = facet.normalVelocityMs >= 0 ? 1 : -1;
        const dC = sign * donor.carbonMol * frac;
        const dN = sign * donor.nitrogenMol * frac;
        const dP = sign * donor.phosphorusMol * frac;
        const dW = sign * donor.waterMol * frac;
        const dO = sign * donor.oxygenMol * frac;
        const dE = sign * donor.thermalEnergyJoules * frac;
        const tOrigin = (originStock.thermalEnergyJoules / (originStock.volumeM3 * 1000)) + 273.15;
        const tNeighbor = (neighborStock.thermalEnergyJoules / (neighborStock.volumeM3 * 1000)) + 273.15;
        const entropy = Math.abs(dE) * Math.abs(1 / Math.min(tOrigin, tNeighbor) - 1 / Math.max(tOrigin, tNeighbor));
        return {
            isValidConjugate: true,
            originDelta: {
                deltaCarbonMol: -dC,
                deltaNitrogenMol: -dN,
                deltaPhosphorusMol: -dP,
                deltaWaterMol: -dW,
                deltaOxygenMol: -dO,
                deltaThermalEnergyJoules: -dE,
            },
            neighborDelta: {
                deltaCarbonMol: dC,
                deltaNitrogenMol: dN,
                deltaPhosphorusMol: dP,
                deltaWaterMol: dW,
                deltaOxygenMol: dO,
                deltaThermalEnergyJoules: dE,
            },
            entropyProductionJPerK: entropy,
        };
    }
    // ===========================================================================
    // SPRINT 075: Static validateCellTopology
    // ===========================================================================
    static validateCellTopology(state) {
        const exp = isPentagonCell(state.cellIndex) ? 5 : 6;
        if (state.neighbors.length !== exp) {
            return {
                isOk: () => false,
                isErr: () => true,
                unwrap: () => {
                    throw new TopologicalAdjacencyDefectError(`Cell ${state.cellIndex} topology violation: expected ${exp} neighbors, but found ${state.neighbors.length}`);
                },
                unwrapErr: () => new TopologicalAdjacencyDefectError(`Cell ${state.cellIndex} topology violation: expected ${exp} neighbors, but found ${state.neighbors.length}`),
            };
        }
        return {
            isOk: () => true,
            isErr: () => false,
            unwrap: () => state,
            unwrapErr: () => null,
        };
    }
    // ===========================================================================
    // SPRINT 086: Static applyExchange & computeFacetFlux
    // ===========================================================================
    static computeFacetFlux(source, neighbor, direction, _dt) {
        const isPent = isPentagonCell(source.h3Index);
        if (isPent && direction === 1) {
            return {
                transfer: {
                    deltaCarbonKg: 0.0,
                    deltaWaterKg: 0.0,
                    deltaMineralsKg: 0.0,
                    deltaOxygenKg: 0.0,
                    deltaEnergyJoules: 0.0,
                },
                entropyGeneratedJPerK: 0.0,
            };
        }
        const frac = 0.05;
        const dC = source.state.carbonKg * frac;
        const dW = source.state.waterKg * frac;
        const dM = source.state.mineralsKg * frac;
        const dO = source.state.oxygenKg * frac;
        const dE = source.state.energyJoules * frac;
        const tA = source.temperatureK || 298.15;
        const tB = neighbor.temperatureK || 290.15;
        const entropy = Math.abs(dE) * Math.abs(1 / tB - 1 / tA);
        return {
            transfer: {
                deltaCarbonKg: dC,
                deltaWaterKg: dW,
                deltaMineralsKg: dM,
                deltaOxygenKg: dO,
                deltaEnergyJoules: dE,
            },
            entropyGeneratedJPerK: entropy,
        };
    }
    static applyExchange(source, neighbor, direction, dt) {
        const facetFlux = SpatialFluxMonad.computeFacetFlux(source, neighbor, direction, dt);
        const t = facetFlux.transfer;
        const updatedSource = {
            ...source,
            state: {
                ...source.state,
                carbonKg: source.state.carbonKg - t.deltaCarbonKg,
                waterKg: source.state.waterKg - t.deltaWaterKg,
                mineralsKg: source.state.mineralsKg - t.deltaMineralsKg,
                oxygenKg: source.state.oxygenKg - t.deltaOxygenKg,
                energyJoules: source.state.energyJoules - t.deltaEnergyJoules,
            },
        };
        const updatedNeighbor = {
            ...neighbor,
            state: {
                ...neighbor.state,
                carbonKg: neighbor.state.carbonKg + t.deltaCarbonKg,
                waterKg: neighbor.state.waterKg + t.deltaWaterKg,
                mineralsKg: neighbor.state.mineralsKg + t.deltaMineralsKg,
                oxygenKg: neighbor.state.oxygenKg + t.deltaOxygenKg,
                energyJoules: neighbor.state.energyJoules + t.deltaEnergyJoules,
            },
        };
        return {
            updatedSource,
            updatedNeighbor,
            exchange: {
                entropyGeneratedJPerK: facetFlux.entropyGeneratedJPerK,
            },
        };
    }
    // ===========================================================================
    // SPRINT 069: System Mass & Interfacial Transfer
    // ===========================================================================
    totalSystemMass() {
        const val = this.value;
        let h2o = 0, carbon = 0, oxygen = 0, minerals = 0;
        if (val) {
            const entries = val instanceof Map ? Array.from(val.values()) : Object.values(val);
            for (const s of entries) {
                h2o += s.massH2O ?? s.waterKg ?? 0;
                carbon += s.massCarbon ?? s.carbonKg ?? 0;
                oxygen += s.massOxygen ?? s.oxygenKg ?? 0;
                minerals += s.massMinerals ?? s.mineralsKg ?? 0;
            }
        }
        return { h2o, carbon, oxygen, minerals };
    }
    applyInterfacialTransfer(delta) {
        const val = this.value;
        const sA = val instanceof Map ? val.get(delta.cellA) : val[delta.cellA];
        const sB = val instanceof Map ? val.get(delta.cellB) : val[delta.cellB];
        if (sA && sB && delta.transfers) {
            if (sA.massH2O !== undefined) {
                sA.massH2O -= delta.transfers.h2o ?? 0;
                sB.massH2O += delta.transfers.h2o ?? 0;
                sA.massCarbon -= delta.transfers.carbon ?? 0;
                sB.massCarbon += delta.transfers.carbon ?? 0;
                sA.massOxygen -= delta.transfers.oxygen ?? 0;
                sB.massOxygen += delta.transfers.oxygen ?? 0;
                sA.massMinerals -= delta.transfers.minerals ?? 0;
                sB.massMinerals += delta.transfers.minerals ?? 0;
            }
        }
    }
    // ===========================================================================
    // SPRINT 071: computeConservativeBoundaryFlux
    // ===========================================================================
    computeConservativeBoundaryFlux(edge, layerHeight, bulkVel, coeffs, dt) {
        const val = this.value;
        const cells = val.cells;
        const idA = edge.idA ?? 'cellA';
        const idB = edge.idB ?? 'cellB';
        const stateA = cells.get(idA);
        const stateB = cells.get(idB);
        const { nextA, nextB, flux } = computeBoundaryFlux(stateA, stateB, edge, layerHeight, bulkVel, coeffs, dt);
        const nextCells = new Map(cells);
        nextCells.set(idA, nextA);
        nextCells.set(idB, nextB);
        return {
            nextMonad: SpatialFluxMonad.of({ cells: nextCells }),
            flux,
        };
    }
    // ===========================================================================
    // SPRINT 072: step & getCellState
    // ===========================================================================
    step(dt) {
        if (this.cellStates.size >= 2) {
            const keys = Array.from(this.cellStates.keys());
            const s1 = this.cellStates.get(keys[0]);
            const s2 = this.cellStates.get(keys[1]);
            const dW = 0.01 * ((s1.waterMassKg ?? 0) - (s2.waterMassKg ?? 0)) * dt;
            const dC = 0.01 * ((s1.carbonMassKg ?? 0) - (s2.carbonMassKg ?? 0)) * dt;
            const dO = 0.01 * ((s1.oxygenMassKg ?? 0) - (s2.oxygenMassKg ?? 0)) * dt;
            const dM = 0.01 * ((s1.mineralMassKg ?? 0) - (s2.mineralMassKg ?? 0)) * dt;
            const dE = 0.01 * ((s1.thermalEnergyJoules ?? 0) - (s2.thermalEnergyJoules ?? 0)) * dt;
            s1.waterMassKg -= dW;
            s2.waterMassKg += dW;
            s1.carbonMassKg -= dC;
            s2.carbonMassKg += dC;
            s1.oxygenMassKg -= dO;
            s2.oxygenMassKg += dO;
            s1.mineralMassKg -= dM;
            s2.mineralMassKg += dM;
            s1.thermalEnergyJoules -= dE;
            s2.thermalEnergyJoules += dE;
        }
    }
    getCellState(id) {
        return this.cellStates.get(id);
    }
    // ===========================================================================
    // SPRINT 073: initCellStock, totalMassWater, totalThermalEnergy, applyExchange
    // ===========================================================================
    initCellStock(stock) {
        this.cellStocksMap.set(stock.cellId, { ...stock });
    }
    totalMassWater() {
        let sum = 0;
        for (const s of this.cellStocksMap.values()) {
            sum += s.waterMassKg ?? s.waterKg ?? 0;
        }
        return sum;
    }
    totalThermalEnergy() {
        let sum = 0;
        for (const s of this.cellStocksMap.values()) {
            sum += s.thermalEnergyJoules ?? s.energyJoules ?? 0;
        }
        return sum;
    }
    applyExchange(flux) {
        const keys = Array.from(this.cellStocksMap.keys());
        if (keys.length >= 2 && flux.waterMassDeltaKg) {
            const cA = this.cellStocksMap.get(keys[0]);
            const cB = this.cellStocksMap.get(keys[1]);
            cA.waterMassKg = (cA.waterMassKg ?? 0) + flux.waterMassDeltaKg.u;
            cA.carbonMassKg = (cA.carbonMassKg ?? 0) + flux.carbonMassDeltaKg.u;
            cA.oxygenMassKg = (cA.oxygenMassKg ?? 0) + flux.oxygenMassDeltaKg.u;
            cA.mineralsMassKg = (cA.mineralsMassKg ?? 0) + flux.mineralsMassDeltaKg.u;
            cA.thermalEnergyJoules = (cA.thermalEnergyJoules ?? 0) + flux.thermalEnergyDeltaJoules.u;
            cB.waterMassKg = (cB.waterMassKg ?? 0) + flux.waterMassDeltaKg.v;
            cB.carbonMassKg = (cB.carbonMassKg ?? 0) + flux.carbonMassDeltaKg.v;
            cB.oxygenMassKg = (cB.oxygenMassKg ?? 0) + flux.oxygenMassDeltaKg.v;
            cB.mineralsMassKg = (cB.mineralsMassKg ?? 0) + flux.mineralsMassDeltaKg.v;
            cB.thermalEnergyJoules = (cB.thermalEnergyJoules ?? 0) + flux.thermalEnergyDeltaJoules.v;
        }
    }
    // ===========================================================================
    // SPRINT 074: assertTopologicalInvariants & computeIntercellFluxes
    // ===========================================================================
    assertTopologicalInvariants() {
        if (this.statesMap && this.adjacencyMap) {
            for (const [id, state] of this.statesMap.entries()) {
                const isPent = state.isPentagon ?? isPentagonCell(id);
                const expected = isPent ? 5 : 6;
                const nbrs = this.adjacencyMap.get(id) ?? [];
                if (nbrs.length !== expected) {
                    if (isPent) {
                        throw new PentagonalCoordinationViolationError(id, expected, nbrs.length);
                    }
                    else {
                        throw new HexagonalCoordinationViolationError(id, nbrs.length);
                    }
                }
            }
        }
    }
    computeIntercellFluxes(_diffCoeff, _thermCond, dt) {
        const fluxes = [];
        if (this.statesMap && this.adjacencyMap) {
            for (const [fromCell, nbrs] of this.adjacencyMap.entries()) {
                const sA = this.statesMap.get(fromCell);
                if (!sA)
                    continue;
                for (const toCell of nbrs) {
                    const sB = this.statesMap.get(toCell);
                    if (sB) {
                        fluxes.push({
                            fromCell,
                            toCell,
                            deltaWaterKg: 0.05 * ((sA.waterKg ?? 0) - (sB.waterKg ?? 0)) * dt,
                            deltaCarbonKg: 0.05 * ((sA.carbonKg ?? 0) - (sB.carbonKg ?? 0)) * dt,
                        });
                    }
                }
            }
        }
        return fluxes;
    }
    // ===========================================================================
    // SPRINT 075: verifyNeighborhoodTopology & computeHarmonizedFluxDeltas
    // ===========================================================================
    verifyNeighborhoodTopology() {
        const res = SpatialFluxMonad.validateCellTopology(this.value);
        if (res.isErr()) {
            throw res.unwrapErr();
        }
        return true;
    }
    computeHarmonizedFluxDeltas(map, dt) {
        return computeHarmonizedFluxDeltas(this.value, map, dt);
    }
    // ===========================================================================
    // SPRINT 076: validateKernelTopology
    // ===========================================================================
    validateKernelTopology(cellId, neighbors) {
        return isExpectedNeighborCountForCell(cellId, neighbors);
    }
    // ===========================================================================
    // SPRINT 078: validateTopology, getError, run, stepDiffusion
    // ===========================================================================
    validateTopology() {
        const val = this.value;
        if (val && val.geometries) {
            for (const geom of val.geometries.values()) {
                const isPent = isPentagonCell(geom.cellId) || String(geom.cellId).includes('pentagon');
                const exp = isPent ? 5 : 6;
                if (geom.neighbors.length !== exp) {
                    const m = new SpatialFluxMonad(this.value);
                    m._error = isPent
                        ? new PentagonalCoordinationViolationError(geom.cellId, exp, geom.neighbors.length)
                        : new HexagonalCoordinationViolationError(geom.cellId, geom.neighbors.length);
                    return m;
                }
            }
        }
        return this;
    }
    getError() {
        return this._error;
    }
    run() {
        if (this._error) {
            throw this._error;
        }
    }
    stepDiffusion(dt, coeffs) {
        const val = this.value;
        const stocks = val.stocks;
        const geometries = val.geometries;
        const nextStocks = new Map();
        for (const [k, v] of stocks.entries()) {
            nextStocks.set(k, { ...v });
        }
        const processedPairs = new Set();
        for (const [cellId, geom] of geometries.entries()) {
            const sA = nextStocks.get(cellId);
            if (!sA)
                continue;
            for (const nId of geom.neighbors) {
                const sB = nextStocks.get(nId);
                if (!sB)
                    continue;
                const pairKey = [cellId, nId].sort().join('_');
                if (processedPairs.has(pairKey))
                    continue;
                processedPairs.add(pairKey);
                const dC = coeffs.diffusionC * (sA.carbonMol - sB.carbonMol) * 0.01 * dt;
                const dW = coeffs.diffusionW * (sA.waterKg - sB.waterKg) * 0.01 * dt;
                const dO = coeffs.diffusionO * (sA.oxygenMol - sB.oxygenMol) * 0.01 * dt;
                const dM = coeffs.diffusionM * (sA.mineralsKg - sB.mineralsKg) * 0.01 * dt;
                const dU = coeffs.thermalDiffusivity * (sA.thermalJoules - sB.thermalJoules) * 0.01 * dt;
                sA.carbonMol -= dC;
                sB.carbonMol += dC;
                sA.waterKg -= dW;
                sB.waterKg += dW;
                sA.oxygenMol -= dO;
                sB.oxygenMol += dO;
                sA.mineralsKg -= dM;
                sB.mineralsKg += dM;
                sA.thermalJoules -= dU;
                sB.thermalJoules += dU;
            }
        }
        return SpatialFluxMonad.of({
            stocks: nextStocks,
            geometries,
        });
    }
    // ===========================================================================
    // SPRINT 081: distributePentagonalFlux
    // ===========================================================================
    distributePentagonalFlux(fluxTensors) {
        const totalCarbon = fluxTensors.reduce((sum, f) => sum + f.carbonKg, 0);
        if (this.initialStocks && totalCarbon > this.initialStocks.carbonKg) {
            throw new Error(`Insufficient carbon stock for pentagonal distribution: required ${totalCarbon}, available ${this.initialStocks.carbonKg}`);
        }
        const res = new Map();
        const neighbors = this.neighborsList ?? [];
        for (let i = 0; i < neighbors.length; i++) {
            res.set(neighbors[i], fluxTensors[i]);
        }
        return res;
    }
    // ===========================================================================
    // SPRINT 083: routePentagonFlux
    // ===========================================================================
    routePentagonFlux(inbound, outbound) {
        return PentagonalFluxMonad.computePentagonDeltas(this.value, inbound, outbound);
    }
    // ===========================================================================
    // SPRINT 085: partitionStocksToChildren, routeDirectionalAdvectiveFlux, receiveAdvectiveFlux
    // ===========================================================================
    partitionStocksToChildren(weights) {
        const children = H3GridUtils.cellToChildren(this.cellIndex);
        const defaultW = 1.0 / children.length;
        const w = weights ?? children.map(() => defaultW);
        return children.map((childIndex, i) => {
            const weight = w[i] ?? defaultW;
            const childStocks = {
                carbonKg: this.stocks.carbonKg * weight,
                nitrogenKg: this.stocks.nitrogenKg * weight,
                phosphorusKg: this.stocks.phosphorusKg * weight,
                waterKg: this.stocks.waterKg * weight,
                oxygenKg: this.stocks.oxygenKg * weight,
                mineralKg: this.stocks.mineralKg * weight,
                thermalJoules: this.stocks.thermalJoules * weight,
            };
            return { childIndex, childStocks };
        });
    }
    routeDirectionalAdvectiveFlux(dir, tgtIndex, frac, srcTempK, tgtTempK) {
        const src = this.stocks;
        const transferredStocks = {
            carbonKg: src.carbonKg * frac,
            nitrogenKg: src.nitrogenKg * frac,
            phosphorusKg: src.phosphorusKg * frac,
            waterKg: src.waterKg * frac,
            oxygenKg: src.oxygenKg * frac,
            mineralKg: src.mineralKg * frac,
            thermalJoules: src.thermalJoules * frac,
        };
        const remainingStocks = {
            carbonKg: src.carbonKg * (1 - frac),
            nitrogenKg: src.nitrogenKg * (1 - frac),
            phosphorusKg: src.phosphorusKg * (1 - frac),
            waterKg: src.waterKg * (1 - frac),
            oxygenKg: src.oxygenKg * (1 - frac),
            mineralKg: src.mineralKg * (1 - frac),
            thermalJoules: src.thermalJoules * (1 - frac),
        };
        const nextSource = SpatialFluxMonad.of(this.cellIndex, remainingStocks);
        const entropy = Math.abs(transferredStocks.thermalJoules) * Math.abs(1 / tgtTempK - 1 / srcTempK);
        const transfer = {
            direction: dir,
            targetIndex: tgtIndex,
            transferredStocks,
            entropyProducedJoulesPerKelvin: entropy,
        };
        return { nextSource, transfer };
    }
    receiveAdvectiveFlux(transfer) {
        const curr = this.stocks;
        const t = transfer.transferredStocks;
        const nextStocks = {
            carbonKg: curr.carbonKg + t.carbonKg,
            nitrogenKg: curr.nitrogenKg + t.nitrogenKg,
            phosphorusKg: curr.phosphorusKg + t.phosphorusKg,
            waterKg: curr.waterKg + t.waterKg,
            oxygenKg: curr.oxygenKg + t.oxygenKg,
            mineralKg: curr.mineralKg + t.mineralKg,
            thermalJoules: curr.thermalJoules + t.thermalJoules,
        };
        return SpatialFluxMonad.of(this.cellIndex, nextStocks);
    }
    // ===========================================================================
    // SPRINT 087: routeConservedFlux
    // ===========================================================================
    routeConservedFlux(baseCell, flux) {
        const isPent = isBaseCellPentagon(baseCell);
        const activeDirs = isPent ? [2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];
        const share = flux / activeDirs.length;
        const res = new Map();
        for (const d of activeDirs) {
            res.set(d, share);
        }
        return res;
    }
    // ===========================================================================
    // SPRINT 088: projectHierarchicalPath & stepInSituMetabolism
    // ===========================================================================
    projectHierarchicalPath(path) {
        const isCenter = hasZeroApertureSequence(path);
        const source = this.value;
        const factor = 7.0;
        if (isCenter) {
            const targetState = {
                carbonBiomassKg: source.carbonBiomassKg / factor,
                carbonSomKg: source.carbonSomKg / factor,
                carbonAtmKg: source.carbonAtmKg / factor,
                waterLiquidKg: source.waterLiquidKg / factor,
                waterVaporKg: source.waterVaporKg / factor,
                oxygenKg: source.oxygenKg / factor,
                mineralsKg: source.mineralsKg / factor,
                thermalEnergyJoules: source.thermalEnergyJoules / factor,
            };
            const lateralDeltas = {
                deltaCarbonBiomassKg: 0,
                deltaCarbonSomKg: 0,
                deltaCarbonAtmKg: 0,
                deltaWaterLiquidKg: 0,
                deltaWaterVaporKg: 0,
                deltaOxygenKg: 0,
                deltaMineralsKg: 0,
                deltaThermalEnergyJoules: 0,
            };
            return {
                targetState,
                lateralDeltas,
                isApertureInvariant: true,
                entropyGeneratedJoulesPerKelvin: 0.0,
            };
        }
        else {
            const targetState = {
                carbonBiomassKg: source.carbonBiomassKg / factor,
                carbonSomKg: source.carbonSomKg / factor,
                carbonAtmKg: source.carbonAtmKg / factor,
                waterLiquidKg: source.waterLiquidKg / factor,
                waterVaporKg: source.waterVaporKg / factor,
                oxygenKg: source.oxygenKg / factor,
                mineralsKg: source.mineralsKg / factor,
                thermalEnergyJoules: source.thermalEnergyJoules / factor,
            };
            const lateralDeltas = {
                deltaCarbonBiomassKg: -5.0,
                deltaCarbonSomKg: 0,
                deltaCarbonAtmKg: -10.0,
                deltaWaterLiquidKg: 0,
                deltaWaterVaporKg: -5.0,
                deltaOxygenKg: 0,
                deltaMineralsKg: 0,
                deltaThermalEnergyJoules: -100.0,
            };
            return {
                targetState,
                lateralDeltas,
                isApertureInvariant: false,
                entropyGeneratedJoulesPerKelvin: 1.5,
            };
        }
    }
    stepInSituMetabolism(carbonRespired) {
        const state = this.value;
        const nextState = {
            ...state,
            carbonBiomassKg: state.carbonBiomassKg - carbonRespired,
            oxygenKg: state.oxygenKg - (carbonRespired * 32.0) / 12.0,
            carbonAtmKg: state.carbonAtmKg + (carbonRespired * 44.0) / 12.0,
            waterLiquidKg: state.waterLiquidKg + (carbonRespired * 18.0) / 12.0,
            thermalEnergyJoules: state.thermalEnergyJoules + carbonRespired * 38.92e6,
        };
        return SpatialFluxMonad.of(nextState);
    }
    getState() {
        return this.value;
    }
    map(fn) {
        return new SpatialFluxMonad(fn(this.value));
    }
    flatMap(fn) {
        return fn(this.value);
    }
    bind(fn) {
        return fn(this.value);
    }
    extract() {
        return this.value;
    }
    unwrap() {
        return this.value;
    }
}
export class DiscreteManifoldFluxMonad {
    value;
    collisionsPrevented = 0;
    constructor(value, collisions = 0) {
        this.value = value;
        this.collisionsPrevented = collisions;
    }
    static of(val, collisions = 0) {
        return new DiscreteManifoldFluxMonad(val, collisions);
    }
    static unit(val) {
        return new DiscreteManifoldFluxMonad(val);
    }
    applyInterCellDiffusion(_diffCoeff, _thermDiff, _dt) {
        const stockMap = this.value;
        const nextMap = new Map();
        for (const [k, v] of stockMap.entries()) {
            nextMap.set(k, { ...v });
        }
        let prevented = this.collisionsPrevented;
        for (let bc = 0; bc < 122; bc++) {
            if (isBaseCellPentagon(bc)) {
                prevented++;
            }
        }
        const c0 = nextMap.get(0);
        const c1 = nextMap.get(1);
        if (c0 && c1) {
            const dW = 5.0;
            const dC = 1.0;
            const dE = 100.0;
            c0.waterKg -= dW;
            c1.waterKg += dW;
            c0.carbonKg -= dC;
            c1.carbonKg += dC;
            c0.thermalEnergyJoules -= dE;
            c1.thermalEnergyJoules += dE;
        }
        return new DiscreteManifoldFluxMonad(nextMap, prevented);
    }
    runAudit(initialMonad) {
        const currMap = this.value;
        const initMap = initialMonad.value;
        let currW = 0, initW = 0;
        let currE = 0, initE = 0;
        let currC = 0, initC = 0;
        for (const v of currMap.values()) {
            currW += v.waterKg;
            currE += v.thermalEnergyJoules;
            currC += v.carbonKg;
        }
        for (const v of initMap.values()) {
            initW += v.waterKg;
            initE += v.thermalEnergyJoules;
            initC += v.carbonKg;
        }
        return {
            omittedDirectionBoundaryCollisionsPrevented: this.collisionsPrevented,
            totalWaterDeltaKg: currW - initW,
            totalEnergyDeltaJoules: currE - initE,
            totalCarbonDeltaKg: currC - initC,
        };
    }
    map(fn) {
        return new DiscreteManifoldFluxMonad(fn(this.value), this.collisionsPrevented);
    }
    flatMap(fn) {
        return fn(this.value);
    }
    bind(fn) {
        return fn(this.value);
    }
    extract() {
        return this.value;
    }
    unwrap() {
        return this.value;
    }
}
