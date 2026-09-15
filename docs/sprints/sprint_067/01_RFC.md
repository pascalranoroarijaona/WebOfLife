# RFC-067: Detailed Interface Normal Vector, Arc Length, and Alignment Metric Specification

## 1. Metadata
- **RFC ID**: RFC-067
- **Sprint**: Sprint 067
- **Title**: Definition of DetailedInterfaceNormalResult Interface in H3 Spatial Typings
- **Author**: Chief Systems Architect, Web of Life Core Architecture Team
- **Status**: Proposed / Approved for Implementation
- **Target Subsystem**: `src/spatial/h3_types.ts`
- **Dependencies**: Sprint 001–066 Architectural Specifications, `src/spatial/h3_types.ts`, `src/spatial/h3_adjacency.ts`

---

## 2. Executive Summary

In geodesic discrete global grid systems (DGGS) such as Uber H3, horizontal mass and energy flux between adjacent hexagonal (or pentagonal) cells requires rigorous finite-volume surface integration. Conservative advective and diffusive transport of fluid parcels, vapor, carbon monads, and sensory trophic signals across cell boundaries hinges on exact geometric properties of the shared interface:
1. The outward unit surface normal vector $\hat{\mathbf{n}}_{ij} \in \mathbb{R}^3$ orthogonal to the shared boundary geodesic segment and tangent to the planetary sphere.
2. The metric arc length $L_{ij} = R_{\oplus} \Delta \sigma_{ij}$ (in meters) along the great circle arc separating cell $i$ and cell $j$.
3. The directional alignment cosine $\cos(\theta_{ij}) = \hat{\mathbf{d}}_{ij} \cdot \hat{\mathbf{n}}_{ij}$, where $\hat{\mathbf{d}}_{ij}$ is the normalized centroid-to-centroid chord/geodesic tangent vector.

This RFC establishes the canonical TypeScript interface `DetailedInterfaceNormalResult` in `src/spatial/h3_types.ts`. This contract standardizes how interface normals, lengths, and spatial alignments are computed and consumed by the monadic flux engines across the planetary manifold without violating First Law thermodynamic invariants.

---

## 3. Mathematical Foundations & Coordinate Geometry

### 3.1 Geodesic Interface Representation on $\mathbb{S}^2$
Let the Earth be represented as a sphere $\mathbb{S}^2 \subset \mathbb{R}^3$ of mean radius $R_{\oplus} = 6.3710088 \times 10^6\text{ m}$.
For two adjacent H3 cells with indices $c_i, c_j \in \mathcal{H}_r$ at resolution $r$, their shared boundary is a geodesic arc segment connecting two vertices $\mathbf{v}_A, \mathbf{v}_B \in \mathbb{S}^2$, such that $\|\mathbf{v}_A\| = \|\mathbf{v}_B\| = 1$.

The interface arc length $L_{ij}$ in meters is given by:
$$
\Delta \sigma_{AB} = \arccos(\mathbf{v}_A \cdot \mathbf{v}_B) = 2 \arcsin\left(\frac{\|\mathbf{v}_A - \mathbf{v}_B\|}{2}\right)
$$
$$
L_{ij} = R_{\oplus} \cdot \Delta \sigma_{AB}
$$

### 3.2 Interface Normal Vector Definition
The unit normal vector $\hat{\mathbf{n}}_{ij}$ defines the orientation of net advective mass flux from cell $i$ to cell $j$. 
The tangent vector along the interface boundary directed from $\mathbf{v}_A$ to $\mathbf{v}_B$ is given by:
$$
\boldsymbol{\tau}_{AB} = \frac{\mathbf{v}_B - (\mathbf{v}_B \cdot \mathbf{v}_A)\mathbf{v}_A}{\|\mathbf{v}_B - (\mathbf{v}_B \cdot \mathbf{v}_A)\mathbf{v}_A\|}
$$
At the interface midpoint $\mathbf{m}_{ij} = \frac{\mathbf{v}_A + \mathbf{v}_B}{\|\mathbf{v}_A + \mathbf{v}_B\|}$, the outward interface unit normal $\hat{\mathbf{n}}_{ij}$ lying in the tangent plane $T_{\mathbf{m}_{ij}}(\mathbb{S}^2)$ is defined via the spherical cross-product:
$$
\hat{\mathbf{n}}_{ij} = \boldsymbol{\tau}_{AB} \times \mathbf{m}_{ij}
$$
The sign is oriented such that $\hat{\mathbf{n}}_{ij}$ points into cell $j$ (satisfying $\hat{\mathbf{n}}_{ij} \cdot (\mathbf{x}_j - \mathbf{x}_i) > 0$ for centroids $\mathbf{x}_i, \mathbf{x}_j$).

### 3.3 Centroid Alignment Metric
Let $\mathbf{d}_{ij} = \mathbf{x}_j - \mathbf{x}_i$ be the vector separating cell centroid $i$ from centroid $j$. The alignment cosine is defined as:
$$
\text{alignmentCos} = \frac{\mathbf{d}_{ij}}{\|\mathbf{d}_{ij}\|} \cdot \hat{\mathbf{n}}_{ij} = \hat{\mathbf{d}}_{ij} \cdot \hat{\mathbf{n}}_{ij}
$$
For regular planar hexagons, $\hat{\mathbf{d}}_{ij} = \hat{\mathbf{n}}_{ij}$, yielding $\text{alignmentCos} = 1.0$. On the spherical icosahedral manifold, cell skewness and pentagonal distortions yield $\text{alignmentCos} \in [0.95, 1.0]$. Computing this alignment is essential to scale normal projected velocity fields $\mathbf{u} \cdot \hat{\mathbf{n}}_{ij}$ against centroid-directed finite difference gradients $\nabla \Phi \approx \frac{\Phi_j - \Phi_i}{\|\mathbf{d}_{ij}\|}$.

