# Developer Onboarding & Contributor Guide — Sprint 063
## Discrete Geodesic Boundary Normals & Darboux Frame Integration

Welcome to the **Web of Life** contributor guide for Sprint 063! Whether you are a computational geometer, an atmospheric/oceanic dynamics engineer, or a graphics programmer passionate about planetary simulations, this sprint introduces core foundations for discrete transport on the sphere.

Repository: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)

---

## 1. Sprint 063 Overview: The Darboux Boundary Normal

In Earth system modeling on geodesic discrete global grids (such as H3 hexagonal/pentagonal tessellations), mass, moisture, and thermal energy flow horizontally across one-dimensional boundary edges between adjacent Voronoi cells on $S^2 \subset \mathbb{R}^3$.

Building upon:
- **Sprint 061**: Shared boundary midpoint identification (`computeSharedBoundaryMidpoint3D`).
- **Sprint 062**: Boundary edge tangent vector computation (`computeBoundaryTangentVector3D`).

**Sprint 063** completes the local boundary **Darboux frame** $(\hat{\mathbf{t}}, \hat{\mathbf{n}}_h, \hat{\mathbf{r}})$ by implementing `computeBoundaryHorizontalNormal3D` in `src/spatial/h3_adjacency.ts`.

### Mathematical Intuition
Given:
- Midpoint position vector $\mathbf{m} \in S^2$ with outward radial normal $\hat{\mathbf{r}} = \mathbf{m} / \|\mathbf{m}\|$,
- Unit tangent vector along the edge $\hat{\mathbf{t}} \in T_{\mathbf{m}}S^2$,

The in-plane horizontal unit normal is:
$$\hat{\mathbf{n}}_h = \frac{\hat{\mathbf{t}} \times \hat{\mathbf{r}}}{\|\hat{\mathbf{t}} \times \hat{\mathbf{r}}\|}$$

This vector points in the tangent plane of the sphere while remaining perpendicular to the cell edge. Crucially:
$$\hat{\mathbf{n}}_h \cdot \hat{\mathbf{r}} \equiv 0$$
This guarantees **zero spurious vertical leakage**, isolating horizontal barotropic advection and diffusion from vertical convective processes.

---

## 2. Quickstart & Local Development

Our project uses **TypeScript** and **Node.js**.

### 2.1 Setup Repository
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### 2.2 Run Sprint 063 Verification Suite
Run the unit test suite directly using `npx tsx`:
```bash
npx tsx tests/sprint_063.test.ts
```

All tests check:
1. **Equatorial Boundary Normal**: Verifies cross-product orientation along equator-aligned edges.
2. **Meridional Boundary Normal**: Validates orientation for edges spanning north-south lines of longitude.
3. **Unit Norm Invariance**: Validates $\|\hat{\mathbf{n}}_h\| = 1 \pm 10^{-12}$.
4. **Orthogonality**: Ensures $\hat{\mathbf{n}}_h \cdot \hat{\mathbf{t}} = 0 \pm 10^{-12}$ and $\hat{\mathbf{n}}_h \cdot \hat{\mathbf{r}} = 0 \pm 10^{-12}$.
5. **Degeneracy Handling**: Degenerate/collinear configurations return `{ x: 0, y: 0, z: 0 }` safely without throwing exceptions or generating `NaN`.

---

## 3. Code Walkthrough & API Usage

Here is how you can use the functions in `src/spatial/h3_adjacency.ts`:

```typescript
import { 
  computeBoundaryHorizontalNormal3D, 
  computeBoundaryHorizontalNormalFromEndpoints3D,
  Vector3D 
} from '../src/spatial/h3_adjacency';

// Example 1: Direct cross-product from precomputed tangent & radial normal
const tangent: Vector3D = { x: 0, y: 1, z: 0 };      // Eastward tangent
const radialNormal: Vector3D = { x: 1, y: 0, z: 0 }; // Outward radial vector on equator
const normal = computeBoundaryHorizontalNormal3D(tangent, radialNormal);
// Result: { x: 0, y: 0, z: -1 } (orthogonal southward normal)

// Example 2: High-level composed calculation from geodesic endpoints
const v1: Vector3D = { x: 6371000, y: -1000, z: 0 };
const v2: Vector3D = { x: 6371000, y:  1000, z: 0 };
const midpoint: Vector3D = { x: 6371000, y: 0, z: 0 };

const horizontalNormal = computeBoundaryHorizontalNormalFromEndpoints3D(v1, v2, midpoint);
```

---

## 4. Good First Issues & Extension Opportunities

We welcome open-source contributions! Here are high-impact extension points ready for new contributors:

### Issue #1: Implement a Godunov Upwind Mass Flux Monad
- **File**: `src/simulation/monads/advective_transport_monad.ts`
- **Difficulty**: Good First Issue (Intermediate)
- **Goal**: Using `computeBoundaryHorizontalNormal3D`, write a pure functional monad `AdvectiveTransportMonad` that takes two neighboring H3 cell states (air mass, moisture, carbon fractions) and a midpoint wind velocity $\mathbf{u} \in \mathbb{R}^3$, computes the scalar normal velocity $u_n = \mathbf{u} \cdot \hat{\mathbf{n}}_{ij}$, and evaluates conservative upwind mass exchanges.
- **Verification**: Ensure mass conservation $\sum \Delta M = 0$ across all facets.

### Issue #2: WebGL 2.0 / WebGPU Darboux Frame Visualizer Shader
- **File**: `src/render/shaders/darboux_triad.vert.glsl` and `src/render/shaders/darboux_triad.frag.glsl`
- **Difficulty**: Good First Issue (Graphics)
- **Goal**: Build an instanced line shader rendering the local boundary triad at cell midpoints:
  - Red: Boundary Tangent ($\hat{\mathbf{t}}$)
  - Green: Horizontal Normal ($\hat{\mathbf{n}}_h$)
  - Blue: Outward Radial Vertical ($\hat{\mathbf{r}}$)
- **Bonus**: Animate normal vectors modulated by the horizontal scalar flux intensity $|u_n|$.

### Issue #3: Geodesic Surface Divergence Monad
- **File**: `src/spatial/discrete_calculus.ts`
- **Difficulty**: Intermediate
- **Goal**: Implement the discrete Gauss divergence theorem for an H3 cell $\Omega_i$:
  $$\operatorname{div}(\mathbf{u})_i = \frac{1}{A_i} \sum_{j \in \mathcal{N}(i)} (\mathbf{u} \cdot \hat{\mathbf{n}}_{ij}) L_{ij}$$
  where $L_{ij}$ is the geodesic edge length and $A_i$ is cell spherical area.

---

## 5. Contribution Guidelines

1. Fork `https://github.com/pascalranoroarijaona/WebOfLife`.
2. Create a feature branch: `git checkout -b feature/issue-title`.
3. Add unit tests in `tests/` covering new monads or shader math.
4. Verify tests run cleanly: `npx tsx tests/<your_test>.test.ts`.
5. Open a Pull Request referencing your issue.