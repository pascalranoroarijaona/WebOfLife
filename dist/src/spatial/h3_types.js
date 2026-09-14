/**
 * Root domain error for spatial grid coordinate and indexing anomalies.
 */
export class SpatialGridError extends Error {
    name = "SpatialGridError";
    constructor(message) {
        super(message);
        this.name = "SpatialGridError";
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
/**
 * Raised when an H3 index token fails canonical syntax or topological boundary criteria.
 */
export class H3ValidationError extends SpatialGridError {
    name = "H3ValidationError";
    token;
    constructor(token, details) {
        const reason = details ? `: ${details}` : "";
        super(`Invalid canonical H3 index token '${String(token)}'${reason}`);
        this.token = token;
        this.name = "H3ValidationError";
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
/**
 * Raised when an H3 index parameter violates null/undefined/empty guard clauses.
 */
export class SpatialGuardClauseException extends Error {
    constructor(message) {
        super(`[SpatialGuardClauseException] ${message}`);
        this.name = 'SpatialGuardClauseException';
        Object.setPrototypeOf(this, SpatialGuardClauseException.prototype);
    }
}
/**
 * Standardized H3 error codes for format and topology validation failures.
 */
export var H3ErrorCode;
(function (H3ErrorCode) {
    H3ErrorCode["SUCCESS"] = "H3_SUCCESS";
    H3ErrorCode["INVALID_LENGTH"] = "H3_ERR_INVALID_LENGTH";
    H3ErrorCode["INVALID_CHARACTER"] = "H3_ERR_INVALID_CHARACTER";
    H3ErrorCode["INVALID_RESOLUTION"] = "H3_ERR_INVALID_RESOLUTION";
    H3ErrorCode["INVALID_BASE_CELL"] = "H3_ERR_INVALID_BASE_CELL";
    H3ErrorCode["NULL_INDEX"] = "H3_ERR_NULL_INDEX";
})(H3ErrorCode || (H3ErrorCode = {}));
