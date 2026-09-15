<!-- DevRel Onboarding & Contributor Guide -->
# Developer Onboarding & Contributor Guide: Sprint 077
## Safeguarding DGGS Discrete Flux Boundaries with `assertValidNeighborCountForCell`

Welcome to **Web of Life**! Whether you are a computational ecologist, a functional programming enthusiast, or a graphics engineer passionate about planetary simulation, this guide will get you up to speed on the topological invariants implemented in Sprint 077.

---

### 1. Repository & Quickstart

The official repository is hosted at:
[https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)

#### Prerequisites & Tech Stack
The Web of Life simulation engine is built natively using **TypeScript** on **Node.js** (v18+ recommended). We do **not** use Python or C++ runtime tooling in our primary application layer.

Clone and set up your environment:
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

To run the verification suite for Sprint 077:
```bash
npx tsx tests/sprint_077.test.ts
```

To run all unit tests across the monad and spatial modules:
```bash
npm test
```

---

### 2. Feature Deep-Dive: What Shipped in Sprint 077?

In `src/spatial/h3_adjacency.ts`, we introduced `assertValidNeighborCountForCell`.

#### The Problem: Phantom Thermodynamic Fluxes
In a Discrete Global Grid System (DGGS) based on the H3 geodesic grid, the planetary sphere $S^2$ is partitioned into aperture hexagonal cells with exactly 12 irreducible topological pentagons (mandated by Euler's polyhedral formula $V - E + F = 2$).
- Regular hexagons have **exactly 6** immediate neighbors ($k=1$).
- Pentagons have **exactly 5** immediate neighbors ($k=1$).

When computing mass, water, solute, and thermal flux between cells in `SpatialFluxMonad`, fluxes across cell boundary segments must satisfy pairwise antisymmetry ($F_{ij} = -F_{ji}$). If an incomplete, duplicate, or truncated neighbor array is passed into the flux operator, the discrete boundary integral:
$$\oint_{\partial \Omega_i} \vec{J} \cdot \vec{n} \, dl \neq 0$$
creates **phantom mass and energy sources or sinks**, violating the First and Second Laws of Thermodynamics.

#### The Solution: Runtime Invariant Assertion
`assertValidNeighborCountForCell` acts as a fail-fast runtime guard:
```typescript
export function assertValidNeighborCountForCell(
  cellId: string,
  neighbors: unknown
): asserts neighbors is readonly unknown[];
```

It validates:
1. **Type Safety**: Enforces `Array.isArray(neighbors)`. Throws a descriptive `TypeError` if given `null`, `undefined`, a scalar, or an object.
2. **Topological Invariant**: Compares `neighbors.length` against `isExpectedNeighborCountForCell(cellId, count)`. If the cardinality does not equal 5 for pentagons or 6 for hexagons, it throws a `RangeError`.

#### Developer Usage Example
```typescript
import { assertValidNeighborCountForCell } from './src/spatial/h3_adjacency';

function dispatchCellFlux(cellId: string, candidateNeighbors: unknown) {
  // Narrow candidateNeighbors to readonly unknown[] and enforce topological closure
  assertValidNeighborCountForCell(cellId, candidateNeighbors);

  // candidateNeighbors is now safely guaranteed to have 5 (pentagon) or 6 (hexagon) elements
  for (const neighborId of candidateNeighbors) {
    // evaluate conservative flux balance
  }
}
```

---

### 3. Good First Issues & Extension Points

Looking to make your first open-source contribution to Web of Life? Here are curated challenges across Monadic simulation and WebGL rendering:

#### Issue #1: `SpatialDiffusionMonad` - Implement Boundary-Preserving Energy Diffusion (Difficulty: Easy)
- **Area**: `src/spatial/monads/spatial_diffusion_monad.ts`
- **Objective**: Create a monad that wraps `assertValidNeighborCountForCell` prior to applying a discrete Laplacian diffusion step for thermal energy:
  $$\Delta E_i = \sum_{j \in \mathcal{N}(i)} \frac{k_T}{\Delta x_{ij}} (T_j - T_i) \Delta t$$
- **Skills**: TypeScript, pure functional state transitions, invariant verification.

#### Issue #2: WebGL Shader - Pentagonal Defect & Boundary Flux Visualizer (Difficulty: Medium)
- **Area**: `src/client/shaders/flux_visualizer.frag.glsl`
- **Objective**: In our Three.js / WebGL visualization layer, write a custom fragment shader that renders the 12 pentagonal cells in an accent emission color (e.g., iridescent amber) and draws animated flux lines along valid neighbor boundary normals.
- **Skills**: GLSL, WebGL, coordinate transformations.

#### Issue #3: GPU Attribute Buffer Packing for Cell Adjacency (Difficulty: Medium-Hard)
- **Area**: `src/spatial/gpu/adjacency_buffer.ts`
- **Objective**: Build a utility that encodes validated neighbor indices into uniform fixed-width 1D WebGL texture buffers (using sentinel `-1` padding for pentagonal 5-neighbor arrays) to accelerate GPU-based flux computation.
- **Skills**: WebGL2 DataTextures, typed arrays (`Int32Array`).

---

### 4. Contributing Guidelines

1. **Branch Naming**: Use `feat/issue-number-short-desc` or `fix/issue-number-short-desc`.
2. **Deterministic & Pure**: Monads in `src/spatial/` should avoid side effects and mutation.
3. **Always Run Sprint Tests**:
   ```bash
   npx tsx tests/sprint_077.test.ts
   ```
4. Submit PRs against `main` on [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife).