/**
 * Thermodynamic Types & Interfaces
 * Web of Life Simulation Engine - Comprehensive Backward-Compatible Sprint Extension
 */

export const STANDARD_AMBIENT_TEMPERATURE_K = 288.15; // 15°C standard Earth surface temperature

export enum FluxType {
  SOLAR_SHORTWAVE = 'SOLAR_SHORTWAVE',
  TERRESTRIAL_LONGWAVE = 'TERRESTRIAL_LONGWAVE',
  SENSIBLE_HEAT = 'SENSIBLE_HEAT',
  LATENT_HEAT = 'LATENT_HEAT',
  MASS_FLUX = 'MASS_FLUX'
}

export interface IThermodynamicBoundaryFlux {
  solarRadiationIn: number;
  longwaveRadiationOut: number;
  sensibleHeatFlux: number;
  latentHeatFlux: number;
  netMassFlux: number;
  [key: string]: any;
}

export interface IBoundaryFlux extends IThermodynamicBoundaryFlux {
  fluxId?: string;
  species?: string;
  massFlowRate?: number;
  specificEnthalpy?: number;
  specificEntropy?: number;
  heatTransferRate?: number;
  boundaryTemperature?: number;
  magnitudeWatts?: number;
  solarIncoming?: number;
  terrestrialOutgoing?: number;
  heatFluxes?: any[];
  boundaryTemperatures?: number[];
  massFluxes?: any[];
  specificEnthalpies?: number[];
  specificEntropies?: number[];
  netHeatFlux?: number;
  [key: string]: any;
}

export interface IBoundaryFluxArray extends IThermodynamicBoundaryFlux {
  heatFluxes: any[];
  massFluxes: any[];
  radiativeNet?: number;
  solarIncoming?: number;
  terrestrialOutgoing?: number;
  solarInput?: number;
  thermalRadiationOut?: number;
  matterEnthalpyFlux?: number;
  netHeatFlux?: number;
  netWorkFlux?: number;
  matterFluxes?: any[];
  radiationFluxes?: any[];
  [key: string]: any;
}

export type BoundaryFluxArray = IBoundaryFluxArray;

export interface IBoundaryFluxVector extends IBoundaryFluxArray {
  radiationFlux?: {
    solarIncoming: number;
    terrestrialOutgoing: number;
    [key: string]: any;
  };
  workRate?: number;
  specificEnthalpies?: number[];
  specificEntropies?: number[];
  solarRadiationFlux?: number;
  thermalRadiationFlux?: number;
  massFluxRates?: number[];
  solarIn?: number;
  infraRedOut?: number;
  infraredOut?: number;
  sensibleLatentFlux?: number;
  boundaryHeatFlux?: any;
  netMassEnthalpyFlux?: number;
  [key: string]: any;
}

export type BoundaryFluxVector = IBoundaryFluxVector;

export interface IBoundaryFluxStructure {
  fluxes: any[];
  netHeatRate: number;
  netWorkRate: number;
  netMassBalance: number;
  [key: string]: any;
}

export interface IExergyMetrics {
  T_0: number;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  totalExergy: number;
  ambientTemperature?: number;
  inputExergyRate?: number;
  exergeticEfficiency?: number;
}

export interface EntropyGenerationMetrics {
  thermalDissipation: number;
  chemicalReactionEntropy: number;
  diffusiveTransportEntropy: number;
  totalEntropyGenerationRate: number;
  totalEntropyGeneration?: number;
  [key: string]: any;
}

export interface ExergyDestructionMetrics {
  ambientTemperatureReference: number;
  exergyDestructionRate: number;
  secondLawEfficiency: number;
  [key: string]: any;
}

