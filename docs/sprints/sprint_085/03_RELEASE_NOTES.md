# Sprint 085 Release Notes: H3 Index Aperture Digit Extraction

**Release Version:** `v0.85.0`  
**Sprint Cycle:** Sprint 085  
**Component Scope:** `src/spatial/h3_adjacency.ts`, `src/spatial/h3_types.ts`, `src/spatial/h3_grid.ts`, `src/spatial/spatial_flux_monad.ts`  
**Architectural RFC:** RFC-085: H3 Index Aperture Digit Extraction (`extractH3IndexApertureDigits`)  

---

## 1. Executive Summary

Sprint 085 introduces native bitwise resolution directional digit parsing through `extractH3IndexApertureDigits` within `src/spatial/h3_adjacency.ts`. In discrete global grid systems (DGGS) based on Uber H3, hexagonal spatial partitions are represented as 64-bit bit-packed integer identifiers. 

In the Web of Life thermodynamic spatial engine, each hexagonal cell at resolution $r$ ($0 \le r \le 15$) serves as a finite control volume enclosing conservative biophysical stock monads (carbon, nitrogen, phosphorus, water, thermal exergy). Sprint 085 provides direct, zero-dependency bitwise extraction of directional aperture digits $d_1, d_2, \dots, d_r \in \{0, \dots, 6\}$ (with $7$ designating unused/padding digits). This unlocks deterministic topological traversal, parent-child stock re-partitioning, and conservative advective routing without external database lookups or floating-point rounding errors.

---

## 2. Key Features & Backend Enhancements

### 2.1 Low-Level Bitwise Aperture Extraction
- **Function:** `extractH3IndexApertureDigits(index: bigint | string, options?: H3ApertureParseOptions): H3ApertureDecomposition`
- **Bitfield Mechanics:**
  - Implements extraction for resolution $r = (I \gg 52\text{n}) \ \& \ 0\text{x0Fn}$.
  - Computes base cell identifier $B = (I \gg 45\text{n}) \ \& \ 0\text{x7Fn}$.
  - Computes each resolution directional digit via $\text{shift}_k = 45 - 3k$ and bitmask $(I \gg \text{shift}_k) \ \& \ 0\text{x07n}$ for $k \in \{1, \dots, 15\}$.
  - Automatically isolates active digits ($1 \le k \le r$) and full 15-aperture sequences.

### 2.2 Strict Aperture Validation & Verification Flags
The parser supports fine-grained validation via `H3ApertureParseOptions`:
- `validateMode`: Asserts index mode conforms to standard cell mode (`mode === 1`).
- `validateBaseCell`: Asserts icosahedral base cell identifier falls within range $[0, 121]$.
- `validatePaddingDigits`: Enforces the canonical H3 invariant that all trailing digits ($k > r$) strictly equal `7` (`0b111`).

### 2.3 Flexible Input Normalization
- Supports canonical 64-bit unsigned integers as `bigint`.
- Accepts standard hex string representations in uppercase or lowercase, with or without standard `0x` prefixes (e.g., `'8828308281fffff'` and `'0x8828308281fffff'`).

---

## 3. Type Definitions & API Contracts

Updated `src/spatial/h3_types.ts` with explicit aperture interfaces:

```typescript
/**
 * Valid H3 directional aperture digit (0 to 6), or unused digit indicator (7).
 */
export type H3DirectionDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Parsed aperture decomposition from a 64-bit H3 cell index.
 */
export interface H3ApertureDecomposition {
  readonly index: bigint;
  readonly indexHex: string;
  readonly resolution: number;
  readonly baseCell: number;
  readonly activeDigits: readonly H3DirectionDigit[];
  readonly allDigits: readonly H3DirectionDigit[]; // Exactly 15 digits
  readonly isValid: boolean;
}

/**
 * Configuration options for parsing aperture digits.
 */
export interface H3ApertureParseOptions {
  readonly validateMode?: boolean;
  readonly validateBaseCell?: boolean;
  readonly validatePaddingDigits?: boolean;
}
```

---

## 4. Architectural Hierarchy & Flux Monad Integration

```
+-------------------------------------------------------+
|                 H3SpatialIndexCodec                   |
+-------------------------------------------------------+
| + parseBigInt(input: bigint | string): bigint         |
| + extractResolution(index: bigint): number            |
| + extractBaseCell(index: bigint): number              |
| + extractMode(index: bigint): number                  |
+---------------------------^---------------------------+
                            |
                            | inherits / composes
+---------------------------+---------------------------+
|               H3AdjacencyCoordinator                  |
+-------------------------------------------------------+
| + extractH3IndexApertureDigits(...)                   |
| + getAdjacentNeighbors(index: bigint): bigint[]       |
| + computeDirectionalVector(digits: H3DirectionDigit[])|
+---------------------------^---------------------------+
                            |
                            | coordinates
+---------------------------+---------------------------+
|              SpatialFluxMonad<TStock>                 |
+-------------------------------------------------------+
| - cellIndex: bigint                                   |
| - apertureDigits: readonly H3DirectionDigit[]         |
| + routeAdvectiveFlux(targetDigit: H3DirectionDigit)   |
| + conserveMassAcrossApertures(): boolean              |
+-------------------------------------------------------+
```

### Physical Law Guarantees
1. **First Law (Mass & Stock Conservation Across Hierarchies):**
   Stock partitions satisfy $M_{\text{parent}} = \sum_{d=0}^{6} M_{\text{child}}^{(d)}$. Directional extraction allows exact identification of the sub-aperture routing trajectory without floating-point drift or stock dissipation:
   $$\frac{d}{dt}\left( \sum_{i \in \text{Partition}} M_i \right) = \dot{m}_{\text{in}} - \dot{m}_{\text{out}} = 0$$

2. **Second Law (Irreversible Thermodynamic Entropy Generation):**
   Diffusive exchanges between discrete aperture partitions guarantee non-negative entropy generation:
   $$\sigma = \dot{Q} \left( \frac{1}{T_{\text{dest}}} - \frac{1}{T_{\text{src}}} \right) \ge 0 \quad \text{for } T_{\text{src}} \ge T_{\text{dest}}$$

---

## 5. Verification & Test Suite

The test suite in `tests/sprint_085.test.ts` validates the following test vectors:

| Test Case | Scenario | Expected Behavior |
| :--- | :--- | :--- |
| `TC-85-01` | Resolution 0 Base Cells | Returns empty `activeDigits: []` and 15 elements of `7` in `allDigits`. |
| `TC-85-02` | Intermediate Resolutions (Res 7, 8, 9) | Validates correct active aperture digit sequences matching reference H3 coordinates. |
| `TC-85-03` | Maximum Resolution 15 | Confirms 15 active digits within $[0, 6]$ and zero unused padding digits. |
| `TC-85-04` | Corrupted Padding Verification | Throws error when non-7 bits appear at indices $k > r$ with `validatePaddingDigits: true`. |
| `TC-85-05` | Invalid Mode & Base Cell Range | Throws when mode $\ne 1$ or base cell $> 121$ when flags are enabled. |
| `TC-85-06` | Mass Monad Conservation | Asserts stock conservation holds across parent-to-child aperture re-allocations. |

---

## 6. Migration Guide

No breaking changes are introduced to existing APIs (`latLngToCell`, `cellToParent`, `gridDisk`).

### Example Usage

```typescript
import { extractH3IndexApertureDigits } from './spatial/h3_adjacency';

// Parse from hexadecimal representation
const decomposition = extractH3IndexApertureDigits('8828308281fffff', {
  validateMode: true,
  validateBaseCell: true,
  validatePaddingDigits: true,
});

console.log(decomposition.resolution);   // e.g., 8
console.log(decomposition.baseCell);     // Base cell index
console.log(decomposition.activeDigits); // [d_1, d_2, ..., d_8]
```