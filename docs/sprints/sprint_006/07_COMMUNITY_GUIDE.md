<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 006: Biogeochemical CyclePODs - Developer Onboarding & Contribution Guide

Welcome, Open-Source Contributors and Systems Architects! This guide is designed to get you up to speed with **Sprint 006** of the **Web of Life (Gaia)** simulation engine (`https://github.com/pascalranoroarijaona/WebOfLife`). 

In Sprint 006, we establish the thermodynamic and mass-conservative biogeochemical cycle infrastructure. Whether you want to build custom planetary monads or optimize our WebGL render pipelines, this guide will walk you through your first steps.

---

## 1. Quick Start & Development Setup

First, clone the repository and install dependencies using **Node.js and npm**:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running the Test Suite
We enforce strict mass conservation invariants ($\sum \Delta S = 0$). Run the test runner via `npx tsx` (never use Python or external test runners):

```bash
npx tsx tests/sprint_006.test.ts
```

---

## 2. Architecture Overview: Biogeochemical CyclePODs

The simulation core orchestrates four fundamental planetary element cycles:
- **Carbon** (`src/cycles/carbon.ts`)
- **Water** (`src/cycles/water.ts`)
- **Nitrogen** (`src/cycles/nitrogen.ts`)
- **Phosphorus** (`src/cycles/phosphorus.ts`)

All cycles inherit from or implement the base `ICyclePOD` contract, ensuring state encapsulation and strict conservation checks ($\pm 1.0 \times 10^{-12}$ tolerance) at every time step $\Delta t$.

---

## 3. "Good First Issues" for External Contributors

If you are looking to make your first contribution to the Web of Life repository, pick up one of these introductory tasks:

### Issue #601: Add Sulfur Cycle POD (`src/cycles/sulfur.ts`)
- **Objective:** Implement a new biogeochemical cycle representing atmospheric $SO_2$, sulfate aerosols, terrestrial sulfides, and marine sediments.
- **Requirements:** 
  - Adhere to the `ICyclePOD` interface.
  - Implement First Law mass conservation checks.
  - Write unit tests in `tests/sprint_006_sulfur.test.ts`.

### Issue #602: Custom WebGL Atmosphere Scattering Shader (`src/shaders/atmosphere.frag`)
- **Objective:** Build a fragment shader to visualize atmospheric Rayleigh scattering based on real-time vapor and $CO_2$ densities from the Carbon and Water CyclePODs.
- **Requirements:** 
  - Integrate uniform bindings for `atmosphere_vapor` and `atmosphere` stocks.
  - Optimize for real-time WebGL 2.0 pipelines.

---

## 4. Extension Points: How to Build a New Monad

To extend the simulation with a custom ecological or geochemical monad:

1. **Create your module file** in `src/cycles/your_custom_cycle.ts`.
2. **Implement the state transition loop** using state-monad patterns:
   ```typescript
   import { ICyclePOD } from './base_cycle';

   export class CustomCycle implements ICyclePOD {
     public name = 'custom';
     private stocks = new Map<string, number>();

     public getStocks(): ReadonlyMap<string, number> {
       return this.stocks;
     }

     public step(deltaSeconds: number, solarFlux: number): void {
       // Implement flux calculations and state updates here
       this.validateMassBalance(this.initialTotalMass);
     }

     public validateMassBalance(initialTotal: number): boolean {
       let currentTotal = 0;
       for (const mass of this.stocks.values()) currentTotal += mass;
       return Math.abs(currentTotal - initialTotal) < 1e-12;
     }
   }
   ```
3. **Wire your cycle into `EarthPOD`** (`src/earth_pod.ts`) to ensure global synchronization.

---
*Happy coding, and welcome to the Gaia simulation community!*