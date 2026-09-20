# RFC-095: Hierarchical Aperture-7 Class III Coordinate Rotation Angle Computation

- **Author**: Chief Systems Architect
- **Status**: Proposed
- **Sprint**: 095
- **Target File**: `src/spatial/h3_adjacency.ts`
- **Dependencies**: `src/spatial/h3_types.ts`, `src/spatial/spatial_flux_monad.ts`, `src/thermodynamics/constants.ts`

---

## 1. Executive Summary & Sprint Goal

### 1.1 Sprint Goal
Implement `computeClassIIIRotationAngleRadians` scaling `APERTURE_7_ROTATION_RAD` by `countClassIIIApertureSteps` in `src/spatial/h3_adjacency.ts`.

### 1.2 Architectural Motivation
In the Web of Life planetary thermodynamic simulation, spatial fluxes (energy, water, nutrients, carbon) cascade through hierarchical discrete global grid systems (DGGS) mapped via the hexagonal Aperture-7 H3 decomposition. 

Hexagonal hierarchies under Aperture 7 alternate topological alignment between successive resolutions:
- **Class II** resolutions align with the principal coordinate axes of the base icosahedral faces.
- **Class III** resolutions undergo a counter-rotational shift relative to the centroidal axis. The fundamental rotation angle $\theta_{ap7} = \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx 0.333473172$ radians ($\approx 19.106605^\circ$).

When computing inter-resolution flux matrices, neighbor offsets, and directional diffusion tensors in `SpatialFluxMonad`, spatial vectors across multi-resolution cells must be corrected for this discrete cumulative rotation. Sprint 095 establishes the authoritative mathematical primitive `computeClassIIIRotationAngleRadians`, linking resolution step count analysis (`countClassIIIApertureSteps`) with fundamental geometric constants (`APERTURE_7_ROTATION_RAD`).

---

## 2. Thermodynamic & Physical Invariants

### 2.1 First Law of Thermodynamics (Conservation of Mass and Energy)
Rotation operations are strictly orthogonal coordinate transformations:
$$\mathbf{R}(\theta) \in \mathrm{SO}(2), \quad \det(\mathbf{R}) = 1, \quad \|\mathbf{R}\mathbf{J}\| = \|\mathbf{J}\|$$
Where $\mathbf{J}$ represents spatial flux vectors of energy ($W/m^2$) or mass ($kg/(m^2\cdot s)$).
Rotation does not create, destroy, or amplify matter-energy stocks. Coordinate transformations between Class II and Class III grids must preserve the scalar flux divergence:
$$\nabla \cdot \mathbf{J} = \nabla' \cdot \mathbf{J}'$$

### 2.2 Second Law of Thermodynamics (Irreversible Dissipation and Solar Exergy)
Advective and diffusive transport across rotated cell interfaces dissipate exergy into thermal entropy according to:
$$\sigma = -\frac{1}{T^2} \mathbf{J}_q \cdot \nabla T \ge 0$$
Accurate aperture angle projection ensures no spurious numerical diffusion or negative entropy generation is introduced at resolution boundaries. The only external driver remains the top-of-atmosphere solar flux vector.

---

## 3. Mathematical Formalism

### 3.1 Aperture-7 Discrete Coordinate System
In an Aperture-7 hexagonal system, the area ratio between resolution $r$ and $r+1$ is $1:7$. The coordinate basis vectors rotate by:
$$\theta_{\text{step}} = \arcsin\left(\frac{\sqrt{3}}{2\sqrt{7}}\right) \approx 0.3334731722918321 \text{ rad}$$
Let $r_1$ and $r_2$ be two valid H3 resolutions such that $0 \le r_1, r_2 \le 15$.
The number of Class III aperture steps traversed between $r_1$ and $r_2$ is governed by:
$$n_{\text{III}} = \text{countClassIIIApertureSteps}(r_1, r_2)$$

### 3.2 Rotation Angle Scaling
The cumulative rotation angle $\Theta(r_1, r_2)$ is defined as:
$$\Theta(r_1, r_2) = n_{\text{III}} \times \theta_{\text{ap7}}$$
Where:
- $\theta_{\text{ap7}} = \text{APERTURE\_7\_ROTATION\_RAD}$
- $n_{\text{III}} \in \mathbb{Z}$ represents the signed or unsigned aperture step count depending on directional hierarchy traverse.

When normalized to the periodic interval $[-\pi, \pi)$ or $[0, 2\pi)$:
$$\Theta_{\text{norm}} = ((\Theta + \pi) \pmod{2\pi}) - \pi$$

---

## 4. Technical Architecture & Interface Contracts

### 4.1 Interface and Constant Definitions
In `src/spatial/h3_adjacency.ts`:

