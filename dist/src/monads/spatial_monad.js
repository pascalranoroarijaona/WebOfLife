/**
 * src/monads/spatial_monad.ts
 * Spatial Monad implementation for H3 adjacency state transformations.
 */
export class SpatialMonad {
    state;
    constructor(state) {
        this.state = state;
    }
    static unit(value) {
        return new SpatialMonad(value);
    }
    bind(fn) {
        return fn(this.state);
    }
    map(fn) {
        return new SpatialMonad(fn(this.state));
    }
    extract() {
        return this.state;
    }
}
