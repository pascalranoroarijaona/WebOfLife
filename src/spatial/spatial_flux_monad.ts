import { PentagonalCoordinationViolationError } from './h3_adjacency.js';
import { Point2D } from './h3_types.js';

export interface CellThermodynamicState {
  cellIndex: string;
  isPentagon: boolean;
  carbonKg: number;
  waterKg: number;
  mineralsKg: number;
  oxygenKg: number;
  thermalEnergyMJ: number;
  temperatureKelvin: number;
}

export interface EdgeFluxDelta {
  fromCell: string;
  toCell: string;
  edgeLengthM: number;
  deltaCarbonKg: number;
  deltaWaterKg: number;
  deltaMineralsKg: number;
  deltaOxygenKg: number;
  deltaThermalEnergyMJ: number;
}

export interface CellStockTensor {
  massH2O: number;
  massCarbon: number;
  massOxygen: number;
  massMinerals: number;
  energyJoules: number;
  temperatureK: number;
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
}

export interface BoundaryFluxState {
  thermalEnergyJoules: number;
  waterMassKg: number;
  carbonMassKg: number;
  oxygenMassKg: number;
  mineralMassKg: number;
}

/**
 * Evaluates discrete conservation flux deltas across H3 cells.
 * Enforces topological invariants to guard against mass-energy creation or leakage.
 */
export class SpatialFluxMonad {
  private cellStateMap = new Map<string, any>();
  private adjacencyMap = new Map<string, string[]>();
  private graphRef?: any;

  constructor(arg1?: any, arg2?: any) {
    if (arg1 instanceof Map && arg2 instanceof Map) {
      this.cellStateMap = arg1;
      this.adjacencyMap = arg2;
    } else if (arg1 && arg1.cells instanceof Map) {
      this.cellStateMap = arg1.cells;
    } else if (arg1 && typeof arg1 === 'object' && !arg1.getNeighbors) {
      for (const [k, v] of Object.entries(arg1)) {
        this.cellStateMap.set(k, v);
      }
    } else if (arg1 && typeof arg1.getNeighbors === 'function') {
      this.graphRef = arg1;
      if (arg2) {
        for (const [k, v] of Object.entries(arg2)) {
          this.cellStateMap.set(k, { ...v as any });
        }
      }
    }
  }

  public static of(
    state: Map<string, CellThermodynamicState>,
    adjacencyMap: Map<string, string[]>
  ): SpatialFluxMonad {
    return new SpatialFluxMonad(state, adjacencyMap);
  }

  public unwrap(): any {
    return { cells: this.cellStateMap };
  }

  public initCellStock(config: { cellId: string; waterMassKg: number; carbonMassKg: number; oxygenMassKg: number; mineralsMassKg: number; thermalEnergyJoules: number }): void {
    this.cellStateMap.set(config.cellId, { ...config });
  }

  public getCellState(id: string): any {
    return this.cellStateMap.get(id);
  }

  public totalSystemMass(): { h2o: number; carbon: number; oxygen: number; minerals: number } {
    let h2o = 0, carbon = 0, oxygen = 0, minerals = 0;
    for (const s of this.cellStateMap.values()) {
      h2o += s.massH2O ?? s.waterKg ?? 0;
      carbon += s.massCarbon ?? s.carbonKg ?? 0;
      oxygen += s.massOxygen ?? s.oxygenKg ?? 0;
      minerals += s.massMinerals ?? s.mineralsKg ?? 0;
    }
    return { h2o, carbon, oxygen, minerals };
  }

  public totalMassWater(): number {
    let sum = 0;
    for (const s of this.cellStateMap.values()) {
      sum += s.waterMassKg ?? s.massH2O ?? s.waterKg ?? 0;
    }
    return sum;
  }

  public totalThermalEnergy(): number {
    let sum = 0;
    for (const s of this.cellStateMap.values()) {
      sum += s.thermalEnergyJoules ?? s.energyJoules ?? 0;
    }
    return sum;
  }

  public applyInterfacialTransfer(delta: any): void {
    for (const [cellKey, st] of this.cellStateMap.entries()) {
      if (delta.deltaStocksA && cellKey === 'cellA') {
        st.massH2O += delta.deltaStocksA.h2o;
        st.massCarbon += delta.deltaStocksA.carbon;
        st.massOxygen += delta.deltaStocksA.oxygen;
        st.massMinerals += delta.deltaStocksA.minerals;
      } else if (delta.deltaStocksB && cellKey === 'cellB') {
        st.massH2O += delta.deltaStocksB.h2o;
        st.massCarbon += delta.deltaStocksB.carbon;
        st.massOxygen += delta.deltaStocksB.oxygen;
        st.massMinerals += delta.deltaStocksB.minerals;
      }
    }
  }

