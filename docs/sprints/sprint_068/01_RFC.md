# RFC-068: Shared Boundary Vertex Extraction in 3D Spherical Manifold (`extractSharedBoundaryVertices3D`)

## 1. Executive Summary

Sprint 068 specifies the architectural expansion of the Web of Life spatial topology engine in `src/spatial/h3_adjacency.ts`. Specifically, this RFC introduces `extractSharedBoundaryVertices3D`, an analytical geometric operator that extracts the shared geodesic boundary endpoints (represented as Cartesian vectors $\mathbf{v}_1, \mathbf{v}_2 \in \mathbb{R}^3$) separating any two adjacent discrete H3 spatial cells on a planetary sphere of radius $R$.

Accurate thermodynamic flux calculations—including horizontal advective transport of sensible/latent heat, atmospheric moisture diffusion, oceanic mass conservation, and trophic biomass dispersal—fundamentally depend upon geometric attributes of the boundary interface between discrete control volumes:
1. Interface geodesic length $L_{ij} = R \arccos\left(\frac{\mathbf{v}_1 \cdot \mathbf{v}_2}{R^2}\right)$,
2. Interface orientation and normal unit vector $\hat{\mathbf{n}}_{ij} \in \mathbb{R}^3$ orthogonal to the geodesic line segment on the tangent sphere,
3. Shared boundary cross-sectional exchange area $A_{ij} = L_{ij} \cdot \Delta z$.

`extractSharedBoundaryVertices3D` resolves boundary endpoints with strict spatial consistency, deterministic vertex ordering, floating-point tolerance handling, and seamless interoperability with the `SpatialAdjacencyGraph` and `SpatialMonad` state tensor pipelines.

---

## 2. Problem Statement & Motivation

### 2.1 Current Geometric Discontinuity
In Sprint 067 and prior iterations, topological neighbor relations were established via `H3AdjacencyGraph` and `getHexNeighbors`, mapping topological links between cell indices. However, inter-cell flux transport (mass, enthalpy, carbon stocks) across adjacent cells was approximated using isotropic distance between cell centroids:
$$\Phi_{ij} = -K \frac{C_j - C_i}{d_{ij}} \cdot \bar{A}$$
where $\bar{A}$ represented an idealized uniform edge length. On an icosahedral geodesic discrete global grid (H3 / DGGS), planar hexagonal tiling approximations break down:
- Pentagonal cell boundaries possess 5 edges rather than 6.
- Distortion of spherical hexagon edge lengths across icosahedral faces varies systematically by up to $\sim 15\%$.
- Without exact 3D Cartesian coordinates for the shared edge endpoints $[\mathbf{v}_1, \mathbf{v}_2]$, spatial transport cannot compute directed flux normal vectors $\hat{\mathbf{n}}_{ij} = \frac{\mathbf{x}_j - \mathbf{x}_i}{\|\mathbf{x}_j - \mathbf{x}_i\|}$ aligned precisely with the physical facet boundary.
- Visual rendering of active flux vectors, continental shelf borders, and atmospheric cell boundaries in 3D WebGL displays gaps or vertex misalignments if edges are not resolved deterministically.

### 2.2 Thermodynamic Consistency
The First Law of Thermodynamics demands rigorous conservation of energy and matter across cell interfaces:
$$\sum_{j \in \mathcal{N}(i)} J_{ij} A_{ij} + \dot{S}_i = \frac{d M_i}{dt}$$
where $J_{ij} = - J_{ji}$. Any discrepancy in shared boundary geometry between cell $i$ evaluating cell $j$ and cell $j$ evaluating cell $i$ yields asymmetrical facet areas $A_{ij} \neq A_{ji}$, creating artificial sources or sinks that violate mass-energy conservation. A canonical, order-independent vertex pair extraction algorithm guarantees $A_{ij} \equiv A_{ji}$ and $\hat{\mathbf{n}}_{ij} \equiv -\hat{\mathbf{n}}_{ji}$.

