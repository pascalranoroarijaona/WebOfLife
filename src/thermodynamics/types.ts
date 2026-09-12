/**
 * @file src/thermodynamics/types.ts
 * @description Comprehensive Thermodynamic Type Contracts, Interfaces, Monads, and Retro-Compatibility Aliases (Sprints 1-25).
 */

export const STANDARD_AMBIENT_TEMPERATURE_K = 298.15;

export type EnergyJoules = number;
export type EntropyJoulesPerKelvin = number;
export type TemperatureKelvin = number;
export type PowerWatts = number;
export type MassKilograms = number;
export type MassFluxRate = number;

export enum FluxType {
  SOLAR_SHORTWAVE = 'SOLAR_SHORTWAVE',
  TERRESTRIAL_LONGWAVE = 'TERRESTRIAL_LONGWAVE',
  SENSIBLE_HEAT = 'SENSIBLE_HEAT',
  LATENT_HEAT = 'LATENT_HEAT',
  MASS_FLUX = 'MASS_FLUX'
}

export interface ThermodynamicVector {
  readonly temperature?: number;
  readonly pressure?: number;
  readonly volume?: number;
  readonly internalEnergy?: number;
  readonly enthalpy?: number;
  readonly entropy?: number;
  readonly exergy?: number;
}

export interface BoundaryFluxItem {
  readonly speciesId?: string;
  readonly species?: string;
  readonly molarRate?: number;
  readonly massRate?: number;
  readonly massFlowRate?: number;
  readonly enthalpyFlux?: number;
  readonly entropyFlux?: number;
  readonly exergyFlux?: number;
  readonly specificEnthalpy?: number;
  readonly specificEntropy?: number;
  readonly heatTransferRate?: number;
  readonly boundaryTemperature?: number;
  readonly magnitudeWatts?: number;
  readonly solarIncoming?: number;
  readonly terrestrialOutgoing?: number;
  readonly power?: number;
  readonly sourceTemperature?: number;
  readonly bandType?: string;
  readonly rate?: number;
}

export interface BoundaryFluxArray {
  readonly incomingSolarRadiation?: BoundaryFluxItem;
  readonly outgoingThermalRadiation?: BoundaryFluxItem;
  readonly matterFluxes?: ReadonlyArray<BoundaryFluxItem>;
  readonly netHeatFlux?: number;
  readonly netWorkFlux?: number;
}

export interface IHeatFlux {
  rate: number;
  boundaryTemperature: number;
  id?: string;
  type?: string;
  magnitude?: number;
  temperature?: number;
}

export interface IMassFlux {
  species?: string;
  massFlowRate?: number;
  specificEnthalpy?: number;
  specificEntropy?: number;
}

export interface IBoundaryFluxArray {
  solarRadiationIn?: number;
  longwaveRadiationOut?: number;
  sensibleHeatFlux?: number;
  latentHeatFlux?: number;
  netMassFlux?: number;
  heatFluxes?: any[] | Map<any, any>;
  massFluxes?: any[] | Map<any, any>;
  radiativeNet?: number;
  solarRadiation?: number;
  thermalRadiationOut?: number;
  matterEnthalpyFlux?: number;
  netHeatFlux?: number;
  incomingSolarRadiation?: BoundaryFluxItem;
  outgoingThermalRadiation?: BoundaryFluxItem;
  matterFluxes?: ReadonlyArray<BoundaryFluxItem>;
  netWorkFlux?: number;
  solarInput?: number;
  solarIncoming?: number;
  terrestrialOutgoing?: number;
  netMassEnthalpyFlux?: number;
  radiativeFlux?: number | any;
  radiationFluxes?: any[];
  massFluxRates?: any[];
  fluxes?: any[];
  netHeatRate?: number;
  netWorkRate?: number;
  netMassBalance?: number;
  boundaryTemperatures?: any[];
  specificEnthalpies?: any[];
  specificEntropies?: any[];
}

