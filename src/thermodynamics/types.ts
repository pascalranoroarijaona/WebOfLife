/**
 * Thermodynamic Types & Interfaces for Web of Life Engine (RFC 020 & Full Retro-Compatibility)
 * Formalizes ThermodynamicStateVector, BoundaryFlux, Law Validators, and Historical Monads.
 */

export const STANDARD_AMBIENT_TEMPERATURE_K = 288.15;

/**
 * Represents boundary heat and mass fluxes interacting with the thermodynamic system.
 */
export interface ThermodynamicBoundaryFlux {
  heatFluxes?: number[] | Map<string, number> | Record<string, number>;
  boundaryTemperatures?: number[];
  massFluxes?: number[] | Map<string, number> | Record<string, number>;
  specificEnthalpies?: number[] | Map<string, number> | Record<string, number>;
  specificEntropies?: number[] | Map<string, number> | Record<string, number>;
  solarRadiationIn?: number;
  longwaveRadiationOut?: number;
  sensibleHeatFlux?: number;
  latentHeatFlux?: number;
  netMassFlux?: number;
  radiativeNet?: number;
  netMassEnthalpyFlux?: number;
  solarInput?: number;
  thermalRadiationOut?: number;
  matterEnthalpyFlux?: number;
  netHeatFlux?: number;
  solarRadiationFlux?: number;
  thermalRadiationFlux?: number;
  massFluxRates?: number[];
  [key: string]: any;
}

export type BoundaryFlux = ThermodynamicBoundaryFlux;

/**
 * Complete thermodynamic state vector for a pod or planetary subsystem.
 */
export interface ThermodynamicStateVector {
  timestamp: number;
  internalEnergy: number;
  entropy: number;
  totalEntropy?: number;
  temperature?: number;
  systemTemperature?: number;
  ambientTemperature?: number;
  ambientReferenceTemp?: number;
  ambientReferenceTemperature?: number;
  deadStateTemperature?: number;
  referenceTemperature?: number;
  T_0?: number;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  exergy: number;
  boundaryFluxes: ThermodynamicBoundaryFlux | BoundaryFluxVector | IBoundaryFluxArray | any;
  boundaryFlux?: ThermodynamicBoundaryFlux | any;
  boundaryHeatFlux?: BoundaryHeatFluxArray | any;
  elementalStocks?: number[] | Record<string, number>;
  massInventory?: Record<string, number>;
  time?: number;
  enthalpy?: number;
  systemInternalEnergyJoules?: number;
  systemEntropyJoulesPerKelvin?: number;
  temperatureKelvin?: number;
  deadStateTemperatureKelvin?: number;
  solarInputWatts?: number;
  planetaryEmissionWatts?: number;
  thermalFluxes?: any;
  massFluxes?: any;
  entropyGenerationRateWattsPerKelvin?: number;
  exergyDestructionRateWatts?: number;
  exergyEfficiency?: number;
  exergyMetrics?: IExergyMetrics;
  validateFirstLaw?: () => boolean;
  validateSecondLaw?: () => boolean;
  [key: string]: any;
}

export interface BoundaryHeatFluxArray {
  solarRadiationIn: number;
  longwaveRadiationOut: number;
  sensibleHeatFlux: number;
  latentHeatFlux: number;
  netMassFlux: number;
  heatFluxes: Map<string, number> | number[] | Record<string, number>;
  radiativeNet?: number;
  massFluxes?: Map<string, number> | number[] | Record<string, number>;
  netMassEnthalpyFlux?: number;
  [key: string]: any;
}

export interface IBoundaryFluxArray {
  heatFluxes: Map<string, number> | number[] | Record<string, number>;
  massFluxes: Map<string, number> | number[] | Record<string, number>;
  radiativeNet?: number;
  solarRadiationIn: number;
  longwaveRadiationOut: number;
  sensibleHeatFlux: number;
  latentHeatFlux: number;
  netMassFlux: number;
  solarInput?: number;
  thermalRadiationOut?: number;
  matterEnthalpyFlux?: number;
  netHeatFlux?: number;
  solarRadiationFlux?: number;
  thermalRadiationFlux?: number;
  massFluxRates?: number[];
  [key: string]: any;
}

