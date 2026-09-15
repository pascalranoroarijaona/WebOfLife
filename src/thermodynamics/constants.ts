// =============================================================================
// WEB OF LIFE - THERMODYNAMIC & PHYSICAL CONSTANTS (RETRO-COMPATIBLE ENGINE)
// =============================================================================

/**
 * Universal Gas Constant (R) in J / (mol * K).
 */
export const UNIVERSAL_GAS_CONSTANT_R = 8.314462618;
export const GAS_CONSTANT_R = UNIVERSAL_GAS_CONSTANT_R;

/**
 * Standard atmospheric reference temperature in Kelvin.
 */
export const STANDARD_TEMPERATURE_K = 298.15;
export const ZERO_CELSIUS_IN_KELVIN = 273.15;

/**
 * Standard gravitational acceleration at sea level (m / s^2).
 */
export const STANDARD_GRAVITY_G = 9.80665;
export const STANDARD_GRAVITY = STANDARD_GRAVITY_G;

/**
 * Isobaric specific heat capacity of pure liquid water in J / (kg * K).
 */
export const SPECIFIC_HEAT_WATER_J_KG_K = 4184.0;

/**
 * Stefan-Boltzmann constant (sigma) in W / (m^2 * K^4).
 */
export const STEFAN_BOLTZMANN_CONSTANT = 5.670374419e-8;

/**
 * Standard molar volume of water (m^3 / mol).
 */
export const WATER_MOLAR_VOLUME_M3_MOL = 1.801528e-5;

/**
 * Top of atmosphere solar irradiance constant in W / m^2.
 */
export const SOLAR_CONSTANT_W_M2 = 1361.0;
export const SOLAR_CONSTANT_TOA = SOLAR_CONSTANT_W_M2;

/**
 * Earth radius constants in meters.
 */
export const EARTH_RADIUS_METERS = 6371007.2;
export const EARTH_AUTHALIC_RADIUS_METERS = 6371007.2;
export const DEFAULT_PLANETARY_RADIUS_METERS = 6371007.2;
export const EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const WGS84_EARTH_RADIUS_METERS = 6371008.8;
export const WGS84_EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const MEAN_EARTH_RADIUS_METERS = 6371008.8;

/**
 * Earth angular rotation rate in rad / s.
 */
export const EARTH_ANGULAR_VELOCITY_RAD_S = 7.292115e-5;

/**
 * Atmospheric dry gas composition mole fractions.
 */
export const DRY_MOLE_FRACTION_N2 = 0.78084;
export const DRY_MOLE_FRACTION_O2 = 0.20946;
export const DRY_MOLE_FRACTION_CO2 = 0.00042;
export const DRY_MOLE_FRACTION_AR = 0.00934;

/**
 * Thermodynamic and planetary temperature limit constants.
 */
export const THERMODYNAMIC_CONSTANTS = {
  STEFAN_BOLTZMANN: STEFAN_BOLTZMANN_CONSTANT,
  SOLAR_CONSTANT_TOA: SOLAR_CONSTANT_TOA,
  ZERO_CELSIUS_IN_KELVIN: ZERO_CELSIUS_IN_KELVIN,
  DEFAULT_ALBEDO: 0.3,
  GAS_CONSTANT_R: UNIVERSAL_GAS_CONSTANT_R,
  PLANETARY_TEMP_MIN_K: 200.0,
  PLANETARY_TEMP_MAX_K: 350.0,
  BASE_METABOLIC_TEMP_K: 298.15,
};

/**
 * Standard Temperature and Pressure (STP) Baseline Constants.
 */
export const STP_CONSTANTS = {
  T_STANDARD: 288.15,
  P_STANDARD: 101325.0,
  STANDARD_GRAVITY: STANDARD_GRAVITY_G,
  BASELINE_RELATIVE_HUMIDITY: 0.6,
  H3_BASE_AREA_RES_0: 4.357419e12,
  MOLAR_MASS_WET_AIR: 0.02896,
  MOLAR_MASS_N2: 0.0280134,
  MOLAR_MASS_O2: 0.0319988,
  MOLAR_MASS_CO2: 0.04401,
  MOLAR_MASS_H2O: 0.018015,
  BASELINE_SURFACE_WATER_KG_PER_M2: 50.0,
  BASELINE_SOC_KG_PER_M2: 12.0,
  BASELINE_MINERAL_KG_PER_M2: 1288.0,
  BASELINE_SOIL_MOISTURE_KG_PER_M2: 200.0,
  BASELINE_AUTOTROPH_KG_PER_M2: 2.50,
  BASELINE_HETEROTROPH_KG_PER_M2: 0.015,
  BASELINE_DETRITUS_KG_PER_M2: 0.75,
  CP_WATER_LIQUID: 4184.0,
  CP_MINERAL: 840.0,
  S_SPECIFIC_LIQUID_WATER: 69.91,
};

/**
 * Calculates saturation vapor pressure via August-Roche-Magnus approximation (Pa).
 */
export function computeAugustRocheMagnusSatVaporPressure(tempK: number): number {
  const tempC = tempK - ZERO_CELSIUS_IN_KELVIN;
  return 610.94 * Math.exp((17.625 * tempC) / (tempC + 243.04));
}

/**
 * Engine normalizing temperatures between scales with planetary boundary clamping.
 */
export class TemperatureNormalizationEngine {
  public toKelvin(value: number, scale: 'C' | 'K' = 'K'): number {
    const rawK = scale === 'C' ? value + ZERO_CELSIUS_IN_KELVIN : value;
    return Math.max(
      THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K,
      Math.min(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, rawK)
    );
  }

  public toCelsius(tempK: number): number {
    const clampedK = Math.max(
      THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K,
      Math.min(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, tempK)
    );
    return clampedK - ZERO_CELSIUS_IN_KELVIN;
  }

  public getArrheniusScalar(tempK: number, Ea: number): number {
    return Math.exp(-Ea / (UNIVERSAL_GAS_CONSTANT_R * tempK));
  }

  public calculateBlackbodyRadiation(tempK: number, emissivity: number = 1.0): number {
    return emissivity * STEFAN_BOLTZMANN_CONSTANT * Math.pow(tempK, 4);
  }
}