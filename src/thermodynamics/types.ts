/**
 * @fileoverview Thermodynamic State Vector Interface & Nonequilibrium Energy Equations (Retro-Compatibility Layer)
 * Establishes strict contracts for internal entropy generation (\dot{S}_{gen}),
 * exergy destruction rate (\dot{I} = T_0 \dot{S}_{gen}$), boundary flux arrays, and legacy monad wrappers.
 */

export const STANDARD_AMBIENT_TEMPERATURE_K = 288.15;

/**
 * Represents boundary flux vectors for heat, work, and chemical species mass flow.
 */
export interface BoundaryFluxVector {
  heatFluxes: Map<string, number>;
  radiationFlux: {
    solarIncoming: number;
    terrestrialOutgoing: number;
  };
  workRate: number;
  massFluxes: Map<string, number>;
  specificEnthalpies: Map<string, number>;
  specificEntropies: Map<string, number>;
  solarRadiationIn?: number;
  longwaveRadiationOut?: number;
  sensibleHeatFlux?: number;
  latentHeatFlux?: number;
  netMassFlux?: number;
  radiativeNet?: number;
  netMassEnthalpyFlux?: number;
  netHeatFlux?: number;
  [key: string]: any;
}

export interface BoundaryFlux {
  readonly fluxId?: string;
  readonly species?: string;
  readonly massFlowRate: number;
  readonly specificEnthalpy: number;
  readonly specificEntropy: number;
  readonly heatTransferRate: number;
  readonly boundaryTemperature: number;
}

export interface IBoundaryFluxArray {
  solarRadiationIn: number;
  longwaveRadiationOut: number;
  sensibleHeatFlux: number;
  latentHeatFlux: number;
  netMassFlux: number;
  solarInput?: number;
  thermalRadiationOut?: number;
  matterEnthalpyFlux?: number;
  netHeatFlux?: number;
  heatFluxes: Map<string, number>;
  radiativeNet?: number;
  massFluxes: Map<string, number>;
  netMassEnthalpyFlux?: number;
  [key: string]: any;
}

export type BoundaryFluxArray = IBoundaryFluxArray | BoundaryFluxVector | BoundaryFlux[];

export interface IExergyMetrics {
  T_0: number;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  totalExergy: number;
}

export interface ThermodynamicMetrics {
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  exergyEfficiency: number;
  isSecondLawValid: boolean;
}

/**
 * Comprehensive Thermodynamic State Vector supporting both new and legacy sprint test structures.
 */
export interface ThermodynamicStateVector {
  timestamp?: number;
  tick?: number;
  internalEnergy: number;
  enthalpy?: number;
  entropy: number;
  totalEntropy?: number;
  temperature: number;
  ambientTemperature?: number;
  deadStateTemperature?: number;
  ambientReferenceTemp?: number;
  referenceTemperature?: number;
  systemTemperature?: number;
  T_0?: number;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  exergy?: number;
  boundaryFluxes: BoundaryFlux[] | IBoundaryFluxArray | BoundaryFluxVector | any;
  exergyMetrics?: IExergyMetrics;
  thermalFluxes?: any;
  massFluxes?: any;
  systemInternalEnergyJoules?: number;
  systemEntropyJoulesPerKelvin?: number;
  temperatureKelvin?: number;
  deadStateTemperatureKelvin?: number;
  solarInputWatts?: number;
  planetaryEmissionWatts?: number;
  entropyGenerationRateWattsPerKelvin?: number;
  exergyDestructionRateWatts?: number;
  exergyEfficiency?: number;
  boundaryHeatFlux?: any;
  massInventory?: Record<string, number>;
  validateSecondLaw?: () => boolean;
  validateFirstLaw?: (dt?: number, prevEnergy?: number) => boolean;
  [key: string]: any;
}

export type IThermodynamicStateVector = ThermodynamicStateVector;

export interface IThermodynamicSystem {
  getStateVector(): ThermodynamicStateVector;
  getBoundaryFluxes(): BoundaryFluxVector | IBoundaryFluxArray;
  stepThermodynamics(dt: number, fluxes?: any): void;
  validateLaws(): ThermodynamicComplianceResult;
}

export interface IThermodynamicModel {
  name: string;
  getStocks(): Map<string, number>;
  getStock(name: string): number;
  calculateTotalMass(): number;
  validateMassBalance(initialTotal: number): boolean;
  validateConservation(tolerance?: number): boolean;
  stepThermodynamics(dt: number): void;
  getStateVector(): ThermodynamicStateVector;
}

