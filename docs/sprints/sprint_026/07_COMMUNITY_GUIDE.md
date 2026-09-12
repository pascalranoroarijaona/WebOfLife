<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 026: Thermodynamic Equilibrium & Trophic Cascade Architecture - Developer Onboarding & Contributor Guide

Welcome to **Web of Life**! This guide is designed for developers, researchers, and open-source contributors joining us for **Sprint 026**. 

In this sprint, we enforce strict thermodynamic laws and multi-trophic cascades across the simulation engine. Whether you are building custom monads or authoring WebGL shaders for real-time visualization of energy and entropy fluxes, this document provides the architectural context, development workflows, and extension points you need.

---

## 1. Technical Stack & Repository Setup

Web of Life is built on **TypeScript and Node.js**. 

> **CRITICAL CONSTRAINTS:** 
> - **NEVER** use `pip install` or `pytest`. This is a TypeScript/Node.js codebase.
> - Repository URL: [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)

### Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run Sprint 026 test suite:**
   ```bash
   npx tsx tests/sprint_026.test.ts
   ```

---

## 2. Architecture Overview: Thermodynamics & Trophic Monads

Sprint 026 enforces two fundamental laws across all simulation entities:
1. **First Law (Energy & Mass Conservation):** Total system energy ($E_{sys}$) and matter (Carbon, Nitrogen pools) must remain invariant ($\Delta E_{sys} = 0$, within floating-point tolerance $\epsilon = 10^{-9}$).
2. **Second Law (Entropy & Dissipation):** Every metabolic transaction or predation event incurs an entropy tax, releasing thermal energy ($Q$) into the environmental thermal sink and enforcing $\Delta S \ge 0$.

### Core Class & Interface Hierarchy (`src/core/thermodynamics/`)

```
Entity
├── abiotic
│   ├── SolarSource (Singleton Exergy Influx)
│   ├── Atmosphere (Gas & Thermal Pool)
│   └── SoilMatrix (Nutrient & Detritus Pool)
└── biotic
    ├── Organism (Abstract Base - IThermodynamicSystem, IMaterialPool)
    │   ├── Autotroph (C3/C4 Plants, Algae)
    │   └── Heterotroph (Herbivores, Carnivores, Detritivores)
```

- **`IThermodynamicSystem`**: Enforces `get_energy_stock()` and `dissipate_heat(joules)`.
- **`IMaterialPool`**: Governs atomic mass transfer respecting stoichiometry and conservation laws.
- **`TrophicMonad`**: Wraps state transitions in a deterministic pipeline container, ensuring step-wise execution of primary production, grazing, and thermal dissipation.

---

## 3. Good First Issues for External Contributors

If you are looking for a place to start contributing during Sprint 026, take a look at these well-defined tasks:

### Issue 01: Implement Detritivore Decomposer Monad
- **Scope:** Create a new `Detritivore` class extending `Heterotroph` that consumes organic waste and dead biomass from `SoilMatrix`.
- **File Target:** `src/core/organisms/Detritivore.ts`
- **Acceptance Criteria:** Must return mineralized nitrogen and carbon back to the soil matrix while accounting for Second Law metabolic heat loss.

### Issue 02: Stochastic Solar Flux Generator
- **Scope:** Implement a weather fluctuation wrapper around `SolarSource` that simulates diurnal cycles and cloud cover variability.
- **File Target:** `src/core/abiotic/SolarSource.ts`
- **Acceptance Criteria:** Solar flux must vary sinusoidally over time without violating total energy conservation checks.

---

## 4. Extension Points: Building New Monads & WebGL Shaders

### A. Creating a Custom Monad
To create a new organism or environmental monad, implement the `Organism` base class or `IMaterialPool` interface. Here is an architectural skeleton in TypeScript:

```typescript
import { Organism, IMaterialPool } from '../core/thermodynamics/BaseMonad';

export class C4Plant extends Organism {
  constructor(biomass: number, energy: number) {
    super(biomass, energy);
  }

  public metabolize(deltaTime: number): number {
    const basalCost = this.biomass * 0.0008 * deltaTime;
    const heatLoss = Math.min(this.energy, basalCost);
    this.dissipate_heat(heatLoss);
    return heatLoss;
  }

  public ingest(source: IMaterialPool, energyAmount: number): [number, number] {
    // Autotrophs rely on solar flux rather than ingestion
    return [0, 0];
  }
}
```

### B. Authoring WebGL Shaders for Thermal & Energy Visualization
To render real-time thermodynamic dissipation and trophic energy flow:
1. Register your shader programs in `src/rendering/shaders/`.
2. Pass system entropy and thermal sink uniforms from the `TrophicMonadState` tick loop to the WebGL rendering context:

```typescript
// Example uniform binding in renderer loop
gl.uniform1f(shaderProgram.uniformLocations.thermalSink, state.soil.thermal_sink);
gl.uniform1f(shaderProgram.uniformLocations.systemEntropy, state.totalSystemEnergy);
```

---

## 5. Submitting Pull Requests

1. Create a feature branch: `git checkout -b feature/my-new-monad`
2. Run your tests locally using `npx tsx tests/sprint_026.test.ts` to verify mass-balance invariants.
3. Open a Pull Request against `main` following our PR template and linking your corresponding GitHub issue. 

Happy coding, and welcome to the Web of Life open-source community!