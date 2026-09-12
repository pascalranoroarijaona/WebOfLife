<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 064 Developer Onboarding & Contributor Guide: Thermodynamic State Vector Inventory Discrepancy Evaluator

Welcome to the **Web of Life** open-source community! This guide provides everything you need to know to get started with Sprint 064 features, run the test suite, and contribute new monad pipelines or WebGL shaders.

---

## 1. Quick Start & Environment Setup

The Web of Life repository is built entirely on **TypeScript** and **Node.js**. 

> **CRITICAL CONSTRAINTS:** 
> - Never use Python tools (`pip install`, `pytest`, etc.). 
> - Always use `npm install` for dependencies.
> - Run tests using `npx tsx tests/sprint_064.test.ts`.

### Installation
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Sprint 064 Tests
Execute the specific test suite for Sprint 064:
```bash
npx tsx tests/sprint_064.test.ts
```

---

## 2. Sprint 064 Core Feature Overview

Sprint 064 introduces the **Thermodynamic State Vector Inventory Discrepancy Evaluator** (`src/thermodynamics/state_validator.ts`). This core helper provides isolated mathematical comparisons between expected and actual thermodynamic state vectors, ensuring adherence to the First Law of Thermodynamics (mass/energy conservation) and the Second Law (entropy bounds).

### Key Code Example (`src/thermodynamics/state_validator.ts`)
```ts
import { ThermodynamicStateValidator } from './src/thermodynamics/state_validator';

const validator = new ThermodynamicStateValidator(1e-6);
const result = validator.evaluateDiscrepancy(expectedState, actualState, tolerances);

if (!result.isValid) {
  console.warn(`Discrepancy detected! Max delta: ${result.maxDelta}`);
}
```

---

## 3. Good First Issues & Contribution Opportunities

We welcome external contributors! If you are looking for where to start contributing, check out the following extension points:

### A. Building New Thermodynamic Monads
- **Location:** `src/monads/`
- **Objective:** Implement custom biochemical transformation monads (e.g., Sulfur cycle, heavy metal chelation) that integrate with `ThermodynamicStateValidator` to verify mass conservation across state transitions.
- **Good First Issue Task:** Create a new Monad class extending the base monad interface that simulates sulfur oxidation while keeping total mass delta $\le 10^{-6}$.

### B. Extending WebGL Shaders for Thermodynamic Visualization
- **Location:** `src/shaders/` or `src/renderer/`
- **Objective:** Build WebGL fragment shaders that map `maxDelta` or elemental discrepancies (`discrepancies` object from Sprint 064) to real-time color gradients in the simulation canvas (e.g., highlighting energy leakage zones in red).
- **Good First Issue Task:** Write a GLSL fragment shader that adjusts pixel luminance and hue based on spatial thermodynamic entropy vectors.

---

## 4. Submitting Your Contribution

1. Fork the repository at [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife).
2. Create a feature branch (`git checkout -b feature/amazing-monad`).
3. Commit your changes (`git commit -m 'feat: add sulfur cycle monad'`).
4. Push to your branch (`git push origin feature/amazing-monad`).
5. Open a Pull Request and ensure all TypeScript checks and test suites (`npx tsx tests/sprint_064.test.ts`) pass cleanly!