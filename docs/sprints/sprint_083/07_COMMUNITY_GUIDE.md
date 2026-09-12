<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 083 Developer Relations & Open-Source Community Guide

Welcome to the **Web of Life** repository! As we execute **Sprint 083**, our focus centers on thermodynamic state tracking, rigorous conservation checks, and boundary flux validations via the Thermodynamic State Vector Inventory Discrepancy Evaluator Wrapper (Sub-Task A).

Whether you are building custom biological monads or designing novel WebGL shaders for visualizing ecosystem thermodynamics, this guide provides everything you need to get up to speed quickly.

---

## 🚀 Quick Start & Environment Setup

This project is built using **TypeScript** and **Node.js**. 

> **CRITICAL CONSTRAINTS:** 
> - NEVER use Python tools (`pip install`, `pytest`). 
> - Always use package management via `npm` and execute tests through `npx tsx`.

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### 2. Running the Sprint 083 Test Suite
Verify your installation and test the new `ThermodynamicStateValidator` implementation by running:
```bash
npx tsx tests/sprint_083.test.ts
```

---

## 🧠 Architectural Overview: Sprint 083

Sprint 083 introduces the `ThermodynamicStateValidator` class inside `src/thermodynamics/state_validator.ts`. This component enforces two core physical laws on our simulation engine:
1. **First Law (Conservation of Matter/Energy):** Tracks discrete stock discrepancies ($V_k = A_k - E_k$) across elemental pools (Carbon, Nitrogen, Phosphorus, Water).
2. **Second Law (Entropy & Dissipation Constraints):** Flags irreversible thermodynamic leakage when cumulative mass variances ($\Omega = \sum |V_k|$) exceed machine-precision tolerances ($\epsilon < 10^{-9}$).

---

## 🛠️ Good First Issues & Extension Points

We actively welcome contributions from the open-source community! Here are two high-impact areas where you can contribute immediately during Sprint 083:

### 1. Building Custom Monads (`src/monads/`)
If you want to introduce a new ecological or biochemical process (e.g., nitrogen fixation, chemosynthesis):
- **Extension Point:** Implement a new monad class conforming to our monadic pipeline interface.
- **Good First Issue:** Wrap your monad state transitions to pipe outputs directly into `ThermodynamicStateValidator.evaluateDiscrepancy()`. This ensures your custom life-process respects closed-system mass conservation boundaries.
- **Boilerplate Example:**
  ```typescript
  import { ThermodynamicStateVector } from '../thermodynamics/state_vector';
  import { ThermodynamicStateValidator } from '../thermodynamics/state_validator';

  export class NitrogenFixationMonad {
    private validator = new ThermodynamicStateValidator();

    public execute(state: ThermodynamicStateVector, expectedMap: ThermodynamicMap) {
      // Perform monad state updates...
      const result = this.validator.evaluateDiscrepancy(state, expectedMap);
      if (!result.isValid) {
        throw new Error(`Thermodynamic violation detected in nitrogen pool: ${result.totalMassVariance}`);
      }
      return state;
    }
  }
  ```

### 2. Developing WebGL Shaders for Thermodynamic Visualization (`src/shaders/`)
To visualize real-time entropy production and inventory discrepancies across simulated biomes:
- **Extension Point:** Write custom WebGL fragment shaders in `src/shaders/` that map discrepancy variance metrics ($\Omega$) to color gradients (e.g., blue for equilibrium, red for high dissipation).
- **Good First Issue:** Bind the `DiscrepancyResult.totalMassVariance` output from `state_validator.ts` as a uniform float parameter (`u_massVariance`) in the rendering pipeline.

---

## 🧪 Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/my-new-monad`
2. Implement your changes following strict TypeScript typings.
3. Add unit tests under `tests/`.
4. Run your tests locally:
   ```bash
   npx tsx tests/sprint_083.test.ts
   ```
5. Open a Pull Request against `main` on [GitHub](https://github.com/pascalranoroarijaona/WebOfLife).

Happy coding, and welcome to the Web of Life community!