# RFC-060: Tangent Space Projection for Spherical Advective Vectors on Discrete Geodesic Manifolds

- **RFC ID**: RFC-060
- **Sprint**: 060
- **Author**: Chief Systems Architect
- **Status**: Proposed
- **Target Subsystem**: `src/spatial/h3_adjacency.ts`, `src/spatial/h3_grid.ts`, `src/monads/spatial_monad.ts`
- **Dependencies**: RFC-058 (Adjacency Matrix Formulation), RFC-059 (State Tensor Integration)

---

## 1. Executive Summary & Problem Statement

In the planetary biogeochemical simulation engine, advection fields—including oceanic surface currents, atmospheric tropospheric wind velocities, and biotic migratory fluxes—are represented as three-dimensional Cartesian vector fields $\mathbf{v} \in \mathbb{R}^3$ embedded in the global geocentric coordinate frame. Because the physical planetary surface is modeled as a two-dimensional spherical manifold $S^2 \subset \mathbb{R}^3$ discretized via the discrete H3 hexagonal/pentagonal geodesic grid, physical advective transport of mass and energy must strictly reside within the tangent bundle $TS^2$.

Prior implementations or Cartesian operations across cell centroids can introduce parasitic radial velocity components $\mathbf{v}_\parallel = (\mathbf{v} \cdot \hat{\mathbf{n}})\hat{\mathbf{n}}$ directed along the radial normal vector $\hat{\mathbf{n}} = \mathbf{p}/\|\mathbf{p}\|$ from the planetary origin to the cell centroid $\mathbf{p}$. Unconstrained radial velocity yields severe thermodynamic and numerical instabilities:
1. **First-Law Thermodynamic Violation (Radial Leakage)**: A nonzero radial vector component produces artificial fluxes across the top-of-atmosphere or deep-lithosphere boundaries, violating mass conservation of spatial monad stocks (carbon, fixed nitrogen, water, nutrients).
2. **Interface Divergence Distortion**: In discrete geodesic finite-volume fluxes, radial components distort cross-facet orthogonal directional derivatives, leading to unphysical boundary divergence and local mass accumulation.

This RFC specifies the formal mathematical, thermodynamic, and object-oriented architecture for `projectVectorOntoSphereTangentSpace` within `src/spatial/h3_adjacency.ts`. This function strips radial components along the local position vector and projects arbitrary 3D spatial velocity/flux vectors onto the local tangent plane $T_{\mathbf{p}}S^2$.

---

## 2. Mathematical & Differential Geometric Foundation

### 2.1 Spherical Manifold and Local Normal
Let the planetary surface be represented by a sphere of mean radius $R$ centered at the origin $\mathbf{0} \in \mathbb{R}^3$:
$$S^2 = \{ \mathbf{p} \in \mathbb{R}^3 \mid \|\mathbf{p}\| = R \}$$

For any point $\mathbf{p} = [p_x, p_y, p_z]^T$ on or near the manifold with Euclidean norm $\|\mathbf{p}\| = \sqrt{p_x^2 + p_y^2 + p_z^2} > 0$, the outward unit normal vector $\hat{\mathbf{n}}(\mathbf{p})$ is:
$$\hat{\mathbf{n}}(\mathbf{p}) = \frac{\mathbf{p}}{\|\mathbf{p}\|}$$

### 2.2 Orthogonal Tangent Projection Operator
The tangent space $T_{\mathbf{p}}S^2$ at point $\mathbf{p}$ is the orthogonal complement of the span of $\hat{\mathbf{n}}(\mathbf{p})$:
$$T_{\mathbf{p}}S^2 = \{ \mathbf{w} \in \mathbb{R}^3 \mid \mathbf{w} \cdot \hat{\mathbf{n}}(\mathbf{p}) = 0 \}$$

Given an arbitrary Cartesian vector $\mathbf{v} = [v_x, v_y, v_z]^T \in \mathbb{R}^3$ located at origin point $\mathbf{p}$, the orthogonal projection operator $\mathcal{P}_{T_{\mathbf{p}}S^2}: \mathbb{R}^3 \to T_{\mathbf{p}}S^2$ is defined by:
$$\mathcal{P}_{T_{\mathbf{p}}S^2} = \mathbf{I}_3 - \hat{\mathbf{n}}\hat{\mathbf{n}}^T = \mathbf{I}_3 - \frac{\mathbf{p}\mathbf{p}^T}{\|\mathbf{p}\|^2}$$

