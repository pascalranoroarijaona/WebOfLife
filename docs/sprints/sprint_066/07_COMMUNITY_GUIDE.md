<!-- DevRel Onboarding & Contributor Guide -->

# Developer Onboarding & Contributor Guide: Sprint 066
**Repository:** [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)  
**Tech Stack:** TypeScript, Node.js  

Welcome to the **Web of Life** developer community! This guide will walk you through setting up your environment, understanding Sprint 066's **Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper** (`src/thermodynamics/state_validator.ts`), and identifying **Good First Issues** for building custom monads and WebGL shaders.

---

## 1. Quickstart & Environment Setup

Ensure you have **Node.js** (v18+ recommended) installed on your system. 

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the Sprint 066 test suite:**
   To verify that your environment is correctly configured and that the thermodynamic validator functions as expected, execute:
   ```bash
   npx tsx tests/sprint_066.test.ts
   ```

---

## 2. Sprint 066 Feature Overview: `StateValidator`

Sprint 066 introduces strict thermodynamic validation via `src/thermodynamics/state_validator.ts`. The simulation engine enforces the **First Law of Thermodynamics** (matter conservation) across biological and industrial state transitions.

### Key Concepts:
- **`StateVector`**: Tracks multi-elemental mass balances (Carbon, Nitrogen, Phosphorus, Water).
- **`StateValidator.evaluateDiscrepancy()`**: A pure, side-effect-free static method that compares expected versus actual state vector inventories against elemental tolerance bounds.

```ts
import { StateValidator } from './src/thermodynamics/state_validator';
import { StateVector } from './src/thermodynamics/state_vector';

const expected = new StateVector({ carbon: 100, nitrogen: 50, phosphorus: 10, water: 500 });
const actual = new StateVector({ carbon: 101, nitrogen: 50, phosphorus: 10, water: 500 });

const result = StateValidator.evaluateDiscrepancy(expected, actual, {
  carbon: 2.0,
  nitrogen: 1.0,
  phosphorus: 0.5,
  water: 5.0
});

console.log(result.isValid); // true (diff 1.0 <= tolerance 2.0)
```

---

## 3. Extension Points for External Contributors

We welcome community contributions! Whether you want to model novel biochemical pathways or render real-time planetary thermodynamics using WebGL, here are the primary extension points.

### 3.1 Building New Monads (`src/monads/` or `src/thermodynamics/`)
If you want to introduce a new biogeochemical process monad (e.g., denitrification, methane clathrate release, or industrial carbon capture):
1. **Extend `StateVector`**: Ensure your transformation functions accept and return valid thermodynamic state vectors.
2. **Integrate `StateValidator`**: Wrap your transformation pipeline with `StateValidator.evaluateDiscrepancy` to assert that mass conservation laws are never silently violated.
3. **Write Unit Tests**: Add your test cases under `tests/` and run them using:
   ```bash
   npx tsx tests/sprint_N.test.ts
   ```

### 3.2 Building New WebGL Shaders (`src/renderer/shaders/`)
For contributors interested in GPU-accelerated visualization of thermodynamic fluxes and elemental gradients:
1. **Shader Placement**: Add custom GLSL fragment/vertex shaders inside `src/renderer/shaders/`.
2. **Uniform Binding**: Bind state vector inventories or discrepancy results as uniforms to visualize real-time mass violations or energy degradation gradients across the Web of Life grid.
3. **Pipeline Integration**: Register your shader passes in the main WebGL rendering loop (`src/renderer/engine.ts`).

---

## 4. Good First Issues for New Contributors

Looking for a place to start? Pick up one of these starter tasks:

1. **GFI-01: Expand Elemental Tolerance Support**
   - *Goal:* Extend `ElementTolerances` and `StateValidator` to support trace elements like Sulfur ($S$) and Iron ($Fe$).
   - *Files:* `src/thermodynamics/types.ts`, `src/thermodynamics/state_validator.ts`
   - *Test:* `npx tsx tests/sprint_066.test.ts`

2. **GFI-02: WebGL Thermodynamic Heatmap Shader**
   - *Goal:* Create a basic fragment shader that colors grid cells based on absolute inventory discrepancies returned by `StateValidator`.
   - *Files:* `src/renderer/shaders/discrepancy.frag`, `src/renderer/engine.ts`

Happy coding, and welcome to the Web of Life open-source community! 🌍✨