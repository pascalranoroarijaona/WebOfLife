<!-- DevRel Onboarding & Contributor Guide -->
# Web of Life: Contributor Guide & Technical Onboarding — Sprint 065

Welcome to **Web of Life** (`https://github.com/pascalranoroarijaona/WebOfLife`), an open-source, thermodynamically consistent planetary biosphere simulation engine built with **TypeScript** and **Node.js**.

Sprint 065 delivers **`computeBoundaryCentroidDisplacement3D`** inside `src/spatial/h3_adjacency.ts`, establishing exact geocentric 3D directional vectors between discrete hexagonal cells on the spherical Earth manifold ($S^2$). This update resolves boundary advective fluxes, mass transport, and thermal diffusion without planar projection distortion.

---

## 1. Quickstart: Development Environment Setup

Our codebase is pure TypeScript running on Node.js.

### Prerequisites
- Node.js (v18.x or v20.x recommended)
- npm (v9.x or v10.x)
- Git

```bash
# Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install dependencies (strictly npm, no external runtimes)
npm install

# Run Sprint 065 test suite via tsx
npx tsx tests/sprint_065.test.ts
```

---

## 2. Sprint 065 Architecture & Core Mechanics

### 2.1 The Need for 3D Chord Vectors in Geocentric Space
Hexagonal cells partitioned via Uber's H3 grid wrap around the spherical Earth. When calculating advective transport (atmospheric moisture, ocean currents, thermal plumes) across cell facets, planar lat/lng approximations introduce severe distortions at high latitudes and across the international date line ($180^\circ \to -180^\circ$).

Sprint 065 introduces exact spherical-to-Cartesian mappings:
$$\mathbf{r}(\phi, \lambda) = \begin{bmatrix} \cos\phi \cos\lambda \\ \cos\phi \sin\lambda \\ \sin\phi \end{bmatrix}, \quad \vec{\Delta}_{12} = \mathbf{r}_2 - \mathbf{r}_1, \quad \hat{\mathbf{u}}_{12} = \frac{\vec{\Delta}_{12}}{\|\vec{\Delta}_{12}\|}$$

```typescript
import { computeBoundaryCentroidDisplacement3D, computeDetailedCentroidDisplacement3D } from './src/spatial/h3_adjacency';

// Example: Calculate unit displacement from Prime Meridian equator to 90 degrees East
const origin = { lat: 0, lng: 0 };
const target = { lat: 0, lng: 90 };

const uHat = computeBoundaryCentroidDisplacement3D(origin, target);
// uHat => { x: -0.7071067811865475, y: 0.7071067811865475, z: 0 }
```

### 2.2 Physical Invariants: First and Second Laws of Thermodynamics
- **First Law (Mass & Energy Conservation)**: Boundary fluxes must balance exactly. What leaves cell $A$ across $\hat{\mathbf{u}}$ enters cell $B$: $\sum_i \Delta M_i = 0$ and $\sum_i \Delta U_i = 0$.
- **Second Law (Non-negative Entropy Production)**: Conductive heat transport $\dot{Q}_{\text{diff}} = -k A \frac{T_2 - T_1}{D_{\text{chord}}}$ guarantees that $\dot{S}_{\text{prod}} \ge 0$.
- **Singularity Avoidance**: Coincident centroids ($\|\vec{\Delta}\| \le 10^{-12}$) cleanly yield `{ x: 0, y: 0, z: 0 }` to avoid division-by-zero.

---

## 3. "Good First Issues" for External Contributors

We welcome contributions! Below are curated issues targeting spatial algorithms and WebGL visualizers.

### Issue #GFI-065-A: WebGL Instanced Boundary Flux Velocity Shader
- **Area**: `src/rendering/shaders/` & WebGL2 Pipeline
- **Context**: Cells currently render as flat hexagonal rings. We want to render directional 3D flux arrows along $\hat{\mathbf{u}}_{12}$ between active cells.
- **Task**:
  1. Create a vertex shader `boundaryFlux.vert` that takes `attribute vec3 a_displacementVector` (computed via `computeBoundaryCentroidDisplacement3D`).
  2. Scale arrow glyphs dynamically using the magnitude of `v_flux` ($| \mathbf{v} \cdot \hat{\mathbf{u}} |$).
  3. Color-code arrows using kinetic enthalpy $\Delta H_{\text{adv}}$.
- **Skillset**: GLSL, WebGL2, TypeScript.

### Issue #GFI-065-B: Coriolis Acceleration Monad on 3D Displacement
- **Area**: `src/thermodynamics/coriolis_monad.ts`
- **Context**: In rotating reference frames, velocity vectors deflect via the Coriolis acceleration $\mathbf{a}_C = -2 (\mathbf{\Omega} \times \mathbf{v})$.
- **Task**:
  1. Build a functional state transformer (Monad) that takes an adjacent pair and computes the geostrophic deflection of $\hat{\mathbf{u}}_{12}$ based on latitude $\phi$.
  2. Ensure mass conservation holds identically ($\Delta M = 0$).
  3. Add test suite in `tests/coriolis_monad.test.ts`.
- **Skillset**: TypeScript, Vector Calculus.

### Issue #GFI-065-C: Great-Circle Chord vs. Arc Distance Benchmark Suite
- **Area**: `tests/benchmarks/geodesic_bench.ts`
- **Context**: Compare numerical precision and execution throughput between `computeDetailedCentroidDisplacement3D` and traditional Haversine implementations over $10^6$ cell evaluations.
- **Skillset**: Node.js profiling, TypeScript benchmarking.

---

## 4. Contributing Code Guidelines

1. **Branching**: `git checkout -b feature/issue-description`
2. **Coding Standards**:
   - Explicit immutable interfaces (`readonly` properties).
   - Zero synthetic mass/energy creation: enforce thermodynamic invariants.
   - Strict TypeScript: no `any`, ensure full typing.
3. **Validation**:
   - Run existing and new tests: `npx tsx tests/sprint_065.test.ts`
   - Run linting: `npm run lint` (or `npx eslint .`)
4. **Pull Requests**: Submit your PR targeting `main` at `https://github.com/pascalranoroarijaona/WebOfLife`.

Need help? Open an issue or join our community discussions on GitHub!