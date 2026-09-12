/**
 * Thermodynamic State Vector representing energy, entropy, and exergy metrics 
 * for a discrete control volume or planetary pod at time t.
 */
export interface IThermodynamicStateVector {
  /** Timestamp or simulation tick index */
  readonly timestamp: number;
  /** Ambient reference temperature (K), default 288.15 K */
  readonly T_0: number;
  /** Total internal energy (J) */
  readonly internalEnergy: number;
  /** Total system entropy (J/K) */
  readonly entropy: number;
  /** Internal entropy generation rate (W/K or J/(s·K)), must be >= 0 */
  readonly entropyGenerationRate: number;
  /** Exergy destruction rate (W or J/s), defined as T_0 * entropyGenerationRate */
  readonly exergyDestructionRate: number;
  /** Net boundary heat flux vector (W) */
  readonly boundaryHeatFlux: BoundaryHeatFluxArray;
  /** Material mass inventory vector across biogeochemical cycles (kg) */
  readonly massInventory: Record<string, number>;

  // Backward compatibility legacy properties
  readonly temperature?: number;
  readonly ambientTemperature?: number;
  readonly mass?: number;
  readonly totalMass?: number;
  readonly exergy?: number;
  readonly boundaryFluxes?: BoundaryHeatFluxArray[] | any;
  readonly stocks?: Record<string, number> | ElementalStocks;
  readonly fluxes?: {
    radiativeFlux?: number;
    convectiveFlux?: number;
    massEnthalpyFlux?: number;
    speciesMassFluxes?: Record<string, number>;
    [key: string]: any;
  };
  readonly entropyMetrics?: EntropyMetrics;
  readonly system?: {
    temperature?: number;
    internalEnergy?: number;
    entropy?: number;
    exergy?: number;
  };
  readonly ambientReference?: {
    temperature0?: number;
    pressure0?: number;
  };
}

/**
 * Boundary heat flux array tracking incoming solar, outgoing thermal IR, 
 * and conductive/convective exchanges with boundaries (W).
 */
export interface BoundaryHeatFluxArray {
  /** Incoming solar radiative flux (W) [>= 0] */
  solarIn?: number;
  /** Outgoing longwave infrared radiative flux (W) [<= 0] */
  infraredOut?: number;
  /** Sensible and latent heat exchange fluxes (W) */
  sensibleLatentFlux?: number;
  radiativeFlux?: number;
  convectiveFlux?: number;
  massEnthalpyFlux?: number;
  speciesMassFluxes?: Record<string, number>;
}

/**
 * Encapsulates second-law thermodynamic metrics for a control volume.
 */
export interface EntropyMetrics {
  readonly sGenRate: number;
  readonly exergyDestruction: number;
  readonly cumulativeQLoss: number;
  readonly referenceTemperature?: number;
  readonly exergyDestructionRate?: number;
}

/**
 * Contract for any thermodynamic processor, pod, or biogeochemical cycle component.
 */
export interface IThermodynamicSystem {
  getStateVector(): IThermodynamicStateVector;
  calculateEntropyGeneration(dt: number): number;
  verifyFirstLaw(previousState: IThermodynamicStateVector, currentState: IThermodynamicStateVector, dt: number): boolean;
  verifySecondLaw(): boolean;
}

/**
 * ElementalStocks representation for Sprint 004 & legacy compatibility.
 */
export class ElementalStocks {
  constructor(
    public carbon: number = 0,
    public nitrogen: number = 0,
    public phosphorus: number = 0,
    public oxygen: number = 0,
    public water: number = 0,
    public energyStored: number = 0,
    public qLoss: number = 0
  ) {}

  public totalMass(): number {
    return this.carbon + this.nitrogen + this.phosphorus + this.oxygen + this.water;
  }

  public clone(): ElementalStocks {
    return new ElementalStocks(
      this.carbon,
      this.nitrogen,
      this.phosphorus,
      this.oxygen,
      this.water,
      this.energyStored,
      this.qLoss
    );
  }
}

/**
 * Monad wrapper enforcing thermodynamic invariants during state transitions.
 */
export class ThermodynamicMonad<T> {
  private constructor(
    private readonly value: T,
    private readonly stateVector: IThermodynamicStateVector
  ) {}

  public static unit<T>(value: T, initialVector: IThermodynamicStateVector): ThermodynamicMonad<T> {
    validateThermodynamicInvariants(initialVector);
    return new ThermodynamicMonad(value, initialVector);
  }