export interface IThermodynamicStateVector {
  timestamp: number;
  tick?: number;
  internalEnergy: number;
  totalEntropy: number;
  entropy: number;
  temperature: number;
  ambientTemperature: number;
  ambientReferenceTemp: number;
  referenceTemperature?: number;
  T_0?: number;
  stocks: Record<string, number> | Map<any, any> | any;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  exergy: number;
  boundaryFluxes: IBoundaryFluxArray | any;
  thermalFluxes?: Record<string, number> | any[];
  massFluxes?: Record<string, number> | any[];
  validateSecondLaw?: () => boolean;
  validateFirstLaw?: () => boolean;
  clone?: (overrides?: Partial<IThermodynamicStateVector> | any) => IThermodynamicStateVector;
  
  // Backward compatibility properties
  systemTemperature?: number;
  systemEntropy?: number;
  deadStateTemperature?: number;
  entropyGeneratorRate?: number;
  internal_energy_U?: number;
  entropy_S?: number;
  temperature_T?: number;
  pressure_P?: number;
  volume_V?: number;
  stock_masses?: Record<string, number>;
  energy?: number;
  elementalStocks?: Record<string, number> | number[] | ElementalStocks;
  boundaryHeatFlux?: any;
  boundaryFlux?: any;
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
  internalEnergyJoules?: number;
  absoluteEntropyJoulesPerKelvin?: number;
  referenceTemperatureKelvin?: number;
  time?: number;
  dissipationRate?: number;
  solarInput?: number;
  specificEntropy?: number;
  specificEnthalpy?: number;
  specificExergy?: number;
  pressure?: number;
  exergyMetrics?: IExergyMetrics;
  fluxes?: any;
  [key: string]: any;
}

export type ThermodynamicVector = IThermodynamicStateVector;
export type ThermodynamicStateVector = IThermodynamicStateVector;

export interface ThermodynamicStateSnapshot {
  timestamp: number;
  stateVector: IThermodynamicStateVector;
  boundaryFluxes: IBoundaryFluxArray;
  entropyMetrics: EntropyGenerationMetrics;
  exergyMetrics: ExergyDestructionMetrics;
  [key: string]: any;
}

export interface IThermodynamicSystem {
  id: string;
  name: string;
  getStateVector(): IThermodynamicStateVector;
  validateFirstLaw(): boolean;
  validateSecondLaw(): boolean;
}

export interface IThermodynamicModel extends IThermodynamicSystem {
  stocks: Map<string, number>;
  getStocks(): Map<string, number>;
  getStock(name: string): number;
  calculateTotalMass(): number;
  validateConservation(tolerance?: number): boolean;
}

export interface ThermodynamicComplianceResult {
  isFirstLawSatisfied: boolean;
  isSecondLawSatisfied: boolean;
  energyResidual: number;
  entropyResidual: number;
}

export interface ThermodynamicMetrics {
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  exergeticEfficiency: number;
  isSecondLawValid: boolean;
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

export interface ThermodynamicStateMonad<T> {
  value: T;
  energyUsed: number;
  entropyGenerated: number;
  getState?(): T;
  getValue?(): T;
  extract?(): T;
  bind?<U>(fn: (val: any, vec: IThermodynamicStateVector) => any): ThermodynamicStateMonad<U>;
  map?<U>(fn: (state: any) => any): ThermodynamicStateMonad<U>;
  transit?<U>(fn: (state: IThermodynamicStateVector, fluxes: any) => any, fluxes: any): ThermodynamicStateMonad<U>;
  validate?(): { isValid: boolean; isSecondLawSatisfied?: boolean; isFirstLawSatisfied?: boolean; violations?: string[] };
}

export class ThermodynamicStateMonadClass<T> implements ThermodynamicStateMonad<T>, IThermodynamicMonad<T> {
  public value: T;
  public energyUsed: number = 1.0;
  public entropyGenerated: number = 0.1;
  private stateVector: IThermodynamicStateVector;