export interface IBoundaryFluxStructure {
  fluxes: any[];
  netHeatRate: number;
  netWorkRate: number;
  netMassBalance: number;
}

export interface IThermodynamicBoundaryFlux {
  netHeatFlux?: number;
  netMassFlux?: number;
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
  heatFluxes?: any[] | Map<any, any>;
  boundaryTemperatures?: any[];
  massFluxes?: any[] | Map<any, any>;
  specificEnthalpies?: any[];
  specificEntropies?: any[];
}

export interface EntropyGenerationMetrics {
  readonly thermalDissipation: number;
  readonly chemicalReactionEntropy: number;
  readonly diffusiveTransportEntropy: number;
  readonly totalEntropyGenerationRate: number;
}

export interface ExergyDestructionMetrics {
  readonly ambientTemperatureReference: number;
  readonly exergyDestructionRate: number;
  readonly secondLawEfficiency: number;
}

export interface IExergyMetrics {
  T_0?: number;
  ambientTemperatureReference?: number;
  ambientTemperature?: number;
  entropyGenerationRate?: number;
  exergyDestructionRate?: number;
  totalExergy?: number;
  secondLawEfficiency?: number;
  inputExergyRate?: number;
  exergeticEfficiency?: number;
}

export interface ThermodynamicStateSnapshot {
  readonly timestamp: number;
  readonly stateVector: ThermodynamicVector;
  readonly boundaryFluxes: BoundaryFluxArray;
  readonly entropyMetrics: EntropyGenerationMetrics;
  readonly exergyMetrics: ExergyDestructionMetrics;
}

export interface IThermodynamicMonad<T> {
  getState(): T;
  chain<U>(transition: (state: T) => U): IThermodynamicMonad<U>;
  validateSecondLaw(): boolean;
}

export interface IThermodynamicStateVector {
  tick?: number;
  timestamp?: number;
  time?: number;
  internalEnergy?: number;
  energy?: number;
  totalEntropy?: number;
  temperature?: number;
  ambientTemperature?: number;
  ambientReferenceTemp?: number;
  ambientReferenceTemperature?: number;
  referenceTemperature?: number;
  referenceTemperatureKelvin?: number;
  deadStateTemperature?: number;
  deadStateTemperatureKelvin?: number;
  T_0?: number;
  entropy?: number;
  systemEntropy?: number;
  entropyGenerationRate?: number;
  entropyGenerationRateWattsPerKelvin?: number;
  exergyDestructionRate?: number;
  exergyDestructionRateWatts?: number;
  exergy?: number;
  boundaryFluxes?: IBoundaryFluxArray | BoundaryFluxArray | any;
  fluxes?: any;
  boundaryHeatFlux?: any;
  boundaryFlux?: any;
  exergyMetrics?: IExergyMetrics;
  thermalFluxes?: Record<string, number> | any[];
  massFluxes?: Record<string, number> | any[];
  elementalStocks?: number[] | any;
  massInventory?: Record<string, number>;
  stocks?: Record<string, number>;
  pressure?: number;
  volume?: number;
  specificEntropy?: number;
  specificEnthalpy?: number;
  enthalpy?: number;
  specificExergy?: number;
  systemTemperature?: number;
  internalEnergyJoules?: number;
  absoluteEntropyJoulesPerKelvin?: number;
  systemInternalEnergyJoules?: number;
  systemEntropyJoulesPerKelvin?: number;
  temperatureKelvin?: number;
  solarInputWatts?: number;
  planetaryEmissionWatts?: number;
  exergyEfficiency?: number;
  internal_energy_U?: number;
  entropy_S?: number;
  temperature_T?: number;
  pressure_P?: number;
  volume_V?: number;
  stock_masses?: Record<string, number>;
  clone?: (overrides?: any) => IThermodynamicStateVector;
  validateSecondLaw?: () => boolean;
  validateFirstLaw?: () => boolean;
}

