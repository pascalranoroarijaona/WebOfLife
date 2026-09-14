// File: src/spatial/h3_state_tensor.ts
// =============================================================================
// WEB OF LIFE - DISCRETE H3 THERMODYNAMIC STATE TENSOR & INVARIANT VERIFICATION
// Sprints 042 & 043: Canonical Spatial Thermodynamics & State Verification
// =============================================================================

import {
  STEFAN_BOLTZMANN_CONSTANT,
  T_FREEZE,
  C_P_DRY_AIR,
  C_LIQUID_WATER,
  C_ICE,
  C_VAPOR,
  C_SOIL,
  RHO_LITH,
  ACTIVE_BEDROCK_DEPTH_M,
  LATENT_HEAT_FUSION,
  LATENT_HEAT_VAPORIZATION
} from '../thermodynamics/constants.js';

// =============================================================================
// SPRINT 042: H3CellThermodynamicRecord & FLUX/PHASE TRANSITION ENGINES
// =============================================================================

export interface H3CellThermodynamicRecordParams {
  h3Index: string;
  areaM2: number;
  elevationM: number;
  internalEnergyJ: number;
  temperatureK: number;
  heatCapacityJK: number;
  albedo: number;
  emissivity: number;
  shortwaveInWm2: number;
  shortwaveOutWm2: number;
  longwaveOutWm2: number;
  sensibleHeatFluxWm2: number;
  latentHeatFluxWm2: number;
  entropyJPerK: number;
  entropyProductionRateJKs: number;
  dryAirMassKg: number;
  totalWaterMassKg: number;
  liquidWaterMassKg: number;
  iceMassKg: number;
  vaporMassKg: number;
  carbonMassKg: number;
  nitrogenMassKg: number;
  phosphorusMassKg: number;
}

export class H3CellThermodynamicRecord {
  constructor(
    public readonly h3Index: string,
    public readonly areaM2: number,
    public readonly elevationM: number,
    public readonly internalEnergyJ: number,
    public readonly temperatureK: number,
    public readonly heatCapacityJK: number,
    public readonly albedo: number,
    public readonly emissivity: number,
    public readonly shortwaveInWm2: number,
    public readonly shortwaveOutWm2: number,
    public readonly longwaveOutWm2: number,
    public readonly sensibleHeatFluxWm2: number,
    public readonly latentHeatFluxWm2: number,
    public readonly entropyJPerK: number,
    public readonly entropyProductionRateJKs: number,
    public readonly dryAirMassKg: number,
    public readonly totalWaterMassKg: number,
    public readonly liquidWaterMassKg: number,
    public readonly iceMassKg: number,
    public readonly vaporMassKg: number,
    public readonly carbonMassKg: number,
    public readonly nitrogenMassKg: number,
    public readonly phosphorusMassKg: number
  ) {
    if (temperatureK <= 0.0) {
      throw new Error('temperature must be strictly > 0 K');
    }

    if (
      dryAirMassKg < 0 ||
      totalWaterMassKg < 0 ||
      liquidWaterMassKg < 0 ||
      iceMassKg < 0 ||
      vaporMassKg < 0 ||
      carbonMassKg < 0 ||
      nitrogenMassKg < 0 ||
      phosphorusMassKg < 0
    ) {
      throw new Error('mass stocks must be non-negative');
    }

    const waterSum = liquidWaterMassKg + iceMassKg + vaporMassKg;
    if (Math.abs(totalWaterMassKg - waterSum) > 1e-4) {
      throw new Error('water mass closure failure');
    }

    if (albedo < 0.0 || albedo > 1.0) {
      throw new Error('albedo must be in [0.0, 1.0]');
    }

    if (emissivity < 0.0 || emissivity > 1.0) {
      throw new Error('emissivity must be in [0.0, 1.0]');
    }
  }

  public get totalMassKg(): number {
    return (
      this.dryAirMassKg +
      this.totalWaterMassKg +
      this.carbonMassKg +
      this.nitrogenMassKg +
      this.phosphorusMassKg
    );
  }

  public get netRadiativeFluxWm2(): number {
    return this.shortwaveInWm2 - this.shortwaveOutWm2 - this.longwaveOutWm2;
  }

  public get netEnergyFluxWm2(): number {
    return this.netRadiativeFluxWm2 - this.sensibleHeatFluxWm2 - this.latentHeatFluxWm2;
  }

