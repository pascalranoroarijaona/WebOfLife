<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 012 Developer Onboarding & Contributor Guide

Welcome to **Web of Life**, our TypeScript & Node.js planetary simulation engine! 

In **Sprint 012**, we are moving past purely compositional biogeochemical loops (Carbon, Nitrogen, Phosphorus, and Water) into strict thermodynamic governance. We are introducing the **Thermodynamic State Vector** framework (`src/thermodynamics/types.ts`) and monadic simulation pipelines (`src/thermodynamics/thermodynamic_structure.ts`) to rigorously enforce the First and Second Laws of Thermodynamics across all pods.

Whether you are here to build a new custom thermodynamic monad or hook up custom WebGL shaders for thermal visualization, this guide will help you get up to speed quickly.

---

## 🚀 Quickstart for Developers

If you are setting up your development environment for Sprint 012, follow these steps strictly (remember: **no Python environments or `pip`/`pytest` commands are used in this stack**):

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Run the Sprint 012 Thermodynamic Test Suite:**
   ```bash
   npx tsx tests/sprint_012.test.ts
   ```

---

## 📐 Core Architecture: Thermodynamics in Sprint 012

Web of Life models Earth's pods through physical conservation laws. Sprint 012 mandates tracking two primary thermodynamic metrics alongside every elemental stock:
1. **First Law (Energy Conservation):** Total internal energy changes $dU/dt$ must balance net thermal radiation and material enthalpy inputs.
2. **Second Law (Entropy & Exergy):** Every transformation calculates internal entropy generation ($\dot{S}_{\text{gen}}$) and exergy destruction ($\dot{I} = T_0 \dot{S}_{\text{gen}}$).

### The Thermodynamic Monad (`ThermodynamicMonad<T>`)
To prevent accidental energy leaks or entropy violations during state transitions, transformations are piped through the `ThermodynamicMonad`:

```typescript
import { ThermodynamicMonad } from './src/thermodynamics/thermodynamic_structure';
import { IThermodynamicStateVector } from './src/thermodynamics/types';

// Example: Chaining a thermal flux update safely
const initialStock = { temperature: 288.15, thermalEnergy: 1000, totalMass: 500 };
const initialState: IThermodynamicStateVector = {
  internalEnergy: 1000,
  entropy: 3.47,
  referenceTemperature: 288.15,
  entropyGenerationRate: 0.01,
  exergyDestructionRate: 2.88,
  boundaryFluxes: { heatFluxes: new Map(), radiativeNet: 50, massFluxes: new Map() }
};

const pipeline = ThermodynamicMonad.unit(initialStock, initialState)
  .bind((stock, state) => applyThermalFlux(stock, state, 50, 300, 1.0));

const { stock: finalStock, state: finalState } = pipeline.extract();
```
*Note: If any transform results in a negative entropy generation rate ($\dot{S}_{\text{gen}} < 0$), the monad automatically halts execution by throwing a `SecondLawViolation` exception.*

---

## 🌱 Good First Issues for External Contributors

Looking to make your first open-source contribution to Web of Life? Here are targeted tasks suited for newcomers during Sprint 012:

### 1. Implement Adiabatic Expansion Sub-Module
* **Description:** Add a helper function inside `src/thermodynamics/thermodynamic_structure.ts` that calculates ideal gas adiabatic expansion and verifies that entropy generation remains zero ($\dot{S}_{\text{gen}} = 0$) for reversible work steps.
* **Good First Issue Because:** It touches pure algorithmic TypeScript code without requiring deep engine refactoring.
* **Files to touch:** `src/thermodynamics/thermodynamic_structure.ts`, `tests/sprint_012.test.ts`

### 2. Add Specific Heat Capacity Lookup Tables for Biogeochemical Stocks
* **Description:** Extend `src/thermodynamics/types.ts` to include phase-dependent heat capacities for water vapor, liquid water, and soil mineral matrices to improve enthalpy calculations in `applyMassTransport`.
* **Good First Issue Because:** It establishes clean data contracts and dictionary lookups used across multiple environmental pods.

---

## 🔌 Extension Points: Building New Monads & WebGL Shaders

### Extending Custom Monads
If you want to build a brand new ecological or chemical feedback loop that respects thermodynamic boundaries, you must implement the `IThermodynamicSystem` interface:

```typescript
import { IThermodynamicSystem, IThermodynamicStateVector } from './src/thermodynamics/types';

export class CustomEcologicalPod implements IThermodynamicSystem {
  private stateVector: IThermodynamicStateVector;

  constructor(initialState: IThermodynamicStateVector) {
    this.stateVector = initialState;
  }

  public getStateVector(): IThermodynamicStateVector {
    return this.stateVector;
  }

  public stepThermodynamics(dt: number): void {
    // Implement custom stock dynamics and update stateVector here
  }

  public validateSecondLaw(): boolean {
    return this.stateVector.entropyGenerationRate >= 0;
  }
}
```

### Extending WebGL Shaders for Thermodynamic Visualizations
To render real-time entropy generation rates ($\dot{S}_{\text{gen}}$) or exergy destruction maps across the planetary grid:
1. Pass the `exergyDestructionRate` uniform into your fragment shaders located under `src/shaders/`.
2. Map the scalar exergy destruction gradient to a thermal colormap (e.g., cool-to-warm divergent palettes indicating high irreversibility zones).

```glsl
// Example snippet for src/shaders/thermodynamic_frag.glsl
precision highp float;
uniform float u_exergyDestruction;
varying vec2 v_uv;

void main() {
    // Normalize and color-map exergy dissipation intensity
    float intensity = clamp(u_exergyDestruction / 100.0, 0.0, 1.0);
    gl_FragColor = vec4(intensity, 0.2, 1.0 - intensity, 1.0);
}
```

---

## 🤝 Community & Support
- **Issues & PRs:** [GitHub Repository](https://github.com/pascalranoroarijaona/WebOfLife)
- **Testing Reminder:** Always run `npx tsx tests/sprint_012.test.ts` before opening a pull request to ensure thermodynamic invariants hold strong!