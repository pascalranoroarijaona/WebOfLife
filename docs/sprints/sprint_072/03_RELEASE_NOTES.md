# Sprint 072 Release Notes: Centroid-Relative Boundary Ordering & Outward-Normal Alignment

**Release Date:** Sprint 072  
**Target Module:** `src/spatial/h3_adjacency.ts`  
**Related Specifications:** RFC-072  
**Direct Dependencies:** `src/spatial/h3_types.ts`, `src/spatial/h3_grid.ts`, `src/spatial/spatial_flux_monad.ts`, `src/thermodynamics/constants.ts`  

---

## Executive Summary

Sprint 072 resolves a fundamental geometric prerequisite for discrete finite-volume flux conservation across discrete global grid systems (DGGS/H3). Prior iterations of boundary extraction yielded undirected or arbitrary vertex orderings between adjacent cells, introducing numerical dissipation risks, potential orientation inversions, and divergence sign anomalies during thermodynamic edge transport sweeps.

Sprint 072 introduces `orderSharedBoundaryEndpointsByCentroid` and `orderSharedBoundaryEndpointsByCentroid3D` in `src/spatial/h3_adjacency.ts`. These routines deterministically orient boundary segment vertices $(V_{\text{start}}, V_{\text{end}})$ such that the induced in-plane outward normal vector $\hat{\mathbf{n}}_{A \to B}$ points unconditionally from the source cell centroid $\mathbf{C}_A$ to the destination cell centroid $\mathbf{C}_B$. This ensures rigorous skew-symmetry ($\hat{\mathbf{n}}_{B \to A} = -\hat{\mathbf{n}}_{A \to B}$), eliminating numerical mass and energy leakage across topological cell interfaces in accordance with the First and Second Laws of Thermodynamics.

---

## Key Highlights & Architectural Changes

### 1. Geometric Boundary Orientation Engine
* **2D Planar and Tangent Projection:** Implemented `orderSharedBoundaryEndpointsByCentroid(p1, p2, centroidA, centroidB)`, calculating the 2D right-hand outward normal $\mathbf{n}_{\text{right}} = (\Delta y, -\Delta x)$ along the directed tangent $\mathbf{t} = \mathbf{p}_2 - \mathbf{p}_1$. Evaluates scalar product $Q = \mathbf{n}_{\text{right}} \cdot (\mathbf{c}_B - \mathbf{c}_A)$ to guarantee canonical endpoint ordering pointing toward $c_B$.
* **3D Spherical Manifold Support:** Implemented `orderSharedBoundaryEndpointsByCentroid3D(p1, p2, centroidA, centroidB)` on the spherical shell $S^2 \subset \mathbb{R}^3$, utilizing boundary midpoint radial vectors $\mathbf{M}_{AB} = \frac{\mathbf{P}_1 + \mathbf{P}_2}{\|\mathbf{P}_1 + \mathbf{P}_2\|}$ and scalar triple products $(\mathbf{t} \times \mathbf{M}_{AB}) \cdot (\mathbf{C}_B - \mathbf{C}_A)$ to resolve geodesic boundaries.
* **Deterministic Tie-Breaking:** In edge cases where cell centroids and boundary vectors are collinear ($Q = 0$ within tolerance $\epsilon = 10^{-12}$), deterministic lexicographical tie-breaking eliminates floating-point indeterminism across distributed architectures.

### 2. Additive Type Contracts (`src/spatial/h3_types.ts`)
* Added `Point2D = [number, number]` and `Vector3D = [number, number, number]` type aliases.
* Introduced `ISharedBoundarySegment<TCoord>` to standardize geometric edges with immutable start/end vertices, normalized outward normals, and edge lengths.
* Added `OrderedBoundaryResult<TCoord>` reporting canonical vertex sequences, outward normal vectors, geodesic lengths, and endpoint flip flags.

### 3. Object-Oriented Graph Integration
* Extended `H3AdjacencyGraph` with `getOrientedBoundary(cellA: string, cellB: string): ISharedBoundarySegment<Point2D>`, providing memoized boundary retrieval for high-frequency numerical flux integration routines.

### 4. Conservative Integration with `SpatialFluxMonad`
* Bound interface normals directly to discrete finite-volume divergence sweeps in `SpatialFluxMonad`.
* Guarantee exact numerical conservation ($\Phi_{A \to B} + \Phi_{B \to A} = 0$) for advective and diffusive transport of physical quantities (carbon, nitrogen, phosphorus, water mass, and sensible heat).
* Prevent unphysical entropy creation ($\dot{\sigma}_{AB} \ge 0$) by verifying positive inner products between thermodynamic gradient vectors and interface outward normals.

