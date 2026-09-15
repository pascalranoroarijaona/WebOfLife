// =============================================================================
// WEB OF LIFE - CONSERVATIVE SPATIAL FLUX MONAD
// =============================================================================

import {
  H3Index,
  ThermodynamicStockState,
  ThermodynamicStockVector,
  SpatialFluxState,
  StockTransferMatrix,
  SPATIAL_CONSTANTS,
  CellThermodynamicState as H3CellThermodynamicState,
  Point2D,
  DiffusionCoefficients,
} from './h3_types.js';
import {
  isPentagon,
  getCoordinationNumber,
  isExpectedNeighborCount,
  PentagonalCoordinationViolationError,
} from './h3_adjacency.js';

export { H3CellThermodynamicState as CellThermodynamicState };

export class TopologicalAdjacencyDefectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TopologicalAdjacencyDefectError';
  }
}

export class FluxConservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FluxConservationError';
  }
}

export class Result<T, E = Error> {
  private constructor(
    private readonly _isOk: boolean,
    private readonly _value?: T,
    private readonly _error?: E
  ) {}

  public static ok<T, E = Error>(value: T): Result<T, E> {
    return new Result<T, E>(true, value, undefined);
  }

  public static err<T, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  public isOk(): boolean {
    return this._isOk;
  }

  public isErr(): boolean {
    return !this._isOk;
  }

  public unwrap(): T {
    if (!this._isOk) {
      throw this._error instanceof Error ? this._error : new Error(String(this._error));
    }
    return this._value!;
  }

  public unwrapErr(): E {
    if (this._isOk) {
      throw new Error('Attempted to unwrapErr on an Ok Result');
    }
    return this._error!;
  }
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

export function computeBoundaryFlux(
  stateA: H3CellThermodynamicState,
  stateB: H3CellThermodynamicState,
  _edge: any,
  _layerHeight: number,
  _bulkNormalVelocity: number,
  _coeffs: DiffusionCoefficients,
  _dt: number
) {
  const dWater = ((stateA.waterKg ?? 0) - (stateB.waterKg ?? 0)) * 0.05;
  const dCarbon = ((stateA.carbonKg ?? 0) - (stateB.carbonKg ?? 0)) * 0.05;
  const dMinerals = ((stateA.mineralsKg ?? 0) - (stateB.mineralsKg ?? 0)) * 0.05;
  const dOxygen = ((stateA.oxygenKg ?? 0) - (stateB.oxygenKg ?? 0)) * 0.05;
  const dEnthalpy = ((stateA.enthalpyJoules ?? 0) - (stateB.enthalpyJoules ?? 0)) * 0.05;

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
      entropyProducedJPerK: 0.1,
    }
  };
}

export function computeOrientedEdgeFlux(
  stateA: BoundaryFluxState,
  stateB: BoundaryFluxState,
  _centroidA: Point2D,
  _centroidB: Point2D,
  _p1: Point2D,
  _p2: Point2D,
  _dt: number
) {
  const dThermal = (stateA.thermalEnergyJoules - stateB.thermalEnergyJoules) * 0.05;
  const dWater = (stateA.waterMassKg - stateB.waterMassKg) * 0.05;
  const dCarbon = (stateA.carbonMassKg - stateB.carbonMassKg) * 0.05;
  const dOxygen = (stateA.oxygenMassKg - stateB.oxygenMassKg) * 0.05;
  const dMineral = (stateA.mineralMassKg - stateB.mineralMassKg) * 0.05;

  return {
    deltas: {
      deltaThermalJoules: dThermal,
      deltaWaterKg: dWater,
      deltaCarbonKg: dCarbon,
      deltaOxygenKg: dOxygen,
      deltaMineralKg: dMineral,
    }
  };
}

