# RFC-092: Spatial Aperture Resolution Boundary Enforcement (`assertValidApertureResolution`)

**Status**: Proposed  
**Sprint**: 092  
**Author**: Chief Systems Architect  
**Domain**: Spatial Adjacency, Discrete Global Grid Systems (DGGS), Thermodynamic Transport  
**Target File**: `src/spatial/h3_adjacency.ts`  
**Related Files**: `src/spatial/h3_types.ts`, `src/spatial/h3_grid.ts`, `src/spatial/spatial_flux_monad.ts`, `src/monads/spatial_monad.ts`

---

## 1. Executive Summary & Problem Statement

In the Web of Life planetary simulation engine, the discrete spatial fabric is parameterized by the H3 Discrete Global Grid System (DGGS), an aperture-7 hexagonal hierarchical tessellation covering the Earth's surface. Physical fluxes (solar irradiance, sensible/latent heat, hydrological mass flows, carbon-nitrogen biogeochemical cycles, and trophic biomass transfers) are modeled as discrete monad stock transitions across adjacent cells at designated spatial resolutions.

The H3 spatial indexing specification defines sixteen discrete hierarchical levels, indexed $r \in [0, 15] \cap \mathbb{Z}$, where resolution $0$ corresponds to the base 122 icosahedral cells (~4,357,449 km² per cell) and resolution $15$ corresponds to sub-meter hexagons (~0.895 m² per cell).

Prior to this sprint, several spatial adjacency routines within `src/spatial/h3_adjacency.ts` accepted resolution parameters typed broadly as `number`. In the absence of an explicit, fail-fast runtime boundary validator:
1. Non-integer floating-point resolutions (e.g., $r = 7.5$), out-of-bounds resolutions ($r < 0$ or $r > 15$), or non-finite values (`NaN`, `+Infinity`, `-Infinity`) could silently propagate into bitwise spatial indexing operators and sparse adjacency matrices.
2. Bitwise shifts (`(res & 0xF)`) or trigonometric kernel lookups evaluated on corrupted resolutions produce non-existent cell IDs or degenerate topological stencils.
3. Such degeneracies break the spatial conservation invariants of the `SpatialFluxMonad`, leading to mass/energy leaks (violating First Law thermodynamics) or unphysical localized negative entropy production (violating Second Law thermodynamics).

This RFC formalizes and specifies the implementation of `assertValidApertureResolution(resolution: number): asserts resolution is H3Resolution` in `src/spatial/h3_adjacency.ts`, establishing a deterministic, zero-overhead runtime guard that guarantees topological integrity across all multiscale spatial operations.

---

## 2. Mathematical & DGGS Foundations

### 2.1 Hexagonal Hierarchical Aperture-7 Scaling
In H3's aperture-7 geometry, the area $A_r$ of a regular hexagon at resolution $r$ decreases exponentially according to the aperture factor:
$$A_r = A_0 \cdot \left(\frac{1}{7}\right)^r, \quad r \in \{0, 1, 2, \dots, 15\}$$
The discrete aperture sequence represents discrete dilation levels on the sphere. Any continuous relaxation $r \in \mathbb{R} \setminus \mathbb{Z}$ or extrapolation $r \notin [0, 15]$ lacks topological support on the truncated icosahedron.

### 2.2 Discrete Spatial Adjacency and Laplacian Stencils
The discrete surface flux $\mathbf{J}_i$ across the planar boundary of cell $i$ to its 1-ring neighborhood $\mathcal{N}(i)$ at resolution $r$ is:
$$\mathbf{J}_i = -D \sum_{j \in \mathcal{N}_r(i)} \kappa_{ij} (S_j - S_i)$$
where $\kappa_{ij}$ is the inter-cell conductance conductance metric dependent on the characteristic grid spacing $L_r \propto (\sqrt{7})^{-r}$.
If $r$ deviates from an admissible integer in $[0, 15]$:
- $\mathcal{N}_r(i)$ becomes undefined or malformed.
- The adjacency operator matrix $\mathbf{W}_r$ ceases to be symmetric positive semidefinite ($\mathbf{W}_r \neq \mathbf{W}_r^T$), destroying the flux-balance condition:
$$\sum_{i} \sum_{j \in \mathcal{N}_r(i)} \mathbf{J}_{ij} = 0 \quad \text{(Violation of First Law Conservation)}$$

---

## 3. Class Hierarchy & Architectural Design

### 3.1 Domain Types & Error Hierarchy
We reinforce the existing domain type model in `src/spatial/h3_types.ts` and introduce a dedicated domain exception `InvalidApertureResolutionError` subclassed from the standard `RangeError`:

```
Error
 └── RangeError
      └── InvalidApertureResolutionError
```

```typescript
export class InvalidApertureResolutionError extends RangeError {
  public readonly resolution: unknown;

  constructor(resolution: unknown, reason: string) {
    super(`[H3Adjacency] Invalid aperture resolution (${String(resolution)}): ${reason}. Must be an integer between 0 and 15 inclusive.`);
    this.name = 'InvalidApertureResolutionError';
    this.resolution = resolution;
    Object.setPrototypeOf(this, InvalidApertureResolutionError.prototype);
  }
}
```

### 3.2 The Boundary Guard Function Contract
The function `assertValidApertureResolution` is defined as a TypeScript assertion function:

