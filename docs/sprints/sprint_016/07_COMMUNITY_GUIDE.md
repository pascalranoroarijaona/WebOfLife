<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 016 Developer Relations & Contributor Onboarding Guide

Welcome to the **Web of Life (`https://github.com/pascalranoroarijaona/WebOfLife`)** open-source repository! In Sprint 016, we solidify our spatial processing foundations by introducing strict 15-character Uber H3 spatial index validation. This guide walks you through setting up your environment, understanding the codebase architecture, and contributing new monads or WebGL shaders.

---

## 🚀 Quickstart & Environment Setup

This project uses **TypeScript** and **Node.js**. Ensure you have Node.js (v18+ recommended) installed on your system.

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Run the Sprint Tests:**
   Verify your environment and the new Sprint 016 validation logic by running:
   ```bash
   npx tsx tests/sprint_016.test.ts
   ```

---

## 🧬 Sprint 016 Core Feature: H3 Spatial Index Validation

Sprint 016 introduces `isValidH3Index(index: string): boolean` inside `src/spatial/h3_grid.ts`. This function acts as a biophysical semi-permeable membrane, preventing malformed spatial boundaries from injecting entropy into trophic energy loops.

### Example Usage:
```typescript
import { isValidH3Index, createSpatialMonad } from '../src/spatial/h3_grid';

// Validates true
console.log(isValidH3Index("8f283082801ffff")); 

// Safely initializes a spatial monad or throws a ThermodynamicViolation error
const podCell = createSpatialMonad("8f283082801ffff", 500.0);
```

---

## 🛠️ Good First Issues & Contributor Extension Points

Want to contribute to the Web of Life? Here are two primary paths for external contributors looking to expand the simulation architecture:

### 1. Building New Monads (`src/monads/`)
Monads encapsulate state transformations while preserving thermodynamic constraints (First and Second Laws). 
* **Extension Point:** Create a new file under `src/monads/` (e.g., `carbon_monad.ts`).
* **Requirements:** 
  - Ensure stock preservation ($\Delta M = 0$).
  - Guard state initializers using validation helpers similar to `isValidH3Index`.
  - Write corresponding unit tests under `tests/`.

### 2. Building New WebGL Shaders (`src/shaders/`)
To visualize biospheric feedback loops, trophic energy transfers, and spatial entropy spikes in real-time:
* **Extension Point:** Add custom GLSL shader programs in `src/shaders/`.
* **Integration:** Connect uniform variables to spatial monad metrics (such as `trophicEnergyStockJoules`).
* **Verification:** Test rendering pipelines locally using Node-based WebGL headless contexts or integration scripts.

---

## 🧪 Running Validation & Contributing Guidelines
- Always write robust unit tests for new features.
- Execute your test suites via:
  ```bash
  npx tsx tests/sprint_N.test.ts
  ```
- Open a Pull Request on GitHub against the main branch with a clear description of thermodynamic compliance and architectural impact.