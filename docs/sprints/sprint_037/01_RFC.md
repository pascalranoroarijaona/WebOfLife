# RFC-037: Canonical 15-Character Hexadecimal H3 Index Specification & Validation Pattern

- **RFC Identifier**: RFC-037
- **Sprint**: Sprint 037
- **Feature Title**: Canonical 15-Character Hexadecimal Regex Constant `H3_CANONICAL_INDEX_PATTERN`
- **Target File**: `src/spatial/h3_grid.ts` (with related interfaces in `src/spatial/h3_types.ts` and consumers in `src/monads/spatial_monad.ts`)
- **Status**: Proposed / Ready for Review
- **Author**: Chief Systems Architect
- **Thermodynamic Guard**: Mass Conservation $\Delta M = 0$, Entropy Production $\dot{S}_{gen} \ge 0$, Solar Input Constrained

---

## 1. Executive Summary & Context

The Web of Life planetary biosphere simulation models global eco-hydrological and biogeochemical dynamics across discrete geodesic cells mapped using Uber's Hierarchical Hexagonal Spatial Index (H3). Within the discrete global grid system (DGGS), an H3 index is intrinsically a 64-bit unsigned bitfield (`uint64`). In stringified form, canonical H3 indices are conventionally represented as a 15-character hexadecimal string (e.g., `"8826856235fffff"` or `"85283473fffffff"`), omitting an unnecessary leading zero since the most significant bit (reserved bit 63) is invariably zero and bits 59–62 represent the index mode.

Prior sprints introduced basic spatial coordinate transformations and topological adjacency lookups. However, without a strictly defined canonical string pattern, spatial operations across `SpatialMonad` and `EarthPod` risk key fragmentation, dictionary collisions, or unvalidated string injections that could silently orphan matter and energy balances in memory pools.

This RFC formalizes the canonical 15-character hexadecimal regular expression constant:
$$\text{H3\_CANONICAL\_INDEX\_PATTERN} = \texttt{/\^[0-9a-fA-F]\{15\}\$/}$$
and defines its formal type predicate, runtime validation contract, bitfield symmetry checks, and thermodynamic routing guarantees in `src/spatial/h3_grid.ts`.

---

## 2. Motivation & Problem Statement

### 2.1 Spatial Key Integrity in Distributed Planetary State
In `src/spatial/h3_grid.ts`, spatial nodes represent cellular control volumes containing thermodynamic stocks:
- Continental and oceanic water mass $M_{w}$ ($\text{kg}$)
- Carbon stocks (biomass, detritus, soil organic carbon, atmospheric $\text{CO}_2$) $M_{c}$ ($\text{kg}$)
- Thermal internal energy $U$ ($\text{J}$)

When spatial cells are stored in associative key-value maps (e.g., `Map<H3Index, EarthPod>` or within `SpatialMonad`), the index key acts as an inviolable spatial address. If malformed strings (e.g., 16-character padded strings, truncated indices, or non-hexadecimal tokens) enter spatial routing pipelines:
1. Adjacency graphs develop asymmetric disconnects (directed sinks where outgoing fluxes evaporate from valid accounting).
2. Conservation equations fail because fluxes destined for an uncanonical key are dropped into unallocated memory, violating the First Law of Thermodynamics ($\sum \dot{M}_{in} \neq \sum \dot{M}_{out}$).
3. Thermodynamic entropy metrics explode due to discontinuous cell boundaries.

### 2.2 Canonical Hexadecimal Representation
Under the H3 specification:
- Bit 63: Reserved (must be 0)
- Bits 59–62: Mode (1 for standard hexagonal cell)
- Bits 56–58: Edge/Child mode (0 for cell)
- Bits 52–55: Cell resolution ($0 \le r \le 15$)
- Bits 45–51: Base cell number ($0 \le b \le 121$)
- Bits 0–44: Directional hierarchy along icosahedral aperture paths

Because bit 63 is zero and standard mode is $1$ (`0001` in binary), bits 63..60 evaluate to binary `0001`, which corresponds to high nibble $1$ or base cell offset, yielding exactly 15 hexadecimal digits without the redundant leading zero of a 64-bit 16-hex digit representation. Standardizing on `H3_CANONICAL_INDEX_PATTERN` ensures unambiguous canonical spatial key matching across all grid operations.

---

## 3. Mathematical & Formal Foundations

### 3.1 Bitfield Specification and Metric Projection
Let $\mathcal{I}_{\text{H3}} \subset \mathbb{N}$ denote the set of valid 64-bit H3 cell identifiers. Let $\Sigma_{\text{hex}} = \{0, \dots, 9, \text{a}, \dots, \text{f}, \text{A}, \dots, \text{F}\}$ denote the hexadecimal alphabet. The string representation map is defined as:
$$\phi: \mathcal{I}_{\text{H3}} \to \Sigma_{\text{hex}}^{15}$$
where for any index $i \in \mathcal{I}_{\text{H3}}$:
$$\phi(i) = \text{hex}_{15}(i) = \sum_{k=0}^{14} c_k \cdot 16^{14-k}, \quad c_k \in \Sigma_{\text{hex}}$$

The canonical formal language $\mathcal{L}_{\text{H3}}$ accepted by the canonical pattern is:
$$\mathcal{L}_{\text{H3}} = \left\{ s \in \Sigma_{\text{hex}}^* \;\middle|\; |s| = 15 \right\}$$
Expressed as the deterministic regular expression:
$$\mathcal{R}_{\text{canonical}} = \texttt{/\^[0-9a-fA-F]\{15\}\$/}$$

### 3.2 Thermodynamic Balance Invariance
Let $\mathcal{C}$ be the collection of active spatial control volumes, indexed by $k \in \mathcal{K} \subset \mathcal{L}_{\text{H3}}$. The conservation of mass across all control volumes over discrete timestep $\Delta t$ requires:
$$\sum_{k \in \mathcal{K}} M_k(t + \Delta t) = \sum_{k \in \mathcal{K}} M_k(t) + \sum_{k \in \mathcal{K}} \left( J_{k,\text{boundary}}^{\text{mass}} \right) \Delta t$$
To prevent mass leakage:
$$\forall \text{ flux } J_{i \to j}, \quad \text{assert}(i \in \mathcal{L}_{\text{H3}} \land j \in \mathcal{L}_{\text{H3}})$$
If either $i \notin \mathcal{L}_{\text{H3}}$ or $j \notin \mathcal{L}_{\text{H3}}$, the advection operator is aborted prior to state mutation, throwing an explicit assertion and preserving mass invariants without state corruption.

---

## 4. Class Hierarchy & Architectural Design

### 4.1 Class Hierarchy and Module Placement

```
src/
├── spatial/
│   ├── h3_types.ts          <-- Declares CanonicalH3String branded type & constants
│   ├── h3_grid.ts           <-- Exports H3_CANONICAL_INDEX_PATTERN, isValidH3CanonicalIndex, H3GridManager
│   └── h3_adjacency.ts      <-- Uses canonical pattern for edge validation
├── monads/
│   └── spatial_monad.ts     <-- Wraps cells with verified canonical addresses
└── thermodynamics/
    └── constants.ts         <-- Physical constants for inter-cell transport
```

### 4.2 Detailed Class Diagram (UML)

```plantuml
@startuml
package "src/spatial" {
  interface H3IndexBrand {
    + __brand: "CanonicalH3Index"
  }
  type CanonicalH3Index = string & H3IndexBrand

  class H3GridManager {
    + {static} H3_CANONICAL_INDEX_PATTERN: RegExp
    + {static} isValidCanonicalIndex(index: string): boolean
    + {static} normalizeIndex(index: string): CanonicalH3Index
    + getNeighbors(index: CanonicalH3Index): CanonicalH3Index[]
  }

  class H3CellCoord {
    - _rawIndex: CanonicalH3Index
    - _resolution: number
    + constructor(index: string)
    + index(): CanonicalH3Index
    + resolution(): number
    + isValid(): boolean
  }
}

package "src/monads" {
  class SpatialMonad<T> {
    - _cellIndex: CanonicalH3Index
    - _value: T
    + bind<U>(fn: (val: T) => SpatialMonad<U>): SpatialMonad<U>
    + getCellIndex(): CanonicalH3Index
  }
}

H3CellCoord --> H3GridManager : validates via
SpatialMonad --> H3GridManager : uses
@enduml
```

---

## 5. Interface Contracts & Implementation Specification

### 5.1 Constant Definition in `src/spatial/h3_grid.ts`

```typescript
/**
 * Canonical 15-character hexadecimal regular expression for H3 spatial index strings.
 * Validates that an index string consists of exactly 15 hexadecimal characters (case-insensitive).
 */
export const H3_CANONICAL_INDEX_PATTERN: RegExp = /^[0-9a-fA-F]{15}$/;
```

### 5.2 Type Guard & Normalization Utilities

```typescript
import { CanonicalH3Index } from './h3_types';

/**
 * Validates whether a given string adheres to the canonical 15-character hexadecimal H3 index format.
 *
 * @param index - The string to validate.
 * @returns True if index is a valid 15-character hex string; false otherwise.
 */
export function isValidH3CanonicalIndex(index: string): index is CanonicalH3Index {
  if (typeof index !== 'string' || index.length !== 15) {
    return false;
  }
  return H3_CANONICAL_INDEX_PATTERN.test(index);
}

/**
 * Normalizes an H3 index to canonical lowercase 15-character format.
 * Throws a RangeError if the index fails canonical pattern verification.
 *
 * @param index - The raw H3 index string.
 * @throws RangeError if the string does not match H3_CANONICAL_INDEX_PATTERN.
 * @returns The normalized CanonicalH3Index string.
 */
export function assertCanonicalH3Index(index: string): CanonicalH3Index {
  if (!isValidH3CanonicalIndex(index)) {
    throw new RangeError(
      `Invalid H3 canonical index: "${index}". Must match canonical 15-character hexadecimal pattern: ${H3_CANONICAL_INDEX_PATTERN.source}`
    );
  }
  return index.toLowerCase() as CanonicalH3Index;
}
```

### 5.3 Branded Type Definition in `src/spatial/h3_types.ts`

```typescript
declare const CanonicalH3Brand: unique symbol;

/**
 * Branded nominal type representing a validated 15-character lowercase hexadecimal H3 string.
 */
export type CanonicalH3Index = string & {
  readonly [CanonicalH3Brand]: true;
};
```

---

## 6. Thermodynamic Conservation & Boundary Integrity

Spatial grid nodes communicate via finite volume boundary exchanges. The integration of `H3_CANONICAL_INDEX_PATTERN` provides invariant enforcement:

1. **Conservation of Mass Across Advection Boundaries**:
   During horizontal advection of atmospheric moisture or oceanic dissolved inorganic carbon (DIC), fluxes pass through cell interfaces:
   $$\dot{M}_{i \to j} = v_{ij} \cdot \rho \cdot A_{ij}$$
   Before allocating `M_{i \to j}` out of cell $i$ into cell $j$, both $i$ and $j$ must satisfy `isValidH3CanonicalIndex(k)`. If invalid, transfer is rejected at the domain boundary, preventing unrecoverable loss of conserved mass stocks into transient null buckets.

2. **Zero In-Memory Entropy Leaks**:
   Unnormalized or malformed keys lead to duplicate entries for the same spatial cell (e.g., uppercase `"8826856235FFFFF"` vs lowercase `"8826856235fffff"`). Multiple entries create phantom control volumes with uncoupled thermodynamic potentials, violating the Second Law of Thermodynamics. Enforcing canonical lowercase representation with regular expression verification guarantees bijective cell mappings.

---

## 7. Migration, Testing & Verification Plan

### 7.1 Test Vectors for Test Suite (`tests/sprint_037.test.ts`)

The implementation must pass comprehensive automated test cases:

| Case ID | Input String | Expected Valid | Description |
| :--- | :--- | :--- | :--- |
| `TC-H3-01` | `"8826856235fffff"` | `true` | Valid 15-char lowercase canonical resolution 8 index |
| `TC-H3-02` | `"8826856235FFFFF"` | `true` | Valid 15-char uppercase canonical index (matches regex) |
| `TC-H3-03` | `"85283473fffffff"` | `true` | Valid 15-char standard resolution 5 index |
| `TC-H3-04` | `"08826856235fffff"` | `false` | 16-char padded hex index (rejected) |
| `TC-H3-05` | `"8826856235ffff"` | `false` | 14-char truncated hex index (rejected) |
| `TC-H3-06` | `"8826856235ffffg"` | `false` | 15-char non-hex character (`'g'`) (rejected) |
| `TC-H3-07` | `""` | `false` | Empty string (rejected) |
| `TC-H3-08` | `"88268562 35ffff"` | `false` | String with embedded whitespace (rejected) |
| `TC-H3-09` | `" 8826856235fffff "` | `false` | Untrimmed whitespace (rejected) |
| `TC-H3-10` | `null` / `undefined` | `false` | Non-string types handled cleanly via type guard |

### 7.2 Performance & Zero-Allocation Invariants
- Regular expression testing must execute in $\mathcal{O}(1)$ time without backtracking vulnerabilities.
- In hot simulation loops (advection routines processing $N > 100,000$ cells per tick), validation is guarded by string length checks ($O(1)$) before running the regular expression to avoid redundant regex engine instantiation.

---

## 8. Summary of Deliverables for Sprint 037

1. **`src/spatial/h3_grid.ts`**:
   - Export `H3_CANONICAL_INDEX_PATTERN: RegExp = /^[0-9a-fA-F]{15}$/;`
   - Export `isValidH3CanonicalIndex(index: string): index is CanonicalH3Index`
   - Export `assertCanonicalH3Index(index: string): CanonicalH3Index`
2. **`src/spatial/h3_types.ts`**:
   - Define `CanonicalH3Index` branded type.
3. **`tests/sprint_037.test.ts`**:
   - Complete unit and property-based test matrix verifying all test vectors and thermodynamic integrity constraints.