  public withUpdates(updates: Partial<H3CellThermodynamicRecordParams>): H3CellThermodynamicRecord {
    return new H3CellThermodynamicRecord(
      updates.h3Index ?? this.h3Index,
      updates.areaM2 ?? this.areaM2,
      updates.elevationM ?? this.elevationM,
      updates.internalEnergyJ ?? this.internalEnergyJ,
      updates.temperatureK ?? this.temperatureK,
      updates.heatCapacityJK ?? this.heatCapacityJK,
      updates.albedo ?? this.albedo,
      updates.emissivity ?? this.emissivity,
      updates.shortwaveInWm2 ?? this.shortwaveInWm2,
      updates.shortwaveOutWm2 ?? this.shortwaveOutWm2,
      updates.longwaveOutWm2 ?? this.longwaveOutWm2,
      updates.sensibleHeatFluxWm2 ?? this.sensibleHeatFluxWm2,
      updates.latentHeatFluxWm2 ?? this.latentHeatFluxWm2,
      updates.entropyJPerK ?? this.entropyJPerK,
      updates.entropyProductionRateJKs ?? this.entropyProductionRateJKs,
      updates.dryAirMassKg ?? this.dryAirMassKg,
      updates.totalWaterMassKg ?? this.totalWaterMassKg,
      updates.liquidWaterMassKg ?? this.liquidWaterMassKg,
      updates.iceMassKg ?? this.iceMassKg,
      updates.vaporMassKg ?? this.vaporMassKg,
      updates.carbonMassKg ?? this.carbonMassKg,
      updates.nitrogenMassKg ?? this.nitrogenMassKg,
      updates.phosphorusMassKg ?? this.phosphorusMassKg
    );
  }
}

export class H3StateTensorContainer {
  private readonly records: Map<string, H3CellThermodynamicRecord> = new Map();

  public get size(): number {
    return this.records.size;
  }

  public set(record: H3CellThermodynamicRecord): void {
    this.records.set(record.h3Index, record);
  }

  public get(h3Index: string): H3CellThermodynamicRecord | undefined {
    return this.records.get(h3Index);
  }

  public has(h3Index: string): boolean {
    return this.records.has(h3Index);
  }

  public computeTotalInternalEnergyJ(): number {
    let total = 0;
    for (const record of this.records.values()) {
      total += record.internalEnergyJ;
    }
    return total;
  }

  public computeTotalMassKg(): number {
    let total = 0;
    for (const record of this.records.values()) {
      total += record.totalMassKg;
    }
    return total;
  }

  public computeTotalEntropyJPerK(): number {
    let total = 0;
    for (const record of this.records.values()) {
      total += record.entropyJPerK;
    }
    return total;
  }
}

export function computeStefanBoltzmannLongwave(temperatureK: number, emissivity: number): number {
  return emissivity * STEFAN_BOLTZMANN_CONSTANT * Math.pow(temperatureK, 4);
}

export function computeCompositeHeatCapacity(
  dryAirMassKg: number,
  liquidWaterMassKg: number,
  iceMassKg: number,
  vaporMassKg: number,
  areaM2: number
): number {
  const rockMass = RHO_LITH * areaM2 * ACTIVE_BEDROCK_DEPTH_M;
  return (
    dryAirMassKg * C_P_DRY_AIR +
    liquidWaterMassKg * C_LIQUID_WATER +
    iceMassKg * C_ICE +
    vaporMassKg * C_VAPOR +
    rockMass * C_SOIL
  );
}

export function computeInternalEnergy(
  heatCapacityJK: number,
  temperatureK: number,
  liquidWaterMassKg: number = 0,
  vaporMassKg: number = 0
): number {
  return (
    heatCapacityJK * temperatureK +
    vaporMassKg * LATENT_HEAT_VAPORIZATION +
    liquidWaterMassKg * LATENT_HEAT_FUSION
  );
}

export function evaluateRadiativeStep(
  record: H3CellThermodynamicRecord,
  dt: number
): H3CellThermodynamicRecord {
  const lwOut = computeStefanBoltzmannLongwave(record.temperatureK, record.emissivity);
  const swOut = record.albedo * record.shortwaveInWm2;
  const netRad = record.shortwaveInWm2 - swOut - lwOut;
  const netFlux = netRad - record.sensibleHeatFluxWm2 - record.latentHeatFluxWm2;

  const deltaU = netFlux * record.areaM2 * dt;
  const newU = Math.max(1.0, record.internalEnergyJ + deltaU);
  const newT = Math.max(1.0, newU / record.heatCapacityJK);

  const entropyProductionRate = Math.max(0, (lwOut * record.areaM2) / newT);
  const newEntropy = Math.max(0, record.entropyJPerK + entropyProductionRate * dt);

  return record.withUpdates({
    internalEnergyJ: newU,
    temperatureK: newT,
    shortwaveOutWm2: swOut,
    longwaveOutWm2: lwOut,
    entropyJPerK: newEntropy,
    entropyProductionRateJKs: entropyProductionRate
  });
}

