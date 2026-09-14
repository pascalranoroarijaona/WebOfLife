# RFC-065: 3D Boundary Centroid Displacement Vector Computation (`computeBoundaryCentroidDisplacement3D`)

**Status**: Approved  
**Author**: Chief Systems Architect  
**Sprint**: 065  
**Target Component**: `src/spatial/h3_adjacency.ts`  
**Dependencies**: `src/spatial/h3_types.ts`, `src/spatial/h3_grid.ts`, `src/thermodynamics/constants.ts`

---

## 1. Executive Summary & Sprint Goal

### 1.1 Sprint Goal
Implement `computeBoundaryCentroidDisplacement3D` calculating the normalized 3D Cartesian displacement vector between two spherical coordinates $(\text{lat}_1, \text{lng}_1) \to (\text{lat}_2, \text{lng}_2)$ in `src/spatial/h3_adjacency.ts`.

### 1.2 Architectural Motivation
In the Web of Life planetary simulation, hexagonal cells partitioned on the spherical surface of Earth exchange mass (water, nutrients, organic carbon) and thermal energy across shared boundaries. Previous adjacency formulations operated predominantly on 2D planar approximations or angular arc separations. However, advective momentum, boundary normal projections, and planetary Coriolis/geostrophic transport require exact 3D direction vectors in geocentric Cartesian space ($\mathbb{R}^3$).

This sprint introduces `computeBoundaryCentroidDisplacement3D`, enabling:
1. Exact calculation of directed unit displacement vectors ($\hat{u} \in \mathbb{R}^3, \|\hat{u}\| = 1$) between adjacent cell centroids and boundary midpoint projections.
2. Boundary flux tensor projection: resolving directional advection across cell facets.
3. Strict compatibility with the spatial monad hierarchy (`SpatialMonad`, `H3Grid`, `H3AdjacencyManager`).

---

## 2. Thermodynamic & Physical Invariants

All spatial calculations must preserve the core planetary thermodynamic axioms:

### 2.1 First Law: Conservative Metric Invariant
The geometric displacement vector $\vec{d} = \vec{r}_2 - \vec{r}_1$ serves strictly as a coordinate operator for directional gradient projection. The normalized displacement vector $\hat{d} = \vec{d} / \|\vec{d}\|$ provides the direction of spatial fluxes:
$$\mathbf{J}_{\text{flux}} = -K \nabla \Phi \cdot \hat{d}$$
No synthetic mass or energy is created or annihilated during coordinate transformations:
$$\sum_{\text{cell}=1}^{N} \frac{d M_{\text{cell}}}{dt} = 0 \quad (\text{closed matter manifold})$$

### 2.2 Second Law: Irreversible Transport Orientation
Advective and diffusive boundary fluxes oriented along $\hat{d}$ drive positive entropy production:
$$\dot{S}_{\text{prod}} = \int_{\partial \Omega} \mathbf{J}_q \cdot \left( \frac{1}{T_2} - \frac{1}{T_1} \right) \hat{d} \, dA \ge 0$$
Accurate vector orientation eliminates artificial reverse fluxes that could violate local entropy dissipation.

---

## 3. Mathematical Formulation

### 3.1 Geocentric Spherical-to-Cartesian Mapping
Let a point on the planetary unit sphere $S^2$ be parameterized by latitude $\phi \in [-\pi/2, \pi/2]$ and longitude $\lambda \in [-\pi, \pi]$ (converted from decimal degrees to radians):

$$\begin{aligned}
x &= \cos(\phi) \cos(\lambda) \\
y &= \cos(\phi) \sin(\lambda) \\
z &= \sin(\phi)
\end{aligned}$$

For two spherical centroids $C_1 = (\phi_1, \lambda_1)$ and $C_2 = (\phi_2, \lambda_2)$, their Cartesian unit position vectors are:
$$\mathbf{r}_1 = \begin{bmatrix} \cos\phi_1 \cos\lambda_1 \\ \cos\phi_1 \sin\lambda_1 \\ \sin\phi_1 \end{bmatrix}, \quad \mathbf{r}_2 = \begin{bmatrix} \cos\phi_2 \cos\lambda_2 \\ \cos\phi_2 \sin\lambda_2 \\ \sin\phi_2 \end{bmatrix}$$

