<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 078 Community & Contributor Onboarding Guide

Welcome to the **Web of Life** developer community! Sprint 078 introduces the **Thermodynamic State Vector Inventory Discrepancy Evaluator** (`src/thermodynamics/state_validator.ts`). This guide covers how to set up your environment, run the test suite, and identify "Good First Issues" for contributing new monads or WebGL shaders.

---

## 1. Environment Setup & Getting Started

Our project is built with **TypeScript** and **Node.js**. Ensure you have Node.js (v18+) installed.

### Installation
Clone the repository and install dependencies using `npm`:
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Tests
We validate all thermodynamic modules using our test suite runner via `npx tsx`:
```bash
npx tsx tests/sprint_078.test.ts
```

---

## 2. Core Architecture: `StateValidator`

The newly added `StateValidator` enforces First and Second Law thermodynamic boundaries across biological and chemical stocks (carbon, nitrogen, phosphorus, water, and energy).

```typescript
import { StateVector } from './state_vector';
import { StateValidator } from './src/thermodynamics/state_validator';

const validator = new StateValidator(1e-6);
const report = validator.evaluateDiscrepancy(currentState, expectedState);

if (!report.isBalanced) {
  console.warn(`Discrepancy detected: ${report.totalDiscrepancy}`);
}
```

---

## 3. Good First Issues & Extension Points

We welcome external contributions! Below are target areas for new contributors looking to build custom monads or rendering shaders.

### 3.1 Building a New Thermodynamic Monad (`Good First Issue`)
* **Objective:** Create a custom biochemical monad process that hooks into `StateValidator`.
* **Where to look:** Examine `src/thermodynamic_monad_process.ts`.
* **Steps to Implement:**
  1. Define your new biochemical flux interface in `src/thermodynamics/types.ts`.
  2. Implement the monad state transition wrapper.
  3. Invoke `StateValidator.evaluateDiscrepancy` during step evaluation.
  4. Write unit tests under `tests/` and execute via `npx tsx tests/your_new_monad.test.ts`.

### 3.2 Extending WebGL Shaders for Thermodynamic Visualization (`Good First Issue`)
* **Objective:** Map `DiscrepancyReport.entropyDelta` and stock pools to real-time WebGL fragment shaders.
* **Where to look:** Look at existing shader pipelines in the rendering directories.
* **Steps to Implement:**
  1. Expose uniform variables for entropy deltas and inventory imbalances.
  2. Write fragment shaders that color stock depletion or energetic dissipation visually.
  3. Test rendering performance in a browser or test harness context.

---

## 4. Submitting Pull Requests
1. Fork the repository on GitHub: `https://github.com/pascalranoroarijaona/WebOfLife`
2. Create your feature branch (`git checkout -b feature/amazing-monad`).
3. Commit your changes (`git commit -m 'Add custom nitrogen cycling monad'`).
4. Push to the branch (`git push origin feature/amazing-monad`).
5. Open a Pull Request against `main`. Ensure all tests pass using `npx tsx tests/sprint_078.test.ts`.