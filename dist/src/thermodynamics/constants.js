/**
 * Physical and Thermodynamic Constants for Earth System Monad
 * Standard Temperature and Pressure (STP) Baseline Reference Values
 * Reference: RFC-044 & Method Specifications
 */
// Fundamental Physical & Planetary Constants
export const STANDARD_GRAVITY = 9.80665; // m/s^2 (WGS-84 standard surface gravity g0)
export const UNIVERSAL_GAS_CONSTANT = 8.314462618; // J/(mol*K) (CODATA standard R)
export const EARTH_RADIUS_METERS = 6371008.8; // Mean volumetric Earth radius R_earth (m)
export const EARTH_SURFACE_AREA_M2 = 5.100656e14; // Spherical planetary surface area 4*pi*R^2 (m^2)
export const STEFAN_BOLTZMANN_CONSTANT = 5.670374419e-8; // W/(m^2*K^4)
// Discrete Global Grid System (H3 DGGS) Constants
export const H3_BASE_CELL_COUNT = 122; // 110 hexagons + 12 pentagons at resolution 0
export const H3_BASE_AREA_RES_0 = 4.357419e12; // Geodesic average base cell area at res 0 (m^2)
// Baseline Standard Thermodynamic Surface Parameters (STP)
export const T_STANDARD = 288.15; // K (15.0 deg C standard global mean surface temperature T0)
export const P_STANDARD = 101325.0; // Pa (N/m^2 standard global mean surface atmospheric pressure P0)
export const P_REFERENCE_BAR = 100000.0; // Pa (1 bar standard thermodynamic chemical state P_degree)
// August-Roche-Magnus Water Vapor Saturation Parameters
export const SAT_VAPOR_A = 610.94; // Pa
export const SAT_VAPOR_B = 17.625; // dimensionless
export const SAT_VAPOR_C = 243.04; // deg C
export const BASELINE_RELATIVE_HUMIDITY = 0.60; // 60% ambient relative humidity phi
/**
 * Calculates saturation vapor pressure e*(T) using the August-Roche-Magnus equation.
 * @param temperatureKelvin Temperature in Kelvin
 * @returns Saturation vapor pressure in Pascals
 */
export function computeAugustRocheMagnusSatVaporPressure(temperatureKelvin) {
    const tempC = temperatureKelvin - 273.15;
    return SAT_VAPOR_A * Math.exp((SAT_VAPOR_B * tempC) / (tempC + SAT_VAPOR_C));
}
// STP Equilibrium Vapor Pressure and Mole Fraction
export const SATURATION_VAPOR_PRESSURE_STP = 1705.62473; // Pa at 288.15 K
export const PARTIAL_PRESSURE_H2O_STP = BASELINE_RELATIVE_HUMIDITY * SATURATION_VAPOR_PRESSURE_STP; // ~1023.37 Pa
export const PARTIAL_PRESSURE_DRY_AIR_STP = P_STANDARD - PARTIAL_PRESSURE_H2O_STP; // ~100301.63 Pa
export const MOLE_FRACTION_H2O = PARTIAL_PRESSURE_H2O_STP / P_STANDARD; // ~0.01009987 (1.010%)
export const DRY_AIR_FRACTION = 1.0 - MOLE_FRACTION_H2O; // ~0.98990013
// Dry Atmosphere Standard Molar Fractions
export const DRY_MOLE_FRACTION_N2 = 0.780840;
export const DRY_MOLE_FRACTION_O2 = 0.209460;
export const DRY_MOLE_FRACTION_CO2 = 0.000420; // 420 ppm
export const DRY_MOLE_FRACTION_TRACE = 0.009280; // Argon & trace gases
// Effective Wet Atmospheric Column Mole Fractions
export const MOLE_FRACTION_N2 = DRY_MOLE_FRACTION_N2 * DRY_AIR_FRACTION; // ~0.772953
export const MOLE_FRACTION_O2 = DRY_MOLE_FRACTION_O2 * DRY_AIR_FRACTION; // ~0.207344
export const MOLE_FRACTION_CO2 = DRY_MOLE_FRACTION_CO2 * DRY_AIR_FRACTION; // ~0.00041576
export const MOLE_FRACTION_TRACE = DRY_MOLE_FRACTION_TRACE * DRY_AIR_FRACTION; // ~0.00918627
// Molar Masses (kg/mol)
export const MOLAR_MASS_N2 = 0.0280134;
export const MOLAR_MASS_O2 = 0.0319988;
export const MOLAR_MASS_CO2 = 0.0440095;
export const MOLAR_MASS_H2O = 0.0180153;
export const MOLAR_MASS_TRACE = 0.0399480; // Argon
export const MOLAR_MASS_DRY_AIR = 0.0289647;
// Mean Effective Atmospheric Molar Mass (kg/mol)
export const MOLAR_MASS_WET_AIR = MOLE_FRACTION_N2 * MOLAR_MASS_N2 +
    MOLE_FRACTION_O2 * MOLAR_MASS_O2 +
    MOLE_FRACTION_CO2 * MOLAR_MASS_CO2 +
    MOLE_FRACTION_H2O * MOLAR_MASS_H2O +
    MOLE_FRACTION_TRACE * MOLAR_MASS_TRACE; // ~0.028854 kg/mol
