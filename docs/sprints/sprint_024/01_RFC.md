# Request for Comments (RFC): Sprint 24
## Spatial Resolution Tier (0-15) Boundary Check Function Specification

**Author:** Chief Systems Architect  
**Status:** Approved  
**Target Module:** `src/spatial/h3_grid.ts`  
**Compliance:** First & Second Law of Thermodynamics (Matter Conservation & Solar-Driven Energy Flux)

---

### 1. Executive Summary & Sprint Goal

Sprint 24 implements the formal resolution tier boundary check function within `src/spatial/h3_grid.ts`. Uber's H3 hierarchical hexagonal spatial index system defines discrete global grid systems across 16 explicit resolution tiers ($r \in [0, 15]$). As the Web of Life simulation engine maps ecological trophic dynamics, spatial monad stock transitions, and energy distribution across the planetary crust, validating spatial resolution bounds is critical for preventing index corruption, spatial overflow, and unphysical gradient computations.

This RFC outlines the class hierarchy additions, interface contracts, monadic state transitions, and thermodynamic boundary constraints governing the new resolution tier validation logic.

---

### 2. Architectural Context & Repository Integration

The Web of Life simulation architecture models Earth as a closed thermodynamic system (matter conserved, external solar flux input exclusively) subdivided into discrete spatial cells via H3 indexing. 

```
┌────────────────────────────────────────────────────────┐
│                      Earth Pod                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Spatial Monad Stock                 │  │
│  │  - Energy (Joules, Solar Derived)                │  │
│  │  - Biomass (Matter Conservation Enforced)        │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           ▼                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │          H3 Grid & Resolution Tier (0-15)        │  │
│  │  - validateResolutionTier(resolution)            │  │
│  │  - H3CellBoundaries                              │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

#### Files Modified/Created:
- **`src/spatial/h3_types.ts`**: Core type definitions for H3 indices and resolution bounds.
- **`src/spatial/h3_grid.ts`**: Addition of `validateResolutionTier(resolution: number): boolean` and associated guard utilities.
- **`src/monads/spatial_monad.ts`**: Integration of tier validation into spatial monad operations.
- **`tests/sprint_024.test.ts`**: Comprehensive test suite validating boundary conditions ($r < 0, r > 15$, non-integers).

---

### 3. Class Hierarchy & Interface Contracts

To maintain incremental and object-oriented design principles without rewriting existing infrastructure, we introduce a strongly typed validation layer extending our spatial abstractions.

#### 3.1 Interface Definition (`src/spatial/h3_types.ts`)

```ts
export type H3Resolution = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export interface SpatialGridConstraints {
  minResolution: number;
  maxResolution: number;
  isValidResolution(res: number): res is H3Resolution;
}
```

#### 3.2 Core Function Specification (`src/spatial/h3_grid.ts`)

```ts
import { H3Resolution, SpatialGridConstraints } from './h3_types';

/**
 * Validates whether a given numeric resolution falls within the valid H3 tier range [0, 15].
 * Ensures discrete spatial indexing integrity across planetary trophic simulations.
 * 
 * @param resolution - Numeric tier to evaluate
 * @returns boolean - True if resolution is an integer between 0 and 15 inclusive
 */
export function validateResolutionTier(resolution: number): resolution is H3Resolution {
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

/**
 * Asserts spatial resolution validity, throwing an explicit thermodynamic/spatial error if violated.
 */
export function assertResolutionTier(resolution: number): asserts resolution is H3Resolution {
  if (!validateResolutionTier(resolution)) {
    throw new Error(`[SpatialError] Invalid H3 resolution tier: ${resolution}. Must be an integer between 0 and 15.`);
  }
}
```

---

### 4. Monad Stock Transitions & Thermodynamic Compliance

#### 4.1 Monadic State Wrapper (`src/monads/spatial_monad.ts`)
Spatial monads (`SpatialMonad<T>`) encapsulate ecological stocks (energy $E$, biomass $B$) tied to specific H3 indices and resolutions. When transforming spatial states across resolutions (e.g., compaction or refinement), the resolution tier must be strictly validated.

- **First Law (Matter Conservation):** Biomass and chemical elements within spatial monad stocks cannot be created or destroyed during resolution scaling; they must sum exactly across child/parent cell transitions.
- **Second Law (Solar Input Only):** Energy influxes are restricted to solar radiation vectors mapped onto valid surface H3 cells at resolutions $\le 15$. Dissipation occurs via thermal radiation.

```ts
export class SpatialMonad<T> {
  constructor(
    public readonly h3Index: string,
    public readonly resolution: number,
    public readonly stock: T
  ) {
    assertResolutionTier(resolution);
  }

  public refine(newResolution: number): SpatialMonad<T> {
    assertResolutionTier(newResolution);
    if (newResolution <= this.resolution) {
      throw new Error(`[ThermodynamicSpatialError] Refinement resolution must be greater than current resolution.`);
    }
    // Execution of mass-conserving spatial subdivision...
    return new SpatialMonad(this.h3Index, newResolution, this.stock);
  }
}
```

---

### 5. Verification & Testing Strategy

Sprint 24 validation criteria (`tests/sprint_024.test.ts`):
1. **Lower Bound Validation:** Verify `validateResolutionTier(0)` returns `true`. Verify `validateResolutionTier(-1)` returns `false` and throws via `assertResolutionTier`.
2. **Upper Bound Validation:** Verify `validateResolutionTier(15)` returns `true`. Verify `validateResolutionTier(16)` returns `false`.
3. **Type & Granularity Check:** Verify non-integer resolutions (e.g., `3.5`, `NaN`, `Infinity`) fail validation.
4. **Monad Integration:** Verify `SpatialMonad` instantiation and refinement correctly intercept invalid tiers.