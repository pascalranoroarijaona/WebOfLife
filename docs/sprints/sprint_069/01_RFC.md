# RFC-069: Cartesian 3D Boundary Vertex Extraction for Discrete Global Grid Adjacency (`extractH3BoundaryCartesianVertices3D`)

- **Status**: Proposed
- **Author**: Chief Systems Architect, Web of Life Core Architecture Team
- **Date**: March 30, 2025
- **Sprint**: 069
- **Domain**: Spatial Geometry / Discrete Global Grid System (DGGS) / Adjacency Topology
- **Target Source Module**: `src/spatial/h3_adjacency.ts`
- **Related Modules**: `src/spatial/h3_types.ts`, `src/spatial/h3_grid.ts`, `src/spatial/h3_state_tensor.ts`, `src/monads/spatial_monad.ts`

---

## 1. Executive Summary & Sprint Goal

### 1.1 Sprint Goal
Implement `extractH3BoundaryCartesianVertices3D` converting boundary geodetic coordinates (latitude/longitude pairs) into Cartesian unit coordinates $(x, y, z) \in \mathbb{S}^2 \subset \mathbb{R}^3$ within `src/spatial/h3_adjacency.ts`.

### 1.2 Motivation & Architectural Context
In Web of Life, planetary biosphere and thermodynamic monads operate over a discrete global hexagonal/pentagonal tessellation governed by the Uber H3 indexing scheme. Up to Sprint 068, topological adjacency graphs tracked scalar neighbor indices and edge weights. However, flux simulations (advection, atmospheric vapor drift, oceanic currents, and biological dispersion) require rigorous geometric edge vectors, boundary normals, and 3D geometric cross-sections.

Geodetic coordinates $(\phi, \lambda)$ expressed in spherical coordinates exhibit singularities at poles and metric distortions under Euclidean distance operations. By extracting cell boundaries directly as sequences of normalized 3D Cartesian vectors $\mathbf{v}_k = [x_k, y_k, z_k]^T$ on the unit sphere ($\|\mathbf{v}_k\| = 1$), the simulation achieves:
1. Singularity-free differential vector operations across cell interfaces (e.g., surface normal computing, polygon winding checks, directed boundary flux cross-products).
2. Direct composability with WebGL/Three.js rendering pipelines without intermediate re-projections.
3. Strict conservation of interfacial transport surfaces required by First Law mass-energy monads.

---

## 2. Mathematical & Geometric Formulation

### 2.1 Spherical Geodetic to Cartesian Conversion
Let an H3 boundary vertex be given in geodetic coordinates $(\phi, \lambda)$, where $\phi \in [-\frac{\pi}{2}, \frac{\pi}{2}]$ denotes geodetic latitude and $\lambda \in [-\pi, \pi]$ denotes geodetic longitude.

For a spherical planetary surface of unit radius $R = 1$, the right-handed Cartesian coordinate triplet $(x, y, z)$ is defined by:
$$
\begin{aligned}
x &= \cos(\phi) \cdot \cos(\lambda) \\
y &= \cos(\phi) \cdot \sin(\lambda) \\
z &= \sin(\phi)
\end{aligned}
$$
where:
- $\hat{x}$ points to $(0^\circ\text{ N}, 0^\circ\text{ E})$ (the intersection of the Equator and Prime Meridian),
- $\hat{y}$ points to $(0^\circ\text{ N}, 90^\circ\text{ E})$,
- $\hat{z}$ points to $(90^\circ\text{ N}, 0^\circ\text{ E})$ (the Geographic North Pole).

Each vertex $\mathbf{v}$ satisfies:
$$
\|\mathbf{v}\|_2 = \sqrt{x^2 + y^2 + z^2} = 1 \pm \varepsilon_{\text{machine}}
$$

### 2.2 Boundary Topology and Winding Consistency
For any valid H3 cell index (hexagonal or pentagonal):
- Hexagons possess 6 exterior boundary vertices ($k \in \{0, 1, 2, 3, 4, 5\}$).
- Pentagons possess 5 exterior boundary vertices ($k \in \{0, 1, 2, 3, 4\}$).
- The boundary loop forms a closed spherical polygon. Vertex sequences extracted by `extractH3BoundaryCartesianVertices3D` follow counter-clockwise (CCW) orientation when viewed from the exterior (radially outward from the planetary center $\mathbf{O} = [0, 0, 0]^T$).
- An optional loop closure parameter ensures either an open polygon sequence of length $N$ or a closed loop of length $N+1$ where $\mathbf{v}_N = \mathbf{v}_0$.

---

## 3. Interface Contracts & Type System

