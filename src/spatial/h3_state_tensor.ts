// =============================================================================
// WEB OF LIFE - H3 SPATIAL THERMODYNAMIC STATE TENSOR (SPRINT 042)
// =============================================================================

import {
  STEFAN_BOLTZMANN_CONSTANT,
  T_SUN,
  T_FREEZE,
  C_V_DRY_AIR,
  C_LIQUID_WATER,
  C_ICE,
  C_VAPOR,
  C_SOIL,
  RHO_LITH,
  ACTIVE_BEDROCK_DEPTH_M,
  LATENT_HEAT_FUSION,
  WATER_CLOSURE_TOLERANCE
} from '../thermodynamics/constants.js';
import { SpatialMonad } from '../monads/spatial_monad.js';

/**
 * Canonical thermodynamic interface for an individual H3 hexagonal control volume.
 * Formulates an open, non-equilibrium thermodynamic atmospheric-lithospheric column.
 */
export interface H3CellThermodynamicState {
  /** Hexagonal cell index (H3 index encoded as 64-bit hex string) */
  readonly h3Index: string;

  /** Effective cell surface area in square meters (m^2) */
  readonly areaM2: number;

  /** Topographic surface elevation above mean sea level (m) */
  readonly elevationM: number;

  // --- Thermal & Energetic Scalar Properties ---
  /** Internal thermal energy in Joules (J) */
  readonly internalEnergyJ: number;

  /** Absolute surface/column temperature in Kelvin (K) */
  readonly temperatureK: number;

  /** Effective column heat capacity in Joules per Kelvin (J/K) */
  readonly heatCapacityJK: number;

  /** Top-of-atmosphere / surface optical albedo in [0.0, 1.0] */
  readonly albedo: number;

  /** Thermal surface emissivity in [0.0, 1.0] */
  readonly emissivity: number;

  // --- Radiative & Thermal Fluxes (W / m^2) ---
  /** Incoming solar shortwave irradiance (W/m^2) */
  readonly shortwaveInWm2: number;

  /** Outgoing reflected shortwave flux (W/m^2) */
  readonly shortwaveOutWm2: number;

  /** Outgoing longwave thermal radiation flux (W/m^2) */
  readonly longwaveOutWm2: number;

  /** Sensible turbulent heat flux (W/m^2, positive upward) */
  readonly sensibleHeatFluxWm2: number;

  /** Latent heat flux from phase transitions (W/m^2, positive upward) */
  readonly latentHeatFluxWm2: number;

  // --- Entropy State ---
  /** Total entropy of the cell column (J/K) */
  readonly entropyJPerK: number;

  /** Rate of internal entropy generation (W/K, must be >= 0) */
  readonly entropyProductionRateJKs: number;

  // --- Mass Stocks (kg) ---
  /** Atmospheric dry air column mass (kg) */
  readonly dryAirMassKg: number;

  /** Total water mass stock across all phases (kg) */
  readonly totalWaterMassKg: number;

  /** Partitioned liquid water mass (kg) */
  readonly liquidWaterMassKg: number;

  /** Partitioned ice/snow mass (kg) */
  readonly iceMassKg: number;

  /** Partitioned water vapor mass (kg) */
  readonly vaporMassKg: number;

  /** Total elemental carbon stock (biomass + soil organic + CO2) (kg) */
  readonly carbonMassKg: number;

  /** Total elemental nitrogen stock (reactive + N2) (kg) */
  readonly nitrogenMassKg: number;

  /** Total elemental phosphorus stock (kg) */
  readonly phosphorusMassKg: number;
}

/**
 * Immutable thermodynamic record implementation for H3 cells.
 * Guarantees physical invariants according to the First and Second Laws of Thermodynamics.
 */
