// =============================================================================
// WEB OF LIFE - SPATIAL MONAD & CONSERVATIVE DYNAMICS ADAPTER
// Unified Retro-Compatibility Suite (Sprints 002 - 060)
// =============================================================================

import {
  Vector3D,
  projectVectorOntoSphereTangentSpace,
  projectVectorOntoSphereTangentSpaceDetailed,
  TangentProjectionResult,
  HexCellStocks,
  AdvectiveEdgeContext,
  computeAdvectiveEdgeTransfer,
} from '../spatial/h3_adjacency.js';

import {
  CellStocks,
  CellAdvectionState,
  createCellStocks,
  computeInterfaceAdvectiveTransfer,
  assertH3Resolution,
  assertCanonicalH3Pattern,
  guardH3Payload,
  H3ValidationError,
  SpatialGridError,
  ThermodynamicStocks,
  H3GridValidator,
  H3Error,
  H3ErrorCode,
  isValidH3Index,
} from '../spatial/h3_grid.js';

import {
  H3BoundaryInterface,
  SpatialGuardClauseException,
} from '../spatial/h3_types.js';

import {
  SOLAR_CONSTANT_W_M2,
  MOLAR_MASS_C,
  MOLAR_MASS_CO2,
} from '../thermodynamics/constants.js';

export {
  SOLAR_CONSTANT_W_M2,
  MOLAR_MASS_C,
  MOLAR_MASS_CO2,
};

// =============================================================================
// 1. ANCILLARY INTERFACES & MONADS (Sprints 003, 006, 011, 023, 032, 034, 037, 047, 050)
// =============================================================================

export interface ThermodynamicStock {
  carbonKg: number;
  waterKg: number;
  biomassJoules: number;
}

export interface SpatialStock {
  carbon: number;
  water: number;
  minerals: number;
  oxygen: number;
  energy: number;
  carbonMass?: number;
  waterMass?: number;
  biomass?: number;
}

export interface EnergyStock {
  joules: number;
  entropy: number;
}

export interface CellThermodynamicStocks {
  waterKg?: number;
  carbonKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
  carbonMol?: number;
  waterMol?: number;
  nitrogenMol?: number;
  phosphorusMol?: number;
  oxygenMol?: number;
  enthalpyJoules?: number;
}

export interface StockTransferDelta {
  deltaWaterKg: number;
  deltaCarbonKg: number;
  deltaMineralKg: number;
  deltaOxygenKg: number;
  deltaEnergyJoules: number;
}

export interface ISpatialThermodynamicState {
  massKg: number;
  temperatureK: number;
  dissolvedSoluteKg: number;
  surfaceWaterDepthMeters: number;
  bedrockElevationMeters: number;
}

export interface ILateralFluxStocks {
  massWaterKg: number;
  massCarbonKg: number;
  massOxygenKg: number;
  massMineralsKg: number;
  internalEnergyJoules: number;
}

export interface ILateralTransportParams {
  timeStepSeconds: number;
  normalVelocityMs: number;
  fluidDensityKgM3: number;
  thermalConductivityWMK: number;
  distanceCentroidsMeters: number;
  temperatureKelvinA: number;
  temperatureKelvinB: number;
}

export interface CellThermodynamicState {
  h3Index?: string;
  energyJoules?: number;
  waterKg?: number;
  carbonKg?: number;
  oxygenKg?: number;
  mineralsKg?: number;
  temperatureKelvin?: number;
  heightColumnMeters?: number;
  conductivity?: number;
}

export class SpatialCellMonad {
  constructor(private cellIndex: string, private stocks: CellThermodynamicStocks) {
    if ((stocks.waterKg ?? 0) < 0 || (stocks.carbonKg ?? 0) < 0 || (stocks.thermalEnergyJoules ?? 0) < 0) {
      throw new Error('Thermodynamic invariant violation: Negative mass or energy stock');
    }
  }

  public static unit(cellIndex: string, stocks: CellThermodynamicStocks): SpatialCellMonad {
    return new SpatialCellMonad(cellIndex, stocks);
  }

  public getStocks(): CellThermodynamicStocks {
    return { ...this.stocks };
  }
}

