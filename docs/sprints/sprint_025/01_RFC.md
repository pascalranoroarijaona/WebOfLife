# Request for Comments (RFC) - Sprint 025: Resolution Tier (0-15) Boundary Check Function

## 1. Overview & Sprint Goal
Sprint 025 introduces the formal resolution tier boundary check function within `src/spatial/h3_grid.ts`. Uber's H3 hierarchical hexagonal spatial index supports resolutions ranging explicitly from `0` (coarsest global partitioning across 122 base cells) to `15` (finest localized resolution tier). This sprint establishes strict validation protocols for spatial operations, ensuring that all spatial indexing, monad state transitions, and neighbor adjacency lookups operate strictly within valid H3 resolution boundaries.

---

## 2. Architectural Placement & Repository Impact
- **Target File:** `src/spatial/h3_grid.ts`
- **Supporting Interfaces:** `src/spatial/h3_types.ts`
- **Monad Integration:** `src/monads/spatial_monad.ts`
- **Thermodynamic Compliance:** Spatial discretization routines preserve matter conservation (Law 1) and restrict energy imports strictly to solar radiation fluxes (Law 2), preventing arbitrary spatial dimension scaling without corresponding energy cost models.

---

## 3. Class Hierarchy & Interface Contracts

### 3.1 Resolution Validation Interface (`src/spatial/h3_types.ts`)
```typescript
export type H3Resolution = 
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 
  | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export interface SpatialResolutionValidator {
  isValidResolution(resolution: number): resolution is H3Resolution;
  assertValidResolution(resolution: number): asserts resolution is H3Resolution;
}
```

### 3.2 Core Boundary Check Function (`src/spatial/h3_grid.ts`)
```typescript
import { H3Resolution, SpatialResolutionValidator } from './h3_types';

/**
 * Validates whether an integer falls within the allowable H3 resolution tier bounds [0, 15].
 * 
 * @param resolution - The numerical resolution tier to test.
 * @returns True if the resolution is between 0 and 15 inclusive, false otherwise.
 */
export function isValidH3Resolution(resolution: number): resolution is H3Resolution {
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

/**
 * Asserts that a given resolution is valid, throwing an informative RangeError if out of bounds.
 * 
 * @param resolution - The numerical resolution tier to assert.
 * @throws RangeError if resolution is outside [0, 15].
 */
export function assertValidH3Resolution(resolution: number): asserts resolution is H3Resolution {
  if (!isValidH3Resolution(resolution)) {
    throw new RangeError(`Invalid H3 resolution tier: ${resolution}. Resolution must be an integer between 0 and 15.`);
  }
}
```

---

## 4. Monad Stock Transitions & Thermodynamic Constraints
- **SpatialMonad Integration:** Monadic wrapping of spatial indices must execute `assertValidH3Resolution` upon instantiation or transformation (e.g., `compact`, `uncompact`, `neighbor`).
- **Energy Conservation:** Spatial refinement (increasing resolution tier from $r$ to $r+1$) scales hexagonal area by approximately $\approx 7$, requiring proportional metabolic/trophic energy allocation within `src/biosphere/trophic.ts`.

---

## 5. Test Plan & Verification
- **Test File:** `tests/sprint_025.test.ts`
- **Verification Matrix:**
  1. Validate boundary integers `0` and `15` return `true`.
  2. Validate mid-tier integers (e.g., `7`, `8`) return `true`.
  3. Validate negative integers (`-1`) and out-of-bounds integers (`16`, `100`) return `false`.
  4. Validate floating-point inputs (`3.14`) throw or return `false`.
  5. Verify assertion function throws `RangeError` on invalid bounds.