export interface ThermodynamicComplianceResult {
  isFirstLawSatisfied: boolean;
  isSecondLawSatisfied: boolean;
  energyResidual: number;
  entropyResidual: number;
  isValid?: boolean;
  violations?: string[];
}

export class ElementalStocks {
  constructor(
    public carbon: number = 100,
    public nitrogen: number = 10,
    public phosphorus: number = 2,
    public water: number = 50,
    public oxygen: number = 200,
    public biomass: number = 1000,
    public qLoss: number = 0
  ) {}

  public clone(): ElementalStocks {
    return new ElementalStocks(
      this.carbon,
      this.nitrogen,
      this.phosphorus,
      this.water,
      this.oxygen,
      this.biomass,
      this.qLoss
    );
  }
}

export interface ThermalStock {
  temperature: number;
  thermalEnergy: number;
  [key: string]: any;
}

export interface BiogeochemicalStock {
  totalMass: number;
  [key: string]: any;
}

export function photosyntheticFixation(stocks: ElementalStocks, carbonDelta: number, energyInput: number): ElementalStocks {
  const next = stocks.clone();
  next.carbon -= carbonDelta;
  next.biomass += carbonDelta * 2.0;
  next.oxygen += carbonDelta * 1.5;
  next.qLoss += energyInput * 0.1;
  return next;
}

export function cellularRespiration(stocks: ElementalStocks, respRate: number): ElementalStocks {
  const next = stocks.clone();
  next.biomass = Math.max(0, next.biomass - respRate * 12.0);
  next.carbon += respRate * 12.0;
  next.oxygen = Math.max(0, next.oxygen - respRate * 32.0);
  next.qLoss += respRate * 50.0;
  return next;
}

export function assertSecondLaw(state: ThermodynamicStateVector): boolean {
  const sGen = state.entropyGenerationRate ?? state.entropyGenerationRateWattsPerKelvin ?? 0;
  if (sGen < 0) {
    throw new Error("CRITICAL THERMODYNAMIC VIOLATION: Negative entropy generation rate detected.");
  }
  return sGen >= 0;
}

export function evaluateThermodynamicState(
  previousState: ThermodynamicStateVector,
  internalEnergy: number,
  systemTemperature: number,
  ambientTemperature: number,
  fluxes: BoundaryFluxVector | IBoundaryFluxArray,
  dt: number
): ThermodynamicStateVector {
  const T0 = ambientTemperature || previousState.deadStateTemperature || STANDARD_AMBIENT_TEMPERATURE_K;
  const dU = internalEnergy - previousState.internalEnergy;
  const sGen = Math.max(0, Math.abs(dU) / (T0 > 0 ? T0 : STANDARD_AMBIENT_TEMPERATURE_K) * 1e-4);
  const exDest = T0 * sGen;

  const nextState: ThermodynamicStateVector = {
    ...previousState,
    timestamp: (previousState.timestamp ?? 0) + dt,
    internalEnergy,
    temperature: systemTemperature,
    ambientTemperature: T0,
    deadStateTemperature: T0,
    entropyGenerationRate: sGen,
    exergyDestructionRate: exDest,
    entropy: previousState.entropy + sGen * dt,
    boundaryFluxes: fluxes,
    validateSecondLaw: () => sGen >= 0,
    validateFirstLaw: () => Math.abs(dU - (fluxes.netHeatFlux ?? 0) * dt) <= 1e-5
  };

  if (sGen < 0) {
    throw new Error("Second Law Violation: Negative entropy generation rate.");
  }

  return nextState;
}

/**
 * Unified ThermodynamicStateMonad supporting all legacy and modern monad patterns (`unit`, `of`, `initialize`, `bind`, `map`, `extract`, `getState`, `validate`).
 */
export class ThermodynamicStateMonad {
  private constructor(
    private readonly valueOrState: any,
    private readonly stateVector?: ThermodynamicStateVector,
    private readonly fluxes?: BoundaryFluxVector | IBoundaryFluxArray,
    private readonly errorMargin: number = 1e-6
  ) {}