### 3.2 Chord Displacement & Normalization
The 3D chord displacement vector from $C_1$ to $C_2$ is:
$$\vec{\Delta} = \mathbf{r}_2 - \mathbf{r}_1 = \begin{bmatrix} x_2 - x_1 \\ y_2 - y_1 \\ z_2 - z_1 \end{bmatrix}$$

The Euclidean Euclidean norm (chord length) is:
$$\|\vec{\Delta}\| = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2 + (z_2 - z_1)^2}$$

The normalized 3D displacement unit vector is:
$$\hat{\mathbf{u}} = \begin{cases} 
\dfrac{\vec{\Delta}}{\|\vec{\Delta}\|}, & \text{if } \|\vec{\Delta}\| > \epsilon_{\text{singular}} \\
\begin{bmatrix} 0 \\ 0 \\ 0 \end{bmatrix}, & \text{if } \|\vec{\Delta}\| \le \epsilon_{\text{singular}}
\end{cases}$$
where $\epsilon_{\text{singular}} = 10^{-12}$ prevents numerical overflow or NaN generation for coincident coordinates.

---

## 4. Interface Contracts & Class Hierarchy Additions

### 4.1 Type Definitions (`src/spatial/h3_types.ts`)

```typescript
/**
 * 3D Cartesian vector tuple [x, y, z] or coordinate record
 */
export interface Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Spherical coordinate representation (degrees)
 */
export interface SphericalCoordinates {
  readonly lat: number; // Decimal degrees [-90, 90]
  readonly lng: number; // Decimal degrees [-180, 180]
}

/**
 * Centroid displacement analysis record
 */
export interface BoundaryDisplacement3D {
  readonly origin: Vector3D;
  readonly target: Vector3D;
  readonly displacement: Vector3D;
  readonly unitVector: Vector3D;
  readonly chordDistance: number;
  readonly angularDistanceRad: number;
}
```

### 4.2 Function Contract (`src/spatial/h3_adjacency.ts`)

```typescript
/**
 * Computes the normalized 3D displacement vector pointing from an origin
 * spherical coordinate to a target spherical coordinate in geocentric space.
 *
 * @param origin - Origin spherical coordinate { lat, lng } in degrees.
 * @param target - Target spherical coordinate { lat, lng } in degrees.
 * @param epsilon - Singularity tolerance threshold (default: 1e-12).
 * @returns Normalized 3D Cartesian displacement vector { x, y, z }.
 */
export function computeBoundaryCentroidDisplacement3D(
  origin: SphericalCoordinates,
  target: SphericalCoordinates,
  epsilon?: number
): Vector3D;
```

### 4.3 Detailed Metrics Contract (`src/spatial/h3_adjacency.ts`)

```typescript
/**
 * Detailed variant computing position vectors, raw chord displacement,
 * unit vector, and geodesic arc distances.
 */
export function computeDetailedCentroidDisplacement3D(
  origin: SphericalCoordinates,
  target: SphericalCoordinates,
  epsilon?: number
): BoundaryDisplacement3D;
```

### 4.4 Object-Oriented Integration: `H3AdjacencyManager`

The existing `H3AdjacencyManager` class in `src/spatial/h3_adjacency.ts` is incrementally extended:

```typescript
export class H3AdjacencyManager {
  // Existing boundary and neighbor resolution methods...

  /**
   * Calculates normalized 3D boundary centroid displacement between two H3 indices.
   */
  public getNeighborDisplacement3D(originIndex: string, targetIndex: string): Vector3D {
    const originCoord = this.getCellCentroid(originIndex);
    const targetCoord = this.getCellCentroid(targetIndex);
    return computeBoundaryCentroidDisplacement3D(originCoord, targetCoord);
  }

  /**
   * Resolves directional flux orientation along neighbor edge.
   */
  public getDirectedEdgeVector3D(edgeId: string): Vector3D;
}
```

