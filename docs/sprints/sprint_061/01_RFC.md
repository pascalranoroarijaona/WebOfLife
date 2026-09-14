# RFC-061: Spherical Boundary Segment Displacement Vector Formulation (`computeBoundarySegmentVector3D`)

## Status
- **Status**: Proposed
- **Sprint**: 061
- **Author**: Chief Systems Architect
- **Target Subsystem**: `src/spatial/h3_adjacency.ts`, `src/spatial/h3_types.ts`

---

## 1. Executive Summary & Sprint Goal

### Sprint Goal
Implement `computeBoundarySegmentVector3D` calculating the unnormalized displacement vector between spherical boundary vertices in `src/spatial/h3_adjacency.ts`.

### Strategic Context
Within the Web of Life planetary simulation engine, continuous geodesic surfaces on the oblate or spherical Earth are discretized via the Discrete Global Grid System (DGGS) using H3 hexagonal and pentagonal partitions. Finite volume methods (FVM) govern the lateral advective and diffusive transport of thermodynamic monad stocks—enthalpy ($H$), dissolved inorganic carbon ($DIC$), atmospheric moisture ($Q_v$), and sensible heat. 

Conservative flux calculations across cell boundaries require oriented topological facets. Prior sprints established boundary vertex extraction and geodesic metric calculations. To evaluate surface integrals, oriented facet normals, Stokesian flux circulations, and boundary segment lengths without premature numerical normalization, the system requires an explicit primitive: `computeBoundarySegmentVector3D`. This function computes the exact unnormalized displacement vector $\vec{\Delta}_{AB} = \mathbf{v}_B - \mathbf{v}_A \in \mathbb{R}^3$ between two vertices on $\mathbb{S}^2$. Retaining the unnormalized vector is numerically essential for computing tangential projection, edge vector magnitudes $\|\vec{\Delta}_{AB}\|$, cross products for unit boundary normals $\hat{\mathbf{n}} = (\mathbf{v}_A \times \mathbf{v}_B) / \|\mathbf{v}_A \times \mathbf{v}_B\|$, and oriented contour integrations satisfying Gauss's Divergence Theorem.

---

## 2. Mathematical & Geometric Formulation

### 2.1 Coordinate Space Representation
Let vertices $\mathbf{v}_A, \mathbf{v}_B \in \mathbb{R}^3$ be 3D Cartesian coordinates representing boundary vertices of an H3 cell on the unit or planetary sphere of radius $R_{earth}$:
$$
\mathbf{v}_A = \begin{bmatrix} x_A \\ y_A \\ z_A \end{bmatrix}, \quad \mathbf{v}_B = \begin{bmatrix} x_B \\ y_B \\ z_B \end{bmatrix}
$$

### 2.2 Boundary Segment Vector Definition
The unnormalized displacement vector $\vec{\mathbf{L}}_{AB}$ from vertex $A$ to vertex $B$ is defined by:
$$
\vec{\mathbf{L}}_{AB} = \mathbf{v}_B - \mathbf{v}_A = \begin{bmatrix} x_B - x_A \\ y_B - y_A \\ z_B - z_A \end{bmatrix}
$$

### 2.3 Algebraic and Physical Invariants
1. **Antisymmetry / Directed Flux Parity**:
   $$
   \vec{\mathbf{L}}_{BA} = -\vec{\mathbf{L}}_{AB}
   $$
   This ensures that flux across edge $(A, B)$ shared between cell $i$ and cell $j$ obeys exact conservation:
   $$
   \Phi_{i \to j} = -\Phi_{j \to i}
   $$
2. **Metric Length Derivation**:
   The Euclidean chord length $l_{chord}$ of the boundary facet is:
   $$
   l_{chord} = \|\vec{\mathbf{L}}_{AB}\|_2 = \sqrt{(x_B - x_A)^2 + (y_B - y_A)^2 + (z_B - z_A)^2}
   $$
   The arc length along the sphere of radius $R$ is derived via the central angle $\theta = 2 \arcsin\left(\frac{\|\vec{\mathbf{L}}_{AB}\|}{2 R}\right)$.
3. **Directed Normal and Tangential Bases**:
   The unnormalized segment vector $\vec{\mathbf{L}}_{AB}$ serves as the tangential direction of integration along the cell boundary contour:
   $$
   \oint_{\partial \Omega_i} \mathbf{u} \cdot d\vec{\mathbf{l}} \approx \sum_{k=1}^{E_i} \mathbf{u}_k \cdot \vec{\mathbf{L}}_{k, k+1}
   $$

---

## 3. Thermodynamic & First/Second Law Compliance

```
                  +-----------------------------------+
                  |      Solar Insolation (TOA)       |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |   Cell Monad State Tensor C_i     |
                  |     (U, S, DIC, H2O, Biomass)     |
                  +-----------------------------------+
                               /           \
           Edge Advection /                 \ Edge Advection
     L_AB = v_B - v_A    /                   \ L_BC = v_C - v_B
                        v                     v
            +--------------------+   +--------------------+
            | Neighbor C_{adj1}  |   | Neighbor C_{adj2}  |
            +--------------------+   +--------------------+
```