export class H3CellThermodynamicRecord implements H3CellThermodynamicState {
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
    this.assertInvariants();
  }

  /**
   * Enforces physical invariants:
   * 1. Temperatures strictly > 0 K
   * 2. Non-negative mass stocks
   * 3. Mass closure: totalWater == liquid + ice + vapor within tolerance
   * 4. Albedo and Emissivity in [0, 1]
   * 5. Entropy production rate >= -1e-12 W/K
   */
  private assertInvariants(): void {
    if (this.temperatureK <= 0 || !Number.isFinite(this.temperatureK)) {
      throw new Error(`Thermodynamic invariant violated: temperature must be strictly > 0 K, got ${this.temperatureK}`);
    }

    if (
      this.dryAirMassKg < 0 ||
      this.liquidWaterMassKg < 0 ||
      this.iceMassKg < 0 ||
      this.vaporMassKg < 0 ||
      this.totalWaterMassKg < 0 ||
      this.carbonMassKg < 0 ||
      this.nitrogenMassKg < 0 ||
      this.phosphorusMassKg < 0
    ) {
      throw new Error('Thermodynamic invariant violated: elemental mass stocks must be non-negative.');
    }

    const waterSum = this.liquidWaterMassKg + this.iceMassKg + this.vaporMassKg;
    const waterTolerance = Math.max(WATER_CLOSURE_TOLERANCE * Math.max(this.totalWaterMassKg, waterSum), 1e-6);
    if (Math.abs(this.totalWaterMassKg - waterSum) > waterTolerance) {
      throw new Error(
        `Thermodynamic invariant violated: water mass closure failure. Total=${this.totalWaterMassKg}, Sum=${waterSum}, Delta=${Math.abs(this.totalWaterMassKg - waterSum)}`
      );
    }

    if (this.albedo < 0.0 || this.albedo > 1.0) {
      throw new Error(`Thermodynamic invariant violated: albedo must be in [0.0, 1.0], got ${this.albedo}`);
    }

    if (this.emissivity < 0.0 || this.emissivity > 1.0) {
      throw new Error(`Thermodynamic invariant violated: emissivity must be in [0.0, 1.0], got ${this.emissivity}`);
    }

    if (this.entropyProductionRateJKs < -1e-12) {
      throw new Error(`Second Law violated: entropy production rate must be >= 0 W/K, got ${this.entropyProductionRateJKs}`);
    }
  }

  /**
   * Pure copy-and-update mutator creating a new immutable record.
   */
  public withUpdates(patch: Partial<H3CellThermodynamicState>): H3CellThermodynamicRecord {
    const liquid = patch.liquidWaterMassKg ?? this.liquidWaterMassKg;
    const ice = patch.iceMassKg ?? this.iceMassKg;
    const vapor = patch.vaporMassKg ?? this.vaporMassKg;
    const totalWater = patch.totalWaterMassKg ?? (
      patch.liquidWaterMassKg !== undefined || patch.iceMassKg !== undefined || patch.vaporMassKg !== undefined
        ? liquid + ice + vapor
        : this.totalWaterMassKg
    );

    return new H3CellThermodynamicRecord(
      patch.h3Index ?? this.h3Index,
      patch.areaM2 ?? this.areaM2,
      patch.elevationM ?? this.elevationM,
      patch.internalEnergyJ ?? this.internalEnergyJ,
      patch.temperatureK ?? this.temperatureK,
      patch.heatCapacityJK ?? this.heatCapacityJK,
      patch.albedo ?? this.albedo,
      patch.emissivity ?? this.emissivity,
      patch.shortwaveInWm2 ?? this.shortwaveInWm2,
      patch.shortwaveOutWm2 ?? this.shortwaveOutWm2,
      patch.longwaveOutWm2 ?? this.longwaveOutWm2,
      patch.sensibleHeatFluxWm2 ?? this.sensibleHeatFluxWm2,
      patch.latentHeatFluxWm2 ?? this.latentHeatFluxWm2,
      patch.entropyJPerK ?? this.entropyJPerK,
      patch.entropyProductionRateJKs ?? this.entropyProductionRateJKs,
      patch.dryAirMassKg ?? this.dryAirMassKg,
      totalWater,
      liquid,
      ice,
      vapor,
      patch.carbonMassKg ?? this.carbonMassKg,
      patch.nitrogenMassKg ?? this.nitrogenMassKg,
      patch.phosphorusMassKg ?? this.phosphorusMassKg
    );
  }

  /** Computes instantaneous net radiative balance in W/m^2 */
  public get netRadiativeFluxWm2(): number {
    return this.shortwaveInWm2 - this.shortwaveOutWm2 - this.longwaveOutWm2;
  }

  /** Computes instantaneous net surface energy flux in W/m^2 */
  public get netEnergyFluxWm2(): number {
    return this.netRadiativeFluxWm2 - this.sensibleHeatFluxWm2 - this.latentHeatFluxWm2;
  }

  /** Computes total column mass in kg */
  public get totalMassKg(): number {
    return (
      this.dryAirMassKg +
      this.totalWaterMassKg +
      this.carbonMassKg +
      this.nitrogenMassKg +
      this.phosphorusMassKg
    );
  }
}

