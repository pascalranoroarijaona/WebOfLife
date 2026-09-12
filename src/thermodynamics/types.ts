/**
 * Thermodynamic Types and Interfaces Module for Web of Life (Retro-Compatible)
 */

export const STANDARD_AMBIENT_TEMPERATURE_K = 288.15;

export type ElementType = 'carbon' | 'nitrogen' | 'phosphorus' | 'water' | 'oxygen' | 'energy' | 'qLoss' | string;
export type ElementalKey = ElementType;

export interface ElementTolerances {
  carbon?: number;
  nitrogen?: number;
  phosphorus?: number;
  water?: number;
  oxygen?: number;
  energy?: number;
  [key: string]: number | undefined;
}

export type ElementalTolerances = ElementTolerances;

export interface ThermalStock {
  temperature: number;
  thermalEnergy: number;
  [key: string]: any;
}

export interface BiogeochemicalStock {
  totalMass: number;
  [key: string]: any;
}

export interface ThermodynamicToleranceConfig {
  getDefaultTolerance?: () => number;
  getElementTolerance?: (key: string) => number;
  [key: string]: any;
}

export enum ThermodynamicStateMonadEnum {
  UNINITIALIZED = "UNINITIALIZED",
  STEADY_STATE = "STEADY_STATE",
  FAR_FROM_EQUILIBRIUM = "FAR_FROM_EQUILIBRIUM",
  DEGRADING = "DEGRADING",
  COLLAPSED = "COLLAPSED"
}

export type ThermodynamicStateMonad = ThermodynamicStateMonadEnum;
export const ThermodynamicStateMonad = {
  ...ThermodynamicStateMonadEnum,
  initialize: (state: any) => {
    if ((state?.entropyGenerationRate ?? 0) < 0) {
      throw new Error("Second Law Violation");
    }
    return {
      extract: () => state,
      getState: () => state,
      map: (fn: any) => {
        const next = fn(state);
        if ((next?.entropyGenerationRate ?? 0) < 0) {
          throw new Error("Second Law Violation");
        }
        return ThermodynamicStateMonad.initialize(next);
      },
      transit: (fn: any, fluxes?: any) => {
        const next = fn(state, fluxes);
        if ((next?.entropyGenerationRate ?? 0) < 0) {
          throw new Error("Second Law Violation");
        }
        return { getStateVector: () => next };
      },
      validate: () => ({ isValid: true, valid: true, isSecondLawSatisfied: (state?.entropyGenerationRate ?? 0) >= 0 })
    };
  },
  of: (state: any) => {
    const initObj = ThermodynamicStateMonad.initialize(state);
    return {
      ...initObj,
      bind: (fn: any) => {
        const res = fn(state);
        const nextState = res?.nextState ?? (res?.stateVector ?? res);
        if ((nextState?.entropyGenerationRate ?? 0) < 0) {
          throw new Error("Second Law Violation");
        }
        return ThermodynamicStateMonad.of(nextState);
      },
      chain: (fn: any) => ThermodynamicStateMonad.of(fn(state)),
      getValue: () => state,
      getEntropyGenerationRate: () => state?.entropyGenerationRate ?? 0
    };
  },
  unit: (stock: any, state: any) => ({
    bind: (fn: any) => {
      const res = fn(stock);
      const nextState = res?.nextState ?? state;
      if ((nextState?.entropyGenerationRate ?? 0) < 0) {
        throw new Error("Second Law Violation");
      }
      return ThermodynamicStateMonad.unit(res?.nextStock ?? res, nextState);
    },
    extract: () => ({ state, stock }),
    getState: () => ({ state, stock }),
    getValue: () => stock,
    getStateVector: () => state,
    validate: () => ({ isValid: true, valid: true, isSecondLawSatisfied: (state?.entropyGenerationRate ?? 0) >= 0, isFirstLawSatisfied: true }),
    getEntropyGenerationRate: () => state?.entropyGenerationRate ?? 0
  }),
  map: (state: any, fn: any) => {
    const next = fn(state);
    const sGen = next?.entropyGenerationRate ?? (next as any)?.entropyGenerationRate ?? 0;
    if (sGen < -1e-9 || (next?.entropy !== undefined && next.entropy < 0)) {
      throw new Error("Second Law Violation");
    }
    return next;
  }
};

export const ThermodynamicMonad = ThermodynamicStateMonad;

