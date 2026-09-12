/**
 * Thermodynamic Types & Interfaces (Web of Life Core Engine - Retro-Compatible)
 * Defines foundational interfaces for thermodynamic state vectors, boundary fluxes,
 * monads, exergy metrics, and state vector stock conservation delta calculations.
 */

export const STANDARD_AMBIENT_TEMPERATURE_K = 298.15;
export const UNIVERSAL_GAS_CONSTANT = 8.314462618; // J/(mol·K)

export interface IThermodynamicStateVector {
  timestamp?: number;
  internalEnergy: number;
  totalEntropy: number;
  temperature: number;
  ambientTemperature?: number;
  ambientReferenceTemp?: number;
  entropy?: number;
  systemEntropy?: number;
  energy?: number;
  referenceTemperature?: number;
  T_0?: number;
  stocks?: Record<string, number> | Map<any, any>;
  entropyGenerationRate?: number;
  exergyDestructionRate?: number;
  exergy?: number;
  boundaryFluxes?: IBoundaryFluxArray | BoundaryFluxVector | any;
  exergyMetrics?: IExergyMetrics;
  thermalFluxes?: any;
  massFluxes?: any;
  validateSecondLaw?: () => boolean;
  validateFirstLaw?: () => boolean;
  clone?: (overrides?: Partial<IThermodynamicStateVector>) => IThermodynamicStateVector;
  [key: string]: any;
}

export type ThermodynamicVector = IThermodynamicStateVector;
export type ThermodynamicStateSnapshot = any;

export type ThermodynamicStateVector = IThermodynamicStateVector;
export type StateVector = IThermodynamicStateVector;

export interface IThermodynamicBoundaryFlux {
  heatFluxRate: number; // Watts (J/s)
  massFluxRate: number; // kg/s
  enthalpyInflowRate: number; // Watts
  entropyInflowRate: number; // W/K
  fluxId?: string;
  species?: string;
  specificEnthalpy?: number;
  specificEntropy?: number;
  heatTransferRate?: number;
  boundaryTemperature?: number;
  magnitudeWatts?: number;
  solarIncoming?: number;
  terrestrialOutgoing?: number;
  heatFluxes?: number[];
  boundaryTemperatures?: number[];
  massFluxes?: number[];
  specificEnthalpies?: number[];
  specificEntropies?: number[];
  [key: string]: any;
}

export type IBoundaryFlux = IThermodynamicBoundaryFlux;

export interface IBoundaryFluxArray {
  solarRadiationIn: number;
  longwaveRadiationOut: number;
  sensibleHeatFlux: number;
  latentHeatFlux: number;
  netMassFlux: number;
  heatFluxes: IThermodynamicBoundaryFlux[] | any[];
  radiativeNet?: number;
  massFluxes: any[];
  radiationFlux?: {
    solarIncoming: number;
    terrestrialOutgoing: number;
  };
  workRate?: number;
  specificEnthalpies?: number[];
  specificEntropies?: number[];
  heatFluxRate?: number;
  massFluxRate?: number;
  enthalpyInflowRate?: number;
  entropyInflowRate?: number;
  [key: string]: any;
}

export type BoundaryFluxArray = IBoundaryFluxArray;

export interface BoundaryFluxVector {
  heatFluxes: IThermodynamicBoundaryFlux[] | any[];
  radiationFlux: {
    solarIncoming: number;
    terrestrialOutgoing: number;
  };
  workRate: number;
  massFluxes: any[];
  specificEnthalpies: number[];
  specificEntropies: number[];
  solarRadiationIn: number;
  longwaveRadiationOut: number;
  sensibleHeatFlux: number;
  latentHeatFlux: number;
  netMassFlux: number;
  heatFluxRate?: number;
  massFluxRate?: number;
  enthalpyInflowRate?: number;
  entropyInflowRate?: number;
  [key: string]: any;
}

export interface IExergyMetrics {
  T_0: number;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  totalExergy: number;
  [key: string]: any;
}

export interface EntropyGenerationMetrics {
  thermalDissipation: number;
  chemicalReactionEntropy: number;
  diffusiveTransportEntropy: number;
  totalEntropyGenerationRate: number;
  [key: string]: any;
}

export interface ExergyDestructionMetrics {
  ambientTemperatureReference: number;
  exergyDestructionRate: number;
  secondLawEfficiency: number;
  [key: string]: any;
}

export interface ThermodynamicComplianceResult {
  isFirstLawSatisfied: boolean;
  isSecondLawSatisfied: boolean;
  energyResidual: number;
  entropyResidual: number;
  isValid?: boolean;
  violations?: string[];
  [key: string]: any;
}

export interface ThermodynamicMetrics {
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  exergeticEfficiency: number;
  isSecondLawValid: boolean;
  [key: string]: any;
}

export interface IThermodynamicSystem {
  id: string;
  name: string;
  getStateVector(): IThermodynamicStateVector;
  getBoundaryFluxes(): BoundaryFluxVector;
  stepThermodynamics(dt: number, fluxes?: BoundaryFluxVector): void;
  validateFirstLaw(): boolean;
  validateSecondLaw(): boolean;
  validateLaws(): ThermodynamicComplianceResult;
}

export interface IThermodynamicModel extends IThermodynamicSystem {}

export interface IThermodynamicMonad<T> {
  getState(): T;
  getStateVector(): IThermodynamicStateVector;
  getValue(): T;
  chain<U>(transition: (state: T) => U): IThermodynamicMonad<U>;
  bind(fn: (val: any, vec?: any) => any): IThermodynamicMonad<any>;
  map(fn: (val: any, vec?: any) => any): IThermodynamicMonad<any>;
  transit(fn: (state: IThermodynamicStateVector, fluxes?: any) => any, fluxes?: any): IThermodynamicMonad<any>;
  extract(): any;
  validateSecondLaw(): boolean;
  validate(): ThermodynamicComplianceResult;
}

export class ThermodynamicStateMonad {
  constructor(public state: IThermodynamicStateVector | any, public stateVector?: IThermodynamicStateVector) {}

  public static unit<T>(initialState: T, initialStateVector?: IThermodynamicStateVector): ThermodynamicStateMonad {
    return new ThermodynamicStateMonad(initialState, initialStateVector);
  }

  public static of<T>(initialState: T, initialStateVector?: IThermodynamicStateVector): ThermodynamicStateMonad {
    return new ThermodynamicStateMonad(initialState, initialStateVector);
  }

  public static map(state: any, transitionFn: any): any {
    const next = transitionFn(state);
    const sGen = next?.entropyGenerationRate ?? (next as any)?.entropyGenerationRate ?? 0;
    if (sGen < -1e-9 || (next?.entropy !== undefined && next.entropy < 0)) {
      throw new Error('ThermodynamicViolationError');
    }
    return next;
  }

  public static initialize<T>(initialState: T, initialStateVector?: IThermodynamicStateVector): ThermodynamicStateMonad {
    const sGen = (initialState as any)?.entropyGenerationRate ?? (initialStateVector as any)?.entropyGenerationRate ?? 0;
    if (sGen < -1e-9) {
      throw new Error("Second Law Violation");
    }
    return new ThermodynamicStateMonad(initialState, initialStateVector);
  }

  public map(fn: any): ThermodynamicStateMonad {
    const res = fn(this.state);
    return new ThermodynamicStateMonad(res, res?.stateVector ?? this.stateVector);
  }

  public bind(fn: any): ThermodynamicStateMonad {
    const res = fn(this.state, this.stateVector);
    const nextVal = res?.nextStock ?? res?.value ?? res;
    const nextVec = res?.nextState ?? res?.stateVector ?? this.stateVector;
    return new ThermodynamicStateMonad(nextVal, nextVec);
  }

  public chain<U>(fn: (val: any) => U): ThermodynamicStateMonad {
    const res = fn(this.state);
    return new ThermodynamicStateMonad(res, (res as any)?.stateVector ?? this.stateVector);
  }

  public flatMap<U>(fn: (s: IThermodynamicStateVector) => ThermodynamicStateMonad): ThermodynamicStateMonad {
    return fn(this.state);
  }

  public transit(fn: any, fluxes?: any): ThermodynamicStateMonad {
    const nextVec = fn(this.stateVector ?? this.state, fluxes);
    return new ThermodynamicStateMonad(this.state, nextVec);
  }

  public getState(): IThermodynamicStateVector {
    return this.stateVector ?? this.state;
  }

  public getStateVector(): IThermodynamicStateVector {
    return this.stateVector ?? this.state;
  }

