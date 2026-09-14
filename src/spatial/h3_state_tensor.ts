/**
 * H3 DGGS Cell Thermodynamic State Tensor Implementation
 * Baseline STP Factory and Spatial Monad Implementation
 * Specification: RFC-042, RFC-043, RFC-044 & Method Specifications
 */

import {
  STP_CONSTANTS,
  STEFAN_BOLTZMANN_CONSTANT,
} from '../thermodynamics/constants.js';
import {
  IThermodynamicAtmosphereStock,
  IThermodynamicHydrosphereStock,
  IThermodynamicLithosphereStock,
  IThermodynamicBiosphereStock,
  IH3CellThermodynamicState,
  IH3CellStateOverrides,
  ISpatialMonad,
} from './h3_types.js';

export { IH3CellThermodynamicState } from './h3_types.js';

// =============================================================================
// SPRINT 043 ERROR CLASSIFICATION & VALIDATION INTERFACES
// =============================================================================

export enum ThermodynamicViolationType {
  NEGATIVE_STOCK = 'NEGATIVE_STOCK',
  NON_POSITIVE_TEMPERATURE = 'NON_POSITIVE_TEMPERATURE',
  NON_FINITE_VALUE = 'NON_FINITE_VALUE',
  CORRUPT_METADATA = 'CORRUPT_METADATA',
}

export interface ThermodynamicViolation {
  type: ThermodynamicViolationType;
  field: string;
  value?: number;
  threshold?: number;
  message?: string;
}

export interface ThermodynamicValidationResult {
  isValid: boolean;
  violations: ThermodynamicViolation[];
  cellIndex: string;
  evaluatedAt: number;
}

export interface PhotosynthesisParams {
  mu0: number;
  q10: number;
  kC: number;
  kW: number;
}

export const DEFAULT_PHOTOSYNTHESIS_PARAMS: PhotosynthesisParams = {
  mu0: 1.0e-5,
  q10: 2.0,
  kC: 100.0,
  kW: 1000.0,
};

// =============================================================================
// GEOMETRIC & H3 TOPOLOGY HELPERS
// =============================================================================

/**
 * Validates whether an input string is a structurally conformant H3 index hex string.
 */
export function isValidH3Index(h3Index: string): boolean {
  if (typeof h3Index !== 'string') {
    return false;
  }
  const clean = h3Index.trim();
  if (!/^[0-9a-fA-F]{15,16}$/.test(clean)) {
    return false;
  }
  try {
    const val = BigInt(`0x${clean}`);
    const res = Number((val >> 52n) & 0xfn);
    return res >= 0 && res <= 15;
  } catch {
    return false;
  }
}

/**
 * Extracts the resolution r in [0, 15] from an H3 index string.
 */
export function getH3Resolution(h3Index: string): number {
  if (!isValidH3Index(h3Index)) {
    throw new TypeError(`Invalid H3 cell index format: "${h3Index}"`);
  }
  const val = BigInt(`0x${h3Index.trim()}`);
  const resolution = Number((val >> 52n) & 0xfn);
  if (resolution < 0 || resolution > 15) {
    throw new RangeError(`Invalid H3 resolution out of bounds [0, 15]: ${resolution}`);
  }
  return resolution;
}

/**
 * Resolves standard geodesic surface area in square meters for an H3 cell.
 */
export function getH3CellAreaM2(h3Index: string): number {
  const resolution = getH3Resolution(h3Index);
  return STP_CONSTANTS.H3_BASE_AREA_RES_0 * Math.pow(7, -resolution);
}

// =============================================================================
// THERMODYNAMIC CALCULATION HELPERS
// =============================================================================

export function computeAtmosphericInternalEnergy(
  atmosphere: IThermodynamicAtmosphereStock,
  temperatureKelvin: number
): number {
  const mN2 = atmosphere.nitrogenMoles * STP_CONSTANTS.MOLAR_MASS_N2;
  const mO2 = atmosphere.oxygenMoles * STP_CONSTANTS.MOLAR_MASS_O2;
  const mCO2 = atmosphere.co2Moles * STP_CONSTANTS.MOLAR_MASS_CO2;
  const mH2O = atmosphere.waterVaporMoles * STP_CONSTANTS.MOLAR_MASS_H2O;
  const totalAtmMassKg = mN2 + mO2 + mCO2 + mH2O;

  const sensibleEnergy = totalAtmMassKg * STP_CONSTANTS.CV_AIR * temperatureKelvin;
  const latentHeatOfVap = 2501000.0 - 2370.0 * (temperatureKelvin - 273.15);
  const latentEnergy = mH2O * latentHeatOfVap;

  return sensibleEnergy + latentEnergy;
}

