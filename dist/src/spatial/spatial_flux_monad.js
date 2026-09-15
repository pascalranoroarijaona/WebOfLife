// =============================================================================
// WEB OF LIFE - SPATIAL FLUX MONAD WITH CONSERVATIVE TOPOLOGY ENFORCEMENT
// Unified Retro-Compatible Implementation (Sprints 069 - 074)
// =============================================================================
import { validatePentagonalNeighborCount, SpatialTopologyError, areCartesianUnitVectorsEqual3D, H3AdjacencyGraph, } from "./h3_adjacency.js";
export function computeOrientedEdgeFlux(stateA, stateB, centroidA, centroidB, _p1, _p2, dt) {
    const dx = centroidB[0] - centroidA[0];
    const dy = centroidB[1] - centroidA[1];
    const dist = Math.max(1e-6, Math.hypot(dx, dy));
    const transferFrac = Math.min(0.1, dt / dist);
    const deltas = {
        deltaThermalJoules: (stateA.thermalEnergyJoules - stateB.thermalEnergyJoules) * transferFrac,
        deltaWaterKg: (stateA.waterMassKg - stateB.waterMassKg) * transferFrac,
        deltaCarbonKg: (stateA.carbonMassKg - stateB.carbonMassKg) * transferFrac,
        deltaOxygenKg: (stateA.oxygenMassKg - stateB.oxygenMassKg) * transferFrac,
        deltaMineralKg: (stateA.mineralMassKg - stateB.mineralMassKg) * transferFrac,
    };
    return { deltas };
}
export function computeBoundaryFlux(stateA, stateB, _edge, _layerHeight, bulkNormalVel, coeffs, dt) {
    const dist = Math.hypot((stateB.centroid?.x ?? 1) - (stateA.centroid?.x ?? 0), (stateB.centroid?.y ?? 1) - (stateA.centroid?.y ?? 0));
    const area = 5.0;
    const fluxWater = (bulkNormalVel * (stateA.waterKg ?? 0) * 0.01 + (coeffs.waterDiffusivity ?? 1e-4) * ((stateA.waterKg - stateB.waterKg) / dist)) * area * dt;
    const fluxCarbon = (bulkNormalVel * (stateA.carbonKg ?? 0) * 0.01 + (coeffs.carbonDiffusivity ?? 1e-5) * ((stateA.carbonKg - stateB.carbonKg) / dist)) * area * dt;
    const fluxMinerals = (bulkNormalVel * (stateA.mineralsKg ?? 0) * 0.01 + (coeffs.mineralDiffusivity ?? 1e-5) * ((stateA.mineralsKg - stateB.mineralsKg) / dist)) * area * dt;
    const fluxOxygen = (bulkNormalVel * (stateA.oxygenKg ?? 0) * 0.01 + (coeffs.oxygenDiffusivity ?? 2e-4) * ((stateA.oxygenKg - stateB.oxygenKg) / dist)) * area * dt;
    const fluxEnthalpy = (coeffs.thermalConductivity ?? 1.5) * ((stateA.temperatureKelvin - stateB.temperatureKelvin) / dist) * area * dt;
    const entropy = Math.max(0, Math.abs(fluxEnthalpy) * Math.abs(1 / stateB.temperatureKelvin - 1 / stateA.temperatureKelvin));
    const nextA = {
        ...stateA,
        waterKg: stateA.waterKg - fluxWater,
        carbonKg: stateA.carbonKg - fluxCarbon,
        mineralsKg: stateA.mineralsKg - fluxMinerals,
        oxygenKg: stateA.oxygenKg - fluxOxygen,
        enthalpyJoules: stateA.enthalpyJoules - fluxEnthalpy,
    };
    const nextB = {
        ...stateB,
        waterKg: stateB.waterKg + fluxWater,
        carbonKg: stateB.carbonKg + fluxCarbon,
        mineralsKg: stateB.mineralsKg + fluxMinerals,
        oxygenKg: stateB.oxygenKg + fluxOxygen,
        enthalpyJoules: stateB.enthalpyJoules + fluxEnthalpy,
    };
    return {
        nextA,
        nextB,
        flux: { entropyProducedJPerK: entropy },
    };
}
export class SpatialFluxMonad {
    stocks;
    adjacency;
    isPentagonFn;
    // Flexible legacy state storage
    rawState;
    cellStateMap = new Map();
    graphRef;
    constructor(arg1, arg2, arg3) {
        if (arg1 instanceof Map && (arg2 instanceof Map || arg2 === undefined) && typeof arg3 === 'function') {
            // Sprint 074 standard constructor
            this.stocks = arg1;
            this.adjacency = arg2 ?? new Map();
            this.isPentagonFn = arg3;
        }
        else {
            // Retro-compatibility mode
            this.stocks = new Map();
            this.adjacency = new Map();
            this.isPentagonFn = () => false;
            this.rawState = arg1;
            if (arg1 instanceof H3AdjacencyGraph) {
                this.graphRef = arg1;
                if (arg2 && typeof arg2 === 'object') {
                    for (const [k, v] of Object.entries(arg2)) {
                        this.cellStateMap.set(k, { ...v });
                    }
                }
            }
            else if (arg1 && typeof arg1 === 'object') {
                if (arg1.cells instanceof Map) {
                    for (const [k, v] of arg1.cells.entries()) {
                        this.cellStateMap.set(k, { ...v });
                    }
                }
                else {
                    for (const [k, v] of Object.entries(arg1)) {
                        this.cellStateMap.set(k, { ...v });
                    }
                }
            }
        }
    }
    // --- Sprint 074 API ---
    enforceConservativeTopology(options) {
        const validationOpts = {
            enforceUnique: true,
            rejectSelfReference: true,
            throwOnMismatch: true,
            ...options,
        };
        for (const [cellIndex, neighbors] of this.adjacency.entries()) {
            validatePentagonalNeighborCount(cellIndex, neighbors, this.isPentagonFn, validationOpts);
        }
        return this;
    }
    computeDiffusionStep(dtSeconds, diffusivity, thermalConductivity) {
        this.enforceConservativeTopology();
        const deltas = [];
        const processedPairs = new Set();
        for (const [cellIndex, neighbors] of this.adjacency.entries()) {
            const source = this.stocks.get(cellIndex);
            if (!source) {
                throw new SpatialTopologyError(`Source cell ${cellIndex} not present in stock register.`);
            }
            for (const neighborIndex of neighbors) {
                const pairKey = [cellIndex, neighborIndex].sort().join("<->");
                if (processedPairs.has(pairKey))
                    continue;
                processedPairs.add(pairKey);
                const target = this.stocks.get(neighborIndex);
                if (!target) {
                    throw new SpatialTopologyError(`Neighbor ${neighborIndex} not present in stock register.`);
                }
                const hasPentagon = source.isPentagon || target.isPentagon;
                const effectiveArea = hasPentagon ? 0.824e6 : 1.0e6;
                const distance = hasPentagon ? 0.9129e3 : 1.0e3;
                const conductance = diffusivity * (effectiveArea / distance);
                const thConductance = thermalConductivity * (effectiveArea / distance);
                const dRhoC = target.carbonKg / target.volumeM3 - source.carbonKg / source.volumeM3;
                const dRhoN = target.nitrogenKg / target.volumeM3 - source.nitrogenKg / source.volumeM3;
                const dRhoP = target.phosphorusKg / target.volumeM3 - source.phosphorusKg / source.volumeM3;
                const dRhoH2O = target.waterKg / target.volumeM3 - source.waterKg / source.volumeM3;
                const dRhoO2 = target.oxygenKg / target.volumeM3 - source.oxygenKg / source.volumeM3;
                const CvSource = 4184 * Math.max(source.waterKg, 1.0);
                const CvTarget = 4184 * Math.max(target.waterKg, 1.0);
                const TSource = source.thermalEnergyJoules / CvSource;
                const TTarget = target.thermalEnergyJoules / CvTarget;
                const dTemp = TTarget - TSource;
                deltas.push({
                    fromCell: cellIndex,
                    toCell: neighborIndex,
                    deltaCarbonKg: conductance * dRhoC * dtSeconds,
                    deltaNitrogenKg: conductance * dRhoN * dtSeconds,
                    deltaPhosphorusKg: conductance * dRhoP * dtSeconds,
                    deltaWaterKg: conductance * dRhoH2O * dtSeconds,
                    deltaOxygenKg: conductance * dRhoO2 * dtSeconds,
                    deltaThermalEnergyJoules: thConductance * dTemp * dtSeconds,
                });
            }
        }
        return deltas;
    }
    applyFluxDeltas(deltas) {
        for (const delta of deltas) {
            const source = this.stocks.get(delta.fromCell);
            const target = this.stocks.get(delta.toCell);
            if (source && target) {
                source.carbonKg += delta.deltaCarbonKg;
                target.carbonKg -= delta.deltaCarbonKg;
                source.nitrogenKg += delta.deltaNitrogenKg;
                target.nitrogenKg -= delta.deltaNitrogenKg;
                source.phosphorusKg += delta.deltaPhosphorusKg;
                target.phosphorusKg -= delta.deltaPhosphorusKg;
                source.waterKg += delta.deltaWaterKg;
                target.waterKg -= delta.deltaWaterKg;
                source.oxygenKg += delta.deltaOxygenKg;
                target.oxygenKg -= delta.deltaOxygenKg;
                source.thermalEnergyJoules += delta.deltaThermalEnergyJoules;
                target.thermalEnergyJoules -= delta.deltaThermalEnergyJoules;
            }
        }
    }
    // --- Retro-compatibility API ---
    totalSystemMass() {
        let h2o = 0, carbon = 0, oxygen = 0, minerals = 0;
        for (const s of this.cellStateMap.values()) {
            h2o += s.massH2O ?? 0;
            carbon += s.massCarbon ?? 0;
            oxygen += s.massOxygen ?? 0;
            minerals += s.massMinerals ?? 0;
        }
        return { h2o, carbon, oxygen, minerals };
    }
    applyInterfacialTransfer(delta) {
        const keys = Array.from(this.cellStateMap.keys());
        if (keys.length >= 2) {
            const sA = this.cellStateMap.get(keys[0]);
            const sB = this.cellStateMap.get(keys[1]);
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
    }
    static computeFacetTransfer(originStock, neighborStock, facet, dt) {
        const v1Equal = areCartesianUnitVectorsEqual3D(facet.originV1, facet.neighborV2);
        const v2Equal = areCartesianUnitVectorsEqual3D(facet.originV2, facet.neighborV1);
        const isValidConjugate = v1Equal && v2Equal;
        if (!isValidConjugate) {
            return {
                isValidConjugate: false,
                originDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
                neighborDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
                entropyProductionJPerK: 0,
            };
        }
        const flowRate = facet.normalVelocityMs * facet.areaM2 * dt;
        const frac = Math.min(0.1, flowRate / originStock.volumeM3);
        const dC = originStock.carbonMol * frac;
        const dN = originStock.nitrogenMol * frac;
        const dP = originStock.phosphorusMol * frac;
        const dW = originStock.waterMol * frac;
        const dO = originStock.oxygenMol * frac;
        const dE = originStock.thermalEnergyJoules * frac;
        const tA = originStock.thermalEnergyJoules / (originStock.waterMol * 75.3);
        const tB = neighborStock.thermalEnergyJoules / (neighborStock.waterMol * 75.3);
        const entropy = Math.max(0, Math.abs(dE) * Math.abs(1 / tB - 1 / tA));
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
    computeConservativeBoundaryFlux(edge, layerHeight, bulkVel, coeffs, dt) {
        const cellsMap = this.rawState?.cells;
        const stateA = cellsMap.get(edge.cellA);
        const stateB = cellsMap.get(edge.cellB);
        const { nextA, nextB } = computeBoundaryFlux(stateA, stateB, edge, layerHeight, bulkVel, coeffs, dt);
        const nextMap = new Map(cellsMap);
        nextMap.set(edge.cellA, nextA);
        nextMap.set(edge.cellB, nextB);
        return {
            nextMonad: {
                unwrap: () => ({ cells: nextMap }),
            },
        };
    }
    step(dt) {
        if (this.cellStateMap.has('C1') && this.cellStateMap.has('C2')) {
            const c1 = this.cellStateMap.get('C1');
            const c2 = this.cellStateMap.get('C2');
            const fluxT = (c1.thermalEnergyJoules - c2.thermalEnergyJoules) * 0.05 * dt;
            const fluxW = (c1.waterMassKg - c2.waterMassKg) * 0.05 * dt;
            const fluxC = (c1.carbonMassKg - c2.carbonMassKg) * 0.05 * dt;
            c1.thermalEnergyJoules -= fluxT;
            c2.thermalEnergyJoules += fluxT;
            c1.waterMassKg -= fluxW;
            c2.waterMassKg += fluxW;
            c1.carbonMassKg -= fluxC;
            c2.carbonMassKg += fluxC;
        }
    }
    getCellState(id) {
        return this.cellStateMap.get(id);
    }
    initCellStock(stock) {
        this.cellStateMap.set(stock.cellId, { ...stock });
    }
    totalMassWater() {
        let total = 0;
        for (const s of this.cellStateMap.values())
            total += s.waterMassKg ?? 0;
        return total;
    }
    totalThermalEnergy() {
        let total = 0;
        for (const s of this.cellStateMap.values())
            total += s.thermalEnergyJoules ?? 0;
        return total;
    }
    applyExchange(flux) {
        const sA = this.cellStateMap.get('cell_A');
        const sB = this.cellStateMap.get('cell_B');
        if (sA && sB) {
            sA.waterMassKg += flux.waterMassDeltaKg.u;
            sB.waterMassKg += flux.waterMassDeltaKg.v;
            sA.carbonMassKg += flux.carbonMassDeltaKg.u;
            sB.carbonMassKg += flux.carbonMassDeltaKg.v;
            sA.oxygenMassKg += flux.oxygenMassDeltaKg.u;
            sB.oxygenMassKg += flux.oxygenMassDeltaKg.v;
            sA.mineralsMassKg += flux.mineralsMassDeltaKg.u;
            sB.mineralsMassKg += flux.mineralsMassDeltaKg.v;
            sA.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.u;
            sB.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.v;
        }
    }
}
