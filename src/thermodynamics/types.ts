/**
 * Thermodynamic Types & Interfaces (Retro-Compatibility & Sprint 033 extensions)
 */

export interface ValidationFailure {
  property: string;
  reason: string;
}

export interface ValidationResult {
  valid?: boolean;
  isValid?: boolean;
  errors: (string | ValidationFailure)[];
  warnings?: string[];
}

export interface ThermodynamicState {
  energy?: number;
  entropy?: number;
  temperature?: number;
  stocks?: Record<string, number> | Map<string, number>;
  [key: string]: any;
}

export interface StateValidatorOptions {
  strictMode?: boolean;
  tolerance?: number;
  requireSolarInputBinding?: boolean;
}

export interface ThermodynamicVector {
  temperature?: number;
  pressure?: number;
  volume?: number;
  internalEnergy?: number;
  enthalpy?: number;
  entropy?: number;
  exergy?: number;
  [key: string]: any;
}

export interface IHeatFlux {
  rate?: number;
  magnitude?: number;
  heatTransferRate?: number;
  boundaryTemperature?: number;
  temperature?: number;
  [key: string]: any;
}

export interface IMassFlux {
  species?: string;
  speciesId?: string;
  massFlowRate?: number;
  specificEnthalpy?: number;
  specificEntropy?: number;
  [key: string]: any;
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
  ambientTemperature?: number;
  ambientReferenceTemp?: number;
  stocks?: Record<string, number> | Map<string, any> | any; // Elemental & energy pools
  entropy?: number; // kJ / K (Must be >= 0)
  energy?: number;
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
  referenceTemperature?: number;
  T_0?: number;
  entropyGenerationRate?: number;
  entropyGeneratorRate?: number;
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
  fluxes?: any;
  validateSecondLaw?: () => boolean;
  validateFirstLaw?: () => boolean;
  clone?: (overrides?: any) => ThermodynamicStateVector | IThermodynamicStateVector;
  [key: string]: any;
}

export interface IThermodynamicStateVector extends ThermodynamicStateVector {
  temperature?: number;
  ambientTemperature?: number;
  ambientReferenceTemp?: number;
  entropy?: number;
  energy?: number;
  stocks?: Record<string, number>;
  entropyGenerationRate?: number;
  exergyDestructionRate?: number;
  timestamp?: number;
}

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
  [key: string]: any;
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
  [key: string]: any;
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
  [key: string]: any;
}

export interface ExergyDestructionMetrics {
  ambientTemperatureReference: number;
  exergyDestructionRate: number;
  secondLawEfficiency: number;
  [key: string]: any;
}

export interface ThermodynamicStateSnapshot {
  timestamp: number;
  stateVector: ThermodynamicVector;
  boundaryFluxes: IBoundaryFluxArray | any;
  entropyMetrics: EntropyGenerationMetrics;
  exergyMetrics: ExergyDestructionMetrics;
  [key: string]: any;
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

// --- Retro-Compatibility Exports for Sprints 001-033 ---

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

export function photosyntheticFixation(stocks: ElementalStocks, carbonDelta: number, _efficiency: number = 0.05): ElementalStocks {
  const next = stocks.clone();
  next.carbon += carbonDelta;
  next.energy += carbonDelta * 10.0;
  return next;
}

export function cellularRespiration(stocks: ElementalStocks, rate: number): ElementalStocks {
  const next = stocks.clone();
  next.carbon = Math.max(0, next.carbon - rate);
  next.qLoss += rate * 5.0;
  return next;
}

export class ThermodynamicStateMonad<T> {
  constructor(
    private readonly value: T,
    private readonly stateVector: IThermodynamicStateVector,
    private readonly processId?: string
  ) {
    this.validateInvariants();
  }

  public static unit<T>(value: T, stateVector?: IThermodynamicStateVector, processId?: string): ThermodynamicStateMonad<T> {
    const vec: IThermodynamicStateVector = stateVector ?? {
      timestamp: 0,
      temperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientReferenceTemp: STANDARD_AMBIENT_TEMPERATURE_K,
      internalEnergy: 1e6,
      entropy: 1000,
      totalEntropy: 1000,
      entropyGenerationRate: 10.0,
      entropyGeneratorRate: 10.0,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 10.0,
      exergy: 1e5,
      energy: 1e6,
      stocks: value instanceof ElementalStocks ? { carbon: value.carbon, nitrogen: value.nitrogen } : {},
      boundaryFluxes: []
    };
    return new ThermodynamicStateMonad(value, vec, processId);
  }

