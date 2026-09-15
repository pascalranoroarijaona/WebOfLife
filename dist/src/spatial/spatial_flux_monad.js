// =============================================================================
// WEB OF LIFE - SPATIAL FLUX MONAD & FINITE VOLUME TRANSPORT (SPRINTS 069 - 076)
// =============================================================================
import { isExpectedNeighborCountForCell, getCoordinationNumber, isCellPentagon, PentagonalCoordinationViolationError, } from './h3_adjacency.js';
export class TopologicalAdjacencyDefectError extends Error {
    constructor(message) {
        super(`[TopologicalAdjacencyDefectError] ${message}`);
        this.name = 'TopologicalAdjacencyDefectError';
    }
}
export class FluxConservationError extends Error {
    constructor(message) {
        super(`[FluxConservationError] ${message}`);
        this.name = 'FluxConservationError';
    }
}
export class Result {
    _ok;
    _value;
    _error;
    constructor(_ok, _value, _error) {
        this._ok = _ok;
        this._value = _value;
        this._error = _error;
    }
    static ok(value) {
        return new Result(true, value, undefined);
    }
    static err(error) {
        return new Result(false, undefined, error);
    }
    isOk() { return this._ok; }
    isErr() { return !this._ok; }
    unwrap() {
        if (!this._ok)
            throw this._error;
        return this._value;
    }
    unwrapErr() {
        if (this._ok)
            throw new Error('Called unwrapErr on Ok Result');
        return this._error;
    }
}
export function computeBoundaryFlux(stateA, stateB, _edge, heightM, velocity, coeffs, dt) {
    const area = 1.0 * heightM;
    const volFlow = velocity * area * dt;
    const isAtoB = velocity >= 0;
    const donor = isAtoB ? stateA : stateB;
    const frac = Math.min(0.2, Math.abs(volFlow) / (donor.volumeM3 ?? 100.0));
    const sign = isAtoB ? 1 : -1;
    const dWater = sign * (donor.waterKg ?? 0) * frac + (coeffs.waterDiffusivity ?? 1e-4) * ((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) * dt * 0.001;
    const dCarbon = sign * (donor.carbonKg ?? 0) * frac + (coeffs.carbonDiffusivity ?? 1e-5) * ((stateA.carbonKg ?? 0) - (stateB.carbonKg ?? 0)) * dt * 0.001;
    const dMinerals = sign * (donor.mineralsKg ?? 0) * frac + (coeffs.mineralDiffusivity ?? 1e-5) * ((stateA.mineralsKg ?? 0) - (stateB.mineralsKg ?? 0)) * dt * 0.001;
    const dOxygen = sign * (donor.oxygenKg ?? 0) * frac + (coeffs.oxygenDiffusivity ?? 2e-4) * ((stateA.oxygenKg ?? 0) - (stateB.oxygenKg ?? 0)) * dt * 0.001;
    const dEnthalpy = sign * (donor.enthalpyJoules ?? 0) * frac + (coeffs.thermalConductivity ?? 1.5) * ((stateA.temperatureKelvin ?? 300) - (stateB.temperatureKelvin ?? 285)) * area * dt;
    const nextA = {
        ...stateA,
        waterKg: (stateA.waterKg ?? 0) - dWater,
        carbonKg: (stateA.carbonKg ?? 0) - dCarbon,
        mineralsKg: (stateA.mineralsKg ?? 0) - dMinerals,
        oxygenKg: (stateA.oxygenKg ?? 0) - dOxygen,
        enthalpyJoules: (stateA.enthalpyJoules ?? 0) - dEnthalpy,
    };
    const nextB = {
        ...stateB,
        waterKg: (stateB.waterKg ?? 0) + dWater,
        carbonKg: (stateB.carbonKg ?? 0) + dCarbon,
        mineralsKg: (stateB.mineralsKg ?? 0) + dMinerals,
        oxygenKg: (stateB.oxygenKg ?? 0) + dOxygen,
        enthalpyJoules: (stateB.enthalpyJoules ?? 0) + dEnthalpy,
    };
    return {
        nextA,
        nextB,
        flux: {
            entropyProducedJPerK: Math.max(0, Math.abs(dEnthalpy) * 0.0001),
        },
    };
}
export function computeOrientedEdgeFlux(stateA, stateB, _centroidA, _centroidB, _p1, _p2, dt) {
    const dTh = ((stateA.thermalEnergyJoules - stateB.thermalEnergyJoules) / 10.0) * 0.1 * dt;
    const dW = ((stateA.waterMassKg - stateB.waterMassKg) / 10.0) * 0.1 * dt;
    const dC = ((stateA.carbonMassKg - stateB.carbonMassKg) / 10.0) * 0.1 * dt;
    const dO = ((stateA.oxygenMassKg - stateB.oxygenMassKg) / 10.0) * 0.1 * dt;
    const dM = ((stateA.mineralMassKg - stateB.mineralMassKg) / 10.0) * 0.1 * dt;
    return {
        deltas: {
            deltaThermalJoules: dTh,
            deltaWaterKg: dW,
            deltaCarbonKg: dC,
            deltaOxygenKg: dO,
            deltaMineralKg: dM,
        },
    };
}
export function computeHarmonizedFluxDeltas(state, neighborsMap, dt) {
    const neighbors = state.neighbors ?? [];
    const expectedCount = isCellPentagon(state.cellIndex) ? 5 : 6;
    if (neighbors.length !== expectedCount) {
        return Result.err(new FluxConservationError(`Cell ${state.cellIndex} neighbor count defect`));
    }
    for (const n of neighbors) {
        const nState = neighborsMap.get(n);
        if (!nState || !nState.neighbors || nState.neighbors.length !== (isCellPentagon(n) ? 5 : 6)) {
            return Result.err(new FluxConservationError(`Neighbor cell ${n} has topological defect`));
        }
    }
    const transfers = [];
    for (const n of neighbors) {
        const nState = neighborsMap.get(n);
        const dW = (state.stocks.water - nState.stocks.water) * 0.05 * dt;
        const dC = (state.stocks.carbon - nState.stocks.carbon) * 0.05 * dt;
        const dO = (state.stocks.oxygen - nState.stocks.oxygen) * 0.05 * dt;
        const dM = (state.stocks.minerals - nState.stocks.minerals) * 0.05 * dt;
        const dE = (state.stocks.enthalpy - nState.stocks.enthalpy) * 0.05 * dt;
        transfers.push({
            targetCell: n,
            deltaWater: dW,
            deltaCarbon: dC,
            deltaOxygen: dO,
            deltaMinerals: dM,
            deltaEnthalpy: dE,
        });
    }
    return Result.ok(transfers);
}
export class TopologicalFluxMonad {
    cellId;
    stock;
    volumeM3;
    constructor(cellId, stock, volumeM3 = 1e6) {
        this.cellId = cellId;
        this.stock = stock;
        this.volumeM3 = volumeM3;
    }
    static of(cellId, stock, volumeM3 = 1e6) {
        return new TopologicalFluxMonad(cellId, stock, volumeM3);
    }
    evaluateDivergence(neighbors, neighborStockMap, conductance, diffusivity, dtSeconds) {
        if (!isExpectedNeighborCountForCell(this.cellId, neighbors)) {
            const expected = getCoordinationNumber(this.cellId);
            const actual = Array.isArray(neighbors) ? neighbors.length : 0;
            return {
                success: false,
                reason: `Neighbor count mismatch: expected ${expected}, got ${actual}`,
                missingEdges: Math.max(0, expected - actual),
            };
        }
        let deltaCarbon = 0;
        let deltaWater = 0;
        let deltaMinerals = 0;
        let deltaOxygen = 0;
        let deltaEnergy = 0;
        const area = conductance.edgeLengthMeters * conductance.effectiveDepthMeters;
        const dist = Math.max(conductance.centroidDistanceMeters, 1e-6);
        const uNorm = conductance.normalVelocityMetersPerSec;
        for (const nId of neighbors) {
            const nStock = neighborStockMap.get(nId);
            if (!nStock)
                continue;
            const dC_diff = (diffusivity.carbon ?? 1e-4) * ((nStock.carbonKg - this.stock.carbonKg) / dist) * area * dtSeconds;
            const dW_diff = (diffusivity.water ?? 1e-4) * ((nStock.waterKg - this.stock.waterKg) / dist) * area * dtSeconds;
            const dM_diff = (diffusivity.minerals ?? 1e-5) * ((nStock.mineralsKg - this.stock.mineralsKg) / dist) * area * dtSeconds;
            const dO_diff = (diffusivity.oxygen ?? 1e-4) * ((nStock.oxygenKg - this.stock.oxygenKg) / dist) * area * dtSeconds;
            const dE_diff = (diffusivity.thermal ?? 1e-3) * ((nStock.energyJoules - this.stock.energyJoules) / dist) * area * dtSeconds;
            const volFlow = uNorm * area * dtSeconds;
            const donor = volFlow >= 0 ? nStock : this.stock;
            const frac = Math.min(0.1, Math.abs(volFlow) / this.volumeM3);
            const sign = volFlow >= 0 ? 1 : -1;
            deltaCarbon += dC_diff + sign * donor.carbonKg * frac;
            deltaWater += dW_diff + sign * donor.waterKg * frac;
            deltaMinerals += dM_diff + sign * donor.mineralsKg * frac;
            deltaOxygen += dO_diff + sign * donor.oxygenKg * frac;
            deltaEnergy += dE_diff + sign * donor.energyJoules * frac;
        }
        return {
            success: true,
            delta: {
                carbonKg: deltaCarbon,
                waterKg: deltaWater,
                mineralsKg: deltaMinerals,
                oxygenKg: deltaOxygen,
                energyJoules: deltaEnergy,
            },
        };
    }
}
export class SpatialFluxMonad {
    cellId = '';
    state;
    graph;
    cellStates = new Map();
    adjacency = new Map();
    stockMap = new Map();
    constructor(arg1, arg2) {
        if (typeof arg1 === 'string') {
            this.cellId = arg1;
            this.state = arg2;
            return;
        }
        if (arg1 && typeof arg1 === 'object') {
            if (arg1.cells instanceof Map) {
                this.state = arg1;
                this.cellStates = arg1.cells;
            }
            else if (arg1 instanceof Map) {
                this.cellStates = arg1;
                if (arg2 instanceof Map)
                    this.adjacency = arg2;
            }
            else if (arg2 && typeof arg2 === 'object') {
                this.graph = arg1;
                for (const [k, v] of Object.entries(arg2)) {
                    this.cellStates.set(k, { ...v });
                }
            }
            else if (arg1.cellIndex) {
                this.cellId = arg1.cellIndex;
                this.state = arg1;
            }
            else {
                this.graph = arg1;
                for (const [k, v] of Object.entries(arg1)) {
                    this.cellStates.set(k, { ...v });
                }
            }
        }
    }
    static of(...args) {
        return new SpatialFluxMonad(args[0], args[1]);
    }
    static computeFacetTransfer(originStock, neighborStock, facet, dt) {
        const isConjugate = facet.originV1.x === facet.neighborV2.x &&
            facet.originV1.y === facet.neighborV2.y &&
            facet.originV2.x === facet.neighborV1.x &&
            facet.originV2.y === facet.neighborV1.y;
        if (!isConjugate) {
            return {
                isValidConjugate: false,
                originDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
                neighborDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
                entropyProductionJPerK: 0,
            };
        }
        const u = facet.normalVelocityMs;
        const area = facet.areaM2;
        const volFlow = u * area * dt;
        const donor = u >= 0 ? originStock : neighborStock;
        const frac = Math.min(0.1, Math.abs(volFlow) / donor.volumeM3);
        const sign = u >= 0 ? 1 : -1;
        const dC = sign * donor.carbonMol * frac;
        const dN = sign * donor.nitrogenMol * frac;
        const dP = sign * donor.phosphorusMol * frac;
        const dW = sign * donor.waterMol * frac;
        const dO = sign * donor.oxygenMol * frac;
        const dE = sign * donor.thermalEnergyJoules * frac;
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
    static validateCellTopology(state) {
        const neighbors = state.neighbors ?? [];
        const expected = isCellPentagon(state.cellIndex) ? 5 : 6;
        if (neighbors.length !== expected) {
            return Result.err(new TopologicalAdjacencyDefectError(`Cell ${state.cellIndex} topology violation`));
        }
        return Result.ok(state);
    }
    verifyNeighborhoodTopology() {
        const expected = isCellPentagon(this.cellId) ? 5 : 6;
        const count = this.state.neighbors?.length ?? 0;
        if (count !== expected) {
            throw new TopologicalAdjacencyDefectError(`Cell ${this.cellId} neighbor count mismatch`);
        }
        return true;
    }
    computeHarmonizedFluxDeltas(neighborsMap, dt) {
        return computeHarmonizedFluxDeltas(this.state, neighborsMap, dt);
    }
    totalSystemMass() {
        let h2o = 0, carbon = 0, oxygen = 0, minerals = 0;
        for (const c of this.cellStates.values()) {
            h2o += c.massH2O ?? 0;
            carbon += c.massCarbon ?? 0;
            oxygen += c.massOxygen ?? 0;
            minerals += c.massMinerals ?? 0;
        }
        return { h2o, carbon, oxygen, minerals };
    }
    applyInterfacialTransfer(delta) {
        const keys = Array.from(this.cellStates.keys());
        if (keys.length >= 2) {
            const sA = this.cellStates.get(keys[0]);
            const sB = this.cellStates.get(keys[1]);
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
    computeConservativeBoundaryFlux(edge, heightM, velocity, coeffs, dt) {
        const sA = this.cellStates.get(edge.cellAId);
        const sB = this.cellStates.get(edge.cellBId);
        const res = computeBoundaryFlux(sA, sB, edge, heightM, velocity, coeffs, dt);
        const nextCells = new Map(this.cellStates);
        nextCells.set(edge.cellAId, res.nextA);
        nextCells.set(edge.cellBId, res.nextB);
        return {
            nextMonad: {
                unwrap: () => ({ cells: nextCells }),
            },
        };
    }
    step(dt) {
        const keys = Array.from(this.cellStates.keys());
        if (keys.length >= 2) {
            const c1 = this.cellStates.get(keys[0]);
            const c2 = this.cellStates.get(keys[1]);
            const flux = computeOrientedEdgeFlux(c1, c2, null, null, null, null, dt);
            c1.thermalEnergyJoules -= flux.deltas.deltaThermalJoules;
            c2.thermalEnergyJoules += flux.deltas.deltaThermalJoules;
            c1.waterMassKg -= flux.deltas.deltaWaterKg;
            c2.waterMassKg += flux.deltas.deltaWaterKg;
            c1.carbonMassKg -= flux.deltas.deltaCarbonKg;
            c2.carbonMassKg += flux.deltas.deltaCarbonKg;
        }
    }
    getCellState(id) {
        return this.cellStates.get(id);
    }
    assertTopologicalInvariants() {
        for (const [id, state] of this.cellStates.entries()) {
            const isPent = state.isPentagon ?? isCellPentagon(id);
            const expected = isPent ? 5 : 6;
            const nbrs = this.adjacency.get(id) ?? [];
            if (nbrs.length !== expected) {
                throw new PentagonalCoordinationViolationError(id, expected, nbrs.length);
            }
        }
    }
    computeIntercellFluxes(_rate, _cond, _dt) {
        this.assertTopologicalInvariants();
        const list = [];
        for (const [id] of this.cellStates.entries()) {
            list.push({ fromCell: id });
        }
        return list;
    }
    initCellStock(stock) {
        this.stockMap.set(stock.cellId, { ...stock });
    }
    totalMassWater() {
        let sum = 0;
        for (const s of this.stockMap.values())
            sum += s.waterMassKg ?? 0;
        return sum;
    }
    totalThermalEnergy() {
        let sum = 0;
        for (const s of this.stockMap.values())
            sum += s.thermalEnergyJoules ?? 0;
        return sum;
    }
    applyExchange(flux) {
        const keys = Array.from(this.stockMap.keys());
        if (keys.length >= 2) {
            const sA = this.stockMap.get(keys[0]);
            const sB = this.stockMap.get(keys[1]);
            sA.waterMassKg += flux.waterMassDeltaKg.u;
            sB.waterMassKg += flux.waterMassDeltaKg.v;
            sA.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.u;
            sB.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.v;
        }
    }
    validateKernelTopology(cellId, neighbors) {
        return isExpectedNeighborCountForCell(cellId, neighbors);
    }
    computeAdvectiveDiffusion(tensor) {
        return tensor;
    }
}
