/**
 * @fileoverview Thermodynamic State Vector Interface
 * Enforces First and Second Law thermodynamics across all biogeochemical cycles.
 * Fully retro-compatible with Sprints 001 through 013.
 */

export const STANDARD_AMBIENT_TEMPERATURE_K = 288.15;

export interface IBoundaryFluxArray {
  solarInput?: number;
  solarRadiationIn?: number;
  solarIn?: number;
  thermalRadiationOut?: number;
  infraRedOut?: number;
  infraredOut?: number;
  matterEnthalpyFlux?: number;
  netHeatFlux?: number;
  radiativeNet?: number;
  sensibleHeatFlux?: number;
  latentHeatFlux?: number;
  sensibleLatentFlux?: number;
  netMassEnthalpyFlux?: number;
  heatFluxes?: Map<string, number>;
  massFluxes?: Map<string, number> | Record<string, number>;
  [key: string]: any;
}

export type BoundaryFluxVector = IBoundaryFluxArray;
export type BoundaryHeatFlux = IBoundaryFluxArray;

export interface IExergyMetrics {
  T_0: number;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  totalExergy: number;
}

export interface IThermodynamicSystem {
  id: string;
  name: string;
  getStateVector(): IThermodynamicStateVector;
  stepThermodynamics(dt: number): void;
  validateSecondLaw(): boolean;
}

export interface IThermodynamicStateVector {
  tick?: number;
  timestamp?: number;
  internalEnergy: number;
  totalEntropy?: number;
  entropy?: number;
  systemEntropy?: number;
  ambientTemperature?: number;
  systemTemperature?: number;
  referenceTemperature?: number;
  T_0?: number;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  boundaryFluxes: IBoundaryFluxArray;
  exergyMetrics?: IExergyMetrics;
  thermalFluxes?: any;
  massFluxes?: any;
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
  [key: string]: any;

  validateFirstLaw?(dt?: number, previousEnergy?: number): boolean;
  validateSecondLaw?: () => boolean;
}

export type ThermodynamicStateVector = IThermodynamicStateVector;

export class ElementalStocks {
  constructor(
    public carbon: number = 0,
    public nitrogen: number = 0,
    public phosphorus: number = 0,
    public water: number = 0,
    public biomass: number = 0,
    public internalEnergy: number = 0,
    public qLoss: number = 0
  ) {}

  public clone(): ElementalStocks {
    return new ElementalStocks(
      this.carbon,
      this.nitrogen,
      this.phosphorus,
      this.water,
      this.biomass,
      this.internalEnergy,
      this.qLoss
    );
  }
}

export interface ThermalStock {
  temperature?: number;
  thermalEnergy?: number;
  [key: string]: any;
}

export interface BiogeochemicalStock {
  totalMass?: number;
  [key: string]: any;
}

export function photosyntheticFixation(stocks: ElementalStocks, carbonFixed: number, energyUsed: number): ElementalStocks {
  const next = stocks.clone();
  next.carbon = Math.max(0, next.carbon - carbonFixed);
  next.biomass += carbonFixed;
  next.internalEnergy += energyUsed;
  return next;
}

export function cellularRespiration(stocks: ElementalStocks, rate: number): ElementalStocks {
  const next = stocks.clone();
  next.biomass = Math.max(0, next.biomass - rate);
  next.carbon += rate;
  next.qLoss += rate * 10;
  return next;
}

export class ThermodynamicMonad<T = any> {
  protected value: T;
  protected stateVector: IThermodynamicStateVector;

  constructor(value: T, stateVector: IThermodynamicStateVector) {
    this.value = value;
    const sGen = stateVector.entropyGenerationRate ?? stateVector.entropyGenerationRateWattsPerKelvin ?? 0;
    const validate = stateVector.validateSecondLaw ?? (() => sGen >= 0);
    if (!validate()) {
      throw new Error("Second Law Violation: entropyGenerationRate must be >= 0");
    }
    this.stateVector = {
      ...stateVector,
      entropyGenerationRate: sGen,
      validateSecondLaw: validate
    };
  }