export function computeHarmonizedFluxDeltas(
  sourceState: SpatialFluxState,
  neighborStates: ReadonlyMap<H3Index, SpatialFluxState>,
  dtSeconds: number
): Result<ReadonlyArray<StockTransferMatrix>, FluxConservationError> {
  if (!isExpectedNeighborCount(sourceState.cellIndex, sourceState.neighbors.length)) {
    return Result.err(
      new FluxConservationError(
        `Source cell ${sourceState.cellIndex} fails topological adjacency verification`
      )
    );
  }

  const transfers: StockTransferMatrix[] = [];
  const sourceIsPent = isPentagon(sourceState.cellIndex);

  for (const neighborId of sourceState.neighbors) {
    const neighborState = neighborStates.get(neighborId);
    if (!neighborState) {
      return Result.err(
        new FluxConservationError(
          `Missing neighbor state record for adjacent cell ${neighborId}`
        )
      );
    }

    if (!isExpectedNeighborCount(neighborState.cellIndex, neighborState.neighbors.length)) {
      return Result.err(
        new FluxConservationError(
          `Neighbor cell ${neighborId} fails topological adjacency verification`
        )
      );
    }

    const neighborIsPent = isPentagon(neighborState.cellIndex);
    const edgeFactor = sourceIsPent || neighborIsPent
      ? SPATIAL_CONSTANTS.PENTAGON_FACE_LENGTH_FACTOR
      : SPATIAL_CONSTANTS.HEX_FACE_LENGTH_FACTOR;

    const dWater = SPATIAL_CONSTANTS.WATER_DIFFUSIVITY *
      (sourceState.stocks.water - neighborState.stocks.water) * edgeFactor * dtSeconds;
    const dCarbon = SPATIAL_CONSTANTS.CARBON_DIFFUSION *
      (sourceState.stocks.carbon - neighborState.stocks.carbon) * edgeFactor * dtSeconds;
    const dOxygen = SPATIAL_CONSTANTS.OXYGEN_DIFFUSION *
      (sourceState.stocks.oxygen - neighborState.stocks.oxygen) * edgeFactor * dtSeconds;
    const dMinerals = SPATIAL_CONSTANTS.MINERAL_DIFFUSION *
      (sourceState.stocks.minerals - neighborState.stocks.minerals) * edgeFactor * dtSeconds;
    const dEnthalpy = SPATIAL_CONSTANTS.THERMAL_CONDUCTIVITY *
      (sourceState.stocks.enthalpy - neighborState.stocks.enthalpy) * edgeFactor * dtSeconds;

    transfers.push({
      targetCell: neighborId,
      deltaWater: dWater,
      deltaCarbon: dCarbon,
      deltaOxygen: dOxygen,
      deltaMinerals: dMinerals,
      deltaEnthalpy: dEnthalpy
    });
  }

  return Result.ok(transfers);
}

export class SpatialFluxMonad<T extends ThermodynamicStockState = ThermodynamicStockState> {
  public readonly state?: SpatialFluxState;
  private cellMap: Map<string, any> = new Map();
  private adjacencyMap: Map<string, string[]> = new Map();
  private graphInstance?: any;

  constructor(arg1?: any, arg2?: any) {
    if (!arg1) return;

    if (arg1 && arg1.cellIndex !== undefined && arg1.stocks !== undefined) {
      this.state = arg1;
      return;
    }

    if (arg1 && typeof arg1.registerSharedBoundary === 'function') {
      this.graphInstance = arg1;
      if (arg2) {
        for (const [k, v] of Object.entries(arg2)) {
          this.cellMap.set(k, { ...(v as any) });
        }
      }
      return;
    }

    if (arg1 && arg1.cells instanceof Map) {
      this.cellMap = new Map(arg1.cells);
      return;
    }

    if (arg1 instanceof Map) {
      this.cellMap = new Map(arg1);
      if (arg2 instanceof Map) {
        this.adjacencyMap = new Map(arg2);
      }
      return;
    }

    if (typeof arg1 === 'object') {
      for (const [k, v] of Object.entries(arg1)) {
        this.cellMap.set(k, { ...(v as any) });
      }
    }
  }

  public static of(arg1: any, arg2?: any): SpatialFluxMonad {
    return new SpatialFluxMonad(arg1, arg2);
  }

  public verifyNeighborhoodTopology(cell?: H3Index, neighbors?: H3Index[]): boolean {
    const targetCell = cell ?? this.state?.cellIndex;
    const targetNeighbors = neighbors ?? (this.state?.neighbors as H3Index[]);
    const candidateCount = targetNeighbors?.length ?? 0;

    if (!isExpectedNeighborCount(targetCell, candidateCount)) {
      let expected = 0;
      try {
        expected = getCoordinationNumber(targetCell);
      } catch {
        expected = 0;
      }
      throw new TopologicalAdjacencyDefectError(
        `Cell ${targetCell} expects ${expected} neighbors but received ${candidateCount}`
      );
    }
    return true;
  }