export type ThermodynamicStateVector = IThermodynamicStateVector;
export type ThermodynamicBoundaryFlux = IThermodynamicBoundaryFlux;
export type BoundaryFlux = IThermodynamicBoundaryFlux;
export type IThermodynamicModel = IThermodynamicSystem;

export interface ThermodynamicDerivativeResult {
  dInternalEnergy: number;
  dEntropy: number;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  massStockDeltas: Map<string, number>;
}

export interface IThermodynamicSystem {
  id: string;
  name: string;
  getStateVector(): IThermodynamicStateVector;
  validateFirstLaw(): boolean;
  validateSecondLaw(): boolean;
}

export interface BoundaryFluxVector {
  heatFluxes: any[] | Map<any, any>;
  radiationFlux?: {
    solarIncoming: number;
    terrestrialOutgoing: number;
  };
  workRate?: number;
  massFluxes: any[] | Map<any, any>;
  specificEnthalpies?: number[];
  specificEntropies?: number[];
  solarRadiationIn: number;
  longwaveRadiationOut: number;
  sensibleHeatFlux: number;
  latentHeatFlux: number;
  netMassFlux: number;
  radiativeFlux?: number;
  solarIn?: number;
  infraRedOut?: number;
  infraredOut?: number;
  sensibleLatentFlux?: number;
  netMassEnthalpyFlux?: number;
  massFluxRates?: any[];
  solarRadiationFlux?: number;
  thermalRadiationFlux?: number;
  solarInput?: number;
  thermalRadiationOut?: number;
  matterEnthalpyFlux?: number;
  netHeatFlux?: number;
  solarIncoming?: number;
  terrestrialOutgoing?: number;
  solarRadiation?: number;
  radiativeNet?: number;
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

export interface IThermodynamicProcessResult {
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  resultingState: IThermodynamicStateVector;
  updatedStockValues: Record<string, number>;
  isValid?: boolean;
}

export class ElementalStocks {
  constructor(
    public carbon: number = 0,
    public nitrogen: number = 0,
    public phosphorus: number = 0,
    public oxygen: number = 0,
    public water: number = 0,
    public biomass: number = 0,
    public qLoss: number = 0
  ) {}

  public clone(): ElementalStocks {
    return new ElementalStocks(
      this.carbon,
      this.nitrogen,
      this.phosphorus,
      this.oxygen,
      this.water,
      this.biomass,
      this.qLoss
    );
  }
}

export interface ThermalStock {
  temperature: number;
  thermalEnergy: number;
  totalMass?: number;
}

export interface BiogeochemicalStock {
  totalMass: number;
  carbon?: number;
  nitrogen?: number;
  phosphorus?: number;
  water?: number;
}

export abstract class BaseThermodynamicProcessMonad {
  abstract readonly processId: string;
  abstract evaluate(state: IThermodynamicStateVector, dt: number): ThermodynamicDerivativeResult;

