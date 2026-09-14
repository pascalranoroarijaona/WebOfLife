# RFC-052: 3D Cartesian Spherical Unit Vector Projection (`latLngToUnitVector3D`) in Hexagonal Adjacency Infrastructure

**Sprint:** 052  
**Author:** Chief Systems Architect  
**Status:** PROPOSED  
**Target Date:** 2025-05-18  
**Component:** `src/spatial/h3_adjacency.ts`, `src/spatial/h3_types.ts`, `src/monads/spatial_monad.ts`

---

## 1. Executive Summary & Sprint Goal

### 1.1 Sprint Goal
Implement `latLngToUnitVector3D` 3D Cartesian spherical projection in `src/spatial/h3_adjacency.ts` to provide a numerically stable, singularity-free metric space for geodesic cell centroid positioning, solar insolation incidence computation ($\cos \theta_z = \mathbf{u} \cdot \mathbf{s}_\odot$), great-circle angular separation, and conservative advective vector fluxes across discrete planetary hexagonal boundaries.

### 1.2 Motivation & Architectural Context
Discrete Global Grid Systems (DGGS) based on Uber H3 project the planetary sphere onto a truncated icosahedron, indexing geodesic surfaces via hierarchical integer identifiers (`H3Index`). While two-dimensional geodesic coordinates $(\phi, \lambda)$ (latitude, longitude) are standard for human cartography, they introduce coordinate singularities at the poles ($\phi = \pm \pi/2$) and discontinuity jumps across the antimeridian ($\lambda = \pm \pi$).

Calculating directed inter-cell gradients, horizontal advection vectors, Coriolis deflections, and solar beam vector dot products in $(\phi, \lambda)$ requires expensive spherical trigonometry (haversines, inverse trigonometric evaluations) subject to catastrophic cancellation at small distances ($\Delta \theta \ll 10^{-4}\text{ rad}$) and metric distortion away from the equator.

By projecting cell centroids to unit 3D Cartesian vectors $\mathbf{u} = [x, y, z]^T \in \mathbb{S}^2 \subset \mathbb{R}^3$, the Web of Life simulation establishes:
1. **Singularity-Free Geometry:** Smooth, continuous Euclidean inner products $\mathbf{u}_i \cdot \mathbf{u}_j$ representing spherical separation.
2. **First-Law Energy Accounting:** Direct projective insolation calculation $I_{\text{solar}} = S_0 \cdot \max(0, \mathbf{u} \cdot \mathbf{s}_\odot)$, eliminating latitude-dependent trigonometric divergence.
3. **Rigid Conservative Fluxes:** Directional face normal tangents $\mathbf{t}_{ij} = \frac{\mathbf{u}_j - \mathbf{u}_i}{\|\mathbf{u}_j - \mathbf{u}_i\|}$ that guarantee zero net divergence in closed atmospheric and oceanic circulation graphs.

---

## 2. Mathematical Specification

### 2.1 Forward Spherical-to-Cartesian Unit Projection
Let $\phi \in [-\frac{\pi}{2}, \frac{\pi}{2}]$ denote planetocentric latitude in radians, and $\lambda \in [-\pi, \pi)$ denote planetocentric longitude in radians. Given geographic input coordinates $(\phi_{\text{deg}}, \lambda_{\text{deg}})$ in decimal degrees:

$$\phi = \phi_{\text{deg}} \cdot \frac{\pi}{180}, \quad \lambda = \lambda_{\text{deg}} \cdot \frac{\pi}{180}$$

The unit 3D Cartesian position vector $\mathbf{u} = [x, y, z]^T$ on the unit sphere $\mathbb{S}^2 = \{ \mathbf{v} \in \mathbb{R}^3 \mid \|\mathbf{v}\|_2 = 1 \}$ is defined by:

$$\begin{aligned}
x &= \cos(\phi) \cos(\lambda) \\
y &= \cos(\phi) \sin(\lambda) \\
z &= \sin(\phi)
\end{aligned}$$

### 2.2 Invariance & Metric Properties
1. **Unit Norm Invariance:**
   $$\|\mathbf{u}\|_2^2 = x^2 + y^2 + z^2 = \cos^2(\phi)\cos^2(\lambda) + \cos^2(\phi)\sin^2(\lambda) + \sin^2(\phi) = \cos^2(\phi) + \sin^2(\phi) = 1.0$$
   Numerical implementation must guarantee:
   $$|\|\mathbf{u}\|_2 - 1.0| \le 1.0 \times 10^{-15}$$

2. **Great-Circle Central Angle Metric:**
   For any two unit vectors $\mathbf{u}_a, \mathbf{u}_b \in \mathbb{S}^2$, their angular separation $\theta_{ab}$ is determined without spherical law of cosines degradation via the 2-argument arctangent of vector magnitudes:
   $$\theta_{ab} = \operatorname{atan2}\left(\|\mathbf{u}_a \times \mathbf{u}_b\|, \; \mathbf{u}_a \cdot \mathbf{u}_b\right)$$
   Alternatively, for small chords $d = \|\mathbf{u}_a - \mathbf{u}_b\|_2$:
   $$\theta_{ab} = 2 \arcsin\left(\frac{\|\mathbf{u}_a - \mathbf{u}_b\|_2}{2}\right)$$

3. **Insolation Direct Projector:**
   Given instantaneous normalized subsolar vector $\mathbf{s}_\odot(t) \in \mathbb{S}^2$, the local cosine of the solar zenith angle is strictly:
   $$\cos(\theta_z) = \max(0, \mathbf{u} \cdot \mathbf{s}_\odot) = \max(0, x x_\odot + y y_\odot + z z_\odot)$$

---

## 3. Interface Contracts & Class Hierarchy Additions

### 3.1 Type Definitions (`src/spatial/h3_types.ts`)
We introduce a lightweight, immutable tuple and value-object definition for 3D Cartesian vectors to guarantee zero garbage-collection overhead during large-scale grid iteration:

```typescript
/**
 * Immutable 3D Cartesian Unit Vector [x, y, z] on the unit sphere S^2.
 * Invariant: Math.abs(x*x + y*y + z*z - 1.0) < 1e-12
 */
export type UnitVector3D = readonly [x: number, y: number, z: number];

export interface CartesianPoint3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}
```

### 3.2 Projection Function Contract (`src/spatial/h3_adjacency.ts`)
```typescript
/**
 * Projects geodesic latitude and longitude (in decimal degrees) onto a 3D unit
 * Cartesian vector on the unit sphere S^2.
 *
 * @param latDeg Latitude in decimal degrees [-90.0, 90.0]
 * @param lngDeg Longitude in decimal degrees [-180.0, 180.0]
 * @returns UnitVector3D tuple [x, y, z] where ||[x, y, z]|| = 1.0
 * @throws RangeError if latDeg is outside [-90.0, 90.0] or non-finite
 */
export function latLngToUnitVector3D(latDeg: number, lngDeg: number): UnitVector3D;

/**
 * Computes the Euclidean 3D dot product between two unit vectors.
 * Equivalent to cos(central_angle) on the unit sphere.
 */
export function unitVectorDotProduct(a: UnitVector3D, b: UnitVector3D): number;

/**
 * Computes the 3D cross product between two unit vectors (a x b).
 * Result vector is orthogonal to the great-circle plane containing a and b.
 */
export function unitVectorCrossProduct(a: UnitVector3D, b: UnitVector3D): [number, number, number];

/**
 * Computes the great-circle distance in radians between two unit vectors using atan2.
 * Robust against numerical cancellation at antipodal and near-zero distances.
 */
export function unitVectorAngularDistance(a: UnitVector3D, b: UnitVector3D): number;
```

### 3.3 Class Hierarchy Evolution