export function computeReferenceEntropy(
  atmosphere: IThermodynamicAtmosphereStock,
  hydrosphere: IThermodynamicHydrosphereStock,
  lithosphere: IThermodynamicLithosphereStock,
  biosphere: IThermodynamicBiosphereStock,
  temperatureKelvin: number
): number {
  const totalGasMoles =
    atmosphere.nitrogenMoles +
    atmosphere.oxygenMoles +
    atmosphere.co2Moles +
    atmosphere.waterVaporMoles;

  const pSurface = Math.max(1.0, atmosphere.surfacePressurePa);
  const pRef = STP_CONSTANTS.P_REFERENCE_BAR;
  const R = STP_CONSTANTS.UNIVERSAL_GAS_CONSTANT;
  const tempRatio = Math.max(1e-5, temperatureKelvin / 298.15);

  const calcGasEntropy = (
    moles: number,
    sStandard: number,
    cpm: number
  ): number => {
    if (moles <= 0 || totalGasMoles <= 0) return 0;
    const moleFraction = moles / totalGasMoles;
    const partialPressure = Math.max(1e-5, pSurface * moleFraction);
    return moles * (sStandard + cpm * Math.log(tempRatio) - R * Math.log(partialPressure / pRef));
  };

  const sN2 = calcGasEntropy(atmosphere.nitrogenMoles, STP_CONSTANTS.S_STANDARD_N2, STP_CONSTANTS.CPM_N2);
  const sO2 = calcGasEntropy(atmosphere.oxygenMoles, STP_CONSTANTS.S_STANDARD_O2, STP_CONSTANTS.CPM_O2);
  const sCO2 = calcGasEntropy(atmosphere.co2Moles, STP_CONSTANTS.S_STANDARD_CO2, STP_CONSTANTS.CPM_CO2);
  const sH2O = calcGasEntropy(atmosphere.waterVaporMoles, STP_CONSTANTS.S_STANDARD_H2O_GAS, STP_CONSTANTS.CPM_H2O_GAS);
  const sAtmosphere = sN2 + sO2 + sCO2 + sH2O;

  const sHydrosphere =
    hydrosphere.liquidWaterKg * STP_CONSTANTS.S_SPECIFIC_LIQUID_WATER +
    hydrosphere.iceKg * STP_CONSTANTS.S_SPECIFIC_ICE;

  const sLithosphere =
    lithosphere.inorganicMineralKg * STP_CONSTANTS.S_SPECIFIC_MINERAL +
    lithosphere.soilOrganicCarbonKg * STP_CONSTANTS.S_SPECIFIC_SOC +
    lithosphere.soilMoistureKg * STP_CONSTANTS.S_SPECIFIC_LIQUID_WATER;

  const totalBiomassKg =
    biosphere.autotrophBiomassKg +
    biosphere.heterotrophBiomassKg +
    biosphere.detritusKg;
  const sBiosphere = totalBiomassKg * STP_CONSTANTS.S_SPECIFIC_BIOMASS;

  return sAtmosphere + sHydrosphere + sLithosphere + sBiosphere;
}

// =============================================================================
// CONCRETE ENTITY: H3CellThermodynamicState (Dual Sprint 043 & 044 support)
// =============================================================================

export class H3CellThermodynamicState implements IH3CellThermodynamicState {
  readonly h3Index: string;
  readonly cellIndex: string;
  readonly resolution: number;
  readonly areaM2: number;
  readonly temperatureKelvin: number;
  readonly atmosphere: IThermodynamicAtmosphereStock;
  readonly hydrosphere: IThermodynamicHydrosphereStock;
  readonly lithosphere: IThermodynamicLithosphereStock;
  readonly biosphere: IThermodynamicBiosphereStock;
  readonly internalEnergyJoules: number;
  readonly entropyJoulesPerKelvin: number;

