# RFC 089: Non-Zero Aperture Digit Predicate for Hierarchical H3 Cells

- **Sprint:** 089
- **Author:** Chief Systems Architect
- **Status:** Draft
- **Domain:** Spatial Kinematics / H3 Discrete Global Grid System (DGGS) / Monadic Geodesy
- **Target File:** `src/spatial/h3_adjacency.ts` (with type bindings in `src/spatial/h3_types.ts`)

---

## 1. Executive Summary & Sprint Goal

### 1.1 Sprint Goal
> **Implement `hasNonZeroApertureDigits` predicate checking whether any directional digit in active resolution tiers is non-zero in `src/spatial/h3_adjacency.ts`.**

### 1.2 Context & Architectural Rationale
In the H3 Discrete Global Grid System (DGGS), an index encodes a hierarchical nested tessellation of Earth's surface across 16 resolution levels ($r \in [0, 15]$). Following the 7-bit base cell identifier (resolutions $0$), each subsequent refinement tier $k \in [1, r]$ is designated by a 3-bit aperture-7 directional digit ($d_k \in \{0, 1, 2, 3, 4, 5, 6\}$), with digit value $0$ designating the central descendant cell (concentric sub-hexagon) and values $1$ through $6$ designating outer peripheral child hexagons along designated icosahedral azimuths.

When modeling macroscopic biospheric mass transfer across multi-scale spatial patches, identifying whether an H3 cell is strictly concentric with its parent base cell (i.e., all aperture digits $d_1 = d_2 = \dots = d_r = 0$) or whether it has branched into non-central sub-hexagons ($d_k \neq 0$ for at least one $k \le r$) is essential for:
1. **Hierarchical Flow Coarsening & Aggregation:** Central descendant cells share geometric centroids and preserve invariant symmetry axes with their ancestor base cells, whereas cells with non-zero aperture digits introduce rotational coordinate offsets (e.g., $19.1066^\circ$ aperture-7 rotation per step).
2. **Radial Flux Bound Optimizations:** Conservative mass-flux transfers along boundaries can skip coordinate realignment if an aperture digit predicate proves the sub-patch remains centered on the icosahedral base cell pole.
3. **Index Normalization & Canonical Validation:** Inactive resolution levels ($k > r$) must be padded with unused bit patterns ($7$ or $0$ depending on canonicalization), and active levels must be deterministically parsed without inspecting padding bits.

This RFC formalizes `hasNonZeroApertureDigits`, specifying bitwise extraction routines, class hierarchy integration, monadic conservation contracts, and edge-case verification across base resolutions $0$ through $15$.

---

## 2. Mathematical & Spatial Foundations

### 2.1 H3 64-bit Index Bitfield Layout
An H3 index is represented as a 64-bit integer (`bigint` or 16-character hexadecimal string) organized into distinct bit fields:

$$\text{H3Index} = \underbrace{\text{Reserved}}_{1\text{ bit}} \,\|\, \underbrace{\text{Mode}}_{4\text{ bits}} \,\|\, \underbrace{\text{Mode-Dep / Res}}_{4\text{ bits (Res: 52–55)}} \,\|\, \underbrace{\text{Base Cell}}_{7\text{ bits (45–51)}} \,\|\, \prod_{k=1}^{15} \underbrace{\text{Digit } d_k}_{3\text{ bits}}$$

Specifically, for resolution $r \in [0, 15]$:
- Resolution field $r$: Bits 52–55 ($[0, 15]$).
- Base cell index: Bits 45–51 ($[0, 121]$).
- Directional aperture digits $d_k$ for $k \in [1, 15]$:
  - Resolution 1 digit $d_1$: Bits 42–44 (offset $45 - 3 \times 1 = 42$).
  - Resolution $k$ digit $d_k$: Bits $(45 - 3k)$ to $(47 - 3k)$.
  - Resolution 15 digit $d_{15}$: Bits 0–2 (offset $45 - 3 \times 15 = 0$).

