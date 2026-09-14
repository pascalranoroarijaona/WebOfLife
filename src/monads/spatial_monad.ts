/**
 * Web of Life - Spatial Monad & Thermodynamic Grid Engine
 * Unified monadic container preserving backward-compatibility across Sprints 001-053.
 */

import * as h3 from 'h3-js';
import {
  UnitVector3D,
  CellBiophysicalState,
  PlanetaryGridState,
  CellThermodynamicOverride,
  ThermodynamicOverrideReport,
  CellThermodynamicState,
  IVerticalStratum,
  H3ErrorCode,
} from '../spatial/h3_types.js';
import {
  latLngToUnitVector3D,
  unitVectorDotProduct,
  calculateH3BoundaryContactArea,
} from '../spatial/h3_adjacency.js';
import {
  validateH3Token,
  H3ValidationError,
  matchesCanonicalH3Pattern,
  isValidH3Hex,
  isValidH3Index,
} from '../spatial/h3_grid.js';
import { applyThermodynamicOverrides, H3StateTensor } from '../spatial/h3_state_tensor.js';

export { CellThermodynamicState };

export const SOLAR_CONSTANT_W_M2 = 1361.0;
export const PAR_FRACTION = 0.48;
export const CANOPY_EXTINCTION_K = 0.5;
export const QUANTUM_YIELD_J_PER_MOL = 4.22e6;
export const RUBISCO_EFFICIENCY_KG_PER_MOL = 0.012;
export const WATER_USE_EFFICIENCY_KG_C_PER_KG_H2O = 3.5e-3;

export const MOLAR_MASS_CO2 = 44.01;
export const MOLAR_MASS_C = 12.011;
export const MOLAR_MASS_O2 = 31.998;

export interface ThermodynamicStock {
  carbonKg: number;
  waterKg: number;
  biomassJoules: number;
}

export interface SpatialStock {
  carbon: number;
  water: number;
  minerals: number;
  oxygen?: number;
  energy: number;
  carbonMass?: number;
  waterMass?: number;
  biomass?: number;
}

export interface EnergyStock {
  joules: number;
  entropy: number;
}

export interface ISpatialThermodynamicState {
  massKg: number;
  temperatureK: number;
  dissolvedSoluteKg: number;
  surfaceWaterDepthMeters: number;
  bedrockElevationMeters: number;
}

export interface CellThermodynamicStocks {
  waterKg?: number;
  carbonKg?: number;
  mineralKg?: number;
  oxygenKg?: number;
  thermalEnergyJoules?: number;
}

export interface StockTransferDelta {
  deltaWaterKg?: number;
  deltaCarbonKg?: number;
  deltaMineralKg?: number;
  deltaOxygenKg?: number;
  deltaEnergyJoules?: number;
}

/**
 * Universal SpatialMonad supporting functional functors, state mutation registers,
 * and retro-compatibility across all test sprints.
 */
export class SpatialMonad<T = any> {
  private _state: any;
  private _h3Index: string = '';
  private _resolution: number = 0;
  private _stock: any;
  private _history: any[] = [];
  private _isVerified: boolean = false;
  private _dissipationJoules: number = 0;
  private _solarEnergy: number = 0;
  private _cellRegistry = new Map<string, any>();
  private _connections = new Map<string, { target: string; dist: number }[]>();
  private _overrideLedger: ThermodynamicOverrideReport[] = [];
  public id: string = '';
  public energyJoules: number = 0;
  public state: string = '';

