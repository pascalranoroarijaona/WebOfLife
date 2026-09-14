# RFC-046: Geodesic Haversine Distance Metric for H3 Cell Centroids

**Status:** Proposed  
**Author:** Chief Systems Architect  
**Sprint:** 046  
**Component:** `src/spatial/h3_adjacency.ts`  
**Dependencies:** `src/spatial/h3_types.ts`, `src/thermodynamics/constants.ts`  

---

## 1. Executive Summary & Sprint Goal

### 1.1 Sprint Goal
Implement `calculateHaversineDistance` geodesic metric helper between cell centroids in `src/spatial/h3_adjacency.ts` to provide an exact great-circle distance computation between spherical coordinates on the Earth Pod reference sphere, establishing the physical metric baseline for spatial diffusion, mass transport, and radiative flux dissipation across the discrete H3 hexagonal manifold.

### 1.2 Context & Architectural Fit
The discrete H3 grid (`H3Grid`) abstracts the planetary surface into hierarchical hexagonal and pentagonal cells. While topological adjacency (`H3AdjacencyMatrix`) indicates whether two cell indices share an edge or vertex, thermodynamic transport processes—such as gradient-driven atmospheric diffusion, oceanic advection, trophic migration, and dissipative entropy generation—depend fundamentally on physical geodesic arc distance $d_{ij}$ (in meters) between cell centroids.

Sprint 046 introduces `calculateHaversineDistance` as a pure, numerically stable geodesic metric function and integrates it into the adjacency and spatial kernel architecture.

---

## 2. Theoretical & Mathematical Foundations

### 2.1 The Haversine Formulation on an Oblate/Spherical Geoid
Given two geographic points on a sphere of mean planetary radius $R_\oplus$ (defined in `EARTH_RADIUS_METERS` within `src/thermodynamics/constants.ts` as $6.371 \times 10^6\text{ m}$):
- Point 1: latitude $\phi_1$, longitude $\lambda_1$ (in radians)
- Point 2: latitude $\phi_2$, longitude $\lambda_2$ (in radians)

The angular separation $\Delta\sigma$ between centroids is given by the haversine formula:
$$\operatorname{hav}(\Delta\sigma) = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$

Where $\Delta\phi = \phi_2 - \phi_1$ and $\Delta\lambda = \lambda_2 - \lambda_1$.

The central angle $c = \Delta\sigma$ is evaluated via the numerically stable arc-tangent:
$$c = 2 \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$
where $a = \min(1.0, \max(0.0, \operatorname{hav}(\Delta\sigma)))$ to prevent out-of-domain floating point instability for antipodal or identical points.

The geodesic surface distance $d$ is:
$$d = R_\oplus \cdot c$$

### 2.2 Thermodynamic Flux & Metric Tensors
In non-equilibrium spatial thermodynamics, spatial flux vectors $\mathbf{J}_k$ (e.g., sensible heat conduction, water vapor diffusion, biomass dispersion) across cell boundaries obey generalized Fickian/Fourier transport laws:
$$J_{k, ij} = - \kappa_k \frac{\Delta \Phi_{k, ij}}{d_{ij}} A_{ij}$$
where:
- $\Delta \Phi_{k, ij} = \Phi_{k, j} - \Phi_{k, i}$ is the thermodynamic potential difference (temperature $T$, chemical potential $\mu$, or concentration $C$),
- $d_{ij} = \text{calculateHaversineDistance}(\mathbf{x}_i, \mathbf{x}_j)$ is the centroid-to-centroid geodesic distance,
- $A_{ij}$ is the shared edge length,
- $\kappa_k$ is the transport conductance coefficient.

A precise distance metric guarantees that spatial dissipation rates $\sigma_S = \sum_{\langle ij \rangle} J_{ij} \frac{\Delta \Phi_{ij}}{T} \ge 0$ scale consistently across irregular planar projections and variable hexagonal cell spacing.

---

## 3. Thermodynamic Compliance (First & Second Laws)

1. **First Law of Thermodynamics (Energy & Mass Invariance):**
   - The geodesic distance calculation is purely geometric and metric-defining; it consumes no thermodynamic stock and generates neither mass nor energy.
   - When utilized in spatial finite-volume flux computations, metric-normalized conductances $\Gamma_{ij} = \frac{\kappa A_{ij}}{d_{ij}}$ satisfy antisymmetry ($\Gamma_{ij} = \Gamma_{ji}$ and $J_{ij} = -J_{ji}$), guaranteeing exact conservation of energy and elemental mass stocks ($\Delta U = 0$, $\Delta M = 0$) across cell boundaries.

2. **Second Law of Thermodynamics (Entropy Production):**
   - True physical geodesic distances ensure that diffusive spatial processes strictly degrade gradients ($J_{ij} \cdot (\Phi_j - \Phi_i) \le 0$), preventing negative entropy generation artifacts that could arise from uniform topology approximations.

3. **Solar Boundary Invariance:**
   - Geodesic coordinates directly couple to planetary solar zenith angles; computing exact great-circle centroids ensures accurate solar insolation projections onto cell cross-sections without non-physical radiative distortion.

---

## 4. Class Hierarchy & Interface Architecture