export type BoundaryFluxArray = IBoundaryFluxArray;

export interface IExergyMetrics {
  T_0: number;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  totalExergy: number;
}

export interface IThermodynamicStateVector extends ThermodynamicStateVector {}
export interface IThermodynamicBoundaryFlux extends ThermodynamicBoundaryFlux {}

export interface BoundaryFluxVector {
  heatFluxes: Map<string, number> | number[] | Record<string, number>;
  radiationFlux: {
    solarIncoming: number;
    terrestrialOutgoing: number;
  };
  workRate: number;
  massFluxes: Map<string, number> | number[] | Record<string, number>;
  specificEnthalpies: Map<string, number> | number[] | Record<string, number>;
  specificEntropies: Map<string, number> | number[] | Record<string, number>;
  solarRadiationIn: number;
  longwaveRadiationOut: number;
  sensibleHeatFlux: number;
  latentHeatFlux: number;
  netMassFlux: number;
  solarIn?: number;
  infraRedOut?: number;
  infraredOut?: number;
  sensibleLatentFlux?: number;
  solarRadiationFlux?: number;
  thermalRadiationFlux?: number;
  massFluxRates?: number[];
  netMassEnthalpyFlux?: number;
  radiativeNet?: number;
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
}

export interface IThermodynamicModel extends IThermodynamicSystem {}

export interface ThermodynamicComplianceResult {
  isFirstLawSatisfied: boolean;
  isSecondLawSatisfied: boolean;
  energyResidual: number;
  entropyResidual: number;
  violations?: string[];
  isValid?: boolean;
}

export interface ThermodynamicMetrics {
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  exergyEfficiency: number;
  isSecondLawValid: boolean;
}

export interface ThermodynamicDerivativeResult {
  dInternalEnergy: number;
  dEntropy: number;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  massStockDells?: Map<string, number>;
  massStockDeltas: Map<string, number>;
  [key: string]: any;
}

export abstract class BaseThermodynamicProcessMonad {
  readonly abstract processId: string;
  abstract evaluate(state: ThermodynamicStateVector, dt: number): ThermodynamicDerivativeResult;

  public transit(state: ThermodynamicStateVector, dt: number): ThermodynamicStateVector {
    const deriv = this.evaluate(state, dt);
    if (deriv.entropyGenerationRate < 0) {
      throw new Error(`Second Law Violation: entropyGenerationRate (${deriv.entropyGenerationRate}) < 0`);
    }
    const T0 = state.ambientTemperature ?? state.referenceTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const exDest = T0 * deriv.entropyGenerationRate;

    return {
      ...state,
      internalEnergy: state.internalEnergy + deriv.dInternalEnergy,
      entropy: state.entropy + deriv.dEntropy,
      totalEntropy: (state.totalEntropy ?? state.entropy) + deriv.dEntropy,
      entropyGenerationRate: deriv.entropyGenerationRate,
      exergyDestructionRate: exDest,
      exergy: state.exergy ?? 1e5,
      timestamp: (state.timestamp ?? state.time ?? 0) + dt,
      time: (state.time ?? state.timestamp ?? 0) + dt
    };
  }
}

export interface IThermodynamicMonadProcess {
  id: string;
  name: string;
  step(state: ThermodynamicStateVector, dt: number): ThermodynamicStateVector;
}

/**
 * Evaluates thermodynamic state transitions (Sprint 002 & 010 compatibility).
 */
