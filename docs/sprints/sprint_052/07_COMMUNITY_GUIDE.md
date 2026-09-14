<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 052 Contributor Guide: 3D Cartesian Spherical Unit Vectors (`latLngToUnitVector3D`) & Hexagonal Advection

Welcome to the **Web of Life** developer community! Whether you are interested in discrete global grid systems (DGGS), thermodynamics-first ecological simulations, functional state monads, or high-performance WebGL shaders, Sprint 052 provides the foundational geometric layer for spherical physics across the entire simulation engine.

---

## 1. Quickstart & Local Environment Setup

We build on **Node.js** and **TypeScript**. We strictly avoid Python toolchains; all tests and compilation are executed via modern Node tooling.

### Prerequisites
- Node.js (v18.x or v20.x LTS recommended)
- npm (v9.x or higher)
- Git

### Clone and Install
```bash
# Clone the official repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install TypeScript and project dependencies
npm install
```

### Run the Sprint 052 Test Suite
To verify the 3D unit vector projection and thermodynamic invariants:
```bash
npx tsx tests/sprint_052.test.ts
```

All tests should pass, validating cardinal projections, unit-norm invariance ($|\|\mathbf{u}\| - 1.0| < 10^{-15}$), antimeridian continuity, and solar insolation conservation.

---

## 2. What Shipped in Sprint 052?

In Sprint 052, we introduced `latLngToUnitVector3D` and supporting vector geometry primitives in `src/spatial/h3_adjacency.ts` and `src/spatial/h3_types.ts`.

### Why Cartesian Unit Vectors?
Uber H3 indexes discrete cells on the planet, but traditional geodesic coordinates $(\phi, \lambda)$ (latitude, longitude) suffer from coordinate singularities at the poles ($\pm 90^\circ$) and discontinuity wraps at the antimeridian ($\pm 180^\circ$). Calculating dot products, chord distances, and flux divergence in spherical coordinates leads to catastrophic floating-point cancellation.

By projecting centroids to unit 3D vectors $\mathbf{u} = [x, y, z]^T \in \mathbb{S}^2$:
1. **Solar Insolation:** Computed via instantaneous vector dot products:
   $$\cos(\theta_z) = \max(0, \mathbf{u} \cdot \mathbf{s}_\odot)$$
   where $\mathbf{s}_\odot$ is the subsolar point vector.
2. **First Law Energy Accounting:** Integrates without latitude-dependent distortion to exactly equal planetary cross-sectional energy:
   $$\int_{\text{illuminated}} F_{\text{solar}} \, dA = S_0 \pi R_\oplus^2$$
3. **Isotropic Advective Fluxes:** Eliminates polar metric stretching when calculating transport gradients between adjacent hexagons.

### Key API Signatures (`src/spatial/h3_adjacency.ts`)
```typescript
import {
  latLngToUnitVector3D,
  unitVectorDotProduct,
  unitVectorCrossProduct,
  unitVectorAngularDistance,
  unitVectorChordDistance
} from './src/spatial/h3_adjacency';

// Project latitude / longitude to an orthonormal 3D Cartesian unit tuple
const uParis = latLngToUnitVector3D(48.8566, 2.3522); // [x, y, z] on S^2

// Great-circle angular distance (radians) using atan2 (singularity-free)
const uTokyo = latLngToUnitVector3D(35.6762, 139.6503);
const angleRad = unitVectorAngularDistance(uParis, uTokyo);

// Solar incidence dot product
const subsolar = latLngToUnitVector3D(0.0, 0.0); // Equator at Prime Meridian
const cosZenith = Math.max(0.0, unitVectorDotProduct(uParis, subsolar));
```

---

## 3. Good First Issues & Contributor Extension Points

We are actively seeking contributors! Here are three mentored tasks with clear entry points.

---

