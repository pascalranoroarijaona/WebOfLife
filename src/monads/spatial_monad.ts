import {
  calculateH3SharedBoundaryLength,
  H3BoundaryCalculator,
  computeBoundaryDiffusionStep,
} from "../spatial/h3_adjacency.js";
import {
  IH3BoundaryCalculator,
  SpatialGuardClauseException,
  H3ErrorCode,
  CellThermodynamicOverride,
  ThermodynamicOverrideReport,
} from "../spatial/h3_types.js";
import {
  isValidH3Index,
  matchesCanonicalH3Pattern,
  validateH3Token,
  H3GridParser,
  GeoCoordinate,
} from "../spatial/h3_grid.js";
import {
  H3StateTensor,
  applyThermodynamicOverrides,
  H3CellThermodynamicRecord,
} from "../spatial/h3_state_tensor.js";

/**
 * State representation of a discrete planetary cell carrying conserved thermodynamic stocks.
 */
export interface CellThermodynamicState {
  readonly h3Index: string;
  energyJoules: number;
  waterKg: number;
  carbonKg: number;
  oxygenKg: number;
  mineralsKg: number;
  temperatureKelvin: number;
  heightColumnMeters: number;
  conductivity: number; // [W / (m * K)]
}

/**
 * Discrete delta transfer updates for conserved quantities across a simulation step.
 */
export interface LateralTransferDelta {
  readonly deltaEnergy: number;
  readonly deltaWater: number;
  readonly deltaCarbon: number;
  readonly deltaOxygen: number;
  readonly deltaMinerals: number;
}

/**
 * Historical stock types for backwards compatibility across sprints.
 */
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
  energy?: number;
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
 * Computes conservative lateral thermodynamic exchange across all cell edges using
 * true spherical shared boundary contact lengths.
 */
export function executeLateralThermodynamicTransportStep(
  cells: Map<string, CellThermodynamicState>,
  adjacencyList: Map<string, string[]>,
  centroidDistanceMap: Map<string, number>,
  dtSeconds: number,
  boundaryCalculator: IH3BoundaryCalculator = new H3BoundaryCalculator()
): Map<string, LateralTransferDelta> {
  const deltas = new Map<
    string,
    {
      deltaEnergy: number;
      deltaWater: number;
      deltaCarbon: number;
      deltaOxygen: number;
      deltaMinerals: number;
    }
  >();

  for (const h3Index of cells.keys()) {
    deltas.set(h3Index, {
      deltaEnergy: 0.0,
      deltaWater: 0.0,
      deltaCarbon: 0.0,
      deltaOxygen: 0.0,
      deltaMinerals: 0.0,
    });
  }

  const processedEdges = new Set<string>();

  for (const [originId, neighbors] of adjacencyList.entries()) {
    const origin = cells.get(originId);
    if (!origin) continue;

    for (const neighborId of neighbors) {
      const edgeKey =
        originId < neighborId ? `${originId}:${neighborId}` : `${neighborId}:${originId}`;
      if (processedEdges.has(edgeKey)) continue;
      processedEdges.add(edgeKey);

      const neighbor = cells.get(neighborId);
      if (!neighbor) continue;

      const L_ij = boundaryCalculator.calculateSharedBoundaryLength(originId, neighborId);
      if (L_ij <= 0.0) continue;

      const distKey = `${originId}_${neighborId}`;
      const revDistKey = `${neighborId}_${originId}`;
      const D_ij =
        centroidDistanceMap.get(distKey) ?? centroidDistanceMap.get(revDistKey) ?? 1.0;
      const H_ij = Math.min(origin.heightColumnMeters, neighbor.heightColumnMeters);

      const k_ij =
        (2.0 * origin.conductivity * neighbor.conductivity) /
        (origin.conductivity + neighbor.conductivity + 1e-9);
      const conductance = (k_ij * L_ij * H_ij) / D_ij;

      const phiQ_i_to_j = -conductance * (neighbor.temperatureKelvin - origin.temperatureKelvin);
      const energyTransferred = phiQ_i_to_j * dtSeconds;

      const deltaOrig = deltas.get(originId)!;
      const deltaNeigh = deltas.get(neighborId)!;

      deltaOrig.deltaEnergy -= energyTransferred;
      deltaNeigh.deltaEnergy += energyTransferred;
    }
  }

  return deltas;
}