### 4.1 Interface Definitions (`src/spatial/h3_types.ts` additions/refinements)
```typescript
/**
 * Coordinate pair representing geographic position in degrees or radians.
 */
export interface LatLngCoord {
  readonly lat: number; // Degrees [-90, +90]
  readonly lng: number; // Degrees [-180, +180]
}

/**
 * Centroid distance query payload.
 */
export interface GeodesicDistanceOptions {
  readonly radiusMeters?: number; // Defaults to EARTH_RADIUS_METERS (6,371,007 m)
  readonly unit?: 'meters' | 'kilometers'; // Default: 'meters'
}
```

### 4.2 Functional Contract in `src/spatial/h3_adjacency.ts`
```typescript
/**
 * Computes the great-circle geodesic distance between two spherical centroids
 * using the numerically stable Haversine formulation.
 *
 * Supports input coordinates as LatLngCoord objects or [lat, lng] tuples in decimal degrees.
 *
 * @param coordA First point [lat, lng] or LatLngCoord (decimal degrees)
 * @param coordB Second point [lat, lng] or LatLngCoord (decimal degrees)
 * @param options Geodesic distance options (radius, unit)
 * @returns Geodesic distance in specified units (default: meters)
 */
export function calculateHaversineDistance(
  coordA: LatLngCoord | [number, number],
  coordB: LatLngCoord | [number, number],
  options?: GeodesicDistanceOptions
): number;
```

### 4.3 Object-Oriented Composition in `H3AdjacencyMatrix`
Enhance `H3AdjacencyMatrix` to cache and expose geodesic distances between adjacent cell pairs:

```typescript
export class H3AdjacencyMatrix {
  // Existing state ...
  protected readonly distanceCache: Map<string, number> = new Map();

  /**
   * Computes or retrieves cached centroid-to-centroid geodesic distance
   * between two indexed H3 cells.
   */
  public getCentroidDistance(cellIndexA: string, cellIndexB: string): number;
}
```

---

## 5. Monad Stock Transitions & Integration

While `calculateHaversineDistance` is a geometric utility, it directly enables spatial monad transitions in `SpatialMonad` and `EarthPod`:

```
+--------------------------+       calculateHaversineDistance(c_i, c_j)
| Cell i Centroid (lat,lng)| ---------------------------------------------> d_ij (meters)
| Cell j Centroid (lat,lng)|                                                    |
+--------------------------+                                                    |
                                                                                v
+--------------------------+     Diffusion Flux: J_ij = -D * (S_j - S_i) / d_ij
| SpatialMonad Stock State | <--------------------------------------------------+
| Mass/Energy Exchanges    |  Conserves: Mass_i + Mass_j = Constant
+--------------------------+  Satisfies: dS_universe / dt >= 0
```

---

## 6. Implementation Specifications

1. **Input Normalization:**
   - Handle both `{ lat, lng }` / `{ lat, lon }` objects and `[lat, lng]` coordinate tuples.
   - Convert degrees to radians: $\text{rad} = \text{deg} \times \frac{\pi}{180}$.
   - Clamp longitude deltas to wrap within $[-\pi, \pi]$.

2. **Numerical Robustness:**
   - Clamp intermediate sine square sum $a \in [0, 1]$ before evaluating `Math.sqrt(a)` and `Math.sqrt(1 - a)`.
   - Return `0.0` when coordinates are identical within floating point epsilon ($10^{-12}$).
   - Correctly evaluate antipodal coordinates without `NaN` propagation.

3. **Performance Budget:**
   - Microbenchmark target: $< 50\text{ ns}$ per invocation.
   - Zero object allocation in hot calculation path when called with primitives or reused tuples.

---

## 7. Verification & Testing Strategy

- **Test File:** `tests/sprint_046.test.ts`
- **Validation Points:**
  1. *Zero Distance:* Identical points (e.g., Equator/Prime Meridian `[0, 0]` to `[0, 0]`) evaluate to exactly `0.0` meters.
  2. *Known Geodesic Baselines:*
     - London (`51.5074, -0.1278`) to Paris (`48.8566, 2.3522`): $\approx 343.5\text{ km} \pm 0.5\%$.
     - New York (`40.7128, -74.0060`) to Tokyo (`35.6762, 139.6503`): $\approx 10,850\text{ km} \pm 0.5\%$.
     - Equator quadrant (`[0, 0]` to `[0, 90]`): $\frac{\pi}{2} R_\oplus \approx 10,007,543\text{ m}$.
  3. *Antipodal Points:* `[0, 0]` to `[0, 180]` or `[90, 0]` to `[-90, 0]` evaluates to $\pi R_\oplus \approx 20,015,087\text{ m}$.
  4. *Symmetry Property:* `calculateHaversineDistance(a, b) === calculateHaversineDistance(b, a)`.
  5. *Triangle Inequality:* For arbitrary centroids $A, B, C$, $d(A, C) \le d(A, B) + d(B, C) + \epsilon$.
  6. *Thermodynamic Consistency:* Distance values are strictly positive ($d \ge 0$) and finite.

---

## 8. Rollout & Backward Compatibility

- Pure extension to `src/spatial/h3_adjacency.ts`.
- Existing adjacency topology methods (`areNeighbors`, `getNeighbors`, `getAdjacencyMatrix`) remain backward-compatible without breaking changes.
- Caching layer within `H3AdjacencyMatrix` uses lazy evaluation to ensure zero memory overhead for simulations running topological-only graphs.