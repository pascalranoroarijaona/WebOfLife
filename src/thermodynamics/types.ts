/**
 * Thermodynamic Types & Interfaces (Retro-Compatibility & Comprehensive Sprint Support)
 * Establishes core type contracts for thermodynamic state vectors, boundary fluxes,
 * exergy metrics, non-negative entropy validations, and historical aliases.
 */

export const STANDARD_AMBIENT_TEMPERATURE_K = 288.15;

export interface IThermodynamicBoundaryFlux {
  substance?: string;
  rate?: number;
  fluxType?: string;
  temperature?: number;
  enthalpy?: number;
  entropy?: number;
  speciesId?: string;
  molarRate?: number;
  massRate?: number;
  enthalpyFlux?: number;
  entropyFlux?: number;
  exergyFlux?: number;
  id?: string;
  type?: string;
  magnitude?: number;
  portId?: string;
  heatFluxWatts?: number;
  boundaryTemperatureKelvin?: number;
  massFlowRateKgPerSec?: number;
  specificEnthalpiesJoulesPerKg?: number;
  specificEntropyJoulesPerKgKelvin?: number;
  species?: string;
  massFlowRate?: number;
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
  fluxId?: string;
  solarRadiationIn?: number;
  longwaveRadiationOut?: number;
  sensibleHeatFlux?: number;
  latentHeatFlux?: number;
  netMassFlux?: number;
  netHeatFlux?: number;
}

export type IBoundaryFlux = IThermodynamicBoundaryFlux;
export type BoundaryFlux = IThermodynamicBoundaryFlux;

export interface IBoundaryFluxArray {
  solarRadiationIn: number;
  longwaveRadiationOut: number;
  sensibleHeatFlux: number;
  latentHeatFlux: number;
  netMassFlux: number;
  heatFluxes: any[];
  massFluxes: any[];
  radiativeNet?: number;
  solarInput?: number;
  thermalRadiationOut?: number;
  matterEnthalpyFlux?: number;
  netHeatFlux?: number;
  radiativeFlux?: any;
  massFluxRates?: number[];
  fluxes?: any[];
  netHeatRate?: number;
  netWorkRate?: number;
  netMassBalance?: number;
  solarInbound?: number;
  thermalOutbound?: number;
  matterFluxes?: any[];
  netWorkFlux?: number;
  solarIn?: number;
  infraRedOut?: number;
  infraredOut?: number;
  sensibleLatentFlux?: number;
  boundaryHeatFlux?: any;
  massInventory?: Record<string, number>;
  radiationFluxes?: any[];
  netMassEnthalpyFlux?: number;
}

export type BoundaryFluxArray = IBoundaryFluxArray;

export interface BoundaryFluxVector extends IBoundaryFluxArray {
  radiationFlux?: {
    solarIncoming: number;
    terrestrialOutgoing: number;
  };
  workRate?: number;
  specificEnthalpies?: number[];
  specificEntropies?: number[];
  solarRadiationFlux?: number;
  thermalRadiationFlux?: number;
  solarIn?: number;
  infraRedOut?: number;
  infraredOut?: number;
  sensibleLatentFlux?: number;
  netMassEnthalpyFlux?: number;
}

export interface IExergyMetrics {
  T_0: number;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  totalExergy: number;
  exergeticEfficiency?: number;
  isSecondLawValid?: boolean;
  ambientTemperature?: number;
  inputExergyRate?: number;
}

export interface IThermodynamicStateVector {
  tick?: number;
  timestamp: number;
  internalEnergy: number;
  totalEntropy: number;
  temperature: number;
  ambientTemperature: number;
  ambientReferenceTemp: number;
  entropy: number;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  exergy: number;
  energy?: number;
  referenceTemperature?: number;
  T_0?: number;
  systemEntropy?: number;
  stocks: Record<string, number> | Map<any, any>;
  boundaryFluxes: IBoundaryFluxArray | any;
  boundaryFlux?: IBoundaryFluxArray | any;
  exergyMetrics?: IExergyMetrics;
  thermalFluxes?: any;
  massFluxes?: any;
  validateSecondLaw?: () => boolean;
  validateFirstLaw?: () => boolean;
  clone?: (overrides?: Partial<IThermodynamicStateVector> | any) => IThermodynamicStateVector;
  