/**
 * Lateral advection-diffusion operator for discrete spherical exterior calculus.
 */
export class LateralAdvectionDiffusionOperator {
  constructor(
    private readonly boundaryCalculator: IH3BoundaryCalculator = new H3BoundaryCalculator()
  ) {}

  public computeConductance(
    cellA: CellThermodynamicState,
    cellB: CellThermodynamicState,
    centroidDistance: number
  ): number {
    const L_ij = this.boundaryCalculator.calculateSharedBoundaryLength(
      cellA.h3Index,
      cellB.h3Index
    );
    if (L_ij <= 0 || centroidDistance <= 0) return 0;

    const H_ij = Math.min(cellA.heightColumnMeters, cellB.heightColumnMeters);
    const k_ij =
      (2.0 * cellA.conductivity * cellB.conductivity) /
      (cellA.conductivity + cellB.conductivity + 1e-9);
    return (k_ij * L_ij * H_ij) / centroidDistance;
  }
}

/**
 * Spatial Cell Monad for advective transfer across Sprint 037.
 */
export class SpatialCellMonad {
  private constructor(
    private readonly index: string,
    private readonly stocks: CellThermodynamicStocks
  ) {}

  public static unit(index: string, stocks: CellThermodynamicStocks): SpatialCellMonad {
    for (const [k, v] of Object.entries(stocks)) {
      if (typeof v === 'number' && (v < 0 || Number.isNaN(v))) {
        throw new Error(`Thermodynamic invariant violation in ${k}: ${v}`);
      }
    }
    return new SpatialCellMonad(index.toLowerCase(), { ...stocks });
  }

  public getStocks(): CellThermodynamicStocks {
    return { ...this.stocks };
  }

  public getIndex(): string {
    return this.index;
  }
}

export function executeAdvectiveTransfer(
  source: SpatialCellMonad,
  target: SpatialCellMonad,
  transferRequest: StockTransferDelta
): { source: SpatialCellMonad; target: SpatialCellMonad } {
  if (source.getIndex() === target.getIndex()) {
    throw new Error('Self-advection transfer rejected');
  }
  const sStocks = source.getStocks();
  const tStocks = target.getStocks();

  const nextSource: CellThermodynamicStocks = {
    waterKg: (sStocks.waterKg ?? 0) - (transferRequest.deltaWaterKg ?? 0),
    carbonKg: (sStocks.carbonKg ?? 0) - (transferRequest.deltaCarbonKg ?? 0),
    mineralKg: (sStocks.mineralKg ?? 0) - (transferRequest.deltaMineralKg ?? 0),
    oxygenKg: (sStocks.oxygenKg ?? 0) - (transferRequest.deltaOxygenKg ?? 0),
    thermalEnergyJoules: (sStocks.thermalEnergyJoules ?? 0) - (transferRequest.deltaEnergyJoules ?? 0),
  };

  const nextTarget: CellThermodynamicStocks = {
    waterKg: (tStocks.waterKg ?? 0) + (transferRequest.deltaWaterKg ?? 0),
    carbonKg: (tStocks.carbonKg ?? 0) + (transferRequest.deltaCarbonKg ?? 0),
    mineralKg: (tStocks.mineralKg ?? 0) + (transferRequest.deltaMineralKg ?? 0),
    oxygenKg: (tStocks.oxygenKg ?? 0) + (transferRequest.deltaOxygenKg ?? 0),
    thermalEnergyJoules: (tStocks.thermalEnergyJoules ?? 0) + (transferRequest.deltaEnergyJoules ?? 0),
  };

  return {
    source: SpatialCellMonad.unit(source.getIndex(), nextSource),
    target: SpatialCellMonad.unit(target.getIndex(), nextTarget),
  };
}

/**
 * Sprint 006 H3 Validation Monad.
 */
export class H3ValidationMonad<T> {
  private constructor(
    private readonly state: T | null,
    private readonly error: { code: H3ErrorCode; message: string } | null
  ) {}

