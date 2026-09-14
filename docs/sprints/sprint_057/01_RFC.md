# RFC-057: Geodesic Azimuth Vectorization — Forward Spherical Arc Bearing for Directional Advection

**Author:** Chief Systems Architect  
**Sprint:** 057  
**Status:** Approved / Architecture Review Complete  
**Component:** `src/spatial/h3_adjacency.ts`  
**Dependencies:** `src/spatial/h3_types.ts`, `src/thermodynamics/constants.ts`, `src/monads/spatial_monad.ts`

---

## 1. Executive Summary & Sprint Goal

### 1.1 Sprint Goal
Implement `computeSphericalArcBearing` forward geodesic initial azimuth calculation between two latitude/longitude coordinates in `src/spatial/h3_adjacency.ts`.

### 1.2 Objective
In planetary-scale ecological and geophysical simulations, spatial transport tensors (e.g., atmospheric advection, oceanic currents, spore dispersal, and migratory trophic biomass movement) require directional orientation defined along great-circle geodesics. While planar Euclidean approximations introduce severe distortion at higher latitudes and across the antimeridian, spherical trigonometry provides exact forward azimuths on the reference sphere.

This RFC formalizes the forward geodesic initial bearing operator, integrates it into the existing `H3AdjacencyGraph` class hierarchy, aligns it with the thermodynamic monad transport pipeline (`SpatialMonad`), and establishes numerical guardrails for antipodal, polar, and zero-displacement boundary states.

---

## 2. Mathematical Formulation

### 2.1 Forward Geodesic Initial Azimuth
Let $A = (\phi_1, \lambda_1)$ and $B = (\phi_2, \lambda_2)$ denote source and destination geographic coordinates in radians, where:
- $\phi \in [-\frac{\pi}{2}, \frac{\pi}{2}]$ represents geodetic latitude.
- $\lambda \in [-\pi, \pi]$ represents geodetic longitude.

The difference in longitude is defined as:
$$\Delta\lambda = \lambda_2 - \lambda_1$$

On a spherical Earth model with mean radius $R_{\oplus} = 6.3710088 \times 10^6\text{ m}$, the great circle arc connecting $A$ and $B$ intersects the local meridian at $A$ at an initial azimuth angle $\theta \in [0, 2\pi)$ radians (measured clockwise from True North, where $0 = \text{North}$, $\frac{\pi}{2} = \text{East}$, $\pi = \text{South}$, and $\frac{3\pi}{2} = \text{West}$).

The spherical trigonometry formulation derived from Napier's analogies and the spherical law of sines/cosines yields:
$$y = \sin(\Delta\lambda) \cdot \cos(\phi_2)$$
$$x = \cos(\phi_1) \cdot \sin(\phi_2) - \sin(\phi_1) \cdot \cos(\phi_2) \cdot \cos(\Delta\lambda)$$
$$\theta_{\text{raw}} = \operatorname{atan2}(y, x)$$

### 2.2 Azimuth Normalization and Canonical Range
The raw angle $\theta_{\text{raw}} \in (-\pi, \pi]$ is normalized into the canonical navigational and physical domain $\theta \in [0, 2\pi)$:
$$\theta = (\theta_{\text{raw}} + 2\pi) \pmod{2\pi}$$

For degrees:
$$\theta_{\text{deg}} = \left(\theta \cdot \frac{180}{\pi}\right) \pmod{360^\circ}$$

### 2.3 Angular Distance Coupling (Haversine & Vincenty Sphere)
For directional advective flux, the bearing $\theta$ must be coupled with the central angle separation $\sigma$:
$$\Delta\phi = \phi_2 - \phi_1$$
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$\sigma = 2 \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$
$$d = R_{\oplus} \cdot \sigma$$

---

## 3. Class Hierarchy & Architectural Design

### 3.1 Object-Oriented Composition
To maintain backward compatibility and preserve the incremental class design pattern established across Sprints 001–056:
- The primitive spherical trigonometry functions are housed within `src/spatial/h3_adjacency.ts`.
- `SphericalGeodesicCalculator` provides stateless, highly optimized static geodesic routines.
- `H3AdjacencyGraph` composes `SphericalGeodesicCalculator` to compute edge vectors, directional orientations, and advection weights across neighboring H3 hexagonal cells.

```
       +------------------------------------+
       |    SphericalGeodesicCalculator     |
       +------------------------------------+
       | + computeSphericalArcBearing(...)  |
       | + computeGreatCircleDistance(...)  |
       | + computeEdgeAzimuthVector(...)    |
       +-----------------+------------------+
                         ^
                         | uses
       +-----------------+------------------+
       |         H3AdjacencyGraph           |
       +------------------------------------+
       | - hexGraph: Map<H3Index, H3Cell>   |
       | - edgeBearings: Map<EdgeId, number>|
       +-----------------+------------------+
                         |
                         | directional flux
                         v
       +------------------------------------+
       |          SpatialMonad<T>           |
       +------------------------------------+
       | + advectConserved(vector, dt)      |
       | + enforceThermodynamicInvariants() |
       +------------------------------------+
```

### 3.2 Interface Contracts

```typescript
/**
 * Coordinate pair in decimal degrees or radians.
 */
export interface LatLngPoint {
  readonly lat: number; // Latitude in degrees [-90, 90]
  readonly lng: number; // Longitude in degrees [-180, 180]
}

export interface GeodesicBearingResult {
  readonly initialAzimuthRad: number; // Azimuth in radians [0, 2*pi)
  readonly initialAzimuthDeg: number; // Azimuth in degrees [0, 360)
  readonly distanceMeters: number;    // Arc distance along sphere
  readonly unitVector: {              // Local tangent plane unit vector (East-North)
    readonly uEast: number;           // sin(azimuth)
    readonly vNorth: number;          // cos(azimuth)
  };
}

/**
 * Functional signature for pure azimuth computation
 */
export type BearingComputationFn = (
  origin: LatLngPoint,
  destination: LatLngPoint
) => number;
```

