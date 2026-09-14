/**
 * Sprint 001-013: Spatial & H3 Types Contract Definitions (Unified Backward Compatibility)
 */
export var H3ErrorCode;
(function (H3ErrorCode) {
    H3ErrorCode["SUCCESS"] = "H3_SUCCESS";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_NULL"] = 1] = "ERR_H3_INVALID_NULL";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_LENGTH"] = 2] = "ERR_H3_INVALID_LENGTH";
    H3ErrorCode[H3ErrorCode["ERR_H3_INVALID_CHARACTERS"] = 3] = "ERR_H3_INVALID_CHARACTERS";
    H3ErrorCode["INVALID_CHARACTER"] = "H3_ERR_INVALID_CHARACTER";
    H3ErrorCode["INVALID_LENGTH"] = "H3_ERR_INVALID_LENGTH";
    H3ErrorCode["INVALID_RESOLUTION"] = "H3_ERR_INVALID_RESOLUTION";
    H3ErrorCode["INVALID_BASE_CELL"] = "H3_ERR_INVALID_BASE_CELL";
    H3ErrorCode["NULL_INDEX"] = "H3_ERR_NULL_INDEX";
})(H3ErrorCode || (H3ErrorCode = {}));
