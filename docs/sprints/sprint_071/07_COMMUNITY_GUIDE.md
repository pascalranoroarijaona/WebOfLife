<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 071 Developer Relations & Community Onboarding Guide

Welcome to the **Web of Life** contributor community! This guide is designed to get you up to speed with the latest additions introduced in **Sprint 071**, specifically focusing on thermodynamic state validation, building custom monads, and extending our WebGL shader pipelines.

---

## 1. Getting Started

Our project stack is built on **TypeScript** and **Node.js**. We do not use Python (`pip` or `pytest`). Ensure you have Node.js (v18+) installed.

### Installation & Setup
Clone the repository from [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife) and install dependencies:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running the Sprint 071 Test Suite
To verify your environment and run the test suite corresponding to Sprint 071, execute:

```bash
npx tsx tests/sprint_071.test.ts
```

---

## 2. Core Feature Overview: Sprint 071

Sprint 071 introduces the **Thermodynamic State Vector Discrepancy Absolute Difference Math Function** located in `src/thermodynamics/state_validator.ts`. 

### Key Utility: `computeAbsoluteStockDelta`
This pure helper function calculates absolute differences between actual and expected thermodynamic state vectors across elemental keys (`carbon`, `nitrogen`, `phosphorus`, `water`, and `energy`).

```typescript
import { computeAbsoluteStockDelta, ThermodynamicStockMap } from '../src/thermodynamics/state_validator';

const actual: ThermodynamicStockMap = { carbon: 100, nitrogen: 50, phosphorus: 10, water: 500, energy: 1000 };
const expected: ThermodynamicStockMap = { carbon: 90, nitrogen: 50, phosphorus: 10, water: 510, energy: 950 };

const deltas = computeAbsoluteStockDelta(actual, expected);
// Result: { carbon: 10, nitrogen: 0, phosphorus: 0, water: 10, energy: 50 }
```

---

## 3. Good First Issues & Extension Points

We welcome external contributors! Here are two key areas where you can make your first contribution:

### A. Building New Monads (`src/monads/`)
Monads encapsulate stateful transformations across biogeochemical cycles. To build a new monad:
1. Extend the base monad interface in `src/thermodynamics/monad_process.ts`.
2. Implement your transformation logic while ensuring mass-energy conservation (First Law).
3. Use `computeAbsoluteStockDelta` inside your unit tests to validate post-execution state vectors against expected theoretical baselines.

### B. Extending WebGL Shaders (`src/shaders/`)
For contributors interested in visualization and spatial planetary metabolism:
1. Navigate to `src/shaders/` to inspect existing GLSL fragment and vertex shaders.
2. Hook your custom thermodynamic uniforms (e.g., mapping carbon or energy deltas to color gradients) into the rendering loop.
3. Verify cross-platform WebGL context compliance via `npx tsx tests/sprint_071.test.ts`.

---

## 4. Submitting Your Contribution
1. Fork the repository on GitHub.
2. Create a feature branch (`git checkout -b feature/amazing-monad`).
3. Commit your changes and write unit tests.
4. Run validation tests via `npx tsx tests/sprint_071.test.ts`.
5. Open a Pull Request against `main`. Happy coding!