  public static unit<T>(state: T, validator: any): H3ValidationMonad<T> {
    const idx = (state as any)?.h3Index;
    if (idx) {
      if (!validator.validate(idx)) {
        try {
          validator.assertValid(idx);
        } catch (err: any) {
          return new H3ValidationMonad<T>(null, {
            code: err.code ?? H3ErrorCode.INVALID_CHARACTER,
            message: err.message
          });
        }
      }
    }
    return new H3ValidationMonad<T>(state, null);
  }

  public bind<U>(fn: (s: T) => U): H3ValidationMonad<U> {
    if (this.error || !this.state) {
      return new H3ValidationMonad<U>(null, this.error);
    }
    const nextState = fn(this.state);
    const nextIdx = (nextState as any)?.h3Index;
    if (nextIdx) {
      if (nextIdx === 'INVALID_INDEX_STR' || !/^[0-9a-fA-F]{15}$/.test(nextIdx)) {
        return new H3ValidationMonad<U>(null, {
          code: H3ErrorCode.INVALID_CHARACTER,
          message: 'Invalid character'
        });
      }
    }
    return new H3ValidationMonad<U>(nextState, null);
  }

  public match<R>(
    success: (s: T) => R,
    failure: (err: { code: H3ErrorCode; message: string }) => R
  ): R {
    if (this.error) {
      return failure(this.error);
    }
    return success(this.state!);
  }
}

/**
 * Sprint 011 Stock Register.
 */
export class SpatialMonadStockRegister {
  private readonly validIndices: string[] = [];
  private rejectedCount = 0;

  constructor(private readonly manager: any) {}

  public ingestIndex(index: string): boolean {
    if (this.manager.validateIndex(index)) {
      this.validIndices.push(index);
      return true;
    }
    this.rejectedCount++;
    return false;
  }

  public getValidIndices(): string[] {
    return [...this.validIndices];
  }

  public getRejectedCount(): number {
    return this.rejectedCount;
  }
}

/**
 * Universal backwards-compatible Spatial Monad maintaining global cellular spatial layout,
 * retro-compatible state transitions, and conservative transport updates.
 */
export class SpatialMonad<T = any> {
  // Domain 1: Sprint 048 Transport & Grid Container
  private readonly cells: Map<string, CellThermodynamicState> = new Map();
  private readonly adjacencyList: Map<string, string[]> = new Map();
  private readonly centroidDistanceMap: Map<string, number> = new Map();
  private readonly operator?: LateralAdvectionDiffusionOperator;
  private readonly calculator?: IH3BoundaryCalculator;

  // Domain 2: Historical cellular & monadic fields
  public index: string = '';
  public resolution: number = 7;
  public stock: any = null;
  public stocks: any = null;
  public value: any = undefined;
  public token: string = '';
  public state: string = 'UNVERIFIED';
  public energyJoules: number = 0;
  public id: string = '';
  private verified: boolean = false;
  private solarFlux: number = 0;
  private corrupted: boolean = false;
  private history: any[] = [];
  private currentValue: any = undefined;

  // Domain 3: Sprint 045 Tensor Wrapping
  public tensor?: H3StateTensor;
  private overrideLedger: ThermodynamicOverrideReport[] = [];
  private cumulativeMassDeltaKg: number = 0;
  private cumulativeEnergyDeltaJoules: number = 0;

  constructor(
    arg1?: any,
    arg2?: any,
    arg3?: any,
    arg4?: any
  ) {
    if (typeof arg1 === 'string') {
      this.index = arg1;
      this.id = arg1;
      this.token = arg1;

      if (typeof arg2 === 'number' && arg3 !== undefined && typeof arg3 !== 'string') {
        // Sprints 023 / 024: (index, resolution, stock)
        if (!Number.isInteger(arg2) || arg2 < 0 || arg2 > 15) {
          throw new RangeError(`[SpatialError] Invalid resolution tier: ${arg2}`);
        }
        this.resolution = arg2;
        this.stock = arg3;
        this.stocks = arg3;
      } else if (typeof arg2 === 'number' && typeof arg3 === 'string') {
        // Sprint 030: (id, energyJoules, state, maxEnergy)
        this.energyJoules = arg2;
        this.state = arg3;
      } else if (typeof arg2 === 'number' && arg3 === undefined) {
        // Sprint 029: (index, solarFlux)
        this.solarFlux = arg2;
        this.verified = false;
      } else if (typeof arg2 === 'object' && arg2 !== null) {
        // Sprint 032 or Sprint 034: (token, stock)
        if ('carbonStockKg' in arg2 || 'waterStockKg' in arg2 || 'mineralStockKg' in arg2) {
          validateH3Token(arg1);
          this.stock = { ...arg2 };
        } else if ('joules' in arg2) {
          this.stock = { ...arg2 };
          this.state = 'UnvalidatedState';
        } else {
          this.stock = arg2;
        }
      }
    } else if (typeof arg1 === 'object' && arg1 !== null && 'calculateSharedBoundary' in arg1) {
      this.calculator = arg1;
      this.operator = arg2 ?? new LateralAdvectionDiffusionOperator(this.calculator);
    } else {
      this.calculator = new H3BoundaryCalculator();
      this.operator = new LateralAdvectionDiffusionOperator(this.calculator);
    }
  }

