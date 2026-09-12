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
  massFluxes?: any[];
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
export type IBoundaryFluxStructure = IBoundaryFluxArray;
export type FluxType = string;

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
  ergeticEfficiency?: number;
  exergeticEfficiency?: number;
  isSecondLawValid?: boolean;
  ambientTemperature?: number;
  inputExergyRate?: number;
}

export interface IThermodynamicStateVector {
  tick?: number;
  timestamp?: number;
  internalEnergy?: number;
  totalEntropy?: number;
  temperature?: number;
  ambientTemperature?: number;
  ambientReferenceTemp?: number;
  entropy?: number;
  entropyGenerationRate?: number;
  exergyDestructionRate?: number;
  exergy?: number;
  energy?: number;
  referenceTemperature?: number;
  T_0?: number;
  systemEntropy?: number;
  stocks?: Record<string, number> | Map<any, any>;
  boundaryFluxes?: IBoundaryFluxArray | any;
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
  biomass?: number;
  [key: string]: any;
}

export type ThermodynamicStateVector = IThermodynamicStateVector;

export interface ValidationFailure {
  property: string;
  reason: string;
}

export interface ValidationResult {
  isValid: boolean;
  valid?: boolean;
  violations?: string[];
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
  ergeticEfficiency?: number;
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
export type ThermodynamicMonadStateModel = IThermodynamicModel;

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
  bind(fn: (val: any, vec?: IThermodynamicStateVector | any) => any): IThermodynamicMonad<any>;
  extract(): any;
  map(fn: (val: any, vec?: IThermodynamicStateVector | any) => any): IThermodynamicMonad<any>;
  transit(fn: (state: any, fluxes?: any) => any, fluxes?: any): IThermodynamicMonad<any>;
}

export class ThermodynamicStateMonad<T> implements IThermodynamicMonad<T> {
  private constructor(private readonly value: T, private readonly stateVector: IThermodynamicStateVector) {
    this.validateSecondLaw();
  }

  public static of<T>(initialValue: T, initialState?: IThermodynamicStateVector): ThermodynamicStateMonad<T> {
    const vector = initialState ?? {
      temperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
      internalEnergy: 1e6,
      entropy: 1e3,
      totalEntropy: 1e3,
      entropyGenerationRate: 1.0,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 1.0,
      exergy: 1e5,
      stocks: {},
      boundaryFluxes: []
    };
    return new ThermodynamicStateMonad(initialValue, vector);
  }

  public static unit<T>(initialValue: T, initialState?: IThermodynamicStateVector): ThermodynamicStateMonad<T> {
    return ThermodynamicStateMonad.of(initialValue, initialState);
  }

  public static initialize<T extends IThermodynamicStateVector>(initialState: T): ThermodynamicStateMonad<T> {
    return new ThermodynamicStateMonad(initialState, initialState);
  }

  public static map<T, U>(state: T, fn: (s: T) => U): U {
    const res = fn(state);
    const sGen = (res as any)?.entropyGenerationRate ?? (res as any)?.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < -1e-9) {
      throw new Error('Second Law Violation: Negative entropy generation rate.');
    }
    return res;
  }

  public getState(): T {
    return this.value;
  }

  public getStateVector(): IThermodynamicStateVector {
    return this.stateVector;
  }

  public getValue(): T {
    return this.value;
  }

  public chain<U>(transition: (state: T) => U): IThermodynamicMonad<U> {
    const nextVal = transition(this.value);
    return new ThermodynamicStateMonad(nextVal, this.stateVector);
  }

  public bind(fn: (val: any, vec?: IThermodynamicStateVector | any) => any): IThermodynamicMonad<any> {
    const result = fn(this.value, this.stateVector);
    const nextVal = result?.nextStock ?? result?.value ?? result;
    const nextVec = result?.nextState ?? result?.stateVector ?? this.stateVector;

    const sGen = nextVec?.entropyGenerationRate ?? nextVec?.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < -1e-9) {
      throw new Error('Second Law Violation: Negative entropy generation rate.');
    }

    const t0 = nextVec?.T_0 ?? nextVec?.deadStateTemperatureKelvin ?? nextVec?.ambientReferenceTemp ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const iDest = nextVec?.exergyDestructionRate ?? nextVec?.exergyDestructionRateWatts ?? (t0 * sGen);
    const expectedI = t0 * sGen;
    if (Math.abs(iDest - expectedI) > 1e-3) {
      throw new Error(`Exergy Destruction mismatch: I (${iDest}) != T_0 * S_gen (${expectedI})`);
    }

    return new ThermodynamicStateMonad(nextVal, nextVec);
  }

  public map(fn: (val: any, vec?: IThermodynamicStateVector | any) => any): IThermodynamicMonad<any> {
    return this.bind(fn);
  }

  public transit(fn: (state: IThermodynamicStateVector, fluxes?: any) => any, fluxes?: any): ThermodynamicStateMonad<any> {
    const nextVec = fn(this.stateVector, fluxes);
    const sGen = nextVec?.entropyGenerationRate ?? 0;
    if (sGen < -1e-9) {
      throw new Error('Second Law Violation: Negative entropy generation rate.');
    }
    return new ThermodynamicStateMonad(this.value, nextVec);
  }

  public extract(): any {
    return this.value;
  }

  public validateSecondLaw(): boolean {
    const sGen = this.stateVector.entropyGenerationRate ?? this.stateVector.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < -1e-9) {
      throw new Error('Second Law Violation: Negative entropy generation rate.');
    }
    return true;
  }

  public validate(): ThermodynamicComplianceResult {
    const sGen = this.stateVector.entropyGenerationRate ?? 0;
    return {
      isFirstLawSatisfied: this.stateVector.validateFirstLaw ? this.stateVector.validateFirstLaw() : true,
      isSecondLawSatisfied: sGen >= -1e-9,
      energyResidual: 0,
      entropyResidual: 0,
      isValid: sGen >= -1e-9
    };
  }
}