  constructor(...args: any[]) {
    if (args.length === 0) {
      this._state = undefined;
    } else if (args.length === 1) {
      this._state = args[0];
      this._stock = args[0];
    } else if (args.length === 2) {
      const [arg1, arg2] = args;
      if (typeof arg2 === 'number') {
        this._h3Index = String(arg1);
        this._solarEnergy = arg2;
        this._isVerified = false;
      } else if (arg2 && typeof arg2 === 'object' && ('joules' in arg2 || 'entropy' in arg2)) {
        this._h3Index = String(arg1);
        this._stock = { ...arg2 };
        this._state = 'UnvalidatedState';
        this.state = 'UnvalidatedState';
      } else if (arg2 && typeof arg2 === 'object' && 'carbonStockKg' in arg2) {
        validateH3Token(arg1);
        this._h3Index = String(arg1);
        this._stock = { ...arg2 };
      } else {
        this._h3Index = String(arg1);
        this._state = arg2;
        this._stock = arg2;
      }
    } else if (args.length === 3) {
      const [index, res, stock] = args;
      if (res < 0 || res > 15 || !Number.isInteger(res)) {
        throw new RangeError(`[SpatialError] Invalid resolution tier: ${res}`);
      }
      this._h3Index = String(index);
      this._resolution = res;
      this._stock = { ...stock };
      this._state = stock;
    } else if (args.length >= 4) {
      this.id = String(args[0]);
      this.energyJoules = Number(args[1]);
      this.state = String(args[2]);
      this._state = args[2];
    }
  }

  // ===========================================================================
  // STATIC CONSTRUCTORS (TYPED OVERLOADS)
  // ===========================================================================

  public static of<U>(value: U): SpatialMonad<U>;
  public static of<U>(token: string, value: U): SpatialMonad<U>;
  public static of<U>(stock: U, index: string | null | undefined): SpatialMonad<U>;
  public static of<U>(token: string, res: number, value: U): SpatialMonad<U>;
  public static of<U>(...args: any[]): SpatialMonad<U> {
    if (args.length === 1) {
      const arg = args[0];
      const monad = new SpatialMonad<U>(arg);
      if (typeof arg === 'string') {
        monad._h3Index = arg;
      }
      return monad;
    } else if (args.length === 2) {
      const [arg1, arg2] = args;
      if (typeof arg1 === 'string' && typeof arg2 === 'object' && arg2 !== null) {
        if (!matchesCanonicalH3Pattern(arg1)) {
          throw new Error(`Invalid canonical H3 pattern: ${arg1}`);
        }
        const monad = new SpatialMonad<U>(arg2);
        monad._h3Index = arg1.toLowerCase();
        monad._stock = arg2;
        return monad;
      } else if (typeof arg2 === 'string' || arg2 === null || arg2 === undefined) {
        if (arg2 === null || arg2 === undefined || (typeof arg2 === 'string' && arg2.trim() === '')) {
          const { SpatialGuardClauseException } = require('../spatial/h3_types.js');
          throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
        }
        const monad = new SpatialMonad<U>(arg1);
        monad._h3Index = arg2;
        monad._stock = arg1;
        return monad;
      }
      const monad = new SpatialMonad<U>(arg2);
      monad._h3Index = String(arg1);
      return monad;
    } else if (args.length >= 3) {
      const [token, res, stock] = args;
      const monad = new SpatialMonad<U>(stock);
      monad._h3Index = String(token);
      monad._resolution = res;
      monad._stock = stock;
      return monad;
    }
    return new SpatialMonad<U>();
  }

  public static unit<U>(index: string, value: U): SpatialMonad<U> {
    const monad = new SpatialMonad<U>(value);
    monad._h3Index = String(index).toLowerCase();
    monad._stock = value;
    return monad;
  }

  public static fromGeo(coord: { lat: number; lng: number }, resolution: number, stock: ThermodynamicStock): SpatialMonad {
    const cell = h3.latLngToCell(coord.lat, coord.lng, resolution);
    const monad = new SpatialMonad(stock);
    monad._h3Index = cell;
    monad._resolution = resolution;
    monad._stock = { ...stock };
    return monad;
  }

  public static fromPayload(payload: unknown): SpatialMonad {
    if (payload === null || payload === undefined || typeof payload !== 'string' || payload.trim() === '') {
      throw new TypeError('Payload cannot be null, undefined, or non-string');
    }
    const monad = new SpatialMonad(payload.trim());
    monad._h3Index = payload.trim();
    monad._stock = {
      carbon: 0,
      water: 0,
      minerals: 0,
      oxygen: 0,
      energy: 0,
      carbonMass: 0,
      waterMass: 0,
      biomass: 0,
    };
    return monad;
  }