  // Sprint 043 properties
  atmosphericCarbon: number = 0;
  organicCarbon: number = 0;
  biomassStocks: Record<string, number> = {};
  waterMassKg: number = 0;
  enthalpyJoules: number = 0;

  constructor(
    arg0: string | IH3CellThermodynamicState,
    temperatureKelvin?: number,
    atmosphericCarbon?: number,
    organicCarbon?: number,
    biomassStocks?: Record<string, number>,
    waterMassKg?: number,
    enthalpyJoules?: number
  ) {
    if (typeof arg0 === 'string') {
      // Sprint 043 parameter signature
      this.cellIndex = arg0;
      this.h3Index = arg0;
      this.resolution = isValidH3Index(arg0) ? getH3Resolution(arg0) : 0;
      this.areaM2 = isValidH3Index(arg0) ? getH3CellAreaM2(arg0) : 1.0e6;
      this.temperatureKelvin = temperatureKelvin ?? 298.15;
      this.atmosphericCarbon = atmosphericCarbon ?? 0;
      this.organicCarbon = organicCarbon ?? 0;
      this.biomassStocks = biomassStocks ? { ...biomassStocks } : {};
      this.waterMassKg = waterMassKg ?? 0;
      this.enthalpyJoules = enthalpyJoules ?? 0;
      this.internalEnergyJoules = this.enthalpyJoules;
      this.entropyJoulesPerKelvin = 0;

      this.atmosphere = {
        nitrogenMoles: 0,
        oxygenMoles: 0,
        co2Moles: this.atmosphericCarbon,
        waterVaporMoles: 0,
        surfacePressurePa: STP_CONSTANTS.P_STANDARD,
      };
      this.hydrosphere = {
        liquidWaterKg: this.waterMassKg,
        iceKg: 0,
        salinityPsu: 0,
      };
      this.lithosphere = {
        soilOrganicCarbonKg: this.organicCarbon,
        inorganicMineralKg: 0,
        soilMoistureKg: 0,
      };
      this.biosphere = {
        autotrophBiomassKg: this.biomassStocks['autotroph'] ?? 0,
        heterotrophBiomassKg: (this.biomassStocks['herbivore'] ?? 0) + (this.biomassStocks['predator'] ?? 0),
        detritusKg: this.biomassStocks['decomposer'] ?? 0,
      };
    } else {
      // Sprint 044 state object signature
      const state = arg0;
      this.h3Index = state.h3Index ?? state.cellIndex ?? '';
      this.cellIndex = this.h3Index;
      this.resolution = state.resolution ?? (isValidH3Index(this.h3Index) ? getH3Resolution(this.h3Index) : 0);
      this.areaM2 = state.areaM2 ?? (isValidH3Index(this.h3Index) ? getH3CellAreaM2(this.h3Index) : 1.0e6);
      this.temperatureKelvin = state.temperatureKelvin;
      this.atmosphere = state.atmosphere ? Object.freeze({ ...state.atmosphere }) : ({} as any);
      this.hydrosphere = state.hydrosphere ? Object.freeze({ ...state.hydrosphere }) : ({} as any);
      this.lithosphere = state.lithosphere ? Object.freeze({ ...state.lithosphere }) : ({} as any);
      this.biosphere = state.biosphere ? Object.freeze({ ...state.biosphere }) : ({} as any);
      this.internalEnergyJoules = state.internalEnergyJoules ?? state.enthalpyJoules ?? 0;
      this.entropyJoulesPerKelvin = state.entropyJoulesPerKelvin ?? 0;

      this.atmosphericCarbon = state.atmosphericCarbon ?? (state.atmosphere?.co2Moles ?? 0);
      this.organicCarbon = state.organicCarbon ?? (state.lithosphere?.soilOrganicCarbonKg ?? 0);
      this.biomassStocks = state.biomassStocks ?? {
        autotroph: state.biosphere?.autotrophBiomassKg ?? 0,
        herbivore: state.biosphere?.heterotrophBiomassKg ?? 0,
        predator: 0,
        decomposer: state.biosphere?.detritusKg ?? 0,
      };
      this.waterMassKg = state.waterMassKg ?? (state.hydrosphere?.liquidWaterKg ?? 0);
      this.enthalpyJoules = state.enthalpyJoules ?? this.internalEnergyJoules;
      Object.freeze(this);
    }
  }

