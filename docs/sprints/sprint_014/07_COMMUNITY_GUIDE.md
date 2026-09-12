<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 014 Community & Contributor Onboarding Guide

Welcome to the **Web of Life** developer community! In Sprint 014, we introduce the **Thermodynamic State Vector Interface** (`src/thermodynamics/types.ts`), enforcing strict adherence to the First and Second Laws of Thermodynamics across all biogeochemical cycles (Carbon, Nitrogen, Phosphorus, and Water).

Whether you are building custom monads or authoring high-performance WebGL shaders to visualize entropy dissipation, this guide will get you up to speed with our TypeScript/Node.js architecture.

---

## 1. Environment Setup & Getting Started

Our codebase is written entirely in TypeScript and runs on Node.js. 

> **CRITICAL CONSTRAINTS:** 
> - **NEVER** use `pip install` or `pytest`. 
> - Always use `npm install` for dependency management.
> - Execute test suites using `npx tsx tests/sprint_N.test.ts`.

### Quickstart Commands
```bash
# Clone the official repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install dependencies using npm
npm install

# Run the Sprint 014 thermodynamic test suite
npx tsx tests/sprint_014.test.ts
```

---

## 2. Good First Issues for External Contributors

If you are looking to contribute to the thermodynamic subsystems or visualization layers, here are three curated "Good First Issues":

### Issue 1: Implement Radiative Mismatch Dissipation Sub-class
- **Module:** `src/thermodynamics/cycles/radiative_dissipation.ts`
- **Objective:** Extend `BaseThermodynamicSystem` to compute entropy generation caused by incoming shortwave solar radiation ($5778\text{ K}$) converting to outgoing longwave thermal radiation ($288\text{ K}$).
- **Acceptance Criteria:** Must pass $\dot{S}_{\text{gen}} \ge 0$ invariants across a 24-hour diurnal cycle test.

### Issue 2: Custom Thermodynamic Monad Combinator
- **Module:** `src/thermodynamics/monads/combinators.ts`
- **Objective:** Implement a `chain` or `flatMap` method on `ThermodynamicStateMonad` allowing sequential biogeochemical state transformations without mutating underlying state vectors.
- **Acceptance Criteria:** Unit tests verifying immutable state propagation.

### Issue 3: WebGL Entropy Heatmap Shader
- **Module:** `src/shaders/entropy_heatmap.frag`
- **Objective:** Write a WebGL fragment shader that maps local exergy destruction rates ($\dot{I} = T_0 \dot{S}_{\text{gen}}$) across the Gaian Earth Pod surface to a perceptual colormaps (e.g., Inferno or Viridis).

---

## 3. Extension Points: Building New Monads & Shaders

### 3.1 Extending the Thermodynamic Monad
To build a custom biogeochemical cycle that participates in global exergy accounting, extend `BaseThermodynamicSystem` and wrap transitions in `ThermodynamicStateMonad`:

```typescript
import { BaseThermodynamicSystem, ThermodynamicStateMonad } from '../src/thermodynamics/thermodynamic_structure';
import { ThermodynamicStateVector } from '../src/thermodynamics/types';

export class CustomBiogeochemicalCycle extends BaseThermodynamicSystem {
  public computeEntropyGeneration(dt: number): number {
    // Implement Gouy-Stodola entropy generation calculation
    const heatDissipation = 150.0; // Watts
    const temp = this.state.temperature;
    return (heatDissipation / temp) * dt;
  }

  protected calculateExergyEfficiency(): number {
    return 0.75; // Example thermodynamic efficiency
  }
}
```

### 3.2 Registering WebGL Shaders
When visualizing thermodynamic metrics, bind your shaders to the simulation tick loop:

```typescript
import { ThermodynamicMetrics } from '../src/thermodynamics/types';

export function updateEntropyShaderUniforms(gl: WebGLRenderingContext, program: WebGLProgram, metrics: ThermodynamicMetrics) {
  const sGenLocation = gl.getUniformLocation(program, "u_entropyGenerationRate");
  const iDestLocation = gl.getUniformLocation(program, "u_exergyDestructionRate");

  gl.uniform1f(sGenLocation, metrics.entropyGenerationRate);
  gl.uniform1f(iDestLocation, metrics.exergyDestructionRate);
}
```

---

## 4. Running Tests

Verify your contributions locally before opening a Pull Request:

```bash
# Run all sprint verification suites
npx tsx tests/sprint_014.test.ts
```

Happy coding, and welcome to the Web of Life open-source community!