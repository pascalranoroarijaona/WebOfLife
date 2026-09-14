import { assertResolutionTier, guardH3Payload, isValidH3Index } from '../spatial/h3_grid.js';
export class SpatialMonad {
    h3Index;
    resolution;
    stock;
    historyStack = [];
    currentValue;
    constructor(h3Index = '8c2681432ffffffff', resolution = 4, stock = {}) {
        this.h3Index = h3Index;
        this.resolution = resolution;
        this.stock = stock;
        assertResolutionTier(resolution);
        this.currentValue = stock;
    }
    static of(val) {
        const index = typeof val === 'string' ? val : '8c2681432ffffffff';
        return new SpatialMonad(index, 4, val);
    }
    static unit(val) {
        return SpatialMonad.of(val);
    }
    static fromGeo(coord, resolution, initialStock) {
        assertResolutionTier(resolution);
        return new SpatialMonad('8c2681432ffffffff', resolution, initialStock);
    }
    static fromPayload(payload) {
        const guarded = guardH3Payload(payload);
        return new SpatialMonad(guarded, 4, guarded);
    }
    refine(newResolution) {
        assertResolutionTier(newResolution);
        if (newResolution < 0 || newResolution > 15) {
            throw new RangeError(`[RangeError] Invalid resolution ${newResolution}`);
        }
        const conservedStock = typeof this.stock === 'object' && this.stock !== null ? { ...this.stock } : this.stock;
        return new SpatialMonad(this.h3Index, newResolution, conservedStock);
    }
    extract() {
        return this.currentValue;
    }
    getOrThrow() {
        if (typeof this.h3Index === 'string' && !isValidH3Index(this.h3Index)) {
            throw new Error('[Entropy Leak Prevented] Invalid H3 Index');
        }
        return this.currentValue;
    }
    isRight() {
        return typeof this.h3Index === 'string' && isValidH3Index(this.h3Index);
    }
    isCorrupted() {
        return this.currentValue === null || this.currentValue === undefined;
    }
    getStock() {
        return this.currentValue;
    }
    getValue() {
        return this.currentValue;
    }
    getResolution() {
        return this.resolution;
    }
    getIndex() {
        return this.h3Index;
    }
    unwrapStock() {
        if (typeof this.currentValue === 'object' && this.currentValue !== null) {
            return this.currentValue;
        }
        return { carbonKg: 0, waterKg: 0, biomassJoules: 0 };
    }
    run(action) {
        this.historyStack.push(this.currentValue);
        action();
    }
    setValue(val) {
        this.currentValue = val;
    }
    rollback() {
        if (this.historyStack.length > 0) {
            this.currentValue = this.historyStack.pop();
            return true;
        }
        return false;
    }
    bind(fn) {
        return fn(this.currentValue);
    }
    map(fn) {
        return new SpatialMonad(this.h3Index, this.resolution, fn(this.currentValue));
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
        if (typeof index === 'string' && index.length === 15 && /^[0-9a-f]{15}$/.test(index)) {
            this.validIndices.push(index);
            return true;
        }
        this.rejectedCount++;
        return false;
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
    validator;
    constructor(state, validator) {
        this.state = state;
        this.validator = validator;
    }
    static unit(state, validator) {
        return new H3ValidationMonad(state, validator);
    }
    bind(fn) {
        const nextState = fn(this.state);
        return new H3ValidationMonad(nextState, this.validator);
    }
    match(onSuccess, onError) {
        try {
            if (this.state && this.state.h3Index && !isValidH3Index(this.state.h3Index)) {
                return onError({ code: 3, message: 'Invalid character' });
            }
            return onSuccess(this.state);
        }
        catch (err) {
            return onError({ code: 3, message: err.message });
        }
    }
}
