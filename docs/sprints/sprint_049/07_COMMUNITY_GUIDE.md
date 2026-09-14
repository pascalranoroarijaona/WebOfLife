<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 049 Contributor Guide: Topological Pentagon Cell Validation & Conservative Transport

Welcome to the **Web of Life** open-source contributor guide! This sprint introduces fundamental topological safety features into our Discrete Global Grid System (DGGS) transport pipeline.

- **Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Primary Tech Stack**: TypeScript, Node.js, WebGL2

---

## 1. What's New in Sprint 049?

The Earth cannot be tiled entirely with regular hexagons. By Euler's formula ($V - E + F = 2$), any spherical hexagonal grid possesses **exactly 12 pentagonal cells** located at the icosahedral vertices.

Before Sprint 049, our spatial advection operators treated all H3 cells as having 6 neighbors. On pentagonal cells ($k = 5$), this created a **phantom 6th edge**:
- Conserved mass and energy leaked out into undefined addresses (`0x0`).
- Flux calculations violated the First Law of Thermodynamics ($\Delta U \ne Q - W$).

### The Solution: Bitwise Topology Validation
In `src/spatial/h3_adjacency.ts`, we implemented `isPentagonCell(cell)`:
1. **Mode Check**: Ensures index mode is `1` (H3 cell).
2. **Base Cell Match**: Verifies if the 7-bit base cell belongs to the canonical 12 vertex base cells:
   $$\mathcal{B}_{\text{pent}} = \{4, 14, 24, 38, 42, 58, 63, 72, 83, 87, 97, 107\}$$
3. **Center Invariance**: Confirms all directional digits up to resolution $r$ are `0` (`H3_CENTER_DIGIT`).

This allows `H3AdjacencyCoordinator` and `SpatialAdvectionDiffusionMonad` to bound pentagon stencils to **strictly 5 neighbors**, restoring machine-precision conservation ($< 10^{-14}$).

---

## 2. Developer Quickstart

We use **Node.js** and **TypeScript**. Do not use Python or pytest.

### Setup Environment
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Run Sprint 049 Verification Tests
```bash
npx tsx tests/sprint_049.test.ts
```

All test suites from `sprint_001` through `sprint_049` should pass cleanly with zero mass-energy leakage.

---

## 3. Code Architecture & Tour

Key interfaces and modules added in this sprint:

- **`src/spatial/h3_types.ts`**:
  - `H3CellDecomposition`: Interface describing the decomposed 64-bit fields (mode, resolution, baseCell, digits, isPentagon).
  - `IH3TopologyValidator`: Contract for topology validation, base cell retrieval, and coordination number extraction.
- **`src/spatial/h3_adjacency.ts`**:
  - `isPentagonCell(cell: string | bigint): boolean`: Pure, bitwise validation function.
  - `H3TopologyValidator`: Singleton implementing `IH3TopologyValidator`.
  - `SpatialAdvectionDiffusionMonad`: Monadic boundary transport layer that asserts `neighbors.length <= 5` on pentagons and applies the metric correction factor $\gamma_{\text{pent}} \approx 1.1892$.

---

## 4. Good First Issues & Contributor Extension Points

Looking to contribute your first PR? Here are three high-impact extension points ready for development:

### Issue #1: WebGL Pentagon Visual Highlight & Metric Vertex Shader (Good First Issue)
- **Goal**: In the 3D globe visualization shader, pentagonal cells currently render with standard hexagonal uv-mapping, causing subtle texture pinches at the 12 vertices.
- **Task**: 
  1. Pass an attribute `a_isPentagon` (boolean/float) via the vertex buffer.
  2. In `src/rendering/shaders/dggs_surface.vert.glsl`, apply the perimeter correction factor $\gamma_{\text{pent}} = 1.1892$ to vertex displacement.
  3. Render pentagonal cells with a distinct diagnostic outline or glow when debug mode is enabled.
- **Skills**: WebGL2, GLSL, TypeScript.

### Issue #2: Reactive Monad for Multi-Resolution Pentagon Hierarchy
- **Goal**: When zooming across resolutions ($r \to r \pm 1$), pentagons must remain topologically anchored.
- **Task**:
  1. Implement `getParentPentagon(h3Index: bigint): bigint` in `src/spatial/h3_adjacency.ts`.
  2. Build a reactive monad transform `PentagonHierarchyMonad` that aggregates child stocks surrounding vertex singularities into coarse base cells.
  3. Add test cases in `tests/sprint_049_hierarchy.test.ts`.
- **Skills**: Functional programming, TypeScript monads.

### Issue #3: SIMD / TypedArray Stencil Batching
- **Goal**: Optimize `computePairwiseExchange` across large cell collections.
- **Task**:
  1. Profile `SpatialAdvectionDiffusionMonad.step` with 100,000 cells.
  2. Implement a flat `BigUint64Array` index cache with pre-computed coordination masks (`5` for pentagons, `6` for hexagons).
  3. Verify that zero phantom edges are evaluated while gaining a $3\times$ throughput speedup.
- **Skills**: Performance engineering, TypedArrays, Bitwise operations.

---

## 5. How to Submit a Pull Request

1. Fork the repo: `https://github.com/pascalranoroarijaona/WebOfLife`
2. Create your feature branch: `git checkout -b feature/pentagon-shader-highlight`
3. Verify your changes pass all tests:
   ```bash
   npx tsx tests/sprint_049.test.ts
   ```
4. Commit with thermodynamic and structural clarity:
   ```bash
   git commit -m "feat(rendering): add pentagon perimeter scaling to WebGL vertex shader"
   ```
5. Open a Pull Request referencing the sprint feature!

Join us in building a thermodynamically consistent digital twin of the biosphere!