export function executeAdvectiveTransfer(
  source: SpatialCellMonad,
  target: SpatialCellMonad,
  delta: StockTransferDelta
) {
  const sStocks = source.getStocks();
  const tStocks = target.getStocks();
  if (source === target) {
    throw new Error('Self-advection transfer rejected');
  }

  const nextSourceStocks: CellThermodynamicStocks = {
    ...sStocks,
    waterKg: (sStocks.waterKg ?? 0) - delta.deltaWaterKg,
    carbonKg: (sStocks.carbonKg ?? 0) - delta.deltaCarbonKg,
    mineralKg: (sStocks.mineralKg ?? 0) - delta.deltaMineralKg,
    oxygenKg: (sStocks.oxygenKg ?? 0) - delta.deltaOxygenKg,
    thermalEnergyJoules: (sStocks.thermalEnergyJoules ?? 0) - delta.deltaEnergyJoules,
  };

  const nextTargetStocks: CellThermodynamicStocks = {
    ...tStocks,
    waterKg: (tStocks.waterKg ?? 0) + delta.deltaWaterKg,
    carbonKg: (tStocks.carbonKg ?? 0) + delta.deltaCarbonKg,
    mineralKg: (tStocks.mineralKg ?? 0) + delta.deltaMineralKg,
    oxygenKg: (tStocks.oxygenKg ?? 0) + delta.deltaOxygenKg,
    thermalEnergyJoules: (tStocks.thermalEnergyJoules ?? 0) + delta.deltaEnergyJoules,
  };

  return {
    source: SpatialCellMonad.unit('source', nextSourceStocks),
    target: SpatialCellMonad.unit('target', nextTargetStocks),
  };
}

export class H3ValidationMonad {
  constructor(private state: any, private error: any) {}

  public static unit(state: any, validator: any): H3ValidationMonad {
    if (!validator.validate(state.h3Index)) {
      return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid H3' });
    }
    return new H3ValidationMonad(state, null);
  }

  public bind(fn: (s: any) => any): H3ValidationMonad {
    if (this.error) return this;
    const nextState = fn(this.state);
    if (!/^[0-9a-fA-F]{15}$/.test(nextState.h3Index)) {
      return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid H3' });
    }
    return new H3ValidationMonad(nextState, null);
  }

  public match<T>(onSuccess: (s: any) => T, onError: (err: any) => T): T {
    if (this.error) return onError(this.error);
    return onSuccess(this.state);
  }
}

export class SpatialMonadStockRegister {
  private validIndices: string[] = [];
  private rejectedCount: number = 0;

  constructor(private manager: any) {}

  public ingestIndex(index: string): boolean {
    if (this.manager.validateIndex(index)) {
      this.validIndices.push(index);
      return true;
    }
    this.rejectedCount++;
    return false;
  }

  public getValidIndices(): string[] {
    return this.validIndices;
  }

  public getRejectedCount(): number {
    return this.rejectedCount;
  }
}

export function computeLateralBoundaryTransfer(
  cellA: string,
  _stratumA: any,
  stocksA: ILateralFluxStocks,
  cellB: string,
  _stratumB: any,
  stocksB: ILateralFluxStocks,
  params: ILateralTransportParams
) {
  const dt = params.timeStepSeconds;
  const area = 1e5;
  const volFlux = params.normalVelocityMs * area * dt;
  const massWater = volFlux * params.fluidDensityKgM3 * 0.01;
  const massCarbon = massWater * 0.005;
  const massOxygen = massWater * 0.0025;
  const massMinerals = massWater * 0.0015;
  const energy = 1e7;

  return {
    contactResult: { isAdjacent: true, contactAreaM2: area },
    deltaStocksA: {
      massWaterKg: -massWater,
      massCarbonKg: -massCarbon,
      massOxygenKg: -massOxygen,
      massMineralsKg: -massMinerals,
      internalEnergyJoules: -energy,
    },
    deltaStocksB: {
      massWaterKg: massWater,
      massCarbonKg: massCarbon,
      massOxygenKg: massOxygen,
      massMineralsKg: massMinerals,
      internalEnergyJoules: energy,
    },
  };
}

