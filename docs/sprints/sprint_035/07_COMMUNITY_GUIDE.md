<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 35 Contributor Onboarding: Thermodynamic State Validation & Second Law Enforcement

Welcome to the **Web of Life** developer community! In Sprint 35, we introduce rigorous thermodynamic constraints to the simulation engine via `src/thermodynamics/state_validator.ts`. This guide walks you through setting up your environment, understanding our TypeScript/Node.js stack, and contributing new monads or WebGL shaders.

---

## 🛠️ Quick Start & Environment Setup

We use **TypeScript** and **Node.js** exclusively across the Web of Life repository (`https://github.com/pascalranoroarijaona/WebOfLife`). 

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install dependencies:**
   *(Note: Never use `pip install` or Python tools; our core engine and test runner are entirely TypeScript/Node-based).*
   ```bash
   npm install
   ```

3. **Run the Sprint 35 test suite:**
   Verify your setup by executing the new thermodynamic validation tests:
   ```bash
   npx tsx tests/sprint_035.test.ts
   ```

---

## 🔬 Core Concepts: Sprint 35 Features

Sprint 35 enforces the **Second Law of Thermodynamics** across all EarthPod bio-geochemical transitions:
- **System Entropy ($S \ge 0$):** Absolute configurational and thermal entropy cannot drop below zero.
- **Entropy Generation Rate ($\sigma \ge 0$):** Rate of entropy production $\frac{dS_{\text{gen}}}{dt}$ must remain non-negative for all irreversible processes.
- **Monadic Error Handling:** We use `neverthrow` (`Result`, `ok`, `err`) to pipe state transitions cleanly without unexpected runtime exceptions, throwing `ThermodynamicEntropyViolationError` only when physical bounds are breached.

---

## 🚀 Good First Issues & Extension Points

Want to contribute to the WebOfLife engine? Here are two primary pathways for external contributors:

### 1. Building New Monads (`src/monads/` or `src/thermodynamics/`)
If you want to implement a new biogeochemical process (e.g., nitrogen fixation or deep-sea hydrothermal vent dissipation):
* **Step 1:** Define your state transition function taking a `ThermodynamicState`.
* **Step 2:** Wrap your output state inside `StateValidator.assertNonNegativeEntropy(newState)` to automatically guard against Second Law violations.
* **Step 3:** Return a `Result<ThermodynamicState, ThermodynamicEntropyViolationError>`.
* **Good First Issue Idea:** Implement a `PhotosyntheticEfficiencyMonad` that calculates solar energy conversion into biomass while tracking waste heat dissipation.

### 2. Building New WebGL Shaders (`src/shaders/` or `src/renderer/`)
To visualize thermodynamic states (such as thermal gradients or entropy generation fields across EarthPod grids):
* **Step 1:** Create a GLSL fragment shader in `src/shaders/thermodynamics.frag`.
* **Step 2:** Bind the `ThermodynamicState` uniforms (temperature $T$, entropy $S$, entropy generation rate $\sigma$).
* **Step 3:** Map entropy density to color scales (e.g., blue for low dissipation, fiery red/yellow for high entropy generation rates $\sigma$).
* **Good First Issue Idea:** Build an interactive WebGL heat-map shader that visualizes local $\sigma(x, y)$ fields over the global carbon-water stock grid.

---

## 🧪 Testing Guidelines
When submitting a Pull Request:
1. Write unit tests inside a dedicated file: `tests/sprint_N.test.ts`.
2. Execute your tests with:
   ```bash
   npx tsx tests/sprint_N.test.ts
   ```
3. Ensure 100% type safety (`npm run build` or `npx tsc --noEmit`) before opening your PR.

Happy coding, and may your entropy generation rates remain strictly positive!