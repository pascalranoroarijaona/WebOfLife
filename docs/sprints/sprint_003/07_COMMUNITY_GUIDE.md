<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 003 Developer Onboarding & Contributor Guide

Welcome to **Web of Life**, an open-source, mathematically rigorous simulation engine built in TypeScript and Node.js. This guide provides everything you need to get up to speed with **Sprint 003**, which introduces base H3 grid parsing, strict index validation routines, and the `SpatialMonad` for binding ecological matter stocks to hexagonal geospatial coordinates.

---

## 1. Quick Start & Development Environment Setup

Web of Life runs on **Node.js** and **TypeScript**. 

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the Sprint 003 Test Suite:**
   Verify your local environment and test the new H3 grid parsing and validation engine by running:
   ```bash
   npx tsx tests/sprint_003.test.ts
   ```

---

## 2. Sprint 003 Core Architecture: H3 Grid & Spatial Monad

Sprint 003 implements foundational spatial discretization using Uber's H3 hierarchical hexagonal geospatial indexing system. 

### Key Modules Added:
* **`src/spatial/h3_grid.ts`**: Houses the `H3GridParser` class, responsible for string-to-index parsing, latitude/longitude conversion (`fromGeo`), and bit-level index validation (`validateIndex`).
* **`src/monads/spatial_monad.ts`**: Houses the `SpatialMonad` class, providing a pure, side-effect-free monadic wrapper that binds thermodynamic matter and energy stocks (`ThermodynamicStock`) to validated H3 indexes without violating mass-balance invariants ($\Delta M = 0$).

---

## 3. Good First Issues for External Contributors

We welcome contributions from the open-source community! If you are looking for ways to get involved with the spatial indexing engine, consider picking up one of these **Good First Issues**:

### Issue 301: Implement Resolution Boundary Checks for Resolution 0 Cells
* **Description:** Extend `H3GridParser.validateIndex` in `src/spatial/h3_grid.ts` to log specific warning error codes when base cells at resolution 0 encounter pentagon distortion constraints.
* **Skill Level:** Beginner
* **Estimated Time:** 1–2 hours
* **Files to touch:** `src/spatial/h3_grid.ts`, `tests/sprint_003.test.ts`

### Issue 302: Add GeoJSON Feature Export to `SpatialMonad`
* **Description:** Implement an export method `toGeoJSONFeature(): object` on the `SpatialMonad` class that transforms the internal H3 index and its bound `ThermodynamicStock` into a standard GeoJSON Polygon feature.
* **Skill Level:** Intermediate
* **Estimated Time:** 3–4 hours
* **Files to touch:** `src/monads/spatial_monad.ts`

---

## 4. Extension Points: Building New Monads & WebOfLife Shaders

Web of Life is architected for modular extension. Here is how you can contribute new monadic structures or spatial visualization shaders:

### 4.1 Building Custom Monads
If you want to track non-thermal or specialized ecological workflows (e.g., nitrogen cycles, acoustic entropy), you can build custom monads following the `SpatialMonad` pattern:
1. Ensure your monad maintains pure functional transformations.
2. Respect the First and Second Thermodynamic Laws: informational wrappers must never synthesize physical mass or unmetered energy.
3. Accept validated H3 indexes from `H3GridParser`.

### 4.2 Building WebGL Shaders for Spatial Rendering
To render H3 hex grids and thermodynamic stocks efficiently in the Web of Life visualization pipeline:
1. Locate or create shader pipelines under `src/shaders/`.
2. Pass normalized H3 index attributes as uniform or vertex attributes to your WebGL shaders.
3. Keep color mapping proportional to thermodynamic energy density ($\text{Joules} / \text{cell}$), maintaining strict adherence to biospheric energy conservation laws.

---

## 5. Submitting Pull Requests

1. Fork the repository on GitHub (`https://github.com/pascalranoroarijaona/WebOfLife`).
2. Create your feature branch (`git checkout -b feature/amazing-spatial-feature`).
3. Commit your changes with clear, descriptive commit messages.
4. Run the test suite: `npx tsx tests/sprint_003.test.ts`.
5. Open a Pull Request against the `main` branch. 

Happy coding, and welcome to the Web of Life community!