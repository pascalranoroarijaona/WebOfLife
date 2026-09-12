<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 15 Developer Onboarding & Contributor Guide: Thermodynamic State Vectors & Monads

Welcome to the **Web of Life** contributor community! In Sprint 15, we introduced rigorous thermodynamic state vector interfaces (`src/thermodynamics/types.ts`) and executable state-transforming monad methods (`src/thermodynamics/methods.ts`). These modules ensure that all planetary nutrient and water cycles strictly adhere to the First Law of Thermodynamics (energy conservation) and the Second Law of Thermodynamics ($\dot{S}_{\text{gen}} \ge 0$, Gouy-Stodola exergy destruction).

This guide walks you through setting up your environment, running the new test suite, and contributing new thermodynamic monads or WebGL shaders.

---

## 1. Quick Start & Environment Setup

The repository is built strictly using **TypeScript** and **Node.js**. 

1. **Clone the repository**:
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the Sprint 15 test suite**:
   Verify your local environment and thermodynamic constraints by executing:
   ```bash
   npx tsx tests/sprint_015.test.ts
   ```

---

## 2. Good First Issues for External Contributors

Looking to make your first open-source contribution? Here are two designated "Good First Issues" aligned with Sprint 15 architecture:

### Issue A: Implement Isothermal Boundary Flux Normalization
* **File to modify**: `src/thermodynamics/methods.ts`
* **Objective**: Write a helper utility `normalizeBoundaryFluxes(fluxes: BoundaryFlux[]): BoundaryFlux[]` that aggregates parallel boundary fluxes sharing the same `boundaryTemperature` and `species` to optimize calculation overhead.
* **Acceptance Criteria**: Unit test in `tests/sprint_015.test.ts` verifying mass and heat summation accuracy within $\epsilon < 10^{-12}$.

### Issue B: Add Nitrogen Cycle Thermodynamic Wrapper
* **File to modify**: `src/cycles/nitrogen.ts`
* **Objective**: Implement `IThermodynamicModel` inside the `NitrogenCycle` class, ensuring nitrogen fixation and denitrification paths update internal energy and calculate entropy generation.
* **Acceptance Criteria**: `validateFirstLaw()` and `validateSecondLaw()` return `true` during a 24-hour simulation tick.

---

## 3. Extension Point Guide: Building New Monads & WebGL Shaders

### 3.1 Building a Custom Thermodynamic Monad
To create a new biogeochemical or industrial cycle monad that respects planetary thermodynamics:

1. Extend `BaseCycle` (located in `src/cycles/base_cycle.ts`), which implements `IThermodynamicModel`.
2. Utilize `stepThermodynamicMonad` from `src/thermodynamics/methods.ts` inside your cycle's time-step reducer:
   ```typescript
   import { stepThermodynamicMonad } from '../thermodynamics/methods';
   import { ThermodynamicStateVector, BoundaryFlux } from '../thermodynamics/types';

   export class CustomCycle extends BaseCycle {
     public stepThermodynamics(dt: number): void {
       const newFluxes: BoundaryFlux[] = [
         // Define your boundary fluxes here
       ];
       this.stateVector = stepThermodynamicMonad(this.stateVector, dt, newFluxes);
     }
   }
   ```
3. Ensure all entropy generation outputs pass the Clausius-Duhem validation guard ($\dot{S}_{\text{gen}} \ge 0$).

### 3.2 Building Thermodynamic WebGL Shaders
To visualize entropy generation rates ($\dot{S}_{\text{gen}}$) or exergy destruction ($\dot{I}$) across planetary surfaces:

1. Add your GLSL fragment shader under `src/shaders/thermo_entropy.frag`.
2. Pass the `exergyDestructionRate` uniform from the state vector into the WebGL rendering context:
   ```glsl
   precision highp float;
   uniform float u_exergyDestruction;
   varying vec2 v_uv;

   void main() {
     // Map exergy destruction intensity to thermal color gradient
     float intensity = clamp(u_exergyDestruction / 1000.0, 0.0, 1.0);
     gl_FragColor = vec4(intensity, 0.2, 1.0 - intensity, 1.0);
   }
   ```
3. Register the shader uniform binder in `src/earth_pod.ts`.

---

## 4. Submitting Your Contribution
1. Fork the repository on [GitHub](https://github.com/pascalranoroarijaona/WebOfLife).
2. Create a feature branch: `git checkout -b feature/sprint-15-extension`.
3. Run tests before committing: `npx tsx tests/sprint_015.test.ts`.
4. Submit a Pull Request with a clear description of your thermodynamic or graphical extension!