  public isValid(): boolean {
    return isH3CellThermodynamicallyValid(this);
  }

  public totalBiomass(): number {
    return Object.values(this.biomassStocks || {}).reduce(
      (sum, val) => sum + (typeof val === 'number' ? val : 0),
      0
    );
  }

  public totalCarbonMass(): number {
    return (this.atmosphericCarbon ?? 0) + (this.organicCarbon ?? 0) + this.totalBiomass();
  }

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
}

// =============================================================================
// SPRINT 043 VALIDATION & PHOTOSYNTHESIS FUNCTIONS
// =============================================================================

export function validateH3CellThermodynamicState(
  state: IH3CellThermodynamicState,
  options?: { failFast?: boolean; minTemperatureKelvin?: number; tolerance?: number }
): ThermodynamicValidationResult {
  const failFast = options?.failFast ?? false;
  const minTemp = options?.minTemperatureKelvin ?? 0.0;
  const tol = options?.tolerance ?? 1e-9;
  const violations: ThermodynamicViolation[] = [];

  const cellId = state.cellIndex ?? state.h3Index ?? '';

  // 1. Metadata Verification
  if (!cellId || typeof cellId !== 'string' || cellId.trim() === '') {
    violations.push({
      type: ThermodynamicViolationType.CORRUPT_METADATA,
      field: 'cellIndex',
      message: 'cellIndex must be a non-empty string.',
    });
    if (failFast) {
      return { isValid: false, violations, cellIndex: cellId, evaluatedAt: Date.now() };
    }
  }

  if (!state.biomassStocks || typeof state.biomassStocks !== 'object') {
    violations.push({
      type: ThermodynamicViolationType.CORRUPT_METADATA,
      field: 'biomassStocks',
      message: 'biomassStocks must be an object.',
    });
    if (failFast) {
      return { isValid: false, violations, cellIndex: cellId, evaluatedAt: Date.now() };
    }
  }

  // 2. Temperature Verification
  const T = state.temperatureKelvin;
  if (typeof T !== 'number' || !Number.isFinite(T)) {
    violations.push({
      type: ThermodynamicViolationType.NON_FINITE_VALUE,
      field: 'temperatureKelvin',
      value: T,
    });
    if (failFast) {
      return { isValid: false, violations, cellIndex: cellId, evaluatedAt: Date.now() };
    }
  } else if (minTemp > 0 ? T < minTemp : T <= 0) {
    violations.push({
      type: ThermodynamicViolationType.NON_POSITIVE_TEMPERATURE,
      field: 'temperatureKelvin',
      value: T,
      ...(minTemp > 0 ? { threshold: minTemp } : {}),
    });
    if (failFast) {
      return { isValid: false, violations, cellIndex: cellId, evaluatedAt: Date.now() };
    }
  }

  // 3. Finite & Stock Non-negativity Verification
  const checkField = (field: string, val: number | undefined, checkNegative: boolean = true) => {
    if (val === undefined) return;
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      violations.push({
        type: ThermodynamicViolationType.NON_FINITE_VALUE,
        field,
        value: val,
      });
      return;
    }
    if (checkNegative && val < -tol) {
      violations.push({
        type: ThermodynamicViolationType.NEGATIVE_STOCK,
        field,
        value: val,
      });
    }
  };

  checkField('atmosphericCarbon', state.atmosphericCarbon);
  if (failFast && violations.length > 0) {
    return { isValid: false, violations, cellIndex: cellId, evaluatedAt: Date.now() };
  }

  checkField('organicCarbon', state.organicCarbon);
  if (failFast && violations.length > 0) {
    return { isValid: false, violations, cellIndex: cellId, evaluatedAt: Date.now() };
  }

  checkField('waterMassKg', state.waterMassKg);
  if (failFast && violations.length > 0) {
    return { isValid: false, violations, cellIndex: cellId, evaluatedAt: Date.now() };
  }

  checkField('enthalpyJoules', state.enthalpyJoules, false);
  if (failFast && violations.length > 0) {
    return { isValid: false, violations, cellIndex: cellId, evaluatedAt: Date.now() };
  }

  // 4. Biomass Stocks Verification
  if (state.biomassStocks) {
    for (const [tier, val] of Object.entries(state.biomassStocks)) {
      const fieldPath = `biomassStocks.${tier}`;
      if (typeof val !== 'number' || !Number.isFinite(val)) {
        violations.push({
          type: ThermodynamicViolationType.NON_FINITE_VALUE,
          field: fieldPath,
          value: val,
        });
        if (failFast) break;
      } else if (val < -tol) {
        violations.push({
          type: ThermodynamicViolationType.NEGATIVE_STOCK,
          field: fieldPath,
          value: val,
        });
        if (failFast) break;
      }
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
    cellIndex: cellId,
    evaluatedAt: Date.now(),
  };
}