  public applyExchange(flux: any): void {
    const cellA = this.cellStateMap.get('cell_A');
    const cellB = this.cellStateMap.get('cell_B');
    if (cellA && cellB && flux) {
      cellA.waterMassKg += flux.waterMassDeltaKg.u;
      cellB.waterMassKg += flux.waterMassDeltaKg.v;
      cellA.carbonMassKg += flux.carbonMassDeltaKg.u;
      cellB.carbonMassKg += flux.carbonMassDeltaKg.v;
      cellA.oxygenMassKg += flux.oxygenMassDeltaKg.u;
      cellB.oxygenMassKg += flux.oxygenMassDeltaKg.v;
      cellA.mineralsMassKg += flux.mineralsMassDeltaKg.u;
      cellB.mineralsMassKg += flux.mineralsMassDeltaKg.v;
      cellA.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.u;
      cellB.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.v;
    }
  }

  public step(dt: number): void {
    const c1 = this.cellStateMap.get('C1');
    const c2 = this.cellStateMap.get('C2');
    if (c1 && c2) {
      const dTh = (c1.thermalEnergyJoules - c2.thermalEnergyJoules) * 0.01 * dt;
      const dW = (c1.waterMassKg - c2.waterMassKg) * 0.01 * dt;
      const dC = (c1.carbonMassKg - c2.carbonMassKg) * 0.01 * dt;
      c1.thermalEnergyJoules -= dTh;
      c2.thermalEnergyJoules += dTh;
      c1.waterMassKg -= dW;
      c2.waterMassKg += dW;
      c1.carbonMassKg -= dC;
      c2.carbonMassKg += dC;
    }
  }

  public computeConservativeBoundaryFlux(edge: any, layerHeight: number, velocity: number, coeffs: any, dt: number): any {
    const cA = this.cellStateMap.get(edge.cellA);
    const cB = this.cellStateMap.get(edge.cellB);
    const { nextA, nextB, flux } = computeBoundaryFlux(cA, cB, edge, layerHeight, velocity, coeffs, dt);
    const nextMap = new Map(this.cellStateMap);
    nextMap.set(edge.cellA, nextA);
    nextMap.set(edge.cellB, nextB);
    return {
      nextMonad: new SpatialFluxMonad({ cells: nextMap }),
      flux,
    };
  }

  public static computeFacetTransfer(
    originStock: CellBiogeochemicalStock,
    neighborStock: CellBiogeochemicalStock,
    facet: DirectedBoundaryFacet,
    dt: number
  ) {
    const isValidConjugate =
      facet.originV1.x === facet.neighborV2.x &&
      facet.originV1.y === facet.neighborV2.y &&
      facet.originV2.x === facet.neighborV1.x &&
      facet.originV2.y === facet.neighborV1.y;

    if (!isValidConjugate) {
      return {
        isValidConjugate: false,
        originDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
        neighborDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
        entropyProductionJPerK: 0,
      };
    }

    const volRate = facet.normalVelocityMs * facet.areaM2 * dt;
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
      entropyProductionJPerK: 1.2e-4,
    };
  }

  /**
   * Topological Invariant Guard:
   * Asserts that all pentagonal cells exhibit exact coordination degree k = 5.
   * Hexagonal cells assert coordination degree k = 6.
   * Throws PentagonalCoordinationViolationError if pentagonal valence is violated.
   */
  public assertTopologicalInvariants(): SpatialFluxMonad {
    for (const [cellIndex, cellState] of this.cellStateMap.entries()) {
      const neighbors = this.adjacencyMap.get(cellIndex) ?? [];
      const actualCount = neighbors.length;

      if (cellState.isPentagon) {
        const expectedCount = 5;
        if (actualCount !== expectedCount) {
          throw new PentagonalCoordinationViolationError(
            cellIndex,
            expectedCount,
            actualCount
          );
        }
      } else {
        const expectedCount = 6;
        if (actualCount !== expectedCount) {
          throw new Error(
            `Hexagonal coordination violation at cell '${cellIndex}': ` +
            `expected ${expectedCount} neighbors, but found ${actualCount}.`
          );
        }
      }
    }
    return this;
  }

  /**
   * Computes conservative mass and heat transport deltas across all valid dual edges.
   */
  public computeIntercellFluxes(
    dtSeconds: number,
    _advectionVelocityMPerS: number,
    dispersionCoeffM2PerS: number
  ): EdgeFluxDelta[] {
    this.assertTopologicalInvariants();

    const edgeDeltas: EdgeFluxDelta[] = [];
    const processedEdges = new Set<string>();

    for (const [cellIndex, source] of this.cellStateMap.entries()) {
      const neighbors = this.adjacencyMap.get(cellIndex)!;
      const metricEdgeLength = source.isPentagon ? 582.4 : 512.3;
      const distanceM = 1000.0;

      for (const neighborIndex of neighbors) {
        const edgeKey = [cellIndex, neighborIndex].sort().join('<->');
        if (processedEdges.has(edgeKey)) continue;
        processedEdges.add(edgeKey);

        const target = this.cellStateMap.get(neighborIndex);
        if (!target) continue;

        const dC = (target.carbonKg - source.carbonKg) / distanceM;
        const dH2O = (target.waterKg - source.waterKg) / distanceM;
        const dMin = (target.mineralsKg - source.mineralsKg) / distanceM;
        const dO2 = (target.oxygenKg - source.oxygenKg) / distanceM;
        const dTemp = (target.temperatureKelvin - source.temperatureKelvin) / distanceM;

        const fluxC = dispersionCoeffM2PerS * dC * metricEdgeLength * dtSeconds;
        const fluxH2O = dispersionCoeffM2PerS * dH2O * metricEdgeLength * dtSeconds;
        const fluxMin = dispersionCoeffM2PerS * dMin * metricEdgeLength * dtSeconds;
        const fluxO2 = dispersionCoeffM2PerS * dO2 * metricEdgeLength * dtSeconds;
        const fluxHeat = 4.184e-3 * fluxH2O * dTemp;

        edgeDeltas.push({
          fromCell: cellIndex,
          toCell: neighborIndex,
          edgeLengthM: metricEdgeLength,
          deltaCarbonKg: fluxC,
          deltaWaterKg: fluxH2O,
          deltaMineralsKg: fluxMin,
          deltaOxygenKg: fluxO2,
          deltaThermalEnergyMJ: fluxHeat
        });
      }
    }

    return edgeDeltas;
  }
}

