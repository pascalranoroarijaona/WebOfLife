<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 074 Developer-Focused Onboarding & Contributor Guide
**Repository**: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)  
**Tech Stack**: TypeScript, Node.js

Welcome to the **Web of Life** developer community! Sprint 074 introduces critical biospheric tracking mechanics via the Thermodynamic State Vector Discrepancy Absolute Difference Math Function (`computeAbsoluteStockDelta`) in `src/thermodynamics/state_validator.ts`. 

This guide helps you onboard quickly, run your environment, write tests, and identify "Good First Issues" if you want to extend our monad architectures or WebGL shaders.

---

## 1. Getting Started & Environment Setup

Ensure you have **Node.js** (v18+) installed. Clone the repository and install dependencies using `npm`:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Tests
We use `tsx` for running TypeScript test files directly without manual compilation steps. To run the Sprint 074 test suite, execute:

```bash
npx tsx tests/sprint_074.test.ts
```

---

## 2. Sprint 074 Architecture Highlights

Sprint 074 adds `computeAbsoluteStockDelta` to `src/thermodynamics/state_validator.ts`. This pure helper function calculates absolute differences across elemental keys (e.g., carbon, nitrogen, phosphorus, water) between observed (`actual`) and target (`expected`) thermodynamic state vectors:

```typescript
import { computeAbsoluteStockDelta, StateVector } from './src/thermodynamics/state_validator';

const actual: StateVector = { carbon: 150.5, water: 900.0 };
const expected: StateVector = { carbon: 100.0, nitrogen: 5.0 };

const delta = computeAbsoluteStockDelta(actual, expected);
// Results in: { carbon: 50.5, water: 900.0, nitrogen: 5.0 }
```

Key invariants:
- **Matter Conservation (First Law)**: Prevents phantom creation/destruction by quantifying mass redistribution across planetary compartments.
- **Deterministic Purity**: Side-effect-free calculation operating on immutable records.
- **Key Union Robustness**: Missing keys default to `0` to prevent `NaN` propagation during validation cycles.

---

## 3. Contributor Extension Points & "Good First Issues"

Are you looking to contribute to the Web of Life? Here are concrete extension points for building new monads or WebGL shaders.

### A. Building New Thermodynamic Monads (`Good First Issue`)
Our functional-reactive validation pipeline uses monadic wrappers to manage side-effects and state transitions (`src/thermodynamics/thermodynamic_monad_process.ts`). 

* **The Challenge**: Implement a `ThreasholdEnforcementMonad` that takes a `ValidationResult` and automatically triggers a homeostatic correction callback if tolerance thresholds are breached.
* **Where to start**: Look at `src/thermodynamics/thermodynamic_monad_process.ts` and inspect how `validateStateMonad` integrates with `computeAbsoluteStockDelta`.
* **Testing**: Write your unit tests in `tests/sprint_074.test.ts` (or create a new test file `tests/monad_extensions.test.ts`) and run:
  ```bash
  npx tsx tests/monad_extensions.test.ts
  ```

### B. Extending WebGL Shaders for Biospheric Visualization (`Advanced Contributor`)
The visualization layer maps thermodynamic state vectors and biospheric fluxes onto real-time GPU shaders located in `src/renderer/shaders/`.

* **The Challenge**: Create a fragment shader that visually interpolates absolute stock deltas (computed via `computeAbsoluteStockDelta`) into color-coded heatmaps representing planetary stress levels (e.g., shifting from blue for homeostasis to crimson for critical nitrogen/carbon discrepancies).
* **Where to start**: Examine existing GLSL shaders in `src/renderer/shaders/biosphere.frag` and their TypeScript binding managers in `src/renderer/shader_controller.ts`.

---

## 4. Submitting Your Contribution

1. Fork the repository on GitHub: `https://github.com/pascalranoroarijaona/WebOfLife`
2. Create your feature branch: `git checkout -b feature/my-new-monad`
3. Commit your changes following conventional commits: `git commit -m "feat(thermodynamics): add threshold enforcement monad"`
4. Run your tests locally: `npx tsx tests/sprint_074.test.ts`
5. Push to your fork and open a Pull Request against `main`.

Happy coding, and welcome to the Web of Life ecosystem!