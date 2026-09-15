# RFC-082: Pentagonal Neighbor Count Validation and Coordination Violation Error in H3 Adjacency

## 1. Executive Summary

In discrete global grid systems (DGGS) based on recursive icosahedral discretization—specifically Uber's H3 hierarchical spatial indexing—the Euler characteristic ($\chi = 2$) mandates the existence of exactly twelve topological pentagons at every resolution level. Unlike standard hexagonal cells which possess a coordination number of 6 ($z = 6$), pentagonal cells strictly possess a coordination number of 5 ($z = 5$). 

Sprint 082 introduces structural topology validation for pentagonal coordination in `src/spatial/h3_adjacency.ts`. We implement `validatePentagonalNeighborCount` alongside the domain-specific exception `PentagonalCoordinationViolationError`. This validation guarantees that spatial flux monads and biogeochemical diffusion operators do not compute fluxes across non-existent sixth topological facets or truncated neighbor topologies, upholding the First and Second Laws of Thermodynamics on spherical manifolds.

---

## 2. Problem Statement & Topological Motivation

### 2.1 The Euler Characteristic Invariant
By Euler’s polyhedron formula:
$$V - E + F = 2$$
For a spherical manifold partitioned into polygons where each vertex is shared by 3 faces ($3V = 2E$):
$$\sum_{i} (6 - i) F_i = 12$$
Assuming all faces are either hexagons ($i = 6$) or pentagons ($i = 5$):
$$(6 - 5)F_5 + (6 - 6)F_6 = 12 \implies F_5 = 12$$

Thus, exactly 12 pentagonal cells exist at any resolution $r \ge 0$. Any discrete Laplacian or finite volume mass transport operator operating across neighbor cells must rigorously honor the 5-fold coordination of these pentagonal cells.

### 2.2 Thermodynamic Degradation Risk
If an H3 pentagonal cell's neighbor array contains fewer or more than 5 indices (e.g., due to unvalidated 6-neighbor ring generation, array corruption, or null-padded adjacency buffers):
1. **First Law Violation (Mass Conservation):** Finite volume flux integration $\sum_{k=1}^K J_{ik} \cdot A_k$ over an invalid neighbor list ($K \neq 5$) introduces phantom boundary surfaces or omits physical boundaries, creating artificial sinks or sources of carbon, nitrogen, phosphorus, and water ($\sum \Delta M \neq 0$).
2. **Second Law Violation (Entropy & Diffusion Monotonicity):** Diffusion across non-physical coordination facets distorts chemical potential gradients $\nabla \mu$, causing localized entropy destruction ($\mathrm{d}S_{\text{internal}} < 0$).

Therefore, adjacency queries for pentagons must execute a hard runtime invariant assertion before downstream thermodynamic monads evaluate stock updates.

---

## 3. Technical Specification & Interfaces

### 3.1 Error Hierarchy: `PentagonalCoordinationViolationError`
A new error type extending JavaScript's built-in `Error` to represent topological boundary violations in pentagonal cells:

```typescript
export class PentagonalCoordinationViolationError extends Error {
  public readonly cellIndex?: string;
  public readonly actualCount: number;
  public readonly expectedCount: number = 5;

  constructor(actualCount: number, cellIndex?: string, customMessage?: string) {
    const detail = cellIndex ? ` for cell ${cellIndex}` : '';
    const message = customMessage ?? 
      `Pentagonal coordination violation${detail}: expected exactly 5 neighbors, but received ${actualCount}.`;
    super(message);
    this.name = 'PentagonalCoordinationViolationError';
    this.actualCount = actualCount;
    this.cellIndex = cellIndex;
    Object.setPrototypeOf(this, PentagonalCoordinationViolationError.prototype);
  }
}
```

### 3.2 Validation Function: `validatePentagonalNeighborCount`
`validatePentagonalNeighborCount` enforces that the neighbor array length is strictly 5.

