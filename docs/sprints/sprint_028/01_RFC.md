# Request For Comments (RFC) - Sprint 028
## Resolution Tier (0-15) Boundary Check Function Specification

**Author:** Chief Systems Architect  
**Status:** Approved / Implementing  
**Target Module:** `src/spatial/h3_grid.ts`  
**Related Sprints:** Sprint 027, Sprint 029  

---

### 1. Executive Summary & Sprint Goal

Sprint 028 introduces the formal resolution tier boundary check function within the spatial grid subsystem (`src/spatial/h3_grid.ts`). The Uber H3 spatial indexing system utilized by the Web of Life simulation engine defines valid hierarchical resolution tiers strictly from `0` (coarsest global macro-cells) to `15` (finest micro-cells). 

Ensuring absolute adherence to these bounds is vital for maintaining spatial monad integrity, preventing out-of-range indexing errors during trophic energy diffusion across spatial cells, and strictly preserving the thermodynamic conservation laws across discrete spatial boundaries.

---

### 2. Architectural Context & Monad Stock Transitions

The Web of Life simulation models the Earth's biosphere using discrete spatial monads (`SpatialMonad`) layered over an H3 hexagonal grid. 

* **Matter Conservation (First Law):** Energy and biomass states held within spatial monads cannot be created or destroyed when transitioning between resolution tiers or querying adjacency. Boundary checks guarantee that spatial operations never query non-existent or out-of-bound H3 indices.
* **Solar Input Only (Second Law):** External thermodynamic driving forces enter exclusively through root solar flux vectors mapped to valid H3 base cells (Resolution 0). Validating tier boundaries ensures hierarchical aggregation and disaggregation (zoom/resolution shifts) preserve total enthalpy without leakage into invalid address spaces.

#### Class Hierarchy & Interface Additions
* **`H3GridManager`**: Extends spatial indexing capabilities in `src/spatial/h3_grid.ts`.
* **`isValidResolution(resolution: number): boolean`**: Pure function validating whether a given integer falls inclusively within the range `[0, 15]`.
* **`assertValidResolution(resolution: number): void`**: Guard clause throwing a `RangeError` if the resolution violates tier bounds.

---

### 3. Detailed Specification & Interface Contracts

#### 3.1 Interface Contract (`src/spatial/h3_grid.ts`)

```typescript
/**
 * Validates whether a given H3 resolution tier is within the permissible bounds [0, 15].
 * 
 * @param resolution - The integer resolution tier to check.
 * @returns true if resolution is an integer between 0 and 15 inclusive, false otherwise.
 */
export function isValidResolution(resolution: number): boolean {
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

/**
 * Asserts that a given H3 resolution tier is valid, throwing an error otherwise.
 * 
 * @param resolution - The integer resolution tier to assert.
 * @throws RangeError if resolution is out of bounds.
 */
export function assertValidResolution(resolution: number): void {
  if (!isValidResolution(resolution)) {
    throw new RangeError(`Invalid H3 resolution tier: ${resolution}. Must be an integer between 0 and 15.`);
  }
}
```

#### 3.2 Integration with Spatial Monads (`src/monads/spatial_monad.ts`)
The `SpatialMonad` state container will invoke `assertValidResolution` upon instantiation and during resolution mutation methods to guarantee spatial domain safety.

---

### 4. Verification and Testing Plan

1. **Unit Tests (`tests/sprint_028.test.ts`):**
   * Test `isValidResolution` with boundary values (`0`, `15`).
   * Test out-of-bounds negative values (`-1`) and values exceeding maximum (`16`, `100`).
   * Test non-integer floating-point values (`3.14`).
   * Verify `assertValidResolution` correctly throws `RangeError` on invalid tiers.
2. **Thermodynamic Integrity Audit:**
   * Ensure no spatial queries bypass tier validation during trophic energy calculations (`src/biosphere/trophic.ts`).