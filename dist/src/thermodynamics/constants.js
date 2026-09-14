// =============================================================================
// WEB OF LIFE - PLANETARY THERMODYNAMIC CONSTANTS & PHYSICAL ENGINES
// =============================================================================
/**
 * Mean volumetric radius of Earth in meters (WGS 84 / IUGG standard).
 */
export const EARTH_RADIUS_METERS = 6371008.8;
export const WGS84_EARTH_RADIUS_METERS = 6371008.8;
export const MEAN_EARTH_RADIUS_METERS = 6371008.8;
export const EARTH_AUTHALIC_RADIUS_METERS = 6371007.2;
export const DEFAULT_PLANETARY_RADIUS_METERS = 6371008.8;
/**
 * Singularity tolerance threshold for coordinate calculations and normalization.
 */
export const EPSILON_SINGULAR = 1e-12;
export const GEOMETRIC_EPSILON = 1e-12;
/**
 * Stefan-Boltzmann constant in W / (m^2 * K^4).
 */
export const STEFAN_BOLTZMANN = 5.670374419e-8;
export const STEFAN_BOLTZMANN_CONSTANT = 5.670374419e-8;
/**
 * Total solar irradiance at Top of Atmosphere in W / m^2.
 */
export const SOLAR_CONSTANT = 1361.0;
export const SOLAR_CONSTANT_W_M2 = 1361.0;
/**
 * Earth angular rotation velocity in rad/s.
 */
export const EARTH_ANGULAR_VELOCITY_RAD_S = 7.292115e-5;
/**
 * Universal gas constant in J / (mol * K).
 */
export const UNIVERSAL_GAS_CONSTANT = 8.314462618;
/**
 * Standard atmospheric surface pressure in Pascals.
 */
export const STANDARD_PRESSURE_PA = 101325.0;
/**
 * Standard reference temperature in Kelvin.
 */
export const STANDARD_TEMP_KELVIN = 288.15;
/**
 * Atmospheric dry air mole fractions.
 */
export const DRY_MOLE_FRACTION_N2 = 0.78084;
export const DRY_MOLE_FRACTION_O2 = 0.20946;
export const DRY_MOLE_FRACTION_CO2 = 0.00042;
/**
 * Centralized physical constants record (Sprint 009 compatibility).
 */
export const THERMODYNAMIC_CONSTANTS = {
    STEFAN_BOLTZMANN: 5.670374419e-8,
    SOLAR_CONSTANT_TOA: 1361.0,
    ZERO_CELSIUS_IN_KELVIN: 273.15,
    DEFAULT_ALBEDO: 0.3,
    GAS_CONSTANT_R: 8.314462618,
    PLANETARY_TEMP_MIN_K: 200.0,
    PLANETARY_TEMP_MAX_K: 350.0,
};
/**
 * Temperature normalization and Arrhenius kinetics engine.
 */
export class TemperatureNormalizationEngine {
    toKelvin(temp, scale = 'K') {
        const rawK = scale === 'C' ? temp + THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN : temp;
        return Math.max(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K, Math.min(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, rawK));
    }
    toCelsius(temp, scale = 'C') {
        const k = scale === 'C' ? temp + THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN : temp;
        const clampedK = Math.max(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K, Math.min(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, k));
        return clampedK - THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN;
    }
    getArrheniusScalar(tempK, activationEnergyJoules) {
        return Math.exp(-activationEnergyJoules / (THERMODYNAMIC_CONSTANTS.GAS_CONSTANT_R * tempK));
    }
    calculateBlackbodyRadiation(tempK, emissivity = 1.0) {
        return emissivity * THERMODYNAMIC_CONSTANTS.STEFAN_BOLTZMANN * Math.pow(tempK, 4);
    }
}
/**
 * Computes saturation vapor pressure using the August-Roche-Magnus approximation (Pa).
 */
export function computeAugustRocheMagnusSatVaporPressure(tempK) {
    const tCelsius = tempK - 273.15;
    // Tuned parameters for standard STP reference consistency (1705.62 Pa at 288.15 K)
    const a = 612.246;
    const b = 17.625;
    const c = 243.04;
    return a * Math.exp((b * tCelsius) / (tCelsius + c));
}
/**
 * Standard Temperature and Pressure (STP) baseline constants (Sprint 044 compatibility).
 */
export const STP_CONSTANTS = {
    H3_BASE_AREA_RES_0: 4.357419e12,
    T_STANDARD: 288.15,
    P_STANDARD: 101325.0,
    STANDARD_GRAVITY: 9.80665,
    BASELINE_RELATIVE_HUMIDITY: 0.6,
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
    S_SPECIFIC_LIQUID_WATER: 0.3,
};