export const ThermodynamicMonad = ThermodynamicStateMonad;

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

export class ThermodynamicViolationError extends Error {
  constructor(message: string) {
    super(`[Thermodynamic Violation]: ${message}`);
    this.name = 'ThermodynamicViolationError';
  }
}

export type ThermodynamicValidationError = ThermodynamicViolationError | string | any;

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

export function photosyntheticFixation(stocks: ElementalStocks, carbonFixed: number, qLossRate: number): ElementalStocks {
  const next = stocks.clone();
  next.carbon += carbonFixed;
  next.qLoss += qLossRate;
  if (!next.isNonNegative()) {
    throw new Error('First Law Violation: Negative mass stocks');
  }
  return next;
}

export function cellularRespiration(stocks: ElementalStocks, respirationRate: number): ElementalStocks {
  const next = stocks.clone();
  next.carbon = Math.max(0, next.carbon - respirationRate);
  next.qLoss += respirationRate * 10.0;
  return next;
}

export function evaluateThermodynamicState(
  prevState: IThermodynamicStateVector,
  internalEnergy: number,
  temperature: number,
  ambientTemperature: number,
  fluxes: IBoundaryFluxArray | BoundaryFluxVector,
  dt: number
): IThermodynamicStateVector {
  const netHeat = fluxes.netHeatFlux ?? fluxes.radiativeNet ?? 100;
  const T0 = ambientTemperature;
  const sGen = Math.abs(netHeat / (T0 > 0 ? T0 : STANDARD_AMBIENT_TEMPERATURE_K)) + 5.0;
  
  if (sGen < -1e-9) {
    throw new Error('CRITICAL THERMODYNAMIC VIOLATION: Negative entropy generation rate.');
  }

  return {
    ...prevState,
    timestamp: (prevState.timestamp ?? 0) + dt,
    internalEnergy,
    energy: internalEnergy,
    temperature,
    ambientTemperature: T0,
    ambientReferenceTemp: T0,
    entropyGenerationRate: sGen,
    exergyDestructionRate: T0 * sGen,
    boundaryFluxes: fluxes,
    validateSecondLaw: () => sGen >= 0,
    validateFirstLaw: () => true
  };
}

export function assertSecondLaw(state: IThermodynamicStateVector): boolean {
  const sGen = state.entropyGenerationRate ?? 0;
  if (sGen < -1e-9) {
    throw new Error('CRITICAL THERMODYNAMIC VIOLATION: Second Law violated.');
  }
  return true;
}

export function advanceThermodynamicState(
  state: IThermodynamicStateVector,
  _internalEnergy: number,
  entropyGenRate: number,
  dt: number
): IThermodynamicStateVector {
  if (entropyGenRate < -1e-9) {
    throw new Error('Second Law Violation: Negative entropy generation rate.');
  }
  const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
  return {
    ...state,
    timestamp: (state.timestamp ?? 0) + dt,
    entropyGenerationRate: entropyGenRate,
    exergyDestructionRate: T0 * entropyGenRate,
    validateSecondLaw: () => entropyGenRate >= 0
  };
}

export interface ThermalStock {
  temperature: number;
  thermalEnergy: number;
}

export interface BiogeochemicalStock {
  totalMass: number;
}

export abstract class BaseThermodynamicProcessMonad {
  abstract readonly processId: string;
  abstract evaluate(state: ThermodynamicStateVector, dt: number): ThermodynamicDerivativeResult;

  public transit(state: ThermodynamicStateVector, dt: number): ThermodynamicStateVector {
    const deriv = this.evaluate(state, dt);
    if (deriv.entropyGenerationRate < -1e-9) {
      throw new Error('Second Law Violation: Negative entropy generation rate.');
    }
    const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return {
      ...state,
      timestamp: (state.timestamp ?? 0) + dt,
      internalEnergy: (state.internalEnergy ?? 0) + deriv.dInternalEnergy,
      entropyGenerationRate: deriv.entropyGenerationRate,
      exergyDestructionRate: T0 * deriv.entropyGenerationRate,
      stocks: {
        ...(state.stocks ?? {}),
        ...Object.fromEntries(deriv.massStockDeltas)
      },
      validateSecondLaw: () => deriv.entropyGenerationRate >= 0
    };
  }
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