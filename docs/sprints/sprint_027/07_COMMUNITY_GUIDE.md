<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 027 Community & Developer Onboarding Guide

Welcome to the **Web of Life** open-source community! This guide provides everything you need to know to get up to speed with **Sprint 027: Thermodynamic State Vector Baseline Structurer**, test your environment, and contribute new monads or WebGL shaders.

---

## 1. Getting Started in TypeScript & Node.js

Our codebase is fully written in **TypeScript** and runs on **Node.js**. We do not use Python or other runtimes for our core simulation pipeline.

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+)

### Installation & Setup
Clone the repository from [GitHub](https://github.com/pascalranoroarijaona/WebOfLife) and install dependencies:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Tests
We verify all sprint deliverables using `tsx`. Run the Sprint 027 test suite via:

```bash
npx tsx tests/sprint_027.test.ts
```

---

## 2. Sprint 027 Architecture Overview

Sprint 027 introduces `src/thermodynamics/state_vector.ts`, establishing the core thermodynamic state container for the Web of Life ecosystem. It enforces:
- **First Law of Thermodynamics:** Conservation of energy/matter across system boundaries.
- **Second Law of Thermodynamics:** Non-negative entropy generation ($dS_{gen} \ge 0$).
- **Baseline Ambient Temperature ($T_0$):** Defaults to $288.15\text{ K}$.

### Core Interfaces & Classes
- `FluxRecord`: Tracks shortwave solar radiation, thermal emission, latent heat, and sensible heat ($\text{W/m}^2$).
- `ThermodynamicStateVector`: An immutable record supporting `.clone(overrides)`, `.validateFirstLaw()`, and `.validateSecondLaw()`.
- `ThermodynamicMonadProcess`: Pure monad operations handling step-wise thermodynamic evolution and entropy generation.

---

## 3. Good First Issues & Contributor Extension Points

Want to contribute to the Web of Life? Here are targeted areas where external contributors can build new features:

### Good First Issue 1: Implementing a Custom Thermodynamic Monad
- **Goal:** Create a new custom monad under `src/thermodynamics/` that wraps biogeochemical cycles (e.g., Carbon or Nitrogen fixation) and couples them with the `ThermodynamicStateVector`.
- **Extension Point:** Implement `IThermodynamicMonad` interface leveraging `ThermodynamicMonadProcess.step(...)`.
- **Verification:** Write unit tests in `tests/sprint_027_custom_monad.test.ts` and run with `npx tsx tests/sprint_027_custom_monad.test.ts`.

### Good First Issue 2: WebGL Shaders for Thermal Radiative Flux Visualization
- **Goal:** Build a real-time WebGL fragment shader in `src/rendering/shaders/` to visualize spatial variations in surface temperature ($T$) and entropy production ($S_{gen}$).
- **Extension Point:** Bind `ThermodynamicStateVector` properties as uniform inputs to the WebGL rendering pipeline.
- **Verification:** Validate shader compilation and render output using the test harness.

---

## 4. Submitting Your Contribution
1. Fork the repository on [GitHub](https://github.com/pascalranoroarijaona/WebOfLife).
2. Create a feature branch (`git checkout -b feature/amazing-thermodynamic-monad`).
3. Commit your changes and ensure tests pass (`npx tsx tests/sprint_027.test.ts`).
4. Open a Pull Request against the `main` branch!

Happy coding, and welcome to modeling the biosphere!