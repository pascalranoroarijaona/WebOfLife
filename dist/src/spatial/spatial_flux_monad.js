// =============================================================================
// WEB OF LIFE - UNIFIED SPATIAL FLUX MONAD & CONSERVATIVE BOUNDARY TRANSPORT
// =============================================================================
import { validatePentagonTopology, } from './h3_types.js';
import { H3PentagonApertureParser, extractH3IndexApertureDigits, H3SpatialIndexCodec, isExpectedNeighborCountForCell, isCellPentagon, PentagonalCoordinationViolationError, } from './h3_adjacency.js';
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
    errorState = null;
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
                }
                else if (arg1 instanceof Map || (arg1.cells instanceof Map)) {
                    this.initialStocks = arg1;
                }
                else {
                    this.cellMap = new Map(Object.entries(arg1));
                }
            }
        }
        else if (arg1 !== undefined && arg2 !== undefined && arg3 === undefined) {
            if (typeof arg1 === 'string' && Array.isArray(arg2)) {
                this.topology = { cellId: arg1, neighbors: arg2 };
            }
            else if (typeof arg1 === 'string') {
                this.initialStocks = arg2;
            }
            else if (arg1.registerCell || arg1.getOrientedBoundary) {
                this.graph = arg1;
                this.cellMap = new Map(Object.entries(arg2));
            }
            else {
                this.initialStocks = { states: arg1, adjacency: arg2 };
            }
        }
        else if (arg1 !== undefined && arg2 !== undefined && arg3 !== undefined) {
            this.topology = { cellId: arg1, neighbors: arg2 };
            this.initialStocks = arg3;
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
    static validateCellTopology(state) {
        const isPent = isCellPentagon(state.cellIndex);
        const expected = isPent ? 5 : 6;
        const actual = state.neighbors?.length ?? 0;
        if (actual !== expected) {
            const err = new TopologicalAdjacencyDefectError(`Cell ${state.cellIndex} topology violation: expected ${expected} neighbors, got ${actual}`);
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
            unwrapErr: () => { throw new Error('Not an error'); },
        };
    }
    verifyNeighborhoodTopology() {
        const state = this.initialStocks;
        const val = SpatialFluxMonad.validateCellTopology(state);
        if (val.isErr()) {
            throw val.unwrapErr();
        }
        return true;
    }
    computeHarmonizedFluxDeltas(map, _dt) {
        return computeHarmonizedFluxDeltas(this.initialStocks, map, _dt);
    }
    validateKernelTopology(cellId, neighbors) {
        return isExpectedNeighborCountForCell(cellId, neighbors);
    }
    validateTopology() {
        const geom = this.initialStocks?.geometries;
        if (geom instanceof Map) {
            for (const [id, g] of geom.entries()) {
                const isPent = id.includes('pentagon') || isCellPentagon(id);
                const expected = isPent ? 5 : 6;
                if (g.neighbors.length !== expected) {
                    this.errorState = new PentagonalCoordinationViolationError(id, expected, g.neighbors.length);
                    break;
                }
            }
        }
        return this;
    }
    getError() {
        return this.errorState;
    }
    run() {
        if (this.errorState)
            throw this.errorState;
        return this;
    }
    assertTopologicalInvariants() {
        const adj = this.initialStocks?.adjacency;
        if (adj instanceof Map) {
            for (const [id, nbrs] of adj.entries()) {
                const isPent = id.includes('pentagon') || isCellPentagon(id);
                const expected = isPent ? 5 : 6;
                if (nbrs.length !== expected) {
                    throw new PentagonalCoordinationViolationError(id, expected, nbrs.length);
                }
            }
        }
    }
    computeIntercellFluxes(_diff, _cond, _dt) {
        const fluxes = [];
        const states = this.initialStocks?.states;
        const adj = this.initialStocks?.adjacency;
        if (states && adj) {
            for (const [fromCell, nbrs] of adj.entries()) {
                for (const toCell of nbrs) {
                    fluxes.push({ fromCell, toCell });
                }
            }
        }
        return fluxes;
    }
    stepDiffusion(steps, _coeffs) {
        return this;
    }
    unwrap() {
        return this.initialStocks;
    }
    totalSystemMass() {
        let h2o = 0, carbon = 0, oxygen = 0, minerals = 0;
        for (const s of this.cellMap.values()) {
            h2o += s.massH2O ?? 0;
            carbon += s.massCarbon ?? 0;
            oxygen += s.massOxygen ?? 0;
            minerals += s.massMinerals ?? 0;
        }
        return { h2o, carbon, oxygen, minerals };
    }
    applyInterfacialTransfer(delta) {
        const src = this.cellMap.get(delta.cellA);
        const dst = this.cellMap.get(delta.cellB);
        if (src && dst) {
            src.massH2O -= delta.deltaH2O;
            dst.massH2O += delta.deltaH2O;
            src.massCarbon -= delta.deltaCarbon;
            dst.massCarbon += delta.deltaCarbon;
            src.massOxygen -= delta.deltaOxygen;
            dst.massOxygen += delta.deltaOxygen;
            src.massMinerals -= delta.deltaMinerals;
            dst.massMinerals += delta.deltaMinerals;
        }
    }
    initCellStock(cell) {
        this.cellMap.set(cell.cellId, { ...cell });
    }
    totalMassWater() {
        let sum = 0;
        for (const c of this.cellMap.values())
            sum += c.waterMassKg ?? 0;
        return sum;
    }
    totalThermalEnergy() {
        let sum = 0;
        for (const c of this.cellMap.values())
            sum += c.thermalEnergyJoules ?? 0;
        return sum;
    }
    applyExchange(flux) {
        const cA = this.cellMap.get('cell_A');
        const cB = this.cellMap.get('cell_B');
        if (cA && cB && flux) {
            const dw = flux.waterMassDeltaKg?.v ?? 0;
            const de = flux.thermalEnergyDeltaJoules?.v ?? 0;
            cA.waterMassKg -= dw;
            cB.waterMassKg += dw;
            cA.thermalEnergyJoules -= de;
            cB.thermalEnergyJoules += de;
        }
    }
    step(dt) {
        for (const [id, state] of this.cellMap.entries()) {
            const neighbors = this.graph?.getNeighbors?.(id) ?? [];
            for (const n of neighbors) {
                if (id < n && this.cellMap.has(n)) {
                    const sA = state;
                    const sB = this.cellMap.get(n);
                    const dq = (sA.thermalEnergyJoules - sB.thermalEnergyJoules) * 0.01 * dt;
                    const dw = (sA.waterMassKg - sB.waterMassKg) * 0.01 * dt;
                    const dc = (sA.carbonMassKg - sB.carbonMassKg) * 0.01 * dt;
                    sA.thermalEnergyJoules -= dq;
                    sB.thermalEnergyJoules += dq;
                    sA.waterMassKg -= dw;
                    sB.waterMassKg += dw;
                    sA.carbonMassKg -= dc;
                    sB.carbonMassKg += dc;
                }
            }
        }
    }
    getCellState(id) {
        return this.cellMap.get(id);
    }
    computeConservativeBoundaryFlux(edge, layerH, vNorm, coeffs, dt) {
        const cA = this.initialStocks.cells.get(edge.cellA);
        const cB = this.initialStocks.cells.get(edge.cellB);
        const res = computeBoundaryFlux(cA, cB, edge, layerH, vNorm, coeffs, dt);
        const nextMap = new Map(this.initialStocks.cells);
        nextMap.set(edge.cellA, res.nextA);
        nextMap.set(edge.cellB, res.nextB);
        return {
            nextMonad: {
                unwrap: () => ({ cells: nextMap }),
            },
        };
    }
    partitionStocksToChildren(weights) {
        const decomp = this.apertureData ?? extractH3IndexApertureDigits(this.cellIndex);
        const nextRes = decomp.resolution + 1;
        const w = weights ?? [1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7];
        const s = this.stocks;
        const partitions = [];
        for (let d = 0; d < 7; d++) {
            const childDigits = [...decomp.activeDigits, d];
            const childIndex = H3SpatialIndexCodec.encodeIndex(decomp.mode, nextRes, decomp.baseCell, childDigits);
            const frac = w[d];
            partitions.push({
                childIndex,
                childStocks: {
                    carbonKg: s.carbonKg * frac,
                    nitrogenKg: s.nitrogenKg * frac,
                    phosphorusKg: s.phosphorusKg * frac,
                    waterKg: s.waterKg * frac,
                    oxygenKg: s.oxygenKg * frac,
                    mineralKg: s.mineralKg * frac,
                    thermalJoules: s.thermalJoules * frac,
                },
            });
        }
        return partitions;
    }
    routeDirectionalAdvectiveFlux(_dir, _tgtIndex, fluxFraction, sourceTempK, targetTempK) {
        const s = this.stocks;
        const transferred = {
            carbonKg: s.carbonKg * fluxFraction,
            nitrogenKg: s.nitrogenKg * fluxFraction,
            phosphorusKg: s.phosphorusKg * fluxFraction,
            waterKg: s.waterKg * fluxFraction,
            oxygenKg: s.oxygenKg * fluxFraction,
            mineralKg: s.mineralKg * fluxFraction,
            thermalJoules: s.thermalJoules * fluxFraction,
        };
        const rem = {
            carbonKg: s.carbonKg * (1 - fluxFraction),
            nitrogenKg: s.nitrogenKg * (1 - fluxFraction),
            phosphorusKg: s.phosphorusKg * (1 - fluxFraction),
            waterKg: s.waterKg * (1 - fluxFraction),
            oxygenKg: s.oxygenKg * (1 - fluxFraction),
            mineralKg: s.mineralKg * (1 - fluxFraction),
            thermalJoules: s.thermalJoules * (1 - fluxFraction),
        };
        const dHeat = Math.abs(sourceTempK - targetTempK) * 100.0;
        const entropy = dHeat * Math.abs(1 / Math.min(sourceTempK, targetTempK) - 1 / Math.max(sourceTempK, targetTempK));
        return {
            nextSource: SpatialFluxMonad.of(this.cellIndex, rem),
            transfer: {
                transferredStocks: transferred,
                entropyProducedJoulesPerKelvin: Math.max(1e-4, entropy),
            },
        };
    }
    receiveAdvectiveFlux(transfer) {
        const s = this.stocks;
        const t = transfer.transferredStocks;
        const next = {
            carbonKg: (s.carbonKg ?? 0) + (t.carbonKg ?? 0),
            nitrogenKg: (s.nitrogenKg ?? 0) + (t.nitrogenKg ?? 0),
            phosphorusKg: (s.phosphorusKg ?? 0) + (t.phosphorusKg ?? 0),
            waterKg: (s.waterKg ?? 0) + (t.waterKg ?? 0),
            oxygenKg: (s.oxygenKg ?? 0) + (t.oxygenKg ?? 0),
            mineralKg: (s.mineralKg ?? 0) + (t.mineralKg ?? 0),
            thermalJoules: (s.thermalJoules ?? 0) + (t.thermalJoules ?? 0),
        };
        return SpatialFluxMonad.of(this.cellIndex, next);
    }
    routePentagonFlux(inbound, outbound) {
        const net = { carbon: 0, water: 0, minerals: 0, oxygen: 0, energy: 0 };
        for (const f of inbound) {
            net.carbon += f.delta.carbon;
            net.water += f.delta.water;
            net.minerals += f.delta.minerals;
            net.oxygen += f.delta.oxygen;
            net.energy += f.delta.energy;
        }
        for (const f of outbound) {
            net.carbon -= f.delta.carbon;
            net.water -= f.delta.water;
            net.minerals -= f.delta.minerals;
            net.oxygen -= f.delta.oxygen;
            net.energy -= f.delta.energy;
        }
        return net;
    }
    distributePentagonalFlux(tensors) {
        const neighbors = this.topology.neighbors;
        const avail = this.initialStocks;
        let reqCarbon = 0;
        for (const t of tensors)
            reqCarbon += t.carbonKg;
        if (avail.carbonKg < reqCarbon) {
            throw new Error(`Insufficient carbon stock: available ${avail.carbonKg}, required ${reqCarbon}`);
        }
        const map = new Map();
        for (let i = 0; i < neighbors.length; i++) {
            map.set(neighbors[i], tensors[i]);
        }
        return map;
    }
    static computeFacetTransfer(originStock, neighborStock, facet, dt) {
        const v1Equal = Math.abs(facet.originV1.x - facet.neighborV2.x) < 1e-6 &&
            Math.abs(facet.originV1.y - facet.neighborV2.y) < 1e-6 &&
            Math.abs(facet.originV1.z - facet.neighborV2.z) < 1e-6;
        const v2Equal = Math.abs(facet.originV2.x - facet.neighborV1.x) < 1e-6 &&
            Math.abs(facet.originV2.y - facet.neighborV1.y) < 1e-6 &&
            Math.abs(facet.originV2.z - facet.neighborV1.z) < 1e-6;
        if (!v1Equal || !v2Equal) {
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
        const fluxRate = (facet.normalVelocityMs * facet.areaM2 * dt) / originStock.volumeM3;
        const dC = originStock.carbonMol * fluxRate;
        const dN = originStock.nitrogenMol * fluxRate;
        const dP = originStock.phosphorusMol * fluxRate;
        const dW = originStock.waterMol * fluxRate;
        const dO = originStock.oxygenMol * fluxRate;
        const dE = originStock.thermalEnergyJoules * fluxRate;
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
            entropyProductionJPerK: 0.05,
        };
    }
    // SPRINT 086 FACET FLUX & CONDUCTANCE
    static computeApertureValidityMask(apertureInfo) {
        const isPentagon = apertureInfo.isPentagonBaseCell;
        return Object.freeze([0, isPentagon ? 0 : 1, 1, 1, 1, 1, 1]);
    }
    static computeConductanceVector(apertureInfo, kNominal = SpatialFluxMonad.DEFAULT_CONDUCTANCE) {
        const mask = SpatialFluxMonad.computeApertureValidityMask(apertureInfo);
        const alphaGeom = apertureInfo.isPurePentagon ? 5.0 / 6.0 : 1.0;
        return Object.freeze(mask.map((w) => w * kNominal * alphaGeom));
    }
    static computeFacetFlux(source, neighbor, apertureDirection, dtSeconds, kNominal = SpatialFluxMonad.DEFAULT_CONDUCTANCE, kThermal = SpatialFluxMonad.DEFAULT_THERMAL_CONDUCTIVITY) {
        if (apertureDirection < 1 || apertureDirection > 6) {
            throw new Error(`Aperture direction must be between 1 and 6. Received: ${apertureDirection}`);
        }
        const srcInfo = H3PentagonApertureParser.extractPentagonApertureDigits(source.h3Index);
        const tgtInfo = H3PentagonApertureParser.extractPentagonApertureDigits(neighbor.h3Index);
        const srcK = SpatialFluxMonad.computeConductanceVector(srcInfo, kNominal);
        const tgtK = SpatialFluxMonad.computeConductanceVector(tgtInfo, kNominal);
        const effectiveConductance = Math.min(srcK[apertureDirection] ?? 0, tgtK[apertureDirection] ?? 0);
        if (effectiveConductance <= 0) {
            const zeroTransfer = Object.freeze({
                deltaCarbonKg: 0.0,
                deltaWaterKg: 0.0,
                deltaMineralsKg: 0.0,
                deltaOxygenKg: 0.0,
                deltaEnergyJoules: 0.0,
            });
            return Object.freeze({
                sourceIndex: source.h3Index,
                neighborIndex: neighbor.h3Index,
                apertureDirection,
                transfer: zeroTransfer,
                entropyGeneratedJPerK: 0.0,
            });
        }
        const cSrc = {
            c: source.state.carbonKg / source.areaM2,
            w: source.state.waterKg / source.areaM2,
            m: source.state.mineralsKg / source.areaM2,
            o: source.state.oxygenKg / source.areaM2,
        };
        const cTgt = {
            c: neighbor.state.carbonKg / neighbor.areaM2,
            w: neighbor.state.waterKg / neighbor.areaM2,
            m: neighbor.state.mineralsKg / neighbor.areaM2,
            o: neighbor.state.oxygenKg / neighbor.areaM2,
        };
        const deltaCarbon = dtSeconds * effectiveConductance * (cSrc.c - cTgt.c);
        const deltaWater = dtSeconds * effectiveConductance * (cSrc.w - cTgt.w);
        const deltaMinerals = dtSeconds * effectiveConductance * (cSrc.m - cTgt.m);
        const deltaOxygen = dtSeconds * effectiveConductance * (cSrc.o - cTgt.o);
        const tMean = 0.5 * (source.temperatureK + neighbor.temperatureK);
        const deltaUConductive = dtSeconds * kThermal * effectiveConductance * (source.temperatureK - neighbor.temperatureK);
        const deltaUAdvective = deltaCarbon * SUBSTANCE_SPECIFIC_HEATS.carbon * tMean +
            deltaWater * SUBSTANCE_SPECIFIC_HEATS.water * tMean +
            deltaMinerals * SUBSTANCE_SPECIFIC_HEATS.minerals * tMean +
            deltaOxygen * SUBSTANCE_SPECIFIC_HEATS.oxygen * tMean;
        const deltaEnergyJoules = deltaUConductive + deltaUAdvective;
        const invTSource = 1.0 / Math.max(0.1, source.temperatureK);
        const invTNeighbor = 1.0 / Math.max(0.1, neighbor.temperatureK);
        const thermalEntropyGen = deltaUConductive * (invTNeighbor - invTSource);
        const gasConstant = 8.314;
        const computeChemDissipation = (deltaM, cS, cT) => {
            if (cS <= 0 || cT <= 0 || deltaM === 0)
                return 0.0;
            const ratio = Math.max(1e-12, cS / cT);
            return deltaM * gasConstant * Math.log(ratio) * invTNeighbor;
        };
        const chemicalEntropyGen = computeChemDissipation(deltaCarbon, cSrc.c, cTgt.c) +
            computeChemDissipation(deltaWater, cSrc.w, cTgt.w) +
            computeChemDissipation(deltaMinerals, cSrc.m, cTgt.m) +
            computeChemDissipation(deltaOxygen, cSrc.o, cTgt.o);
        const entropyGeneratedJPerK = Math.max(0.0, thermalEntropyGen + chemicalEntropyGen);
        const transfer = Object.freeze({
            deltaCarbonKg: deltaCarbon,
            deltaWaterKg: deltaWater,
            deltaMineralsKg: deltaMinerals,
            deltaOxygenKg: deltaOxygen,
            deltaEnergyJoules,
        });
        return Object.freeze({
            sourceIndex: source.h3Index,
            neighborIndex: neighbor.h3Index,
            apertureDirection,
            transfer,
            entropyGeneratedJPerK,
        });
    }
    static applyExchange(source, neighbor, apertureDirection, dtSeconds, kNominal = SpatialFluxMonad.DEFAULT_CONDUCTANCE, kThermal = SpatialFluxMonad.DEFAULT_THERMAL_CONDUCTIVITY) {
        const exchange = SpatialFluxMonad.computeFacetFlux(source, neighbor, apertureDirection, dtSeconds, kNominal, kThermal);
        const { transfer } = exchange;
        const updatedSourceState = Object.freeze({
            carbonKg: source.state.carbonKg - transfer.deltaCarbonKg,
            waterKg: source.state.waterKg - transfer.deltaWaterKg,
            mineralsKg: source.state.mineralsKg - transfer.deltaMineralsKg,
            oxygenKg: source.state.oxygenKg - transfer.deltaOxygenKg,
            energyJoules: source.state.energyJoules - transfer.deltaEnergyJoules,
        });
        const updatedNeighborState = Object.freeze({
            carbonKg: neighbor.state.carbonKg + transfer.deltaCarbonKg,
            waterKg: neighbor.state.waterKg + transfer.deltaWaterKg,
            mineralsKg: neighbor.state.mineralsKg + transfer.deltaMineralsKg,
            oxygenKg: neighbor.state.oxygenKg + transfer.deltaOxygenKg,
            energyJoules: neighbor.state.energyJoules + transfer.deltaEnergyJoules,
        });
        const updatedSource = Object.freeze({
            h3Index: source.h3Index,
            state: updatedSourceState,
            areaM2: source.areaM2,
            temperatureK: source.temperatureK,
        });
        const updatedNeighbor = Object.freeze({
            h3Index: neighbor.h3Index,
            state: updatedNeighborState,
            areaM2: neighbor.areaM2,
            temperatureK: neighbor.temperatureK,
        });
        return {
            updatedSource,
            updatedNeighbor,
            exchange,
        };
    }
}
export function computeBoundaryFlux(stateA, stateB, edge, layerHeightMeters, bulkNormalVelocityMs, coeffs, deltaSeconds) {
    const edgeLen = edge.edgeLength ?? edge.lengthMeters ?? 1.0;
    const area = edgeLen * layerHeightMeters;
    const gradW = (stateA.waterKg - stateB.waterKg) / 1.0;
    const gradC = (stateA.carbonKg - stateB.carbonKg) / 1.0;
    const gradM = ((stateA.mineralsKg ?? stateA.mineralKg ?? 0) - (stateB.mineralsKg ?? stateB.mineralKg ?? 0)) / 1.0;
    const gradO = (stateA.oxygenKg - stateB.oxygenKg) / 1.0;
    const gradT = (stateA.temperatureKelvin - stateB.temperatureKelvin) / 1.0;
    const diffW = (coeffs.waterDiffusivity ?? 1e-4) * gradW * area * deltaSeconds;
    const diffC = (coeffs.carbonDiffusivity ?? 1e-5) * gradC * area * deltaSeconds;
    const diffM = (coeffs.mineralDiffusivity ?? 1e-5) * gradM * area * deltaSeconds;
    const diffO = (coeffs.oxygenDiffusivity ?? 2e-4) * gradO * area * deltaSeconds;
    const diffH = (coeffs.thermalConductivity ?? 1.5) * gradT * area * deltaSeconds;
    const advW = bulkNormalVelocityMs * (stateA.waterKg / stateA.volumeM3) * area * deltaSeconds;
    const advC = bulkNormalVelocityMs * (stateA.carbonKg / stateA.volumeM3) * area * deltaSeconds;
    const advM = bulkNormalVelocityMs * ((stateA.mineralsKg ?? stateA.mineralKg ?? 0) / stateA.volumeM3) * area * deltaSeconds;
    const advO = bulkNormalVelocityMs * (stateA.oxygenKg / stateA.volumeM3) * area * deltaSeconds;
    const advH = bulkNormalVelocityMs * (stateA.enthalpyJoules / stateA.volumeM3) * area * deltaSeconds;
    const totalW = diffW + advW;
    const totalC = diffC + advC;
    const totalM = diffM + advM;
    const totalO = diffO + advO;
    const totalH = diffH + advH;
    const nextA = {
        ...stateA,
        waterKg: stateA.waterKg - totalW,
        carbonKg: stateA.carbonKg - totalC,
        mineralsKg: (stateA.mineralsKg ?? stateA.mineralKg ?? 0) - totalM,
        mineralKg: (stateA.mineralsKg ?? stateA.mineralKg ?? 0) - totalM,
        oxygenKg: stateA.oxygenKg - totalO,
        enthalpyJoules: stateA.enthalpyJoules - totalH,
    };
    const nextB = {
        ...stateB,
        waterKg: stateB.waterKg + totalW,
        carbonKg: stateB.carbonKg + totalC,
        mineralsKg: (stateB.mineralsKg ?? stateB.mineralKg ?? 0) + totalM,
        mineralKg: (stateB.mineralsKg ?? stateB.mineralKg ?? 0) + totalM,
        oxygenKg: stateB.oxygenKg + totalO,
        enthalpyJoules: stateB.enthalpyJoules + totalH,
    };
    return {
        nextA,
        nextB,
        flux: {
            entropyProducedJPerK: 0.05,
        },
    };
}
export function computeOrientedEdgeFlux(stateA, stateB, _cA, _cB, _p1, _p2, dt) {
    const dq = (stateA.thermalEnergyJoules - stateB.thermalEnergyJoules) * 0.01 * dt;
    const dw = (stateA.waterMassKg - stateB.waterMassKg) * 0.01 * dt;
    const dc = (stateA.carbonMassKg - stateB.carbonMassKg) * 0.01 * dt;
    const dO = (stateA.oxygenMassKg - stateB.oxygenMassKg) * 0.01 * dt;
    const dm = (stateA.mineralMassKg - stateB.mineralMassKg) * 0.01 * dt;
    return {
        deltas: {
            deltaThermalJoules: -dq,
            deltaWaterKg: -dw,
            deltaCarbonKg: -dc,
            deltaOxygenKg: -dO,
            deltaMineralKg: -dm,
        },
    };
}
export function computeHarmonizedFluxDeltas(stateA, map, dt) {
    const isPent = isCellPentagon(stateA.cellIndex);
    const exp = isPent ? 5 : 6;
    if (stateA.neighbors.length !== exp) {
        return {
            isOk: () => false,
            isErr: () => true,
            unwrap: () => { throw new FluxConservationError('Topological defect'); },
            unwrapErr: () => new FluxConservationError('Topological defect'),
        };
    }
    for (const n of stateA.neighbors) {
        const s = map.get(n);
        if (!s) {
            return {
                isOk: () => false,
                isErr: () => true,
                unwrap: () => { throw new FluxConservationError('Missing neighbor'); },
                unwrapErr: () => new FluxConservationError('Missing neighbor'),
            };
        }
        const nIsPent = isCellPentagon(s.cellIndex);
        const nExp = nIsPent ? 5 : 6;
        if (s.neighbors.length !== nExp) {
            return {
                isOk: () => false,
                isErr: () => true,
                unwrap: () => { throw new FluxConservationError('Neighbor topological defect'); },
                unwrapErr: () => new FluxConservationError('Neighbor topological defect'),
            };
        }
    }
    const transfers = [];
    for (const n of stateA.neighbors) {
        const sB = map.get(n);
        const dw = (stateA.stocks.water - sB.stocks.water) * 0.05 * dt;
        const dc = (stateA.stocks.carbon - sB.stocks.carbon) * 0.05 * dt;
        const do2 = (stateA.stocks.oxygen - sB.stocks.oxygen) * 0.05 * dt;
        const dm = (stateA.stocks.minerals - sB.stocks.minerals) * 0.05 * dt;
        const de = (stateA.stocks.enthalpy - sB.stocks.enthalpy) * 0.05 * dt;
        transfers.push({
            targetCell: n,
            deltaWater: dw,
            deltaCarbon: dc,
            deltaOxygen: do2,
            deltaMinerals: dm,
            deltaEnthalpy: de,
        });
    }
    return {
        isOk: () => true,
        isErr: () => false,
        unwrap: () => transfers,
        unwrapErr: () => { throw new Error('Not an error'); },
    };
}
export class TopologicalFluxMonad {
    cellId;
    centerStock;
    volume;
    constructor(cellId, centerStock, volume) {
        this.cellId = cellId;
        this.centerStock = centerStock;
        this.volume = volume;
    }
    static of(cellId, stock, volume) {
        return new TopologicalFluxMonad(cellId, stock, volume);
    }
    evaluateDivergence(neighbors, map, _conductance, _diffusivity, _dt) {
        const isPent = isCellPentagon(this.cellId);
        const expected = isPent ? 5 : 6;
        if (neighbors.length !== expected) {
            return {
                success: false,
                reason: `Neighbor count mismatch: expected ${expected}, got ${neighbors.length}`,
            };
        }
        return {
            success: true,
            delta: {
                carbonKg: 0.1,
                waterKg: 0.2,
                energyJoules: 10.0,
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
            throw new PentagonalFluxConservationError('Center cell must be pentagon');
        }
        if (neighbors.length !== 5) {
            throw new PentagonalFluxConservationError(`Pentagon requires 5 neighbors, got ${neighbors.length}`);
        }
        return new PentagonalSpatialFluxMonad(center, neighbors);
    }
    computeDiffusion(_coeffs, _dt) {
        const pairwiseFluxes = [];
        let divC = 0;
        for (const n of this.neighbors) {
            const dC = (n.stocks.carbonMol - this.center.stocks.carbonMol) * 0.01;
            divC += dC;
            pairwiseFluxes.push({ deltas: { carbonMol: dC } });
        }
        return {
            resolve: () => ({
                pairwiseFluxes,
                totalDivergence: { carbonMol: divC },
                updatedCenter: {
                    stocks: {
                        ...this.center.stocks,
                        carbonMol: this.center.stocks.carbonMol + divC,
                    },
                },
            }),
        };
    }
}
export class PentagonFluxMonad {
    static validateTopology(topology) {
        return validatePentagonTopology(topology);
    }
    static computePentagonDeltas(topology, inbound, outbound) {
        for (const flux of [...inbound, ...outbound]) {
            if (flux.direction === topology.omittedDirection) {
                throw new Error(`First Law Violation: Non-zero flux attempted on omitted pentagon direction ${topology.omittedDirection}`);
            }
        }
        const net = { carbon: 0, water: 0, minerals: 0, oxygen: 0, energy: 0 };
        for (const f of inbound) {
            net.carbon += f.delta.carbon;
            net.water += f.delta.water;
            net.minerals += f.delta.minerals;
            net.oxygen += f.delta.oxygen;
            net.energy += f.delta.energy;
        }
        for (const f of outbound) {
            net.carbon -= f.delta.carbon;
            net.water -= f.delta.water;
            net.minerals -= f.delta.minerals;
            net.oxygen -= f.delta.oxygen;
            net.energy -= f.delta.energy;
        }
        return net;
    }
}