export function evaluatePhaseTransitions(
  record: H3CellThermodynamicRecord,
  dt: number
): H3CellThermodynamicRecord {
  const rate = Math.min(1.0, dt * 0.05);
  let liquid = record.liquidWaterMassKg;
  let ice = record.iceMassKg;

  if (record.temperatureK < T_FREEZE) {
    const deltaFreeze = Math.min(liquid, liquid * rate + 10.0);
    liquid -= deltaFreeze;
    ice += deltaFreeze;
  } else if (record.temperatureK > T_FREEZE && ice > 0) {
    const deltaMelt = Math.min(ice, ice * rate + 10.0);
    ice -= deltaMelt;
    liquid += deltaMelt;
  }

  return record.withUpdates({
    liquidWaterMassKg: liquid,
    iceMassKg: ice
  });
}

export interface InterCellBoundaryFlux {
  energyFluxInWatts?: number;
  waterFluxInKgPerS?: number;
  dryAirFluxInKgPerS?: number;
  carbonFluxInKgPerS?: number;
  nitrogenFluxInKgPerS?: number;
  phosphorusFluxInKgPerS?: number;
}

export function stepThermodynamicCell(
  record: H3CellThermodynamicRecord,
  dt: number,
  boundary?: InterCellBoundaryFlux
): H3CellThermodynamicRecord {
  const dryAirDelta = (boundary?.dryAirFluxInKgPerS ?? 0) * dt;
  const waterDelta = (boundary?.waterFluxInKgPerS ?? 0) * dt;
  const carbonDelta = (boundary?.carbonFluxInKgPerS ?? 0) * dt;
  const nitrogenDelta = (boundary?.nitrogenFluxInKgPerS ?? 0) * dt;
  const phosphorusDelta = (boundary?.phosphorusFluxInKgPerS ?? 0) * dt;
  const energyDelta = (boundary?.energyFluxInWatts ?? 0) * dt;

  const nextDryAir = Math.max(0, record.dryAirMassKg + dryAirDelta);
  const nextLiquid = Math.max(0, record.liquidWaterMassKg + waterDelta);
  const nextTotalWater = Math.max(0, record.totalWaterMassKg + waterDelta);
  const nextCarbon = Math.max(0, record.carbonMassKg + carbonDelta);
  const nextNitrogen = Math.max(0, record.nitrogenMassKg + nitrogenDelta);
  const nextPhosphorus = Math.max(0, record.phosphorusMassKg + phosphorusDelta);
  const nextEnergy = Math.max(1.0, record.internalEnergyJ + energyDelta);

  const bounded = record.withUpdates({
    dryAirMassKg: nextDryAir,
    liquidWaterMassKg: nextLiquid,
    totalWaterMassKg: nextTotalWater,
    carbonMassKg: nextCarbon,
    nitrogenMassKg: nextNitrogen,
    phosphorusMassKg: nextPhosphorus,
    internalEnergyJ: nextEnergy
  });

  const radiated = evaluateRadiativeStep(bounded, dt);
  return evaluatePhaseTransitions(radiated, dt);
}

// =============================================================================
// SPRINT 043: INVARIANT VERIFICATION & BIOGEOCHEMICAL TRANSITIONS
// =============================================================================

export enum ThermodynamicViolationType {
  NEGATIVE_STOCK = 'NEGATIVE_STOCK',
  NON_POSITIVE_TEMPERATURE = 'NON_POSITIVE_TEMPERATURE',
  NON_FINITE_VALUE = 'NON_FINITE_VALUE',
  CORRUPT_METADATA = 'CORRUPT_METADATA'
}

export interface ThermodynamicViolation {
  readonly type: ThermodynamicViolationType;
  readonly field: string;
  readonly value: number;
  readonly threshold: number;
  readonly message: string;
}

