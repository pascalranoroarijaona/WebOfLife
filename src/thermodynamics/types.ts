// File: src/thermodynamics/types.ts

export enum EntropyState {
  STEADY = "STEADY",
  ACCUMULATING = "ACCUMULATING",
  DEGRADING = "DEGRADING",
  COLLAPSED = "COLLAPSED"
}

export interface Stock {
  name: string;
  quantity: number;
  capacity?: number;
  utilization(): number;
}

export interface Flow {
  sourceId: string;
  targetId: string;
  substance: string;
  rate: number;
  flowType: string;
}

export class ElementalStocks {
  constructor(
    public carbon: number = 0,
    public water: number = 0,
    public nitrogen: number = 0,
    public phosphorus: number = 0,
    public oxygen: number = 0,
    public energyStored: number = 0,
    public qLoss: number = 0
  ) {}

  public clone(): ElementalStocks {
    return new ElementalStocks(
      this.carbon,
      this.water,
      this.nitrogen,
      this.phosphorus,
      this.oxygen,
      this.energyStored,
      this.qLoss
    );
  }
}

/**
 * Represents boundary thermal and radiative flux vectors across the Earth Pod interface.
 */
export interface BoundaryFluxVector {
  solarRadiationIn: number;    // [W] Incoming solar shortwave flux
  thermalRadiationOut: number; // [W] Outgoing longwave thermal radiation
  sensibleHeatFlux: number;    // [W] Convective/conductive boundary sensible heat
  latentHeatFlux: number;      // [W] Evapotranspirative latent heat flux
  netMassEnthalpyFlux: number; // [W] Net enthalpy carried by boundary mass transfers (if any)
}

/**
 * Legacy compatibility boundary heat flux interface
 */
export interface BoundaryHeatFlux {
  solarIn: number;
  infraRedOut: number;
  infraredOut?: number;
  sensibleLatentFlux?: number;
}

export type BoundaryFlux = BoundaryHeatFlux | BoundaryFluxVector | any;

/**
 * Thermodynamic State Vector tracking fundamental state properties,
 * entropy generation rates, and exergy destruction.
 */
export interface ThermodynamicStateVector {
  timestamp: number;              // [s] Simulation epoch time
  ambientTemperature: number;     // T_0 [K] Reference ambient temperature
  systemTemperature?: number;     // T [K] Effective internal system temperature
  internalEnergy: number;         // U [J] Total internal energy of system stocks
  totalEntropy?: number;          // S [J/K] Total system entropy
  entropyGenerationRate: number;  // S_gen_dot [W/K] Internal irreversible entropy generation rate
  exergyDestructionRate: number;  // I_dot [W] Exergy destruction rate (T_0 * S_gen_dot)
  boundaryFluxes: BoundaryFluxVector | any;
  
  // Backwards compatibility properties expected by legacy EarthPOD and tests
  T_0?: number;
  deadStateTemperatureKelvin?: number;
  systemInternalEnergyJoules?: number;
  entropy?: number;
  systemEntropyJoulesPerKelvin?: number;
  temperature?: number;
  temperatureKelvin?: number;
  totalMass?: number;
  mass?: number;
  exergy?: number;
  solarInputWatts?: number;
  planetaryEmissionWatts?: number;
  entropyGenerationRateWattsPerKelvin?: number;
  exergyDestructionRateWatts?: number;
  exergyEfficiency?: number;
  boundaryHeatFlux?: BoundaryHeatFlux;
  massInventory?: Record<string, number>;
  stocks?: Record<string, number> | ElementalStocks;
  fluxes?: any;
  thermalFluxes?: any[];
  massFluxes?: any[];
  system?: {
    temperature: number;
    internalEnergy: number;
    entropy: number;
    exergy: number;
  };
  entropyMetrics?: {
    sGenRate: number;
    exergyDestruction: number;
    cumulativeQLoss: number;
    referenceTemperature: number;
    exergyDestructionRate: number;
  };
  ambientReference?: {
    temperature0: number;
    pressure0: number;
  };
}

export type IThermodynamicStateVector = ThermodynamicStateVector;

export interface ValidationResult {
  isValid: boolean;
  violations: string[];
}

export class ThermodynamicMonad<T = any> {
  constructor(
    private readonly value: T,
    private readonly vector: ThermodynamicStateVector
  ) {}

  public static of<T>(val: T | ThermodynamicStateVector): ThermodynamicMonad<T> {
    if (val && typeof val === 'object' && ('entropyGenerationRate' in val || 'internalEnergy' in val || 'timestamp' in val)) {
      const vec = val as unknown as ThermodynamicStateVector;
      const normalizedVec: ThermodynamicStateVector = {
        ...vec,
        systemTemperature: vec.systemTemperature ?? vec.temperature ?? vec.ambientTemperature ?? 288.15,
        totalEntropy: vec.totalEntropy ?? vec.entropy ?? 1000
      };
      validateThermodynamicInvariants(normalizedVec);
      return new ThermodynamicMonad<T>(val as unknown as T, normalizedVec);
    }
    return new ThermodynamicMonad<T>(val as T, {
      timestamp: 0,
      ambientTemperature: 288.15,
      systemTemperature: 288.15,
      internalEnergy: 10000,
      totalEntropy: 33.33,
      entropyGenerationRate: 1.0,
      exergyDestructionRate: 288.15 * 1.0,
      boundaryFluxes: {}
    });
  }

