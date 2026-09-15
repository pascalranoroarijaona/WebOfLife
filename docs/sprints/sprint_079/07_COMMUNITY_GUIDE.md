<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 079 Community Contributor Guide: Pentagonal Adjacency & Conservative Topological Transport

Welcome to Sprint 079 of the **Web of Life** planetary simulation project!

- **Repository:** [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)  
- **Primary Tech Stack:** TypeScript, Node.js, WebGL2  
- **Sprint Focus:** Topological Singularities & Adjacency Invariants (`src/spatial/h3_adjacency.ts`)

---

## 1. Welcome & Architectural Overview

In the Web of Life simulation, our planet is discretized using an icosahedral Discrete Global Grid System (H3). Due to Euler's polyhedral formula ($V - E + F = 2$), any spherical hexagonal grid **must** contain exactly **12 pentagons** at any resolution level.

Standard hexagonal cells have coordination number $z = 6$, but pentagonal cells have coordination number $z = 5$. If our spatial monads iterate over 6 neighbors on a pentagonal cell, the simulation encounters either undefined memory access or spurious flux leakage that breaks the First and Second Laws of Thermodynamics!

In Sprint 079, we introduced:
- `H3_PENTAGON_NEIGHBOR_COUNT = 5`
- `isPentagonNeighborArrayLengthValid(input: readonly unknown[] | number | null | undefined): boolean` in `src/spatial/h3_adjacency.ts`.

This predicate forms the safety gate for mass and energy transport monads across all twelve planetary singularities.

---

## 2. Quickstart Developer Setup

Ensure you have Node.js (version 20+ recommended) installed.

### 2.1 Clone & Install
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

> **Note:** Our project is strictly TypeScript and Node.js. Do **not** use `pip`, `python`, or `pytest`. All tests and execution scripts run through `npm` and `npx tsx`.

### 2.2 Running Sprint Tests
Verify that the Sprint 079 implementation passes all topological and thermodynamic unit tests:
```bash
npx tsx tests/sprint_079.test.ts
```

To run the entire test suite across all sprints:
```bash
npm test
```

---

## 3. How `isPentagonNeighborArrayLengthValid` Works

The function accepts either an array of neighbors (`readonly unknown[]`) or a scalar neighbor count (`number`), returning `true` only when the input strictly represents the pentagon coordination number 5:

```typescript
import { 
  isPentagonNeighborArrayLengthValid, 
  H3_PENTAGON_NEIGHBOR_COUNT 
} from './src/spatial/h3_adjacency';

// Valid pentagonal neighbor arrays
isPentagonNeighborArrayLengthValid(['cell_1', 'cell_2', 'cell_3', 'cell_4', 'cell_5']); // true
isPentagonNeighborArrayLengthValid(5); // true

// Hexagonal neighbor arrays (rejected)
isPentagonNeighborArrayLengthValid(['c1', 'c2', 'c3', 'c4', 'c5', 'c6']); // false
isPentagonNeighborArrayLengthValid(6); // false

// Edge cases & malformed inputs (safely rejected)
isPentagonNeighborArrayLengthValid(null);      // false
isPentagonNeighborArrayLengthValid(undefined); // false
isPentagonNeighborArrayLengthValid(5.001);     // false
isPentagonNeighborArrayLengthValid([]);        // false
```

---

## 4. "Good First Issues" for External Contributors

We welcome contributions! Here are three curated extension points for newcomers interested in TypeScript monads or WebGL shaders.

### Issue #1: WebGL Singularity Visualizer Shader (Good First Issue 🌟)
- **Domain:** `src/rendering/shaders/`
- **Objective:** Write a WebGL2 fragment/vertex shader pass that renders the twelve pentagonal cells with a pulsing geodesic beacon.
- **Why it matters:** Allows researchers to visually inspect where the 12 Euler singularities sit on the planetary sphere and monitor adjacent transport dynamics.
- **Entry Point:** Connect to `CellTopologyType.PENTAGON` and pass a uniform `u_pentagon_indices` to the render pipeline.

### Issue #2: `PentagonAdjacencyCache` Monad Extension (Intermediate 🛠️)
- **Domain:** `src/spatial/spatial_flux_monad.ts`
- **Objective:** Implement a lightweight immutable memoization monad that caches the 5-neighbor topology for the 12 pentagonal cells, bypassing dynamic array allocation during each simulation tick.
- **Requirement:** Must invoke `isPentagonNeighborArrayLengthValid` upon cache initialization and verify zero memory leaks across $10^5$ ticks.

### Issue #3: Biomass Advection Conservation Guard for Trophic Monads (Advanced 🚀)
- **Domain:** `src/ecology/trophic_monad.ts`
- **Objective:** Extend `TrophicMonad` biomass diffusion routines to assert pentagonal neighborhood validity before computing predator-prey spatial migrations across pentagonal boundaries.
- **Requirement:** Ensure biomass stock $B_i$ satisfies $\sum \Delta B \equiv 0$ within numerical precision ($10^{-15}$).

---

## 5. Submitting Your Pull Request

1. Create a feature branch: `git checkout -b feature/pentagon-shader-visualizer`
2. Implement your changes in TypeScript.
3. Add a unit test in `tests/` verifying your functionality.
4. Run your test with `npx tsx tests/<your_test>.test.ts`.
5. Ensure formatting and typechecks pass: `npm run lint` && `npx tsc --noEmit`.
6. Open a PR against [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife) with a clear description referencing the RFC.

Happy hacking on planetary thermodynamics! 🌍✨