export interface ThermodynamicValidationResult {
  readonly isValid: boolean;
  readonly cellIndex: string;
  readonly violations: readonly ThermodynamicViolation[];
  readonly evaluatedAt: number;
}

export interface ThermodynamicValidationOptions {
  readonly tolerance?: number;
  readonly minTemperatureKelvin?: number;
  readonly failFast?: boolean;
}

export interface IH3CellThermodynamicState {
  cellIndex: string;
  temperatureKelvin: number;
  atmosphericCarbon: number;
  organicCarbon: number;
  biomassStocks: Record<string, number>;
  waterMassKg: number;
  enthalpyJoules: number;
}

export function validateH3CellThermodynamicState(
  state: IH3CellThermodynamicState,
  options?: ThermodynamicValidationOptions
): ThermodynamicValidationResult {
  const tolerance = options?.tolerance ?? 1e-9;
  const minT = options?.minTemperatureKelvin ?? 1e-3;
  const failFast = options?.failFast ?? false;
  const violations: ThermodynamicViolation[] = [];

  const record = (v: ThermodynamicViolation): boolean => {
    violations.push(v);
    return failFast;
  };

  const buildResult = (): ThermodynamicValidationResult => ({
    isValid: violations.length === 0,
    cellIndex: state && typeof state.cellIndex === 'string' && state.cellIndex.trim().length > 0
      ? state.cellIndex
      : 'UNKNOWN',
    violations: Object.freeze([...violations]),
    evaluatedAt: Date.now()
  });

  if (!state || typeof state !== 'object') {
    record({
      type: ThermodynamicViolationType.CORRUPT_METADATA,
      field: 'state',
      value: NaN,
      threshold: 0,
      message: 'Thermodynamic state is null or not an object.'
    });
    return buildResult();
  }

  if (!state.cellIndex || typeof state.cellIndex !== 'string' || state.cellIndex.trim().length === 0) {
    if (record({
      type: ThermodynamicViolationType.CORRUPT_METADATA,
      field: 'cellIndex',
      value: NaN,
      threshold: 0,
      message: `Cell index must be a non-empty string. Received: ${state.cellIndex}`
    })) return buildResult();
  }

  if (!Number.isFinite(state.temperatureKelvin)) {
    if (record({
      type: ThermodynamicViolationType.NON_FINITE_VALUE,
      field: 'temperatureKelvin',
      value: state.temperatureKelvin,
      threshold: minT,
      message: `Temperature is non-finite: ${state.temperatureKelvin}`
    })) return buildResult();
  } else if (state.temperatureKelvin < minT) {
    if (record({
      type: ThermodynamicViolationType.NON_POSITIVE_TEMPERATURE,
      field: 'temperatureKelvin',
      value: state.temperatureKelvin,
      threshold: minT,
      message: `Thermodynamic temperature ${state.temperatureKelvin} K is below threshold ${minT} K.`
    })) return buildResult();
  }

  const scalarStocks: Array<{ field: keyof IH3CellThermodynamicState; val: number }> = [
    { field: 'atmosphericCarbon', val: state.atmosphericCarbon },
    { field: 'organicCarbon', val: state.organicCarbon },
    { field: 'waterMassKg', val: state.waterMassKg },
    { field: 'enthalpyJoules', val: state.enthalpyJoules }
  ];

  for (const { field, val } of scalarStocks) {
    if (!Number.isFinite(val)) {
      if (record({
        type: ThermodynamicViolationType.NON_FINITE_VALUE,
        field,
        value: val,
        threshold: 0,
        message: `Field '${field}' is non-finite: ${val}`
      })) return buildResult();
    } else if (field !== 'enthalpyJoules' && val < -tolerance) {
      if (record({
        type: ThermodynamicViolationType.NEGATIVE_STOCK,
        field,
        value: val,
        threshold: -tolerance,
        message: `Stock '${field}' value ${val} is below negative tolerance ${-tolerance}.`
      })) return buildResult();
    }
  }

  if (!state.biomassStocks || typeof state.biomassStocks !== 'object') {
    record({
      type: ThermodynamicViolationType.CORRUPT_METADATA,
      field: 'biomassStocks',
      value: NaN,
      threshold: 0,
      message: 'biomassStocks map is missing or not an object.'
    });
  } else {
    for (const [tier, mass] of Object.entries(state.biomassStocks)) {
      if (!Number.isFinite(mass)) {
        if (record({
          type: ThermodynamicViolationType.NON_FINITE_VALUE,
          field: `biomassStocks.${tier}`,
          value: mass,
          threshold: 0,
          message: `Biomass tier '${tier}' has non-finite mass: ${mass}`
        })) return buildResult();
      } else if (mass < -tolerance) {
        if (record({
          type: ThermodynamicViolationType.NEGATIVE_STOCK,
          field: `biomassStocks.${tier}`,
          value: mass,
          threshold: -tolerance,
          message: `Biomass tier '${tier}' value ${mass} is below negative tolerance ${-tolerance}.`
        })) return buildResult();
      }
    }
  }

  return buildResult();
}

