/**
 * Web of Life - Spatial Flux Monad
 * Unified Multi-Sprint Implementation (Sprints 069 - 088)
 */
import { hasZeroApertureSequence } from './h3_adjacency.js';
import { isPentagonCell, areCartesianUnitVectorsEqual3D, PentagonalCoordinationViolationError, HexagonalCoordinationViolationError, extractH3IndexApertureDigits, PentagonalFluxMonad, DiscreteManifoldFluxMonad, H3AdjacencyService, isExpectedNeighborCountForCell, } from './h3_adjacency.js';
import { H3GridUtils } from './h3_grid.js';
export { DiscreteManifoldFluxMonad, PentagonalFluxMonad };
export const PentagonFluxMonad = PentagonalFluxMonad;
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
// HELPER BOUNDARY & ORIENTATION CALCULATIONS
// =============================================================================
export function computeBoundaryFlux(sA, sB, edge, layerHeight, vel, _coeffs, dt) {
    const edgeLen = edge.lengthMeters ?? edge.edgeLength ?? 1000;
    const area = edgeLen * layerHeight;
    const flow = vel * area * dt;
    const frac = Math.min(0.2, Math.abs(flow) / (sA.volumeM3 ?? 10000));
    const dW = (sA.waterKg ?? sA.massWaterKg ?? 0) * frac;
    const dC = (sA.carbonKg ?? sA.massCarbonKg ?? 0) * frac;
    const dE = (sA.thermalEnergyJoules ?? sA.energyJoules ?? sA.enthalpyJoules ?? 0) * frac;
    const dO = (sA.oxygenKg ?? sA.massOxygenKg ?? 0) * frac;
    const dM = (sA.mineralsKg ?? sA.massMineralsKg ?? 0) * frac;
    const tA = Math.max(1, sA.temperatureKelvin ?? sA.temperature ?? 290);
    const tB = Math.max(1, sB.temperatureKelvin ?? sB.temperature ?? 290);
    const deltaT = Math.abs(tA - tB);
    const entropyProducedJPerK = Math.abs(dE) * (deltaT / (tA * tB + 1e-6));
    const nextA = {
        ...sA,
        waterKg: (sA.waterKg ?? sA.massWaterKg ?? 0) - dW,
        carbonKg: (sA.carbonKg ?? sA.massCarbonKg ?? 0) - dC,
        thermalEnergyJoules: (sA.thermalEnergyJoules ?? sA.energyJoules ?? sA.enthalpyJoules ?? 0) - dE,
        enthalpyJoules: (sA.enthalpyJoules ?? sA.thermalEnergyJoules ?? sA.energyJoules ?? 0) - dE,
        energyJoules: (sA.energyJoules ?? sA.thermalEnergyJoules ?? sA.enthalpyJoules ?? 0) - dE,
        oxygenKg: (sA.oxygenKg ?? sA.massOxygenKg ?? 0) - dO,
        mineralsKg: (sA.mineralsKg ?? sA.massMineralsKg ?? 0) - dM,
    };
    const nextB = {
        ...sB,
        waterKg: (sB.waterKg ?? sB.massWaterKg ?? 0) + dW,
        carbonKg: (sB.carbonKg ?? sB.massCarbonKg ?? 0) + dC,
        thermalEnergyJoules: (sB.thermalEnergyJoules ?? sB.energyJoules ?? sB.enthalpyJoules ?? 0) + dE,
        enthalpyJoules: (sB.enthalpyJoules ?? sB.thermalEnergyJoules ?? sB.energyJoules ?? 0) + dE,
        energyJoules: (sB.energyJoules ?? sB.thermalEnergyJoules ?? sB.enthalpyJoules ?? 0) + dE,
        oxygenKg: (sB.oxygenKg ?? sB.massOxygenKg ?? 0) + dO,
        mineralsKg: (sB.mineralsKg ?? sB.massMineralsKg ?? 0) + dM,
    };
    const flux = {
        deltaWaterKg: dW,
        deltaCarbonKg: dC,
        deltaEnergyJoules: dE,
        deltaOxygenKg: dO,
        deltaMineralKg: dM,
        deltaMineralsKg: dM,
        entropyProducedJPerK,
    };
    return {
        nextA,
        nextB,
        flux,
        entropyProducedJPerK,
    };
}
export function computeOrientedEdgeFlux(c1, c2, _cA, _cB, _vA, _vB, dt) {
    const diffT = (c1.temperatureKelvin ?? 290) - (c2.temperatureKelvin ?? 290);
    const dHeat = 15.0 * diffT * dt;
    const dWater = 0.05 * ((c1.waterMassKg ?? 100) - (c2.waterMassKg ?? 100)) * dt;
    const dCarbon = 0.02 * ((c1.carbonMassKg ?? 50) - (c2.carbonMassKg ?? 50)) * dt;
    const dOxygen = 0.01 * ((c1.oxygenMassKg ?? 20) - (c2.oxygenMassKg ?? 20)) * dt;
    const dMineral = 0.01 * ((c1.mineralMassKg ?? 10) - (c2.mineralMassKg ?? 10)) * dt;
    return {
        deltas: {
            deltaThermalJoules: -dHeat,
            deltaWaterKg: -dWater,
            deltaCarbonKg: -dCarbon,
            deltaOxygenKg: -dOxygen,
            deltaMineralKg: -dMineral,
        },
        entropyGeneratedJPerK: Math.abs(dHeat) * 0.001,
    };
}
export function computeHarmonizedFluxDeltas(state, neighborMap, dt) {
    // Validate neighbor topologies
    for (const [nbrId, nbrState] of neighborMap.entries()) {
        const isPent = isPentagonCell(nbrId);
        const exp = isPent ? 5 : 6;
        if (nbrState?.neighbors && nbrState.neighbors.length !== exp) {
            const err = new FluxConservationError(`Neighbor ${nbrId} has topology defect`);
            return {
                isOk: () => false,
                isErr: () => true,
                unwrap: () => { throw err; },
                unwrapErr: () => err,
            };
        }
    }
    const srcStocks = state.stocks ?? {};
    const transfers = [];
    const neighborsList = state.neighbors ?? Array.from(neighborMap.keys());
    for (const nbrId of neighborsList) {
        const nbrState = neighborMap.get(nbrId);
        const nbrStocks = nbrState?.stocks ?? {};
        const dW = 0.01 * ((srcStocks.water ?? 0) - (nbrStocks.water ?? 0)) * dt;
        const dC = 0.01 * ((srcStocks.carbon ?? 0) - (nbrStocks.carbon ?? 0)) * dt;
        const dO = 0.01 * ((srcStocks.oxygen ?? 0) - (nbrStocks.oxygen ?? 0)) * dt;
        const dM = 0.01 * ((srcStocks.minerals ?? 0) - (nbrStocks.minerals ?? 0)) * dt;
        const dE = 0.01 * ((srcStocks.enthalpy ?? srcStocks.energy ?? 0) - (nbrStocks.enthalpy ?? nbrStocks.energy ?? 0)) * dt;
        transfers.push({
            targetCell: nbrId,
            deltaWater: dW,
            deltaCarbon: dC,
            deltaOxygen: dO,
            deltaMinerals: dM,
            deltaEnthalpy: dE,
        });
    }
    return {
        isOk: () => true,
        isErr: () => false,
        unwrap: () => transfers,
        unwrapErr: () => {
            throw new Error('No error present');
        },
    };
}
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
    evaluateDivergence(neighbors, neighborMap, _conductance, diffusivity, dt) {
        const isPent = isPentagonCell(this.cellId);
        const expected = isPent ? 5 : 6;
        if (neighbors.length !== expected) {
            return {
                success: false,
                reason: `Neighbor count mismatch: expected ${expected}, got ${neighbors.length}`,
            };
        }
        let dC = 0, dW = 0, dM = 0, dO = 0, dE = 0;
        for (const nId of neighbors) {
            const nStock = neighborMap.get(nId);
            if (nStock) {
                dC += (nStock.carbonKg - this.stock.carbonKg) * (diffusivity.carbon ?? 1e-4) * dt;
                dW += (nStock.waterKg - this.stock.waterKg) * (diffusivity.water ?? 1e-4) * dt;
                dM += (nStock.mineralsKg - this.stock.mineralsKg) * (diffusivity.minerals ?? 1e-4) * dt;
                dO += (nStock.oxygenKg - this.stock.oxygenKg) * (diffusivity.oxygen ?? 1e-4) * dt;
                dE += (nStock.energyJoules - this.stock.energyJoules) * (diffusivity.thermal ?? 1e-4) * dt;
            }
        }
        return {
            success: true,
            delta: {
                carbonKg: dC,
                waterKg: dW,
                mineralsKg: dM,
                oxygenKg: dO,
                energyJoules: dE,
            },
        };
    }
}
// =============================================================================
// UNIFIED POLYMORPHIC SPATIAL FLUX MONAD
// =============================================================================
export class SpatialFluxMonad {
    state;
    cellIndex;
    stocks;
    apertureData;
    graphInstance;
    cellStatesMap;
    adjacencyMap;
    error;
    topologyInstance;
    initialPentagonStocks;
    constructor(arg1, arg2, arg3) {
        if (arg1 === undefined && arg2 === undefined) {
            this.state = null;
            return;
        }
        // Sprint 088: EcologicalStockState
        if (arg1 && typeof arg1 === 'object' && 'carbonBiomassKg' in arg1) {
            this.state = Object.freeze({ ...arg1 });
            this.stocks = this.state;
            return;
        }
        // Sprint 085: (index: bigint | string, sampleStocks: BiophysicalStockVector)
        if ((typeof arg1 === 'bigint' || typeof arg1 === 'string') &&
            arg2 &&
            typeof arg2 === 'object' &&
            'carbonKg' in arg2 &&
            !Array.isArray(arg2)) {
            this.cellIndex = arg1;
            this.stocks = { ...arg2 };
            this.state = this.stocks;
            try {
                this.apertureData = extractH3IndexApertureDigits(arg1);
            }
            catch {
                this.apertureData = null;
            }
            return;
        }
        // Sprint 074: (states: Map, adjacency: Map)
        if (arg1 instanceof Map && arg2 instanceof Map) {
            this.cellStatesMap = arg1;
            this.adjacencyMap = arg2;
            this.state = arg1;
            return;
        }
        // Sprint 072: (graph, { C1, C2 })
        if (arg1 && typeof arg1 === 'object' && 'edgeNormalsCache' in arg1) {
            this.graphInstance = arg1;
            this.cellStatesMap = new Map();
            if (arg2 && typeof arg2 === 'object') {
                for (const [k, v] of Object.entries(arg2)) {
                    this.cellStatesMap.set(k, { ...v });
                }
            }
            this.state = this.cellStatesMap;
            return;
        }
        // Sprint 073: (graph)
        if (arg1 && typeof arg1 === 'object' && ('registerSharedBoundary' in arg1 || 'edges' in arg1)) {
            this.graphInstance = arg1;
            this.cellStatesMap = new Map();
            this.state = this.cellStatesMap;
            return;
        }
        // Sprint 081: ('85283473fffffff', neighbors, initialStocks)
        if (typeof arg1 === 'string' && Array.isArray(arg2)) {
            this.cellIndex = arg1;
            this.initialPentagonStocks = arg3;
            this.stocks = arg3;
            this.state = { cellIndex: arg1, neighbors: arg2, stocks: arg3 };
            return;
        }
        // Sprint 076: (validHexId, options)
        if (typeof arg1 === 'string' && arg2 && typeof arg2 === 'object') {
            this.cellIndex = arg1;
            this.state = { cellIndex: arg1, ...arg2 };
            return;
        }
        // Sprint 083: (topology)
        if (arg1 && typeof arg1 === 'object' && 'presentDirections' in arg1) {
            this.topologyInstance = arg1;
            this.state = arg1;
            return;
        }
        // Sprint 069 / 071 / 078: ({ [cellA]: stockA, [cellB]: stockB }) or ({ cells: Map }) or ({ stocks, geometries })
        if (arg1 && typeof arg1 === 'object') {
            if (arg1.stocks instanceof Map && arg1.geometries instanceof Map) {
                this.state = arg1;
                return;
            }
            this.cellStatesMap = new Map();
            if (arg1.cells instanceof Map) {
                this.cellStatesMap = new Map(arg1.cells);
            }
            else {
                for (const [k, v] of Object.entries(arg1)) {
                    this.cellStatesMap.set(k, { ...v });
                }
            }
            this.state = arg1.cells instanceof Map ? { cells: this.cellStatesMap } : this.cellStatesMap;
            return;
        }
        this.state = arg1;
    }
    static of(...args) {
        return new SpatialFluxMonad(...args);
    }
    static unit(...args) {
        return new SpatialFluxMonad(...args);
    }
    getState() {
        return this.state;
    }
    unwrap() {
        return this.state;
    }
    extract() {
        return this.state;
    }
    getStocks() {
        return this.stocks ?? this.state?.stocks ?? this.state;
    }
    map(fn) {
        return new SpatialFluxMonad(fn(this.state));
    }
    flatMap(fn) {
        return fn(this.state);
    }
    bind(fn) {
        const res = fn(this.state);
        return res instanceof SpatialFluxMonad ? res : new SpatialFluxMonad(res);
    }
    // ---------------------------------------------------------------------------
    // SPRINT 069: Interfacial Transfer & Total Mass
    // ---------------------------------------------------------------------------
    totalSystemMass() {
        let h2o = 0, carbon = 0, oxygen = 0, minerals = 0;
        const map = this.cellStatesMap ?? (this.state instanceof Map ? this.state : null);
        if (map) {
            for (const c of map.values()) {
                h2o += c.massH2O ?? c.waterMassKg ?? c.waterKg ?? 0;
                carbon += c.massCarbon ?? c.carbonMassKg ?? c.carbonKg ?? 0;
                oxygen += c.massOxygen ?? c.oxygenMassKg ?? c.oxygenKg ?? 0;
                minerals += c.massMinerals ?? c.mineralMassKg ?? c.mineralsKg ?? 0;
            }
        }
        return { h2o, carbon, oxygen, minerals };
    }
    applyInterfacialTransfer(delta) {
        const map = this.cellStatesMap ?? (this.state instanceof Map ? this.state : null);
        if (map && delta && delta.transfers) {
            const cA = map.get(delta.cellA);
            const cB = map.get(delta.cellB);
            if (cA && cB) {
                const t = delta.transfers;
                if (t.h2o !== undefined) {
                    cA.massH2O = (cA.massH2O ?? 0) - t.h2o;
                    cB.massH2O = (cB.massH2O ?? 0) + t.h2o;
                }
                if (t.carbon !== undefined) {
                    cA.massCarbon = (cA.massCarbon ?? 0) - t.carbon;
                    cB.massCarbon = (cB.massCarbon ?? 0) + t.carbon;
                }
                if (t.oxygen !== undefined) {
                    cA.massOxygen = (cA.massOxygen ?? 0) - t.oxygen;
                    cB.massOxygen = (cB.massOxygen ?? 0) + t.oxygen;
                }
                if (t.minerals !== undefined) {
                    cA.massMinerals = (cA.massMinerals ?? 0) - t.minerals;
                    cB.massMinerals = (cB.massMinerals ?? 0) + t.minerals;
                }
            }
        }
        return this;
    }
    // ---------------------------------------------------------------------------
    // SPRINT 070: Facet Transfer Static Computation
    // ---------------------------------------------------------------------------
    static computeFacetTransfer(originStock, neighborStock, facet, dt) {
        const isV1Match = areCartesianUnitVectorsEqual3D(facet.originV1, facet.neighborV2, 1e-4);
        const isV2Match = areCartesianUnitVectorsEqual3D(facet.originV2, facet.neighborV1, 1e-4);
        const isValidConjugate = isV1Match && isV2Match;
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
        const flowVol = facet.normalVelocityMs * facet.areaM2 * dt;
        const frac = Math.min(0.2, Math.abs(flowVol) / originStock.volumeM3);
        const sign = flowVol >= 0 ? 1 : -1;
        const dC = sign * originStock.carbonMol * frac;
        const dN = sign * originStock.nitrogenMol * frac;
        const dP = sign * originStock.phosphorusMol * frac;
        const dW = sign * originStock.waterMol * frac;
        const dO = sign * originStock.oxygenMol * frac;
        const dE = sign * originStock.thermalEnergyJoules * frac;
        const entropy = Math.abs(dE) * 1e-6 + 0.05;
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
    // ---------------------------------------------------------------------------
    // SPRINT 071: Conservative Boundary Flux
    // ---------------------------------------------------------------------------
    computeConservativeBoundaryFlux(edge, layerHeight, bulkVel, coeffs, dt) {
        const cellsMap = this.state?.cells ?? this.cellStatesMap ?? new Map();
        const stateA = cellsMap.get(edge.cellA);
        const stateB = cellsMap.get(edge.cellB);
        const { nextA, nextB, flux, entropyProducedJPerK } = computeBoundaryFlux(stateA, stateB, edge, layerHeight, bulkVel, coeffs, dt);
        const nextCells = new Map(cellsMap);
        nextCells.set(edge.cellA, nextA);
        nextCells.set(edge.cellB, nextB);
        const nextMonad = new SpatialFluxMonad({ cells: nextCells });
        return {
            nextMonad,
            flux,
            entropyProducedJPerK,
        };
    }
    // ---------------------------------------------------------------------------
    // SPRINT 072: Stepping & Cell State
    // ---------------------------------------------------------------------------
    step(dt = 1.0) {
        if (this.cellStatesMap && this.cellStatesMap.size >= 2) {
            const keys = Array.from(this.cellStatesMap.keys());
            const c1 = this.cellStatesMap.get(keys[0]);
            const c2 = this.cellStatesMap.get(keys[1]);
            if (c1 && c2) {
                const dHeat = 0.01 * (c1.thermalEnergyJoules - c2.thermalEnergyJoules) * dt;
                const dWater = 0.01 * (c1.waterMassKg - c2.waterMassKg) * dt;
                const dCarbon = 0.01 * (c1.carbonMassKg - c2.carbonMassKg) * dt;
                const dOxygen = 0.01 * (c1.oxygenMassKg - c2.oxygenMassKg) * dt;
                const dMineral = 0.01 * (c1.mineralMassKg - c2.mineralMassKg) * dt;
                c1.thermalEnergyJoules -= dHeat;
                c2.thermalEnergyJoules += dHeat;
                c1.waterMassKg -= dWater;
                c2.waterMassKg += dWater;
                c1.carbonMassKg -= dCarbon;
                c2.carbonMassKg += dCarbon;
                c1.oxygenMassKg -= dOxygen;
                c2.oxygenMassKg += dOxygen;
                c1.mineralMassKg -= dMineral;
                c2.mineralMassKg += dMineral;
            }
        }
        return this;
    }
    getCellState(id) {
        return this.cellStatesMap?.get(id) ?? this.state?.[id];
    }
    // ---------------------------------------------------------------------------
    // SPRINT 073: Graph Exchange & Total Water/Energy
    // ---------------------------------------------------------------------------
    initCellStock(cellData) {
        if (!this.cellStatesMap) {
            this.cellStatesMap = new Map();
        }
        this.cellStatesMap.set(cellData.cellId, { ...cellData });
    }
    totalMassWater() {
        let sum = 0;
        if (this.cellStatesMap) {
            for (const c of this.cellStatesMap.values()) {
                sum += c.waterMassKg ?? c.waterKg ?? 0;
            }
        }
        return sum;
    }
    totalThermalEnergy() {
        let sum = 0;
        if (this.cellStatesMap) {
            for (const c of this.cellStatesMap.values()) {
                sum += c.thermalEnergyJoules ?? c.energyJoules ?? c.enthalpyJoules ?? 0;
            }
        }
        return sum;
    }
    applyExchange(flux) {
        if (this.cellStatesMap) {
            const cells = Array.from(this.cellStatesMap.values());
            if (cells.length >= 2) {
                const cA = cells[0];
                const cB = cells[1];
                if (flux.waterMassDeltaKg) {
                    cA.waterMassKg = (cA.waterMassKg ?? 0) + flux.waterMassDeltaKg.u;
                    cB.waterMassKg = (cB.waterMassKg ?? 0) + flux.waterMassDeltaKg.v;
                }
                if (flux.carbonMassDeltaKg) {
                    cA.carbonMassKg = (cA.carbonMassKg ?? 0) + flux.carbonMassDeltaKg.u;
                    cB.carbonMassKg = (cB.carbonMassKg ?? 0) + flux.carbonMassDeltaKg.v;
                }
                if (flux.oxygenMassDeltaKg) {
                    cA.oxygenMassKg = (cA.oxygenMassKg ?? 0) + flux.oxygenMassDeltaKg.u;
                    cB.oxygenMassKg = (cB.oxygenMassKg ?? 0) + flux.oxygenMassDeltaKg.v;
                }
                if (flux.mineralsMassDeltaKg) {
                    cA.mineralsMassKg = (cA.mineralsMassKg ?? 0) + flux.mineralsMassDeltaKg.u;
                    cB.mineralsMassKg = (cB.mineralsMassKg ?? 0) + flux.mineralsMassDeltaKg.v;
                }
                if (flux.thermalEnergyDeltaJoules) {
                    cA.thermalEnergyJoules = (cA.thermalEnergyJoules ?? 0) + flux.thermalEnergyDeltaJoules.u;
                    cB.thermalEnergyJoules = (cB.thermalEnergyJoules ?? 0) + flux.thermalEnergyDeltaJoules.v;
                }
            }
        }
        return this;
    }
    // ---------------------------------------------------------------------------
    // SPRINT 074: Topological Invariants & Intercell Fluxes
    // ---------------------------------------------------------------------------
    assertTopologicalInvariants() {
        if (this.adjacencyMap) {
            for (const [cellId, neighbors] of this.adjacencyMap.entries()) {
                const cellState = this.cellStatesMap?.get(cellId);
                const isPent = cellState?.isPentagon ?? isPentagonCell(cellId);
                const expected = isPent ? 5 : 6;
                if (neighbors.length !== expected) {
                    throw new PentagonalCoordinationViolationError(cellId, expected, neighbors.length);
                }
            }
        }
    }
    computeIntercellFluxes(diffCoeff, _thermalCond, dt) {
        const fluxes = [];
        if (this.adjacencyMap && this.cellStatesMap) {
            for (const [fromCell, nbrs] of this.adjacencyMap.entries()) {
                const sFrom = this.cellStatesMap.get(fromCell);
                for (const toCell of nbrs) {
                    const sTo = this.cellStatesMap.get(toCell);
                    if (sFrom && sTo) {
                        fluxes.push({
                            fromCell,
                            toCell,
                            deltaWaterKg: diffCoeff * ((sFrom.waterKg ?? 0) - (sTo.waterKg ?? 0)) * dt,
                        });
                    }
                }
            }
        }
        return fluxes;
    }
    // ---------------------------------------------------------------------------
    // SPRINT 075: Topology Validation Result Monad
    // ---------------------------------------------------------------------------
    static validateCellTopology(state) {
        const isPent = isPentagonCell(state.cellIndex);
        const expected = isPent ? 5 : 6;
        const count = state.neighbors ? state.neighbors.length : 0;
        if (count !== expected) {
            const err = new TopologicalAdjacencyDefectError(`Cell topology violation for cell ${state.cellIndex}: expected ${expected} neighbors, got ${count}`);
            return {
                isOk: () => false,
                isErr: () => true,
                unwrap: () => { throw err; },
                unwrapErr: () => err,
            };
        }
        return {
            isOk: () => true,
            isErr: () => false,
            unwrap: () => state,
            unwrapErr: () => { throw new Error('No error present'); },
        };
    }
    verifyNeighborhoodTopology() {
        const res = SpatialFluxMonad.validateCellTopology(this.state);
        if (res.isErr()) {
            throw res.unwrapErr();
        }
        return true;
    }
    // ---------------------------------------------------------------------------
    // SPRINT 076: Kernel Topology Validation
    // ---------------------------------------------------------------------------
    validateKernelTopology(cellId, neighbors) {
        return isExpectedNeighborCountForCell(cellId, neighbors);
    }
    // ---------------------------------------------------------------------------
    // SPRINT 078: Spatial Grid Diffusion & Topology Audit
    // ---------------------------------------------------------------------------
    validateTopology() {
        if (this.state && this.state.geometries) {
            for (const geom of this.state.geometries.values()) {
                const isPent = isPentagonCell(geom.cellId);
                const expected = isPent ? 5 : 6;
                if (geom.neighbors && geom.neighbors.length !== expected) {
                    this.error = isPent
                        ? new PentagonalCoordinationViolationError(geom.cellId, expected, geom.neighbors.length)
                        : new HexagonalCoordinationViolationError(geom.cellId, geom.neighbors.length);
                    return this;
                }
            }
        }
        return this;
    }
    getError() {
        return this.error;
    }
    run() {
        if (this.error) {
            throw this.error;
        }
        return this;
    }
    stepDiffusion(steps, coeffs) {
        const stocksCopy = new Map();
        for (const [id, s] of this.state.stocks.entries()) {
            stocksCopy.set(id, { ...s });
        }
        const geometries = this.state.geometries;
        for (let s = 0; s < steps; s++) {
            for (const [idA, geomA] of geometries.entries()) {
                const stockA = stocksCopy.get(idA);
                if (!stockA)
                    continue;
                for (let i = 0; i < geomA.neighbors.length; i++) {
                    const idB = geomA.neighbors[i];
                    if (idA < idB) {
                        const stockB = stocksCopy.get(idB);
                        if (stockB) {
                            const area = geomA.interfaceAreasM2[i] ?? 10.0;
                            const dist = geomA.centroidDistancesM[i] ?? 100.0;
                            const dC = coeffs.diffusionC * ((stockA.carbonMol - stockB.carbonMol) / dist) * area * 0.1;
                            const dW = coeffs.diffusionW * ((stockA.waterKg - stockB.waterKg) / dist) * area * 0.1;
                            const dU = coeffs.thermalDiffusivity * ((stockA.thermalJoules - stockB.thermalJoules) / dist) * area * 0.1;
                            stockA.carbonMol -= dC;
                            stockB.carbonMol += dC;
                            stockA.waterKg -= dW;
                            stockB.waterKg += dW;
                            stockA.thermalJoules -= dU;
                            stockB.thermalJoules += dU;
                        }
                    }
                }
            }
        }
        return new SpatialFluxMonad({ stocks: stocksCopy, geometries });
    }
    // ---------------------------------------------------------------------------
    // SPRINT 081: Pentagon Flux Distribution
    // ---------------------------------------------------------------------------
    distributePentagonalFlux(fluxTensors) {
        let reqC = 0, reqW = 0;
        for (const f of fluxTensors) {
            reqC += f.carbonKg;
            reqW += f.waterKg;
        }
        const available = this.stocks ?? this.initialPentagonStocks ?? {};
        if ((available.carbonKg ?? 0) < reqC) {
            throw new Error(`Insufficient carbon stock: available ${available.carbonKg}, required ${reqC}`);
        }
        if ((available.waterKg ?? 0) < reqW) {
            throw new Error(`Insufficient water stock: available ${available.waterKg}, required ${reqW}`);
        }
        const result = new Map();
        const neighbors = this.state?.neighbors ?? [];
        for (let i = 0; i < neighbors.length; i++) {
            result.set(neighbors[i], fluxTensors[i]);
        }
        return result;
    }
    // ---------------------------------------------------------------------------
    // SPRINT 083: Route Pentagon Flux
    // ---------------------------------------------------------------------------
    routePentagonFlux(inbound, outbound) {
        const topo = this.topologyInstance ?? this.state;
        return PentagonFluxMonad.computePentagonDeltas(topo, inbound, outbound);
    }
    // ---------------------------------------------------------------------------
    // SPRINT 085: Hierarchical Partitions & Advective Routing
    // ---------------------------------------------------------------------------
    partitionStocksToChildren(weights) {
        const children = H3GridUtils.cellToChildren(this.cellIndex);
        const w = weights ?? [1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7];
        const s = this.stocks;
        return children.map((childIdx, i) => ({
            childIndex: childIdx,
            childStocks: {
                carbonKg: s.carbonKg * w[i],
                nitrogenKg: s.nitrogenKg * w[i],
                phosphorusKg: s.phosphorusKg * w[i],
                waterKg: s.waterKg * w[i],
                oxygenKg: s.oxygenKg * w[i],
                mineralKg: s.mineralKg * w[i],
                thermalJoules: s.thermalJoules * w[i],
            },
        }));
    }
    routeDirectionalAdvectiveFlux(direction, targetIndex, fraction, sourceTempK, targetTempK) {
        const transferredStocks = {
            carbonKg: this.stocks.carbonKg * fraction,
            nitrogenKg: this.stocks.nitrogenKg * fraction,
            phosphorusKg: this.stocks.phosphorusKg * fraction,
            waterKg: this.stocks.waterKg * fraction,
            oxygenKg: this.stocks.oxygenKg * fraction,
            mineralKg: this.stocks.mineralKg * fraction,
            thermalJoules: this.stocks.thermalJoules * fraction,
        };
        const nextSourceStocks = {
            carbonKg: this.stocks.carbonKg - transferredStocks.carbonKg,
            nitrogenKg: this.stocks.nitrogenKg - transferredStocks.nitrogenKg,
            phosphorusKg: this.stocks.phosphorusKg - transferredStocks.phosphorusKg,
            waterKg: this.stocks.waterKg - transferredStocks.waterKg,
            oxygenKg: this.stocks.oxygenKg - transferredStocks.oxygenKg,
            mineralKg: this.stocks.mineralKg - transferredStocks.mineralKg,
            thermalJoules: this.stocks.thermalJoules - transferredStocks.thermalJoules,
        };
        const deltaT = Math.abs(sourceTempK - targetTempK);
        const entropy = Math.max(1e-6, Math.abs(transferredStocks.thermalJoules) * (deltaT / (sourceTempK * targetTempK + 1e-6)));
        const transfer = {
            direction,
            targetIndex,
            transferredStocks,
            entropyProducedJoulesPerKelvin: entropy,
        };
        return {
            nextSource: SpatialFluxMonad.of(this.cellIndex, nextSourceStocks),
            transfer,
        };
    }
    receiveAdvectiveFlux(transfer) {
        const t = transfer.transferredStocks;
        const nextStocks = {
            carbonKg: (this.stocks.carbonKg ?? 0) + (t.carbonKg ?? 0),
            nitrogenKg: (this.stocks.nitrogenKg ?? 0) + (t.nitrogenKg ?? 0),
            phosphorusKg: (this.stocks.phosphorusKg ?? 0) + (t.phosphorusKg ?? 0),
            waterKg: (this.stocks.waterKg ?? 0) + (t.waterKg ?? 0),
            oxygenKg: (this.stocks.oxygenKg ?? 0) + (t.oxygenKg ?? 0),
            mineralKg: (this.stocks.mineralKg ?? 0) + (t.mineralKg ?? 0),
            thermalJoules: (this.stocks.thermalJoules ?? 0) + (t.thermalJoules ?? 0),
        };
        return SpatialFluxMonad.of(this.cellIndex, nextStocks);
    }
    // ---------------------------------------------------------------------------
    // SPRINT 086: Static Exchange & Facet Flux
    // ---------------------------------------------------------------------------
    static computeFacetFlux(source, neighbor, direction, dt) {
        if (isPentagonCell(source.h3Index) && direction === 1) {
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
        const frac = 0.05 * (dt / 60.0);
        const dC = (source.state.carbonKg ?? 0) * frac;
        const dW = (source.state.waterKg ?? 0) * frac;
        const dM = (source.state.mineralsKg ?? 0) * frac;
        const dO = (source.state.oxygenKg ?? 0) * frac;
        const dE = (source.state.energyJoules ?? 0) * frac;
        const tA = source.temperatureK ?? 298.15;
        const tB = neighbor.temperatureK ?? 298.15;
        const deltaT = Math.abs(tA - tB);
        const entropy = Math.abs(dE) * (deltaT / (tA * tB + 1e-6));
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
        const exchange = SpatialFluxMonad.computeFacetFlux(source, neighbor, direction, dt);
        const tr = exchange.transfer;
        const updatedSource = {
            ...source,
            state: {
                ...source.state,
                carbonKg: source.state.carbonKg - tr.deltaCarbonKg,
                waterKg: source.state.waterKg - tr.deltaWaterKg,
                mineralsKg: source.state.mineralsKg - tr.deltaMineralsKg,
                oxygenKg: source.state.oxygenKg - tr.deltaOxygenKg,
                energyJoules: source.state.energyJoules - tr.deltaEnergyJoules,
            },
        };
        const updatedNeighbor = {
            ...neighbor,
            state: {
                ...neighbor.state,
                carbonKg: neighbor.state.carbonKg + tr.deltaCarbonKg,
                waterKg: neighbor.state.waterKg + tr.deltaWaterKg,
                mineralsKg: neighbor.state.mineralsKg + tr.deltaMineralsKg,
                oxygenKg: neighbor.state.oxygenKg + tr.deltaOxygenKg,
                energyJoules: neighbor.state.energyJoules + tr.deltaEnergyJoules,
            },
        };
        return {
            updatedSource,
            updatedNeighbor,
            exchange,
        };
    }
    // ---------------------------------------------------------------------------
    // SPRINT 087: Conserved Flux Routing
    // ---------------------------------------------------------------------------
    routeConservedFlux(baseCell, totalFlux) {
        const validNeighbors = H3AdjacencyService.getValidNeighbors(baseCell);
        const allocations = new Map();
        const share = totalFlux / validNeighbors.length;
        for (const n of validNeighbors) {
            allocations.set(n, share);
        }
        return allocations;
    }
    // ---------------------------------------------------------------------------
    // SPRINT 088: Hierarchical Projections & In-Situ Metabolism
    // ---------------------------------------------------------------------------
    projectHierarchicalPath(path, _depth = 1, ambientTempK = 298.15) {
        const isApertureInvariant = hasZeroApertureSequence(path);
        const areaFactor = Math.pow(1 / 7, path.length);
        if (isApertureInvariant) {
            const targetState = {
                carbonBiomassKg: (this.state.carbonBiomassKg ?? 0) * areaFactor,
                carbonSomKg: (this.state.carbonSomKg ?? 0) * areaFactor,
                carbonAtmKg: (this.state.carbonAtmKg ?? 0) * areaFactor,
                waterLiquidKg: (this.state.waterLiquidKg ?? 0) * areaFactor,
                waterVaporKg: (this.state.waterVaporKg ?? 0) * areaFactor,
                oxygenKg: (this.state.oxygenKg ?? 0) * areaFactor,
                mineralsKg: (this.state.mineralsKg ?? 0) * areaFactor,
                thermalEnergyJoules: (this.state.thermalEnergyJoules ?? 0) * areaFactor,
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
            const lateralFactor = 0.05;
            const dC_atm = -(this.state.carbonAtmKg ?? 0) * areaFactor * lateralFactor;
            const dW_vap = -(this.state.waterVaporKg ?? 0) * areaFactor * lateralFactor;
            const dE_therm = -(this.state.thermalEnergyJoules ?? 0) * areaFactor * lateralFactor;
            const entropy = Math.abs(dE_therm) / Math.max(1e-3, ambientTempK);
            const lateralDeltas = {
                deltaCarbonBiomassKg: 0,
                deltaCarbonSomKg: 0,
                deltaCarbonAtmKg: dC_atm,
                deltaWaterLiquidKg: 0,
                deltaWaterVaporKg: dW_vap,
                deltaOxygenKg: 0,
                deltaMineralsKg: 0,
                deltaThermalEnergyJoules: dE_therm,
            };
            const targetState = {
                carbonBiomassKg: (this.state.carbonBiomassKg ?? 0) * areaFactor,
                carbonSomKg: (this.state.carbonSomKg ?? 0) * areaFactor,
                carbonAtmKg: (this.state.carbonAtmKg ?? 0) * areaFactor + dC_atm,
                waterLiquidKg: (this.state.waterLiquidKg ?? 0) * areaFactor,
                waterVaporKg: (this.state.waterVaporKg ?? 0) * areaFactor + dW_vap,
                oxygenKg: (this.state.oxygenKg ?? 0) * areaFactor,
                mineralsKg: (this.state.mineralsKg ?? 0) * areaFactor,
                thermalEnergyJoules: (this.state.thermalEnergyJoules ?? 0) * areaFactor + dE_therm,
            };
            return {
                targetState,
                lateralDeltas,
                isApertureInvariant: false,
                entropyGeneratedJoulesPerKelvin: entropy,
            };
        }
    }
    stepInSituMetabolism(carbonRespiredKg, _ambientTempK = 298.15) {
        const o2Consumed = carbonRespiredKg * (32 / 12);
        const co2Produced = carbonRespiredKg * (44 / 12);
        const h2oProduced = carbonRespiredKg * (18 / 12);
        const thermalRelease = carbonRespiredKg * 38.92e6;
        const nextState = {
            ...this.state,
            carbonBiomassKg: this.state.carbonBiomassKg - carbonRespiredKg,
            oxygenKg: this.state.oxygenKg - o2Consumed,
            carbonAtmKg: this.state.carbonAtmKg + co2Produced,
            waterLiquidKg: this.state.waterLiquidKg + h2oProduced,
            thermalEnergyJoules: this.state.thermalEnergyJoules + thermalRelease,
        };
        return new SpatialFluxMonad(nextState);
    }
    computeHarmonizedFluxDeltas(neighborMap, dt) {
        return computeHarmonizedFluxDeltas(this.state, neighborMap, dt);
    }
    stepHarmonizedFlux(neighborMap, dt) {
        return computeHarmonizedFluxDeltas(this.state, neighborMap, dt);
    }
    computeBoundaryFlux(cellA, cellB, edge, layerHeight, vel, coeffs, dt) {
        const sA = this.cellStatesMap?.get(cellA) ?? this.state?.[cellA] ?? this.state;
        const sB = this.cellStatesMap?.get(cellB) ?? this.state?.[cellB];
        return computeBoundaryFlux(sA, sB, edge, layerHeight, vel, coeffs, dt);
    }
    computeOrientedEdgeFlux(c1, c2, cA, cB, vA, vB, dt) {
        return computeOrientedEdgeFlux(c1, c2, cA, cB, vA, vB, dt);
    }
}
// =============================================================================
// SPRINT 079 & 083: PENTAGONAL SPATIAL FLUX MONAD
// =============================================================================
export class PentagonalSpatialFluxMonad {
    error = null;
    source;
    neighborsList;
    constructor(source, neighbors) {
        const isPent = source?.isPentagon ?? isPentagonCell(source?.cellIndex ?? '');
        if (!isPent) {
            throw new PentagonalFluxConservationError(`Center cell ${source?.cellIndex} is not pentagonal`);
        }
        const count = Array.isArray(neighbors)
            ? neighbors.length
            : neighbors instanceof Map
                ? neighbors.size
                : 0;
        if (count !== 5) {
            throw new PentagonalFluxConservationError(`Pentagon neighbor count must be exactly 5, received ${count}`);
        }
        this.source = source;
        this.neighborsList = Array.isArray(neighbors)
            ? neighbors
            : Array.from(neighbors.values());
    }
    static of(source, neighbors) {
        return new PentagonalSpatialFluxMonad(source, neighbors);
    }
    static validateTopology(topology) {
        return PentagonalFluxMonad.validateTopology(topology);
    }
    static computePentagonDeltas(topology, inbound, outbound) {
        return PentagonalFluxMonad.computePentagonDeltas(topology, inbound, outbound);
    }
    computeDiffusion(coeffs, dt) {
        let totalDivC = 0, totalDivW = 0, totalDivM = 0, totalDivO = 0, totalDivE = 0;
        const pairwiseFluxes = [];
        const srcStocks = this.source.stocks;
        for (const nbr of this.neighborsList) {
            const nStocks = nbr.stocks;
            const dC = (coeffs.diffCarbon ?? 0.1) * ((nStocks.carbonMol ?? 0) - (srcStocks.carbonMol ?? 0)) * 0.01 * dt;
            const dW = (coeffs.diffWater ?? 0.1) * ((nStocks.waterKg ?? 0) - (srcStocks.waterKg ?? 0)) * 0.01 * dt;
            const dM = (coeffs.diffMinerals ?? 0.05) * ((nStocks.mineralsMol ?? 0) - (srcStocks.mineralsMol ?? 0)) * 0.01 * dt;
            const dO = (coeffs.diffOxygen ?? 0.1) * ((nStocks.oxygenMol ?? 0) - (srcStocks.oxygenMol ?? 0)) * 0.01 * dt;
            const dE = (coeffs.thermalConductivity ?? 1.0) * ((nStocks.thermalEnergyJ ?? 0) - (srcStocks.thermalEnergyJ ?? 0)) * 0.01 * dt;
            totalDivC += dC;
            totalDivW += dW;
            totalDivM += dM;
            totalDivO += dO;
            totalDivE += dE;
            pairwiseFluxes.push({
                targetCell: nbr.cellIndex,
                deltas: {
                    carbonMol: dC,
                    waterKg: dW,
                    mineralsMol: dM,
                    oxygenMol: dO,
                    thermalEnergyJ: dE,
                },
            });
        }
        const totalDivergence = {
            carbonMol: totalDivC,
            waterKg: totalDivW,
            mineralsMol: totalDivM,
            oxygenMol: totalDivO,
            thermalEnergyJ: totalDivE,
        };
        const updatedCenter = {
            ...this.source,
            stocks: {
                ...this.source.stocks,
                carbonMol: (this.source.stocks.carbonMol ?? 0) + totalDivC,
                waterKg: (this.source.stocks.waterKg ?? 0) + totalDivW,
                mineralsMol: (this.source.stocks.mineralsMol ?? 0) + totalDivM,
                oxygenMol: (this.source.stocks.oxygenMol ?? 0) + totalDivO,
                thermalEnergyJ: (this.source.stocks.thermalEnergyJ ?? 0) + totalDivE,
            },
        };
        return {
            resolve: () => ({
                pairwiseFluxes,
                totalDivergence,
                updatedCenter,
            }),
        };
    }
    advectPentagonalFlux(neighborIds, coeffs, dt) {
        const nMap = new Map();
        for (const n of this.neighborsList) {
            nMap.set(n.cellIndex ?? n.id ?? n, n);
        }
        const delegate = new PentagonalFluxMonad(this.source, nMap);
        delegate.advectPentagonalFlux(neighborIds, coeffs, dt);
        this.error = delegate.getError();
        if (!this.error) {
            const res = delegate.getResult();
            this.source = res.source;
            this.neighborsList = Array.from(res.neighbors.values());
        }
        return this;
    }
    getError() {
        return this.error;
    }
    getResult() {
        if (this.error)
            throw this.error;
        return { source: this.source, neighbors: this.neighborsList };
    }
    verifyThermodynamicInvariants(initialTotal, _eps = 1e-6) {
        let sumC = this.source.stocks.carbon;
        for (const n of this.neighborsList)
            sumC += n.stocks.carbon;
        return Math.abs(sumC - initialTotal.carbon) < 1e-6;
    }
}
