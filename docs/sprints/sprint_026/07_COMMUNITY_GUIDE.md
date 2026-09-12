<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 026 Contributor & Developer Onboarding Guide

Welcome to the **Web of Life** developer community! This guide serves as your onboarding manual for **Sprint 026: Thermodynamic Equilibrium & Trophic Cascade Architecture**. 

Our simulation repository enforces strict physical laws—specifically energy conservation and entropy generation ($ \Delta S \ge 0 $). Whether you want to implement a new photosynthetic monad or design an advanced WebGL shader for thermal heat dissipation, this guide will get your environment running and highlight key extension points.

---

## 1. Getting Started

### Prerequisites
- **Node.js** (v18+ recommended)
- **npm** (comes with Node.js)

### Installation & Test Suite
Never use Python tools (`pip`, `pytest`) for this repository. Everything runs on **TypeScript and Node.js**.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Verify your installation by running the test suite:**
   ```bash
   npx tsx tests/sprint_026.test.ts
   ```

---

## 2. Good First Issues for External Contributors

If you are looking to make your first contribution to Sprint 026 features, pick up one of these well-defined tasks:

### Issue #2601: Implement C4 Photosynthetic Pathway Monad
* **Description:** Currently, autotrophs utilize a generalized photosynthetic efficiency ($\eta_{photo}$). Create a new subclass `C4Plant` extending `Autotroph` in `src/biology/c4_plant.ts` that incorporates temperature-dependent water-stress penalty coefficients.
* **Acceptance Criteria:** Must pass mass-balance invariants over 1,000 steps without leaking carbon or energy.

### Issue #2602: Detritivore Decomposer Pool Handler
* **Description:** Implement a `Detritivore` heterotroph class in `src/biology/detritivore.ts` that consumes mass directly from the `SoilMatrix` detritus pools rather than grazing live autotrophs.
* **Acceptance Criteria:** Unit tests showing soil carbon recycling back into inorganic carbon components.

---

## 3. Extension Points: Building Custom Monads & WebGL Shaders

### Extending Monads (`src/thermodynamics/`)
To introduce a new thermodynamic actor (e.g., an Apex Predator or Chemosynthetic Organism):
1. Inherit from the abstract base class `Organism`.
2. Implement the required interface contracts: `IThermodynamicSystem` and `IMaterialPool`.
3. Ensure all energy expenditures call `dissipate_heat(joules)` to satisfy the Second Law ($\Delta S \ge 0$).

```typescript
import { Organism, IMaterialPool } from '../thermodynamics/state_vector';

export class ApexPredator extends Organism {
  public metabolize(deltaTime: number): number {
    const basalCost = this.biomass * 0.0015 * deltaTime;
    const heatLoss = Math.min(this.energy, basalCost);
    this.dissipate_heat(heatLoss);
    return heatLoss;
  }
  
  public ingest(source: IMaterialPool, energyAmount: number): [number, number] {
    // Custom carnivorous assimilation logic
    return [energyAmount * 0.85, energyAmount * 0.15];
  }
}
```

### Extending WebGL Shaders (`src/rendering/shaders/`)
To visualize thermal radiation and heat dissipation across the simulation grid:
1. Write custom GLSL fragment shaders in `src/rendering/shaders/thermal_frag.glsl`.
2. Bind the `thermal_sink` and environmental temperature vectors from the `SoilMatrix` state vector to uniform locations.
3. Test rendering pipelines via `npx tsx tests/rendering.test.ts`.

---
Happy coding, and welcome to modeling thermodynamic life!