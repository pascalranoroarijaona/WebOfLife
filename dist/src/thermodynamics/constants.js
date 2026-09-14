/**
 * Sprint 009: Centralized Physical Constants and Temperature Normalization Engine
 * Target Module: src/thermodynamics/constants.ts
 * Compliance: First & Second Laws of Thermodynamics
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
export class TemperatureNormalizationEngine {
    constants;
    constructor(constants = THERMODYNAMIC_CONSTANTS) {
        this.constants = constants;
    }
    /**
     * Converts a temperature value to Kelvin, handling scale ('C' or 'K') and clamping to planetary limits.
     */
    toKelvin(temp, scale) {
        let tempK = temp;
        if (scale === 'C') {
            tempK = temp + this.constants.ZERO_CELSIUS_IN_KELVIN;
        }
        return Math.max(this.constants.PLANETARY_TEMP_MIN_K, Math.min(this.constants.PLANETARY_TEMP_MAX_K, tempK));
    }
    /**
     * Converts Kelvin temperature back to Celsius.
     */
    toCelsius(tempKelvin) {
        const clamped = Math.max(this.constants.PLANETARY_TEMP_MIN_K, Math.min(this.constants.PLANETARY_TEMP_MAX_K, tempKelvin));
        return clamped - this.constants.ZERO_CELSIUS_IN_KELVIN;
    }
    /**
     * Calculates Arrhenius biological metabolic rate scaling factor:
     * k(T) = exp(-Ea / (R * T_K))
     */
    getArrheniusScalar(tempKelvin, activationEnergy) {
        const clampedK = Math.max(this.constants.PLANETARY_TEMP_MIN_K, Math.min(this.constants.PLANETARY_TEMP_MAX_K, tempKelvin));
        return Math.exp(-activationEnergy / (this.constants.GAS_CONSTANT_R * clampedK));
    }
    /**
     * Calculates Stefan-Boltzmann Blackbody Radiation per unit surface area:
     * E_rad = epsilon * sigma * T_K^4
     */
    calculateBlackbodyRadiation(tempKelvin, emissivity = 1.0) {
        const clampedK = Math.max(this.constants.PLANETARY_TEMP_MIN_K, Math.min(this.constants.PLANETARY_TEMP_MAX_K, tempKelvin));
        return emissivity * this.constants.STEFAN_BOLTZMANN * Math.pow(clampedK, 4);
    }
}