### 3.1 Type Definitions (`src/spatial/h3_types.ts` / `src/spatial/h3_adjacency.ts`)

```typescript
/**
 * 3D Cartesian vector representing a coordinate on the unit sphere (||v|| = 1).
 */
export interface Cartesian3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Ordered sequence of 3D Cartesian vertices delineating the boundary of an H3 cell.
 */
export interface H3BoundaryCartesian3D {
  /** Target H3 cell index string */
  readonly h3Index: string;
  /** Number of unique vertices (6 for hexagons, 5 for pentagons) */
  readonly vertexCount: number;
  /** Array of normalized unit Cartesian coordinates */
  readonly vertices: readonly Cartesian3D[];
  /** Flag indicating whether the last vertex explicitly mirrors the first vertex */
  readonly isClosed: boolean;
  /** Computed centroid in Cartesian 3D coordinates */
  readonly centroid: Cartesian3D;
}

/**
 * Options for extracting 3D Cartesian boundaries.
 */
export interface CartesianBoundaryOptions {
  /** If true, appends the starting vertex to the end of the array (length = N + 1) */
  readonly closeLoop?: boolean;
  /** Scaling radius (defaults to 1.0 for unit sphere; earth radius R_EARTH_METERS can be applied) */
  readonly radius?: number;
}
```

### 3.2 Method Signature (`src/spatial/h3_adjacency.ts`)

```typescript
/**
 * Extracts the boundary coordinates of an H3 cell and projects them into 3D Cartesian coordinates.
 *
 * @param h3Index - Hexagonal/Pentagonal cell index string.
 * @param options - Projection and closure configuration options.
 * @returns Immutable H3BoundaryCartesian3D containing normalized 3D vertices and centroid.
 * @throws Error if h3Index is invalid or H3 cell boundary extraction fails.
 */
export function extractH3BoundaryCartesianVertices3D(
  h3Index: string,
  options?: CartesianBoundaryOptions
): H3BoundaryCartesian3D;
```

---

## 4. Class Hierarchy & Incremental Object-Oriented Design

```
+-------------------------------------------------------------+
|                     SpatialGeometryBridge                   |
|  (Pure geometric conversion utilities: lat/lng -> Cartesian) |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                      H3BoundaryProjector                    |
|  - converts geodetic H3 cell boundaries to 3D Cartesian     |
|  - verifies unit sphere norm invariants                     |
|  - enforces counter-clockwise loop topological integrity    |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                      H3AdjacencyGraph                       |
|  - extracts spatial adjacency topologies                    |
|  - computes directed edge normals and interfacial lengths   |
|  - delegates to extractH3BoundaryCartesianVertices3D        |
+-------------------------------------------------------------+
```

### 4.1 Incremental Integration Plan
1. **Module Scope**: The core function `extractH3BoundaryCartesianVertices3D` is placed in `src/spatial/h3_adjacency.ts` alongside existing adjacency relation extractors, maintaining high cohesion.
2. **Reusability**: Downstream modules (`H3AdjacencyGraph`, `SpatialMonad`, `H3StateTensor`) can consume Cartesian vertices without invoking the underlying H3 C-transpiled lat/lng calls repeatedly, caching boundary structures in the spatial grid registry.

---

## 5. Thermodynamic Compliance & Conservation Mechanics

Boundary geometry is not merely visual: it dictates interfacial transport across the discrete global grid.

### 5.1 First Law: Conservation of Matter & Interfacial Flux
Given adjacent cells $A$ and $B$ sharing an edge defined by Cartesian vertices $\mathbf{v}_1, \mathbf{v}_2$, the directed interface segment vector is:
$$
\mathbf{e}_{AB} = \mathbf{v}_2 - \mathbf{v}_1
$$
The interface mid-vector $\mathbf{m}_{AB} = \frac{\mathbf{v}_1 + \mathbf{v}_2}{\|\mathbf{v}_1 + \mathbf{v}_2\|}$ and the radial surface normal $\hat{\mathbf{n}}_{\text{rad}} = \mathbf{m}_{AB}$ define the outward normal to cell $A$:
$$
\hat{\mathbf{n}}_{AB} = \frac{\mathbf{e}_{AB} \times \hat{\mathbf{n}}_{\text{rad}}}{\|\mathbf{e}_{AB} \times \hat{\mathbf{n}}_{\text{rad}}\|}
$$
The advective mass flux $J_{M, AB}$ across edge $AB$ must satisfy:
$$
J_{M, AB} = -J_{M, BA}
$$
Having exact Cartesian vertices guarantees that the shared edge computed for cell $A$ has exact geometric congruence with the shared edge computed for cell $B$:
$$
\mathbf{e}_{BA} = -\mathbf{e}_{AB} \implies \hat{\mathbf{n}}_{BA} = -\hat{\mathbf{n}}_{AB}
$$
ensuring machine-level conservation ($\sum_{\text{edges}} J_{M} = 0$ in the absence of net storage change).

