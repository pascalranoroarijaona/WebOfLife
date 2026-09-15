<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 076 Contributor & Onboarding Guide: Discrete Topological Validation & Flux Conservation

Welcome to the **WebOfLife** open-source contributor guide for Sprint 076! Whether you are a computational ecologist, a functional programming enthusiast, or a graphics engineer building high-performance WebGL shaders, this guide will get you oriented with our codebase and show you how to contribute.

---

## 1. What is WebOfLife?

**WebOfLife** is an open-source, mathematically rigorous planetary ecosystem simulation engine built with **TypeScript and Node.js**. It models biogeochemical cycles, mass-energy transport, and trophic dynamics over Discrete Global Grid Systems (DGGS) using hierarchical icosahedral hexagonal tessellation (Uber H3).

- **Official Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Primary Stack**: Node.js, TypeScript, WebGL 2.0, Discrete Global Grid System (H3).

---

## 2. Sprint 076 Overview: `isExpectedNeighborCountForCell`

In Sprint 076, we landed topological neighbor array validation in `src/spatial/h3_adjacency.ts`:

```typescript
export function isExpectedNeighborCountForCell(
  cellId: string,
  neighbors: readonly string[]
): boolean;
```

### Why Topological Adjacency Matters
By Euler's polyhedron formula ($V - E + F = 2$), a closed sphere tessellated by hexagons cannot consist of regular hexagons alone. At any discrete resolution $r \ge 0$, exactly **12 pentagonal cells** exist. This imposes strict topological invariants on coordination numbers (valence $\delta(c)$):
- **Hexagonal cells**: $\delta(c) = 6$ neighbors
- **Pentagonal cells**: $\delta(c) = 5$ neighbors

In spatial flux calculations, finite-volume Laplacians compute transfers across cell boundaries:
$$\sum_{j \in \mathcal{N}(i)} \mathbf{J}_{ij} = -\frac{\mathrm{d}\mathbf{S}_i}{\mathrm{d}t}$$

If a materialized neighbor list $\mathcal{N}(i)$ is truncated, contains duplicates, or omits a boundary edge, divergence operators experience **thermodynamic leakage** ($\Delta \mathbf{J}_{\text{leak}} \ne 0$), violating the First Law of Thermodynamics (mass and energy conservation).

`isExpectedNeighborCountForCell` acts as a zero-cost, non-mutating validation barrier that ensures collections of neighbor IDs conform exactly to the cell's topological valence before any flux monad executes.

---

## 3. Quickstart & Local Environment Setup

Getting up and running with WebOfLife requires Node.js (v18+ recommended) and npm.

### 3.1 Clone and Install
```bash
# Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install Node dependencies (do NOT use pip or python tooling)
npm install
```

### 3.2 Running Sprint 076 Tests
To execute the unit and property tests verifying topological neighbor validation:

```bash
# Execute sprint-specific tests using tsx
npx tsx tests/sprint_076.test.ts
```

To run the complete test suite across the spatial and thermodynamic engines:
```bash
npm test
```

---

## 4. Code Example: Gating Spatial Flux Evaluation

Here is how you can use `isExpectedNeighborCountForCell` to guard a spatial transfer kernel:

```typescript
import { isExpectedNeighborCountForCell } from './src/spatial/h3_adjacency';
import { CellStockState, BoundaryConductance } from './src/spatial/spatial_flux_monad';

export function executeConservativeTransfer(
  cellId: string,
  neighbors: readonly string[],
  stocks: CellStockState,
  conductance: BoundaryConductance
): void {
  // 1. Validate topological manifold completeness
  if (!isExpectedNeighborCountForCell(cellId, neighbors)) {
    throw new Error(
      `Topological violation: neighbor array length ${neighbors?.length} does not match expected degree for cell ${cellId}. Transfer aborted to prevent mass-energy leakage.`
    );
  }

  // 2. Perform mass-energy conservative divergence across verified boundaries
  // All 5 (pentagon) or 6 (hexagon) edges are guaranteed present.
  console.log(`Cell ${cellId} topology verified. Proceeding with divergence calculation.`);
}
```

---

## 5. "Good First Issues" & Contributor Extension Points

Looking to make your first contribution? We have curated high-impact entry points across both computational monads and GPU graphics.

### Issue A (Good First Issue): Pentagonal Boundary WebGL Shader
- **Area**: `src/rendering/shaders/h3_pentagon_boundary.frag.glsl`
- **Goal**: Create a WebGL fragment/vertex shader that renders H3 grid cells and visually highlights pentagonal singularity cells and their 5 boundary interfaces with a distinct pulse glow.
- **Key Concepts**: Uniform passing for cell valence (`u_isPentagon`), normal flux vectors at cell edges, fragment coordinate mapping on an icosahedral projection.
- **Prerequisites**: Basic knowledge of GLSL and WebGL 2.0.

### Issue B (Monad Extension): Directional Trophic Advection Monad
- **Area**: `src/spatial/trophic_advection_monad.ts`
- **Goal**: Implement a functional monad that couples the topological validation gate `isExpectedNeighborCountForCell` with upwind advection of consumer biomass (herbivores, carnivores) along environmental resource gradients.
- **Key Invariant**: Total trophic biomass across the closed grid must remain constant ($\sum_i B_i = \text{const}$) in the absence of net metabolic assimilation/respiration.
- **Prerequisites**: TypeScript generics, immutable patterns, discrete vector calculus.

### Issue C (Validation & Benchmarking): Neighbor Array Set Uniqueness Checker
- **Area**: `src/spatial/h3_adjacency.ts`
- **Goal**: Build `isValidNeighborSetForCell(cellId: string, neighbors: readonly string[]): boolean` that verifies not only array length (via `isExpectedNeighborCountForCell`) but also topological uniqueness (no duplicate IDs) and mutual adjacency (all neighbors are true topological neighbors of `cellId`).
- **Prerequisites**: Set theory, H3 index structure, performance profiling in Node.js.

---

## 6. How to Submit Your Pull Request

1. **Fork** the repository at `https://github.com/pascalranoroarijaona/WebOfLife`.
2. **Branch**: Create a descriptive feature branch:
   ```bash
   git checkout -b feature/webgl-pentagon-glow
   ```
3. **Write Tests**: Place tests in `tests/` and verify them:
   ```bash
   npx tsx tests/your_feature.test.ts
   ```
4. **Lint & Build**:
   ```bash
   npm run lint
   npm run build
   ```
5. **Open a PR**: Reference the sprint or issue number and provide a concise summary of the invariant guarantees maintained by your code.

Welcome to the team—let's build the future of planetary ecological simulations together!