# RFC-083: Pentagon Directional Topology Specification

## 1. Executive Summary & Sprint Goal

### Sprint Goal
Define the `PentagonDirectionalTopology` interface with `presentDirections` and `omittedDirection` in `src/spatial/h3_types.ts`.

### Purpose & Architectural Context
The Web of Life simulation models continuous thermodynamic and ecological flows across a spherical discrete global grid system based on the H3 hierarchical hexagonal geospatial index. In any geodesic icosahedral grid discretization, Euler's polyhedral formula ($V - E + F = 2$) mandates the existence of exactly 12 topologically non-hexagonal (pentagonal) cells per resolution level.

Standard hexagonal cells feature valence-6 connectivity (6 directional adjacent neighbors). In contrast, pentagonal cells feature valence-5 connectivity, where one of the canonical directional neighbor orientations is topologically omitted or degenerate. For thermodynamic flux routing (mass conservation $\nabla \cdot \vec{J}_M = 0$, advective dispersal of dissolved carbon, trophic biomass, and moisture), transport tensors across pentagonal cells must formally account for the missing direction vector. Routing matter or energy through a non-existent direction leads to mass leakage, violating the First Law of Thermodynamics, or undefined boundary evaluation.

This RFC defines the formal contract `PentagonDirectionalTopology` within `src/spatial/h3_types.ts`, specifying the exact directional structures (`presentDirections` and `omittedDirection`) required for invariant-preserving discrete spatial calculus.

---

## 2. Theoretical & Mathematical Foundations

### 2.1 Icosahedral Grid Geodesics and Pentagonal Singularities
Let $\mathcal{G}_r = (\mathcal{V}_r, \mathcal{E}_r)$ be an H3 discrete global grid at resolution $r \in \mathbb{N}_{\ge 0}$.
For every hexagonal cell $h \in \mathcal{V}_r \setminus \mathcal{P}_r$, the topological neighborhood $\mathcal{N}(h)$ has cardinality:
$$|\mathcal{N}(h)| = 6$$

For every pentagonal cell $p \in \mathcal{P}_r$, where $|\mathcal{P}_r| = 12$:
$$|\mathcal{N}(p)| = 5$$

In canonical H3 coordinate space, neighbor directions are designated by discrete integer offsets $\mathcal{D} = \{1, 2, 3, 4, 5, 6\}$ (or canonical aperture-3 directional indices $\mathcal{D}_0 \subset \{0, \dots, 6\}$). For any pentagonal cell $p$, exactly one directional axis $d_\varnothing \in \mathcal{D}$ is geometrically undefined or omitted:
$$\mathcal{D}_{\text{present}}(p) = \mathcal{D} \setminus \{ d_\varnothing(p) \}, \quad |\mathcal{D}_{\text{present}}(p)| = 5$$
$$d_\varnothing(p) \in \mathcal{D}, \quad \text{where } d_\varnothing(p) \text{ is the omitted direction.}$$

### 2.2 First and Second Law Compliance
1. **First Law of Thermodynamics (Mass & Energy Conservation):**
   The spatial divergence of stock vector $\vec{S} = [C, N, P, H_2O]^T$ at pentagon $p$ is evaluated strictly across present directional facets:
   $$\frac{\mathrm{d}S_p}{\mathrm{d}t} = \Phi_{\text{solar}} \delta_{S,E} - \sum_{d \in \mathcal{D}_{\text{present}}(p)} J_{p \to \mathcal{N}_d(p)} + \sum_{d \in \mathcal{D}_{\text{present}}(p)} J_{\mathcal{N}_d(p) \to p} - R_{\text{sink}}$$
   By construction, the flux along the omitted direction is identically zero:
   $$J_{p \to d_\varnothing(p)} \equiv 0, \quad J_{d_\varnothing(p) \to p} \equiv 0$$
   Explicitly modeling `omittedDirection` and `presentDirections` guarantees that spatial flux tensors do not allocate, leak, or evaluate unallocated mass into null topological buffers.

2. **Second Law of Thermodynamics (Entropy & Irreversibility):**
   Flux dissipation $\sigma = T^{-1} \sum J \cdot (-\nabla \mu) \ge 0$ remains strictly positive and bounded, as gradient evaluations only span active geometric edges without spurious boundary reflections.