/**
 * Container encapsulating the discrete spatial collection of cell thermodynamic records.
 * Provides indexed lookups, spatial reductions, and global First and Second Law aggregations.
 */
export class H3StateTensorContainer {
  private readonly states: Map<string, H3CellThermodynamicRecord>;

  constructor(initialStates?: Iterable<H3CellThermodynamicRecord>) {
    this.states = new Map<string, H3CellThermodynamicRecord>();
    if (initialStates) {
      for (const state of initialStates) {
        this.states.set(state.h3Index, state);
      }
    }
  }

  public get(h3Index: string): H3CellThermodynamicRecord | undefined {
    return this.states.get(h3Index);
  }

  public set(state: H3CellThermodynamicRecord): void {
    this.states.set(state.h3Index, state);
  }

  public has(h3Index: string): boolean {
    return this.states.has(h3Index);
  }

  public get size(): number {
    return this.states.size;
  }

  public keys(): IterableIterator<string> {
    return this.states.keys();
  }

  public values(): IterableIterator<H3CellThermodynamicRecord> {
    return this.states.values();
  }

  /** Computes global conserved total mass across all registered cells */
  public computeTotalMassKg(): number {
    let sum = 0;
    for (const state of this.states.values()) {
      sum += state.totalMassKg;
    }
    return sum;
  }

  /** Computes global internal energy across all registered cells */
  public computeTotalInternalEnergyJ(): number {
    let sum = 0;
    for (const state of this.states.values()) {
      sum += state.internalEnergyJ;
    }
    return sum;
  }

  /** Computes global entropy sum */
  public computeTotalEntropyJPerK(): number {
    let sum = 0;
    for (const state of this.states.values()) {
      sum += state.entropyJPerK;
    }
    return sum;
  }
}

/** Type alias for monadic state transitions over H3 cells */
export type H3ThermodynamicMonad = SpatialMonad<H3CellThermodynamicRecord>;

/** Interface defining inter-cell advective and turbulent mass/energy boundaries */
export interface BoundaryFluxContext {
  /** Net energy influx from adjacent cells in Watts */
  readonly energyFluxInWatts: number;
  /** Net water mass influx from adjacent cells in kg/s */
  readonly waterFluxInKgPerS: number;
  /** Net dry air influx from adjacent cells in kg/s */
  readonly dryAirFluxInKgPerS: number;
  /** Net carbon stock influx in kg/s */
  readonly carbonFluxInKgPerS: number;
  /** Net nitrogen stock influx in kg/s */
  readonly nitrogenFluxInKgPerS: number;
  /** Net phosphorus stock influx in kg/s */
  readonly phosphorusFluxInKgPerS: number;
}

/** Thermodynamic process operator kernel contract */
export interface ThermodynamicProcessKernel {
  readonly kernelName: string;
  apply(
    state: H3CellThermodynamicRecord,
    dtSeconds: number,
    boundaryFluxes?: BoundaryFluxContext
  ): H3CellThermodynamicRecord;
}

/**
 * Calculates composite column heat capacity $C_{v, c}$ in J / K.
 */
