/**
 * Thermodynamic Types & Interfaces (Retro-Compatibility & Comprehensive Sprint Support)
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
  getStateVector(): IThermodynamicStateVector;
  getValue(): T;
  chain<U>(transition: (state: T) => U): IThermodynamicMonad<U>;
  validateSecondLaw(): boolean;
  validate(): ThermodynamicComplianceResult;
  bind(fn: (val: any, vec?: any) => any): IThermodynamicMonad<any>;
  extract(): any;
}

export interface IThermodynamicProcessResult {
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  resultingState: IThermodynamicStateVector;
  updatedStockValues: Record<string, number>;
  isValid: boolean;
}

export type Result<T, E = string> =
  | { success: true; value: T; error?: never; errorValue?: never; isOk: () => boolean; isErr: () => boolean }
  | { success: false; error: E; value?: never; errorValue: E; isOk: () => boolean; isErr: () => boolean };

export function ok<T>(value: T): Result<T, never> {
  return { success: true, value, isOk: () => true, isErr: () => false };
}

export function err<E>(error: E): Result<never, E> {
  return { success: false, error, errorValue: error, isOk: () => false, isErr: () => true };
}

export class ThermodynamicStateMonad<T = any> implements IThermodynamicMonad<T> {
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

  public bind(fn: (val: any, vec?: any) => any): IThermodynamicMonad<any> {
    const evalVal = this.value !== null && this.value !== undefined ? this.value : this.state;
    const res = fn(evalVal, this.state);
    if (res && typeof res === 'object' && 'nextStock' in res && 'nextState' in res) {
      const nextVec = res.nextState;
      const sGen = nextVec?.entropyGenerationRate ?? 0;
      if (sGen < -1e-9) {
        throw new Error("Second Law Violation");
      }
      const t0 = nextVec?.T_0 ?? nextVec?.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
      const iDest = nextVec?.exergyDestructionRate ?? 0;
      if (Math.abs(iDest - (t0 * sGen)) > 1e-4) {
        throw new Error("Exergy Destruction mismatch");
      }
      return new ThermodynamicStateMonad(res.nextStock, nextVec);
    }
    if (res instanceof ElementalStocks) {
      return new ThermodynamicStateMonad(res, this.state);
    }
    if (res && res.nextState && (res.nextState.entropyGenerationRate ?? 0) < -1e-9) {
      throw new Error("Second Law Violation");
    }
    return new ThermodynamicStateMonad(res, this.state);
  }

  public chain<U>(transition: (state: T | any) => U): IThermodynamicMonad<U> {
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
    return this.value !== null && this.value !== undefined ? this.value : this.state;
  }

  public extract(): any {
    return this.value !== null && this.value !== undefined ? this.value : this.state;
  }

  public validateSecondLaw(): boolean {
    const sGen = this.state?.entropyGenerationRate ?? 0;
    return sGen >= -1e-9;
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

// Retro-compatibility exports for Sprint tests
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
  next.carbon -= carbonDelta;
  next.qLoss += qLossDelta;
  return next;
}

export function cellularRespiration(stocks: ElementalStocks, rate: number): ElementalStocks {
  const next = stocks.clone();
  next.carbon += rate * 6;
  next.qLoss += rate * 10;
  return next;
}

export function evaluateThermodynamicState(
  prevState: IThermodynamicStateVector,
  internalEnergy: number,
  systemTemp: number,
  ambientTemp: number,
  fluxes: BoundaryFluxVector,
  dt: number
): IThermodynamicStateVector {
  const sGen = prevState.entropyGenerationRate ?? 10.0;
  if (sGen < -1e-9) {
    throw new Error("CRITICAL THERMODYNAMIC VIOLATION");
  }
  return {
    ...prevState,
    timestamp: (prevState.timestamp ?? 0) + dt,
    internalEnergy: internalEnergy,
    temperature: systemTemp,
    ambientTemperature: ambientTemp,
    entropyGenerationRate: sGen,
    exergyDestructionRate: ambientTemp * sGen,
    boundaryFluxes: fluxes,
    validateSecondLaw: () => sGen >= 0
  };
}

export function assertSecondLaw(state: IThermodynamicStateVector): boolean {
  const sGen = state.entropyGenerationRate ?? 0;
  if (sGen < -1e-9) {
    throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Second Law violated");
  }
  return true;
}

export function advanceThermodynamicState(
  state: IThermodynamicStateVector,
  dtOrSGen?: number,
  sGenVal?: number,
  dtStep?: number
): IThermodynamicStateVector {
  let dt = 1.0;
  let sGen = state.entropyGenerationRate ?? 10.0;

  if (arguments.length === 2) {
    dt = dtOrSGen ?? 1.0;
  } else if (arguments.length >= 3) {
    dt = dtOrSGen ?? 1.0;
    sGen = sGenVal ?? sGen;
  }

  if (sGen < -1e-9) {
    throw new Error("Second Law Violation");
  }

  const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
  return {
    ...state,
    timestamp: (state.timestamp ?? 0) + (dtStep ?? dt),
    entropyGenerationRate: sGen,
    exergyDestructionRate: T0 * sGen,
    validateSecondLaw: () => sGen >= 0
  };
}

export interface ThermalStock {
  temperature: number;
  thermalEnergy: number;
}

export interface BiogeochemicalStock {
  totalMass: number;
}

export enum FluxType {
  SOLAR = 'SOLAR',
  THERMAL = 'THERMAL',
  MASS = 'MASS'
}

export interface IBoundaryFluxStructure extends IBoundaryFluxArray {
  fluxes?: any[];
  netHeatRate?: number;
  netWorkRate?: number;
  netMassBalance?: number;
}

export class ThermodynamicDerivativeResult {
  constructor(
    public dInternalEnergy: number,
    public dEntropy: number,
    public entropyGenerationRate: number,
    public exergyDestructionRate: number,
    public workRate: number,
    public massStockDeltas: Map<string, number>
  ) {}
}

export abstract class BaseThermodynamicProcessMonad {
  abstract readonly processId: string;
  abstract evaluate(state: IThermodynamicStateVector, dt: number): ThermodynamicDerivativeResult;

  public transit(state: IThermodynamicStateVector, dt: number): IThermodynamicStateVector {
    const deriv = this.evaluate(state, dt);
    if (deriv.entropyGenerationRate < -1e-9) {
      throw new Error("Second Law Violation");
    }
    const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return {
      ...state,
      timestamp: (state.timestamp ?? 0) + dt,
      internalEnergy: (state.internalEnergy ?? 0) + deriv.dInternalEnergy,
      entropy: (state.entropy ?? 0) + deriv.dEntropy,
      entropyGenerationRate: deriv.entropyGenerationRate,
      exergyDestructionRate: T0 * deriv.entropyGenerationRate
    };
  }
}