# RFC-071: Coincident 3D Boundary Vertex Pair Matching for Adjacent H3 Hexagonal Manifolds

- **Author**: Chief Systems Architect
- **Sprint**: 071
- **Status**: Proposed
- **Target Subsystem**: `src/spatial/h3_adjacency.ts` (extending `src/spatial/h3_types.ts` and `src/spatial/spatial_flux_monad.ts`)
- **First Law Verification**: Thermodynamic Mass & Enthalpy Conservator (Closed Flux Interface $\sum \Delta M = 0$)
- **Second Law Verification**: Non-negative entropy generation on boundary diffusion ($\sigma \ge 0$)

---

## 1. Executive Summary & Sprint Objective

The discrete global grid system (DGGS) utilized by the Gaia Web of Life architecture subdivides planetary spherical shells into topological H3 cells. While adjacent cells share topological edges on the icosahedral-hexagonal dual graph, discrete floating-point representations of boundary vertices computed per-cell exhibit microscopic numerical divergence due to geodesic projection and floating-point rounding.

Sprint 071 implements `findSharedBoundaryVertexPairs3D` within `src/spatial/h3_adjacency.ts`. This utility computes and returns strictly ordered, coincident boundary vertex pairs between adjacent H3 cells in three-dimensional Cartesian space ($\mathbb{R}^3$), bounded by an epsilon tolerance metric $\epsilon_{geom}$. This geometric edge-pairing contract provides the foundation for geodesic boundary interface normals, trans-boundary advection/diffusion surface area evaluations, and conservative finite-volume physical fluxes across adjacent cell boundaries without spatial mass leaks.

---

## 2. Mathematical Formalism & Boundary Manifold Theory

### 2.1 Boundary Polygon Geometry in $\mathbb{R}^3$

Let cell $C_A$ have boundary vertices $\mathcal{V}_A = \{ \mathbf{p}_0^A, \mathbf{p}_1^A, \dots, \mathbf{p}_{n-1}^A \}$ with $\mathbf{p}_i^A \in \mathbb{R}^3$ ($n \in \{5, 6\}$ for pentagons/hexagons), ordered counterclockwise relative to the outward radial unit normal $\hat{\mathbf{n}}_A = \frac{\mathbf{c}_A}{\|\mathbf{c}_A\|}$.
Similarly, let cell $C_B$ have boundary vertices $\mathcal{V}_B = \{ \mathbf{q}_0^B, \mathbf{q}_1^B, \dots, \mathbf{q}_{m-1}^B \}$ with $\mathbf{q}_j^B \in \mathbb{R}^3$.

When $C_A$ and $C_B$ are topological neighbors (H3 $k$-ring distance $d(C_A, C_B) = 1$), their continuous spherical footprints intersect at a single shared 1D geodesic segment bounded by 2 coincident vertex points:
$$\partial C_A \cap \partial C_B = \overline{\mathbf{v}_1 \mathbf{v}_2}$$

Due to independent projection evaluations, discrete vertex coordinates satisfy:
$$\|\mathbf{p}_i^A - \mathbf{q}_j^B\|_2 \le \epsilon_{geom}, \quad \text{where } \epsilon_{geom} \approx 10^{-5} \cdot R_\oplus \text{ (or normalized equivalent)}.$$

### 2.2 Coincident Vertex Pair Ordering Contract

A shared boundary vertex pair is formalized as an ordered tuple:
$$\mathcal{P}_{ij} = \left( i, j, \mathbf{p}_i^A, \mathbf{q}_j^B, \|\mathbf{p}_i^A - \mathbf{q}_j^B\|_2 \right)$$
For topological neighbors sharing an edge, the pair set $\mathbf{\Pi}(C_A, C_B)$ has cardinality $|\mathbf{\Pi}| = 2$.
The shared edge segment vector from the perspective of $C_A$ is:
$$\mathbf{e}_{A \to B} = \mathbf{p}_{i_2}^A - \mathbf{p}_{i_1}^A$$
with orientation matching cell $C_A$'s counterclockwise boundary loop, ensuring that the directed boundary flux normal satisfies:
$$\hat{\mathbf{n}}_{AB} = \frac{\mathbf{e}_{A \to B} \times \hat{\mathbf{n}}_A}{\|\mathbf{e}_{A \to B} \times \hat{\mathbf{n}}_A\|}$$
directed strictly from cell $A$ outward into cell $B$.

---

## 3. Class Hierarchy & Architectural Design

### 3.1 Object-Oriented Incremental Type Hierarchy

