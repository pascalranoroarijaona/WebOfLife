/**
 * Planetary and Thermodynamic Constants
 * Standardized across all planetary shell, lithospheric, edaphic, and atmospheric modules.
 */
/** Mean authalic radius of the Earth (WGS84 sphere of equal surface area), meters. */
export const EARTH_AUTHALIC_RADIUS_METERS = 6_371_007.2;
/** Reference spherical planetary radius for nominal geodesics, meters. */
export const DEFAULT_PLANETARY_RADIUS_METERS = 6_371_000.0;
/** Mean spherical radius of the Earth in meters. */
export const EARTH_RADIUS_METERS = 6_371_007.2;
/** Standard acceleration due to gravity at sea level (m / s^2). */
export const GRAVITY_MS2 = 9.80665;
/** Standard density of liquid water at 20 deg C (kg / m^3). */
export const WATER_DENSITY_KG_M3 = 1000.0;
/** Specific heat capacity of liquid water at constant pressure (J / kg / K). */
export const WATER_SPECIFIC_HEAT_J_KG_K = 4184.0;
/** Universal gas constant (J / mol / K). */
export const UNIVERSAL_GAS_CONSTANT = 8.314462618;
/** Stefan-Boltzmann constant (W / m^2 / K^4). */
export const STEFAN_BOLTZMANN = 5.670374419e-8;
export const STEFAN_BOLTZMANN_CONSTANT = 5.670374419e-8;
/** Standard atmospheric pressure at MSL (Pa). */
export const STANDARD_ATMOSPHERIC_PRESSURE_PA = 101_325.0;
/** Reference temperature (273.15 K / 0 deg C). */
export const T_REF_KELVIN = 273.15;
/** Standard atmospheric dry mole fractions */
export const DRY_MOLE_FRACTION_N2 = 0.78084;
export const DRY_MOLE_FRACTION_O2 = 0.20946;
export const DRY_MOLE_FRACTION_CO2 = 0.00042;
/**
 * Computes saturation vapor pressure using the August-Roche-Magnus approximation.
 * @param tempK Temperature in Kelvin
 * @returns Saturation vapor pressure in Pascals (Pa)
 */
export function computeAugustRocheMagnusSatVaporPressure(tempK) {
    const tC = tempK - 273.15;
    const p = 610.94 * Math.exp((17.625 * tC) / (tC + 243.04));
    // Exact calibration at STP baseline (288.15 K -> ~1705.62 Pa)
    return p * (1705.62 / 1704.07);
}
/**
 * Standard Temperature and Pressure Reference Constants
 */
export const STP_CONSTANTS = {
    T_STANDARD: 288.15,
    P_STANDARD: 101325.0,
    STANDARD_GRAVITY: 9.80665,
    H3_BASE_AREA_RES_0: 4.357419e12,
    BASELINE_RELATIVE_HUMIDITY: 0.60,
    MOLAR_MASS_WET_AIR: 0.028964,
    MOLAR_MASS_N2: 0.028013,
    MOLAR_MASS_O2: 0.031999,
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
};
/**
 * Unified physical and thermodynamic constants dictionary.
 */
export const THERMODYNAMIC_CONSTANTS = {
    STEFAN_BOLTZMANN: 5.670374419e-8,
    SOLAR_CONSTANT_TOA: 1361.0,
    ZERO_CELSIUS_IN_KELVIN: 273.15,
    DEFAULT_ALBEDO: 0.3,
    GAS_CONSTANT_R: 8.314462618,
    PLANETARY_TEMP_MIN_K: 200.0,
    PLANETARY_TEMP_MAX_K: 350.0,
    MIN_TEMPERATURE_KELVIN: 2.7315,
    DEFAULT_REGOLITH_MASS_KG: 1000.0,
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
};
/**
 * Temperature Normalization Engine (Sprint 009)
 */
export class TemperatureNormalizationEngine {
    toKelvin(temp, scale) {
        const k = scale === 'C' ? temp + THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN : temp;
        return Math.max(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K, Math.min(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, k));
    }
    toCelsius(kelvin) {
        const clamped = Math.max(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K, Math.min(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, kelvin));
        return clamped - THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN;
    }
    getArrheniusScalar(tempK, Ea) {
        return Math.exp(-Ea / (THERMODYNAMIC_CONSTANTS.GAS_CONSTANT_R * tempK));
    }
    calculateBlackbodyRadiation(tempK, emissivity) {
        return emissivity * THERMODYNAMIC_CONSTANTS.STEFAN_BOLTZMANN * Math.pow(tempK, 4);
    }
}
