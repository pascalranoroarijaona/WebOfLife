<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 1 Contributor & Developer Relations Guide: Thermodynamic Architecture

Welcome to the **Web of Life** open-source community! In Sprint 1, we established the foundational thermodynamic core of the simulation engine (`src/thermodynamics/`). This guide is designed for developers, researchers, and systems architects who want to understand our thermodynamic contracts, contribute new monads, or build custom shaders.

---

## 🚀 Getting Started

Our simulation engine is written entirely in **TypeScript** and executed via **Node.js**. 

### 1. Installation & Environment Setup
Clone the repository and install dependencies using npm:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### 2. Running the Test Suite
We enforce strict thermodynamic laws via automated tests. Run the Sprint 1 test suite using `npx tsx`:

```bash
npx tsx tests/sprint_1.test.ts
```

---

## 🏛️ Architecture Overview: The Thermodynamic Core

All biotic and abiotic structures in the simulation inherit from the abstract base class `ThermodynamicStructure` (`src/thermodynamics/thermodynamic_structure.ts`). This ensures compliance with:
1. **The First Law of Conservation of Energy:** $\frac{dU}{dt} = \dot{Q}_{in} - \dot{W}_{out} + \sum \dot{m}_{in}h_{in} - \sum \dot{m}_{out}h_{out}$
2. **The Second Law of Thermodynamics:** Unidirectional entropy generation ($\dot{S}_{gen} \ge 0$) driven exclusively by the primary `SolarSource` monad stock.

---

## 🛠️ "Good First Issues" for External Contributors

Looking to make your first contribution? Here are two designated tasks for Sprint 1:

### 1. Implement a Custom Chemical Monad (`src/thermodynamics/monads/chemical_source.ts`)
- **Objective:** Create a new subclass extending `ThermodynamicStructure` that models exothermic chemical bond cleavage.
- **Requirements:** 
  - Implement `importFreeEnergy(joules, dt)` to capture chemical enthalpy input.
  - Implement `exportEntropy(entropyJoulesPerKelvin, dt)` for reaction waste dissipation.
  - Maintain far-from-equilibrium behavior in `maintainFarFromEquilibrium(dt)` while guaranteeing $\dot{S}_{gen} \ge 0$ via `validateSecondLaw()`.

### 2. Build a Thermodynamic WebGL Heat Dissipation Shader (`src/shaders/thermo_dissipation.frag`)
- **Objective:** Write a fragment shader that visually renders real-time exergy destruction ($\dot{\mathbf{X}}_{dest} = T_0 \dot{S}_{gen}$) across structural nodes.
- **Requirements:** Bind uniform inputs for `ambientTemperature` and `internalEntropyGenRate` to color-map thermal radiation gradients on canvas.

---

## 💡 Extension Points & Contribution Workflow

1. **Create a Feature Branch:** `git checkout -b feature/your-monad-name`
2. **Implement Your Code:** Follow strict TypeScript typings found in `src/thermodynamics/types.ts`.
3. **Verify Compliance:** Ensure all internal entropy generation rates pass `validateSecondLaw()`.
4. **Run Tests:** Execute `npx tsx tests/sprint_1.test.ts` to verify no regressions.
5. **Open a Pull Request:** Tag `@pascalranoroarijaona/core-maintainers` for review.

Happy coding, and maintain that far-from-equilibrium state!