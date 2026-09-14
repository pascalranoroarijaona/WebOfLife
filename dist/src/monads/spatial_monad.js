/**
 * @file src/monads/spatial_monad.ts - SpatialMonad
 * Thermodynamic Class: Spatial Boundary Gate & Monadic State Controller
 */
import { isValidH3Index, H3GridParser, H3Error, H3ErrorCode } from '../spatial/h3_grid.js';
function raiseEntropySpike(reason) {
    throw new Error(`[Entropy Leak Prevented] ${reason}`);
}
/**
 * SpatialMonad wrapper ensuring matter/energy allocations only occur on validated spatial nodes.
 */
export class SpatialMonad {
    value;
    error;
    index;
    history = [];
    constructor(value = null, error = null, index = '') {
        this.value = value;
        this.error = error;
        this.index = index;
    }
    static of(rawString) {
        if (typeof rawString === 'string' && isValidH3Index(rawString)) {
            const m = new SpatialMonad(rawString, null, rawString);
            return m;
        }
        else {
            return new SpatialMonad(null, `Malformed spatial coordinate: ${rawString}`, '');
        }
    }
    static unit(val) {
        return new SpatialMonad(val, null);
    }
    static fromGeo(coord, resolution, initialStock) {
        const indexStr = H3GridParser.fromGeo(coord, resolution);
        const validation = H3GridParser.validateIndex(indexStr);
        if (!validation.isValid) {
            raiseEntropySpike(`Invalid H3 index generated: ${indexStr}`);
        }
        const monad = new SpatialMonad(initialStock ?? null, null, indexStr);
        return monad;
    }
    isRight() {
        return this.value !== null && this.error === null;
    }
    getOrThrow() {
        if (this.value === null || typeof this.value !== 'string') {
            raiseEntropySpike(this.error || "Unknown spatial corruption");
        }
        return this.value;
    }
    extract() {
        if (this.value === null) {
            raiseEntropySpike(this.error || "Attempted to extract null spatial monad state");
        }
        return this.value;
    }
    unwrapStock() {
        if (this.value && typeof this.value === 'object') {
            const obj = this.value;
            return {
                carbonKg: obj.carbonKg ?? obj.carbonMass ?? 0,
                waterKg: obj.waterKg ?? obj.waterMass ?? 0,
                biomassJoules: obj.biomassJoules ?? 0,
                ...obj
            };
        }
        return { carbonKg: 0, waterKg: 0, biomassJoules: 0 };
    }
    getIndex() {
        return this.index || (typeof this.value === 'string' ? this.value : '8c2681432fffffff');
    }
    bind(fn) {
        if (this.value === null) {
            return new SpatialMonad(null, this.error, this.index);
        }
        try {
            const res = fn(this.value);
            if (res instanceof SpatialMonad) {
                return res;
            }
            return new SpatialMonad(res, null, this.index);
        }
        catch (err) {
            return new SpatialMonad(null, err.message, this.index);
        }
    }
    map(fn) {
        if (this.value === null) {
            return new SpatialMonad(null, this.error, this.index);
        }
        try {
            this.history.push(JSON.parse(JSON.stringify(this.value)));
            const res = fn(this.value);
            return new SpatialMonad(res, null, this.index);
        }
        catch (err) {
            return new SpatialMonad(null, err.message, this.index);
        }
    }
    run(action) {
        if (this.value !== null) {
            this.history.push(JSON.parse(JSON.stringify(this.value)));
        }
        action();
        return this;
    }
    setValue(val) {
        this.value = val;
    }
    getValue() {
        return this.value;
    }
    rollback() {
        if (this.history.length > 0) {
            this.value = this.history.pop();
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
        const validation = validator.validateIndex(state.h3Index);
        if (!validation.isValid) {
            return new H3ValidationMonad(null, new H3Error(validation.code, validation.message), validator);
        }
        return new H3ValidationMonad(state, null, validator);
    }
    bind(fn) {
        if (this.error !== null || this.state === null) {
            return this;
        }
        try {
            const nextState = fn(this.state);
            if (nextState.h3Index) {
                const validation = this.validator.validateIndex(nextState.h3Index);
                if (!validation.isValid) {
                    return new H3ValidationMonad(null, new H3Error(validation.code, validation.message), this.validator);
                }
            }
            return new H3ValidationMonad(nextState, null, this.validator);
        }
        catch (err) {
            return new H3ValidationMonad(null, new H3Error(H3ErrorCode.INTERNAL_ERROR, err.message), this.validator);
        }
    }
    match(onSuccess, onError) {
        if (this.error !== null || this.state === null) {
            return onError(this.error || new H3Error(H3ErrorCode.INTERNAL_ERROR, 'Unknown error'));
        }
        return onSuccess(this.state);
    }
}
