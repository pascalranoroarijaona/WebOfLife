// =============================================================================
// WEB OF LIFE - THERMODYNAMICS & GEODESIC PHYSICAL CONSTANTS
// Cumulative Retro-Compatibility: Sprints 001 - 057
// =============================================================================

/**
 * WGS84 Mean Earth Radius in meters according to IUGG recommendations.
 */
export const WGS84_EARTH_RADIUS_METERS = 6371008.8;
export const EARTH_RADIUS_METERS = 6371000.0;
export const EARTH_MEAN_RADIUS_METERS = 6371008.0;
export const EARTH_AUTHALIC_RADIUS_METERS = 6371007.1809;
export const DEFAULT_PLANETARY_RADIUS_METERS = 6371000.0;

/**
 * Planetary surface area in square meters based on mean spherical radius.
 */
export const EARTH_SURFACE_AREA_M2 = 4 * Math.PI * WGS84_EARTH_RADIUS_METERS ** 2;

/**
 * Universal numerical stability tolerance for CFL and geodesic evaluations.
 */
export const STABILITY_EPSILON = 1e-9;

/**
 * Angular precision threshold in radians for geodesic singularity checks.
 */
export const GEODESIC_EPSILON = 1e-11;

/**
 * Universal Gas Constant in J / (mol * K).
 */
export const UNIVERSAL_GAS_CONSTANT_R = 8.314462618;
export const GAS_CONSTANT_R = 8.314462618;

/**
 * Stefan-Boltzmann constant in W / (m^2 * K^4).
 */
export const STEFAN_BOLTZMANN_SIGMA = 5.670374419e-8;
export const STEFAN_BOLTZMANN_CONSTANT = 5.670374419e-8;

/**
 * Standard atmospheric pressure at sea level in Pascals.
 */
export const STANDARD_ATMOSPHERIC_PRESSURE_PA = 101325.0;

/**
 * Solar constant at Top-of-Atmosphere (1 AU) in W / m^2.
 */
export const SOLAR_CONSTANT_W_M2 = 1361.0;
export const SOLAR_CONSTANT_TOA = 1361.0;

/**
 * Earth angular velocity in rad / s.
 */
export const EARTH_ANGULAR_VELOCITY_RAD_S = 7.292115e-5;

/**
 * Specific heat capacities in J / (kg * K).
 */
export const SPECIFIC_HEAT_WATER_LIQUID = 4184.0;
export const SPECIFIC_HEAT_DRY_AIR_CP = 1005.0;

/**
 * Latent heat of vaporization of water at 273.15 K in J / kg.
 */
export const LATENT_HEAT_VAPORIZATION_WATER = 2.501e6;

/**
 * Molar masses in kg / mol.
 */
export const MOLAR_MASS_C = 0.012011;
export const MOLAR_MASS_CO2 = 0.04401;
export const DRY_MOLE_FRACTION_N2 = 0.78084;
export const DRY_MOLE_FRACTION_O2 = 0.20946;
export const DRY_MOLE_FRACTION_CO2 = 0.00042;

/**
 * Baseline STP parameters and area reference scaling.
 */
export const STP_CONSTANTS = Object.freeze({
  T_STANDARD: 288.15,
  P_STANDARD: 101325.0,
  STANDARD_GRAVITY: 9.80665,
  BASELINE_RELATIVE_HUMIDITY: 0.60,
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
  S_SPECIFIC_LIQUID_WATER: 3.89,
  H3_BASE_AREA_RES_0: 4.357419e12,
});

/**
 * August-Roche-Magnus approximation of saturation vapor pressure (Pa).
 */
export function computeAugustRocheMagnusSatVaporPressure(tempK: number): number {
  const tempC = tempK - 273.15;
  return 610.94 * Math.exp((17.625 * tempC) / (tempC + 243.04));
}

/**
 * Thermodynamic constants table for historical test specifications.
 */
export const THERMODYNAMIC_CONSTANTS = Object.freeze({
  STEFAN_BOLTZMANN: 5.670374419e-8,
  SOLAR_CONSTANT_TOA: 1361.0,
  ZERO_CELSIUS_IN_KELVIN: 273.15,
  DEFAULT_ALBEDO: 0.3,
  GAS_CONSTANT_R: 8.314462618,
  PLANETARY_TEMP_MIN_K: 200.0,
  PLANETARY_TEMP_MAX_K: 350.0,
  DEFAULT_REGOLITH_MASS_KG: 50000.0,
  MIN_TEMPERATURE_KELVIN: 2.7315,
  SPECIFIC_HEAT: {
    REGOLITH: 840.0,
    WATER: 4184.0,
    SOIL_ORGANIC_CARBON: 1800.0,
    VEGETATION_BIOMASS: 1900.0,
    ATMOSPHERIC_CO2: 846.0,
    MINERAL_NITROGEN: 1200.0,
  },
  SPECIFIC_ENTHALPY: {
    WATER: -15.87e6,
    SOIL_ORGANIC_CARBON: -32.79e6,
    VEGETATION_BIOMASS: -17.50e6,
    ATMOSPHERIC_CO2: -8.94e6,
    MINERAL_NITROGEN: -2.85e6,
  },
});

/**
 * Normalization engine for planetary thermodynamic scales and Arrhenius kinetics.
 */
export class TemperatureNormalizationEngine {
  public toKelvin(value: number, unit: 'C' | 'K' = 'K'): number {
    const rawK = unit === 'C' ? value + THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN : value;
    return Math.max(
      THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K,
      Math.min(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, rawK)
    );
  }

  public toCelsius(value: number, unit: 'C' | 'K' = 'C'): number {
    const rawK = unit === 'C' ? value + THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN : value;
    const clampedK = Math.max(
      THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K,
      Math.min(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, rawK)
    );
    return clampedK - THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN;
  }

  public getArrheniusScalar(tempK: number, Ea: number): number {
    return Math.exp(-Ea / (THERMODYNAMIC_CONSTANTS.GAS_CONSTANT_R * tempK));
  }

  public calculateBlackbodyRadiation(tempK: number, emissivity: number = 1.0): number {
    return emissivity * THERMODYNAMIC_CONSTANTS.STEFAN_BOLTZMANN * Math.pow(tempK, 4);
  }
}