  public static unit<T>(val: T, vector: ThermodynamicStateVector): ThermodynamicMonad<T> {
    const normalizedVec: ThermodynamicStateVector = {
      ...vector,
      systemTemperature: vector.systemTemperature ?? vector.temperature ?? vector.ambientTemperature ?? 288.15,
      totalEntropy: vector.totalEntropy ?? vector.entropy ?? 1000
    };
    validateThermodynamicInvariants(normalizedVec);
    return new ThermodynamicMonad<T>(val, normalizedVec);
  }

  public getValue(): T {
    return this.value;
  }

  public getStateVector(): ThermodynamicStateVector {
    return this.vector;
  }

  public transform(sGenRate: number, timestamp: number): ThermodynamicMonad<T> {
    const t0 = this.vector.T_0 ?? this.vector.ambientTemperature ?? 288.15;
    const newVector: ThermodynamicStateVector = {
      ...this.vector,
      timestamp,
      entropyGenerationRate: sGenRate,
      exergyDestructionRate: t0 * sGenRate,
      entropyMetrics: {
        sGenRate,
        exergyDestruction: t0 * sGenRate,
        cumulativeQLoss: 0,
        referenceTemperature: t0,
        exergyDestructionRate: t0 * sGenRate
      }
    };
    validateThermodynamicInvariants(newVector);
    return new ThermodynamicMonad<T>(this.value, newVector);
  }

  public bind<U>(fn: (val: T, vec: ThermodynamicStateVector) => { value: U; vector: ThermodynamicStateVector } | U): ThermodynamicMonad<U> {
    const result = fn(this.value, this.vector);
    let nextVal: U;
    let nextVec: ThermodynamicStateVector;

    if (result && typeof result === 'object' && 'value' in result && 'vector' in result) {
      nextVal = (result as { value: U; vector: ThermodynamicStateVector }).value;
      nextVec = (result as { value: U; vector: ThermodynamicStateVector }).vector;
    } else {
      nextVal = result as U;
      if (nextVal instanceof ElementalStocks && this.value instanceof ElementalStocks) {
        const prevStocks = this.value as ElementalStocks;
        const newStocks = nextVal as ElementalStocks;
        const prevMass = prevStocks.carbon + prevStocks.water + prevStocks.nitrogen + prevStocks.phosphorus + prevStocks.oxygen;
        const newMass = newStocks.carbon + newStocks.water + newStocks.nitrogen + newStocks.phosphorus + newStocks.oxygen;
        if (Math.abs(newMass - prevMass) > 1e-4) {
          throw new Error(`First Law Violation: Total elemental mass altered from ${prevMass} to ${newMass}`);
        }
        if (newStocks.qLoss < prevStocks.qLoss - 1e-6) {
          throw new Error(`Second Law Violation: qLoss decreased from ${prevStocks.qLoss} to ${newStocks.qLoss}`);
        }
      }
      nextVec = { ...this.vector };
    }

    validateThermodynamicInvariants(nextVec);
    return new ThermodynamicMonad<U>(nextVal, nextVec);
  }

  public map<U>(fn: (vec: ThermodynamicStateVector) => ThermodynamicStateVector): ThermodynamicMonad<T> {
    const newVec = fn(this.vector);
    validateThermodynamicInvariants(newVec);
    return new ThermodynamicMonad<T>(this.value, newVec);
  }

  public validate(): ValidationResult {
    try {
      validateThermodynamicInvariants(this.vector);
      return { isValid: true, violations: [] };
    } catch (err: any) {
      return { isValid: false, violations: [err.message] };
    }
  }
}

export class ThermodynamicStateMonad {
  private constructor(private readonly vector: ThermodynamicStateVector) {}

  public static initialize(initialState: ThermodynamicStateVector): ThermodynamicStateMonad {
    validateThermodynamicInvariants(initialState);
    return new ThermodynamicStateMonad(initialState);
  }

  public extract(): ThermodynamicStateVector {
    return this.vector;
  }

  public map(fn: (current: ThermodynamicStateVector) => ThermodynamicStateVector): ThermodynamicStateMonad {
    const next = fn(this.vector);
    validateThermodynamicInvariants(next);
    return new ThermodynamicStateMonad(next);
  }
}

