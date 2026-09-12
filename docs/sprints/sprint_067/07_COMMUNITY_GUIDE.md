<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 067 Contributor Guide: Thermodynamic State Validator & Open-Source Extension Framework

Welcome to the **Web of Life** repository! This guide provides everything you need to know to get up to speed with Sprint 067—specifically the new **Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper** (`src/thermodynamics/state_validator.ts`)—and outlines how external contributors can build custom monads or WebGL shaders.

---

## 1. Getting Started & Setup

First, ensure you have **Node.js** (v18+ recommended) installed. Clone the repository and install dependencies using npm:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Tests
We enforce strict thermodynamic constraints and verification checks. You can run the test suite for Sprint 067 via `tsx`:

```bash
npx tsx tests/sprint_067.test.ts
```

---

## 2. Sprint 067 Core Feature: `StateValidator`

Sprint 067 introduces deterministic absolute comparison routines to ensure mass and energy conservation across monad transformations. 

### Usage Example (`src/thermodynamics/state_validator.ts`)
```typescript
import { StateVector } from './state_vector';
import { StateValidator } from './thermodynamics/state_validator';

// Initialize validator with a default global tolerance (e.g., 1e-6)
const validator = new StateValidator(1e-6);

const actual = new StateVector({ C: 100.0, H2O: 500.0 });
const expected = new StateVector({ C: 100.000002, H2O: 500.0 });

const result = validator.evaluateDiscrepancy(actual, expected, { C: 1e-5 });
console.log(result.isValid); // true (custom tolerance applied)
```

---

## 3. Good First Issues for External Contributors

Looking to contribute? Here are two beginner-friendly areas mapped out for Sprint 067 extensions:

### Issue A: Extend Custom Tolerance Overrides in `StateValidator`
* **Objective**: Add support for relative tolerance thresholds alongside absolute tolerances.
* **Extension Point**: Modify `src/thermodynamics/state_validator.ts` and update `ValidationResult` in `src/thermodynamics/types.ts` to flag error types (absolute vs. relative).
* **Good First Issue Test**: Write test assertions in `tests/sprint_067.test.ts` evaluating relative drift over large magnitudes.

### Issue B: Implement a New Biogeochemical Monad
* **Objective**: Build a sulfur-cycle or iron-redox monad process extending `MonadProcess`.
* **Extension Point**: Create `src/thermodynamics/monads/sulfur_monad.ts` that consumes and produces `StateVector` elements while satisfying First/Second Law constraints validated via `StateValidator`.

---

## 4. Building Custom WebGL Shaders

The *Web of Life* simulation engine renders biological and thermodynamic flux fields via GPU-accelerated WebGL shaders. To contribute a new shader:

1. **Add your GLSL shader source** in `src/shaders/`:
   ```glsl
   // src/shaders/entropy_flux.frag
   precision highp float;
   uniform sampler2D u_stateTexture;
   varying vec2 v_uv;
   
   void main() {
       vec4 state = texture2D(u_stateTexture, v_uv);
       // Compute local dissipation and entropy production
       float entropyFlux = dot(state.rgb, vec3(0.299, 0.587, 0.114));
       gl_FragColor = vec4(vec3(entropyFlux), 1.0);
   }
   ```
2. **Register the shader pipeline** in `src/rendering/shader_manager.ts`.
3. **Verify rendering consistency** by adding an integration test under `tests/`.

---
*Happy coding, and welcome to the Web of Life open-source community!*