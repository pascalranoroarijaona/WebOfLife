# RFC-075: Coordination Number Adjacency Verification (`isExpectedNeighborCount`)

- **Author**: Chief Systems Architect
- **Status**: Draft / Proposed
- **Sprint**: Sprint 075
- **Created**: 2025-05-18
- **Domain**: Spatial Geometry & Topological Adjacency (`src/spatial/h3_adjacency.ts`)
- **Affects**: `src/spatial/h3_adjacency.ts`, `src/spatial/h3_types.ts`, `src/spatial/spatial_flux_monad.ts`

---

## 1. Executive Summary & Objective

In the discrete global geodesic grid (DGGS) topology of Earth Pod simulations, the planet's surface is discretized using the H3 hexagonal hierarchical spatial index. Under Euler's polyhedral formula ($V - E + F = 2$) applied to a spherical icosahedron, any global hexagonal tessellation unavoidably contains exactly 12 pentagonal cells per resolution level, while all remaining tessellation units are regular hexagons. Consequently, the local topological coordination number—the count of immediate directional spatial neighbors—varies strictly between 5 (for icosahedral pentagonal singularities) and 6 (for Euclidean/spherical hexagonal tiles).

During mass and thermal flux transitions executed via the `SpatialFluxMonad`, mass-energy conservation invariants require exact topological partitioning. If neighbor enumeration or neighborhood boundary extraction yields incomplete or spurious adjacencies (e.g., due to coordinate truncation, missing buffer cells, or boundary condition errors), flux kernels fail to conserve matter, violating the First Law of Thermodynamics.

This RFC defines the formal specification, interface contract, and thermodynamic integration for `isExpectedNeighborCount` within `src/spatial/h3_adjacency.ts`. The predicate compares a numeric candidate count against the topological reference coordination number obtained via `getCoordinationNumber(cellIndex)`, providing an authoritative, zero-allocation verification mechanism for spatial adjacency integrity.

---

## 2. Theoretical & Mathematical Foundations

### 2.1 Euler Characteristic and Icosahedral Coordination Topology

Let $\mathcal{M}$ be a closed 2-manifold homeomorphic to the 2-sphere $\mathbb{S}^2$. A discrete cell decomposition of $\mathcal{M}$ into polygons with face degrees $d(f_i)$ must satisfy Euler's formula:

$$V - E + F = \chi(\mathbb{S}^2) = 2$$

For a tiling composed exclusively of hexagons ($d(f) = 6$) and pentagons ($d(f) = 5$) where each vertex has degree 3 (trivalent vertices, standard in hexagonal DGGS duals):

$$2E = 3V \implies V = \frac{2}{3}E$$
$$2E = \sum_{i} d(f_i) = 6F_6 + 5F_5$$

Substituting into Euler's formula:

$$\frac{2}{3}E - E + (F_6 + F_5) = 2 \implies -\frac{1}{6}E + F_6 + F_5 = 2$$

Multiplying by 6:

$$-E + 6F_6 + 6F_5 = 12 \implies -\frac{1}{2}(6F_6 + 5F_5) + 6F_6 + 6F_5 = 12 \implies F_5 = 12$$

Thus, irrespective of resolution level $r \in [0, 15]$, there exist exactly twelve pentagonal singularities with topological coordination number $z_i = 5$, whereas all other cells have coordination number $z_i = 6$:

$$z(c) = \begin{cases} 5, & \text{if } c \in \mathcal{P} \quad (\text{pentagon}) \\ 6, & \text{if } c \in \mathcal{H} \quad (\text{hexagon}) \end{cases}$$

### 2.2 Thermodynamic Flux Conservation across Heterogeneous Neighbors

Mass and enthalpy transport across neighbor boundaries in the `SpatialFluxMonad` is governed by discrete divergence:

$$\frac{d M_i}{dt} = \sum_{j \in \mathcal{N}(i)} J_{j \to i} \cdot A_{ij} + S_i$$

