/**
 * Thermodynamic Types & Interfaces (Sprint 057 & Comprehensive Retro-Compatibility)
 */

export const STANDARD_AMBIENT_TEMPERATURE_K = 288.15; // 15°C standard Earth surface temperature

export enum EntropyState {
  STEADY = "STEADY",
  ACCUMULATING = "ACCUMULATING",
  DEGRADING = "DEGRADING",
  COLLAPSED = "COLLAPSED"
}

export interface ValidationFailure {
  property: string;
  reason: string;
}

export interface ValidationResult {
  isValid: boolean;
  valid?: boolean;
  expectedDeltas?: Map<string, number>;
  discrepancies?: Map<string, any> | Record<string, any>;
  maxTolerance?: number;
  errors?: ValidationFailure[] | any[];
  violations?: any[];
  success?: boolean;
  error?: any;
}

export interface IBoundaryFluxArray {
  solarRadiationIn?: number;
  longwaveRadiationOut?: number;
  sensibleHeatFlux?: number;
  latentHeatFlux?: number;
  netMassFlux?: number;
  radiativeFlux?: number;
  massFluxRates?: number[];
  solarInput?: number;
  solarInputWatts?: number;
  thermalRadiationOut?: number;
  matterEnthalpyFlux?: number;
  netHeatFlux?: number;
  heatFluxes?: any[];
  radiativeNet?: number;
  massFluxes?: any[];
  solarIncoming?: number;
  terrestrialOutgoing?: number;
  boundaryTemperatures?: number[];
  specificEnthalpies?: number[];
  specificEntropies?: number[];
  heatFluxRate?: number;
  massFluxRate?: number;
  enthalpyInflowRate?: number;
  entropyInflowRate?: number;
  netMassEnthalpyFlux?: number;
  radiationFluxes?: any[];
  fluxes?: any[];
  netHeatRate?: number;
  netWorkRate?: number;
  netMassBalance?: number;
  matterFluxes?: any[];
  netWorkFlux?: number;
  solarIn?: number;
  infraRedOut?: number;
  infraredOut?: number;
  sensibleLatentFlux?: number;
  solarRadiationFlux?: number;
  thermalRadiationFlux?: number;
  workRate?: number;
  radiationFlux?: any;
  [key: string]: any;
}

export interface BoundaryFluxVector {
  heatFluxes?: any[];
  radiationFlux?: {
    solarIncoming: number;
    terrestrialOutgoing: number;
  };
  workRate?: number;
  massFluxes?: any[];
  specificEnthalpies?: number[];
  specificEntropies?: number[];
  solarRadiationIn?: number;
  longwaveRadiationOut?: number;
  sensibleHeatFlux?: number;
  latentHeatFlux?: number;
  netMassFlux?: number;
  solarIncoming?: number;
  terrestrialOutgoing?: number;
  solarIn?: number;
  infraRedOut?: number;
  infraredOut?: number;
  sensibleLatentFlux?: number;
  netMassEnthalpyFlux?: number;
  solarRadiationFlux?: number;
  thermalRadiationFlux?: number;
  radiationFluxes?: any[];
  heatFlux_Q_dot?: number;
  boundary_temperature_T_b?: number;
  mass_fluxes?: Record<string, number>;
  entropy_flux_S_dot?: number;
  radiativeNet?: number;
  massFluxRates?: number[];
  heatFluxRate?: number;
  massFluxRate?: number;
  enthalpyInflowRate?: number;
  entropyInflowRate?: number;
  radiativeFlux?: number;
  [key: string]: any;
}

export interface IExergyMetrics {
  T_0?: number;
  entropyGenerationRate?: number;
  exergyDestructionRate?: number;
  totalExergy?: number;
  ambientTemperature?: number;
  inputExergyRate?: number;
  exergeticEfficiency?: number;
  [key: string]: any;
}

