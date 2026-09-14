# RFC-062: Boundary Segment Radial Normal 3D Unit Vector Computation

## 1. Metadata
- **RFC ID**: RFC-062
- **Title**: Normalized Radial Midpoint Unit Vector for Boundary Segments (`computeBoundarySegmentRadialNormal3D`)
- **Author**: Chief Systems Architect
- **Sprint**: 062
- **Status**: Proposed / Approved for Implementation
- **Target Component**: `src/spatial/h3_adjacency.ts`
- **Dependencies**: `src/spatial/h3_types.ts`, `src/thermodynamics/constants.ts`

---

## 2. Executive Summary

In spherical discrete global grid systems (DGGS) such as H3, hexagonal and pentagonal cell boundaries are defined by great-circle arcs or chord segments between boundary vertices in $\mathbb{R}^3$. Accurate physical simulation of atmospheric, oceanic, and biological fluxes across these boundaries requires an orthogonal local reference triad $(\hat{\mathbf{t}}, \hat{\mathbf{n}}_{\text{lat}}, \hat{\mathbf{n}}_{\text{rad}})$ at each inter-cell facet:
1. Tangent unit vector along the boundary edge ($\hat{\mathbf{t}}$).
2. Lateral normal unit vector tangent to the sphere pointing across the boundary facet ($\hat{\mathbf{n}}_{\text{lat}}$).
3. Radial outward unit vector originating at the planetary geocenter and passing through the boundary segment midpoint ($\hat{\mathbf{n}}_{\text{rad}}$).

This RFC formalizes and specifies the implementation of `computeBoundarySegmentRadialNormal3D` in `src/spatial/h3_adjacency.ts`. The function accepts boundary vertex coordinate pairs (or boundary segment structures) in 3D Cartesian coordinates, computes the unscaled midpoint vector $\mathbf{m} = \frac{1}{2}(\mathbf{v}_1 + \mathbf{v}_2)$, and normalizes it to produce a pristine unit vector $\hat{\mathbf{n}}_{\text{rad}} \in \mathbb{S}^2$ with strict zero-norm singularity handling and floating-point stability guarantees.

---

## 3. Motivation & Mathematical Formulation

### 3.1 Geometric Orthonormal Facet Frame
When modeling thermodynamic transport across cell boundaries (e.g., advection, lateral diffusion, and surface shear stress), fluxes defined in local spherical coordinates must be projected onto boundary interfaces.

Given two vertices $\mathbf{v}_1, \mathbf{v}_2 \in \mathbb{R}^3$ on or near the planetary reference sphere of radius $R$:
$$\mathbf{m} = \frac{\mathbf{v}_1 + \mathbf{v}_2}{2}$$

The radial midpoint vector $\mathbf{m}$ points directly outward from the geocenter $(0, 0, 0)^T$ through the midpoint of the boundary segment chord. The normalized radial normal unit vector $\hat{\mathbf{n}}_{\text{rad}}$ is defined as:
$$\hat{\mathbf{n}}_{\text{rad}} = \frac{\mathbf{m}}{\|\mathbf{m}\|_2} = \frac{\mathbf{v}_1 + \mathbf{v}_2}{\|\mathbf{v}_1 + \mathbf{v}_2\|_2}$$
where $\|\mathbf{u}\|_2 = \sqrt{u_x^2 + u_y^2 + u_z^2}$.

### 3.2 Degeneracy and Singularity Guard
In degenerate scenarios (e.g., antipodal vertices $\mathbf{v}_1 = -\mathbf{v}_2$ or coincident vertices at the origin $\mathbf{v}_1 = \mathbf{v}_2 = \mathbf{0}$):
$$\|\mathbf{v}_1 + \mathbf{v}_2\|_2 < \epsilon \quad (\epsilon = 10^{-12})$$
Under this condition, division by zero is strictly avoided. The algorithm defaults safely to a fallback zenith unit vector $[0, 0, 1]^T$ or throws a deterministic descriptive domain error depending on strictness flags, preserving numerical integrity without IEEE-754 `NaN` or `Infinity` contamination.

### 3.3 Thermodynamic Invariance
The radial normal unit vector represents an invariant spatial reference direction. Because geometric calculations perform pure coordinate transformations and do not alter state tensors, they preserve enthalpy, mass, and momentum:
$$\Delta M = 0, \quad \Delta U = 0, \quad \Delta S_{\text{universe}} \ge 0$$
This satisfies both the First and Second Laws of Thermodynamics.

---

## 4. Interface Specification & Technical Design

### 4.1 Interface Signatures in `src/spatial/h3_adjacency.ts`

