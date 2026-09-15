# RFC-081: Pentagonal Neighbor String Element Assertion (`assertPentagonalNeighborStringElements`)

- **Sprint:** 081
- **Author:** Chief Systems Architect
- **Status:** Approved / In Review
- **Target Subsystem:** `src/spatial/h3_adjacency.ts`
- **Related Modules:** `src/spatial/h3_grid.ts`, `src/spatial/h3_types.ts`, `src/monads/spatial_monad.ts`, `src/spatial/spatial_flux_monad.ts`

---

## 1. Executive Summary & Sprint Goal

### 1.1 Sprint Goal
Implement `assertPentagonalNeighborStringElements` validating that every element of a pentagonal neighbor array is a non-empty string in `src/spatial/h3_adjacency.ts`.

### 1.2 Motivation & Architectural Context
In the discrete global grid system (DGGS) derived from icosahedral projection via Uber H3, every resolution level contains exactly 12 topological pentagons embedded amidst a sea of hexagonal cells. Hexagonal cells possess a coordination number of $z = 6$, whereas pentagonal cells possess a coordination number of $z = 5$. 

When computing discrete spatial Laplacians, advection vectors, and conserved biochemical fluxes between adjacent cells across the planetary manifold, edge indices must strictly refer to valid, canonical cell identifiers (64-bit hex-encoded strings). Any structural corruption—such as `null`, `undefined`, empty string `""`, whitespace-only strings, or non-string primitives within the adjacency tuple—breaks index mapping, silently corrupts mass conservation in the `SpatialFluxMonad`, and causes thermodynamic leakage across partition boundaries.

To enforce deterministic topological continuity and guarantee closed-system mass-energy invariants, this RFC specifies `assertPentagonalNeighborStringElements` as a type-asserting predicate that strictly verifies every element of a pentagonal neighbor collection is a non-empty string.

---

## 2. Thermodynamic & Physical Invariants

The Web of Life engine operates under strict non-negotiable physical laws:
1. **First Law of Thermodynamics (Conservation of Energy & Mass):** 
   $$\sum_{i \in \mathcal{V}} \frac{d M_i}{d t} = \sum_{(i,j) \in \mathcal{E}} J_{ij}^{\text{matter}} = 0$$
   Total planetary matter is strictly invariant. No mass or chemical stock may appear or disappear. Adjacency graphs $\mathcal{G} = (\mathcal{V}, \mathcal{E})$ define the transport network through which mass flux $J_{ij}$ is conserved. If an adjacent neighbor address is invalid or empty, flux vectors fail to resolve their destination cell, creating an unmonitored sink or source.
2. **Second Law of Thermodynamics (Entropy & Dissipation):**
   $$d S_{\text{universe}} = d S_{\text{system}} + d S_{\text{surroundings}} \ge 0$$
   Free energy degrades monotonically via irreversible metabolic operations; only incoming solar radiation provides external negentropy. Boundary flux calculations must operate over closed, well-formed topological neighborhoods.
3. **Topological Closure of Pentagonal Singularities:**
   Pentagonal cells represent icosahedral vertices with deficit angle $\frac{\pi}{3}$. Adjacency vectors around pentagons have cardinality $|\mathcal{N}(p)| = 5$. Each neighbor $n_k \in \mathcal{N}(p)$ ($k \in \{0, 1, 2, 3, 4\}$) must resolve to a valid string identifier representing an adjacent cell.

---

## 3. Detailed Technical Specification

### 3.1 Function Signature & Type Narrowing Contract

The function `assertPentagonalNeighborStringElements` shall reside in `src/spatial/h3_adjacency.ts` and export the following TypeScript signature:

```typescript
/**
 * Validates that every element in a pentagonal neighbor array is a non-empty string.
 *
 * @param neighbors - The array of neighbor identifiers to validate.
 * @throws {TypeError} If the input is not an array, or if any element is not a string.
 * @throws {Error} If any element in the array is an empty string (or whitespace-only).
 */
export function assertPentagonalNeighborStringElements(
  neighbors: readonly unknown[]
): asserts neighbors is readonly string[];
```

### 3.2 Validation Semantics & Invariant Checks

The assertion enforces the following sequence of validation checks:
1. **Array Structure:** The input `neighbors` must be an `Array` (or readonly array). If not, throw `TypeError("Pentagonal neighbor collection must be an array")`.
2. **Element Type Check:** Each element `elem = neighbors[i]` must satisfy `typeof elem === 'string'`. If an element is of any other type (`number`, `object`, `null`, `undefined`, `boolean`, `symbol`, etc.), throw `TypeError("Pentagonal neighbor array element at index ${i} must be a string, received ${typeof elem}")`.
3. **Non-Empty String Check:** Each string element must satisfy `elem.trim().length > 0`. If `elem.length === 0` or consists solely of whitespace, throw `Error("Pentagonal neighbor array element at index ${i} must be a non-empty string")`.

### 3.3 Incremental Composition with Existing Pentagonal Validators

