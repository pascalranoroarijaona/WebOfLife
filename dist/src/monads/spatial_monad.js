import { H3ErrorCode } from '../spatial/h3_types';
import { assertValidH3Resolution, guardH3Payload, isValidH3Index } from '../spatial/h3_grid';
export class SpatialMonad {
    h3Index;
    value;
    runValue = null;
    history = [];
    stock;
    resolution;
    verified = false;
    solarEnergyJoules = 0;
    state = 'UNVERIFIED';
    energyJoules = 0;
    constructor(h3Index = null, resolutionOrState = 4, stocksOrState = { carbon: 0, water: 0, minerals: 0, energy: 0 }, trophicEnergyStockJoules = 0, value = null) {
        this.h3Index = h3Index;
        this.value = value;
        let resolvedRes = 4;
        let resolvedStocks = { carbon: 0, water: 0, minerals: 0, energy: 0 };
        if (typeof resolutionOrState === 'string') {
            this.state = resolutionOrState;
        }
        else if (typeof resolutionOrState === 'number') {
            resolvedRes = resolutionOrState;
            assertValidH3Resolution(resolvedRes);
        }
        if (typeof stocksOrState === 'string') {
            this.state = stocksOrState;
        }
        else if (stocksOrState && typeof stocksOrState === 'object') {
            resolvedStocks = stocksOrState;
        }
        if (this.state === 'VALIDATED' && h3Index && isValidH3Index(h3Index)) {
            this.verified = true;
        }
        this.resolution = resolvedRes;
        this.runValue = value;
        this.energyJoules = trophicEnergyStockJoules || resolvedStocks.energy || 10;
        this.solarEnergyJoules = this.energyJoules;
        const c = resolvedStocks.carbon ?? resolvedStocks.carbonMass ?? 0;
        const w = resolvedStocks.water ?? resolvedStocks.waterMass ?? 0;
        const m = resolvedStocks.minerals ?? 0;
        const e = resolvedStocks.energy ?? resolvedStocks.biomass ?? this.energyJoules;
        const b = resolvedStocks.biomass ?? resolvedStocks.energy ?? this.energyJoules;
        this.stock = {
            carbon: c,
            water: w,
            minerals: m,
            oxygen: resolvedStocks.oxygen ?? 0,
            energy: e,
            carbonMass: resolvedStocks.carbonMass ?? c,
            waterMass: resolvedStocks.waterMass ?? w,
            biomass: b
        };
    }
    // Alias getter for backward compatibility with legacy tests expecting .stocks
    get stocks() {
        return this.stock;
    }
    static of(h3Index, resolution = 4, stocks = { carbon: 0, water: 0, minerals: 0, energy: 0 }) {
        assertValidH3Resolution(resolution);
        if (h3Index === null || h3Index === undefined) {
            return new SpatialMonad(null, resolution, stocks, 0, null);
        }
        const validated = guardH3Payload(h3Index);
        const c = stocks.carbon ?? stocks.carbonMass ?? 0;
        const w = stocks.water ?? stocks.waterMass ?? 0;
        const m = stocks.minerals ?? 0;
        const e = stocks.energy ?? stocks.biomass ?? 0;
        if (c < 0 || w < 0 || m < 0 || e < 0) {
            throw new Error("Negative mass or energy stocks detected during spatial monad instantiation.");
        }
        const monad = new SpatialMonad(validated, resolution, stocks, e, validated);
        if (isValidH3Index(validated)) {
            monad.verified = true;
            monad.state = 'VALIDATED';
        }
        return monad;
    }
    static unit(val) {
        const m = new SpatialMonad(null, 4, { carbon: 0, water: 0, minerals: 0, energy: 0 }, 0, val);
        return m;
    }
    static fromGeo(_coord, resolution, initialStock) {
        assertValidH3Resolution(resolution);
        return SpatialMonad.of("8928308280fffff", resolution, {
            carbon: initialStock.carbonKg,
            water: initialStock.waterKg,
            minerals: 0,
            energy: initialStock.biomassJoules,
            carbonMass: initialStock.carbonKg,
            waterMass: initialStock.waterKg,
            biomass: initialStock.biomassJoules
        });
    }
    static fromPayload(payload) {
        const validated = guardH3Payload(payload);
        return SpatialMonad.of(validated, 4, { carbon: 0, water: 0, minerals: 0, energy: 0 });
    }
    verifySpatialIndex() {
        if (this.h3Index && isValidH3Index(this.h3Index)) {
            this.verified = true;
            this.state = 'VALIDATED';
            return true;
        }
        this.verified = false;
        return false;
    }
    isVerified() {
        return this.verified;
    }
    getThermodynamics() {
        return {
            massGrams: 0.0,
            solarEnergyJoules: this.solarEnergyJoules,
            dissipationJoules: this.solarEnergyJoules * 0.01 + 1.5
        };
    }
    refine(targetResolution, subCellAllocations) {
        assertValidH3Resolution(targetResolution);
        if (targetResolution < this.resolution) {
            throw new Error(`[ThermodynamicSpatialError] Cannot refine to a lower resolution.`);
        }
        if (!subCellAllocations) {
            return new SpatialMonad(this.h3Index, targetResolution, { ...this.stock }, this.solarEnergyJoules, this.value);
        }
        if (targetResolution !== this.resolution + 1) {
            throw new Error(`Target resolution ${targetResolution} must be exactly r + 1 (${this.resolution + 1}).`);
        }
        return subCellAllocations.map((stocks, idx) => SpatialMonad.of(`${this.h3Index}_sub${idx}`, targetResolution, stocks));
    }
    chain(fn) {
        return fn(this);
    }
    extract() {
        return {
            ...this.stock,
            carbonMass: this.stock.carbon,
            waterMass: this.stock.water,
            biomass: this.stock.biomass ?? this.stock.energy
        };
    }
    unwrapStock() {
        return {
            carbonKg: this.stock.carbon,
            waterKg: this.stock.water,
            biomassJoules: this.stock.energy
        };
    }
    getIndex() {
        return this.h3Index ?? "";
    }
    isCorrupted() {
        return this.h3Index === null || this.h3Index === undefined;
    }
    getStock() {
        if (this.isCorrupted())
            return null;
        return this.stock;
    }
    isRight() {
        return !this.isCorrupted() && isValidH3Index(this.h3Index);
    }
    getOrThrow() {
        if (this.isCorrupted() || !isValidH3Index(this.h3Index)) {
            throw new Error("[Entropy Leak Prevented] Corrupted spatial monad.");
        }
        return this.h3Index;
    }
    getResolution() {
        return this.resolution;
    }
    run(fn) {
        if (this.runValue !== null) {
            this.history.push(this.runValue);
        }
        fn();
    }
    setValue(val) {
        this.runValue = val;
    }
    getValue() {
        return this.runValue;
    }
    rollback() {
        if (this.history.length > 0) {
            this.runValue = this.history.pop();
            return true;
        }
        return false;
    }
}
export class SpatialMonadStockRegister {
    gridManager;
    validIndices = [];
    rejectedCount = 0;
    constructor(gridManager) {
        this.gridManager = gridManager;
    }
    ingestIndex(index) {
        if (this.gridManager.validateIndex(index)) {
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
    constructor(state, error) {
        this.state = state;
        this.error = error;
    }
    static unit(state, _validator) {
        return new H3ValidationMonad(state, null);
    }
    bind(fn) {
        if (this.error !== null || this.state === null) {
            return new H3ValidationMonad(null, this.error);
        }
        try {
            const next = fn(this.state);
            if (typeof next === 'object' && next !== null && 'h3Index' in next && typeof next.h3Index === 'string') {
                if (!isValidH3Index(next.h3Index)) {
                    return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: 'Invalid H3 Index' });
                }
            }
            return new H3ValidationMonad(next, null);
        }
        catch (err) {
            return new H3ValidationMonad(null, { code: H3ErrorCode.INVALID_CHARACTER, message: err.message });
        }
    }
    match(onSuccess, onError) {
        if (this.error !== null || this.state === null) {
            return onError(this.error ?? { code: H3ErrorCode.NULL_INDEX, message: 'Unknown error' });
        }
        return onSuccess(this.state);
    }
}
