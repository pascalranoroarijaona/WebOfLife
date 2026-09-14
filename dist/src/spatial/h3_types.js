// =============================================================================
// WEB OF LIFE - SPATIAL H3 & GEODESIC TYPE DEFINITIONS (UNIFIED RETRO-COMPATIBLE)
// =============================================================================
/**
 * Enumeration of standardized H3 spatial validation error codes.
 */
export var H3ErrorCode;
(function (H3ErrorCode) {
    H3ErrorCode["SUCCESS"] = "H3_SUCCESS";
    H3ErrorCode["INVALID_LENGTH"] = "H3_ERR_INVALID_LENGTH";
    H3ErrorCode["INVALID_CHARACTER"] = "H3_ERR_INVALID_CHARACTER";
    H3ErrorCode["INVALID_RESOLUTION"] = "H3_ERR_INVALID_RESOLUTION";
    H3ErrorCode["INVALID_BASE_CELL"] = "H3_ERR_INVALID_BASE_CELL";
    H3ErrorCode["NULL_INDEX"] = "H3_ERR_NULL_INDEX";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_NULL"] = 1] = "ERR_H3_INVALID_NULL";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_LENGTH"] = 2] = "ERR_H3_INVALID_LENGTH";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_CHARACTERS"] = 3] = "ERR_H3_INVALID_CHARACTERS";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_RESOLUTION"] = 4] = "ERR_H3_INVALID_RESOLUTION";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_BASE_CELL"] = 5] = "ERR_H3_INVALID_BASE_CELL";
    H3ErrorCode[H3ErrorCode["ERR_H3_OUT_OF_RANGE"] = 6] = "ERR_H3_OUT_OF_RANGE";
})(H3ErrorCode || (H3ErrorCode = {}));
/**
 * Domain-specific exception thrown on spatial guard clause violations.
 */
export class SpatialGuardClauseException extends Error {
    constructor(message) {
        super(`[SpatialGuardClauseException] ${message}`);
        this.name = 'SpatialGuardClauseException';
        Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
    }
}
/**
 * Contiguous channel layout definition for H3StateTensor.
 */
export var ThermodynamicChannel;
(function (ThermodynamicChannel) {
    ThermodynamicChannel[ThermodynamicChannel["TEMPERATURE_KELVIN"] = 0] = "TEMPERATURE_KELVIN";
    ThermodynamicChannel[ThermodynamicChannel["WATER_MASS_KG"] = 1] = "WATER_MASS_KG";
    ThermodynamicChannel[ThermodynamicChannel["SOIL_ORGANIC_CARBON_KG"] = 2] = "SOIL_ORGANIC_CARBON_KG";
    ThermodynamicChannel[ThermodynamicChannel["VEGETATION_BIOMASS_KG"] = 3] = "VEGETATION_BIOMASS_KG";
    ThermodynamicChannel[ThermodynamicChannel["ATMOSPHERIC_CO2_KG"] = 4] = "ATMOSPHERIC_CO2_KG";
    ThermodynamicChannel[ThermodynamicChannel["MINERAL_NITROGEN_KG"] = 5] = "MINERAL_NITROGEN_KG";
    ThermodynamicChannel[ThermodynamicChannel["ALBEDO"] = 6] = "ALBEDO";
    ThermodynamicChannel[ThermodynamicChannel["SENSIBLE_HEAT_JOULES"] = 7] = "SENSIBLE_HEAT_JOULES";
    ThermodynamicChannel[ThermodynamicChannel["CHANNEL_COUNT"] = 8] = "CHANNEL_COUNT";
})(ThermodynamicChannel || (ThermodynamicChannel = {}));
/**
 * Thermodynamic and specific heat constants for state tensor calculations.
 */
export const THERMODYNAMIC_CONSTANTS = {
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
    STEFAN_BOLTZMANN: 5.670374419e-8,
    SOLAR_CONSTANT_TOA: 1361.0,
    ZERO_CELSIUS_IN_KELVIN: 273.15,
    DEFAULT_ALBEDO: 0.3,
    GAS_CONSTANT_R: 8.314462618,
    PLANETARY_TEMP_MIN_K: 200.0,
    PLANETARY_TEMP_MAX_K: 350.0,
};