  public static of(initialVectorOrStocks: IThermodynamicStateVector | ElementalStocks): ThermodynamicMonad<any> {
    if (initialVectorOrStocks instanceof ElementalStocks) {
      const stocks = initialVectorOrStocks;
      const t0 = 288.15;
      const totalM = stocks.totalMass();
      const sGen = 0.1;
      const vector: IThermodynamicStateVector = {
        timestamp: 0,
        T_0: t0,
        internalEnergy: stocks.energyStored,
        entropy: stocks.qLoss / t0 + 10,
        entropyGenerationRate: sGen,
        exergyDestructionRate: t0 * sGen,
        boundaryHeatFlux: { solarIn: 1000, infraredOut: -950 },
        massInventory: { carbon: stocks.carbon, nitrogen: stocks.nitrogen, phosphorus: stocks.phosphorus, oxygen: stocks.oxygen, water: stocks.water },
        temperature: t0,
        ambientTemperature: t0,
        mass: totalM,
        totalMass: totalM,
        exergy: stocks.energyStored * 0.5,
        stocks,
        entropyMetrics: { sGenRate: sGen, exergyDestruction: t0 * sGen, cumulativeQLoss: stocks.qLoss }
      };
      return new ThermodynamicMonad(stocks, vector);
    } else {
      validateThermodynamicInvariants(initialVectorOrStocks);
      return new ThermodynamicMonad(initialVectorOrStocks, initialVectorOrStocks);
    }
  }

  public bind<U>(
    fn: (val: T, vector: IThermodynamicStateVector) => { value: U; vector: IThermodynamicStateVector } | U | ElementalStocks
  ): ThermodynamicMonad<any> {
    const res = fn(this.value, this.stateVector);
    let nextVal: any;
    let nextVec: IThermodynamicStateVector;

    if (res instanceof ElementalStocks) {
      const prevStocks = this.stateVector.stocks instanceof ElementalStocks ? this.stateVector.stocks : null;
      if (prevStocks) {
        const initialTotal = prevStocks.totalMass();
        const currentTotal = res.totalMass();
        if (Math.abs(initialTotal - currentTotal) > 1e-6) {
          throw new Error(`First Law Violation: Mass invariant broken! Initial: ${initialTotal}, Current: ${currentTotal}`);
        }
      }
      if (res.qLoss < (this.value instanceof ElementalStocks ? this.value.qLoss : 0)) {
        throw new Error(`Second Law Violation: qLoss cannot decrease.`);
      }
      nextVal = res;
      const t0 = this.stateVector.T_0;
      const sGen = 0.1;
      nextVec = {
        ...this.stateVector,
        timestamp: this.stateVector.timestamp + 1,
        mass: res.totalMass(),
        totalMass: res.totalMass(),
        entropyGenerationRate: sGen,
        exergyDestructionRate: t0 * sGen,
        stocks: res,
        massInventory: { carbon: res.carbon, nitrogen: res.nitrogen, phosphorus: res.phosphorus, oxygen: res.oxygen, water: res.water }
      };
    } else if (res && typeof res === 'object' && 'vector' in res && 'value' in res) {
      nextVal = res.value;
      nextVec = res.vector;
    } else {
      nextVal = res;
      nextVec = { ...this.stateVector, timestamp: this.stateVector.timestamp + 1 };
    }

    validateThermodynamicInvariants(nextVec);

    return new ThermodynamicMonad(nextVal, nextVec);
  }

  public transform(sGenRate: number, dt: number): ThermodynamicMonad<T> {
    if (sGenRate < 0) {
      throw new Error(`Second Law Violation: \u1e60_gen (${sGenRate}) < 0 W/K`);
    }
    const updatedVector: IThermodynamicStateVector = {
      ...this.stateVector,
      timestamp: this.stateVector.timestamp + dt,
      entropyGenerationRate: sGenRate,
      exergyDestructionRate: this.stateVector.T_0 * sGenRate,
      entropyMetrics: {
        ...(this.stateVector.entropyMetrics || { cumulativeQLoss: 0, exergyDestruction: this.stateVector.T_0 * sGenRate }),
        sGenRate,
        exergyDestruction: this.stateVector.T_0 * sGenRate,
        exergyDestructionRate: this.stateVector.T_0 * sGenRate
      }
    };
    validateThermodynamicInvariants(updatedVector);
    return new ThermodynamicMonad(this.value, updatedVector);
  }

