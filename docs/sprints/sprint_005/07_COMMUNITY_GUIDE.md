<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 005 Developer Onboarding & Contributor Guide

Welcome to the **WebOfLife** repository! Sprint 005 introduces explicit Biogeochemical CyclePOD instances (`CarbonCyclePOD`, `WaterCyclePOD`, `NitrogenCyclePOD`, and `PhosphorusCyclePOD`) operating under strict thermodynamic constraints (mass conservation and solar-driven energetic flux).

This guide is designed for developers, researchers, and open-source contributors looking to understand our TypeScript/Node.js architecture, write custom monads, or build WebGL shaders to visualize planetary cycles.

---

## 1. Getting Started

Our codebase is written entirely in **TypeScript** and executed via **Node.js**. We do not use Python (`pip` or `pytest`). Ensure you have Node.js (v18+) installed.

### Installation & Test Execution
Clone the repository and install dependencies using npm:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

To run the verification test suite for Sprint 005, execute:

```bash
npx tsx tests/sprint_005.test.ts
```

---

## 2. Architecture Overview: CyclePODs & Monadic State

Every biogeochemical cycle inherits from the abstract `CyclePOD` class located in `src/cycles/` (e.g., `src/cycles/carbon.ts`). 

### Core Contract
1. **Mass Conservation ($\sum \Delta \text{stocks} = 0$)**: All transfer functions must ensure that elements lost from one reservoir are identically gained by another within a floating-point epsilon ($\epsilon < 10^{-12}$).
2. **Thermodynamic State Wrapping**: State transitions return a `ThermodynamicState<T>` wrapper tracking value updates, energy consumed, and entropy generated.

---

## 3. Good First Issues & Extension Points

Want to contribute? Here are prime areas for new contributors to build custom monads or WebGL shaders.

### 3.1 Extension Point A: Building a New Monad (`src/monads/`)
Currently, state updates leverage simple immutable wrappers. You can build an advanced **Thermodynamic State Monad** (`src/monads/thermodynamic_monad.ts`) that chains mass-balance validations and automatically accumulates system entropy.

**Good First Issue Blueprint:**
1. Create `src/monads/thermodynamic_monad.ts`.
2. Implement a generic `ThermodynamicMonad<T>` class with `.map()`, `.flatMap()`, and `.assertConservation()` methods.
3. Refactor one of the existing cycle pods (e.g., `src/cycles/phosphorus.ts`) to use your monadic wrapper.
4. Add unit tests verifying monad composition laws.

### 3.2 Extension Point B: Writing Custom WebGL Shaders (`src/shaders/`)
To visualize biogeochemical fluxes (e.g., atmospheric $CO_2$ plumes or oceanic currents) in real-time, we are expanding our WebGL rendering pipeline.

**Good First Issue Blueprint:**
1. Navigate to `src/shaders/` and create `carbon_flux.frag` and `water_vapor.vert`.
2. Write a fragment shader that maps `CarbonCyclePOD` reservoir concentrations to RGB color gradients (e.g., high biosphere density = deep green, high atmospheric $CO_2$ = infrared red shift).
3. Bind the shader uniforms to the `EarthPod` tick loop in `src/earth_pod.ts`.

---

## 4. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/my-new-monad`
2. Run the test suite: `npx tsx tests/sprint_005.test.ts`
3. Push to GitHub and open a Pull Request against `https://github.com/pascalranoroarijaona/WebOfLife`.