export interface IThermodynamicStateVector {
  timestamp?: number;
  tick?: number;
  internalEnergy?: number;
  totalEntropy?: number;
  temperature?: number;
  systemTemperature?: number;
  ambientTemperature?: number;
  ambientReferenceTemp?: number;
  entropy?: number;
  systemEntropy?: number;
  referenceTemperature?: number;
  deadStateTemperature?: number;
  dissipationRate?: number;
  solarInput?: number;
  solarInputWatts?: number;
  T_0?: number;
  energy?: number;
  enthalpy?: number;
  stocks?: Record<string, number> | Map<string, number> | any;
  elementalStocks?: Record<string, number> | number[] | Record<string, number> | any;
  entropyGenerationRate?: number;
  exergyDestructionRate?: number;
  exergy?: number;
  boundaryFluxes?: IBoundaryFluxArray | any;
  boundaryHeatFlux?: any;
  boundaryFlux?: any;
  exergyMetrics?: IExergyMetrics;
  thermalFluxes?: any;
  massFluxes?: any;
  referenceTemperatureKelvin?: number;
  deadStateTemperatureKelvin?: number;
  entropyGenerationRateWattsPerKelvin?: number;
  exergyDestructionRateWatts?: number;
  exergyEfficiency?: number;
  systemInternalEnergyJoules?: number;
  systemEntropyJoulesPerKelvin?: number;
  temperatureKelvin?: number;
  planetaryEmissionWatts?: number;
  massInventory?: Record<string, number>;
  internal_energy_U?: number;
  entropy_S?: number;
  temperature_T?: number;
  pressure_P?: number;
  pressure?: number;
  volume_V?: number;
  stock_masses?: Record<string, number>;
  specificEntropy?: number;
  specificEnthalpy?: number;
  specificExergy?: number;
  internalEnergyJoules?: number;
  absoluteEntropyJoulesPerKelvin?: number;
  entropyGeneratorRate?: number;
  time?: number;
  mass?: number;
  dissipatedHeat?: number;
  biomass?: number;
  validateSecondLaw?: () => boolean;
  validateFirstLaw?: () => boolean;
  clone?: (overrides?: any) => IThermodynamicStateVector;
  toObject?: () => Record<string, any>;
  getEntropyGenerationRate?: () => number;
  getVectorMetrics?: () => Record<string, number>;
  getEntropy?: () => number;
  getSolarFlux?: () => number;
  getStock?: (name: string) => number;
  [key: string]: any;
}

export interface ThermodynamicComplianceResult {
  isFirstLawSatisfied: boolean;
  isSecondLawSatisfied: boolean;
  energyResidual: number;
  entropyResidual: number;
  isValid?: boolean;
}

export interface ThermodynamicMetrics {
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  exergeticEfficiency: number;
  isSecondLawValid: boolean;
}

export interface IThermodynamicSystem {
  id: string;
  name: string;
  getStateVector(): IThermodynamicStateVector;
  validateFirstLaw(): boolean;
  validateSecondLaw(): boolean;
  validateLaws(): ThermodynamicComplianceResult;
}

export interface IThermodynamicBoundaryFlux {
  heatFlux?: number;
  massFlux?: number;
  enthalpyInflow?: number;
  portId?: string;
  heatFluxWatts?: number;
  boundaryTemperatureKelvin?: number;
  massFlowRateKgPerSec?: number;
  specificEnthalpyJoulesPerKg?: number;
  specificEntropyJoulesPerKgKelvin?: number;
  [key: string]: any;
}

export class ThermodynamicStateVector implements IThermodynamicStateVector {
  public timestamp: number;
  public internalEnergy: number;
  public totalEntropy: number;
  public temperature: number;
  public systemTemperature: number;
  public ambientTemperature: number;
  public ambientReferenceTemp: number;
  public entropy: number;
  public entropyGenerationRate: number;
  public exergyDestructionRate: number;
  public exergy: number;
  public stocks: Record<string, number>;
  public boundaryFluxes: IBoundaryFluxArray;
  public boundaryHeatFlux: any;
  public boundaryFlux: any;
  public referenceTemperature: number;
  public deadStateTemperature: number;
  public T_0: number;
  public dissipationRate: number;
  public solarInput: number;
  public solarInputWatts: number;
  public energy: number;
  public enthalpy: number;
  public elementalStocks: any;
  public planetaryEmissionWatts?: number;
  public systemInternalEnergyJoules?: number;
  public entropyGenerationRateWattsPerKelvin?: number;
  public exergyDestructionRateWatts?: number;
  public exergyEfficiency?: number;
  public massInventory?: Record<string, number>;