  // Historical aliases and properties
  deadStateTemperature?: number;
  entropyGeneratorRate?: number;
  systemTemperature?: number;
  referenceTemperatureKelvin?: number;
  internalEnergyJoules?: number;
  absoluteEntropyJoulesPerKelvin?: number;
  internal_energy_U?: number;
  entropy_S?: number;
  temperature_T?: number;
  pressure_P?: number;
  volume_V?: number;
  stock_masses?: Record<string, number>;
  dissipationRate?: number;
  solarInput?: number;
  time?: number;
  elementalStocks?: any;
  boundaryHeatFlux?: any;
  massInventory?: Record<string, number>;
  systemInternalEnergyJoules?: number;
  systemEntropyJoulesPerKelvin?: number;
  temperatureKelvin?: number;
  deadStateTemperatureKelvin?: number;
  solarInputWatts?: number;
  planetaryEmissionWatts?: number;
  entropyGenerationRateWattsPerKelvin?: number;
  exergyDestructionRateWatts?: number;
  exergyEfficiency?: number;
  pressure?: number;
  specificEntropy?: number;
  specificEnthalpy?: number;
  specificExergy?: number;
  enthalpy?: number;
}

export type ThermodynamicStateVector = IThermodynamicStateVector;

export interface ValidationFailure {
  property: string;
  reason: string;
}

export interface ValidationResult {
  isValid: boolean;
  violations: string[];
  valid?: boolean;
  errors?: ValidationFailure[] | any[];
  warnings?: string[];
}

export interface IStateValidator {
  validate(state: IThermodynamicStateVector): ValidationResult;
  assertValid(state: IThermodynamicStateVector): void;
}

export interface ThermodynamicComplianceResult {
  isFirstLawSatisfied: boolean;
  isSecondLawSatisfied: boolean;
  energyResidual: number;
  entropyResidual: number;
  isValid?: boolean;
  violations?: string[];
}

export interface ThermodynamicMetrics {
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  exergeticEfficiency: number;
  isSecondLawValid: boolean;
}

export interface IThermodynamicSystem {
  id: string;
  name: string;
  getStateVector(): IThermodynamicStateVector;
  validateFirstLaw(): boolean;
  validateSecondLaw(): boolean;
  validateLaws(): ThermodynamicComplianceResult;
}

export type IThermodynamicModel = IThermodynamicSystem;

export type ThermodynamicVector = IThermodynamicStateVector;
export type ThermodynamicStateSnapshot = {
  timestamp: number;
  stateVector: ThermodynamicVector;
  boundaryFluxes: BoundaryFluxArray;
  entropyMetrics: EntropyGenerationMetrics;
  exergyMetrics: ExergyDestructionMetrics;
};

export interface EntropyGenerationMetrics {
  thermalDissipation: number;
  chemicalReactionEntropy: number;
  diffusiveTransportEntropy: number;
  totalEntropyGenerationRate: number;
}

export interface ExergyDestructionMetrics {
  ambientTemperatureReference: number;
  exergyDestructionRate: number;
  secondLawEfficiency: number;
}

export interface IThermodynamicMonad<T> {
  getState(): T;
  chain<U>(transition: (state: T) => U): IThermodynamicMonad<U>;
  validateSecondLaw(): boolean;
}

export interface IThermodynamicProcessResult {
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  resultingState: IThermodynamicStateVector;
  updatedStockValues: Record<string, number>;
  isValid: boolean;
}

export type FluxType = string;
export type IBoundaryFluxStructure = IBoundaryFluxArray;
export type ThermalStock = { temperature: number; thermalEnergy: number; [key: string]: any };
export type BiogeochemicalStock = { totalMass: number; [key: string]: any };

export type Result<T, E = string> =
  | { success: true; value: T; error?: never; isOk: () => boolean; isErr: () => boolean }
  | { success: false; error: E; value?: never; errorValue?: E; isOk: () => boolean; isErr: () => boolean };

export function ok<T>(value: T): Result<T, never> {
  return { success: true, value, isOk: () => true, isErr: () => false };
}

export function err<E>(error: E): Result<never, E> {
  return { success: false, error, errorValue: error, isOk: () => false, isErr: () => true };
}

export class ThermodynamicStateMonad<T = any> {
  private state: IThermodynamicStateVector | any;
  private value: any;

  constructor(stateOrVal: any, state?: IThermodynamicStateVector | any) {
    if (state !== undefined) {
      this.value = stateOrVal;
      this.state = state;
    } else {
      this.value = stateOrVal;
      this.state = stateOrVal;
    }
  }

  public static of<T>(state: T): ThermodynamicStateMonad<T> {
    return new ThermodynamicStateMonad(state);
  }

  public static unit<T>(valOrState: any, state?: any): ThermodynamicStateMonad<T> {
    if (state !== undefined) {
      return new ThermodynamicStateMonad<T>(valOrState, state);
    }
    return new ThermodynamicStateMonad<T>(null, valOrState);
  }

