<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 014 Contributor Guide: Spatial Ingress Guard Clauses & Thermodynamic Entropy Reduction

Welcome to **Web of Life** (`https://github.com/pascalranoroarijaona/WebOfLife`)! 

In Sprint 014, we focused on hardening the spatial subsystem (`src/spatial/h3_grid.ts`) and the `SpatialMonad` (`src/monads/spatial_monad.ts`) by introducing strict null-check and type guard clauses for incoming H3 string payloads. This guide outlines how to get up to speed with these changes, test your code, and find "Good First Issues" if you want to contribute new monads or WebGL shaders.

---

## 1. Getting Started & Setup

Make sure you have **Node.js** and **npm** installed on your system. 

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
   We use `tsx` to run our TypeScript test suite directly. To run the tests for Sprint 014, execute:
   ```bash
   npx tsx tests/sprint_014.test.ts
   ```

---

## 2. Sprint 014 Architectural Overview

Unvalidated spatial strings (`null`, `undefined`, `""`, or non-string primitives) can propagate undefined states through trophic and ecological simulations, increasing informational entropy and causing runtime faults.

### Key Additions:
- **`guardH3Payload(payload: unknown)`**: Located in `src/spatial/h3_grid.ts`. Asserts that incoming payloads are valid non-empty strings before they touch lookup or indexing methods.
- **`validateH3Index(payload: unknown)`**: Returns an `H3ValidationResult` object containing validation status and error messages.
- **`SpatialMonad.fromPayload(payload)`**: Intercepts raw inputs at the ingress boundary and binds them safely or throws a `TypeError`.

---

## 3. Good First Issues & Extension Points

Are you an external contributor looking to build out new features? Here are two primary extension tracks:

### Track A: Building New Monads (`src/monads/`)
We use functional monads to manage ecological stocks (carbon, water, energy) and spatial states safely.
- **Extension Point:** Create a new custom monad in `src/monads/` (e.g., `TrophicMonad` or `EnergyMonad`).
- **Contributor Task ("Good First Issue"):** 
  1. Implement a static factory method (similar to `SpatialMonad.fromPayload`) that enforces strict null and type checks on incoming ecological telemetry.
  2. Write unit tests under a new file `tests/sprint_014_monads.test.ts` verifying that null/undefined values throw appropriate `TypeError` exceptions.
  3. Run your tests with:
     ```bash
     npx tsx tests/sprint_014_monads.test.ts
     ```

### Track B: Building WebGL Shaders (`src/rendering/` or visual subsystems)
To render high-density ecological and spatial simulations in real-time, we leverage WebGL shaders.
- **Extension Point:** Add custom fragment or vertex shaders under `src/rendering/shaders/` to visualize spatial entropy or nutrient fluxes.
- **Contributor Task ("Good First Issue"):**
  1. Write a WebGL shader that takes validated H3 spatial indices and color-codes hexagonal cells based on entropy or matter conservation metrics.
  2. Ensure all shader uniform inputs validate their boundary types to prevent GPU pipeline crashes.

---

## 4. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/my-new-monad`
2. Commit your changes following our conventional commit guidelines.
3. Run the full test suite to ensure no regressions occur.
4. Push to your fork and open a Pull Request on GitHub!