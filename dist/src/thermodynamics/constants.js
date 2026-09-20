// =============================================================================
// WEB OF LIFE - FUNDAMENTAL THERMODYNAMIC & PHYSICAL CONSTANTS
// =============================================================================
/**
 * Speed of light in vacuum (m/s).
 */
export const SPEED_OF_LIGHT_M_S = 299_792_458;
/**
 * Planck constant (J*s).
 */
export const PLANCK_CONSTANT_J_S = 6.62607015e-34;
/**
 * Boltzmann constant (J/K).
 */
export const BOLTZMANN_CONSTANT_J_K = 1.380649e-23;
/**
 * Avogadro constant (1/mol).
 */
export const AVOGADRO_CONSTANT_MOL = 6.02214076e23;
/**
 * Universal gas constant (J/(mol*K)).
 */
export const UNIVERSAL_GAS_CONSTANT_J_MOL_K = 8.314462618;
export const GAS_CONSTANT_R = 8.314462618;
/**
 * Stefan-Boltzmann constant (W/(m^2*K^4)).
 */
export const STEFAN_BOLTZMANN_CONSTANT_W_M2_K4 = 5.670374419e-8;
export const STEFAN_BOLTZMANN_CONSTANT = 5.670374419e-8;
export const STEFAN_BOLTZMANN = 5.670374419e-8;
/**
 * Standard solar irradiance at top of atmosphere (Solar constant) (W/m^2).
 */
export const SOLAR_CONSTANT_W_M2 = 1361.0;
export const SOLAR_CONSTANT_TOA = 1361.0;
/**
 * Fundamental rotation angle for Aperture-7 Class III hexagon resolutions in radians.
 * arcsin(sqrt(3) / (2 * sqrt(7))) ≈ 0.3334731722918321 rad (~19.106605 deg).
 */
export const APERTURE_7_ROTATION_RAD = 0.3334731722918321;
export const APERTURE_ROTATION_RAD = 0.3334731722918321;
export const APERTURE_ROTATION_DEG = (0.3334731722918321 * 180) / Math.PI;
/**
 * Planetary and Geodesic Radii (Meters)
 */
export const EARTH_RADIUS_METERS = 6371000.0;
export const EARTH_MEAN_RADIUS_METERS = 6371008.8;
export const EARTH_AUTHALIC_RADIUS_METERS = 6371007.1809;
export const DEFAULT_PLANETARY_RADIUS_METERS = 6371000.0;
export const WGS84_EARTH_RADIUS_METERS = 6371008.8;
export const WGS84_EARTH_MEAN_RADIUS_METERS = 6371008.8;
/**
 * Earth Angular Velocity (rad/s)
 */
export const EARTH_ANGULAR_VELOCITY_RAD_S = 7.292115e-5;
/**
 * Thermodynamic Constants Table (Sprint 009)
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
 * Temperature Normalization Engine (Sprint 009)
 */
export class TemperatureNormalizationEngine {
    toKelvin(temp, scale = 'C') {
        const k = scale === 'C' ? temp + THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN : temp;
        return Math.max(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MIN_K, Math.min(THERMODYNAMIC_CONSTANTS.PLANETARY_TEMP_MAX_K, k));
    }
    toCelsius(temp, scale = 'C') {
        const k = this.toKelvin(temp, scale);
        return k - THERMODYNAMIC_CONSTANTS.ZERO_CELSIUS_IN_KELVIN;
    }
    getArrheniusScalar(tempK, activationEnergyJPerMol) {
        const k = Math.max(1e-3, tempK);
        return Math.exp(-activationEnergyJPerMol / (THERMODYNAMIC_CONSTANTS.GAS_CONSTANT_R * k));
    }
    calculateBlackbodyRadiation(tempK, emissivity = 1.0) {
        return emissivity * THERMODYNAMIC_CONSTANTS.STEFAN_BOLTZMANN * Math.pow(tempK, 4);
    }
}
/**
 * Dry Atmospheric Air Mole Fractions
 */
export const DRY_MOLE_FRACTION_N2 = 0.78084;
export const DRY_MOLE_FRACTION_O2 = 0.20946;
export const DRY_MOLE_FRACTION_CO2 = 0.00042;
export const DRY_MOLE_FRACTION_AR = 0.00934;
/**
 * August-Roche-Magnus Water Vapor Saturation Pressure Formulation
 */
export function computeAugustRocheMagnusSatVaporPressure(tempK) {
    const tC = tempK - 273.15;
    // Saturation vapor pressure in Pa
    return 610.94 * Math.exp((17.625 * tC) / (tC + 243.04));
}
/**
 * STP Constants Container (Sprint 044)
 */
export const STP_CONSTANTS = {
    T_STANDARD: 288.15,
    P_STANDARD: 101325.0,
    STANDARD_GRAVITY: 9.80665,
    H3_BASE_AREA_RES_0: 4.357419e12,
    BASELINE_RELATIVE_HUMIDITY: 0.6,
    MOLAR_MASS_WET_AIR: 0.0288,
    MOLAR_MASS_N2: 0.0280134,
    MOLAR_MASS_O2: 0.0319988,
    MOLAR_MASS_CO2: 0.04401,
    MOLAR_MASS_H2O: 0.01801528,
    BASELINE_SURFACE_WATER_KG_PER_M2: 50.0,
    BASELINE_SOC_KG_PER_M2: 12.0,
    BASELINE_MINERAL_KG_PER_M2: 1288.0,
    BASELINE_SOIL_MOISTURE_KG_PER_M2: 200.0,
    BASELINE_AUTOTROPH_KG_PER_M2: 2.5,
    BASELINE_HETEROTROPH_KG_PER_M2: 0.015,
    BASELINE_DETRITUS_KG_PER_M2: 0.75,
    CP_WATER_LIQUID: 4184.0,
    CP_MINERAL: 840.0,
    S_SPECIFIC_LIQUID_WATER: 9.3,
};