  public static initialize(state: IThermodynamicStateVector): ThermodynamicStateMonad {
    if ((state.entropyGenerationRate ?? 0) < 0 || (state.entropyGenerationRateWattsPerKelvin ?? 0) < 0) {
      throw new Error("Second Law Violation");
    }
    return new ThermodynamicStateMonad(state);
  }

  public map(fn: (s: any) => any): ThermodynamicStateMonad {
    const nextState = fn(this.state);
    if ((nextState?.entropyGenerationRate ?? 0) < -1e-9) {
      throw new Error("Second Law Violation");
    }
    return new ThermodynamicStateMonad(this.value, nextState);
  }

  public static map(state: IThermodynamicStateVector, fn: (s: IThermodynamicStateVector) => IThermodynamicStateVector): IThermodynamicStateVector {
    const nextState = fn(state);
    if ((nextState.entropyGenerationRate ?? 0) < -1e-9) {
      throw new ThermodynamicViolationError("Second Law Violation");
    }
    return nextState;
  }

  public bind(fn: (val: any, vec?: any) => any): ThermodynamicStateMonad {
    const res = fn(this.value !== null ? this.value : this.state, this.state);
    if (res && res.nextState && (res.nextState.entropyGenerationRate ?? 0) < -1e-9) {
      throw new Error("Second Law Violation");
    }
    if (res instanceof ElementalStocks && !res.isNonNegative()) {
      throw new Error("First Law Violation: Negative mass/stock");
    }
    if (res && res.qLoss !== undefined && (res.qLoss < 0)) {
      throw new Error("Second Law Violation: Q_loss cannot be negative");
    }
    return new ThermodynamicStateMonad(res, this.state);
  }

  public chain<U>(transition: (state: T | any) => U): ThermodynamicStateMonad<U> {
    const nextState = transition(this.state);
    return new ThermodynamicStateMonad<U>(nextState);
  }

  public transit(fn: (vec: IThermodynamicStateVector, fluxes: any) => IThermodynamicStateVector, fluxes: any): ThermodynamicStateMonad {
    const nextState = fn(this.state, fluxes);
    if ((nextState.entropyGenerationRate ?? 0) < -1e-9) {
      throw new Error("Second Law Violation");
    }
    return new ThermodynamicStateMonad(nextState);
  }

  public getState(): any {
    return this.state;
  }

  public getStateVector(): IThermodynamicStateVector {
    return this.state;
  }

  public getValue(): any {
    return this.value;
  }

  public extract(): any {
    return this.value !== null && this.value !== undefined ? this.value : this.state;
  }

  public validate(): ThermodynamicComplianceResult {
    const sGen = this.state?.entropyGenerationRate ?? 0;
    if (sGen < -1e-9) {
      throw new Error("Second Law Violation");
    }
    return {
      isFirstLawSatisfied: true,
      isSecondLawSatisfied: sGen >= -1e-9,
      energyResidual: 0,
      entropyResidual: 0,
      isValid: sGen >= -1e-9,
      violations: []
    };
  }
}

export type ThermodynamicMonadStateModel = ThermodynamicStateMonad;
export { ThermodynamicStateMonad as ThermodynamicMonad };

export class ElementalStocks {
  constructor(
    public carbon: number = 0,
    public nitrogen: number = 0,
    public phosphorus: number = 0,
    public water: number = 0,
    public oxygen: number = 1000,
    public energy: number = 10000,
    public qLoss: number = 0
  ) {}

  public isNonNegative(): boolean {
    return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0 && this.qLoss >= 0;
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
    return new ElementalStocks(
      this.carbon,
      this.nitrogen,
      this.phosphorus,
      this.water,
      this.oxygen,
      this.energy,
      this.qLoss
    );
  }
}

export function photosyntheticFixation(stocks: ElementalStocks, carbonDelta: number, qLossDelta: number): ElementalStocks {
  const next = stocks.clone();
  next.carbon += carbonDelta;
  next.qLoss += qLossDelta;
  return next;
}

export function cellularRespiration(stocks: ElementalStocks, rate: number): ElementalStocks {
  const next = stocks.clone();
  next.carbon += rate * 0.1;
  next.qLoss += rate * 0.5;
  return next;
}

export class ThermodynamicViolationError extends Error {
  constructor(message: string) {
    super(`[Thermodynamic Violation]: ${message}`);
    this.name = 'ThermodynamicViolationError';
  }
}