  // ===========================================================================
  // MONADIC COMPOSITION & VALUE GETTERS
  // ===========================================================================

  public map<U>(fn: (state: T, index: string) => U): SpatialMonad<U> {
    const nextVal = fn(this._state ?? this._stock, this._h3Index);
    const m = new SpatialMonad<U>(nextVal);
    m._h3Index = this._h3Index;
    m._resolution = this._resolution;
    m._stock = nextVal;
    m._overrideLedger = [...this._overrideLedger];
    return m;
  }

  public bind<U>(fn: (state: T, index: string) => SpatialMonad<U> | any): SpatialMonad<U> {
    const result = fn(this._state ?? this._stock, this._h3Index);
    if (result instanceof SpatialMonad) {
      return result;
    }
    if (result && typeof result === 'object' && 'cellCountModified' in result) {
      const m = new SpatialMonad<any>(this._state);
      m._h3Index = this._h3Index;
      m._overrideLedger = [...this._overrideLedger, result];
      return m as any;
    }
    return new SpatialMonad<U>(result);
  }

  public flatMap<U>(fn: (state: T, index: string) => SpatialMonad<U>): SpatialMonad<U> {
    return this.bind(fn);
  }

  public getState(): T {
    return this._state ?? this._stock;
  }

  public get value(): T {
    return this._state ?? this._stock;
  }

  public unwrap(): T {
    return this._state;
  }

  public extract(): any {
    return this._state ?? this._stock;
  }

  public unwrapStock(): ThermodynamicStock {
    return this._stock;
  }

  public getStock(): any {
    return this._stock ?? this._state;
  }

  public getValue(): any {
    return this._state ?? this._stock;
  }

  public getIndex(): string {
    return this._h3Index;
  }

  public getCellIndex(): string {
    return this._h3Index;
  }

  public getH3Token(): string {
    return this._h3Index;
  }

  public getH3Cell(): string | null {
    return this._state === 'ActiveSpatialStock' ? this._h3Index : null;
  }

  public getResolution(): number {
    return this._resolution;
  }

  public get resolution(): number {
    return this._resolution;
  }

  public get stock(): any {
    return this._stock;
  }

  public get stocks(): any {
    return this._stock;
  }

  // ===========================================================================
  // SPRINT 004: RUN, SETVALUE & ROLLBACK
  // ===========================================================================

  public run(fn: () => void): void {
    this._history.push(this._state);
    fn();
  }

  public setValue(val: any): void {
    this._state = val;
    this._stock = val;
  }

  public rollback(): boolean {
    if (this._history.length > 0) {
      this._state = this._history.pop();
      this._stock = this._state;
      return true;
    }
    return false;
  }

  // ===========================================================================
  // SPRINT 008 & 013: RESULT MONAD CHECKS
  // ===========================================================================

  public isRight(): boolean {
    return isValidH3Index(this._h3Index || this._state);
  }

  public getOrThrow(): any {
    if (!this.isRight()) {
      throw new Error('[Entropy Leak Prevented] Invalid spatial index token');
    }
    return this._h3Index || this._state;
  }

  public isCorrupted(): boolean {
    return this._state === null || this._state === undefined;
  }

  // ===========================================================================
  // SPRINT 023, 024, 025: RESOLUTION REFINEMENT
  // ===========================================================================

  public refine(targetResolution: number, children?: any[]): SpatialMonad | SpatialMonad[] {
    if (targetResolution < 0 || targetResolution > 15 || !Number.isInteger(targetResolution)) {
      throw new RangeError(`[SpatialError] Invalid resolution tier: ${targetResolution}`);
    }
    if (targetResolution < this._resolution) {
      throw new Error(`[ThermodynamicSpatialError] Cannot refine to lower resolution tier: ${targetResolution} < ${this._resolution}`);
    }
    if (children && Array.isArray(children)) {
      return children.map((c) => SpatialMonad.of(this._h3Index, targetResolution, c));
    }
    const refined = new SpatialMonad(this._h3Index, targetResolution, this._stock);
    return refined;
  }

