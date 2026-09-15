# RFC 077: Cell Neighbor Count Assertion Specification (`assertValidNeighborCountForCell`)

## 1. Executive Summary & Context

In the discrete global grid system (DGGS) powering the Web of Life spatial topology, spatial flux exchanges between cells (energy, trophic matter, and entropy transports) depend upon rigorous topological invariants. Specifically, under the H3 geodesic discrete global grid, every cell possesses a strictly bounded direct neighborhood degree (topological valence): regular hexagonal cells must have exactly $6$ direct neighbors ($k=1$), while the $12$ base pentagonal cells at any given resolution possess exactly $5$ direct neighbors.

Sprint 077 introduces `assertValidNeighborCountForCell` to `src/spatial/h3_adjacency.ts`. This runtime assertion verifies that a candidate neighbor collection is an `Array` and that its cardinality matches the precise topological expectation determined by `isExpectedNeighborCountForCell(cellId, count)`. By failing fast upon detecting topological anomalies or corrupted adjacency sets, this assertion defends the system against illegal flux boundary definitions, preventing boundary leakage and violating the First and Second Laws of Thermodynamics.

---

## 2. Sprint Goal & Objectives

### Sprint Goal
Implement `assertValidNeighborCountForCell` taking `cellId` and `neighbors` array, asserting array type and calling `isExpectedNeighborCountForCell` in `src/spatial/h3_adjacency.ts`.

### Key Objectives
1. **Type Safety & Runtime Invariant Enforcement**:
   - Ensure the input argument `neighbors` is validated as an Array (`Array.isArray(neighbors)`).
   - Reject nullish, non-array, or scalar inputs by throwing a descriptive `TypeError`.
2. **Topological Cardinality Verification**:
   - Call `isExpectedNeighborCountForCell(cellId, neighbors.length)` to determine validity against the pentagon/hexagon dichotomy.
   - Throw a descriptive `RangeError` (or `Error`) detailing `cellId`, observed length, and expected count if the cardinality fails the topological expectation check.
3. **Conservative Integration**:
   - Preserve existing function signatures in `src/spatial/h3_adjacency.ts`.
   - Maintain zero overhead for valid configurations, ensuring smooth integration with `SpatialFluxMonad` and `H3Grid`.

---

## 3. Mathematical & Topological Foundations

### 3.1 Valence Invariants on $S^2$
The Earth's surface $S^2$ is discretized into an icosahedral aperture-7 or aperture-3 hexagonal grid. By Euler's polyhedral formula:
$$V - E + F = 2$$
A pure hexagonal tiling of the sphere is topologically impossible; exactly $12$ pentagonal cells must exist at any discrete resolution $r \in [0, 15]$.

Let $c \in \mathcal{C}$ represent an H3 cell identifier. The topological valence degree $d(c)$ is defined as:
$$d(c) = \begin{cases} 5 & \text{if } c \text{ is a pentagon} \\ 6 & \text{if } c \text{ is a hexagon} \end{cases}$$

### 3.2 Thermodynamic Boundary Integrity
In `SpatialFluxMonad`, inter-cell trophic transfer $\Delta M_{i \to j}$ across boundary edge $e_{ij}$ satisfies:
$$\sum_{j \in \mathcal{N}(i)} J_{i \to j} = -\frac{d M_i}{dt}$$
If an unvalidated neighbor list contains duplicate, omitted, or spurious edges ($|\mathcal{N}(i)| \neq d(c)$), the flux summation over boundaries generates fictitious source or sink terms:
$$\oint_{\partial \Omega} \vec{J} \cdot d\vec{A} \neq 0$$
which directly violates mass and energy conservation. Strict assertion of neighbor count guarantees closed-volume thermodynamic conservation.

---

## 4. Technical Design & Interface Specifications

### 4.1 Interface Contract in `src/spatial/h3_adjacency.ts`

```typescript
/**
 * Asserts that the provided neighbor collection is an array and conforms
 * to the exact expected topological neighbor count for the specified H3 cell.
 *
 * @param cellId - The H3 index string representing the cell.
 * @param neighbors - The candidate collection of neighbor cell identifiers.
 * @throws {TypeError} If `neighbors` is not an Array.
 * @throws {RangeError | Error} If `neighbors.length` does not match the expected topological neighbor count.
 */
export function assertValidNeighborCountForCell(
  cellId: string,
  neighbors: unknown
): asserts neighbors is readonly unknown[];
```

### 4.2 Detailed Control Flow

1. **Parameter Inspection**:
   - Verify `cellId` is a non-empty string.
   - Verify `Array.isArray(neighbors)`. If false, throw `TypeError("Expected neighbors to be an array for cell " + cellId)`.
2. **Topological Count Verification**:
   - Read `const count = neighbors.length`.
   - Invoke `isExpectedNeighborCountForCell(cellId, count)`.
   - If false:
     - Formulate an error message indicating the invalid count: e.g., `Invalid neighbor count ${count} for cell ${cellId} (expected 5 for pentagon or 6 for hexagon)`.
     - Throw a `RangeError` (or `Error`).
3. **Return**:
   - Returns `void` upon successful assertion, narrowing the TypeScript type of `neighbors` to `readonly unknown[]` (or `string[]`).

---

## 5. Architectural Alignment & Incremental Design

- **Module**: `src/spatial/h3_adjacency.ts`
- **Dependencies**:
  - Leverages existing `isExpectedNeighborCountForCell(cellId: string, count: number): boolean` within the same module.
  - Leverages H3 pentagon detection (`h3IsPentagon` / `isPentagonCell`) existing within the spatial subsystem.
- **Composition**:
  - Functions in `src/spatial/h3_grid.ts` and `src/spatial/spatial_flux_monad.ts` can incorporate `assertValidNeighborCountForCell` during neighborhood traversal and flux matrix assembly without altering existing data structures.

---

## 6. Verification & Test Plan

Unit test suite `tests/sprint_077.test.ts` will validate:
1. **Type Checking**:
   - Throws `TypeError` when `neighbors` is `null`, `undefined`, a number, a string, or an object literal.
2. **Valid Hexagonal Counts**:
   - Passes quietly when a standard hexagonal `cellId` is provided with an array of $6$ items.
3. **Valid Pentagonal Counts**:
   - Passes quietly when a known pentagonal `cellId` is provided with an array of $5$ items.
4. **Invalid Counts**:
   - Throws error when a hexagonal cell is passed an array of $5$, $7$, or $0$ items.
   - Throws error when a pentagonal cell is passed an array of $6$, $4$, or $0$ items.
5. **Error Messages**:
   - Diagnostic messages include the offending `cellId` and received length.