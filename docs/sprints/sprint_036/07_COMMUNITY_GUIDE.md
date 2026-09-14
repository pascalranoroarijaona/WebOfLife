<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 036 Community Contributor Guide: Spatial Monads & Boundary Validation

Welcome, developers and open-source contributors, to the **Web of Life** repository! This guide provides a developer-focused onboarding walkthrough for **Sprint 036**, highlighting our new spatial string length validation helper, and outlining clear pathways for building custom monads and WebGL shaders.

---

## 🚀 Getting Started

Ensure you are working in our TypeScript and Node.js environment. Do **not** use Python tooling (`pip` or `pytest`).

### 1. Installation
Clone the repository and install dependencies using npm:
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### 2. Running the Test Suite
Verify your environment and execute Sprint 036 tests via:
```bash
npx tsx tests/sprint_036.test.ts
```

---

## 🧬 Sprint 036 Feature Spotlight: H3 String Boundary Validation

In Sprint 036, we introduced a side-effect-free validation helper in `src/spatial/h3_grid.ts` to secure spatial monad pipelines against malformed H3 index string injections.

### Usage Example
```typescript
import { validateH3StringLength } from './src/spatial/h3_grid';

const { isValidLength, isWithinBounds } = validateH3StringLength("8928308280fffff", 1, 15);

if (isWithinBounds) {
  console.log("Spatial token verified and admitted into the SpatialMonad pipeline.");
}
```

---

## 🛠️ Good First Issues & Extension Points

We actively welcome contributions from the community! If you are looking to cut your teeth on the codebase, here are two prime extension tracks:

### Track A: Building Custom Monads
We follow strict thermodynamic accounting (First & Second Laws) within our monad structures (e.g., `src/monads/spatial_monad.ts`). 

* **Good First Issue / Extension Point:** Implement a new `TrophicMonad` in `src/monads/trophic_monad.ts` that tracks energy transformation efficiency without throwing exceptions on boundary violations.
* **Requirements:**
  * Must be written in TypeScript.
  * Return explicit boolean/status result records rather than throwing errors (minimizing computational entropy).
  * Include a dedicated test file under `tests/`. Run tests using `npx tsx tests/your_new_test.test.ts`.

### Track B: Writing WebGL Shaders for Spatial Visualization
Our rendering pipeline bridges spatial stocks with visual feedback loops.

* **Good First Issue / Extension Point:** Contribute a new WebGL fragment shader under `src/shaders/` to render H3 density gradients or thermodynamic heat flux.
* **Requirements:**
  * Keep shaders performant ($O(1)$ per fragment).
  * Integrate shader compilation wrappers with our existing rendering pipeline in `src/renderer/`.
  * Verify visual logic and unit behaviors via our TypeScript test harness (`npx tsx`).