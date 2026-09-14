# RFC 058: Spherical Boundary Midpoint Calculator for Adjacent H3 Hexels

## 1. Executive Summary & Sprint Goal

### 1.1 Sprint Goal
Implement `computeBoundaryMidpointLatLng`, a spherical midpoint calculator between adjacent H3 cell centroids in `src/spatial/h3_adjacency.ts`.

### 1.2 Motivation & Architectural Context
In the discrete global grid architecture of the *Web of Life* engine, planetary surfaces are tessellated via the Uber H3 discrete global grid system. Biophysical fluxes—such as atmospheric vapor advection, oceanic dissolved inorganic carbon (DIC) transport, trophic biomass migration, and sensible heat diffusion—occur across boundaries shared by adjacent H3 hexagonal cells ("hexels").

Prior to Sprint 058, inter-cell flux vectors and interfacial gradient evaluations relied either on planar midpoint approximations (susceptible to distortion, particularly at high latitudes and across the antimeridian) or on unshared cell boundary approximations. Computing interfacial boundary metrics (e.g., Coriolis force evaluation at boundary midpoints, solar zenith angle at cell interfaces, and normal flux vectors) requires an exact great-circle spherical midpoint calculation between adjacent cell centroids.

This RFC formalizes `computeBoundaryMidpointLatLng` within `src/spatial/h3_adjacency.ts`, establishing:
1. Exact spherical midpoint computation in 3D n-vector / Cartesian space with wrap-around antimeridian handling.
2. Thermodynamic flux integration guarantees ensuring zero artificial mass or energy generation across adjacent cell interfaces.
3. Strict object-oriented contracts and monadic state propagation through `SpatialAdjacencyGraph` and `SpatialMonad`.

---

## 2. Mathematical & Geodesic Foundations

### 2.1 Spherical Great-Circle Midpoint Formulation
Let two adjacent H3 cell centroids $C_1$ and $C_2$ be defined in geographic coordinates:
$$C_1 = (\phi_1, \lambda_1), \quad C_2 = (\phi_2, \lambda_2)$$
where $\phi \in [-\frac{\pi}{2}, \frac{\pi}{2}]$ denotes geocentric latitude in radians and $\lambda \in [-\pi, \pi)$ denotes geocentric longitude in radians.

Planar arithmetic averaging ($\frac{\phi_1+\phi_2}{2}, \frac{\lambda_1+\lambda_2}{2}$) fails near the $\pm 180^\circ$ antimeridian and introduces severe geodesic distortion as $|\phi| \to \frac{\pi}{2}$. To achieve metric fidelity on the reference sphere of radius $R_\oplus$, coordinates are mapped to 3D Cartesian direction cosines on the unit sphere $\mathbb{S}^2 \subset \mathbb{R}^3$:

$$\mathbf{v}_i = \begin{bmatrix} x_i \\ y_i \\ z_i \end{bmatrix} = \begin{bmatrix} \cos\phi_i \cos\lambda_i \\ \cos\phi_i \sin\lambda_i \\ \sin\phi_i \end{bmatrix}, \quad i \in \{1, 2\}$$

The unnormalized Euclidean chord midpoint vector $\mathbf{v}_m'$ is:
$$\mathbf{v}_m' = \mathbf{v}_1 + \mathbf{v}_2 = \begin{bmatrix} \cos\phi_1 \cos\lambda_1 + \cos\phi_2 \cos\lambda_2 \\ \cos\phi_1 \sin\lambda_1 + \cos\phi_2 \sin\lambda_2 \\ \sin\phi_1 + \sin\phi_2 \end{bmatrix}$$

The Euclidean norm of $\mathbf{v}_m'$ is:
$$\|\mathbf{v}_m'\| = \sqrt{(x_1 + x_2)^2 + (y_1 + y_2)^2 + (z_1 + z_2)^2}$$

