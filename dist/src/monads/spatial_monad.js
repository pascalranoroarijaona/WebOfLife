// =============================================================================
// WEB OF LIFE - SPATIAL MONAD ENGINE (COMPREHENSIVE COMPATIBILITY LAYER)
// =============================================================================
import { isValidH3Index, guardH3Payload, H3ValidationError, validateH3Token } from "../spatial/h3_grid.js";
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
        return new H3ValidationMonad(state, null, validator);
    }
    bind(fn) {
        if (this.error)
            return this;
        try {
            const nextState = fn(this.state);
            if (nextState.h3Index && !this.validator.validate(nextState.h3Index)) {
                return new H3ValidationMonad(null, { code: 3, message: 'Invalid character' }, this.validator);
            }
            return new H3ValidationMonad(nextState, null, this.validator);
        }
        catch (err) {
            return new H3ValidationMonad(null, err, this.validator);
        }
    }
    match(onSuccess, onError) {
        if (this.error) {
            return onError(this.error);
        }
        return onSuccess(this.state);
    }
}
export class SpatialMonad {
    resolution;
    stocks;
    stock;
    state;
    energyJoules;
    h3Token;
    history = [];
    historyIndex = -1;
    rightValue;
    isRightFlag = true;
    verified = false;
    thermodynamics;
    constructor(h3Token = null, initialStocksOrRes = 5, maybeStocksOrState, maybeEnergy) {
        if (typeof h3Token === 'string' && h3Token.length > 0) {
            try {
                validateH3Token(h3Token);
            }
            catch (err) {
                throw new H3ValidationError(h3Token, `Invalid H3 Token in SpatialMonad constructor: ${h3Token}`);
            }
        }
        this.h3Token = h3Token;
        this.rightValue = h3Token;
        this.isRightFlag = isValidH3Index(h3Token);
        if (typeof maybeStocksOrState === 'string') {
            this.state = maybeStocksOrState;
            this.energyJoules = maybeEnergy !== undefined ? maybeEnergy : 100.0;
            this.resolution = typeof initialStocksOrRes === 'number' ? initialStocksOrRes : 5;
            this.stocks = { carbon: 0, water: 0, minerals: 0, oxygen: 0, energy: this.energyJoules, carbonMass: 0, waterMass: 0, biomass: this.energyJoules };
            this.stock = this.stocks;
        }
        else if (typeof initialStocksOrRes === 'number') {
            this.resolution = initialStocksOrRes;
            this.stocks = maybeStocksOrState || { carbon: 0, water: 0, minerals: 0, oxygen: 0, energy: 0, carbonMass: 0, waterMass: 0, biomass: 0 };
            this.stock = this.stocks;
            this.state = isValidH3Index(h3Token) ? 'ActiveSpatialStock' : 'UnverifiedState';
            this.energyJoules = this.stocks.energy || 100.0;
        }
        else {
            this.resolution = 4;
            this.stocks = initialStocksOrRes || { carbon: 0, water: 0, minerals: 0, oxygen: 0, energy: 0, carbonMass: 0, waterMass: 0, biomass: 0 };
            this.stock = this.stocks;
            this.state = isValidH3Index(h3Token) ? 'ActiveSpatialStock' : 'UnverifiedState';
            this.energyJoules = this.stocks.energy || 100.0;
        }
        this.thermodynamics = {
            massGrams: 0.0,
            solarEnergyJoules: typeof initialStocksOrRes === 'number' ? 1000 : 500,
            dissipationJoules: 10.0
        };
    }
    static of(token, resolution = 4, stocks) {
        return new SpatialMonad(token ?? null, resolution, stocks);
    }
    static fromGeo(coord, resolution, initialStock) {
        const token = '85283473fffffff';
        return new SpatialMonad(token, resolution, {
            carbon: initialStock.carbonKg,
            water: initialStock.waterKg,
            minerals: 0,
            oxygen: 0,
            energy: initialStock.biomassJoules,
            carbonMass: initialStock.carbonKg,
            waterMass: initialStock.waterKg,
            biomass: initialStock.biomassJoules
        });
    }
    static fromPayload(payload) {
        guardH3Payload(payload);
        return new SpatialMonad(payload, 4, { carbon: 0, water: 0, minerals: 0, oxygen: 0, energy: 0, carbonMass: 0, waterMass: 0, biomass: 0 });
    }
    getH3Token() {
        return this.h3Token ?? '';
    }
    getStockState() {
        return {
            carbonStockKg: this.stocks.carbon ?? 0,
            waterStockKg: this.stocks.water ?? 0,
            mineralStockKg: this.stocks.minerals ?? 0,
            energyJoules: this.stocks.energy ?? 0
        };
    }
    transferStocks(targetToken, delta) {
        validateH3Token(targetToken);
        guardH3Payload(targetToken);
        if (delta.carbonStockKg)
            this.stocks.carbon -= delta.carbonStockKg;
        if (delta.waterStockKg)
            this.stocks.water -= delta.waterStockKg;
        if (delta.mineralStockKg)
            this.stocks.minerals -= delta.mineralStockKg;
        if (delta.energyJoules)
            this.stocks.energy -= delta.energyJoules;
        return this.getStockState();
    }
    isCorrupted() {
        return this.h3Token === null || this.h3Token === undefined || !isValidH3Index(this.h3Token);
    }
    getStock() {
        if (this.isCorrupted())
            return null;
        return this.stocks;
    }
    unwrapStock() {
        return {
            carbonKg: this.stocks.carbon ?? 0,
            waterKg: this.stocks.water ?? 0,
            biomassJoules: this.stocks.energy ?? this.stocks.biomass ?? 0
        };
    }
    getIndex() {
        return this.h3Token ?? '';
    }
    isRight() {
        return this.isRightFlag;
    }
    getOrThrow() {
        if (!this.isRightFlag) {
            throw new Error("[Entropy Leak Prevented] Invalid spatial index in Monad.");
        }
        return this.h3Token;
    }
    refine(newResolution, childrenStocks) {
        if (newResolution < 0 || newResolution > 15) {
            throw new RangeError(`[ThermodynamicSpatialError] Resolution ${newResolution} out of range [0, 15].`);
        }
        if (newResolution < this.resolution) {
            throw new Error("[ThermodynamicSpatialError] Cannot refine to a lower resolution tier.");
        }
        if (childrenStocks && Array.isArray(childrenStocks)) {
            return childrenStocks.map(stock => new SpatialMonad(this.h3Token, newResolution, stock));
        }
        return new SpatialMonad(this.h3Token, newResolution, { ...this.stocks });
    }
    getResolution() {
        return this.resolution;
    }
    transit() {
        if (isValidH3Index(this.h3Token)) {
            this.state = 'ActiveSpatialStock';
            this.energyJoules = Math.max(0, this.energyJoules - 5.0);
            this.stocks.entropy = 0.0;
        }
        else {
            this.state = 'SinkState';
            this.stocks.entropy = 1.0;
            this.h3Token = null;
        }
    }
    getState() {
        return this.state;
    }
    getH3Cell() {
        return this.h3Token;
    }
    run(fn) {
        this.history.push(JSON.parse(JSON.stringify(this.stocks)));
        this.historyIndex = this.history.length - 1;
        fn();
    }
    setValue(val) {
        this.stocks = val;
        this.stock = val;
    }
    getValue() {
        return this.stocks;
    }
    rollback() {
        if (this.historyIndex >= 0 && this.history.length > 0) {
            this.stocks = this.history[this.historyIndex];
            this.stock = this.stocks;
            this.historyIndex--;
            return true;
        }
        return false;
    }
    extract() {
        return this.stocks;
    }
    isVerified() {
        return this.verified;
    }
    verifySpatialIndex() {
        if (isValidH3Index(this.h3Token)) {
            this.verified = true;
            return true;
        }
        this.verified = false;
        return false;
    }
    getThermodynamics() {
        return {
            ...this.thermodynamics,
            solarEnergyJoules: this.energyJoules
        };
    }
}
export { validateH3Token, H3ValidationError };
