// =============================================================================
// WEB OF LIFE - UNIVERSAL THERMODYNAMIC & PLANETARY CONSTANTS
// =============================================================================

/** Stefan-Boltzmann constant in W / (m^2 * K^4) */
export const STEFAN_BOLTZMANN_CONSTANT = 5.670374419e-8;

/** Effective blackbody solar emitter temperature in Kelvin (K) */
export const T_SUN = 5778.0;

/** Cosmic microwave background sink temperature in Kelvin (K) */
export const T_SPACE = 2.725;

/** Triple point / freezing temperature of water at standard pressure in Kelvin (K) */
export const T_FREEZE = 273.15;

/** Specific gas constant for dry air in J / (kg * K) */
export const R_DRY_AIR = 287.058;

/** Specific gas constant for water vapor in J / (kg * K) */
export const R_VAPOR = 461.520;

/** Isochoric specific heat capacity of dry air in J / (kg * K) */
export const C_V_DRY_AIR = 718.0;

/** Isobaric specific heat capacity of dry air in J / (kg * K) */
export const C_P_DRY_AIR = 1005.0;

/** Specific heat capacity of liquid water in J / (kg * K) */
export const C_LIQUID_WATER = 4184.0;

/** Specific heat capacity of ice/snow in J / (kg * K) */
export const C_ICE = 2108.0;

/** Isochoric specific heat capacity of water vapor in J / (kg * K) */
export const C_VAPOR = 1410.0;

/** Latent heat of vaporization for water at 273.15 K in J / kg */
export const LATENT_HEAT_VAPORIZATION = 2.501e6;

/** Latent heat of fusion for water at 273.15 K in J / kg */
export const LATENT_HEAT_FUSION = 3.337e5;

/** Latent heat of sublimation for water in J / kg */
export const LATENT_HEAT_SUBLIMATION = 2.834e6;

/** Specific heat capacity of soil/mineral matrix in J / (kg * K) */
export const C_SOIL = 840.0;

/** Mean density of bedrock/lithosphere matrix in kg / m^3 */
export const RHO_LITH = 2600.0;

/** Standard active thermal column bedrock depth in meters (m) */
export const ACTIVE_BEDROCK_DEPTH_M = 2.0;

/** Water mass closure fractional tolerance */
export const WATER_CLOSURE_TOLERANCE = 1e-7;

// =============================================================================
// HISTORICAL CONSTANTS & NORMALIZATION ENGINE (SPRINT 009 COMPATIBILITY)
// =============================================================================

export const THERMODYNAMIC_CONSTANTS = {
  STEFAN_BOLTZMANN: 5.670374419e-8,
  SOLAR_CONSTANT_TOA: 1361.0,
  ZERO_CELSIUS_IN_KELVIN: 273.15,
  DEFAULT_ALBEDO: 0.3,
  GAS_CONSTANT_R: 8.314462618,
  PLANETARY_TEMP_MIN_K: 200.0,
  PLANETARY_TEMP_MAX_K: 350.0
};

export class TemperatureNormalizationEngine {
  public toKelvin(temp: number, scale: 'C' | 'K' = 'K'): number {
    let k = scale === 'C' ? temp + THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN : temp;
    if (k < THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K) {
      k = THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K;
    } else if (k > THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K) {
      k = THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K;
    }
    return k;
  }

  public toCelsius(tempK: number): number {
    const clampedK = this.toKelvin(tempK, 'K');
    return clampedK - THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN;
  }

  public getArrheniusScalar(tempK: number, Ea: number): number {
    return Math.exp(-Ea / (THERMODYNAMIC_CONSTANTS.GAS_CONSTANT_R * tempK));
  }

  public calculateBlackbodyRadiation(tempK: number, emissivity: number): number {
    return emissivity * THERMODYNAMIC_CONSTANTS.STEFAN_BOLTZMANN * Math.pow(tempK, 4);
  }
}