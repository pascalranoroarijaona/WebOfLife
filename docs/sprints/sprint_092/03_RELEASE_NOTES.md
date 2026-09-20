# Sprint 092 Release Notes: Spatial Aperture Resolution Boundary Enforcement

**Release Tag:** `v0.92.0`  
**Sprint Cycle:** Sprint 092  
**Epic:** Spatial Adjacency, DGGS Foundations & Thermodynamic Transport  
**Target File:** `src/spatial/h3_adjacency.ts`  
**Related Modules:** `src/spatial/h3_types.ts`, `src/spatial/h3_grid.ts`, `src/spatial/spatial_flux_monad.ts`, `src/monads/spatial_monad.ts`  
**Test Suite:** `tests/sprint_092.test.ts`  

---

## Executive Summary

Sprint 092 introduces deterministic spatial boundary validation for the Discrete Global Grid System (DGGS) within the Web of Life simulation engine. Prior to this sprint, spatial adjacency routines accepted hierarchical resolution identifiers typed broadly as primitive numbers. This permissiveness created vulnerability windows where non-integer floats (e.g., $r = 7.5$), out-of-range indices ($r < 0$ or $r > 15$), and non-finite values (`NaN`, `±Infinity`) could bypass validation and propagate into bitwise indexing operations and sparse adjacency matrices.

To prevent spatial metric degeneracy and strictly enforce physical conservation laws, Sprint 092 implements `assertValidApertureResolution` alongside the domain-specific exception `InvalidApertureResolutionError`. This mechanism enforces strict adherence to the aperture-7 hexagonal hierarchy ($r \in [0, 15] \cap \mathbb{Z}$), guaranteeing that spatial Laplacian stencils preserve symmetric positive semidefiniteness, mass/energy conservation (First Law of Thermodynamics), and positive entropy production rates (Second Law of Thermodynamics).

---

## Architectural & Mathematical Foundations

### Hexagonal Hierarchical Aperture-7 Scaling

The planetary simulation surface is tessellated using an aperture-7 hexagonal Discrete Global Grid System (DGGS). In this geometry, cell area $A_r$ scales exponentially with discrete hierarchical level $r$:

$$A_r = A_0 \cdot \left(\frac{1}{7}\right)^r, \quad r \in \{0, 1, 2, \dots, 15\}$$

- **Resolution $0$:** 122 base icosahedral spherical cells ($\sim 4,357,449\text{ km}^2$ per cell).
- **Resolution $15$:** Fine-scale sub-meter hexagons ($\sim 0.895\text{ m}^2$ per cell).

Any continuous relaxation $r \in \mathbb{R} \setminus \mathbb{Z}$ or out-of-range index $r \notin [0, 15]$ lacks topological support on the truncated icosahedral projection.

### Flux Conservation & Laplacian Stencils

Inter-cell transport of heat, water, carbon, and trophic biomass relies on discrete spatial gradient stencils across adjacent cells:

$$\mathbf{J}_i = -D \sum_{j \in \mathcal{N}_r(i)} \kappa_{ij} (S_j - S_i)$$

Where:
- $\mathcal{N}_r(i)$ denotes the 1-ring neighborhood at aperture resolution $r$.
- $\kappa_{ij}$ represents the inter-cell conductance metric derived from characteristic grid spacing $L_r \propto (\sqrt{7})^{-r}$.

Enforcing strict integer bounds on $r$ ensures that the adjacency operator $\mathbf{W}_r$ remains symmetric positive semidefinite ($\mathbf{W}_r = \mathbf{W}_r^T$), fulfilling the zero-divergence conservative condition:

$$\sum_{i} \sum_{j \in \mathcal{N}_r(i)} \mathbf{J}_{ij} = 0$$

---

## What's New

### 1. `InvalidApertureResolutionError` Domain Exception
A typed domain exception extending JavaScript's built-in `RangeError` to represent malformed resolution inputs with explicit diagnostics:

```typescript
export class InvalidApertureResolutionError extends RangeError {
  public readonly resolution: unknown;

  constructor(resolution: unknown, reason: string) {
    super(
      `[H3Adjacency] Invalid aperture resolution (${String(resolution)}): ${reason}. ` +
      `Must be an integer between 0 and 15 inclusive.`
    );
    this.name = 'InvalidApertureResolutionError';
    this.resolution = resolution;
    Object.setPrototypeOf(this, InvalidApertureResolutionError.prototype);
  }
}
```

### 2. `assertValidApertureResolution` Type Assertion Guard
A fail-fast assertion function narrowing general numeric inputs to the bounded discrete union type `H3Resolution`:

```typescript
export type H3Resolution =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
  | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export function assertValidApertureResolution(
  resolution: number
): asserts resolution is H3Resolution;
```

