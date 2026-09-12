<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 011 Community & Contributor Guide: Thermodynamic State Vector Architecture

Welcome, Contributors and Simulation Engineers! 

Sprint 011 introduces the **Thermodynamic State Vector Interface** (`src/thermodynamics/types.ts`) and functional state propagation monads (`src/thermodynamics/thermodynamic_structure.ts`). This guide will help you onboard onto our TypeScript/Node.js simulation engine, understand how we enforce strict physical laws (First & Second Law of Thermodynamics), and guide you through building your first custom thermodynamic monad or contributing a new WebGL shader integration.

---

## 1. Getting Started & Setup

Before contributing, ensure your development environment is ready. Our repository is strictly TypeScript and Node.js (`https://github.com/pascalranoroarijaona/WebOfLife`). 

```bash
# Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install dependencies using npm (Never use pip!)
npm install
```

### Running Tests
To verify your environment and run the Sprint 011 thermodynamic validation tests, execute:
```bash
npx tsx tests/sprint_11.test.ts
```

---

## 2. Architecture Overview: The Thermodynamic State Monad

All planetary pods, biogeochemical cycles, and industrial systems in **Web Of Life** must conform to thermodynamic laws. We use a functional monad pattern (`ThermodynamicStateMonad`) to ensure that state transformations are pure, immutable, and strictly validated against physical invariants.

### Core Files
- **`src/thermodynamics/types.ts`**: Defines `IThermodynamicStateVector`, `ThermalFluxVector`, `MassFluxVector`, and physical constants like `STANDARD_AMBIENT_TEMPERATURE_K` ($288.15\text{ K}$).
- **`src/thermodynamics/thermodynamic_structure.ts`**: Contains `advanceThermodynamicState` and monad-based state propagation enforcing $\dot{S}_{\text{gen}} \ge 0$ and $\dot{I} = T_0 \dot{S}_{\text{gen}}$.

---

## 3. Good First Issues & Extension Points

We invite external contributors to expand the engine's capabilities. Below are curated "Good First Issues" and extension templates.

### Extension Point 1: Building a Custom Biogeochemical Monad
If you want to introduce a new planetary cycle (e.g., Sulfur or Methane cycle), you must pipe its dissipation metrics into our thermodynamic state vector.

**Example: Implementing a Methane Cycle Dissipation Wrapper**
```typescript
import { IThermodynamicStateVector } from '../src/thermodynamics/types';
import { ThermodynamicStateMonad } from '../src/thermodynamics/thermodynamic_structure';

export function simulateMethaneOxidation(
  initialState: IThermodynamicStateVector,
  methaneOxidizedMoles: number,
  dt: number
): IThermodynamicStateVector {
  // Compute internal entropy generation from chemical irreversibility
  const universalGasConstant = 8.314; // J/(mol*K)
  const deltaG_dissipation = 82000; // J/mol (Gibbs free energy dissipated as heat)
  const entropyGenRate = (methaneOxidizedMoles * deltaG_dissipation) / (initialState.referenceTemperature * dt);

  const monad = ThermodynamicStateMonad.of(initialState);

  return monad.map((state) => ({
    ...state,
    timestamp: state.timestamp + dt,
    internalEnergy: state.internalEnergy + (methaneOxidizedMoles * deltaG_dissipation),
    systemEntropy: state.systemEntropy + (entropyGenRate * dt),
    entropyGenerationRate: entropyGenRate,
    exergyDestructionRate: state.referenceTemperature * entropyGenRate
  })).getState();
}
```

### Extension Point 2: WebGL Shader Thermodynamic Heat Visor
We encourage contributors to build WebGL shaders that visualize thermodynamic state vectors in real-time (e.g., coloring planetary pods by exergy destruction rate $\dot{I}$).

**Good First Issue Template: `ExergyHeatmapShader`**
1. Navigate to `src/rendering/shaders/`.
2. Create `exergy_fragment.glsl` that reads `exergyDestructionRate` as a uniform float.
3. Map $\dot{I}$ values from blue (low irreversibility) through green to red (high exergy destruction / thermodynamic waste).

```glsl
// src/rendering/shaders/exergy_fragment.glsl
precision highp float;
uniform float u_exergyDestructionRate;
varying vec2 v_uv;

vec3 heatMap(float t) {
    // Standard RGB heat ramp mapping [0.0, 1.0]
    return clamp(vec3(t * 2.0, 1.0 - abs(t * 2.0 - 1.0), (1.0 - t) * 2.0), 0.0, 1.0);
}

void main() {
    float normalizedExergy = clamp(u_exergyDestructionRate / 10000.0, 0.0, 1.0);
    vec3 color = heatMap(normalizedExergy);
    gl_FragColor = vec4(color, 1.0);
}
```

---

## 4. Contributing Checklist
1. Fork the repository at `https://github.com/pascalranoroarijaona/WebOfLife`.
2. Create a feature branch (`git checkout -b feature/my-new-monad`).
3. Ensure all tests pass using `npx tsx tests/sprint_11.test.ts`.
4. Submit a Pull Request with a clear description of thermodynamic invariants maintained.