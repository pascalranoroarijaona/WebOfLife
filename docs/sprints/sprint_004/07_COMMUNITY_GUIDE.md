<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 004 Contributor Onboarding: Metabolic Thermodynamics & Extended Trophic Cascades

Welcome to the **Web of Life** open-source repository (`https://github.com/pascalranoroarijaona/WebOfLife`)! 

In Sprint 004, we elevate our simulation engine from basic mass-balance token tracking to a **physically bounded thermodynamic engine** governed strictly by the First and Second Laws of Thermodynamics. 

---

## 🛠️ Quick Start & Environment Setup

We use **TypeScript** and **Node.js** for all simulation modules and runtime checks.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the Sprint test suite:**
   ```bash
   npx tsx tests/sprint_004.test.ts
   ```

---

## 🧩 Good First Issues & Extension Points

We are actively looking for community contributions! If you want to dive into the codebase, pick up one of these extension tasks:

### 1. Building New Thermodynamic Monads (`src/thermodynamics/`)
External contributors can implement custom biochemical pathways by extending our immutable Monad pipelines. 
* **Target File:** `src/thermodynamics/monads.ts`
* **Objective:** Implement a new nitrogen-fixing microbial monad that converts atmospheric $N_2$ into soil ammonia ($NH_4^+$) while accounting for enzymatic energy costs and heat dissipation ($Q_{loss}$).
* **Boilerplate Template:**
  ```typescript
  import { ElementalStocks } from './types';

  export function nitrogenFixationMonad(stocks: ElementalStocks, energyInput: number): ElementalStocks {
      const fixedN = energyInput * 0.02; // Conversion factor
      const dissipatedHeat = energyInput * 0.98;
      
      return {
          ...stocks,
          nitrogen: stocks.nitrogen + fixedN,
          q_loss: stocks.q_loss + dissipatedHeat
      };
  }
  ```

### 2. Custom WebGL Shaders for Thermodynamic Heat Sinks (`src/renderer/shaders/`)
To visualize ecological entropy generation ($Q_{loss}$) in real-time, we need custom fragment shaders that map thermal dissipation directly to heatmap color gradients.
* **Target Directory:** `src/renderer/shaders/thermal.frag`
* **Objective:** Write a WebGL fragment shader that takes the cumulative $Q_{loss}$ buffer and renders a perceptual colormap (from deep blue cryogenic states to white-hot thermal dissipation sinks).

---

## 🧪 Testing Your Contributions
Before submitting a Pull Request, ensure your code passes both First and Second Law checks:
```bash
npx tsx tests/sprint_004.test.ts
```
All atomic mass invariants must hold within $10^{-9}\text{g}$ tolerance, and entropy ($\Delta Q_{loss} \ge 0$) must never decrease!