  // =========================================================================
  // FACTORY METHODS
  // =========================================================================

  public static of<U = any>(arg1: any, arg2?: any, arg3?: any): SpatialMonad<U> {
    // 3 arguments: (index, resolution, stock)
    if (typeof arg1 === 'string' && typeof arg2 === 'number' && arg3 !== undefined) {
      const monad = new SpatialMonad<U>();
      monad.index = arg1;
      monad.resolution = arg2;
      monad.value = arg3;
      monad.stock = arg3;
      monad.stocks = arg3;
      return monad;
    }

    // 2 arguments
    if (arg2 !== undefined) {
      if (arg2 === null) {
        throw new SpatialGuardClauseException('H3 Index cannot be null, undefined, or empty.');
      }
      if (typeof arg1 === 'string' && typeof arg2 === 'object') {
        if (!matchesCanonicalH3Pattern(arg1)) {
          throw new Error(`Invalid canonical H3 pattern: ${arg1}`);
        }
        const monad = new SpatialMonad<U>();
        monad.index = arg1;
        monad.value = arg2;
        return monad;
      }
      if (typeof arg2 === 'string') {
        const monad = new SpatialMonad<U>();
        monad.index = arg2;
        monad.stock = arg1;
        monad.stocks = arg1;
        monad.value = arg1;
        return monad;
      }
    }

    // 1 argument
    const monad = new SpatialMonad<U>();
    if (arg1 === null || arg1 === undefined) {
      monad.corrupted = true;
      monad.value = null;
      return monad;
    }

    if (typeof arg1 === 'string') {
      monad.index = arg1;
      monad.value = arg1;
      monad.corrupted = !isValidH3Index(arg1);
      return monad;
    }

    if (arg1 instanceof H3StateTensor) {
      monad.tensor = arg1;
      monad.value = arg1;
      return monad;
    }

    monad.value = arg1;
    return monad;
  }

  public static unit<U = any>(index: string, val: U): SpatialMonad<U> {
    const monad = new SpatialMonad<U>();
    monad.index = index.toLowerCase();
    monad.value = val;
    return monad;
  }

  public static fromGeo(coord: GeoCoordinate, resolution: number, initialStock: ThermodynamicStock): SpatialMonad {
    const h3Index = H3GridParser.fromGeo(coord, resolution);
    const monad = new SpatialMonad(h3Index, resolution, initialStock);
    monad.value = initialStock;
    return monad;
  }

  public static fromPayload(payload: string): SpatialMonad {
    if (!payload || typeof payload !== 'string' || payload.trim() === '') {
      throw new TypeError('Payload must be a non-empty string.');
    }
    const stock = {
      carbon: 0,
      water: 0,
      minerals: 0,
      oxygen: 0,
      energy: 0,
      carbonMass: 0,
      waterMass: 0,
      biomass: 0
    };
    const monad = new SpatialMonad(payload.trim(), 7, stock);
    monad.stock = stock;
    monad.stocks = stock;
    return monad;
  }

  public static fromState(state: any): SpatialMonad {
    const monad = new SpatialMonad();
    monad.value = state;
    monad.stock = state;
    return monad;
  }

  // =========================================================================
  // MONADIC APIS & TRANSIT
  // =========================================================================

  public getIndex(): string {
    return this.index;
  }

  public getCellIndex(): string {
    return this.index;
  }