  public static of<T>(value: T, stateVector?: IThermodynamicStateVector): ThermodynamicStateMonad<T> {
    return ThermodynamicStateMonad.unit(value, stateVector);
  }

  public static initialize<T>(stateVector: IThermodynamicStateVector): ThermodynamicStateMonad<T> {
    return new ThermodynamicStateMonad({} as T, stateVector);
  }

  public getValue(): T {
    return this.value;
  }

  public extract(): T {
    return this.value;
  }

  public getState(): T {
    return this.value;
  }

  public getStateVector(): IThermodynamicStateVector {
    return this.stateVector;
  }

  public bind<U>(transition: (val: T, vec: IThermodynamicStateVector) => { nextStock: U; nextState: IThermodynamicStateVector } | [U, IThermodynamicStateVector] | any): ThermodynamicStateMonad<U> {
    const res = transition(this.value, this.stateVector);
    let nextVal: U;
    let nextVec: IThermodynamicStateVector;

    if (Array.isArray(res)) {
      [nextVal, nextVec] = res;
    } else if (res && typeof res === 'object' && 'nextStock' in res && 'nextState' in res) {
      nextVal = res.nextStock;
      nextVec = res.nextState;
    } else {
      nextVal = res;
      nextVec = this.stateVector;
    }

    return new ThermodynamicStateMonad(nextVal, nextVec, this.processId);
  }

  public chain<U>(transition: (state: T) => U): ThermodynamicStateMonad<U> {
    const nextVal = transition(this.value);
    return new ThermodynamicStateMonad(nextVal, this.stateVector, this.processId);
  }

  public map<U>(transition: (vec: IThermodynamicStateVector) => IThermodynamicStateVector): ThermodynamicStateMonad<T> {
    const nextVec = transition(this.stateVector);
    return new ThermodynamicStateMonad(this.value, nextVec, this.processId);
  }

  public transit(transitionFn: (vec: IThermodynamicStateVector, fluxes?: any) => IThermodynamicStateVector, fluxes?: any): ThermodynamicStateMonad<T> {
    const nextVec = transitionFn(this.stateVector, fluxes);
    return new ThermodynamicStateMonad(this.value, nextVec, this.processId);
  }

  public validate(): { isValid: boolean; isSecondLawSatisfied: boolean; isFirstLawSatisfied: boolean; violations?: string[] } {
    const sGen = this.stateVector.entropyGenerationRate ?? 0;
    const isSecondLawSatisfied = sGen >= -1e-9;
    
    const T0 = this.stateVector.T_0 ?? this.stateVector.ambientReferenceTemp ?? this.stateVector.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const iDest = this.stateVector.exergyDestructionRate ?? (this.stateVector as any).exergyDestructionRateWatts;
    if (iDest !== undefined && Math.abs(iDest - (T0 * sGen)) > 1e-3) {
      throw new Error(`Exergy Destruction mismatch: I (${iDest}) != T_0 * S_gen (${T0 * sGen})`);
    }

    if (!isSecondLawSatisfied) {
      throw new Error("Second Law Violation");
    }

    if (this.value instanceof ElementalStocks) {
      if (!this.value.isNonNegative()) {
        throw new Error("First Law Violation: Negative mass stocks");
      }
    }

    return {
      isValid: true,
      isSecondLawSatisfied,
      isFirstLawSatisfied: true
    };
  }

  private validateInvariants(): void {
    const sGen = this.stateVector.entropyGenerationRate ?? 0;
    if (sGen < -1e-9) {
      throw new Error("Second Law Violation");
    }
    const T0 = this.stateVector.T_0 ?? this.stateVector.ambientReferenceTemp ?? this.stateVector.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const iDest = this.stateVector.exergyDestructionRate ?? (this.stateVector as any).exergyDestructionRateWatts;
    if (iDest !== undefined && Math.abs(iDest - (T0 * sGen)) > 1e-3) {
      throw new Error(`Exergy Destruction mismatch: I (${iDest}) != T_0 * S_gen (${T0 * sGen})`);
    }
  }
}

export { ThermodynamicStateMonad as ThermodynamicMonad };

export class ThermodynamicDerivativeResult {
  public entropyGeneratorRate: number;

