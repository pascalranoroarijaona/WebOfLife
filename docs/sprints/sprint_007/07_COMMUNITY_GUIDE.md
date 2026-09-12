<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 007 Contributor Guide: Biogeochemical CyclePODs

Welcome to the **Web of Life** contributor community! In Sprint 007, we establish the concrete biogeochemical cycle infrastructure (`src/cycles/`) governing mass-conservative transfer dynamics for Carbon, Water, Nitrogen, and Phosphorus. 

This guide outlines how to set up your environment, run the test suite using **TypeScript and Node.js**, and identify **Good First Issues** for building custom monads or WebGL shaders.

---

## 1. Environment Setup & Testing Quickstart

Ensure you have **Node.js (v18+ recommended)** installed on your system. We do not use Python (`pip` or `pytest`); all simulation engines, thermodynamic validations, and test suites run natively in TypeScript.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the Sprint 007 test suite:**
   ```bash
   npx tsx tests/sprint_007.test.ts
   ```

---

## 2. Good First Issues: Extending CyclePODs & Monads

Are you looking to make your first contribution? We have outlined several targeted expansion tasks that allow external developers to implement new planetary cycles or custom monadic validation wrappers.

### Issue 07-A: Implement the Sulfur Cycle (`src/cycles/sulfur.ts`)
* **Difficulty:** Beginner / Intermediate
* **Objective:** Extend `BaseCycle` to implement a 4-reservoir Sulfur cycle tracking `atmospheric_so2`, `soil_sulfate`, `ocean_sulfate`, and `lithospheric_pyrite`.
* **Extension Points:**
  * Create `src/cycles/sulfur.ts` inheriting from `BaseCycle`.
  * Define transfer coefficients for volcanic outgassing, atmospheric oxidation, biological assimilation, and sedimentation.
  * Register the new cycle in the global `EarthPod` composition pipeline.

### Issue 07-B: Monadic Validation Wrapper (`src/monads/cycle_validation.ts`)
* **Difficulty:** Intermediate
* **Objective:** Wrap cycle transfer steps inside a custom Result/State Monad to explicitly capture thermodynamic error margins and log conservation failures without throwing runtime exceptions.
* **Extension Points:**
  * Implement `map()` and `flatMap()` primitives over reservoir state vectors.
  * Ensure strict First Law mass conservation tracking via monadic pipelines.

---

## 3. WebGL Shader Integration for Cycle Visualization

If you are interested in GPU-accelerated graphics and fragment shaders, Sprint 007 offers hooks to visualize planetary stocks (e.g., carbon plume dispersion or water vapor flux) via WebGL.

### Good First Issue 07-C: Biogeochemical Fragment Shaders (`src/shaders/cycles.frag`)
* **Difficulty:** Intermediate
* **Objective:** Build a GLSL fragment shader that reads uniform textures representing planetary stock densities (`atmosphere`, `ocean`, `biosphere`) and renders real-time color gradients representing global flux saturation.
* **Extension Points:**
  * Inject uniform bindings from `BaseCycle` reservoir states into the WebGL rendering loop.
  * Use solar irradiance inputs (`I_solar`) to dynamically alter atmospheric scattering parameters in the fragment shader.

---

## 4. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/sulfur-cycle-pod`
2. Implement your module and add corresponding unit tests under `tests/`.
3. Verify all tests pass locally:
   ```bash
   npx tsx tests/sprint_007.test.ts
   ```
4. Open a Pull Request on [GitHub](https://github.com/pascalranoroarijaona/WebOfLife). Happy coding!