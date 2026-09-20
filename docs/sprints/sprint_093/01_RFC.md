# RFC-093: Aperture Rotation Sequence Resolution for H3 Hierarchical Tessellation

**Status:** Proposed  
**Author:** Chief Systems Architect  
**Sprint:** 093  
**Target File:** `src/spatial/h3_adjacency.ts`  
**Related Components:** `src/spatial/h3_types.ts`, `src/spatial/h3_grid.ts`, `src/spatial/spatial_flux_monad.ts`, `src/thermodynamics/constants.ts`  

---

## 1. Executive Summary & Sprint Goal

### Sprint Goal
Implement `getApertureRotationSequence` returning an array of aperture orientation classes from Resolution $0$ to the target resolution in `src/spatial/h3_adjacency.ts`.

### Abstract
The discrete global grid system (DGGS) utilized across the Web of Life simulation relies on an Aperture-7 hexagonal hierarchy projected onto an icosahedron. In Aperture-7 hexagonal tessellations, child hexagons do not nest strictly inside parent hexagons with parallel edges; rather, each successive resolution level incurs a discrete coordinate system rotation of:
$$\theta = \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx 19.106605^\circ$$
Because of this intrinsic irrational tiling ratio, the orientation parity of H3 hexagons alternates at every discrete resolution step between two topological orientations: **Class II** and **Class III** (with Base Cells at Resolution 0 fixed by convention as Class II). 

Accurate discrete spatial calculus, directional flux tracing, and multi-scale mass-energy transport across nested spatial monads require an exact sequence of aperture rotation classes from Resolution 0 to the cell's target resolution. This RFC specifies the mathematical formulation, type contracts, object-oriented service integration, and thermodynamic guarantees for `getApertureRotationSequence`.

---

## 2. Mathematical & Topological Foundation

### 2.1 Aperture-7 Hexagonal Hierarchies and Coordinate System Rotations
Let $\mathcal{H}_r$ denote the hexagonal lattice at resolution $r \in \mathbb{N}_0$, where $r \in [0, 15]$. In H3 DGGS:
- **Resolution 0 (Base Cells):** Defined with standard vertex and edge alignments relative to the icosahedral face coordinate frames. By standard H3 convention, resolution 0 cells are designated **Class II**.
- **Resolution Step $r \to r + 1$:** Refinement by Aperture 7 scales the cell area by $\frac{1}{7}$ and rotates the coordinate axes by $\theta \approx 19.11^\circ$.
- **Alternating Parity:**
  - Even resolutions ($r = 0, 2, 4, 6, \dots$): Class II orientation ($\Delta \theta \equiv 0 \pmod{60^\circ}$ relative to base grid).
  - Odd resolutions ($r = 1, 3, 5, 7, \dots$): Class III orientation ($\Delta \theta \equiv 19.11^\circ \pmod{60^\circ}$ relative to base grid).

$$\operatorname{ApertureClass}(r) = \begin{cases} 
\text{CLASS\_II} & \text{if } r \equiv 0 \pmod 2 \\ 
\text{CLASS\_III} & \text{if } r \equiv 1 \pmod 2 
\end{cases}$$

### 2.2 Sequence Definition
For any valid target resolution $R_{\text{target}} \in [0, 15]$, the aperture rotation sequence is the ordered $(R_{\text{target}} + 1)$-tuple:
$$\mathcal{S}(R_{\text{target}}) = \Big( \operatorname{ApertureClass}(0), \operatorname{ApertureClass}(1), \dots, \operatorname{ApertureClass}(R_{\text{target}}) \Big)$$

For instance:
- $\mathcal{S}(0) = [\text{CLASS\_II}]$
- $\mathcal{S}(1) = [\text{CLASS\_II}, \text{CLASS\_III}]$
- $\mathcal{S}(2) = [\text{CLASS\_II}, \text{CLASS\_III}, \text{CLASS\_II}]$
- $\mathcal{S}(3) = [\text{CLASS\_II}, \text{CLASS\_III}, \text{CLASS\_II}, \text{CLASS\_III}]$

---

## 3. Class Hierarchy & Architectural Design

The design upholds our incremental object-oriented architecture. We extend `h3_types.ts` with explicit Aperture Class enumeration and type safety, and implement the generator inside `h3_adjacency.ts`.

```
                  +--------------------------------+
                  |         ApertureClass          |
                  | <<enumeration / string union>> |
                  |   CLASS_II = 'CLASS_II'        |
                  |   CLASS_III = 'CLASS_III'      |
                  +--------------------------------+
                                   ^
                                   | utilizes
                                   |
                  +--------------------------------+
                  |        H3AdjacencyService      |
                  +--------------------------------+
                  | + getApertureRotationSequence( |
                  |     targetResolution: number   |
                  |   ): ApertureClass[]           |
                  | + getApertureClass(            |
                  |     resolution: number         |
                  |   ): ApertureClass             |
                  | + isClassII(res: number): bool |
                  | + isClassIII(res: num): bool   |
                  +--------------------------------+
                                   |
                                   | injected into
                                   v
                  +--------------------------------+
                  |       SpatialFluxMonad         |
                  +--------------------------------+
                  | - apertureSeq: ApertureClass[] |
                  | + computeDirectionalFluxVector |
                  +--------------------------------+
```

