<!-- DevRel Onboarding & Contributor Guide -->

# Contributor & Developer Onboarding Guide: Sprint 078
## Pentagonal Coordination Invariants & Discrete Spatial Manifold Modeling

Welcome to the **WebOfLife** open-source developer guide for Sprint 078! Whether you are building functional simulation monads, optimizing discrete global grid transport, or authoring WebGL planetary shaders, this guide will get you productive immediately.

- **Repository:** [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Tech Stack:** TypeScript (strict mode), Node.js, WebGL2.
- **Sprint Focus:** Strict enforcement of the Euler-Poincaré pentagonal coordination invariant ($z=5$) in H3 discrete global grids via `PentagonalCoordinationViolationError`.

---

## 1. Quickstart: Cloning & Running Tests

We use Node.js and TypeScript exclusively. Please ensure you have Node.js (v18+) installed.

```bash
# 1. Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# 2. Install dependencies (DO NOT use pip or pytest; this is a pure TypeScript/Node engine)
npm install

# 3. Execute the Sprint 078 test suite
npx tsx tests/sprint_078.test.ts
```

All test suites can be executed using `npx tsx tests/<test_name>.test.ts`.

---

## 2. What Changed in Sprint 078?

### The Mathematics: Euler's Disclination Invariant
On any spherical hexagonal grid (such as Uber's H3 DGGS), Euler's formula dictates that exactly **12 cells must be pentagons** ($F_5 = 12$):
$$\sum (6 - k) F_k = 12 \implies F_5 = 12$$

Each pentagonal cell must have strictly **5 neighbors** ($z=5$). Regular hexagonal cells have **6 neighbors** ($z=6$).

### The Code: Type-Safe Error Enforcement
In `src/spatial/h3_adjacency.ts`, we refactored `assertValidNeighborCountForCell`:

```typescript
export function assertValidNeighborCountForCell(
  cellId: string,
  neighbors: readonly string[] | number
): void {
  const count = typeof neighbors === 'number' ? neighbors : neighbors.length;
  const isPentagon = isPentagonCell(cellId);

  if (isPentagon) {
    if (count !== 5) {
      throw new PentagonalCoordinationViolationError(cellId, count);
    }
  } else {
    if (count !== 6) {
      throw new HexagonalCoordinationViolationError(cellId, count);
    }
  }
}
```

### Why This Matters for Thermodynamics
If a simulation allows a pentagon to process a 6th "ghost" neighbor, the inter-cell fluxes no longer cancel out across the dual graph edges. This creates spurious energy drift and violates the First Law of Thermodynamics. Sprint 078 guarantees zero divergence closure before updating any cell stock!

---

## 3. Good First Issues for New Contributors

Looking to make your first commit? Here are three curated entry points:

### Issue #1: Adjacency Masking Adapter for Sub-Global Bounded Grids
- **Area:** `src/spatial/h3_grid.ts`
- **Difficulty:** Easy / Good First Issue
- **Description:** Currently, `assertValidNeighborCountForCell` checks full spherical closed grids where every cell has 5 or 6 neighbors. When developers load partial regional grids (e.g., a single continent or biome), boundary cells have fewer neighbors.
- **Task:** Build a `BoundedSubgridAdapter` that tracks whether a boundary edge is external (masked) or internal, allowing `assertValidNeighborCountForCell` to validate internal topological edges without throwing on open physical boundaries.

### Issue #2: WebGL Shader for Disclination Defect Highlighting
- **Area:** `src/rendering/shaders/h3_disclination.frag.glsl`
- **Difficulty:** Medium
- **Description:** We need real-time visualization of the 12 pentagonal disclinations on our 3D globe.
- **Task:** Write a WebGL2 fragment shader that receives cell attribute flags (`vIsPentagon`) and computes a glowing Frank disclination halo using geodesic distance:
  ```glsl
  #version 300 es
  precision highp float;
  in float vIsPentagon;
  out vec4 fragColor;
  void main() {
    if (vIsPentagon > 0.5) {
      fragColor = vec4(1.0, 0.2, 0.2, 1.0); // Highlight 12 pentagons
    } else {
      fragColor = vec4(0.1, 0.6, 0.9, 0.8); // Standard hexagons
    }
  }
  ```

### Issue #3: Biome Advection Monad (`SpatialAdvectionMonad`)
- **Area:** `src/spatial/spatial_advection_monad.ts`
- **Difficulty:** Medium
- **Description:** Following the pattern in `SpatialFluxMonad`, implement an upwind advective transport monad that models atmospheric circulation ($v_{ij} A_{ij}$) with guaranteed conservative closure across pentagonal disclination cells.

---

## 4. Extension Points: Writing Your Own Monad

To implement custom thermodynamic transport or biochemical reactions over the grid continuum:

1. Import `assertValidNeighborCountForCell` from `src/spatial/h3_adjacency`.
2. Construct your monadic wrapper around `SpatialGridState`.
3. Call `validateTopology()` before running integration steps.

Example pattern:

```typescript
import { assertValidNeighborCountForCell } from './src/spatial/h3_adjacency';

export class CustomMetabolismMonad {
  public step(deltaT: number): CustomMetabolismMonad {
    // 1. Fail fast on topological anomalies
    for (const [cellId, geom] of this.state.geometries.entries()) {
      assertValidNeighborCountForCell(cellId, geom.neighbors);
    }
    // 2. Perform conservative stock mutations...
    return new CustomMetabolismMonad(this.nextState);
  }
}
```

---

## 5. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feat/my-new-monad`.
2. Write unit tests in `tests/my_feature.test.ts`.
3. Verify test execution:
   ```bash
   npx tsx tests/my_feature.test.ts
   ```
4. Submit a Pull Request targeting `main` at [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife).

Welcome aboard the WebOfLife community! Let's build a mathematically rigorous planetary simulation together.