---

## 3. Mathematical & Geometric Formulation

### 3.1 Spherical Cell Boundary Representation
Let a discrete cell $c \in \mathcal{H}$ at resolution $r$ be bounded by an ordered spherical polygon $\mathcal{P}(c) = (\mathbf{u}_0, \mathbf{u}_1, \dots, \mathbf{u}_{k-1})$ where $k \in \{5, 6\}$, each vertex $\mathbf{u}_m \in \mathbb{R}^3$ lies on the sphere $S_R^2 = \{ \mathbf{x} \in \mathbb{R}^3 : \|\mathbf{x}\| = R \}$, and vertices are ordered counter-clockwise with respect to the outward radial unit normal $\hat{\mathbf{r}} = \mathbf{x}_c / \|\mathbf{x}_c\|$.

Each boundary edge of cell $c$ is a directed geodesic arc:
$$e_m(c) = (\mathbf{u}_m, \mathbf{u}_{(m+1) \bmod k})$$

### 3.2 Coincident Vertex Detection under Finite Precision
Two spherical boundary vertices $\mathbf{u} \in \mathcal{P}(c_A)$ and $\mathbf{w} \in \mathcal{P}(c_B)$ are defined as coincident if their Euclidean distance satisfies:
$$\|\mathbf{u} - \mathbf{w}\| < \epsilon_{\text{geom}}$$
where $\epsilon_{\text{geom}} = 10^{-5} \cdot R$ (or angular threshold $\theta < 10^{-5}\text{ rad}$).

### 3.3 Shared Boundary Edge
For two adjacent cells $c_A, c_B \in \mathcal{H}$ sharing a boundary, the intersection of their boundary vertex sets contains exactly two common vertices $\{\mathbf{v}_1, \mathbf{v}_2\}$ (with the exception of degenerate multi-cell apex points, where each adjacent pair shares exactly one 1D line edge bounded by two endpoints):
$$\mathcal{P}(c_A) \cap \mathcal{P}(c_B) = \{\mathbf{v}_1, \mathbf{v}_2\}$$

### 3.4 Canonical Vertex Ordering and Directed Interface Normal
To guarantee strict antisymmetry across neighbor evaluations, the extracted pair $[\mathbf{v}_1, \mathbf{v}_2]$ satisfies:
1. **Geometric Identity**: Both $\mathbf{v}_1, \mathbf{v}_2 \in S_R^2$ match corresponding vertices in both $\mathcal{P}(c_A)$ and $\mathcal{P}(c_B)$ within tolerance $\epsilon$.
2. **Directional Normal**: With respect to cell $c_A \to c_B$, the directed edge vector $\mathbf{t}_{AB} = \mathbf{v}_2 - \mathbf{v}_1$ is oriented such that the outward normal unit vector:
   $$\hat{\mathbf{n}}_{AB} = \frac{\mathbf{t}_{AB} \times \mathbf{x}_{c_A}}{\|\mathbf{t}_{AB} \times \mathbf{x}_{c_A}\|}$$
   points into the half-space containing centroid $\mathbf{x}_{c_B}$, satisfying $\hat{\mathbf{n}}_{AB} \cdot (\mathbf{x}_{c_B} - \mathbf{x}_{c_A}) > 0$.
3. **Symmetry Relation**:
   $$\hat{\mathbf{n}}_{BA} = -\hat{\mathbf{n}}_{AB}$$
   $$\text{Length}(e_{AB}) = \text{Length}(e_{BA}) = R \cdot \arccos\left(\frac{\mathbf{v}_1 \cdot \mathbf{v}_2}{R^2}\right)$$

---

## 4. Class & Architectural Design