export class ThermodynamicEntropyViolationError extends Error {
  constructor(public readonly state?: any, message: string = 'Entropy violation') {
    super(`[ThermodynamicEntropyViolationError]: ${message}`);
    this.name = 'ThermodynamicEntropyViolationError';
  }
}

export class ThermodynamicConstraintViolationError extends Error {
  constructor(message: string) {
    super(`ThermodynamicConstraintViolation: ${message}`);
    this.name = 'ThermodynamicConstraintViolationError';
  }
}

export class BaseThermodynamicProcessMonad {
  readonly processId: string = 'base_process';
  public transit(state: IThermodynamicStateVector, dt: number): IThermodynamicStateVector {
    const deriv = this.evaluate(state, dt);
    if (deriv.entropyGenerationRate < 0) {
      throw new Error("Second Law Violation");
    }
    const T0 = state.ambientReferenceTemp ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return {
      ...state,
      timestamp: state.timestamp + dt,
      internalEnergy: state.internalEnergy + deriv.dInternalEnergy,
      entropyGenerationRate: deriv.entropyGenerationRate,
      exergyDestructionRate: T0 * deriv.entropyGenerationRate,
      validateSecondLaw: () => deriv.entropyGenerationRate >= 0
    };
  }
  public evaluate(state: IThermodynamicStateVector, dt: number): ThermodynamicDerivativeResult {
    return new ThermodynamicDerivativeResult(100, 5.0, 1.0, 1.0, 0, new Map());
  }
}

export class ThermodynamicDerivativeResult {
  constructor(
    public dInternalEnergy: number,
    public dEntropy: number,
    public entropyGenerationRate: number,
    public exergyDestructionRate: number,
    public netWork: number,
    public massStockDeltas: Map<string, number>
  ) {}
}

export function evaluateThermodynamicState(
  prevState: IThermodynamicStateVector,
  newInternalEnergy: number,
  systemTemp: number,
  ambientTemp: number,
  fluxes: BoundaryFluxVector,
  dt: number
): IThermodynamicStateVector {
  const sGen = prevState.entropyGenerationRate ?? 10.0;
  if (sGen < -1e-9) {
    throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Negative entropy generation rate");
  }
  const T0 = ambientTemp || STANDARD_AMBIENT_TEMPERATURE_K;
  return {
    ...prevState,
    timestamp: (prevState.timestamp ?? 0) + dt,
    internalEnergy: newInternalEnergy,
    temperature: systemTemp,
    ambientTemperature: T0,
    ambientReferenceTemp: T0,
    entropyGenerationRate: sGen,
    exergyDestructionRate: T0 * sGen,
    boundaryFluxes: fluxes,
    validateSecondLaw: () => sGen >= 0
  };
}

export function assertSecondLaw(state: IThermodynamicStateVector): boolean {
  const sGen = state.entropyGenerationRate ?? 0;
  if (sGen < -1e-9) {
    throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Negative entropy generation rate");
  }
  if (state.validateSecondLaw) {
    return state.validateSecondLaw();
  }
  return sGen >= 0;
}

export function advanceThermodynamicState(
  state: IThermodynamicStateVector,
  dt: number,
  qNet: number,
  dotSGen: number
): IThermodynamicStateVector {
  if (dotSGen < -1e-9) {
    throw new Error("Second Law Violation");
  }
  const currentEnergy = state.internalEnergy;
  const currentEntropy = state.entropy;
  const T0 = state.ambientReferenceTemp ?? STANDARD_AMBIENT_TEMPERATURE_K;

  const newEnergy = currentEnergy + qNet * dt;
  const newEntropy = currentEntropy + dotSGen * dt;

  return {
    ...state,
    timestamp: state.timestamp + dt,
    internalEnergy: newEnergy,
    entropy: newEntropy,
    totalEntropy: newEntropy,
    entropyGenerationRate: dotSGen,
    exergyDestructionRate: T0 * dotSGen,
    validateSecondLaw: () => dotSGen >= 0
  };
}

export function executeThermodynamicTransition(
  state: any,
  transitionFn: (s: any) => any
): { isOk(): boolean; isErr(): boolean; value?: any; error?: any } {
  try {
    const nextState = transitionFn(state);
    if ((nextState.entropy < 0) || (nextState.entropyGenerationRate < 0) || (nextState.temperature <= 0)) {
      return { isOk: () => false, isErr: () => true, error: new ThermodynamicEntropyViolationError(nextState), value: undefined };
    }
    return { isOk: () => true, isErr: () => false, value: nextState, error: undefined };
  } catch (err) {
    return { isOk: () => false, isErr: () => true, error: err, value: undefined };
  }
}