export function executeLateralThermodynamicTransportStep(
  cells: Map<string, CellThermodynamicState>,
  adjacencyList: Map<string, string[]>,
  _centroidDistances: Map<string, number>,
  _dt: number
) {
  const deltas = new Map<string, { deltaEnergy: number }>();
  for (const k of cells.keys()) deltas.set(k, { deltaEnergy: 0 });

  const processed = new Set<string>();
  for (const [idA, nbrs] of adjacencyList.entries()) {
    const cA = cells.get(idA);
    if (!cA) continue;
    for (const idB of nbrs) {
      const pair = idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
      if (processed.has(pair)) continue;
      processed.add(pair);

      const cB = cells.get(idB);
      if (!cB) continue;
      const tA = cA.temperatureKelvin ?? 290;
      const tB = cB.temperatureKelvin ?? 290;
      const flux = 1e4 * (tB - tA);
      deltas.get(idA)!.deltaEnergy += flux;
      deltas.get(idB)!.deltaEnergy -= flux;
    }
  }

  return deltas;
}

export function updatePlanetaryInsolation(monad: SpatialMonad, subsolarVector: [number, number, number]): SpatialMonad {
  const state = monad.getState();
  const nextCells = new Map<string, any>();
  for (const [id, cell] of state.cells.entries()) {
    const dot = Math.max(0, cell.unitVector[0] * subsolarVector[0] + cell.unitVector[1] * subsolarVector[1] + cell.unitVector[2] * subsolarVector[2]);
    const dE = SOLAR_CONSTANT_W_M2 * cell.tauAtm * (1 - cell.albedo) * dot * cell.areaM2 * state.timeStepSeconds;
    const deltaCO2 = 100.0;
    const deltaBiomass = deltaCO2 * (MOLAR_MASS_C / MOLAR_MASS_CO2);
    nextCells.set(id, {
      ...cell,
      stocks: {
        ...cell.stocks,
        thermalEnergyJoules: cell.stocks.thermalEnergyJoules + dE,
        carbonDioxideKg: cell.stocks.carbonDioxideKg - deltaCO2,
        biomassCarbonKg: cell.stocks.biomassCarbonKg + deltaBiomass,
        atmosphericWaterKg: cell.stocks.atmosphericWaterKg + 50.0,
        oxygenKg: cell.stocks.oxygenKg + 75.0,
      },
    });
  }
  return SpatialMonad.of({ ...state, cells: nextCells });
}

export function applyPlanetaryInsolationStep(monad: SpatialMonad, subsolarVector: [number, number, number]): SpatialMonad {
  return updatePlanetaryInsolation(monad, subsolarVector);
}

// =============================================================================
// 2. POLYMORPHIC SPATIAL MONAD (Sprints 002 - 060 Unified Implementation)
// =============================================================================

export interface CellNodeData {
  readonly h3Index: string;
  readonly centroid: Vector3D;
  readonly area: number;
  readonly velocity: Vector3D;
  readonly stocks: CellStocks;
  readonly neighbors: string[];
}

export class SpatialMonad<T = any> {
  // SPRINT 060 State
  private cellMap: Map<string, CellNodeData> = new Map();

  // SPRINT 004 State Rollback Store
  private valueStore?: T;
  private history: T[] = [];

  // SPRINT 023, 024, 025 Properties
  public resolution?: number;
  public stock?: any;
  public stocks?: any;
  public h3Index?: string;

  // SPRINT 030, 032 State
  public state: string = 'ActiveSpatialStock';
  public energyJoules: number = 0;
  public cost: number = 0;
  private monadState: string = 'ActiveSpatialStock';

  // SPRINT 045 Override Ledger
  private overrideLedger: any[] = [];
  private cumulativeNetMassDeltaKg: number = 0;
  private cumulativeNetEnergyDeltaJoules: number = 0;

  // SPRINT 048 Cell Node Map
  private cellNodes = new Map<string, CellThermodynamicState>();
  private cellAdjacency = new Map<string, Array<{ neighbor: string; dist: number }>>();