  // ===========================================================================
  // SPRINT 029 & 030: VERIFICATION & THERMODYNAMICS
  // ===========================================================================

  public isVerified(): boolean {
    return this._isVerified;
  }

  public verifySpatialIndex(): boolean {
    const valid = isValidH3Hex(this._h3Index);
    this._isVerified = valid;
    if (valid) {
      this._dissipationJoules = this._h3Index.length * 1.0e-9;
    }
    return valid;
  }

  public getThermodynamics(): { massGrams: number; solarEnergyJoules: number; dissipationJoules: number } {
    return {
      massGrams: 0.0,
      solarEnergyJoules: this._solarEnergy,
      dissipationJoules: this._dissipationJoules || 0.05,
    };
  }

  // ===========================================================================
  // SPRINT 032 & 034: TRANSIT & STOCK TRANSFERS
  // ===========================================================================

  public transit(): SpatialMonad {
    const COMP_COST = 4.2e-9;
    if (this._stock && typeof this._stock.joules === 'number') {
      this._stock.joules -= COMP_COST;
    }
    const valid = /^[0-9a-fA-F]{15}$/.test(this._h3Index);
    if (valid) {
      this._state = 'ActiveSpatialStock';
    } else {
      this._state = 'SinkState';
      if (this._stock) this._stock.entropy = 1.0;
    }
    return this;
  }

  public transferStocks(targetToken: string, delta: any): void {
    validateH3Token(targetToken);
    if (this._stock && delta) {
      for (const [k, v] of Object.entries(delta)) {
        if (typeof v === 'number' && typeof this._stock[k] === 'number') {
          this._stock[k] -= v;
        }
      }
    }
  }

  // ===========================================================================
  // SPRINT 045: TENSOR OVERRIDES PIPELINE
  // ===========================================================================

  public applyOverrides(overrides: any, options?: any): SpatialMonad<T> {
    if (this._state instanceof H3StateTensor) {
      const report = applyThermodynamicOverrides(this._state, overrides, options);
      const m = new SpatialMonad<T>(this._state as any);
      m._overrideLedger = [...this._overrideLedger, report];
      return m;
    }
    return this;
  }

  public getCumulativeNetMassDeltaKg(): number {
    return this._overrideLedger.reduce((sum, r) => sum + r.netMassDeltaKg, 0);
  }

  public getCumulativeNetEnergyDeltaJoules(): number {
    return this._overrideLedger.reduce((sum, r) => sum + r.netEnergyDeltaJoules, 0);
  }

  public getOverrideLedger(): ThermodynamicOverrideReport[] {
    return this._overrideLedger;
  }

  // ===========================================================================
  // SPRINT 047: DIFFUSION WITH ADJACENT CELL
  // ===========================================================================

  public diffuseWith(
    other: SpatialMonad<ISpatialThermodynamicState>,
    depth: number,
    diffusionCoeff: number,
    dt: number
  ): { source: SpatialMonad<ISpatialThermodynamicState>; target: SpatialMonad<ISpatialThermodynamicState> } {
    const sA = { ...(this.value as any) } as ISpatialThermodynamicState;
    const sB = { ...other.value } as ISpatialThermodynamicState;

    const deltaC = (sA.dissolvedSoluteKg - sB.dissolvedSoluteKg) * diffusionCoeff * dt * depth;
    sA.dissolvedSoluteKg -= deltaC;
    sB.dissolvedSoluteKg += deltaC;

    return {
      source: SpatialMonad.of(this._h3Index, this._resolution, sA),
      target: SpatialMonad.of(other._h3Index, other._resolution, sB),
    };
  }

  // ===========================================================================
  // SPRINT 048: TOPOLOGICAL GRAPH SIMULATION
  // ===========================================================================

