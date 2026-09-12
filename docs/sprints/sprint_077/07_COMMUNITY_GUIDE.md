<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 077 Developer Onboarding & Contributor Guide: Thermodynamic State Vector Discrepancy Aggregator

Welcome to the **Web of Life** developer community! This guide serves as your onboarding manual for **Sprint 077**, focusing on the implementation of the **Thermodynamic State Vector Discrepancy Aggregator** located in `src/thermodynamics/state_validator.ts`. 

Whether you are building custom monads or authoring high-performance WebGL shaders, this guide outlines our repository layout, installation steps, testing patterns, and "Good First Issues" for external contributors.

---

## 1. Environment Setup & Getting Started

The Web of Life repository is built entirely on **TypeScript** and **Node.js**. 

> **CRITICAL CONSTRAINT REMINDER:** We do **NOT** use Python, `pip`, or `pytest`. All dependencies and test suites are managed via Node.js tools.

### 1.1 Installation
Clone the repository and install dependencies using `npm`:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### 1.2 Running the Test Suite
To verify your environment and execute the Sprint 077 verification tests, use `npx tsx`:

```bash
npx tsx tests/sprint_077.test.ts
```

---

## 2. Sprint 077 Architecture Overview

Sprint 077 introduces rigorous thermodynamic monitoring into the biosphere simulation pipeline. The core component, `StateVectorDiscrepancyAggregator`, implements `IStateVectorAggregator` within `src/thermodynamics/state_validator.ts`.

```
[BaseMonadProcess] --> [ThermodynamicMonadProcess] --> [StateValidator]
                                                            │
                                                            ▼
                                              [StateVectorDiscrepancyAggregator]
```

### Key Interfaces (`src/thermodynamics/state_validator.ts`)
- **`IStateVector`**: Tracks conserved stocks ($C, N, P, W, H$).
- **`IStateEvaluationResult`**: Pairs timestamps, expected/actual vectors, and evaluated discrepancies.
- **`IStateVectorAggregator`**: Defines `mapEvaluations()` and `accumulateMaxDiscrepancy()`.

---

## 3. Good First Issues for External Contributors

Looking to make your first open-source contribution to the Web of Life? Here are two designated "Good First Issues" aligned with Sprint 077 architecture:

### Issue A: Custom Monad Process Implementation
* **Objective**: Create a new thermodynamic monad process in `src/thermodynamics/monads/` that applies a decay function over Carbon stocks while preserving enthalpy bounds.
* **Extension Point**: Extend `ThermodynamicMonadProcess` and implement the monadic bind operator (`flatMap`) to chain state transformations safely without matter leakage.
* **Verification**: Add a corresponding test file `tests/sprint_077_monad.test.ts` and run it via `npx tsx tests/sprint_077_monad.test.ts`.

### Issue B: WebGL Shader Discrepancy Visualizer
* **Objective**: Build a WebGL fragment shader in `src/shaders/discrepancy_heatmap.frag` that visually renders the maximum discrepancy accumulated by the aggregator as a thermal color gradient (blue for equilibrium, red for Second Law violations).
* **Extension Point**: Hook the uniform inputs of your shader to the output of `StateVectorDiscrepancyAggregator.accumulateMaxDiscrepancy()`.
* **Verification**: Run the rendering test suite using `npx tsx tests/sprint_077_shader.test.ts`.

---

## 4. Contributing Workflow

1. **Fork & Branch**: Create a feature branch from `main` (`git checkout -b feat/my-new-monad`).
2. **Implement**: Write your TypeScript code following strict typing and pure functional monad patterns.
3. **Test**: Always add unit tests under `tests/` and run them:
   ```bash
   npx tsx tests/sprint_077.test.ts
   ```
4. **Pull Request**: Open a PR against `https://github.com/pascalranoroarijaona/WebOfLife` with a clear description of your thermodynamic or graphical enhancements.

Happy coding, and welcome to the Web of Life community!