<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 019: Contributor Guide & Developer Onboarding

Welcome to the **Web of Life** Open-Source Community! In Sprint 019, we establish the **Thermodynamic State Vector Interface** (`src/thermodynamics/types.ts`), enforcing strict First and Second Law thermodynamic compliance across all planetary simulation monads.

This guide provides everything you need to set up your local development environment, understand our TypeScript/Node.js architecture, and build your first custom thermodynamic monad or WebGL shader.

---

## 1. Quick Start & Development Setup

We build entirely with **TypeScript** and **Node.js**. Make sure you have Node.js (v18+) installed.

### Installation & Test Execution
```bash
# Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install dependencies using npm
npm install

# Run the test suite for Sprint 019
npx tsx tests/sprint_019.test.ts
```

---

## 2. Core Architecture: Thermodynamics & Monads

The simulation models an Earth Pod operating under strict physical boundaries:
1. **First Law (Energy Conservation):** Energy changes are driven exclusively by radiative solar forcing, thermal radiation, and mass fluxes. Internal spontaneous energy creation is strictly prohibited.
2. **Second Law (Entropy & Exergy):** Every process must satisfy the Clausius-Duhem inequality ($\dot{S}_{\text{gen}} \ge 0$). Exergy destruction is coupled via the Gouy-Stodola theorem:
   $$\dot{I} = T_0 \dot{S}_{\text{gen}}$$
   where $T_0 = 288.15\text{ K}$.

---

## 3. Good First Issues & Extension Points

We love external contributors! Below are two curated entry points to expand the simulation capabilities.

### Extension Point A: Building a New Thermodynamic Monad
Want to simulate a new biogeochemical reaction, metabolic pathway, or energetic feedback loop? You can implement `IThermodynamicProcessMonad` by extending `BaseThermodynamicProcessMonad`.

**Example Template (`src/thermodynamics/custom_monad.ts`):**
```typescript
import { BaseThermodynamicProcessMonad } from './types';
import { ThermodynamicStateVector, ThermodynamicDerivativeResult } from './types';

export class CustomMetabolicMonad extends BaseThermodynamicProcessMonad {
  readonly processId = 'CUSTOM_METABOLIC_PROCESS';

  evaluate(state: ThermodynamicStateVector, dt: number): ThermodynamicDerivativeResult {
    // 1. Compute internal energy changes and entropy production
    const dInternalEnergy = 0.0; // Joule adjustments
    const dEntropy = 12.5 * dt;   // J/K
    
    // 2. Enforce Second Law: entropyGenerationRate MUST be >= 0
    const entropyGenerationRate = 12.5; // W/K

    return {
      dInternalEnergy,
      dEntropy,
      entropyGenerationRate,
      exergyDestructionRate: state.ambientTemperature * entropyGenerationRate,
      massStockDeltas: new Map([['carbon', -0.5], ['oxygen', -1.3]])
    };
  }
}
```

### Extension Point B: WebGL Shaders for Planetary Visualization
If you are interested in graphics and real-time visualization, you can contribute WebGL shaders to render planetary exergy destruction and entropy gradients in real-time.

1. Locate the shader pipeline in `src/renderer/shaders/`.
2. Add a new fragment shader uniform for `exergyDestructionRate` (`src/renderer/shaders/exergy_frag.glsl`).
3. Bind the thermodynamic state vector outputs from `src/thermodynamics/types.ts` to the WebGL program loop.

---

## 4. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/my-new-monad`
2. Commit your changes adhering to TypeScript strict mode.
3. Add a verification test in `tests/` and run:
   ```bash
   npx tsx tests/sprint_019.test.ts
   ```
4. Push to your fork and open a Pull Request against `https://github.com/pascalranoroarijaona/WebOfLife`.

Happy coding, and welcome to the planetary simulation frontier!