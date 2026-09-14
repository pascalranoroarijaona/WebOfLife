// =============================================================================
// WEB OF LIFE - H3 DGGS SPATIAL TYPES
// =============================================================================
/**
 * Error codes for H3 string validation.
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
 * Domain exception for spatial guard clause violations.
 */
export class SpatialGuardClauseException extends Error {
    constructor(message) {
        super(`[SpatialGuardClauseException] ${message}`);
        this.name = 'SpatialGuardClauseException';
        Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
    }
}
// =============================================================================
// SPRINT 045: STATE TENSOR OVERRIDE TYPES & THERMODYNAMIC CHANNELS
// =============================================================================
export var ThermodynamicChannel;
(function (ThermodynamicChannel) {
    ThermodynamicChannel[ThermodynamicChannel["TEMPERATURE_KELVIN"] = 0] = "TEMPERATURE_KELVIN";
    ThermodynamicChannel[ThermodynamicChannel["SENSIBLE_HEAT_JOULES"] = 1] = "SENSIBLE_HEAT_JOULES";
    ThermodynamicChannel[ThermodynamicChannel["WATER_MASS_KG"] = 2] = "WATER_MASS_KG";
    ThermodynamicChannel[ThermodynamicChannel["SOIL_ORGANIC_CARBON_KG"] = 3] = "SOIL_ORGANIC_CARBON_KG";
    ThermodynamicChannel[ThermodynamicChannel["VEGETATION_BIOMASS_KG"] = 4] = "VEGETATION_BIOMASS_KG";
    ThermodynamicChannel[ThermodynamicChannel["ATMOSPHERIC_CO2_KG"] = 5] = "ATMOSPHERIC_CO2_KG";
    ThermodynamicChannel[ThermodynamicChannel["MINERAL_NITROGEN_KG"] = 6] = "MINERAL_NITROGEN_KG";
    ThermodynamicChannel[ThermodynamicChannel["ALBEDO"] = 7] = "ALBEDO";
    ThermodynamicChannel[ThermodynamicChannel["CHANNEL_COUNT"] = 8] = "CHANNEL_COUNT";
})(ThermodynamicChannel || (ThermodynamicChannel = {}));
export const THERMODYNAMIC_CONSTANTS = {
    DEFAULT_REGOLITH_MASS_KG: 50.0,
    MIN_TEMPERATURE_KELVIN: 2.7315,
    SPECIFIC_HEAT: {
        REGOLITH: 840.0,
        WATER: 4184.0,
        SOIL_ORGANIC_CARBON: 1800.0,
        VEGETATION_BIOMASS: 1900.0,
        ATMOSPHERIC_CO2: 846.0,
        MINERAL_NITROGEN: 1200.0
    },
    SPECIFIC_ENTHALPY: {
        WATER: -15.87e6,
        SOIL_ORGANIC_CARBON: -32.79e6,
        VEGETATION_BIOMASS: -17.50e6,
        ATMOSPHERIC_CO2: -8.94e6,
        MINERAL_NITROGEN: -2.85e6
    }
};