### Good First Issue #1: Geodesic Bounding-Cone Culling
- **Difficulty:** Beginner / Intermediate
- **Component:** `src/spatial/spatial_index.ts`
- **Context:** When querying H3 cells inside a geographic bounding box, spherical bounding boxes fail near poles. Using 3D Cartesian vectors, any cluster of cells can be bounded by a **3D Spherical Cap** defined by a center unit vector $\mathbf{u}_c$ and opening angle $\theta_{\max}$.
- **Task:**
  1. Create a function `computeBoundingCone(vectors: UnitVector3D[]): { center: UnitVector3D; maxAngleRad: number }`.
  2. Implement an intersection test `isVectorInCone(target: UnitVector3D, cone: SphericalCone): boolean` using `unitVectorDotProduct(target, cone.center) >= Math.cos(cone.maxAngleRad)`.
  3. Write tests in `tests/bounding_cone.test.ts` and run them via `npx tsx tests/bounding_cone.test.ts`.

---

### Good First Issue #2: WebGL Terminator & Insolation Fragment Shader
- **Difficulty:** Intermediate (WebGL / GLSL)
- **Component:** `src/renderer/shaders/terminator.frag.ts`
- **Context:** Our frontend visualizer renders the planetary globe on a canvas. We need a WebGL fragment shader that consumes `attribute vec3 a_unitVector` and `uniform vec3 u_subsolarVector` to shade day/night illumination in real-time.
- **Task:**
  1. Write the GLSL fragment snippet:
     ```glsl
     precision highp float;
     varying vec3 v_unitVector;
     uniform vec3 u_subsolarVector;
     uniform float u_solarConstant;

     void main() {
       float cosZ = max(0.0, dot(v_unitVector, u_subsolarVector));
       float irradiance = u_solarConstant * cosZ;
       // Output irradiance as smooth atmospheric twilight gradient
       gl_FragColor = vec4(vec3(irradiance / 1361.0), 1.0);
     }
     ```
  2. Bind uniforms in TypeScript using the vectors returned by `latLngToUnitVector3D`.
  3. Validate against edge cases where vectors approach the terminator ($\mathbf{u} \cdot \mathbf{s}_\odot \approx 0$).

---

### Good First Issue #3: Monadic Atmospheric Advective Tracer Kernel
- **Difficulty:** Advanced (Functional Monads & DGGS Fluxes)
- **Component:** `src/monads/spatial_monad.ts`
- **Context:** With unit vectors in place, we want to advect atmospheric water vapor between adjacent H3 hexagons using upwind finite-volume schemes.
- **Task:**
  1. Extend `SpatialMonad<PlanetaryGridState>` to accept wind velocity vectors $\mathbf{v}_i \in \mathbb{R}^3$ defined on tangent planes ($\mathbf{v}_i \cdot \mathbf{u}_i = 0$).
  2. Calculate the normal component along the inter-cell chord:
     $$\mathbf{t}_{ij} = \frac{\mathbf{u}_j - \mathbf{u}_i}{\|\mathbf{u}_j - \mathbf{u}_i\|_2}, \quad v_{n, ij} = \mathbf{v}_i \cdot \mathbf{t}_{ij}$$
  3. Compute mass flux and ensure zero net divergence: $\sum_{i} \Delta m_{\text{vapor}, i} = 0$.
  4. Verify mass conservation with `npx tsx tests/sprint_052.test.ts`.

---

## 4. Submitting Pull Requests

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/bounding-cone-culling
   ```
2. **Ensure formatting and type checks pass:**
   ```bash
   npm run build
   npx tsx tests/sprint_052.test.ts
   ```
3. **Commit with descriptive conventional commits:**
   ```bash
   git commit -m "feat(spatial): implement spherical cap bounding cone using UnitVector3D"
   ```
4. **Push and open a PR** targeting `main` at `https://github.com/pascalranoroarijaona/WebOfLife`.

Need help? Open an issue or join discussions on our GitHub repository!
```

---