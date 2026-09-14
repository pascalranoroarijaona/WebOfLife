# RFC 021: Spatial Resolution Tier (0-15) Boundary Check

**Status:** Draft  
**Author:** Chief Systems Architect  
**Date:** Current Sprint  
**Target Module:** `src/spatial/h3_grid.ts`  

---

## 1. Executive Summary

As part of the continuous evolution of the Web of Life spatial subsystem, Sprint 21 focuses on establishing strict resolution tier validation bounds for the H3 hexagonal hierarchical spatial index. Uber's H3 index supports discrete global grid resolutions ranging from tier `0` (coarsest cells covering continental areas) to tier `15` (finest cells sub-meter precision). 

This RFC specifies the technical contract, class hierarchies, monad stock transitions, and interface definitions required to implement the resolution tier boundary check function within `src/spatial/h3_grid.ts`.

---

## 2. Thermodynamic & Spatial Conservation Laws

In alignment with the core principles of Web of Life:
1. **First Law of Thermodynamics (Matter Conservation):** Spatial indexing and resolution mapping do not create or destroy matter. Hexagonal cells represent bounded volumes/surfaces of the planetary envelope. Partitioning or aggregating resolution tiers preserves total surface area summation across closed spatial manifolds.
2. **Second Law & Solar Input:** Information entropy within the spatial indexing monads must remain bounded. Resolution tier boundaries act as informational constraints ensuring that energy dissipation and state tracking at finer resolutions (e.g., tier 15 metabolic activity) map deterministically to coarser climatic tiers (e.g., tier 0 planetary cells) without uncontrolled variance or memory leaks.

---

## 3. Class Hierarchy & Interface Additions

The incremental design builds directly upon existing structures in `src/spatial/h3_types.ts` and `src/spatial/h3_adjacency.ts`.

### 3.1 Interface Contracts

```typescript
export interface IResolutionTierValidator {
  validateResolution(resolution: number): boolean;
  assertValidResolution(resolution: number): asserts resolution is H3ResolutionTier;
}

export type H3ResolutionTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
```

### 3.2 Class Additions: `H3GridManager`

We introduce/extend the `H3GridManager` class within `src/spatial/h3_grid.ts`:

```typescript
export class H3GridManager implements IResolutionTierValidator {
  private static readonly MIN_RESOLUTION = 0;
  private static readonly MAX_RESOLUTION = 15;

  /**
   * Validates whether a given integer is within the H3 resolution tier bounds [0, 15].
   */
  public validateResolution(resolution: number): boolean {
    return (
      Number.isInteger(resolution) &&
      resolution >= H3GridManager.MIN_RESOLUTION &&
      resolution <= H3GridManager.MAX_RESOLUTION
    );
  }

  /**
   * Asserts resolution validity, throwing a descriptive RangeError on violation.
   */
  public assertValidResolution(resolution: number): asserts resolution is H3ResolutionTier {
    if (!this.validateResolution(resolution)) {
      throw new RangeError(
        `Invalid H3 resolution tier: ${resolution}. Resolution must be an integer between ${H3GridManager.MIN_RESOLUTION} and ${H3GridManager.MAX_RESOLUTION}.`
      );
    }
  }
}
```

---

## 4. Monad Stock Transitions (`SpatialMonad`)

The `SpatialMonad` (`src/monads/spatial_monad.ts`) wraps spatial operations. With the boundary check function in place, monad transformations crossing resolution tiers must pass validation gates:

```
[Unchecked Spatial State] 
       │
       ▼
{ H3GridManager.assertValidResolution() }
       │
       ├─► [Valid: Resolution Tier 0-15] ──► [Transformed Spatial Monad Stock]
       │
       └─► [Invalid: Out of Bounds] ────► [Monad Failure / Error State]
```

---

## 5. Verification & Testing Plan

1. **Unit Tests (`tests/sprint_021.test.ts`):**
   - Test boundary values (`0` and `15`) return `true`.
   - Test interior values (`1` through `14`) return `true`.
   - Test lower-bound violations (`< 0`, e.g., `-1`, `-5`) throw `RangeError`.
   - Test upper-bound violations (`> 15`, e.g., `16`, `100`) throw `RangeError`.
   - Test non-integer and float inputs (`1.5`, `NaN`, `Infinity`) throw `RangeError` or return `false`.

2. **Integration Audit:**
   - Verify compatibility with trophic energy distribution across grid cells (`src/biosphere/trophic.ts`).