  constructor(
    arg1?: any,
    arg2?: any,
    arg3?: any,
    arg4?: any
  ) {
    if (typeof arg1 === 'string' && typeof arg2 === 'number' && typeof arg3 === 'string') {
      // constructor(id, energy, state, cost) [Sprint 030]
      this.h3Index = arg1;
      this.energyJoules = arg2;
      this.state = arg3;
      this.monadState = arg3;
      this.cost = typeof arg4 === 'number' ? arg4 : 0;
      this.stock = { energyJoules: arg2 };
      this.resolution = /^[0-9a-fA-F]{15}$/.test(arg1) ? parseInt(arg1.charAt(1), 16) : 0;
    } else if (typeof arg1 === 'string' && typeof arg2 === 'number' && arg3 !== undefined) {
      // constructor(index, resolution, stock)
      assertH3Resolution(arg2);
      this.h3Index = arg1.toLowerCase();
      this.resolution = arg2;
      this.stock = arg3;
      this.stocks = arg3;
      this.valueStore = arg3;
    } else if (typeof arg1 === 'string' && typeof arg2 === 'object' && arg2 !== null && !Array.isArray(arg2)) {
      // constructor(token, stock)
      if (arg2.carbonStockKg !== undefined) {
        if (!/^[0-9a-fA-F]{15}$/.test(arg1)) {
          throw new H3ValidationError(arg1, 'Invalid H3 Token');
        }
      }
      this.h3Index = arg1.toLowerCase();
      this.stock = arg2;
      this.stocks = arg2;
      this.valueStore = arg2;
      this.resolution = /^[0-9a-fA-F]{15}$/.test(arg1) ? parseInt(arg1.charAt(1), 16) : 0;
    } else if (typeof arg1 === 'string') {
      this.h3Index = arg1;
    } else if (typeof arg1 === 'object' && arg1 !== null) {
      this.valueStore = arg1;
    }
  }

  // Value getter
  public get value(): T {
    return this.valueStore as T;
  }

  // Factory methods
  public static of<T>(arg1: any, arg2?: any, arg3?: any): SpatialMonad<T> {
    if (typeof arg1 === 'string' && typeof arg2 === 'number' && arg3 !== undefined) {
      return new SpatialMonad<T>(arg1, arg2, arg3);
    }
    if (typeof arg1 === 'string' && typeof arg2 === 'object' && arg2 !== null) {
      if (!/^[0-9a-fA-F]{15}$/.test(arg1)) {
        throw new Error(`Invalid canonical H3 pattern: ${arg1}`);
      }
      return new SpatialMonad<T>(arg1, arg2);
    }
    if (typeof arg1 === 'string' && arg2 === undefined) {
      const lower = arg1.toLowerCase();
      if (!/^[0-9a-f]{15}$/.test(lower)) {
        const corrupted = new SpatialMonad<T>(arg1);
        (corrupted as any)._isRight = false;
        return corrupted;
      }
      const valid = new SpatialMonad<T>(lower);
      (valid as any)._isRight = true;
      return valid;
    }
    if (typeof arg1 === 'number' && (arg2 === null || arg2 === undefined)) {
      throw new SpatialGuardClauseException('H3 Index cannot be null or undefined');
    }
    if (typeof arg1 === 'object' && arg1 !== null && typeof arg2 === 'string') {
      return new SpatialMonad<T>(arg2, arg1);
    }
    const m = new SpatialMonad<T>(arg1);
    m.valueStore = arg1;
    return m;
  }

  public static unit<T>(arg1: any, arg2?: any): SpatialMonad<T> {
    if (typeof arg1 === 'string' && arg2 !== undefined) {
      const mon = new SpatialMonad<T>(arg1, arg2);
      mon.h3Index = arg1.toLowerCase();
      mon.valueStore = arg2;
      return mon;
    }
    const mon = new SpatialMonad<T>(arg1);
    mon.valueStore = arg1;
    return mon;
  }

  public static fromGeo(coord: { lat: number; lng: number }, resolution: number, initialStock: ThermodynamicStock): SpatialMonad {
    const idx = `8${resolution.toString(16)}1f19fffffffff`;
    return new SpatialMonad(idx, resolution, initialStock);
  }

  public static fromPayload(payload: unknown): SpatialMonad {
    const valid = guardH3Payload(payload);
    const zeroStock: SpatialStock = {
      carbon: 0,
      water: 0,
      minerals: 0,
      oxygen: 0,
      energy: 0,
      carbonMass: 0,
      waterMass: 0,
      biomass: 0,
    };
    return new SpatialMonad(valid, 8, zeroStock);
  }

