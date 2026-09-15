<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 070 Contributor & Developer Onboarding Guide
## Angular Tolerance Comparison for 3D Cartesian Unit Vectors in H3 Adjacency

Welcome to the **Web of Life** open-source contributor community! Whether you are interested in discrete global grid systems (DGGS), discrete differential geometry, geophysical fluid dynamics, or WebGL planetary visualization, Sprint 070 brings foundational improvements to spatial topology and conservative flux routing across spherical surfaces.

---

### 1. Repository & Quickstart

- **Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Primary Stack**: Node.js & TypeScript (Strict Mode)

#### Local Setup
Clone the repository and install project dependencies using `npm`:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

#### Running Tests
Run the test suite for Sprint 070 using `npx tsx`:

```bash
npx tsx tests/sprint_070.test.ts
```

*(Note: Web of Life is an end-to-end TypeScript/Node.js project. Never use Python, `pip`, or `pytest` in this repository.)*

---

### 2. What Was Added in Sprint 070?

When working with spherical icosahedral grids (such as Uber's H3 hierarchical hexagonal spatial index) projected onto the unit sphere $\mathbb{S}^2$, polygon vertices are represented as 3D Cartesian unit vectors:
$$\mathbf{v} = (x, y, z) \in \mathbb{R}^3 \quad \text{where } \|\mathbf{v}\|_2 = 1$$

Due to floating-point truncation in non-associative IEEE 754 arithmetic, direct equality checks (`v1.x === v2.x`) fail when matching shared polygon vertices between adjacent cells. This leads to **boundary tears**, **orphaned interface facets**, and **leaks in mass and thermal energy**.

Sprint 070 introduces:
1. **`areCartesianUnitVectorsEqual3D`** in `src/spatial/h3_adjacency.ts`:
   - Computes the clamped inner product: $\sigma = \operatorname{clamp}(\mathbf{u} \cdot \mathbf{w}, -1.0, 1.0)$.
   - Evaluates the angular separation: $\theta = \arccos(\sigma)$.
   - Compares $\theta \le \epsilon$, with default $\epsilon = 1.0 \times 10^{-9}\text{ rad}$ ($\approx 6.37\text{ mm}$ on Earth's surface).
   - Automatically normalizes unnormalized vector inputs when $\|\mathbf{v}\|_2 \ne 1$.
2. **`SpatialFluxMonad` Conjugacy Enforcement** in `src/spatial/spatial_flux_monad.ts`:
   - Validates that cell boundary edges match conjugates: $\mathbf{v}_1 \leftrightarrow \mathbf{w}_2$ and $\mathbf{v}_2 \leftrightarrow \mathbf{w}_1$.
   - Ensures exact skew-symmetry: $\Delta \mathbf{S}_i + \Delta \mathbf{S}_j = \mathbf{0}$.
   - Guarantees non-negative entropy production $\dot{S}_{ij} \ge 0$ during advection and diffusion.

---

### 3. Architecture Overview

```
src/
├── spatial/
│   ├── h3_types.ts             # CartesianVector3D and geometric interfaces
│   ├── h3_adjacency.ts         # areCartesianUnitVectorsEqual3D, vertex deduplication
│   └── spatial_flux_monad.ts   # Finite volume advection/diffusion across conjugate facets
tests/
└── sprint_070.test.ts          # Unit and property verification suite
```

#### Code Example: Using the Comparator

```typescript
import { areCartesianUnitVectorsEqual3D, DEFAULT_ANGULAR_EPSILON } from '../src/spatial/h3_adjacency';
import { CartesianVector3D } from '../src/spatial/h3_types';

const v1: CartesianVector3D = { x: 0.0, y: 0.0, z: 1.0 };
const v2: CartesianVector3D = { x: 1e-10, y: 0.0, z: Math.sqrt(1 - 1e-20) };

// Evaluates true within default epsilon (1e-9 rad)
const isEqual = areCartesianUnitVectorsEqual3D(v1, v2, DEFAULT_ANGULAR_EPSILON);
console.log(`Vectors match within tolerance: ${isEqual}`);
```

---

### 4. Good First Issues & Contributor Extension Points

Looking to make your first open-source contribution to Web of Life? Here are curated entry points across mathematical monads and WebGL graphics:

#### Issue A (Monad / Performance): Fast-Path Small-Angle Optimization
- **Goal**: In high-throughput spatial loops (100,000+ comparisons/sec), avoid calling `Math.acos`.
- **Details**: For $\epsilon < 0.1\text{ rad}$, $\theta \le \epsilon \iff \mathbf{u} \cdot \mathbf{w} \ge \cos(\epsilon)$. Implement a branch that precomputes $\cos(\epsilon)$ and directly evaluates the dot product when $\epsilon$ is small.
- **Location**: `src/spatial/h3_adjacency.ts`.
- **Skills**: TypeScript, vector algebra.

#### Issue B (WebGL / Visualization): Visualizing Boundary Mismatch & Facet Normals
- **Goal**: Create a WebGL2 / Three.js debug pass that visualizes cell interface edges on the 3D globe.
- **Details**: Render outward normal vectors $\mathbf{n}_{ij}$ at shared hexagonal edges. If two neighboring cells have mismatched vertices exceeding $\epsilon$, highlight the edge in crimson (`#FF0055`) to indicate numerical boundary tears.
- **Location**: `src/rendering/shaders/boundary_debug.frag.glsl` and `src/rendering/h3_overlay_mesh.ts`.
- **Skills**: GLSL shaders, WebGL, 3D graphics.

#### Issue C (Atmospheric Monad): Baroclinic Jet Advection Extension
- **Goal**: Implement Coriolis-deflected flux routing using `SpatialFluxMonad`.
- **Details**: Compute planetary vorticity $f = 2\Omega \sin\phi$ from vertex coordinates and deflect boundary velocity vectors $\mathbf{u}_{ij}$, verifying that mass conservation $\Delta \mathbf{S}_i + \Delta \mathbf{S}_j = \mathbf{0}$ holds across the equator.
- **Location**: `src/spatial/spatial_flux_monad.ts`.
- **Skills**: Fluid dynamics, TypeScript.

---

### 5. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/fast-path-angular-check`.
2. Commit your changes following Conventional Commits (e.g., `feat(spatial): add small-angle fast path to areCartesianUnitVectorsEqual3D`).
3. Ensure the test suite passes: `npx tsx tests/sprint_070.test.ts`.
4. Open a Pull Request on GitHub targeting `main`. Join our developer discussions in the repository Issues tab!
```

---