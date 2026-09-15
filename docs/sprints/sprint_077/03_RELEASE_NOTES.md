# Sprint 077 Release Notes: Cell Neighbor Count Assertion Specification

**Release Version:** `v0.77.0`  
**Sprint Cycle:** Sprint 077  
**Module:** `src/spatial/h3_adjacency.ts`  
**Focus Area:** Spatial Topology Invariants, Discrete Global Grid System (DGGS) Boundary Integrity, Runtime Assertions  

---

## Executive Summary

Sprint 077 delivers the runtime invariant assertion utility `assertValidNeighborCountForCell` in `src/spatial/h3_adjacency.ts`. Within discrete global grid systems (DGGS) built upon the Uber H3 hierarchical hexagonal spatial index, spatial flux balances—governing energy, mass, and entropy transfer across cell boundaries—depend strictly upon topological completeness.

Under Euler's polyhedral formula on the sphere ($S^2$), a closed surface discretized via an aperture-7 or aperture-3 icosahedral hexagonal grid cannot consist solely of hexagons: exactly 12 base pentagonal cells exist at any given resolution. As a result, regular hexagonal cells must possess exactly 6 direct topological neighbors ($k = 1$), whereas pentagonal cells possess exactly 5 direct neighbors. 

The newly added `assertValidNeighborCountForCell` function enforces these structural invariants at runtime. It asserts that incoming candidate neighbor structures are valid arrays and validates their cardinality against `isExpectedNeighborCountForCell`. By rejecting corrupted, duplicated, truncated, or scalar neighborhood sets before thermodynamic integration, this utility guarantees zero boundary leakage and strict adherence to mass and energy conservation laws.

---

## Key Features & Functional Enhancements

### 1. Runtime Array Guard & Type Assertion
- Implements TypeScript assertion typing (`asserts neighbors is readonly unknown[]` / `asserts neighbors is string[]`), narrowing candidate collections safely within calling scopes.
- Rejects non-array values (e.g., `null`, `undefined`, scalar primitives, plain objects) by throwing an explicit `TypeError` with contextual diagnostics identifying the offending `cellId`.

### 2. Topological Valence Validation
- Delegates cardinality evaluation directly to `isExpectedNeighborCountForCell(cellId, count)`, reconciling the observed array length against the cell's topological valence degree ($d(c) \in \{5, 6\}$).
- Raises a descriptive `RangeError` (or `Error`) if a regular hexagonal cell does not exhibit 6 neighbors, or if a pentagonal cell does not exhibit 5 neighbors.

### 3. Fail-Fast Boundary Conservation for Flux Simulations
- Prevents synthetic source or sink anomalies in `SpatialFluxMonad` caused by mismatched boundary edges ($\oint_{\partial \Omega} \vec{J} \cdot d\vec{A} \neq 0$).
- Guarantees closed-volume thermodynamic conservation across continuous spatial flux calculations.

---

## Mathematical & Architectural Foundations

### Discrete Global Grid Invariants on $S^2$
The Earth's spherical topology requires:
$$V - E + F = 2$$

For any valid H3 resolution $r \in [0, 15]$, the topological valence $d(c)$ for a cell $c \in \mathcal{C}$ satisfies:
$$d(c) = \begin{cases} 5 & \text{if } c \text{ is an icosahedral pentagon cell} \\ 6 & \text{if } c \text{ is a regular hexagonal cell} \end{cases}$$

### Boundary Flux Conservation
In discrete spatial ecosystems, inter-cell flux exchanges $\Delta M_{i \to j}$ across boundary facet $e_{ij}$ follow:
$$\sum_{j \in \mathcal{N}(i)} J_{i \to j} = -\frac{d M_i}{dt}$$

Where $\mathcal{N}(i)$ is the direct neighborhood of cell $i$. If $|\mathcal{N}(i)| \neq d(c)$, boundary summation fails to balance, inducing artificial entropy generation and mass destruction or creation. Enforcing neighborhood cardinality preserves conservative transport equations across all spatial grid cells.

---

## API & Interface Specification

### `assertValidNeighborCountForCell`

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

### Behavioral Workflow

```
[Candidate Neighbors Input]
          │
          ▼
 Is Array.isArray(neighbors)?
   ├── No  ──► Throw TypeError("Expected neighbors to be an array for cell <cellId>")
   └── Yes ──► Read count = neighbors.length
                     │
                     ▼
       isExpectedNeighborCountForCell(cellId, count)
         ├── False ──► Throw RangeError("Invalid neighbor count <count> for cell <cellId>...")
         └── True  ──► Return void (Assertion Confirmed)
```

---

## Testing & Verification

The suite `tests/sprint_077.test.ts` provides comprehensive unit test coverage:

1. **Type Assertion & Guarding**:
   - Validates that passing `null`, `undefined`, numbers, objects, or strings raises a `TypeError`.
   - Confirms informative error messages referencing the provided `cellId`.
2. **Hexagonal Valence Compliance**:
   - Asserts successful validation when a hexagonal H3 index is supplied with an array of length 6.
   - Asserts failure when supplied with lengths 0, 1, 4, 5, 7, or 8.
3. **Pentagonal Valence Compliance**:
   - Asserts successful validation when known pentagonal H3 indices are supplied with an array of length 5.
   - Asserts failure when supplied with lengths 0, 4, 6, or 7.
4. **Boundary Diagnostic Messages**:
   - Ensures error payloads contain both the offending `cellId` and the received neighbor count for rapid tracing in production logs.

---

## Migration & Compatibility Notes

- **Backward Compatibility**: `assertValidNeighborCountForCell` is an additive assertion utility. Existing callers of `isExpectedNeighborCountForCell` or `getH3Neighbors` are unaffected.
- **Strict Mode Compatibility**: Utilizing TypeScript's assertion signature (`asserts neighbors is readonly unknown[]`) allows downstream operations to safely treat the argument as an array without explicit manual casting.
- **Recommended Usage**: Integrate this check at entry points where external or serialized adjacency lists are unpacked prior to passing arrays into `SpatialFluxMonad` calculations.