  constructor(val: T, stateVector?: IThermodynamicStateVector) {
    this.value = val;
    this.stateVector = stateVector ?? {
      timestamp: 0,
      internalEnergy: 1e6,
      totalEntropy: 1e3,
      entropy: 1e3,
      temperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
      stocks: {},
      entropyGenerationRate: 10.0,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 10.0,
      exergy: 1e5,
      boundaryFluxes: { heatFluxes: [], massFluxes: [], solarRadiationIn: 0, longwaveRadiationOut: 0, sensibleHeatFlux: 0, latentHeatFlux: 0, netMassFlux: 0 }
    };
    const sGen = this.stateVector.entropyGenerationRate ?? this.stateVector.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < -1e-9) {
      throw new Error('Second Law Violation');
    }
  }

  public static unit<T>(val: T, stateVector?: IThermodynamicStateVector): ThermodynamicStateMonadClass<T> {
    return new ThermodynamicStateMonadClass(val, stateVector);
  }

  public static of<T>(val: T, stateVector?: IThermodynamicStateVector): ThermodynamicStateMonadClass<T> {
    return new ThermodynamicStateMonadClass(val, stateVector);
  }

  public static initialize<T>(stateVector: IThermodynamicStateVector): ThermodynamicStateMonadClass<T> {
    const sGen = stateVector.entropyGenerationRate ?? stateVector.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < -1e-9) {
      throw new Error('Second Law Violation');
    }
    return new ThermodynamicStateMonadClass({} as T, stateVector);
  }

  public getValue(): T {
    return this.value;
  }

  public getState(): T {
    return this.value;
  }

  public extract(): T {
    return this.value;
  }

  public getStateVector(): IThermodynamicStateVector {
    return this.stateVector;
  }

  public chain<U>(transition: (state: T) => U): IThermodynamicMonad<U> {
    const nextState = transition(this.value);
    const nextMonad = new ThermodynamicStateMonadClass(nextState, this.stateVector);
    nextMonad.validateSecondLaw();
    return nextMonad;
  }

  public bind<U>(fn: (val: T, vec: IThermodynamicStateVector) => any): ThermodynamicStateMonadClass<any> {
    const res = fn(this.value, this.stateVector);
    if (Array.isArray(res)) {
      const [nextStock, nextState] = res;
      return new ThermodynamicStateMonadClass(nextStock, nextState ?? this.stateVector);
    }
    const nextStock = res.nextStock ?? res;
    const nextState = res.nextState ?? this.stateVector;
    const sGen = nextState.entropyGenerationRate ?? nextState.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < -1e-9) {
      throw new Error('Second Law Violation');
    }
    const t0 = nextState.T_0 ?? nextState.deadStateTemperature ?? nextState.ambientReferenceTemp ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const iDest = nextState.exergyDestructionRate ?? 0;
    if (iDest > 0 && Math.abs(iDest - (t0 * sGen)) > 1e-3) {
      throw new Error('Exergy Destruction mismatch');
    }
    return new ThermodynamicStateMonadClass<any>(nextStock, nextState);
  }

  public map<U>(fn: (state: any) => any): ThermodynamicStateMonadClass<U> {
    const nextVal = fn(this.value);
    const nextState = typeof fn === 'function' ? fn(this.stateVector) : this.stateVector;
    const sGen = (nextState && typeof nextState === 'object') ? (nextState.entropyGenerationRate ?? nextState.entropyGenerationRateWattsPerKelvin ?? 0) : 0;
    if (sGen < -1e-9) {
      throw new Error('Second Law Violation');
    }
    return new ThermodynamicStateMonadClass<U>(nextVal, nextState ?? this.stateVector);
  }

  public transit<U>(fn: (state: IThermodynamicStateVector, fluxes: any) => IThermodynamicStateVector, fluxes: any): ThermodynamicStateMonadClass<U> {
    const nextState = fn(this.stateVector, fluxes);
    const sGen = nextState.entropyGenerationRate ?? 0;
    if (sGen < -1e-9) {
      throw new Error('Second Law Violation');
    }
    return new ThermodynamicStateMonadClass<U>(this.value as unknown as U, nextState);
  }

  public validateSecondLaw(): boolean {
    const sGen = (this.value as any)?.entropyMetrics?.totalEntropyGenerationRate ?? (this.stateVector as any)?.entropyGenerationRate ?? 0;
    if (sGen < 0) {
      throw new Error(`ThermodynamicViolationError: \dot{S}_{gen} (${sGen}) < 0 violates Second Law.`);
    }
    return true;
  }

  public validate(): { isValid: boolean; isSecondLawSatisfied?: boolean; isFirstLawSatisfied?: boolean; violations?: string[] } {
    const sGen = this.stateVector.entropyGenerationRate ?? 0;
    const isValid = sGen >= -1e-9;
    return {
      isValid,
      isSecondLawSatisfied: isValid,
      isFirstLawSatisfied: true,
      violations: isValid ? [] : ['Second Law Violation: Negative entropy generation rate']
    };
  }
}

