// =============================================================================
// WEB OF LIFE - THERMODYNAMICS CONSTANTS & PARAMETERS
// =============================================================================

/**
 * Fundamental physical and thermodynamic constants governing continuous
 * and discrete biogeochemical flux balance across cellular boundaries.
 */
export const THERMODYNAMIC_CONSTANTS = {
  /** Specific heat capacity of water at 293.15 K (J / (kg * K)) */
  SPECIFIC_HEAT_WATER_CP: 4184.0,

  /** Standard water density at 20 deg C (kg / m^3) */
  WATER_DENSITY_RHO: 1000.0,

  /** Stefan-Boltzmann constant (W / (m^2 * K^4)) */
  STEFAN_BOLTZMANN: 5.670374419e-8,

  /** Standard acceleration due to gravity on Earth (m / s^2) */
  GRAVITY_EARTH: 9.80665,

  /** Solar constant / average planetary solar insolation at TOA (W / m^2) */
  SOLAR_IRRADIANCE_AM0: 1361.0,

  /** Solar constant at top of atmosphere (W / m^2) */
  SOLAR_CONSTANT_TOA: 1361.0,

  /** Universal gas constant (J / (mol * K)) */
  GAS_CONSTANT_R: 8.314462618,

  /** Zero Celsius in Kelvin scale offset */
  ZERO_CELSIUS_IN_KELVIN: 273.15,

  /** Planetary default albedo */
  DEFAULT_ALBEDO: 0.3,

  /** Planetary survival temperature bounds (K) */
  PLANETARY_TEMP_MIN_K: 200.0,
  PLANETARY_TEMP_MAX_K: 350.0,

  /** Absolute minimum physical temperature */
  MIN_TEMPERATURE_KELVIN: 2.7315,

  /** Default regolith mass per unit area (kg) */
  DEFAULT_REGOLITH_MASS_KG: 50000.0,

  /** Numerical zero tolerance threshold for planar and spherical geometric orientation */
  EPSILON_TOLERANCE: 1e-12,

  /** Default thermal conductivity for interface diffusion (W / (m * K)) */
  DEFAULT_THERMAL_CONDUCTIVITY: 0.598,

  /** Default hydraulic conductivity for boundary head flow (m / s) */
  DEFAULT_HYDRAULIC_CONDUCTIVITY: 1e-4,

  /** Default carbon molecular diffusivity (m^2 / s) */
  DEFAULT_CARBON_DIFFUSIVITY: 1.5e-9,

  /** Default oxygen molecular diffusivity in water (m^2 / s) */
  DEFAULT_OXYGEN_DIFFUSIVITY: 2.1e-9,

  /** Default mineral/nutrient diffusivity in water (m^2 / s) */
  DEFAULT_MINERAL_DIFFUSIVITY: 1.0e-9,

  /** Specific heat capacities of materials (J / (kg * K)) */
  SPECIFIC_HEAT: {
    REGOLITH: 840.0,
    WATER: 4184.0,
    SOIL_ORGANIC_CARBON: 1800.0,
    VEGETATION_BIOMASS: 1900.0,
    ATMOSPHERIC_CO2: 846.0,
    MINERAL_NITROGEN: 1200.0,
  },

  /** Specific enthalpies of materials (J / kg) */
  SPECIFIC_ENTHALPY: {
    WATER: -15.87e6,
    SOIL_ORGANIC_CARBON: -32.79e6,
    VEGETATION_BIOMASS: -17.50e6,
    ATMOSPHERIC_CO2: -8.94e6,
    MINERAL_NITROGEN: -2.85e6,
  },
} as const;

export const STEFAN_BOLTZMANN_CONSTANT = 5.670374419e-8;
export const SOLAR_CONSTANT_W_M2 = 1361.0;
export const EARTH_RADIUS_METERS = 6371000.0;
export const EARTH_AUTHALIC_RADIUS_METERS = 6371007.2;
export const DEFAULT_PLANETARY_RADIUS_METERS = 6371000.0;
export const EARTH_ANGULAR_VELOCITY_RAD_S = 7.292115e-5;
export const WGS84_EARTH_RADIUS_METERS = 6371008.8;

export const DRY_MOLE_FRACTION_N2 = 0.78084;
export const DRY_MOLE_FRACTION_O2 = 0.20946;
export const DRY_MOLE_FRACTION_CO2 = 0.00042;

export const STP_CONSTANTS = {
  T_STANDARD: 288.15,
  P_STANDARD: 101325.0,
  STANDARD_GRAVITY: 9.80665,
  BASELINE_RELATIVE_HUMIDITY: 0.6,
  H3_BASE_AREA_RES_0: 4.357419e12,
  MOLAR_MASS_WET_AIR: 0.0289644,
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
  S_SPECIFIC_LIQUID_WATER: 389.0,
} as const;

/**
 * Computes saturation vapor pressure using the August-Roche-Magnus approximation.
 */
export function computeAugustRocheMagnusSatVaporPressure(tempK: number): number {
  const tC = tempK - 273.15;
  return 610.78 * Math.exp((17.27 * tC) / (tC + 237.3));
}

/**
 * Temperature normalization and Arrhenius kinetics engine.
 */
export class TemperatureNormalizationEngine {
  public toKelvin(temp: number, scale: 'C' | 'K' = 'K'): number {
    const k = scale === 'C' ? temp + THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN : temp;
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