```typescript
/**
 * Fundamental rotation angle for Aperture-7 Class III hexagon resolutions in radians.
 * arcsin(sqrt(3) / (2 * sqrt(7))) ≈ 0.3334731722918321 rad (~19.106605 deg).
 */
export const APERTURE_7_ROTATION_RAD: number = 0.3334731722918321;

/**
 * Counts the number of Class III aperture transitions between two H3 resolution tiers.
 *
 * @param startRes - Base resolution (0-15)
 * @param targetRes - Target resolution (0-15)
 * @returns Integer count of Class III aperture rotation steps traversed.
 */
export function countClassIIIApertureSteps(startRes: number, targetRes: number): number;

/**
 * Computes the cumulative rotation angle in radians for Class III Aperture-7 transitions
 * between two resolutions, scaling APERTURE_7_ROTATION_RAD by countClassIIIApertureSteps.
 *
 * @param startRes - Starting resolution (0-15)
 * @param targetRes - Ending resolution (0-15)
 * @param normalize - Optional flag to normalize output to [-PI, PI). Defaults to true.
 * @returns Cumulative rotation angle in radians.
 */
export function computeClassIIIRotationAngleRadians(
  startRes: number,
  targetRes: number,
  normalize?: boolean
): number;
```

### 4.2 Class Hierarchy Additions
To ensure cohesive, object-oriented incremental integration:

```
+-------------------------------------------------------------+
|              H3SpatialTransformationRegistry                 |
+-------------------------------------------------------------+
| - baseResolution: number                                    |
| - targetResolution: number                                  |
+-------------------------------------------------------------+
| + getRotationAngle(): number                                |
| + transformFluxVector(vector: Vector2D): Vector2D           |
+-------------------------------------------------------------+
                               ^
                               |
+-------------------------------------------------------------+
|             Aperture7GridCoordinateTransformer              |
+-------------------------------------------------------------+
| - stepsClassIII: number                                     |
| - rotationRad: number                                       |
+-------------------------------------------------------------+
| + computeRotationAngle(): number                            |
| + projectTensorToResolution(tensor: H3StateTensor): void   |
+-------------------------------------------------------------+
```

### 4.3 Algorithmic Specification

1. **Validation & Preconditions**:
   - Assert $startRes$ and $targetRes$ are integers within $[0, 15]$.
   - If invalid, throw `RangeError` with descriptive message detailing bounds violation.

2. **Step Calculation**:
   - Query `countClassIIIApertureSteps(startRes, targetRes)`.
   - Ensure directional polarity (e.g. upsampling vs. downsampling reflects appropriate positive or negative angular shifts).

3. **Angular Multiplication & Normalization**:
   - $\theta_{\text{raw}} = n_{\text{steps}} \times \text{APERTURE\_7\_ROTATION\_RAD}$
   - If `normalize === true` (default):
     - Wrap angle $\theta$ into $[-\pi, \pi)$ via standard angular modular reduction:
       $$\theta_{\text{norm}} = \theta_{\text{raw}} - 2\pi \left\lfloor \frac{\theta_{\text{raw}} + \pi}{2\pi} \right\rfloor$$
   - Else return raw cumulative angle $\theta_{\text{raw}}$.

---

## 5. Integration with Monads & State Tensors

### 5.1 `SpatialFluxMonad` Integration
`SpatialFluxMonad` encapsulates lateral fluxes across adjacency graphs. When transport occurs across heterogeneous resolution partitions:
```typescript
const rotation = computeClassIIIRotationAngleRadians(sourceCell.resolution, targetCell.resolution);
const alignedFluxVector = rotateVector2D(rawFluxVector, rotation);
```
Energy and mass values undergo orthogonal transformation without magnitude alteration:
$$\|alignedFluxVector\| = \|rawFluxVector\|$$

### 5.2 Test Vectors and Verification
| startRes | targetRes | Expected Steps | Raw Angle (rad) | Normalized Angle (rad) |
|---|---|---|---|---|
| 0 | 0 | 0 | 0.0 | 0.0 |
| 0 | 1 | 1 | 0.333473172 | 0.333473172 |
| 0 | 2 | 1 | 0.333473172 | 0.333473172 |
| 1 | 2 | 0 | 0.0 | 0.0 |
| 0 | 3 | 2 | 0.666946345 | 0.666946345 |
| 3 | 0 | -2 | -0.666946345 | -0.666946345 |

---

## 6. Verification and Acceptance Criteria

1. **Unit Test Suite (`tests/sprint_095.test.ts`)**:
   - Validates identity at zero resolution delta ($r_1 = r_2$).
   - Validates linear scaling of `APERTURE_7_ROTATION_RAD` across arbitrary resolution jumps ($0 \to 7$, $1 \to 5$, $15 \to 0$).
   - Validates antisymmetry: $\Theta(r_1, r_2) = -\Theta(r_2, r_1)$.
   - Verifies angular normalization within $[-\pi, \pi)$.
   - Validates strict out-of-bounds error handling ($r < 0$ or $r > 15$).

2. **Thermodynamic Invariant Audit**:
   - Rotation tensor invariant check: trace and determinant invariance.
   - Zero net mass/energy generation across resolution step transforms.