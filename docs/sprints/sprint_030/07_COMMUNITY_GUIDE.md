<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 030: Developer Onboarding & Contributor Guide

Welcome to the **Web of Life** developer community! This guide provides a walkthrough for the new features introduced in **Sprint 030**, focusing on the Thermodynamic State Vector Validation Wrapper (`src/thermodynamics/state_validator.ts`).

Whether you are building custom biogeochemical monads or authoring high-performance WebGL shaders, this document will help you get set up, write robust tests, and contribute extensions safely.

---

## 1. Quick Start & Environment Setup

The repository is built on **TypeScript** and **Node.js**. 

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the Sprint 030 verification tests:**
   ```bash
   npx tsx tests/sprint_030.test.ts
   ```

---

## 2. Overview of Sprint 030: Thermodynamic State Validation

Sprint 030 establishes the formal thermodynamic validation layer. Before any monadic transformation pipeline executes, state vectors must pass invariant checks to ensure compliance with fundamental physical laws:
- **First Law:** Matter and elemental stocks (Carbon, Nitrogen, Phosphorus, Water) cannot fall below zero.
- **Second Law:** Entropy ($S \ge 0$) and absolute temperature ($T \ge 0\text{ K}$) must remain physically valid.

Here is how you use `ThermodynamicStateValidator` in your code:

```typescript
import { ThermodynamicStateValidator } from '../src/thermodynamics/state_validator';
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector';

const validator = new ThermodynamicStateValidator();

const state: ThermodynamicStateVector = {
  energy: 1500.0,
  entropy: 45.2,
  temperature: 298.15,
  elementalStocks: { C: 120, N: 14, P: 3, H2O: 500 }
};

// Will throw an Error if validation fails
validator.assertValid(state);
```

---

## 3. Good First Issues for External Contributors

Looking to make your first contribution to the Web of Life? Pick up one of these beginner-friendly tasks:

### Issue 3.1: Add Warning Thresholds for Near-Zero Elemental Stocks
- **Context:** Currently, `ThermodynamicStateValidator` only flags hard negative values for elemental stocks.
- **Task:** Extend `validate()` in `src/thermodynamics/state_validator.ts` to push a warning to `warnings[]` if any elemental stock drops below `1.0` unit (indicating potential depletion).
- **Files to modify:** `src/thermodynamics/state_validator.ts`, `tests/sprint_030.test.ts`.

### Issue 3.2: Implement Custom Enthalpy Balance Check
- **Context:** The validator checks individual properties but does not cross-check energy against internal thermal states.
- **Task:** Write a helper method `validateEnergyThermalConsistency(state)` that ensures internal kinetic energy correlates reasonably with absolute temperature.

---

## 4. Extension Points: Building New Monads & Shaders

### 4.1 Building a New Monad Process
To create a custom biogeochemical cycle (e.g., Sulfur or Methane cycle), wrap your transformation logic in a monadic structure that invokes the validator:

```typescript
import { ThermodynamicStateVector } from '../src/thermodynamics/state_vector';
import { ThermodynamicStateValidator } from '../src/thermodynamics/state_validator';

export class MethaneCycleMonad {
  private validator = new ThermodynamicStateValidator();

  public bind(state: ThermodynamicStateVector): ThermodynamicStateVector {
    // 1. Validate input state
    this.validator.assertValid(state);

    // 2. Perform biogeochemical transformation
    const mutatedState: ThermodynamicStateVector = {
      ...state,
      energy: state.energy - 50,
      entropy: state.entropy + 2.5,
      elementalStocks: {
        ...state.elementalStocks,
        C: state.elementalStocks.C - 10
      }
    };

    // 3. Validate output state prior to next pipeline step
    this.validator.assertValid(mutatedState);
    return mutatedState;
  }
}
```

### 4.2 Building WebGL Shaders for Thermal Visualization
To render real-time thermodynamic state vectors on the Web of Life client viewport:
1. Place your GLSL shaders in `src/shaders/`.
2. Bind uniform variables matching state vector properties (`u_temperature`, `u_entropy`).
3. Ensure your shader pipeline respects absolute bounds validated by the TypeScript backend.

---

## 5. Running Tests

Always verify your changes before opening a Pull Request:
```bash
npx tsx tests/sprint_030.test.ts
```