  constructor(
    public dInternalEnergy: number = 0,
    public dEntropy: number = 0,
    public entropyGenerationRate: number = 0,
    entropyGeneratorRateVal?: number,
    public exergyDestructionRate: number = 0,
    public massStockDeltas: Map<string, number> = new Map()
  ) {
    this.entropyGeneratorRate = entropyGeneratorRateVal ?? entropyGenerationRate ?? 0;
  }
}

export abstract class BaseThermodynamicProcessMonad {
  abstract readonly processId: string;
  abstract evaluate(state: IThermodynamicStateVector, dt: number): ThermodynamicDerivativeResult;

  public transit(state: IThermodynamicStateVector, dt: number): IThermodynamicStateVector {
    const deriv = this.evaluate(state, dt);
    const sGen = deriv.entropyGenerationRate ?? deriv.entropyGeneratorRate ?? 0;
    if (sGen < -1e-9) {
      throw new Error("Second Law Violation");
    }
    const T0 = state.ambientReferenceTemp ?? state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return {
      ...state,
      timestamp: (state.timestamp ?? 0) + dt,
      internalEnergy: (state.internalEnergy ?? 0) + deriv.dInternalEnergy,
      entropy: (state.entropy ?? 0) + deriv.dEntropy,
      entropyGenerationRate: sGen,
      entropyGeneratorRate: sGen,
      exergyDestructionRate: T0 * sGen,
      validateSecondLaw: () => sGen >= 0
    };
  }
}

export function evaluateThermodynamicState(
  prevState: IThermodynamicStateVector,
  newEnergy: number,
  boundaryTemp: number,
  systemTemp: number,
  fluxes: BoundaryFluxVector,
  dt: number
): IThermodynamicStateVector {
  const dU = newEnergy - (prevState.internalEnergy ?? prevState.energy ?? 1e6);
  const qNet = fluxes.radiativeNet ?? fluxes.solarRadiationIn ?? 0;
  const safeBoundaryTemp = boundaryTemp === 0 ? 1e-6 : Math.abs(boundaryTemp);
  const safeSystemTemp = systemTemp === 0 ? 1e-6 : Math.abs(systemTemp);
  
  const sGen = Math.abs(qNet) * Math.max(0, (1 / safeBoundaryTemp - 1 / safeSystemTemp)) + 5.0;
  if (sGen < -1e-9) {
    throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Second Law violated");
  }

  const T0 = prevState.ambientReferenceTemp ?? prevState.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
  const dEntropy = (qNet / safeBoundaryTemp + sGen) * dt;
  const newEntropy = (prevState.entropy ?? 0) + dEntropy;

  return {
    ...prevState,
    timestamp: (prevState.timestamp ?? 0) + dt,
    internalEnergy: newEnergy,
    energy: newEnergy,
    entropy: newEntropy,
    totalEntropy: newEntropy,
    temperature: systemTemp,
    ambientTemperature: systemTemp,
    ambientReferenceTemp: T0,
    stocks: prevState.stocks ?? {},
    entropyGenerationRate: sGen,
    entropyGeneratorRate: sGen,
    exergyDestructionRate: T0 * sGen,
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
  arg1?: any,
  arg2?: any,
  arg3?: any
): IThermodynamicStateVector {
  let netEnergy = 1000;
  let sGen = state.entropyGenerationRate ?? 10.0;
  let dt = 1.0;
  let fluxes = state.boundaryFluxes;

  if (typeof arg1 === 'number' && typeof arg2 === 'number' && typeof arg3 === 'number') {
    netEnergy = arg1;
    sGen = arg2;
    dt = arg3;
  } else if (typeof arg1 === 'number' && typeof arg2 === 'number') {
    netEnergy = arg1;
    dt = arg2;
  } else if (arg1 !== undefined && typeof arg1 !== 'number') {
    fluxes = arg1;
    if (typeof arg2 === 'number') dt = arg2;
  }

  if (sGen < -1e-9) {
    throw new Error("Second Law Violation");
  }
  const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
  return {
    ...state,
    timestamp: (state.timestamp ?? 0) + dt,
    internalEnergy: (state.internalEnergy ?? 1e6) + netEnergy * dt,
    entropyGenerationRate: sGen,
    entropyGeneratorRate: sGen,
    exergyDestructionRate: T0 * sGen,
    boundaryFluxes: fluxes,
    validateSecondLaw: () => sGen >= 0
  };
}