### 4.1 Module Composition in `src/spatial/h3_adjacency.ts`

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          src/spatial/h3_types.ts                        │
│  - Vec3: [number, number, number]                                       │
│  - LatLng: { lat: number, lng: number }                                 │
│  - BoundaryEdge3D: { v1: Vec3, v2: Vec3, lengthMeters: number, ... }   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                        src/spatial/h3_adjacency.ts                      │
│                                                                         │
│  + extractSharedBoundaryVertices3D(                                     │
│      cellA: string,                                                     │
│      cellB: string,                                                     │
│      radiusMeters?: number                                              │
│    ): [Vec3, Vec3] | null                                               │
│                                                                         │
│  + class SpatialAdjacencyGraph                                          │
│    - sharedEdgeCache: Map<string, SharedBoundaryEdge3D>                 │
│    + getSharedBoundary(cellA: string, cellB: string): SharedBoundaryEdge│
│    + computeEdgeTransmissibility(cellA: string, cellB: string): number  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                        src/monads/spatial_monad.ts                      │
│  - Diffusive flux exchange across shared boundary facets                │
│  - Discrete conservative advection using exact interface normals        │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 TypeScript Type Specifications

```typescript
export type Vec3 = [number, number, number];

export interface SharedBoundaryEdge3D {
  readonly cellA: string;
  readonly cellB: string;
  readonly v1: Vec3;
  readonly v2: Vec3;
  readonly midpoint: Vec3;
  readonly normalAtoB: Vec3;
  readonly lengthMeters: number;
}
```

### 4.3 Function Signature and Implementation Contract

```typescript
/**
 * Extracts the 3D Cartesian coordinates of the two shared boundary vertices 
 * between two topological neighbor cells on a spherical planetary manifold.
 *
 * @param cellA - H3 cell index of the source cell.
 * @param cellB - H3 cell index of the candidate neighbor cell.
 * @param radius - Spherical planet radius in meters (default: EARTH_RADIUS_METERS = 6,371,008).
 * @returns A tuple of two 3D vectors [v1, v2] defining the shared edge, 
 *          or null if cells are non-adjacent or invalid.
 */
export function extractSharedBoundaryVertices3D(
  cellA: string,
  cellB: string,
  radius: number = EARTH_RADIUS_METERS
): [Vec3, Vec3] | null;
```

### 4.4 Object-Oriented Integration: `SpatialAdjacencyGraph`

The existing `SpatialAdjacencyGraph` class is extended via compositional caching:
- `private readonly edgeCache: Map<string, SharedBoundaryEdge3D>`
- Canonical edge key: `key = cellA < cellB ? `${cellA}:${cellB}` : `${cellB}:${cellA}``
- Method `getSharedEdge(cellA: string, cellB: string): SharedBoundaryEdge3D | null`
  - Retrieves cached edge or invokes `extractSharedBoundaryVertices3D`.
  - Inverts normal vector if requesting $B \to A$ orientation.

---

## 5. Algorithmic Steps

1. **Topological Adjacency Validation**:
   - Check if $c_B \in \text{grid.getNeighbors}(c_A)$. If not, return `null`.
2. **Boundary Polygon Retrieval**:
   - Query boundary vertices for $c_A$: $\mathcal{P}(c_A) = [ \mathbf{a}_0, \dots, \mathbf{a}_{k_A-1} ]$.
   - Query boundary vertices for $c_B$: $\mathcal{P}(c_B) = [ \mathbf{b}_0, \dots, \mathbf{b}_{k_B-1} ]$.
   - Convert geographic coordinates $(\text{lat}, \text{lng})$ to Cartesian 3D coordinates:
     $$x = R \cos(\phi) \cos(\lambda), \quad y = R \cos(\phi) \sin(\lambda), \quad z = R \sin(\phi)$$
3. **Coincident Vertex Matching**:
   - Identify vertices $\mathbf{a}_i \in \mathcal{P}(c_A)$ that have a coincident counterpart $\mathbf{b}_j \in \mathcal{P}(c_B)$ such that $\|\mathbf{a}_i - \mathbf{b}_j\| \le \epsilon$.
   - A valid topological edge between two spherical cells must produce exactly two coincident vertex pairs.
