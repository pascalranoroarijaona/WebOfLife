<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 036 Community Onboarding & Contributor Guide: Thermodynamic State Vector Non-Negative Entropy Assertion

Welcome to the **Web of Life** (`https://github.com/pascalranoroarijaona/WebOfLife`) open-source developer community! In Sprint 036, we introduce critical physical constraints to the simulation engine: **Thermodynamic State Vector Non-Negative Entropy Assertions** (`src/thermodynamics/state_validator.ts`). This guide will help you get set up, understand the new architecture, and contribute your own monads or WebGL shaders.

---

## 1. Quick Start & Environment Setup

The Web of Life repository uses **TypeScript** and **Node.js**. We do not use Python or other runtimes for our backend core.

### Prerequisites
- **Node.js** (v18+ recommended)
- **npm** (comes bundled with Node)

### Installation & Test Execution
Clone the repository and run the setup commands in your terminal:

```bash
# Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install dependencies using npm (CRITICAL: Never use pip install)
npm install

# Run the test suite for Sprint 036
npx tsx tests/sprint_036.test.ts
```

---

## 2. Sprint 036 Architecture Overview

Sprint 036 enforces the **Second Law of Thermodynamics** across all ecological and biogeochemical monad processes. 

- **`src/thermodynamics/state_validator.ts`**: Contains `StateValidator` which checks $S \ge 0$ and $\dot{S}_{\text{gen}} \ge 0$.
- **`src/thermodynamics/thermodynamic_monad_process.ts`**: Intercepts state transitions to ensure laws are not violated during execution.
- **`src/thermodynamics/state_vector.ts`**: Manages the internal energy, matter pools ($C, W, N, P$), and entropy stocks.

If any monad process attempts to create free energy or decrease entropy illegally within an isolated boundary, `StateValidator.assertNonNegativeEntropy(state)` throws a `ThermodynamicConstraintViolationError`.

---

## 3. Good First Issues for External Contributors

Looking to make your first contribution? Here are two designated "Good First Issues" aligned with Sprint 036:

### Issue A: Implement a Custom Dissipative Heat Monad (`Good First Issue`)
- **Objective:** Create a new monad under `src/thermodynamics/monads/dissipative_heat.ts` that simulates radiative heat loss from an ecosystem component, increasing $\dot{S}_{\text{gen}}$ while maintaining total energy balance.
- **Acceptance Criteria:** Must pass `StateValidator.validateEntropy()` and include a unit test in `tests/sprint_036.test.ts`.

### Issue B: Add Thermodynamic Telemetry to WebGL Shaders (`Good First Issue`)
- **Objective:** Expose entropy generation rates (`S_gen_dot`) as a uniform variable in the WebOfLife visualization shaders (`src/shaders/entropy_viz.frag`).
- **Acceptance Criteria:** Shaders must render color gradients reflecting local entropy density without dropping below 60 FPS.

---

## 4. How to Build New Monads & WebGL Shaders

### Building a New Monad
All simulation mechanics in Web of Life operate as functional monads. To build a custom monad:
1. Implement the `ThermodynamicState` interface.
2. Wrap your state transition logic with `StateValidator.assertNonNegativeEntropy(state)`.
3. Register your monad in `src/monads/registry.ts`.

Example:
```ts
import { ThermodynamicState, StateValidator } from '../thermodynamics/state_validator';

export class CustomMetabolicMonad {
  public run(state: ThermodynamicState): ThermodynamicState {
    // Perform transformation...
    StateValidator.assertNonNegativeEntropy(state);
    return state;
  }
}
```

### Building a WebGL Shader
Visualizations are rendered via WebGL. Place new GLSL shaders in `src/shaders/` and bind them through our TypeScript rendering pipeline:
```typescript
// Example shader binding
const program = gl.createProgram();
// Attach vertex and fragment shaders, compile, and link
```

---

## 5. Submitting Your Contribution
1. Fork the repository on GitHub (`https://github.com/pascalranoroarijaona/WebOfLife`).
2. Create a feature branch (`git checkout -b feature/amazing-monad`).
3. Commit your changes (`git commit -m 'feat: add amazing thermodynamic monad'`).
4. Push to your branch (`git push origin feature/amazing-monad`).
5. Open a Pull Request and verify all tests pass via `npx tsx tests/sprint_036.test.ts`.

Happy coding and conserving entropy!