export function isH3CellThermodynamicallyValid(
  state: IH3CellThermodynamicState,
  options?: { failFast?: boolean; minTemperatureKelvin?: number; tolerance?: number }
): boolean {
  return validateH3CellThermodynamicState(state, options).isValid;
}

export function computePhotosyntheticVelocity(
  state: IH3CellThermodynamicState,
  params: PhotosynthesisParams = DEFAULT_PHOTOSYNTHESIS_PARAMS
): number {
  if (state.temperatureKelvin < 273.15) {
    return 0.0;
  }
  const c = state.atmosphericCarbon ?? 0.0;
  const w = state.waterMassKg ?? 0.0;
  const mu = params.mu0 * Math.pow(params.q10, (state.temperatureKelvin - 298.15) / 10.0);
  const cFactor = c + params.kC > 0 ? c / (c + params.kC) : 0;
  const wFactor = w + params.kW > 0 ? w / (w + params.kW) : 0;
  return mu * cFactor * wFactor;
}

// =============================================================================
// SPRINT 042 LEGACY RECORD & CONTAINER ENTITIES
// =============================================================================

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
    if (temperatureK <= 0) {
      throw new Error('temperature must be strictly > 0 K');
    }
    const masses = [
      dryAirMassKg,
      totalWaterMassKg,
      liquidWaterMassKg,
      iceMassKg,
      vaporMassKg,
      carbonMassKg,
      nitrogenMassKg,
      phosphorusMassKg,
    ];
    for (const m of masses) {
      if (m < 0) {
        throw new Error('mass stocks must be non-negative');
      }
    }
    if (Math.abs(totalWaterMassKg - (liquidWaterMassKg + iceMassKg + vaporMassKg)) > 1e-3) {
      throw new Error('water mass closure failure');
    }
    if (albedo < 0.0 || albedo > 1.0) {
      throw new Error('albedo must be in [0.0, 1.0]');
    }
    if (emissivity < 0.0 || emissivity > 1.0) {
      throw new Error('emissivity must be in [0.0, 1.0]');
    }
  }

  get totalMassKg(): number {
    return (
      this.dryAirMassKg +
      this.totalWaterMassKg +
      this.carbonMassKg +
      this.nitrogenMassKg +
      this.phosphorusMassKg
    );
  }

  get netRadiativeFluxWm2(): number {
    return this.shortwaveInWm2 - this.shortwaveOutWm2 - this.longwaveOutWm2;
  }

  get netEnergyFluxWm2(): number {
    return this.netRadiativeFluxWm2 - this.sensibleHeatFluxWm2 - this.latentHeatFluxWm2;
  }

  public withUpdates(updates: Partial<H3CellThermodynamicRecord>): H3CellThermodynamicRecord {
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
  private records: Map<string, H3CellThermodynamicRecord> = new Map();

  get size(): number {
    return this.records.size;
  }

  public set(record: H3CellThermodynamicRecord): void {
    this.records.set(record.h3Index, record);
  }

  public has(h3Index: string): boolean {
    return this.records.has(h3Index);
  }

  public get(h3Index: string): H3CellThermodynamicRecord | undefined {
    return this.records.get(h3Index);
  }

  public computeTotalInternalEnergyJ(): number {
    let total = 0;
    for (const r of this.records.values()) {
      total += r.internalEnergyJ;
    }
    return total;
  }

  public computeTotalMassKg(): number {
    let total = 0;
    for (const r of this.records.values()) {
      total += r.totalMassKg;
    }
    return total;
  }

  public computeTotalEntropyJPerK(): number {
    let total = 0;
    for (const r of this.records.values()) {
      total += r.entropyJPerK;
    }
    return total;
  }
}

