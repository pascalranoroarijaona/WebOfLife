# RFC-080: Runtime Type Assertion for Pentagonal Neighbor Collections (`assertPentagonalNeighborArrayType`)

## 1. Metadata
- **RFC ID**: RFC-080
- **Sprint**: Sprint 080
- **Feature**: Topology Defensive Guard: Pentagonal Neighbor Array Type Assertion
- **Status**: Proposed
- **Author**: Chief Systems Architect
- **Date**: 2025-05-19
- **Target File**: `src/spatial/h3_adjacency.ts`

---

## 2. Executive Summary & Abstract
In the discrete global grid system (DGGS) powering Web of Life, the Earth's spherical surface is partitioned into an icosahedron-projected hexagonal mesh. By Euler's polyhedral formula ($V - E + F = 2$), any geodesic tessellation composed primarily of hexagonal cells must contain exactly twelve topologically singular pentagonal cells at each resolution level. While standard hexagonal cells possess degree-6 adjacency (six planar neighbors), pentagonal cells possess degree-5 adjacency (five planar neighbors).

During spatial mass-energy advection and diffusive transport computed across discrete cells via the `SpatialFluxMonad`, adjacency tables must be traversed deterministically. When processing pentagonal neighborhoods, malformed or degraded inputs (e.g., non-array objects, null references, numbers, or corrupted tensor pointers) risk silent evaluation failures, NaN propagation, or unclosed mass loops. 

This RFC specifies the introduction of `assertPentagonalNeighborArrayType` within `src/spatial/h3_adjacency.ts`. This runtime assertion verifies that any candidate pentagonal neighbor payload conforms strictly to the JavaScript `Array` type structure, throwing a descriptive `TypeError` immediately upon encountering non-array inputs. This defensive runtime verification establishes an airtight guardrail for topological stability and strict thermodynamic mass/energy conservation.

---

## 3. Motivation & Problem Statement

### 3.1 The Singular Topology of Pentagonal Cells
The H3 spatial indexing system yields 12 pentagonal cells per resolution scale centered upon the icosahedral vertices. In graph-theoretic terms, let $\mathcal{G} = (\mathcal{V}, \mathcal{E})$ denote the planetary cell graph. For a hexagonal cell $h \in \mathcal{V}_{\text{hex}}$, $\deg(h) = 6$. For a pentagonal cell $p \in \mathcal{V}_{\text{pent}}$, $\deg(p) = 5$. 

Adjacency calculation routines (such as `getPentagonNeighbors`, `kRing`, or directional edge expansions) assemble arrays of neighbor cell identifiers (such as `H3Index` strings or numeric hash representations). Subsequent monadic operations (e.g., `SpatialFluxMonad.advect`, `SpatialStateTensor.scatter`) map over neighbor arrays to distribute continuous ecological stocks:
$$
\sum_{k \in \mathcal{N}(p)} J_{p \to k} \cdot \Delta t
$$
If the neighbor payload $\mathcal{N}(p)$ passed to an adjacency resolution or boundary flux procedure is not an Array (for instance, an erroneous dictionary `{ "0": "...", "length": 5 }`, `null`, `undefined`, or a scalar index), non-defensive array iterations (`for...of`, `.forEach`, `.reduce`) will either throw generic runtime `TypeError: ... is not iterable` down-stack or silently bypass flux allocation, yielding mass/energy conservation violations (First Law violations).

### 3.2 Defensive Type Guard Contract
While TypeScript provides compile-time checking, serialized state transfers, worker message deserialization, dynamic WebAssembly grid bindings, and runtime configuration ingestion bypass static analysis. Introducing a dedicated assertion function `assertPentagonalNeighborArrayType` ensures that:
1. Invalid inputs are rejected immediately at the boundary of `h3_adjacency.ts`.
2. A formal JavaScript `TypeError` is thrown with an explicit diagnostic message when the input fails `Array.isArray(candidate)`.
3. TypeScript's control flow analysis narrows the variable type from `unknown` to `unknown[]` (or `any[]`) via an `asserts input is unknown[]` signature.

---

## 4. Technical Specification & Implementation Details

### 4.1 Function Signature & Behavior
Within `src/spatial/h3_adjacency.ts`, export the guard function:

```typescript
/**
 * Asserts that the provided pentagonal neighbor collection is a valid Array.
 *
 * In the H3 discrete global grid system, pentagonal cells possess a unique degree-5
 * topological neighborhood. Downstream flux distributors and adjacency kernels require
 * valid sequential array iterables. If the input is not an Array, a TypeError is thrown.
 *
 * @param neighbors - The candidate pentagonal neighbor collection to validate.
 * @throws {TypeError} If `neighbors` is not an Array.
 */
export function assertPentagonalNeighborArrayType(
  neighbors: unknown
): asserts neighbors is unknown[] {
  if (!Array.isArray(neighbors)) {
    const actualType = neighbors === null ? 'null' : typeof neighbors;
    throw new TypeError(
      `Invalid pentagonal neighbor collection: Expected an Array, received ${actualType}.`
    );
  }
}
```

### 4.2 Error Semantics
- **Target Exception**: `TypeError` (built-in JS exception).
- **Condition**: `!Array.isArray(neighbors)`.
- **Diagnostic Format**:
  - Must include the phrase `Expected an Array`.
  - Must explicitly report the received non-array type (`null`, `undefined`, `object`, `number`, `string`, `boolean`, etc.).
- **Return Value**: `void` (Assertion function pattern; TypeScript type narrowing).

