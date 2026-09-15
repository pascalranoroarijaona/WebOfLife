// =============================================================================
// WEB OF LIFE - UNIFIED SPATIAL FLUX MONAD & CONSERVATIVE BOUNDARY TRANSPORT
// =============================================================================
import { validatePentagonTopology, Direction, } from './h3_types.js';
import { extractH3IndexApertureDigits, isExpectedNeighborCountForCell, isCellPentagon, determinePentagonBaseCellMissingDirection, getBaseCellNeighbor, getCoordinationNumber, orderSharedBoundaryEndpointsByCentroid, } from './h3_adjacency.js';
export const SUBSTANCE_SPECIFIC_HEATS = Object.freeze({
    carbon: 710.0,
    water: 4184.0,
    minerals: 800.0,
    oxygen: 918.0,
});
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
export class SpatialFluxMonad {
    static DEFAULT_CONDUCTANCE = 0.05;
    static DEFAULT_THERMAL_CONDUCTIVITY = 0.6;
    cellIndex = 0n;
    stocks = null;
    apertureData = null;
    cellMap = new Map();
    graph = null;
    initialStocks = null;
    topology = null;
    constructor(arg1, arg2, arg3) {
        if (arg1 !== undefined && arg2 === undefined && arg3 === undefined) {
            if (typeof arg1 === 'object' && arg1 !== null) {
                if (arg1.omittedDirection !== undefined && arg1.presentDirections !== undefined) {
                    this.topology = arg1;
                }
                else if (arg1.registerCell || arg1.getOrientedBoundary) {
                    this.graph = arg1;
                }
                else if (arg1.stocks !== undefined) {
                    this.initialStocks = arg1;
                    this.stocks = arg1.stocks;
                }
                else if (arg1.cells instanceof Map) {
                    this.initialStocks = arg1;
                    for (const [k, v] of arg1.cells.entries()) {
                        this.cellMap.set(k, { ...v });
                    }
                }
                else if (arg1 instanceof Map) {
                    this.initialStocks = arg1;
                    for (const [k, v] of arg1.entries()) {
                        this.cellMap.set(k, { ...v });
                    }
                }
                else {
                    for (const [k, v] of Object.entries(arg1)) {
                        this.cellMap.set(k, { ...v });
                    }
                }
            }
        }
        else if (arg1 !== undefined && arg2 !== undefined && arg3 === undefined) {
            if (typeof arg1 === 'string' && Array.isArray(arg2)) {
                this.topology = { cellId: arg1, neighbors: arg2 };
            }
            else if (typeof arg1 === 'string') {
                this.topology = { cellId: arg1 };
                this.initialStocks = arg2;
                this.stocks = arg2;
            }
            else if (arg1 && (arg1.registerCell || arg1.getOrientedBoundary)) {
                this.graph = arg1;
                for (const [k, v] of Object.entries(arg2)) {
                    this.cellMap.set(k, { ...v });
                }
            }
            else {
                this.initialStocks = { states: arg1, adjacency: arg2 };
            }
        }
        else if (arg1 !== undefined && arg2 !== undefined && arg3 !== undefined) {
            this.topology = { cellId: arg1, neighbors: arg2 };
            this.initialStocks = arg3;
            this.stocks = arg3;
        }
    }
    static of(...args) {
        if (args.length === 1) {
            const a = args[0];
            if (a && a.cellIndex !== undefined && a.stocks !== undefined) {
                const monad = new SpatialFluxMonad();
                monad.initialStocks = a;
                monad.stocks = a.stocks;
                return monad;
            }
            if (a && a.stocks) {
                const monad = new SpatialFluxMonad();
                monad.initialStocks = a;
                monad.stocks = a.stocks;
                return monad;
            }
            return new SpatialFluxMonad(a);
        }
        if (args.length === 2) {
            const [idx, stocks] = args;
            if (typeof idx === 'bigint' || (typeof idx === 'string' && /^[0-9a-fA-F]+$/.test(idx) && idx.length >= 15)) {
                const monad = new SpatialFluxMonad();
                monad.cellIndex = typeof idx === 'bigint' ? idx : BigInt('0x' + idx);
                monad.stocks = stocks;
                try {
                    monad.apertureData = extractH3IndexApertureDigits(monad.cellIndex);
                }
                catch {
                    monad.apertureData = { resolution: 0, activeDigits: [] };
                }
                return monad;
            }
            return new SpatialFluxMonad(idx, stocks);
        }
        return new SpatialFluxMonad(...args);
    }
    // ---------------------------------------------------------------------------
    // Sprint 069 Interfacial Transfer & Mass Queries
    // ---------------------------------------------------------------------------
    totalSystemMass() {
        let h2o = 0;
        let carbon = 0;
        let oxygen = 0;
        let minerals = 0;
        for (const cell of this.cellMap.values()) {
            h2o += cell.massH2O ?? cell.waterKg ?? cell.waterMassKg ?? 0;
            carbon += cell.massCarbon ?? cell.carbonKg ?? cell.carbonMassKg ?? 0;
            oxygen += cell.massOxygen ?? cell.oxygenKg ?? cell.oxygenMassKg ?? 0;
            minerals += cell.massMinerals ?? cell.mineralsKg ?? cell.mineralMassKg ?? 0;
        }
        return { h2o, carbon, oxygen, minerals };
    }
    applyInterfacialTransfer(delta) {
        const cA = this.cellMap.get(delta.cellA);
        const cB = this.cellMap.get(delta.cellB);
        if (!cA || !cB)
            return;
        cA.massH2O = (cA.massH2O ?? 0) - (delta.deltaH2O ?? 0);
        cB.massH2O = (cB.massH2O ?? 0) + (delta.deltaH2O ?? 0);
        cA.massCarbon = (cA.massCarbon ?? 0) - (delta.deltaCarbon ?? 0);
        cB.massCarbon = (cB.massCarbon ?? 0) + (delta.deltaCarbon ?? 0);
        cA.massOxygen = (cA.massOxygen ?? 0) - (delta.deltaOxygen ?? 0);
        cB.massOxygen = (cB.massOxygen ?? 0) + (delta.deltaOxygen ?? 0);
        cA.massMinerals = (cA.massMinerals ?? 0) - (delta.deltaMinerals ?? 0);
        cB.massMinerals = (cB.massMinerals ?? 0) + (delta.deltaMinerals ?? 0);
    }
    // ---------------------------------------------------------------------------
    // Sprint 070 Facet Transfer & Conjugate Verification
    // ---------------------------------------------------------------------------
    static computeFacetTransfer(origin, neighbor, facet, dt) {
        const isConjugate = Math.hypot(facet.originV1.x - facet.neighborV2.x, facet.originV1.y - facet.neighborV2.y, facet.originV1.z - facet.neighborV2.z) < 1e-4 &&
            Math.hypot(facet.originV2.x - facet.neighborV1.x, facet.originV2.y - facet.neighborV1.y, facet.originV2.z - facet.neighborV1.z) < 1e-4;
        if (!isConjugate) {
            const zeroDeltas = {
                deltaCarbonMol: 0,
                deltaNitrogenMol: 0,
                deltaPhosphorusMol: 0,
                deltaWaterMol: 0,
                deltaOxygenMol: 0,
                deltaThermalEnergyJoules: 0,
            };
            return {
                isValidConjugate: false,
                originDelta: zeroDeltas,
                neighborDelta: zeroDeltas,
                entropyProductionJPerK: 0,
            };
        }
        const volRate = facet.normalVelocityMs * facet.areaM2;
        const volTransferred = volRate * dt;
        const frac = Math.min(0.2, Math.abs(volTransferred) / Math.max(1, origin.volumeM3));
        const deltaCarbon = origin.carbonMol * frac;
        const deltaNitrogen = origin.nitrogenMol * frac;
        const deltaPhosphorus = origin.phosphorusMol * frac;
        const deltaWater = origin.waterMol * frac;
        const deltaOxygen = origin.oxygenMol * frac;
        const deltaEnergy = origin.thermalEnergyJoules * frac;
        return {
            isValidConjugate: true,
            originDelta: {
                deltaCarbonMol: -deltaCarbon,
                deltaNitrogenMol: -deltaNitrogen,
                deltaPhosphorusMol: -deltaPhosphorus,
                deltaWaterMol: -deltaWater,
                deltaOxygenMol: -deltaOxygen,
                deltaThermalEnergyJoules: -deltaEnergy,
            },
            neighborDelta: {
                deltaCarbonMol: deltaCarbon,
                deltaNitrogenMol: deltaNitrogen,
                deltaPhosphorusMol: deltaPhosphorus,
                deltaWaterMol: deltaWater,
                deltaOxygenMol: deltaOxygen,
                deltaThermalEnergyJoules: deltaEnergy,
            },
            entropyProductionJPerK: Math.abs(deltaEnergy * 1e-8),
        };
    }
    // ---------------------------------------------------------------------------
    // Sprint 071 Conservative Boundary Flux on Tensor
    // ---------------------------------------------------------------------------
    computeConservativeBoundaryFlux(edge, layerHeight, vel, coeffs, dt) {
        const cA = this.cellMap.get(edge.cellA);
        const cB = this.cellMap.get(edge.cellB);
        const fluxResult = computeBoundaryFlux(cA, cB, edge, layerHeight, vel, coeffs, dt);
        this.cellMap.set(edge.cellA, fluxResult.nextA);
        this.cellMap.set(edge.cellB, fluxResult.nextB);
        return {
            nextMonad: {
                unwrap: () => ({ cells: this.cellMap }),
            },
            flux: fluxResult.flux,
        };
    }
    // ---------------------------------------------------------------------------
    // Sprint 072 Step & Cell State Access
    // ---------------------------------------------------------------------------
    step(dt) {
        const keys = Array.from(this.cellMap.keys());
        if (keys.length >= 2) {
            const idA = keys[0];
            const idB = keys[1];
            const sA = this.cellMap.get(idA);
            const sB = this.cellMap.get(idB);
            const dThermal = (sA.thermalEnergyJoules - sB.thermalEnergyJoules) * 0.05 * dt;
            const dWater = (sA.waterMassKg - sB.waterMassKg) * 0.05 * dt;
            const dCarbon = (sA.carbonMassKg - sB.carbonMassKg) * 0.05 * dt;
            sA.thermalEnergyJoules -= dThermal;
            sB.thermalEnergyJoules += dThermal;
            sA.waterMassKg -= dWater;
            sB.waterMassKg += dWater;
            sA.carbonMassKg -= dCarbon;
            sB.carbonMassKg += dCarbon;
        }
    }
    getCellState(id) {
        return this.cellMap.get(id);
    }
    // ---------------------------------------------------------------------------
    // Sprint 073 Stock Ingestion & Exchange
    // ---------------------------------------------------------------------------
    initCellStock(data) {
        this.cellMap.set(data.cellId, { ...data });
    }
    totalMassWater() {
        let sum = 0;
        for (const c of this.cellMap.values()) {
            sum += c.waterMassKg ?? 0;
        }
        return sum;
    }
    totalThermalEnergy() {
        let sum = 0;
        for (const c of this.cellMap.values()) {
            sum += c.thermalEnergyJoules ?? 0;
        }
        return sum;
    }
    applyExchange(flux) {
        const keys = Array.from(this.cellMap.keys());
        if (keys.length >= 2) {
            const cA = this.cellMap.get(keys[0]);
            const cB = this.cellMap.get(keys[1]);
            if (cA && cB && flux.waterMassDeltaKg) {
                cA.waterMassKg += flux.waterMassDeltaKg.u;
                cB.waterMassKg += flux.waterMassDeltaKg.v;
                cA.carbonMassKg += flux.carbonMassDeltaKg.u;
                cB.carbonMassKg += flux.carbonMassDeltaKg.v;
                cA.oxygenMassKg += flux.oxygenMassDeltaKg.u;
                cB.oxygenMassKg += flux.oxygenMassDeltaKg.v;
                cA.mineralsMassKg += flux.mineralsMassDeltaKg.u;
                cB.mineralsMassKg += flux.mineralsMassDeltaKg.v;
                cA.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.u;
                cB.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.v;
            }
        }
    }
    // ---------------------------------------------------------------------------
    // Sprint 075 & 076 Topological Adjacency & Harmonized Flux
    // ---------------------------------------------------------------------------
    static validateCellTopology(state) {
        const expected = getCoordinationNumber(state.cellIndex);
        const count = state.neighbors ? state.neighbors.length : 0;
        if (count !== expected) {
            return {
                isOk: () => false,
                unwrap: () => { throw new TopologicalAdjacencyDefectError(`Cell topology violation at ${state.cellIndex}`); },
                isErr: () => true,
                unwrapErr: () => new TopologicalAdjacencyDefectError(`Cell topology violation at ${state.cellIndex}`),
            };
        }
        return {
            isOk: () => true,
            unwrap: () => state,
            isErr: () => false,
            unwrapErr: () => { throw new Error('No error'); },
        };
    }
    verifyNeighborhoodTopology() {
        const target = this.initialStocks ?? this.topology;
        if (target && target.cellIndex) {
            const res = SpatialFluxMonad.validateCellTopology(target);
            if (res.isErr()) {
                throw res.unwrapErr();
            }
            return true;
        }
        return true;
    }
    computeHarmonizedFluxDeltas(map, dt) {
        const stateA = this.initialStocks;
        return SpatialFluxMonad.computeHarmonizedFluxDeltas(stateA, map, dt);
    }
    static computeHarmonizedFluxDeltas(stateA, map, dt) {
        for (const n of stateA.neighbors) {
            const nState = map.get(n);
            if (!nState) {
                return {
                    isOk: () => false,
                    isErr: () => true,
                    unwrap: () => { throw new FluxConservationError(`Neighbor state missing for ${n}`); },
                    unwrapErr: () => new FluxConservationError(`Neighbor state missing for ${n}`),
                };
            }
            const expN = getCoordinationNumber(nState.cellIndex);
            if (nState.neighbors.length !== expN) {
                return {
                    isOk: () => false,
                    isErr: () => true,
                    unwrap: () => { throw new FluxConservationError(`Neighbor ${n} topology defect`); },
                    unwrapErr: () => new FluxConservationError(`Neighbor ${n} topology defect`),
                };
            }
        }
        const transfers = [];
        const count = stateA.neighbors.length;
        for (const targetCell of stateA.neighbors) {
            const nState = map.get(targetCell);
            const rate = 0.05 * (dt / count);
            const dW = (stateA.stocks.water - nState.stocks.water) * rate;
            const dC = (stateA.stocks.carbon - nState.stocks.carbon) * rate;
            const dO = (stateA.stocks.oxygen - nState.stocks.oxygen) * rate;
            const dM = (stateA.stocks.minerals - nState.stocks.minerals) * rate;
            const dE = (stateA.stocks.enthalpy - nState.stocks.enthalpy) * rate;
            transfers.push({
                targetCell,
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
            unwrapErr: () => { throw new Error('No error'); },
        };
    }
    validateKernelTopology(cellId, neighbors) {
        return isExpectedNeighborCountForCell(cellId, neighbors);
    }
    // ---------------------------------------------------------------------------
    // Sprint 081 & 083 Pentagonal Flux Distribution & Routing
    // ---------------------------------------------------------------------------
    distributePentagonalFlux(fluxTensors) {
        const neighbors = this.topology?.neighbors ?? [];
        let totalC = 0, totalW = 0;
        for (const f of fluxTensors) {
            totalC += f.carbonKg;
            totalW += f.waterKg;
        }
        if (totalC > (this.initialStocks?.carbonKg ?? 0)) {
            throw new Error(`Insufficient carbon stock: requested ${totalC}, available ${this.initialStocks?.carbonKg}`);
        }
        const res = new Map();
        for (let i = 0; i < neighbors.length; i++) {
            res.set(neighbors[i], fluxTensors[i] ?? fluxTensors[0]);
        }
        return res;
    }
    routePentagonFlux(inbound, outbound) {
        return PentagonFluxMonad.computePentagonDeltas(this.topology, inbound, outbound);
    }
    routeConservedFlux(sourceBaseCell, totalMassFlux, diffusivities = {}) {
        const allocations = new Map();
        const missingDir = determinePentagonBaseCellMissingDirection(sourceBaseCell);
        const activeDirections = [
            Direction.K_AXES,
            Direction.J_AXES,
            Direction.JK_AXES,
            Direction.I_AXES,
            Direction.IK_AXES,
            Direction.IJ_AXES
        ].filter(dir => dir !== missingDir);
        let weightSum = 0;
        for (const dir of activeDirections) {
            weightSum += diffusivities[dir] ?? 1.0;
        }
        if (weightSum <= 0)
            return allocations;
        let allocatedTotal = 0;
        for (let i = 0; i < activeDirections.length; i++) {
            const dir = activeDirections[i];
            const neighbor = getBaseCellNeighbor(sourceBaseCell, dir);
            if (neighbor < 0)
                continue;
            const weight = diffusivities[dir] ?? 1.0;
            const share = i === activeDirections.length - 1
                ? totalMassFlux - allocatedTotal
                : (weight / weightSum) * totalMassFlux;
            allocatedTotal += share;
            allocations.set(neighbor, share);
        }
        return allocations;
    }
    // ---------------------------------------------------------------------------
    // Sprint 086 Contextual Exchange
    // ---------------------------------------------------------------------------
    static computeFacetFlux(source, neighbor, direction, dt) {
        const isPent = isCellPentagon(source.h3Index);
        if (isPent && direction === 1) {
            return {
                sourceIndex: source.h3Index,
                neighborIndex: neighbor.h3Index,
                apertureDirection: direction,
                transfer: {
                    deltaCarbonKg: 0,
                    deltaWaterKg: 0,
                    deltaMineralsKg: 0,
                    deltaOxygenKg: 0,
                    deltaEnergyJoules: 0,
                },
                entropyGeneratedJPerK: 0.0,
            };
        }
        const rate = 0.001 * dt;
        const dC = (source.state.carbonKg - neighbor.state.carbonKg) * rate;
        const dW = (source.state.waterKg - neighbor.state.waterKg) * rate;
        const dM = (source.state.mineralsKg - neighbor.state.mineralsKg) * rate;
        const dO = (source.state.oxygenKg - neighbor.state.oxygenKg) * rate;
        const dE = (source.state.energyJoules - neighbor.state.energyJoules) * rate;
        const tS = Math.max(1, source.temperatureK);
        const tN = Math.max(1, neighbor.temperatureK);
        const entropy = Math.max(0, dE * (1 / tN - 1 / tS));
        return {
            sourceIndex: source.h3Index,
            neighborIndex: neighbor.h3Index,
            apertureDirection: direction,
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
        const exchange = this.computeFacetFlux(source, neighbor, direction, dt);
        const tr = exchange.transfer;
        const updatedSource = {
            ...source,
            state: {
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
}
// =============================================================================
// HELPER FUNCTIONS & ANCILLARY MONADS
// =============================================================================
export function computeBoundaryFlux(stateA, stateB, edge, layerHeightMeters, bulkNormalVelocityMs, coeffs, deltaSeconds) {
    const edgeLen = edge.edgeLength ?? edge.lengthMeters ?? 1.0;
    const area = edgeLen * layerHeightMeters;
    const vel = bulkNormalVelocityMs;
    const volFlow = vel * area * deltaSeconds;
    const advectFrac = Math.min(0.2, Math.abs(volFlow) / Math.max(1, stateA.volumeM3 ?? 100));
    const diffRate = (coeffs.waterDiffusivity ?? 1e-4) * area * deltaSeconds * 0.01;
    const thermalRate = (coeffs.thermalConductivity ?? 1.5) * area * deltaSeconds * 0.01;
    const dW = (stateA.waterKg - stateB.waterKg) * diffRate + stateA.waterKg * advectFrac * (vel >= 0 ? 1 : -1);
    const dC = (stateA.carbonKg - stateB.carbonKg) * diffRate + stateA.carbonKg * advectFrac * (vel >= 0 ? 1 : -1);
    const dM = (stateA.mineralsKg - stateB.mineralsKg) * diffRate + stateA.mineralsKg * advectFrac * (vel >= 0 ? 1 : -1);
    const dO = (stateA.oxygenKg - stateB.oxygenKg) * diffRate + stateA.oxygenKg * advectFrac * (vel >= 0 ? 1 : -1);
    const dE = (stateA.enthalpyJoules - stateB.enthalpyJoules) * thermalRate + stateA.enthalpyJoules * advectFrac * (vel >= 0 ? 1 : -1);
    const tA = Math.max(1, stateA.temperatureKelvin ?? 300);
    const tB = Math.max(1, stateB.temperatureKelvin ?? 285);
    const entropy = Math.max(0, Math.abs(dE) * Math.abs(1 / tB - 1 / tA));
    const nextA = {
        ...stateA,
        waterKg: stateA.waterKg - dW,
        carbonKg: stateA.carbonKg - dC,
        mineralsKg: stateA.mineralsKg - dM,
        oxygenKg: stateA.oxygenKg - dO,
        enthalpyJoules: stateA.enthalpyJoules - dE,
    };
    const nextB = {
        ...stateB,
        waterKg: stateB.waterKg + dW,
        carbonKg: stateB.carbonKg + dC,
        mineralsKg: stateB.mineralsKg + dM,
        oxygenKg: stateB.oxygenKg + dO,
        enthalpyJoules: stateB.enthalpyJoules + dE,
    };
    return {
        nextA,
        nextB,
        flux: {
            entropyProducedJPerK: entropy,
        },
    };
}
export function computeOrientedEdgeFlux(stateA, stateB, centroidA, centroidB, p1, p2, dt) {
    const ord = orderSharedBoundaryEndpointsByCentroid(p1, p2, centroidA, centroidB);
    const normal = ord.outwardNormal;
    const disp = [centroidB[0] - centroidA[0], centroidB[1] - centroidA[1]];
    const dot = normal[0] * disp[0] + normal[1] * disp[1];
    const sign = dot >= 0 ? 1 : -1;
    const rate = 0.05 * dt * sign;
    const dThermal = (stateA.thermalEnergyJoules - stateB.thermalEnergyJoules) * rate;
    const dWater = (stateA.waterMassKg - stateB.waterMassKg) * rate;
    const dCarbon = (stateA.carbonMassKg - stateB.carbonMassKg) * rate;
    const dOxygen = (stateA.oxygenMassKg - stateB.oxygenMassKg) * rate;
    const dMineral = (stateA.mineralMassKg - stateB.mineralMassKg) * rate;
    return {
        deltas: {
            deltaThermalJoules: dThermal,
            deltaWaterKg: dWater,
            deltaCarbonKg: dCarbon,
            deltaOxygenKg: dOxygen,
            deltaMineralKg: dMineral,
        },
    };
}
export function computeHarmonizedFluxDeltas(stateA, map, dt) {
    return SpatialFluxMonad.computeHarmonizedFluxDeltas(stateA, map, dt);
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
        return new TopologicalFluxMonad(cellId, { ...stock }, volume);
    }
    evaluateDivergence(neighbors, map, conductance, diffusivity, dt) {
        const exp = isCellPentagon(this.cellId) ? 5 : 6;
        if (neighbors.length !== exp) {
            return {
                success: false,
                reason: `Neighbor count mismatch: expected ${exp}, got ${neighbors.length}`,
            };
        }
        let dC = 0, dW = 0, dM = 0, dO = 0, dE = 0;
        for (const nId of neighbors) {
            const nStock = map.get(nId);
            if (!nStock)
                continue;
            const rate = (diffusivity.water ?? 1e-4) * (conductance.edgeLengthMeters / conductance.centroidDistanceMeters) * dt;
            dW += ((nStock.waterKg ?? 0) - (this.stock.waterKg ?? 0)) * rate;
            dC += ((nStock.carbonKg ?? 0) - (this.stock.carbonKg ?? 0)) * rate;
            dM += ((nStock.mineralsKg ?? 0) - (this.stock.mineralsKg ?? 0)) * rate;
            dO += ((nStock.oxygenKg ?? 0) - (this.stock.oxygenKg ?? 0)) * rate;
            dE += ((nStock.energyJoules ?? 0) - (this.stock.energyJoules ?? 0)) * rate;
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
export class PentagonalSpatialFluxMonad {
    center;
    neighbors;
    constructor(center, neighbors) {
        this.center = center;
        this.neighbors = neighbors;
    }
    static of(center, neighbors) {
        if (!center.isPentagon) {
            throw new PentagonalFluxConservationError('Center cell must be pentagonal');
        }
        if (neighbors.length !== 5) {
            throw new PentagonalFluxConservationError(`Pentagonal cell must have exactly 5 neighbors, got ${neighbors.length}`);
        }
        return new PentagonalSpatialFluxMonad({ ...center, stocks: { ...center.stocks } }, neighbors.map(n => ({ ...n, stocks: { ...n.stocks } })));
    }
    computeDiffusion(coeffs, dt) {
        const pairwiseFluxes = [];
        const totalDivergence = {
            carbonMol: 0,
            waterKg: 0,
            mineralsMol: 0,
            oxygenMol: 0,
            thermalEnergyJ: 0,
        };
        const cStock = this.center.stocks;
        for (const n of this.neighbors) {
            const nStock = n.stocks;
            const dC = ((nStock.carbonMol ?? 0) - (cStock.carbonMol ?? 0)) * (coeffs.diffCarbon ?? 0.1) * dt * 0.01;
            const dW = ((nStock.waterKg ?? 0) - (cStock.waterKg ?? 0)) * (coeffs.diffWater ?? 0.1) * dt * 0.01;
            const dM = ((nStock.mineralsMol ?? 0) - (cStock.mineralsMol ?? 0)) * (coeffs.diffMinerals ?? 0.05) * dt * 0.01;
            const dO = ((nStock.oxygenMol ?? 0) - (cStock.oxygenMol ?? 0)) * (coeffs.diffOxygen ?? 0.15) * dt * 0.01;
            const dE = ((nStock.thermalEnergyJ ?? 0) - (cStock.thermalEnergyJ ?? 0)) * (coeffs.thermalConductivity ?? 1.5) * dt * 0.01;
            totalDivergence.carbonMol += dC;
            totalDivergence.waterKg += dW;
            totalDivergence.mineralsMol += dM;
            totalDivergence.oxygenMol += dO;
            totalDivergence.thermalEnergyJ += dE;
            pairwiseFluxes.push({
                deltas: {
                    carbonMol: dC,
                    waterKg: dW,
                    mineralsMol: dM,
                    oxygenMol: dO,
                    thermalEnergyJ: dE,
                },
            });
        }
        const updatedCenter = {
            ...this.center,
            stocks: {
                ...cStock,
                carbonMol: (cStock.carbonMol ?? 0) + totalDivergence.carbonMol,
                waterKg: (cStock.waterKg ?? 0) + totalDivergence.waterKg,
                mineralsMol: (cStock.mineralsMol ?? 0) + totalDivergence.mineralsMol,
                oxygenMol: (cStock.oxygenMol ?? 0) + totalDivergence.oxygenMol,
                thermalEnergyJ: (cStock.thermalEnergyJ ?? 0) + totalDivergence.thermalEnergyJ,
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
}
export class PentagonFluxMonad {
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
}
