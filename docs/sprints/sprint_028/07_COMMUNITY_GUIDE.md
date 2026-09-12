<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 028 Community & Contributor Guide: Spatial Equilibrium & Thermodynamic Ledger Stabilization

Welcome to **Web of Life**! This guide is designed for developers, researchers, and open-source contributors joining us for **Sprint 028**. 

In this sprint, we enforce strict thermodynamic constraints across our simulation graph, implementing mass-energy conservation and entropy accounting, alongside spatial nutrient gradients and detritivore trophic mechanics.

---

## 1. Getting Started & Development Workflow

The Web of Life repository is built entirely on **TypeScript** and **Node.js**. 

### 1.1 Environment Setup
Make sure you have Node.js (v18+ recommended) installed. Clone the repository and install dependencies using `npm`:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

> **CRITICAL CONSTRAINT:** This project uses TypeScript and Node.js. **Never** use `pip install` or `pytest`.

### 1.2 Running Tests
To run the automated test suite for this sprint (or any specific test file), use `npx tsx`:

```bash
npx tsx tests/sprint_028.test.ts
```

---

## 2. Core Architecture: Sprint 028 Additions

Sprint 028 introduces two major architectural extensions:
1. **Spatial & Environmental Nodes (`SpatialNode` / `BiomePatch`)**: Discrete vertices managing local carrying capacity and elemental nutrient pools ($C, N, P, \text{Water}$).
2. **Thermodynamic Ledger (`IThermodynamicLedger`)**: Enforces the First Law (mass conservation across transitions) and the Second Law (entropy accumulation $\Delta S \ge \frac{Q}{T}$).

### 2.1 Interface Contracts in TypeScript

```typescript
export interface ElementalStocks {
  carbon: number;
  nitrogen: number;
  phosphorus: number;
  water: number;
}

export interface IThermodynamicLedger {
  /** Returns the mass discrepancy delta across the entire simulation graph. Must be 0.0. */
  auditMassConservation(currentMass: ElementalStocks): number;
  
  /** Logs heat loss and updates global entropy. */
  recordDissipation(joules: number, ambientTemp?: number): void;
}

export interface ISpatialNutrientSource {
  queryNutrients(coordinates: [number, number]): ElementalStocks;
  consumeNutrients(coordinates: [number, number], demand: ElementalStocks): ElementalStocks;
}
```

---

## 3. Good First Issues for Contributors

If you are looking to contribute to the Web of Life ecosystem during Sprint 028, here are three well-scoped "Good First Issues":

### Issue 01: Implement Humic Residue Leaching in `BiomePatch`
- **Description:** Currently, `BiomePatch.deposit_carcass` adds 100% of undecomposed residue back into the pool. Create a leaching modifier that disperses a configurable percentage ($\kappa = 0.02$) of nitrogen and phosphorus to adjacent spatial nodes per tick.
- **Where to start:** Look at `src/environment/BiomePatch.ts`.
- **Validation:** Write a unit test verifying that total system mass remains constant during leaching events.

### Issue 02: Custom Thermodynamic Dissipation Curves for Endotherms vs. Ectotherms
- **Description:** Extend `ThermodynamicLedger` to accept organismal metabolic types, modifying the empirical oxidation coefficient ($10.5 \text{ J/g C}$) based on environmental temperature.
- **Where to start:** `src/thermodynamics/ThermodynamicLedger.ts`.
- **Validation:** Ensure global entropy $\sum \Delta S$ remains monotonically non-decreasing.

### Issue 03: CLI Visualizer for Entropy Accumulation
- **Description:** Add a lightweight console reporter that prints tick-by-tick cumulative entropy ($\Delta S$) and mass conservation deltas during simulation runs.
- **Where to start:** `src/cli/Reporter.ts`.

---

## 4. Extension Points: Building New Monads & WebGL Shaders

We welcome community extensions! Here is how you can plug custom behaviors into the Web of Life pipeline:

### 4.1 Building a Custom Monad
To implement a new organism or environmental monad (e.g., a specialized `ChemoautotrophMonad` or `ApexPredatorMonad`), extend the base behaviors and ensure your state transitions report thermodynamic changes to the ledger:

```typescript
import { IThermodynamicLedger, ElementalStocks } from '../thermodynamics/IThermodynamicLedger';

export class CustomMonad {
  public metabolize(ledger: IThermodynamicLedger, energyConsumed: number): void {
    // 1. Perform metabolic calculations
    const workPerformed = energyConsumed * 0.4;
    const heatDissipated = energyConsumed - workPerformed;

    // 2. Report heat dissipation to enforce Second Law
    ledger.recordDissipation(heatDissipated);
  }
}
```

### 4.2 Building Custom WebGL Shaders for Spatial Gradients
For real-time visual rendering of nutrient pools and entropy thermal heatmaps, developers can hook into our WebGL rendering pipeline:
1. **Shader Location:** Place custom GLSL fragment shaders under `src/renderer/shaders/`.
2. **Uniform Binding:** Bind spatial nutrient arrays (`BiomePatch[]`) as texture buffers.
3. **Execution:** Invoke shaders through the main canvas loop in `src/renderer/SimulationRenderer.ts`.

---

## 5. Submitting Your Contribution

1. Fork the repository on GitHub: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
2. Create your feature branch (`git checkout -b feature/sprint-028-my-extension`).
3. Run your tests locally:
   ```bash
   npx tsx tests/sprint_028.test.ts
   ```
4. Push your branch and open a Pull Request against `main`. 

Happy coding, and maintain that thermodynamic equilibrium!