```typescript
/**
 * Validates that an array of neighbor indices for a known pentagonal cell contains
 * exactly 5 elements, in accordance with the Euler characteristic of the icosahedral grid.
 *
 * @param neighbors - Readonly array of neighbor H3 cell indices.
 * @param cellIndex - Optional identifier of the pentagon being validated, used for diagnostic reporting.
 * @throws {PentagonalCoordinationViolationError} If neighbors.length !== 5.
 */
export function validatePentagonalNeighborCount(
  neighbors: readonly unknown[],
  cellIndex?: string
): void {
  if (neighbors.length !== 5) {
    throw new PentagonalCoordinationViolationError(neighbors.length, cellIndex);
  }
}
```

---

## 4. Class & Monad Interaction Architecture

```
+-------------------------------------------------------------+
|                     H3 Spatial Adjacency                    |
|                (src/spatial/h3_adjacency.ts)                |
+-------------------------------------------------------------+
                              |
       +----------------------+----------------------+
       |                                             |
       v                                             v
[validatePentagonalNeighborCount]       [PentagonalCoordinationViolationError]
       |                                             |
       | passes iff len == 5                         | thrown if len != 5
       v                                             v
+-----------------------------+               +-------------------------------+
|  SpatialFluxMonad /         |               | Thermodynamic Invariant Guard |
|  DiscreteLaplacianOperator  |               | (Halts Step, Prevents Phantom |
|  (Stocks conserved: dM=0)   |               | Mass Injection/Leakage)       |
+-----------------------------+               +-------------------------------+
```

### 4.1 Stock Transition Safety
When calculating advective and diffusive fluxes between cell $i$ and neighbor set $\mathcal{N}(i)$:
$$\frac{\mathrm{d}M_i}{\mathrm{d}t} = \sum_{j \in \mathcal{N}(i)} \Phi_{ji}$$
Where:
- For regular hexagonal cells: $|\mathcal{N}(i)| = 6$.
- For pentagonal cells: $|\mathcal{N}(i)| = 5$.

Ensuring $|\mathcal{N}(i)| = 5$ guarantees:
$$\sum_{j \in \mathcal{N}(i)} \Phi_{ji} + \sum_{j \in \mathcal{N}(i)} \Phi_{ij} = 0$$
No stock transitions are evaluated on ill-formed topologies.

---

## 5. Implementation Details

1. **Location:** `src/spatial/h3_adjacency.ts`
2. **Exports:**
   - Class `PentagonalCoordinationViolationError`
   - Function `validatePentagonalNeighborCount`
3. **Behavioral Invariants:**
   - Accepts arrays of any element type (`readonly unknown[]`), checking `.length === 5`.
   - Attaches `actualCount` and optional `cellIndex` to the error instance.
   - Preserves prototype chain for standard `instanceof` checks.
   - Throws deterministically for empty arrays ($0$), partial neighbor lists ($1..4$), hexagonal over-allocations ($6$), or any other size ($\neq 5$).

---

## 6. Verification and Validation Plan

### 6.1 Unit Test Coverage (`tests/sprint_082.test.ts`)
- **Valid Pentagonal Coordination:**
  - Verify that providing an array of exactly 5 elements does not throw.
  - Test with strings, objects, and empty/mock indices.
- **Violation Scenarios:**
  - Test array of length 6 (hexagonal neighbor count mistakenly provided to pentagonal validator). Expect `PentagonalCoordinationViolationError` with `actualCount = 6`.
  - Test array of length 4 (missing neighbor edge). Expect `PentagonalCoordinationViolationError` with `actualCount = 4`.
  - Test array of length 0 (unlinked pentagon). Expect `actualCount = 0`.
  - Verify error message includes the cell index when provided.
  - Verify `instanceof PentagonalCoordinationViolationError` and `instanceof Error` are true.

---

## 7. Downstream Implications
This validation provides an essential prerequisite for resolution-spanning discrete Laplace-Beltrami operators, preventing silent topological boundary leaks in global climate and biogeochemical simulations across all twelve icosahedral vertices.