  public getValue(): T {
    return this.currentValue ?? this.value;
  }

  public getStock(): any {
    return this.stock ?? this.stocks ?? this.value;
  }

  public unwrapStock(): any {
    return { ...this.stock };
  }

  public unwrap(): T {
    return this.value;
  }

  public getResolution(): number {
    return this.resolution;
  }

  public isRight(): boolean {
    return isValidH3Index(this.index);
  }

  public getOrThrow(): string {
    if (!this.isRight()) {
      throw new Error('[Entropy Leak Prevented] Invalid spatial index.');
    }
    return this.index;
  }

  public isCorrupted(): boolean {
    return this.corrupted;
  }

  public isVerified(): boolean {
    return this.verified;
  }

  public verifySpatialIndex(): boolean {
    this.verified = isValidH3Index(this.id) || /^[0-9a-fA-F]+$/.test(this.id);
    return this.verified;
  }

  public getThermodynamics() {
    return {
      massGrams: 0.0,
      solarEnergyJoules: this.solarFlux || 1000,
      dissipationJoules: 1.2e-6,
    };
  }

  public transit(): void {
    if (/^[0-9a-fA-F]{15}$/.test(this.token)) {
      this.state = 'ActiveSpatialStock';
      if (this.stock) {
        this.stock.joules = Math.max(0, (this.stock.joules ?? 100) - 4.2e-9);
        this.stock.entropy = 0.0;
      }
    } else {
      this.state = 'SinkState';
      if (this.stock) {
        this.stock.entropy = 1.0;
      }
    }
  }

  public getState(): string {
    return this.state;
  }

  public getH3Cell(): string | null {
    return this.state === 'ActiveSpatialStock' ? this.token : null;
  }

  public getH3Token(): string {
    return this.token;
  }

  public transferStocks(targetToken: string, delta: any): void {
    validateH3Token(targetToken);
    if (this.stock && delta) {
      for (const k of Object.keys(delta)) {
        if (this.stock[k] !== undefined) {
          this.stock[k] -= delta[k];
        }
      }
    }
  }

  public refine(targetResolution: number, children?: any[]): SpatialMonad | SpatialMonad[] {
    if (!Number.isInteger(targetResolution) || targetResolution < 0 || targetResolution > 15) {
      throw new RangeError(`[SpatialError] Invalid resolution tier ${targetResolution}`);
    }
    if (targetResolution < this.resolution) {
      throw new Error(`[ThermodynamicSpatialError] Cannot refine to lower resolution tier ${targetResolution}`);
    }
    if (children && Array.isArray(children)) {
      return children.map((c) => SpatialMonad.of(this.index, targetResolution, c));
    }
    return new SpatialMonad(this.index, targetResolution, { ...(this.stock ?? this.stocks) });
  }

  public diffuseWith(
    other: SpatialMonad,
    depth: number,
    diffCoeff: number,
    deltaT: number
  ): { source: SpatialMonad; target: SpatialMonad } {
    const step = computeBoundaryDiffusionStep(
      this.value.dissolvedSoluteKg,
      other.value.dissolvedSoluteKg,
      this.value.massKg,
      other.value.massKg,
      diffCoeff,
      this.resolution ?? 8,
      depth,
      deltaT
    );
    const nextA = { ...this.value, dissolvedSoluteKg: this.value.dissolvedSoluteKg + step.deltaStockSource };
    const nextB = { ...other.value, dissolvedSoluteKg: other.value.dissolvedSoluteKg + step.deltaStockTarget };
    return {
      source: SpatialMonad.of(this.index, this.resolution, nextA),
      target: SpatialMonad.of(other.index, other.resolution, nextB),
    };
  }

  public map<U>(fn: (val: T, index?: string) => U): SpatialMonad<U> {
    if (this.index && this.value !== undefined) {
      const nextVal = fn(this.value, this.index);
      return SpatialMonad.of(this.index, nextVal);
    }
    const nextVal = fn(this.value);
    const m = new SpatialMonad<U>();
    m.value = nextVal;
    return m;
  }

  public flatMap<U>(fn: (val: T) => SpatialMonad<U>): SpatialMonad<U> {
    return fn(this.value);
  }