Because $C_1$ and $C_2$ are adjacent cells in an H3 grid (resolution $r \ge 0$), their angular separation $\Delta\sigma \ll \pi$. Specifically, at resolution 0, the maximum inter-centroid distance is $< 10^\circ$, precluding antipodal singularity ($\|\mathbf{v}_m'\| = 0$).

The projected unit vector on $\mathbb{S}^2$ is:
$$\hat{\mathbf{v}}_m = \frac{\mathbf{v}_m'}{\|\mathbf{v}_m'\|} = \begin{bmatrix} x_m \\ y_m \\ z_m \end{bmatrix}$$

Transforming back to geocentric latitude $\phi_m$ and longitude $\lambda_m$:
$$\phi_m = \operatorname{atan2}\left(z_m, \sqrt{x_m^2 + y_m^2}\right)$$
$$\lambda_m = \operatorname{atan2}\left(y_m, x_m\right)$$

Converted to decimal degrees:
$$\Phi_m = \phi_m \cdot \frac{180}{\pi}, \quad \Lambda_m = \lambda_m \cdot \frac{180}{\pi}$$
with $\Lambda_m$ normalized to the canonical range $[-180, 180)$.

### 2.2 Invariance and Symmetry Axioms
The midpoint operator $\mathcal{M}(C_1, C_2)$ must satisfy the following algebraic invariants:
1. **Commutativity / Symmetry**: $\mathcal{M}(C_1, C_2) \equiv \mathcal{M}(C_2, C_1)$ within machine $\varepsilon$ ($10^{-12}$ rad).
2. **Equidistance**: The great-circle distance $d_{\mathbb{S}^2}(C_1, \mathcal{M}) = d_{\mathbb{S}^2}(C_2, \mathcal{M}) = \frac{1}{2} d_{\mathbb{S}^2}(C_1, C_2)$.
3. **Collinearity**: The geodesic curvature of the arc passing through $C_1, \mathcal{M}, C_2$ is zero.
4. **Idempotence**: $\mathcal{M}(C_1, C_1) \equiv C_1$.

---

## 3. Thermodynamic & First/Second Law Compliance

Interfacial boundary calculations govern the rate of inter-hexel transport. All mass and energy exchange calculations executed at the boundary midpoint must strictly obey:

### 3.1 First Law: Conservation of Mass and Energy
1. **Conservative Advection**: Any mass or energy flux $J_{1 \to 2}$ across the interface evaluated at $\mathcal{M}(C_1, C_2)$ must satisfy the anti-symmetry relation:
   $$J_{1 \to 2} = -J_{2 \to 1}$$
2. **No Extraneous Sinks or Sources**: Geodesic midpoint calculation is purely kinematic/spatial. It introduces zero synthetic thermal, chemical, or radiant fluxes into the closed Earth-Pod system.
3. **Solar Insolation Boundary Evaluation**: Local solar irradiance $S_0(\Phi_m, \Lambda_m, t)$ evaluated at boundary midpoints must exclusively modulate interfacial kinetic processes (such as surface thermal wind components) without altering global integrated radiant input:
   $$\oint_{\mathbb{S}^2} S(\phi, \lambda, t) \, dA = S_{\text{solar\_constant}} \cdot \pi R_\oplus^2$$

### 3.2 Second Law: Entropy Maximization & Gradient Dissipation
1. Diffusive fluxes evaluated across $\mathcal{M}(C_1, C_2)$ must flow down the thermodynamic potential gradient:
   $$J_{\text{diff}} = -D \nabla \Psi \approx -D \frac{\Psi(C_2) - \Psi(C_1)}{d_{\mathbb{S}^2}(C_1, C_2)}$$
   where entropy production $\sigma = J \cdot \nabla \left(\frac{1}{T}\right) \ge 0$.
2. The accurate evaluation of $d_{\mathbb{S}^2}$ and midpoint conditions ensures that interfacial diffusion coefficients do not experience artificial numerical negative-damping or non-physical oscillations.

---

## 4. Class Hierarchy & Architecture Additions

### 4.1 Interface Contracts (`src/spatial/h3_types.ts` & `src/spatial/h3_adjacency.ts`)

```typescript
/**
 * Geographic latitude and longitude coordinates in decimal degrees.
 */
export interface LatLng {
  readonly lat: number; // [-90, 90]
  readonly lng: number; // [-180, 180]
}

/**
 * Geometric metadata for an interface between two adjacent H3 cells.
 */
export interface H3BoundaryInterface {
  readonly originHex: string;
  readonly neighborHex: string;
  readonly midpoint: LatLng;
  readonly distanceMeters: number;
  readonly normalAzimuthDegrees: number;
}
```

### 4.2 Module Export: `computeBoundaryMidpointLatLng`
Location: `src/spatial/h3_adjacency.ts`

```typescript
/**
 * Computes the spherical great-circle midpoint between two geographic coordinates
 * representing adjacent H3 cell centroids.
 *
 * @param coord1 First centroid coordinate in decimal degrees.
 * @param coord2 Second centroid coordinate in decimal degrees.
 * @returns LatLng Midpoint on the spherical surface in decimal degrees [-90, 90], [-180, 180].
 */
export function computeBoundaryMidpointLatLng(coord1: LatLng, coord2: LatLng): LatLng;
```

### 4.3 Class Hierarchy Integration

```
+------------------------------------------------------------------+
|                       SpatialAdjacencyGraph                      |
|  - adjacencyMap: Map<string, string[]>                           |
|  - boundaryCache: Map<string, H3BoundaryInterface>              |
+------------------------------------------------------------------+
|  + getNeighbors(h3Index: string): string[]                       |
|  + getBoundary(hexA: string, hexB: string): H3BoundaryInterface  |
|  + computeInterCellFlux(stateA: H3CellState,                     |
|                         stateB: H3CellState): FluxVector         |
+------------------------------------------------------------------+
                                 |
                                 v uses
+------------------------------------------------------------------+
|                   SphericalGeodesicCalculator                    |
+------------------------------------------------------------------+
|  + computeGreatCircleDistance(c1: LatLng, c2: LatLng): number    |
|  + computeBoundaryMidpointLatLng(c1: LatLng, c2: LatLng): LatLng |
|  + computeInitialBearing(c1: LatLng, c2: LatLng): number         |
+------------------------------------------------------------------+
```

---

## 5. Implementation Specification Details

### 5.1 Degree-to-Radian Conversions and Cartesian Projection
1. Convert input `lat` and `lng` to radians using double-precision constants $\frac{\pi}{180}$.
2. Handle identity case: if `coord1.lat === coord2.lat` and `coord1.lng === coord2.lng`, return `{ lat: coord1.lat, lng: coord1.lng }`.
3. Compute 3D unit direction components:
   - $x_1 = \cos(\phi_1)\cos(\lambda_1)$, $y_1 = \cos(\phi_1)\sin(\lambda_1)$, $z_1 = \sin(\phi_1)$
   - $x_2 = \cos(\phi_2)\cos(\lambda_2)$, $y_2 = \cos(\phi_2)\sin(\lambda_2)$, $z_2 = \sin(\phi_2)$
4. Vector addition:
   - $x_m = x_1 + x_2$
   - $y_m = y_1 + y_2$
   - $z_m = z_1 + z_2$
5. Normalize and recover angles:
   - Hypotenuse in $xy$-plane: $\rho = \sqrt{x_m^2 + y_m^2}$
   - Check threshold: if $\sqrt{x_m^2 + y_m^2 + z_m^2} < 10^{-15}$, throw error or fallback (unreachable for adjacent H3 hexels).
   - $\phi_{\text{rad}} = \operatorname{atan2}(z_m, \rho)$
   - $\lambda_{\text{rad}} = \operatorname{atan2}(y_m, x_m)$
6. Convert back to degrees:
   - `lat = phi_rad * (180 / Math.PI)`
   - `lng = lambda_rad * (180 / Math.PI)`
7. Normalize longitude: Ensure `lng` strictly resides in $[-180, 180)$.

---

## 6. Verification and Validation Suite

The implementation will be verified via unit tests in `tests/sprint_058.test.ts` covering:
1. **Equatorial Co-linear Test**: Midpoint between `(0, 10)` and `(0, 20)` must equal `(0, 15)`.
2. **Meridian Arc Test**: Midpoint between `(10, 0)` and `(30, 0)` must equal `(20, 0)`.
3. **Antimeridian Crossing Test**: Midpoint between `(10, 179)` and `(10, -179)` must equal `(10.076..., 180)` or `(10.076..., -180)` rather than falling near longitude $0^\circ$.
4. **North/South Polar Proximity Test**: Midpoint between high-latitude adjacent hexels across the prime meridian.
5. **Commutativity / Symmetry**: $\mathcal{M}(A, B) = \mathcal{M}(B, A)$ to within $10^{-9}$ degrees.
6. **Equal Distance Verification**: Spherical distance $d(A, M) \approx d(B, M)$ with relative tolerance $< 10^{-7}$.
7. **Idempotence**: $\mathcal{M}(A, A) = A$.
8. **Realistic H3 Adjacency Test**: Midpoint between adjacent resolution 3 H3 hexel centroids matches analytical boundary geodesic within expected tolerances.

---

## 7. Migration & Compatibility Notice
- The function is purely additive in `src/spatial/h3_adjacency.ts`.
- Existing functions (`getH3Neighbors`, `areH3NeighborsAdjacent`) remain backward-compatible without signature modifications.
- Downstream monad components (`SpatialMonad`, `EarthPodState`) can immediately utilize boundary midpoints for interfacial biological and thermodynamic flux computations.