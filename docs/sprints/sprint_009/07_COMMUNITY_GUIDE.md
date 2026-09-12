<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 009 Developer Onboarding & Contributor Guide

Welcome to the **Web of Life** open-source community! Sprint 009 introduces our rigorous **Thermodynamic State Vector Interface** (`src/thermodynamics/types.ts`), enforcing strict First and Second Law constraints across all biogeochemical cycles (Carbon, Nitrogen, Phosphorus, and Water).

Whether you are building custom monads or authoring high-performance WebGL shaders to visualize entropy generation, this guide will get you up to speed.

---

## 🚀 Quickstart for Contributors

Before writing any code, set up your development environment using **Node.js and TypeScript** (strictly no Python or pip dependencies allowed in this repository).

```bash
# 1. Clone the official repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# 2. Install dependencies using npm
npm install

# 3. Run the test suite for Sprint 009
npx tsx tests/sprint_009.test.ts
```

---

## 🛠️ Good First Issues & Extension Points

If you are looking to contribute to the Web of Life ecosystem, here are two prime extension tracks:

### 1. Building New Monads (`src/thermodynamics/`)
We use immutable monad structures (`ThermodynamicStateMonad`) to prevent illegal state mutations and ensure thermodynamic invariants ($\dot{S}_{\text{gen}} \ge 0$) hold across ticks.

*   **Extension Task:** Implement a specialized `BiogeochemicalCycleMonad` that wraps carbon-fixation rates and verifies carbon-mass conservation alongside entropy generation.
*   **Boilerplate Example:**
    ```typescript
    import { ThermodynamicStateMonad, ThermodynamicStateVector } from './types';

    export class CarbonCycleMonad {
      public static applyPhotosynthesis(
        stateMonad: ThermodynamicStateMonad, 
        deltaCarbonKg: number
      ): ThermodynamicStateMonad {
        return stateMonad.map((current: ThermodynamicStateVector) => {
          // Calculate internal energy & entropy adjustments due to C-fixation
          return {
            ...current,
            systemInternalEnergyJoules: current.systemInternalEnergyJoules + (deltaCarbonKg * 1.2e7), // Example enthalpy scale
            entropyGenerationRateWattsPerKelvin: current.entropyGenerationRateWattsPerKelvin + 0.05 // Must remain >= 0
          };
        });
      }
    }
    ```

### 2. Building WebGL Shaders for Thermodynamic Visualization (`src/rendering/`)
We visualize real-time exergy destruction ($\dot{I}$) and entropy generation ($\dot{S}_{\text{gen}}$) using GPU-accelerated WebGL shaders.

*   **Extension Task:** Write a fragment shader that maps $\dot{I} = T_0 \dot{S}_{\text{gen}}$ to a thermal false-color gradient (from deep space blue $2.7\text{K}$ to high-entropy dissipation red).
*   **Integration Point:** Connect your GLSL uniforms directly to the `ThermodynamicStateVector` output extracted from `ThermodynamicStateMonad.extract()`.

---

## 🧪 Testing Your Contribution

Always run the full test runner before submitting a Pull Request:
```bash
npx tsx tests/sprint_009.test.ts
```
Ensure your code satisfies:
1. **First Law Closure:** $\left| \frac{dU_{\text{sys}}}{dt} - (\dot{Q}_{\text{solar}} - \dot{Q}_{\text{emit}}) \right| \le 10^{-6}$
2. **Second Law Non-Negativity:** $\dot{S}_{\text{gen}} \ge 0$
3. **Gouy-Stodola Consistency:** $\dot{I} \equiv T_0 \dot{S}_{\text{gen}}$

Happy coding, and welcome to the simulation!