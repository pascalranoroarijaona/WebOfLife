<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 20 Developer Relations & Open-Source Community Onboarding Guide

Welcome to the **WebOfLife** repository! (`https://github.com/pascalranoroarijaona/WebOfLife`). 

As a developer, researcher, or open-source contributor joining us in **Sprint 20**, you are stepping into a closed-loop spatial-metabolic simulation framework built with **TypeScript** and **Node.js**. This guide will help you get your local environment running, onboard you with the latest sprint features (specifically the 15-character H3 spatial index validation monad), and point you toward "Good First Issues" if you want to craft your own custom monads or WebGL shaders.

---

## 1. Getting Started & Local Environment Setup

Ensure you have **Node.js** (v18+ recommended) installed on your system. 

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install Dependencies:**
   > **CRITICAL NOTE:** This is a TypeScript/Node.js repository. Do **not** use `pip install` or `pytest`. 
   ```bash
   npm install
   ```

3. **Run the Sprint 20 Verification Tests:**
   We use `tsx` to execute TypeScript tests directly. Run the verification test suite for Sprint 20 via:
   ```bash
   npx tsx tests/sprint_020.test.ts
   ```

---

## 2. Sprint 20 Feature Highlights: H3 Spatial Validation

In Sprint 20, we introduced strict length validation for Uber's H3 spatial index format within `src/spatial/h3_grid.ts`. 

### The Core Validation Function
```ts
export function validateH3Length(h3Index: string): boolean {
  if (typeof h3Index !== 'string') return false;
  return h3Index.length === 15;
}
```

### The Spatial Validation Monad
For closed-loop thermodynamic tracking, inputs are wrapped inside monadic stock containers (`src/monads/spatial_monad.ts`):
```ts
import { executeSpatialValidationMonad } from '../spatial/h3_grid';

const stock = executeSpatialValidationMonad("8928308280fffff");
console.log(stock.isValids); // true
```

---

## 3. Good First Issues & Extension Points

We actively welcome community contributions! If you are looking to build out new features, here are two prime extension tracks:

### Track A: Building New Monads
If you want to construct a new functional monad (e.g., for trophic energy routing or metabolic gas exchange):
1. **Explore Existing Patterns:** Look at `src/spatial/h3_grid.ts` and `src/monads/spatial_monad.ts` to understand how pure, side-effect-free stock transfers are structured.
2. **Implement Conservation Laws:** Ensure your monad respects the First Law ($\Delta M = 0, \Delta E = 0$) or explicitly logs thermodynamic allocations.
3. **Write Tests:** Create a test file `tests/sprint_021.test.ts` (or relevant feature test) and execute using:
   ```bash
   npx tsx tests/sprint_021.test.ts
   ```

### Track B: Authoring New WebGL Shaders
For contributors interested in spatial visualization and biosphere rendering:
1. **Locate Shader Directories:** Check out rendering modules under `src/renderer/shaders/`.
2. **Integrate Spatial Uniforms:** Pass validated 15-character H3 indices or grid density uniforms into your vertex/fragment shaders.
3. **Performance Constraints:** Maintain frame-rate stability by keeping calculations lightweight on the GPU pipeline.

---

## 4. Submitting Your Contribution
1. Fork the repository on GitHub (`https://github.com/pascalranoroarijaona/WebOfLife`).
2. Create your feature branch (`git checkout -b feat/my-new-monad`).
3. Commit your changes and ensure all tests pass locally (`npx tsx tests/sprint_020.test.ts`).
4. Push to your fork and open a Pull Request against `main`.

Happy coding, and may your thermodynamic loops remain perfectly balanced!