export function isH3CellThermodynamicallyValid(
  state: IH3CellThermodynamicState,
  tolerance: number = 1e-9,
  minTemperatureKelvin: number = 1e-3
): boolean {
  if (
    !state ||
    typeof state !== 'object' ||
    typeof state.cellIndex !== 'string' ||
    state.cellIndex.trim().length === 0 ||
    !Number.isFinite(state.temperatureKelvin) ||
    state.temperatureKelvin < minTemperatureKelvin ||
    !Number.isFinite(state.atmosphericCarbon) ||
    state.atmosphericCarbon < -tolerance ||
    !Number.isFinite(state.organicCarbon) ||
    state.organicCarbon < -tolerance ||
    !Number.isFinite(state.waterMassKg) ||
    state.waterMassKg < -tolerance ||
    !Number.isFinite(state.enthalpyJoules)
  ) {
    return false;
  }

  const stocks = state.biomassStocks;
  if (!stocks || typeof stocks !== 'object') {
    return false;
  }

  for (const key in stocks) {
    if (Object.prototype.hasOwnProperty.call(stocks, key)) {
      const v = stocks[key];
      if (!Number.isFinite(v) || v < -tolerance) {
        return false;
      }
    }
  }

  return true;
}

export class H3CellThermodynamicState implements IH3CellThermodynamicState {
  constructor(
    public cellIndex: string,
    public temperatureKelvin: number,
    public atmosphericCarbon: number,
    public organicCarbon: number,
    public biomassStocks: Record<string, number>,
    public waterMassKg: number,
    public enthalpyJoules: number
  ) {}

  public clone(): H3CellThermodynamicState {
    return new H3CellThermodynamicState(
      this.cellIndex,
      this.temperatureKelvin,
      this.atmosphericCarbon,
      this.organicCarbon,
      { ...this.biomassStocks },
      this.waterMassKg,
      this.enthalpyJoules
    );
  }

  public validate(options?: ThermodynamicValidationOptions): ThermodynamicValidationResult {
    return validateH3CellThermodynamicState(this, options);
  }

  public isValid(tolerance?: number): boolean {
    return isH3CellThermodynamicallyValid(this, tolerance);
  }

  public totalBiomass(): number {
    return Object.values(this.biomassStocks).reduce((acc, m) => acc + m, 0);
  }

  public totalCarbonMass(): number {
    return this.atmosphericCarbon + this.organicCarbon + this.totalBiomass();
  }
}

export interface PhotosynthesisParams {
  mu0: number;
  q10: number;
  kC: number;
  kW: number;
  insolation: number;
  alphaH2O: number;
  deltaHSynth: number;
}

export const DEFAULT_PHOTOSYNTHESIS_PARAMS: PhotosynthesisParams = {
  mu0: 0.15,
  q10: 2.0,
  kC: 100.0,
  kW: 50.0,
  insolation: 1.0,
  alphaH2O: 1.5,
  deltaHSynth: 15.6e6
};

export function computePhotosyntheticVelocity(
  state: IH3CellThermodynamicState,
  params: PhotosynthesisParams = DEFAULT_PHOTOSYNTHESIS_PARAMS
): number {
  if (state.temperatureKelvin < 273.15 || state.temperatureKelvin > 320.0) {
    return 0.0;
  }
  const autoBiomass = state.biomassStocks['autotroph'] ?? 0;
  if (autoBiomass <= 0) return 0.0;

  const muMax = params.mu0 * Math.pow(params.q10, (state.temperatureKelvin - 298.15) / 10.0);
  const carbonFactor = Math.max(0, state.atmosphericCarbon) / (Math.max(0, state.atmosphericCarbon) + params.kC);
  const waterFactor = Math.max(0, state.waterMassKg) / (Math.max(0, state.waterMassKg) + params.kW);

  return muMax * carbonFactor * waterFactor * params.insolation * autoBiomass;
}