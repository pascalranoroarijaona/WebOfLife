// =============================================================================
// WEB OF LIFE - SPATIAL FLUX MONAD & THERMODYNAMIC CONSERVATOR
// Retro-Compatible Multi-Sprint Implementation (RFC-069, RFC-070, RFC-071)
// =============================================================================

import {
  Vector3D,
  BoundaryEdge3D,
  CellThermodynamicState,
  BoundaryFluxDelta,
  DiffusionCoefficients,
  H3StateTensor,
} from './h3_types.js';
import { H3AdjacencyService, areCartesianUnitVectorsEqual3D } from './h3_adjacency.js';

export class Monad<T> {
  constructor(protected readonly value: T) {}

  unwrap(): T {
    return this.value;
  }

  map<U>(fn: (val: T) => U): Monad<U> {
    return new Monad<U>(fn(this.value));
  }

  flatMap<U>(fn: (val: T) => Monad<U>): Monad<U> {
    return fn(this.value);
  }
}

export interface CellStockTensor {
  massH2O: number;
  massCarbon: number;
  massOxygen: number;
  massMinerals: number;
  energyJoules: number;
  temperatureK: number;
  [key: string]: any;
}

export interface CellBiogeochemicalStock {
  cellIndex: string;
  carbonMol: number;
  nitrogenMol: number;
  phosphorusMol: number;
  waterMol: number;
  oxygenMol: number;
  thermalEnergyJoules: number;
  volumeM3: number;
  centroid: { x: number; y: number; z: number };
  [key: string]: any;
}

export interface DirectedBoundaryFacet {
  originCell: string;
  neighborCell: string;
  originV1: { x: number; y: number; z: number };
  originV2: { x: number; y: number; z: number };
  neighborV1: { x: number; y: number; z: number };
  neighborV2: { x: number; y: number; z: number };
  areaM2: number;
  normalVelocityMs: number;
  distanceM: number;
  [key: string]: any;
}

/**
 * Computes physically conservative mass, species, and enthalpy transfer
 * between two adjacent cell states across a coincident boundary edge interface (Sprint 071).
 */
