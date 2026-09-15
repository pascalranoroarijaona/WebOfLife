# RFC-078: Pentagonal Coordination Invariant Enforcement in H3 Discrete Global Grid System

## Status
- **Target Sprint:** Sprint 078
- **Author:** Chief Systems Architect
- **Component:** `src/spatial/h3_adjacency.ts`
- **Related Modules:** `src/spatial/h3_grid.ts`, `src/spatial/spatial_flux_monad.ts`, `src/thermodynamics/constants.ts`
- **Status:** Proposed

---

## 1. Executive Summary & Sprint Goal

### Sprint Goal
Refactor `assertValidNeighborCountForCell` to throw `PentagonalCoordinationViolationError` when `isPentagonCell(cellId)` is true and neighbor count !== 5 in `src/spatial/h3_adjacency.ts`.

### Architectural Objective
In discrete global grid systems (DGGS) based on icosahedral hexagonal hierarchies (such as Uber H3), the Euler-Poincaré formula ($\chi = V - E + F = 2$) mandates the existence of exactly 12 pentagonal cells at every subdivision resolution. While standard hexagonal cells exhibit a coordination number of $z = 6$, pentagonal cells exhibit topological disclinations where the coordination number is strictly $z = 5$.

Prior implementations either applied a homogeneous coordination check ($z \in \{5, 6\}$ or $z = 6$) or emitted generic topology assertion errors that obscured whether the anomaly originated from truncated hexagonal boundaries or invalid pentagonal neighborhood generation. 

Sprint 078 refactors `assertValidNeighborCountForCell` in `src/spatial/h3_adjacency.ts` to perform strict, type-differentiated coordination validation by instantiating and throwing a domain-specific `PentagonalCoordinationViolationError` whenever `isPentagonCell(cellId)` evaluates to `true` and the observed neighbor count deviates from 5.

---

## 2. Theoretical & Mathematical Foundations

### 2.1 Euler Characteristic and Disclination Topology
A closed 2-manifold homeomorphic to a 2-sphere ($S^2$) cannot be tessellated entirely by regular hexagons in Euclidean metric space. According to Euler's polyhedron formula:
$$V - E + F = 2(1 - g)$$
For a spherical surface ($g = 0$):
$$V - E + F = 2$$
If every face $F_k$ is a $k$-gon and each vertex is trivalent (shared by 3 faces, $3V = 2E$):
$$\sum_{k} (6 - k) F_k = 12$$
Assuming only hexagons ($k=6$) and pentagons ($k=5$):
$$(6 - 5)F_5 + (6 - 6)F_6 = 12 \implies F_5 = 12$$
Thus, exactly 12 pentagonal faces are geometrically required at any resolution $r \ge 0$.

### 2.2 First and Second Law Thermodynamic Implications
Spatial advection, turbulent diffusion, and biomass migration across the discrete manifold depend on discrete differential operators defined over directional dual graph edges:
$$\frac{\partial S_i}{\partial t} = -\sum_{j \in \mathcal{N}(i)} \mathbf{J}_{ij} \cdot \mathbf{n}_{ij} A_{ij} + \dot{\sigma}_i$$
where $\mathcal{N}(i)$ is the coordination set (neighbor indices) of cell $i$.
- For standard hexagonal cells: $|\mathcal{N}(i)| = 6$.
- For pentagonal cells: $|\mathcal{N}(i)| = 5$.

If an erroneous 6th neighbor is admitted to a pentagonal cell, flux tensors $\mathbf{J}_{ij}$ compute spurious mass/energy divergence across non-existent topological boundaries:
$$\oint_{\partial \Omega_{\text{pentagon}}} \mathbf{J} \cdot d\mathbf{A} \ne \sum_{k=1}^{5} J_{k} A_k$$
This produces violation of the First Law of Thermodynamics (spurious matter/energy creation or destruction) and artificial entropy sink/source creation in violation of the Second Law. Enforcing $|\mathcal{N}(i)| = 5$ guarantees conservative flux closure:
$$\sum_{j \in \mathcal{N}(i)} J_{ij}^{\text{mass}} = 0 \quad (\text{in steady state, absent internal sources})$$

---

## 3. Class Hierarchy & Error Taxonomy

To preserve object-oriented extensibility and incremental design, `PentagonalCoordinationViolationError` inherits from `H3AdjacencyError`, which in turn extends `H3TopologyViolationError`:

```
                    Error (Native ECMAScript)
                              ▲
                              │
                    H3TopologyViolationError
                              ▲
                              │
                      H3AdjacencyError
                              ▲
               ┌──────────────┴──────────────┐
               │                             │
HexagonalCoordinationViolationError   PentagonalCoordinationViolationError
```

### 3.1 Class Definitions