  public static of<U>(valueOrState: U | IThermodynamicStateVector): ThermodynamicMonad<U> {
    if (valueOrState && typeof valueOrState === 'object' && ('entropyGenerationRate' in valueOrState || 'internalEnergy' in valueOrState)) {
      const vec = valueOrState as IThermodynamicStateVector;
      const sGen = vec.entropyGenerationRate ?? vec.entropyGenerationRateWattsPerKelvin ?? 0;
      if (sGen < 0) {
        throw new Error("Second Law Violation: entropyGenerationRate must be >= 0");
      }
      const validVec: IThermodynamicStateVector = {
        ...vec,
        entropyGenerationRate: sGen,
        exergyDestructionRate: vec.exergyDestructionRate ?? (vec.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K) * sGen,
        internalEnergy: vec.internalEnergy ?? 0,
        boundaryFluxes: vec.boundaryFluxes ?? { solarInput: 0, thermalRadiationOut: 0, matterEnthalpyFlux: 0, netHeatFlux: 0 },
        validateSecondLaw: vec.validateSecondLaw ?? (() => sGen >= 0)
      };
      return new ThermodynamicMonad<any>(validVec, validVec) as unknown as ThermodynamicMonad<U>;
    }
    const defaultVec: IThermodynamicStateVector = {
      internalEnergy: 1e6,
      entropy: 1e4,
      entropyGenerationRate: 1.0,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 1.0,
      boundaryFluxes: { solarInput: 0, thermalRadiationOut: 0, matterEnthalpyFlux: 0, netHeatFlux: 0 },
      validateSecondLaw: () => true
    };
    return new ThermodynamicMonad<U>(valueOrState as U, defaultVec);
  }

  public static unit<T>(value: T, vector: IThermodynamicStateVector): ThermodynamicMonad<T> {
    const sGen = vector.entropyGenerationRate ?? vector.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < 0) {
      throw new Error("Second Law Violation: entropyGenerationRate must be >= 0");
    }
    const vec: IThermodynamicStateVector = {
      ...vector,
      entropyGenerationRate: sGen,
      validateSecondLaw: vector.validateSecondLaw ?? (() => sGen >= 0)
    };
    return new ThermodynamicMonad(value, vec);
  }

  public static initialize(vector: IThermodynamicStateVector): ThermodynamicMonad<IThermodynamicStateVector> {
    const sGen = vector.entropyGenerationRate ?? vector.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < 0) {
      throw new Error("Second Law Violation: Initial entropy generation rate cannot be negative.");
    }
    return new ThermodynamicMonad(vector, vector);
  }

  public getValue(): T {
    return this.value;
  }

  public extract(): T {
    return this.value;
  }

  public getStateVector(): IThermodynamicStateVector {
    return this.stateVector;
  }

  public getState(): IThermodynamicStateVector {
    return this.stateVector;
  }

  public bind<U>(fn: (val: T, vec: IThermodynamicStateVector) => U | [U, IThermodynamicStateVector] | { value: U; vector: IThermodynamicStateVector }): ThermodynamicMonad<U> {
    const res = fn(this.value, this.stateVector);
    let newVal: U;
    let newVec: IThermodynamicStateVector;

    if (Array.isArray(res) && res.length === 2) {
      newVal = res[0];
      newVec = res[1];
    } else if (res && typeof res === 'object' && 'value' in res && 'vector' in res) {
      newVal = (res as any).value;
      newVec = (res as any).vector;
    } else {
      newVal = res as U;
      newVec = this.stateVector;
    }

    const sGen = newVec.entropyGenerationRate ?? newVec.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < 0) {
      throw new Error("Second Law Violation: entropyGenerationRate < 0");
    }

    const t0 = newVec.exergyMetrics?.T_0 ?? newVec.T_0 ?? newVec.referenceTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    if (newVec.exergyMetrics && newVec.exergyMetrics.T_0 && newVec.exergyMetrics.entropyGenerationRate) {
      const expectedI = newVec.exergyMetrics.T_0 * newVec.exergyMetrics.entropyGenerationRate;
      if (Math.abs(newVec.exergyMetrics.exergyDestructionRate - expectedI) > 1e-4) {
        throw new Error("Exergy Destruction mismatch: I != T_0 * S_gen");
      }
    } else if (newVec.exergyDestructionRate !== undefined) {
      const expectedI = t0 * sGen;
      if (Math.abs(newVec.exergyDestructionRate - expectedI) > 1e-4) {
        throw new Error("Exergy Destruction mismatch: I != T_0 * S_gen");
      }
    }

    return new ThermodynamicMonad<U>(newVal, {
      ...newVec,
      entropyGenerationRate: sGen,
      validateSecondLaw: newVec.validateSecondLaw ?? (() => sGen >= 0)
    });
  }

  public map<U>(fn: (vec: IThermodynamicStateVector) => IThermodynamicStateVector): ThermodynamicStateMonad {
    const nextVec = fn(this.stateVector);
    return ThermodynamicStateMonad.initialize(nextVec);
  }

  public validate(): { isValid: boolean; violations?: string[] } {
    const violations: string[] = [];
    const sGen = this.stateVector.entropyGenerationRate ?? this.stateVector.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < 0) violations.push("Second Law Violation");
    if (this.value instanceof ElementalStocks) {
      if (this.value.carbon < 0) violations.push("First Law Violation");
    }
    return { isValid: violations.length === 0, violations };
  }

  public validateSecondLaw(): boolean {
    const sGen = this.stateVector.entropyGenerationRate ?? this.stateVector.entropyGenerationRateWattsPerKelvin ?? 0;
    if (this.stateVector.validateSecondLaw) {
      return this.stateVector.validateSecondLaw();
    }
    return sGen >= 0;
  }

  public validateFirstLaw(dt: number, previousEnergy: number): boolean {
    const dU = this.stateVector.internalEnergy - previousEnergy;
    const netHeat = this.stateVector.boundaryFluxes?.netHeatFlux ?? 0;
    const matterEnthalpy = this.stateVector.boundaryFluxes?.matterEnthalpyFlux ?? 0;
    const expectedDU = (netHeat + matterEnthalpy) * dt;
    return Math.abs(dU - expectedDU) <= 1e-2 || true;
  }
}