  public getStateVector(): IThermodynamicStateVector {
    return this.stateVector;
  }

  public getValue(): T {
    return this.value;
  }

  public validate(): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];
    if (this.stateVector.entropyGenerationRate < 0) {
      violations.push("Second Law Violation: negative entropy generation rate");
    }
    const t0 = this.stateVector.T_0;
    const sGen = this.stateVector.entropyGenerationRate;
    const exDest = this.stateVector.exergyDestructionRate;
    if (Math.abs(exDest - t0 * sGen) > 1e-4) {
      violations.push("Exergy Inconsistency: exergy destruction rate does not equal T_0 * S_gen");
    }
    return {
      isValid: violations.length === 0,
      violations
    };
  }
}

// Backward compatibility validation predicate
export function validateThermodynamicInvariants(state: IThermodynamicStateVector): boolean {
  const sGen = state.entropyGenerationRate ?? state.entropyMetrics?.sGenRate ?? 0;
  if (sGen < 0 || (state.entropyMetrics && state.entropyMetrics.sGenRate < 0)) {
    throw new Error(`Second Law Violation: Internal entropy generation rate cannot be negative: ${sGen}`);
  }
  const exergyDest = state.exergyDestructionRate ?? state.entropyMetrics?.exergyDestruction ?? (state.T_0 * sGen);
  const t0 = state.T_0 ?? 288.15;
  const expectedExDest = t0 * sGen;
  if (Math.abs(exergyDest - expectedExDest) > 1e-3) {
    throw new Error(`Exergy Inconsistency: Exergy destruction rate ${exergyDest} does not match T_0 * S_gen (${expectedExDest})`);
  }
  return true;
}

// Backward compatibility types referenced in legacy imports
export type ThermodynamicStateVector = IThermodynamicStateVector;
export type BoundaryFlux = BoundaryHeatFluxArray;
export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function photosyntheticFixation(
  stocksOrCarbon: ElementalStocks | number,
  solarWatts: number,
  efficiency: number = 0.05
): { value: number; vector: IThermodynamicStateVector } | ElementalStocks {
  const t0 = 288.15;
  if (typeof stocksOrCarbon === 'number') {
    const carbonMass = stocksOrCarbon;
    const entropyGen = solarWatts * 1e-4 + carbonMass * 1e-5;
    return {
      value: carbonMass * 1.05,
      vector: {
        timestamp: Date.now(),
        T_0: t0,
        internalEnergy: solarWatts * 0.1,
        entropy: carbonMass * 1.2,
        entropyGenerationRate: entropyGen,
        exergyDestructionRate: t0 * entropyGen,
        boundaryHeatFlux: { solarIn: solarWatts, infraredOut: -solarWatts * 0.95, sensibleLatentFlux: solarWatts * 0.05 },
        massInventory: { carbon: carbonMass }
      }
    };
  } else {
    const stocks = stocksOrCarbon;
    const mutated = stocks.clone();
    const fixedC = solarWatts * efficiency * 1e-4;
    mutated.carbon += fixedC;
    mutated.oxygen += fixedC * 2.66;
    mutated.qLoss += solarWatts * (1 - efficiency) * 1e-5;
    return mutated;
  }
}

export function cellularRespiration(
  stocksOrCarbon: ElementalStocks | number,
  metabolicRate: number
): { value: number; vector: IThermodynamicStateVector } | ElementalStocks {
  const t0 = 288.15;
  if (typeof stocksOrCarbon === 'number') {
    const carbonMass = stocksOrCarbon;
    const entropyGen = metabolicRate * 0.01;
    return {
      value: Math.max(0, carbonMass * 0.98),
      vector: {
        timestamp: Date.now(),
        T_0: t0,
        internalEnergy: metabolicRate * 10,
        entropy: carbonMass * 1.5,
        entropyGenerationRate: entropyGen,
        exergyDestructionRate: t0 * entropyGen,
        boundaryHeatFlux: { solarIn: 0, infraredOut: -metabolicRate * 10, sensibleLatentFlux: 0 },
        massInventory: { carbon: carbonMass }
      }
    };
  } else {
    const stocks = stocksOrCarbon;
    const mutated = stocks.clone();
    const respiredC = metabolicRate * 0.1;
    mutated.carbon = Math.max(0, mutated.carbon - respiredC);
    mutated.qLoss += metabolicRate * 0.5;
    return mutated;
  }
}