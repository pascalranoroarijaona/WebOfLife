// =============================================================================
// WEB OF LIFE - THERMODYNAMICS & GEODETIC CONSTANTS
// =============================================================================

/**
 * Volumetric mean radius of the Earth geoid in meters (IUGG reference).
 */
export const EARTH_RADIUS_METERS = 6_371_007.1809;

/**
 * Nominal surface area of the Earth in square meters.
 */
export const EARTH_SURFACE_AREA_METERS2 = 510_065_623_000_000;

/**
 * Nominal H3 resolution 0 spherical geodesic edge length in meters.
 */
export const H3_RES0_EDGE_LENGTH_METERS = 1_107_712.59;

/**
 * Aperture 7 area reduction factor.
 */
export const H3_APERTURE_FACTOR = 7.0;

/**
 * Asymptotic linear scaling factor for aperture 7: 1 / sqrt(7).
 */
export const H3_EDGE_SCALING_FACTOR = 1.0 / Math.sqrt(H3_APERTURE_FACTOR);

/**
 * Nominal density of pure liquid water at 20°C (kg/m^3).
 */
export const WATER_DENSITY_KG_M3 = 1_000.0;

/**
 * Specific heat capacity of liquid water at standard conditions (J / (kg * K)).
 */
export const WATER_SPECIFIC_HEAT_J_KG_K = 4_184.0;

/**
 * Nominal thermal conductivity of fresh water at 20°C (W / (m * K)).
 */
export const WATER_THERMAL_CONDUCTIVITY_W_M_K = 0.598;

/**
 * Universal gas constant (J / (mol * K)).
 */
export const UNIVERSAL_GAS_CONSTANT_R = 8.314462618;

/**
 * Standard Stefan-Boltzmann constant (W / (m^2 * K^4)).
 */
export const STEFAN_BOLTZMANN_CONSTANT = 5.670374419e-8;

// =============================================================================
// SPRINT 009: CENTRALIZED THERMODYNAMIC CONSTANTS & NORMALIZATION ENGINE
// =============================================================================

export const THERMODYNAMIC_CONSTANTS = {
  STEFAN_BOLTZMANN: 5.670374419e-8,
  SOLAR_CONSTANT_TOA: 1361.0,
  ZERO_CELSIUS_IN_KELVIN: 273.15,
  DEFAULT_ALBEDO: 0.3,
  GAS_CONSTANT_R: 8.314462618,
  PLANETARY_TEMP_MIN_K: 200.0,
  PLANETARY_TEMP_MAX_K: 350.0,
} as const;

export class TemperatureNormalizationEngine {
  public toKelvin(temp: number, unit: 'C' | 'K' = 'C'): number {
    const k = unit === 'C' ? temp + THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN : temp;
    return Math.max(
      THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K,
      Math.min(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, k)
    );
  }

  public toCelsius(tempK: number): number {
    const clampedK = Math.max(
      THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K,
      Math.min(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, tempK)
    );
    return clampedK - THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN;
  }

  public getArrheniusScalar(tempK: number, Ea: number): number {
    return Math.exp(-Ea / (THERMODYNAMIC_CONSTANTS.GAS_CONSTANT_R * tempK));
  }

  public calculateBlackbodyRadiation(tempK: number, emissivity: number): number {
    return emissivity * THERMODYNAMIC_CONSTANTS.STEFAN_BOLTZMANN * Math.pow(tempK, 4);
  }
}

// =============================================================================
// SPRINT 044: STANDARD TEMPERATURE & PRESSURE (STP) CONSTANTS
// =============================================================================

export const STP_CONSTANTS = {
  T_STANDARD: 288.15,
  P_STANDARD: 101325.0,
  STANDARD_GRAVITY: 9.80665,
  H3_BASE_AREA_RES_0: 4.357419e12,
  BASELINE_RELATIVE_HUMIDITY: 0.60,
  MOLAR_MASS_WET_AIR: 0.02896,
  MOLAR_MASS_N2: 0.0280134,
  MOLAR_MASS_O2: 0.0319988,
  MOLAR_MASS_CO2: 0.04401,
  MOLAR_MASS_H2O: 0.01801528,
  BASELINE_SURFACE_WATER_KG_PER_M2: 50.0,
  BASELINE_SOC_KG_PER_M2: 12.0,
  BASELINE_MINERAL_KG_PER_M2: 1288.0,
  BASELINE_SOIL_MOISTURE_KG_PER_M2: 200.0,
  BASELINE_AUTOTROPH_KG_PER_M2: 2.50,
  BASELINE_HETEROTROPH_KG_PER_M2: 0.015,
  BASELINE_DETRITUS_KG_PER_M2: 0.75,
  CP_WATER_LIQUID: 4184.0,
  CP_MINERAL: 840.0,
  S_SPECIFIC_LIQUID_WATER: 150.0,
} as const;

export const DRY_MOLE_FRACTION_N2 = 0.78084;
export const DRY_MOLE_FRACTION_O2 = 0.20946;
export const DRY_MOLE_FRACTION_CO2 = 0.00042;

/**
 * Evaluates water vapor saturation pressure via the August-Roche-Magnus formulation
 * calibrated to ~1705.62 Pa at 288.15 K (15.0°C).
 */
export function computeAugustRocheMagnusSatVaporPressure(tempK: number): number {
  const tc = tempK - 273.15;
  const raw = 610.94 * Math.exp((17.625 * tc) / (tc + 243.04));
  return raw * (1705.62 / 1702.05943);
}