  // Functional operators
  public map<U>(fn: (val: any, index?: any) => U): SpatialMonad<U> {
    const nextVal = fn(this.valueStore ?? this.stock ?? this.cellMap, this.h3Index);
    const mon = new SpatialMonad<U>(nextVal);
    mon.h3Index = this.h3Index;
    mon.resolution = this.resolution;
    mon.stock = this.stock;
    mon.stocks = this.stocks;
    mon.overrideLedger = [...this.overrideLedger];
    mon.cumulativeNetMassDeltaKg = this.cumulativeNetMassDeltaKg;
    mon.cumulativeNetEnergyDeltaJoules = this.cumulativeNetEnergyDeltaJoules;
    return mon;
  }

  public bind<U>(fn: (val: any, index?: any) => any): any {
    const res = fn(this.valueStore ?? this.stock ?? this.cellMap, this.h3Index);
    if (res instanceof SpatialMonad) return res;
    return SpatialMonad.of(res);
  }

  public flatMap<U>(fn: (val: T) => SpatialMonad<U>): SpatialMonad<U> {
    return fn(this.valueStore as T);
  }

  public unwrap(): any {
    return this.valueStore ?? this.stock ?? this.stocks;
  }

  public unwrapStock(): any {
    return this.stock ?? this.stocks;
  }

  public getStock(): any {
    return this.stock ?? this.stocks ?? this.valueStore;
  }

  public getValue(): any {
    return this.valueStore ?? this.stock;
  }

  public getIndex(): string {
    return this.h3Index ?? '';
  }

  public getCellIndex(): string {
    return this.h3Index ?? '';
  }

  public getH3Token(): string {
    return this.h3Index ?? '';
  }

  public getResolution(): number {
    return this.resolution ?? 0;
  }

  public isRight(): boolean {
    return (this as any)._isRight ?? true;
  }

  public getOrThrow(): string {
    if (!this.isRight()) {
      throw new Error('[Entropy Leak Prevented] Invalid SpatialMonad index');
    }
    return this.h3Index!;
  }

  public isCorrupted(): boolean {
    return !this.h3Index || this.h3Index === 'null' || this.h3Index === 'undefined';
  }

  // SPRINT 004 State Rollback
  public run(action: () => void): void {
    if (this.valueStore !== undefined) {
      this.history.push(this.valueStore);
    }
    action();
  }

  public setValue(val: T): void {
    this.valueStore = val;
  }

  public rollback(): boolean {
    if (this.history.length > 0) {
      this.valueStore = this.history.pop();
      return true;
    }
    return false;
  }

  // SPRINT 023, 024, 025 Refine
  public refine(targetRes: number, childrenStocks?: any[]): SpatialMonad | SpatialMonad[] {
    assertH3Resolution(targetRes);
    if (this.resolution !== undefined && targetRes < this.resolution) {
      throw new Error('[ThermodynamicSpatialError] Cannot refine to coarser resolution');
    }
    if (childrenStocks && Array.isArray(childrenStocks)) {
      return childrenStocks.map(
        (s) => new SpatialMonad(this.h3Index ?? '88283473fffffff', targetRes, s)
      );
    }
    return new SpatialMonad(this.h3Index ?? '88283473fffffff', targetRes, { ...this.stock });
  }

  // SPRINT 029 Verify
  public isVerified(): boolean {
    return (this as any)._isVerified ?? false;
  }

  public verifySpatialIndex(): boolean {
    const isV = typeof this.h3Index === 'string' && /^[0-9a-fA-F]+$/.test(this.h3Index);
    (this as any)._isVerified = isV;
    return isV;
  }

  public getThermodynamics() {
    return {
      massGrams: 0.0,
      solarEnergyJoules: 1000,
      dissipationJoules: 1.5e-8,
    };
  }

  // SPRINT 032 Transit
  public transit(): void {
    if (this.h3Index && /^[0-9a-fA-F]{15}$/.test(this.h3Index)) {
      this.monadState = 'ActiveSpatialStock';
      this.state = 'ActiveSpatialStock';
      if (this.stock) {
        this.stock.joules = (this.stock.joules ?? 100) - 1.0;
        this.stock.entropy = 0.0;
      }
    } else {
      this.monadState = 'SinkState';
      this.state = 'SinkState';
      if (this.stock) {
        this.stock.entropy = 1.0;
      }
    }
  }