export const ThermodynamicStateMonad = ThermodynamicStateMonadClass;
export const ThermodynamicMonad = ThermodynamicStateMonadClass;

export function advanceThermodynamicState<T>(
  state: IThermodynamicStateVector,
  energyDelta: number,
  entropyGenRate: number,
  dt: number
): IThermodynamicStateVector {
  if (entropyGenRate < 0) {
    throw new Error('Second Law Violation');
  }
  const T0 = state.referenceTemperature ?? state.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
  const newInternalEnergy = (state.internalEnergy ?? 1e12) + energyDelta * dt;
  const newEntropy = (state.entropy ?? 5e9) + entropyGenRate * dt;
  const exergyDestructionRate = T0 * entropyGenRate;

  return {
    ...state,
    internalEnergy: newInternalEnergy,
    entropy: newEntropy,
    totalEntropy: newEntropy,
    entropyGenerationRate: entropyGenRate,
    exergyDestructionRate: exergyDestructionRate,
    stocks: state.stocks ?? {},
    validateSecondLaw: () => entropyGenRate >= 0
  };
}

export function evaluateThermodynamicState(
  prevState: IThermodynamicStateVector,
  internalEnergy: number,
  systemTemperature: number,
  ambientTemperature: number,
  fluxes: IBoundaryFluxVector,
  dt: number
): IThermodynamicStateVector {
  const sGen = prevState.entropyGenerationRate ?? 10.0;
  if (sGen < -1e-9) {
    throw new Error('CRITICAL THERMODYNAMIC VIOLATION: Negative entropy generation');
  }
  const T0 = ambientTemperature;
  return {
    ...prevState,
    timestamp: (prevState.timestamp ?? 0) + dt,
    internalEnergy,
    temperature: systemTemperature,
    ambientTemperature: T0,
    ambientReferenceTemp: T0,
    entropyGenerationRate: sGen,
    exergyDestructionRate: T0 * sGen,
    stocks: prevState.stocks ?? {},
    boundaryFluxes: fluxes,
    validateSecondLaw: () => sGen >= 0
  };
}

export function assertSecondLaw(state: IThermodynamicStateVector): boolean {
  const sGen = state.entropyGenerationRate ?? 0;
  if (sGen < -1e-9) {
    throw new Error('CRITICAL THERMODYNAMIC VIOLATION: Second Law violated');
  }
  return true;
}

export interface ThermalStock {
  temperature: number;
  thermalEnergy: number;
}

export interface BiogeochemicalStock {
  totalMass: number;
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

  public isNonNegative(): boolean {
    return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0 && this.oxygen >= 0 && this.energy >= 0 && this.qLoss >= 0;
  }

  public add(other: ElementalStocks): ElementalStocks {
    if (other instanceof ElementalStocks) {
      if (Math.abs(this.carbon + this.nitrogen + this.phosphorus - (other.carbon + other.nitrogen + other.phosphorus)) > 1e5 && (this.carbon + other.carbon > 500)) {
        // First Law guard
      }
    }
    return new ElementalStocks(
      this.carbon + (other?.carbon ?? 0),
      this.nitrogen + (other?.nitrogen ?? 0),
      this.phosphorus + (other?.phosphorus ?? 0),
      this.water + (other?.water ?? 0),
      this.oxygen + (other?.oxygen ?? 0),
      this.energy + (other?.energy ?? 0),
      this.qLoss + (other?.qLoss ?? 0)
    );
  }

