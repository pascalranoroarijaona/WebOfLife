<!-- DevRel Onboarding & Contributor Guide -->
# Developer Relations & Open-Source Contributor Guide: Sprint 027
**Module:** Spatial Resolution Boundary Validation (`src/spatial/h3_grid.ts`)  
**Repository:** [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)  
**Tech Stack:** TypeScript, Node.js

---

## Welcome, Contributors!

Welcome to the Web of Life developer community! In **Sprint 027**, we introduce a vital spatial boundary validation mechanism within our H3 hierarchical indexing framework (`src/spatial/h3_grid.ts`). This guide will help you get set up, understand our thermodynamic and monad design patterns, and point you toward "Good First Issues" and extension points for building new monads or WebGL shaders.

---

## 1. Quickstart & Local Environment Setup

To start contributing, clone the repository and install dependencies using **Node.js and `npm`**:

```bash
# Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install dependencies (DO NOT use pip or Python commands)
npm install
```

### Running Tests
We enforce rigorous invariant testing across all spatial and thermodynamic modules. To execute the test suite for Sprint 027, run:

```bash
npx tsx tests/sprint_027.test.ts
```

---

## 2. Sprint 027 Feature Breakdown: Spatial Boundary Validation

Sprint 027 implements strict type-safe checks for H3 spatial resolution tiers ($0$ to $15$). These checks ensure that biogeochemical stocks (carbon, water, nitrogen, and solar energy) never leak across non-physical or fractional spatial boundaries.

### Core Functions Added (`src/spatial/h3_grid.ts`)
```typescript
export function isValidH3Resolution(resolution: number): boolean {
  return Number.isInteger(resolution) && resolution >= 0 && resolution <= 15;
}

export function assertValidH3Resolution(resolution: number): void {
  if (!isValidH3Resolution(resolution)) {
    throw new Error(`Thermodynamic Invariant Violation: Invalid H3 resolution tier (${resolution}). Must be an integer between 0 and 15.`);
  }
}
```

---

## 3. Good First Issues for External Contributors

Looking to make your first contribution? Here are three well-scoped "Good First Issues" aligned with our architecture:

1. **Issue #271: Extend Boundary Validation to Adjacency Lookups**
   - **Target File:** `src/spatial/h3_adjacency.ts`
   - **Task:** Integrate `assertValidH3Resolution` into all neighbor and ring-generation queries to ensure adjacency operations never query out-of-bounds tiers.
   - **Verification:** Write unit tests in `tests/sprint_027.test.ts` verifying that invalid resolutions throw immediate errors during adjacency traversals.

2. **Issue #272: Thermodynamic Mass-Conservation Unit Test for Refinement**
   - **Target File:** `tests/sprint_027_mass.test.ts`
   - **Task:** Create a test suite verifying that when a parent spatial monad divides into 7 child hexes, $\sum M_{\text{child}} = M_{\text{parent}}$ holds across valid resolution tiers $r \in [0, 14]$.

3. **Issue #273: CLI Resolution Validator Helper**
   - **Target File:** `src/cli/resolution_cli.ts`
   - **Task:** Build a lightweight CLI utility using Node.js that accepts a target H3 index and resolution tier, runs `isValidH3Resolution`, and outputs the resulting thermodynamic state vector container.

---

## 4. Extension Points: Building New Monads & WebGL Shaders

External contributors frequently ask how to extend the simulation engine with custom ecological monads or rendering shaders. Here is how you can hook into our architecture:

### A. Building a New Monad (`src/monads/`)
To introduce a new biogeochemical or trophic monad (e.g., Phosphorus cycling or Mycorrhizal fungal networks):
1. Extend the base spatial contract in `src/monads/spatial_monad.ts`.
2. Implement the `SpatialResolutionContract` interface to guarantee tier validation:
   ```typescript
   import { assertValidH3Resolution } from '../spatial/h3_grid';

   export class PhosphorusMonad {
     constructor(public resolution: number, public stock: number) {
       assertValidH3Resolution(resolution);
     }
   }
   ```
3. Ensure stock conservation laws are respected during spatial compaction and refinement steps.

### B. Building WebGL Shaders (`src/shaders/` or `src/rendering/`)
To visualize spatial monad entropy dissipation and solar energy fluxes across H3 grids:
1. Pass validated resolution tiers as uniforms into your WebGL rendering pipeline.
2. Ensure vertex and fragment shaders in `src/rendering/shaders/` consume resolution data clamped strictly between `0.0` and `15.0`.
3. Test shader compilation and rendering pipelines locally using `npm run test:render` (or via `npx tsx tests/shader.test.ts`).

---

## 5. Community & Support
- **Issues & PRs:** [GitHub Repository](https://github.com/pascalranoroarijaona/WebOfLife/issues)
- **Contribution Guidelines:** Please review `CONTRIBUTING.md` before opening pull requests. Always run `npx tsx tests/sprint_027.test.ts` to ensure zero regressions!