---

## 5. Edge Cases & Numerical Robustness

| Case | Condition | Expected Behavior |
| :--- | :--- | :--- |
| **Coincident Centroids** | `origin == target` ($\|\vec{\Delta}\| < 10^{-12}$) | Return zero vector `{ x: 0, y: 0, z: 0 }`, chord distance `0`. |
| **Antipodal Points** | `lat2 = -lat1`, `lng2 = lng1 ± 180°` | Chord distance $\approx 2.0$, properly normalized vector through Earth center. |
| **North/South Poles** | `lat = ±90°` | Longitude singularity handled smoothly ($\cos(\pm \pi/2) = 0$). |
| **Date-Line Crossing** | `lng1 = 179.9°`, `lng2 = -179.9°` | Cartesian mapping naturally handles wrap-around without angular discontinuity. |
| **Tolerance Clamping** | Float precision artifacts $\|\hat{\mathbf{u}}\| \neq 1.0$ | Clamped to unit norm with double precision verification ($|\|\hat{\mathbf{u}}\| - 1.0| < 10^{-10}$). |

---

## 6. Monad Stock Transition Compatibility

The calculated 3D displacement vector integrates directly with `SpatialMonad` state transitions for fluid and thermodynamic flux across adjacent cells:

```typescript
// Advective mass flux between cell A and cell B
const u_3d = computeBoundaryCentroidDisplacement3D(cellA.coord, cellB.coord);
const wind_velocity_3d = cellA.windVelocity3D;
const projected_flux_velocity = dotProduct3D(wind_velocity_3d, u_3d);

if (projected_flux_velocity > 0) {
  const advectiveTransfer = Math.min(
    cellA.moistureMass * 0.1 * projected_flux_velocity,
    cellA.moistureMass
  );
  // Conservative state transition
  nextStateA.moistureMass -= advectiveTransfer;
  nextStateB.moistureMass += advectiveTransfer;
}
```

---

## 7. Verification & Test Strategy (`tests/sprint_065.test.ts`)

1. **Orthogonal Equator Displacements**:
   - $(0^\circ, 0^\circ) \to (0^\circ, 90^\circ)$: $\mathbf{r}_1=(1,0,0)$, $\mathbf{r}_2=(0,1,0)$. $\vec{\Delta}=(-1, 1, 0)$, $\hat{\mathbf{u}} = (-1/\sqrt{2}, 1/\sqrt{2}, 0)$.
2. **Pole-to-Equator Displacements**:
   - $(0^\circ, 0^\circ) \to (90^\circ, 0^\circ)$: $\mathbf{r}_1=(1,0,0)$, $\mathbf{r}_2=(0,0,1)$. $\vec{\Delta}=(-1, 0, 1)$, $\hat{\mathbf{u}} = (-1/\sqrt{2}, 0, 1/\sqrt{2})$.
3. **Coincident Centroid Null Vector**:
   - $(45^\circ, -30^\circ) \to (45^\circ, -30^\circ)$ yields $\{0, 0, 0\}$.
4. **Unit Norm Invariant**:
   - Verify $\|\hat{\mathbf{u}}\| = 1.0 \pm 10^{-12}$ across 10,000 random spherical pairs.
5. **Thermodynamic Conservatism Integration**:
   - Verify flux computations based on displacement vector result in zero net mass change ($\Delta M_{\text{total}} = 0$).

---

## 8. Summary of Deliverables

- `src/spatial/h3_types.ts`: Addition of `Vector3D`, `BoundaryDisplacement3D` interfaces if not already defined.
- `src/spatial/h3_adjacency.ts`: Implementation of `computeBoundaryCentroidDisplacement3D` and `computeDetailedCentroidDisplacement3D`.
- `src/spatial/h3_adjacency.ts`: Integration into `H3AdjacencyManager`.
- `tests/sprint_065.test.ts`: Complete unit test coverage for mathematical, physical, and boundary edge cases.