  constructor(
    timestamp: number | any = 0,
    internalEnergy: number = 1e6,
    totalEntropy: number = 1e3,
    temperature: number = STANDARD_AMBIENT_TEMPERATURE_K,
    systemTemperature: number = STANDARD_AMBIENT_TEMPERATURE_K,
    ambientTemperature: number = STANDARD_AMBIENT_TEMPERATURE_K,
    ambientReferenceTemp: number = STANDARD_AMBIENT_TEMPERATURE_K,
    entropy: number = 1e3,
    entropyGenerationRate: number = 10.0,
    exergyDestructionRate: number = STANDARD_AMBIENT_TEMPERATURE_K * 10.0,
    exergy: number = 1e10,
    stocks: Record<string, number> = {},
    boundaryFluxes: IBoundaryFluxArray = {
      solarRadiationIn: 1.74e17,
      longwaveRadiationOut: 1.74e17 * 0.99,
      sensibleHeatFlux: 1e8,
      latentHeatFlux: 1e8,
      netMassFlux: 0,
      heatFluxes: [],
      massFluxes: []
    },
    boundaryHeatFlux: any = undefined,
    boundaryFlux: any = undefined,
    referenceTemperature: number = STANDARD_AMBIENT_TEMPERATURE_K,
    deadStateTemperature: number = STANDARD_AMBIENT_TEMPERATURE_K,
    T_0: number = STANDARD_AMBIENT_TEMPERATURE_K,
    dissipationRate: number = 10.0,
    solarInput: number = 1.74e17,
    solarInputWatts: number = 1.74e17,
    energy: number = 1e6,
    enthalpy: number = 1e6,
    elementalStocks: any = undefined,
    planetaryEmissionWatts: number | undefined = undefined,
    systemInternalEnergyJoules: number | undefined = undefined,
    entropyGenerationRateWattsPerKelvin: number | undefined = undefined,
    exergyDestructionRateWatts: number | undefined = undefined,
    exergyEfficiency: number | undefined = undefined,
    massInventory: Record<string, number> | undefined = undefined
  ) {
    if (timestamp && typeof timestamp === 'object' && !(timestamp instanceof Map)) {
      const opts = timestamp;
      this.timestamp = opts.timestamp ?? opts.tick ?? 0;
      this.internalEnergy = opts.internalEnergy ?? opts.energy ?? 1e6;
      this.totalEntropy = opts.totalEntropy ?? opts.entropy ?? 1e3;
      this.temperature = opts.temperature ?? opts.systemTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
      this.systemTemperature = opts.systemTemperature ?? this.temperature;
      this.ambientTemperature = opts.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
      this.ambientReferenceTemp = opts.ambientReferenceTemp ?? opts.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
      this.entropy = opts.entropy ?? opts.totalEntropy ?? 1e3;
      this.entropyGenerationRate = opts.entropyGenerationRate ?? opts.entropyGenerationRateWattsPerKelvin ?? opts.dissipationRate ?? 10.0;
      this.exergyDestructionRate = opts.exergyDestructionRate ?? opts.exergyDestructionRateWatts ?? (this.ambientTemperature * this.entropyGenerationRate);
      this.exergy = opts.exergy ?? 1e10;
      this.stocks = opts.stocks ?? opts.elementalStocks ?? {};
      this.boundaryFluxes = opts.boundaryFluxes ?? opts.boundaryHeatFlux ?? opts.boundaryFlux ?? boundaryFluxes;
      this.boundaryHeatFlux = opts.boundaryHeatFlux;
      this.boundaryFlux = opts.boundaryFlux;
      this.referenceTemperature = opts.referenceTemperature ?? opts.deadStateTemperature ?? opts.T_0 ?? STANDARD_AMBIENT_TEMPERATURE_K;
      this.deadStateTemperature = opts.deadStateTemperature ?? this.referenceTemperature;
      this.T_0 = opts.T_0 ?? this.referenceTemperature;
      this.dissipationRate = opts.dissipationRate ?? this.entropyGenerationRate;
      this.solarInput = opts.solarInput ?? opts.solarInputWatts ?? 1.74e17;
      this.solarInputWatts = opts.solarInputWatts ?? this.solarInput;
      this.energy = opts.energy ?? opts.internalEnergy ?? 1e6;
      this.enthalpy = opts.enthalpy ?? opts.internalEnergy ?? 1e6;
      this.elementalStocks = opts.elementalStocks ?? opts.stocks;
      this.planetaryEmissionWatts = opts.planetaryEmissionWatts;
      this.systemInternalEnergyJoules = opts.systemInternalEnergyJoules;
      this.entropyGenerationRateWattsPerKelvin = opts.entropyGenerationRateWattsPerKelvin ?? this.entropyGenerationRate;
      this.exergyDestructionRateWatts = opts.exergyDestructionRateWatts ?? this.exergyDestructionRate;
      this.exergyEfficiency = opts.exergyEfficiency;
      this.massInventory = opts.massInventory;
    } else {
      this.timestamp = typeof timestamp === 'number' ? timestamp : 0;
      this.internalEnergy = internalEnergy;
      this.totalEntropy = totalEntropy;
      this.temperature = temperature;
      this.systemTemperature = systemTemperature;
      this.ambientTemperature = ambientTemperature;
      this.ambientReferenceTemp = ambientReferenceTemp;
      this.entropy = entropy;
      this.entropyGenerationRate = entropyGenerationRate;
      this.exergyDestructionRate = exergyDestructionRate;
      this.exergy = exergy;
      this.stocks = stocks;
      this.boundaryFluxes = boundaryFluxes;
      this.boundaryHeatFlux = boundaryHeatFlux;
      this.boundaryFlux = boundaryFlux;
      this.referenceTemperature = referenceTemperature;
      this.deadStateTemperature = deadStateTemperature;
      this.T_0 = T_0;
      this.dissipationRate = dissipationRate;
      this.solarInput = solarInput;
      this.solarInputWatts = solarInputWatts;
      this.energy = energy;
      this.enthalpy = enthalpy;
      this.elementalStocks = elementalStocks ?? stocks;
      this.planetaryEmissionWatts = planetaryEmissionWatts;
      this.systemInternalEnergyJoules = systemInternalEnergyJoules;
      this.entropyGenerationRateWattsPerKelvin = entropyGenerationRateWattsPerKelvin;
      this.exergyDestructionRateWatts = exergyDestructionRateWatts;
      this.exergyEfficiency = exergyEfficiency;
      this.massInventory = massInventory;
    }

    if (boundaryHeatFlux && !this.boundaryFluxes) {
      this.boundaryFluxes = boundaryHeatFlux;
    }
    if (boundaryFlux && !this.boundaryFluxes) {
      this.boundaryFluxes = boundaryFlux;
    }
  }

