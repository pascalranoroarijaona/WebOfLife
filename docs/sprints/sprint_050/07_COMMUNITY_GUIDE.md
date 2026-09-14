<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 050 Contributor & Onboarding Guide: Discrete Vertical Boundary Contact Areas & Stratified Lateral Transport

Welcome to Sprint 050 of **WebOfLife**! Whether you are a mathematical modeler, computational fluid dynamicist, functional programming enthusiast, or WebGL graphics engineer, this sprint introduces foundational geometric and physical primitives to our planetary simulation engine.

---

## 1. Quickstart & Development Environment

### 1.1 Repository & Technology Stack
WebOfLife is built entirely with **TypeScript** and **Node.js**, leveraging deterministic functional pipelines and category-theoretic monads to model coupled Earth systems.

- **Official Repository:** [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Runtime:** Node.js (v20.x or v22.x LTS recommended)
- **Package Manager:** npm

> **Note:** Do **not** use Python tooling (`pip`, `pytest`, etc.). All tests and build tools run natively in Node.js using TypeScript.

### 1.2 Setup Instructions

Clone the repository and install all dependencies:
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### 1.3 Running Sprint 050 Tests
To execute and verify the test suite for Sprint 050, run:
```bash
npx tsx tests/sprint_050.test.ts
```

To run the full regression test suite across all sprints:
```bash
npm test
```

---

## 2. Sprint 050 Architecture Overview

### 2.1 The Problem: Flat 2D Adjacency vs. 3D Planetary Strata
Prior to Sprint 050, spatial interactions in `src/spatial/h3_adjacency.ts` relied on 2D planar approximations or 1D edge lengths $L_{\text{edge}}$. However, real-world planetary dynamics occur across stratified vertical layers:
- **Atmospheric strata:** Tropospheric, stratospheric, and boundary-layer advection.
- **Hydrospheric layers:** Epipelagic, mesopelagic, and bathypelagic oceanic currents.
- **Edaphic/Lithospheric horizons:** Topsoil, subsoil, unconfined aquifers, and bedrock.

When two adjacent hexagonal cells have different surface elevations or vertical stratum thicknesses (e.g., a high mountain plateau adjacent to a low river basin), fluid and thermal fluxes cannot pass through solid bedrock or empty space. 

### 2.2 The Solution: `calculateH3BoundaryContactArea`
Sprint 050 introduces `calculateH3BoundaryContactArea` in `src/spatial/h3_adjacency.ts`, delivering:
1. **Vertical Stratum Clipping:** Computes the exact 1D vertical overlap $\Delta z_{\text{overlap}} = \max\left(0, \min(z_{u,\text{top}}, z_{v,\text{top}}) - \max(z_{u,\text{base}}, z_{v,\text{base}})\right)$.
2. **Radial Metric Expansion:** Corrects boundary geodesic edge length for altitude/depth: $\gamma(\bar{z}) = 1 + \frac{\bar{z}}{R_{\text{Earth}}}$.
3. **Exact Thermodynamic Invariance:** Strictly guarantees boundary symmetry $A_{\text{contact}}(u, v) \equiv A_{\text{contact}}(v, u)$ to avoid numerical mass/energy leaks.
4. **Boundary Guard Rails:** Non-adjacent cells or vertically disjoint strata automatically evaluate to an area of $0.0\,\text{m}^2$.

```
       Cell u (Stratum)                 Cell v (Stratum)
    z_u,top -----------------
            |               |        z_v,top -----------------
            |   Overlap     |================|   Overlap     |
            |   Region      |  A_contact     |   Region      |
    z_u,base-----------------        z_v,base-----------------
                                             |  (Blocked)    |
                                             -----------------
```

---

## 3. Core Developer API & Usage Examples

### 3.1 Data Structures (`src/spatial/h3_types.ts`)
```typescript
import { 
  IVerticalStratum, 
  IH3BoundaryContactAreaOptions, 
  IH3BoundaryContactAreaResult 
} from './spatial/h3_types';
```

### 3.2 Calculating Boundary Contact Area
```typescript
import { calculateH3BoundaryContactArea } from './spatial/h3_adjacency';

// Define adjacent H3 cells at Resolution 3
const cellA = '831f95fffffffff';
const cellB = '831f94fffffffff';

// Define vertical layers relative to Mean Sea Level (MSL in meters)
const stratumA = { zBaseMeters: 0, zTopMeters: 500 };   // 0m to 500m
const stratumB = { zBaseMeters: 200, zTopMeters: 800 }; // 200m to 800m

const contact = calculateH3BoundaryContactArea(cellA, stratumA, cellB, stratumB);

console.log(`Adjacent: ${contact.isAdjacent}`);
console.log(`Overlap Height: ${contact.overlapHeightMeters} m`); // 300 m
console.log(`Boundary Length: ${contact.boundaryLengthMeters} m`);
console.log(`Total Contact Area: ${contact.contactAreaM2} m^2`);
```

### 3.3 Conservative Mass and Enthalpy Transfer Example
```typescript
import { computeLateralBoundaryTransfer } from './spatial/lateral_transport';

const stocksA = {
  massWaterKg: 1.0e8,
  massCarbonKg: 5.0e4,
  massOxygenKg: 2.0e4,
  massMineralsKg: 1.0e3,
  internalEnergyJoules: 4.184e11,
};

const stocksB = {
  massWaterKg: 5.0e7,
  massCarbonKg: 2.0e4,
  massOxygenKg: 1.0e4,
  massMineralsKg: 5.0e2,
  internalEnergyJoules: 2.092e11,
};

const transport = computeLateralBoundaryTransfer(
  cellA, stratumA, stocksA,
  cellB, stratumB, stocksB,
  {
    timeStepSeconds: 3600,       // 1 hour
    normalVelocityMs: 0.15,      // 0.15 m/s advective current from A to B
    fluidDensityKgM3: 1025.0,    // Seawater density
    distanceCentroidsMeters: 12000,
  }
);

// Mass and energy conservation invariant: deltaStocksA + deltaStocksB === 0
console.log(transport.deltaStocksA.massWaterKg + transport.deltaStocksB.massWaterKg); // ~0.0
```

---

## 4. "Good First Issues" & Extension Points

We welcome contributions from community developers! Below are curated open issues and extension pathways designed for newcomers and specialized contributors.

---

### Issue #E50-1: Lateral Darcy Groundwater Seepage Monad
- **Area:** Thermodynamic & Hydrologic Monads (`src/monads/`)
- **Difficulty:** Intermediate (`good-first-issue`, `monads`)
- **Description:**  
  Build a dedicated monadic stage `AquiferSeepageMonad` implementing lateral Darcy flow between unconfined and confined aquifer strata across neighboring cells.
- **Requirements:**
  1. Use `calculateH3BoundaryContactArea` to obtain the saturated vertical cross-section.
  2. Implement hydraulic head gradient calculation:
     $$\mathbf{j}_{\text{water}}^{\text{Darcy}} = -\rho_w K_{\text{sat}} \frac{h_v - h_u}{d_{uv}}$$
  3. Ensure conservation of total fluid mass across state transitions.
  4. Write unit tests under `tests/monads/aquifer_seepage.test.ts`.

---

### Issue #E50-2: WebGL 3D Stratified Hex Prism & Boundary Ribbon Renderer
- **Area:** Graphics & Visualization (`src/rendering/shaders/`)
- **Difficulty:** Intermediate (`good-first-issue`, `webgl`, `shaders`)
- **Description:**  
  Extend our WebGL2 client-side renderer to visualize discrete vertical contact boundaries as glowing semi-transparent polygonal ribbons between H3 prisms.
- **Requirements:**
  1. Create a vertex/fragment shader pair: `vertical_boundary.vert.glsl` and `vertical_boundary.frag.glsl`.
  2. Accept instanced buffer attributes: `vec3 a_vertex1`, `vec3 a_vertex2`, `float a_zBase`, `float a_zTop`, and `float a_fluxMagnitude`.
  3. Color the vertical interface dynamically based on flux intensity (e.g., cold blue for inward ocean current, warm amber for outward sensible heat transfer).
  4. Integrate the draw call in `src/rendering/hex_prism_renderer.ts`.

---

### Issue #E50-3: WebGL GPGPU Boundary Flux Reduction Kernel
- **Area:** Compute Shaders / GPGPU (`src/rendering/compute/`)
- **Difficulty:** Advanced (`help-wanted`, `gpgpu`, `performance`)
- **Description:**  
  Implement a WebGL2 Transform Feedback or WebGPU compute kernel that performs lateral flux divergence calculation over hundreds of thousands of H3 boundaries in parallel.
- **Requirements:**
  1. Encode cell stratum heights $[z_{\text{base}}, z_{\text{top}}]$ into a 2D float texture.
  2. Evaluate the overlap equation $\Delta z = \max(0.0, \min(z_{top,1}, z_{top,2}) - \max(z_{base,1}, z_{base,2}))$ in GLSL.
  3. Output accumulated divergence deltas $\sum_{j} J_{ij} A_{ij}$ back to state buffers without CPU roundtrips.

---

### Issue #E50-4: Geodesic Vertex Ordering & Edge Metric Cache Optimization
- **Area:** Core Spatial Engine (`src/spatial/`)
- **Difficulty:** Beginner / Intermediate (`good-first-issue`, `performance`)
- **Description:**  
  In high-frequency simulations with static bathymetry/elevation, calculating great-circle distances repeatedly can bottleneck the simulation.
- **Requirements:**
  1. Implement an LRU or static lookup table in `H3AdjacencyManager` caching base geodesic edge lengths $L_{\text{geodesic}}(u, v)$.
  2. Verify that canonical sorting `u < v ? [u, v] : [v, u]` prevents redundant evaluations.
  3. Benchmark using `npx tsx benchmark/spatial_adjacency_bench.ts`.

---

## 5. Pull Request & Testing Guidelines

1. **Deterministic Functional Purity:** Keep core thermodynamic updates pure and free of side effects.
2. **Conservation Invariants:** Always include test assertions verifying machine-precision conservation:
   $$\left| \sum \Delta \text{Mass} \right| < 10^{-12}$$
3. **Continuous Integration:** Run formatting and sprint tests locally before submitting your PR:
   ```bash
   npm run lint
   npx tsx tests/sprint_050.test.ts
   ```

Have questions or want to discuss architecture? Open an issue or join our community discussions on [GitHub Discussions](https://github.com/pascalranoroarijaona/WebOfLife/discussions). Welcome aboard!
```

---