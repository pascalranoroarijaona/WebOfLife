import { H3ErrorCode } from '../spatial/h3_types';
import { assertValidH3Resolution, guardH3Payload, isValidH3Index } from '../spatial/h3_grid';
export class SpatialMonad {
    h3Index;
    stocks;
    trophicEnergyStockJoules;
    value;
    runValue = null;
    history = [];
    stock;
    resolution;
    constructor(h3Index = null, resolution = 4, stocks = { carbon: 0, water: 0, minerals: 0, energy: 0 }, trophicEnergyStockJoules = 0, value = null) {
        this.h3Index = h3Index;
        this.stocks = stocks;
        this.trophicEnergyStockJoules = trophicEnergyStockJoules;
        this.value = value;
        assertValidH3Resolution(resolution);
        this.resolution = resolution;
        this.runValue = value;
        const c = stocks.carbon ?? stocks.carbonMass ?? 0;
        const w = stocks.water ?? stocks.waterMass ?? 0;
        const m = stocks.minerals ?? 0;
        const e = stocks.energy ?? stocks.biomass ?? 0;
        const b = stocks.biomass ?? stocks.energy ?? 0;
        this.stock = {
            carbon: c,
            water: w,
            minerals: m,
            oxygen: stocks.oxygen ?? 0,
            energy: e,
            carbonMass: stocks.carbonMass ?? c,
            waterMass: stocks.waterMass ?? w,
            biomass: b
        };
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
        return new SpatialMonad(validated, resolution, stocks, e, validated);
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
    refine(targetResolution, subCellAllocations) {
        assertValidH3Resolution(targetResolution);
        if (targetResolution < this.resolution) {
            throw new Error(`[ThermodynamicSpatialError] Cannot refine to a lower resolution.`);
        }
        if (!subCellAllocations) {
            return new SpatialMonad(this.h3Index, targetResolution, { ...this.stocks }, this.trophicEnergyStockJoules, this.value);
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
            ...this.stocks,
            carbonMass: this.stocks.carbon,
            waterMass: this.stocks.water,
            biomass: this.stocks.biomass ?? this.stocks.energy
        };
    }
    unwrapStock() {
        return {
            carbonKg: this.stocks.carbon,
            waterKg: this.stocks.water,
            biomassJoules: this.stocks.energy
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
        return !this.isCorrupted();
    }
    getOrThrow() {
        if (this.isCorrupted()) {
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
export function createSpatialMonad(h3Index, energyJoules) {
    const valid = guardH3Payload(h3Index);
    if (!isValidH3Index(valid)) {
        throw new Error("ThermodynamicViolation: Invalid H3 index.");
    }
    return { h3Index: valid, trophicEnergyStockJoules: energyJoules };
}