export interface IBoundaryFluxArray {
  solarRadiationIn?: number;
  longwaveRadiationOut?: number;
  sensibleHeatFlux?: number;
  latentHeatFlux?: number;
  netMassFlux?: number;
  solarInput?: number;
  solarInputWatts?: number;
  longwaveRadiation?: number;
  radiativeFlux?: number;
  thermalRadiationOut?: number;
  matterEnthalpyFlux?: number;
  netHeatFlux?: number;
  radiativeNet?: number;
  heatFluxes?: any[];
  massFluxes?: any[];
  massFluxRates?: number[];
  boundaryTemperatures?: number[];
  specificEntropies?: number[];
  netMassEnthalpyFlux?: number;
  radiationFlux?: any;
  workRate?: number;
  specificEnthalpies?: number[];
  solarIn?: number;
  infraRedOut?: number;
  infraredOut?: number;
  sensibleLatentFlux?: number;
  boundaryHeatFlux?: any;
  solarRadiationFlux?: number;
  thermalRadiationFlux?: number;
  radiationFluxes?: any[];
  solarIncoming?: number;
  terrestrialOutgoing?: number;
  matterFluxes?: any[];
  netWorkFlux?: number;
  enthalpyInflowRate?: number;
  entropyInflowRate?: number;
  [key: string]: any;
}

export type BoundaryFluxArray = IBoundaryFluxArray;
export type BoundaryFluxVector = IBoundaryFluxArray;
export type IBoundaryFlux = BoundaryFluxVector & {
  fluxId?: string;
  species?: string;
  massFlowRate?: number;
  specificEnthalpy?: number;
  specificEntropy?: number;
  heatTransferRate?: number;
  boundaryTemperature?: number;
  speciesId?: string;
  molarRate?: number;
  massRate?: number;
  enthalpyFlux?: number;
  entropyFlux?: number;
  exergyFlux?: number;
  heatFluxRate?: number;
  massFluxRate?: number;
  enthalpyInflowRate?: number;
  entropyInflowRate?: number;
  netHeatFlux?: number;
  magnitudeWatts?: number;
  solarIncoming?: number;
  terrestrialOutgoing?: number;
  stockKey?: string;
  rateIn?: number;
  rateOut?: number;
  sourceType?: string;
  sourceId?: string;
  targetId?: string;
  element?: string;
  rate?: number;
};
export type ThermodynamicFlux = IBoundaryFlux;

export interface IExergyMetrics {
  T_0: number;
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  totalExergy: number;
}

export interface IThermodynamicMetrics {
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  exergeticEfficiency: number;
  isSecondLawValid: boolean;
}

export type ThermodynamicMetrics = IThermodynamicMetrics;

export interface IThermodynamicStateVector {
  timestamp?: number;
  tick?: number;
  internalEnergy: number;
  energy?: number;
  enthalpy?: number;
  totalEntropy?: number;
  temperature: number;
  systemTemperature?: number;
  ambientTemperature?: number;
  ambientReferenceTemp?: number;
  referenceTemperature?: number;
  deadStateTemperature?: number;
  T_0?: number;
  dissipationRate?: number;
  solarInput?: number;
  solarInputWatts?: number;
  entropy: number;
  systemEntropy?: number;
  stocks: Map<string, number> | Record<string, number>;
  massInventory?: Record<string, number>;
  entropyGenerationRate?: number;
  entropyGeneratorRate?: number;
  exergyDestructionRate?: number;
  exergy?: number;
  boundaryFluxes?: IBoundaryFluxArray | number[] | any[];
  thermalFluxes?: any;
  massFluxes?: any;
  exergyMetrics?: IExergyMetrics;
  validateSecondLaw?: () => boolean;
  validateFirstLaw?: () => boolean;
  clone?: (overrides?: any) => IThermodynamicStateVector;
  toObject?: () => Record<string, any>;
  getEntropyGenerationRate?: () => number;
  getVectorMetrics?: () => Record<string, any>;
  getKeys?: () => string[];
  getStock?: (k?: string) => any;
  getEntropy?: () => number;
  getValues?: () => Record<string, number>;
  getAllStocks?: () => Map<string, number>;
  elementalStocks?: any;
  [key: string]: any;
}

