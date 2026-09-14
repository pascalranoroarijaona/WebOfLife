import { H3Error, H3ErrorCode, H3Validator, H3GridParser } from '../spatial/h3_grid';
export class H3ValidationMonad {
    state;
    error;
    validator;
    constructor(state, error, validator) {
        this.state = state;
        this.error = error;
        this.validator = validator;
    }
    static unit(state, validator = new H3Validator()) {
        try {
            validator.assertValid(state.h3Index);
            return new H3ValidationMonad(state, null, validator);
        }
        catch (err) {
            if (err instanceof H3Error) {
                return new H3ValidationMonad(null, err, validator);
            }
            throw err;
        }
    }
    bind(transitionFn) {
        if (this.error !== null || this.state === null) {
            return new H3ValidationMonad(null, this.error, this.validator);
        }
        try {
            const nextState = transitionFn(this.state);
            this.validator.assertValid(nextState.h3Index);
            return new H3ValidationMonad(nextState, null, this.validator);
        }
        catch (err) {
            if (err instanceof H3Error) {
                return new H3ValidationMonad(null, err, this.validator);
            }
            return new H3ValidationMonad(null, new H3Error(H3ErrorCode.INVALID_CHARACTER, err.message), this.validator);
        }
    }
    match(onSuccess, onError) {
        if (this.error !== null || this.state === null) {
            return onError(this.error);
        }
        return onSuccess(this.state);
    }
}
export class SpatialMonad {
    historyStack = [];
    currentValue = null;
    h3Index = '';
    stock = { carbonKg: 0, waterKg: 0, biomassJoules: 0 };
    constructor(initialValue) {
        if (initialValue !== undefined) {
            this.currentValue = initialValue;
            this.historyStack.push(initialValue);
        }
    }
    static unit(value) {
        return new SpatialMonad(value);
    }
    static fromGeo(coord, resolution, initialStock) {
        const normalizedIndex = H3GridParser.fromGeo(coord, resolution);
        const validation = H3GridParser.validateIndex(normalizedIndex);
        if (!validation.isValid) {
            throw new Error(`SpatialMonad Binding Failed: Invalid H3 index generated [${validation.errorCode}]`);
        }
        const monad = new SpatialMonad(normalizedIndex);
        monad.h3Index = normalizedIndex;
        monad.stock = { ...initialStock };
        return monad;
    }
    bind(fn) {
        if (this.currentValue === null) {
            throw new Error('Cannot bind null spatial monad state.');
        }
        return fn(this.currentValue);
    }
    map(fn) {
        const nextVal = fn(this.currentValue);
        const res = new SpatialMonad(nextVal);
        res.h3Index = this.h3Index;
        res.stock = { ...this.stock };
        return res;
    }
    extract() {
        if (this.currentValue === null) {
            throw new Error('No state to extract from SpatialMonad.');
        }
        return this.currentValue;
    }
    run(action) {
        action();
        if (this.currentValue !== null) {
            this.historyStack.push(this.currentValue);
        }
    }
    setValue(val) {
        this.currentValue = val;
    }
    getValue() {
        return this.currentValue;
    }
    rollback() {
        if (this.historyStack.length > 1) {
            this.historyStack.pop();
            this.currentValue = this.historyStack[this.historyStack.length - 1];
            return true;
        }
        return false;
    }
    getIndex() {
        return this.h3Index || '831f18fffffffff';
    }
    unwrapStock() {
        return { ...this.stock };
    }
}
