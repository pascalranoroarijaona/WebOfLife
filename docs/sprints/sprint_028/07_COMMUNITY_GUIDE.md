<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 028 Community Onboarding & Contributor Guide

Welcome to the **Web of Life** developer community! This guide covers our TypeScript/Node.js architecture updates introduced in **Sprint 028** (Thermodynamic State Vector Validation, Spatial Equilibrium, Trophic Cascades, and Thermodynamic Ledger Stabilization). 

Whether you are looking to build custom Monads or design high-performance WebGL shaders for spatial nutrient visualization, this document provides the exact tooling, instructions, and extension points you need.

---

## 🚀 Quickstart & Environment Setup

We use **TypeScript** and **Node.js** exclusively. **Never use Python (`pip` or `pytest`)** for this repository. 

### 1. Clone and Install Dependencies
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### 2. Run the Test Suite
Verify your installation and run the Sprint 028 test suite using `npx tsx`:
```bash
npx tsx tests/sprint_028.test.ts
```

---

## 🛠️ Sprint 028: Key Architectural Additions

In Sprint 028, we added strict thermodynamic and spatial enforcement wrappers:
- **`src/thermodynamics/state_validator.ts`**: Validates property existence and ensures entropy fields are non-negative prior to executing monad step transformations.
- **`IThermodynamicLedger`**: Enforces conservation of mass ($\Delta M = 0$) and tracks Second Law entropy generation ($\Delta S \ge \frac{Q}{T}$).
- **`BiomePatch` & `DetritivoreMonad`**: Implements closed-loop organic matter cycling, ensuring zero mass loss upon organismal death.

---

## 💡 Good First Issues for External Contributors

If you want to make your first contribution to the Web of Life, pick up one of these curated tasks:

### Issue 1: Implement an Autotrophic Monad Validation Hook
- **Goal:** Write a custom TypeScript validation hook inside `src/monads/autotroph.ts` utilizing `state_validator.ts` to guarantee that carbon assimilation rates never exceed localized `SunlightReceptor` capacities.
- **Where to look:** `src/thermodynamics/state_validator.ts` and existing monad definitions under `src/monads/`.
- **Verification:** Create a test in `tests/sprint_028_autotroph.test.ts` and run via `npx tsx tests/sprint_028_autotroph.test.ts`.

### Issue 2: Extend the Thermodynamic Ledger for Pressure-Volume Work
- **Goal:** Update `IThermodynamicLedger` and its concrete implementation to accept volumetric expansion work ($P \cdot dV$) alongside radiative heat loss ($Q$).
- **Where to look:** `src/thermodynamics/ledger.ts`.

---

## 🧬 Extension Point: Building Custom Monads

To build a custom monad (e.g., a migratory apex predator or a specialized mycorrhizal network), extend our core monad structure and wrap your state transitions with the thermodynamic validator:

```typescript
import { ElementalStocks } from '../thermodynamics/stocks';
import { ThermodynamicLedger } from '../thermodynamics/ledger';
import { validateStateVector } from '../thermodynamics/state_validator';

export class MycorrhizalMonad {
  public static step(stocks: ElementalStocks, ledger: ThermodynamicLedger): ElementalStocks {
    // 1. Assert valid input state
    validateStateVector(stocks);

    // 2. Perform metabolic calculations
    const transferred = new ElementalStocks(
      stocks.carbon * 0.05,
      stocks.nitrogen * 0.08,
      stocks.phosphorus * 0.1,
      0.0
    );

    // 3. Record thermodynamic dissipation
    ledger.record_dissipation(transferred.carbon * 5.2, 298.15);

    return stocks;
  }
}
```

---

## 🎨 Extension Point: WebGL Shaders for Spatial Gradients

Spatial nutrient pools and entropy accumulation can be visualized in real-time using our WebGL pipeline. 

### Writing a Custom Nutrient Diffusion Fragment Shader
Create your fragment shader under `src/shaders/nutrients.frag.glsl`:

```glsl
precision highp float;
uniform sampler2D u_nutrientTexture;
uniform vec2 u_resolution;
varying vec2 v_uv;

void main() {
    vec4 currentNutrient = texture2D(u_nutrientTexture, v_uv);
    // Apply local diffusion and consumption gradient calculation
    float localEntropy = currentNutrient.r * 1.05;
    gl_FragColor = vec4(currentNutrient.rgb, localEntropy);
}
```

Compile and test your shader bindings using:
```bash
npx tsx tests/sprint_028_shaders.test.ts
```

---

## 🤝 Community & Support
- **Repository:** [https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)
- **Issues & PRs:** Please reference the relevant sprint RFC (e.g., `RFC 028`) in your pull request description.