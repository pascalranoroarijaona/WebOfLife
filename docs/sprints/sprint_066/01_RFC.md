# RFC-066: 3D Spherical Boundary Outward Normal Vector Computation (`computeBoundaryOutwardNormal3D`)

- **Author**: Chief Systems Architect
- **Status**: Proposed
- **Date**: 2025-05-18
- **Sprint**: sprint_066
- **Target File**: `src/spatial/h3_adjacency.ts`
- **Related Modules**: `src/spatial/h3_grid.ts`, `src/spatial/h3_types.ts`, `src/monads/spatial_monad.ts`

---

## 1. Executive Summary & Sprint Goal

### Sprint Goal
Implement `computeBoundaryOutwardNormal3D` combining midpoint horizontal normal with centroid displacement direction in `src/spatial/h3_adjacency.ts`.

### Architectural Objective
In discrete global grid systems (DGGS) on a spherical manifold, evaluating lateral fluxes (e.g., shallow water fluid momentum, atmospheric moisture transport, and trophic biomass migration) across the facet between two adjacent hexagonal/pentagonal cells $\Omega_i$ and $\Omega_j$ requires a well-conditioned 3D outward unit normal $\hat{\mathbf{n}}_{ij}$. 

On a curved sphere, boundary edges between adjacent H3 cells are spherical arcs. Relying solely on the chord tangent midpoint normal can produce numerical instabilities or inconsistencies if cell boundaries exhibit geodesic curvature or slight skewness. Conversely, relying solely on centroid-to-centroid displacement $\mathbf{c}_j - \mathbf{c}_i$ ignores the precise orientation of the shared boundary arc segment $\mathbf{v}_a \to \mathbf{v}_b$.

Sprint 066 introduces `computeBoundaryOutwardNormal3D(originCentroid, neighborCentroid, edgeVertexA, edgeVertexB, blendAlpha)`, an exact, anti-symmetric, tangent-plane-projected normal vector synthesis function in `src/spatial/h3_adjacency.ts`. This combines:
1. **The midpoint horizontal normal** $\hat{\mathbf{n}}_{\text{mid}}$: Derived from the cross-product of the edge geodesic vector and the outward radial unit vector at the edge midpoint.
2. **The centroid displacement direction** $\hat{\mathbf{u}}_{\text{disp}}$: The normalized vector connecting origin centroid $\mathbf{c}_i$ to neighbor centroid $\mathbf{c}_j$, projected onto the edge midpoint tangent plane.
3. **Harmonic / Linear Blending & Outward Sign Enforcement**: A convex combination parameter $\alpha \in [0, 1]$ (defaulting to balanced FVM geodesic weighting) with strict orientation verification $\hat{\mathbf{n}}_{ij} \cdot (\mathbf{c}_j - \mathbf{c}_i) > 0$ and boundary anti-symmetry $\hat{\mathbf{n}}_{ji} = -\hat{\mathbf{n}}_{ij}$.

---

## 2. Mathematical & Physical Foundations

### 2.1 Coordinate Definitions & Geometric Vectors
Let the Earth be represented as a sphere $\mathbb{S}^2 \subset \mathbb{R}^3$ with radius $R$ centered at the origin $(0, 0, 0)$.
For two topological neighbors on the H3 grid, cell $i$ and cell $j$:
- Centroids: $\mathbf{c}_i, \mathbf{c}_j \in \mathbb{R}^3$, where $\|\mathbf{c}_i\| = \|\mathbf{c}_j\| = R$.
- Shared boundary edge endpoints: $\mathbf{v}_a, \mathbf{v}_b \in \mathbb{R}^3$, where $\|\mathbf{v}_a\| = \|\mathbf{v}_b\| = R$.
- Edge midpoint on chord: $\mathbf{m}_{\text{chord}} = \frac{\mathbf{v}_a + \mathbf{v}_b}{2}$.
- Edge spherical surface midpoint:
  $$\mathbf{m} = R \frac{\mathbf{m}_{\text{chord}}}{\|\mathbf{m}_{\text{chord}}\|}$$
- Radial outward unit normal at the interface midpoint:
  $$\hat{\mathbf{r}} = \frac{\mathbf{m}}{\|\mathbf{m}\|}$$

### 2.2 Midpoint Horizontal Normal Vector
The directed edge segment on the sphere between vertices $\mathbf{v}_a$ and $\mathbf{v}_b$ is:
$$\mathbf{t}_{\text{edge}} = \mathbf{v}_b - \mathbf{v}_a$$

The horizontal normal perpendicular to the boundary arc and tangent to the sphere at $\mathbf{m}$ is defined via the Euclidean cross product:
$$\mathbf{n}_{\text{cross}} = \mathbf{t}_{\text{edge}} \times \hat{\mathbf{r}}$$

Normalizing to unit length:
$$\hat{\mathbf{n}}_{\text{edge}} = \frac{\mathbf{n}_{\text{cross}}}{\|\mathbf{n}_{\text{cross}}\|}$$

We enforce outward orientation relative to cell $i$ directed toward cell $j$:
$$\hat{\mathbf{n}}_{\text{mid}} = \operatorname{sgn}\left(\hat{\mathbf{n}}_{\text{edge}} \cdot (\mathbf{c}_j - \mathbf{c}_i)\right) \hat{\mathbf{n}}_{\text{edge}}$$

### 2.3 Tangent-Projected Centroid Displacement
The centroid displacement vector is:
$$\mathbf{d}_{ij} = \mathbf{c}_j - \mathbf{c}_i$$

To ensure that the displacement lies strictly in the local tangent plane $T_{\mathbf{m}}\mathbb{S}^2$ at boundary midpoint $\mathbf{m}$, we project $\mathbf{d}_{ij}$ orthogonally to $\hat{\mathbf{r}}$:
$$\mathbf{d}_{\text{tan}} = \mathbf{d}_{ij} - (\mathbf{d}_{ij} \cdot \hat{\mathbf{r}})\hat{\mathbf{r}}$$
$$\hat{\mathbf{u}}_{\text{disp}} = \frac{\mathbf{d}_{\text{tan}}}{\|\mathbf{d}_{\text{tan}}\|}$$

### 2.4 Vector Blending and Outward Normal Construction
Given a blending coefficient $\alpha \in [0, 1]$ (where $\alpha = 0.5$ balances the facet geometric perpendicular with the centroid transport axis):
$$\mathbf{n}_{\text{blend}} = (1 - \alpha)\,\hat{\mathbf{n}}_{\text{mid}} + \alpha\,\hat{\mathbf{u}}_{\text{disp}}$$

We re-project onto the tangent plane $T_{\mathbf{m}}\mathbb{S}^2$ to eliminate any out-of-plane perturbation:
$$\mathbf{n}_{\text{tan}} = \mathbf{n}_{\text{blend}} - (\mathbf{n}_{\text{blend}} \cdot \hat{\mathbf{r}})\hat{\mathbf{r}}$$

And normalize to unit magnitude:
$$\hat{\mathbf{n}}_{ij} = \frac{\mathbf{n}_{\text{tan}}}{\|\mathbf{n}_{\text{tan}}\|}$$

We assert:
1. $\hat{\mathbf{n}}_{ij} \cdot \hat{\mathbf{r}} = 0$ (exact horizontality / sphere tangency).
2. $\hat{\mathbf{n}}_{ij} \cdot \mathbf{d}_{ij} > 0$ (strict outward orientation from cell $i$ to cell $j$).
3. Anti-symmetry: When evaluated with arguments swapped $(\mathbf{c}_j, \mathbf{c}_i, \mathbf{v}_b, \mathbf{v}_a)$, $\hat{\mathbf{n}}_{ji} = -\hat{\mathbf{n}}_{ij}$.

---

## 3. Thermodynamic Compliance (First and Second Laws)

