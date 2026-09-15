# RFC-070: Angular Tolerance Comparison for 3D Cartesian Unit Vectors in H3 Adjacency

- **Sprint:** Sprint 070
- **Author:** Chief Systems Architect
- **Status:** Proposed
- **Target File:** `src/spatial/h3_adjacency.ts`
- **Related Files:** `src/spatial/h3_grid.ts`, `src/spatial/h3_types.ts`, `src/spatial/spatial_flux_monad.ts`

---

## 1. Executive Summary & Sprint Goal

### 1.1 Sprint Goal
Implement `areCartesianUnitVectorsEqual3D` testing angular tolerance $\epsilon$ between two Cartesian vectors in `src/spatial/h3_adjacency.ts`.

### 1.2 Motivation & Context
Discrete Global Grid Systems (DGGS), specifically icosahedral H3 hex-dominant geodesic grids, project spherical coordinates $(\lambda, \phi) \in \mathbb{S}^2$ into 3D Cartesian unit vectors $\mathbf{v} = (x, y, z) \in \mathbb{R}^3$ where $\|\mathbf{v}\|_2 = 1$. When identifying shared polygon vertices, adjacency boundaries, directed edges, and normal vectors for spatial flux routing, direct floating-point equality (`v1.x === v2.x`) fails due to trigonometric inaccuracies and non-associative IEEE 754 floating-point operations.

Existing vertex deduplication and edge traversal mechanisms require a robust, numerically stable comparator that measures the angular distance between two unit vectors against an allowable angular tolerance $\epsilon$ (expressed in radians). Implementing `areCartesianUnitVectorsEqual3D` resolves vertex aliasing, eliminates boundary tears during spatial advection, and prevents spurious mass/energy leaks across hexagonal partitions.

---

## 2. Mathematical & Geometric Specification

### 2.1 Cartesian Representation on $\mathbb{S}^2$
A point on the unit sphere $\mathbb{S}^2$ is expressed in Cartesian coordinates:
$$\mathbf{v} = \begin{bmatrix} x \\ y \\ z \end{bmatrix}, \quad x^2 + y^2 + z^2 = 1$$

Given two Cartesian unit vectors $\mathbf{u}, \mathbf{w} \in \mathbb{R}^3$, the angular separation $\theta \in [0, \pi]$ between them is defined by the inner product:
$$\cos \theta = \frac{\mathbf{u} \cdot \mathbf{w}}{\|\mathbf{u}\| \|\mathbf{w}\|}$$
When $\mathbf{u}$ and $\mathbf{w}$ are normalized unit vectors ($\|\mathbf{u}\| \approx 1, \|\mathbf{w}\| \approx 1$):
$$\cos \theta = \mathbf{u} \cdot \mathbf{w} = u_x w_x + u_y w_y + u_z w_z$$

### 2.2 Numerical Stability & Clamping
Due to floating-point drift, $|\mathbf{u} \cdot \mathbf{w}|$ may slightly exceed $1.0$ (e.g., $1.0000000000000002$), which produces `NaN` if passed directly into $\arccos$.
Thus, the inner product must be clamped:
$$\sigma(\mathbf{u}, \mathbf{w}) = \operatorname{clamp}(\mathbf{u} \cdot \mathbf{w}, -1.0, 1.0)$$

### 2.3 Angular Tolerance Metric
Two unit vectors $\mathbf{u}$ and $\mathbf{w}$ are defined as equal within angular tolerance $\epsilon \ge 0$ if and only if:
$$\theta = \arccos(\sigma(\mathbf{u}, \mathbf{w})) \le \epsilon$$

Equivalently, for small $\epsilon$ ($0 \le \epsilon < \frac{\pi}{2}$), avoiding costly $\arccos$ calls can be achieved via:
$$\cos \theta \ge \cos \epsilon$$
However, to preserve strict metric fidelity across all possible angular tolerances $\epsilon \in [0, \pi]$ (including antipodal detection where $\epsilon \approx \pi$), the primary canonical metric uses the clamped arc-cosine:
$$\theta(\mathbf{u}, \mathbf{w}) = \arccos\left(\max\left(-1, \min\left(1, u_x w_x + u_y w_y + u_z w_z\right)\right)\right)$$
$$\operatorname{areCartesianUnitVectorsEqual3D}(\mathbf{u}, \mathbf{w}, \epsilon) \iff \theta(\mathbf{u}, \mathbf{w}) \le \epsilon$$

