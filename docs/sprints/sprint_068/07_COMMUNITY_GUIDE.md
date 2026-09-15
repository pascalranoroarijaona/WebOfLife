<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 068 Contributor Guide: Geodesic Boundary Extraction & 3D Flux Transport

Welcome to the **Web of Life** developer community! Whether you are an experienced numerical simulation engineer, a graphics developer eager to craft WebGL shaders, or an open-source contributor interested in biophysical modeling, we are thrilled to have you here.

* **Repository:** [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
* **Stack:** TypeScript, Node.js, WebGL2, Uber H3 Discrete Global Grid System (DGGS)

---

## 1. Sprint 068 Overview: What's New?

In Sprint 068, we introduced exact analytical 3D spherical boundary extraction between neighboring discrete cells in the global grid.

### The Problem We Solved
Previously, inter-cell flux transport (heat, moisture, carbon, biomass) relied on isotropic Euclidean centroid approximations ($d_{ij}$). On an icosahedral spherical manifold (H3 DGGS):
- Planar approximations break down near pentagonal cells and across distorted geodesic triangles.
- Without exact 3D Cartesian coordinates for the boundary endpoints $[\mathbf{v}_1, \mathbf{v}_2]$, numerical advective-diffusive fluxes could introduce asymmetry ($A_{ij} \neq A_{ji}$), leading to subtle violations of the First Law of Thermodynamics (mass/energy creation or destruction).
- WebGL rendering of cell borders and transport streams displayed alignment artifacts.

### The Solution: `extractSharedBoundaryVertices3D`
Exported from `src/spatial/h3_adjacency.ts`, this operator:
1. Validates topological adjacency between `cellA` and `cellB`.
2. Matches common spherical boundary vertices within geometric tolerance $\epsilon = 10^{-5} \cdot R$.
3. Returns a deterministic Cartesian tuple $[\mathbf{v}_1, \mathbf{v}_2]$ with outward normal $\hat{\mathbf{n}}_{AB} = -\hat{\mathbf{n}}_{BA}$ pointing into `cellB`.
4. Guarantees identical interface arc length $L_{AB} = R \arccos\left(\frac{\mathbf{v}_1 \cdot \mathbf{v}_2}{R^2}\right)$ and machine-precision zero-sum conservation.

---

## 2. Quickstart: Setting Up Your Environment

This project uses **TypeScript** and **Node.js**.

### Prerequisites
- Node.js (v18.x or v20.x recommended)
- npm (v9.x+)

### Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Sprint 068 Tests
All tests are written in TypeScript and executed via `tsx`:

```bash
npx tsx tests/sprint_068.test.ts
```

To run all spatial tests:
```bash
npx tsx --test tests/sprint_*.test.ts
```

---

## 3. Code Walkthrough: Working with `extractSharedBoundaryVertices3D`

Here is how you can use the newly implemented boundary extraction in your own spatial algorithms or monads:

```typescript
import { extractSharedBoundaryVertices3D } from '../src/spatial/h3_adjacency';
import { EARTH_RADIUS_METERS } from '../src/spatial/h3_types';

const cellA = '8828308281fffff'; // Example H3 cell
const cellB = '8828308283fffff'; // Adjacent neighbor cell

// Extract shared boundary endpoints in 3D Cartesian coordinates (meters)
const endpoints = extractSharedBoundaryVertices3D(cellA, cellB, EARTH_RADIUS_METERS);

if (endpoints) {
  const [v1, v2] = endpoints;
  console.log(`Endpoint 1: [x=${v1[0]}, y=${v1[1]}, z=${v1[2]}]`);
  console.log(`Endpoint 2: [x=${v2[0]}, y=${v2[1]}, z=${v2[2]}]`);

  // Compute exact geodesic interface arc length
  const cosTheta = (v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]) / (EARTH_RADIUS_METERS ** 2);
  const lengthMeters = EARTH_RADIUS_METERS * Math.acos(Math.max(-1.0, Math.min(1.0, cosTheta)));
  console.log(`Shared boundary length: ${(lengthMeters / 1000).toFixed(2)} km`);
} else {
  console.warn('Cells are non-adjacent or invalid!');
}
```

---

## 4. Good First Issues & Contributor Extension Points

Looking to make your first contribution to Web of Life? Here are curated entry points directly building upon Sprint 068:

### Extension Point A: WebGL Flow-Vector Edge Shader (Graphics Track)
- **Goal:** Render dynamic advective flux arrows directly along shared geodesic facets in the 3D globe viewer.
- **Where to start:** `src/rendering/shaders/flux_edge.vert.glsl` and `src/rendering/shaders/flux_edge.frag.glsl`.
- **Task:** 
  1. Ingest `[v1, v2]` from `SpatialAdjacencyGraph.getSharedEdge(cellA, cellB)`.
  2. Extrude the geodesic line into a camera-facing screen quad in the vertex shader.
  3. Animate a pulsating dash pattern in the fragment shader proportional to velocity $u_n = \mathbf{u} \cdot \hat{\mathbf{n}}_{AB}$.
- **Labels:** `good first issue`, `webgl`, `shaders`

### Extension Point B: River Basin Transmissibility Monad (Simulation Track)
- **Goal:** Build a `RiverHydrologyMonad` that computes downhill hydraulic gradients across boundary facets.
- **Where to start:** `src/monads/hydrology_monad.ts`.
- **Task:**
  1. Retrieve elevation $z_A, z_B$ from adjacent cell states.
  2. Use `extractSharedBoundaryVertices3D` to calculate cross-sectional flow area $A_{ij} = L_{ij} \cdot \Delta z_{\text{water}}$.
  3. Apply Manning's roughness equation across $\hat{\mathbf{n}}_{AB}$ to model surface runoff discharge.
- **Labels:** `good first issue`, `monads`, `biophysics`

### Extension Point C: Boundary Edge Caching Optimization
- **Goal:** Implement an LRU cache or sparse matrix indexing for `extractSharedBoundaryVertices3D` inside `SpatialAdjacencyGraph`.
- **Where to start:** `src/spatial/h3_adjacency.ts`.
- **Task:**
  1. Ensure cache keys are canonicalized (`cellA < cellB ? cellA:cellB : cellB:cellA`).
  2. Add automated cache invalidation when planetary radius or grid resolutions dynamically change.
- **Labels:** `performance`, `typescript`

---

## 5. Development Workflow & Submitting a PR

1. **Fork and Branch:**
   ```bash
   git checkout -b feature/my-new-monad-or-shader
   ```
2. **Follow Code Conventions:**
   - Strict TypeScript, zero `any` types.
   - Enforce First & Second Law thermodynamic invariants (conservative flux transfers must sum to zero).
3. **Write Unit Tests:**
   - Create a test file in `tests/` and run:
   ```bash
   npx tsx tests/my_feature.test.ts
   ```
4. **Open a Pull Request:**
   - Submit your PR against `main` on [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife).
   - Reference the issue number and provide sample test output.

Happy coding, and welcome to the planetary modeling ecosystem!