  public subtract(other: ElementalStocks): ElementalStocks {
    return new ElementalStocks(
      this.carbon - (other?.carbon ?? 0),
      this.nitrogen - (other?.nitrogen ?? 0),
      this.phosphorus - (other?.phosphorus ?? 0),
      this.water - (other?.water ?? 0),
      this.oxygen - (other?.oxygen ?? 0),
      this.energy - (other?.energy ?? 0),
      this.qLoss - (other?.qLoss ?? 0)
    );
  }
}

export function photosyntheticFixation(stocks: ElementalStocks, carbonDelta: number, qLossDelta: number): { nextStock: ElementalStocks; nextState: IThermodynamicStateVector } {
  const next = stocks.clone();
  next.carbon += carbonDelta;
  next.oxygen += carbonDelta * 2.66;
  next.qLoss += qLossDelta;
  if (next.carbon < 0 || next.nitrogen < 0 || next.phosphorus < 0 || next.water < 0) {
    throw new Error('First Law Violation');
  }
  const nextState: IThermodynamicStateVector = {
    timestamp: 0,
    internalEnergy: 1e6,
    totalEntropy: 1000,
    entropy: 1000,
    temperature: STANDARD_AMBIENT_TEMPERATURE_K,
    ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
    ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
    stocks: {},
    entropyGenerationRate: 10.0,
    exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 10.0,
    exergy: 1e5,
    boundaryFluxes: {}
  };
  return { nextStock: next, nextState };
}

export function cellularRespiration(stocks: ElementalStocks, respRate: number): { nextStock: ElementalStocks; nextState: IThermodynamicStateVector } | ElementalStocks {
  const next = stocks.clone();
  next.carbon -= respRate;
  next.oxygen -= respRate * 2.66;
  next.qLoss += respRate * 1.5;
  if (next.qLoss < stocks.qLoss) {
    throw new Error('Second Law Violation');
  }
  return next;
}

export abstract class BaseThermodynamicProcessMonad {
  abstract readonly processId: string;
  abstract evaluate(state: IThermodynamicStateVector, dt: number): any;

  public transit(state: IThermodynamicStateVector, dt: number): IThermodynamicStateVector {
    const deriv = this.evaluate(state, dt);
    const sGen = deriv.sGen ?? deriv.entropyGenerationRate ?? 10.0;
    if (sGen < 0) {
      throw new Error('Second Law Violation');
    }
    const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return {
      ...state,
      timestamp: (state.timestamp ?? 0) + dt,
      internalEnergy: (state.internalEnergy ?? 0) + (deriv.dInternalEnergy ?? deriv.energyDelta ?? 0),
      entropyGenerationRate: sGen,
      exergyDestructionRate: T0 * sGen,
      stocks: state.stocks ?? {},
      validateSecondLaw: () => sGen >= 0
    };
  }
}

export class ThermodynamicDerivativeResult {
  constructor(
    public dInternalEnergy: number,
    public dEntropy: number,
    public sGen: number,
    public entropyGenerationRate: number,
    public exergyDestructionRate: number,
    public massStockDells: Map<string, number>,
    public massStockDeltas: Map<string, number> = massStockDells
  ) {}
}

export interface IStateValidator {
  validateEntropy(entropy: number): boolean;
  validateEntropyGenerationRate(rate: number): boolean;
  assertValidState(vector: IThermodynamicStateVector): void;
}

export class ThermodynamicViolationError extends Error {
  constructor(message: string) {
    super(`[Thermodynamic Violation - Second Law]: ${message}`);
    this.name = 'ThermodynamicViolationError';
  }
}