// Specific & Constant-Volume Heat Capacities (J/(kg*K))
export const CP_AIR = 1005.0; // J/(kg*K)
export const CV_AIR = CP_AIR - UNIVERSAL_GAS_CONSTANT / MOLAR_MASS_WET_AIR; // ~716.85 J/(kg*K)
export const CP_WATER_LIQUID = 4184.0; // J/(kg*K)
export const CP_WATER_ICE = 2090.0; // J/(kg*K)
export const CP_MINERAL = 830.0; // J/(kg*K)
export const CP_SOC = 1800.0; // J/(kg*K) (Soil Organic Carbon)
export const CP_BIOMASS = 3600.0; // J/(kg*K)
export const CP_DETRITUS = 1500.0; // J/(kg*K)
// Molar Heat Capacities at Constant Pressure (J/(mol*K))
export const CPM_N2 = 29.12;
export const CPM_O2 = 29.38;
export const CPM_CO2 = 37.11;
export const CPM_H2O_GAS = 33.58;
// Latent Heat of Vaporization at STP (J/kg)
export const LATENT_HEAT_VAPORIZATION_STP = 2501000.0 - 2370.0 * (T_STANDARD - 273.15); // ~2.46545e6 J/kg
// Standard Molar Reference Entropies at 298.15 K, 1 bar (J/(mol*K))
export const S_STANDARD_N2 = 191.61;
export const S_STANDARD_O2 = 205.15;
export const S_STANDARD_CO2 = 213.78;
export const S_STANDARD_H2O_GAS = 188.84;
// Standard Specific Condensed Phase Entropies at STP (J/(kg*K))
export const S_SPECIFIC_LIQUID_WATER = 3900.0;
export const S_SPECIFIC_ICE = 2000.0;
export const S_SPECIFIC_MINERAL = 800.0;
export const S_SPECIFIC_SOC = 1400.0;
export const S_SPECIFIC_BIOMASS = 1200.0;
// Baseline Surface Stock Densities (per m^2 of horizontal surface)
export const BASELINE_SURFACE_WATER_KG_PER_M2 = 50.0; // 50 mm surface ponding / active film
export const BASELINE_SOC_KG_PER_M2 = 12.0; // Topsoil active organic carbon
export const BASELINE_MINERAL_KG_PER_M2 = 1288.0; // Upper 1m soil mineral fraction
export const BASELINE_SOIL_MOISTURE_KG_PER_M2 = 200.0; // 20% volumetric water in 1m depth
export const BASELINE_AUTOTROPH_KG_PER_M2 = 2.50; // Primary producers fresh biomass
export const BASELINE_HETEROTROPH_KG_PER_M2 = 0.015; // Consumers biomass
export const BASELINE_DETRITUS_KG_PER_M2 = 0.75; // Litter layer necromass
// =============================================================================
// HISTORICAL RETRO-COMPATIBILITY (Sprint 009 & Prior)
// =============================================================================
export const THERMODYNAMIC_CONSTANTS = Object.freeze({
    STEFAN_BOLTZMANN: STEFAN_BOLTZMANN_CONSTANT,
    SOLAR_CONSTANT_TOA: 1361.0,
    ZERO_CELSIUS_IN_KELVIN: 273.15,
    DEFAULT_ALBEDO: 0.3,
    GAS_CONSTANT_R: UNIVERSAL_GAS_CONSTANT,
    PLANETARY_TEMP_MIN_K: 200.0,
    PLANETARY_TEMP_MAX_K: 350.0,
});
export class TemperatureNormalizationEngine {
    toKelvin(temp, unit = 'C') {
        const k = unit === 'C' ? temp + THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN : temp;
        return Math.max(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K, Math.min(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, k));
    }
    toCelsius(tempK) {
        const clampedK = Math.max(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K, Math.min(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, tempK));
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
 * Aggregated dictionary of thermodynamic constants for unified export.
 */
export const STP_CONSTANTS = Object.freeze({
    STANDARD_GRAVITY,
    UNIVERSAL_GAS_CONSTANT,
    EARTH_RADIUS_METERS,
    EARTH_SURFACE_AREA_M2,
    STEFAN_BOLTZMANN_CONSTANT,
    H3_BASE_CELL_COUNT,
    H3_BASE_AREA_RES_0,
    T_STANDARD,
    P_STANDARD,
    P_REFERENCE_BAR,
    BASELINE_RELATIVE_HUMIDITY,
    SATURATION_VAPOR_PRESSURE_STP,
    PARTIAL_PRESSURE_H2O_STP,
    PARTIAL_PRESSURE_DRY_AIR_STP,
    DRY_MOLE_FRACTION_N2,
    DRY_MOLE_FRACTION_O2,
    DRY_MOLE_FRACTION_CO2,
    DRY_MOLE_FRACTION_TRACE,
    MOLE_FRACTION_N2,
    MOLE_FRACTION_O2,
    MOLE_FRACTION_CO2,
    MOLE_FRACTION_H2O,
    MOLE_FRACTION_TRACE,
    MOLAR_MASS_N2,
    MOLAR_MASS_O2,
    MOLAR_MASS_CO2,
    MOLAR_MASS_H2O,
    MOLAR_MASS_TRACE,
    MOLAR_MASS_DRY_AIR,
    MOLAR_MASS_WET_AIR,
    CP_AIR,
    CV_AIR,
    CP_WATER_LIQUID,
    CP_WATER_ICE,
    CP_MINERAL,
    CP_SOC,
    CP_BIOMASS,
    CP_DETRITUS,
    CPM_N2,
    CPM_O2,
    CPM_CO2,
    CPM_H2O_GAS,
    LATENT_HEAT_VAPORIZATION_STP,
    S_STANDARD_N2,
    S_STANDARD_O2,
    S_STANDARD_CO2,
    S_STANDARD_H2O_GAS,
    S_SPECIFIC_LIQUID_WATER,
    S_SPECIFIC_ICE,
    S_SPECIFIC_MINERAL,
    S_SPECIFIC_SOC,
    S_SPECIFIC_BIOMASS,
    BASELINE_SURFACE_WATER_KG_PER_M2,
    BASELINE_SOC_KG_PER_M2,
    BASELINE_MINERAL_KG_PER_M2,
    BASELINE_SOIL_MOISTURE_KG_PER_M2,
    BASELINE_AUTOTROPH_KG_PER_M2,
    BASELINE_HETEROTROPH_KG_PER_M2,
    BASELINE_DETRITUS_KG_PER_M2,
});
