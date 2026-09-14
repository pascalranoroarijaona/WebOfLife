# RFC-059: Spherical Great Circle Plane Normal Vector Computation (`computeSphericalGreatCircleNormal3D`)

## 1. Executive Summary & Sprint Goal
- **Sprint Goal**: Implement `computeSphericalGreatCircleNormal3D` computing the normalized cross product of two unit vectors representing a great circle plane normal in `src/spatial/h3_adjacency.ts`.
- **RFC ID**: RFC-059
- **Author**: Chief Systems Architect
- **Status**: Proposed / Approved for Implementation
- **Target File**: `src/spatial/h3_adjacency.ts`
- **Affected Subsystems**: Spherical Geodesics, H3 Adjacency & Boundary Flux Transport, `SpatialMonad`, Thermodynamic Advection Dynamics.

---

## 2. Context, Rationale & Motivation

In the discrete global grid system (DGGS) powering the Web of Life simulation, geodesic boundaries, cell-to-cell interface corridors, and horizontal advective fluxes (e.g., oceanic currents, atmospheric cell circulation, migrating trophic biomass) propagate across the sphere along great circle arcs. 

To determine the oriented spatial plane spanned by any two directional points or adjacent cell centroids $\mathbf{u}, \mathbf{v} \in \mathbb{S}^2 \subset \mathbb{R}^3$, the simulation requires a canonical normal vector $\mathbf{n} \in \mathbb{S}^2$ defining the great circle plane:
$$\Pi(\mathbf{u}, \mathbf{v}) = \{ \mathbf{x} \in \mathbb{R}^3 : \mathbf{x} \cdot \mathbf{n} = 0 \}$$

This normal vector is fundamentally given by the normalized cross product of $\mathbf{u}$ and $\mathbf{v}$:
$$\mathbf{n} = \frac{\mathbf{u} \times \mathbf{v}}{\|\mathbf{u} \times \mathbf{v}\|}$$

Prior sprints introduced basic 3D vector operations (`latLngToUnitVector3D`, `crossProduct3D`, `dotProduct3D`, `normalizeVector3D`). However, computing great circle plane normals directly requires:
1. Strict numerical stability when vectors are nearly collinear or antipodal ($\|\mathbf{u} \times \mathbf{v}\| < \epsilon$).
2. Guaranteed right-hand orientation consistency for flux transport equations.
3. Explicit unit length normalization ($\|\mathbf{n}\| = 1 \pm 10^{-12}$).
4. Preservation of thermodynamic conservative properties across cell boundaries.

---

## 3. Mathematical & Geometric Formulation

### 3.1 Great Circle Plane Normal Formulation
Let $\mathbf{u} = (u_x, u_y, u_z)^T$ and $\mathbf{v} = (v_x, v_y, v_z)^T$ be two non-degenerate unit vectors on the unit 2-sphere $\mathbb{S}^2 \subset \mathbb{R}^3$, where $\|\mathbf{u}\| = \|\mathbf{v}\| = 1$.

The standard cross product $\mathbf{w} = \mathbf{u} \times \mathbf{v}$ is evaluated via:
$$\mathbf{w} = \begin{pmatrix} w_x \\ w_y \\ w_z \end{pmatrix} = \begin{pmatrix} u_y v_z - u_z v_y \\ u_z v_x - u_x v_z \\ u_x v_y - u_y v_x \end{pmatrix}$$

The Euclidean norm of $\mathbf{w}$ is:
$$\|\mathbf{w}\| = \sqrt{w_x^2 + w_y^2 + w_z^2} = \|\mathbf{u}\| \|\mathbf{v}\| \sin \theta = \sin \theta$$
where $\theta = \angle(\mathbf{u}, \mathbf{v}) \in [0, \pi]$.

The unit normal $\mathbf{n}$ is therefore:
$$\mathbf{n} = \frac{\mathbf{w}}{\|\mathbf{w}\|} = \frac{\mathbf{u} \times \mathbf{v}}{\sin \theta}$$

### 3.2 Degeneracy and Numerical Conditioning
When $\mathbf{u}$ and $\mathbf{v}$ are collinear:
- Identical ($\mathbf{u} = \mathbf{v} \implies \theta = 0 \implies \mathbf{u} \times \mathbf{v} = \mathbf{0}$).
- Antipodal ($\mathbf{u} = -\mathbf{v} \implies \theta = \pi \implies \mathbf{u} \times \mathbf{v} = \mathbf{0}$).

In both conditions, no unique great circle connects the two points, yielding an underdetermined plane. 
Let $\epsilon_{\text{collinear}} = 10^{-10}$. If $\|\mathbf{w}\| < \epsilon_{\text{collinear}}$, the function must handle the degeneracy deterministically:
1. If $\mathbf{u}$ and $\mathbf{v}$ are collinear, construct an orthogonal unit vector via deterministic Gram-Schmidt projection against an arbitrary non-parallel basis axis (e.g. $[1, 0, 0]^T$ or $[0, 1, 0]^T$), or return a stable deterministic unit normal perpendicular to $\mathbf{u}$, ensuring runtime predictability without non-physical NaN or infinities.
2. Under standard non-collinear configurations ($\|\mathbf{w}\| \ge \epsilon_{\text{collinear}}$), return the exact normalized right-hand normal vector:
   $$\mathbf{n} \cdot \mathbf{u} = 0, \quad \mathbf{n} \cdot \mathbf{v} = 0, \quad \|\mathbf{n}\| = 1$$