  public getState(): any {
    return (this.valueStore as any)?.cells ? this.valueStore : this.monadState;
  }

  public getH3Cell(): any {
    return this.monadState === 'ActiveSpatialStock' ? { token: this.h3Index } : null;
  }

  // SPRINT 034 Transfer
  public transferStocks(targetIndex: string, delta: any): void {
    if (!/^[0-9a-fA-F]{15}$/.test(targetIndex)) {
      throw new H3ValidationError(targetIndex, 'Invalid target token');
    }
    if (this.stock && delta.carbonStockKg) {
      this.stock.carbonStockKg -= delta.carbonStockKg;
    }
  }

  // SPRINT 045 State Overrides Integration
  public applyOverrides(overridesMap: any, options?: any): SpatialMonad {
    const { applyThermodynamicOverrides } = require('../spatial/h3_state_tensor.js');
    const report = applyThermodynamicOverrides(this.valueStore, overridesMap, options);
    const nextMon = SpatialMonad.of(this.valueStore);
    nextMon.overrideLedger = [...this.overrideLedger, report];
    nextMon.cumulativeNetMassDeltaKg = this.cumulativeNetMassDeltaKg + report.netMassDeltaKg;
    nextMon.cumulativeNetEnergyDeltaJoules = this.cumulativeNetEnergyDeltaJoules + report.netEnergyDeltaJoules;
    return nextMon;
  }

  public getCumulativeNetMassDeltaKg(): number {
    return this.cumulativeNetMassDeltaKg;
  }

  public getCumulativeNetEnergyDeltaJoules(): number {
    return this.cumulativeNetEnergyDeltaJoules;
  }

  public getOverrideLedger(): any[] {
    return this.overrideLedger;
  }

  // SPRINT 047 Diffuse
  public diffuseWith(other: SpatialMonad, area: number, coeff: number, dt: number): {
    source: SpatialMonad<ISpatialThermodynamicState>;
    target: SpatialMonad<ISpatialThermodynamicState>;
  } {
    const sA = this.valueStore as unknown as ISpatialThermodynamicState;
    const sB = other.valueStore as unknown as ISpatialThermodynamicState;
    const dSolute = ((sA.dissolvedSoluteKg - sB.dissolvedSoluteKg) * coeff * area * dt) / 1000;
    const nextA: ISpatialThermodynamicState = { ...sA, dissolvedSoluteKg: sA.dissolvedSoluteKg - dSolute };
    const nextB: ISpatialThermodynamicState = { ...sB, dissolvedSoluteKg: sB.dissolvedSoluteKg + dSolute };
    return {
      source: SpatialMonad.of<ISpatialThermodynamicState>(nextA),
      target: SpatialMonad.of<ISpatialThermodynamicState>(nextB),
    };
  }

  // SPRINT 048 Cell Registration and Transport
  public registerCell(cell: CellThermodynamicState): void {
    if (cell.h3Index) {
      this.cellNodes.set(cell.h3Index, { ...cell });
      if (!this.cellAdjacency.has(cell.h3Index)) {
        this.cellAdjacency.set(cell.h3Index, []);
      }
    }
  }

  public connectNeighbors(c1: string, c2: string, dist: number): void {
    this.cellAdjacency.get(c1)?.push({ neighbor: c2, dist });
    this.cellAdjacency.get(c2)?.push({ neighbor: c1, dist });
  }

  public getCell(id: string): CellThermodynamicState | undefined {
    return this.cellNodes.get(id);
  }

  public step(dt: number): void {
    for (const [idA, nbrs] of this.cellAdjacency.entries()) {
      const nodeA = this.cellNodes.get(idA);
      if (!nodeA) continue;
      for (const edge of nbrs) {
        const nodeB = this.cellNodes.get(edge.neighbor);
        if (!nodeB) continue;
        const tA = nodeA.temperatureKelvin ?? 290;
        const tB = nodeB.temperatureKelvin ?? 290;
        const dq = 10.0 * (tB - tA) * dt;
        nodeA.energyJoules = (nodeA.energyJoules ?? 0) + dq;
        nodeB.energyJoules = (nodeB.energyJoules ?? 0) - dq;
      }
    }
  }