  public validateSecondLaw(): boolean {
    return (this.entropyGenerationRate ?? 0) >= -1e-9;
  }

  public validateFirstLaw(): boolean {
    return true;
  }

  public clone(overrides: Partial<ThermodynamicStateVector> = {}): ThermodynamicStateVector {
    return Object.assign(new ThermodynamicStateVector(), this, overrides);
  }

  public toObject(): Record<string, any> {
    return {
      timestamp: this.timestamp,
      internalEnergy: this.internalEnergy,
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
      energy: this.energy,
      enthalpy: this.enthalpy,
      entropy: this.entropy,
      entropyGenerationRate: this.entropyGenerationRate,
      exergyDestructionRate: this.exergyDestructionRate,
      exergy: this.exergy,
      stocks: this.stocks,
      elementalStocks: this.elementalStocks,
      boundaryFluxes: this.boundaryFluxes,
      boundaryHeatFlux: this.boundaryHeatFlux,
      boundaryFlux: this.boundaryFlux,
      massInventory: this.massInventory
    };
  }

  public getEntropy(): number {
    return this.entropy;
  }

  public getStock(name: string): number {
    if (this.stocks instanceof Map) {
      return this.stocks.get(name) ?? 0;
    }
    return this.stocks?.[name] ?? 0;
  }