export function computeBoundaryFlux(
  stateA: CellThermodynamicState,
  stateB: CellThermodynamicState,
  edge: BoundaryEdge3D,
  layerHeightMeters: number,
  bulkNormalVelocityMs: number,
  diffusionCoeffs: DiffusionCoefficients,
  deltaSeconds: number
): { nextA: CellThermodynamicState; nextB: CellThermodynamicState; flux: BoundaryFluxDelta } {
  const area = edge.edgeLength * layerHeightMeters;

  const dx = (stateB.centroid?.x ?? 0) - (stateA.centroid?.x ?? 0);
  const dy = (stateB.centroid?.y ?? 0) - (stateA.centroid?.y ?? 0);
  const dz = (stateB.centroid?.z ?? 0) - (stateA.centroid?.z ?? 0);
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1.0;

  const volA = stateA.volumeM3 ?? 1.0;
  const volB = stateB.volumeM3 ?? 1.0;

  const cWaterA = (stateA.waterKg ?? 0) / volA;
  const cWaterB = (stateB.waterKg ?? 0) / volB;
  const cCarbonA = (stateA.carbonKg ?? 0) / volA;
  const cCarbonB = (stateB.carbonKg ?? 0) / volB;
  const cMinA = (stateA.mineralsKg ?? 0) / volA;
  const cMinB = (stateB.mineralsKg ?? 0) / volB;
  const cOxA = (stateA.oxygenKg ?? 0) / volA;
  const cOxB = (stateB.oxygenKg ?? 0) / volB;

  const un = bulkNormalVelocityMs;
  const upwindWater = un >= 0 ? cWaterA : cWaterB;
  const upwindCarbon = un >= 0 ? cCarbonA : cCarbonB;
  const upwindMin = un >= 0 ? cMinA : cMinB;
  const upwindOx = un >= 0 ? cOxA : cOxB;

  const diffW = diffusionCoeffs.waterDiffusivity ?? diffusionCoeffs.water ?? 1e-5;
  const diffC = diffusionCoeffs.carbonDiffusivity ?? diffusionCoeffs.carbon ?? 1e-6;
  const diffM = diffusionCoeffs.mineralDiffusivity ?? diffusionCoeffs.minerals ?? 1e-6;
  const diffO = diffusionCoeffs.oxygenDiffusivity ?? diffusionCoeffs.oxygen ?? 2e-5;
  const thCond = diffusionCoeffs.thermalConductivity ?? 0.6;

  const fluxRateWater = area * (un * upwindWater - (diffW * (cWaterB - cWaterA)) / dist);
  const fluxRateCarbon = area * (un * upwindCarbon - (diffC * (cCarbonB - cCarbonA)) / dist);
  const fluxRateMin = area * (un * upwindMin - (diffM * (cMinB - cMinA)) / dist);
  const fluxRateOx = area * (un * upwindOx - (diffO * (cOxB - cOxA)) / dist);

  const volHeatCapA = (stateA.enthalpyJoules ?? 0) / volA;
  const volHeatCapB = (stateB.enthalpyJoules ?? 0) / volB;
  const upwindHeatCap = un >= 0 ? volHeatCapA : volHeatCapB;
  const conductiveHeatFlux =
    -thCond * area * ((stateB.temperatureKelvin ?? 290) - (stateA.temperatureKelvin ?? 290)) / dist;
  const fluxRateEnthalpy = area * un * upwindHeatCap + conductiveHeatFlux;

  const tA = stateA.temperatureKelvin ?? 290;
  const tB = stateB.temperatureKelvin ?? 290;
  const entropyRateThermal = Math.abs(conductiveHeatFlux * (1.0 / Math.max(0.1, tB) - 1.0 / Math.max(0.1, tA)));
  const entropyProduced = Math.max(0, entropyRateThermal * deltaSeconds);

  const dWater = fluxRateWater * deltaSeconds;
  const dCarbon = fluxRateCarbon * deltaSeconds;
  const dMin = fluxRateMin * deltaSeconds;
  const dOx = fluxRateOx * deltaSeconds;
  const dEnthalpy = fluxRateEnthalpy * deltaSeconds;

  const nextA: CellThermodynamicState = {
    ...stateA,
    waterKg: (stateA.waterKg ?? 0) - dWater,
    carbonKg: (stateA.carbonKg ?? 0) - dCarbon,
    mineralsKg: (stateA.mineralsKg ?? 0) - dMin,
    oxygenKg: (stateA.oxygenKg ?? 0) - dOx,
    enthalpyJoules: (stateA.enthalpyJoules ?? 0) - dEnthalpy,
    temperatureKelvin: Math.max(0.1, (stateA.temperatureKelvin ?? 290) - dEnthalpy / (volA * 4.184e6)),
  };

  const nextB: CellThermodynamicState = {
    ...stateB,
    waterKg: (stateB.waterKg ?? 0) + dWater,
    carbonKg: (stateB.carbonKg ?? 0) + dCarbon,
    mineralsKg: (stateB.mineralsKg ?? 0) + dMin,
    oxygenKg: (stateB.oxygenKg ?? 0) + dOx,
    enthalpyJoules: (stateB.enthalpyJoules ?? 0) + dEnthalpy,
    temperatureKelvin: Math.max(0.1, (stateB.temperatureKelvin ?? 290) + dEnthalpy / (volB * 4.184e6)),
  };

  const flux: BoundaryFluxDelta = {
    edge,
    deltaWaterKg: dWater,
    deltaCarbonKg: dCarbon,
    deltaMineralsKg: dMin,
    deltaOxygenKg: dOx,
    deltaEnthalpyJoules: dEnthalpy,
    entropyProducedJPerK: entropyProduced,
  };

  return { nextA, nextB, flux };
}

export class SpatialFluxMonad extends Monad<any> {
  private readonly adjacencyService: H3AdjacencyService;
  private stockMap: Record<string, CellStockTensor> = {};

  constructor(state: any, adjacencyService?: H3AdjacencyService) {
    super(state);
    this.adjacencyService = adjacencyService ?? new H3AdjacencyService();
    if (state && !state.cells) {
      this.stockMap = { ...state };
    }
  }

  getAdjacencyService(): H3AdjacencyService {
    return this.adjacencyService;
  }