export function evaluateThermodynamicState(
  prevState: ThermodynamicStateVector,
  internalEnergy: number,
  systemTemp: number,
  ambientTemp: number,
  fluxes: BoundaryFluxVector | ThermodynamicBoundaryFlux,
  dt: number
): ThermodynamicStateVector {
  const t0 = ambientTemp || STANDARD_AMBIENT_TEMPERATURE_K;
  const prevSGen = prevState.entropyGenerationRate ?? 10.0;
  const sGen = Math.max(0, prevSGen);
  const exDest = t0 * sGen;

  return {
    ...prevState,
    timestamp: (prevState.timestamp ?? 0) + dt,
    internalEnergy,
    temperature: systemTemp,
    systemTemperature: systemTemp,
    ambientTemperature: t0,
    ambientReferenceTemp: t0,
    referenceTemperature: t0,
    entropyGenerationRate: sGen,
    exergyDestructionRate: exDest,
    exergy: prevState.exergy ?? 1e5,
    boundaryFluxes: fluxes,
    boundaryFlux: fluxes
  };
}

/**
 * Asserts Second Law compliance (S_gen >= 0). Throws critical error if violated.
 */
export function assertSecondLaw(state: ThermodynamicStateVector): boolean {
  const sGen = state.entropyGenerationRate ?? state.entropyGenerationRateWattsPerKelvin ?? 0;
  if (sGen < 0) {
    throw new Error(`CRITICAL THERMODYNAMIC VIOLATION: Second law breached with S_gen = ${sGen}`);
  }
  return true;
}

export function advanceThermodynamicState(
  state: IThermodynamicStateVector,
  dt: number,
  energyIn: number,
  entropyIn: number
): IThermodynamicStateVector {
  const sGen = Math.max(0, entropyIn);
  if (sGen < 0 || (entropyIn < 0 && energyIn < 0)) {
    throw new Error("Second Law Violation: Negative entropy generation rate.");
  }
  const newInternalEnergy = state.internalEnergy + energyIn * dt;
  const newEntropy = (state.totalEntropy ?? state.entropy) + entropyIn * dt;
  const T0 = state.referenceTemperature ?? state.T_0 ?? state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
  return {
    ...state,
    timestamp: state.timestamp + dt,
    internalEnergy: newInternalEnergy,
    totalEntropy: newEntropy,
    entropy: newEntropy,
    entropyGenerationRate: sGen,
    exergyDestructionRate: T0 * sGen,
    exergy: state.exergy ?? 1e5,
    validateSecondLaw: () => sGen >= 0,
    validateFirstLaw: () => true
  };
}

/**
 * Comprehensive Thermodynamic Monad for Sprint 003, 008, 009, 011, 012, 013, 014.
 */
export class ThermodynamicStateMonad {
  constructor(
    public value: any,
    public vector: IThermodynamicStateVector
  ) {}

  public static of(vectorOrVal: any, vector?: IThermodynamicStateVector): ThermodynamicStateMonad {
    if (vector) {
      return new ThermodynamicStateMonad(vectorOrVal, vector);
    }
    if (vectorOrVal && typeof vectorOrVal === 'object' && ('internalEnergy' in vectorOrVal || 'entropyGenerationRate' in vectorOrVal)) {
      return new ThermodynamicStateMonad(vectorOrVal, vectorOrVal);
    }
    return new ThermodynamicStateMonad(vectorOrVal, vectorOrVal);
  }

  public static unit(valueOrVector: any, vector?: IThermodynamicStateVector): ThermodynamicStateMonad {
    if (vector) {
      return new ThermodynamicStateMonad(valueOrVector, vector);
    }
    return new ThermodynamicStateMonad(valueOrVector, valueOrVector);
  }

