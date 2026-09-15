# RFC-072: Centroid-Relative Ordering and Outward-Normal Orientation of Shared Cell Boundaries

**Status:** Proposed  
**Author:** Chief Systems Architect, Web of Life Core Architecture Team  
**Date:** Sprint 072  
**Target File:** `src/spatial/h3_adjacency.ts`  
**Dependencies:** `src/spatial/h3_types.ts`, `src/spatial/h3_grid.ts`, `src/spatial/spatial_flux_monad.ts`, `src/thermodynamics/constants.ts`  

---

## 1. Executive Summary and Sprint Goal

### 1.1 Sprint Goal
Implement `orderSharedBoundaryEndpointsByCentroid`, orienting shared endpoints with the outward normal in `src/spatial/h3_adjacency.ts`.

### 1.2 Problem Context
In discrete global grid systems (DGGS) based on hierarchical hexagonal partitioning (H3), neighboring polyhedral cells $c_A$ and $c_B$ share a one-dimensional boundary manifold (geodesic arc or line segment) bounded by two topological vertices, $P_1$ and $P_2$. 

For conservative finite-volume flux computations—governed by the discrete Gauss Divergence Theorem—evaluating directional advective, diffusive, and trophic fluxes between $c_A$ and $c_B$ requires a canonical, deterministic boundary orientation:
1. The boundary segment must be directed from a starting endpoint $V_{\text{start}}$ to an ending endpoint $V_{\text{end}}$.
2. The directed tangent vector $\mathbf{t} = V_{\text{end}} - V_{\text{start}}$, when combined with the surface normal $\hat{\mathbf{r}}$ of the planetary sphere, defines an in-plane outward normal vector $\hat{\mathbf{n}}_{A \to B}$.
3. The outward normal $\hat{\mathbf{n}}_{A \to B}$ must strictly point from the source cell centroid $\mathbf{C}_A$ toward the neighboring cell centroid $\mathbf{C}_B$, satisfying $\hat{\mathbf{n}}_{A \to B} \cdot (\mathbf{C}_B - \mathbf{C}_A) > 0$.
4. Antisymmetry must hold identically: $\hat{\mathbf{n}}_{B \to A} = -\hat{\mathbf{n}}_{A \to B}$, guaranteeing zero numerical mass/energy leakage across the interface ($\Phi_{A \to B} + \Phi_{B \to A} = 0$).

Prior implementations lacked a canonical centroid-referenced endpoint sorting routine, risking orientation inversions, sign flip errors in finite-volume divergence tensors, and non-deterministic numerical dissipation across patch edges. This RFC formalizes `orderSharedBoundaryEndpointsByCentroid`, defining geometric data contracts, strict vector calculus formulations on $\mathbb{R}^3$ and $\mathbb{R}^2$, and thermodynamic integration into the `SpatialFluxMonad`.

---

## 2. Thermodynamic & Physical Foundations

### 2.1 First Law of Thermodynamics: Discrete Flux Conservation
Let $\mathcal{M}$ represent the spherical manifold of the biosphere. Any extensive conserved physical stock $U_k$ (e.g., sensible heat, dissolved carbon, water mass, biomass) within cell $c_A$ evolves according to the continuity equation:

$$\frac{d U_k(c_A)}{dt} = \mathcal{S}_k(c_A) - \sum_{c_B \in \mathcal{N}(c_A)} \Phi_k(c_A \to c_B)$$

where $\mathcal{S}_k(c_A)$ is the net internal source/sink (subject to strict non-creation of energy, with solar insolation being the sole external input), $\mathcal{N}(c_A)$ is the set of topological neighbors of $c_A$, and $\Phi_k(c_A \to c_B)$ is the flux integrated across the shared boundary $\Gamma_{AB} = \partial c_A \cap \partial c_B$.

The continuous flux across $\Gamma_{AB}$ is defined by:

$$\Phi_k(c_A \to c_B) = \int_{\Gamma_{AB}} \mathbf{F}_k \cdot \hat{\mathbf{n}}_{A \to B} \, d\ell$$

Discrete conservation requires skew-symmetry across every interface:

$$\Phi_k(c_A \to c_B) = - \Phi_k(c_B \to c_A) \quad \forall (c_A, c_B)$$

If the geometric orientation of $\Gamma_{AB}$ is inverted or inconsistently resolved between cell evaluations, $\Phi_k(c_A \to c_B) + \Phi_k(c_B \to c_A) \neq 0$, violating the First Law by synthesizing or destroying energy/mass at boundary edges. Establishing deterministic endpoint ordering based on cell centroids eliminates this class of numerical anomalies.

### 2.2 Second Law of Thermodynamics: Entropy Production Consistency
Diffusive fluxes across boundaries follow Fickian / Fourier conduction:

$$\mathbf{F}_{\text{diff}} = -D \nabla \Psi$$