Thus, the projected tangential vector $\mathbf{v}_\perp$ is obtained by removing the radial component:
$$\mathbf{v}_\parallel = (\mathbf{v} \cdot \hat{\mathbf{n}})\hat{\mathbf{n}} = \left( \frac{\mathbf{v} \cdot \mathbf{p}}{\|\mathbf{p}\|^2} \right) \mathbf{p}$$
$$\mathbf{v}_\perp = \mathbf{v} - \mathbf{v}_\parallel = \mathbf{v} - \left( \frac{\mathbf{v} \cdot \mathbf{p}}{\|\mathbf{p}\|^2} \right) \mathbf{p}$$

### 2.3 Degeneracy and Regularization
To prevent division-by-zero or numerical instability when $\|\mathbf{p}\| \to 0$ (e.g., origin point passed as a null vector):
- Define an absolute threshold $\epsilon_{\text{singular}} = 10^{-12}$.
- If $\|\mathbf{p}\| < \epsilon_{\text{singular}}$ or $\|\mathbf{v}\| < \epsilon_{\text{singular}}$, return $[0, 0, 0]^T$ or $\mathbf{v}$ with an explicit zero tangent projection.
- Compute dot product $\mathbf{v} \cdot \mathbf{p}$ with compensated summation to avoid catastrophic cancellation when $\mathbf{v}$ is nearly parallel or nearly orthogonal to $\mathbf{p}$.

---

## 3. Thermodynamic Compliance & Conservation Laws

### 3.1 First Law: Conservative Horizontal Flux Formulation
The spatial flux $\mathbf{J}_c$ of stock scalar $c$ (e.g., dissolved organic carbon, atmospheric $\text{CO}_2$, moisture) across hexagonal facet $e_{ij}$ between cells $i$ and $j$ is governed by:
$$\mathbf{J}_c = c \mathbf{v}_\perp - \mathbf{D} \nabla_{\!S^2} c$$

By strictly enforcing $\mathbf{v}_\perp \in T_{\mathbf{p}}S^2$:
$$\hat{\mathbf{n}} \cdot \mathbf{J}_c = 0 \quad \forall \mathbf{p} \in S^2$$

No stock escapes into the vacuum or penetrates the impermeable mantle core:
$$\frac{d}{dt} \int_{S^2} c(\mathbf{p}, t) \, dA = \int_{S^2} \mathcal{S}_c \, dA$$
where $\mathcal{S}_c$ represents metabolic/photochemical source-sink terms powered solely by external solar irradiance $S_0$.

### 3.2 Second Law: Positive-Definite Dissipation
Tangential advection does not generate negative entropy. For numerical dissipation on the sphere, ensuring $\mathbf{v}_\perp \cdot \hat{\mathbf{n}} = 0$ guarantees that artificial numerical dissipation remains confined to horizontal laplacians $\nabla_{S^2}^2$, avoiding unphysical vertical diffusion:
$$\sigma = -\frac{1}{T} \mathbf{J}_q \cdot \frac{\nabla_{\!S^2} T}{T} \ge 0$$

---

## 4. Class Hierarchy & Architectural Design

```
+-------------------------------------------------------------+
|                      Vector3D ([x, y, z])                   |
+-------------------------------------------------------------+
                              ^
                              |
+-------------------------------------------------------------+
|                   H3AdjacencyGraphEngine                    |
+-------------------------------------------------------------+
| + projectVectorOntoSphereTangentSpace(                      |
|       vector: Vector3D,                                     |
|       originPoint: Vector3D                                 |
|   ): Vector3D                                               |
| + computeFacetNormalTangentBasis(                           |
|       originPoint: Vector3D,                                |
|       neighborPoint: Vector3D                               |
|   ): FacetTangentBasis                                      |
+-------------------------------------------------------------+
                              ^
                              | composes
+-------------------------------------------------------------+
|                        SpatialMonad                         |
+-------------------------------------------------------------+
| - cellPositions: Map<H3Index, Vector3D>                     |
| - velocityField: Map<H3Index, Vector3D>                     |
| + stepAdvection(dt: number): SpatialMonad                   |
+-------------------------------------------------------------+
```

### 4.1 Interface Contracts