In earlier sprints (e.g., Sprint 080), adjacency validators such as `assertPentagonalNeighborCount` (verifying array length equals 5) were established. `assertPentagonalNeighborStringElements` complements these validations orthogonally:
- `assertPentagonalNeighborCount(neighbors)` validates cardinality ($|\mathcal{N}| = 5$).
- `assertPentagonalNeighborStringElements(neighbors)` validates element domain ($\forall x \in \mathcal{N}, x \in \text{String} \land |x| > 0$).

When composed inside `validatePentagonalAdjacency(neighbors)`:
```typescript
export function validatePentagonalNeighbors(neighbors: readonly unknown[]): readonly string[] {
  assertPentagonalNeighborCount(neighbors);
  assertPentagonalNeighborStringElements(neighbors);
  return neighbors;
}
```

---

## 4. Class Hierarchy & Architecture Additions

### 4.1 UML Architecture Diagram

```
+-------------------------------------------------------------+
|                      H3AdjacencyValidator                    |
+-------------------------------------------------------------+
| + assertHexagonalNeighborCount(neighbors: readonly unknown[])|
| + assertPentagonalNeighborCount(neighbors: readonly unknown[])|
| + assertPentagonalNeighborStringElements(n: readonly unknown[])|
| + validateAdjacencyRecord(record: H3AdjacencyRecord): void  |
+------------------------------+------------------------------+
                               | uses
                               v
+-------------------------------------------------------------+
|                      SpatialFluxMonad                        |
+-------------------------------------------------------------+
| - cellIndex: string                                         |
| - neighbors: readonly string[]                              |
| - stocks: Map<ChemicalStockKey, number>                     |
+-------------------------------------------------------------+
| + transferFlux(targetCell: string, flux: FluxTensor): void  |
| + getConservedNeighborhood(): readonly string[]             |
+-------------------------------------------------------------+
```

### 4.2 Integration within `SpatialFluxMonad`
The `SpatialFluxMonad` guarantees that every cellular diffusion step maps fluxes exclusively to verified adjacent cells. During neighbor resolution for pentagonal topological defects:
1. Raw H3 ring lookups generate neighbor lists.
2. `assertPentagonalNeighborStringElements` validates that uninitialized or padded indices are caught at the boundary before flux computation begins.
3. Conserved spatial redistribution proceeds with zero risk of dropped flux keys.

---

## 5. Implementation Details in `src/spatial/h3_adjacency.ts`

```typescript
/**
 * Asserts that every element of a pentagonal neighbor array is a non-empty string.
 *
 * @param neighbors - The array of neighbor identifiers to validate.
 * @throws {TypeError} If neighbors is not an array or any element is not a string.
 * @throws {Error} If any element is an empty or whitespace-only string.
 */
export function assertPentagonalNeighborStringElements(
  neighbors: readonly unknown[]
): asserts neighbors is readonly string[] {
  if (!Array.isArray(neighbors)) {
    throw new TypeError(
      `Pentagonal neighbor collection must be an array, received ${typeof neighbors}`
    );
  }

  for (let i = 0; i < neighbors.length; i++) {
    const elem = neighbors[i];
    if (typeof elem !== 'string') {
      throw new TypeError(
        `Pentagonal neighbor array element at index ${i} must be a string, received ${
          elem === null ? 'null' : typeof elem
        }`
      );
    }
    if (elem.trim().length === 0) {
      throw new Error(
        `Pentagonal neighbor array element at index ${i} must be a non-empty string`
      );
    }
  }
}
```

---

## 6. Verification Plan & Test Cases

The test suite in `tests/sprint_081.test.ts` shall verify the following scenarios:

| Test Case ID | Input Array | Expected Outcome |
| :--- | :--- | :--- |
| `TC-081-01` | `['85283473fffffff', '8528347bfffffff', '85283477fffffff', '8528340bfffffff', '85283407fffffff']` | Passes without error; narrows type to `readonly string[]` |
| `TC-081-02` | `['85283473fffffff', '']` | Throws `Error` ("non-empty string") |
| `TC-081-03` | `['85283473fffffff', '   ']` | Throws `Error` ("non-empty string") |
| `TC-081-04` | `['85283473fffffff', null, '85283477fffffff']` | Throws `TypeError` ("must be a string, received null") |
| `TC-081-05` | `['85283473fffffff', 12345]` | Throws `TypeError` ("must be a string, received number") |
| `TC-081-06` | `['85283473fffffff', undefined]` | Throws `TypeError` ("must be a string, received undefined") |
| `TC-081-07` | `null` or `undefined` as argument | Throws `TypeError` ("must be an array") |
| `TC-081-08` | `[]` (empty array) | Passes string element validation (vacuous truth; cardinality checked separately by count assertion) |

---

## 7. Migration & Backward Compatibility
- `assertPentagonalNeighborStringElements` is purely additive and does not break existing calls in `h3_adjacency.ts` or dependent spatial monads.
- All existing tests (`tests/sprint_001.test.ts` through `tests/sprint_080.test.ts`) continue to pass without regression.