4. **Endpoint Resolution**:
   - Let the two shared Cartesian points be $\mathbf{p}_1, \mathbf{p}_2$.
   - Compute centroid $\mathbf{c}_A$ and candidate normal $\hat{\mathbf{n}} = \frac{(\mathbf{p}_2 - \mathbf{p}_1) \times \mathbf{c}_A}{\|(\mathbf{p}_2 - \mathbf{p}_1) \times \mathbf{c}_A\|}$.
   - Verify if $\hat{\mathbf{n}} \cdot (\mathbf{c}_B - \mathbf{c}_A) > 0$. If negative, order is reversed $[\mathbf{v}_1, \mathbf{v}_2] = [\mathbf{p}_2, \mathbf{p}_1]$ so that traversal from $\mathbf{v}_1 \to \mathbf{v}_2$ preserves the right-hand outward normal pointing from $c_A$ toward $c_B$.
5. **Return**: Tuple `[v1, v2]`.

---

## 6. Thermodynamic Compliance (First & Second Laws)

1. **First Law Conservation**:
   - Because `extractSharedBoundaryVertices3D` computes boundary vertices deterministically, the shared edge length $L_{AB} = L_{BA}$ is identical down to machine precision.
   - Fluxes calculated via finite-volume divergence:
     $$\Delta Q_A = -F_{AB} \cdot L_{AB}, \quad \Delta Q_B = +F_{AB} \cdot L_{AB}$$
     sum to zero: $\Delta Q_A + \Delta Q_B \equiv 0$. No energy or mass is created or destroyed at cell interfaces.
2. **Second Law Entropy Production**:
   - Irreversible thermal diffusion across edge $e_{AB}$:
     $$\dot{S}_{\text{irr}} = L_{AB} \Delta z \cdot \kappa \frac{(T_A - T_B)^2}{T_A T_B d_{AB}} \ge 0$$
     Non-negative entropy generation is strictly guaranteed as $L_{AB} > 0$ and $d_{AB} > 0$.

---

## 7. Verification Plan & Test Matrix (`tests/sprint_068.test.ts`)

| Test ID | Objective | Expected Outcome |
|---|---|---|
| `TC-068-01` | Shared vertices for adjacent hexagonal cells | Returns exactly 2 3D Cartesian coordinates matching both cells' boundaries within tolerance $\epsilon$. |
| `TC-068-02` | Non-adjacent cell query | Returns `null` when two disjoint cells are supplied. |
| `TC-068-03` | Self-adjacency check (`cellA === cellB`) | Returns `null` without throwing errors. |
| `TC-068-04` | Boundary edge length calculation | Edge length matches Great Circle Distance $R \arccos((\mathbf{v}_1 \cdot \mathbf{v}_2)/R^2)$. |
| `TC-068-05` | Normal vector antisymmetry | $\hat{\mathbf{n}}_{AB} \cdot \hat{\mathbf{n}}_{BA} = -1.0 \pm 10^{-7}$. |
| `TC-068-06` | Pentagonal-hexagonal neighbor boundary | Accurately extracts 2 vertices for pentagon-hexagon shared boundary interface. |
| `TC-068-07` | First Law mass balance across edge | Advection exchange across edge satisfies $\Phi_{A \to B} + \Phi_{B \to A} = 0.0$. |

---

## 8. Success Criteria

1. `extractSharedBoundaryVertices3D` implemented and exported from `src/spatial/h3_adjacency.ts`.
2. Clean mathematical separation: converts geographic boundaries to 3D Cartesian vectors with Earth radius scaling.
3. Strict zero-mass-leakage verification in adjoining unit tests.
4. Full backward-compatibility with existing `SpatialAdjacencyGraph` APIs.