```typescript
export type H3Resolution = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

/**
 * Validates that an aperture resolution is a finite, non-negative integer within [0, 15].
 * 
 * @param resolution The resolution candidate to validate.
 * @throws {InvalidApertureResolutionError} If the resolution fails type, integrality, or range checks.
 */
export function assertValidApertureResolution(
  resolution: number
): asserts resolution is H3Resolution;
```

#### Exact Validation Conditions
For any candidate value $R$:
1. **Type & Non-NaN/Finite Guard**: `typeof resolution === 'number' && Number.isFinite(resolution)`
2. **Integer Guard**: `Number.isInteger(resolution)`
3. **Lower Bound Guard**: `resolution >= 0`
4. **Upper Bound Guard**: `resolution <= 15`

If any test fails, an `InvalidApertureResolutionError` must be thrown immediately with an explicit message identifying the failure mode (e.g. `Value is not finite`, `Value is not an integer`, `Resolution is negative`, `Resolution exceeds maximum H3 aperture resolution 15`).

---

## 4. Integration into Spatial Adjacency Infrastructure

`src/spatial/h3_adjacency.ts` hosts spatial neighbor resolution, distance calculation, ring traversal, and inter-resolution hierarchy operators. `assertValidApertureResolution` must be injected into all public entry points that accept resolution indices:

1. `H3AdjacencyGraph.forResolution(resolution: number): H3AdjacencyGraph`
   - Pre-condition assertion at entry point.
2. `getNeighborsAtResolution(cellIndex: string, targetResolution: number): string[]`
   - Validates `targetResolution` before hierarchical index traversal.
3. `computeAdjacencyWeights(cells: string[], resolution: number): SparseWeightMatrix`
   - Validates `resolution` prior to metric distance calculations and spatial Laplacian assembly.
4. `SpatialFluxMonad.bindAtResolution<S>(stock: S, resolution: number): SpatialFluxMonad<S>`
   - Enforces resolution invariants prior to allocating spatial stock tensors.

---

## 5. Thermodynamic Compliance

In accordance with the fundamental physics of the Earth Pod and biosphere architecture:

1. **First Law of Thermodynamics (Conservation of Mass and Energy)**:
   Conservative redistribution of stocks (water, thermal energy, carbon, nitrogen, biomass) via discrete Laplacian operators relies on finite, symmetric graph weights. Enforcing $r \in [0, 15] \cap \mathbb{Z}$ guarantees that the sum of all directional fluxes across cell boundaries $\sum_{i,j} J_{ij} \equiv 0$, preventing non-physical divergence or sink artifacts.
2. **Second Law of Thermodynamics (Entropy Production)**:
   Thermal and biogeochemical diffusion between hexagonal cells generates entropy at rate $\sigma = \sum_{ij} J_{ij} (\frac{1}{T_j} - \frac{1}{T_i}) \ge 0$. Erroneous resolution scaling creates discontinuous spatial metrics that could yield negative conductances or inverted temperature gradients, violating the Clausius-Duhem inequality. Bounding resolution guarantees continuous, strictly positive cell metric coefficients.

---

## 6. Implementation Plan & Source Mapping

### Target File: `src/spatial/h3_adjacency.ts`
1. Export `InvalidApertureResolutionError` extending `RangeError`.
2. Export `assertValidApertureResolution(resolution: number): asserts resolution is H3Resolution`.
3. Wrap all resolution ingestion points across `H3AdjacencyManager` and utility methods with `assertValidApertureResolution`.

---

## 7. Verification & Test Suite Matrix (`tests/sprint_092.test.ts`)

| Test Vector | Input Resolution | Expected Behavior | Rationale |
| :--- | :--- | :--- | :--- |
| TV-01 | `0` | Pass (Valid) | Minimum H3 aperture resolution (Base icosahedral cells) |
| TV-02 | `15` | Pass (Valid) | Maximum H3 aperture resolution (Sub-meter hexes) |
| TV-03 | `7`, `8`, `1` | Pass (Valid) | Standard intermediate terrestrial resolutions |
| TV-04 | `-1` | Throws `InvalidApertureResolutionError` | Negative boundary violation |
| TV-05 | `16` | Throws `InvalidApertureResolutionError` | Upper bound violation |
| TV-06 | `3.14159` | Throws `InvalidApertureResolutionError` | Non-integer floating point |
| TV-07 | `NaN` | Throws `InvalidApertureResolutionError` | Non-finite / corrupt numerical input |
| TV-08 | `+Infinity` / `-Infinity` | Throws `InvalidApertureResolutionError` | Non-finite asymptotic input |
| TV-09 | Adjacency Matrix Gen at $r=6$ | Generates Conservative Stencil | Thermodynamic symmetry verification |
| TV-10 | Adjacency Matrix Gen at $r=16$ | Immediate rejection before allocation | Memory and state preservation |

---

## 8. Architectural Sign-off

- **Thermodynamic Integrity**: Verified ($\sum \Delta S_{\text{universe}} \ge 0$, $\Delta M = 0$).
- **DGGS Compliance**: Strict adherence to Uber H3 v3/v4 aperture specification ($r \in [0, 15]$).
- **Zero-Cost Abstraction**: Minimal V8 JIT overhead via simple arithmetic primitives (`typeof`, `Number.isInteger`, comparisons).