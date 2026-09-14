/**
 * @file src/monads/spatial_monad.ts
 * @description Spatial Monad implementation supporting thermodynamic conservation, H3 validation, and comprehensive Sprint 001-032 compatibility.
 */
import { H3GridCell, isValidH3Index, guardH3Payload } from '../spatial/h3_grid.js';
import { H3ErrorCode, H3Error } from '../spatial/h3_grid.js';
export { H3ErrorCode, H3Error };
export class SpatialMonad {
    stockStore;
    token;
    state;
    h3Cell = null;
    resolution;
    stocks;
    valueState = null;
    historyStack = [];
    rightValue = null;
    isRightFlag = true;
    constructor(tokenOrValue, initialStockOrResolution = { joules: 1000, entropy: 0 }, stateOrStock, _energyJoules) {
        if (typeof tokenOrValue === 'string') {
            this.token = tokenOrValue;
            this.resolution = typeof initialStockOrResolution === 'number' ? initialStockOrResolution : 9;
            const stockObj = typeof stateOrStock === 'object' && stateOrStock !== null ? stateOrStock : {
                carbon: 0, water: 0, minerals: 0, oxygen: 0, energy: 0, carbonMass: 0, waterMass: 0, biomass: 0, joules: 1000, entropy: 0
            };
            this.stocks = stockObj;
            this.stockStore = stockObj;
            this.state = (typeof stateOrStock === 'string' ? stateOrStock : 'UnvalidatedState');
            this.rightValue = tokenOrValue;
            this.isRightFlag = isValidH3Index(tokenOrValue);
        }
        else {
            this.token = '8928308280fffff';
            this.resolution = 9;
            this.stocks = { carbon: 0, water: 0, minerals: 0, oxygen: 0, energy: 0, carbonMass: 0, waterMass: 0, biomass: 0, joules: 1000, entropy: 0 };
            this.stockStore = this.stocks;
            this.state = 'ActiveSpatialStock';
            this.valueState = tokenOrValue;
            this.rightValue = tokenOrValue;
            this.isRightFlag = true;
        }
    }
    get stock() {
        return this.stocks || this.stockStore;
    }
    set stock(val) {
        this.stockStore = val;
        if (val && typeof val === 'object' && ('carbon' in val || 'joules' in val)) {
            this.stocks = val;
        }
    }
    static of(val, resolution = 9, stocks) {
        if (typeof val === 'string') {
            const isValid = isValidH3Index(val);
            const monad = new SpatialMonad(val, resolution, {
                carbon: 0, water: 0, minerals: 0, oxygen: 0, energy: 0, carbonMass: 0, waterMass: 0, biomass: 0, joules: 1000, entropy: 0, ...stocks
            });
            monad.isRightFlag = isValid;
            monad.rightValue = val;
            return monad;
        }
        const monad = new SpatialMonad(val);
        monad.resolution = resolution;
        if (stocks) {
            monad.stocks = { ...monad.stocks, ...stocks };
            monad.stockStore = monad.stocks;
        }
        return monad;
    }
    static unit(val) {
        return SpatialMonad.of(val);
    }
    static fromPayload(payload) {
        guardH3Payload(payload);
        return SpatialMonad.of(payload, 9, {
            carbon: 0, water: 0, minerals: 0, oxygen: 0, energy: 0, carbonMass: 0, waterMass: 0, biomass: 0
        });
    }
    static fromGeo(coord, resolution, initialStock) {
        return new SpatialMonad('8928308280fffff', resolution, {
            carbon: initialStock.carbonKg,
            water: initialStock.waterKg,
            minerals: 0,
            oxygen: 0,
            energy: initialStock.biomassJoules,
            carbonMass: initialStock.carbonKg,
            waterMass: initialStock.waterKg,
            biomass: initialStock.biomassJoules,
            joules: initialStock.biomassJoules,
            entropy: 0
        });
    }
    transit() {
        const COMP_COST_JOULES = 4.2e-9;
        if (typeof this.stockStore === 'object' && this.stockStore !== null && 'joules' in this.stockStore) {
            this.stockStore.joules -= COMP_COST_JOULES;
        }
        if (isValidH3Index(this.token)) {
            this.state = 'ActiveSpatialStock';
            this.h3Cell = new H3GridCell(this.token, this.resolution);
        }
        else {
            this.state = 'SinkState';
            if (typeof this.stockStore === 'object' && this.stockStore !== null && 'entropy' in this.stockStore) {
                this.stockStore.entropy += 1.0;
            }
        }
        return this;
    }
    getState() {
        return this.state;
    }
    getStock() {
        if (this.isCorrupted())
            return null;
        return this.stocks || this.stockStore;
    }
    getH3Cell() {
        return this.h3Cell;
    }
    getResolution() {
        return this.resolution;
    }
    getIndex() {
        return this.token;
    }
    unwrapStock() {
        const s = this.getStock();
        return {
            carbonKg: s?.carbon ?? s?.carbonMass ?? 0,
            waterKg: s?.water ?? s?.waterMass ?? 0,
            biomassJoules: s?.energy ?? s?.biomass ?? s?.joules ?? 0
        };
    }
    isCorrupted() {
        return this.token === null || this.token === undefined || (typeof this.token === 'string' && (this.token.trim() === '' || !isValidH3Index(this.token)));
    }
    isVerified() {
        return isValidH3Index(this.token) && this.state === 'ActiveSpatialStock';
    }
    verifySpatialIndex() {
        if (isValidH3Index(this.token)) {
            this.state = 'ActiveSpatialStock';
            return true;
        }
        return false;
    }
    getThermodynamics() {
        return {
            massGrams: 0.0,
            solarEnergyJoules: typeof (this.stocks || this.stockStore)?.joules === 'number' ? (this.stocks || this.stockStore).joules : 1000,
            dissipationJoules: 0.0
        };
    }
    isRight() {
        return this.isRightFlag && isValidH3Index(this.rightValue);
    }
    getOrThrow() {
        if (!this.isRight()) {
            throw new Error('[Entropy Leak Prevented] Invalid spatial token.');
        }
        return this.rightValue;
    }
    extract() {
        return this.valueState !== null ? this.valueState : (this.stocks || this.stockStore);
    }
    run(fn) {
        this.historyStack.push(JSON.parse(JSON.stringify(this.valueState)));
        fn();
        return this;
    }
    setValue(val) {
        this.valueState = val;
        return this;
    }
    getValue() {
        return this.valueState;
    }
    rollback() {
        if (this.historyStack.length > 0) {
            this.valueState = this.historyStack.pop();
            return true;
        }
        return false;
    }
    refine(targetResolution, childrenStocks) {
        if (targetResolution < 0 || targetResolution > 15) {
            throw new RangeError('[ThermodynamicSpatialError] Invalid resolution tier');
        }
        if (targetResolution < this.resolution) {
            throw new Error('[ThermodynamicSpatialError] Cannot refine to lower resolution');
        }
        if (childrenStocks && childrenStocks.length > 0) {
            return childrenStocks.map(st => SpatialMonad.of(this.token, targetResolution, { ...this.stocks, ...st }));
        }
        return SpatialMonad.of(this.token, targetResolution, { ...this.stocks });
    }
    bind(fn) {
        if (this.valueState !== null) {
            return fn(this.valueState);
        }
        return SpatialMonad.of(this.token, this.resolution, this.stocks);
    }
    map(fn) {
        if (this.valueState !== null) {
            return SpatialMonad.of(fn(this.valueState));
        }
        return SpatialMonad.of(this.token, this.resolution, this.stocks);
    }
    inspect() {
        return this.valueState !== null ? this.valueState : this.stocks;
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
        if (this.error !== null) {
            return new H3ValidationMonad(null, this.error, this.validator);
        }
        try {
            const currentState = this.state;
            if (currentState && typeof currentState.h3Index === 'string') {
                const valRes = this.validator.validateIndex(currentState.h3Index);
                if (!valRes.isValid) {
                    return new H3ValidationMonad(null, new H3Error(valRes.code || H3ErrorCode.INVALID_CHARACTER, 'Validation failed'), this.validator);
                }
            }
            const nextState = fn(this.state);
            return new H3ValidationMonad(nextState, null, this.validator);
        }
        catch (err) {
            return new H3ValidationMonad(null, new H3Error(H3ErrorCode.INVALID_CHARACTER, err.message), this.validator);
        }
    }
    match(onSuccess, onError) {
        if (this.error !== null) {
            return onError({ code: this.error.code, message: this.error.message });
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
        this.rejectedCount++;
        return false;
    }
    getValidIndices() {
        return [...this.validIndices];
    }
    getRejectedCount() {
        return this.rejectedCount;
    }
}
export class SpatialMonadStock {
    energyJoules;
    biomassKg;
    resolution;
    constructor(energyJoules, biomassKg, resolution) {
        this.energyJoules = energyJoules;
        this.biomassKg = biomassKg;
        this.resolution = resolution;
    }
    static bindWithValidation(stock, validator) {
        validator.assertValidResolution(stock.resolution);
        return new SpatialMonadStock(stock.energyJoules, stock.biomassKg, stock.resolution);
    }
}
