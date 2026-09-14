// =============================================================================
// WEB OF LIFE - PLANETARY THERMODYNAMICS CONSTANTS
// Unified Specifications: Sprints 001 - 055
// =============================================================================

export const TWO_PI: number = 2 * Math.PI;
export const HALF_PI: number = Math.PI / 2;

/** Stefan-Boltzmann constant (W / (m^2 * K^4)) */
export const STEFAN_BOLTZMANN_CONSTANT = 5.670374419e-8;

/** Boltzmann constant (J / K) */
export const BOLTZMANN_CONSTANT = 1.380649e-23;

/** Universal Gas Constant (J / (mol * K)) */
export const UNIVERSAL_GAS_CONSTANT = 8.314462618;

/** Planck constant (J * s) */
export const PLANCK_CONSTANT = 6.62607015e-34;

/** Average Earth Mean Radius (meters) */
export const EARTH_MEAN_RADIUS_METERS = 6.3710088e6;
export const EARTH_RADIUS_METERS = EARTH_MEAN_RADIUS_METERS;
export const EARTH_AUTHALIC_RADIUS_METERS = 6.3710072e6;
export const DEFAULT_PLANETARY_RADIUS_METERS = EARTH_MEAN_RADIUS_METERS;

/** Standard Atmospheric Pressure at Sea Level (Pa) */
export const STANDARD_SEA_LEVEL_PRESSURE_PA = 101325;

/** Standard Sea Level Air Density (kg / m^3) */
export const AIR_DENSITY_SEA_LEVEL = 1.225;

/** Pure Liquid Water Density at STP (kg / m^3) */
export const WATER_DENSITY_STP = 1000.0;

/** Isobaric Specific Heat Capacity of Dry Air (J / (kg * K)) */
export const SPECIFIC_HEAT_AIR_CP = 1005.0;

/** Specific Heat Capacity of Liquid Water (J / (kg * K)) */
export const SPECIFIC_HEAT_WATER_CP = 4184.0;

/** Solar Constant at Earth's Mean Orbital Radius (W / m^2) */
export const SOLAR_CONSTANT_WATTS_M2 = 1361.0;
export const SOLAR_CONSTANT_W_M2 = 1361.0;

/** Planetary Rotation Angular Frequency (rad / s) */
export const EARTH_ROTATION_ANGULAR_VELOCITY = 7.292115e-5;
export const EARTH_ANGULAR_VELOCITY_RAD_S = EARTH_ROTATION_ANGULAR_VELOCITY;

// =============================================================================
// DRY AIR MOLAR COMPOSITION (STP)
// =============================================================================
export const DRY_MOLE_FRACTION_N2 = 0.78084;
export const DRY_MOLE_FRACTION_O2 = 0.20946;
export const DRY_MOLE_FRACTION_CO2 = 0.00042;
export const DRY_MOLE_FRACTION_AR = 0.00934;

// =============================================================================
// STP BASELINE SYSTEM CONSTANTS (SPRINT 044)
// =============================================================================
export const STP_CONSTANTS = Object.freeze({
  T_STANDARD: 288.15,
  P_STANDARD: 101325.0,
  STANDARD_GRAVITY: 9.80665,
  MOLAR_MASS_WET_AIR: 0.0289647,
  MOLAR_MASS_N2: 0.0280134,
  MOLAR_MASS_O2: 0.0319988,
  MOLAR_MASS_CO2: 0.04401,
  MOLAR_MASS_H2O: 0.01801528,
  CP_WATER_LIQUID: 4184.0,
  CP_MINERAL: 840.0,
  S_SPECIFIC_LIQUID_WATER: 69.95,
  BASELINE_RELATIVE_HUMIDITY: 0.60,
  H3_BASE_AREA_RES_0: 4.357419e12,
  BASELINE_SURFACE_WATER_KG_PER_M2: 50.0,
  BASELINE_SOC_KG_PER_M2: 12.0,
  BASELINE_MINERAL_KG_PER_M2: 1288.0,
  BASELINE_SOIL_MOISTURE_KG_PER_M2: 200.0,
  BASELINE_AUTOTROPH_KG_PER_M2: 2.50,
  BASELINE_HETEROTROPH_KG_PER_M2: 0.015,
  BASELINE_DETRITUS_KG_PER_M2: 0.75,
});

/**
 * Computes saturation vapor pressure using the August-Roche-Magnus approximation.
 * @param tempK Temperature in Kelvin
 * @returns Saturation vapor pressure in Pascals (Pa)
 */
export function computeAugustRocheMagnusSatVaporPressure(tempK: number): number {
  const tempC = tempK - 273.15;
  return 610.94 * Math.exp((17.625 * tempC) / (tempC + 243.04));
}

// =============================================================================
// HISTORICAL CONSTANTS & TEMPERATURE NORMALIZATION ENGINE (SPRINT 009)
// =============================================================================
export const THERMODYNAMIC_CONSTANTS = Object.freeze({
  STEFAN_BOLTZMANN: STEFAN_BOLTZMANN_CONSTANT,
  SOLAR_CONSTANT_TOA: SOLAR_CONSTANT_WATTS_M2,
  ZERO_CELSIUS_IN_KELVIN: 273.15,
  DEFAULT_ALBEDO: 0.3,
  GAS_CONSTANT_R: UNIVERSAL_GAS_CONSTANT,
  PLANETARY_TEMP_MIN_K: 200.0,
  PLANETARY_TEMP_MAX_K: 350.0,
});

export class TemperatureNormalizationEngine {
  public toKelvin(value: number, scale: 'C' | 'K'): number {
    const rawK = scale === 'C' ? value + THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN : value;
    return Math.max(
      THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K,
      Math.min(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, rawK)
    );
  }

  public toCelsius(value: number): number {
    const kelvin = Math.max(
      THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K,
      Math.min(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, value + THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN)
    );
    return kelvin - THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN;
  }

  public getArrheniusScalar(tempK: number, activationEnergyJoulePerMol: number): number {
    return Math.exp(-activationEnergyJoulePerMol / (THERMODYNAMIC_CONSTANTS.GAS_CONSTANT_R * tempK));
  }

  public calculateBlackbodyRadiation(tempK: number, emissivity: number = 1.0): number {
    return emissivity * THERMODYNAMIC_CONSTANTS.STEFAN_BOLTZMANN * Math.pow(tempK, 4);
  }
}