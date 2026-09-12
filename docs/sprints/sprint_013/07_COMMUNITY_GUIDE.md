<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 13 Developer Onboarding: Thermodynamic State Vector Interface

Welcome to the **Web of Life** open-source community! In Sprint 13, we introduce the **Thermodynamic State Vector Interface** (`src/thermodynamics/types.ts`). This upgrade hardcodes the First and Second Laws of Thermodynamics directly into our simulation loops, ensuring that all biogeochemical cycles (Carbon, Nitrogen, Phosphorus, and Water) obey strict energy conservation and non-negative entropy generation ($\dot{S}_{\text{gen}} \ge 0$).

Whether you are here to build new biogeochemical monads or author custom WebGL shaders to visualize planetary exergy destruction, this guide will get you set up and contributing in minutes.

---

## 1. Quick Start & Development Setup

Ensure you have **Node.js** installed on your system. Clone the repository and install dependencies using `npm`:

```bash
# Clone the official repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install dependencies
npm install
```

### Running Tests
We use native TypeScript execution for our testing suites. To run the Sprint 13 thermodynamic verification suite:

```bash
npx tsx tests/sprint_13.test.ts
```

---

## 2. Good First Issues for External Contributors

If you are looking for an approachable way to dive into the codebase, consider tackling one of these starter tasks:

### Issue #13.1: Implement Radiative Emissivity Feedback in Water Cycle Shaders
* **Difficulty:** Beginner / Intermediate
* **Area:** `src/thermodynamics/` & WebGL Shaders
* **Description:** Extend the thermal radiation out equation ($\text{thermalRadiationOut} = \varepsilon_{\text{eff}} \sigma A_{\text{surface}} T_s^4$) by factoring in atmospheric water vapor concentrations from `src/cycles/water.ts` to dynamically modulate effective emissivity ($\varepsilon_{\text{eff}}$).
* **Good First File:** `src/thermodynamics/thermodynamic_structure.ts`

### Issue #13.2: Custom Exergy Destruction Logging for Nitrogen Fixation
* **Difficulty:** Beginner
* **Area:** `src/cycles/nitrogen.ts`
* **Description:** Hook up the `IExergyMetrics` interface to nitrogenase enzymatic reactions, calculating specific internal entropy generation rates ($\dot{S}_{\text{gen}}$) tied to ATP consumption during biological nitrogen fixation.
* **Good First File:** `src/cycles/nitrogen.ts`

---

## 3. Extension Points: Building New Monads & Shaders

### 3.1 Implementing a Custom Biogeochemical Monad
To create a new elemental cycle (e.g., Sulfur or Heavy Metals) that adheres to planetary thermodynamic constraints, your class must implement or wrap `IThermodynamicStateVector`:

```typescript
import { IThermodynamicStateVector, IBoundaryFluxArray, IExergyMetrics } from '../src/thermodynamics/types';

export class SulfurCycleMonad implements IThermodynamicStateVector {
  tick: number = 0;
  internalEnergy: number = 1000.0;
  totalEntropy: number = 3.5;
  
  boundaryFluxes: IBoundaryFluxArray = {
    solarInput: 0,
    thermalRadiationOut: 0,
    matterEnthalpyFlux: 10.0,
    netHeatFlux: 5.0
  };

  exergyMetrics: IExergyMetrics = {
    T_0: 288.15,
    entropyGenerationRate: 0.12,
    exergyDestructionRate: 288.15 * 0.12,
    totalExergy: 450.0
  };

  public validateFirstLaw(dt: number, previousEnergy: number): boolean {
    // Implement custom enthalpy conservation check
    return true;
  }

  public validateSecondLaw(): boolean {
    return this.exergyMetrics.entropyGenerationRate >= 0;
  }
}
```

### 3.2 Authoring WebGL Shaders for Exergy Visualization
To render real-time heat maps of exergy destruction ($\dot{I} = T_0 \dot{S}_{\text{gen}}$) across the EarthPod surface, pass your thermodynamic metrics into the fragment shader uniforms:

```glsl
// shaders/exergy_fragment.glsl
precision highp float;

uniform sampler2D u_EntropyGenerationTexture;
uniform float u_T0; // Ambient reference temperature (288.15 K)
varying vec2 v_uv;

void main() {
    float sGen = texture2D(u_EntropyGenerationTexture, v_uv).r;
    float exergyDestruction = u_T0 * sGen; // Gouy-Stodola Theorem
    
    // Map exergy destruction to a false-color thermal gradient
    vec3 heatColor = vec3(exergyDestruction / 50.0, 0.2, 1.0 - (exergyDestruction / 50.0));
    gl_FragColor = vec4(heatColor, 1.0);
}
```

---

## 4. Submitting Your Contribution
1. Fork the repository on GitHub (`https://github.com/pascalranoroarijaona/WebOfLife`).
2. Create your feature branch (`git checkout -b feat/amazing-new-monad`).
3. Commit your changes (`git commit -m 'feat: add sulfur cycle thermodynamic monad'`).
4. Push to the branch (`git push origin feat/amazing-new-monad`).
5. Open a Pull Request against the `main` branch.

Happy coding, and welcome to modeling the thermodynamic Earth!