export function computeCompositeHeatCapacity(
  dryAirKg: number,
  liquidWaterKg: number,
  iceKg: number,
  vaporKg: number,
  areaM2: number,
  activeDepthM: number = ACTIVE_BEDROCK_DEPTH_M,
  soilDensityKgM3: number = RHO_LITH
): number {
  const lithosphereMassKg = soilDensityKgM3 * areaM2 * activeDepthM;
  return (
    dryAirKg * C_V_DRY_AIR +
    liquidWaterKg * C_LIQUID_WATER +
    iceKg * C_ICE +
    vaporKg * C_VAPOR +
    lithosphereMassKg * C_SOIL
  );
}

/**
 * Calculates internal thermal energy reference $U_c$ in Joules.
 */
export function computeInternalEnergy(
  heatCapacityJK: number,
  temperatureK: number,
  liquidWaterKg: number,
  vaporKg: number
): number {
  return (
    heatCapacityJK * temperatureK +
    liquidWaterKg * LATENT_HEAT_FUSION +
    vaporKg * (LATENT_HEAT_FUSION + 2.501e6)
  );
}

/**
 * Calculates Stefan-Boltzmann longwave thermal emission in W / m^2.
 */
export function computeStefanBoltzmannLongwave(
  temperatureK: number,
  emissivity: number
): number {
  return emissivity * STEFAN_BOLTZMANN_CONSTANT * Math.pow(temperatureK, 4);
}

/**
 * Evaluates saturation vapor pressure via Tetens formula in Pascals.
 */
export function computeSaturationVaporPressure(tempK: number): number {
  const tC = tempK - T_FREEZE;
  return 610.78 * Math.exp((17.27 * tC) / (tempK - 35.85));
}

/**
 * Pure radiative exchange step evaluating shortwave absorption,
 * Stefan-Boltzmann longwave dissipation, and Second Law entropy generation.
 */
export function evaluateRadiativeStep(
  state: H3CellThermodynamicRecord,
  dtSeconds: number
): H3CellThermodynamicRecord {
  const swInW = state.shortwaveInWm2 * state.areaM2;
  const swOutW = state.albedo * swInW;
  const swAbsorbedW = swInW - swOutW;

  const lwOutWm2 = computeStefanBoltzmannLongwave(state.temperatureK, state.emissivity);
  const lwOutW = lwOutWm2 * state.areaM2;

  const netRadiativePowerW = swAbsorbedW - lwOutW;
  const deltaInternalEnergyJ = netRadiativePowerW * dtSeconds;
  const newInternalEnergyJ = state.internalEnergyJ + deltaInternalEnergyJ;

  const newTemperatureK = Math.max(0.1, newInternalEnergyJ / state.heatCapacityJK);

  const entropyProductionRateJKs = Math.max(
    0,
    swAbsorbedW * (1.0 / newTemperatureK - 1.0 / T_SUN)
  );

  const deltaEntropyJPerK =
    deltaInternalEnergyJ / newTemperatureK + entropyProductionRateJKs * dtSeconds;

  return state.withUpdates({
    internalEnergyJ: newInternalEnergyJ,
    temperatureK: newTemperatureK,
    shortwaveOutWm2: swOutW / state.areaM2,
    longwaveOutWm2: lwOutWm2,
    entropyJPerK: Math.max(0, state.entropyJPerK + deltaEntropyJPerK),
    entropyProductionRateJKs
  });
}

/**
 * Pure water phase transition step evaluating freezing, melting,
 * and latent heat transfer.
 */