### 4.3 Integration in `H3AdjacencyGraph` and Adjacency Kernels
The function shall be utilized in pentagon-specific adjacency methods and validation pipelines:
- Prior to inspecting length (e.g., verifying degree $\le 5$ or $k$-ring size).
- Prior to mapping neighbor indices to cell tensors in `SpatialFluxMonad`.
- In `validatePentagonAdjacency(cellIndex: string, neighbors: unknown): void`.

---

## 5. Architectural & Class Hierarchy Design

```
+--------------------------------------------------------------+
|                 src/spatial/h3_types.ts                      |
|  - H3Index: string                                           |
|  - AdjacencyMatrix                                           |
+--------------------------------------------------------------+
                               ^
                               |
+--------------------------------------------------------------+
|               src/spatial/h3_adjacency.ts                    |
|  + assertPentagonalNeighborArrayType(neighbors: unknown)     |
|  + assertPentagonDegree(neighbors: unknown[], maxDegree: 5)  |
|  + class H3AdjacencyGraph                                    |
|    - adjacencyMap: Map<string, string[]>                     |
|    + registerPentagon(index: string, neighbors: unknown)     |
|    + getNeighbors(index: string): string[]                   |
+--------------------------------------------------------------+
                               ^
                               |
+--------------------------------------------------------------+
|           src/spatial/spatial_flux_monad.ts                  |
|  - SpatialFluxMonad<T>                                       |
|  - bindAdjacency(graph: H3AdjacencyGraph)                    |
+--------------------------------------------------------------+
```

### 5.1 Incremental Design Principles
- **Zero Breaking Changes**: Does not alter existing `H3AdjacencyGraph` method signatures; adds defensive assertion utility and applies it internally.
- **Composition over Mutation**: `assertPentagonalNeighborArrayType` serves as a pure assertion gatekeeper that can be composed with degree checks (`assertPentagonDegree`) or index format validators (`assertH3Index`).

---

## 6. Thermodynamic Compliance (First and Second Laws)

### 6.1 First Law of Thermodynamics (Mass & Energy Conservation)
In a conservative finite-volume spatial flux scheme:
$$
\frac{d M_i}{d t} = \sum_{j \in \mathcal{N}(i)} J_{j \to i} A_{ij} + S_i
$$
where $M_i$ is cell mass, $J_{j \to i}$ is mass flux density across boundary $A_{ij}$, and $S_i$ is net internal source (which is zero for mass in a closed ecological envelope).
If $\mathcal{N}(i)$ is malformed or inaccessible due to invalid container types, the summation fails or truncates. Advection kernels calculating divergence ($\nabla \cdot \mathbf{J}$) will drop flux edges, causing mass creation or destruction ($d M_{\text{total}} / dt \ne 0$). Enforcing array integrity prevents unhandled exceptions midway through flux redistribution matrices.

### 6.2 Second Law of Thermodynamics (Entropy & Irreversibility)
Topological irregularities can cause artificial gradient reversals (e.g., negative chemical potentials or spontaneous concentration against chemical gradients). Strict topology checks preserve valid directional transport along directed graph edges, ensuring non-negative entropy generation:
$$
\dot{S}_{\text{gen}} = \sum_{\langle i, j \rangle} J_{i \to j} \left( \frac{1}{T_j} - \frac{1}{T_i} \right) \ge 0
$$

---

## 7. Interface Contracts

```typescript
// Core contract to be exported from src/spatial/h3_adjacency.ts
export function assertPentagonalNeighborArrayType(
  neighbors: unknown
): asserts neighbors is unknown[];
```

### Invariant Table:
| Input | Result |
| :--- | :--- |
| `[]` | Passes (valid Array) |
| `['8828308281fffff', '8828308283fffff']` | Passes (valid Array) |
| `[1, 2, 3]` | Passes (valid Array) |
| `null` | Throws `TypeError` |
| `undefined` | Throws `TypeError` |
| `'8828308281fffff'` | Throws `TypeError` |
| `12345` | Throws `TypeError` |
| `{}` | Throws `TypeError` |
| `new Set()` | Throws `TypeError` |
| `{ length: 5 }` | Throws `TypeError` |

---

## 8. Migration & Test Strategy

### 8.1 Test Plan (`tests/sprint_080.test.ts`)
1. **Valid Arrays**:
   - Empty array `[]`.
   - 5-element array of H3 indexes.
   - Mixed-content array.
2. **Invalid Types (TypeError Expected)**:
   - `null`
   - `undefined`
   - String literal (e.g., `"hex"`)
   - Numeric scalar (e.g., `42`)
   - Object literal / array-like object `{ 0: "a", length: 1 }`
   - Boolean (`true`, `false`)
   - Symbol (`Symbol()`)
   - Function (`() => {}`)
   - `Set` or `Map` collections
3. **Message Verification**:
   - Verify that the error is an instance of `TypeError`.
   - Verify that the error message clearly mentions expected `Array` and received type.
4. **Thermodynamic Guard Simulation**:
   - Verify that passing an invalid neighbor payload to a mock spatial flux routine fails cleanly before altering any cell stock balances.

---

## 9. Deliverables & Sprint Artifacts
1. `src/spatial/h3_adjacency.ts`: Implementation and export of `assertPentagonalNeighborArrayType`.
2. `tests/sprint_080.test.ts`: Comprehensive test suite verifying type checking, exceptions, and error messages.
3. Documentation updates in sprint 080 directories (`02_METHODS.md`, `03_RELEASE_NOTES.md`, `04_AUDIT.md`, etc.).