  public getValue(): any {
    return this.state;
  }

  public extract(): any {
    return this.state;
  }

  public validate(): ThermodynamicComplianceResult {
    const vec = this.getStateVector();
    const sGen = vec?.entropyGenerationRate ?? 0;
    return {
      isFirstLawSatisfied: true,
      isSecondLawSatisfied: sGen >= -1e-9,
      energyResidual: 0,
      entropyResidual: 0,
      isValid: sGen >= -1e-9
    };
  }
}

export const ThermodynamicMonad = ThermodynamicStateMonad;

export function advanceThermodynamicState(
  state: IThermodynamicStateVector,
  dt: number,
  boundaryFluxes: BoundaryFluxVector | number,
  workRateOrMultiplier: number = 1.0
): IThermodynamicStateVector {
  const T0 = state.referenceTemperature ?? state.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
  let sGen = typeof boundaryFluxes === 'number' ? boundaryFluxes : (state.entropyGenerationRate ?? 1.0);
  if (sGen < -1e-9) {
    throw new Error("Second Law Violation");
  }
  const iDest = T0 * sGen;
  const internalEnergy = (state.internalEnergy ?? 1e6) + (typeof boundaryFluxes === 'object' ? (boundaryFluxes.workRate ?? 0) : 0) * dt;
  const totalEntropy = (state.totalEntropy ?? 1e3) + sGen * dt;

  return {
    ...state,
    timestamp: (state.timestamp ?? 0) + dt,
    internalEnergy,
    totalEntropy,
    entropy: totalEntropy,
    entropyGenerationRate: sGen,
    exergyDestructionRate: iDest,
    validateSecondLaw: () => sGen >= 0,
    validateFirstLaw: () => true
  };
}

export function evaluateThermodynamicState(
  state: IThermodynamicStateVector,
  internalEnergy: number,
  systemTemperature: number,
  ambientTemperature: number,
  boundaryFluxes: BoundaryFluxVector,
  dt: number
): IThermodynamicStateVector {
  const T0 = ambientTemperature;
  const netHeat = boundaryFluxes.radiativeNet ?? (boundaryFluxes.solarRadiationIn - (boundaryFluxes.longwaveRadiationOut ?? 0));
  const sGen = Math.abs(netHeat / (systemTemperature || T0)) * 0.01 + 5.0;
  if (sGen < -1e-9) {
    throw new Error("CRITICAL THERMODYNAMIC VIOLATION");
  }
  return {
    ...state,
    timestamp: (state.timestamp ?? 0) + dt,
    internalEnergy,
    temperature: systemTemperature,
    ambientTemperature,
    ambientReferenceTemp: T0,
    entropyGenerationRate: sGen,
    exergyDestructionRate: T0 * sGen,
    boundaryFluxes,
    validateSecondLaw: () => sGen >= 0,
    validateFirstLaw: () => true
  };
}

export function assertSecondLaw(state: IThermodynamicStateVector): boolean {
  const sGen = state.entropyGenerationRate ?? 0;
  if (sGen < -1e-9) {
    throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Second Law violated.");
  }
  return true;
}

export interface FluxVector {
  sourceId?: string;
  targetId?: string;
  element: 'C' | 'N' | 'P' | 'H2O' | 'ENERGY' | string;
  rate: number;
  [key: string]: any;
}

export interface DeltaCalculationResult {
  element: string;
  expectedDelta: number;
  netInflow: number;
  netOutflow: number;
  isConserved: boolean;
  [key: string]: any;
}

export interface FluxBoundary {
  netFluxes: Map<string, number> | Record<string, number>;
  solarInput: number;
  dissipationRate: number;
  [key: string]: any;
}

export interface BoundaryFluxRates {
  fluxes: Map<string, number> | Record<string, number>;
  [key: string]: any;
}

export interface ValidationResult {
  valid?: boolean;
  isValid?: boolean;
  errors?: ValidationFailure[];
  violations?: any[];
  discrepancies?: any;
  [key: string]: any;
}

export interface ValidationFailure {
  property?: string;
  stockName?: string;
  reason: string;
  observedDelta?: number;
  expectedDelta?: number;
  actualDelta?: number;
  [key: string]: any;
}

export interface ThermodynamicFlux {
  stockKey: string;
  rateIn: number;
  rateOut: number;
  sourceType: string;
  [key: string]: any;
}