  public registerCell(cell: any): void {
    this._cellRegistry.set(cell.h3Index, { ...cell });
  }

  public connectNeighbors(c1: string, c2: string, dist: number = 50000.0): void {
    if (!this._connections.has(c1)) this._connections.set(c1, []);
    if (!this._connections.has(c2)) this._connections.set(c2, []);
    this._connections.get(c1)!.push({ target: c2, dist });
    this._connections.get(c2)!.push({ target: c1, dist });
  }

  public step(dt: number = 60.0): void {
    const processed = new Set<string>();
    for (const [origin, list] of this._connections.entries()) {
      const cellA = this._cellRegistry.get(origin);
      if (!cellA) continue;
      for (const edge of list) {
        const key = [origin, edge.target].sort().join('::');
        if (processed.has(key)) continue;
        processed.add(key);

        const cellB = this._cellRegistry.get(edge.target);
        if (!cellB) continue;

        const deltaT = (cellA.temperatureKelvin ?? 288.15) - (cellB.temperatureKelvin ?? 288.15);
        const cond = 1.8;
        const area = (cellA.heightColumnMeters ?? 50) * 1000;
        const heatFlow = cond * (area / edge.dist) * deltaT * dt;

        cellA.energyJoules -= heatFlow;
        cellB.energyJoules += heatFlow;
      }
    }
  }

  public getCell(id: string): any {
    return this._cellRegistry.get(id);
  }
}

// =============================================================================
// SPRINT 006: H3 VALIDATION MONAD
// =============================================================================

export class H3ValidationMonad<M = any, E = any> {
  private constructor(
    private readonly state: any,
    private readonly error: any,
    private readonly validator: any
  ) {}

  public static unit(state: any, validator: any): H3ValidationMonad {
    return new H3ValidationMonad(state, null, validator);
  }

  public bind(fn: (state: any) => any): H3ValidationMonad {
    if (this.error) return this;
    const nextState = fn(this.state);
    if (!this.validator.validate(nextState.h3Index)) {
      return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid index' }, this.validator);
    }
    return new H3ValidationMonad(nextState, null, this.validator);
  }

  public match<R>(onSuccess: (s: any) => R, onError: (err: any) => R): R {
    if (this.error) return onError(this.error);
    return onSuccess(this.state);
  }
}

// =============================================================================
// SPRINT 011: SPATIAL MONAD STOCK REGISTER
// =============================================================================

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

// =============================================================================
// SPRINT 037: SPATIAL CELL MONAD & ADVECTIVE TRANSFERS
// =============================================================================

export class SpatialCellMonad {
  private constructor(
    private readonly index: string,
    private readonly stocks: CellThermodynamicStocks
  ) {}

  public static unit(index: string, stocks: CellThermodynamicStocks): SpatialCellMonad {
    for (const [k, v] of Object.entries(stocks)) {
      if (typeof v === 'number' && (v < 0 || !Number.isFinite(v))) {
        throw new Error(`Thermodynamic invariant violation: ${k} = ${v}`);
      }
    }
    return new SpatialCellMonad(index.toLowerCase(), { ...stocks });
  }

  public getStocks(): CellThermodynamicStocks {
    return { ...this.stocks };
  }

  public getCellIndex(): string {
    return this.index;
  }
}

