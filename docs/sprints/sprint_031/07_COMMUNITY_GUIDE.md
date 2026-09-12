<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 031 Contributor & Developer Relations Guide

Welcome to the **Web of Life** open-source community! Sprint 031 introduces the **Thermodynamic State Vector Validation Wrapper** (`src/thermodynamics/state_validator.ts`), establishing strict runtime invariants for First and Second Law thermodynamics across all biochemical monad transitions.

Whether you are looking to build a new biochemical monad or extend our WebGL rendering pipeline, this guide will get you up to speed quickly.

---

## 🛠️ Getting Started

Before contributing, ensure your environment is configured correctly. We use **TypeScript and Node.js**. 

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the test suite (including Sprint 31 validations):**
   ```bash
   npx tsx tests/sprint_031.test.ts
   ```

---

## 🧬 Building New Monads (`Good First Issue` Template)

When creating a new biogeochemical cycle or metabolic pathway monad (e.g., Sulfur, Iron, or Lipid synthesis), your monad must interface with `ThermodynamicMonadProcess` and respect state validation rules.

### Step-by-Step Implementation:
1. **Define State Vectors:** Ensure your state extends `ThermodynamicStateVector` with valid temperature, stocks dictionary, and non-negative entropy ($S \ge 0$).
2. **Wrap Transitions:** Use `ThermodynamicMonadProcess` to automatically validate mass-energy balance (First Law) and entropy evolution (Second Law).

```typescript
import { ThermodynamicStateVector } from '../thermodynamics/types';
import { ThermodynamicMonadProcess } from '../thermodynamics/monad_process';

export class SulfurCycleMonad {
  private processor = new ThermodynamicMonadProcess();

  public simulateStep(state: ThermodynamicStateVector): ThermodynamicStateVector {
    return this.processor.step(state, (current) => {
      // Implement your custom sulfur stock transformation here
      const updatedStocks = { ...current.stocks, S: (current.stocks['S'] || 0) + 1.5 };
      return {
        ...current,
        stocks: updatedStocks,
        entropy: current.entropy + 0.05, // Enforce Second Law: dS >= 0
        solarInput: 1.5                  // Balance First Law stock change
      };
    });
  }
}
```

---

## 🎨 Extending WebGL Shaders

If you are contributing visual shaders for thermodynamic flux or entropy dissipation fields:
- Locate shader programs in `src/shaders/`.
- Ensure uniform bindings match the validated properties emitted by `ThermodynamicStateVector` (temperature, entropy gradients, dissipation rates).
- Test rendering performance locally using our canvas harness.

---

## 🤝 Community & Support
- **Issues & PRs:** Submit contributions via [GitHub PRs](https://github.com/pascalranoroarijaona/WebOfLife/pulls).
- **Tests:** Always add corresponding unit tests in `tests/sprint_N.test.ts` for any new feature or extension.