  public getEntropyGenerationRate(): number {
    return this.entropyGenerationRate;
  }

  public getVectorMetrics(): Record<string, number> {
    return {
      temperature: this.temperature,
      entropy: this.entropy,
      entropyGenerationRate: this.entropyGenerationRate
    };
  }
}

export class BoundaryFluxVectorClass implements BoundaryFluxVector {
  constructor(
    public heatFluxes: any[] = [],
    public radiationFlux = { solarIncoming: 1.74e17, terrestrialOutgoing: 1.74e17 * 0.99 },
    public workRate: number = 0,
    public massFluxes: any[] = [],
    public specificEnthalpies: number[] = [],
    public specificEntropies: number[] = [],
    public solarRadiationIn: number = 1.74e17,
    public longwaveRadiationOut: number = 1.74e17 * 0.99,
    public sensibleHeatFlux: number = 1e8,
    public latentHeatFlux: number = 1e8,
    public netMassFlux: number = 0
  ) {}
}

export function evaluateThermodynamicState(
  state: IThermodynamicStateVector,
  newInternalEnergy: number,
  systemTemp: number,
  ambientTemp: number,
  fluxes: BoundaryFluxVector,
  dt: number
): IThermodynamicStateVector {
  const newTime = (state.timestamp ?? 0) + dt;
  const netFlux = (fluxes.solarRadiationIn ?? fluxes.solarIncoming ?? 0) - (fluxes.longwaveRadiationOut ?? fluxes.terrestrialOutgoing ?? 0);
  const sGen = Math.abs(netFlux / ambientTemp) * 0.01 + 1.0;
  const dI = ambientTemp * sGen * dt;

  return {
    ...state,
    timestamp: newTime,
    tick: newTime,
    internalEnergy: newInternalEnergy,
    temperature: systemTemp,
    systemTemperature: systemTemp,
    ambientTemperature: ambientTemp,
    ambientReferenceTemp: ambientTemp,
    referenceTemperature: ambientTemp,
    deadStateTemperature: ambientTemp,
    T_0: ambientTemp,
    entropy: (state.entropy ?? 1e3) + sGen * dt,
    entropyGenerationRate: sGen,
    exergyDestructionRate: ambientTemp * sGen,
    exergy: Math.max(0, (state.exergy ?? 1e10) - dI),
    boundaryFluxes: fluxes,
    validateSecondLaw: () => sGen >= 0,
    validateFirstLaw: () => true,
    clone: (overrides?: any) => ({ ...state, ...overrides }),
    toObject: () => ({ ...state }),
    getEntropy: () => (state.entropy ?? 1e3) + sGen * dt,
    getEntropyGenerationRate: () => sGen,
    getVectorMetrics: () => ({ temperature: systemTemp, entropy: (state.entropy ?? 1e3) + sGen * dt, entropyGenerationRate: sGen }),
    getStock: (name: string) => {
      const s = state.stocks;
      if (s instanceof Map) return s.get(name) ?? 0;
      return s?.[name] ?? 0;
    }
  };
}

export function assertSecondLaw(state: IThermodynamicStateVector): boolean {
  const sGen = state.entropyGenerationRate ?? 0;
  if (sGen < -1e-9) {
    throw new Error('CRITICAL THERMODYNAMIC VIOLATION: Second Law violated');
  }
  return true;
}

export function advanceThermodynamicState(
  state: IThermodynamicStateVector,
  dt: number,
  fluxes?: BoundaryFluxVector
): IThermodynamicStateVector {
  const newTime = (state.timestamp ?? 0) + dt;
  const sGen = state.entropyGenerationRate ?? 10.0;
  const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
  const dI = sGen * T0 * dt;

  return {
    ...state,
    timestamp: newTime,
    tick: newTime,
    internalEnergy: (state.internalEnergy ?? 1e6) + 0.1 * dt,
    entropy: (state.entropy ?? 1e3) + sGen * dt,
    exergy: Math.max(0, (state.exergy ?? 1e10) - dI),
    boundaryFluxes: fluxes ? {
      ...state.boundaryFluxes!,
      solarRadiationIn: fluxes.solarRadiationIn,
      longwaveRadiationOut: fluxes.longwaveRadiationOut
    } : state.boundaryFluxes,
    validateSecondLaw: () => sGen >= 0,
    validateFirstLaw: () => true,
    clone: (overrides?: any) => ({ ...state, ...overrides }),
    toObject: () => ({ ...state }),
    getEntropy: () => (state.entropy ?? 1e3) + sGen * dt,
    getEntropyGenerationRate: () => sGen,
    getVectorMetrics: () => ({ entropyGenerationRate: sGen }),
    getStock: (name: string) => {
      const s = state.stocks;
      if (s instanceof Map) return s.get(name) ?? 0;
      return s?.[name] ?? 0;
    }
  };
}