---

## 4. Architectural & Class Design

### 4.1 Integration into `src/spatial/h3_adjacency.ts`
The function `computeSphericalGreatCircleNormal3D` will be exported as a pure utility function and integrated into geodesic calculation workflows.

```typescript
/**
 * Computes the normalized unit normal vector (u x v / ||u x v||) of the great circle 
 * plane passing through unit vectors u and v on S^2.
 *
 * @param u First 3D unit vector [x, y, z] on sphere
 * @param v Second 3D unit vector [x, y, z] on sphere
 * @param epsilon Optional tolerance threshold for collinearity detection (default: 1e-10)
 * @returns Normalized 3D normal vector [nx, ny, nz] representing the oriented plane normal
 */
export function computeSphericalGreatCircleNormal3D(
  u: [number, number, number],
  v: [number, number, number],
  epsilon: number = 1e-10
): [number, number, number];
```

### 4.2 Object-Oriented Composition
`H3Adjacency` and geodesic path helpers leverage `computeSphericalGreatCircleNormal3D` to compute:
- Cell boundary great circle segments between adjacent vertex pairs.
- Advective velocity projections: given flow vector $\mathbf{F}$, the cross-boundary component is proportional to $\mathbf{F} \times \mathbf{n}$.
- Hemisphere side tests: point $\mathbf{p} \in \mathbb{S}^2$ belongs to the positive hemisphere if $\mathbf{p} \cdot \mathbf{n} > 0$.

---

## 5. Thermodynamic Invariants & Conservation Compliance

### 5.1 First Law of Thermodynamics (Energy and Mass Conservation)
- `computeSphericalGreatCircleNormal3D` is a pure geometric operator. It produces no energetic sinks, matter creation, or destructive truncation.
- Vector normalization preserves geometric metric scale without introducing numerical mass drift when used to weight advective transport across hexagonal interfaces.

### 5.2 Second Law of Thermodynamics (Entropy Non-Decrease)
- The deterministic evaluation ensures time-reversibility of spatial coordinates and consistent orientation of flux boundaries:
  $$\mathbf{n}(\mathbf{v}, \mathbf{u}) = -\mathbf{n}(\mathbf{u}, \mathbf{v})$$
  This anti-symmetry ensures that advective matter exchanged across an edge $(A \to B)$ equals the negative of $(B \to A)$, satisfying net divergence consistency and non-negative entropy generation in irreversible dispersion steps.

---

## 6. Implementation Specification

### 6.1 Algorithm
1. Compute raw cross product:
   $$w_x = u_1 v_2 - u_2 v_1$$
   $$w_y = u_2 v_0 - u_0 v_2$$
   $$w_z = u_0 v_1 - u_1 v_0$$
2. Compute Euclidean norm:
   $$M = \sqrt{w_x^2 + w_y^2 + w_z^2}$$
3. Check collinearity against `epsilon`:
   - If $M \ge \text{epsilon}$: return $[w_x / M, w_y / M, w_z / M]$.
   - If $M < \text{epsilon}$: fallback to deterministic orthogonal vector to $\mathbf{u}$. Specifically:
     - If $|u_0| < 0.9$, set trial vector $\mathbf{a} = [1, 0, 0]^T$; else $\mathbf{a} = [0, 1, 0]^T$.
     - Compute $\mathbf{w}_{\text{fallback}} = \mathbf{u} \times \mathbf{a}$.
     - Normalize $\mathbf{w}_{\text{fallback}}$ and return.

### 6.2 Interface Contract
- **Input Purity**: Inputs `u` and `v` are immutable tuples.
- **Output Invariants**:
  1. Unit Length: $|\|\mathbf{n}\| - 1.0| < 10^{-12}$.
  2. Orthogonality: $|\mathbf{n} \cdot \mathbf{u}| < 10^{-10}$ and $|\mathbf{n} \cdot \mathbf{v}| < 10^{-10}$.
  3. Anti-symmetry: `computeSphericalGreatCircleNormal3D(u, v) == -computeSphericalGreatCircleNormal3D(v, u)` (up to machine precision for non-collinear vectors).

---

## 7. Verification & Test Plan

`tests/sprint_059.test.ts` will rigorously validate:
1. **Canonical Axes**:
   - $u = [1, 0, 0]$ (Equator, 0°E), $v = [0, 1, 0]$ (Equator, 90°E) $\implies n = [0, 0, 1]$ (North Pole).
   - $u = [0, 1, 0]$, $v = [0, 0, 1]$ $\implies n = [1, 0, 0]$.
2. **Right-Hand Rule & Anti-symmetry**:
   - Verify $\mathbf{n}(u, v) \approx -\mathbf{n}(v, u)$.
3. **Orthogonality**:
   - For arbitrary non-aligned vectors on the sphere, $\mathbf{n} \cdot \mathbf{u} \approx 0$ and $\mathbf{n} \cdot \mathbf{v} \approx 0$.
4. **Unit Norm Invariant**:
   - Verify $\|\mathbf{n}\| = 1.0$ within $10^{-12}$ error margin.
5. **Collinear and Antipodal Edge Cases**:
   - $u = v = [0, 0, 1] \implies$ returns valid deterministic unit normal perpendicular to $u$.
   - $u = [0, 0, 1]$, $v = [0, 0, -1] \implies$ returns valid deterministic unit normal perpendicular to $u$.
6. **Subsystem Compatibility**:
   - Ensure existing spatial and geodesic suite passes without regression.