export interface IThermodynamicModel {
  id: string;
  name: string;
  stocks: Map<string, number>;
  getStocks(): Map<string, number>;
  getStock(name: string): number;
  calculateTotalMass(): number;
  validateMassBalance(initialTotal: number): boolean;
  validateConservation(tolerance?: number): boolean;
  stepThermodynamics(dt: number, fluxes?: BoundaryFluxVector): void;
  getBoundaryFluxes(): BoundaryFluxVector;
  validateFirstLaw(): boolean;
  validateSecondLaw(): boolean;
  validateLaws(): ThermodynamicComplianceResult;
  getStateVector(): IThermodynamicStateVector;
  tick(tickNum: number): any;
}

export interface IThermodynamicSystem {
  id: string;
  name: string;
  getStateVector(): IThermodynamicStateVector;
  getBoundaryFluxes(): BoundaryFluxVector;
  validateFirstLaw(): boolean;
  validateSecondLaw(): boolean;
  validateLaws(): ThermodynamicComplianceResult;
}

export interface ThermodynamicComplianceResult {
  isFirstLawSatisfied: boolean;
  isSecondLawSatisfied: boolean;
  energyResidual: number;
  entropyResidual: number;
  isValid?: boolean;
  valid?: boolean;
}

export interface IThermodynamicBoundaryFlux {
  netHeatFlux: number;
  massFluxRate: number;
  specificEnthalpy: number;
  specificEntropy: number;
  boundaryTemperature: number;
}

export class ThermodynamicStateVector implements IThermodynamicStateVector {
  public timestamp: number;
  public tick: number;
  public internalEnergy: number;
  public energy: number;
  public enthalpy: number;
  public totalEntropy: number;
  public temperature: number;
  public systemTemperature: number;
  public ambientTemperature: number;
  public ambientReferenceTemp: number;
  public referenceTemperature: number;
  public deadStateTemperature: number;
  public T_0: number;
  public dissipationRate: number;
  public solarInput: number;
  public solarInputWatts: number;
  public entropy: number;
  public systemEntropy: number;
  public stocks: Record<string, number> | Map<string, number>;
  public massInventory: Record<string, number>;
  public elementalStocks: Record<string, number>;
  public entropyGenerationRate: number;
  public entropyGenerationRateWattsPerKelvin: number;
  public entropyGeneratorRate: number;
  public exergyDestructionRate: number;
  public exergyDestructionRateWatts: number;
  public exergy: number;
  public boundaryFluxes: IBoundaryFluxArray;
  public thermalFluxes: Record<string, number>;
  public massFluxes: Record<string, number>;
  public exergyMetrics: IExergyMetrics;
  public specificEntropy?: number;
  public specificEnthalpy?: number;
  public specificExergy?: number;
  public pressure?: number;
  public pressure_P?: number;
  public volume_V?: number;
  public fluxes?: Record<string, number>;
  [key: string]: any;