1. **First Law (Exact Conservative Flux Cancellation)**:
   For any conservative scalar or vector field $\Phi$ (water mass, sensible heat, atmospheric carbon), the finite volume boundary flux across edge $e_{ij}$ is:
   $$F_{ij} = \Phi_{\text{face}} (\mathbf{u} \cdot \hat{\mathbf{n}}_{ij}) L_{ij}$$
   Because $\hat{\mathbf{n}}_{ji} = -\hat{\mathbf{n}}_{ij}$ and $L_{ij} = L_{ji}$, we guarantee $F_{ij} = -F_{ji}$. Hence:
   $$\sum_{i} \sum_{j \in \mathcal{N}(i)} F_{ij} \equiv 0$$
   Matter and energy are strictly conserved across grid cell boundaries without artificial sources or sinks.

2. **Second Law (Entropy Non-Decrease)**:
   Diffusion fluxes parameterized as $\mathbf{J}_{ij} = -D \nabla \Phi \approx -D \frac{\Phi_j - \Phi_i}{\|\mathbf{d}_{ij}\|} \hat{\mathbf{n}}_{ij}$ satisfy:
   $$\dot{S}_{\text{interface}} = (\Phi_i - \Phi_j) F_{ij} \ge 0$$
   A consistent, strictly acute outward normal ($\hat{\mathbf{n}}_{ij} \cdot \mathbf{d}_{ij} > 0$) prevents sign inversions that would otherwise violate non-negative entropy generation.

---

## 4. Class & Interface Contracts

### 4.1 Interface Additions in `src/spatial/h3_adjacency.ts`

```typescript
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundaryNormal3DOptions {
  /**
   * Blending factor between midpoint horizontal normal (0.0)
   * and centroid displacement direction (1.0).
   * Default: 0.5 (balanced FVM geodesic normal).
   */
  blendAlpha?: number;
  /**
   * Planetary radius in meters, defaulting to WGS84 / Earth mean radius (6,371,008.8 m).
   */
  earthRadius?: number;
}

export interface BoundaryNormal3DResult {
  /** Unit outward normal vector tangent to the sphere at interface midpoint */
  normal: Vector3D;
  /** Geodesic interface midpoint in 3D Cartesian coordinates */
  midpoint: Vector3D;
  /** Chord-tangent midpoint horizontal normal prior to blending */
  midpointNormal: Vector3D;
  /** Projected centroid displacement unit vector */
  displacementNormal: Vector3D;
  /** Cosine angle between blended normal and centroid displacement vector */
  alignmentCos: number;
}
```

### 4.2 Function Signatures

```typescript
/**
 * Computes the 3D outward unit normal vector across a boundary interface
 * between two adjacent cells on a spherical planetary manifold, combining
 * the edge midpoint horizontal normal with the centroid displacement direction.
 *
 * @param originCentroid 3D Cartesian coordinates of origin cell centroid c_i
 * @param neighborCentroid 3D Cartesian coordinates of neighbor cell centroid c_j
 * @param edgeVertexA 3D Cartesian coordinates of boundary segment start vertex v_a
 * @param edgeVertexB 3D Cartesian coordinates of boundary segment end vertex v_b
 * @param options Optional blending factor (alpha in [0, 1]) and earth radius
 * @returns BoundaryNormal3DResult with normalized unit vectors and diagnostics
 */
export function computeBoundaryOutwardNormal3D(
  originCentroid: Vector3D,
  neighborCentroid: Vector3D,
  edgeVertexA: Vector3D,
  edgeVertexB: Vector3D,
  options?: BoundaryNormal3DOptions
): BoundaryNormal3DResult;
```

---

## 5. Architectural Implementation Plan

### Step 1: Vector Utilities in `src/spatial/h3_adjacency.ts`
Introduce robust, zero-allocation/lightweight vector math helpers if not already exported:
- `vec3Dot(a: Vector3D, b: Vector3D): number`
- `vec3Cross(a: Vector3D, b: Vector3D): Vector3D`
- `vec3Norm(a: Vector3D): number`
- `vec3Normalize(a: Vector3D): Vector3D`
- `vec3Scale(a: Vector3D, s: number): Vector3D`
- `vec3Add(a: Vector3D, b: Vector3D): Vector3D`
- `vec3Sub(a: Vector3D, b: Vector3D): Vector3D`

