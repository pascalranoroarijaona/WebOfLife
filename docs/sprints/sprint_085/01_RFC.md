# RFC-085: H3 Index Aperture Digit Extraction (`extractH3IndexApertureDigits`)

- **Author**: Chief Systems Architect
- **Sprint**: 085
- **Status**: Proposed
- **Target File**: `src/spatial/h3_adjacency.ts`
- **Related Files**: `src/spatial/h3_types.ts`, `src/spatial/h3_grid.ts`, `src/spatial/spatial_flux_monad.ts`

---

## 1. Executive Summary & Sprint Goal

### 1.1 Sprint Goal
Implement `extractH3IndexApertureDigits` parsing resolution directional digits (aperture digits $d_1, d_2, \dots, d_r$) from a 64-bit H3 index representation in `src/spatial/h3_adjacency.ts`.

### 1.2 Architectural Motivation
Hierarchical spatial discrete global grid systems (DGGS), specifically Uber H3, represent nested spatial hexagonal partitions through 64-bit bit-packed integer identifiers. In the Web of Life thermodynamic spatial engine, each hexagonal cell at resolution $r$ ($0 \le r \le 15$) serves as a finite control volume enclosing conservative biophysical stock monads (carbon, nitrogen, phosphorus, water, thermal exergy). 

Traversing, aggregating, and routing conserved convective and diffusive fluxes between resolutions requires deterministic parsing of directional aperture digits. Each resolution step down the aperture-7 hierarchy shifts the spatial coordinate by a 3-bit directional digit $d_k \in \{0, 1, 2, 3, 4, 5, 6\}$, with value $7$ representing an unused/terminal digit. Parsing directional digits enables:
1. Exact hierarchical parent-child topology reconstruction without external database lookups.
2. Directional vector estimation across pentagonal and hexagonal apertures.
3. Exact thermodynamic mass conservation during spatial coarse-graining and downscaling operations.

---

## 2. Bitwise H3 Index Specification & Aperture Mechanics

### 2.1 64-Bit H3 Cell Index Layout
The 64-bit integer identifier is partitioned into distinct semantic bitfields as follows:

| Bit Range | Field Name | Width | Description | Valid Range |
| :--- | :--- | :--- | :--- | :--- |
| **63** | Reserved | 1 bit | Reserved high bit | Always `0` |
| **59–62** | Index Mode | 4 bits | H3 Object Mode | Mode 1 (`H3_CELL_MODE = 1`) |
| **56–58** | Reserved / Mode-Dependent | 3 bits | Unused padding | Always `0` in standard cells |
| **52–55** | Resolution ($r$) | 4 bits | Grid resolution | $0 \le r \le 15$ |
| **45–51** | Base Cell | 7 bits | Icosahedral base cell | $0 \le \text{baseCell} \le 121$ |
| **42–44** | Direction Digit 1 | 3 bits | Aperture digit at Res 1 | $\{0, \dots, 6\}$ (or 7 if unused) |
| **39–41** | Direction Digit 2 | 3 bits | Aperture digit at Res 2 | $\{0, \dots, 6\}$ (or 7 if unused) |
| $\dots$ | $\dots$ | $\dots$ | $\dots$ | $\dots$ |
| **$45 - 3k \dots 47 - 3k$** | Direction Digit $k$ | 3 bits | Aperture digit at Res $k$ | $\{0, \dots, 6\}$ for $k \le r$, else $7$ |
| **0–2** | Direction Digit 15 | 3 bits | Aperture digit at Res 15 | $\{0, \dots, 6\}$ for $k \le 15$ |

### 2.2 Mathematical Bit Extraction Formula
For a given 64-bit integer index $I$ (handled as `bigint` in TypeScript) and resolution $r = \text{extractResolution}(I)$:
For each $k \in \{1, \dots, r\}$:
$$\text{shift}_k = 45 - 3 \times k$$
$$d_k = \left( \frac{I}{2^{\text{shift}_k}} \right) \ \& \ 7 = (I \gg \text{shift}_k) \ \& \ 0\text{b}111$$

If $k > r$, standard H3 convention mandates:
$$d_k = 7 \quad (\text{binary } 111)$$

Any valid cell index must satisfy:
1. $\text{mode}(I) == 1$
2. $0 \le r \le 15$
3. $0 \le \text{baseCell}(I) \le 121$
4. $\forall k \in [1, r], 0 \le d_k \le 6$
5. $\forall k \in [r+1, 15], d_k == 7$

---

## 3. Class Hierarchy & Interface Additions

### 3.1 Interface Contracts

```typescript
// In src/spatial/h3_types.ts

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

### 3.2 Function Specification in `src/spatial/h3_adjacency.ts`

```typescript
/**
 * Extracts aperture directional digits from a 64-bit H3 cell index.
 * 
 * @param index - The 64-bit H3 index as a bigint or hex string.
 * @param options - Optional validation flags.
 * @returns H3ApertureDecomposition containing resolution, base cell, and directional digits.
 * @throws Error if the index has an invalid mode, resolution out of range [0, 15], or corrupted digits when validation is requested.
 */
export function extractH3IndexApertureDigits(
  index: bigint | string,
  options?: H3ApertureParseOptions
): H3ApertureDecomposition;
```

### 3.3 Class Architecture & Hierarchy

```
+-------------------------------------------------------+
|                 H3SpatialIndexCodec                   |
+-------------------------------------------------------+
| + parseBigInt(input: bigint | string): bigint        |
| + extractResolution(index: bigint): number            |
| + extractBaseCell(index: bigint): number              |
| + extractMode(index: bigint): number                  |
+---------------------------^---------------------------+
                            |
                            | inherits/composes
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

---

## 4. Thermodynamic & Physical Law Invariants

### 4.1 First Law: Mass and Stock Conservation Across Apertures
When stocks in cell $C_{\text{parent}}$ at resolution $r-1$ are partitioned into child cells $C_{\text{child}}^{(d)}$ ($d \in \{0, \dots, 6\}$) at resolution $r$:
$$M_{\text{parent}} = \sum_{d=0}^{6} M_{\text{child}}^{(d)}$$
The function `extractH3IndexApertureDigits` guarantees that directional downscaling can identify the exact sub-aperture branch $d_k$ without spatial overlap or stock leakage:
$$\frac{d}{dt}\left( \sum_{i \in \text{Partition}} M_i \right) = \dot{m}_{\text{in}} - \dot{m}_{\text{out}} = 0 \quad (\text{isolated boundary})$$

### 4.2 Second Law: Irreversible Entropy Generation during Spatial Re-binning
Any aggregation or diffusion of thermal energy $Q$ between cells indexed by neighboring directional digits $d_a, d_b$ must satisfy positive entropy production:
$$\sigma = \dot{Q} \left( \frac{1}{T_{\text{dest}}} - \frac{1}{T_{\text{src}}} \right) \ge 0 \quad \text{for } T_{\text{src}} \ge T_{\text{dest}}$$

Bit extraction provides deterministic distance metrics along aperture axes without introducing numerical dissipation or artificial entropy sinks.

---

## 5. Algorithmic Detail & Edge Cases

### 5.1 Bit Manipulation Masks and Offsets
```typescript
const H3_MODE_MASK = 0x0Fn;
const H3_MODE_OFFSET = 59n;

const H3_RES_MASK = 0x0Fn;
const H3_RES_OFFSET = 52n;

const H3_BASE_CELL_MASK = 0x7Fn;
const H3_BASE_CELL_OFFSET = 45n;

const H3_DIGIT_MASK = 0x07n;
const H3_MAX_RESOLUTION = 15;
```

### 5.2 Extraction Loop
```typescript
const digits: H3DirectionDigit[] = [];
for (let res = 1; res <= H3_MAX_RESOLUTION; res++) {
  const shift = BigInt(45 - 3 * res);
  const digit = Number((index >> shift) & H3_DIGIT_MASK) as H3DirectionDigit;
  digits.push(digit);
}
```

### 5.3 Edge Cases
1. **Resolution 0 Cells**:
   - Resolution is 0.
   - `activeDigits` is empty `[]`.
   - `allDigits` consists of 15 elements, all equal to `7`.
2. **Maximum Resolution 15 Cells**:
   - `activeDigits` contains all 15 elements.
   - None of `activeDigits` should equal `7` in a well-formed cell.
3. **Corrupted / Out-of-Spec Index**:
   - If `validatePaddingDigits` is true and any digit at $k > r$ is not `7`, throw `InvalidH3PaddingError`.
   - If `validateMode` is true and `mode !== 1`, throw `InvalidH3ModeError`.
   - If `validateBaseCell` is true and `baseCell > 121`, throw `InvalidH3BaseCellError`.
4. **Hex String Input**:
   - Accepts both lowercase, uppercase, and with/without leading `0x` prefixes (e.g., `'8828308281fffff'` or `'0x8828308281fffff'`).

---

## 6. Implementation Checklist & Verification Plan

- [ ] Define `H3DirectionDigit`, `H3ApertureDecomposition`, and `H3ApertureParseOptions` in `src/spatial/h3_types.ts`.
- [ ] Implement `extractH3IndexApertureDigits` in `src/spatial/h3_adjacency.ts`.
- [ ] Ensure full backwards compatibility with existing grid functions (`latLngToCell`, `cellToParent`, `gridDisk`).
- [ ] Integrate aperture verification into `SpatialFluxMonad` to ensure conservative advection across cells.
- [ ] Add unit tests in `tests/sprint_085.test.ts` validating:
  - Resolution 0 base cell parsing.
  - Intermediate resolution cells (e.g., Resolution 7, 8, 9).
  - Maximum resolution 15 index digits.
  - Invalid bitfield detection (invalid mode, out-of-range base cell, corrupt padding).
  - Mass conservation invariance during directional hierarchical partitioning.