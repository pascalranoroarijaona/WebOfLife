/**
 * src/monads/spatial_monad.ts
 * Spatial Monad linking Uber H3 indices to ecological trophic stocks, biogeochemical mass flows,
 * and robust monadic validation pipelines.
 */
import { H3GridManager, H3GridParser, H3Validator } from "../spatial/h3_grid.js";
import { H3ErrorCode } from "../spatial/h3_types.js";
export class SpatialMonadStockRegister {
    validIndices = new Set();
    rejectedCount = 0;
    validator;
    constructor(validator = new H3GridManager()) {
        this.validator = validator;
    }
    ingestIndex(h3Index) {
        const isValid = this.validator.validateIndex(h3Index);
        if (isValid) {
            this.validIndices.add(h3Index);
            return true;
        }
        else {
            this.rejectedCount++;
            return false;
        }
    }
    getValidIndices() {
        return Array.from(this.validIndices);
    }
    getRejectedCount() {
        return this.rejectedCount;
    }
}
export class SpatialMonad {
    value = null;
    error = null;
    h3Index = '';
    stock = null;
    historyStack = [];
    constructor(val) {
        if (val !== undefined) {
            this.value = val;
        }
    }
    static unit(val) {
        return new SpatialMonad(val);
    }
    static of(indexStr) {
        const m = new SpatialMonad(indexStr);
        m.h3Index = indexStr;
        const validation = H3GridParser.validateIndex(indexStr);
        if (!validation.isValid) {
            m.error = new Error('[Entropy Leak Prevented]: Invalid H3 index');
        }
        return m;
    }
    static fromGeo(coord, resolution, initialStock) {
        const indexStr = H3GridParser.fromGeo(coord, resolution);
        const validation = H3GridParser.validateIndex(indexStr);
        if (!validation.isValid) {
            throw new Error(`SpatialMonad Binding Failed: Invalid H3 index generated [${validation.errorCode}]`);
        }
        const m = new SpatialMonad(initialStock);
        m.h3Index = indexStr;
        m.stock = initialStock;
        return m;
    }
    bind(fn) {
        if (this.error) {
            const errM = new SpatialMonad();
            errM.error = this.error;
            return errM;
        }
        try {
            const result = fn(this.value);
            if (result instanceof SpatialMonad) {
                return result;
            }
            return SpatialMonad.unit(result);
        }
        catch (err) {
            const errM = new SpatialMonad();
            errM.error = err;
            return errM;
        }
    }
    map(fn) {
        if (this.error) {
            const errM = new SpatialMonad();
            errM.error = this.error;
            return errM;
        }
        try {
            const mapped = fn(this.value);
            return SpatialMonad.unit(mapped);
        }
        catch (err) {
            const errM = new SpatialMonad();
            errM.error = err;
            return errM;
        }
    }
    inspect() {
        if (this.error)
            throw this.error;
        return this.value;
    }
    extract() {
        return this.inspect();
    }
    isRight() {
        return this.error === null;
    }
    getOrThrow() {
        if (this.error)
            throw this.error;
        if (this.value !== null)
            return this.value;
        if (this.h3Index)
            return this.h3Index;
        throw new Error('SpatialMonad has no value or contains an error');
    }
    getIndex() {
        return this.h3Index || (typeof this.value === 'string' ? this.value : '');
    }
    unwrapStock() {
        if (this.stock)
            return { ...this.stock };
        return { carbonKg: 0, waterKg: 0, biomassJoules: 0 };
    }
    run(action) {
        if (this.value !== null) {
            this.historyStack.push(JSON.parse(JSON.stringify(this.value)));
        }
        action();
    }
    setValue(val) {
        this.value = val;
    }
    getValue() {
        return this.value;
    }
    rollback() {
        if (this.historyStack.length > 0) {
            this.value = this.historyStack.pop();
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
    static unit(state, validator = new H3Validator()) {
        const isValid = validator.validateIndex(state.h3Index);
        if (!isValid) {
            let code = H3ErrorCode.INVALID_CHARACTER;
            if (state.h3Index === '000000000000000')
                code = H3ErrorCode.NULL_INDEX;
            else if (state.h3Index.length !== 15)
                code = H3ErrorCode.INVALID_LENGTH;
            return new H3ValidationMonad(null, { code, message: 'Invalid H3 Index' }, validator);
        }
        return new H3ValidationMonad(state, null, validator);
    }
    bind(fn) {
        if (this.error || !this.state) {
            return new H3ValidationMonad(null, this.error, this.validator);
        }
        try {
            const nextState = fn(this.state);
            return H3ValidationMonad.unit(nextState, this.validator);
        }
        catch (err) {
            return new H3ValidationMonad(null, { code: H3ErrorCode.INTERNAL_ERROR, message: err.message }, this.validator);
        }
    }
    match(onSuccess, onError) {
        if (this.error || !this.state) {
            return onError(this.error || { code: H3ErrorCode.INTERNAL_ERROR, message: 'Unknown error' });
        }
        return onSuccess(this.state);
    }
}
