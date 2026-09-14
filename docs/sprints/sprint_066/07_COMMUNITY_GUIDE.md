<!-- DevRel Onboarding & Contributor Guide -->

# Contributor & Developer Guide: Sprint 066
## 3D Spherical Boundary Outward Normal Vector Computation (`computeBoundaryOutwardNormal3D`)

Welcome to the **Web of Life** developer community! Whether you are an ecological modeler, a numerical geometer, a graphics hacker, or a functional programming enthusiast, this guide will get you up to speed on the architectural breakthroughs delivered in Sprint 066 and show you how to start contributing.

- **Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Primary Tech Stack**: TypeScript, Node.js, WebGL/WebGPU
- **Sprint Focus Module**: `src/spatial/h3_adjacency.ts`

---

## 1. Fast-Track Developer Onboarding

### 1.1 Prerequisites & Environment Setup
We use Node.js (v18+ recommended) and TypeScript for all domain, physical, and monadic solvers.

```bash
# Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install exact dependencies
npm install

# Run the Sprint 066 test suite to verify your setup
npx tsx tests/sprint_066.test.ts
```

> **Note**: Do **not** use Python (`pip` or `pytest`). The Web of Life simulation engine is 100% native TypeScript and runs via Node.js and modern Web standards.

---

## 2. Sprint 066 Deep Dive: What Was Built?

### 2.1 The Problem on Spherical Discrete Global Grids
In Discrete Global Grid Systems (DGGS) like Uber's H3 projected onto the Earth sphere $\mathbb{S}^2$, modeling finite volume fluxes (e.g., shallow-water lateral flow, atmospheric nutrient advection, trophic migration) across cell boundaries requires calculating an **outward unit normal vector** $\hat{\mathbf{n}}_{ij}$.

Naive planar methods fail on a curved manifold:
- **Boundary Midpoint Normal ($\hat{\mathbf{n}}_{\text{mid}}$)**: Built from $(\mathbf{v}_b - \mathbf{v}_a) \times \hat{\mathbf{r}}$. While strictly orthogonal to the shared boundary arc, it can diverge from the transport axis when cell edges are skewed.
- **Centroid Displacement ($\hat{\mathbf{u}}_{\text{disp}}$)**: The direction connecting origin centroid $\mathbf{c}_i$ to neighbor centroid $\mathbf{c}_j$. It captures the transport gradient but ignores the orientation of the physical boundary interface.

### 2.2 The Solution: `computeBoundaryOutwardNormal3D`
In `src/spatial/h3_adjacency.ts`, Sprint 066 introduced `computeBoundaryOutwardNormal3D`. It synthesizes both vectors into a single mathematically rigorous normal vector via tangent plane projection and convex blending:

$$\mathbf{n}_{\text{blend}} = (1 - \alpha)\,\hat{\mathbf{n}}_{\text{mid}} + \alpha\,\hat{\mathbf{u}}_{\text{disp}}, \quad \alpha \in [0, 1]$$
$$\hat{\mathbf{n}}_{ij} = \frac{\mathbf{n}_{\text{blend}} - (\mathbf{n}_{\text{blend}} \cdot \hat{\mathbf{r}})\hat{\mathbf{r}}}{\|\mathbf{n}_{\text{blend}} - (\mathbf{n}_{\text{blend}} \cdot \hat{\mathbf{r}})\hat{\mathbf{r}}\|}$$

### 2.3 Key Thermodynamic & Numerical Properties
1. **Sphere Tangency**: $\hat{\mathbf{n}}_{ij} \cdot \hat{\mathbf{r}} = 0$ within machine precision ($< 10^{-12}$).
2. **Strict Outward Orientation**: $\hat{\mathbf{n}}_{ij} \cdot (\mathbf{c}_j - \mathbf{c}_i) > 0$.
3. **Exact Boundary Anti-Symmetry (First Law Conservation)**:
   $$\hat{\mathbf{n}}_{ji} = -\hat{\mathbf{n}}_{ij}$$
   Guarantees that fluxes leaving cell $i$ match fluxes entering cell $j$ exactly, preventing artificial creation or destruction of mass and energy.
4. **Second Law Compliance**: Diffusive transport along this normal maintains positive-definite entropy generation ($\dot{S}_{\text{gen}} \ge 0$).

---

## 3. Developer Usage Example

Here is how you can use the newly added API in your own spatial algorithms or monads:

```typescript
import {
  computeBoundaryOutwardNormal3D,
  Vector3D
} from './src/spatial/h3_adjacency';

// Define cell centroids on the Earth sphere (R = 6,371,008.8 meters)
const originCentroid: Vector3D = { x: 6371008.8, y: 0.0, z: 0.0 };
const neighborCentroid: Vector3D = { x: 6370908.8, y: 35700.0, z: 0.0 };

// Define shared boundary vertices between the two cells
const edgeVertexA: Vector3D = { x: 6370958.8, y: 17850.0, z: 20000.0 };
const edgeVertexB: Vector3D = { x: 6370958.8, y: 17850.0, z: -20000.0 };

// Calculate outward normal with balanced weighting (alpha = 0.5)
const result = computeBoundaryOutwardNormal3D(
  originCentroid,
  neighborCentroid,
  edgeVertexA,
  edgeVertexB,
  { blendAlpha: 0.5 }
);

console.log('Outward Normal Vector:', result.normal);
console.log('Boundary Midpoint (3D):', result.midpoint);
console.log('Alignment Cosine:', result.alignmentCos);
```

---

## 4. Good First Issues & Extension Opportunities

We welcome community contributions! Here are three high-impact areas where you can build directly on top of Sprint 066:

### Issue A: Lateral Advection Monad (`LateralFluxMonad`)
- **Area**: Monads & State Management (`src/monads/`)
- **Difficulty**: ⭐⭐ (Intermediate)
- **Goal**: Implement a monadic pipeline that takes adjacent H3 cell states (water height, dissolved carbon, temperature) and uses `computeBoundaryOutwardNormal3D` to calculate conservative advective exchange across all shared facets in a grid graph.
- **Verification**: Ensure $\sum_{i} \sum_{j} \Delta \text{Stock}_{ij} = 0$ across the global grid.

### Issue B: WebGL / Three.js Boundary Normal Visualizer
- **Area**: Graphics & Visualization (`src/rendering/` or `client/shaders/`)
- **Difficulty**: ⭐⭐ (Intermediate)
- **Goal**: Write a WebGL custom vertex/fragment shader or Three.js helper that visualizes:
  1. H3 spherical boundary arcs in cyan.
  2. The computed normal vector $\hat{\mathbf{n}}_{ij}$ as an arrow originating from `midpoint`.
  3. Color-code the facet by normal velocity flux $\mathbf{u} \cdot \hat{\mathbf{n}}_{ij}$ (blue for inflow, red for outflow).
- **Extension**: Provide real-time sliders for changing `blendAlpha` from 0.0 to 1.0.

### Issue C: GPU Parallelized Facet Normal Calculation (WebGPU Compute)
- **Area**: High-Performance Computing
- **Difficulty**: ⭐⭐⭐ (Advanced)
- **Goal**: Port the `computeBoundaryOutwardNormal3D` vector mathematics into a WGSL compute shader operating on a storage buffer of $100{,}000+$ edges simultaneously for high-resolution H3 grids (resolutions 7 to 10).

---

## 5. Contribution Workflow & Testing Guidelines

1. **Create your feature branch**:
   ```bash
   git checkout -b feature/my-new-monad
   ```
2. **Implement tests first**:
   Add test cases under `tests/` asserting:
   - Orthogonality: `vec3Dot(result.normal, radialVector) < 1e-12`
   - Anti-symmetry: `result_ij.normal + result_ji.normal == (0, 0, 0)`
3. **Run testing**:
   ```bash
   npx tsx tests/sprint_066.test.ts
   ```
4. **Submit a Pull Request**:
   Push your branch to GitHub and open a PR with a description referencing RFC-066. Our CI will automatically validate types, linting, and regression tests!