---

## 4. Thermodynamic & Physical Invariants

### 4.1 First Law: Finite-Volume Flux Antisymmetry
The net mass or energy flux $J_{ij}$ across interface $\partial \Omega_{ij}$ must satisfy absolute skew-symmetry:
$$
J_{ij} = -J_{ji}
$$
Because $\hat{\mathbf{n}}_{ji} = -\hat{\mathbf{n}}_{ij}$ and $L_{ji} = L_{ij}$, the metric parameters provided by `DetailedInterfaceNormalResult` ensure that numerical discretization conserves mass:
$$
\frac{d M_i}{dt} = -\sum_{j \in \mathcal{N}(i)} J_{ij} L_{ij} = -\sum_{j \in \mathcal{N}(i)} \left(\mathbf{u}_{ij} \cdot \hat{\mathbf{n}}_{ij}\right) \rho_{ij} L_{ij}
$$
Summing over the closed topological sphere $\mathcal{M} = \bigcup_{i} \Omega_i$:
$$
\sum_{i} \frac{d M_i}{dt} = -\sum_{(i,j)} (J_{ij} + J_{ji}) L_{ij} = 0
$$

### 4.2 Second Law: Non-negative Entropy Production in Interface Transport
Diffusive interface fluxes driven by thermal gradients must satisfy:
$$
q_{ij} = -k_{\text{eff}} \frac{T_j - T_i}{\|\mathbf{d}_{ij}\|} \text{alignmentCos}
$$
Ensuring that heat flows down temperature gradients with strictly non-negative entropy generation:
$$
\dot{S}_{\text{gen}, ij} = q_{ij} L_{ij} \left(\frac{1}{T_j} - \frac{1}{T_i}\right) \ge 0
$$

---

## 5. Interface Specification in `src/spatial/h3_types.ts`

The interface is defined to provide high-precision numeric components without runtime allocation overhead:

```typescript
/**
 * Detailed geometric and directional properties of an H3 cell interface boundary.
 * Used for conservative finite-volume advection and diffusion across cell edges.
 */
export interface DetailedInterfaceNormalResult {
  /**
   * 3D unit normal vector [nx, ny, nz] on the unit sphere S^2,
   * tangent to S^2 at the interface midpoint, oriented outward from cell i toward cell j.
   */
  readonly normal: readonly [number, number, number];

  /**
   * Great-circle arc length of the shared boundary segment in meters (WGS84 spherical approximation).
   * L_ij = R_earth * Delta_sigma_ij
   */
  readonly arcLengthMeters: number;

  /**
   * Cosine of the angle between the centroid-to-centroid unit vector and the boundary normal vector.
   * alignmentCos = dot(d_ij_hat, normal). Equal to 1.0 on a flat regular hexagonal grid.
   */
  readonly alignmentCos: number;
}
```

### 5.1 Design Trade-Off Analysis: Tuple vs Vector Object
- `readonly [number, number, number]` is selected over class-instantiated vectors (`Vector3D`) for `normal` to maintain zero-cost serialization into typed array buffers (`Float64Array`) during state tensor integration and WebAssembly SIMD interop.
- Immutability (`readonly`) enforces purity in monadic flux transformations.

---

## 6. Incremental Integration Plan

```
src/spatial/h3_types.ts
   ├── DetailedInterfaceNormalResult (NEW)
   └── Interface with existing H3Index, CellMetric, SpatialFlux

src/spatial/h3_adjacency.ts
   ├── calculateDetailedInterfaceNormal(cellA: string, cellB: string): DetailedInterfaceNormalResult
   └── Cached lookup for planetary adjacency graphs

src/monads/spatial_monad.ts
   └── SpatialMonad.divergenceField() leveraging DetailedInterfaceNormalResult for flux divergence
```

1. **Step 1 (Sprint 067)**: Declare and export `DetailedInterfaceNormalResult` in `src/spatial/h3_types.ts`.
2. **Step 2 (Downstream Sprint 068)**: Implement `computeDetailedInterfaceNormal(origin: string, destination: string): DetailedInterfaceNormalResult` in `src/spatial/h3_adjacency.ts`.
3. **Step 3 (Downstream Sprint 069)**: Update `SpatialMonad` and `h3_state_tensor.ts` to consume `DetailedInterfaceNormalResult` for atmospheric and ocean layer advection.

---

## 7. Verification & Testing Strategy

1. **Type Verification**:
   - Verify compile-time type safety via TypeScript compiler (`tsc --noEmit`).
   - Validate interface assignability with mock implementations in unit tests.
2. **Geometric Properties Invariants**:
   - `||normal|| = 1.0 ± 1e-12`.
   - `arcLengthMeters > 0`.
   - `alignmentCos ∈ [0.8, 1.0]`.
3. **Thermodynamic Skew-Symmetry Verification**:
   - Interface between cell A and cell B must satisfy:
     - `resultAB.normal = -resultBA.normal`
     - `resultAB.arcLengthMeters == resultBA.arcLengthMeters`
     - `resultAB.alignmentCos == resultBA.alignmentCos`

---

## 8. Architectural Sign-off
- **Architectural Coherence**: Conforms to existing `src/spatial/h3_types.ts` type-level conventions.
- **Thermodynamic Rigor**: Provides complete geometric basis for finite-volume divergence operations obeying conservation laws.
- **Sprint Goal Compliance**: Directly satisfies Sprint 067 Goal with full formal specification.