### 2.4 Default Tolerance
The default tolerance is established as:
$$\epsilon_{\text{default}} = 1.0 \times 10^{-9} \text{ radians} \quad (\approx 6.37 \text{ mm on Earth's surface})$$
This value safely accommodates round-off errors from geodesic projection while cleanly separating adjacent H3 vertices at resolution level 15 ($\sim 1 \text{ m}$ spacing).

---

## 3. Architecture & Class Hierarchy Additions

### 3.1 Incremental Design Strategy
The Web of Life codebase follows an object-oriented, additive paradigm. Existing types in `src/spatial/h3_types.ts` and functions in `src/spatial/h3_adjacency.ts` are preserved. The comparator function `areCartesianUnitVectorsEqual3D` is introduced as an exported standalone utility and integrated into adjacency classes.

```
       +-----------------------------------------------------+
       |               src/spatial/h3_types.ts               |
       |  - Cartesian3D { x: number, y: number, z: number }  |
       +-----------------------------------------------------+
                                 |
                                 v
       +-----------------------------------------------------+
       |             src/spatial/h3_adjacency.ts             |
       |  + areCartesianUnitVectorsEqual3D(v1, v2, eps)      |
       |  + H3AdjacencyService                               |
       |  + H3CellBoundaryIndex                              |
       +-----------------------------------------------------+
                                 |
                                 v
       +-----------------------------------------------------+
       |           src/spatial/spatial_flux_monad.ts         |
       |  - Validates contiguous boundary facets             |
       |  - Enforces divergence-free advection               |
       +-----------------------------------------------------+
```

### 3.2 Type Contract
In `src/spatial/h3_types.ts` or directly within `src/spatial/h3_adjacency.ts`:
```typescript
export interface CartesianVector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}
```

### 3.3 Function Contract
```typescript
/**
 * Tests whether two 3D Cartesian unit vectors are equal within a specified angular tolerance epsilon.
 * Assumes vectors are normalized or normalizes them if magnitude deviates from unity.
 * 
 * @param v1 - The first 3D Cartesian vector.
 * @param v2 - The second 3D Cartesian vector.
 * @param epsilon - Angular tolerance in radians (defaults to 1e-9). Must be non-negative.
 * @returns True if the angular separation theta <= epsilon, false otherwise.
 */
export function areCartesianUnitVectorsEqual3D(
  v1: CartesianVector3D,
  v2: CartesianVector3D,
  epsilon: number = 1e-9
): boolean;
```

### 3.4 Vector Normalization Guard
If either input vector deviates significantly from unit length ($|\|\mathbf{v}\|^2 - 1| > 10^{-6}$), the comparator normalizes the vector prior to the dot product calculation:
$$\hat{\mathbf{v}} = \frac{\mathbf{v}}{\|\mathbf{v}\|_2}$$
This ensures robustness even when consuming raw unnormalized coordinates from vertex subdivision pipelines.

---

## 4. Thermodynamic & Physical Invariance Compliance

### 4.1 First Law of Thermodynamics (Matter & Energy Conservation)
Spatial advection of mass (carbon, nitrogen, water, phosphorus) across H3 cell edges relies on matching boundary vertex segments between neighboring hexagonal cells. 
- If two shared vertices fail equality due to floating-point noise, the shared interface facet is severed, resulting in orphaned boundary flux.
- If two distinct vertices are erroneously merged due to overly coarse $\epsilon$, flux is erroneously diverted.
- By providing exact, deterministic angular comparison with controlled $\epsilon = 10^{-9}\text{ rad}$, boundary facets match symmetrically:
$$\text{Area}(\mathcal{F}_{ij}) = \text{Area}(\mathcal{F}_{ji})$$
$$\Phi_{i \to j}^{\text{mass}} + \Phi_{j \to i}^{\text{mass}} = 0$$
Matter is strictly conserved across all discrete cell interfaces.

### 4.2 Second Law of Thermodynamics (Entropy Production)
Boundary diffusion and advection models calculate entropy production:
$$\dot{S}_{\text{mix}} = -\sum_{\text{edges}} J_k \cdot \nabla \mu_k \ge 0$$
Consistent geometric topology guaranteed by `areCartesianUnitVectorsEqual3D` ensures that gradient operators $\nabla \mu$ do not suffer from phantom geometric singularities, keeping spatial entropy production strictly non-negative.

---

## 5. Interface & Integration Specification

### 5.1 Updates to `src/spatial/h3_adjacency.ts`
1. **Export `DEFAULT_ANGULAR_EPSILON`**:
   ```typescript
   export const DEFAULT_ANGULAR_EPSILON = 1e-9;
   ```
2. **Export `areCartesianUnitVectorsEqual3D`**:
   - Handles identical reference checks (`v1 === v2`).
   - Computes norms and normalizes if necessary.
   - Computes clamped dot product $\sigma = \max(-1, \min(1, \mathbf{u} \cdot \mathbf{w}))$.
   - Computes angular distance $\theta = \arccos(\sigma)$.
   - Validates $\theta \le \epsilon$.
3. **Integration into `H3BoundaryVertexMatcher`**:
   - Uses `areCartesianUnitVectorsEqual3D` for vertex deduplication and edge alignment between neighbor cells.

---

## 6. Verification and Test Strategy

### 6.1 Unit Tests (`tests/sprint_070.test.ts`)
- **Identity Case:** Two identical vectors return `true` with $\epsilon = 0$.
- **Small Perturbation:** Vectors separated by $0.5 \times 10^{-9}$ radians return `true` with default $\epsilon = 10^{-9}$.
- **Exceeding Tolerance:** Vectors separated by $2.0 \times 10^{-9}$ radians return `false` with default $\epsilon = 10^{-9}$.
- **Orthogonal Vectors:** $(1, 0, 0)$ and $(0, 1, 0)$ separated by $\pi/2$ radians return `true` when $\epsilon \ge \pi/2$, and `false` when $\epsilon < \pi/2$.
- **Antipodal Vectors:** $(0, 0, 1)$ and $(0, 0, -1)$ separated by $\pi$ radians return `true` when $\epsilon \ge \pi$, and `false` when $\epsilon < \pi$.
- **Unnormalized Vectors:** $(2, 0, 0)$ and $(10, 0, 0)$ correctly normalize to unit length and evaluate to equal ($0 \text{ rad}$).
- **Degenerate / Zero-Length Guard:** Zero-magnitude vectors throw an informative `Error` or return `false`.

---

## 7. Migration & Compatibility Notice
- **Non-Breaking:** `areCartesianUnitVectorsEqual3D` is additive. Existing H3 adjacency functions retain their contracts while gaining an optional or upgraded comparator path.
- **Performance:** For high-throughput batch loops, inner dot product caching and fast-path $\cos\theta \ge \cos\epsilon$ optimization can be enabled when $\epsilon < 0.1\text{ rad}$.