export function validateThermodynamicInvariants(state: ThermodynamicStateVector): boolean {
  const sGen = state.entropyGenerationRate ?? state.entropyGenerationRateWattsPerKelvin ?? state.entropyMetrics?.sGenRate ?? 0;
  if (sGen < -1e-6) {
    throw new Error(`Second Law Violation: entropy generation rate ${sGen} < 0`);
  }

  const iDot = state.exergyDestructionRate ?? state.exergyDestructionRateWatts ?? state.entropyMetrics?.exergyDestructionRate ?? state.entropyMetrics?.exergyDestruction;
  const t0 = state.T_0 ?? state.ambientTemperature ?? state.deadStateTemperatureKelvin ?? 288.15;
  
  if (iDot !== undefined) {
    const expectedIDot = t0 * sGen;
    if (Math.abs(iDot - expectedIDot) > 1e-2) {
      throw new Error(`Exergy Destruction mismatch: I_dot (${iDot}) != T_0 * S_gen (${expectedIDot})`);
    }
  }

  return true;
}

export function photosyntheticFixation(solarWattsOrStocks: any, efficiencyOrWatts: number = 0.02, eff: number = 0.05): any {
  if (solarWattsOrStocks instanceof ElementalStocks) {
    const stocks = solarWattsOrStocks.clone();
    const fixAmount = Math.max(0, efficiencyOrWatts * eff);
    stocks.carbon = Math.max(0, stocks.carbon - fixAmount);
    stocks.energyStored += fixAmount * 10;
    return stocks;
  }
  return solarWattsOrStocks * efficiencyOrWatts;
}

export function cellularRespiration(biomassMassOrStocks: any, metabolicRate: number = 0.05): any {
  if (biomassMassOrStocks instanceof ElementalStocks) {
    const stocks = biomassMassOrStocks.clone();
    const resp = Math.max(0, metabolicRate * 1.0);
    stocks.carbon = Math.max(0, stocks.carbon - resp);
    stocks.qLoss += resp * 5;
    return stocks;
  }
  return biomassMassOrStocks * metabolicRate;
}

/**
 * Computes the instantaneous thermodynamic state vector from system stocks and boundary fluxes.
 */
export function evaluateThermodynamicState(
  previousState: ThermodynamicStateVector,
  internalEnergy: number,
  systemTemperature: number,
  ambientTemperature: number,
  fluxes: BoundaryFluxVector,
  dt: number
): ThermodynamicStateVector {
  const totalEntropy = internalEnergy / systemTemperature;
  const dEntropySys = dt > 0 ? (totalEntropy - (previousState.totalEntropy ?? previousState.entropy ?? totalEntropy)) / dt : 0;

  const solarEntropyRate = fluxes.solarRadiationIn / 5778;
  const thermalEntropyRate = fluxes.thermalRadiationOut / systemTemperature;
  const sensibleEntropyRate = fluxes.sensibleHeatFlux / ambientTemperature;
  const latentEntropyRate = fluxes.latentHeatFlux / systemTemperature;

  const netBoundaryEntropyFlux = solarEntropyRate - (thermalEntropyRate + sensibleEntropyRate + latentEntropyRate);

  const entropyGenerationRate = Math.max(0, dEntropySys - netBoundaryEntropyFlux);
  const exergyDestructionRate = ambientTemperature * entropyGenerationRate;

  return {
    timestamp: previousState.timestamp + dt,
    ambientTemperature,
    systemTemperature,
    internalEnergy,
    totalEntropy,
    entropyGenerationRate,
    exergyDestructionRate,
    boundaryFluxes: fluxes,
    
    T_0: ambientTemperature,
    deadStateTemperatureKelvin: ambientTemperature,
    systemInternalEnergyJoules: internalEnergy,
    entropy: totalEntropy,
    systemEntropyJoulesPerKelvin: totalEntropy,
    temperature: systemTemperature,
    temperatureKelvin: systemTemperature,
    solarInputWatts: fluxes.solarRadiationIn,
    planetaryEmissionWatts: fluxes.thermalRadiationOut,
    entropyGenerationRateWattsPerKelvin: entropyGenerationRate,
    exergyDestructionRateWatts: exergyDestructionRate,
    boundaryHeatFlux: { solarIn: fluxes.solarRadiationIn, infraRedOut: -fluxes.thermalRadiationOut },
    entropyMetrics: {
      sGenRate: entropyGenerationRate,
      exergyDestruction: exergyDestructionRate,
      cumulativeQLoss: 0,
      referenceTemperature: ambientTemperature,
      exergyDestructionRate: exergyDestructionRate
    },
    ambientReference: { temperature0: ambientTemperature, pressure0: 101325 }
  };
}

/**
 * Asserts the Second Law of Thermodynamics and Exergy Consistency.
 */
export function assertSecondLaw(state: ThermodynamicStateVector): boolean {
  return validateThermodynamicInvariants(state);
}

/**
 * Contract for any subsystem, cycle, or organism container participating 
 * in thermodynamic evaluation and entropy auditing.
 */
export interface IThermodynamicSystem {
  getStateVector(): ThermodynamicStateVector;
  computeEntropyGeneration(dt: number): number;
  verifySecondLaw(): boolean;
}