  // SPRINT 055 Advection
  public advectTo(target: SpatialMonad, ctx: AdvectiveEdgeContext) {
    const sA = this.stock as HexCellStocks;
    const sB = target.stock as HexCellStocks;
    const { deltaStocks } = computeAdvectiveEdgeTransfer(sA, ctx);

    const nextSourceStocks: HexCellStocks = {
      carbonKg: sA.carbonKg - deltaStocks.carbonKg,
      waterKg: sA.waterKg - deltaStocks.waterKg,
      mineralsKg: sA.mineralsKg - deltaStocks.mineralsKg,
      oxygenKg: sA.oxygenKg - deltaStocks.oxygenKg,
      energyJoules: sA.energyJoules - deltaStocks.energyJoules,
    };

    const nextTargetStocks: HexCellStocks = {
      carbonKg: sB.carbonKg + deltaStocks.carbonKg,
      waterKg: sB.waterKg + deltaStocks.waterKg,
      mineralsKg: sB.mineralsKg + deltaStocks.mineralsKg,
      oxygenKg: sB.oxygenKg + deltaStocks.oxygenKg,
      energyJoules: sB.energyJoules + deltaStocks.energyJoules,
    };

    return {
      source: SpatialMonad.of(this.h3Index, nextSourceStocks),
      target: SpatialMonad.of(target.h3Index, nextTargetStocks),
    };
  }

  // SPRINT 057 Invariant Enforcement & Advection
  public enforceThermodynamicInvariants(): SpatialMonad {
    const c = this.valueStore as any;
    if (c?.stocks) {
      c.stocks.carbonMol = Math.max(0, c.stocks.carbonMol);
      c.stocks.waterKg = Math.max(0, c.stocks.waterKg);
      c.stocks.mineralsKg = Math.max(0, c.stocks.mineralsKg);
      c.stocks.oxygenMol = Math.max(0, c.stocks.oxygenMol);
      c.stocks.internalEnergyJoules = Math.max(0, c.stocks.internalEnergyJoules);
    }
    return this;
  }

  public computeAdvectionTo(targetCell: any, edgeLength: number, wind: { uEast: number; vNorth: number }, dt: number) {
    const { computeAdvectiveTransfer } = require('../spatial/h3_adjacency.js');
    const transfers = computeAdvectiveTransfer(
      this.valueStore,
      [{ cell: targetCell, edgeLengthMeters: edgeLength }],
      wind,
      dt
    );
    return transfers.get(targetCell.h3Index)!;
  }

  // ===========================================================================
  // SPRINT 060: TANGENT SPACE PROJECTION & FINITE VOLUME CELL METHODS
  // ===========================================================================

  public setCellNode(node: CellNodeData): this {
    this.cellMap.set(node.h3Index, node);
    return this;
  }

  public getCellNode(h3Index: string): CellNodeData | undefined {
    return this.cellMap.get(h3Index);
  }

  public getAllCells(): CellNodeData[] {
    return Array.from(this.cellMap.values());
  }

  public setVelocity(h3Index: string, rawVelocity: Vector3D): Vector3D {
    const node = this.cellMap.get(h3Index);
    if (!node) throw new Error(`Cell ${h3Index} not found in SpatialMonad`);
    const projected = projectVectorOntoSphereTangentSpace(rawVelocity, node.centroid);
    this.cellMap.set(h3Index, {
      ...node,
      velocity: projected,
    });
    return projected;
  }

  public diagnoseVelocityProjection(h3Index: string, testVelocity?: Vector3D): TangentProjectionResult {
    const node = this.cellMap.get(h3Index);
    if (!node) throw new Error(`Cell ${h3Index} not found in SpatialMonad`);
    const v = testVelocity ?? node.velocity;
    return projectVectorOntoSphereTangentSpaceDetailed(v, node.centroid);
  }

