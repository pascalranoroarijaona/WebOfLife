// =============================================================================
// WEB OF LIFE - SPATIAL H3 INDEX TYPINGS
// =============================================================================
/**
 * Domain error for spatial guard clause violations (RFC-035).
 */
export class SpatialGuardClauseException extends Error {
    constructor(message = 'Spatial guard clause exception') {
        super(`[SpatialGuardClauseException] ${message}`);
        this.name = 'SpatialGuardClauseException';
        Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
    }
}
/**
 * Standardized H3 error codes across validation sprints.
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
