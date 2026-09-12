<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 069: Contributor Onboarding & Community Guide

Welcome to the **Web of Life** repository (`https://github.com/pascalranoroarijaona/WebOfLife`)! This guide is designed for external contributors, developers, and researchers looking to understand our latest architectural enhancements in Sprint 069—specifically focusing on thermodynamic state vector validation, absolute discrepancy math functions, and how you can build custom monads or WebGL shaders.

---

## 1. Quick Start & Environment Setup

The Web of Life engine is built entirely with **TypeScript** and **Node.js**. Ensure you have Node.js installed (v18+ recommended).

### Installation
Clone the repository and install dependencies using npm:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Tests
We validate all simulation mechanics and thermodynamic laws using `tsx`. To execute the test suite for Sprint 069, run:

```bash
npx tsx tests/sprint_069.test.ts
```

---

## 2. Sprint 069 Feature Overview: Thermodynamic State Validation

In Sprint 069, we introduced `computeAbsoluteStockDelta(actual, expected)` located in `src/thermodynamics/state_validator.ts`. 

### Why It Matters
To maintain rigorous simulation fidelity, the Web of Life adheres strictly to thermodynamic laws:
1. **First Law (Conservation):** Matter and energy cannot be created or destroyed.
2. **Second Law (Entropy & Degradation):** Tracking biogeochemical divergence over time.

The new helper function computes pure absolute numerical discrepancies across elemental and energy keys (`C`, `N`, `P`, `H2O`, energy units) between actual and expected state vectors without side effects.

### Example Usage
```typescript
import { computeAbsoluteStockDelta } from './src/thermodynamics/state_validator';
import { StateVector } from './src/thermodynamics/state_vector';

const actualState = new StateVector({ carbon: 100, water: 500 });
const expectedState = { carbon: 95, water: 500, nitrogen: 10 };

const deltas = computeAbsoluteStockDelta(actualState, expectedState);
console.log(deltas); 
// Output: { carbon: 5, water: 0, nitrogen: 10 }
```

---

## 3. Good First Issues & Extension Points

We welcome community contributions! Here are two distinct paths to extend the Web of Life engine:

### Path A: Building a New Monad
The Web of Life relies on immutable monad pipelines (`src/thermodynamics/monad_process.ts`) to wrap ecological state transitions. 

* **Good First Issue / Extension Idea:** Implement a `StochasticDecayMonad` that applies random environmental degradation (such as carbon oxidation or thermal loss) to a `StateVector` while preserving monadic composition rules (`flatMap` / `map`).
* **Where to start:** Examine `src/thermodynamics/monad_process.ts` and write corresponding unit tests under `tests/`.

### Path B: Building a New WebGL Shader
For visualization of biogeochemical stocks and thermodynamic heat maps, the engine supports custom WebGL shaders.

* **Good First Issue / Extension Idea:** Create a fragment shader in `src/rendering/shaders/` that visualizes absolute stock deltas (computed via Sprint 069's validator) as a thermal gradient over simulation grid coordinates.
* **Where to start:** Review existing rendering pipelines in `src/rendering/` and hook your shader uniforms into the main render loop.

---

## 4. Submitting Your Contribution

1. Fork the repository on GitHub (`https://github.com/pascalranoroarijaona/WebOfLife`).
2. Create your feature branch (`git checkout -b feature/amazing-monad`).
3. Commit your changes and ensure tests pass (`npx tsx tests/sprint_069.test.ts`).
4. Open a Pull Request detailing your thermodynamic or rendering enhancements!