Where:
- $\mathcal{N}(i)$ is the verified neighborhood set of cell $i$, with cardinality $|\mathcal{N}(i)| = z(i)$.
- $J_{j \to i}$ is the flux density between cell $j$ and cell $i$.
- $A_{ij}$ is the contact edge interface length.
- $S_i$ represents internal source/sink terms (strictly zero for conservative scalar transport).

If an adjacency generator produces a neighborhood candidate set $\tilde{\mathcal{N}}(i)$ where $|\tilde{\mathcal{N}}(i)| \ne z(i)$ without an explicit open boundary condition, divergence sum $\sum_{j} J_{j \to i} A_{ij}$ breaks pairwise antisymmetry ($J_{j \to i} A_{ij} = -J_{i \to j} A_{ji}$), causing non-physical mass destruction or spontaneous mass genesis. Validating candidate count against $z(i)$ via `isExpectedNeighborCount` guarantees conservative boundary evaluation before executing flux transitions.

---

## 3. Interface Contract & Detailed Specification

### 3.1 Function Signature & Module Placement

In `src/spatial/h3_adjacency.ts`, the predicate function `isExpectedNeighborCount` is introduced with a typed, pure, non-throwing signature:

```typescript
/**
 * Evaluates whether a candidate neighbor count matches the exact topological
 * coordination number (expected adjacent neighbor count) for a given H3 cell.
 *
 * Hexagonal cells require exactly 6 neighbors; pentagonal cells require exactly 5.
 *
 * @param cellIndex - The 64-bit hexadecimal H3 index string or BigInt representation.
 * @param candidateCount - Numeric candidate count to validate.
 * @returns True if candidateCount is a non-negative integer equal to getCoordinationNumber(cellIndex); false otherwise.
 */
export function isExpectedNeighborCount(
  cellIndex: H3Index,
  candidateCount: number
): boolean;
```

### 3.2 Dual Signature / Polymorphic Parameter Support

To maximize developer ergonomics and prevent inversion bugs in functional pipelines (`array.filter`, point-free compositions, and method chaining), `isExpectedNeighborCount` also supports overloaded invocation where arguments are passed as `(candidateCount: number, cellIndex: H3Index)`:

```typescript
export function isExpectedNeighborCount(
  cellIndexOrCount: H3Index | number,
  countOrCellIndex: number | H3Index
): boolean;
```

### 3.3 Evaluation Logic & Edge Cases

The function enforces strict numeric and topological validity:
1. **Integer & Boundary Sanitation**:
   - If `candidateCount` is not a finite number, is `NaN`, is non-integer (`!Number.isInteger(candidateCount)`), or is negative (`candidateCount < 0`), return `false`.
2. **Topological Lookup**:
   - Query `getCoordinationNumber(cellIndex)`.
   - If `cellIndex` is malformed, invalid, or unrecognized by the H3 coordinate parser, `getCoordinationNumber` throws or returns `0`; `isExpectedNeighborCount` safely traps invalid states and returns `false`.
3. **Equivalence Comparison**:
   - Return `candidateCount === getCoordinationNumber(cellIndex)`.

---

## 4. Class Hierarchy & Architectural Integration

```
src/spatial/
├── h3_types.ts              <-- Defines H3Index, CoordinationNumber (5 | 6)
├── h3_adjacency.ts          <-- Implements isPentagon, getCoordinationNumber, isExpectedNeighborCount
├── h3_grid.ts               <-- H3Grid hierarchy utilizing adjacency invariants
└── spatial_flux_monad.ts    <-- Monadic state transition using validated neighborhood sets
```

### 4.1 Incremental Object-Oriented Composition

`H3AdjacencyManager` encapsulates low-level bindings and provides clean object-oriented access:

```typescript
export class H3AdjacencyManager {
  /**
   * Returns true if the cell is a pentagonal singularity (coordination number 5).
   */
  public static isPentagon(cellIndex: H3Index): boolean;

  /**
   * Returns the topological coordination number: 5 for pentagons, 6 for hexagons.
   */
  public static getCoordinationNumber(cellIndex: H3Index): 5 | 6;

  /**
   * Verifies if candidateCount satisfies the topological coordination number of the cell.
   */
  public static isExpectedNeighborCount(cellIndex: H3Index, candidateCount: number): boolean {
    return isExpectedNeighborCount(cellIndex, candidateCount);
  }
}
```

### 4.2 Monadic Stock Transition Guard

Within `SpatialFluxMonad`, neighborhood arrays are validated prior to computing divergence tensors:

```typescript
export class SpatialFluxMonad<T extends ThermodynamicStockState> {
  public verifyNeighborhoodTopology(cell: H3Index, neighbors: H3Index[]): boolean {
    const candidateCount = neighbors.length;
    if (!isExpectedNeighborCount(cell, candidateCount)) {
      throw new TopologicalAdjacencyDefectError(
        `Cell ${cell} expects ${getCoordinationNumber(cell)} neighbors but received ${candidateCount}`
      );
    }
    return true;
  }
}
```

---

## 5. Thermodynamic Compliance & Conservation Invariants

1. **First Law Compliance (Conservation of Matter)**:
   - Ensuring every interior spherical cell resolves its complete coordination shell (5 for pentagons, 6 for hexagons) prevents edge omissions where diffuse matter could enter an unmapped sink.
   - Surface integral closures:
     $$\sum_{i=1}^{N_{cells}} \sum_{j \in \mathcal{N}(i)} J_{ij} = 0$$
     This identity holds if and only if every neighbor relation is symmetric and no cell drops neighbors due to erroneous adjacency count assumptions.

2. **Second Law Compliance (Entropy & Dissipation)**:
   - Heat and nutrient conduction matrices depend on the Laplacian operator $\mathbf{L} = \mathbf{D} - \mathbf{A}$. The degree matrix $\mathbf{D}_{ii} = z(c_i)$ must strictly equal the actual neighbor count. An incorrect degree count leads to negative eigenvalues in $\mathbf{L}$, implying spontaneous entropy reduction (unphysical heating).

---

## 6. Verification & Test Plan

A comprehensive test suite in `tests/sprint_075.test.ts` shall verify:

1. **Hexagonal Cell Verification**:
   - Given a standard hexagonal cell (e.g., res 1, 2, 3), `getCoordinationNumber(hexCell)` returns `6`.
   - `isExpectedNeighborCount(hexCell, 6)` returns `true`.
   - `isExpectedNeighborCount(hexCell, 5)` returns `false`.
   - `isExpectedNeighborCount(hexCell, 7)` returns `false`.

2. **Pentagonal Singularity Verification**:
   - Given a known pentagonal cell at resolution $r \in [0, 15]$, `getCoordinationNumber(pentCell)` returns `5`.
   - `isExpectedNeighborCount(pentCell, 5)` returns `true`.
   - `isExpectedNeighborCount(pentCell, 6)` returns `false`.
   - `isExpectedNeighborCount(pentCell, 4)` returns `false`.

3. **Malformed & Edge Case Inputs**:
   - Float counts: `isExpectedNeighborCount(hexCell, 5.999)` returns `false`.
   - Negative numbers: `isExpectedNeighborCount(hexCell, -6)` returns `false`.
   - `NaN` / `Infinity`: returns `false`.
   - Inverted argument order support: `isExpectedNeighborCount(6, hexCell)` returns `true`.

---

## 7. Migration & Backward Compatibility

- **Non-breaking Additive Change**: `isExpectedNeighborCount` is exported alongside existing adjacency functions in `src/spatial/h3_adjacency.ts`.
- **Zero Overhead**: Direct numeric comparison against primitive return values with no dynamic object allocation.