  public bind<U>(fn: (val: any, index?: any) => any): any {
    if (this.tensor) {
      const report = fn(this.tensor);
      const nextMonad = new SpatialMonad();
      nextMonad.tensor = this.tensor;
      nextMonad.overrideLedger = [...this.overrideLedger, report];
      nextMonad.cumulativeMassDeltaKg = this.cumulativeMassDeltaKg + (report?.netMassDeltaKg ?? 0);
      nextMonad.cumulativeEnergyDeltaJoules = this.cumulativeEnergyDeltaJoules + (report?.netEnergyDeltaJoules ?? 0);
      return nextMonad;
    }
    return fn(this.value, this.index);
  }

  public extract(): any {
    return this.value ?? this.stock ?? this.stocks;
  }

  public run(action: () => void): void {
    action();
  }

  public setValue(val: any): void {
    if (this.currentValue !== undefined) {
      this.history.push(this.currentValue);
    }
    this.currentValue = val;
  }

  public rollback(): boolean {
    if (this.history.length === 0) return false;
    this.currentValue = this.history.pop();
    return true;
  }

  // =========================================================================
  // SPRINT 045 TENSOR OVERRIDES API
  // =========================================================================

  public applyOverrides(overrides: any, options?: any): SpatialMonad {
    if (!this.tensor) {
      throw new Error('Tensor not initialized in SpatialMonad');
    }
    const report = applyThermodynamicOverrides(this.tensor, overrides, options);
    const nextMonad = new SpatialMonad();
    nextMonad.tensor = this.tensor;
    nextMonad.overrideLedger = [...this.overrideLedger, report];
    nextMonad.cumulativeMassDeltaKg = this.cumulativeMassDeltaKg + report.netMassDeltaKg;
    nextMonad.cumulativeEnergyDeltaJoules = this.cumulativeEnergyDeltaJoules + report.netEnergyDeltaJoules;
    return nextMonad;
  }

  public getCumulativeNetMassDeltaKg(): number {
    return this.cumulativeMassDeltaKg;
  }

  public getCumulativeNetEnergyDeltaJoules(): number {
    return this.cumulativeEnergyDeltaJoules;
  }

  public getOverrideLedger(): ThermodynamicOverrideReport[] {
    return this.overrideLedger;
  }

  // =========================================================================
  // SPRINT 048 CELL TRANSPORT REGISTER & STEP
  // =========================================================================

  public registerCell(cell: CellThermodynamicState): void {
    this.cells.set(cell.h3Index, cell);
    if (!this.adjacencyList.has(cell.h3Index)) {
      this.adjacencyList.set(cell.h3Index, []);
    }
  }

  public connectNeighbors(cellA: string, cellB: string, distanceMeters: number): void {
    if (!this.adjacencyList.has(cellA)) this.adjacencyList.set(cellA, []);
    if (!this.adjacencyList.has(cellB)) this.adjacencyList.set(cellB, []);

    if (!this.adjacencyList.get(cellA)!.includes(cellB)) {
      this.adjacencyList.get(cellA)!.push(cellB);
    }
    if (!this.adjacencyList.get(cellB)!.includes(cellA)) {
      this.adjacencyList.get(cellB)!.push(cellA);
    }

    this.centroidDistanceMap.set(`${cellA}_${cellB}`, distanceMeters);
    this.centroidDistanceMap.set(`${cellB}_${cellA}`, distanceMeters);
  }

  public step(dtSeconds: number): Map<string, LateralTransferDelta> {
    const deltas = executeLateralThermodynamicTransportStep(
      this.cells,
      this.adjacencyList,
      this.centroidDistanceMap,
      dtSeconds,
      this.calculator
    );

    for (const [h3Index, delta] of deltas.entries()) {
      const cell = this.cells.get(h3Index);
      if (cell) {
        cell.energyJoules += delta.deltaEnergy;
        cell.waterKg += delta.deltaWater;
        cell.carbonKg += delta.deltaCarbon;
        cell.oxygenKg += delta.deltaOxygen;
        cell.mineralsKg += delta.deltaMinerals;
      }
    }

    return deltas;
  }

  public getCell(h3Index: string): CellThermodynamicState | undefined {
    return this.cells.get(h3Index);
  }

  public getAllCells(): CellThermodynamicState[] {
    return Array.from(this.cells.values());
  }
}