```typescript
/**
 * Base domain error for all H3 topology anomalies.
 */
export class H3TopologyViolationError extends Error {
  public readonly cellId: string;
  constructor(message: string, cellId: string) {
    super(message);
    this.name = 'H3TopologyViolationError';
    this.cellId = cellId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Domain error for spatial adjacency and dual-graph edge failures.
 */
export class H3AdjacencyError extends H3TopologyViolationError {
  public readonly neighborCount: number;
  constructor(message: string, cellId: string, neighborCount: number) {
    super(message, cellId);
    this.name = 'H3AdjacencyError';
    this.neighborCount = neighborCount;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Explicit violation thrown when a pentagonal cell does not have exactly 5 neighbors.
 */
export class PentagonalCoordinationViolationError extends H3AdjacencyError {
  public readonly expectedCount: number = 5;

  constructor(cellId: string, actualCount: number) {
    super(
      `Pentagonal coordination violation at cell '${cellId}': expected exactly 5 neighbors, got ${actualCount}.`,
      cellId,
      actualCount
    );
    this.name = 'PentagonalCoordinationViolationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Explicit violation thrown when a non-pentagonal (hexagonal) cell does not have 6 neighbors.
 */
export class HexagonalCoordinationViolationError extends H3AdjacencyError {
  public readonly expectedCount: number = 6;

  constructor(cellId: string, actualCount: number) {
    super(
      `Hexagonal coordination violation at cell '${cellId}': expected exactly 6 neighbors, got ${actualCount}.`,
      cellId,
      actualCount
    );
    this.name = 'HexagonalCoordinationViolationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

---

## 4. Method Signature & Contract Refactoring

### 4.1 Interface Contract
Refactor `assertValidNeighborCountForCell`:

```typescript
/**
 * Validates that the neighbor count for an H3 cell matches its topological geometry.
 *
 * @param cellId - The H3 index string of the cell being evaluated.
 * @param neighbors - Array of neighbor cell IDs or count of neighbors.
 * @throws {PentagonalCoordinationViolationError} If cell is pentagonal and neighbor count !== 5.
 * @throws {HexagonalCoordinationViolationError} If cell is non-pentagonal and neighbor count !== 6.
 */
export function assertValidNeighborCountForCell(
  cellId: string,
  neighbors: readonly string[] | number
): void;
```

### 4.2 Detailed Implementation Logic

```typescript
export function assertValidNeighborCountForCell(
  cellId: string,
  neighbors: readonly string[] | number
): void {
  const count = typeof neighbors === 'number' ? neighbors : neighbors.length;
  const isPentagon = isPentagonCell(cellId);

  if (isPentagon) {
    if (count !== 5) {
      throw new PentagonalCoordinationViolationError(cellId, count);
    }
  } else {
    if (count !== 6) {
      throw new HexagonalCoordinationViolationError(cellId, count);
    }
  }
}
```

---

## 5. Monadic Stock Transitions & Invariant Properties

### 5.1 Spatial Flux Monad Safety
When calculating advective inter-cell fluxes $\mathbf{F} \in \mathbb{R}^{M \times K}$, the `SpatialFluxMonad` maps across the neighborhood graph:

$$\mathcal{M}(S) \xrightarrow{\text{bind}} \mathcal{M}(S + \Delta S)$$
where
$$\Delta S_i = \sum_{j \in \text{neighbors}(i)} \Phi(S_i, S_j, A_{ij})$$

Invariant properties maintained:
1. **Coordination Strictness:**
   $$\forall c \in \text{Cells}: \quad |\mathcal{N}(c)| = \begin{cases} 5 & \text{if } \text{isPentagonCell}(c) \\ 6 & \text{otherwise} \end{cases}$$
2. **Conservative Transport Closure:**
   $$\sum_{i \in \text{Grid}} \Delta S_i = 0 \quad (\text{closed boundary condition})$$
   Enforcement of `PentagonalCoordinationViolationError` guarantees that no orphaned fluxes or ghost edges compromise the conservation laws.

---

## 6. Migration, Test Strategy & Verification Plan

### 6.1 Unit Test Coverage (`tests/sprint_078.test.ts`)
1. **Pentagonal Positive Verification:**
   - Call `assertValidNeighborCountForCell` with known pentagon cells and count = 5; must not throw.
2. **Pentagonal Negative Verification:**
   - Call `assertValidNeighborCountForCell` with known pentagon cells and count $\ne 5$ (e.g., 4, 6, 0); must throw `PentagonalCoordinationViolationError`.
   - Verify instance of `PentagonalCoordinationViolationError`, `H3AdjacencyError`, and `H3TopologyViolationError`.
   - Verify error properties: `cellId`, `neighborCount`, `expectedCount === 5`.
3. **Hexagonal Negative & Positive Verification:**
   - Hexagon with 6 neighbors succeeds without throwing.
   - Hexagon with $\ne 6$ neighbors throws `HexagonalCoordinationViolationError`.
4. **Integration with `SpatialFluxMonad` Adjacency Step:**
   - Ensure spatial diffusion pipeline rejects invalid adjacency matrices targeting pentagon cells with 6 edges.

---

## 7. Architectural Risk Assessment

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| Downstream callers expecting generic `Error` | Low | `PentagonalCoordinationViolationError` inherits from `Error` via `H3TopologyViolationError`, preserving backward compatibility. |
| Border/Partial grid sub-sampling presenting $<5$ or $<6$ neighbors | Medium | Sub-sampled grids or non-global subsets should either utilize explicitly masked adjacency sets or use bounded boundary adapters. `assertValidNeighborCountForCell` enforces closed spherical topological integrity. |

---

## 8. Conclusion
This RFC establishes strict coordination checks tailored to the icosahedral dual grid structure. By distinguishing pentagonal cells ($z=5$) from hexagonal cells ($z=6$) and throwing `PentagonalCoordinationViolationError`, Sprint 078 guarantees topological consistency and upholds thermodynamic conservation across the discrete biosphere continuum.