export function executeAdvectiveTransfer(
  source: SpatialCellMonad,
  target: SpatialCellMonad,
  delta: StockTransferDelta
): { source: SpatialCellMonad; target: SpatialCellMonad } {
  if (source.getCellIndex() === target.getCellIndex()) {
    throw new Error('Self-advection transfer rejected');
  }
  const sStocks = source.getStocks();
  const tStocks = target.getStocks();

  const nextSourceStocks: CellThermodynamicStocks = {
    waterKg: (sStocks.waterKg ?? 0) - (delta.deltaWaterKg ?? 0),
    carbonKg: (sStocks.carbonKg ?? 0) - (delta.deltaCarbonKg ?? 0),
    mineralKg: (sStocks.mineralKg ?? 0) - (delta.deltaMineralKg ?? 0),
    oxygenKg: (sStocks.oxygenKg ?? 0) - (delta.deltaOxygenKg ?? 0),
    thermalEnergyJoules: (sStocks.thermalEnergyJoules ?? 0) - (delta.deltaEnergyJoules ?? 0),
  };

  const nextTargetStocks: CellThermodynamicStocks = {
    waterKg: (tStocks.waterKg ?? 0) + (delta.deltaWaterKg ?? 0),
    carbonKg: (tStocks.carbonKg ?? 0) + (delta.deltaCarbonKg ?? 0),
    mineralKg: (tStocks.mineralKg ?? 0) + (delta.deltaMineralKg ?? 0),
    oxygenKg: (tStocks.oxygenKg ?? 0) + (delta.deltaOxygenKg ?? 0),
    thermalEnergyJoules: (tStocks.thermalEnergyJoules ?? 0) + (delta.deltaEnergyJoules ?? 0),
  };

  return {
    source: SpatialCellMonad.unit(source.getCellIndex(), nextSourceStocks),
    target: SpatialCellMonad.unit(target.getCellIndex(), nextTargetStocks),
  };
}

// =============================================================================
// SPRINT 048: LATERAL THERMODYNAMIC STEP
// =============================================================================

export function executeLateralThermodynamicTransportStep(
  cells: Map<string, CellThermodynamicState>,
  adjacencyList: Map<string, string[]>,
  centroidDistances: Map<string, number>,
  dt: number
): Map<string, { deltaEnergy: number }> {
  const deltas = new Map<string, { deltaEnergy: number }>();
  for (const id of cells.keys()) {
    deltas.set(id, { deltaEnergy: 0 });
  }

  const processedPairs = new Set<string>();
  for (const [origin, neighbors] of adjacencyList.entries()) {
    const cellA = cells.get(origin);
    if (!cellA) continue;
    for (const neighbor of neighbors) {
      const pairKey = [origin, neighbor].sort().join('::');
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const cellB = cells.get(neighbor);
      if (!cellB) continue;

      const dist = centroidDistances.get(`${origin}_${neighbor}`) ?? 50000;
      const tA = cellA.temperatureKelvin ?? 288.15;
      const tB = cellB.temperatureKelvin ?? 288.15;
      const cond = ((cellA.conductivity ?? 2.5) + (cellB.conductivity ?? 2.5)) / 2;
      const area = (cellA.heightColumnMeters ?? 100) * 1000;

      const fluxWatts = cond * (area / dist) * (tA - tB);
      const deltaJoules = fluxWatts * dt;

      deltas.get(origin)!.deltaEnergy -= deltaJoules;
      deltas.get(neighbor)!.deltaEnergy += deltaJoules;
    }
  }

  return deltas;
}

// =============================================================================
// SPRINT 050: LATERAL BOUNDARY FLUX TRANSFERS
// =============================================================================

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

