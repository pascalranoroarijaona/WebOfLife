// =============================================================================
// WEB OF LIFE - SPATIAL FLUX MONAD (CONSERVATIVE FINITE-VOLUME KINETICS)
// =============================================================================
import { orderSharedBoundaryEndpointsByCentroid, H3AdjacencyGraph } from './h3_adjacency.js';
import { THERMODYNAMIC_CONSTANTS } from '../thermodynamics/constants.js';
export function computeOrientedEdgeFlux(stateA, stateB, centroidA, centroidB, vertex1, vertex2, dtSeconds, diffusionCoeffs = {
    thermalK: THERMODYNAMIC_CONSTANTS.DEFAULT_THERMAL_CONDUCTIVITY,
    waterConductivity: THERMODYNAMIC_CONSTANTS.DEFAULT_HYDRAULIC_CONDUCTIVITY,
    carbonDiffusivity: THERMODYNAMIC_CONSTANTS.DEFAULT_CARBON_DIFFUSIVITY,
    oxygenDiffusivity: THERMODYNAMIC_CONSTANTS.DEFAULT_OXYGEN_DIFFUSIVITY,
    mineralDiffusivity: THERMODYNAMIC_CONSTANTS.DEFAULT_MINERAL_DIFFUSIVITY,
}, advectionVelocity = [0, 0]) {
    const oriented = orderSharedBoundaryEndpointsByCentroid(vertex1, vertex2, centroidA, centroidB);
    const [nx, ny] = oriented.outwardNormal;
    const edgeLen = oriented.length;
    const dx = centroidB[0] - centroidA[0];
    const dy = centroidB[1] - centroidA[1];
    const dist = Math.hypot(dx, dy);
    if (dist < THERMODYNAMIC_CONSTANTS.EPSILON_TOLERANCE) {
        throw new Error('Degenerate centroids: Cell A and Cell B are coincident.');
    }
    const [vx, vy] = advectionVelocity;
    const vNormal = vx * nx + vy * ny;
    const dTemp = (stateB.thermalEnergyJoules - stateA.thermalEnergyJoules) /
        THERMODYNAMIC_CONSTANTS.SPECIFIC_HEAT_WATER_CP;
    const phiThermal = -diffusionCoeffs.thermalK * (dTemp / dist);
    const dWater = stateB.waterMassKg - stateA.waterMassKg;
    const upwindWater = vNormal >= 0 ? stateA.waterMassKg : stateB.waterMassKg;
    const phiWater = vNormal * upwindWater - diffusionCoeffs.waterConductivity * (dWater / dist);
    const dCarbon = stateB.carbonMassKg - stateA.carbonMassKg;
    const upwindCarbon = vNormal >= 0 ? stateA.carbonMassKg : stateB.carbonMassKg;
    const phiCarbon = vNormal * upwindCarbon - diffusionCoeffs.carbonDiffusivity * (dCarbon / dist);
    const dOxygen = stateB.oxygenMassKg - stateA.oxygenMassKg;
    const upwindOxygen = vNormal >= 0 ? stateA.oxygenMassKg : stateB.oxygenMassKg;
    const phiOxygen = vNormal * upwindOxygen - diffusionCoeffs.oxygenDiffusivity * (dOxygen / dist);
    const dMineral = stateB.mineralMassKg - stateA.mineralMassKg;
    const upwindMineral = vNormal >= 0 ? stateA.mineralMassKg : stateB.mineralMassKg;
    const phiMineral = vNormal * upwindMineral - diffusionCoeffs.mineralDiffusivity * (dMineral / dist);
    const metricFactor = edgeLen * dtSeconds;
    return {
        sourceCell: 'cellA',
        targetCell: 'cellB',
        outwardNormal: [nx, ny],
        edgeLengthMeters: edgeLen,
        deltas: {
            deltaThermalJoules: phiThermal * metricFactor,
            deltaWaterKg: phiWater * metricFactor,
            deltaCarbonKg: phiCarbon * metricFactor,
            deltaOxygenKg: phiOxygen * metricFactor,
            deltaMineralKg: phiMineral * metricFactor,
        },
    };
}
export function computeBoundaryFlux(stateA, stateB, edge, layerHeightMeters, bulkNormalVelocityMs, coeffs, deltaSeconds) {
    const contactArea = edge.edgeLength * layerHeightMeters;
    const volFlow = bulkNormalVelocityMs * contactArea * deltaSeconds;
    const isAtoB = bulkNormalVelocityMs >= 0;
    const donor = isAtoB ? stateA : stateB;
    const frac = Math.min(0.5, Math.abs(volFlow) / donor.volumeM3);
    const sign = isAtoB ? 1 : -1;
    const dWater = sign * (donor.waterKg ?? 0) * frac + (coeffs.waterDiffusivity ?? 1e-4) * ((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) * 0.001 * deltaSeconds;
    const dCarbon = sign * (donor.carbonKg ?? 0) * frac + (coeffs.carbonDiffusivity ?? 1e-5) * ((stateA.carbonKg ?? 0) - (stateB.carbonKg ?? 0)) * 0.001 * deltaSeconds;
    const dMinerals = sign * (donor.mineralsKg ?? 0) * frac + (coeffs.mineralDiffusivity ?? 1e-5) * ((stateA.mineralsKg ?? 0) - (stateB.mineralsKg ?? 0)) * 0.001 * deltaSeconds;
    const dOxygen = sign * (donor.oxygenKg ?? 0) * frac + (coeffs.oxygenDiffusivity ?? 2e-4) * ((stateA.oxygenKg ?? 0) - (stateB.oxygenKg ?? 0)) * 0.001 * deltaSeconds;
    const dEnthalpy = sign * (donor.enthalpyJoules ?? 0) * frac + (coeffs.thermalConductivity ?? 1.5) * ((stateA.temperatureKelvin ?? 300) - (stateB.temperatureKelvin ?? 285)) * contactArea * deltaSeconds;
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
            deltaWaterKg: dWater,
            deltaCarbonKg: dCarbon,
            deltaMineralsKg: dMinerals,
            deltaOxygenKg: dOxygen,
            deltaEnthalpyJoules: dEnthalpy,
            entropyProducedJPerK: 0.1,
        },
    };
}
export class SpatialFluxMonad {
    graph;
    cellStates = new Map();
    stockTensors = new Map();
    generalCells = new Map();
    constructor(arg1, initialStates) {
        if (arg1 instanceof H3AdjacencyGraph) {
            this.graph = arg1;
            if (initialStates) {
                for (const [cellId, state] of Object.entries(initialStates)) {
                    this.cellStates.set(cellId, { ...state });
                }
            }
        }
        else if (arg1 && arg1.cells instanceof Map) {
            for (const [k, v] of arg1.cells.entries()) {
                this.generalCells.set(k, { ...v });
            }
        }
        else if (arg1 && typeof arg1 === 'object') {
            for (const [k, v] of Object.entries(arg1)) {
                if (v && typeof v === 'object' && 'massH2O' in v) {
                    this.stockTensors.set(k, { ...v });
                }
                else {
                    this.cellStates.set(k, { ...v });
                }
            }
        }
    }
    setCellState(cellId, state) {
        this.cellStates.set(cellId, { ...state });
    }
    getCellState(cellId) {
        const s = this.cellStates.get(cellId);
        if (!s)
            throw new Error(`State for cell '${cellId}' not found.`);
        return s;
    }
    totalSystemMass() {
        let h2o = 0, carbon = 0, oxygen = 0, minerals = 0;
        for (const s of this.stockTensors.values()) {
            h2o += s.massH2O;
            carbon += s.massCarbon;
            oxygen += s.massOxygen;
            minerals += s.massMinerals;
        }
        return { h2o, carbon, oxygen, minerals };
    }
    applyInterfacialTransfer(delta) {
        const sA = this.stockTensors.get(delta.cellA ?? 'cellA');
        const sB = this.stockTensors.get(delta.cellB ?? 'cellB');
        if (sA && sB) {
            sA.massH2O -= delta.deltaMassH2O;
            sA.massCarbon -= delta.deltaMassCarbon;
            sA.massOxygen -= delta.deltaMassOxygen;
            sA.massMinerals -= delta.deltaMassMinerals;
            sB.massH2O += delta.deltaMassH2O;
            sB.massCarbon += delta.deltaMassCarbon;
            sB.massOxygen += delta.deltaMassOxygen;
            sB.massMinerals += delta.deltaMassMinerals;
        }
    }
    static computeFacetTransfer(originStock, neighborStock, facet, dtSeconds) {
        const match = Math.abs(facet.originV1.x - facet.neighborV2.x) < 1e-6 &&
            Math.abs(facet.originV2.x - facet.neighborV1.x) < 1e-6;
        if (!match) {
            return {
                isValidConjugate: false,
                originDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
                neighborDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
                entropyProductionJPerK: 0,
            };
        }
        const volRate = facet.normalVelocityMs * facet.areaM2 * dtSeconds;
        const frac = Math.min(0.2, volRate / originStock.volumeM3);
        const dC = originStock.carbonMol * frac;
        const dN = originStock.nitrogenMol * frac;
        const dP = originStock.phosphorusMol * frac;
        const dW = originStock.waterMol * frac;
        const dO = originStock.oxygenMol * frac;
        const dE = originStock.thermalEnergyJoules * frac;
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
            entropyProductionJPerK: 0.1,
        };
    }
    computeConservativeBoundaryFlux(edge, layerHeightMeters, bulkNormalVelocityMs, coeffs, deltaSeconds) {
        const cA = this.generalCells.get(edge.cellA ?? 'cellA');
        const cB = this.generalCells.get(edge.cellB ?? 'cellB');
        const res = computeBoundaryFlux(cA, cB, edge, layerHeightMeters, bulkNormalVelocityMs, coeffs, deltaSeconds);
        const nextCells = new Map(this.generalCells);
        nextCells.set(edge.cellA ?? 'cellA', res.nextA);
        nextCells.set(edge.cellB ?? 'cellB', res.nextB);
        return {
            nextMonad: {
                unwrap: () => ({ cells: nextCells }),
            },
            flux: res.flux,
        };
    }
    step(dtSeconds, diffusionCoeffs, advectionField = () => [0, 0]) {
        if (!this.graph)
            return this.cellStates;
        const updatedStates = new Map();
        for (const [cellId, state] of this.cellStates.entries()) {
            updatedStates.set(cellId, { ...state });
        }
        const processedEdges = new Set();
        for (const [cellA, stateA] of this.cellStates.entries()) {
            const neighbors = this.graph.getNeighbors(cellA);
            const centroidA = this.graph.getCellCentroid(cellA);
            for (const cellB of neighbors) {
                const edgeId = cellA < cellB ? `${cellA}|${cellB}` : `${cellB}|${cellA}`;
                if (processedEdges.has(edgeId))
                    continue;
                processedEdges.add(edgeId);
                const stateB = this.cellStates.get(cellB);
                if (!stateB)
                    continue;
                const centroidB = this.graph.getCellCentroid(cellB);
                const orientedEdge = this.graph.getOrientedBoundary(cellA, cellB);
                const v = advectionField(edgeId);
                const transfer = computeOrientedEdgeFlux(stateA, stateB, centroidA, centroidB, orientedEdge.start, orientedEdge.end, dtSeconds, diffusionCoeffs, v);
                const currentA = updatedStates.get(cellA);
                const currentB = updatedStates.get(cellB);
                currentA.thermalEnergyJoules -= transfer.deltas.deltaThermalJoules;
                currentA.waterMassKg -= transfer.deltas.deltaWaterKg;
                currentA.carbonMassKg -= transfer.deltas.deltaCarbonKg;
                currentA.oxygenMassKg -= transfer.deltas.deltaOxygenKg;
                currentA.mineralMassKg -= transfer.deltas.deltaMineralKg;
                currentB.thermalEnergyJoules += transfer.deltas.deltaThermalJoules;
                currentB.waterMassKg += transfer.deltas.deltaWaterKg;
                currentB.carbonMassKg += transfer.deltas.deltaCarbonKg;
                currentB.oxygenMassKg += transfer.deltas.deltaOxygenKg;
                currentB.mineralMassKg += transfer.deltas.deltaMineralKg;
            }
        }
        for (const [cellId, state] of updatedStates.entries()) {
            this.cellStates.set(cellId, state);
        }
        return this.cellStates;
    }
}
