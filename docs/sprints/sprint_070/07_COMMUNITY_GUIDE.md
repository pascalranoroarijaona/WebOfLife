<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 070: Developer Onboarding & Community Contribution Guide

Welcome to the **Web of Life** (`https://github.com/pascalranoroarijaona/WebOfLife`) open-source community! As Head of Developer Relations, I am thrilled to guide you through our latest release—**Sprint 070**—which formalizes thermodynamic state tracking through rigorous mathematical extraction in TypeScript and Node.js.

Whether you want to build custom thermodynamic monads or render biological state vectors using WebGL shaders, this guide will help you set up your workspace, understand our architecture, and find your first contribution opportunity.

---

## 1. Quickstart & Local Development Setup

We build entirely in **TypeScript** and **Node.js**. 

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install Dependencies:**
   Make sure you have Node.js (v18+) installed. Install project packages using npm:
   ```bash
   npm install
   ```

3. **Run Sprint 070 Tests:**
   We validate all thermodynamic calculations and state validator functions via our custom test suites. Run Sprint 70 verification with:
   ```bash
   npx tsx tests/sprint_070.test.ts
   ```

---

## 2. What We Built in Sprint 70

Sprint 70 introduces the pure helper function `computeAbsoluteStockDelta(actual, expected)` located in `src/thermodynamics/state_validator.ts`. 

### The Math:
$$\Delta_k = \left| A.stocks[k] - E.stocks[k] \right| \quad \forall k \in K$$

### Code Implementation:
```typescript
import { ThermodynamicStateVector } from './state_vector';

export function computeAbsoluteStockDelta(
  actual: ThermodynamicStateVector,
  expected: ThermodynamicStateVector
): Record<string, number> {
  const discrepancies: Record<string, number> = {};
  const actualStocks = actual?.stocks ?? {};
  const expectedStocks = expected?.stocks ?? {};
  
  const keys = new Set([
    ...Object.keys(actualStocks),
    ...Object.keys(expectedStocks)
  ]);

  for (const key of keys) {
    const actVal = actualStocks[key] ?? 0;
    const expVal = expectedStocks[key] ?? 0;
    discrepancies[key] = Math.abs(actVal - expVal);
  }

  return discrepancies;
}
```

---

## 3. Good First Issues & Extension Points

We are actively welcoming external contributors! Here are targeted areas where you can make an immediate impact:

### A. Build a New Monad (`Good First Issue`)
- **Objective:** Create a custom thermodynamic process monad in `src/thermodynamics/monads/` that simulates an external carbon flux (e.g., photosynthetic carbon sequestration).
- **Extension Point:** Implement the `ThermodynamicMonadProcess` interface, chaining your calculation with `computeAbsoluteStockDelta` to verify mass conservation.
- **Testing:** Add a new test file `tests/sprint_071.test.ts` and run it via:
  ```bash
  npx tsx tests/sprint_071.test.ts
  ```

### B. Build a New WebGL Shader (`Shader Extension Point`)
- **Objective:** Visualize elemental stock discrepancies (`Record<string, number>`) in real-time using WebGL fragment shaders.
- **Extension Point:** Locate our rendering pipeline under `src/renderer/shaders/` and write a custom GLSL shader that maps absolute stock deltas ($\Delta_k$) to color gradients (e.g., green for equilibrium, red for high thermodynamic drift).
- **Testing:** Verify pixel output pipelines using our headless WebGL testing suite:
  ```bash
  npx tsx tests/shader_pipeline.test.ts
  ```

---

## 4. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/my-new-monad`
2. Commit your changes with clear messages referencing thermodynamic laws.
3. Run your tests locally: `npx tsx tests/sprint_070.test.ts`
4. Open a Pull Request on [GitHub](https://github.com/pascalranoroarijaona/WebOfLife).

Happy coding, and welcome to the ecosystem!