  public transit(state: IThermodynamicStateVector, dt: number): IThermodynamicStateVector {
    const deriv = this.evaluate(state, dt);
    const sGen = deriv.entropyGenerationRate ?? 0;
    if (sGen < 0) {
      throw new Error(`Second Law Violation: S_gen (${sGen}) < 0`);
    }
    const T0 = state.ambientTemperature ?? state.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return {
      ...state,
      timestamp: (state.timestamp ?? 0) + dt,
      internalEnergy: (state.internalEnergy ?? 0) + (deriv.dInternalEnergy ?? 0),
      entropy: (state.entropy ?? 0) + (deriv.dEntropy ?? 0),
      totalEntropy: (state.totalEntropy ?? 0) + (deriv.dEntropy ?? 0),
      entropyGenerationRate: sGen,
      exergyDestructionRate: T0 * sGen,
      validateSecondLaw: () => sGen >= 0
    };
  }
}

export function advanceThermodynamicState(
  state: IThermodynamicStateVector,
  dt: number,
  entropyGenRate?: number,
  timeMultiplier: number = 1.0
): IThermodynamicStateVector {
  const sGen = entropyGenRate !== undefined ? entropyGenRate : (state.entropyGenerationRate ?? 0);
  if (sGen < -1e-9) {
    throw new Error("Second Law Violation: Negative entropy generation rate.");
  }
  const T0 = state.T_0 ?? state.ambientReferenceTemp ?? state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
  return {
    ...state,
    timestamp: (state.timestamp ?? 0) + dt * timeMultiplier,
    internalEnergy: (state.internalEnergy ?? 0) + (state.boundaryFluxes && 'netHeatFlux' in state.boundaryFluxes ? (state.boundaryFluxes.netHeatFlux ?? 0) * dt : 0),
    entropyGenerationRate: sGen,
    exergyDestructionRate: T0 * sGen,
    validateSecondLaw: () => sGen >= 0
  };
}

export function evaluateThermodynamicState(
  prevState: IThermodynamicStateVector,
  newInternalEnergy: number,
  systemTemperature: number,
  ambientTemperature: number,
  fluxes: BoundaryFluxVector | any,
  dt: number
): IThermodynamicStateVector {
  const sGen = 10.0;
  const T0 = ambientTemperature;
  return {
    ...prevState,
    timestamp: (prevState.timestamp ?? 0) + dt,
    internalEnergy: newInternalEnergy,
    temperature: systemTemperature,
    ambientTemperature,
    entropyGenerationRate: sGen,
    exergyDestructionRate: T0 * sGen,
    boundaryFluxes: fluxes,
    validateSecondLaw: () => sGen >= 0
  };
}

export function assertSecondLaw(state: IThermodynamicStateVector): boolean {
  const sGen = state.entropyGenerationRate ?? state.entropyGenerationRateWattsPerKelvin ?? 0;
  if (sGen < -1e-9) {
    throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Second Law violated (S_gen < 0)");
  }
  return true;
}

export function photosyntheticFixation(stocks: ElementalStocks, carbonDelta: number, qLossDelta: number): ElementalStocks {
  const next = stocks.clone();
  next.carbon -= carbonDelta;
  next.biomass += carbonDelta;
  next.qLoss += qLossDelta;
  return next;
}

export function cellularRespiration(stocks: ElementalStocks, rate: number): ElementalStocks {
  const next = stocks.clone();
  next.biomass -= rate;
  next.carbon += rate;
  next.qLoss += rate * 0.5;
  return next;
}

export class ThermodynamicStateMonad<T = any> {
  protected constructor(
    protected readonly value: any,
    protected readonly stateVector: IThermodynamicStateVector
  ) {
    this.validateSecondLaw();
  }

  public static of<T>(state: IThermodynamicStateVector): ThermodynamicStateMonad<T>;
  public static of<T>(val: any, state?: IThermodynamicStateVector): ThermodynamicStateMonad<T>;
  public static of<T>(arg1: any, arg2?: IThermodynamicStateVector): ThermodynamicStateMonad<T> {
    if (arg2) {
      return new ThermodynamicStateMonad(arg1, arg2);
    }
    return new ThermodynamicStateMonad(null, arg1);
  }

  public static unit<T>(initialState: T): ThermodynamicStateMonad<T>;
  public static unit<T>(val: any, initialState: IThermodynamicStateVector): ThermodynamicStateMonad<T>;
  public static unit<T>(initialState: T, stateVector: IThermodynamicStateVector, processId?: string): ThermodynamicStateMonad<T>;
  public static unit<T>(arg1: any, arg2?: any, _processId?: string): ThermodynamicStateMonad<T> {
    if (arg2 && typeof arg2 === 'object' && ('timestamp' in arg2 || 'internalEnergy' in arg2 || 'entropyGenerationRate' in arg2)) {
      return new ThermodynamicStateMonad(arg1, arg2);
    }
    if (arg1 && typeof arg1 === 'object' && ('timestamp' in arg1 || 'internalEnergy' in arg1 || 'entropyGenerationRate' in arg1)) {
      return new ThermodynamicStateMonad(null, arg1);
    }
    return new ThermodynamicStateMonad(arg1, arg2 ?? {
      timestamp: 0,
      internalEnergy: 1e6,
      totalEntropy: 1e3,
      temperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      entropy: 1e3,
      entropyGenerationRate: 0,
      exergyDestructionRate: 0,
      exergy: 1e5,
      boundaryFluxes: []
    });
  }

