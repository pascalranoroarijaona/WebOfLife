# RFC-076: Neighbor Array Length Validation via `isExpectedNeighborCountForCell`

- **Author**: Chief Systems Architect
- **Sprint**: 076
- **Status**: Proposed
- **Area**: Spatial Engine / Discrete Global Grid System (`src/spatial/h3_adjacency.ts`)
- **Related Modules**: `src/spatial/h3_grid.ts`, `src/spatial/spatial_flux_monad.ts`, `src/thermodynamics/constants.ts`

---

## 1. Executive Summary

In Discrete Global Grid Systems (DGGS) based on hierarchical icosahedral hexagonal decomposition (Uber H3), the topological valence of any cell is strictly constrained by Euler's polyhedron formula ($V - E + F = 2$). On a sphere, exactly 12 pentagonal cells exist at each resolution level, each possessing a topological degree (neighbor count) of 5, while all other cells are regular hexagons with a topological degree of 6.

Sprint 076 introduces `isExpectedNeighborCountForCell(cellId: string, neighbors: readonly string[]): boolean` into `src/spatial/h3_adjacency.ts`. This predicate verifies whether the length of an observed neighbor index collection strictly conforms to the expected topological degree of `cellId` by directly composing over `isExpectedNeighborCount(cellId: string, count: number): boolean`. By providing a type-safe, non-mutating validation gateway, this enhancement prevents dimensional mismatch errors during directional flux monad evaluation and conserves mass/energy across topological boundaries.

---

## 2. Background & Motivation

Spatial flux monads (`SpatialFluxMonad`) and trophic diffusion mechanisms rely on discrete adjacency kernels to propagate energy, nutrients, and biomass across cells. When calculating finite-difference approximations for spatial Laplacians or allocating directional advective transfers:

$$\sum_{j \in \mathcal{N}(i)} \Phi_{ij} = -\frac{\mathrm{d}S_i}{\mathrm{d}t}$$

an undetected truncation, duplicate entry, or boundary omission in the neighbor list $\mathcal{N}(i)$ leads directly to thermodynamic leakage—violating the First Law of Thermodynamics (matter and energy conservation). 

While `isExpectedNeighborCount(cellId: string, count: number)` verifies whether an arbitrary integer matches the cell's topological valence ($5$ for pentagons, $6$ for standard hexagons), higher-level systems frequently handle materialized collections of neighbor strings (e.g., `string[]` or `readonly string[]`). Prior to this sprint, callers were forced to manually access `.length` and pass it to `isExpectedNeighborCount`, leading to repeated boilerplate, potential `undefined`/`null` dereference risks, and inconsistent handling of empty or malformed collections. 

`isExpectedNeighborCountForCell` encapsulates this validation logic into a clean, single-responsibility predicate that integrates seamlessly with existing spatial verification pipelines.

---

## 3. Thermodynamic & Topological Invariants

### 3.1 Euler Characteristic & Icosahedral Pentagons
For an icosahedral tessellation at resolution $r$:
- Total pentagons: $|\mathcal{P}| = 12$ for all $r \ge 0$.
- Valence function $\delta(c)$:
  $$\delta(c) = \begin{cases} 5, & \text{if } c \in \mathcal{P} \\ 6, & \text{if } c \notin \mathcal{P} \end{cases}$$

### 3.2 First Law Conservation Invariant
Let $M_i$ be the mass stock of cell $i$, and $J_{ij}$ be the mass flux from cell $i$ to neighbor $j \in \mathcal{N}(i)$. A spatial transfer kernel is conservative if and only if:

$$\sum_{j \in \mathcal{N}(i)} J_{ij} = - \sum_{j \in \mathcal{N}(i)} J_{ji} \implies \frac{\mathrm{d}}{\mathrm{d}t} \sum_{k \in \mathcal{G}} M_k = 0$$

If $|\mathcal{N}(i)| \ne \delta(i)$, flux tensors allocated over incomplete neighbor arrays omit surface exchange boundaries, causing artificial mass destruction or generation. Validating that `neighbors.length == \delta(i)` before flux tensor contraction guarantees boundary completeness.

---

## 4. Technical Specification & Interface Contracts

