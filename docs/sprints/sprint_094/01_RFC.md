# RFC 094: Aperture-7 Class III Step Counter and Hierarchical Orientation Parity

- **Sprint**: 094
- **Author**: Chief Systems Architect
- **Status**: Proposed
- **Target Component**: `src/spatial/h3_adjacency.ts` (with extensions in `src/spatial/h3_types.ts`)

---

## 1. Executive Summary & Sprint Goal

### Sprint Goal
Implement `countClassIIIApertureSteps` counting odd resolution steps up to a target resolution in `src/spatial/h3_adjacency.ts`.

### Architectural Context
The discrete global grid system (DGGS) utilized by the Web of Life engine is structured around the aperture-7 hexagonal hierarchy (H3). In aperture-7 discrete hexagonal systems, successive resolution steps alternate spatial orientation:
- **Even resolutions** ($r \in \{0, 2, 4, 6, \dots\}$) correspond to **Class II** hexagonal orientations, where the hexagon vertices align symmetrically along the primary icosahedral axes.
- **Odd resolutions** ($r \in \{1, 3, 5, 7, \dots\}$) correspond to **Class III** hexagonal orientations, rotated by the characteristic aperture-7 angle $\theta \approx 19.106605^\circ$ ($\arcsin(\sqrt{3} / (2\sqrt{7}))$) relative to the parent cell frame.

When thermodynamic flux tensors, mass-conserving trophic biomasses, and biogeochemical stocks are projected or aggregated across multiple resolution levels via the `SpatialFluxMonad`, directional adjacency vectors undergo rotational transformations based on the cumulative number of Class III steps traversed.

Sprint 094 formalizes and implements `countClassIIIApertureSteps` in `src/spatial/h3_adjacency.ts` to compute the exact number of Class III aperture rotation steps between resolution levels (or from base resolution 0 up to a target resolution), guaranteeing that spatial transforms and flux stencils adhere strictly to H3 aperture orientation parity.

---

## 2. Mathematical Foundations: Aperture-7 Geometry & Class Parity

### 2.1 Aperture-7 Rotation Dynamics
In an aperture-7 hexagonal hierarchical decomposition, the area ratio between resolution $r$ and resolution $r+1$ is exactly $7:1$. The transition matrix between the coordinate frame of resolution $r$ and resolution $r+1$ involves a scaling factor of $1/\sqrt{7}$ and a rotation by:
$$\theta_k = (-1)^r \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx (-1)^r \times 19.106605350869095^\circ$$

Consequently:
- At **Resolution 0**: 0 Class III transitions have occurred (Class II base orientation).
- At **Resolution 1**: 1 Class III transition (Class III orientation, rotated $+\theta$).
- At **Resolution 2**: 1 Class III transition accumulated; the transition from 1 to 2 is Class III $\to$ Class II (counter-rotation $-\theta$ cancels the net grid tilt, aligning back to Class II).
- At **Resolution $r$**: The total count of odd resolution transitions $k \in \{1, \dots, r\}$ defines the cumulative Class III aperture transitions traversed from base resolution 0.

### 2.2 Counting Formulation
For any non-negative target resolution $r \in \mathbb{N}_0$, the number of odd integer steps in the interval $[1, r]$ is given by:
$$N_{\text{Class III}}(r) = \left\lfloor \frac{r + 1}{2} \right\rfloor$$

For a transition between an arbitrary source resolution $r_{\text{start}}$ and target resolution $r_{\text{target}}$ where $0 \le r_{\text{start}} \le r_{\text{target}}$:
$$N_{\text{Class III}}(r_{\text{start}}, r_{\text{target}}) = \left\lfloor \frac{r_{\text{target}} + 1}{2} \right\rfloor - \left\lfloor \frac{r_{\text{start}} + 1}{2} \right\rfloor$$

