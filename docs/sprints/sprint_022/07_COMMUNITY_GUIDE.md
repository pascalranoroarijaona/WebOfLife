<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 022: Contributor Onboarding & Community Guide

Welcome to the **Web of Life** open-source community! Sprint 022 introduces strict thermodynamic state vector interface contracts (`src/thermodynamics/types.ts`) and executable monad transition engines (`src/thermodynamics/methods.ts`). 

This guide walks you through setting up your environment, understanding our thermodynamic monad architecture, and identifying **Good First Issues** for building custom monads and WebGL shaders.

---

## 1. Getting Started

We use **TypeScript** and **Node.js**. Ensure you have Node.js (v18+) installed.

```bash
# Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install dependencies
npm install

# Run the test suite for Sprint 022
npx tsx tests/sprint_022.test.ts
```

---

## 2. Core Architecture: Thermodynamic Monads

The simulation engine models planetary metabolism using monadic state transitions constrained by the First and Second Laws of Thermodynamics:
- **First Law ($\Delta U = Q - W$):** Guarantees conservation of mass and energy across carbon, nitrogen, phosphorus, and water cycles.
- **Second Law ($\dot{S}_{\text{gen}} \ge 0$):** Enforces irreversible entropy generation and exergy destruction ($\dot{I} = T_0 \dot{S}_{\text{gen}}$).

---

## 3. Good First Issues & Extension Points

### 3.1 Building a New Thermodynamic Monad
If you want to contribute a new biogeochemical cycle or subsystem (e.g., Sulfur Cycle), you must implement the `IThermodynamicProcessContract`:

**Extension Point:** `src/cycles/sulfur.ts`
```typescript
import { 
  IThermodynamicStateVector, 
  IThermodynamicMonadTransition, 
  IThermodynamicProcessContract 
} from '../thermodynamics/types';

export class SulfurCycleProcess implements IThermodynamicProcessContract {
  public executeTransition(
    currentState: IThermodynamicStateVector, 
    dt: number
  ): IThermodynamicMonadTransition {
    // TODO: Implement sulfur oxidation/reduction mass-energy balance
    throw new Error("Method not implemented.");
  }

  public validateFirstLaw(transition: IThermodynamicMonadTransition): boolean {
    // TODO: Implement elemental sulfur mass conservation check
    return true;
  }

  public validateSecondLaw(transition: IThermodynamicMonadTransition): boolean {
    // TODO: Assert entropy generation >= 0
    return transition.metrics.internal_entropy_generation_rate >= 0;
  }
}
```
* **Good First Issue #22-A:** Implement `SulfurCycleProcess` adhering strictly to `IThermodynamicProcessContract` and verify it with a dedicated test in `tests/sprint_022_sulfur.test.ts`.

---

### 3.2 Building New WebGL Shaders for Thermodynamic Visualization
To visualize real-time exergy destruction ($\dot{I}$) and entropy generation ($\dot{S}_{\text{gen}}$) across planetary grids, you can contribute custom WebGL fragment shaders.

**Extension Point:** `src/shaders/exergy_fragment.glsl`
```glsl
precision highp float;

uniform sampler2D u_entropyGenerationTexture;
uniform float u_referenceTemperatureT0;
varying vec2 v_uv;

void main() {
    float s_gen = texture2D(u_entropyGenerationTexture, v_uv).r;
    float exergy_destruction_rate = u_referenceTemperatureT0 * s_gen;
    
    // Map exergy destruction rate to a thermodynamic heat map (Blue -> Red)
    vec3 heatMapColor = mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 0.0), clamp(exergy_destruction_rate / 1000.0, 0.0, 1.0));
    gl_FragColor = vec4(heatMapColor, 1.0);
}
```
* **Good First Issue #22-B:** Create a WebGL rendering pipeline wrapper in `src/rendering/exergy_shader.ts` that binds `IEntropyGenerationMetrics.exergy_destruction_rate` to GPU uniforms for real-time visualization.

---

## 4. Submitting Your Contribution
1. Fork the repository (`https://github.com/pascalranoroarijaona/WebOfLife`).
2. Create your feature branch (`git checkout -b feature/amazing-monad`).
3. Run your tests locally (`npx tsx tests/sprint_022.test.ts`).
4. Open a Pull Request detailing how your contribution upholds the First and Second Laws of Thermodynamics!