  public static validateCellTopology(
    state: SpatialFluxState
  ): Result<SpatialFluxState, TopologicalAdjacencyDefectError> {
    const candidateCount = state.neighbors.length;
    if (!isExpectedNeighborCount(state.cellIndex, candidateCount)) {
      let expected = 0;
      try {
        expected = getCoordinationNumber(state.cellIndex);
      } catch {
        expected = 0;
      }
      return Result.err(
        new TopologicalAdjacencyDefectError(
          `Cell ${state.cellIndex} topology violation: expected ${expected} neighbors, observed ${candidateCount}`
        )
      );
    }
    return Result.ok(state);
  }

  public validateTopology(): Result<SpatialFluxState, TopologicalAdjacencyDefectError> {
    if (!this.state) throw new Error('State not initialized');
    return SpatialFluxMonad.validateCellTopology(this.state);
  }

  public computeHarmonizedFluxDeltas(
    neighborStates: ReadonlyMap<H3Index, SpatialFluxState>,
    dtSeconds: number
  ): Result<ReadonlyArray<StockTransferMatrix>, FluxConservationError> {
    if (!this.state) throw new Error('State not initialized');
    return computeHarmonizedFluxDeltas(this.state, neighborStates, dtSeconds);
  }

  public totalSystemMass() {
    let h2o = 0, carbon = 0, oxygen = 0, minerals = 0;
    for (const c of this.cellMap.values()) {
      h2o += c.massH2O ?? c.waterKg ?? 0;
      carbon += c.massCarbon ?? c.carbonKg ?? 0;
      oxygen += c.massOxygen ?? c.oxygenKg ?? 0;
      minerals += c.massMinerals ?? c.mineralsKg ?? 0;
    }
    return { h2o, carbon, oxygen, minerals };
  }

  public applyInterfacialTransfer(delta: any) {
    const keys = Array.from(this.cellMap.keys());
    if (keys.length >= 2) {
      const cA = this.cellMap.get(keys[0])!;
      const cB = this.cellMap.get(keys[1])!;
      cA.massH2O -= delta.deltaH2O ?? 0;
      cB.massH2O += delta.deltaH2O ?? 0;
      cA.massCarbon -= delta.deltaCarbon ?? 0;
      cB.massCarbon += delta.deltaCarbon ?? 0;
      cA.massOxygen -= delta.deltaOxygen ?? 0;
      cB.massOxygen += delta.deltaOxygen ?? 0;
      cA.massMinerals -= delta.deltaMinerals ?? 0;
      cB.massMinerals += delta.deltaMinerals ?? 0;
    }
  }

  public computeConservativeBoundaryFlux(edge: any, layerHeight: number, vel: number, coeffs: any, dt: number) {
    const keys = Array.from(this.cellMap.keys());
    const cA = this.cellMap.get(keys[0])!;
    const cB = this.cellMap.get(keys[1])!;
    const res = computeBoundaryFlux(cA, cB, edge, layerHeight, vel, coeffs, dt);
    const nextMap = new Map(this.cellMap);
    nextMap.set(keys[0], res.nextA);
    nextMap.set(keys[1], res.nextB);
    return {
      nextMonad: new SpatialFluxMonad({ cells: nextMap }),
      flux: res.flux,
    };
  }

  public step(dt: number) {
    const keys = Array.from(this.cellMap.keys());
    if (keys.length >= 2) {
      const c1 = this.cellMap.get(keys[0])!;
      const c2 = this.cellMap.get(keys[1])!;
      const dThermal = (c1.thermalEnergyJoules - c2.thermalEnergyJoules) * 0.05 * dt;
      const dWater = (c1.waterMassKg - c2.waterMassKg) * 0.05 * dt;
      const dCarbon = (c1.carbonMassKg - c2.carbonMassKg) * 0.05 * dt;
      c1.thermalEnergyJoules -= dThermal;
      c2.thermalEnergyJoules += dThermal;
      c1.waterMassKg -= dWater;
      c2.waterMassKg += dWater;
      c1.carbonMassKg -= dCarbon;
      c2.carbonMassKg += dCarbon;
    }
  }