When $r_{\text{start}} > r_{\text{target}}$ (coarsening/up-projection), the count reflects the number of Class III steps traversed in reverse:
$$N_{\text{Class III}}(r_{\text{start}}, r_{\text{target}}) = \left| \left\lfloor \frac{r_{\text{target}} + 1}{2} \right\rfloor - \left\lfloor \frac{r_{\text{start}} + 1}{2} \right\rfloor \right|$$

---

## 3. Thermodynamic & Monadic Invariants

### 3.1 First Law Compliance (Conservation of Energy and Matter)
Directional transformations derived from Class III step parity must preserve the conservation of mass and enthalpy across all spatial monad transitions:
$$\sum_{c \in \mathcal{C}} M_c(t + \Delta t) = \sum_{c \in \mathcal{C}} M_c(t) + \Phi_{\text{solar}} - \Phi_{\text{dissipation}}$$
The function `countClassIIIApertureSteps` is a purely geometric, stateless invariant calculator. It introduces zero synthetic mass or energy into the system and provides exact parity invariants for directional divergence kernels.

### 3.2 Second Law Compliance (Entropy and Dissipation)
Any spatial flux divergence computed using rotational neighbor kernels must satisfy non-negative local dissipation $\sigma \ge 0$. Correct neighbor index mapping across Class II / Class III resolutions prevents artificial negative diffusion gradients that would violate entropy production constraints.

---

## 4. Architectural Specification & Interface Contracts

### 4.1 Interface Contract Additions (`src/spatial/h3_adjacency.ts`)

```typescript
/**
 * Options for aperture step computation across resolution scales.
 */
export interface ApertureStepOptions {
  /** Source resolution (defaults to 0 if omitted) */
  readonly startResolution?: number;
}

/**
 * Result structure detailing aperture class distribution between resolution levels.
 */
export interface ApertureClassProfile {
  readonly startResolution: number;
  readonly targetResolution: number;
  readonly classIIISteps: number;
  readonly classIISteps: number;
  readonly totalSteps: number;
  readonly isTargetClassIII: boolean;
}

/**
 * Counts the number of Class III (odd resolution) aperture steps from resolution 0
 * (or an optional start resolution) up to the specified target resolution.
 *
 * @param targetResolution Target H3 resolution (0 to MAX_H3_RES)
 * @param startResolution Optional starting H3 resolution (defaults to 0)
 * @returns Total count of Class III (odd) resolution steps in the transition interval
 * @throws RangeError if resolution is negative, non-integer, or exceeds maximum resolution bounds
 */
export function countClassIIIApertureSteps(
  targetResolution: number,
  startResolution?: number
): number;

/**
 * Generates an ApertureClassProfile providing detailed parity analysis between two resolutions.
 *
 * @param targetResolution Target resolution
 * @param startResolution Source resolution (default 0)
 * @returns Comprehensive aperture profile
 */
export function getApertureClassProfile(
  targetResolution: number,
  startResolution?: number
): ApertureClassProfile;

/**
 * Determines whether a specific H3 resolution is Class III (odd resolution) or Class II (even resolution).
 *
 * @param resolution Resolution to test
 * @returns true if Class III (odd), false if Class II (even)
 */
export function isClassIIIResolution(resolution: number): boolean;
```

### 4.2 Class Hierarchy Additions
To maintain an incremental, object-oriented design without rewrites, `countClassIIIApertureSteps` and its associated profiling utilities will be integrated directly into the existing functional and class-based spatial hierarchy:

1. **`H3DirectionalKernel`**: Incorporates `countClassIIIApertureSteps` to determine rotation matrices for directional offsets across resolution jumps.
2. **`SpatialFluxMonad`**: Calls `countClassIIIApertureSteps` when inter-resolution flux operators (projections and restrictions) are composed, ensuring orientation-consistent Laplacian kernels.

---

## 5. Algorithmic Specification

### 5.1 Validation Rules
1. `targetResolution` must be a non-negative finite integer: $r \in [0, 15]$.
2. `startResolution` (if provided) must be a non-negative finite integer: $r \in [0, 15]$.
3. Inputs failing validation must throw a descriptive `RangeError` or `TypeError`.