```
+-------------------------------------------------------------+
|                  src/spatial/h3_types.ts                     |
+-------------------------------------------------------------+
| Vector3D: { x: number, y: number, z: number }               |
| BoundaryVertexPair3D:                                       |
|   - indexA: number                                          |
|   - indexB: number                                          |
|   - vertexA: Vector3D                                       |
|   - vertexB: Vector3D                                       |
|   - distance: number                                        |
| BoundaryEdge3D:                                             |
|   - cellIndexA: string                                      |
|   - cellIndexB: string                                      |
|   - pairs: [BoundaryVertexPair3D, BoundaryVertexPair3D]     |
|   - lengthMeters: number                                    |
|   - midpoint: Vector3D                                      |
|   - outwardNormal: Vector3D                                 |
+-------------------------------------------------------------+
                              ^
                              |
+-------------------------------------------------------------+
|                 src/spatial/h3_adjacency.ts                 |
+-------------------------------------------------------------+
| class H3AdjacencyService:                                   |
|   + findSharedBoundaryVertexPairs3D(                        |
|       verticesA: Vector3D[],                                |
|       verticesB: Vector3D[],                                |
|       epsilon?: number                                      |
|     ): BoundaryVertexPair3D[]                               |
|   + extractSharedBoundaryEdge3D(                            |
|       cellA: string,                                        |
|       verticesA: Vector3D[],                                |
|       cellB: string,                                        |
|       verticesB: Vector3D[],                                |
|       epsilon?: number                                      |
|     ): BoundaryEdge3D | null                                 |
+-------------------------------------------------------------+
                              ^
                              | (Composes)
+-------------------------------------------------------------+
|             src/spatial/spatial_flux_monad.ts               |
+-------------------------------------------------------------+
| class SpatialFluxMonad extends Monad<H3StateTensor>         |
|   - adjacencyService: H3AdjacencyService                    |
|   + computeConservativeBoundaryFlux(edge: BoundaryEdge3D)  |
+-------------------------------------------------------------+
```

### 3.2 Method Signature Specification

```typescript
export interface Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface BoundaryVertexPair3D {
  /** Index of vertex in polygon A */
  readonly indexA: number;
  /** Index of vertex in polygon B */
  readonly indexB: number;
  /** Cartesian coordinate in polygon A */
  readonly vertexA: Vector3D;
  /** Cartesian coordinate in polygon B */
  readonly vertexB: Vector3D;
  /** Euclidean distance ||vertexA - vertexB||_2 */
  readonly distance: number;
}

export interface BoundaryEdge3D {
  readonly cellA: string;
  readonly cellB: string;
  readonly pair1: BoundaryVertexPair3D;
  readonly pair2: BoundaryVertexPair3D;
  readonly edgeLength: number;
  readonly midpoint: Vector3D;
  readonly outwardNormal: Vector3D;
}
```

---

## 4. Thermodynamic & Flux Conservation Invariants

### 4.1 First Law Invariant (Zero Mass Leak on Boundary Exchange)

Any physical transport across the shared boundary between $C_A$ and $C_B$ must use the symmetric boundary length:
$$L_{AB} = \frac{1}{2} \left( \|\mathbf{p}_{i_2}^A - \mathbf{p}_{i_1}^A\| + \|\mathbf{q}_{j_2}^B - \mathbf{q}_{j_1}^B\| \right)$$
Net diffusive mass flux $J_{AB}^{mass}$ evaluated via `SpatialFluxMonad` across boundary edge $E_{AB}$:
$$J_{AB}^{mass} = -D \cdot L_{AB} \cdot h_{layer} \cdot \left( \frac{\rho_B - \rho_A}{d_{AB}} \right)$$
$$J_{BA}^{mass} = -J_{AB}^{mass}$$
$$\Delta M_A = -J_{AB}^{mass} \cdot \Delta t, \quad \Delta M_B = +J_{AB}^{mass} \cdot \Delta t \implies \Delta M_A + \Delta M_B = 0$$

By proving identical geometric support via coincident 3D vertex pairs, neither cell calculates an asymmetric edge length that could induce numerical mass accumulation or depletion.

### 4.2 Second Law Invariant (Entropy Generation)

Thermal or chemical dissipation along edge $E_{AB}$:
$$\dot{S}_{prod} = J_{AB}^{heat} \left( \frac{1}{T_B} - \frac{1}{T_A} \right) = -k \cdot A_{AB} \frac{T_B - T_A}{d_{AB}} \left( \frac{T_A - T_B}{T_A T_B} \right) = k \cdot A_{AB} \frac{(T_A - T_B)^2}{d_{AB} T_A T_B} \ge 0$$
Strict non-negativity is preserved because contact area $A_{AB} = L_{AB} \cdot h_{layer} > 0$ is strictly real and positive.

---

## 5. Algorithmic Complexity & Numerical Stability

1. **Polygon Size**: Hexagonal DGGS boundary vertex count is bounded by $m, n \le 6$.
2. **Search Complexity**: Brute-force pairwise distance matrix is $6 \times 6 = 36$ distance evaluations, running in $\mathcal{O}(1)$ constant time per cell pair.
3. **Tolerance**: Default $\epsilon = 1.0 \times 10^{-4}$ units (corresponding to sub-millimeter precision on normalized unit spheres, or $< 100$ meters on full Earth radius models $R_\oplus \approx 6.371 \times 10^6\text{ m}$).
4. **Edge Normal Collinearity**: Outward unit normal is validated via cross-product with outward radial vector $\mathbf{c}_A$, preventing inversion of advective fluxes.

---

## 6. Implementation & Test Verification Plan

- `tests/sprint_071.test.ts` will verify:
  1. Identical vertices match with zero distance and correct permutation indices.
  2. Adjacent regular hexagons on $z=0$ plane and 3D unit sphere return exactly 2 vertex pairs.
  3. Non-adjacent cells return empty pair arrays (`[]`).
  4. Vertices with distance greater than $\epsilon$ are correctly rejected.
  5. BoundaryEdge3D computes symmetric edge length and verified outward normal directed towards cell B.
  6. Conservation invariant test: 2-cell closed system mass flux yields total $\Delta M = 0.0$ to within double-precision machine epsilon ($10^{-15}$).