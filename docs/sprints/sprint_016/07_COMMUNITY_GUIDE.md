<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 16 Contributor & Developer Relations Guide

Welcome to **Web of Life**! In Sprint 16, we introduced the **Thermodynamic State Vector Interface** (`src/thermodynamics/types.ts`) and nonequilibrium energy equations. This guide is designed to help new contributors onboard quickly, understand our strict thermodynamic invariants, and find "Good First Issues" to start contributing to our TypeScript and Node.js codebase.

---

## 1. Getting Started

Before diving into code, make sure your environment is properly set up. **Never** use `pip install` or `pytest`; this is a pure TypeScript and Node.js repository.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the test suite:**
   To run tests for the current sprint or general test suites, use `npx tsx`:
   ```bash
   npx tsx tests/sprint_16.test.ts
   ```

---

## 2. Core Architecture: Thermodynamics & Monad Transitions

Sprint 16 enforces strict First and Second Laws of Thermodynamics across all biogeochemical cycles (carbon, nitrogen, phosphorus, water):
- **First Law:** Conservation of energy, where all external energy input must originate solely from solar radiation (`radiationFlux.solarIncoming`).
- **Second Law:** Internal entropy generation ($\dot{S}_{\text{gen}} \ge 0$) under all non-equilibrium conditions.
- **Exergy Destruction:** Quantified via the Gouy-Stodola theorem: $\dot{I} = T_0 \dot{S}_{\text{gen}}$, with an ambient reference temperature $T_0 = 288.15\text{ K}$.

State transitions are wrapped in the `ThermodynamicStateMonad` (`src/thermodynamics/thermodynamic_monad_process.ts`), which automatically rejects negative entropy generation or inconsistent exergy destruction rates at runtime.

---

## 3. Good First Issues for External Contributors

If you are looking for a place to start contributing, check out these curated "Good First Issues":

### Issue 1: Add Radiative Feedback Sub-Monad
* **Description:** Implement a specialized wrapper function that adjusts terrestrial longwave radiation based on atmospheric greenhouse gas concentrations while preserving the `ThermodynamicStateMonad` invariant checks.
* **Target File:** `src/thermodynamics/feedback_monads.ts`
* **Skills Needed:** TypeScript, basic heat transfer equations.

### Issue 2: Boundary Flux Serialization Utilities
* **Description:** Write helper functions to serialize and deserialize `BoundaryFluxVector` and `ThermodynamicStateVector` maps to JSON for telemetry logging and UI visualization dashboards.
* **Target File:** `src/thermodynamics/serialization.ts`
* **Skills Needed:** TypeScript, JSON handling.

### Issue 3: Unit Tests for Extreme Thermal Gradients
* **Description:** Expand `tests/sprint_16.test.ts` to include edge cases such as zero absolute temperature inputs, extremely high solar fluxes, and sudden boundary mass flow disruptions.
* **Target File:** `tests/sprint_16.test.ts`
* **Skills Needed:** TypeScript, testing assertions (`npx tsx tests/sprint_16.test.ts`).

---

## 4. Extension Points: Building New Monads & Shaders

### 4.1 Creating a Custom Thermodynamic Monad
To create a new biogeochemical or physical monad that plugs into the planetary simulation:
1. Import `ThermodynamicStateVector`, `BoundaryFluxVector`, and `ThermodynamicStateMonad`.
2. Define a pure process function adhering to the `executeThermodynamicStep` signature.
3. Wrap transitions using `.transit(...)` to automatically validate entropy generation and exergy destruction constraints.

Example template:
```typescript
import { ThermodynamicStateMonad } from './thermodynamic_monad_process';
import { ThermodynamicStateVector, BoundaryFluxVector } from './types';

export function customBiogeochemicalProcess(
  state: ThermodynamicStateVector,
  fluxes: BoundaryFluxVector
): { nextState: ThermodynamicStateVector; nextFluxes: BoundaryFluxVector } {
  // Implement custom mass/energy transformations here
  return { nextState: state, nextFluxes: fluxes };
}
```

### 4.2 WebGL Shaders & Visualization Extension Points
If you are extending the WebGL visualization pipeline (`src/renderer/`):
- **Shader Uniforms:** Pass planetary exergy destruction rates ($\dot{I}$) and entropy generation metrics ($\dot{S}_{\text{gen}}$) as uniform variables to fragment shaders to render real-time thermodynamic dissipation heatmaps across the Earth Pod surface.
- **Node.js Integration:** Ensure any shader parameter calculations are driven by state vectors extracted from `IThermodynamicSystem` implementations.

---

## 5. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/my-new-monad`
2. Run your tests: `npx tsx tests/sprint_16.test.ts`
3. Push your branch and open a Pull Request against `main` on GitHub:
   `https://github.com/pascalranoroarijaona/WebOfLife`

Happy coding, and welcome to the Web of Life community!