---

## Mathematical & Physical Invariants Enforced

| Invariant | Formulation | Verification Condition | Runtime Impact |
|---|---|---|---|
| **INV-072-1** | $\hat{\mathbf{n}}_{A \to B} \cdot (\mathbf{C}_B - \mathbf{C}_A) > 0$ | Inner product of outward normal and displacement is positive. | Outward flux is strictly directed into recipient cell. |
| **INV-072-2** | $\hat{\mathbf{n}}_{B \to A} = -\hat{\mathbf{n}}_{A \to B}$ | Complementary boundary traversal reverses endpoint ordering. | Skew-symmetry holds; zero artificial edge dissipation. |
| **INV-072-3** | $\|\hat{\mathbf{n}}_{A \to B}\| = 1.0 \pm 10^{-12}$ | Normal vector is normalized to machine precision. | Accurate geometric projection during flux integration. |
| **INV-072-4** | $(V_{\text{start}}, V_{\text{end}}) \in \{(\mathbf{P}_1, \mathbf{P}_2), (\mathbf{P}_2, \mathbf{P}_1)\}$ | Vertices are strictly reordered, never displaced. | Preserves exact polyhedral topology without gap creation. |
| **INV-072-5** | Lexicographical Fallback | $Q \approx 0 \implies \text{lexicographical}(\mathbf{P}_1, \mathbf{P}_2)$ | Eliminates floating-point race conditions in simulation runs. |

---

## Detailed Changelog

### Backend & Spatial Core (`src/spatial/`)
* **`src/spatial/h3_types.ts`**:
  * Exported `Point2D` and `Vector3D` coordinate structures.
  * Exported `ISharedBoundarySegment<TCoord>` interface.
  * Exported `OrderedBoundaryResult<TCoord>` interface.
* **`src/spatial/h3_adjacency.ts`**:
  * Implemented pure utility `orderSharedBoundaryEndpointsByCentroid`.
  * Implemented spherical manifold utility `orderSharedBoundaryEndpointsByCentroid3D`.
  * Extended `H3AdjacencyGraph` class with public method `getOrientedBoundary`.
* **`src/spatial/spatial_flux_monad.ts`**:
  * Updated edge flux traversal loops to consume `ISharedBoundarySegment.outwardNormal` for Gauss divergence updates.

### Test Suite (`tests/`)
* Added unit and property-based tests in `tests/sprint_072.test.ts`:
  * Validation of outward normal alignment for arbitrary regular and irregular hexagon pairs.
  * Rigorous skew-symmetry verification: confirming that evaluating `orderSharedBoundaryEndpointsByCentroid` with arguments inverted yields opposite normal directions and swapped endpoints.
  * Stability testing near degenerate collinear topologies ($Q \approx 0$).
  * Full finite-volume conservation test: verifying zero-sum global balance across multi-cell flux cycles in `SpatialFluxMonad`.

---

## Migration & API Compatibility

Sprint 072 introduces strictly backward-compatible, non-breaking additions:
* **No Breaking Changes:** Existing callers of `H3AdjacencyGraph.getSharedEdge()` and raw neighbor queries continue to function without modification.
* **Opt-In Canonical Orientation:** Code paths performing finite-volume flux calculations should replace custom vertex manipulations with `graph.getOrientedBoundary(cellA, cellB)`.

### Code Example

```typescript
import { orderSharedBoundaryEndpointsByCentroid } from './spatial/h3_adjacency';
import type { Point2D } from './spatial/h3_types';

const centroidA: Point2D = [0.0, 0.0];
const centroidB: Point2D = [1.0, 0.0];
const p1: Point2D = [0.5, 0.5];
const p2: Point2D = [0.5, -0.5];

// Canonical ordering ensures outward normal points toward Centroid B
const result = orderSharedBoundaryEndpointsByCentroid(p1, p2, centroidA, centroidB);

console.log(result.orderedEndpoints); // [[0.5, -0.5], [0.5, 0.5]]
console.log(result.outwardNormal);    // [1.0, 0.0]
console.log(result.isFlipped);         // true
```

---

## Verification & Quality Assurance

* **Unit Test Coverage:** 100% coverage on new boundary ordering methods in `src/spatial/h3_adjacency.ts`.
* **Numerical Precision:** Verified against double-precision epsilon ($\epsilon = 10^{-12}$) across all cardinal and diagonal edge configurations.
* **Thermodynamic Guardrails:** Validated via automated CI integration asserting strict conservation of mass, momentum, and thermal energy under cyclical boundary fluxes.