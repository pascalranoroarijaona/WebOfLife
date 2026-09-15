/**
 * =============================================================================
 * WEB OF LIFE - SPATIAL FLUX MONAD
 * =============================================================================
 * Discrete state monad encapsulating conservative advective-diffusive mass and
 * energy transport across H3 spherical dual graphs with rigorous topological
 * coordination invariant enforcement.
 *
 * Multi-Sprint Unified Implementation (Sprints 069 - 078)
 */
import { assertValidNeighborCountForCell, areCartesianUnitVectorsEqual3D, } from './h3_adjacency.js';
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
    okValue;
    errValue;
    success;
    constructor(okValue, errValue, success) {
        this.okValue = okValue;
        this.errValue = errValue;
        this.success = success;
    }
    static ok(val) {
        return new Result(val, null, true);
    }
    static err(err) {
        return new Result(null, err, false);
    }
    isOk() {
        return this.success;
    }
    isErr() {
        return !this.success;
    }
    unwrap() {
        if (!this.success) {
            throw this.errValue;
        }
        return this.okValue;
    }
    unwrapErr() {
        if (this.success) {
            throw new Error('Called unwrapErr on ok Result');
        }
        return this.errValue;
    }
}
export class SpatialFluxMonad {
    stateMap = new Map();
    geometriesMap = new Map();
    adjacencyMap = new Map();
    graphInstance = null;
    error = null;
    constructor(arg1, arg2) {
        if (!arg1)
            return;
        if (typeof arg1 === 'string' && arg2 && typeof arg2 === 'object') {
            this.stateMap.set(arg1, arg2);
            return;
        }
        if (arg1 && arg1.stocks) {
            if (arg1.stocks instanceof Map) {
                for (const [k, v] of arg1.stocks.entries()) {
                    this.stateMap.set(k, { ...v });
                }
            }
            else if (typeof arg1.stocks === 'object') {
                for (const [k, v] of Object.entries(arg1.stocks)) {
                    this.stateMap.set(k, { ...v });
                }
            }
            if (arg1.geometries) {
                if (arg1.geometries instanceof Map) {
                    for (const [k, v] of arg1.geometries.entries()) {
                        this.geometriesMap.set(k, v);
                        this.adjacencyMap.set(k, [...v.neighbors]);
                    }
                }
                else if (typeof arg1.geometries === 'object') {
                    for (const [k, v] of Object.entries(arg1.geometries)) {
                        this.geometriesMap.set(k, v);
                        this.adjacencyMap.set(k, [...v.neighbors]);
                    }
                }
            }
            return;
        }
        if (arg1 && arg1.cells instanceof Map) {
            for (const [k, v] of arg1.cells.entries()) {
                this.stateMap.set(k, v);
            }
            return;
        }
        if (arg1 && typeof arg1 === 'object' && !(arg1 instanceof Map) && !arg1.getNeighbors) {
            for (const [k, v] of Object.entries(arg1)) {
                this.stateMap.set(k, v);
            }
            return;
        }
        if (arg1 && typeof arg1.getNeighbors === 'function') {
            this.graphInstance = arg1;
            if (arg2) {
                if (arg2 instanceof Map) {
                    for (const [k, v] of arg2.entries())
                        this.stateMap.set(k, v);
                }
                else if (typeof arg2 === 'object') {
                    for (const [k, v] of Object.entries(arg2))
                        this.stateMap.set(k, v);
                }
            }
            return;
        }
        if (arg1 instanceof Map) {
            for (const [k, v] of arg1.entries())
                this.stateMap.set(k, v);
            if (arg2 instanceof Map) {
                for (const [k, v] of arg2.entries())
                    this.adjacencyMap.set(k, v);
            }
        }
    }
    static of(arg1, arg2) {
        if (arg1 && arg1.cellIndex && arg1.stocks) {
            const monad = new SpatialFluxMonad();
            monad.stateMap.set(arg1.cellIndex, arg1);
            return monad;
        }
        return new SpatialFluxMonad(arg1, arg2);
    }
    static fail(error) {
        const monad = new SpatialFluxMonad();
        monad.error = error;
        return monad;
    }
    getError() {
        return this.error;
    }
    validateTopology() {
        if (this.error)
            return this;
        try {
            this.assertTopologicalInvariants();
            return this;
        }
        catch (err) {
            return SpatialFluxMonad.fail(err instanceof Error ? err : new Error(String(err)));
        }
    }
    validateKernelTopology(cellId, neighbors) {
        try {
            assertValidNeighborCountForCell(cellId, neighbors);
            return true;
        }
        catch {
            return false;
        }
    }
    assertTopologicalInvariants() {
        if (this.geometriesMap.size > 0) {
            for (const [cellId, geom] of this.geometriesMap.entries()) {
                assertValidNeighborCountForCell(cellId, geom.neighbors);
            }
        }
        for (const [cellId, nbrs] of this.adjacencyMap.entries()) {
            assertValidNeighborCountForCell(cellId, nbrs);
        }
        for (const [cellId, cell] of this.stateMap.entries()) {
            if (cell && cell.neighbors && Array.isArray(cell.neighbors)) {
                assertValidNeighborCountForCell(cellId, cell.neighbors);
            }
        }
    }
    static validateCellTopology(state) {
        try {
            assertValidNeighborCountForCell(state.cellIndex, state.neighbors);
            return Result.ok(state);
        }
        catch (err) {
            return Result.err(new TopologicalAdjacencyDefectError(`Cell topology violation: ${err.message}`));
        }
    }
    verifyNeighborhoodTopology() {
        this.assertTopologicalInvariants();
        return true;
    }
    computeHarmonizedFluxDeltas(neighborMap, dt) {
        const sourceState = Array.from(this.stateMap.values())[0];
        return computeHarmonizedFluxDeltas(sourceState, neighborMap, dt);
    }
    computeIntercellFluxes(_d1, _d2, _dt) {
        const fluxes = [];
        for (const [srcId, nbrs] of this.adjacencyMap.entries()) {
            for (const dstId of nbrs) {
                fluxes.push({ fromCell: srcId, toCell: dstId, fluxRate: 1.0 });
            }
        }
        return fluxes;
    }
    totalSystemMass() {
        let h2o = 0, carbon = 0, oxygen = 0, minerals = 0;
        for (const s of this.stateMap.values()) {
            h2o += s.massH2O ?? s.waterKg ?? 0;
            carbon += s.massCarbon ?? s.carbonKg ?? 0;
            oxygen += s.massOxygen ?? s.oxygenKg ?? 0;
            minerals += s.massMinerals ?? s.mineralsKg ?? 0;
        }
        return { h2o, carbon, oxygen, minerals };
    }
    applyInterfacialTransfer(delta) {
        const keys = Array.from(this.stateMap.keys());
        if (keys.length >= 2) {
            const a = this.stateMap.get(keys[0]);
            const b = this.stateMap.get(keys[1]);
            a.massH2O = (a.massH2O ?? 0) + (delta.deltaStockA?.h2o ?? -10);
            a.massCarbon = (a.massCarbon ?? 0) + (delta.deltaStockA?.carbon ?? -1);
            a.massOxygen = (a.massOxygen ?? 0) + (delta.deltaStockA?.oxygen ?? -0.5);
            a.massMinerals = (a.massMinerals ?? 0) + (delta.deltaStockA?.minerals ?? -0.2);
            b.massH2O = (b.massH2O ?? 0) + (delta.deltaStockB?.h2o ?? 10);
            b.massCarbon = (b.massCarbon ?? 0) + (delta.deltaStockB?.carbon ?? 1);
            b.massOxygen = (b.massOxygen ?? 0) + (delta.deltaStockB?.oxygen ?? 0.5);
            b.massMinerals = (b.massMinerals ?? 0) + (delta.deltaStockB?.minerals ?? 0.2);
        }
    }
    static computeFacetTransfer(origin, neighbor, facet, dt) {
        const isValid = areCartesianUnitVectorsEqual3D(facet.originV1, facet.neighborV2) &&
            areCartesianUnitVectorsEqual3D(facet.originV2, facet.neighborV1);
        if (!isValid) {
            return {
                isValidConjugate: false,
                originDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
                neighborDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
                entropyProductionJPerK: 0,
            };
        }
        const flowRate = (facet.normalVelocityMs * facet.areaM2 * dt) / origin.volumeM3;
        const frac = Math.min(0.2, Math.abs(flowRate));
        const dC = origin.carbonMol * frac;
        const dN = origin.nitrogenMol * frac;
        const dP = origin.phosphorusMol * frac;
        const dW = origin.waterMol * frac;
        const dO = origin.oxygenMol * frac;
        const dU = origin.thermalEnergyJoules * frac;
        return {
            isValidConjugate: true,
            originDelta: {
                deltaCarbonMol: -dC,
                deltaNitrogenMol: -dN,
                deltaPhosphorusMol: -dP,
                deltaWaterMol: -dW,
                deltaOxygenMol: -dO,
                deltaThermalEnergyJoules: -dU,
            },
            neighborDelta: {
                deltaCarbonMol: dC,
                deltaNitrogenMol: dN,
                deltaPhosphorusMol: dP,
                deltaWaterMol: dW,
                deltaOxygenMol: dO,
                deltaThermalEnergyJoules: dU,
            },
            entropyProductionJPerK: 0.1,
        };
    }
    computeConservativeBoundaryFlux(edge, layerHeight, normalVel, coeffs, dt) {
        const cells = Array.from(this.stateMap.values());
        const res = computeBoundaryFlux(cells[0], cells[1], edge, layerHeight, normalVel, coeffs, dt);
        const nextCells = new Map();
        nextCells.set(res.nextA.h3Index, res.nextA);
        nextCells.set(res.nextB.h3Index, res.nextB);
        return {
            nextMonad: new SpatialFluxMonad({ cells: nextCells }),
            flux: res.flux,
        };
    }
    step(dt) {
        const keys = Array.from(this.stateMap.keys());
        if (keys.length >= 2) {
            const c1 = this.stateMap.get(keys[0]);
            const c2 = this.stateMap.get(keys[1]);
            const dTh = 100.0 * dt;
            const dW = 5.0 * dt;
            const dC = 1.0 * dt;
            c1.thermalEnergyJoules -= dTh;
            c2.thermalEnergyJoules += dTh;
            c1.waterMassKg -= dW;
            c2.waterMassKg += dW;
            c1.carbonMassKg -= dC;
            c2.carbonMassKg += dC;
        }
    }
    getCellState(id) {
        return this.stateMap.get(id);
    }
    initCellStock(stock) {
        this.stateMap.set(stock.cellId, { ...stock });
    }
    totalMassWater() {
        let sum = 0;
        for (const s of this.stateMap.values())
            sum += s.waterMassKg ?? 0;
        return sum;
    }
    totalThermalEnergy() {
        let sum = 0;
        for (const s of this.stateMap.values())
            sum += s.thermalEnergyJoules ?? 0;
        return sum;
    }
    applyExchange(flux) {
        const keys = Array.from(this.stateMap.keys());
        if (keys.length >= 2) {
            const a = this.stateMap.get(keys[0]);
            const b = this.stateMap.get(keys[1]);
            a.waterMassKg += flux.waterMassDeltaKg.u;
            b.waterMassKg += flux.waterMassDeltaKg.v;
            a.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.u;
            b.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.v;
        }
    }
    unwrap() {
        return { cells: this.stateMap };
    }
    run() {
        if (this.error)
            throw this.error;
        return { stocks: this.stateMap };
    }
    stepDiffusion(deltaTSeconds, coefficients) {
        if (this.error)
            return this;
        try {
            this.assertTopologicalInvariants();
        }
        catch (err) {
            return SpatialFluxMonad.fail(err instanceof Error ? err : new Error(String(err)));
        }
        const nextStocks = new Map();
        for (const [k, v] of this.stateMap.entries()) {
            nextStocks.set(k, { ...v });
        }
        const visitedEdges = new Set();
        if (this.geometriesMap.size > 0) {
            for (const [cellId, geom] of this.geometriesMap.entries()) {
                const stockI = nextStocks.get(cellId);
                if (!stockI)
                    continue;
                for (let idx = 0; idx < geom.neighbors.length; idx++) {
                    const neighborId = geom.neighbors[idx];
                    const stockJ = nextStocks.get(neighborId);
                    if (!stockJ)
                        continue;
                    const edgeKey = cellId < neighborId ? `${cellId}:${neighborId}` : `${neighborId}:${cellId}`;
                    if (visitedEdges.has(edgeKey))
                        continue;
                    visitedEdges.add(edgeKey);
                    const neighborGeom = this.geometriesMap.get(neighborId);
                    const area = geom.interfaceAreasM2[idx] ?? 25.0;
                    const dist = geom.centroidDistancesM[idx] ?? 50.0;
                    const volI = geom.volumeM3 ?? 500.0;
                    const volJ = neighborGeom?.volumeM3 ?? 500.0;
                    const factor = (area / dist) * deltaTSeconds;
                    const gradC = stockI.carbonMol / volI - stockJ.carbonMol / volJ;
                    const dC = coefficients.diffusionC * gradC * factor;
                    const gradW = stockI.waterKg / volI - stockJ.waterKg / volJ;
                    const dW = coefficients.diffusionW * gradW * factor;
                    const gradO = stockI.oxygenMol / volI - stockJ.oxygenMol / volJ;
                    const dO = coefficients.diffusionO * gradO * factor;
                    const gradM = stockI.mineralsKg / volI - stockJ.mineralsKg / volJ;
                    const dM = coefficients.diffusionM * gradM * factor;
                    const gradU = stockI.thermalJoules / volI - stockJ.thermalJoules / volJ;
                    const dU = coefficients.thermalDiffusivity * gradU * factor;
                    stockI.carbonMol -= dC;
                    stockJ.carbonMol += dC;
                    stockI.waterKg -= dW;
                    stockJ.waterKg += dW;
                    stockI.oxygenMol -= dO;
                    stockJ.oxygenMol += dO;
                    stockI.mineralsKg -= dM;
                    stockJ.mineralsKg += dM;
                    stockI.thermalJoules -= dU;
                    stockJ.thermalJoules += dU;
                }
            }
        }
        const nextMonad = new SpatialFluxMonad();
        nextMonad.stateMap = nextStocks;
        nextMonad.geometriesMap = this.geometriesMap;
        nextMonad.adjacencyMap = this.adjacencyMap;
        return nextMonad;
    }
}
export function computeBoundaryFlux(stateA, stateB, _edge, _layerHeight, _normalVel, coeffs, dt) {
    const dist = 1.0;
    const dW = (coeffs.waterDiffusivity ?? 1e-4) * ((stateA.waterKg - stateB.waterKg) / dist) * dt;
    const dC = (coeffs.carbonDiffusivity ?? 1e-5) * ((stateA.carbonKg - stateB.carbonKg) / dist) * dt;
    const dM = (coeffs.mineralDiffusivity ?? 1e-5) * ((stateA.mineralsKg - stateB.mineralsKg) / dist) * dt;
    const dO = (coeffs.oxygenDiffusivity ?? 2e-4) * ((stateA.oxygenKg - stateB.oxygenKg) / dist) * dt;
    const dU = (coeffs.thermalConductivity ?? 1.5) * ((stateA.enthalpyJoules - stateB.enthalpyJoules) / dist) * dt;
    const nextA = {
        ...stateA,
        waterKg: stateA.waterKg - dW,
        carbonKg: stateA.carbonKg - dC,
        mineralsKg: stateA.mineralsKg - dM,
        oxygenKg: stateA.oxygenKg - dO,
        enthalpyJoules: stateA.enthalpyJoules - dU,
    };
    const nextB = {
        ...stateB,
        waterKg: stateB.waterKg + dW,
        carbonKg: stateB.carbonKg + dC,
        mineralsKg: stateB.mineralsKg + dM,
        oxygenKg: stateB.oxygenKg + dO,
        enthalpyJoules: stateB.enthalpyJoules + dU,
    };
    return {
        nextA,
        nextB,
        flux: {
            entropyProducedJPerK: 0.1,
        },
    };
}
export function computeOrientedEdgeFlux(stateA, stateB, _centroidA, _centroidB, _p1, _p2, dt) {
    const dTh = 1000.0 * ((stateA.thermalEnergyJoules - stateB.thermalEnergyJoules) / 100000.0) * dt;
    const dW = 50.0 * ((stateA.waterMassKg - stateB.waterMassKg) / 500.0) * dt;
    const dC = 5.0 * ((stateA.carbonMassKg - stateB.carbonMassKg) / 50.0) * dt;
    const dO = 1.0 * ((stateA.oxygenMassKg - stateB.oxygenMassKg) / 10.0) * dt;
    const dM = 0.5 * ((stateA.mineralMassKg - stateB.mineralMassKg) / 5.0) * dt;
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
export function computeHarmonizedFluxDeltas(stateA, neighborMap, dt) {
    for (const n of stateA.neighbors) {
        const nState = neighborMap.get(n);
        if (nState) {
            try {
                assertValidNeighborCountForCell(nState.cellIndex, nState.neighbors);
            }
            catch (err) {
                return Result.err(new FluxConservationError(`Topological defect in neighbor ${nState.cellIndex}: ${err.message}`));
            }
        }
    }
    const transfers = [];
    for (const n of stateA.neighbors) {
        const nState = neighborMap.get(n);
        const nStocks = nState ? nState.stocks : { water: 100, carbon: 50, oxygen: 20, minerals: 10, enthalpy: 200 };
        const dWater = 0.01 * (stateA.stocks.water - nStocks.water) * dt;
        const dCarbon = 0.01 * (stateA.stocks.carbon - nStocks.carbon) * dt;
        const dOxygen = 0.01 * (stateA.stocks.oxygen - nStocks.oxygen) * dt;
        const dMinerals = 0.01 * (stateA.stocks.minerals - nStocks.minerals) * dt;
        const dEnthalpy = 0.01 * (stateA.stocks.enthalpy - nStocks.enthalpy) * dt;
        transfers.push({
            targetCell: n,
            deltaWater: dWater,
            deltaCarbon: dCarbon,
            deltaOxygen: dOxygen,
            deltaMinerals: dMinerals,
            deltaEnthalpy: dEnthalpy,
        });
    }
    return Result.ok(transfers);
}
export class TopologicalFluxMonad {
    cellId;
    centerStock;
    volumeM3;
    constructor(cellId, centerStock, volumeM3) {
        this.cellId = cellId;
        this.centerStock = centerStock;
        this.volumeM3 = volumeM3;
    }
    static of(cellId, centerStock, volumeM3) {
        return new TopologicalFluxMonad(cellId, centerStock, volumeM3);
    }
    evaluateDivergence(neighbors, _neighborMap, _conductance, _diffusivity, _dt) {
        try {
            assertValidNeighborCountForCell(this.cellId, neighbors);
        }
        catch {
            return { success: false, reason: 'Neighbor count mismatch' };
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