export function computeStefanBoltzmannLongwave(tempK: number, emissivity: number): number {
  return emissivity * STEFAN_BOLTZMANN_CONSTANT * Math.pow(tempK, 4);
}

export function evaluateRadiativeStep(
  record: H3CellThermodynamicRecord,
  dt: number
): H3CellThermodynamicRecord {
  const lwOut = computeStefanBoltzmannLongwave(record.temperatureK, record.emissivity);
  const netRad = record.shortwaveInWm2 - record.shortwaveOutWm2 - lwOut;
  const dEnergy = netRad * record.areaM2 * dt;
  const nextEnergy = Math.max(1000.0, record.internalEnergyJ + dEnergy);
  const nextTemp = Math.max(1.0, nextEnergy / record.heatCapacityJK);
  return record.withUpdates({
    internalEnergyJ: nextEnergy,
    temperatureK: nextTemp,
    longwaveOutWm2: lwOut,
    entropyProductionRateJKs: 0.05,
  });
}

export function evaluatePhaseTransitions(
  record: H3CellThermodynamicRecord,
  dt: number
): H3CellThermodynamicRecord {
  let liquid = record.liquidWaterMassKg;
  let ice = record.iceMassKg;

  if (record.temperatureK < 273.15) {
    // Freezing
    const freezeAmount = Math.min(liquid, liquid * (0.05 + 0.001 * dt));
    liquid -= freezeAmount;
    ice += freezeAmount;
  } else {
    // Melting
    const meltAmount = Math.min(ice, ice * (0.05 + 0.001 * dt));
    liquid += meltAmount;
    ice -= meltAmount;
  }

  return record.withUpdates({
    liquidWaterMassKg: liquid,
    iceMassKg: ice,
    totalWaterMassKg: liquid + ice + record.vaporMassKg,
  });
}

export function stepThermodynamicCell(
  record: H3CellThermodynamicRecord,
  dt: number,
  boundary: {
    energyFluxInWatts?: number;
    waterFluxInKgPerS?: number;
    dryAirFluxInKgPerS?: number;
    carbonFluxInKgPerS?: number;
    nitrogenFluxInKgPerS?: number;
    phosphorusFluxInKgPerS?: number;
  }
): H3CellThermodynamicRecord {
  const dEnergy = (boundary.energyFluxInWatts ?? 0) * dt;
  const dWater = (boundary.waterFluxInKgPerS ?? 0) * dt;
  const dDryAir = (boundary.dryAirFluxInKgPerS ?? 0) * dt;
  const dCarbon = (boundary.carbonFluxInKgPerS ?? 0) * dt;
  const dNitrogen = (boundary.nitrogenFluxInKgPerS ?? 0) * dt;
  const dPhosphorus = (boundary.phosphorusFluxInKgPerS ?? 0) * dt;

  const nextLiquid = record.liquidWaterMassKg + dWater;
  const nextTotalWater = nextLiquid + record.iceMassKg + record.vaporMassKg;

  return record.withUpdates({
    internalEnergyJ: Math.max(100.0, record.internalEnergyJ + dEnergy),
    dryAirMassKg: record.dryAirMassKg + dDryAir,
    liquidWaterMassKg: nextLiquid,
    totalWaterMassKg: nextTotalWater,
    carbonMassKg: record.carbonMassKg + dCarbon,
    nitrogenMassKg: record.nitrogenMassKg + dNitrogen,
    phosphorusMassKg: record.phosphorusMassKg + dPhosphorus,
  });
}

export function computeCompositeHeatCapacity(
  dryAirMassKg: number,
  liquidWaterMassKg: number,
  iceMassKg: number,
  vaporMassKg: number,
  areaM2: number
): number {
  return (
    dryAirMassKg * 1005.0 +
    liquidWaterMassKg * 4184.0 +
    iceMassKg * 2090.0 +
    vaporMassKg * 1864.0 +
    areaM2 * 830.0
  );
}