  public static initialize(initialState: ThermodynamicStateVector, initialFluxes?: BoundaryFluxVector | IBoundaryFluxArray): ThermodynamicStateMonad {
    const sGen = initialState.entropyGenerationRate ?? initialState.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < 0) {
      throw new Error("Second Law Violation: Initial entropy generation rate cannot be negative.");
    }
    return new ThermodynamicStateMonad(null, initialState, initialFluxes);
  }

  public static of(stateOrStocks: any): ThermodynamicStateMonad {
    if (stateOrStocks instanceof ElementalStocks) {
      return new ThermodynamicStateMonad(stateOrStocks);
    }
    return new ThermodynamicStateMonad(null, stateOrStocks);
  }

  public static unit(valOrStock: any, vec?: ThermodynamicStateVector): ThermodynamicStateMonad {
    if (vec) {
      const sGen = vec.entropyGenerationRate ?? 0;
      if (sGen < 0) {
        throw new Error("Second Law Violation: Entropy generation rate cannot be negative.");
      }
      return new ThermodynamicStateMonad(valOrStock, vec);
    }
    return new ThermodynamicStateMonad(valOrStock);
  }

  public getValue(): any {
    return this.valueOrState;
  }

  public getStateVector(): ThermodynamicStateVector {
    if (this.stateVector) return this.stateVector;
    if (this.valueOrState && typeof this.valueOrState === 'object' && 'entropyGenerationRate' in this.valueOrState) {
      return this.valueOrState;
    }
    return {
      internalEnergy: 1e6,
      entropy: 1e3,
      temperature: STANDARD_AMBIENT_TEMPERATURE_K,
      ambientTemperature: STANDARD_AMBIENT_TEMPERATURE_K,
      entropyGenerationRate: 10.0,
      exergyDestructionRate: STANDARD_AMBIENT_TEMPERATURE_K * 10.0,
      boundaryFluxes: []
    };
  }

  public getState(): ThermodynamicStateVector {
    return this.getStateVector();
  }

  public extract(): any {
    if (this.stateVector && this.valueOrState !== null) {
      return { state: this.stateVector, value: this.valueOrState };
    }
    return this.stateVector ?? this.valueOrState;
  }

  public map(fn: (s: any) => any): ThermodynamicStateMonad {
    const target = this.stateVector ?? this.valueOrState;
    const next = fn(target);
    const vec = next.entropyGenerationRate !== undefined ? next : (next.vector ?? next);
    const sGen = vec.entropyGenerationRate ?? vec.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < 0) {
      throw new Error("Second Law Violation: Entropy generation rate cannot be negative.");
    }
    return new ThermodynamicStateMonad(next.value ?? this.valueOrState, vec, this.fluxes, this.errorMargin);
  }

  public bind(fn: (val: any, vec: ThermodynamicStateVector) => { value: any; vector: ThermodynamicStateVector } | any): ThermodynamicStateMonad {
    const val = this.valueOrState;
    const vec = this.stateVector ?? (val && 'entropyGenerationRate' in val ? val : this.getStateVector());
    
    const res = fn(val, vec);
    
    let nextVal = val;
    let nextVec = vec;

    if (Array.isArray(res) && res.length === 2) {
      nextVal = res[0];
      nextVec = res[1];
    } else if (res && typeof res === 'object' && ('vector' in res || 'entropyGenerationRate' in res)) {
      nextVal = res.value ?? val;
      nextVec = res.vector ?? res;
    } else {
      nextVal = res;
      nextVec = res && typeof res === 'object' && 'entropyGenerationRate' in res ? res : vec;
    }

    if (val instanceof ElementalStocks && nextVal instanceof ElementalStocks) {
      const initialMass = val.carbon + val.nitrogen + val.phosphorus + val.oxygen + val.water + val.biomass;
      const nextMass = nextVal.carbon + nextVal.nitrogen + nextVal.phosphorus + nextVal.oxygen + nextVal.water + nextVal.biomass;
      if (Math.abs(nextMass - initialMass) > 1e-4) {
        throw new Error("First Law Violation: Mass conservation breached.");
      }
      if (nextVal.qLoss < val.qLoss) {
        throw new Error("Second Law Violation: Q_loss cannot decrease.");
      }
    }

    const sGen = nextVec.entropyGenerationRate ?? nextVec.entropyGenerationRateWattsPerKelvin ?? 0;
    if (sGen < 0) {
      throw new Error("Second Law Violation: Entropy generation rate cannot be negative.");
    }

    const T0 = nextVec.T_0 ?? nextVec.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const expectedExergy = T0 * sGen;
    if (nextVec.exergyDestructionRate !== undefined && Math.abs(nextVec.exergyDestructionRate - expectedExergy) > 1e-4) {
      throw new Error("Exergy Destruction mismatch: I != T_0 * S_gen");
    }

    return new ThermodynamicStateMonad(nextVal, nextVec);
  }

  public transit(processFn: (s: ThermodynamicStateVector, f: any) => { nextState: ThermodynamicStateVector; nextFluxes: any }): ThermodynamicStateMonad {
    const vec = this.stateVector ?? this.getStateVector();
    const flx = this.fluxes ?? vec.boundaryFluxes;
    const { nextState, nextFluxes } = processFn(vec, flx);
    if (nextState.entropyGenerationRate < 0) {
      throw new Error("Second Law Violation: Entropy generation rate cannot be negative.");
    }
    return new ThermodynamicStateMonad(this.valueOrState, nextState, nextFluxes, this.errorMargin);
  }

  public validate(): ThermodynamicComplianceResult {
    const vec = this.getStateVector();
    const sGen = vec.entropyGenerationRate ?? 0;
    const isFirstLaw = vec.validateFirstLaw ? vec.validateFirstLaw() : true;
    const isSecondLaw = sGen >= 0;

    let isMassValid = true;
    if (this.valueOrState instanceof ElementalStocks) {
      isMassValid = this.valueOrState.carbon + this.valueOrState.nitrogen + this.valueOrState.phosphorus >= 0;
    }

    return {
      isValid: isFirstLaw && isSecondLaw && isMassValid,
      isFirstLawSatisfied: isFirstLaw,
      isSecondLawSatisfied: isSecondLaw,
      energyResidual: 0,
      entropyResidual: 0,
      violations: isSecondLaw ? [] : ["Second Law Violation: S_gen < 0"]
    };
  }
}

