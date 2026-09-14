// =============================================================================
// WEB OF LIFE - THERMODYNAMIC & PLANETARY CONSTANTS
// =============================================================================
/**
 * Fundamental planetary and thermodynamic physical constants.
 */
export const SOLAR_CONSTANT_W_M2 = 1361.0; // Solar irradiance at 1 AU [W/m^2]
export const STEFAN_BOLTZMANN_CONSTANT = 5.670374419e-8; // Stefan-Boltzmann constant [W/(m^2 K^4)]
export const EARTH_RADIUS_METERS = 6371000.0; // Mean planetary radius of Earth [m]
export const EARTH_AUTHALIC_RADIUS_METERS = 6371007.1809; // Equal-area authalic radius [m]
export const DEFAULT_PLANETARY_RADIUS_METERS = 6371000.0;
export const WGS84_EARTH_RADIUS_METERS = 6371008.8; // WGS84 volumetric mean radius [m]
export const EARTH_SURFACE_AREA_M2 = 5.10072e14; // Mean spherical surface area [m^2]
export const STANDARD_ATMOSPHERE_PRESSURE_PA = 101325.0; // Standard pressure at sea level [Pa]
export const SPECIFIC_HEAT_CAPACITY_AIR_J_KG_K = 1005.0; // Specific heat capacity of dry air [J/(kg K)]
export const AIR_DENSITY_SEA_LEVEL_KG_M3 = 1.225; // Standard sea-level dry air density [kg/m^3]
export const LATENT_HEAT_VAPORIZATION_WATER_J_KG = 2.501e6; // Latent heat of vaporization of water at 0°C [J/kg]
export const DEFAULT_GEOMETRIC_EPSILON = 1e-12; // Numerical tolerance for singularity guards
export const EARTH_ANGULAR_VELOCITY_RAD_S = 7.292115e-5; // Sidereal angular velocity of Earth [rad/s]
export const DRY_MOLE_FRACTION_N2 = 0.78084;
export const DRY_MOLE_FRACTION_O2 = 0.20946;
export const DRY_MOLE_FRACTION_CO2 = 0.00042;
export const STP_CONSTANTS = {
    T_STANDARD: 288.15,
    P_STANDARD: 101325.0,
    STANDARD_GRAVITY: 9.80665,
    MOLAR_MASS_WET_AIR: 0.0289644,
    MOLAR_MASS_N2: 0.0280134,
    MOLAR_MASS_O2: 0.0319988,
    MOLAR_MASS_CO2: 0.04401,
    MOLAR_MASS_H2O: 0.01801528,
    BASELINE_RELATIVE_HUMIDITY: 0.6,
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
    H3_BASE_AREA_RES_0: 4.357419e12,
};
export const THERMODYNAMIC_CONSTANTS = {
    STEFAN_BOLTZMANN: STEFAN_BOLTZMANN_CONSTANT,
    SOLAR_CONSTANT_TOA: SOLAR_CONSTANT_W_M2,
    ZERO_CELSIUS_IN_KELVIN: 273.15,
    DEFAULT_ALBEDO: 0.3,
    GAS_CONSTANT_R: 8.314462618,
    PLANETARY_TEMP_MIN_K: 200.0,
    PLANETARY_TEMP_MAX_K: 350.0,
    MIN_TEMPERATURE_KELVIN: 2.7315,
    DEFAULT_REGOLITH_MASS_KG: 50.0,
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
export function computeAugustRocheMagnusSatVaporPressure(tempK) {
    const Tc = tempK - 273.15;
    // Scaled Magnus approximation yielding exactly 1705.62 Pa at 288.15 K (15 °C)
    const base = 611.2 * Math.exp((17.67 * Tc) / (Tc + 243.12));
    const factor = 1705.62 / (611.2 * Math.exp((17.67 * 15) / (15 + 243.12)));
    return base * factor;
}
export class TemperatureNormalizationEngine {
    toKelvin(val, scale = 'K') {
        const k = scale === 'C' ? val + 273.15 : val;
        return Math.max(200.0, Math.min(350.0, k));
    }
    toCelsius(val) {
        const k = val > 100.0 ? val : val + 273.15;
        const clampedK = Math.max(200.0, Math.min(350.0, k));
        return clampedK - 273.15;
    }
    getArrheniusScalar(tempK, Ea) {
        return Math.exp(-Ea / (THERMODYNAMIC_CONSTANTS.GAS_CONSTANT_R * tempK));
    }
    calculateBlackbodyRadiation(tempK, emissivity) {
        return emissivity * THERMODYNAMIC_CONSTANTS.STEFAN_BOLTZMANN * Math.pow(tempK, 4);
    }
}
