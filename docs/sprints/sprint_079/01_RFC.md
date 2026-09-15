# RFC-079: Validation Predicate for Pentagonal Neighbor Array Lengths in H3 Adjacency Topologies

**Status:** Proposed  
**Author:** Chief Systems Architect  
**Sprint:** 079  
**Domain:** `src/spatial/h3_adjacency.ts`  
**Dependencies:** `src/spatial/h3_types.ts`, `src/spatial/h3_grid.ts`, `src/thermodynamics/constants.ts`  

---

## 1. Executive Summary

In the discrete global grid system (DGGS) utilized by the Web of Life planetary simulation (based on hierarchical hexagonal icosahedral projections), spherical topology necessitates exactly twelve pentagonal cells at every resolution level, in accordance with Euler's polyhedral formula $V - E + F = 2$. While standard hexagonal cells possess coordinate coordination number $z = 6$, pentagonal cells possess coordination number $z = 5$.

Sprint 079 introduces the formal predicate `isPentagonNeighborArrayLengthValid` in `src/spatial/h3_adjacency.ts`. This predicate verifies whether a neighbor candidate array or length metric satisfies the strict pentagonal adjacency condition ($|N_p| = 5$). Establishing this predicate is vital for robust topological boundary traversal, conserving mass-energy fluxes during spatial diffusion operations across non-hexagonal singularities, and preventing out-of-bounds or undefined index operations in spatial monad pipelines.

---

## 2. Context & Background

The Web of Life simulation models physical and biogeochemical transport processes across discrete spatial tessellations via `SpatialFluxMonad` and `SpatialMonad`. Prior sprints solidified hexagonal neighborhood invariants ($|N_h| = 6$). However, traversing planetary surfaces without explicitly handling the twelve topological pentagons introduces runtime anomalies and flux-conservation leakage when adjacency arrays of length 5 are evaluated against standard 6-neighbor iterations.

To preserve strict physical and numerical soundness:
1. Adjacency collections for pentagonal cells must contain exactly 5 contiguous neighbor indices.
2. Adjacency algorithms must safely distinguish between valid pentagon neighborhoods and malformed neighbor collections before allocating flux matrices.
3. The predicate must be composable with existing H3 adjacency validators, supporting both raw array instances (`readonly unknown[]`) and scalar length values (`number`).

---

## 3. Mathematical & Physical Formalism

### 3.1 Topological Invariants of Icosahedral DGGS

Euler's polyhedral characteristic for a closed 2-manifold homeomorphic to $S^2$ is:
$$\chi = V - E + F = 2$$

In any trivalent/hexagonal geodesic subdivision of an icosahedron, the total number of non-hexagonal faces required to close the sphere is governed by:
$$\sum_{k \ge 3} (6 - k) F_k = 12$$
Assuming only hexagons ($k=6$) and pentagons ($k=5$), the number of pentagonal cells $F_5$ is invariant across all resolutions $r \in \mathbb{N}$:
$$F_5 = 12$$

Each pentagonal cell $c_{\text{pent}}$ exhibits topological degree:
$$\operatorname{deg}(c_{\text{pent}}) = |N(c_{\text{pent}})| = 5$$

### 3.2 First and Second Law Compliance in Pentagonal Fluxes

Thermodynamic diffusion of mass stock $M$ (carbon, nitrogen, water) and thermal energy $U$ across cell interfaces is given by the discrete divergence:
$$\frac{d M_i}{dt} = \sum_{j \in N(i)} J_{j \to i} + \Phi_i^{\text{source}}$$

Where:
- For hexagonal cells: $|N(i)| = 6$.
- For pentagonal cells: $|N(i)| = 5$.

If an adjacency array for a pentagon incorrectly includes an extraneous null reference or omits a face (i.e., $|N_p| \neq 5$), the net divergence calculation:
$$\sum_{j=1}^k J_{j \to i}$$
violates mass conservation (First Law: $\Delta M_{\text{closed}} \ne 0$) and generates fictitious numerical entropy sinks or sources (violating the Second Law: $dS_{\text{univ}} \ge 0$).

The predicate `isPentagonNeighborArrayLengthValid` guarantees that $|N(c_{\text{pent}})| \equiv 5$, providing an axiomatic pre-condition for conservative flux monad computations.

---

## 4. Specification & Interface Contracts

### 4.1 Function Signature & Type Overloads

The predicate `isPentagonNeighborArrayLengthValid` is exported from `src/spatial/h3_adjacency.ts`. It accepts either a numeric length or an array-like container and returns `true` if and only if the neighbor count is strictly equal to $5$.

```typescript
/**
 * Constant defining the expected neighbor count for pentagonal cells in H3/DGGS.
 */
export const H3_PENTAGON_NEIGHBOR_COUNT = 5 as const;

/**
 * Validates whether the neighbor array length (or neighbor array itself) satisfies
 * the topological requirement for an H3 pentagon (exactly 5 neighbors).
 *
 * @param input - The array of neighbors or the numeric length to validate.
 * @returns True if the input represents a valid pentagonal neighbor count (5), false otherwise.
 */
export function isPentagonNeighborArrayLengthValid(
  input: readonly unknown[] | number | null | undefined
): boolean;
```