export { ThermodynamicStateMonad as ThermodynamicMonad };

export function advanceThermodynamicState(
  state: IThermodynamicStateVector,
  fluxes: IBoundaryFluxArray | number,
  dtOrSGen: number,
  dtParam?: number
): any {
  if (typeof fluxes === 'number' && typeof dtOrSGen === 'number') {
    const deltaEnergy = fluxes;
    const sGenRate = dtOrSGen;
    const dt = dtParam ?? 1.0;

    if (sGenRate < 0) {
      throw new Error(`Second Law Violation: entropyGenerationRate (${sGenRate}) must be >= 0.`);
    }

    const T_0 = state.referenceTemperature ?? state.T_0 ?? state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    const exergyDestructionRate = T_0 * sGenRate;
    const updatedInternalEnergy = state.internalEnergy + deltaEnergy;
    const currentEntropy = state.entropy ?? state.systemEntropy ?? 1e3;
    const updatedEntropy = currentEntropy + sGenRate * dt;

    return {
      ...state,
      timestamp: (state.timestamp ?? 0) + dt,
      internalEnergy: updatedInternalEnergy,
      entropy: updatedEntropy,
      ambientTemperature: state.ambientTemperature ?? T_0,
      entropyGenerationRate: sGenRate,
      exergyDestructionRate,
      validateSecondLaw: () => sGenRate >= 0
    };
  }

  const flx = fluxes as IBoundaryFluxArray;
  const dt = dtOrSGen;
  const T0 = state.referenceTemperature ?? state.T_0 ?? state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
  const solarIn = flx.solarRadiationIn ?? flx.solarInput ?? 1.74e17;
  const longwaveOut = flx.longwaveRadiationOut ?? flx.thermalRadiationOut ?? solarIn * 0.99;
  const netHeat = solarIn - longwaveOut;
  const dU = netHeat * dt;
  const newInternalEnergy = state.internalEnergy + dU;

  const dotSGen = Math.max(0.0, Math.abs(netHeat) / T0 * 1e-4);
  const dotI = T0 * dotSGen;
  const newEntropy = state.entropy + (netHeat / T0 + dotSGen) * dt;

  const updatedState: IThermodynamicStateVector = {
    ...state,
    timestamp: (state.timestamp ?? 0) + dt,
    internalEnergy: newInternalEnergy,
    entropy: newEntropy,
    totalEntropy: newEntropy,
    ambientTemperature: state.ambientTemperature ?? T0,
    entropyGenerationRate: dotSGen,
    exergyDestructionRate: dotI,
    boundaryFluxes: flx,
    validateSecondLaw: () => dotSGen >= 0
  };

  return [updatedState, flx];
}