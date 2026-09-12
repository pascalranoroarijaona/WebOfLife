<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 46 Developer Onboarding & Contributor Guide

Welcome to the **Web of Life** repository! This guide provides a developer-focused overview of Sprint 46 features, how to set up your environment, run tests, and contribute new monads or WebGL shaders.

## 1. Quick Start & Setup

Ensure you have **Node.js** (v18+) and **npm** installed. Clone the repository and install dependencies:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Tests
All sprint validations and unit tests are executed using `tsx`:
```bash
npx tsx tests/sprint_046.test.ts
```

---

## 2. Sprint 46 Core Feature: Thermodynamic Entropy Guard

Sprint 46 introduces strict physical invariant enforcement in accordance with the Second Law of Thermodynamics ($\dot{S}_{\text{gen}} \ge 0$). 

- **Module:** `src/thermodynamics/state_validator.ts`
- **Key Function:** `validateOrThrowEntropy(state)`
- **Exception:** `ThermodynamicEntropyViolationError`

### Example Usage in Code
```ts
import { ThermodynamicStateVector } from './src/thermodynamics/state_vector';
import { validateOrThrowEntropy } from './src/thermodynamics/state_validator';

const state = new ThermodynamicStateVector(/* parameters */);
try {
  validateOrThrowEntropy(state);
} catch (error) {
  console.error("Second Law Violation detected:", error.message);
}
```

---

## 3. Good First Issues & Contributor Extension Points

We welcome community contributions! Here are two distinct paths for extending the Web of Life ecosystem:

### Path A: Building New Monads
If you want to introduce a new biogeochemical or energetic monad process (e.g., nitrogen fixation, sulfur cycling, or industrial catalysis):
1. Extend the `ThermodynamicMonadProcess` base class located in `src/thermodynamics/monad_process.ts`.
2. Implement your custom mass-balance stock transition logic within `transitionStocks(state)`.
3. Rely on the built-in inheritance hook to automatically invoke `validateOrThrowEntropy(nextState)`.
4. Add a corresponding test file under `tests/` (e.g., `tests/sprint_046_nitrogen.test.ts`) and execute via `npx tsx tests/sprint_046_nitrogen.test.ts`.

### Path B: Building WebGL Shaders for Thermodynamic Visualization
If you are interested in frontend rendering, simulation telemetry, or real-time thermal gradient mapping:
1. Locate the WebGL shader pipeline under `src/rendering/shaders/`.
2. Implement custom fragment or vertex shaders passing entropy generation rates ($\dot{S}_{\text{gen}}$) as uniforms to color-code ecosystem stability (e.g., glowing green for stable dissipation, flashing red for entropy violations).
3. Register your shader program in the main rendering loop and verify visual responsiveness against live monad state changes.