where $\Psi$ represents thermodynamic potential (temperature, chemical concentration, chemical potential). The integrated entropy generation across $\Gamma_{AB}$ must remain non-negative:

$$\dot{\sigma}_{AB} = \Phi_{\text{diff}}(c_A \to c_B) \left(\frac{1}{\Psi(c_B)} - \frac{1}{\Psi(c_A)}\right) \ge 0$$

Guaranteeing that $\hat{\mathbf{n}}_{A \to B}$ points outward from $c_A$ to $c_B$ guarantees that gradient evaluations $\nabla \Psi \cdot \hat{\mathbf{n}}_{A \to B} \approx \frac{\Psi(c_B) - \Psi(c_A)}{\|\mathbf{C}_B - \mathbf{C}_A\|}$ possess the correct sign, preventing unphysical negative entropy production.

---

## 3. Mathematical Specification & Algorithmic Geometry

### 3.1 Geometric Representation
Let:
- $\mathbf{C}_A \in \mathbb{R}^3$ be the Cartesian coordinate of the centroid of cell $c_A$ on the unit sphere ($S^2 \subset \mathbb{R}^3$, $\|\mathbf{C}_A\| = 1$).
- $\mathbf{C}_B \in \mathbb{R}^3$ be the Cartesian coordinate of the centroid of neighbor cell $c_B$ ($\|\mathbf{C}_B\| = 1$).
- $\mathbf{P}_1, \mathbf{P}_2 \in \mathbb{R}^3$ be the two shared boundary endpoints (vertices) satisfying $\mathbf{P}_1 \ne \mathbf{P}_2$ and $\|\mathbf{P}_1\| = \|\mathbf{P}_2\| = 1$.

For planar projections or 2D geodetic systems (longitude $\lambda$, latitude $\phi$), let:
- $\mathbf{c}_A, \mathbf{c}_B \in \mathbb{R}^2$.
- $\mathbf{p}_1, \mathbf{p}_2 \in \mathbb{R}^2$.

### 3.2 3D Spherical Manifold Formulation
On the unit sphere $S^2$, the boundary segment between $\mathbf{P}_1$ and $\mathbf{P}_2$ is a great circle arc.
1. The midpoint vector of the boundary is:
   $$\mathbf{M}_{AB} = \frac{\mathbf{P}_1 + \mathbf{P}_2}{\|\mathbf{P}_1 + \mathbf{P}_2\|}$$
2. For an ordered pair $(\mathbf{V}_{\text{start}}, \mathbf{V}_{\text{end}})$, the directed tangent vector along the chord/arc is:
   $$\mathbf{t} = \mathbf{V}_{\text{end}} - \mathbf{V}_{\text{start}}$$
3. The outward normal to the boundary on the tangent plane of the sphere at $\mathbf{M}_{AB}$, directed counter-clockwise relative to the radial vector $\mathbf{M}_{AB}$, is given by the cross product:
   $$\mathbf{n}_{AB} = \mathbf{t} \times \mathbf{M}_{AB}$$
4. The displacement vector between centroids is:
   $$\mathbf{d}_{AB} = \mathbf{C}_B - \mathbf{C}_A$$
5. The outward orientation test evaluates the scalar triple product:
   $$\Theta(\mathbf{V}_{\text{start}}, \mathbf{V}_{\text{end}}) = \mathbf{n}_{AB} \cdot \mathbf{d}_{AB} = (\mathbf{t} \times \mathbf{M}_{AB}) \cdot \mathbf{d}_{AB}$$
   - If $\Theta(\mathbf{P}_1, \mathbf{P}_2) > 0$, the ordering $(\mathbf{V}_{\text{start}}, \mathbf{V}_{\text{end}}) = (\mathbf{P}_1, \mathbf{P}_2)$ has its outward normal pointing toward $c_B$.
   - If $\Theta(\mathbf{P}_1, \mathbf{P}_2) < 0$, the endpoints must be inverted: $(\mathbf{V}_{\text{start}}, \mathbf{V}_{\text{end}}) = (\mathbf{P}_2, \mathbf{P}_1)$.
   - If $|\Theta(\mathbf{P}_1, \mathbf{P}_2)| < \epsilon$ (collinear degeneracy), fallback to the primary centroid-offset projection: $(\mathbf{P}_2 - \mathbf{P}_1) \cdot \mathbf{d}_{AB}^{\perp}$.

### 3.3 2D Planar / Lat-Lon Tangent Plane Formulation
In standard 2D Cartesian or locally projected coordinates:
1. Let directed segment $\mathbf{t} = \mathbf{p}_2 - \mathbf{p}_1 = (\Delta x, \Delta y)$.
2. By right-hand convention, traversing the boundary of $c_A$ counter-clockwise places the interior of $c_A$ on the left and the exterior (toward $c_B$) on the right.
3. The right-hand normal vector pointing outward from $c_A$ is:
   $$\mathbf{n}_{\text{right}} = (\Delta y, -\Delta x)$$
