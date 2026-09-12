<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 068 Developer Community Guide & Onboarding

Welcome to the **Web of Life** developer community! This guide serves as your onboarding manual for **Sprint 068**, which introduces the **Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper** (`src/thermodynamics/state_validator.ts`).

Whether you are looking to build custom biogeochemical monads or design high-performance WebGL shaders for Earth pod visualizations, this guide provides the context, setup instructions, and extension patterns you need.

---

## 1. Getting Started & Repository Setup

The Web of Life repository is maintained at:
[https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation & Test Execution
Clone the repository and install dependencies using standard Node.js tooling:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

To run the verification suite for Sprint 068 (and other sprints), execute tests via `npx tsx`:

```bash
npx tsx tests/sprint_068.test.ts
```

*(Note: Never use `pip install` or `pytest`—our entire backend simulation, monad pipeline, and test harness are written strictly in TypeScript and executed via Node.js/tsx).*

---

## 2. Sprint 068 Core Feature Overview: `StateValidator`

In biogeochemical simulations, floating-point arithmetic drift and mass leakage can violate the First (Conservation of Matter) and Second (Thermodynamic Dissipation) Laws of Thermodynamics. 

The `StateValidator` class (`src/thermodynamics/state_validator.ts`) provides an isolated, deterministic mathematical comparison engine. It checks actual thermodynamic state vectors against expected baselines using individual per-element tolerances ($\epsilon$).

### Example Usage
```typescript
import { StateValidator } from '../src/thermodynamics/state_validator';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector';

const validator = new StateValidator({
  carbon: 1e-6,
  nitrogen: 1e-6,
  phosphorus: 1e-6,
  water: 1e-6,
  energy: 1e-4
});

const actual = new ThermodynamicStateVector({ carbon: 100.000005, nitrogen: 50.0 });
const expected = new ThermodynamicStateVector({ carbon: 100.0, nitrogen: 50.0 });

const report = validator.evaluate(actual, expected);
console.log(`System State Valid? ${report.isValid}`);
console.log(`Max Discrepancy: ${report.maxDiscrepancy}`);
```

---

## 3. Contributor Extension Points

### 3.1 Building New Monads
If you want to contribute a new biogeochemical or ecological monad (e.g., a sulfur cycle or nitrogen fixation module):
1. Extend the base monad interface in `src/monads/`.
2. Ensure all state transitions explicitly conserve mass across Carbon, Nitrogen, Phosphorus, and Water pools.
3. Integrate `StateValidator` in your monad's integration tests to verify that state updates remain within allowable tolerances (`1e-6` for matter, `1e-4` for energy).

### 3.2 Building WebGL Shaders for Pod Visualizations
For contributors interested in GPU-accelerated rendering of Earth pod thermodynamic fluxes:
1. Place GLSL shader files in `src/rendering/shaders/`.
2. Bind uniform buffers matching the thermodynamic state vector inventories to visualize real-time discrepancies or energy dissipation gradients across the planetary simulation grid.

---

## 4. Contributing Guidelines
1. Fork the repository on GitHub.
2. Create a feature branch (`git checkout -b feature/sprint-extension`).
3. Write clean TypeScript code with accompanying unit tests in `tests/`.
4. Ensure all tests pass (`npx tsx tests/sprint_068.test.ts`).
5. Open a Pull Request against `main`. Happy coding!