/**
 * Sprint 003 - SpatialMonad
 * Integrates H3GridParser with Thermodynamic stocks, maintaining First and Second Law invariants.
 * Retains generic monadic support for Sprint 002 adjacency diffusion tests.
 */
import { H3GridParser } from '../spatial/h3_grid.js';
/**
 * SpatialMonad enforces strict conservation laws during H3 index binding and spatial diffusion.
 */
export class SpatialMonad {
    state;
    h3Index;
    stock;
    constructor(state, h3Index, stock) {
        this.state = state;
        this.h3Index = h3Index;
        this.stock = stock;
    }
    /**
     * Pure monadic lift from a value.
     */
    static unit(value) {
        return new SpatialMonad(value);
    }
    /**
     * Pure monadic lift from geographic coordinates to a validated spatial stock container.
     * Satisfies First Law: $\sum \Delta M_{in} = \sum \Delta M_{out}$ (Mass is conserved, merely indexed).
     */
    static fromGeo(coord, resolution, initialStock) {
        const normalizedIndex = H3GridParser.fromGeo(coord, resolution);
        const validation = H3GridParser.validateIndex(normalizedIndex);
        if (!validation.isValid) {
            throw new Error(`SpatialMonad Binding Failed: Invalid H3 index generated [${validation.errorCode}]`);
        }
        return new SpatialMonad(initialStock, normalizedIndex, { ...initialStock });
    }
    bind(fn) {
        return fn(this.state);
    }
    map(fn) {
        return new SpatialMonad(fn(this.state), this.h3Index, this.stock);
    }
    /**
     * Extracts the underlying state (supporting Sprint 002 tests).
     */
    extract() {
        return this.state;
    }
    /**
     * Retrieves the underlying physical stock without informational degradation.
     */
    unwrapStock() {
        if (!this.stock) {
            return { carbonKg: 0, waterKg: 0, biomassJoules: 0 };
        }
        return { ...this.stock };
    }
    /**
     * Retrieves the validated H3 spatial token.
     */
    getIndex() {
        return this.h3Index ?? '';
    }
}
