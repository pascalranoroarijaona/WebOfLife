<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 003 Developer Onboarding & Community Contribution Guide

Welcome to **Web of Life** (`https://github.com/pascalranoroarijaona/WebOfLife`)! This guide provides everything you need to know to get up to speed with **Sprint 003**, which introduces the **Thermodynamic State Vector Interface** (`src/thermodynamics/types.ts`), enforcing strict first- and second-law thermodynamic invariants across all Earth system compartments.

---

## 🛠️ Quick Start & Environment Setup

Our codebase is built entirely on **TypeScript and Node.js**. 

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Run the Test Suite:**
   To execute the test runner for Sprint 3 (or any specific sprint test file), use `npx tsx`:
   ```bash
   npx tsx tests/sprint_003.test.ts
   ```

*(Note: Never use `pip install` or `pytest`; this is a native TypeScript/Node.js architecture.)*

---

## 🏗️ Core Architecture: Sprint 003 Summary

Sprint 003 codifies fundamental thermodynamic laws into strict contractual interfaces inside `src/thermodynamics/types.ts`:
- **First Law:** Conservation of Mass and Internal Energy ($U$) across boundary flux arrays (`BoundaryFluxArray`).
- **Second Law:** Explicit tracking of internal entropy generation rates ($\dot{S}_{\text{gen}} \ge 0$) and exergy destruction rates ($\dot{I} = T_0 \dot{S}_{\text{gen}}$) via `EntropyMetrics`.
- **State Vector Monads:** Pure state transition functions mapped through `ThermodynamicStateVector` and validated with `validateThermodynamicInvariants`.

---

## 🌱 Good First Issues for External Contributors

If you are looking to contribute to the Web of Life ecosystem, here are three starter tasks tailored for Sprint 003:

### 1. Implement Custom Monad Transformations (`src/thermodynamics/monads/`)
* **Objective:** Build a new pure functional monad wrapper that composes multiple `ThermodynamicTransitionFunction` steps (e.g., combining radiative heating and convective cooling).
* **Skills Required:** TypeScript generics, functional programming patterns.
* **Extension Point:** Create `src/thermodynamics/monads/composable_monads.ts` and add corresponding unit tests in `tests/sprint_003.test.ts`.

### 2. WebGL Heat Transfer Shader Integration (`src/graphics/shaders/`)
* **Objective:** Map the `BoundaryFluxArray` radiative and convective fluxes into a real-time WebGL fragment shader to visually render planetary thermal dissipation and exergy destruction gradients.
* **Skills Required:** TypeScript, GLSL / WebGL contexts.
* **Extension Point:** Hook into the state vector's temperature and entropy metrics to drive color palettes representing $\dot{S}_{\text{gen}}$ hotspots.

### 3. Edge-Case Invariant Guard Enhancements
* **Objective:** Expand `validateThermodynamicInvariants` to handle extreme boundary flux limits and volatile solar irradiance spikes without throwing unhandled exceptions.
* **Skills Required:** Error handling, numerical stability checks.

---

## 🤝 Contribution Workflow

1. Fork the repository on GitHub.
2. Create your feature branch (`git checkout -b feature/amazing-monad`).
3. Commit your changes (`git commit -m 'feat(thermo): add custom thermodynamic monad'`).
4. Push to the branch (`git push origin feature/amazing-monad`).
5. Open a Pull Request against `https://github.com/pascalranoroarijaona/WebOfLife`.

Happy coding, and welcome to the community!