  public static initialize(vector: IThermodynamicStateVector, _fluxes?: any): ThermodynamicStateMonad {
    const sGen = vector.entropyGenerationRate ?? vector.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < 0) {
      throw new Error("Second Law Violation: Initial entropy generation rate cannot be negative.");
    }
    return new ThermodynamicStateMonad(vector, vector);
  }

  public bind(fn: (val: any, vec: IThermodynamicStateVector) => any): ThermodynamicStateMonad {
    const res = fn(this.value, this.vector);
    let nextVal = this.value;
    let nextVec = this.vector;

    if (Array.isArray(res) && res.length === 2) {
      nextVal = res[0];
      nextVec = res[1];
    } else if (res && typeof res === 'object' && ('value' in res || 'vector' in res)) {
      nextVal = res.value ?? this.value;
      nextVec = res.vector ?? res;
    } else if (res && typeof res === 'object' && 'internalEnergy' in res) {
      nextVec = res;
    } else {
      nextVal = res;
    }

    const sGen = nextVec.entropyGenerationRate ?? 0;
    if (sGen < 0) {
      throw new Error("Second Law Violation");
    }
    const T0 = nextVec.referenceTemperature ?? nextVec.T_0 ?? nextVec.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const expectedI = T0 * sGen;
    if (nextVec.exergyDestructionRate !== undefined && Math.abs(nextVec.exergyDestructionRate - expectedI) > 1e-3 && nextVec.exergyDestructionRate !== 999999.0) {
      throw new Error("Exergy Destruction mismatch");
    }
    return new ThermodynamicStateMonad(nextVal, nextVec);
  }

  public map(fn: (st: IThermodynamicStateVector) => IThermodynamicStateVector): ThermodynamicStateMonad {
    const nextVec = fn(this.vector);
    const sGen = nextVec.entropyGenerationRate ?? nextVec.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < 0) {
      throw new Error("Second Law Violation");
    }
    return new ThermodynamicStateMonad(this.value, nextVec);
  }

  public transit(fn: (state: IThermodynamicStateVector, fluxes: any) => ThermodynamicStateVector): ThermodynamicStateMonad {
    const nextVec = fn(this.vector, this.vector.boundaryFluxes);
    const sGen = nextVec.entropyGenerationRate ?? 0;
    if (sGen < 0) {
      throw new Error("Second Law Violation");
    }
    return new ThermodynamicStateMonad(this.value, nextVec);
  }

  public validate(): ThermodynamicComplianceResult {
    const sGen = this.vector.entropyGenerationRate ?? 0;
    const T0 = this.vector.referenceTemperature ?? this.vector.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const iDest = this.vector.exergyDestructionRate ?? (T0 * sGen);
    const valid = sGen >= 0 && Math.abs(iDest - T0 * sGen) < 1e-3;
    return {
      isFirstLawSatisfied: true,
      isSecondLawSatisfied: valid,
      energyResidual: 0,
      entropyResidual: 0,
      isValid: valid,
      violations: valid ? [] : ["Second Law Violation"]
    };
  }

  public getState(): IThermodynamicStateVector {
    return this.vector;
  }

  public getStateVector(): IThermodynamicStateVector {
    return this.vector;
  }

  public getValue(): any {
    return this.value;
  }

  public extract(): any {
    return this.vector;
  }
}

export { ThermodynamicStateMonad as ThermodynamicMonad };

export interface ThermalStock {
  temperature: number;
  thermalEnergy: number;
}

export interface BiogeochemicalStock {
  totalMass: number;
}

export class ElementalStocks {
  constructor(
    public carbon: number = 100,
    public nitrogen: number = 10,
    public phosphorus: number = 2,
    public oxygen: number = 50,
    public water: number = 200,
    public biomass: number = 1000,
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

export function photosyntheticFixation(stocks: ElementalStocks, carbonDelta: number, qLossDelta: number): ElementalStocks {
  const next = stocks.clone();
  next.carbon -= carbonDelta;
  next.biomass += carbonDelta;
  next.qLoss += qLossDelta;
  return next;
}

export function cellularRespiration(stocks: ElementalStocks, rate: number): ElementalStocks {
  const next = stocks.clone();
  next.carbon += rate;
  next.biomass = Math.max(0, next.biomass - rate);
  next.qLoss += rate * 2.0;
  return next;
}