# RFC-051: H3CellInterfaceMetrics Interface Specification

- **Status**: Proposed
- **Sprint Target**: sprint_051
- **Author**: Chief Systems Architect
- **Domain**: Spatial Subsystem (`src/spatial/h3_types.ts`)
- **Affects**: `src/spatial/h3_types.ts`, `src/spatial/h3_adjacency.ts`, `src/monads/spatial_monad.ts`, `src/spatial/h3_state_tensor.ts`

---

## 1. Executive Summary

As the Web of Life simulation scales spatial resolution using Uber's H3 Discrete Global Grid System (DGGS), advective, diffusive, and ecological transport mechanisms between neighboring cells require rigorous metric definitions for the boundary interfaces shared between adjacent cells.

This RFC defines the formal contract for `H3CellInterfaceMetrics` in `src/spatial/h3_types.ts`. The interface encapsulates the physical, geometric, and topological attributes of the shared boundary between adjacent H3 cells (hexagons and pentagons), including boundary edge length, centroid-to-centroid geodesic distance, contact normal vector/bearing, topographic slope gradient, and effective cross-sectional transfer area.

This metric foundation ensures strict adherence to the First and Second Laws of Thermodynamics: boundary fluxes (enthalpy, water, carbon, nutrients) calculated across the cell interface are strictly conservative (antisymmetric across pairs) and entropy-positive.

---

## 2. Problem Statement & Motivation

Prior sprints introduced the discrete spatial grid (`H3SpatialGrid`), adjacency indexing (`H3AdjacencyManager`), and state tensor structures (`H3StateTensor`). However, cross-boundary fluxes between adjacent cells $c_i$ and $c_j$ currently rely on idealized point-to-point approximations that omit:
1. Exact geodesic shared boundary lengths ($L_{ij}$).
2. Shared boundary orientation (unit normal vector $\hat{n}_{ij}$ or directional azimuth $\theta_{ij}$).
3. Topographic elevation gradients along the boundary normal ($\nabla z_{ij} = \frac{z_j - z_i}{d_{ij}}$).
4. Vertical cross-sectional contact areas ($A_{ij} = L_{ij} \cdot \Delta h$) for soil layers, surface run-off, and canopy airspaces.

Without explicit interface metrics, flux rates across cell edges cannot guarantee area-normalized conservation, resulting in spatial discretization artifacts and anisotropic dissipation errors. `H3CellInterfaceMetrics` provides the standardized type contract to parameterize all inter-cell transfer operators.

---

## 3. First and Second Law Thermodynamic Guarantees

Every transport process across an interface metric $M_{ij} = \text{metric}(c_i, c_j)$ must satisfy thermodynamic invariance:

1. **First Law (Mass and Energy Conservation)**:
   For any stock quantity $S$ (water mass $M_w$, carbon mass $M_c$, thermal energy $U$):
   $$\Phi_{i \to j}(S) = - \Phi_{j \to i}(S)$$
   The interface geometry guarantees reciprocity:
   $$L_{ij} = L_{ji}, \quad d_{ij} = d_{ji}, \quad \hat{n}_{ij} = -\hat{n}_{ji}$$
   Hence, discrete volume integration across closed cell boundaries yields zero net artificial divergence:
   $$\oint_{\partial c_i} \vec{J} \cdot d\vec{A} = \sum_{j \in \mathcal{N}(i)} \Phi_{i \to j} = 0 \quad \text{(in absence of internal sources/sinks)}$$

2. **Second Law (Non-Negative Entropy Production)**:
   Conductive and diffusive flux across the interface depends on the thermodynamic potential gradient $\Delta \mu = \mu_j - \mu_i$:
   $$\Phi_{i \to j} = - \kappa \cdot \frac{A_{ij}}{d_{ij}} (\mu_j - \mu_i)$$
   where $\kappa \ge 0$, ensuring entropy production $\dot{S}_{\text{gen}} = \Phi_{i \to j} \left( \frac{1}{T_j} - \frac{1}{T_i} \right) \ge 0$.

---

## 4. Technical Specification: Interface Definition

The interface `H3CellInterfaceMetrics` shall be declared in `src/spatial/h3_types.ts` with the following structural typing:

```typescript
/**
 * Metrics describing the shared physical and geometric interface 
 * between two topologically adjacent H3 cells.
 */
export interface H3CellInterfaceMetrics {
  /** Source cell H3 index */
  readonly originIndex: string;

  /** Destination/neighbor cell H3 index */
  readonly neighborIndex: string;

  /**
   * Geodesic length of the shared boundary edge in meters (m).
   * In spherical/ellipsoidal space, this is the length of the Voronoi edge.
   */
  readonly sharedEdgeLengthMeters: number;

  /**
   * Centroid-to-centroid geodesic distance between cells in meters (m).
   */
  readonly centroidDistanceMeters: number;

  /**
   * Azimuth / bearing from origin centroid to neighbor centroid in radians [0, 2π).
   * 0 radians points due North, π/2 East, π South, 3π/2 West.
   */
  readonly bearingRadians: number;

  /**
   * Unit normal vector in local tangent plane (East, North, Up) pointing from origin to neighbor.
   */
  readonly normalVector: readonly [number, number, number];

  /**
   * Effective cross-sectional area of contact for atmospheric boundary layer (m²).
   */
  readonly atmosphericContactAreaM2: number;

  /**
   * Effective cross-sectional area of contact for sub-surface hydrological / soil column (m²).
   */
  readonly subterraneanContactAreaM2: number;

  /**
   * Topographic slope across the interface: (elevation_neighbor - elevation_origin) / centroidDistance.
   * Positive indicates upward incline towards neighbor; negative indicates downward decline.
   */
  readonly topographicSlope: number;

  /**
   * Dimensionless geometric conductance factor: sharedEdgeLength / centroidDistance.
   * Standard scaling factor for 2D finite-volume Laplacian discretization.
   */
  readonly geometricConductance: number;
}
```