4. The centroid difference vector is:
   $$\mathbf{d} = \mathbf{c}_B - \mathbf{c}_A = (C_{B,x} - C_{A,x},\, C_{B,y} - C_{A,y})$$
5. The orientation indicator is:
   $$Q = \mathbf{n}_{\text{right}} \cdot \mathbf{d} = \Delta y (C_{B,x} - C_{A,x}) - \Delta x (C_{B,y} - C_{A,y})$$
   - If $Q > 0$, the ordered pair $(\mathbf{p}_1, \mathbf{p}_2)$ already generates an outward normal directed toward $c_B$.
   - If $Q < 0$, the endpoints must be reversed: $(\mathbf{p}_2, \mathbf{p}_1)$.
   - If $Q = 0$, the points are collinear with the centroid line; we break ties deterministically using lexicographical coordinate ordering.

```
       Cell c_A                       Cell c_B
      (Centroid A)                   (Centroid B)
           •----------------------------->•
          C_A            d_AB            C_B
                          |
                          |  ^ Outward Normal n_AB
                          |  |
             V_start •----+----+----• V_end
                          t --->
```

---

## 4. Class Hierarchy & Interface Additions

The design follows our strict object-oriented and incremental paradigm. Existing adjacency structures in `src/spatial/h3_adjacency.ts` and `src/spatial/h3_types.ts` are extended via non-breaking composite interfaces and functional decorators.

### 4.1 Interface Definitions in `src/spatial/h3_types.ts`

```typescript
/**
 * 2D coordinate representation [longitude, latitude] or [x, y].
 */
export type Point2D = [number, number];

/**
 * 3D coordinate vector on unit sphere [x, y, z].
 */
export type Vector3D = [number, number, number];

/**
 * Represents a boundary segment between two adjacent spatial cells.
 */
export interface ISharedBoundarySegment<TCoord = Point2D> {
  /** First vertex in outward-normal canonical order (V_start) */
  readonly start: TCoord;
  /** Second vertex in outward-normal canonical order (V_end) */
  readonly end: TCoord;
  /** Unit outward normal vector pointing from source to neighbor */
  readonly outwardNormal: TCoord;
  /** Geodesic or Euclidean length of the shared edge */
  readonly length: number;
}

/**
 * Result structure of centroid-based endpoint ordering.
 */
export interface OrderedBoundaryResult<TCoord = Point2D> {
  readonly orderedEndpoints: [TCoord, TCoord];
  readonly outwardNormal: TCoord;
  readonly length: number;
  readonly isFlipped: boolean;
}
```

### 4.2 Core Functional Specification in `src/spatial/h3_adjacency.ts`

```typescript
/**
 * Orders shared boundary endpoints between cell A and cell B such that
 * the tangential traversal from V_start to V_end produces an outward normal
 * pointing unambiguously from centroid A to centroid B.
 *
 * @param p1 First shared vertex [x, y]
 * @param p2 Second shared vertex [x, y]
 * @param centroidA Centroid of source cell A [x, y]
 * @param centroidB Centroid of neighbor cell B [x, y]
 * @returns OrderedBoundaryResult containing canonically ordered endpoints and outward normal.
 */
export function orderSharedBoundaryEndpointsByCentroid(
  p1: Point2D,
  p2: Point2D,
  centroidA: Point2D,
  centroidB: Point2D
): OrderedBoundaryResult<Point2D>;

/**
 * 3D spherical version of boundary endpoint ordering on S^2.
 *
 * @param p1 First vertex on S^2 [x, y, z]
 * @param p2 Second vertex on S^2 [x, y, z]
 * @param centroidA Centroid of cell A on S^2 [x, y, z]
 * @param centroidB Centroid of cell B on S^2 [x, y, z]
 * @returns OrderedBoundaryResult<Vector3D>
 */
export function orderSharedBoundaryEndpointsByCentroid3D(
  p1: Vector3D,
  p2: Vector3D,
  centroidA: Vector3D,
  centroidB: Vector3D
): OrderedBoundaryResult<Vector3D>;
```

### 4.3 Object-Oriented Incremental Class Extensions

`H3AdjacencyGraph` in `src/spatial/h3_adjacency.ts` will be extended with the method `getOrientedBoundary(cellA: string, cellB: string): ISharedBoundarySegment<Point2D>`:

```typescript
export class H3AdjacencyGraph {
  // Existing graph adjacency members...

  /**
   * Retrieves or computes the canonically oriented shared boundary segment between two adjacent cells.
   * Caches results to guarantee O(1) retrieval during high-frequency flux integration steps.
   */
  public getOrientedBoundary(cellA: string, cellB: string): ISharedBoundarySegment<Point2D> {
    const rawEdge = this.getSharedEdge(cellA, cellB);
    const centroidA = this.getCellCentroid(cellA);
    const centroidB = this.getCellCentroid(cellB);

    const ordered = orderSharedBoundaryEndpointsByCentroid(
      rawEdge.vertices[0],
      rawEdge.vertices[1],
      centroidA,
      centroidB
    );

    return {
      start: ordered.orderedEndpoints[0],
      end: ordered.orderedEndpoints[1],
      outwardNormal: ordered.outwardNormal,
      length: ordered.length,
    };
  }
}
```

---

## 5. Algorithmic Invariants & Verification Matrix

| Invariant ID | Mathematical Statement | Verification Condition | Thermodynamic Consequence |
|---|---|---|---|
| **INV-072-1** | $\hat{\mathbf{n}}_{A \to B} \cdot (\mathbf{C}_B - \mathbf{C}_A) > 0$ | Dot product of outward normal and centroid displacement is strictly positive. | Flux leaving cell A is directed toward cell B, eliminating inverted divergence. |
| **INV-072-2** | $\hat{\mathbf{n}}_{B \to A} = -\hat{\mathbf{n}}_{A \to B}$ | Boundary orientation from B to A swaps $V_{\text{start}} \leftrightarrow V_{\text{end}}$. | Skew-symmetric interface flux; exact zero-sum mass and energy conservation. |
| **INV-072-3** | $\|\hat{\mathbf{n}}_{A \to B}\| = 1.0 \pm 10^{-12}$ | Normal vector is normalized to unit Euclidean length. | Metric surface integration preserves geometric scale without numerical distortion. |
| **INV-072-4** | $(V_{\text{start}}, V_{\text{end}}) \in \{(\mathbf{P}_1, \mathbf{P}_2), (\mathbf{P}_2, \mathbf{P}_1)\}$ | Endpoints are strictly permuted, never mutated or drifted. | Metric conservation; no synthetic topological gaps or edge deformation. |
| **INV-072-5** | Deterministic Tie-Breaking | In case of orthogonal neutrality ($Q = 0$), canonical lexicographical order is chosen. | Total determinism across distributed node executions without floating-point race conditions. |

---

## 6. Monad Integration: State & Stock Transitions

The `SpatialFluxMonad` in `src/spatial/spatial_flux_monad.ts` integrates fluxes across edges. The canonical ordering introduced in this sprint guarantees strict balance:

```typescript
// Integration pattern within SpatialFluxMonad
const boundary = adjacencyGraph.getOrientedBoundary(sourceCell, targetCell);

// Flux computed using outward normal
const fluxMagnitude = computeInterfaceFlux(sourceState, targetState, boundary.outwardNormal);

// Symmetric update:
// sourceCell loses flux * dt * boundary.length
// targetCell gains flux * dt * boundary.length
// Net sum across edge == 0 (Strict Matter & Energy Conservation)
```

No stock creation or destruction is permitted. Boundary endpoint ordering provides the directional sign for:
- Advective flux of carbon, nitrogen, and phosphorus.
- Hydrodynamic water transport across hexagonal tessellations.
- Thermal conduction across planetary biomes.

---

## 7. Migration & Backward Compatibility

1. **Non-Breaking Signature:** Existing callers of `H3AdjacencyGraph` that query undirected edges retain existing behavior; `getOrientedBoundary` and `orderSharedBoundaryEndpointsByCentroid` are pure additive functions.
2. **Pure Functional Implementation:** `orderSharedBoundaryEndpointsByCentroid` operates on immutable primitives `[number, number]`, maintaining compatibility with both node.js engine loops and browser web workers.
3. **Floating Point Robustness:** Epsilon thresholds ($\epsilon = 10^{-12}$) protect against numerical instability near machine precision.

---

## 8. Implementation Plan & Deliverables

1. **RFC:** `docs/sprints/sprint_072/01_RFC.md` (This document).
2. **Types & Implementation:**
   - Update `src/spatial/h3_types.ts` with `Point2D`, `Vector3D`, `ISharedBoundarySegment`, and `OrderedBoundaryResult`.
   - Implement `orderSharedBoundaryEndpointsByCentroid` and `orderSharedBoundaryEndpointsByCentroid3D` in `src/spatial/h3_adjacency.ts`.
   - Update `H3AdjacencyGraph` to support oriented boundaries.
3. **Test Suite:** `tests/sprint_072.test.ts` verifying all invariants:
   - Positive dot product orientation test.
   - Antisymmetric inversion test ($A \to B$ vs $B \to A$).
   - Unit length normal verification.
   - Conservation in `SpatialFluxMonad` edge sweeps.
4. **Documentation:** Methods, Release Notes, Audit, Preprint, Viral Storytelling, Community Guide.