```
+-------------------------------------------------------------+
|                     SpatialMonad<T>                         |
|  - Encapsulates state vector S over discrete cells          |
|  - Applies conservative transition kernels                  |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                   H3AdjacencyMatrix                         |
|  - Stores topological adjacency topology (CSR format)       |
|  - Precomputes metric distances between cell centroids      |
+-------------------------------------------------------------+
                              |
                              | uses
                              v
+-------------------------------------------------------------+
|               SphericalVectorGeometry (Module)              |
|  + latLngToUnitVector3D(lat, lng): UnitVector3D             |
|  + unitVectorDotProduct(a, b): number                       |
|  + unitVectorCrossProduct(a, b): [number, number, number]   |
|  + unitVectorAngularDistance(a, b): number                  |
+-------------------------------------------------------------+
```

---

## 4. First and Second Law Thermodynamic Integration

### 4.1 First Law: Solar Radiation Influx Boundary Condition
The Web of Life simulation operates strictly under solar input: no exogenous energy may enter the biosphere. The instantaneous energy flux density $F_{\text{solar}, i}$ into cell $i$ with centroid unit vector $\mathbf{u}_i$ is:

$$F_{\text{solar}, i} = S_0 \cdot \tau_{\text{atm}, i} \cdot \max(0, \mathbf{u}_i \cdot \mathbf{s}_\odot)$$

Where:
- $S_0 = 1361.0 \text{ W/m}^2$ (Solar Constant, `SOLAR_CONSTANT` in `src/thermodynamics/constants.ts`)
- $\tau_{\text{atm}, i} \in [0, 1]$ is atmospheric optical transmission (cloud albedo and aerosol attenuation)
- $\mathbf{s}_\odot = [x_\odot, y_\odot, z_\odot]^T$ is the subsolar point vector calculated from axial tilt ($\epsilon = 23.44^\circ$) and orbital day angle $\varpi(t)$.

Because $\mathbf{u}_i$ is normalized strictly to $\|\mathbf{u}_i\| = 1$, the integral over the illuminated hemisphere of a spherical tessellation converges to:

$$\sum_{i \in \text{illuminated}} F_{\text{solar}, i} \cdot A_i = S_0 \pi R_\oplus^2$$

This guarantees that the total energy entering the planetary boundary layer exactly equals cross-sectional interceptive solar energy, satisfying the First Law of Thermodynamics without empirical recalibration.

### 4.2 Second Law: Geodesic Entropy Production & Dissipation
Inter-cell advective mass transfer $J_{ij}$ of atmospheric vapor or oceanic dissolved carbon between adjacent cells $i$ and $j$ is driven by physical potential gradients $\nabla \mu_{ij}$ along the chord vector $\Delta \mathbf{u}_{ij} = \mathbf{u}_j - \mathbf{u}_i$:

$$J_{ij} = -K_{ij} \frac{\mu_j - \mu_i}{\|\mathbf{u}_j - \mathbf{u}_i\|_2 \cdot R_\oplus}$$

Entropy production $\dot{S}_{\text{gen}}$ associated with this transport is strictly non-negative:

$$\dot{S}_{\text{gen}} = \sum_{(i,j) \in \mathcal{E}} J_{ij} \left( \frac{1}{T_j} - \frac{1}{T_i} \right) \ge 0$$

Using standard 3D unit vectors ensures that the distance metric $\|\mathbf{u}_j - \mathbf{u}_i\|_2$ is isotropic across all hexagon-hexagon and pentagon-hexagon interfaces, eliminating artificial numerical dissipation or non-physical negative entropy flux loops induced by planar projections.

---

## 5. Monad Stock Transitions

The `SpatialMonad` coordinates transitions over the planetary state tensor. The addition of Cartesian 3D projection allows vector-valued stock transitions:

$$\mathcal{M}(S_{t}) \xrightarrow{\text{bind}(\text{projectCentroids})} \mathcal{M}(S_{t}, \mathbf{U}) \xrightarrow{\text{bind}(\text{computeInsolation})} \mathcal{M}(S_{t+1})$$

