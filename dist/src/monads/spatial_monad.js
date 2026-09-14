import { guardH3Payload, H3GridParser, H3Error, H3ErrorCode } from '../spatial/h3_grid';
export { H3ErrorCode };
export class SpatialMonad {
    stock;
    h3Index;
    value = null;
    historyStack = [];
    constructor(stock = null, h3Index = null) {
        this.stock = stock;
        this.h3Index = h3Index;
        this.value = stock;
    }
    static fromPayload(payload) {
        guardH3Payload(payload);
        return new SpatialMonad(payload, payload);
    }
    static of(val) {
        return new SpatialMonad(val, typeof val === 'string' ? val : null);
    }
    static fromGeo(coord, resolution, initialStock) {
        const idx = H3GridParser.fromGeo(coord, resolution);
        return new SpatialMonad(initialStock, idx);
    }
    map(fn) {
        if (this.h3Index === null && typeof this.stock !== 'string') {
            throw new Error('SpatialMonad violation: Attempted to map over an uninitialized or null spatial index.');
        }
        const target = this.h3Index ?? this.stock;
        const resolvedStock = fn(target);
        return new SpatialMonad(resolvedStock, target);
    }
    getStock() {
        return this.stock;
    }
    extract() {
        if (this.stock === null) {
            throw new Error('Cannot extract null stock from SpatialMonad');
        }
        return this.stock;
    }
    unwrapStock() {
        return this.extract();
    }
    getIndex() {
        return this.h3Index ?? '';
    }
    isCorrupted() {
        return this.stock === null || (typeof this.stock === 'string' && this.stock.trim() === '');
    }
    isRight() {
        if (typeof this.stock === 'string') {
            return /^[0-9a-fA-F]{15}$/.test(this.stock);
        }
        return this.stock !== null;
    }
    getOrThrow() {
        if (!this.isRight()) {
            throw new Error('[Entropy Leak Prevented] Invalid spatial monad state');
        }
        return this.stock;
    }
    run(fn) {
        if (this.value !== null) {
            this.historyStack.push(this.value);
        }
        fn();
    }
    setValue(val) {
        this.value = val;
        this.stock = val;
    }
    getValue() {
        return this.value ?? this.stock;
    }
    rollback() {
        if (this.historyStack.length > 0) {
            this.value = this.historyStack.pop();
            this.stock = this.value;
            return true;
        }
        return false;
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
        return new H3ValidationMonad(state, null, validator);
    }
    bind(fn) {
        if (this.error || !this.state) {
            return this;
        }
        try {
            const nextState = fn(this.state);
            this.validator.assertValid(nextState.h3Index);
            return new H3ValidationMonad(nextState, null, this.validator);
        }
        catch (err) {
            const h3Err = err instanceof H3Error ? err : new H3Error(H3ErrorCode.INVALID_CHARACTER, err.message);
            return new H3ValidationMonad(null, h3Err, this.validator);
        }
    }
    match(onSuccess, onError) {
        if (this.error || !this.state) {
            return onError(this.error ?? new H3Error(H3ErrorCode.NULL_INDEX, 'Unknown error'));
        }
        return onSuccess(this.state);
    }
}
export class SpatialMonadStockRegister {
    manager;
    validIndices = [];
    rejectedCount = 0;
    constructor(manager) {
        this.manager = manager;
    }
    ingestIndex(index) {
        if (this.manager.validateIndex(index)) {
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