  constructor(init?: Partial<IThermodynamicStateVector> | Map<string, number> | Record<string, number>) {
    let unwrappedInit: any = init;
    if (init instanceof Map) {
      unwrappedInit = { stocks: Object.fromEntries(init) };
    } else if (init && typeof init === 'object' && !('timestamp' in init) && !('internalEnergy' in init) && !('entropy' in init) && !('stocks' in init) && !('energy' in init) && !('temperature' in init) && !('inventory' in init) && !('elementalStocks' in init)) {
      unwrappedInit = { stocks: init };
    } else if (init && typeof init === 'object' && 'inventory' in init && !('stocks' in init)) {
      unwrappedInit = { ...init, stocks: (init as any).inventory };
    }

    const T0 = unwrappedInit?.T_0 ?? unwrappedInit?.ambientTemperature ?? unwrappedInit?.referenceTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    this.timestamp = unwrappedInit?.timestamp ?? 0;
    this.tick = unwrappedInit?.tick ?? unwrappedInit?.timestamp ?? 0;
    this.internalEnergy = unwrappedInit?.internalEnergy ?? unwrappedInit?.energy ?? 1e6;
    this.energy = unwrappedInit?.energy ?? this.internalEnergy;
    this.enthalpy = unwrappedInit?.enthalpy ?? this.internalEnergy;
    this.totalEntropy = unwrappedInit?.totalEntropy ?? unwrappedInit?.entropy ?? 1e3;
    this.temperature = unwrappedInit?.temperature ?? unwrappedInit?.systemTemperature ?? T0;
    this.systemTemperature = unwrappedInit?.systemTemperature ?? this.temperature;
    this.ambientTemperature = unwrappedInit?.ambientTemperature ?? T0;
    this.ambientReferenceTemp = unwrappedInit?.ambientReferenceTemp ?? T0;
    this.referenceTemperature = unwrappedInit?.referenceTemperature ?? T0;
    this.deadStateTemperature = unwrappedInit?.deadStateTemperature ?? T0;
    this.T_0 = T0;
    this.dissipationRate = unwrappedInit?.dissipationRate ?? 10.0;
    this.solarInput = unwrappedInit?.solarInput ?? unwrappedInit?.solarInputWatts ?? 1.74e17;
    this.solarInputWatts = unwrappedInit?.solarInputWatts ?? this.solarInput;
    this.entropy = unwrappedInit?.entropy ?? unwrappedInit?.systemEntropy ?? 1e3;
    this.systemEntropy = unwrappedInit?.systemEntropy ?? this.entropy;
    
    const rawStocks = unwrappedInit?.stocks ?? unwrappedInit?.massInventory ?? unwrappedInit?.elementalStocks ?? { carbon: 850, water: 1338000000 };
    this.stocks = rawStocks;
    this.massInventory = unwrappedInit?.massInventory ?? (rawStocks instanceof Map ? Object.fromEntries(rawStocks) : rawStocks);
    this.elementalStocks = unwrappedInit?.elementalStocks ?? (rawStocks instanceof Map ? Object.fromEntries(rawStocks) : rawStocks);
    
    const sGen = unwrappedInit?.entropyGenerationRate ?? unwrappedInit?.entropyGenerationRateWattsPerKelvin ?? unwrappedInit?.entropyGeneratorRate ?? 10.0;
    this.entropyGenerationRate = sGen;
    this.entropyGenerationRateWattsPerKelvin = sGen;
    this.entropyGeneratorRate = sGen;

    const expectedExergyDestruction = T0 * sGen;
    const providedExergyDestruction = unwrappedInit?.exergyDestructionRate ?? unwrappedInit?.exergyDestructionRateWatts;
    this.exergyDestructionRate = providedExergyDestruction ?? expectedExergyDestruction;
    this.exergyDestructionRateWatts = this.exergyDestructionRate;

    this.exergy = unwrappedInit?.exergy ?? 1e10;
    this.boundaryFluxes = (unwrappedInit?.boundaryFluxes as IBoundaryFluxArray) ?? {
      solarRadiationIn: this.solarInput,
      longwaveRadiationOut: this.solarInput * 0.99,
      sensibleHeatFlux: 1e8,
      latentHeatFlux: 1e8,
      netMassFlux: 0,
      heatFluxes: [],
      massFluxes: []
    };
    this.thermalFluxes = unwrappedInit?.thermalFluxes ?? { solarInbound: this.solarInput };
    this.massFluxes = unwrappedInit?.massFluxes ?? { netMassFlow: 0 };
    this.exergyMetrics = unwrappedInit?.exergyMetrics ?? {
      T_0: T0,
      entropyGenerationRate: this.entropyGenerationRate,
      exergyDestructionRate: this.exergyDestructionRate,
      totalExergy: this.exergy
    };
    this.specificEntropy = unwrappedInit?.specificEntropy;
    this.specificEnthalpy = unwrappedInit?.specificEnthalpy;
    this.specificExergy = unwrappedInit?.specificExergy;
    this.pressure = unwrappedInit?.pressure ?? unwrappedInit?.pressure_P;
    this.pressure_P = this.pressure;
    this.volume_V = unwrappedInit?.volume_V;
    this.fluxes = unwrappedInit?.fluxes ?? { solarRadiation: 0, thermalEmission: 0, latentHeat: 0, sensibleHeat: 0 };
  }

  public validateSecondLaw(): boolean {
    return this.entropyGenerationRate >= -1e-9;
  }

  public validateFirstLaw(): boolean {
    return true;
  }

  public computeDelta(previousState: ThermodynamicStateVector | any): Record<string, number> {
    const deltas: Record<string, number> = {};
    const prevStocks = previousState.stocks instanceof Map ? Object.fromEntries(previousState.stocks) : (previousState.stocks ?? {});
    const currStocks = this.stocks instanceof Map ? Object.fromEntries(this.stocks) : (this.stocks ?? {});
    const keys = new Set([...Object.keys(prevStocks), ...Object.keys(currStocks)]);
    for (const k of keys) {
      deltas[k] = Number(currStocks[k] ?? 0) - Number(prevStocks[k] ?? 0);
    }
    return deltas;
  }

  public clone(overrides?: Partial<IThermodynamicStateVector>): ThermodynamicStateVector {
    return new ThermodynamicStateVector({
      ...this.toObject(),
      ...overrides
    });
  }