### 5.2 Algorithm for `countClassIIIApertureSteps(targetResolution, startResolution = 0)`
```typescript
export function countClassIIIApertureSteps(
  targetResolution: number,
  startResolution: number = 0
): number {
  validateResolution(targetResolution, 'targetResolution');
  validateResolution(startResolution, 'startResolution');

  const minRes = Math.min(startResolution, targetResolution);
  const maxRes = Math.max(startResolution, targetResolution);

  const oddUpToMax = Math.floor((maxRes + 1) / 2);
  const oddUpToMin = Math.floor((minRes + 1) / 2);

  return oddUpToMax - oddUpToMin;
}
```

### 5.3 Step Analysis Table (Base 0 to Target)
| Target Resolution | Class | Cumulative Class III Steps | Cumulative Class II Steps | Net Tilt Parity |
|---|---|---|---|---|
| 0 | Class II | 0 | 1 | $0$ (Aligned) |
| 1 | Class III | 1 | 1 | $+1$ (Tilted) |
| 2 | Class II | 1 | 2 | $0$ (Aligned) |
| 3 | Class III | 2 | 2 | $+1$ (Tilted) |
| 4 | Class II | 2 | 3 | $0$ (Aligned) |
| 5 | Class III | 3 | 3 | $+1$ (Tilted) |
| 6 | Class II | 3 | 4 | $0$ (Aligned) |
| 7 | Class III | 4 | 4 | $+1$ (Tilted) |
| 8 | Class II | 4 | 5 | $0$ (Aligned) |
| 9 | Class III | 5 | 5 | $+1$ (Tilted) |
| 10 | Class II | 5 | 6 | $0$ (Aligned) |
| 15 | Class III | 8 | 8 | $+1$ (Tilted) |

---

## 6. Verification and Test Plan

### Unit Test Cases (`tests/sprint_094.test.ts`)
1. **Base Case Verification**:
   - `countClassIIIApertureSteps(0)` returns `0`.
   - `countClassIIIApertureSteps(1)` returns `1`.
   - `countClassIIIApertureSteps(2)` returns `1`.
   - `countClassIIIApertureSteps(3)` returns `2`.
   - `countClassIIIApertureSteps(15)` returns `8`.
2. **Range Interval Invariance**:
   - `countClassIIIApertureSteps(3, 1)` returns `1` (odd steps: 3).
   - `countClassIIIApertureSteps(4, 2)` returns `1` (odd steps: 3).
   - `countClassIIIApertureSteps(5, 1)` returns `2` (odd steps: 3, 5).
   - Reversible step invariant: `countClassIIIApertureSteps(1, 5) === countClassIIIApertureSteps(5, 1)`.
   - Identity: `countClassIIIApertureSteps(r, r) === 0` for all $r \in [0, 15]$.
3. **Parity and Profile Checks**:
   - `isClassIIIResolution(r)` returns `true` if and only if $r \% 2 \ne 0$.
   - `getApertureClassProfile(target, start)` satisfies: `classIIISteps + classIISteps === Math.abs(target - start)`.
4. **Boundary and Error Handling**:
   - Negative numbers (`-1`), non-integers (`2.5`, `NaN`, `Infinity`), out-of-bounds resolutions (`16`, `100`) throw appropriate errors.
5. **Thermodynamic Invariance**:
   - Verify that rotation calculation with zero Class III net steps preserves canonical basis orientation for spatial flux conservation.

---

## 7. Next Steps & Artifact Sequence
1. Implement `countClassIIIApertureSteps`, `isClassIIIResolution`, and `getApertureClassProfile` in `src/spatial/h3_adjacency.ts`.
2. Document methods and parity mathematics in `docs/sprints/sprint_094/02_METHODS.md`.
3. Construct comprehensive test suite in `tests/sprint_094.test.ts`.
4. Run validation and update database UML / release notes.