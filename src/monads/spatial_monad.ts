/**
 * src/monads/spatial_monad.ts
 * Spatial Monad implementation for H3 adjacency state transformations.
 */

export class SpatialMonad<T> {
    private constructor(private readonly state: T) {}

    public static unit<T>(value: T): SpatialMonad<T> {
        return new SpatialMonad(value);
    }

    public bind<U>(fn: (val: T) => SpatialMonad<U>): SpatialMonad<U> {
        return fn(this.state);
    }

    public map<U>(fn: (val: T) => U): SpatialMonad<U> {
        return new SpatialMonad(fn(this.state));
    }

    public extract(): T {
        return this.state;
    }
}