```typescript
/**
 * Represents a 3D Cartesian vector tuple [x, y, z] in meters or normalized units.
 */
export type Vector3D = [number, number, number];

/**
 * Tangent projection options and diagnostic metrics.
 */
export interface TangentProjectionResult {
  readonly projected: Vector3D;
  readonly radialComponent: Vector3D;
  readonly radialMagnitude: number;
  readonly tangentialMagnitude: number;
  readonly orthogonalCheck: number; // Dot product (projected . normal) ~= 0
}

/**
 * Functional export and engine method in src/spatial/h3_adjacency.ts
 */
export function projectVectorOntoSphereTangentSpace(
  vector: Vector3D,
  originPoint: Vector3D,
  tolerance?: number
): Vector3D;
```

---

## 5. Detailed Algorithmic Specification

### 5.1 Function: `projectVectorOntoSphereTangentSpace`
1. **Input**:
   - `vector: Vector3D` $\mathbf{v} = [v_x, v_y, v_z]$
   - `originPoint: Vector3D` $\mathbf{p} = [p_x, p_y, p_z]$
   - `tolerance: number = 1e-12`
2. **Norm Calculation**:
   $$r^2 = p_x^2 + p_y^2 + p_z^2$$
   If $r^2 < \text{tolerance}^2$, the origin is degenerate. Return $[0, 0, 0]$ (or unchanged vector with warning if configured).
3. **Radial Component Scale**:
   $$s = \frac{\mathbf{v} \cdot \mathbf{p}}{r^2} = \frac{v_x p_x + v_y p_y + v_z p_z}{p_x^2 + p_y^2 + p_z^2}$$
4. **Tangential Projection**:
   $$w_x = v_x - s \cdot p_x$$
   $$w_y = v_y - s \cdot p_y$$
   $$w_z = v_z - s \cdot p_z$$
5. **Orthogonality Invariant Check**:
   In debug/audit mode, ensure $|\mathbf{w} \cdot \mathbf{p}| / (\|\mathbf{w}\| \cdot \|\mathbf{p}\| + \epsilon) < 10^{-7}$.
6. **Output**: Return $[w_x, w_y, w_z]$.

---

## 6. Incremental Integration with Existing Codebase

1. **`src/spatial/h3_adjacency.ts`**:
   - Introduce `projectVectorOntoSphereTangentSpace` alongside existing topological adjacency functions (`getHexNeighbors`, `computeGeodesicDistance`).
   - Export helper `projectVectorOntoSphereTangentSpaceDetailed` for analytical audit tests.
2. **`src/spatial/h3_grid.ts`**:
   - Leverage `projectVectorOntoSphereTangentSpace` in `H3Grid.computeHorizontalFluxes` to filter raw momentum forces before finite-volume state tensor advection.
3. **`src/monads/spatial_monad.ts`**:
   - Guarantee that state transition operators apply tangential projection before redistributing carbon, nitrogen, and energy between neighbor cells.

---

## 7. Verification & Acceptance Criteria

1. **Pure Tangent Invariance**:
   - For any test vector $\mathbf{v}$ already perpendicular to $\mathbf{p}$ ($\mathbf{v} \cdot \mathbf{p} = 0$), $\mathcal{P}_{T_{\mathbf{p}}S^2}(\mathbf{v}) \equiv \mathbf{v}$.
2. **Pure Radial Cancellation**:
   - For any radial vector $\mathbf{v} = \lambda \mathbf{p}$, $\mathcal{P}_{T_{\mathbf{p}}S^2}(\mathbf{v}) \equiv [0, 0, 0]$.
3. **General Decomposition Identity**:
   - For an arbitrary vector $\mathbf{v} = \mathbf{v}_\perp + \mathbf{v}_\parallel$, the projection equals $\mathbf{v}_\perp$ with $\|\mathbf{v}_\perp\|^2 + \|\mathbf{v}_\parallel\|^2 = \|\mathbf{v}\|^2 \pm 10^{-10}$.
4. **Equatorial & Polar Consistency**:
   - Tested on high-latitude polar cells (e.g., North pole $\mathbf{p} = [0, 0, R]$) and equatorial cells (e.g., $\mathbf{p} = [R, 0, 0]$), ensuring horizontal velocities project into exact local $(x, y)$ or $(y, z)$ planes.
5. **Matter Conservation Test**:
   - In 1000-cycle advection test on `SpatialMonad`, total mass stock drift is exactly $0.000000\%$ within IEEE-754 double precision limits.