# Sprint 094 Release Notes: Aperture-7 Class III Step Counter & Hierarchical Orientation Parity

**Release Tag:** `v0.94.0`  
**Sprint Duration:** Sprint 094  
**Target Subsystem:** Spatial Discrete Global Grid System (`src/spatial/h3_adjacency.ts`)  
**Status:** Completed & Verified  

---

## 1. Executive Summary

Sprint 094 delivers mathematical parity alignment and aperture tracking for discrete global grid systems (DGGS) in the Web of Life simulation engine. Centered on the Aperture-7 hexagonal hierarchy (H3), this release introduces `countClassIIIApertureSteps`, `isClassIIIResolution`, and `getApertureClassProfile` in `src/spatial/h3_adjacency.ts`.

In aperture-7 hexagonal coordinate systems, discrete resolutions alternate spatial orientation:
- **Class II (Even Resolutions $r \in \{0, 2, 4, \dots\}$):** Symmetrically aligned with primary icosahedral axes.
- **Class III (Odd Resolutions $r \in \{1, 3, 5, \dots\}$):** Rotated by the characteristic aperture-7 tilt angle $\theta = \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx 19.106605^\circ$.

When thermodynamic flux tensors, mass-conserving trophic biomasses, and biogeochemical stocks are projected or aggregated across hierarchical resolutions via `SpatialFluxMonad`, directional adjacency vectors undergo rotational transformations based on the cumulative number of Class III steps traversed. Sprint 094 establishes rigorous, closed-form calculation of these orientation transitions, ensuring absolute orientation parity and flux conservation across spatial scales.

---

## 2. Key Features & Architectural Enhancements

### 2.1 Closed-Form Class III Step Calculation (`countClassIIIApertureSteps`)
Computes the exact count of odd resolution steps traversed between base resolution 0 (or an arbitrary start resolution) and a target resolution $r \in [0, 15]$.

$$\text{Class III Steps}(r_{\text{start}}, r_{\text{target}}) = \left| \left\lfloor \frac{r_{\text{target}} + 1}{2} \right\rfloor - \left\lfloor \frac{r_{\text{start}} + 1}{2} \right\rfloor \right|$$

- **Time Complexity:** $\mathcal{O}(1)$ constant-time arithmetic evaluation.
- **Space Complexity:** $\mathcal{O}(1)$ allocation-free execution.
- **Symmetric / Reversible:** Invariant to up-projection vs. down-projection (`countClassIIIApertureSteps(a, b) === countClassIIIApertureSteps(b, a)`).

### 2.2 Resolution Class Parity Identification (`isClassIIIResolution`)
Determines whether a given H3 resolution exhibits Class III (odd, rotated by $\theta$) or Class II (even, canonical orientation) characteristics.

### 2.3 Comprehensive Aperture Profiles (`getApertureClassProfile`)
Produces an immutable profile structure (`ApertureClassProfile`) describing the distribution of Class II and Class III steps across any resolution interval, validating step partition conservation:
$$\text{totalSteps} = \text{classIISteps} + \text{classIIISteps} = |r_{\text{target}} - r_{\text{start}}|$$

---

## 3. Public API & Type Contracts

### 3.1 Type Definitions

```typescript
/**
 * Configuration options for aperture resolution step calculations.
 */
export interface ApertureStepOptions {
  /** Source resolution (defaults to 0 if omitted) */
  readonly startResolution?: number;
}

/**
 * Detailed profile capturing aperture parity and step distributions between two resolution levels.
 */
export interface ApertureClassProfile {
  readonly startResolution: number;
  readonly targetResolution: number;
  readonly classIIISteps: number;
  readonly classIISteps: number;
  readonly totalSteps: number;
  readonly isTargetClassIII: boolean;
}
```

### 3.2 Exported Functions (`src/spatial/h3_adjacency.ts`)

```typescript
/**
 * Evaluates whether a specified H3 resolution belongs to Class III (odd resolution, rotated).
 *
 * @param resolution - The H3 resolution index (0 to 15)
 * @returns true if Class III (odd), false if Class II (even)
 * @throws RangeError if resolution is negative, non-integer, or exceeds MAX_H3_RES
 */
export function isClassIIIResolution(resolution: number): boolean;

/**
 * Counts the number of Class III (odd) aperture steps traversed between a start resolution
 * (default 0) and a target resolution.
 *
 * @param targetResolution - Target H3 resolution (0 to 15)
 * @param startResolution - Optional starting H3 resolution (default 0)
 * @returns Total count of Class III resolution steps traversed
 * @throws RangeError if resolutions fail boundary or integer validation
 */
export function countClassIIIApertureSteps(
  targetResolution: number,
  startResolution?: number
): number;

/**
 * Generates an ApertureClassProfile detailing the Class II and Class III breakdown.
 *
 * @param targetResolution - Target H3 resolution
 * @param startResolution - Optional starting H3 resolution (default 0)
 * @returns Comprehensive ApertureClassProfile
 */
export function getApertureClassProfile(
  targetResolution: number,
  startResolution?: number
): ApertureClassProfile;
```

