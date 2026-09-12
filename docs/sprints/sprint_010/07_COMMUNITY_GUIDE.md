<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 010 Contributor Guide: Thermodynamic State Vector & Monadic Auditing

Welcome to the **Web of Life** open-source community! In Sprint 010, we establish strict thermodynamic contracts, implementing the First and Second Laws of Thermodynamics directly into our TypeScript simulation monads.

This guide is designed for developers, researchers, and systems architects who want to understand our new thermodynamic architecture, build custom monads, or extend our WebGL visualization shaders.

---

## 1. Quick Start & Development Setup

Our simulation engine runs on **TypeScript and Node.js**. Ensure you have Node.js (v18+) installed.

### Installation
Clone the repository and install dependencies using `npm`:
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running the Sprint 010 Test Suite
To verify your environment and run the thermodynamic validation tests:
```bash
npx tsx tests/sprint_010.test.ts
```

---

## 2. Architecture Overview: Sprint 010

Sprint 010 introduces formal type contracts in `src/thermodynamics/types.ts` and evaluation monads in `src/thermodynamics/thermodynamic_structure.ts`. 

Key components:
- **`BoundaryFluxVector`**: Tracks radiative, sensible, and latent heat fluxes across the Earth Pod boundary.
- **`ThermodynamicStateVector`**: Holds instantaneous internal energy ($U$), entropy ($S$), entropy generation rate ($\dot{S}_{\text{gen}}$), and exergy destruction rate ($\dot{I}$).
- **`evaluateThermodynamicState`**: Pure functional monad computing instantaneous state transitions.
- **`assertSecondLaw`**: Runtime validation guard enforcing $\dot{S}_{\text{gen}} \ge 0$ and the Gouy-Stodola relation ($\dot{I} = T_0 \dot{S}_{\text{gen}}$).

---

## 3. Good First Issues for External Contributors

Looking to make your first contribution? Here are three scoped, high-impact tasks designed for newcomers:

### GFI-01: Add Biome-Specific Heat Capacity Modifiers
- **Objective:** Extend `BoundaryFluxVector` or `ThermodynamicStateVector` to account for variable specific heat capacities across different biomes (e.g., Tundra vs. Tropical Rainforest).
- **Files to Modify:** `src/thermodynamics/types.ts`, `src/thermodynamics/thermodynamic_structure.ts`
- **Skills Needed:** TypeScript, basic thermodynamics.

### GFI-02: Implement a Mock Radiative Feedback Monad
- **Objective:** Write a pure functional monad that adjusts incoming solar radiation based on atmospheric cloud-cover percentages.
- **Files to Create/Modify:** `src/thermodynamics/radiative_feedback.ts`
- **Skills Needed:** TypeScript, functional programming.

### GFI-03: Write Additional Edge-Case Unit Tests
- **Objective:** Expand `tests/sprint_010.test.ts` to simulate extreme thermal shock scenarios and verify that `assertSecondLaw` successfully intercepts negative entropy generation.
- **Files to Modify:** `tests/sprint_010.test.ts`
- **Skills Needed:** TypeScript, Jest / Node test runner.

---

## 4. Extension Points: Building New Monads & WebGL Shaders

The Web of Life engine is built around composable monads and real-time WebGL visualization pipelines. Here is how you can extend the system:

### 4.1 Building a Custom Thermodynamic Monad
To create a new metabolic or biogeochemical cycle that respects thermodynamics:
1. Implement the `IThermodynamicSystem` interface:
   ```typescript
   import { IThermodynamicSystem, ThermodynamicStateVector } from './thermodynamics/types';

   export class CustomCycleSystem implements IThermodynamicSystem {
     getStateVector(): ThermodynamicStateVector {
       // Return current thermodynamic state
     }
     computeEntropyGeneration(dt: number): number {
       // Return internal entropy generation rate [W/K]
     }
     verifySecondLaw(): boolean {
       return true;
     }
   }
   ```
2. Pass your system outputs into `evaluateThermodynamicState` and wrap execution with `assertSecondLaw`.

### 4.2 Extending WebGL Shaders for Thermodynamic Visualization
We render real-time entropy and exergy destruction heatmaps using WebGL. To hook into the shader pipeline:
1. Navigate to `src/shaders/` (or your rendering pipeline directory).
2. Bind the `exergyDestructionRate` from your `ThermodynamicStateVector` to a uniform variable in your fragment shader:
   ```glsl
   uniform float u_exergyDestruction;
   
   void main() {
     // Map exergy destruction rate to a thermodynamic color gradient (e.g., cool blue to intense thermal red)
     vec3 color = mix(vec3(0.0, 0.5, 1.0), vec3(1.0, 0.2, 0.0), clamp(u_exergyDestruction / 1000.0, 0.0, 1.0));
     gl_FragColor = vec4(color, 1.0);
   }
   ```
3. Update your render loop to push state vector metrics to the GPU uniform locations each simulation tick.

---

## 5. Community & Support
- **Repository:** [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Issues & PRs:** Check out our GitHub Issue Tracker for tagged `good-first-issue` items.
- **Testing Reminder:** Always run `npx tsx tests/sprint_010.test.ts` before opening a pull request!