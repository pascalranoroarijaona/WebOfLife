// =============================================================================
// WEB OF LIFE - PLANETARY THERMODYNAMIC CONSTANTS & PHYSICAL ENGINES
// Cumulative Retro-Compatibility: Sprints 001 - 053
// =============================================================================

/**
 * Solar constant at 1 Astronomical Unit (W/m^2)
 */
export const SOLAR_CONSTANT_W_M2 = 1361.0;

/**
 * Mean volumetric radius of the Earth in meters
 */
export const EARTH_RADIUS_METERS = 6371000.0;

/**
 * Authalic Earth radius in meters (equal-area sphere)
 */
export const EARTH_AUTHALIC_RADIUS_METERS = 6371007.1809;

/**
 * Default reference planetary radius in meters
 */
export const DEFAULT_PLANETARY_RADIUS_METERS = 6371000.0;

/**
 * Earth mean angular rotation velocity in radians per second
 */
export const EARTH_ANGULAR_VELOCITY_RAD_S = 7.292115e-5;

/**
 * Stefan-Boltzmann constant in W/(m^2 * K^4)
 */
export const STEFAN_BOLTZMANN_CONSTANT = 5.670374419e-8;

/**
 * Standard atmospheric surface pressure in Pascals (Pa)
 */
export const STANDARD_ATMOSPHERE_PA = 101325.0;

/**
 * Universal gas constant in J/(mol * K)
 */
export const GAS_CONSTANT_R = 8.314462618;

/**
 * Dry atmospheric molar gas fractions
 */
export const DRY_MOLE_FRACTION_N2 = 0.78084;
export const DRY_MOLE_FRACTION_O2 = 0.20946;
export const DRY_MOLE_FRACTION_CO2 = 0.00042;

/**
 * Centralized physical constants registry (Sprint 009 compatibility)
 */
export const THERMODYNAMIC_CONSTANTS = {
  STEFAN_BOLTZMANN: STEFAN_BOLTZMANN_CONSTANT,
  SOLAR_CONSTANT_TOA: SOLAR_CONSTANT_W_M2,
  ZERO_CELSIUS_IN_KELVIN: 273.15,
  DEFAULT_ALBEDO: 0.3,
  GAS_CONSTANT_R: GAS_CONSTANT_R,
  PLANETARY_TEMP_MIN_K: 200.0,
  PLANETARY_TEMP_MAX_K: 350.0,
} as const;

/**
 * Standard Temperature & Pressure Constants (Sprint 044 compatibility)
 */
export const STP_CONSTANTS = {
  T_STANDARD: 288.15,
  P_STANDARD: STANDARD_ATMOSPHERE_PA,
  STANDARD_GRAVITY: 9.80665,
  BASELINE_RELATIVE_HUMIDITY: 0.60,
  MOLAR_MASS_WET_AIR: 0.028964,
  MOLAR_MASS_N2: 0.028013,
  MOLAR_MASS_O2: 0.031998,
  MOLAR_MASS_CO2: 0.04401,
  MOLAR_MASS_H2O: 0.018015,
  H3_BASE_AREA_RES_0: 4.357419e12,
  BASELINE_SURFACE_WATER_KG_PER_M2: 50.0,
  BASELINE_SOC_KG_PER_M2: 12.0,
  BASELINE_MINERAL_KG_PER_M2: 1288.0,
  BASELINE_SOIL_MOISTURE_KG_PER_M2: 200.0,
  BASELINE_AUTOTROPH_KG_PER_M2: 2.50,
  BASELINE_HETEROTROPH_KG_PER_M2: 0.015,
  BASELINE_DETRITUS_KG_PER_M2: 0.75,
  CP_WATER_LIQUID: 4184.0,
  CP_MINERAL: 840.0,
  S_SPECIFIC_LIQUID_WATER: 69.95,
} as const;

/**
 * Computes August-Roche-Magnus water vapor saturation pressure (Pa) at temperature T (K).
 */
export function computeAugustRocheMagnusSatVaporPressure(tempKelvin: number): number {
  const tC = tempKelvin - 273.15;
  return 610.94 * Math.exp((17.625 * tC) / (tC + 243.04));
}

/**
 * Sprint 009: Temperature Normalization Engine
 */
export class TemperatureNormalizationEngine {
  public toKelvin(value: number, scale: 'C' | 'K'): number {
    let k = scale === 'C' ? value + THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN : value;
    return Math.max(
      THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K,
      Math.min(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, k)
    );
  }

  public toCelsius(kelvin: number): number {
    const clampedK = Math.max(
      THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K,
      Math.min(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, kelvin)
    );
    return clampedK - THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN;
  }

  public getArrheniusScalar(tempKelvin: number, activationEnergyJoules: number): number {
    return Math.exp(-activationEnergyJoules / (THERMODYNAMIC_CONSTANTS.GAS_CONSTANT_R * tempKelvin));
  }

  public calculateBlackbodyRadiation(tempKelvin: number, emissivity: number = 1.0): number {
    return emissivity * THERMODYNAMIC_CONSTANTS.STEFAN_BOLTZMANN * Math.pow(tempKelvin, 4);
  }
}