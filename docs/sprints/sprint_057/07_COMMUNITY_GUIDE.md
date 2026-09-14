# Developer Onboarding & Contributor Guide — Sprint 057
**Geodesic Azimuth Vectorization: Forward Spherical Arc Bearing for Directional Advection**

Welcome to the **Web of Life** contributor community! This guide provides everything you need to understand, build, and extend the geodesic vectorization and spatial advection pipelines introduced in Sprint 057.

* **Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
* **Primary Stack**: TypeScript 5.x, Node.js (v20+ LTS), WebGL2 / GLSL
* **Execution & Test Framework**: `npm` and `npx tsx`

---

## 1. Sprint 057 Feature Overview

Sprint 057 introduces forward geodesic initial azimuth calculations directly into `src/spatial/h3_adjacency.ts`.

In planetary biosphere simulations, transporting scalar stocks (carbon, water vapor, marine nutrients, atmospheric spores) across discrete hexagonal partitions (Uber H3 DGGS) requires continuous directional guidance. Planar Euclidean projections fail near the poles and produce catastrophic discontinuities across the $\pm 180^\circ$ antimeridian. 

Sprint 057 implements exact spherical trigonometry on the WGS-84 reference sphere ($R_\oplus = 6,371,008.8\text{ m}$), coupling discrete H3 cell edges to continuous advection velocity vectors.

### Core Additions
* **`computeSphericalArcBearing(origin: LatLngPoint, destination: LatLngPoint): number`**  
  Pure function calculating initial geodesic azimuth in radians $[0, 2\pi)$ clockwise from True North.
* **`computeDetailedBearing(origin: LatLngPoint, destination: LatLngPoint): GeodesicBearingResult`**  
  Returns radial bearing, degree azimuth $[0, 360^\circ)$, metric great-circle distance (Vincenty/Haversine formulation), and orthonormal tangent plane unit vectors $\hat{\mathbf{n}} = (u_{\text{East}}, v_{\text{North}})$.
* **Singularity Guardrails**: Full numerical edge-case handling for coincident coordinates, polar departures/arrivals, antimeridian transit ($\Delta\lambda$ periodic wrapping), and antipodal degeneracies.

---

## 2. Quickstart Environment Setup

We strictly use Node.js and TypeScript. Do not use Python or virtual environments.

```bash
# 1. Clone the canonical repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# 2. Install workspace dependencies
npm install

# 3. Verify installation and run Sprint 057 verification suite
npx tsx tests/sprint_057.test.ts
```

All test suites across the engine are executed via `npx tsx tests/sprint_N.test.ts`.

---

## 3. Architecture & Code Tour

### 3.1 Interface Contracts (`src/spatial/h3_types.ts` & `src/spatial/h3_adjacency.ts`)

```typescript
export interface LatLngPoint {
  readonly lat: number; // Degrees in [-90, 90]
  readonly lng: number; // Degrees in [-180, 180]
}

export interface GeodesicBearingResult {
  readonly initialAzimuthRad: number; // [0, 2*pi)
  readonly initialAzimuthDeg: number; // [0, 360)
  readonly distanceMeters: number;    // Great circle arc length
  readonly unitVector: {
    readonly uEast: number;           // sin(azimuth)
    readonly vNorth: number;          // cos(azimuth)
  };
}
```

### 3.2 How Advection Uses Bearings

When an atmospheric wind vector $\mathbf{v} = (u, v)$ blows across an H3 cell centroid $i$, the engine evaluates dot products with adjacent cell normal unit vectors:
$$v_{n, ij} = \mathbf{v} \cdot \hat{\mathbf{n}}_{ij} = u \sin(\theta_{ij}) + v \cos(\theta_{ij})$$

If $v_{n, ij} > 0$, mass transfers along directed edge $i \to j$. The Courant–Friedrichs–Lewy (CFL) condition guarantees numerical stability:
$$\sum_{j \in \mathcal{N}(i)} k_{ij} \le 1.0$$

---

## 4. Good First Issues for New Contributors

### Issue #1 (Good First Issue): WebGL Wind Direction Arrow Shader
* **Domain**: WebGL2 / GLSL
* **Target File**: `src/rendering/shaders/geodesic_flow.vert.glsl`, `src/rendering/shaders/geodesic_flow.frag.glsl`
* **Task**: Create an instanced geometry shader that renders directional flow vectors on the 3D globe. Each instance receives centroid coordinates $(\phi, \lambda)$ and the unit vector $(u_{\text{East}}, v_{\text{North}})$ from `computeDetailedBearing`.
* **Hint**: Rotate arrow meshes in the vertex shader using the precomputed $2 \times 2$ orthonormal basis.

### Issue #2 (Monad Extension): Spore Dispersal Spatial Monad
* **Domain**: Functional Architecture / Monads
* **Target File**: `src/monads/spore_dispersal_monad.ts`
* **Task**: Build a `SporeDispersalMonad` implementing anisotropic spore distribution. Spores settle probabilistically into downwind hex cells based on geodesic bearing and wind velocity while strictly conserving total biological mass $\sum M_{\text{spore}} = \text{const}$.
* **Test Command**: `npx tsx tests/spore_dispersal.test.ts`

### Issue #3 (Algorithm Optimization): SIMD/Vectorized Geodesic Cache
* **Domain**: Performance & Spatial Indexing
* **Target File**: `src/spatial/h3_adjacency.ts`
* **Task**: Precompute and pack static neighbor bearings into `Float32Array` buffers for fast contiguous memory lookups during the advection loop, minimizing repeated `atan2` calls during fixed-topology simulations.

---

## 5. Contribution & Pull Request Checklist

1. **Adhere to Invariants**: Ensure First-Law (mass-energy conservation to within $10^{-14}$) and Second-Law (non-negative entropy) compliance.
2. **Handle Geometry Extremes**: Always test $(-90^\circ, 0^\circ)$, $(90^\circ, 0^\circ)$, antimeridian crossings ($+179^\circ \to -179^\circ$), and identical points.
3. **Run Regression Tests**:
   ```bash
   npx tsx tests/sprint_057.test.ts
   npm run lint
   npm test
   ```
4. **Sign Off PR**: Follow standard Conventional Commits (`feat(spatial): ...`, `fix(monad): ...`).
```

---