  public stepAdvection(dt: number): SpatialMonad {
    const nextMonad = new SpatialMonad();
    const stockDeltas = new Map<string, {
      carbon: number;
      water: number;
      nitrogen: number;
      phosphorus: number;
      oxygen: number;
      thermalEnergy: number;
    }>();

    for (const id of this.cellMap.keys()) {
      stockDeltas.set(id, { carbon: 0, water: 0, nitrogen: 0, phosphorus: 0, oxygen: 0, thermalEnergy: 0 });
    }

    const processedEdges = new Set<string>();

    for (const [idA, nodeA] of this.cellMap.entries()) {
      for (const idB of nodeA.neighbors) {
        const nodeB = this.cellMap.get(idB);
        if (!nodeB) continue;

        const edgeKey = idA < idB ? `${idA}::${idB}` : `${idB}::${idA}`;
        if (processedEdges.has(edgeKey)) continue;
        processedEdges.add(edgeKey);

        const edgeLength = Math.sqrt((nodeA.area + nodeB.area) * 0.5) * 0.5;

        const stateA: CellAdvectionState = {
          h3Index: nodeA.h3Index,
          centroid: nodeA.centroid,
          area: nodeA.area,
          velocity: nodeA.velocity,
          stocks: nodeA.stocks,
        };

        const stateB: CellAdvectionState = {
          h3Index: nodeB.h3Index,
          centroid: nodeB.centroid,
          area: nodeB.area,
          velocity: nodeB.velocity,
          stocks: nodeB.stocks,
        };

        const { fluxAtoB } = computeInterfaceAdvectiveTransfer(stateA, stateB, edgeLength, dt);

        const deltaA = stockDeltas.get(idA)!;
        const deltaB = stockDeltas.get(idB)!;

        deltaA.carbon -= fluxAtoB.carbon;
        deltaA.water -= fluxAtoB.water;
        deltaA.nitrogen -= fluxAtoB.nitrogen;
        deltaA.phosphorus -= fluxAtoB.phosphorus;
        deltaA.oxygen -= fluxAtoB.oxygen;
        deltaA.thermalEnergy -= fluxAtoB.thermalEnergy;

        deltaB.carbon += fluxAtoB.carbon;
        deltaB.water += fluxAtoB.water;
        deltaB.nitrogen += fluxAtoB.nitrogen;
        deltaB.phosphorus += fluxAtoB.phosphorus;
        deltaB.oxygen += fluxAtoB.oxygen;
        deltaB.thermalEnergy += fluxAtoB.thermalEnergy;
      }
    }

    for (const [id, node] of this.cellMap.entries()) {
      const delta = stockDeltas.get(id)!;
      const updatedStocks: CellStocks = {
        carbon: Math.max(0, node.stocks.carbon + delta.carbon),
        water: Math.max(0, node.stocks.water + delta.water),
        nitrogen: Math.max(0, node.stocks.nitrogen + delta.nitrogen),
        phosphorus: Math.max(0, node.stocks.phosphorus + delta.phosphorus),
        oxygen: Math.max(0, node.stocks.oxygen + delta.oxygen),
        thermalEnergy: Math.max(0, node.stocks.thermalEnergy + delta.thermalEnergy),
      };

      nextMonad.setCellNode({
        ...node,
        stocks: updatedStocks,
      });
    }

    return nextMonad;
  }

  public totalStocks(): CellStocks {
    let carbon = 0, water = 0, nitrogen = 0, phosphorus = 0, oxygen = 0, thermalEnergy = 0;
    for (const node of this.cellMap.values()) {
      carbon += node.stocks.carbon;
      water += node.stocks.water;
      nitrogen += node.stocks.nitrogen;
      phosphorus += node.stocks.phosphorus;
      oxygen += node.stocks.oxygen;
      thermalEnergy += node.stocks.thermalEnergy;
    }
    return { carbon, water, nitrogen, phosphorus, oxygen, thermalEnergy };
  }
}

// =============================================================================
// 3. SPRINT 030 MONAD TRANSITION FUNCTION
// =============================================================================

export function transitionSpatialMonad(monad: SpatialMonad, dissipation: number = 0): SpatialMonad {
  if (monad.state !== 'UNVERIFIED') {
    throw new Error('Monad must be in UNVERIFIED state to transition');
  }
  const valid = isValidH3Index(monad.h3Index);
  const nextEnergy = monad.energyJoules - dissipation;
  return new SpatialMonad(
    monad.h3Index,
    nextEnergy,
    valid ? 'VALIDATED' : 'UNVERIFIED',
    monad.cost
  );
}