export function computeInternalEnergy(
  heatCapacityJK: number,
  tempK: number,
  liquidWaterMassKg: number,
  vaporMassKg: number
): number {
  return heatCapacityJK * tempK + vaporMassKg * 2.501e6;
}

// =============================================================================
// SPRINT 044 FACTORY & SPATIAL MONAD IMPLEMENTATIONS
// =============================================================================

export function createDefaultH3CellThermodynamicState(
  h3Index: string,
  overrides?: IH3CellStateOverrides
): H3CellThermodynamicState {
  if (!isValidH3Index(h3Index)) {
    throw new TypeError(`createDefaultH3CellThermodynamicState: invalid H3 index "${h3Index}"`);
  }

  const resolution = getH3Resolution(h3Index);
  const areaM2 = getH3CellAreaM2(h3Index);

  const T0 = overrides?.temperatureKelvin ?? STP_CONSTANTS.T_STANDARD;
  if (T0 <= 0 || !Number.isFinite(T0)) {
    throw new RangeError(`Absolute temperature must be strictly positive Kelvin. Received: ${T0}`);
  }

  const P0 = overrides?.atmosphere?.surfacePressurePa ?? STP_CONSTANTS.P_STANDARD;
  if (P0 <= 0 || !Number.isFinite(P0)) {
    throw new RangeError(`Atmospheric surface pressure must be positive Pa. Received: ${P0}`);
  }

  const g0 = STP_CONSTANTS.STANDARD_GRAVITY;
  const massAtmTotal = areaM2 * (P0 / g0);
  const totalAtmosphericMoles = massAtmTotal / STP_CONSTANTS.MOLAR_MASS_WET_AIR;

  // Wet air molar partitioning
  const atmosphere: IThermodynamicAtmosphereStock = Object.freeze({
    nitrogenMoles: overrides?.atmosphere?.nitrogenMoles ?? totalAtmosphericMoles * STP_CONSTANTS.MOLE_FRACTION_N2,
    oxygenMoles: overrides?.atmosphere?.oxygenMoles ?? totalAtmosphericMoles * STP_CONSTANTS.MOLE_FRACTION_O2,
    co2Moles: overrides?.atmosphere?.co2Moles ?? totalAtmosphericMoles * STP_CONSTANTS.MOLE_FRACTION_CO2,
    waterVaporMoles: overrides?.atmosphere?.waterVaporMoles ?? totalAtmosphericMoles * STP_CONSTANTS.MOLE_FRACTION_H2O,
    surfacePressurePa: P0,
  });

  const hydrosphere: IThermodynamicHydrosphereStock = Object.freeze({
    liquidWaterKg: overrides?.hydrosphere?.liquidWaterKg ?? areaM2 * STP_CONSTANTS.BASELINE_SURFACE_WATER_KG_PER_M2,
    iceKg: overrides?.hydrosphere?.iceKg ?? 0.0,
    salinityPsu: overrides?.hydrosphere?.salinityPsu ?? 0.0,
  });

  const lithosphere: IThermodynamicLithosphereStock = Object.freeze({
    soilOrganicCarbonKg: overrides?.lithosphere?.soilOrganicCarbonKg ?? areaM2 * STP_CONSTANTS.BASELINE_SOC_KG_PER_M2,
    inorganicMineralKg: overrides?.lithosphere?.inorganicMineralKg ?? areaM2 * STP_CONSTANTS.BASELINE_MINERAL_KG_PER_M2,
    soilMoistureKg: overrides?.lithosphere?.soilMoistureKg ?? areaM2 * STP_CONSTANTS.BASELINE_SOIL_MOISTURE_KG_PER_M2,
  });

  const biosphere: IThermodynamicBiosphereStock = Object.freeze({
    autotrophBiomassKg: overrides?.biosphere?.autotrophBiomassKg ?? areaM2 * STP_CONSTANTS.BASELINE_AUTOTROPH_KG_PER_M2,
    heterotrophBiomassKg: overrides?.biosphere?.heterotrophBiomassKg ?? areaM2 * STP_CONSTANTS.BASELINE_HETEROTROPH_KG_PER_M2,
    detritusKg: overrides?.biosphere?.detritusKg ?? areaM2 * STP_CONSTANTS.BASELINE_DETRITUS_KG_PER_M2,
  });

  const assertNonNegative = (val: number, name: string) => {
    if (val < 0 || !Number.isFinite(val)) {
      throw new RangeError(`Thermodynamic mass stock "${name}" must be non-negative. Received: ${val}`);
    }
  };

  assertNonNegative(atmosphere.nitrogenMoles, 'atmosphere.nitrogenMoles');
  assertNonNegative(atmosphere.oxygenMoles, 'atmosphere.oxygenMoles');
  assertNonNegative(atmosphere.co2Moles, 'atmosphere.co2Moles');
  assertNonNegative(atmosphere.waterVaporMoles, 'atmosphere.waterVaporMoles');
  assertNonNegative(hydrosphere.liquidWaterKg, 'hydrosphere.liquidWaterKg');
  assertNonNegative(hydrosphere.iceKg, 'hydrosphere.iceKg');
  assertNonNegative(hydrosphere.salinityPsu, 'hydrosphere.salinityPsu');
  assertNonNegative(lithosphere.soilOrganicCarbonKg, 'lithosphere.soilOrganicCarbonKg');
  assertNonNegative(lithosphere.inorganicMineralKg, 'lithosphere.inorganicMineralKg');
  assertNonNegative(lithosphere.soilMoistureKg, 'lithosphere.soilMoistureKg');
  assertNonNegative(biosphere.autotrophBiomassKg, 'biosphere.autotrophBiomassKg');
  assertNonNegative(biosphere.heterotrophBiomassKg, 'biosphere.heterotrophBiomassKg');
  assertNonNegative(biosphere.detritusKg, 'biosphere.detritusKg');

  const uAtm = computeAtmosphericInternalEnergy(atmosphere, T0);
  const uHydro =
    hydrosphere.liquidWaterKg * STP_CONSTANTS.CP_WATER_LIQUID * T0 +
    hydrosphere.iceKg * STP_CONSTANTS.CP_WATER_ICE * T0;
  const uLitho =
    (
      lithosphere.inorganicMineralKg * STP_CONSTANTS.CP_MINERAL +
      lithosphere.soilOrganicCarbonKg * STP_CONSTANTS.CP_SOC +
      lithosphere.soilMoistureKg * STP_CONSTANTS.CP_WATER_LIQUID
    ) * T0;
  const uBio =
    (
      (biosphere.autotrophBiomassKg + biosphere.heterotrophBiomassKg) * STP_CONSTANTS.CP_BIOMASS +
      biosphere.detritusKg * STP_CONSTANTS.CP_DETRITUS
    ) * T0;

  const totalCalculatedInternalEnergy = uAtm + uHydro + uLitho + uBio;
  const totalCalculatedEntropy = computeReferenceEntropy(
    atmosphere,
    hydrosphere,
    lithosphere,
    biosphere,
    T0
  );

  const internalEnergyJoules = overrides?.internalEnergyJoules ?? totalCalculatedInternalEnergy;
  const entropyJoulesPerKelvin = overrides?.entropyJoulesPerKelvin ?? totalCalculatedEntropy;

  return new H3CellThermodynamicState({
    h3Index,
    resolution,
    areaM2,
    temperatureKelvin: T0,
    atmosphere,
    hydrosphere,
    lithosphere,
    biosphere,
    internalEnergyJoules,
    entropyJoulesPerKelvin,
  });
}

export class SpatialMonad<T> implements ISpatialMonad<T> {
  readonly value: T;

  private constructor(value: T) {
    this.value = value;
    Object.freeze(this);
  }

  static of<T>(value: T): SpatialMonad<T> {
    return new SpatialMonad<T>(value);
  }

  map<B>(fn: (state: T) => B): SpatialMonad<B> {
    return SpatialMonad.of(fn(this.value));
  }

  flatMap<B>(fn: (state: T) => ISpatialMonad<B>): ISpatialMonad<B> {
    return fn(this.value);
  }
}