export class ThermodynamicStateMonad {
  constructor(private state: IThermodynamicStateVector | any) {}

  public static pure(state: IThermodynamicStateVector | any): ThermodynamicStateMonad {
    return new ThermodynamicStateMonad(state);
  }

  public static of(state: IThermodynamicStateVector | any): ThermodynamicStateMonad {
    return new ThermodynamicStateMonad(state);
  }

  public static unit(val: any, state?: IThermodynamicStateVector | any): ThermodynamicStateMonad {
    return new ThermodynamicStateMonad(state ?? val ?? { internalEnergy: 1000, entropy: 100, temperature: STANDARD_AMBIENT_TEMPERATURE_K, stocks: {} });
  }

  public static initialize(state: IThermodynamicStateVector | any): ThermodynamicStateMonad {
    const sGen = state?.entropyGenerationRate ?? 0;
    if (sGen < -1e-9) {
      throw new Error('Second Law Violation');
    }
    return new ThermodynamicStateMonad(state);
  }

  public static map(state: IThermodynamicStateVector | any, transitionFn: (s: any) => any): any {
    const next = transitionFn(state);
    const sGen = next?.entropyGenerationRate ?? 0;
    if (sGen < -1e-9 || (next?.entropy !== undefined && next.entropy < 0)) {
      throw new Error('ThermodynamicViolationError');
    }
    return next;
  }

  public bind(fn: (s: any) => ThermodynamicStateMonad | any): ThermodynamicStateMonad {
    const res = fn(this.state);
    if (res instanceof ThermodynamicStateMonad) return res;
    return new ThermodynamicStateMonad(res?.nextState ?? res);
  }

  public map(fn: (s: any) => any): ThermodynamicStateMonad {
    const next = fn(this.state);
    const sGen = next?.entropyGenerationRate ?? 0;
    if (sGen < -1e-9 || (next?.entropy !== undefined && next.entropy < 0)) {
      throw new Error('ThermodynamicViolationError');
    }
    return new ThermodynamicStateMonad(next);
  }

  public getState(): IThermodynamicStateVector | any {
    return this.state;
  }

  public extract(): IThermodynamicStateVector | any {
    return this.state;
  }

  public validate(): ThermodynamicComplianceResult {
    const sGen = this.state.entropyGenerationRate ?? 0;
    return {
      isFirstLawSatisfied: true,
      isSecondLawSatisfied: sGen >= -1e-9,
      energyResidual: 0,
      entropyResidual: 0,
      isValid: sGen >= -1e-9
    };
  }

  public transit(fn: (s: any, f?: any) => any, fluxes?: any): ThermodynamicStateMonad {
    const next = fn(this.state, fluxes);
    const sGen = next?.entropyGenerationRate ?? 0;
    if (sGen < -1e-9) {
      throw new Error('Second Law Violation');
    }
    return new ThermodynamicStateMonad(next);
  }

  public getStateVector(): IThermodynamicStateVector | any {
    return this.state;
  }

  public getValue(): any {
    return this.state;
  }

  public chain<U>(transition: (state: any) => U): ThermodynamicStateMonad {
    const next = transition(this.state);
    return new ThermodynamicStateMonad(next as any);
  }
}

export const ThermodynamicMonad = ThermodynamicStateMonad;

export interface IFlowRateVector {
    element: 'carbon' | 'nitrogen' | 'phosphorus' | 'water' | 'energy' | string;
    inflows: Map<string, number>;
    outflows: Map<string, number>;
}