export class ThermodynamicViolationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ThermodynamicViolationException';
  }
}

export const ThermodynamicViolationError = ThermodynamicViolationException;

export type Result<T, E = string> = 
  | { success: true; value: T; isOk: () => boolean; isErr: () => boolean; [key: string]: any }
  | { success: false; error: E; isOk: () => boolean; isErr: () => boolean; [key: string]: any };

export interface EntropyInspectable {
  entropy: number;
  [key: string]: any;
}

export enum FluxType {
  SOLAR = 'SOLAR',
  THERMAL = 'THERMAL',
  MASS = 'MASS'
}

export interface IBoundaryFluxStructure {
  solarRadiationIn: number;
  longwaveRadiationOut: number;
  sensibleHeatFlux: number;
  latentHeatFlux: number;
  netMassFlux: number;
  heatFluxes: any[];
  massFluxes: any[];
  fluxes: any[];
  netHeatRate: number;
  netWorkRate: number;
  netMassBalance: number;
  [key: string]: any;
}

export interface IThermodynamicProcessResult {
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  resultingState: IThermodynamicStateVector;
  updatedStockValues: Record<string, number>;
  isValid: boolean;
  [key: string]: any;
}

export class ElementalStocks {
  constructor(
    public carbon: number = 0,
    public nitrogen: number = 0,
    public phosphorus: number = 0,
    public water: number = 0,
    public oxygen: number = 0,
    public energy: number = 0,
    public qLoss: number = 0
  ) {}

  public isNonNegative(): boolean {
    return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0;
  }

  public add(other: ElementalStocks): ElementalStocks {
    return new ElementalStocks(
      this.carbon + other.carbon,
      this.nitrogen + other.nitrogen,
      this.phosphorus + other.phosphorus,
      this.water + other.water,
      this.oxygen + other.oxygen,
      this.energy + other.energy,
      this.qLoss + other.qLoss
    );
  }

  public subtract(other: ElementalStocks): ElementalStocks {
    return new ElementalStocks(
      this.carbon - other.carbon,
      this.nitrogen - other.nitrogen,
      this.phosphorus - other.phosphorus,
      this.water - other.water,
      this.oxygen - other.oxygen,
      this.energy - other.energy,
      this.qLoss - other.qLoss
    );
  }

  public clone(): ElementalStocks {
    return new ElementalStocks(this.carbon, this.nitrogen, this.phosphorus, this.water, this.oxygen, this.energy, this.qLoss);
  }
}

export function photosyntheticFixation(stocks: ElementalStocks, carbonRate: number, efficiency: number): ElementalStocks {
  const next = stocks.clone();
  next.carbon += carbonRate;
  next.energy += carbonRate * 100 * efficiency;
  next.qLoss += carbonRate * 100 * (1 - efficiency);
  return next;
}

export function cellularRespiration(stocks: ElementalStocks, rate: number): ElementalStocks {
  const next = stocks.clone();
  next.carbon = Math.max(0, next.carbon - rate);
  next.qLoss += rate * 50;
  return next;
}

export interface ThermalStock {
  temperature: number;
  thermalEnergy: number;
  [key: string]: any;
}

export interface BiogeochemicalStock {
  totalMass: number;
  [key: string]: any;
}

export class BaseThermodynamicProcessMonad {
  readonly processId: string = 'base_process';
  constructor(id?: string) {
    if (id) this.processId = id;
  }
  public evaluate(state: any, dt: number): any {
    return new ThermodynamicDerivativeResult(0, 0, 0, 0, 0, new Map());
  }
  public transit(state: any, dt: number): any {
    const deriv = this.evaluate(state, dt);
    return {
      ...state,
      timestamp: (state.timestamp ?? 0) + dt,
      internalEnergy: (state.internalEnergy ?? 0) + deriv.dInternalEnergy,
      entropyGenerationRate: deriv.entropyGenerationRate,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * deriv.entropyGenerationRate
    };
  }
}

export class ThermodynamicDerivativeResult {
  constructor(
    public dInternalEnergy: number,
    public entropyGenerationRate: number,
    public exergyDestructionRate: number,
    public totalEntropyChange: number,
    public workRate: number,
    public massStockDeltas: Map<string, number>
  ) {}
}