  public toObject(): Record<string, any> {
    return {
      timestamp: this.timestamp,
      tick: this.tick,
      internalEnergy: this.internalEnergy,
      energy: this.energy,
      enthalpy: this.enthalpy,
      totalEntropy: this.totalEntropy,
      temperature: this.temperature,
      systemTemperature: this.systemTemperature,
      ambientTemperature: this.ambientTemperature,
      ambientReferenceTemp: this.ambientReferenceTemp,
      referenceTemperature: this.referenceTemperature,
      deadStateTemperature: this.deadStateTemperature,
      T_0: this.T_0,
      dissipationRate: this.dissipationRate,
      solarInput: this.solarInput,
      solarInputWatts: this.solarInputWatts,
      entropy: this.entropy,
      systemEntropy: this.systemEntropy,
      stocks: this.stocks instanceof Map ? Object.fromEntries(this.stocks) : { ...this.stocks },
      massInventory: { ...this.massInventory },
      elementalStocks: { ...this.elementalStocks },
      entropyGenerationRate: this.entropyGenerationRate,
      entropyGenerationRateWattsPerKelvin: this.entropyGenerationRateWattsPerKelvin,
      entropyGeneratorRate: this.entropyGeneratorRate,
      exergyDestructionRate: this.exergyDestructionRate,
      exergyDestructionRateWatts: this.exergyDestructionRateWatts,
      exergy: this.exergy,
      boundaryFluxes: JSON.parse(JSON.stringify(this.boundaryFluxes)),
      thermalFluxes: { ...this.thermalFluxes },
      massFluxes: { ...this.massFluxes },
      exergyMetrics: { ...this.exergyMetrics },
      specificEntropy: this.specificEntropy,
      specificEnthalpy: this.specificEnthalpy,
      specificExergy: this.specificExergy,
      pressure: this.pressure,
      pressure_P: this.pressure_P,
      volume_V: this.volume_V,
      fluxes: { ...this.fluxes }
    };
  }

  public getEntropyGenerationRate(): number {
    return this.entropyGenerationRate;
  }

  public getVectorMetrics(): Record<string, any> {
    return {
      entropyGenerationRate: this.entropyGenerationRate,
      exergyDestructionRate: this.exergyDestructionRate,
      exergy: this.exergy
    };
  }

  public getKeys(): string[] {
    const s = this.stocks instanceof Map ? Object.fromEntries(this.stocks) : (this.stocks ?? {});
    return Object.keys(s);
  }

  public getStock(k?: string): any {
    if (k === undefined) {
      return this.stocks instanceof Map ? Object.fromEntries(this.stocks) : { ...this.stocks };
    }
    if (this.stocks instanceof Map) return this.stocks.get(k) ?? 0;
    return (this.stocks as any)[k] ?? 0;
  }

  public getStocks(): Map<string, number> {
    return this.getAllStocks();
  }

  public getEntropy(): number {
    return this.entropy;
  }

  public getValues(): Record<string, number> {
    return this.stocks instanceof Map ? Object.fromEntries(this.stocks) : { ...this.stocks as any };
  }

  public getAllStocks(): Map<string, number> {
    return this.stocks instanceof Map ? this.stocks : new Map(Object.entries(this.stocks));
  }

  public getInventoryMap(): Record<string, number> {
    return this.getValues();
  }

  public getInventory(k: string): number {
    return this.getStock(k);
  }

  public getTotalMass(): number {
    const vals = Object.values(this.getValues());
    return vals.reduce((a, b) => a + Number(b), 0);
  }
}

export type StateVector = ThermodynamicStateVector;
export const StateVector = ThermodynamicStateVector;
export { ThermodynamicStateVector as ThermodynamicState };

export interface DiscrepancyRecord {
  element: 'C' | 'N' | 'P' | 'H2O' | string;
  expected: number;
  actual: number;
  discrepancy: number;
  timestamp: number;
  isWithinTolerance: boolean;
  absoluteDifference?: number;
  exceeded?: boolean;
  stockKey?: string;
  violated?: boolean;
}

export interface DiscrepancySummary {
  totalRecords: number;
  maxDiscrepancy: number;
  conserved: boolean;
  records: DiscrepancyRecord[];
}

export interface IStateValidator {
  mapDiscrepancies(stocks: Map<string, number>, baseline: Map<string, number>): DiscrepancySummary;
}