### 3.1 First Law: Conservative Finite Volume Interfacial Flux
Thermodynamic state variables (internal energy $U$, mass stocks $M_k$) follow continuity equations:
$$
\frac{d M_{i, k}}{dt} = -\sum_{j \in \mathcal{N}(i)} \mathcal{F}_{ij, k} + \mathcal{S}_{i, k}
$$
The interfacial flux $\mathcal{F}_{ij, k}$ across the boundary segment connecting vertices $\mathbf{v}_A$ and $\mathbf{v}_B$ depends on the boundary normal and length:
$$
\mathcal{F}_{ij, k} = \mathbf{J}_k \cdot \left(\hat{\mathbf{r}}_{edge} \times \vec{\mathbf{L}}_{AB}\right)
$$
Because $\vec{\mathbf{L}}_{BA} = -\vec{\mathbf{L}}_{AB}$, the discrete flux is anti-symmetric across neighboring cells $\mathcal{F}_{ji, k} = -\mathcal{F}_{ij, k}$, strictly precluding artificial mass or energy generation or loss ($\sum_{i} \sum_{j} \mathcal{F}_{ij} \equiv 0$).

### 3.2 Second Law: Non-negative Entropy Production
Boundary segment vectors provide the geometric weights for conductive heat flux $\mathbf{q} = -\kappa \nabla T$. The local entropy dissipation rate over boundary facet $AB$ satisfies:
$$
\dot{S}_{gen, AB} = \mathcal{F}_{Q, AB} \left(\frac{1}{T_j} - \frac{1}{T_i}\right) \ge 0
$$
Accurate geometric evaluation of $\vec{\mathbf{L}}_{AB}$ prevents coordinate distortion and unphysical negative thermal resistance near polar and pentagonal singularity regions.

---

## 4. Class Hierarchy & Architectural Design

### 4.1 Interface Contracts (`src/spatial/h3_types.ts`)
```typescript
/**
 * Representation of a 3D Cartesian vector or point in planetary coordinate space.
 */
export interface Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Directed boundary segment between two spherical vertices.
 */
export interface BoundarySegment3D {
  readonly start: Vector3D;
  readonly end: Vector3D;
  readonly displacement: Vector3D;
  readonly chordLength: number;
}
```

### 4.2 Function Contract in `src/spatial/h3_adjacency.ts`
```typescript
/**
 * Calculates the unnormalized displacement vector from vertex v1 to vertex v2.
 * Vector = v2 - v1 = (x2 - x1, y2 - y1, z2 - z1).
 *
 * @param v1 Starting spherical boundary vertex in 3D Cartesian coordinates.
 * @param v2 Ending spherical boundary vertex in 3D Cartesian coordinates.
 * @returns Unnormalized Vector3D representing the displacement from v1 to v2.
 * @throws Error if coordinates contain NaN or non-finite values.
 */
export function computeBoundarySegmentVector3D(v1: Vector3D, v2: Vector3D): Vector3D;
```

### 4.3 Structural Extensions
`H3AdjacencyGraph` and boundary traversal algorithms will compose `computeBoundarySegmentVector3D` into high-level boundary segment constructs:
- `BoundarySegment3D` records `start`, `end`, and cached `displacement`.
- Interfacial normal computation utilizes `computeBoundarySegmentVector3D` combined with radial unit vectors to construct the oriented facet outward normal.

---

## 5. Implementation Specifications

### 5.1 Algorithmic Procedure
1. **Validation**: Check that `v1` and `v2` are defined, non-null, and contain finite numerical entries (`Number.isFinite`).
2. **Subtraction**:
   $$
   x = v2.x - v1.x \\
   y = v2.y - v1.y \\
   z = v2.z - v1.z
   $$
3. **Zero-check / Degeneracy**: If $v1 = v2$, return `{ x: 0, y: 0, z: 0 }` without error, preserving vector space axioms.
4. **Immutability**: Return a frozen or plain `Vector3D` object `{ x, y, z }`.

### 5.2 Numerical Stability & Edge Cases
- **Collinear / Coincident Vertices**: When $v1 = v2$, $\|\vec{\Delta}\| = 0$. Unnormalized vector cleanly preserves 0 without division-by-zero exceptions (unlike normalized computations).
- **Floating-point Cancellation**: Vertices separated by sub-millimeter scales on a spherical radius of $6,371,000\text{ m}$ could experience catastrophic cancellation if single-precision floats were used; implementation guarantees double-precision (`Float64` / IEEE-754 binary64).

---

## 6. Verification and Testing Plan (`tests/sprint_061.test.ts`)

1. **Orthogonal Basis Tests**:
   - Compute displacement between $(1, 0, 0)$ and $(0, 1, 0) \to (-1, 1, 0)$.
   - Compute displacement between origin and arbitrary coordinates.
2. **Antisymmetry Tests**:
   - Verify $\text{computeBoundarySegmentVector3D}(v1, v2) = -\text{computeBoundarySegmentVector3D}(v2, v1)$ to machine epsilon.
3. **Degenerate Point Test**:
   - Verify that passing identical points produces zero vector `(0, 0, 0)`.
4. **H3 Cell Boundary Real-world Test**:
   - Pass two actual adjacent vertices from an H3 resolution 4 cell boundary; verify vector norm matches Euclidean chord distance.
5. **Thermodynamic Finite-Volume Conservation Test**:
   - Integrate $\sum_{k=1}^N \vec{\mathbf{L}}_{k, k+1}$ for a closed hexagon loop $\mathbf{v}_1, \dots, \mathbf{v}_6, \mathbf{v}_1$; verify closed loop sum $\sum \vec{\mathbf{L}} \approx \mathbf{0}$.
6. **Input Guarding & Robustness**:
   - Verify error throwing on `NaN`, `Infinity`, or malformed input objects.