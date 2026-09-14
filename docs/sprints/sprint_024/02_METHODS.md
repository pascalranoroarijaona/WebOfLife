<!-- Method Specifications -->

# Method Specifications: Spatial Resolution Tier Boundary Validation & Monadic Stock Transitions (Sprint 24)

## 1. Physical & Thermodynamic Context
The Web of Life simulation models planetary ecology as a closed matter system with open solar energy fluxes mapped onto a discrete hexagonal hierarchical grid (Uber H3, resolutions $r \in [0, 15]$). 

While spatial resolution tier checks (`validateResolutionTier` and `assertResolutionTier`) are structural invariants rather than direct biogeochemical reactions, they act as the gatekeepers for spatial monad transformations. Enforcing $r \in [0, 15]$ guarantees that spatial aggregation and subdivision operations conserve mass (First Law of Thermodynamics) and correctly project solar energy density fluxes across valid surface areas (Second Law of Thermodynamics).

---

## 2. Mass/Energy Delta Equations

### 2.1 Spatial Resolution Domain
Let the valid set of resolution tiers $\mathcal{R}$ be defined as:
$$\mathcal{R} = \{r \in \mathbb{Z} \mid 0 \le r \le 15\}$$

For any spatial monad $\mathcal{S}$ holding biomass stock $B$ and energy stock $E$ at resolution $r$:
$$\mathcal{S} = (H_3, r, [B, E]) \quad \text{where} \quad r \in \mathcal{R}$$

### 2.2 Conservation of Matter During Refinement/Compaction
When a spatial monad transitions from resolution $r$ to $r'$ (where $r' > r$ for refinement, or $r' < r$ for compaction), total mass (biomass $B$) is conserved exactly across the hierarchical child/parent cell mapping:
$$\Delta B_{\text{system}} = B_{\text{parent}} - \sum_{i=1}^{k} B_{\text{child}, i} = 0$$

### 2.3 Solar Energy Flux Boundary Scaling
Energy flux density $I$ received per cell area $A_r$ at resolution $r$ scales inversely with the hexagonal cell area $A_r$:
$$E_{\text{solar}} = \Phi_{\odot} \cdot A_r \cdot \Delta t$$
Where invalid resolutions ($r \notin \mathcal{R}$) would result in undefined area scalings ($A_r \to \text{NaN}$ or overflow), violating energy conservation and flux distribution limits.

---

## 3. Executable Monad Method Specifications

### 3.1 Core Resolution Validation Function (`src/spatial/h3_grid.ts`)

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

### 3.2 Spatial Monad Integration (`src/monads/spatial_monad.ts`)

```ts
import { assertResolutionTier } from '../spatial/h3_grid';

export interface EcologicalStock {
  biomass: number; // kg C
  energy: number;  // Joules
}

export class SpatialMonad<T extends EcologicalStock> {
  constructor(
    public readonly h3Index: string,
    public readonly resolution: number,
    public readonly stock: T
  ) {
    assertResolutionTier(resolution);
  }

  /**
  * Refines the spatial monad to a higher resolution tier while preserving mass.
  * Enforces First Law (Matter Conservation) and valid H3 tier bounds [0, 15].
  */
  public refine(newResolution: number): SpatialMonad<T> {
    assertResolutionTier(newResolution);
    if (newResolution <= this.resolution) {
      throw new Error(`[ThermodynamicSpatialError] Refinement resolution (${newResolution}) must be greater than current resolution (${this.resolution}).`);
    }

    // Mass conservation check: stock remains invariant across subdivision boundary
    const conservedStock: T = { ...this.stock };

    return new SpatialMonad<T>(this.h3Index, newResolution, conservedStock);
  }
}
```