### 4.1 Interface Specification
In `src/spatial/h3_adjacency.ts`, export the following function:

```typescript
/**
 * Validates whether the length of a neighbor string array matches the
 * expected topological neighbor count for the given H3 cell.
 *
 * Pentagonal cells expect exactly 5 neighbors; hexagonal cells expect 6.
 *
 * @param cellId - The H3 index of the target cell.
 * @param neighbors - An array of neighboring H3 cell identifier strings.
 * @returns True if neighbors is an array and its length matches the expected count for cellId; false otherwise.
 */
export function isExpectedNeighborCountForCell(
  cellId: string,
  neighbors: readonly string[]
): boolean;
```

### 4.2 Behavioral Invariants & Edge Cases
1. **Purity**: The function must be pure, synchronous, and non-mutating.
2. **Defensive Guards**:
   - If `cellId` is invalid, malformed, empty, or not recognized as a valid H3 cell, return `false`.
   - If `neighbors` is `null`, `undefined`, or not an Array, return `false`.
3. **Delegation**:
   - The method must delegate count validation directly to `isExpectedNeighborCount(cellId, neighbors.length)` to guarantee single-point-of-truth semantics.
4. **Hexagonal Cell Contract**:
   - Given a standard hexagonal cell index and `neighbors.length === 6`, evaluates to `true`.
   - Any other length evaluates to `false`.
5. **Pentagonal Cell Contract**:
   - Given a known pentagonal cell index and `neighbors.length === 5`, evaluates to `true`.
   - Any other length evaluates to `false`.

---

## 5. Architectural & OOP Design Integration

```
+----------------------------------------------------------------------+
|                     src/spatial/h3_adjacency.ts                     |
+----------------------------------------------------------------------+
|  + isCellPentagon(cellId: string): boolean                           |
|  + getExpectedNeighborCount(cellId: string): number                  |
|  + isExpectedNeighborCount(cellId: string, count: number): boolean   |
|  + isExpectedNeighborCountForCell(                                   |
|       cellId: string,                                                |
|       neighbors: readonly string[]                                   |
|    ): boolean                                                        |
+-----------------------------------+----------------------------------+
                                    |
                                    v (invoked by)
+----------------------------------------------------------------------+
|                  src/spatial/spatial_flux_monad.ts                   |
+----------------------------------------------------------------------+
|  + SpatialFluxMonad<T>                                               |
|      - validateKernelTopology(cellId, neighbors): boolean            |
|      - computeAdvectiveDiffusion(tensor): FluxTensor                 |
+----------------------------------------------------------------------+
```

### 5.1 Reusability & Functional Composition
`isExpectedNeighborCountForCell` does not duplicate the internal pentagon table lookup or resolution-checking logic. It directly leverages `isExpectedNeighborCount`, maintaining strict DRY (Don't Repeat Yourself) design principles.

---

## 6. Implementation Plan

1. **Update `src/spatial/h3_adjacency.ts`**:
   - Implement `isExpectedNeighborCountForCell`.
   - Add explicit TypeScript docstrings and export declaration.
2. **Implement Unit & Property Tests in `tests/sprint_076.test.ts`**:
   - Hexagonal cell verification with 6 neighbors (pass).
   - Hexagonal cell verification with 5, 7, 0, or negative numbers (fail).
   - Pentagonal cell verification with 5 neighbors (pass).
   - Pentagonal cell verification with 6, 4, 0 neighbors (fail).
   - Null / undefined / empty neighbor array handling.
   - Malformed cell ID handling.
   - Immutability assertions on the passed array.

---

## 7. Verification & Acceptance Criteria

| ID | Test Case | Expected Result |
|---|---|---|
| AC-076-01 | Valid hexagonal cell ID with array of 6 strings | `true` |
| AC-076-02 | Valid hexagonal cell ID with array of 5 strings | `false` |
| AC-076-03 | Valid pentagonal cell ID with array of 5 strings | `true` |
| AC-076-04 | Valid pentagonal cell ID with array of 6 strings | `false` |
| AC-076-05 | Invalid or non-hex string cell ID | `false` |
| AC-076-06 | Non-array or null/undefined neighbor argument | `false` |
| AC-076-07 | Functional composition: delegating to `isExpectedNeighborCount` | Verified |