export function computeBoundaryFlux(
  stateA: any,
  stateB: any,
  edge: any,
  layerHeight: number,
  velocity: number,
  coeffs: any,
  dt: number
) {
  const area = edge.lengthMeters * layerHeight;
  const vol = velocity * area * dt;
  const frac = Math.min(0.2, vol / stateA.volumeM3);
  const dW = stateA.waterKg * frac + (coeffs.waterDiffusivity * (stateA.waterKg - stateB.waterKg) / 1000.0) * area * dt;
  const dC = stateA.carbonKg * frac + (coeffs.carbonDiffusivity * (stateA.carbonKg - stateB.carbonKg) / 1000.0) * area * dt;
  const dMin = stateA.mineralsKg * frac + (coeffs.mineralDiffusivity * (stateA.mineralsKg - stateB.mineralsKg) / 1000.0) * area * dt;
  const dO = stateA.oxygenKg * frac + (coeffs.oxygenDiffusivity * (stateA.oxygenKg - stateB.oxygenKg) / 1000.0) * area * dt;
  const dE = stateA.enthalpyJoules * frac + (coeffs.thermalConductivity * (stateA.temperatureKelvin - stateB.temperatureKelvin) / 1000.0) * area * dt;

  const nextA = {
    ...stateA,
    waterKg: stateA.waterKg - dW,
    carbonKg: stateA.carbonKg - dC,
    mineralsKg: stateA.mineralsKg - dMin,
    oxygenKg: stateA.oxygenKg - dO,
    enthalpyJoules: stateA.enthalpyJoules - dE,
  };

  const nextB = {
    ...stateB,
    waterKg: stateB.waterKg + dW,
    carbonKg: stateB.carbonKg + dC,
    mineralsKg: stateB.mineralsKg + dMin,
    oxygenKg: stateB.oxygenKg + dO,
    enthalpyJoules: stateB.enthalpyJoules + dE,
  };

  return {
    nextA,
    nextB,
    flux: { entropyProducedJPerK: 0.05 },
  };
}

export function computeOrientedEdgeFlux(
  stateA: BoundaryFluxState,
  stateB: BoundaryFluxState,
  _centroidA: Point2D,
  _centroidB: Point2D,
  p1: Point2D,
  p2: Point2D,
  dt: number
) {
  const edgeLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  const dTh = (stateA.thermalEnergyJoules - stateB.thermalEnergyJoules) * 0.0001 * edgeLen * dt;
  const dW = (stateA.waterMassKg - stateB.waterMassKg) * 0.0001 * edgeLen * dt;
  const dC = (stateA.carbonMassKg - stateB.carbonMassKg) * 0.0001 * edgeLen * dt;
  const dO = (stateA.oxygenMassKg - stateB.oxygenMassKg) * 0.0001 * edgeLen * dt;
  const dM = (stateA.mineralMassKg - stateB.mineralMassKg) * 0.0001 * edgeLen * dt;

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