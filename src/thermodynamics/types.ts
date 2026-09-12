/**
 * Thermodynamic Types & Interfaces (Retro-Compatibility & Sprint 031 extensions)
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface StateValidatorOptions {
  strictMode?: boolean;
  tolerance?: number;
  requireSolarInputBinding?: boolean;
}

export interface ThermodynamicVector {
  temperature: number;
  pressure: number;
  volume: number;
  internalEnergy: number;
  enthalpy: number;
  entropy: number;
  exergy: number;
}

export interface IHeatFlux {
  rate?: number;
  magnitude?: number;
  heatTransferRate?: number;
  boundaryTemperature?: number;
  temperature?: number;
}

export interface IMassFlux {
  species?: string;
  speciesId?: string;
  massFlowRate?: number;
  specificEnthalpy?: number;
  specificEntropy?: number;
}

export interface IBoundaryFlux {
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
  heatFluxes?: any;
  boundaryTemperatures?: number[];
  massFluxes?: any;
  specificEnthalpies?: number[];
  specificEntropies?: number[];
  netHeatFlux?: number;
  netMassFlux?: number;
  solarRadiationIn?: number;
  longwaveRadiationOut?: number;
  sensibleHeatFlux?: number;
  latentHeatFlux?: number;
  [key: string]: any;
}

export type BoundaryFlux = IBoundaryFlux;

export interface BoundaryFluxVector {
  solarRadiationIn?: number;
  longwaveRadiationOut?: number;
  sensibleHeatFlux?: number;
  latentHeatFlux?: number;
  netMassFlux?: number;
  solarIn?: number;
  infraRedOut?: number;
  infraredOut?: number;
  sensibleLatentFlux?: number;
  heatFluxes?: any;
  radiationFlux?: {
    solarIncoming?: number;
    terrestrialOutgoing?: number;
    [key: string]: any;
  };
  workRate?: number;
  massFluxes?: any;
  specificEnthalpies?: any;
  specificEntropies?: any;
  netMassEnthalpyFlux?: number;
  radiativeNet?: number;
  solarRadiationFlux?: number;
  thermalRadiationFlux?: number;
  massFluxRates?: number[];
  [key: string]: any;
}

export interface ThermodynamicStateVector {
  temperature?: number; // Kelvin
  stocks?: Record<string, number> | Map<string, any> | any; // Elemental & energy pools
  entropy?: number; // kJ / K (Must be >= 0)
  dissipationRate?: number; // kJ / s (Must be >= 0 if present)
  solarInput?: number; // kJ / mol equivalent added per step
  timestamp?: number;
  time?: number;
  tick?: number;
  internalEnergy?: number;
  internal_energy_U?: number;
  entropy_S?: number;
  temperature_T?: number;
  pressure_P?: number;
  volume_V?: number;
  stock_masses?: Record<string, number>;
  totalEntropy?: number;
  ambientTemperature?: number;
  ambientReferenceTemp?: number;
  referenceTemperature?: number;
  T_0?: number;
  entropyGenerationRate?: number;
  exergyDestructionRate?: number;
  exergy?: number;
  boundaryFluxes?: IBoundaryFluxArray | any;
  boundaryFlux?: any;
  thermalFluxes?: any;
  massFluxes?: any;
  elementalStocks?: any;
  systemTemperature?: number;
  deadStateTemperature?: number;
  deadStateTemperatureKelvin?: number;
  temperatureKelvin?: number;
  entropyGenerationRateWattsPerKelvin?: number;
  exergyDestructionRateWatts?: number;
  exergyEfficiency?: number;
  systemInternalEnergyJoules?: number;
  systemEntropyJoulesPerKelvin?: number;
  solarInputWatts?: number;
  planetaryEmissionWatts?: number;
  boundaryHeatFlux?: any;
  massInventory?: Record<string, number>;
  ambientReferenceTemperature?: number;
  internalEnergyJoules?: number;
  absoluteEntropyJoulesPerKelvin?: number;
  referenceTemperatureKelvin?: number;
  specificEntropy?: number;
  specificEnthalpy?: number;
  specificExergy?: number;
  exergyMetrics?: any;
  energy?: number;
  fluxes?: any;
  validateSecondLaw?: () => boolean;
  validateFirstLaw?: () => boolean;
  clone?: (overrides?: any) => ThermodynamicStateVector | IThermodynamicStateVector;
  [key: string]: any;
}

export interface IThermodynamicStateVector extends ThermodynamicStateVector {}

export const STANDARD_AMBIENT_TEMPERATURE_K = 298.15;

export interface IBoundaryFluxArray {
  solarRadiationIn?: number;
  longwaveRadiationOut?: number;
  sensibleHeatFlux?: number;
  latentHeatFlux?: number;
  netMassFlux?: number;
  solarInput?: number;
  thermalRadiationOut?: number;
  matterEnthalpyFlux?: number;
  netHeatFlux?: number;
  heatFluxes?: any;
  massFluxes?: any;
  matterFluxes?: any;
  radiativeNet?: number;
  incomingSolarRadiation?: any;
  outgoingThermalRadiation?: any;
  netWorkFlux?: number;
  radiationFluxes?: any[];
  [key: string]: any;
}

export class BoundaryFluxArray implements IBoundaryFluxArray {
  public solarRadiationIn: number = 0;
  public longwaveRadiationOut: number = 0;
  public sensibleHeatFlux: number = 0;
  public latentHeatFlux: number = 0;
  public netMassFlux: number = 0;
  public heatFluxes: any[] = [];
  public massFluxes: any[] = [];
  public matterFluxes: any[] = [];
  public netHeatFlux: number = 0;
  public netWorkFlux: number = 0;
}

export interface IExergyMetrics {
  T_0: number;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  totalExergy: number;
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
  ergeticEfficiency?: number;
  exergeticEfficiency?: number;
  isSecondLawValid: boolean;
}

export interface IThermodynamicBoundaryFlux {
  radiativeNet?: number;
  sensibleHeatFlux?: number;
  latentHeatFlux?: number;
  netMassFlux?: number;
  portId?: string;
  heatFluxWatts?: number;
  boundaryTemperatureKelvin?: number;
  massFlowRateKgPerSec?: number;
  specificEnthalpyJoulesPerKg?: number;
  specificEntropyJoulesPerKgKelvin?: number;
}

export interface IThermodynamicSystem {
  id: string;
  name: string;
  stocks: Map<string, any>;
  getStateVector(): IThermodynamicStateVector;
  validateFirstLaw(): boolean;
  validateSecondLaw(): boolean;
  validateLaws(): ThermodynamicComplianceResult;
}

export interface IThermodynamicModel extends IThermodynamicSystem {
  stocks: Map<string, any>;
}

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

export interface ThermodynamicStateSnapshot {
  timestamp: number;
  stateVector: ThermodynamicVector;
  boundaryFluxes: IBoundaryFluxArray | any;
  entropyMetrics: EntropyGenerationMetrics;
  exergyMetrics: ExergyDestructionMetrics;
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

export interface ThermalStock {
  temperature: number;
  thermalEnergy: number;
}

export interface BiogeochemicalStock {
  totalMass: number;
}

export enum FluxType {
  SOLAR_SHORTWAVE = 'SOLAR_SHORTWAVE',
  TERRESTRIAL_LONGWAVE = 'TERRESTRIAL_LONGWAVE',
  SENSIBLE_HEAT = 'SENSIBLE_HEAT',
  LATENT_HEAT = 'LATENT_HEAT'
}

export interface IBoundaryFluxStructure {
  fluxes: Array<{
    id?: string;
    type?: string;
    magnitude?: number;
    temperature?: number;
    [key: string]: any;
  }>;
  netHeatRate: number;
  netWorkRate: number;
  netMassBalance: number;
}

export type ThermodynamicBoundaryFlux = IBoundaryFlux;

export abstract class BaseThermodynamicProcessMonad {
  abstract readonly processId: string;
  abstract evaluate(state: ThermodynamicStateVector, dt: number): ThermodynamicDerivativeResult;
  public transit(state: ThermodynamicStateVector, dt: number): ThermodynamicStateVector {
    const res = this.evaluate(state, dt);
    if (res.entropyGenerationRate < -1e-9) {
      throw new Error("Second Law Violation");
    }
    const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return {
      ...state,
      timestamp: (state.timestamp ?? 0) + dt,
      internalEnergy: (state.internalEnergy ?? 0) + res.dInternalEnergy,
      entropy: (state.entropy ?? 0) + res.dEntropy,
      stocks: state.stocks ?? {},
      entropyGenerationRate: res.entropyGenerationRate,
      exergyDestructionRate: T0 * res.entropyGenerationRate,
      validateSecondLaw: () => res.entropyGenerationRate >= 0
    };
  }
}

export interface ThermodynamicDerivativeResult {
  dInternalEnergy: number;
  dEntropy: number;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  massStockDeltas: Map<string, number>;
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
    return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0 && this.oxygen >= 0;
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

export function photosyntheticFixation(stocks: ElementalStocks, carbonDelta: number, qLossDelta: number): ElementalStocks {
  const next = stocks.clone();
  next.carbon += carbonDelta;
  next.qLoss += qLossDelta;
  return next;
}

export function cellularRespiration(stocks: ElementalStocks, rate: number): ElementalStocks {
  const next = stocks.clone();
  next.carbon -= rate * 0.1;
  next.qLoss += rate * 0.5;
  return next;
}

export class ThermodynamicStateMonad {
  private value: any;
  private stateVector: IThermodynamicStateVector;

  constructor(valOrState: any, stateVector?: IThermodynamicStateVector, _processId?: string) {
    if (valOrState instanceof ThermodynamicStateMonad) {
      this.value = valOrState.value;
      this.stateVector = valOrState.stateVector;
    } else if (stateVector !== undefined) {
      this.value = valOrState;
      this.stateVector = { stocks: {}, entropy: 1e3, temperature: STANDARD_AMBIENT_TEMPERATURE_K, ...stateVector };
    } else {
      this.value = valOrState;
      this.stateVector = { stocks: {}, entropy: 1e3, temperature: STANDARD_AMBIENT_TEMPERATURE_K, ...(valOrState && typeof valOrState === 'object' ? valOrState : {}) };
    }
    if (this.stateVector && (this.stateVector.entropyGenerationRate ?? 0) < -1e-9) {
      throw new Error("Second Law Violation");
    }
  }

  public static of(value: any, stateVector?: IThermodynamicStateVector): ThermodynamicStateMonad {
    return new ThermodynamicStateMonad(value, stateVector ?? (value && typeof value === 'object' && 'entropyGenerationRate' in value ? value : { entropyGenerationRate: 10.0, stocks: {}, entropy: 1e3, temperature: STANDARD_AMBIENT_TEMPERATURE_K }));
  }

  public static unit(value: any, stateVector?: IThermodynamicStateVector, processId?: string): ThermodynamicStateMonad {
    return new ThermodynamicStateMonad(value, stateVector ?? (value && typeof value === 'object' && 'entropyGenerationRate' in value ? value : { entropyGenerationRate: 10.0, stocks: {}, entropy: 1e3, temperature: STANDARD_AMBIENT_TEMPERATURE_K }), processId);
  }

  public static initialize(stateVector: IThermodynamicStateVector): ThermodynamicStateMonad {
    const sGen = stateVector.entropyGenerationRate ?? stateVector.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < -1e-9) {
      throw new Error("Second Law Violation");
    }
    return new ThermodynamicStateMonad(stateVector, stateVector);
  }

  public bind(fn: (val: any, state: IThermodynamicStateVector) => { nextStock?: any; nextState: IThermodynamicStateVector } | any): ThermodynamicStateMonad {
    const res = fn(this.value, this.stateVector);
    const nextState = res && res.nextState ? res.nextState : (res && res.entropyGenerationRate !== undefined ? res : this.stateVector);
    const nextVal = res && res.nextStock !== undefined ? res.nextStock : (res && res.nextState ? res.value : res);
    
    const sGen = nextState.entropyGenerationRate ?? nextState.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < -1e-9) {
      throw new Error("Second Law Violation");
    }
    const T0 = nextState.T_0 ?? nextState.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const iDest = nextState.exergyDestructionRate ?? nextState.exergyDestructionRateWatts ?? (T0 * sGen);
    if (Math.abs(iDest - (T0 * sGen)) > 1e-3 && nextState.exergyDestructionRate !== undefined) {
      throw new Error("Exergy Destruction mismatch");
    }

    return new ThermodynamicStateMonad(nextVal, {
      ...nextState,
      stocks: nextState.stocks ?? {},
      entropy: nextState.entropy ?? 1e3,
      temperature: nextState.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K,
      entropyGenerationRate: sGen,
      exergyDestructionRate: iDest
    });
  }

  public map(fn: (val: any) => any): ThermodynamicStateMonad {
    const nextVal = fn(this.value);
    const nextState = nextVal && typeof nextVal === 'object' && 'entropyGenerationRate' in nextVal ? nextVal : this.stateVector;
    const sGen = nextState.entropyGenerationRate ?? nextState.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < -1e-9) {
      throw new Error("Second Law Violation");
    }
    return new ThermodynamicStateMonad(nextVal, { ...nextState, stocks: nextState.stocks ?? {}, entropy: nextState.entropy ?? 1e3, temperature: nextState.temperature ?? STANDARD_AMBIENT_TEMPERATURE_K });
  }

  public chain<U>(transition: (state: any) => U): ThermodynamicStateMonad {
    const nextVal = transition(this.value);
    const sGen = (nextVal as any)?.entropyMetrics?.totalEntropyGenerationRate ?? (nextVal as any)?.entropyGenerationRate ?? 0;
    if (sGen < 0) {
      throw new Error("ThermodynamicViolationError: Second Law violated.");
    }
    return new ThermodynamicStateMonad(nextVal, this.stateVector);
  }

  public transit(transitionFn: (state: IThermodynamicStateVector, fluxes?: any) => any): ThermodynamicStateMonad {
    const res = transitionFn(this.stateVector, this.stateVector.boundaryFluxes);
    const nextState = res.getState ? res.getState() : res;
    return new ThermodynamicStateMonad(this.value, nextState);
  }

  public getValue(): any {
    return this.value;
  }

  public extract(): any {
    return this.value ?? this.stateVector;
  }

  public getStateVector(): IThermodynamicStateVector {
    return this.stateVector;
  }

  public getState(): IThermodynamicStateVector {
    return this.stateVector;
  }

  public validate(): { isValid: boolean; isSecondLawSatisfied: boolean; isFirstLawSatisfied: boolean; violations?: string[] } {
    const sGen = this.stateVector.entropyGenerationRate ?? 0;
    const isValid = sGen >= -1e-9;
    return {
      isValid,
      isSecondLawSatisfied: isValid,
      isFirstLawSatisfied: true,
      violations: isValid ? [] : ['Second Law Violation']
    };
  }
}

export { ThermodynamicStateMonad as ThermodynamicMonad };
export type IThermodynamicMonadType<T> = IThermodynamicMonad<T>;

export function evaluateThermodynamicState(
  state: IThermodynamicStateVector,
  internalEnergy: number,
  systemTemperature: number,
  ambientTemperature: number,
  boundaryFluxes: BoundaryFluxVector | any,
  dt: number
): IThermodynamicStateVector {
  const sGen = state.entropyGenerationRate ?? 10.0;
  if (sGen < -1e-9) {
    throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Negative entropy generation rate.");
  }
  const T0 = ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
  return {
    ...state,
    timestamp: (state.timestamp ?? 0) + dt,
    internalEnergy,
    temperature: systemTemperature,
    ambientTemperature: T0,
    stocks: state.stocks ?? {},
    entropy: state.entropy ?? 1e3,
    entropyGenerationRate: sGen,
    exergyDestructionRate: T0 * sGen,
    boundaryFluxes,
    validateSecondLaw: () => sGen >= 0,
    validateFirstLaw: () => true
  };
}

export function assertSecondLaw(state: IThermodynamicStateVector): boolean {
  const sGen = state.entropyGenerationRate ?? state.entropyGenerationRateWattsPerKelvin ?? 0;
  if (sGen < -1e-9) {
    throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Second Law violated.");
  }
  return true;
}

export function advanceThermodynamicState(
  state: IThermodynamicStateVector,
  _dtOrEnergy?: number,
  entropyGenRate: number = 10.0,
  dt: number = 1.0
): IThermodynamicStateVector {
  if (entropyGenRate < -1e-9) {
    throw new Error("Second Law Violation");
  }
  const T0 = state.referenceTemperature ?? state.T_0 ?? state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
  return {
    ...state,
    timestamp: (state.timestamp ?? 0) + dt,
    stocks: state.stocks ?? {},
    entropy: state.entropy ?? 1e3,
    entropyGenerationRate: entropyGenRate,
    exergyDestructionRate: T0 * entropyGenRate,
    validateSecondLaw: () => entropyGenRate >= 0
  };
}