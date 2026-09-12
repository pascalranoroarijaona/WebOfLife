<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 054 Contributor & Onboarding Guide: Thermodynamic State Vector Stock Conservation Asserter

Welcome to the **Web of Life** open-source community! In Sprint 054, we introduced the **Thermodynamic State Vector Stock Conservation Asserter** (`src/thermodynamics/state_validator.ts`). This module enforces rigid First and Second Law thermodynamic invariants across planetary biogeochemical stocks (carbon, nitrogen, phosphorus, water, and energy).

Whether you want to build custom thermodynamic monads, design high-performance WebGL shaders for planetary visualization, or audit biogeochemical flux equations, this guide will get you up to speed.

---

## 1. Quick Start & Development Setup

Our stack is built on **TypeScript** and **Node.js**. We do not use Python (`pip` or `pytest`). Ensure you have Node.js (v18+) installed.

### Installation & Test Execution

```bash
# Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife
cd WebOfLife

# Install dependencies using npm
npm install

# Run the Sprint 054 conservation assertion test suite
npx tsx tests/sprint_054.test.ts
```

---

## 2. Architecture Overview for Contributors

The simulation core processes planetary updates through reactive state vectors and thermodynamic monads. When states transition from time $t_0$ to $t_1$, the `StateValidator` intercepts the transition and evaluates mass/energy conservation.

```
+-----------------------------------------------------------+
|                      StateValidator                       |
|                   (src/thermodynamics/state_validator.ts) |
+-----------------------------------------------------------+
  |-- 1. Evaluates ΔStock = State(t_1) - State(t_0)
  |-- 2. Calculates Expected Δ = Net Boundary Flux * Δt
  |-- 3. Asserts |ΔActual - ΔExpected| <= Tolerance (First Law)
  |-- 4. Checks Solar-Only Energy Forcing (Second Law)
```

---

## 3. Good First Issues & Extension Points

Looking to make your first contribution? Here are two designated entry points for external contributors:

### Extension Point A: Building a Custom Biogeochemical Monad
You can introduce new elemental or isotopic cycles (e.g., Sulfur or Iron cycles) by implementing a custom monad process and registering its stocks with the `StateValidator`.

* **File to inspect**: `src/thermodynamics/state_validator.ts` & `src/thermodynamics/monad_process.ts`
* **Task**:
  1. Define a new stock key (e.g., `'sulfur'`) in your custom cycle module.
  2. Register a custom tolerance rule using `stateValidator.registerRule('sulfur', 1e-4);`.
  3. Ensure all internal transformations preserve mass against boundary inputs/outputs.
* **Good First Issue Stub**:
  ```typescript
  // src/cycles/sulfur_monad.ts
  import { ThermodynamicMonad } from '../thermodynamics/thermodynamic_monad_process';
  
  export class SulfurCycleMonad extends ThermodynamicMonad {
    // Implement custom sulfur oxidation/reduction flux equations here
  }
  ```

### Extension Point B: WebGL Shader for Real-Time Thermodynamic Flux Visualization
Help us render thermodynamic validation residuals and energy dissipation gradients in real-time using WebGL shaders.

* **Directory to inspect**: `src/renderer/shaders/`
* **Task**:
  1. Create a fragment shader that maps `ValidationResult.discrepancies` to visual color gradients (e.g., green for compliant fluxes, red for First/Second Law violations).
  2. Hook the shader uniforms into the main EarthPod rendering loop.
* **Good First Issue Stub**:
  ```glsl
  // src/renderer/shaders/thermodynamic_violation.frag
  precision highp float;
  uniform float u_discrepancy;
  uniform float u_tolerance;
  
  void main() {
      if (u_discrepancy > u_tolerance) {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Violation: Red Alert
      } else {
          gl_FragColor = vec4(0.0, 0.8, 0.2, 1.0); // Compliant: Stable Green
      }
  }
  ```

---

## 4. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/my-new-monad`
2. Implement your changes and add robust test coverage in `tests/`.
3. Verify all tests pass locally:
   ```bash
   npx tsx tests/sprint_054.test.ts
   ```
4. Push your branch and open a Pull Request against `main` on GitHub:
   `https://github.com/pascalranoroarijaona/WebOfLife`

Happy coding, and welcome to the Web of Life community!