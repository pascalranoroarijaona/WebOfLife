<!-- DevRel Onboarding & Contributor Guide -->

# Contributor Guide: Sprint 092 — Spatial Aperture Resolution Boundary Enforcement

Welcome to the **Web of Life** contributor community! Whether you are an open-source newcomer interested in ecological physics, an experienced functional programmer hacking on monads, or a graphics engineer building WebGL shaders for Discrete Global Grid Systems (DGGS), this guide will walk you through Sprint 092's features, testing workflow, and open extension points.

---

## 1. Sprint 092 Architectural Overview

In Sprint 092, we formalized and implemented strict aperture resolution boundary enforcement within the planetary simulation engine's spatial substrate (`src/spatial/h3_adjacency.ts`).

### The Problem Solved
Our simulation models planetary thermodynamics, hydrology, and biogeochemical cycles over an aperture-7 hexagonal tessellation (Uber H3 DGGS). The spatial grid allows sixteen discrete hierarchical levels:
$$r \in \{0, 1, 2, \dots, 15\} \subset \mathbb{Z}_{\ge 0}$$
where:
- Resolution $0$ spans 122 base icosahedral cells ($\sim 4.36 \times 10^6 \text{ km}^2$ per cell).
- Resolution $15$ corresponds to fine-grained sub-meter hexagons ($\sim 0.895 \text{ m}^2$ per cell).

Prior to this sprint, resolution inputs were loosely typed as `number`. Non-integer floating-point resolutions (e.g., $r = 4.2$), out-of-bounds indices ($r < 0$ or $r > 15$), or non-finite inputs (`NaN`, `Infinity`) could silently enter bitwise indexing operations. This caused:
- Corrupted neighbor lookups and broken topological adjacency symmetry ($\mathbf{W} \neq \mathbf{W}^T$).
- Mass and energy leaks in `SpatialFluxMonad`, violating First Law conservation ($\sum \Delta M \neq 0$).
- Negative conductances and inverted temperature gradients, producing unphysical negative entropy ($\Delta S < 0$), violating the Second Law.

### The Solution: `assertValidApertureResolution`
We introduced a zero-cost, fail-fast runtime assertion function and custom error hierarchy:
```typescript
import { InvalidApertureResolutionError, assertValidApertureResolution } from './spatial/h3_adjacency';

// Throws InvalidApertureResolutionError if candidate fails finite, integer, or [0, 15] range checks
assertValidApertureResolution(resolution);
```

---

## 2. Developer Onboarding & Quickstart

### Prerequisites
- **Node.js**: v18.x or v20.x LTS
- **npm**: v9.x or higher
- **Git**

> **Note**: The Web of Life core engine is implemented purely in **TypeScript** and runs on **Node.js**. Do not use Python package managers or test runners.

### Cloning & Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Test Suites
Sprint 092 verification tests ensure that boundary checks, error dispatch, and thermodynamic conservation invariants pass without regressions:
```bash
# Execute the Sprint 092 test suite using tsx
npx tsx tests/sprint_092.test.ts
```

To run the entire integration suite across the project:
```bash
npm test
```

---

## 3. Code Walkthrough: Working with `assertValidApertureResolution`

The boundary assertion is exported from `src/spatial/h3_adjacency.ts`:

```typescript
import { assertValidApertureResolution, InvalidApertureResolutionError } from '../spatial/h3_adjacency';

function setupHexagonalNeighborhood(targetResolution: number) {
  // 1. Guard resolution boundary before running spatial transformations
  assertValidApertureResolution(targetResolution);

  // 2. targetResolution is now safely narrowed to H3Resolution (0 | 1 | ... | 15)
  console.log(`Configuring stencil at valid resolution: ${targetResolution}`);
}
```

If an invalid resolution is passed:
```typescript
try {
  setupHexagonalNeighborhood(18); // Exceeds max resolution of 15
} catch (err) {
  if (err instanceof InvalidApertureResolutionError) {
    console.error(`Rejected resolution ${err.resolution}: ${err.message}`);
  }
}
```

---

## 4. Good First Issues & Contributor Extension Points

We are actively seeking contributors for upcoming sprints! Here are three curated areas where you can jump in immediately.

### Issue A (Good First Issue): Atmospheric Vapor Diffusion Monad
- **File Area**: `src/monads/atmospheric_flux_monad.ts`
- **Domain**: Functional Reactive Programming / Thermodynamics
- **Task**: Integrate `assertValidApertureResolution` into the moisture flux monad constructor.
- **Details**:
  1. Import `assertValidApertureResolution` from `src/spatial/h3_adjacency`.
  2. Guard the atmospheric moisture Laplacian operator so that water vapor cannot diffuse across indeterminate cell boundaries.
  3. Write unit tests in `tests/atmospheric_flux.test.ts` verifying that passing floating-point resolutions rejects state transitions before stock allocations.

### Issue B: Multi-Resolution WebGL Hex Boundary Shader
- **File Area**: `src/render/shaders/hex_grid.vert.glsl` & `src/render/webgl_hex_renderer.ts`
- **Domain**: WebGL / Shaders / Visualization
- **Task**: Implement dynamic Level-of-Detail (LOD) hex edge fading with resolution boundary checks in the uniform bridge.
- **Details**:
  1. In `src/render/webgl_hex_renderer.ts`, ensure uniform `u_target_resolution` is validated with `assertValidApertureResolution` before passing to `gl.uniform1i`.
  2. In `hex_grid.vert.glsl`, compute hexagon vertices on the tangent plane scaled by $L(r) = \sqrt{\frac{2 A_0}{3\sqrt{3}}} \cdot 7^{-r/2}$.
  3. Ensure smooth alpha transitions between adjacent resolution levels without vertex tearing.

### Issue C: Spatial Telemetry & Violation Reporter Monad
- **File Area**: `src/diagnostics/spatial_telemetry.ts`
- **Domain**: Telemetry / State Machines
- **Task**: Build an event-bus subscriber that intercepts `InvalidApertureResolutionError` and produces structured JSON diagnostics.
- **Details**:
  1. Capture cell coordinate contexts, stack traces, and simulation epoch when out-of-bound resolutions occur.
  2. Verify that non-fatal recovery fallback routes safely to the nearest valid resolution or pauses simulation timesteps to avoid stock divergence.

---

## 5. Contribution & Pull Request Guidelines

1. **Branch Naming**: Use `feature/sprint-092-<feature-name>` or `fix/h3-resolution-guard`.
2. **Type Safety**: Maintain strict TypeScript compliance (`noImplicitAny`, `strictNullChecks`).
3. **Physical Conservations**: Any flux routine must conserve mass ($\sum \Delta M = 0$) and ensure non-negative entropy production ($\Delta S \ge 0$).
4. **Verification**: Always run `npx tsx tests/sprint_092.test.ts` before committing.
5. **PR Submission**: Open a PR against `main` at `https://github.com/pascalranoroarijaona/WebOfLife` referencing your issue number.

Welcome aboard, and happy hacking on the biosphere!
```

---