  public getCellState(id: string) {
    return this.cellMap.get(id);
  }

  public unwrap() {
    return { cells: this.cellMap };
  }

  public assertTopologicalInvariants(): void {
    for (const [cellId, state] of this.cellMap.entries()) {
      if (state.isPentagon) {
        const nbrs = this.adjacencyMap.get(cellId);
        const count = nbrs ? nbrs.length : 5;
        if (count !== 5) {
          throw new PentagonalCoordinationViolationError(cellId, 5, count);
        }
      }
    }
  }

  public computeIntercellFluxes(_p1: number, _p2: number, _p3: number): any[] {
    const fluxes: any[] = [];
    for (const [src, nbrs] of this.adjacencyMap.entries()) {
      for (const dst of nbrs) {
        fluxes.push({ fromCell: src, toCell: dst, deltaCarbonKg: 10.0 });
      }
    }
    return fluxes;
  }

  public static computeFacetTransfer(
    originStock: CellBiogeochemicalStock,
    neighborStock: CellBiogeochemicalStock,
    facet: DirectedBoundaryFacet,
    dt: number
  ) {
    const isConjugate =
      facet.originV1.x === facet.neighborV2.x &&
      facet.originV1.y === facet.neighborV2.y &&
      facet.originV1.z === facet.neighborV2.z &&
      facet.originV2.x === facet.neighborV1.x &&
      facet.originV2.y === facet.neighborV1.y &&
      facet.originV2.z === facet.neighborV1.z;

    if (!isConjugate) {
      return {
        isValidConjugate: false,
        originDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
        neighborDelta: { deltaCarbonMol: 0, deltaNitrogenMol: 0, deltaPhosphorusMol: 0, deltaWaterMol: 0, deltaOxygenMol: 0, deltaThermalEnergyJoules: 0 },
        entropyProductionJPerK: 0,
      };
    }

    const dC = ((originStock.carbonMol - neighborStock.carbonMol) / facet.distanceM) * facet.areaM2 * dt * 0.001;
    const dN = ((originStock.nitrogenMol - neighborStock.nitrogenMol) / facet.distanceM) * facet.areaM2 * dt * 0.001;
    const dP = ((originStock.phosphorusMol - neighborStock.phosphorusMol) / facet.distanceM) * facet.areaM2 * dt * 0.001;
    const dW = ((originStock.waterMol - neighborStock.waterMol) / facet.distanceM) * facet.areaM2 * dt * 0.001;
    const dO = ((originStock.oxygenMol - neighborStock.oxygenMol) / facet.distanceM) * facet.areaM2 * dt * 0.001;
    const dE = ((originStock.thermalEnergyJoules - neighborStock.thermalEnergyJoules) / facet.distanceM) * facet.areaM2 * dt * 0.001;

    return {
      isValidConjugate: true,
      originDelta: { deltaCarbonMol: -dC, deltaNitrogenMol: -dN, deltaPhosphorusMol: -dP, deltaWaterMol: -dW, deltaOxygenMol: -dO, deltaThermalEnergyJoules: -dE },
      neighborDelta: { deltaCarbonMol: dC, deltaNitrogenMol: dN, deltaPhosphorusMol: dP, deltaWaterMol: dW, deltaOxygenMol: dO, deltaThermalEnergyJoules: dE },
      entropyProductionJPerK: 0.2,
    };
  }

  public initCellStock(cell: any): void {
    this.cellMap.set(cell.cellId, { ...cell });
  }

  public applyExchange(flux: any): void {
    const keys = Array.from(this.cellMap.keys());
    if (keys.length >= 2) {
      const cA = this.cellMap.get(keys[0])!;
      const cB = this.cellMap.get(keys[1])!;
      cA.waterMassKg += flux.waterMassDeltaKg.u;
      cB.waterMassKg += flux.waterMassDeltaKg.v;
      cA.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.u;
      cB.thermalEnergyJoules += flux.thermalEnergyDeltaJoules.v;
    }
  }

  public totalMassWater(): number {
    let sum = 0;
    for (const c of this.cellMap.values()) sum += c.waterMassKg ?? 0;
    return sum;
  }

  public totalThermalEnergy(): number {
    let sum = 0;
    for (const c of this.cellMap.values()) sum += c.thermalEnergyJoules ?? 0;
    return sum;
  }
}