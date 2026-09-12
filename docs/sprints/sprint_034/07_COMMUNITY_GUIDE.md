<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 034 Contributor Guide: Thermodynamic State Vector Non-Negative Entropy Assertions

Welcome to the **Web of Life** developer community! This guide outlines the onboarding steps for **Sprint 034**, focusing on our enforcement of the Second Law of Thermodynamics via `src/thermodynamics/state_validator.ts`, and highlights **Good First Issues** for developers looking to build custom monads or WebGL shaders.

---

## 🚀 Getting Started & Local Setup

The Web of Life engine is built using **TypeScript** and **Node.js**. Ensure you have Node.js (v18+ recommended) installed.

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Run Sprint 034 Tests:**
   Verify your environment and the new thermodynamic assertions by running:
   ```bash
   npx tsx tests/sprint_034.test.ts
   ```

---

## 🏛️ Sprint 034 Architectural Overview

In Sprint 034, we integrated strict physical invariants into our thermodynamic monad processing pipeline (`src/thermodynamics/thermodynamic_monad_process.ts`):
- **Absolute Entropy ($S \ge 0$)**: Conforming to the Third Law of Thermodynamics.
- **Entropy Generation Rate ($\dot{S}_{\text{gen}} \ge 0$)**: Enforcing the Clausius formulation of the Second Law for open thermodynamic systems.

When any state vector violates these limits, a `ThermodynamicViolationError` is thrown immediately to halt non-physical states.

---

## 🛠️ Contributor Extension Points & Good First Issues

We welcome external contributions! Here are targeted areas where you can extend the engine.

### 1. Building Custom Thermodynamic Monads (`Good First Issue`)
Want to introduce a new ecological or biochemical process (e.g., nitrogen fixation, chemosynthesis) into the monad pipeline? 
- **Extension Point:** `src/thermodynamics/thermodynamic_monad_process.ts`
- **Task:** Create a new transition function that maps an input `IThermodynamicStateVector` to a new state vector while maintaining mass and energy conservation. Wrap your transition using `ThermodynamicMonad.map()`, which automatically runs the `StateValidator`.

**Example Stub:**
```ts
import { IThermodynamicStateVector } from './types';
import { ThermodynamicMonad } from './thermodynamic_monad';

export function simulateNitrogenFixation(vector: IThermodynamicStateVector): IThermodynamicStateVector {
  return ThermodynamicMonad.map(vector, (v) => {
    // Implement custom thermodynamic shifts here
    return {
      ...v,
      entropy: v.entropy + 1.5,
      entropyGenerationRate: v.entropyGenerationRate + 0.2
    };
  });
}
```

### 2. Developing Custom WebGL Thermodynamic Shaders (`Good First Issue`)
To visualize real-time entropy flux and energy dissipation across our planetary grid:
- **Extension Point:** `src/shaders/thermodynamics.frag.glsl` (or create a new shader in `src/shaders/`)
- **Task:** Write a custom WebGL fragment shader that maps local entropy generation rates ($\dot{S}_{\text{gen}}$) to a thermal color palette (e.g., deep blue for low dissipation, radiant red/yellow for high irreversible entropy generation).

---

## 🧪 Testing Your Contributions

Whenever you add a new monad or shader parameter, ensure you write a corresponding test suite in the `tests/` directory and execute it via:
```bash
npx tsx tests/sprint_N.test.ts
```

Happy coding, and welcome to modeling the Web of Life!