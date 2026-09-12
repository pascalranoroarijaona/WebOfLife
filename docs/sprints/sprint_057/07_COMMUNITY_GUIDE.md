<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 057 Community & Contributor Onboarding Guide

Welcome to the **Web of Life** developer community! This guide is designed to help you onboard quickly to the latest features introduced in **Sprint 057**: the *Thermodynamic State Vector Stock Conservation Delta Calculator* (`src/thermodynamics/state_validator.ts`).

Whether you are looking to build custom thermodynamic monads or extend our WebGL ecological shaders, this document provides everything you need to set up your environment, write tests, and contribute back to the repository at [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife).

---

## 1. Quickstart & Environment Setup

We use **TypeScript** and **Node.js** for all core simulation engines, validators, and tests. 

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+)

### Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running the Test Suite
We use `tsx` to execute TypeScript test files directly without manual compilation steps. To run the Sprint 057 validation tests:

```bash
npx tsx tests/sprint_057.test.ts
```

---

## 2. Architecture Overview: Sprint 057 (`StateValidator`)

Sprint 057 introduces strict thermodynamic bookkeeping into the simulation pod. The `StateValidator` component (`src/thermodynamics/state_validator.ts`) enforces:
1. **First Law of Thermodynamics (Mass Conservation):** $\Delta S_i = \left( \sum \text{Inflows}_i - \sum \text{Outflows}_i \right) \cdot \Delta t$
2. **Second Law of Thermodynamics (Entropy & Dissipation):** Bounded energy transformations and unidirectional solar flux.

```
+----------------------------+
|   ThermodynamicStructure   |
+----------------------------+
              ^
              | extends / composes
+----------------------------+
|      StateVector           |
+----------------------------+
              ^
              | validates against
+----------------------------+
|      StateValidator        | (`src/thermodynamics/state_validator.ts`)
+----------------------------+
```

---

## 3. Good First Issues & Extension Points for Contributors

If you want to contribute to the Web of Life ecosystem, here are two primary pathways open for external pull requests:

### Extension Point A: Building Custom Thermodynamic Monads
You can create new biogeochemical or physical monad processes by extending `ThermodynamicMonadProcess`. 
- **Goal:** Implement a new carbon sequestration or nitrogen fixation sub-cycle.
- **File Location:** `src/thermodynamics/monads/`
- **Good First Issue Task:** 
  1. Create a new file `src/thermodynamics/monads/nitrogen_monad.ts`.
  2. Implement flux rate calculations that plug directly into `StateValidator`.
  3. Write a corresponding test in `tests/sprints/` ensuring mass conservation under floating-point tolerances ($\epsilon \le 10^{-6}$).

### Extension Point B: WebGL Ecological Shaders
To visualize thermodynamic states (such as thermal dissipation $Q$ or carbon stock density across the Earth pod surface):
- **Goal:** Write custom fragment shaders rendering real-time energy flux heatmaps.
- **File Location:** `src/renderer/shaders/`
- **Good First Issue Task:**
  1. Add a uniform binding in `src/renderer/shader_manager.ts` for dynamic stock deltas.
  2. Create a GLSL fragment shader displaying thermal dissipation gradients.

---

## 4. Contributing Guidelines

1. **Branching:** Create a feature branch from `main` (`git checkout -b feature/my-new-monad`).
2. **Type Safety:** Ensure strict TypeScript compliance (`noImplicitAny`).
3. **Testing:** Always include a dedicated test file using `tsx` (e.g., `tests/sprint_058.test.ts`).
4. **Pull Request:** Submit your PR with a clear description referencing the relevant thermodynamic laws and test coverage.

Happy coding, and welcome to the Web of Life community!