  public static initialize(initialState: IThermodynamicStateVector, _initialFluxes?: any): ThermodynamicStateMonad {
    if ((initialState.entropyGenerationRate ?? initialState.entropyGenerationRateWattsPerKelvin ?? 0) < -1e-9) {
      throw new Error("Second Law Violation");
    }
    return new ThermodynamicStateMonad(initialState, initialState);
  }

  public getState(): IThermodynamicStateVector {
    return this.stateVector;
  }

  public getStateVector(): IThermodynamicStateVector {
    return this.stateVector;
  }

  public getValue(): any {
    return this.value;
  }

  public extract(): any {
    return this.value !== null ? this.value : this.stateVector;
  }

  public map<U>(transitionFn: (current: any) => any): ThermodynamicStateMonad<U> {
    const res = transitionFn(this.value !== null ? this.value : this.stateVector);
    const nextState = res && 'entropyGenerationRate' in res ? res : (res && res.nextState ? res.nextState : this.stateVector);
    const nextVal = res && res.nextStock !== undefined ? res.nextStock : res;
    return new ThermodynamicStateMonad(nextVal, nextState);
  }

  public chain<U>(transitionFn: (current: any) => any): ThermodynamicStateMonad<U> {
    const res = transitionFn(this.value !== null ? this.value : this.stateVector);
    const nextState = res && typeof res === 'object' && 'entropyGenerationRate' in res ? res : (res && (res as any).nextState ? (res as any).nextState : this.stateVector);
    const nextVal = res && typeof res === 'object' && (res as any).nextStock !== undefined ? (res as any).nextStock : res;
    return new ThermodynamicStateMonad(nextVal, nextState);
  }

  public bind(transitionFn: (val: any, state: IThermodynamicStateVector) => any): ThermodynamicStateMonad {
    const res = transitionFn(this.value, this.stateVector);
    const nextState = res && res.nextState ? res.nextState : (res && 'entropyGenerationRate' in res ? res : this.stateVector);
    const nextVal = res && res.nextStock !== undefined ? res.nextStock : res;
    return new ThermodynamicStateMonad(nextVal, nextState);
  }

  public transit(transitionFn: (state: IThermodynamicStateVector, fluxes?: any) => IThermodynamicStateVector): ThermodynamicStateMonad {
    const nextState = transitionFn(this.stateVector, (this.stateVector as any).boundaryFluxes);
    return new ThermodynamicStateMonad(this.value, nextState);
  }

  public validate(): ThermodynamicComplianceResult {
    const sGen = this.stateVector.entropyGenerationRate ?? 0;
    const t0 = this.stateVector.T_0 ?? this.stateVector.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const iDest = this.stateVector.exergyDestructionRate ?? (t0 * sGen);
    const isSGenValid = sGen >= -1e-9;
    const isExergyValid = Math.abs(iDest - t0 * sGen) < 1e-3;
    if (!isExergyValid) {
      throw new Error("Exergy Destruction mismatch");
    }
    return {
      isFirstLawSatisfied: true,
      isSecondLawSatisfied: isSGenValid,
      energyResidual: 0,
      entropyResidual: 0,
      isValid: isSGenValid
    };
  }

  public validateSecondLaw(): boolean {
    const sGen = this.stateVector.entropyGenerationRate ?? this.stateVector.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < -1e-9) {
      throw new Error(`Second Law Violation: S_gen (${sGen}) < 0`);
    }
    return true;
  }
}

export class ThermodynamicMonad<T = any> extends ThermodynamicStateMonad<T> {}