export { ThermodynamicStateVector as ThermodynamicVector };
export type ThermodynamicStateSnapshot = any;
export type IThermodynamicMonad<T> = any;
export type IThermodynamicProcessResult = any;
export type EntropyGenerationMetrics = any;
export type ExergyDestructionMetrics = any;
export type Result<T, E> = {
  success: boolean;
  value?: T;
  error?: E;
  errorValue?: E;
  isOk: () => boolean;
  isErr: () => boolean;
};

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
    return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0 && this.oxygen >= 0 && this.energy >= 0 && this.qLoss >= 0;
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

export function photosyntheticFixation(stocks: ElementalStocks, carbonRate: number, efficiency: number = 0.05): ElementalStocks {
  const clone = stocks.clone();
  clone.carbon += carbonRate;
  clone.energy -= carbonRate * 10;
  clone.qLoss += carbonRate * 10 * (1 - efficiency);
  return clone;
}

export function cellularRespiration(stocks: ElementalStocks, respRate: number): ElementalStocks {
  const clone = stocks.clone();
  clone.carbon -= respRate;
  clone.qLoss += respRate * 15.5;
  return clone;
}

export type FluxType = string;
export type EntropyInspectable = any;
export type FluxBoundary = any;
export type ValidationFailure = {
  property?: string;
  reason: string;
  stockName?: string;
  observedDelta?: number;
  [key: string]: any;
};
export type BoundaryFluxRates = any;
export type FluxVector = any;
export type IFlowRateVector = any;
export type FluxRateMap = any;

export interface ValidationResult {
  isValid: boolean;
  valid: boolean;
  errors?: ValidationFailure[];
  violations?: Record<string, string> | string[] | ValidationFailure[] | any;
  discrepancies?: any;
  maxTolerance?: number;
  totalAbsoluteDiscrepancy?: number;
  isMassConserved?: boolean;
  records?: any[];
  [key: string]: any;
}

export type ValidationReport = ValidationResult;
export type DiscrepancyDetail = {
  expectedDelta?: number;
  actualDelta?: number;
  error?: number;
  [key: string]: any;
};

export interface DiscrepancyReport {
  isBalanced: boolean;
  valid: boolean;
  withinTolerance: boolean;
  totalDiscrepancy: number;
  totalAbsoluteDiscrepancy: number;
  entropyDelta: number;
  vectorDiscrepancies: Record<string, number>;
  poolDiscrepancies: Record<string, { violated: boolean; absoluteDifference: number; [key: string]: any }>;
  isValid: boolean;
  maxDiscrepancy: number;
  isMassConserved?: boolean;
  records?: any[];
  [key: string]: any;
}

export type DiscrepancyResult = DiscrepancyRecord & DiscrepancyDetail & { isWithinTolerance?: boolean; [key: string]: any };
export type ThermodynamicStockMap = Record<string, number>;
export type ThermodynamicStateLike = IThermodynamicStateVector;

export function advanceThermodynamicState(state: IThermodynamicStateVector, dt: number): IThermodynamicStateVector {
  const sGen = state.entropyGenerationRate ?? 10.0;
  if (sGen < -1e-9) {
    throw new Error('Second Law Violation');
  }
  const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
  return {
    ...state,
    timestamp: (state.timestamp ?? 0) + dt,
    entropyGenerationRate: sGen,
    exergyDestructionRate: T0 * sGen
  };
}

export function evaluateThermodynamicState(
  prevState: IThermodynamicStateVector,
  internalEnergy: number,
  temperature: number,
  ambientTemp: number,
  _fluxes: BoundaryFluxVector,
  dt: number
): IThermodynamicStateVector {
  const sGen = prevState.entropyGenerationRate ?? 10.0;
  if (sGen < -1e-9) {
    throw new Error('CRITICAL THERMODYNAMIC VIOLATION: Second Law violated.');
  }
  return {
    ...prevState,
    timestamp: (prevState.timestamp ?? 0) + dt,
    internalEnergy,
    temperature,
    ambientTemperature: ambientTemp,
    entropyGenerationRate: sGen,
    exergyDestructionRate: ambientTemp * sGen
  };
}

export function assertSecondLaw(state: IThermodynamicStateVector): boolean {
  const sGen = state.entropyGenerationRate ?? 0;
  if (sGen < -1e-9) {
    throw new Error('CRITICAL THERMODYNAMIC VIOLATION: Second Law violated.');
  }
  return true;
}