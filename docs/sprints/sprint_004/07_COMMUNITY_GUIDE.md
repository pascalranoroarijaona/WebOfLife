<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 004 Developer Onboarding & Contributor Guide

Welcome to **Sprint 004** of the *Web of Life* simulation engine! In this sprint, we establish the foundational geospatial partitioning engine utilizing Uber's H3 hierarchical hexagonal spatial index within `src/spatial/h3_grid.ts`. 

Whether you are building custom ecological monads or rendering real-time planetary WebGL shaders, this guide will orient you to our architecture, development workflow, and contribution guidelines.

---

## 1. Getting Started

Our backend codebase is written entirely in **TypeScript and Node.js**. We do not use Python (`pip` or `pytest`). 

### Installation & Environment Setup
Clone the repository and install dependencies using standard Node tooling:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Tests
We use native TypeScript execution via `tsx` for all our test suites. To execute the tests for Sprint 004:

```bash
npx tsx tests/sprint_004.test.ts
```

---

## 2. Architecture Overview: Spatial Monads & Thermodynamics

The *Web of Life* simulator enforces strict thermodynamic invariants:
1. **First Law of Thermodynamics:** Total biomass, carbon stocks, and energy across H3 cells must be strictly conserved during spatial indexing operations (`src/spatial/h3_grid.ts`).
2. **Second Law of Thermodynamics:** Transport between adjacent H3 cells incurs metabolic and computational dissipation costs managed via `src/spatial/h3_adjacency.ts`.

---

## 3. Contributor Pathways & "Good First Issues"

We are actively looking for external contributors to extend our monad ecosystem and WebGL rendering pipeline. Here are designated tasks designed to help you make your first contribution:

### Pathway A: Building New Custom Monads (`src/monads/`)
If you want to introduce new ecological or physical monads (e.g., Nitrogen Cycle Monad, Hydrological Flux Monad):
* **Good First Issue #401:** Implement a `NitrogenMonad` class extending `SpatialMonad<T>` that tracks soil nitrate and ammonium depletion across H3 cells.
* **Extension Point:** Inspect `src/monads/spatial_monad.ts`. Your new monad must wrap state updates inside monadic container functions to preserve side-effect isolation and adhere to mass-conservation laws.

### Pathway B: Building WebGL Shaders for Spatial Rendering (`src/shaders/`)
If you want to visualize H3 hexagonal grids and thermodynamic fluxes on the client side:
* **Good First Issue #402:** Create a WebGL fragment shader (`src/shaders/h3_thermal.frag.ts`) that maps second-law entropy generation ($\Delta S_{\text{entropy}}$) to a thermal color gradient (blue-to-red).
* **Extension Point:** Bind uniform arrays from `H3GridEngine` cell states directly into WebGL vertex attribute buffers for real-time GPU-accelerated ecological simulations.

---

## 4. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/sprint-004-your-feature-name`
2. Implement your changes in the appropriate directory (`src/spatial/`, `src/monads/`, or `src/shaders/`).
3. Add robust unit tests under `tests/`.
4. Run your test suite:
   ```bash
   npx tsx tests/sprint_004.test.ts
   ```
5. Open a Pull Request on [GitHub](https://github.com/pascalranoroarijaona/WebOfLife). Happy coding!