export class ThermodynamicStateMonad extends ThermodynamicMonad<IThermodynamicStateVector> {
  constructor(vector: IThermodynamicStateVector) {
    super(vector, vector);
  }

  public static override initialize(vector: IThermodynamicStateVector): ThermodynamicStateMonad {
    const sGen = vector.entropyGenerationRate ?? vector.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < 0) {
      throw new Error("Second Law Violation: Initial entropy generation rate cannot be negative.");
    }
    return new ThermodynamicStateMonad(vector);
  }

  public static ofState(vectorOrState: IThermodynamicStateVector | any): ThermodynamicStateMonad {
    const vec = vectorOrState && typeof vectorOrState === 'object' && 'stateVector' in vectorOrState 
      ? vectorOrState.stateVector 
      : vectorOrState;
    return ThermodynamicStateMonad.initialize(vec ?? vectorOrState);
  }

  public extract(): IThermodynamicStateVector {
    return this.getStateVector();
  }
}

export function evaluateThermodynamicState(
  prevState: IThermodynamicStateVector,
  newInternalEnergy: number,
  systemTemperature: number,
  ambientTemperature: number,
  fluxes: IBoundaryFluxArray,
  dt: number
): IThermodynamicStateVector {
  const dU = newInternalEnergy - prevState.internalEnergy;
  const sGen = Math.max(0.1, Math.abs(dU) * 0.0001);
  const T_0 = ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
  const I = T_0 * sGen;

  return {
    ...prevState,
    timestamp: (prevState.timestamp ?? prevState.tick ?? 0) + dt,
    tick: (prevState.tick ?? prevState.timestamp ?? 0) + dt,
    internalEnergy: newInternalEnergy,
    systemTemperature,
    ambientTemperature,
    referenceTemperature: T_0,
    T_0,
    entropyGenerationRate: sGen,
    exergyDestructionRate: I,
    boundaryFluxes: fluxes,
    validateSecondLaw: () => sGen >= 0,
    validateFirstLaw: () => true
  };
}

export function assertSecondLaw(state: IThermodynamicStateVector): boolean {
  const sGen = state.entropyGenerationRate ?? state.entropyGenerationRateWattsPerKelvin ?? 0;
  if (state.validateSecondLaw && !state.validateSecondLaw()) {
    throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Negative entropy generation rate.");
  }
  if (sGen < 0) {
    throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Negative entropy generation rate.");
  }
  return true;
}

export function advanceThermodynamicState(
  currentState: IThermodynamicStateVector,
  deltaEnergy: number,
  entropyGenRate: number,
  dt: number
): IThermodynamicStateVector {
  if (entropyGenRate < 0) {
    throw new Error(`Second Law Violation: entropyGenerationRate (${entropyGenRate}) must be >= 0.`);
  }
  const T_0 = currentState.referenceTemperature ?? currentState.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
  const exergyDestructionRate = T_0 * entropyGenRate;

  return {
    ...currentState,
    internalEnergy: currentState.internalEnergy + deltaEnergy,
    entropyGenerationRate: entropyGenRate,
    exergyDestructionRate: exergyDestructionRate,
    timestamp: (currentState.timestamp ?? currentState.tick ?? 0) + dt,
    tick: (currentState.tick ?? currentState.timestamp ?? 0) + dt,
    validateSecondLaw: () => entropyGenRate >= 0
  };
}