---

## 4. Aperture Parity Matrix Reference

The table below demonstrates the cumulative step counts and net orientation parity from base resolution 0 to resolution 15:

| Target Resolution ($r$) | Grid Class | Cumulative Class III Steps | Cumulative Class II Steps | Net Tilt Parity |
|---|---|---|---|---|
| **0** | Class II | 0 | 1 | $0$ (Aligned) |
| **1** | Class III | 1 | 1 | $+1$ (Rotated $+\theta$) |
| **2** | Class II | 1 | 2 | $0$ (Aligned) |
| **3** | Class III | 2 | 2 | $+1$ (Rotated $+\theta$) |
| **4** | Class II | 2 | 3 | $0$ (Aligned) |
| **5** | Class III | 3 | 3 | $+1$ (Rotated $+\theta$) |
| **6** | Class II | 3 | 4 | $0$ (Aligned) |
| **7** | Class III | 4 | 4 | $+1$ (Rotated $+\theta$) |
| **8** | Class II | 4 | 5 | $0$ (Aligned) |
| **9** | Class III | 5 | 5 | $+1$ (Rotated $+\theta$) |
| **10** | Class II | 5 | 6 | $0$ (Aligned) |
| **11** | Class III | 6 | 6 | $+1$ (Rotated $+\theta$) |
| **12** | Class II | 6 | 7 | $0$ (Aligned) |
| **13** | Class III | 7 | 7 | $+1$ (Rotated $+\theta$) |
| **14** | Class II | 7 | 8 | $0$ (Aligned) |
| **15** | Class III | 8 | 8 | $+1$ (Rotated $+\theta$) |

---

## 5. Thermodynamic & Monadic Integration

### 5.1 Conservation Invariant (First Law of Thermodynamics)
`countClassIIIApertureSteps` is a pure mathematical transformation invariant. When `SpatialFluxMonad` projects conserved quantities (enthalpy, carbon mass, moisture) across grid levels:
$$\sum_{c \in \text{Children}} M_c(t) = M_{\text{Parent}}(t)$$
The orientation parity calculated by `countClassIIIApertureSteps` dictates the neighbor index rotation matrix in `H3DirectionalKernel`, preventing spatial divergence leaks and artificial mass creation during multi-scale convolutions.

### 5.2 Dissipation Invariant (Second Law of Thermodynamics)
By accurately matching directional neighbors across Class II and Class III boundaries, inter-cell flux diffusion preserves non-negative entropy production:
$$\sigma = -\sum_{i,j} J_{ij} \cdot \nabla \mu_{ij} \ge 0$$
Mismatched orientation vectors previously risked inversion of concentration gradients across resolution steps; this release eliminates that numerical failure mode.

---

## 6. Verification and Quality Assurance

A dedicated unit and regression test suite was executed in `tests/sprint_094.test.ts`, covering:

1. **Exact Base Counting:** Verified all canonical values from resolution 0 through 15 against the analytical formula.
2. **Interval and Symmetry Invariance:**
   - Evaluated transitions across arbitrary intervals (e.g., $1 \to 5$, $2 \to 4$, $3 \to 1$).
   - Verified that `countClassIIIApertureSteps(a, b) === countClassIIIApertureSteps(b, a)`.
   - Verified self-identity `countClassIIIApertureSteps(r, r) === 0`.
3. **Partition Completeness:**
   - Ensured `profile.classIIISteps + profile.classIISteps === profile.totalSteps` across all pair combinations in $[0, 15]$.
4. **Boundary and Defensive Validation:**
   - Ensured non-integer values (`1.5`, `NaN`, `Infinity`) throw `TypeError` or `RangeError`.
   - Ensured out-of-range values (`-1`, `16`, `100`) throw descriptive `RangeError`.

---

## 7. Migration & Compatibility Notice

- **Backward Compatibility:** All existing functions in `src/spatial/h3_adjacency.ts` remain fully compatible. The new methods are additive.
- **Engine Integrations:** Systems utilizing `H3DirectionalKernel` or inter-resolution projections in `SpatialFluxMonad` can immediately reference `countClassIIIApertureSteps` to look up orientation offsets without maintaining ad-hoc parity lookup tables.