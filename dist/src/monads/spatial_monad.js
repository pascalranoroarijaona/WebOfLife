import { assertH3Resolution, guardH3Payload } from '../spatial/h3_grid';
import { H3ErrorCode } from '../spatial/h3_types';
export class SpatialMonad {
    index;
    resolution;
    stock;
    value = null;
    historyStack = [];
    rightValue = null;
    isRightFlag = true;
    constructor(index, resolution, stock = null) {
        this.index = index;
        this.resolution = resolution;
        this.stock = stock;
        if (resolution !== undefined) {
            assertH3Resolution(resolution);
        }
        this.value = stock;
        if (stock !== null && stock !== undefined) {
            this.historyStack.push(stock);
            this.rightValue = stock;
        }
    }
    static unit(val) {
        return new SpatialMonad(undefined, undefined, val);
    }
    static of(val) {
        if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) {
            const m = new SpatialMonad(undefined, undefined, val);
            m.isRightFlag = false;
            return m;
        }
        if (typeof val === 'string') {
            try {
                guardH3Payload(val);
            }
            catch {
                const m = new SpatialMonad(undefined, undefined, val);
                m.isRightFlag = false;
                return m;
            }
        }
        return new SpatialMonad(undefined, undefined, val);
    }
    static fromGeo(coord, resolution, initialStock) {
        assertH3Resolution(resolution);
        const indexStr = `8${resolution.toString(16)}268012345ffff`;
        return new SpatialMonad(indexStr, resolution, initialStock ?? { carbonKg: 1000, waterKg: 50000, biomassJoules: 250000 });
    }
    static fromPayload(payload) {
        const guarded = guardH3Payload(payload);
        return new SpatialMonad(guarded, 7, guarded);
    }
    refine(targetResolution) {
        assertH3Resolution(targetResolution);
        const conservedStock = this.stock ? { ...this.stock } : { carbon: 0, water: 0, minerals: 0, oxygen: 0, energy: 0 };
        return new SpatialMonad(this.index, targetResolution, conservedStock);
    }
    getStock() {
        return this.stock;
    }
    getResolution() {
        return this.resolution;
    }
    getIndex() {
        return this.index || (typeof this.stock === 'string' ? this.stock : '');
    }
    unwrapStock() {
        return this.stock;
    }
    extract() {
        return this.stock;
    }
    isCorrupted() {
        return this.stock === null || this.stock === undefined;
    }
    isRight() {
        return this.isRightFlag && this.stock !== null && this.stock !== undefined;
    }
    getOrThrow() {
        if (!this.isRight()) {
            throw new Error('[Entropy Leak Prevented] Spatial Monad is corrupted or invalid.');
        }
        return this.stock;
    }
    run(fn) {
        fn();
        return this;
    }
    setValue(val) {
        this.value = val;
        this.stock = val;
        this.historyStack.push(val);
    }
    getValue() {
        return this.value;
    }
    rollback() {
        if (this.historyStack.length > 1) {
            this.historyStack.pop();
            this.value = this.historyStack[this.historyStack.length - 1];
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
        if (this.error)
            return this;
        try {
            const nextState = fn(this.state);
            if (nextState.h3Index) {
                const valid = this.validator.validate(nextState.h3Index);
                if (!valid) {
                    return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid H3 Index' }, this.validator);
                }
            }
            return new H3ValidationMonad(nextState, null, this.validator);
        }
        catch (err) {
            return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: err.message }, this.validator);
        }
    }
    match(onSuccess, onError) {
        if (this.error) {
            return onError(this.error);
        }
        return onSuccess(this.state);
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
        const valid = this.validator.validateIndex ? this.validator.validateIndex(index) : this.validator.validate(index);
        if (valid) {
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
