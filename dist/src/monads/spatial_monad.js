/**
 * Sprint 001-013: Comprehensive Spatial Monad and Thermodynamic Stock Register
 */
import { H3GridManager } from "../spatial/h3_grid.js";
import { H3ErrorCode } from "../spatial/h3_types.js";
export class SpatialMonad {
    value;
    entropyState;
    historyStack = [];
    constructor(val = null, entropyState = false) {
        this.value = val;
        this.entropyState = entropyState;
        if (val !== null) {
            this.historyStack.push(val);
        }
    }
    static of(cell) {
        if (cell === null || cell === undefined) {
            return SpatialMonad.empty();
        }
        return new SpatialMonad(cell, false);
    }
    static unit(val) {
        return SpatialMonad.of(val);
    }
    static empty() {
        return new SpatialMonad(null, true);
    }
    static fromGeo(coord, resolution, initialStock) {
        const indexStr = H3GridManager.fromGeo(coord, resolution);
        return new SpatialMonad({ h3Index: indexStr, ...initialStock });
    }
    chain(fn) {
        if (this.entropyState || this.value === null) {
            return SpatialMonad.empty();
        }
        try {
            return fn(this.value);
        }
        catch {
            return SpatialMonad.empty();
        }
    }
    bind(fn) {
        if (this.entropyState || this.value === null) {
            return SpatialMonad.empty();
        }
        try {
            const res = fn(this.value);
            if (res instanceof SpatialMonad) {
                return res;
            }
            return SpatialMonad.of(res);
        }
        catch {
            return SpatialMonad.empty();
        }
    }
    map(fn) {
        if (this.entropyState || this.value === null) {
            return SpatialMonad.empty();
        }
        try {
            const mapped = fn(this.value);
            return SpatialMonad.of(mapped);
        }
        catch {
            return SpatialMonad.empty();
        }
    }
    extract() {
        if (this.value === null) {
            throw new Error("[Entropy Leak Prevented] Cannot extract null value from SpatialMonad.");
        }
        return this.value;
    }
    unwrapStock() {
        return this.extract();
    }
    getIndex() {
        if (this.value && typeof this.value === 'object' && 'h3Index' in this.value) {
            return this.value.h3Index;
        }
        if (typeof this.value === 'string') {
            return this.value;
        }
        return '';
    }
    isCorrupted() {
        return this.entropyState;
    }
    getStock() {
        return this.value;
    }
    isRight() {
        return !this.entropyState && this.value !== null;
    }
    getOrThrow() {
        if (!this.isRight()) {
            throw new Error("[Entropy Leak Prevented] Monad is in Left/Empty state.");
        }
        return this.value;
    }
    run(action) {
        try {
            action();
            if (this.value !== null) {
                this.historyStack.push(this.value);
            }
        }
        catch {
            this.entropyState = true;
        }
    }
    setValue(val) {
        this.value = val;
        this.entropyState = false;
        this.historyStack.push(val);
    }
    getValue() {
        return this.value;
    }
    rollback() {
        if (this.historyStack.length > 1) {
            this.historyStack.pop();
            this.value = this.historyStack[this.historyStack.length - 1];
            return true;
        }
        return false;
    }
}
export class SpatialMonadStockRegister {
    validator;
    validIndices = [];
    rejectedCount = 0;
    constructor(validator) {
        this.validator = validator;
    }
    ingestIndex(index) {
        if (this.validator.validateIndex(index)) {
            this.validIndices.push(index);
            return true;
        }
        else {
            this.rejectedCount++;
            return false;
        }
    }
    getValidIndices() {
        return this.validIndices;
    }
    getRejectedCount() {
        return this.rejectedCount;
    }
}
export class H3ValidationMonad {
    state;
    error;
    validator;
    constructor(state, error, validator) {
        this.state = state;
        this.error = error;
        this.validator = validator;
    }
    static unit(state, validator) {
        const isValid = validator.validate ? validator.validate(state.h3Index) : validator.isValidIndex(state.h3Index);
        if (!isValid) {
            return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: "Invalid H3 Index" }, validator);
        }
        return new H3ValidationMonad(state, null, validator);
    }
    bind(fn) {
        if (this.error || !this.state) {
            return this;
        }
        try {
            const nextState = fn(this.state);
            const isValid = this.validator.validate ? this.validator.validate(nextState.h3Index) : this.validator.isValidIndex(nextState.h3Index);
            if (!isValid) {
                return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: "Invalid H3 Index" }, this.validator);
            }
            return new H3ValidationMonad(nextState, null, this.validator);
        }
        catch {
            return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: "Error in bind" }, this.validator);
        }
    }
    match(onSuccess, onError) {
        if (this.error || !this.state) {
            return onError(this.error || { code: H3ErrorCode.INVALID_CHARACTER, message: "Unknown error" });
        }
        return onSuccess(this.state);
    }
}