### 4.1 Supporting Utility & Companion Types

To support dynamic edge calculation and caching within `H3AdjacencyManager` and `SpatialMonad`, auxiliary types and helper functions are defined:

```typescript
/**
 * Unique identifier for a directed or undirected cell edge.
 * Format: `${origin}:${neighbor}`
 */
export type H3EdgeId = string;

/**
 * Immutable mapping of neighbor indices to their interface metrics.
 */
export type H3NeighborInterfaceMap = ReadonlyMap<string, H3CellInterfaceMetrics>;
```

---

## 5. Architectural Integration & Class Hierarchy

```
+-------------------------------------------------------------+
|                     src/spatial/h3_types.ts                  |
|  +-------------------------------------------------------+  |
|  |             interface H3CellInterfaceMetrics           |  |
|  +-------------------------------------------------------+  |
|                             ^                               |
|                             | implements / produces         |
+-----------------------------|-------------------------------+
                              |
+-----------------------------+-------------------------------+
|                 src/spatial/h3_adjacency.ts                 |
|  +-------------------------------------------------------+  |
|  | class H3AdjacencyManager                              |  |
|  |   + computeInterfaceMetrics(origin, neighbor): Metrics |  |
|  |   + getInterfaceMetrics(origin, neighbor): Metrics    |  |
|  +-------------------------------------------------------+  |
|                             ^                               |
|                             | composes                      |
+-----------------------------|-------------------------------+
                              |
+-----------------------------+-------------------------------+
|                src/monads/spatial_monad.ts                  |
|  +-------------------------------------------------------+  |
|  | class SpatialMonad<T>                                 |  |
|  |   + computeAdvectiveFluxes(tensor, metricsMap)        |  |
|  |   + computeDiffusiveLaplacian(tensor, metricsMap)     |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```

### 5.1 Adjacency Integration (`H3AdjacencyManager`)
`H3AdjacencyManager` will be enhanced in Sprint 052 to compute and cache instances of `H3CellInterfaceMetrics` using H3 directed edges or spherical trigonometry from cell boundaries.

### 5.2 Discrete Laplacian Formulation in `SpatialMonad`
For any conservative scalar field $\phi$ defined across H3 centroids:
$$\nabla^2 \phi_i \approx \frac{1}{A_i} \sum_{j \in \mathcal{N}(i)} \gamma_{ij} (\phi_j - \phi_i)$$
where $\gamma_{ij} = \text{geometricConductance} = \frac{L_{ij}}{d_{ij}}$, and $A_i$ is the Voronoi cell area.

---

## 6. Monad Stock Transitions & Invariants

| Invariant ID | Formulation | Verification Condition |
| :--- | :--- | :--- |
| **INV-051-A** | Reciprocity of Shared Length | `metrics(i, j).sharedEdgeLengthMeters === metrics(j, i).sharedEdgeLengthMeters` |
| **INV-051-B** | Reciprocity of Centroid Distance | `metrics(i, j).centroidDistanceMeters === metrics(j, i).centroidDistanceMeters` |
| **INV-051-C** | Normal Inversion | `metrics(i, j).normalVector[k] === -metrics(j, i).normalVector[k]` for $k \in \{0, 1, 2\}$ |
| **INV-051-D** | Slope Antisymmetry | `metrics(i, j).topographicSlope === -metrics(j, i).topographicSlope` |
| **INV-051-E** | Positivity of Scale Metrics | `sharedEdgeLengthMeters > 0`, `centroidDistanceMeters > 0`, `geometricConductance > 0` |

---

## 7. Migration & Incremental Compatibility

1. **Non-Breaking Type Addition**: `H3CellInterfaceMetrics` is an additive interface in `src/spatial/h3_types.ts`. Existing consumers of `h3_types.ts` remain unaffected.
2. **Standardization**: Downstream modules (`H3AdjacencyManager`, `SpatialMonad`, `trophic.ts`, `earth_pod.ts`) can progressively adopt `H3CellInterfaceMetrics` without requiring synchronized refactoring of the tensor pipeline.
3. **Mock & Factory Utility**: Unit tests will provide an `H3CellInterfaceMetrics` mock factory to validate geometric invariants and flux calculations.

---

## 8. Verification & Acceptance Criteria

1. **Type Contract Verification**:
   - `H3CellInterfaceMetrics` is fully exported in `src/spatial/h3_types.ts`.
   - Structural field typing conforms to immutable (`readonly`) definitions for all properties.
2. **Unit Test Coverage (`tests/sprint_051.test.ts`)**:
   - Verification of interface type compliance with dummy and synthetic metric instances.
   - Validation of reciprocity invariants (INV-051-A through INV-051-E).
   - Numerical sanity checks on conductance calculation ($\gamma = L / d$).
3. **Build & Lint Integrity**:
   - TypeScript compilation passes with strict typing enabled (`--strict`).