<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 075 Developer Onboarding & Contributor Guide

Welcome to the **Web of Life** developer community! This guide covers our onboarding workflow for Sprint 075, introducing the Thermodynamic State Vector Elemental Tolerance Comparison Guard (`src/thermodynamics/state_validator.ts`), along with pathways for external contributors wishing to build new monads or WebGL shaders.

---

## 1. Quick Start & Development Setup

Our stack is built strictly with **TypeScript** and **Node.js**. 

### Installation & Environment
Clone the repository from [GitHub](https://github.com/pascalranoroarijaona/WebOfLife) and install dependencies using `npm`:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Sprint Tests
To verify your environment and execute the Sprint 075 unit tests, run:

```bash
npx tsx tests/sprint_075.test.ts
```

---

## 2. Sprint 075 Feature Walkthrough: `isWithinTolerance`

Sprint 075 introduces a pure helper function, `isWithinTolerance(diff, tolerance)`, located in `src/thermodynamics/state_validator.ts`. This utility ensures homeostatic boundaries and thermodynamic conservation laws are respected without mutating state vectors or introducing external sources/sinks.

### Usage Example

```typescript
import { isWithinTolerance } from '../src/thermodynamics/state_validator';

// Example: Checking carbon stock divergence
const expectedCarbonStock = 500.0; // moles CO2 equivalent
const actualCarbonStock = 502.5;
const toleranceThreshold = 3.0;

const diff = actualCarbonStock - expectedCarbonStock; // 2.5
const isValid = isWithinTolerance(diff, toleranceThreshold); 

console.log(isValid); // true (|2.5| <= 3.0)
```

---

## 3. Good First Issues & Extension Points for Contributors

We welcome community contributions! Here are two primary areas where you can make an immediate impact:

### A. Building New Monads
The simulation architecture relies on composable monads representing ecological and planetary subsystems (e.g., Earth Pod, Carbon Cycle, Nitrogen Cycle). 
* **Extension Point**: Implement a new custom monad inside `src/monads/`.
* **Requirements**: 
  - Ensure pure state transitions.
  - Integrate thermodynamic state validation using `isWithinTolerance` from `src/thermodynamics/state_validator.ts`.
  - Add comprehensive unit tests in a new test file (e.g., `tests/sprint_custom_monad.test.ts`).

### B. Developing New WebGL Shaders
To visualize complex biogeochemical feedback loops and thermal dissipation, our rendering pipeline leverages custom WebGL shaders.
* **Extension Point**: Add new fragment or vertex shaders under `src/shaders/` or `public/shaders/`.
* **Guidelines**:
  - Keep shader calculations optimized for real-time web rendering.
  - Expose uniform parameters for thermodynamic states (e.g., temperature gradients, carbon density maps).

---

## 4. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/amazing-new-monad`
2. Commit your changes following our conventional commit guidelines.
3. Run your test suites: `npx tsx tests/sprint_075.test.ts` (and your new tests).
4. Open a Pull Request against `main` on [GitHub](https://github.com/pascalranoroarijaona/WebOfLife).