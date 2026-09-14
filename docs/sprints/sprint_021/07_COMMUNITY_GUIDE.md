<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 21 Community & Contributor Onboarding Guide

Welcome to the **Web of Life** developer community! This guide will help you get up to speed with Sprint 21 features, specifically the implementation of the H3 resolution tier (0-15) boundary check function in `src/spatial/h3_grid.ts`, and show you how to contribute new monads or WebGL shaders.

## 🚀 Getting Started

Ensure you are working in a Node.js and TypeScript environment. 

### 1. Installation
Clone the repository and install dependencies using `npm`:
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### 2. Running Sprint 21 Tests
Verify your local environment by running the test suite for Sprint 21 using `npx tsx`:
```bash
npx tsx tests/sprint_021.test.ts
```

---

## 🛠️ Good First Issues & Extension Points

We welcome external contributors! If you are looking for ways to contribute, check out these two primary extension areas:

### 1. Building New Monads (`src/monads/`)
The Web of Life architecture relies heavily on monadic wrappers to manage state transitions while obeying thermodynamic conservation laws ($\Delta m = 0, \Delta E = 0$).

* **Where to look:** `src/monads/spatial_monad.ts`
* **How to build:** 
  1. Define your monad class holding state parameters (e.g., energy, biomass, or flux coordinates).
  2. Implement static bind functions that accept validation gates (similar to `IResolutionTierValidator`).
  3. Write unit tests ensuring thermodynamic invariance.
* **Good First Issue Idea:** Implement a `TemporalMonad` that validates time-step bounds $[0, 8760]$ (hours in a standard year) before passing ecological flux data.

### 2. Building New WebGL Shaders (`src/rendering/shaders/`)
To visualize spatial resolution tiers and trophic energy distribution across the planetary H3 grid, we use custom WebGL shaders.

* **Where to look:** `src/rendering/shaders/`
* **How to build:**
  1. Write GLSL vertex and fragment shaders that ingest H3 cell indices or resolution tier uniforms.
  2. Register your shader pipeline in the WebGL renderer manager.
  3. Ensure performance metrics remain within target frame rates for tier 0 through tier 15 rendering LODs.
* **Good First Issue Idea:** Create a fragment shader variant that visualizes resolution tier density gradients using a logarithmic color scale.

---

## 🧪 Testing Your Contributions

Never use `pytest` or `pip`. All testing in this repository is executed via TypeScript directly:
```bash
npx tsx tests/sprint_N.test.ts
```
Replace `N` with your sprint number (e.g., `sprint_021.test.ts`). Happy coding!