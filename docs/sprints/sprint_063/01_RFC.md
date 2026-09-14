# RFC-063: 3D Horizontal Boundary Normal Vector Computation (`computeBoundaryHorizontalNormal3D`)

## 1. Executive Summary & Sprint Goal

### 1.1 Sprint Goal
Implement `computeBoundaryHorizontalNormal3D` computing the unoriented cross product of the boundary midpoint tangent vector and the radial surface normal vector in `src/spatial/h3_adjacency.ts`.

### 1.2 Architectural Motivation
In the discrete spherical geodesic grid of the Web of Life engine, horizontal mass and energy flux between adjacent hexagonal/pentagonal cells occurs across shared 1-dimensional boundary edges on the two-sphere $S^2 \subset \mathbb{R}^3$.

Previous architectural increments established:
- **Sprint 061**: Edge shared boundary midpoint identification in Cartesian coordinates (`computeSharedBoundaryMidpoint3D`).
- **Sprint 062**: Boundary edge unit tangent vector computation along the boundary arc (`computeBoundaryTangentVector3D`).

To compute directional advection, barotropic wind stress, oceanic geostrophic currents, and Fickian diffusion across cell facets, the simulation requires the **in-plane horizontal unit normal vector** $\hat{\mathbf{n}}_h \in T_{\mathbf{m}}S^2$. This normal vector is tangential to the planetary sphere yet perpendicular to the cell-cell boundary edge at the shared midpoint $\mathbf{m}$. 

Sprint 063 completes the local boundary Darboux frame $(\hat{\mathbf{t}}, \hat{\mathbf{n}}_h, \hat{\mathbf{r}})$ at the edge midpoint by defining `computeBoundaryHorizontalNormal3D`.

---

## 2. Mathematical Formalism & Coordinate Mechanics

### 2.1 Spherical Geometry and Local Darboux Frame
Let $S^2_R = \{ \mathbf{x} \in \mathbb{R}^3 : \|\mathbf{x}\| = R \}$ represent the planetary spherical surface of mean radius $R$ centered at the coordinate origin $\mathbf{0} = (0, 0, 0)$.

For a shared boundary edge between cells $c_i$ and $c_j$ with vertices $\mathbf{v}_1, \mathbf{v}_2 \in S^2_R$:
1. **Midpoint Vector $\mathbf{m}$**:
   $$\mathbf{m} = \text{computeSharedBoundaryMidpoint3D}(\mathbf{v}_1, \mathbf{v}_2)$$
2. **Radial Unit Normal $\hat{\mathbf{r}}$**:
   $$\hat{\mathbf{r}} = \frac{\mathbf{m}}{\|\mathbf{m}\|}$$
   $\hat{\mathbf{r}}$ spans the orthogonal normal space $N_{\mathbf{m}} S^2_R$, directed outward along the local vertical.
3. **Midpoint Tangent Vector $\hat{\mathbf{t}}$**:
   $$\hat{\mathbf{t}} = \text{computeBoundaryTangentVector3D}(\mathbf{v}_1, \mathbf{v}_2) \in T_{\mathbf{m}} S^2_R$$
   satisfying $\langle \hat{\mathbf{t}}, \hat{\mathbf{r}} \rangle = 0$ and $\|\hat{\mathbf{t}}\| = 1$.

### 2.2 Unoriented Horizontal Normal Vector Formulation
The boundary horizontal normal $\mathbf{n}_h$ is the cross product of the boundary edge tangent $\hat{\mathbf{t}}$ and the outward radial normal $\hat{\mathbf{r}}$:
$$\mathbf{n}_{\text{raw}} = \hat{\mathbf{t}} \times \hat{\mathbf{r}}$$

Explicitly in Cartesian components:
$$\begin{aligned}
n_x &= t_y r_z - t_z r_y \\
n_y &= t_z r_x - t_x r_z \\
n_z &= t_x r_y - t_y r_x
\end{aligned}$$

Because $\hat{\mathbf{t}}$ and $\hat{\mathbf{r}}$ are mutually orthogonal unit vectors:
$$\|\mathbf{n}_{\text{raw}}\| = \|\hat{\mathbf{t}}\| \|\hat{\mathbf{r}}\| \sin(\pi / 2) = 1 \cdot 1 \cdot 1 = 1$$

To safeguard against floating-point catastrophic cancellation or non-orthogonal inputs, the vector is explicitly normalized:
$$\hat{\mathbf{n}}_h = \begin{cases}
\frac{\mathbf{n}_{\text{raw}}}{\|\mathbf{n}_{\text{raw}}\|}, & \|\mathbf{n}_{\text{raw}}\| > \varepsilon \\
(0, 0, 0), & \text{otherwise}
\end{cases}$$
where default numerical tolerance $\varepsilon = 10^{-12}$.

### 2.3 Orthonormality Contract
The resulting triad forms a right-handed orthonormal basis $(\hat{\mathbf{t}}, \hat{\mathbf{n}}_h, \hat{\mathbf{r}})$ of $\mathbb{R}^3$:
$$\begin{aligned}
\langle \hat{\mathbf{t}}, \hat{\mathbf{n}}_h \rangle &= 0 \\
\langle \hat{\mathbf{n}}_h, \hat{\mathbf{r}} \rangle &= 0 \\
\langle \hat{\mathbf{t}}, \hat{\mathbf{r}} \rangle &= 0 \\
\|\hat{\mathbf{t}}\| = \|\hat{\mathbf{n}}_h\| = \|\hat{\mathbf{r}}\| &= 1
\end{aligned}$$