### Step 2: Implementation of `computeBoundaryOutwardNormal3D`
1. Validate inputs: Non-zero distance between centroids, non-coincident vertices.
2. Compute spherical midpoint $\mathbf{m}$ by averaging edge vertices $\mathbf{v}_a, \mathbf{v}_b$ and projecting onto the radius sphere.
3. Compute outward radial unit vector $\hat{\mathbf{r}} = \mathbf{m} / \|\mathbf{m}\|$.
4. Compute edge tangent $\mathbf{t} = \mathbf{v}_b - \mathbf{v}_a$.
5. Calculate horizontal normal $\mathbf{n}_{\text{mid}} = (\mathbf{t} \times \hat{\mathbf{r}})$, normalize, and ensure $(\mathbf{n}_{\text{mid}} \cdot (\mathbf{c}_j - \mathbf{c}_i)) > 0$.
6. Calculate centroid displacement $\mathbf{d} = \mathbf{c}_j - \mathbf{c}_i$, project onto tangent plane orthogonal to $\hat{\mathbf{r}}$, and normalize to form $\hat{\mathbf{u}}_{\text{disp}}$.
7. Blend with parameter $\alpha$ (clamped to $[0, 1]$, default $0.5$):
   $$\mathbf{n}_{\text{blend}} = (1 - \alpha)\hat{\mathbf{n}}_{\text{mid}} + \alpha \hat{\mathbf{u}}_{\text{disp}}$$
8. Project $\mathbf{n}_{\text{blend}}$ onto tangent plane to guarantee orthogonality with $\hat{\mathbf{r}}$, normalize to unit vector $\hat{\mathbf{n}}_{ij}$.
9. Verify anti-symmetry and alignment constraint $\hat{\mathbf{n}}_{ij} \cdot \mathbf{d} > 0$.
10. Return detailed `BoundaryNormal3DResult`.

### Step 3: Integration with Adjacency Interfaces
Export the function and types from `src/spatial/h3_adjacency.ts` and ensure clean re-exports for spatial flux solvers.

---

## 6. Verification and Test Strategy

Unit tests in `tests/sprint_066.test.ts` will verify:
1. **Equatorial & Polar Edge Geometry**:
   - Verify boundary between two equatorial cells yields pure longitudinal normal.
   - Verify boundary between polar/subpolar cells yields tangent vector orthogonal to radial vector.
2. **Radial Orthogonality**:
   - Dot product $\hat{\mathbf{n}}_{ij} \cdot \hat{\mathbf{r}} < 10^{-12}$ across all test cases.
3. **Outward Orientation**:
   - $\hat{\mathbf{n}}_{ij} \cdot (\mathbf{c}_j - \mathbf{c}_i) > 0$.
4. **Anti-Symmetry (Flux Conservation)**:
   - For any pair $(i, j)$ and edge endpoints $(\mathbf{v}_a, \mathbf{v}_b)$:
     $$\hat{\mathbf{n}}_{ij} + \hat{\mathbf{n}}_{ji} = \mathbf{0} \quad (\text{tolerance } < 10^{-12})$$
5. **Alpha Sensitivity**:
   - $\alpha = 0.0$ matches pure midpoint normal.
   - $\alpha = 1.0$ matches pure projected centroid displacement.
   - $\alpha = 0.5$ yields balanced bisector normal.
6. **Degeneracy and Robustness**:
   - Handling of near-collinear configurations with fallback normalization.

---

## 7. Migration & Compatibility Notice
- **Zero Breaking Changes**: Existing adjacency graph traversal and metric calculations remain backward-compatible.
- **Performance**: The computation uses direct Cartesian arithmetic without trigonometric evaluations, ensuring sub-microsecond evaluation suitable for large-scale planetary grids ($>10^5$ edges).