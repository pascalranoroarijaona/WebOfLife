<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 25 Developer Onboarding & Contributor Guide

Welcome to the **Web of Life** repository (`https://github.com/pascalranoroarijaona/WebOfLife`)! This guide provides everything you need to start contributing to our simulation framework, specifically focusing on our latest release: **Sprint 25 – Thermodynamic State Vector Interface Contracts and Non-Equilibrium Entropy Generation**.

---

## 🚀 Quickstart for New Contributors

We build and run our simulation using **TypeScript** and **Node.js**. 

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install dependencies:**
   > **CRITICAL CONSTRAINT:** Never use `pip install` or `pytest`. This is a pure TypeScript/Node.js project.
   ```bash
   npm install
   ```

3. **Run the test suite:**
   Execute our test suite using `tsx`:
   ```bash
   npx tsx tests/sprint_025.test.ts
   ```

---

## 🛠️ Good First Issues & Extension Points

If you are looking to make your first contribution to the Web of Life ecosystem, we have highlighted two key extension areas for external contributors: **Building Custom Monads** and **Adding WebGL Shaders**.

### 1. Extending the Monad Pipeline (`src/thermodynamics/`)
External contributors can implement custom biogeochemical monad processes (e.g., Sulfur or Methane cycles) by wrapping transformations with our immutable `ThermodynamicMonad` contract.

* **Where to look:** `src/thermodynamics/methods.ts` and `src/thermodynamics/types.ts`.
* **Good First Issue Task:** Implement a new `MethaneCycleMonad` that calculates chemical dissipation rates and enforces $\dot{S}_{\text{gen}} \ge 0$.
* **Example Code Pattern:**
  ```typescript
  import { ThermodynamicMonad, computeEntropyGeneration } from './methods';
  import { ThermodynamicStateSnapshot } from './types';

  export function stepMethaneCycle(state: ThermodynamicStateSnapshot): ThermodynamicStateSnapshot {
    const entropyMetrics = computeEntropyGeneration(
      state.boundaryFluxes.netHeatFlux,
      state.stateVector.temperature,
      0.05, // chemical dissipation
      0.01  // diffusive transport
    );
    return {
      ...state,
      entropyMetrics,
    };
  }
  ```

### 2. Creating New WebGL Shaders (`src/rendering/shaders/`)
To visualize real-time entropy generation ($\dot{S}_{\text{gen}}$) and exergy destruction ($\dot{I}$) across the planetary biosphere grid, you can contribute new WebGL fragment and vertex shaders.

* **Where to look:** `src/rendering/shaders/` and `src/rendering/webgl_pipeline.ts`.
* **Good First Issue Task:** Write a fragment shader (`entropy_heat_map.frag`) that maps the `totalEntropyGenerationRate` scalar field onto a thermal color ramp (Blue $\to$ Green $\to$ Red representing $0 \to \max \dot{S}_{\text{gen}}$).
* **Testing your shader:** Add a rendering integration test under `tests/sprint_025.test.ts` asserting uniform compilation without WebGL context errors.

---

## 📋 Contributing Guidelines

1. **Strict Immutability:** All thermodynamic vectors and boundary fluxes must remain `readonly`.
2. **Second Law Validation:** Any state mutation that results in $\dot{S}_{\text{gen}} < 0$ must throw a `ThermodynamicViolationError`.
3. **Pull Request Protocol:** Ensure all tests pass (`npx tsx tests/sprint_025.test.ts`) before opening a PR against `main`.