<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 21 Developer Relations & Community Contribution Guide

Welcome to the **Web of Life** open-source initiative! In Sprint 21, we formalize our thermodynamic runtime via strict TypeScript interface contracts (`src/thermodynamics/types.ts`), embedding the First and Second Laws of Thermodynamics directly into our monad execution pipelines.

This guide provides everything you need to onboard onto the new thermodynamic architecture, write custom monads, extend WebGL shaders, and run our test suites.

---

## 1. Getting Started & Setup

Before writing any code, ensure your local development environment is synced with the official repository:

```bash
# Clone the official repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install dependencies (Node.js & TypeScript stack)
npm install
```

### Running Tests
We enforce strict thermodynamic laws. You can verify your changes at any time by running our test runner via `npx tsx`:

```bash
npx tsx tests/sprint_021.test.ts
```

---

## 2. Architecture Overview: Thermodynamic Monads

In Sprint 21, every ecological or biochemical state transition is wrapped inside a `ThermodynamicMonad`. This ensures that:
1. **Energy Conservation (1st Law)** is tracked across system boundaries.
2. **Entropy Generation ($\dot{S}_{\text{gen}} \ge 0$, 2nd Law)** is mathematically enforced.
3. **Exergy Destruction ($\dot{I} = T_0 \dot{S}_{\text{gen}}$)** is computed via the Gouy-Stodola theorem.

```typescript
import { IThermodynamicStateVector, IThermodynamicMonadPayload } from '../src/thermodynamics/types';
import { ThermodynamicMonad } from '../src/thermodynamics/thermodynamic_monad_process';
```

---

## 3. "Good First Issues" for External Contributors

If you are looking to make your first contribution to the Web of Life repository, pick up one of these guided issues:

### Issue #GFI-21-01: Nitrogen Fixation Thermodynamic Vector
* **Description:** Implement a thermodynamic computation function for biological nitrogen fixation ($N_2 + 8H^+ + 8e^- + 16ATP \rightarrow 2NH_3 + H_2 + 16ADP + 16P_i$).
* **File to modify:** Create `src/thermodynamics/processes/nitrogen_fixation.ts`
* **Acceptance Criteria:** Must calculate $\dot{S}_{\text{gen}} \ge 0$ and pass boundary heat/mass fluxes into an `IThermodynamicStateVector`.

### Issue #GFI-21-02: WebGL Shader Temperature Heatmap Integration
* **Description:** Extend our WebGL renderer to visualize surface exergy destruction rates ($\dot{I}$) as a dynamic thermal colormap overlay.
* **File to modify:** `src/renderer/shaders/exergy_heatmap.frag`
* **Acceptance Criteria:** Shader must consume the `exergyDestructionRate` uniform buffer array and render gradients from blue ($\dot{I} \approx 0$) to bright red/white ($\dot{I} \gg 0$).

---

## 4. Extension Points: How to Build a New Monad

Want to introduce a brand-new biogeochemical cycle (e.g., Sulfur or Phosphorus)? Follow this standard pattern:

1. **Define Your Stock Interface:**
   ```typescript
   export interface IPhosphorusStock {
     readonly labilePoolKg: number;
     readonly adsorbedPoolKg: number;
     readonly organicPoolKg: number;
   }
   ```

2. **Write the Thermodynamic Transition Function:**
   ```typescript
   import { IThermodynamicStateVector, FluxType, IBoundaryFlux } from '../src/thermodynamics/types';

   export function computePhosphorusWeatheringThermodynamics(
     prevState: IThermodynamicStateVector,
     weatheringWatts: number,
     tempKelvin: number
   ): IThermodynamicStateVector {
     const T_0 = prevState.referenceTemperatureKelvin;
     const entropyGen = Math.abs(weatheringWatts / tempKelvin) * 0.05;
     
     return {
       ...prevState,
       entropyGenerationRate: entropyGen,
       exergyDestructionRate: T_0 * entropyGen,
       boundaryFluxes: [
         {
           id: `flux-weathering-${Date.now()}`,
           type: FluxType.CHEMICAL_ENDBEAU,
           magnitudeWatts: weatheringWatts,
           boundaryTemperatureKelvin: tempKelvin,
           timestamp: performance.now()
         }
       ]
     };
   }
   ```

3. **Wrap in `ThermodynamicMonad` and Test:**
   Write your unit test in `tests/sprint_021_phosphorus.test.ts` and execute:
   ```bash
   npx tsx tests/sprint_021_phosphorus.test.ts
   ```

---

## 5. Contributing Guidelines
- Always verify that `entropyGenerationRate >= 0`. Throwing a `SecondLawViolationError` is expected behavior when physical bounds are violated.
- Maintain strict typing (`readonly` modifiers on state vector interfaces).
- Submit pull requests against the `main` branch of [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife).