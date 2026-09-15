# RFC-086: Extraction of Directional Aperture Digits for Pentagonal H3 Cells

## 1. Executive Summary & Sprint Goal

### 1.1 Sprint Goal
Implement `extractPentagonApertureDigits` in `src/spatial/h3_adjacency.ts` to parse, validate, and sequence non-zero directional digits for pentagonal cells across arbitrary resolutions ($r \in [0, 15]$) within the discrete global grid system (DGGS).

### 1.2 Motivation & Architectural Context
In the H3 discrete global grid system, the spherical icosahedron contains precisely twelve base cells ($BC \in \{4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117\}$) that project as spherical pentagons rather than hexagons. In standard hexagonal cells, resolution scaling follows an aperture 7 subdivision where child indices encode directional digits $d \in \{0, 1, 2, 3, 4, 5, 6\}$. 

Pentagonal cells exhibit topological singularity: a pentagon has only 5 immediate neighbors at the same resolution instead of 6. Under hierarchical aperture-7 decimation, a pentagonal cell suppresses the $K$-axis directional digit ($d = 1$). To trace hierarchical parentage, perform icosahedral face unfolding, compute directional neighbor offsets, and maintain conservative spatial flux tensors across pentagonal singularities, the simulation engine requires deterministic parsing of directional aperture digits.

Specifically, `extractPentagonApertureDigits` inspects an H3 index, asserts pentagonal topology, extracts the sequence of directional digits $[d_1, d_2, \dots, d_r]$ across resolutions $1 \le k \le r$, and isolates non-zero directional digits while verifying that the invalid pentagonal aperture digit ($1$) is absent or handled according to the H3 topological transformation rules.

---

## 2. Mathematical & Bitwise Specification

### 2.1 H3 64-bit Index Bit Layout
An H3 index is structured as a 64-bit unsigned integer (represented in TypeScript via `bigint` and 16-character hexadecimal strings):

$$\text{H3Index} = [b_{63} \dots b_0]$$

| Bit Range | Field Name | Width | Description / Constraints |
| :--- | :--- | :--- | :--- |
| $[63]$ | Reserved | 1 bit | Always `0` |
| $[62:59]$ | Mode | 4 bits | `1` for standard cell (`H3_CELL_MODE`) |
| $[58:56]$ | Mode-Dependent | 3 bits | Reserved / 0 for base cells |
| $[55:52]$ | Resolution ($r$) | 4 bits | Resolution level $r \in [0, 15]$ |
| $[51:45]$ | Base Cell ($BC$) | 7 bits | Base cell index $BC \in [0, 121]$ |
| $[44:42]$ | Digit 1 ($d_1$) | 3 bits | Aperture direction at resolution 1 |
| $[41:39]$ | Digit 2 ($d_2$) | 3 bits | Aperture direction at resolution 2 |
| $\dots$ | $\dots$ | $\dots$ | $\dots$ |
| $[47 - 3r : 45 - 3r]$ | Digit $r$ ($d_r$) | 3 bits | Aperture direction at resolution $r$ |
| $[44 - 3r : 0]$ | Unused Digits | $45 - 3r$ bits | Must be set to `7` (`0b111`) for unused levels |

### 2.2 Pentagonal Cell Invariant
A cell is pentagonal if and only if:
1. Its base cell belongs to the set of 12 icosahedral pentagonal base cells:
   $$\mathcal{P}_{\text{base}} = \{4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117\}$$
2. All leading directional digits up to resolution $r$ prior to any off-center branch are $0$ (`CENTER_DIGIT`), and no directional digit equals the prohibited pentagon directional digit:
   $$d_k \neq 1, \quad \forall k \in [1, r]$$
   *(Note: In H3 canonical indexing, if any non-zero digit is present, the cell is a descendant hexagon unless all directional digits are $0$, in which case it remains a pentagon at resolution $r$. However, pentagonal aperture digit extraction specifically targets both pure pentagonal cells and pentagon-rooted child trajectories to resolve boundary coordinate transforms.)*

### 2.3 Non-Zero Directional Digit Sequence
Let the full digit vector be:
$$\mathbf{D} = [d_1, d_2, \dots, d_r], \quad d_k = (\text{index} \gg (45 - 3k)) \ \& \ 7n$$

The non-zero directional digit sequence $\mathbf{D}_{\neq 0}$ is defined as the ordered subsequence of non-zero aperture directions:
$$\mathbf{D}_{\neq 0} = [d_k \in \mathbf{D} \mid d_k \neq 0]$$

For pentagonal cells, `extractPentagonApertureDigits` parses $\mathbf{D}$, evaluates whether the cell root is in $\mathcal{P}_{\text{base}}$, extracts $\mathbf{D}_{\neq 0}$, validates directional constraints ($d_k \in \{2, 3, 4, 5, 6\}$ for pentagonal directional branches), and returns structured metadata including the first non-zero directional digit ($d_{\text{lead}}$) and the count of leading zero digits.

---

## 3. Object-Oriented Design & Interface Contracts

### 3.1 Class Hierarchy and Module Placement
The extraction logic is added to `src/spatial/h3_adjacency.ts`, extending existing adjacency and topology constructs:

```
src/spatial/
├── h3_types.ts              <-- Extended with PentagonApertureInfo interface
├── h3_adjacency.ts          <-- Implementation of extractPentagonApertureDigits & H3PentagonApertureParser
├── spatial_flux_monad.ts    <-- Consumes pentagon aperture data for boundary flux balancing
└── h3_state_tensor.ts       <-- State tensor integration for non-hexagonal cells
```

### 3.2 TypeScript Interface Contracts (`src/spatial/h3_types.ts`)

```typescript
/**
 * Metadata result from pentagonal aperture digit extraction.
 */
export interface PentagonApertureResult {
  /** The 64-bit canonical H3 index string (hexadecimal). */
  readonly h3Index: string;
  /** Resolution of the cell (0 to 15). */
  readonly resolution: number;
  /** Base cell identifier (0 to 121). */
  readonly baseCell: number;
  /** Whether the base cell is one of the 12 icosahedral pentagons. */
  readonly isPentagonBaseCell: boolean;
  /** True if the cell is a topological pentagon at its current resolution (all digits == 0). */
  readonly isPurePentagon: boolean;
  /** All resolution directional digits [d_1, ..., d_r]. */
  readonly allDigits: readonly number[];
  /** Subsequence of non-zero directional digits [d_k | d_k != 0]. */
  readonly nonZeroDigits: readonly number[];
  /** First non-zero directional digit, or null if all digits are 0 (pure pentagon). */
  readonly leadingNonZeroDigit: number | null;
  /** Resolution index (1-based) where the first non-zero digit occurs, or null. */
  readonly leadingNonZeroResolution: number | null;
  /** Number of leading center (0) digits before the first non-zero digit. */
  readonly leadingCenterCount: number;
  /** Whether the digit sequence contains an invalid pentagonal digit (e.g. digit 1). */
  readonly hasInvalidPentagonDigit: boolean;
}
```

### 3.3 Static & Class Architecture (`src/spatial/h3_adjacency.ts`)

```typescript
export class H3PentagonApertureParser {
  public static readonly PENTAGON_BASE_CELLS: ReadonlySet<number> = new Set([
    4, 14, 24, 38, 49, 58, 63, 72, 83, 97, 107, 117,
  ]);

  public static readonly INVALID_PENTAGON_DIGIT: number = 1; // K_AXES_DIGIT

  /**
   * Evaluates if a given base cell index is an icosahedral pentagon.
   */
  public static isPentagonBase(baseCell: number): boolean;

  /**
   * Extracts aperture digits and classifies directional branch behavior
   * for pentagonal base cells or pentagonal descendants.
   */
  public static extractPentagonApertureDigits(h3IndexHex: string): PentagonApertureResult;
}

/**
 * Functional export matching Sprint Goal interface specification.
 */
export function extractPentagonApertureDigits(h3IndexHex: string): PentagonApertureResult;
```

---

## 4. Thermodynamic & Monad Stock Transitions

### 4.1 First Law: Mass & Energy Flux Across Pentagon Singularities
Pentagonal cells have 5 spatial neighbors instead of 6. When `SpatialFluxMonad` balances mass and energy fluxes:

$$\sum_{j=1}^{N_i} J_{i \to j}^{\text{diff}} = 0, \quad N_i = \begin{cases} 5, & \text{if } i \text{ is pentagon} \\ 6, & \text{if } i \text{ is hexagon} \end{cases}$$

Without aperture digit extraction:
- Decimation transitions between resolution $r$ and $r-1$ miss the deleted $K$-axis facet ($d=1$).
- Neighbor lookup routines attempt to route diffusive enthalpy through directional digit $1$, causing non-zero thermodynamic divergence:
  $$\nabla \cdot \mathbf{J} \neq 0 \implies \Delta M_{\text{universe}} \neq 0 \quad (\text{Violation of Law 1})$$

By parsing non-zero directional digits through `extractPentagonApertureDigits`:
1. `SpatialFluxMonad` accurately identifies pentagon boundary edges.
2. The 5 real edges map to directional digits $\{2, 3, 4, 5, 6\}$ around the pentagon vertex.
3. Diffusive conductance tensors scale by $\frac{5}{6}$ geometric correction factor, ensuring zero mass-loss:
   $$\oint_{\partial \Omega_{\text{pent}}} \mathbf{J} \cdot d\mathbf{n} = \sum_{k \in \{2,3,4,5,6\}} J_k = 0$$

### 4.2 Second Law: Irreversible Entropy Production
Advective and diffusive transport over pentagonal boundaries must satisfy non-negative local entropy production:

$$\sigma_s = \sum_{j \in \text{neighbors}(i)} J_{i \to j} \left( \frac{1}{T_j} - \frac{1}{T_i} \right) \ge 0$$

Extracting directional aperture sequences prevents phantom cycles across the $K$-axis coordinate discontinuity, preserving the monotonically non-decreasing entropy invariant across the global grid.

---

## 5. Implementation Details

### 5.1 Bit Extraction Algorithm
Given a 16-character hexadecimal string representing a 64-bit integer:
1. Parse string to `BigInt`: `val = BigInt("0x" + h3IndexHex)`.
2. Mode check: `(val >> 59n) & 0xFn === 1n` (Mode 1 = H3 Cell).
3. Extract resolution: `res = Number((val >> 52n) & 0xFn)`. Validate $0 \le res \le 15$.
4. Extract base cell: `bc = Number((val >> 45n) & 0x7Fn)`. Validate $0 \le bc \le 121$.
5. Determine if `bc` is in $\mathcal{P}_{\text{base}}$.
6. Iterate $k$ from $1$ to $res$:
   - Shift amount: $\text{shift} = 45n - 3n \times \text{BigInt}(k)$.
   - Digit: $d_k = \text{Number}((val \gg \text{shift}) \ \& \ 7n)$.
   - Append to `allDigits`.
   - If $d_k \neq 0$: append to `nonZeroDigits`. Record $d_{\text{lead}}$ if first encounter.
   - If $d_k === 1$: flag `hasInvalidPentagonDigit = true`.
7. Return frozen `PentagonApertureResult`.

---

## 6. Verification and Test Strategy

### 6.1 Test Cases for `tests/sprint_086.test.ts`
1. **Base Pentagons at Resolution 0**:
   - Verify Base Cell 4 (`0x8009fffffffffff`), Resolution 0:
     - `isPentagonBaseCell === true`, `resolution === 0`, `allDigits === []`, `nonZeroDigits === []`, `isPurePentagon === true`.
2. **Pure Pentagons at Higher Resolutions ($r > 0$)**:
   - Base Cell 14 with all zero digits at Resolution 3:
     - `allDigits === [0, 0, 0]`, `nonZeroDigits === []`, `isPurePentagon === true`, `leadingNonZeroDigit === null`.
3. **Pentagon Children with Non-Zero Aperture Digits**:
   - Base Cell 24 with digits `[0, 2, 5]` at Resolution 3:
     - `allDigits === [0, 2, 5]`, `nonZeroDigits === [2, 5]`, `leadingNonZeroDigit === 2`, `leadingCenterCount === 1`, `hasInvalidPentagonDigit === false`.
4. **Invalid Pentagon Digit Detection**:
   - Base Cell 4 with digits `[0, 1, 3]` (contains prohibited digit 1):
     - `hasInvalidPentagonDigit === true`.
5. **Non-Pentagon Hexagonal Base Cells**:
   - Base Cell 0 (hexagonal base cell) with digits `[1, 2]`:
     - `isPentagonBaseCell === false`, `isPurePentagon === false`, `nonZeroDigits === [1, 2]`, `hasInvalidPentagonDigit === false` (since digit 1 is valid for hexagons).
6. **Thermodynamic Invariant Conservation**:
   - Assert `SpatialFluxMonad` with pentagon neighbors maintains exact closed-system mass conservation ($\sum \Delta m < 10^{-15}$).