### 4.2 Behavior Matrix

| Input Value | Evaluation Path | Output | Justification |
| :--- | :--- | :--- | :--- |
| `5` | Scalar integer | `true` | Valid pentagon neighbor count |
| `[c1, c2, c3, c4, c5]` | Array with length 5 | `true` | Valid neighbor array |
| `6` | Scalar integer | `false` | Hexagonal count, not pentagonal |
| `[c1, c2, c3, c4, c5, c6]` | Array with length 6 | `false` | Hexagonal neighbor array |
| `0`, `1`, `4`, `7` | Scalar integer | `false` | Invalid neighbor count |
| `[]` | Empty array | `false` | Invalid length 0 |
| `5.0001`, `NaN`, `Infinity` | Non-integer scalar | `false` | Malformed numeric input |
| `null`, `undefined` | Nullish input | `false` | Non-existent neighbor container |
| `{ length: 5 }` | Object without array proto | `false` (or handled via Array check) | Strict structural validation |

---

## 5. Object-Oriented & Incremental Architecture

The implementation adheres to the project's incremental design principles:

```
+-------------------------------------------------------------+
|                     src/spatial/h3_types.ts                 |
| - IH3CellIndex, H3Direction, CellTopologyType                |
+-------------------------------------------------------------+
                               ^
                               |
+-------------------------------------------------------------+
|                  src/spatial/h3_adjacency.ts                |
| - H3_PENTAGON_NEIGHBOR_COUNT = 5                            |
| - H3_HEXAGON_NEIGHBOR_COUNT = 6                             |
| - isPentagonNeighborArrayLengthValid(input): boolean        |
| - isHexagonNeighborArrayLengthValid(input): boolean         |
| - H3AdjacencyValidator (class / namespace utilities)         |
+-------------------------------------------------------------+
                               ^
                               |
+-------------------------------------------------------------+
|             src/spatial/spatial_flux_monad.ts               |
| - SpatialFluxMonad<T>                                       |
|   * validateCellNeighborhood(cell, neighbors)                |
|   * computeConservativeFluxDivergence()                     |
+-------------------------------------------------------------+
```

1. **Composition and Reusability**: Existing adjacency validation methods in `h3_adjacency.ts` can invoke `isPentagonNeighborArrayLengthValid` during cell-type routing (e.g., when branching between `CellTopologyType.HEXAGON` and `CellTopologyType.PENTAGON`).
2. **Defensive Typing**: By accepting `readonly unknown[] | number | null | undefined`, the function serves both low-level numerical routines that operate on primitive lengths and high-level monadic pipelines passing neighbor arrays.

---

## 6. Detailed Implementation Design

In `src/spatial/h3_adjacency.ts`:

```typescript
export const H3_PENTAGON_NEIGHBOR_COUNT = 5;

export function isPentagonNeighborArrayLengthValid(
  input: readonly unknown[] | number | null | undefined
): boolean {
  if (input === null || input === undefined) {
    return false;
  }

  if (typeof input === 'number') {
    return Number.isInteger(input) && input === H3_PENTAGON_NEIGHBOR_COUNT;
  }

  if (Array.isArray(input)) {
    return input.length === H3_PENTAGON_NEIGHBOR_COUNT;
  }

  return false;
}
```

---

## 7. Verification & Testing Matrix

The implementation will be verified in `tests/sprint_079.test.ts` covering:

1. **Valid Pentagonal Configurations**:
   - Scalar value `5` returns `true`.
   - String array of length 5 returns `true`.
   - Object/numeric array of length 5 returns `true`.

2. **Invalid Hexagonal / Perturbed Configurations**:
   - Scalar value `6` returns `false`.
   - Array of length 6 returns `false`.
   - Arrays of length 0, 1, 4, 7 return `false`.

3. **Boundary and Malformed Inputs**:
   - `null` and `undefined` return `false`.
   - Floating point `5.5` or non-integer `5.000001` returns `false`.
   - `NaN`, `+Infinity`, `-Infinity` return `false`.
   - Empty array `[]` returns `false`.

4. **Thermodynamic Integration Test**:
   - Ensure a simulated pentagonal vertex in `SpatialFluxMonad` triggers adjacency verification with `isPentagonNeighborArrayLengthValid`, confirming zero flux loss across 5 adjacent facets.

---

## 8. Rollout Plan & Backlog Link

- **Sprint 079**:
  - Implement `H3_PENTAGON_NEIGHBOR_COUNT` constant and `isPentagonNeighborArrayLengthValid` in `src/spatial/h3_adjacency.ts`.
  - Add comprehensive test suite in `tests/sprint_079.test.ts`.
  - Update UML diagrams and architectural notes.
- **Sprint 080+**:
  - Integrate `isPentagonNeighborArrayLengthValid` into the automated boundary mesh validator in `h3_grid.ts`.
  - Connect pentagonal neighbor validations to `TrophicMonad` biomass diffusion tests.