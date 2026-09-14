import { H3GridParser } from '../spatial/h3_grid.js';
export class SpatialMonad {
    value;
    history = [];
    h3Index;
    stock;
    constructor(initialValue, h3Index, stock) {
        if (initialValue instanceof Map) {
            this.value = new Map(initialValue);
        }
        else {
            this.value = initialValue;
        }
        this.h3Index = h3Index;
        this.stock = stock;
    }
    static unit(value) {
        return new SpatialMonad(value);
    }
    static fromGeo(coord, resolution, initialStock) {
        const indexStr = H3GridParser.fromGeo(coord, resolution);
        const stock = initialStock ?? { carbonKg: 1000, waterKg: 50000, biomassJoules: 250000 };
        return new SpatialMonad(stock, indexStr, stock);
    }
    getIndex() {
        return this.h3Index ?? '831f18fffffffff';
    }
    unwrapStock() {
        return this.stock ?? { carbonKg: 0, waterKg: 0, biomassJoules: 0 };
    }
    run(computation) {
        if (this.value instanceof Map) {
            this.history.push(new Map(this.value));
        }
        else {
            this.history.push(this.value);
        }
        computation();
        return this;
    }
    map(mapper) {
        const newValue = mapper(this.value);
        return new SpatialMonad(newValue, this.h3Index, this.stock);
    }
    flatMap(mapper) {
        return mapper(this.value);
    }
    getValue() {
        return this.value;
    }
    setValue(newValue) {
        if (this.value instanceof Map) {
            this.history.push(new Map(this.value));
        }
        else {
            this.history.push(this.value);
        }
        this.value = newValue;
    }
    extract() {
        return this.value;
    }
    rollback() {
        const prev = this.history.pop();
        if (prev !== undefined) {
            this.value = prev;
            return true;
        }
        return false;
    }
}