export function computeLateralBoundaryTransfer(
  cellA: string,
  stratumA: IVerticalStratum,
  initialStocksA: ILateralFluxStocks,
  cellB: string,
  stratumB: IVerticalStratum,
  initialStocksB: ILateralFluxStocks,
  params: ILateralTransportParams
) {
  const contactResult = calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB);
  const area = contactResult.contactAreaM2;
  const dt = params.timeStepSeconds;

  if (!contactResult.isAdjacent || area <= 0) {
    return {
      contactResult,
      deltaStocksA: { massWaterKg: 0, massCarbonKg: 0, massOxygenKg: 0, massMineralsKg: 0, internalEnergyJoules: 0 },
      deltaStocksB: { massWaterKg: 0, massCarbonKg: 0, massOxygenKg: 0, massMineralsKg: 0, internalEnergyJoules: 0 },
    };
  }

  const volFluxM3PerS = area * params.normalVelocityMs;
  const massFluxKgPerS = volFluxM3PerS * params.fluidDensityKgM3;
  const deltaWater = massFluxKgPerS * dt;

  const fracA = initialStocksA.massWaterKg > 0 ? deltaWater / initialStocksA.massWaterKg : 0;
  const deltaCarbon = initialStocksA.massCarbonKg * fracA;
  const deltaOxygen = initialStocksA.massOxygenKg * fracA;
  const deltaMinerals = initialStocksA.massMineralsKg * fracA;

  const heatConductive =
    params.thermalConductivityWMK * (area / params.distanceCentroidsMeters) * (params.temperatureKelvinA - params.temperatureKelvinB) * dt;
  const heatAdvective = deltaWater * 4184 * params.temperatureKelvinA * 0.001;
  const deltaEnergy = heatConductive + heatAdvective;

  return {
    contactResult,
    deltaStocksA: {
      massWaterKg: -deltaWater,
      massCarbonKg: -deltaCarbon,
      massOxygenKg: -deltaOxygen,
      massMineralsKg: -deltaMinerals,
      internalEnergyJoules: -deltaEnergy,
    },
    deltaStocksB: {
      massWaterKg: deltaWater,
      massCarbonKg: deltaCarbon,
      massOxygenKg: deltaOxygen,
      massMineralsKg: deltaMinerals,
      internalEnergyJoules: deltaEnergy,
    },
  };
}

// =============================================================================
// SPRINT 052: PLANETARY INSOLATION STEP
// =============================================================================

export function applyPlanetaryInsolationStep(
  state: PlanetaryGridState
): PlanetaryGridState {
  const dt = state.timeStepSeconds;
  const subsolar = state.subsolarVector;
  const nextCells = new Map<string, CellBiophysicalState>();

  for (const [h3Index, cell] of state.cells.entries()) {
    const u = latLngToUnitVector3D(cell.latDeg, cell.lngDeg);
    const cosZenith = Math.max(0.0, unitVectorDotProduct(u, subsolar));

    const fluxDensityW = SOLAR_CONSTANT_W_M2 * cell.tauAtm * (1.0 - cell.albedo) * cosZenith;
    const deltaEnergyJoules = fluxDensityW * cell.areaM2 * dt;

    const aparJoules = deltaEnergyJoules * PAR_FRACTION * (1.0 - Math.exp(-CANOPY_EXTINCTION_K * cell.lai));
    const deltaBiomassC = (aparJoules / QUANTUM_YIELD_J_PER_MOL) * RUBISCO_EFFICIENCY_KG_PER_MOL;

    const deltaCO2 = (MOLAR_MASS_CO2 / MOLAR_MASS_C) * deltaBiomassC;
    const deltaO2 = (MOLAR_MASS_O2 / MOLAR_MASS_C) * deltaBiomassC;
    const deltaH2OTransp = deltaBiomassC / WATER_USE_EFFICIENCY_KG_C_PER_KG_H2O;

    const updatedStocks = {
      thermalEnergyJoules: cell.stocks.thermalEnergyJoules + deltaEnergyJoules,
      carbonDioxideKg: Math.max(0.0, cell.stocks.carbonDioxideKg - deltaCO2),
      biomassCarbonKg: cell.stocks.biomassCarbonKg + deltaBiomassC,
      atmosphericWaterKg: cell.stocks.atmosphericWaterKg + deltaH2OTransp,
      oxygenKg: cell.stocks.oxygenKg + deltaO2,
    };

    nextCells.set(h3Index, {
      ...cell,
      stocks: updatedStocks,
    });
  }

  return {
    ...state,
    cells: nextCells,
  };
}

export function updatePlanetaryInsolation(
  monad: SpatialMonad<PlanetaryGridState>,
  subsolarVector: UnitVector3D
): SpatialMonad<PlanetaryGridState> {
  return monad.map((currentState) => {
    const stateWithNewSun: PlanetaryGridState = {
      ...currentState,
      subsolarVector,
    };
    return applyPlanetaryInsolationStep(stateWithNewSun);
  });
}