---

## 3. Interface Contract & Type Additions

The interface is integrated into `src/spatial/h3_types.ts` adhering to strict TypeScript types, immutability (`readonly`), and zero runtime overhead for typings.

```typescript
/**
 * Canonical directional indices in H3 discrete coordinate space.
 * In H3 aperture grid systems, directions 1..6 designate neighbor offsets.
 */
export type H3Direction = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Directional topology of an H3 pentagonal cell.
 * Pentagons possess valence-5 connectivity, leaving exactly one
 * canonical directional facet omitted.
 */
export interface PentagonDirectionalTopology {
  /**
   * The 5 active directional axes connecting the pentagon to adjacent cells.
   * Guaranteed to contain exactly 5 distinct directions.
   */
  readonly presentDirections: readonly H3Direction[];

  /**
   * The single directional axis omitted from the pentagon's 6-neighborhood.
   * Any flux vector along this direction is strictly zero.
   */
  readonly omittedDirection: H3Direction;
}
```

### 3.1 Validation Invariants
Any implementation or instance of `PentagonDirectionalTopology` must satisfy:
1. `presentDirections.length === 5`
2. `omittedDirection` is not included in `presentDirections`:
   $$\forall d \in \text{presentDirections}, \quad d \ne \text{omittedDirection}$$
3. Union completeness:
   $$\{ \text{omittedDirection} \} \cup \bigcup_{i=0}^4 \{ \text{presentDirections}[i] \} = \{ 1, 2, 3, 4, 5, 6 \}$$

---

## 4. Class Hierarchy & Monad Integration Architecture

```
+-------------------------------------------------------------+
|                     src/spatial/h3_types.ts                 |
|                                                             |
|  +-------------------------------------------------------+  |
|  | <<interface>> PentagonDirectionalTopology            |  |
|  | - presentDirections: readonly H3Direction[]           |  |
|  | - omittedDirection: H3Direction                       |  |
|  +-------------------------------------------------------+  |
|                                                             |
+-------------------------------------------------------------+
                               ^
                               | implements / utilizes
+-------------------------------------------------------------+
|                  src/spatial/h3_adjacency.ts                |
|                                                             |
|  +-------------------------------------------------------+  |
|  | <<class>> H3AdjacencyService                          |  |
|  | + getPentagonTopology(cell: H3Index):                 |  |
|  |       PentagonDirectionalTopology                     |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
                               ^
                               | feeds directional fluxes
+-------------------------------------------------------------+
|               src/spatial/spatial_flux_monad.ts             |
|                                                             |
|  +-------------------------------------------------------+  |
|  | <<class>> SpatialFluxMonad<TStock>                     |  |
|  | + routePentagonFlux(topology:                         |  |
|  |       PentagonDirectionalTopology, stocks: TStock[]): |  |
|  |       TStock                                          |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```

### 4.1 Stock Transition Invariant
For a spatial monad step $\mathcal{M}: \text{State} \to \text{State}$:
$$\sum_{c \in \mathcal{V}_r} \text{Mass}(c, t + \Delta t) = \sum_{c \in \mathcal{V}_r} \text{Mass}(c, t)$$
The spatial flux monad validates that no mass transitions are scheduled along `topology.omittedDirection`.

---

## 5. Implementation & Test Plan

### 5.1 Type Definitions
- Add `H3Direction` and `PentagonDirectionalTopology` to `src/spatial/h3_types.ts`.
- Export them alongside existing H3 types (`H3Index`, `H3Resolution`, etc.).

### 5.2 Unit Verification (`tests/sprint_083.test.ts`)
- **Type Compatibility Test:** Validate compile-time assignment of pentagon topological configurations.
- **Invariant Tests:**
  - Verify that a valid pentagon directional topology contains exactly 5 `presentDirections`.
  - Verify that `omittedDirection` is disjoint from `presentDirections`.
  - Verify that all 6 directions in $\{1, 2, 3, 4, 5, 6\}$ are accounted for.
- **Thermodynamic Guardrail Test:** Verify that attempting to route mass across `omittedDirection` throws a compile-time or runtime guard error, maintaining zero mass drift.