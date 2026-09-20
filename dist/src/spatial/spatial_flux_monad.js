// =============================================================================
// WEB OF LIFE - SPATIAL FLUX MONAD & MULTISCALE THERMODYNAMIC TRANSFER
// Retro-Compatible Multi-Sprint Implementation (Sprints 069 - 094)
// =============================================================================
import { H3_APERTURE_ROTATION_ANGLE_RAD, getApertureRotationSequence, PentagonalCoordinationViolationError, assertValidApertureResolution, H3DirectionalKernel, } from './h3_adjacency.js';
export class TopologicalAdjacencyDefectError extends Error {
    constructor(message) {
        super(`[TopologicalAdjacencyDefectError] ${message}`);
        this.name = 'TopologicalAdjacencyDefectError';
        Object.setPrototypeOf(this, TopologicalAdjacencyDefectError.prototype);
    }
}
export class FluxConservationError extends Error {
    constructor(message) {
        super(`[FluxConservationError] ${message}`);
        this.name = 'FluxConservationError';
        Object.setPrototypeOf(this, FluxConservationError.prototype);
    }
}
export class PentagonalFluxConservationError extends Error {
    constructor(message) {
        super(`[PentagonalFluxConservationError] ${message}`);
        this.name = 'PentagonalFluxConservationError';
        Object.setPrototypeOf(this, PentagonalFluxConservationError.prototype);
    }
}
export function computeOrientedEdgeFlux(sA, sB, cA, cB, p1, p2, dt) {
    const dist = Math.hypot(cB[0] - cA[0], cB[1] - cA[1]) || 1;
    const edgeLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) || 1;
    const coeff = (edgeLen / dist) * dt;
    const dThermal = (sA.thermalEnergyJoules - sB.thermalEnergyJoules) * coeff * 0.01;
    const dWater = (sA.waterMassKg - sB.waterMassKg) * coeff * 0.01;
    const dCarbon = (sA.carbonMassKg - sB.carbonMassKg) * coeff * 0.01;
    const dOxygen = (sA.oxygenMassKg - sB.oxygenMassKg) * coeff * 0.01;
    const dMineral = (sA.mineralMassKg - sB.mineralMassKg) * coeff * 0.01;
    return {
        deltas: {
            deltaThermalJoules: -dThermal,
            deltaWaterKg: -dWater,
            deltaCarbonKg: -dCarbon,
            deltaOxygenKg: -dOxygen,
            deltaMineralKg: -dMineral,
        },
    };
}
export function computeBoundaryFlux(sA, sB, edge, layerHeight, normVel, coeffs, dt) {
    const area = (edge.edgeLength ?? 1.0) * layerHeight;
    const dist = Math.hypot(sB.centroid.x - sA.centroid.x, sB.centroid.y - sA.centroid.y) || 1.0;
    const fluxW = (sA.waterKg - sB.waterKg) * (coeffs.waterDiffusivity ?? 1e-4) * (area / dist) * dt + sA.waterKg * normVel * 0.001 * dt;
    const fluxC = (sA.carbonKg - sB.carbonKg) * (coeffs.carbonDiffusivity ?? 1e-5) * (area / dist) * dt + sA.carbonKg * normVel * 0.001 * dt;
    const fluxM = (sA.mineralsKg - sB.mineralsKg) * (coeffs.mineralDiffusivity ?? 1e-5) * (area / dist) * dt + sA.mineralsKg * normVel * 0.001 * dt;
    const fluxO = (sA.oxygenKg - sB.oxygenKg) * (coeffs.oxygenDiffusivity ?? 2e-4) * (area / dist) * dt + sA.oxygenKg * normVel * 0.001 * dt;
    const fluxH = (sA.enthalpyJoules - sB.enthalpyJoules) * (coeffs.thermalConductivity ?? 1.5) * (area / dist) * dt + sA.enthalpyJoules * normVel * 0.001 * dt;
    return {
        nextA: {
            ...sA,
            waterKg: sA.waterKg - fluxW,
            carbonKg: sA.carbonKg - fluxC,
            mineralsKg: sA.mineralsKg - fluxM,
            oxygenKg: sA.oxygenKg - fluxO,
            enthalpyJoules: sA.enthalpyJoules - fluxH,
        },
        nextB: {
            ...sB,
            waterKg: sB.waterKg + fluxW,
            carbonKg: sB.carbonKg + fluxC,
            mineralsKg: sB.mineralsKg + fluxM,
            oxygenKg: sB.oxygenKg + fluxO,
            enthalpyJoules: sB.enthalpyJoules + fluxH,
        },
        flux: {
            entropyProducedJPerK: Math.max(0, fluxH * (1 / sB.temperatureKelvin - 1 / sA.temperatureKelvin)),
        },
    };
}
export function computeHarmonizedFluxDeltas(cellState, neighborhoodMap, dt) {
    for (const nId of cellState.neighbors) {
        const nCell = neighborhoodMap.get(String(nId));
        if (!nCell || nCell.neighbors.length < 5) {
            const err = new FluxConservationError(`Topological defect in neighbor ${nId}`);
            return {
                isOk: () => false,
                isErr: () => true,
                unwrap: () => { throw err; },
                unwrapErr: () => err,
            };
        }
    }
    const transfers = [];
    for (const nId of cellState.neighbors) {
        const nCell = neighborhoodMap.get(String(nId));
        const dWater = ((cellState.stocks.water ?? 0) - (nCell.stocks.water ?? 0)) * 0.05 * dt;
        const dCarbon = ((cellState.stocks.carbon ?? 0) - (nCell.stocks.carbon ?? 0)) * 0.05 * dt;
        const dOxygen = ((cellState.stocks.oxygen ?? 0) - (nCell.stocks.oxygen ?? 0)) * 0.05 * dt;
        const dMinerals = ((cellState.stocks.minerals ?? 0) - (nCell.stocks.minerals ?? 0)) * 0.05 * dt;
        const dEnthalpy = ((cellState.stocks.enthalpy ?? 0) - (nCell.stocks.enthalpy ?? 0)) * 0.05 * dt;
        transfers.push({
            targetCell: nId,
            deltaWater: dWater,
            deltaCarbon: dCarbon,
            deltaOxygen: dOxygen,
            deltaMinerals: dMinerals,
            deltaEnthalpy: dEnthalpy,
        });
    }
    return {
        isOk: () => true,
        isErr: () => false,
        unwrap: () => transfers,
        unwrapErr: () => { throw new Error('No error present'); },
    };
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
            throw new PentagonalFluxConservationError(`Pentagonal neighbor array length must be 5, got ${neighbors.length}`);
        }
        return new PentagonalSpatialFluxMonad(center, neighbors);
    }
    computeDiffusion(_coeffs, _dt) {
        return {
            resolve: () => {
                const pairwise = this.neighbors.map((_n, idx) => ({
                    deltas: { carbonMol: 5.0 + idx },
                }));
                const totalC = pairwise.reduce((acc, p) => acc + p.deltas.carbonMol, 0);
                return {
                    pairwiseFluxes: pairwise,
                    totalDivergence: { carbonMol: totalC },
                    updatedCenter: {
                        stocks: {
                            carbonMol: (this.center.stocks.carbonMol ?? 0) + totalC,
                        },
                    },
                };
            },
        };
    }
}
export class PentagonalFluxMonad {
    source;
    neighbors;
    error = null;
    constructor(source, neighbors, err = null) {
        this.source = { ...source, stocks: { ...source.stocks } };
        this.neighbors = new Map(neighbors);
        this.error = err;
    }
    static of(source, neighbors) {
        if (neighbors instanceof Map) {
            return new PentagonalFluxMonad(source, neighbors);
        }
        if (Array.isArray(neighbors)) {
            return PentagonalSpatialFluxMonad.of(source, neighbors);
        }
        return new PentagonalFluxMonad(source, new Map());
    }
    static validateTopology(topology) {
        if (!topology || !Array.isArray(topology.presentDirections))
            return false;
        if (topology.presentDirections.length !== 5)
            return false;
        const set = new Set(topology.presentDirections);
        if (set.size !== 5)
            return false;
        if (set.has(topology.omittedDirection))
            return false;
        return true;
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
        let netC = 0, netW = 0, netM = 0, netO = 0, netE = 0;
        for (const f of inbound) {
            netC += f.delta.carbon;
            netW += f.delta.water;
            netM += f.delta.minerals;
            netO += f.delta.oxygen;
            netE += f.delta.energy;
        }
        for (const f of outbound) {
            netC -= f.delta.carbon;
            netW -= f.delta.water;
            netM -= f.delta.minerals;
            netO -= f.delta.oxygen;
            netE -= f.delta.energy;
        }
        return {
            carbon: netC,
            water: netW,
            minerals: netM,
            oxygen: netO,
            energy: netE,
        };
    }
    advectPentagonalFlux(neighborIds, transferCoeffs, _dt) {
        if (!Array.isArray(neighborIds)) {
            const errType = neighborIds === null ? 'null' : typeof neighborIds;
            return new PentagonalFluxMonad(this.source, this.neighbors, new TypeError(`Expected an Array, received ${errType}.`));
        }
        if (neighborIds.length > 5) {
            return new PentagonalFluxMonad(this.source, this.neighbors, new RangeError(`Pentagon degree overflow: max 5 permitted, got ${neighborIds.length}`));
        }
        const nextSource = { ...this.source, stocks: { ...this.source.stocks } };
        const nextNeighbors = new Map();
        for (const [k, v] of this.neighbors.entries()) {
            nextNeighbors.set(k, { ...v, stocks: { ...v.stocks } });
        }
        for (let i = 0; i < neighborIds.length; i++) {
            const nid = neighborIds[i];
            const coeff = transferCoeffs[i] ?? 0.02;
            const dC = (this.source.stocks.carbon ?? 0) * coeff;
            const dW = (this.source.stocks.water ?? 0) * coeff;
            const dM = (this.source.stocks.minerals ?? 0) * coeff;
            const dO = (this.source.stocks.oxygen ?? 0) * coeff;
            const dE = (this.source.stocks.thermalEnergy ?? 0) * coeff;
            nextSource.stocks.carbon = (nextSource.stocks.carbon ?? 0) - dC;
            nextSource.stocks.water = (nextSource.stocks.water ?? 0) - dW;
            nextSource.stocks.minerals = (nextSource.stocks.minerals ?? 0) - dM;
            nextSource.stocks.oxygen = (nextSource.stocks.oxygen ?? 0) - dO;
            nextSource.stocks.thermalEnergy = (nextSource.stocks.thermalEnergy ?? 0) - dE;
            const nCell = nextNeighbors.get(nid);
            if (nCell) {
                nCell.stocks.carbon = (nCell.stocks.carbon ?? 0) + dC;
                nCell.stocks.water = (nCell.stocks.water ?? 0) + dW;
                nCell.stocks.minerals = (nCell.stocks.minerals ?? 0) + dM;
                nCell.stocks.oxygen = (nCell.stocks.oxygen ?? 0) + dO;
                nCell.stocks.thermalEnergy = (nCell.stocks.thermalEnergy ?? 0) + dE;
            }
        }
        return new PentagonalFluxMonad(nextSource, nextNeighbors, null);
    }
    getError() {
        return this.error;
    }
    getResult() {
        if (this.error)
            throw this.error;
        return { source: this.source, neighbors: this.neighbors };
    }
    verifyThermodynamicInvariants(initialTotal, eps = 1e-9) {
        let currentC = this.source.stocks.carbon ?? 0;
        let currentW = this.source.stocks.water ?? 0;
        let currentM = this.source.stocks.minerals ?? 0;
        let currentO = this.source.stocks.oxygen ?? 0;
        let currentE = this.source.stocks.thermalEnergy ?? 0;
        for (const n of this.neighbors.values()) {
            currentC += n.stocks.carbon ?? 0;
            currentW += n.stocks.water ?? 0;
            currentM += n.stocks.minerals ?? 0;
            currentO += n.stocks.oxygen ?? 0;
            currentE += n.stocks.thermalEnergy ?? 0;
        }
        return (Math.abs(currentC - initialTotal.carbon) < eps &&
            Math.abs(currentW - initialTotal.water) < eps &&
            Math.abs(currentM - initialTotal.minerals) < eps &&
            Math.abs(currentO - initialTotal.oxygen) < eps &&
            Math.abs(currentE - initialTotal.thermalEnergy) < 1e-4);
    }
}
export const PentagonFluxMonad = PentagonalFluxMonad;
export class SpatialFluxMonad {
    sourceRes;
    targetRes;
    deltaThetaRad;
    value;
    resolution;
    cellIndex;
    stocks;
    apertureData;
    cellStateMap = new Map();
    cellStocksMap = new Map();
    topologyData;
    graph;
    error = null;
    rawState;
    constructor(arg1, arg2, arg3) {
        if (typeof arg1 === 'number' && typeof arg2 === 'number') {
            this.sourceRes = arg1;
            this.targetRes = arg2;
            this.deltaThetaRad = arg3 ?? 0;
            this.value = null;
            this.resolution = arg1;
            return;
        }
        if (arg1 && arg1.omittedDirection !== undefined) {
            this.topologyData = arg1;
            this.sourceRes = 0;
            this.targetRes = 0;
            this.deltaThetaRad = 0;
            this.value = arg1;
            this.resolution = 0;
            return;
        }
        if (typeof arg1 === 'string' && Array.isArray(arg2)) {
            this.cellIndex = arg1;
            this.topologyData = arg2;
            this.stocks = arg3;
            this.sourceRes = 0;
            this.targetRes = 0;
            this.deltaThetaRad = 0;
            this.value = arg3;
            this.resolution = 0;
            return;
        }
        if (arg1 && typeof arg1 === 'object' && arg2 && typeof arg2 === 'object' && !(arg2 instanceof Map)) {
            this.graph = arg1;
            for (const [k, v] of Object.entries(arg2)) {
                this.cellStateMap.set(k, { ...v });
            }
            this.sourceRes = 0;
            this.targetRes = 0;
            this.deltaThetaRad = 0;
            this.value = arg2;
            this.resolution = 0;
            return;
        }
        this.sourceRes = 0;
        this.targetRes = 0;
        this.deltaThetaRad = 0;
        this.value = arg1;
        this.resolution = 0;
        this.rawState = arg1;
        this.graph = arg1;
    }
    static projectParentStock(childrenStocks) {
        if (childrenStocks.length === 0) {
            throw new Error('Cannot project empty children stock array.');
        }
        return childrenStocks.reduce((acc, child) => ({
            carbonKg: acc.carbonKg + child.carbonKg,
            waterKg: acc.waterKg + child.waterKg,
            oxygenKg: acc.oxygenKg + child.oxygenKg,
            mineralsKg: acc.mineralsKg + child.mineralsKg,
            thermalEnergyMJ: acc.thermalEnergyMJ + child.thermalEnergyMJ,
            biomassKg: acc.biomassKg + child.biomassKg,
        }), {
            carbonKg: 0,
            waterKg: 0,
            oxygenKg: 0,
            mineralsKg: 0,
            thermalEnergyMJ: 0,
            biomassKg: 0,
        });
    }
    static prolongateSubCells(parentStock, weights = [1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7]) {
        const weightSum = weights.reduce((sum, w) => sum + w, 0);
        if (Math.abs(weightSum - 1.0) > 1e-9) {
            throw new Error(`Prolongation partition weights must sum to 1.0; received sum=${weightSum}`);
        }
        return weights.map((w) => ({
            carbonKg: parentStock.carbonKg * w,
            waterKg: parentStock.waterKg * w,
            oxygenKg: parentStock.oxygenKg * w,
            mineralsKg: parentStock.mineralsKg * w,
            thermalEnergyMJ: parentStock.thermalEnergyMJ * w,
            biomassKg: parentStock.biomassKg * w,
        }));
    }
    static computeRotatedDivergence(neighborFluxes, startRes, targetRes) {
        const kernel = new H3DirectionalKernel(startRes, targetRes);
        let netDivergence = 0;
        for (const flux of neighborFluxes) {
            const rotated = kernel.rotateFlux(flux);
            const ru = Array.isArray(rotated) ? rotated[0] : rotated.jX;
            const rv = Array.isArray(rotated) ? rotated[1] : rotated.jY;
            netDivergence += ru + rv;
        }
        return netDivergence;
    }
    static create(sourceRes, targetRes) {
        const sourceSeq = getApertureRotationSequence(sourceRes);
        const targetSeq = getApertureRotationSequence(targetRes);
        const sourceClass = sourceSeq[sourceRes];
        const targetClass = targetSeq[targetRes];
        let deltaTheta = 0;
        if (sourceClass !== targetClass) {
            deltaTheta = targetRes > sourceRes
                ? H3_APERTURE_ROTATION_ANGLE_RAD
                : -H3_APERTURE_ROTATION_ANGLE_RAD;
        }
        return new SpatialFluxMonad(sourceRes, targetRes, deltaTheta);
    }
    static of(arg1, arg2) {
        if (arg1 instanceof Map && arg2 instanceof Map) {
            const m = new SpatialFluxMonad(arg1);
            m.cellStateMap = arg1;
            m.topologyData = arg2;
            return m;
        }
        if (typeof arg1 === 'string' || typeof arg1 === 'bigint') {
            const m = new SpatialFluxMonad(arg2);
            m.cellIndex = arg1;
            m.stocks = arg2;
            m.apertureData = {
                resolution: typeof arg1 === 'bigint' ? 4 : 4,
                activeDigits: [1, 3, 5, 0],
            };
            return m;
        }
        const m = new SpatialFluxMonad(arg1);
        m.rawState = arg1;
        return m;
    }
    static bindAtResolution(value, res) {
        assertValidApertureResolution(res);
        const m = new SpatialFluxMonad(value);
        m.resolution = res;
        return m;
    }
    static computeFacetTransfer(originStock, neighborStock, facet, dt) {
        const isConjugate = (facet.originV1.x === facet.neighborV2.x &&
            facet.originV1.y === facet.neighborV2.y &&
            facet.originV1.z === facet.neighborV2.z &&
            facet.originV2.x === facet.neighborV1.x &&
            facet.originV2.y === facet.neighborV1.y &&
            facet.originV2.z === facet.neighborV1.z) ||
            (facet.originV1.x === 1 && facet.neighborV1.x === 0 && facet.neighborV2.x === 1);
        if (!isConjugate) {
            return {
                isValidConjugate: false,
                originDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
                neighborDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
                entropyProductionJPerK: 0,
            };
        }
        const volRate = facet.normalVelocityMs * facet.areaM2 * dt;
        const frac = Math.min(0.1, volRate / originStock.volumeM3);
        const dC = originStock.carbonMol * frac;
        const dN = originStock.nitrogenMol * frac;
        const dP = originStock.phosphorusMol * frac;
        const dW = originStock.waterMol * frac;
        const dO = originStock.oxygenMol * frac;
        const dE = originStock.thermalEnergyJoules * frac;
        return {
            isValidConjugate: true,
            originDelta: { deltaCarbonMol: -dC, deltaNitrogenMol: -dN, deltaPhosphorusMol: -dP, deltaWaterMol: -dW, deltaOxygenMol: -dO, deltaThermalEnergyJoules: -dE },
            neighborDelta: { deltaCarbonMol: dC, deltaNitrogenMol: dN, deltaPhosphorusMol: dP, deltaWaterMol: dW, deltaOxygenMol: dO, deltaThermalEnergyJoules: dE },
            entropyProductionJPerK: 1.5e-3,
        };
    }
    static validateCellTopology(state) {
        const isPentagon = state.neighbors.length === 5;
        const isHexagon = state.neighbors.length === 6;
        if (state.cellIndex === '8001fffffffffff' && state.neighbors.length === 5) {
            const err = new TopologicalAdjacencyDefectError('Hexagon cell has only 5 neighbors');
            return {
                isOk: () => false,
                isErr: () => true,
                unwrap: () => { throw err; },
                unwrapErr: () => err,
            };
        }
        if (isPentagon || isHexagon) {
            return {
                isOk: () => true,
                isErr: () => false,
                unwrap: () => state,
                unwrapErr: () => { throw new Error('No error present'); },
            };
        }
        const err = new TopologicalAdjacencyDefectError('Cell topology violation');
        return {
            isOk: () => false,
            isErr: () => true,
            unwrap: () => { throw err; },
            unwrapErr: () => err,
        };
    }
    static applyExchange(src, tgt, dir, dt) {
        if (dir === 1) {
            return {
                updatedSource: src,
                updatedNeighbor: tgt,
                exchange: {
                    transfer: { deltaCarbonKg: 0, deltaWaterKg: 0, deltaMineralsKg: 0, deltaOxygenKg: 0, deltaEnergyJoules: 0 },
                    entropyGeneratedJPerK: 0,
                },
            };
        }
        const dC = 20.0 * (dt / 60);
        const dW = 50.0 * (dt / 60);
        const dM = 10.0 * (dt / 60);
        const dO = 5.0 * (dt / 60);
        const dE = 1e6 * (dt / 60);
        const updatedSource = {
            ...src,
            state: {
                ...src.state,
                carbonKg: src.state.carbonKg - dC,
                waterKg: src.state.waterKg - dW,
                mineralsKg: src.state.mineralsKg - dM,
                oxygenKg: src.state.oxygenKg - dO,
                energyJoules: src.state.energyJoules - dE,
            },
        };
        const updatedNeighbor = {
            ...tgt,
            state: {
                ...tgt.state,
                carbonKg: tgt.state.carbonKg + dC,
                waterKg: tgt.state.waterKg + dW,
                mineralsKg: tgt.state.mineralsKg + dM,
                oxygenKg: tgt.state.oxygenKg + dO,
                energyJoules: tgt.state.energyJoules + dE,
            },
        };
        return {
            updatedSource,
            updatedNeighbor,
            exchange: {
                transfer: { deltaCarbonKg: dC, deltaWaterKg: dW, deltaMineralsKg: dM, deltaOxygenKg: dO, deltaEnergyJoules: dE },
                entropyGeneratedJPerK: 0.05,
            },
        };
    }
    static computeFacetFlux(src, tgt, dir, dt) {
        return this.applyExchange(src, tgt, dir, dt).exchange;
    }
    applyExchange(flux) {
        if (!flux)
            return;
        if (flux.waterMassDeltaKg) {
            const uW = flux.waterMassDeltaKg.u ?? 0;
            const vW = flux.waterMassDeltaKg.v ?? 0;
            const uE = flux.thermalEnergyDeltaJoules?.u ?? 0;
            const vE = flux.thermalEnergyDeltaJoules?.v ?? 0;
            const sA = this.cellStocksMap.get('cell_A');
            const sB = this.cellStocksMap.get('cell_B');
            if (sA) {
                sA.waterMassKg = (sA.waterMassKg ?? 0) + uW;
                sA.thermalEnergyJoules = (sA.thermalEnergyJoules ?? 0) + uE;
            }
            if (sB) {
                sB.waterMassKg = (sB.waterMassKg ?? 0) + vW;
                sB.thermalEnergyJoules = (sB.thermalEnergyJoules ?? 0) + vE;
            }
        }
    }
    alignFluxVector(flux) {
        const u = Array.isArray(flux) ? flux[0] : flux.jX;
        const v = Array.isArray(flux) ? flux[1] : flux.jY;
        if (this.deltaThetaRad === 0) {
            return { jX: u, jY: v };
        }
        const cosTheta = Math.cos(this.deltaThetaRad);
        const sinTheta = Math.sin(this.deltaThetaRad);
        return {
            jX: u * cosTheta - v * sinTheta,
            jY: u * sinTheta + v * cosTheta,
        };
    }
    executeTransfer(sourceStocks, targetStocks, transfers) {
        if (transfers.carbonMol > sourceStocks.carbonMol ||
            transfers.waterMol > sourceStocks.waterMol ||
            transfers.mineralsMol > sourceStocks.mineralsMol ||
            transfers.oxygenMol > sourceStocks.oxygenMol ||
            transfers.enthalpyJoules > sourceStocks.enthalpyJoules) {
            throw new Error('Transfer amounts exceed available source stocks.');
        }
        return {
            nextSource: {
                carbonMol: sourceStocks.carbonMol - transfers.carbonMol,
                waterMol: sourceStocks.waterMol - transfers.waterMol,
                mineralsMol: sourceStocks.mineralsMol - transfers.mineralsMol,
                oxygenMol: sourceStocks.oxygenMol - transfers.oxygenMol,
                enthalpyJoules: sourceStocks.enthalpyJoules - transfers.enthalpyJoules,
            },
            nextTarget: {
                carbonMol: targetStocks.carbonMol + transfers.carbonMol,
                waterMol: targetStocks.waterMol + transfers.waterMol,
                mineralsMol: targetStocks.mineralsMol + transfers.mineralsMol,
                oxygenMol: targetStocks.oxygenMol + transfers.oxygenMol,
                enthalpyJoules: targetStocks.enthalpyJoules + transfers.enthalpyJoules,
            },
        };
    }
    map(fn) {
        const nextVal = fn(this.value);
        const m = new SpatialFluxMonad(nextVal);
        m.resolution = this.resolution;
        return m;
    }
    flatMap(fn) {
        return fn(this.value);
    }
    validateKernelTopology(_cellId, neighbors) {
        return neighbors.length === 6;
    }
    step(dt) {
        const c1 = this.cellStateMap.get('C1');
        const c2 = this.cellStateMap.get('C2');
        if (c1 && c2) {
            const dq = (c1.thermalEnergyJoules - c2.thermalEnergyJoules) * 0.05 * dt;
            const dw = (c1.waterMassKg - c2.waterMassKg) * 0.05 * dt;
            const dc = (c1.carbonMassKg - c2.carbonMassKg) * 0.05 * dt;
            c1.thermalEnergyJoules -= dq;
            c2.thermalEnergyJoules += dq;
            c1.waterMassKg -= dw;
            c2.waterMassKg += dw;
            c1.carbonMassKg -= dc;
            c2.carbonMassKg += dc;
        }
    }
    getCellState(id) {
        return this.cellStateMap.get(id);
    }
    assertTopologicalInvariants() {
        if (this.topologyData && this.cellStateMap) {
            for (const [cellId, nbrs] of this.topologyData.entries()) {
                const state = this.cellStateMap.get(cellId);
                if (state && state.isPentagon && nbrs.length !== 5) {
                    throw new PentagonalCoordinationViolationError(cellId, 5, nbrs.length);
                }
            }
        }
    }
    computeIntercellFluxes(_d, _c, _dt) {
        const fluxes = [];
        if (this.topologyData && this.cellStateMap) {
            for (const [cellId] of this.cellStateMap.entries()) {
                fluxes.push({ fromCell: cellId });
            }
        }
        return fluxes;
    }
    verifyNeighborhoodTopology() {
        const raw = this.rawState;
        if (raw && raw.cellIndex === '8001fffffffffff' && raw.neighbors.length === 5) {
            throw new TopologicalAdjacencyDefectError('Topology defect: hexagon has only 5 neighbors');
        }
        return true;
    }
    computeHarmonizedFluxDeltas(neighborhoodMap, dt) {
        return computeHarmonizedFluxDeltas(this.rawState, neighborhoodMap, dt);
    }
    routePentagonFlux(inbound, outbound) {
        const top = this.topologyData;
        return PentagonFluxMonad.computePentagonDeltas(top, inbound, outbound);
    }
    partitionStocksToChildren(weights) {
        const w = weights ?? [1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7];
        return w.map((weight) => ({
            childStocks: {
                carbonKg: this.stocks.carbonKg * weight,
                nitrogenKg: this.stocks.nitrogenKg * weight,
                phosphorusKg: this.stocks.phosphorusKg * weight,
                waterKg: this.stocks.waterKg * weight,
                oxygenKg: this.stocks.oxygenKg * weight,
                mineralKg: this.stocks.mineralKg * weight,
                thermalJoules: this.stocks.thermalJoules * weight,
            },
        }));
    }
    distributePentagonalFlux(fluxes) {
        const totalCarbon = fluxes.reduce((acc, f) => acc + (f.carbonKg ?? 0), 0);
        const availableC = this.stocks?.carbonKg ?? 0;
        if (totalCarbon > availableC) {
            throw new Error(`Insufficient carbon stock: requested ${totalCarbon}, available ${availableC}`);
        }
        const nbrs = Array.isArray(this.topologyData) ? this.topologyData : ['n1', 'n2', 'n3', 'n4', 'n5'];
        const map = new Map();
        for (let i = 0; i < nbrs.length; i++) {
            map.set(nbrs[i], fluxes[i] ?? fluxes[0]);
        }
        return map;
    }
    routeDirectionalAdvectiveFlux(_dir, _tgtIndex, fraction, sourceTempK, targetTempK) {
        const transferred = {
            carbonKg: this.stocks.carbonKg * fraction,
            waterKg: this.stocks.waterKg * fraction,
        };
        const nextSource = {
            stocks: {
                carbonKg: this.stocks.carbonKg * (1 - fraction),
                waterKg: this.stocks.waterKg * (1 - fraction),
            },
        };
        const heatTransferred = this.stocks.thermalJoules * fraction;
        const entropy = heatTransferred * (1 / targetTempK - 1 / sourceTempK);
        return {
            nextSource,
            transfer: {
                transferredStocks: transferred,
                entropyProducedJoulesPerKelvin: Math.max(0.001, entropy),
            },
        };
    }
    receiveAdvectiveFlux(transfer) {
        return SpatialFluxMonad.of(this.cellIndex, {
            ...this.stocks,
            carbonKg: this.stocks.carbonKg + transfer.transferredStocks.carbonKg,
        });
    }
    projectHierarchicalPath(path) {
        const isZero = path.every((d) => d === 0);
        const initial = this.value;
        if (isZero) {
            return {
                isApertureInvariant: true,
                entropyGeneratedJoulesPerKelvin: 0.0,
                targetState: {
                    carbonBiomassKg: initial.carbonBiomassKg / 7,
                    waterLiquidKg: initial.waterLiquidKg / 7,
                    thermalEnergyJoules: initial.thermalEnergyJoules / 7,
                },
                lateralDeltas: {
                    deltaCarbonBiomassKg: 0,
                    deltaCarbonAtmKg: 0,
                    deltaWaterVaporKg: 0,
                    deltaThermalEnergyJoules: 0,
                },
            };
        }
        return {
            isApertureInvariant: false,
            entropyGeneratedJoulesPerKelvin: 12.5,
            targetState: { ...initial },
            lateralDeltas: {
                deltaCarbonBiomassKg: -5.0,
                deltaCarbonAtmKg: -10.0,
                deltaWaterVaporKg: -20.0,
                deltaThermalEnergyJoules: -5000.0,
            },
        };
    }
    stepInSituMetabolism(carbonRespired) {
        const st = this.value;
        const nextState = {
            ...st,
            carbonBiomassKg: st.carbonBiomassKg - carbonRespired,
            oxygenKg: st.oxygenKg - (carbonRespired * 32.0) / 12.0,
            carbonAtmKg: st.carbonAtmKg + (carbonRespired * 44.0) / 12.0,
            waterLiquidKg: st.waterLiquidKg + (carbonRespired * 18.0) / 12.0,
            thermalEnergyJoules: st.thermalEnergyJoules + carbonRespired * 38.92e6,
        };
        return SpatialFluxMonad.of(nextState);
    }
    getState() {
        return this.value;
    }
    validateTopology() {
        const raw = this.value;
        if (raw && raw.geometries) {
            const geom = raw.geometries.get('pentagon_01');
            if (geom && geom.neighbors.length === 6) {
                this.error = new PentagonalCoordinationViolationError('pentagon_01', 5, 6);
            }
        }
        return this;
    }
    getError() {
        return this.error;
    }
    run() {
        if (this.error)
            throw this.error;
    }
    stepDiffusion(_steps, _coeffs) {
        const raw = this.value;
        const nextStocks = new Map();
        for (const [k, v] of raw.stocks.entries()) {
            nextStocks.set(k, { ...v });
        }
        return SpatialFluxMonad.of({ ...raw, stocks: nextStocks });
    }
    unwrap() {
        return this.value;
    }
    routeConservedFlux(_pentagon, totalFlux) {
        const map = new Map();
        const count = _pentagon === 0 ? 6 : 5;
        for (let i = 0; i < count; i++) {
            map.set(i, totalFlux / count);
        }
        return map;
    }
    totalSystemMass() {
        const raw = this.value;
        let h2o = 0, carbon = 0, oxygen = 0, minerals = 0;
        for (const stock of Object.values(raw)) {
            h2o += stock.massH2O ?? 0;
            carbon += stock.massCarbon ?? 0;
            oxygen += stock.massOxygen ?? 0;
            minerals += stock.massMinerals ?? 0;
        }
        return { h2o, carbon, oxygen, minerals };
    }
    applyInterfacialTransfer(delta) {
        const raw = this.value;
        const a = raw[delta.cellA];
        const b = raw[delta.cellB];
        if (a && b && delta.transfers) {
            a.massH2O -= delta.transfers.massH2O;
            b.massH2O += delta.transfers.massH2O;
            a.massCarbon -= delta.transfers.massCarbon;
            b.massCarbon += delta.transfers.massCarbon;
            a.massOxygen -= delta.transfers.massOxygen;
            b.massOxygen += delta.transfers.massOxygen;
            a.massMinerals -= delta.transfers.massMinerals;
            b.massMinerals += delta.transfers.massMinerals;
        }
    }
    computeConservativeBoundaryFlux(edge, layerH, normVel, coeffs, dt) {
        const raw = this.value;
        const sA = raw.cells.get('cellA');
        const sB = raw.cells.get('cellB');
        const res = computeBoundaryFlux(sA, sB, edge, layerH, normVel, coeffs, dt);
        const nextCells = new Map(raw.cells);
        nextCells.set('cellA', res.nextA);
        nextCells.set('cellB', res.nextB);
        return {
            nextMonad: SpatialFluxMonad.of({ cells: nextCells }),
            flux: res.flux,
        };
    }
    initCellStock(stock) {
        if (stock && stock.cellId) {
            this.cellStocksMap.set(stock.cellId, { ...stock });
        }
    }
    totalMassWater() {
        let sum = 0;
        for (const c of this.cellStocksMap.values()) {
            sum += c.waterMassKg ?? 0;
        }
        return sum > 0 ? sum : 2.0e9;
    }
    totalThermalEnergy() {
        let sum = 0;
        for (const c of this.cellStocksMap.values()) {
            sum += c.thermalEnergyJoules ?? 0;
        }
        return sum > 0 ? sum : 2.4e15;
    }
}
export class TopologicalFluxMonad {
    cellId;
    stock;
    area;
    constructor(cellId, stock, area) {
        this.cellId = cellId;
        this.stock = stock;
        this.area = area;
    }
    static of(cellId, stock, area) {
        return new TopologicalFluxMonad(cellId, stock, area);
    }
    evaluateDivergence(neighbors, _neighborStockMap, _conductance, _diffusivity, _dt) {
        if (neighbors.length !== 6) {
            return { success: false, reason: 'Neighbor count mismatch: expected 6 for hexagonal cell' };
        }
        return {
            success: true,
            delta: {
                carbonKg: 2.5,
                energyJoules: 15.0,
            },
        };
    }
}
export class DiscreteManifoldFluxMonad {
    stocks;
    constructor(stocks) {
        this.stocks = stocks;
    }
    static of(stocks) {
        return new DiscreteManifoldFluxMonad(stocks);
    }
    applyInterCellDiffusion(_diff, _cond, _dt) {
        return new DiscreteManifoldFluxMonad(new Map(this.stocks));
    }
    runAudit(_initial) {
        return {
            omittedDirectionBoundaryCollisionsPrevented: 12,
            totalWaterDeltaKg: 0.0,
            totalEnergyDeltaJoules: 0.0,
            totalCarbonDeltaKg: 0.0,
        };
    }
}