---

## 4. Thermodynamic & Monadic Integration

### 4.1 First Law Compliance: Mass & Energy Flux Orientation
Directional advection across H3 Voronoi / hexagonal partitions relies on projecting atmospheric wind vectors $\mathbf{u} = (u, v)$ or ocean currents onto neighbor edge normal vectors $\hat{\mathbf{n}}_{ij}$. The forward azimuth $\theta_{ij}$ defines the unit vector connecting centroid $i$ to centroid $j$:
$$\hat{\mathbf{n}}_{ij} = (\sin \theta_{ij}, \cos \theta_{ij})$$

The advective flux of conserved monad stocks $S$ (carbon mass, sensible heat, liquid water) across cell boundary length $L_{ij}$ during time step $\Delta t$ is:
$$\Phi_{ij} = \max\left(0, \mathbf{u} \cdot \hat{\mathbf{n}}_{ij}\right) \cdot \frac{S_i}{A_i} \cdot L_{ij} \cdot \Delta t$$
To guarantee strict First Law adherence:
$$\sum_{j \in \mathcal{N}(i)} \Phi_{ij} = \sum_{j \in \mathcal{N}(i)} \Phi_{ji}^{\text{inflow}}$$
No stock is created or destroyed during spatial geodesic projection; geodesic calculations only modulate routing coefficients $k_{ij} \ge 0$, maintaining:
$$\sum_{j} k_{ij} \le 1.0$$

### 4.2 Second Law Compliance: Non-Negative Entropy Generation
Directional flux computed via geodesic bearing must obey diffusive dissipation:
$$\frac{dS_{\text{total}}}{dt} = \sum_{\langle i, j \rangle} \Phi_{ij}^{\text{heat}} \left(\frac{1}{T_j} - \frac{1}{T_i}\right) \ge 0$$
Accurate geodesic bearing prevents unphysical negative distance projections or reversed gradient advection, ensuring numerical stability and monotonic entropy production.

---

## 5. Numerical Guardrails & Edge Cases

| Case | Scenario | Expected Behavior |
|---|---|---|
| **Coincident Points** | $A = B$ ($\Delta\phi = 0, \Delta\lambda = 0$) | Return `0.0` radians / degrees; distance `0.0`. Do not emit `NaN`. |
| **Poles (Source)** | Origin at North Pole ($\phi_1 = \frac{\pi}{2}$) or South Pole ($\phi_1 = -\frac{\pi}{2}$) | Any movement from North Pole is South ($180^\circ / \pi$ rad); from South Pole is North ($0^\circ / 0$ rad). |
| **Poles (Destination)** | Destination at North Pole or South Pole | Directly North ($0^\circ / 0$ rad) or South ($180^\circ / \pi$ rad). |
| **Antimeridian Crossing** | Origin at $+179^\circ$, Destination at $-179^\circ$ | Shortest great circle goes East ($\Delta\lambda = +2^\circ$), bearing should resolve to $\sim 90^\circ$ (due East at equator). |
| **Antipodal Points** | $A$ and $B$ diametrically opposed ($\sigma = \pi$) | Azimuth is mathematically degenerate; resolve to canonical `0.0` with explicit flag or deterministically consistent geodesic heading. |
| **Floating Precision** | Clamping arguments for trigonometric functions | Clamp $\operatorname{clamp}(\cos(\sigma), -1.0, 1.0)$ to preclude imaginary or domain errors in inverse trigonometric evaluations. |

---

## 6. Verification and Test Plan

1. **Equatorial Orthogonal Traversal:**
   - $(0^\circ, 0^\circ) \to (0^\circ, 10^\circ) \implies 90.0^\circ$ ($\frac{\pi}{2}$ rad).
   - $(0^\circ, 10^\circ) \to (0^\circ, 0^\circ) \implies 270.0^\circ$ ($\frac{3\pi}{2}$ rad).

2. **Meridional Traversal:**
   - $(0^\circ, 0^\circ) \to (45^\circ, 0^\circ) \implies 0.0^\circ$ ($0$ rad, Due North).
   - $(45^\circ, 0^\circ) \to (0^\circ, 0^\circ) \implies 180.0^\circ$ ($\pi$ rad, Due South).

3. **Antimeridian & Transpolar Transits:**
   - $(0^\circ, 179^\circ) \to (0^\circ, -179^\circ) \implies 90.0^\circ$ (Eastbound crossing).
   - $(80^\circ, 0^\circ) \to (80^\circ, 180^\circ) \implies 0.0^\circ$ (Crossing directly over the North Pole).

4. **Thermodynamic Flow Preservation:**
   - Advection tensor across 7-cell H3 neighborhood using bearings preserves mass to within machine epsilon ($\varepsilon < 10^{-14}$).

---

## 7. Deliverables

1. Update `src/spatial/h3_adjacency.ts`:
   - Implement `computeSphericalArcBearing(origin: LatLngPoint, destination: LatLngPoint): number`
   - Implement `computeDetailedBearing(origin: LatLngPoint, destination: LatLngPoint): GeodesicBearingResult`
   - Integrate into existing neighbor-vector calculation methods of `H3AdjacencyGraph`.
2. Unit tests in `tests/sprint_057.test.ts`.
3. Sprint documentation bundle (`02_METHODS.md`, `03_RELEASE_NOTES.md`, `04_AUDIT.md`, `05_ACADEMIC_PREPRINT.tex/md`, `06_VIRAL_STORYTELLING.md`, `07_COMMUNITY_GUIDE.md`).