#### Enforced Validation Rules
1. **Type & Finiteness Check:** Rejects non-numbers, `NaN`, `+Infinity`, and `-Infinity`.
2. **Integrality Check:** Rejects non-integers via `Number.isInteger(resolution)`.
3. **Lower Bound Check:** Rejects $r < 0$.
4. **Upper Bound Check:** Rejects $r > 15$.

### 3. Subsystem Integration Across Adjacency Routines
The assertion guard has been injected into all public entry points in `src/spatial/h3_adjacency.ts` and related monad kernels:

- `H3AdjacencyGraph.forResolution(resolution: number)`: Validates graph configuration prior to topology allocation.
- `getNeighborsAtResolution(cellIndex: string, targetResolution: number)`: Protects hierarchical traversal lookups from invalid target levels.
- `computeAdjacencyWeights(cells: string[], resolution: number)`: Ensures metric distance lookups and Laplacian assemblies evaluate valid scale conductances.
- `SpatialFluxMonad.bindAtResolution<S>(stock: S, resolution: number)`: Enforces resolution validity before spatial state vector binding.

---

## Thermodynamic Invariants Enforced

| Physical Law | Thermodynamic Requirement | Enforcement Mechanism |
| :--- | :--- | :--- |
| **First Law of Thermodynamics** | Mass and energy conservation across flux distributions ($\sum \Delta M = 0$, $\sum \Delta U = 0$). | Prevents corrupted bitwise shifts and malformed stencils, guaranteeing closed-system conservative balance $\sum_{i,j} J_{ij} = 0$. |
| **Second Law of Thermodynamics** | Non-negative local and global entropy production ($\sigma \ge 0$). | Guarantees strictly positive conductance values $\kappa_{ij} > 0$, preventing negative conductances or non-physical inverted thermal gradients. |

---

## Verification & Test Matrix

The test suite in `tests/sprint_092.test.ts` validates boundary constraints, type narrowing, and adjacency matrix generation:

| Test Identifier | Input Resolution | Expected Outcome | Verification Target |
| :--- | :--- | :--- | :--- |
| **TV-092-01** | `0` | Passed | Minimum valid boundary (122 icosahedral base cells) |
| **TV-092-02** | `15` | Passed | Maximum valid boundary (Sub-meter hexagonal aperture) |
| **TV-092-03** | `1`, `7`, `8`, `14` | Passed | Standard intermediate resolution validation |
| **TV-092-04** | `-1`, `-42` | Throws `InvalidApertureResolutionError` | Lower boundary rejection |
| **TV-092-05** | `16`, `100` | Throws `InvalidApertureResolutionError` | Upper boundary rejection |
| **TV-092-06** | `3.14159`, `7.5` | Throws `InvalidApertureResolutionError` | Non-integer float rejection |
| **TV-092-07** | `NaN` | Throws `InvalidApertureResolutionError` | Corrupt numerical value rejection |
| **TV-092-08** | `+Infinity`, `-Infinity` | Throws `InvalidApertureResolutionError` | Asymptotic float rejection |
| **TV-092-09** | Adjacency Matrix @ $r = 6$ | Passed | Symmetric, conservative Laplacian operator validation |
| **TV-092-10** | Adjacency Matrix @ $r = 16$ | Throws `InvalidApertureResolutionError` | Immediate fail-fast prior to memory allocation |

---

## Migration & Upgrade Guide

### Handling `InvalidApertureResolutionError`

Custom pipelines constructing dynamic resolution parameters must ensure resolutions are passed as integers within $[0, 15]$. Wrap dynamic calculations in structured error handling:

```typescript
import {
  assertValidApertureResolution,
  InvalidApertureResolutionError,
  H3Resolution
} from './spatial/h3_adjacency';

function configureSpatialMesh(userResolution: number) {
  try {
    assertValidApertureResolution(userResolution);
    // TypeScript now narrows userResolution to H3Resolution (0 | 1 | ... | 15)
    return H3AdjacencyGraph.forResolution(userResolution);
  } catch (err) {
    if (err instanceof InvalidApertureResolutionError) {
      console.error(`Spatial configuration failed: ${err.message}`);
      // Fallback to regional base resolution
      return H3AdjacencyGraph.forResolution(7 as H3Resolution);
    }
    throw err;
  }
}
```

---

## Changelog Summary

### Added
- `InvalidApertureResolutionError` custom error class in `src/spatial/h3_adjacency.ts`.
- `assertValidApertureResolution` boundary assertion function in `src/spatial/h3_adjacency.ts`.
- Comprehensive validation test suite in `tests/sprint_092.test.ts`.

### Changed
- Refactored `H3AdjacencyGraph.forResolution` to validate input resolutions prior to graph allocation.
- Updated `computeAdjacencyWeights` and `getNeighborsAtResolution` with resolution assertion checks.
- Strengthened `SpatialFluxMonad.bindAtResolution` against non-finite or fractional resolution inputs.