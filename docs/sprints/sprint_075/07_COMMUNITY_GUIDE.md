<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 075 Contributor Guide: Discrete Topological Adjacency & Conservative Spatial Flux

Welcome to the Sprint 075 Developer Onboarding & Community Contributor Guide for the **Web of Life** project! Whether you are an open-source contributor interested in geodesic discrete global grid systems (DGGS), a functional programmer building monads for thermodynamic simulations, or a graphics engineer building WebGL shaders, this guide will get you up to speed.

---

## 1. Quickstart & Local Environment Setup

The **Web of Life** engine is built using modern **TypeScript** and **Node.js**. We do not use Python or any external runtime managers—everything runs in Node with fast TypeScript execution via `tsx`.

### 1.1 Clone and Install

Clone the canonical repository and install dependencies:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### 1.2 Running Sprint 075 Verification Tests

Verify your installation by running the Sprint 075 test suite:

```bash
npx tsx tests/sprint_075.test.ts
```

All tests should pass with green status reporting zero thermodynamic leakage across verified H3 cells.

---

## 2. Sprint 075 Architectural Overview

### The Problem: Topological Singularities on a Sphere
When discretizing a closed spherical 2-manifold $\mathbb{S}^2$ using the Uber H3 hexagonal hierarchical spatial index, Euler's formula ($V - E + F = 2$) mandates that no purely hexagonal tessellation can tile a sphere. Exactly **12 pentagonal singularities** must exist across all resolution levels $r \in [0, 15]$.

* **Hexagonal Cells**: Have a topological coordination number of **6** (6 immediate adjacent neighbors).
* **Pentagonal Cells**: Have a topological coordination number of **5** (5 immediate adjacent neighbors).

### Why Coordination Verification Matters
In our physical simulation engine, mass and energy transport are managed by `SpatialFluxMonad`. The flux divergence is computed as:

$$\frac{d M_i}{dt} = -\sum_{j \in \mathcal{N}(i)} J_{i \to j} \cdot \ell_{ij} + S_i$$

If an adjacency query returns 5 neighbors for a hexagonal cell (e.g. missing boundary cell) or returns 6 neighbors for a pentagon (e.g. hallucinated ghost edge), the discrete divergence sum breaks pairwise antisymmetry:

$$\sum_{i} \sum_{j \in \mathcal{N}(i)} J_{i \to j} \ne 0$$

This unphysical leak violates the First Law of Thermodynamics (mass conservation) and introduces negative Laplacian eigenvalues that violate the Second Law (entropy growth).

### The Solution: `isExpectedNeighborCount`
Sprint 075 implements `isExpectedNeighborCount` in `src/spatial/h3_adjacency.ts`. It offers zero-allocation, non-throwing topological validation that verifies candidate neighbor counts against `getCoordinationNumber(cellIndex)`.

```typescript
import { isExpectedNeighborCount, getCoordinationNumber } from './src/spatial/h3_adjacency';

// Hexagonal cells expect 6 neighbors
isExpectedNeighborCount('8828308281fffff', 6); // true
isExpectedNeighborCount('8828308281fffff', 5); // false

// Pentagonal singularities expect 5 neighbors
isExpectedNeighborCount('821c07fffffffff', 5); // true
isExpectedNeighborCount('821c07fffffffff', 6); // false

// Defensive checks
isExpectedNeighborCount('8828308281fffff', 5.99); // false (rejects non-integers)
isExpectedNeighborCount('8828308281fffff', -6);   // false (rejects negative numbers)
```

Dual polymorphic parameter ordering is also supported (`isExpectedNeighborCount(6, hexCell)`), making point-free functional compositions and filter predicates seamless.

---

## 3. Extension Points for Contributors

We invite the community to extend the spatial topology framework. Key entry points include:

### 3.1 Spatial Monads (`src/spatial/spatial_flux_monad.ts`)
The `SpatialFluxMonad` encapsulates state transitions over the H3 grid. You can implement new physical transport monads:
- **Atmospheric Vapor Advection Monad**: Compute moisture advection using conservative wind vectors.
- **Sediment Transport & Erosion Monad**: Model overland flow and silt deposition across cell boundaries.
- **Biomass Dispersal Monad**: Propagate spore/seed migration with species-specific dispersal kernels.

```typescript
import { Result } from '../core/result';
import { H3Index } from './h3_types';
import { isExpectedNeighborCount } from './h3_adjacency';

export class AtmosphericVaporMonad {
  public static validateAdjacency(cell: H3Index, neighbors: H3Index[]): Result<H3Index[], string> {
    if (!isExpectedNeighborCount(cell, neighbors.length)) {
      return Result.err(`Topological mismatch for cell ${cell}`);
    }
    return Result.ok(neighbors);
  }
}
```

### 3.2 WebGL / GPU Shaders (`src/renderers/shaders/`)
Our visualization engine renders DGGS topologies in real-time WebGL:
- **Pentagon Singularity Highlighting**: Write a fragment shader pass that colors the 12 pentagonal icosahedral nodes with distinct radial aura rings.
- **Flux Vector Field Shader**: Render animated instanced arrows along the dual edges between cells showing real-time mass/enthalpy flow.
- **Topological Defect Heatmap**: Color cells based on boundary discrepancies or edge cut-offs in regional sub-grids.

---

## 4. Good First Issues for New Contributors

Looking for a place to start? Here are curated tasks designed for first-time contributors:

| Issue ID | Area | Difficulty | Description | Suggested File(s) |
| :--- | :--- | :--- | :--- | :--- |
| **GFI-075-A** | Spatial / H3 | Easy | **Coordination Number Type Guard**: Create a user-defined TypeScript type guard `isPentagonCell(cell: H3Index): cell is PentagonalH3Index`. | `src/spatial/h3_types.ts` |
| **GFI-075-B** | CLI / DevTools | Easy | **Topology Audit CLI**: Add a script `npm run audit:topology` that scans an array of cell indices and prints the pentagon/hexagon distribution. | `scripts/audit_topology.ts` |
| **GFI-075-C** | WebGL / UI | Medium | **Dual Edge Visualizer**: Render dual Delaunay-Voronoi line segments between neighbor pairs verified by `isExpectedNeighborCount`. | `src/render/webgl_flux_overlay.ts` |
| **GFI-075-D** | Testing | Medium | **Fuzz Testing Suite**: Create property-based generative tests validating random H3 cells across resolutions 0 to 8 with fast-check. | `tests/fuzz/h3_coordination.test.ts` |

---

## 5. Development Workflow & Contribution Checklist

1. **Fork & Branch**:
   ```bash
   git checkout -b feat/my-new-monad
   ```
2. **Implement & Format**:
   Keep functions pure, non-throwing, and typed. Run linting:
   ```bash
   npm run lint
   ```
3. **Write Unit Tests**:
   Create or update tests under `tests/`. Verify with:
   ```bash
   npx tsx tests/sprint_075.test.ts
   ```
4. **Submit PR**:
   Reference your issue, describe topological guarantees, and ensure zero mass-energy leakages in continuous integration.

Have questions? Join our discussions on [GitHub Discussions](https://github.com/pascalranoroarijaona/WebOfLife/discussions) or open an issue!