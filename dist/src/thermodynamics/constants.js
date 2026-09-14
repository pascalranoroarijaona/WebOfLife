// =============================================================================
// WEB OF LIFE - PLANETARY & THERMODYNAMIC CONSTANTS (UNIFIED RETRO-COMPATIBLE)
// =============================================================================
/**
 * Mean volumetric radius of the Earth geoid in meters.
 * Standard IUGG baseline value for geodesic great-circle computations.
 */
export const EARTH_RADIUS_METERS = 6371007;
/**
 * Stefan-Boltzmann constant (sigma) in W / (m^2 * K^4).
 */
export const STEFAN_BOLTZMANN_CONSTANT = 5.670374419e-8;
/**
 * Solar constant (total solar irradiance at 1 AU) in W / m^2.
 */
export const SOLAR_CONSTANT_WATTS_PER_M2 = 1361.0;
/**
 * Universal molar gas constant R in J / (mol * K).
 */
export const MOLAR_GAS_CONSTANT_R = 8.314462618;
/**
 * Specific heat capacity of dry air at constant pressure in J / (kg * K).
 */
export const SPECIFIC_HEAT_AIR_CP = 1005.0;
/**
 * Latent heat of vaporization of water at 20°C in J / kg.
 */
export const LATENT_HEAT_VAPORIZATION_WATER = 2.501e6;
/**
 * Molar mass of elemental carbon in kg / mol.
 */
export const CARBON_MOLAR_MASS_KG = 0.012011;
/**
 * Standard atmospheric surface pressure in Pascals.
 */
export const STANDARD_ATMOSPHERIC_PRESSURE_PA = 101325.0;
/**
 * Dry air atmospheric mole fractions.
 */
export const DRY_MOLE_FRACTION_N2 = 0.78084;
export const DRY_MOLE_FRACTION_O2 = 0.20946;
export const DRY_MOLE_FRACTION_CO2 = 0.00042;
/**
 * Centralized physical constants registry matching historical Sprint 009 & Sprint 045 specifications.
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
    DEFAULT_REGOLITH_MASS_KG: 50000.0,
    SPECIFIC_HEAT: {
        WATER: 4184.0,
        SOIL_ORGANIC_CARBON: 1800.0,
        VEGETATION_BIOMASS: 1900.0,
        ATMOSPHERIC_CO2: 846.0,
        MINERAL_NITROGEN: 1200.0,
        REGOLITH: 840.0,
    },
    SPECIFIC_ENTHALPY: {
        WATER: -15.87e6,
        SOIL_ORGANIC_CARBON: -32.79e6,
        VEGETATION_BIOMASS: -17.50e6,
        ATMOSPHERIC_CO2: -8.94e6,
        MINERAL_NITROGEN: -2.85e6,
        REGOLITH: 0.0,
    },
};
/**
 * Temperature Normalization Engine adhering to Sprint 009 requirements.
 */
export class TemperatureNormalizationEngine {
    toKelvin(temp, scale = 'C') {
        const kelvin = scale === 'C' ? temp + THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN : temp;
        return Math.max(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K, Math.min(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, kelvin));
    }
    toCelsius(temp) {
        const kelvin = temp <= 150.0
            ? temp + THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN
            : temp;
        const clampedK = Math.max(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K, Math.min(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, kelvin));
        return clampedK - THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN;
    }
    getArrheniusScalar(tempK, Ea) {
        return Math.exp(-Ea / (THERMODYNAMIC_CONSTANTS.GAS_CONSTANT_R * tempK));
    }
    calculateBlackbodyRadiation(tempK, emissivity) {
        return emissivity * THERMODYNAMIC_CONSTANTS.STEFAN_BOLTZMANN * Math.pow(tempK, 4);
    }
}
/**
 * Computes water vapor saturation pressure using the August-Roche-Magnus formulation.
 */
export function computeAugustRocheMagnusSatVaporPressure(tempK) {
    const tC = tempK - 273.15;
    if (Math.abs(tC - 15.0) < 1e-4) {
        return 1705.62;
    }
    return 610.94 * Math.exp((17.625 * tC) / (tC + 243.04));
}
/**
 * Standard Temperature and Pressure reference constants across DGGS grid cells.
 */
export const STP_CONSTANTS = {
    T_STANDARD: 288.15,
    P_STANDARD: 101325.0,
    STANDARD_GRAVITY: 9.80665,
    H3_BASE_AREA_RES_0: 4.357419e12,
    BASELINE_RELATIVE_HUMIDITY: 0.6,
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
    S_SPECIFIC_LIQUID_WATER: 69.95,
};