Here, $\hat{\mathbf{n}}_h$ is intrinsically unoriented with respect to the specific neighbor ordering $(c_i \to c_j$ vs $c_j \to c_i)$. Downstream flux calculation determines orientation relative to cell centers $\mathbf{x}_i$ and $\mathbf{x}_j$ via scalar projection:
$$\sigma_{ij} = \operatorname{sgn}(\langle \hat{\mathbf{n}}_h, \mathbf{x}_j - \mathbf{x}_i \rangle)$$

---

## 3. Interface Contract & Functional Specification

### 3.1 Type Definitions
In `src/spatial/h3_adjacency.ts`:

```typescript
import { Vector3D } from './h3_types';

/**
 * Computes the unoriented horizontal boundary unit normal vector in 3D Cartesian coordinates.
 * The horizontal normal lies in the tangent plane of the planetary sphere at the boundary midpoint
 * and is orthogonal to both the boundary edge tangent vector and the radial surface normal.
 *
 * Mathematically: n_h = normalize(tangent x radialNormal)
 *
 * @param tangent - Unit tangent vector along the boundary edge (t)
 * @param radialNormal - Radial outward unit normal vector at the edge midpoint (r)
 * @param epsilon - Numerical tolerance for non-zero cross product norm (default: 1e-12)
 * @returns Unit Vector3D representing the unoriented horizontal normal, or zero vector if degenerate
 */
export function computeBoundaryHorizontalNormal3D(
  tangent: Vector3D,
  radialNormal: Vector3D,
  epsilon: number = 1e-12
): Vector3D;
```

### 3.2 Overload / Composed Convenience Variant
To allow direct evaluation from cell boundary vertices and midpoint, an overloaded or multi-parameter signature is also supported:

```typescript
export function computeBoundaryHorizontalNormalFromEndpoints3D(
  v1: Vector3D,
  v2: Vector3D,
  midpoint: Vector3D,
  epsilon: number = 1e-12
): Vector3D;
```

---

## 4. Thermodynamic & Physical Governance

### 4.1 First Law: Surface Normal Projection for Mass and Energy Conservation
In the finite-volume formulation on the hexagonal mesh, mass flux $\mathbf{J}_M$ (kg/(m²·s)) and thermal flux $\mathbf{J}_Q$ (J/(m²·s)) across facet $e_{ij}$ of length $L_{ij}$ and layer depth $\Delta z$ are integrated as:
$$\Phi_{M, ij} = \int_{e_{ij}} (\mathbf{J}_M \cdot \hat{\mathbf{n}}_{ij}) \, d\ell = (\mathbf{J}_M(\mathbf{m}) \cdot \hat{\mathbf{n}}_{ij}) L_{ij} \Delta z$$

Because $\hat{\mathbf{n}}_{ij} = \pm \hat{\mathbf{n}}_h$, exact orthonormality guarantees:
1. No fictitious vertical leakage: $\hat{\mathbf{n}}_h \cdot \hat{\mathbf{r}} \equiv 0$ prevents horizontal advective fluxes from leaking into radial vertical columns.
2. Antisymmetry: $\Phi_{M, ij} = -\Phi_{M, ji}$, ensuring exact global mass conservation $\sum_{i, j} \Phi_{M, ij} = 0$.

### 4.2 Second Law: Irreversible Entropy Production
Diffusive entropy production across the facet:
$$\dot{S}_{\text{facet}} = L_{ij} \Delta z \cdot \kappa \frac{(T_i - T_j)^2}{T_i T_j d_{ij}} \ge 0$$
depends on the projection of temperature gradient along the boundary normal $\nabla T \cdot \hat{\mathbf{n}}_h$. Orthonormality ensures non-negative dissipation without spurious numerical negative entropy generation.

---

## 5. Architectural Alignment & Incremental Class Hierarchy

```
Spatial Adjacency Pipeline (src/spatial/h3_adjacency.ts):
  ├── computeSharedBoundaryMidpoint3D(v1, v2)             [Sprint 061]
  ├── computeBoundaryTangentVector3D(v1, v2)              [Sprint 062]
  └── computeBoundaryHorizontalNormal3D(tangent, radial)  [Sprint 063 - THIS SPRINT]
        │
        ▼
  BoundaryDarbouxFrame3D
        ├── tangent: Vector3D
        ├── horizontalNormal: Vector3D
        └── radialNormal: Vector3D
```

---

## 6. Verification and Test Strategy

Unit tests in `tests/sprint_063.test.ts` must rigorously validate:
1. **Equatorial Boundary Normal**: For an edge along the equator ($z = 0$) directed east-west ($\hat{\mathbf{t}} = (0, 1, 0)$) at midpoint on the x-axis ($\hat{\mathbf{r}} = (1, 0, 0)$), normal is $(0, 1, 0) \times (1, 0, 0) = (0, 0, -1)$ (north-south).
2. **Meridional Boundary Normal**: For an edge along a meridian directed north ($\hat{\mathbf{t}} = (0, 0, 1)$) at prime meridian equator ($\hat{\mathbf{r}} = (1, 0, 0)$), normal is $(0, 0, 1) \times (1, 0, 0) = (0, 1, 0)$ (east-west).
3. **Unit Norm Invariance**: $\|\hat{\mathbf{n}}_h\| = 1 \pm 10^{-12}$ across arbitrary spherical orientations.
4. **Orthogonality Conditions**: $\langle \hat{\mathbf{n}}_h, \hat{\mathbf{t}} \rangle = 0 \pm 10^{-12}$ and $\langle \hat{\mathbf{n}}_h, \hat{\mathbf{r}} \rangle = 0 \pm 10^{-12}$.
5. **Degenerate Edge Cases**: Parallel vectors or near-zero inputs safely yield `(0, 0, 0)` without NaN or throwing.