export function evaluatePhaseTransitions(
  state: H3CellThermodynamicRecord,
  dtSeconds: number
): H3CellThermodynamicRecord {
  let liquid = state.liquidWaterMassKg;
  let ice = state.iceMassKg;
  const vapor = state.vaporMassKg;
  let sensibleEnergyDeltaJ = 0;
  let entropyGenRateJKs = 0;

  if (state.temperatureK < T_FREEZE && liquid > 0) {
    const maxFreezableKg = Math.min(
      liquid,
      (state.heatCapacityJK * (T_FREEZE - state.temperatureK)) / LATENT_HEAT_FUSION
    );
    liquid -= maxFreezableKg;
    ice += maxFreezableKg;
    sensibleEnergyDeltaJ += maxFreezableKg * LATENT_HEAT_FUSION;
    if (dtSeconds > 0) {
      entropyGenRateJKs +=
        (maxFreezableKg * LATENT_HEAT_FUSION / dtSeconds) *
        Math.abs(1.0 / state.temperatureK - 1.0 / T_FREEZE);
    }
  } else if (state.temperatureK > T_FREEZE && ice > 0) {
    const maxMeltableKg = Math.min(
      ice,
      (state.heatCapacityJK * (state.temperatureK - T_FREEZE)) / LATENT_HEAT_FUSION
    );
    ice -= maxMeltableKg;
    liquid += maxMeltableKg;
    sensibleEnergyDeltaJ -= maxMeltableKg * LATENT_HEAT_FUSION;
    if (dtSeconds > 0) {
      entropyGenRateJKs +=
        (maxMeltableKg * LATENT_HEAT_FUSION / dtSeconds) *
        Math.abs(1.0 / T_FREEZE - 1.0 / state.temperatureK);
    }
  }

  const newTotalWater = liquid + ice + vapor;
  const newInternalEnergyJ = state.internalEnergyJ + sensibleEnergyDeltaJ;
  const newTemperatureK = Math.max(0.1, newInternalEnergyJ / state.heatCapacityJK);

  return state.withUpdates({
    liquidWaterMassKg: liquid,
    iceMassKg: ice,
    vaporMassKg: vapor,
    totalWaterMassKg: newTotalWater,
    internalEnergyJ: newInternalEnergyJ,
    temperatureK: newTemperatureK,
    entropyProductionRateJKs: Math.max(
      0,
      state.entropyProductionRateJKs + Math.max(0, entropyGenRateJKs)
    )
  });
}

/**
 * Composite full-step thermodynamic integration function for an individual cell.
 */
export function stepThermodynamicCell(
  initialState: H3CellThermodynamicRecord,
  dtSeconds: number,
  boundary?: Partial<BoundaryFluxContext>
): H3CellThermodynamicRecord {
  const energyFluxInWatts = boundary?.energyFluxInWatts ?? 0;
  const waterFluxInKgPerS = boundary?.waterFluxInKgPerS ?? 0;
  const dryAirFluxInKgPerS = boundary?.dryAirFluxInKgPerS ?? 0;
  const carbonFluxInKgPerS = boundary?.carbonFluxInKgPerS ?? 0;
  const nitrogenFluxInKgPerS = boundary?.nitrogenFluxInKgPerS ?? 0;
  const phosphorusFluxInKgPerS = boundary?.phosphorusFluxInKgPerS ?? 0;

  const advectedEnergy = initialState.internalEnergyJ + energyFluxInWatts * dtSeconds;
  const advectedDryAir = Math.max(0, initialState.dryAirMassKg + dryAirFluxInKgPerS * dtSeconds);
  const advectedLiquid = Math.max(0, initialState.liquidWaterMassKg + waterFluxInKgPerS * dtSeconds);
  const advectedWater = advectedLiquid + initialState.iceMassKg + initialState.vaporMassKg;
  const advectedCarbon = Math.max(0, initialState.carbonMassKg + carbonFluxInKgPerS * dtSeconds);
  const advectedNitrogen = Math.max(0, initialState.nitrogenMassKg + nitrogenFluxInKgPerS * dtSeconds);
  const advectedPhosphorus = Math.max(0, initialState.phosphorusMassKg + phosphorusFluxInKgPerS * dtSeconds);

  const stateAfterAdvection = initialState.withUpdates({
    internalEnergyJ: advectedEnergy,
    temperatureK: Math.max(0.1, advectedEnergy / initialState.heatCapacityJK),
    dryAirMassKg: advectedDryAir,
    totalWaterMassKg: advectedWater,
    liquidWaterMassKg: advectedLiquid,
    carbonMassKg: advectedCarbon,
    nitrogenMassKg: advectedNitrogen,
    phosphorusMassKg: advectedPhosphorus
  });

  const stateAfterRadiation = evaluateRadiativeStep(stateAfterAdvection, dtSeconds);
  const finalState = evaluatePhaseTransitions(stateAfterRadiation, dtSeconds);

  return finalState;
}