### 5.2 Second Law: Entropy Generation in Spatial Transport
Dissipative flux between neighboring cells generates entropy:
$$
\dot{S}_{\text{transport}} = \frac{J_{Q, AB}^2}{\kappa \cdot L_{AB}} \ge 0
$$
where geodesic edge distance $L_{AB} = \arccos(\mathbf{v}_1 \cdot \mathbf{v}_2)$ is evaluated directly via the scalar product of normalized Cartesian boundary vertices, avoiding spherical trigonometric approximations.

---

## 6. Implementation Specification (`src/spatial/h3_adjacency.ts`)

```typescript
export function extractH3BoundaryCartesianVertices3D(
  h3Index: string,
  options: CartesianBoundaryOptions = {}
): H3BoundaryCartesian3D {
  if (!h3Index || typeof h3Index !== 'string') {
    throw new Error(`Invalid H3 index: ${h3Index}`);
  }

  const closeLoop = options.closeLoop ?? false;
  const radius = options.radius ?? 1.0;

  if (radius <= 0 || !Number.isFinite(radius)) {
    throw new Error(`Invalid radius: ${radius}. Must be a finite positive number.`);
  }

  // Retrieve raw lat/lng boundary from h3-js or existing H3 grid wrapper
  // h3.cellToBoundary returns Array<[lat, lng]> in degrees or radians depending on configuration
  const rawBoundary = getCellBoundaryLatLng(h3Index);
  const n = rawBoundary.length;

  if (n !== 5 && n !== 6) {
    throw new Error(`Malformed H3 boundary for cell ${h3Index}: expected 5 or 6 vertices, got ${n}`);
  }

  const vertices: Cartesian3D[] = new Array(closeLoop ? n + 1 : n);
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;

  for (let i = 0; i < n; i++) {
    const [latDeg, lngDeg] = rawBoundary[i];
    const phi = (latDeg * Math.PI) / 180.0;
    const lambda = (lngDeg * Math.PI) / 180.0;

    const cosPhi = Math.cos(phi);
    const x = radius * cosPhi * Math.cos(lambda);
    const y = radius * cosPhi * Math.sin(lambda);
    const z = radius * Math.sin(phi);

    vertices[i] = { x, y, z };
    sumX += x;
    sumY += y;
    sumZ += z;
  }

  if (closeLoop) {
    vertices[n] = { ...vertices[0] };
  }

  // Normalized centroid
  const normC = Math.sqrt(sumX * sumX + sumY * sumY + sumZ * sumZ);
  const centroid: Cartesian3D = normC > 0 
    ? { x: (sumX / normC) * radius, y: (sumY / normC) * radius, z: (sumZ / normC) * radius }
    : { x: 0, y: 0, z: radius };

  return {
    h3Index,
    vertexCount: n,
    vertices: Object.freeze(vertices),
    isClosed: closeLoop,
    centroid: Object.freeze(centroid)
  };
}
```

---

## 7. Verification & Invariant Constraints

1. **Unit Length Invariant**: For default $R = 1.0$, for all $i \in [0, N-1]$,
   $$|\|\mathbf{v}_i\|_2 - 1.0| < 10^{-12}$$
2. **Vertex Count Invariant**:
   - For resolution $r \in [0, 15]$ hexagons: `vertexCount === 6`.
   - For resolution $r \in [0, 15]$ pentagons: `vertexCount === 5`.
   - When `closeLoop === true`, `vertices.length === vertexCount + 1` and `vertices[0] == vertices[vertexCount]`.
3. **Centroid Collinearity Invariant**:
   The computed centroid vector must point in the same direction as the H3 cell center $(\phi_c, \lambda_c)$ transformed to Cartesian coordinates, within angular tolerance $\theta < 0.05 \text{ rad}$.
4. **Edge Symmetry**:
   Vertices of shared interfaces between neighbor cells must match within double precision numerical precision.

---

## 8. Summary of Sprint Deliverables
- Implementation of `extractH3BoundaryCartesianVertices3D` in `src/spatial/h3_adjacency.ts`.
- Export of `Cartesian3D`, `H3BoundaryCartesian3D`, and `CartesianBoundaryOptions` interfaces in `src/spatial/h3_adjacency.ts` and `src/spatial/h3_types.ts`.
- Unit and property-based test suites in `tests/sprint_069.test.ts`.