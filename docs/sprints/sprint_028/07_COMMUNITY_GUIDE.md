<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 028 Contributor Guide: Spatial Monads & H3 Tier Boundaries

Welcome to the **Web of Life** open-source community! As a developer-focused onboarding guide for **Sprint 028**, this document walks you through setting up your environment, understanding our TypeScript/Node.js stack, and identifying how you can contribute by building new spatial monads or WebGL shaders.

---

## 1. Quick Start & Development Setup

The Web of Life simulation engine is built entirely using **TypeScript** and **Node.js**. We do not use Python (`pip` or `pytest`); all dependency management and test executions run through `npm` and `npx`.

### Repository URL
Clone the official repository:
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
```

### Installing Dependencies
Install the required packages using npm:
```bash
npm install
```

### Running Sprint Tests
To verify your environment and run the test suite for Sprint 028 (covering H3 resolution tier boundary checks):
```bash
npx tsx tests/sprint_028.test.ts
```

---

## 2. Sprint 028 Architectural Highlight: Resolution Tiers

In Sprint 028, we introduced strict resolution tier boundary checks (`[0, 15]`) inside `src/spatial/h3_grid.ts`. This protects our spatial monads from out-of-bounds addressing during hierarchical aggregations (First Law: Matter Conservation).

When writing code that interacts with Uber H3 indexing, always wrap your resolution parameters with our guard clauses:
```typescript
import { isValidResolution, assertValidResolution } from '../spatial/h3_grid';

// Example usage:
assertValidResolution(targetResolution);
```

---

## 3. Good First Issues & Contribution Extension Points

We love welcoming new contributors! If you are looking for ways to jump in, here are two primary extension points you can tackle right now:

### A. Building New Spatial Monads
Spatial monads (`SpatialMonad`) encapsulate biogeochemical states (carbon, nitrogen, water, energy) across H3 cells.
* **Target Directory:** `src/monads/`
* **How to contribute:**
  1. Create a new monad class inheriting from or wrapping `SpatialMonad`.
  2. Implement thermodynamic conservation laws (ensure $\sum \text{children} = \text{parent}$).
  3. Write comprehensive unit tests under `tests/`.

### B. Developing Custom WebGL Shaders
The visualization and rendering engine relies on high-performance WebGL shaders to render millions of spatial cells and trophic energy flows in real-time.
* **Target Directory:** `src/renderer/shaders/` or `src/graphics/`
* **How to contribute:**
  1. Write custom vertex or fragment shaders handling ecological heatmaps or particle flows.
  2. Integrate uniform bindings for H3 resolution tiers, ensuring your shaders respect the `[0, 15]` valid range constraints.
  3. Add visual regression or WebGL context integration tests.

---

## 4. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/my-new-monad`
2. Commit your changes following our conventional commit guidelines.
3. Run your tests locally: `npx tsx tests/sprint_028.test.ts` (along with your own test file).
4. Push to your fork and open a Pull Request on [GitHub](https://github.com/pascalranoroarijaona/WebOfLife).

Happy coding, and welcome to the biosphere simulation community!