### 2.2 Formal Definition of `hasNonZeroApertureDigits`
Let $h$ be a valid H3 cell index with encoded resolution $R(h) \in \{0, \dots, 15\}$.
Let $r_{\text{active}}$ be the resolution tier to inspect, defaulting to $R(h)$ unless explicitly bounded by an argument $r_{\text{max}} \le R(h)$.

The predicate $\mathcal{P}_{\text{non-zero}}(h, r_{\text{active}})$ is defined as:

$$\mathcal{P}_{\text{non-zero}}(h, r_{\text{active}}) = \begin{cases}
\text{false} & \text{if } r_{\text{active}} = 0 \\
\bigvee_{k=1}^{r_{\text{active}}} (d_k(h) \neq 0) & \text{if } r_{\text{active}} \ge 1
\end{cases}$$

Equivalently, via bitwise masking on the 64-bit unsigned integer $I(h)$:
Let $M(r)$ be the bitmask spanning all active aperture digit fields from resolution $1$ through resolution $r$:

$$M(r) = \sum_{k=1}^{r} 7 \times 2^{45 - 3k} = (2^{3r} - 1) \times 2^{45 - 3r}$$

$$\mathcal{P}_{\text{non-zero}}(h, r) = \left( I(h) \ \& \ M(r) \right) \neq 0\text{n}$$

This single-operation bitmask evaluation achieves $\mathcal{O}(1)$ execution time with zero dynamic memory allocation, critical for high-throughput discrete planetary spatial simulations.

---

## 3. Class Hierarchy & Interface Specifications

### 3.1 Interface Contracts in `src/spatial/h3_types.ts`

```typescript
/**
 * Result structure when decomposing H3 aperture digit configurations.
 */
export interface ApertureAnalysisResult {
  readonly index: string;
  readonly resolution: number;
  readonly hasNonZeroDigits: boolean;
  readonly firstNonZeroResolution: number | null;
  readonly nonZeroDigitCount: number;
  readonly digitSequence: readonly number[];
}

/**
 * Strategy interface for discrete aperture inspection.
 */
export interface IH3ApertureInspector {
  hasNonZeroApertureDigits(index: bigint | string, resolution?: number): boolean;
  getFirstNonZeroApertureResolution(index: bigint | string): number | null;
  getApertureDigit(index: bigint | string, resolution: number): number;
  analyzeApertureStructure(index: bigint | string): ApertureAnalysisResult;
}
```

### 3.2 Additions to `src/spatial/h3_adjacency.ts`

The module will export top-level helper functions as well as integrate directly into the `H3AdjacencyCoordinator` class:

```typescript
/**
 * Evaluates whether any directional aperture digit up to the active resolution tier is non-zero.
 *
 * @param index - The 64-bit H3 cell index (as bigint or hex string).
 * @param resolution - Optional resolution tier override (must be between 0 and cell resolution).
 * @returns True if at least one directional digit d_k > 0 for 1 <= k <= resolution; false otherwise.
 */
export function hasNonZeroApertureDigits(
  index: bigint | string,
  resolution?: number
): boolean;

/**
 * Extracts a single aperture digit at a specified resolution tier k (1 <= k <= 15).
 * Returns 0 if k > cell resolution or k < 1.
 */
export function getApertureDigitAt(
  index: bigint | string,
  resTier: number
): number;

/**
 * Finds the lowest resolution level k (1 <= k <= resolution) where d_k != 0.
 * Returns null if all digits are zero or resolution is 0.
 */
export function getFirstNonZeroApertureResolution(
  index: bigint | string,
  resolution?: number
): number | null;
```

### 3.3 Incremental Class Extension: `H3AdjacencyCoordinator`

`H3AdjacencyCoordinator` extends its spatial inspection suite through composition and inheritance:

```typescript
export class H3AdjacencyCoordinator implements IH3ApertureInspector {
  // Existing adjacency matrices and traversal maps...

  /**
   * Implements IH3ApertureInspector.hasNonZeroApertureDigits
   */
  public hasNonZeroApertureDigits(
    index: bigint | string,
    resolution?: number
  ): boolean {
    return hasNonZeroApertureDigits(index, resolution);
  }

  public getFirstNonZeroApertureResolution(
    index: bigint | string
  ): number | null {
    return getFirstNonZeroApertureResolution(index);
  }

  public getApertureDigit(
    index: bigint | string,
    resTier: number
  ): number {
    return getApertureDigitAt(index, resTier);
  }

  public analyzeApertureStructure(
    index: bigint | string
  ): ApertureAnalysisResult {
    // Computes full analysis with digit sequence breakdown
  }
}
```

---

## 4. Integration with Spatial Monads & Thermodynamic Laws

### 4.1 Integration with `SpatialMonad` and `SpatialFluxMonad`
`SpatialMonad` instances track discrete geographic patches populated with trophic biomass, water, and enthalpy. When transferring fluxes across scales (e.g. upscaling patch states from resolution 7 to resolution 6):

```typescript
// Example usage in SpatialFluxMonad coarsening pipeline
export function computeCoarseningDriftVector(
  sourceCell: string,
  targetParentCell: string
): Vector3D {
  if (!hasNonZeroApertureDigits(sourceCell)) {
    // Centroid coincides identically with ancestor base cell centroid;
    // zero rotational drift, purely radial thermodynamic diffusion.
    return Vector3D.ZERO;
  }
  // Compute aperture-7 orientation offset for non-zero child
  return calculateApertureHexagonalOffset(sourceCell, targetParentCell);
}
```

### 4.2 Absolute Thermodynamic Invariance (First & Second Laws)
1. **First Law (Conservation of Mass & Energy):**
   - The predicate `hasNonZeroApertureDigits` is an immutable, read-only spatial inspection operator.
   - It performs zero mass creation or annihilation ($\Delta M = 0$).
   - When used to branch flux routing, all matter transfers between adjacent cells $C_i \to C_j$ must fulfill:
   
   $$\sum_{i} \Delta M_i = 0$$

2. **Second Law (Entropy & Solar Bounding):**
   - Dynamic flux monad calculations utilizing this predicate to determine aperture rotation factors must account for standard metabolic dissipation ($\Delta S_{\text{universe}} > 0$).
   - Inspection operations do not draw or generate virtual energy.

---

## 5. Verification & Test Plan (`tests/sprint_089.test.ts`)

The test suite must comprehensively validate:
1. **Base Cell Boundary (Resolution 0):**
   - Any valid resolution 0 index must return `false` for `hasNonZeroApertureDigits(index)`.
2. **Concentric Child Hexagons ($d_k = 0$):**
   - Cell constructed with resolution $r \in [1, 15]$ where all active digits are `0` must return `false`.
3. **Peripheral Child Hexagons ($d_k \in [1, 6]$):**
   - Index where $d_1 > 0$ returns `true`.
   - Index where $d_1 = 0$ but $d_r > 0$ returns `true`.
   - Index where only an intermediate digit $d_m > 0$ ($1 < m < r$) returns `true`.
4. **Inactive Digit Isolation ($k > r$):**
   - Unused bits in positions $k > r$ (even if containing residue bits or $7$ padding) must **not** cause false positives; only active digits $1 \le k \le r$ are inspected.
5. **Type Flexibility:**
   - Both `string` (hex representation, e.g. `"8828308281fffff"`) and `bigint` inputs must be seamlessly supported.
6. **Coordinator Composition:**
   - `H3AdjacencyCoordinator` instance methods must match standalone functional results.
7. **Thermodynamic Purity:**
   - Verify that running aperture inspection over thousands of iterations alters zero monad stock balances.

---

## 6. Implementation Checklist
- [ ] Export `hasNonZeroApertureDigits`, `getApertureDigitAt`, and `getFirstNonZeroApertureResolution` in `src/spatial/h3_adjacency.ts`.
- [ ] Add `IH3ApertureInspector` and `ApertureAnalysisResult` to `src/spatial/h3_types.ts`.
- [ ] Implement bitwise masking algorithm with proper 64-bit BigInt bit shifts.
- [ ] Wire methods into `H3AdjacencyCoordinator`.
- [ ] Author unit tests in `tests/sprint_089.test.ts` verifying all resolutions $0$ to $15$.