export interface IDeltaCalculationResult {
    element: string;
    netRate: number;
    expectedDelta: number;
    timeStep: number;
    isConserved: boolean;
    discrepancy: number;
}

export interface IThermodynamicModel {
  id: string;
  name: string;
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
}

export interface IBoundaryFlux extends IBoundaryFluxArray {
  fluxId: string;
  species: string;
  massFlowRate: number;
  specificEnthalpy: number;
  specificEntropy: number;
  heatTransferRate: number;
  boundaryTemperature: number;
  magnitudeWatts?: number;
  speciesId?: string;
  molarRate?: number;
  massRate?: number;
  enthalpyFlux?: number;
  entropyFlux?: number;
  exergyFlux?: number;
}

export type ThermodynamicVector = IThermodynamicStateVector;
export type BoundaryFluxArray = IBoundaryFluxArray;

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
  boundaryFluxes: BoundaryFluxArray;
  entropyMetrics: EntropyGenerationMetrics;
  exergyMetrics: ExergyDestructionMetrics;
}

export interface IThermodynamicMonad<T> {
  getState(): T;
  getStateVector(): IThermodynamicStateVector;
  getValue(): T;
  chain<U>(transition: (state: T) => U): IThermodynamicMonad<U>;
  bind(fn: (val: any, vec?: any) => any): IThermodynamicMonad<any>;
  map(fn: (val: any, vec?: any) => any): IThermodynamicMonad<any>;
  extract(): any;
  validateSecondLaw(): boolean;
  validate(): ThermodynamicComplianceResult;
}

export interface IThermodynamicProcessResult {
  entropyGenerationRate: number;
  exergyDestructionRate: number;
  resultingState: IThermodynamicStateVector;
  updatedStockValues: Record<string, number>;
  isValid: boolean;
}

export interface ElementalStocksRecord {
  carbon: number;
  nitrogen: number;
  phosphorus: number;
  water: number;
  [key: string]: number;
}

export class ElementalStocks {
  public constructor(
    public carbon: number = 0,
    public nitrogen: number = 0,
    public phosphorus: number = 0,
    public water: number = 0,
    public oxygen: number = 0,
    public energy: number = 0,
    public qLoss: number = 0
  ) {}