### 3.1 Interface & Type Specifications (`src/spatial/h3_types.ts`)

```typescript
export enum ApertureClass {
  CLASS_II = 'CLASS_II',
  CLASS_III = 'CLASS_III'
}

export type ApertureClassType = 'CLASS_II' | 'CLASS_III';

export interface IApertureRotationSequence {
  readonly targetResolution: number;
  readonly sequence: readonly ApertureClass[];
}
```

### 3.2 Service Implementation Contract (`src/spatial/h3_adjacency.ts`)

```typescript
/**
 * Evaluates the Aperture orientation class for a discrete H3 resolution.
 * @param resolution Discrete resolution level [0, 15].
 * @returns ApertureClass.CLASS_II if resolution is even, ApertureClass.CLASS_III if odd.
 * @throws Error if resolution is outside [0, 15] or non-integer.
 */
export function getApertureClass(resolution: number): ApertureClass;

/**
 * Computes the full sequence of aperture rotation classes from Resolution 0
 * up to and including the specified target resolution.
 * 
 * @param targetResolution The target H3 resolution (integer between 0 and 15 inclusive).
 * @returns Array of ApertureClass items of length (targetResolution + 1).
 * @throws RangeError if targetResolution < 0 or targetResolution > 15.
 * @throws TypeError if targetResolution is not an integer.
 */
export function getApertureRotationSequence(targetResolution: number): ApertureClass[];
```

---

## 4. Integration with Spatial Flux Monad & Thermodynamic Integrity

Hexagonal grids with alternating aperture classes have directional vectors whose azimuth in the tangent plane rotates by $\pm \theta$. When matter and energy flux vectors ($\mathbf{J}_{\text{biomass}}, \mathbf{J}_{\text{water}}, \mathbf{J}_{\text{heat}}$) are transferred between resolutions $r$ and $r \pm 1$ in `SpatialFluxMonad`:
1. **Directional Basis Alignment:** Cross-resolution neighborhood adjacencies (e.g. parent-to-child or cross-resolution diffusion) must transform coordinate components by rotation matrix $\mathbf{R}(\Delta \theta)$ where $\Delta \theta = \pm 19.106605^\circ$ if the source and target differ in aperture parity.
2. **First Law Conservation:** Rotation of flux vectors does not alter scalar tensor norms ($\|\mathbf{J}\|_2$). Divergence calculations over the rotated aperture interfaces preserve exact mass and enthalpy conservation:
   $$\oint_{\partial \Omega} \mathbf{J} \cdot d\mathbf{n} = 0 \quad (\text{closed boundary conservation})$$
3. **Second Law Entropy Production:** Coordinate representation changes introduce no spurious dissipation: numerical diffusion is strictly constrained such that entropy generation $\sigma \ge 0$ is solely driven by real thermodynamic gradients.

---

## 5. Implementation Details

1. **Validation:**
   - Strict validation asserting that `Number.isInteger(targetResolution)` is `true`.
   - Bounds check asserting `0 <= targetResolution && targetResolution <= 15`.
2. **Deterministic Sequence Construction:**
   - Pre-computed lookup or loop generation producing an immutable array or defensive copy.
   - For resolution $r \in [0, \text{targetResolution}]$, cell parity is checked using bitwise `(r & 1) === 0 ? ApertureClass.CLASS_II : ApertureClass.CLASS_III`.
3. **Class Methods & Free Functions:**
   - Provide standalone `getApertureRotationSequence(targetResolution)` as well as static or instance methods on `H3AdjacencyService` for modularity and dependency injection.

---

## 6. Verification & Test Plan

Test suites in `tests/sprint_093.test.ts` will verify:
1. **Sequence Length:** `getApertureRotationSequence(r).length === r + 1` for all $r \in [0, 15]$.
2. **Base Case Parity:** `getApertureRotationSequence(0)` returns `[ApertureClass.CLASS_II]`.
3. **Alternating Sequence Structure:**
   - Resolution 1 returns `['CLASS_II', 'CLASS_III']`.
   - Resolution 2 returns `['CLASS_II', 'CLASS_III', 'CLASS_II']`.
   - Resolution 7 ends in `'CLASS_III'`, Resolution 8 ends in `'CLASS_II'`.
4. **Boundary & Negative Cases:**
   - Throws `RangeError` on $r < 0$ (e.g., `-1`).
   - Throws `RangeError` on $r > 15$ (e.g., `16`, `100`).
   - Throws `TypeError` or `RangeError` on non-integers (e.g., `2.5`, `NaN`, `Infinity`).
5. **Thermodynamic Monad Invariance:**
   - Ensure spatial state tensors utilizing `getApertureRotationSequence` conserve 100% mass and energy under aperture-aligned flux calculations.