  // Retro-compatibility Sprint 069: totalSystemMass & applyInterfacialTransfer
  totalSystemMass(): { h2o: number; carbon: number; oxygen: number; minerals: number } {
    let h2o = 0, carbon = 0, oxygen = 0, minerals = 0;
    for (const cell of Object.values(this.stockMap)) {
      h2o += cell.massH2O;
      carbon += cell.massCarbon;
      oxygen += cell.massOxygen;
      minerals += cell.massMinerals;
    }
    return { h2o, carbon, oxygen, minerals };
  }

  applyInterfacialTransfer(transferReport: any): void {
    const { cellA, cellB, delta } = transferReport;
    const a = this.stockMap[cellA];
    const b = this.stockMap[cellB];
    if (a && b) {
      a.massH2O -= delta.h2o;
      b.massH2O += delta.h2o;
      a.massCarbon -= delta.carbon;
      b.massCarbon += delta.carbon;
      a.massOxygen -= delta.oxygen;
      b.massOxygen += delta.oxygen;
      a.massMinerals -= delta.minerals;
      b.massMinerals += delta.minerals;
      a.energyJoules -= delta.energy;
      b.energyJoules += delta.energy;
    }
  }

  // Retro-compatibility Sprint 070: static computeFacetTransfer
  static computeFacetTransfer(
    originStock: CellBiogeochemicalStock,
    neighborStock: CellBiogeochemicalStock,
    facet: DirectedBoundaryFacet,
    dtSeconds: number
  ) {
    const v1Equal = areCartesianUnitVectorsEqual3D(facet.originV1, facet.neighborV2);
    const v2Equal = areCartesianUnitVectorsEqual3D(facet.originV2, facet.neighborV1);
    const isValidConjugate = v1Equal && v2Equal;

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

    const un = facet.normalVelocityMs;
    const area = facet.areaM2;
    const volFlow = un * area * dtSeconds;
    const frac = Math.min(0.1, Math.abs(volFlow) / originStock.volumeM3);
    const sgn = un >= 0 ? 1 : -1;

    const dC = sgn * originStock.carbonMol * frac;
    const dN = sgn * originStock.nitrogenMol * frac;
    const dP = sgn * originStock.phosphorusMol * frac;
    const dW = sgn * originStock.waterMol * frac;
    const dO = sgn * originStock.oxygenMol * frac;

    const tO = originStock.thermalEnergyJoules / (originStock.waterMol * 75.3);
    const tN = neighborStock.thermalEnergyJoules / (neighborStock.waterMol * 75.3);
    const qCond = 25.0 * ((tO - tN) / facet.distanceM) * area * dtSeconds;
    const dE = sgn * originStock.thermalEnergyJoules * frac + qCond;

    const sGen = Math.max(0.001, Math.abs(qCond * (1 / Math.max(0.1, tN) - 1 / Math.max(0.1, tO))));

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
      entropyProductionJPerK: sGen,
    };
  }

  // Sprint 071: computeConservativeBoundaryFlux
  computeConservativeBoundaryFlux(
    edge: BoundaryEdge3D,
    layerHeightMeters: number = 10.0,
    bulkNormalVelocityMs: number = 0.0,
    diffusionCoeffs: DiffusionCoefficients = {
      waterDiffusivity: 1e-5,
      carbonDiffusivity: 1e-6,
      mineralDiffusivity: 1e-6,
      oxygenDiffusivity: 2e-5,
      thermalConductivity: 0.6,
    },
    deltaSeconds: number = 1.0
  ): { nextMonad: SpatialFluxMonad; flux: BoundaryFluxDelta } {
    const currentCells = this.value.cells;
    const stateA = currentCells.get(edge.cellA);
    const stateB = currentCells.get(edge.cellB);

    if (!stateA || !stateB) {
      throw new Error(`Cells ${edge.cellA} and/or ${edge.cellB} not found in state tensor`);
    }

    const { nextA, nextB, flux } = computeBoundaryFlux(
      stateA,
      stateB,
      edge,
      layerHeightMeters,
      bulkNormalVelocityMs,
      diffusionCoeffs,
      deltaSeconds
    );

    const updatedCells = new Map<string, CellThermodynamicState>(currentCells);
    updatedCells.set(nextA.h3Index ?? edge.cellA, nextA);
    updatedCells.set(nextB.h3Index ?? edge.cellB, nextB);

    const nextStateTensor: H3StateTensor = { cells: updatedCells };
    return {
      nextMonad: new SpatialFluxMonad(nextStateTensor, this.adjacencyService),
      flux,
    };
  }
}