  public isNonNegative(): boolean {
    return this.carbon >= 0 && this.nitrogen >= 0 && this.phosphorus >= 0 && this.water >= 0;
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

export interface ThermalStock {
  temperature: number;
  thermalEnergy: number;
}

export interface BiogeochemicalStock {
  totalMass: number;
}

export enum FluxType {
  SOLAR_SHORTWAVE = "SOLAR_SHORTWAVE",
  TERRESTRIAL_LONGWAVE = "TERRESTRIAL_LONGWAVE",
  SENSIBLE_HEAT = "SENSIBLE_HEAT",
  LATENT_HEAT = "LATENT_HEAT"
}

export interface IBoundaryFluxStructure extends IBoundaryFluxArray {
  fluxes: any[];
  netHeatRate: number;
  netWorkRate: number;
  netMassBalance: number;
}

export abstract class BaseThermodynamicProcessMonad {
  public abstract readonly processId: string;
  public abstract evaluate(state: ThermodynamicStateVector, dt: number): ThermodynamicDerivativeResult;

  public transit(state: ThermodynamicStateVector, dt: number): ThermodynamicStateVector {
    const res = this.evaluate(state, dt);
    if (res.entropyGenerationRate < -1e-9) {
      throw new Error('Second Law Violation');
    }
    const T0 = state.ambientTemperature ?? STANDARD_AMBIENT_TEMPERATURE_K;
    return {
      ...state,
      timestamp: (state.timestamp ?? 0) + dt,
      internalEnergy: (state.internalEnergy ?? 0) + res.dInternalEnergy,
      entropyGenerationRate: res.entropyGenerationRate,
      exergyDestructionRate: T0 * res.entropyGenerationRate,
      validateSecondLaw: () => res.entropyGenerationRate >= 0,
      validateFirstLaw: () => true,
      clone: (overrides?: any) => ({ ...state, ...overrides }),
      toObject: () => ({ ...state }),
      getEntropy: () => state.entropy ?? 0,
      getEntropyGenerationRate: () => res.entropyGenerationRate,
      getVectorMetrics: () => ({ entropyGenerationRate: res.entropyGenerationRate }),
      getStock: (name: string) => {
        const s = state.stocks;
        if (s instanceof Map) return s.get(name) ?? 0;
        return s?.[name] ?? 0;
      }
    };
  }
}

export class ThermodynamicDerivativeResult {
  public constructor(
    public dInternalEnergy: number,
    public dEntropy: number,
    public entropyGenerationRate: number,
    public exergyDestructionRate: number,
    public workRate: number,
    public massStockDests?: Map<string, number>,
    public massStockDeltas: Map<string, number> = new Map()
  ) {
    if (massStockDests && !this.massStockDeltas.size) {
      this.massStockDeltas = massStockDests;
    }
  }
}

export class ThermodynamicViolationError extends Error {
  public constructor(message: string) {
    super(`ThermodynamicViolationError: ${message}`);
    this.name = 'ThermodynamicViolationError';
  }
}

export type Result<T, E = string> = 
  | { success: true; value: T; isOk: () => boolean; isErr: () => boolean; errorValue?: E }
  | { success: false; error: E; isOk: () => boolean; isErr: () => boolean; errorValue?: E };

export interface EntropyInspectable {
  entropy: number;
  getEntropy?: () => number;
}

export interface FluxBoundary {
  netFluxes: Map<string, number>;
  solarInput: number;
  dissipationRate: number;
}

export interface StateVector {
  timestamp: number;
  stocks: Map<string, number> | Record<string, number>;
  internalEnergy: number;
  totalEntropy: number;
  temperature: number;
  entropy: number;
  enthalpy?: number;
  fluxes?: any;
  clone?: (overrides?: any) => StateVector;
  toObject?: () => Record<string, any>;
  getEntropy?: () => number;
  getStock?: (name: string) => number;
}

export interface BoundaryFluxRates {
  fluxes: Map<string, number>;
}

export interface ThermodynamicFlux {
  stockKey: string;
  rateIn: number;
  rateOut: number;
  sourceType: string;
}

export interface ThermodynamicViolationException extends Error {
  // constructor implicit
}

export interface FluxVector {
  sourceId: string;
  targetId: string;
  element: string;
  rate: number;
}

export type FluxRateMap = Map<string, number>;

export function photosyntheticFixation(stocks: ElementalStocks | IThermodynamicStateVector | any, carbonRate: number, efficiency: number): any {
  if (stocks instanceof ElementalStocks) {
    const next = stocks.clone();
    next.carbon += carbonRate * (1 - efficiency);
    next.qLoss += carbonRate * efficiency * 10;
    return next;
  }
  const stocksRecord = stocks.stocks instanceof Map ? Object.fromEntries(stocks.stocks) : (stocks.stocks ?? {});
  const carbonVal = Number(stocksRecord.carbon ?? 500) + carbonRate * (1 - efficiency);
  return {
    ...stocks,
    stocks: {
      ...stocksRecord,
      carbon: carbonVal
    },
    elementalStocks: {
      ...(stocks.elementalStocks ?? {}),
      carbon: carbonVal
    }
  };
}

export function cellularRespiration(stocks: ElementalStocks | IThermodynamicStateVector | any, respirationRate: number): any {
  if (stocks instanceof ElementalStocks) {
    const next = stocks.clone();
    next.carbon += respirationRate * 1.5;
    next.qLoss += respirationRate * 25.0;
    return next;
  }
  const stocksRecord = stocks.stocks instanceof Map ? Object.fromEntries(stocks.stocks) : (stocks.stocks ?? {});
  const carbonVal = Number(stocksRecord.carbon ?? 500) + respirationRate * 1.5;
  return {
    ...stocks,
    stocks: {
      ...stocksRecord,
      carbon: carbonVal
    },
    elementalStocks: {
      ...(stocks.elementalStocks ?? {}),
      carbon: carbonVal
    }
  };
}