```typescript
// Spatial Monad transition pipeline
export const updatePlanetaryInsolation = (
  monad: SpatialMonad<PlanetaryState>,
  subsolarVector: UnitVector3D
): SpatialMonad<PlanetaryState> => {
  return monad.map((state) => {
    const updatedCells = state.cells.map((cell) => {
      const u = latLngToUnitVector3D(cell.latitude, cell.longitude);
      const cosZ = Math.max(0, unitVectorDotProduct(u, subsolarVector));
      const insolationWatts = SOLAR_CONSTANT * (1.0 - cell.albedo) * cosZ;

      return {
        ...cell,
        unitVector: u,
        cosZenith: cosZ,
        solarInfluxJoules: insolationWatts * cell.surfaceAreaM2 * state.deltaTimeSeconds
      };
    });

    return {
      ...state,
      cells: updatedCells
    };
  });
};
```

---

## 6. Implementation Plan & Source Edits

### 6.1 `src/spatial/h3_adjacency.ts` Additions
1. Implement `latLngToUnitVector3D(latDeg: number, lngDeg: number): UnitVector3D`.
2. Provide defensive bounds checking for latitude $[-90.0, 90.0]$ with tolerance $\pm 10^{-7}$ degrees for numerical roundoff at poles.
3. Normalize longitude modulo $360.0^\circ$ into $[-180.0, 180.0)$.
4. Implement vector utility helpers:
   - `unitVectorDotProduct`
   - `unitVectorCrossProduct`
   - `unitVectorAngularDistance`
   - `unitVectorChordDistance`
5. Unit normalize output vector explicitly to absorb floating-point precision loss:
   $$\mathbf{u}_{\text{normalized}} = \frac{\mathbf{u}}{\sqrt{x^2 + y^2 + z^2}}$$

### 6.2 Validation & Test Plan (`tests/sprint_052.test.ts`)
1. **Cardinal Axis Projections:**
   - Equator / Prime Meridian $(0^\circ, 0^\circ) \to [1, 0, 0]$
   - Equator / $90^\circ\text{E}$ $(0^\circ, 90^\circ) \to [0, 1, 0]$
   - North Pole $(90^\circ, 0^\circ) \to [0, 0, 1]$
   - South Pole $(-90^\circ, 0^\circ) \to [0, 0, -1]$
   - Equator / $180^\circ\text{W}$ $(0^\circ, -180^\circ) \to [-1, 0, 0]$
2. **Norm Invariance:**
   - Verify $\| \mathbf{u} \|_2 = 1.0 \pm 10^{-14}$ across a randomized planetary sample of $10,000$ coordinates.
3. **Antimeridian Continuity:**
   - Compare projection of $(30^\circ, 179.9999^\circ)$ and $(30^\circ, -180.0^\circ)$; distance must approach continuous differential limit.
4. **Thermodynamic Solar Insolation Integral:**
   - Verify sum of positive dot products across an evenly sampled geodesic sphere matches expected hemispheric integral $\int_0^{\pi/2} \cos\theta \sin\theta d\theta = \frac{1}{2}$ within discretization tolerance.

---

## 7. Risk Analysis & Mitigations

| Risk | Impact | Likelihood | Mitigation |
| :--- | :--- | :--- | :--- |
| **Float Precision Near Poles** | High | Low | Clamp latitude argument to $[-90.0, 90.0]$ and force $x = 0, y = 0, z = \pm 1$ when $|\phi| \ge 90.0 - 10^{-12}$. |
| **Garbage Collector Thrashing** | High | Medium | Use `readonly [number, number, number]` frozen tuples or flat typed arrays (`Float64Array`) for bulk matrix transformations. |
| **Antipodal Dot Product Underflow** | Medium | Low | Use `Math.max(-1.0, Math.min(1.0, dot))` before passing to `Math.acos` in distance derivations. |

---

## 8. Conclusion
Implementing `latLngToUnitVector3D` establishes the fundamental vector geometry required for robust spherical adjacency operations, eliminating polar singularities, maintaining continuous topological boundaries, and providing the physical foundation for energy and mass conservation across all subsequent H3 spatial layers.