```typescript
import { Vector3D } from './h3_types';

/**
 * Interface representing a 3D boundary segment formed by two endpoints.
 */
export interface BoundarySegment3D {
  readonly v1: Vector3D;
  readonly v2: Vector3D;
}

/**
 * Computes the normalized 3D radial midpoint unit vector for a given boundary segment.
 * 
 * For segment endpoints v1 and v2, the radial normal is the normalized outward vector
 * from the planetary origin through the segment midpoint (v1 + v2) / 2.
 *
 * @param segment - The boundary segment with endpoints v1 and v2 in Cartesian coordinates.
 * @param epsilon - Threshold below which midpoint norm is considered degenerate (default: 1e-12).
 * @returns Normalized radial normal unit vector [x, y, z].
 */
export function computeBoundarySegmentRadialNormal3D(
  segment: BoundarySegment3D,
  epsilon?: number
): Vector3D;

/**
 * Computes the normalized 3D radial midpoint unit vector from explicit endpoint vectors.
 *
 * @param v1 - First endpoint of boundary segment.
 * @param v2 - Second endpoint of boundary segment.
 * @param epsilon - Threshold below which midpoint norm is considered degenerate (default: 1e-12).
 * @returns Normalized radial normal unit vector [x, y, z].
 */
export function computeBoundarySegmentRadialNormal3DFromPoints(
  v1: Vector3D,
  v2: Vector3D,
  epsilon?: number
): Vector3D;
```

### 4.2 Algorithmic Steps
1. Extract Cartesian coordinates: $(x_1, y_1, z_1)$ and $(x_2, y_2, z_2)$.
2. Compute sum components:
   $$x_{\text{sum}} = x_1 + x_2$$
   $$y_{\text{sum}} = y_1 + y_2$$
   $$z_{\text{sum}} = z_1 + z_2$$
3. Compute Euclidean norm magnitude:
   $$r = \sqrt{x_{\text{sum}}^2 + y_{\text{sum}}^2 + z_{\text{sum}}^2}$$
4. Validate $r > \epsilon$:
   - If valid, return $\left[ \frac{x_{\text{sum}}}{r}, \frac{y_{\text{sum}}}{r}, \frac{z_{\text{sum}}}{r} \right]$.
   - If $r \le \epsilon$, return normalized fallback $[0, 0, 1]^T$ (or throw `GeometricSingularityError` in strict mode).
5. Ensure returned vector satisfies $\|\hat{\mathbf{n}}_{\text{rad}}\|_2 = 1.0 \pm 10^{-15}$.

---

## 5. Architectural Integration & Class Hierarchy

```
+-------------------------------------------------------------+
|                     Vector3D / Math3D                       |
+-------------------------------------------------------------+
                              ^
                              |
+-------------------------------------------------------------+
|                   src/spatial/h3_types.ts                   |
|  - BoundarySegment3D                                        |
|  - DirectedEdge3D                                           |
+-------------------------------------------------------------+
                              ^
                              |
+-------------------------------------------------------------+
|                 src/spatial/h3_adjacency.ts                 |
|  - computeBoundarySegment3D()                               |
|  - computeBoundarySegmentMidpoint3D()                       |
|  - computeBoundarySegmentTangent3D()                        |
|  - computeBoundarySegmentRadialNormal3D() [NEW]             |
|  - computeBoundarySegmentLateralNormal3D()                  |
+-------------------------------------------------------------+
                              ^
                              |
+-------------------------------------------------------------+
|             Atmospheric & Oceanic Transport Kernels         |
|  - Monad Flux Tensor Projections                            |
|  - Conservative Mass/Heat Finite Volume Formulations        |
+-------------------------------------------------------------+
```

---

## 6. Thermodynamic and Numerical Guardrails

1. **Matter & Energy Neutrality**: The function is a pure geometric transformation. It has zero side effects and does not synthesize or consume mass, energy, or momentum.
2. **Idempotence and Precision**: For any scale factor $\alpha > 0$, `computeBoundarySegmentRadialNormal3D({ v1: α * v1, v2: α * v2 })` yields the identical radial unit vector within floating-point tolerance ($10^{-14}$).
3. **Orthogonality Relations**: The computed radial normal $\hat{\mathbf{n}}_{\text{rad}}$ is orthogonal to the boundary tangent $\hat{\mathbf{t}}$ when evaluated on a spherical shell where $\|\mathbf{v}_1\| = \|\mathbf{v}_2\|$, satisfying:
   $$\hat{\mathbf{t}} \cdot \hat{\mathbf{n}}_{\text{rad}} = 0 \quad (\pm 10^{-12})$$

---

## 7. Verification and Testing Plan

- **Equatorial Test**: Segments along the equator ($z = 0$) must produce radial normals with $z = 0$ and $x^2 + y^2 = 1$.
- **Polar Test**: Segments encircling the polar cap must yield radial normals pointing toward the respective hemisphere ($z > 0$ or $z < 0$).
- **Normalization Invariance**: Norm of output must be within $[1.0 - 10^{-12}, 1.0 + 10^{-12}]$.
- **Degeneracy Handling**: Antipodal endpoints must trigger the configured epsilon guard without throwing unhandled exceptions.
- **Regression Suite**: Must pass all existing test suites (`tests/sprint_*.test.ts`) and add dedicated coverage in `tests/sprint_062.test.ts`.