/**
 * @file h3_types.ts
 * @description Type definitions, error codes, and interface contracts for Uber H3 spatial index verification.
 * Compliance: First and Second Laws of Thermodynamics (Matter Conservation & Solar-Driven Energy Fluxes)
 */
export var H3ErrorCode;
(function (H3ErrorCode) {
    H3ErrorCode["SUCCESS"] = "H3_SUCCESS";
    H3ErrorCode["INVALID_LENGTH"] = "H3_ERR_INVALID_LENGTH";
    H3ErrorCode["INVALID_CHARACTER"] = "H3_ERR_INVALID_CHARACTER";
    H3ErrorCode["INVALID_RESOLUTION"] = "H3_ERR_INVALID_RESOLUTION";
    H3ErrorCode["INVALID_BASE_CELL"] = "H3_ERR_INVALID_BASE_CELL";
    H3ErrorCode["NULL_INDEX"] = "H3_ERR_NULL_INDEX";
    H3ErrorCode["INVALID_TYPE"] = "H3_ERR_INVALID_TYPE";
    H3ErrorCode["INTERNAL_ERROR"] = "H3_ERR_INTERNAL_ERROR";
    H3ErrorCode["RESOLUTION_MISMATCH"] = "H3_ERR_RESOLUTION_MISMATCH";
})(H3ErrorCode || (H3ErrorCode = {}));
export const H3_ERROR_CODES = H3ErrorCode;
