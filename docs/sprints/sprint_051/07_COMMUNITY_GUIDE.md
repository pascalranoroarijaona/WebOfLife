<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 051 Developer-Focused Onboarding & Contributor Guide: Thermodynamic State Vector Stock Conservation Asserter

Welcome to the **WebOfLife** repository! This guide provides everything you need to get up to speed with **Sprint 051**, which introduces the **Thermodynamic State Vector Stock Conservation Asserter** (`src/thermodynamics/state_validator.ts`). 

As an open-source contributor, you will learn how this module enforces the First and Second Laws of Thermodynamics across Earth Pod state transitions, how to run the test suite using our TypeScript/Node.js toolchain, and how to extend the framework by building new monads or WebGL shaders.

---

## 1. Quick Start & Development Setup

WebOfLife is built entirely in **TypeScript** and **Node.js**. 

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+)

### Installation & Test Execution
Clone the repository and install dependencies using standard Node commands:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

To run the test suite for Sprint 051 (and verify thermodynamic state validation), use `npx tsx`:

```bash
npx tsx tests/sprint_051.test.ts
```

> **CRITICAL NOTE:** This repository uses TypeScript and Node.js. **Never** use Python tooling (`pip install`, `pytest`) for testing or running modules in this repository.

---

## 2. Sprint 051 Architecture: The Thermodynamic State Validator

Sprint 051 implements `ThermodynamicStateValidator` within `src/thermodynamics/state_validator.ts`. This component acts as an invariant gatekeeper during monad execution, ensuring that elemental ($C, N, P, H_2O$) and energetic stocks adhere to physical conservation laws over a discrete time step $\Delta t$.

### Key Interfaces (`src/thermodynamics/types.ts`)

```typescript
export interface FluxBoundary {
  netFluxes: Map<string, number>; // stock name -> rate (units/time)
  solarInput: number;             // Solar energy input rate (First/Second Law compliance)
  dissipationRate: number;        // Heat/entropy dissipation rate
}

export interface ValidationResult {
  isValid: boolean;
  violations: Array<{
    stockName: string;
    observedDelta: number;
    predictedDelta: number;
    discrepancy: number;
    tolerance: number;
  }>;
  timestamp: number;
}
```

### Core Usage Example

```typescript
import { StateVector } from './src/thermodynamics/state_vector';
import { ThermodynamicStateValidator } from './src/thermodynamics/state_validator';
import { FluxBoundary } from './src/thermodynamics/types';

// 1. Initialize states
const prevState = new StateVector(new Map([['carbon', 100.0], ['energy', 500.0]]));
const currState = new StateVector(new Map([['carbon', 105.0], ['energy', 548.5]]));

// 2. Define boundary fluxes over deltaTime = 1.0
const boundary: FluxBoundary = {
  netFluxes: new Map([['carbon', 5.0]]),
  solarInput: 60.0,
  dissipationRate: 10.0
};

// 3. Validate conservation
const validator = new ThermodynamicStateValidator(1e-6);
const result = validator.assertConservation(prevState, currState, boundary, 1.0);

console.log(`Is Thermodynamic State Valid? ${result.isValid}`);
```

---

## 3. Good First Issues & Extension Points

We welcome external contributors! If you are looking to dive into the codebase, here are structured "Good First Issues" and extension paths for building new monads and WebGL shaders.

### Good First Issue 1: Implement Custom Dynamic Tolerance Maps
- **Objective:** Extend `ThermodynamicStateValidator` to support dynamic, state-dependent tolerance scaling (e.g., scaling $\epsilon_i$ relative to the magnitude of $S_i(t)$ to handle numerical drift in deep-time paleo-simulations).
- **Files to touch:** `src/thermodynamics/state_validator.ts`, `tests/sprint_051.test.ts`
- **Estimated Effort:** 2–4 hours.

### Good First Issue 2: Adding a New Biogeochemical Monad
- **Objective:** Build a new nitrogen-fixation monad in `src/monads/nitrogen_monad.ts` that interacts with the thermodynamic state vector and passes conservation validation.
- **Extension Point:** Inherit from the base `MonadProcess` class, register elemental flux rates into `FluxBoundary.netFluxes`, and write a corresponding integration test.
- **Files to touch:** `src/monads/nitrogen_monad.ts`, `src/thermodynamics/monad_process.ts`
- **Estimated Effort:** 4–6 hours.

### Extension Point: Custom WebGL Shaders for Thermodynamic Visualization
- **Objective:** Bind thermodynamic validation violations to WebOfLife's WebGL rendering pipeline (`src/renderer/shaders/`) to visualize spatial energy dissipation and carbon flux anomalies in real-time.
- **Implementation Guide:**
  1. Add a uniform or attribute buffer in `src/renderer/shader_manager.ts` reflecting `ValidationResult.violations`.
  2. Write a fragment shader (`src/renderer/shaders/thermodynamic_heat.frag`) that color-codes Earth Pod surface cells based on entropy generation rates and conservation discrepancy thresholds.
  3. Test rendering performance using `npx tsx tests/renderer.test.ts`.

---

## 4. Community & Contribution Guidelines
1. Fork the repository on GitHub (`https://github.com/pascalranoroarijaona/WebOfLife`).
2. Create a feature branch (`git checkout -b feature/amazing-monad`).
3. Ensure all tests pass (`npx tsx tests/sprint_051.test.ts`).
4. Submit a Pull Request with a clear description of your thermodynamic or rendering enhancements!