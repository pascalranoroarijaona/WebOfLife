<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 012 Community & Developer Onboarding Guide

Welcome to the **Web of Life** developer community! This guide serves as your onboarding manual for **Sprint 012**, where we introduce the **Thermodynamic State Vector Interface** (`src/thermodynamics/types.ts`) and monadic thermodynamic pipelines.

Whether you are looking to build custom biogeochemical monads or hook into our simulation visualization shaders, this document outlines how to get started, run tests, and contribute extensions safely.

---

## 1. Getting Started & Environment Setup

Our codebase is fully written in **TypeScript and Node.js**. 

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Run the Test Suite:**
   To execute the test suite for Sprint 012 (or any specific sprint), use `npx tsx`:
   ```bash
   npx tsx tests/sprint_012.test.ts
   ```
   *(Note: Never use Python tools like `pip` or `pytest`; our entire runtime, simulation engine, and test harness operate strictly within Node.js and TypeScript).*

---

## 2. Good First Issues for External Contributors

If you are a new contributor looking to make your first pull request, consider tackling one of the following scoped tasks:

### Issue #1201: Implementing Custom Boundary Dissipation Monads
- **Objective:** Extend `src/thermodynamics/thermodynamic_structure.ts` by adding a specialized subclass or functional wrapper for radiative greenhouse trapping.
- **Files to touch:** `src/thermodynamics/types.ts`, `src/thermodynamics/thermodynamic_structure.ts`
- **Acceptance Criteria:** Must enforce $\dot{S}_{\text{gen}} \ge 0$ and pass unit assertions in `tests/sprint_012.test.ts`.

### Issue #1202: WebGL Entropy Heatmap Shader Integration
- **Objective:** Hook the exergy destruction rate ($\dot{I} = T_0 \dot{S}_{\text{gen}}$) into our WebGL rendering pipeline to color-code planetary pods by their thermodynamic irreversibility intensity.
- **Files to touch:** `src/rendering/shaders/entropy_fragment.glsl`, `src/simulation/pod_renderer.ts`
- **Acceptance Criteria:** Real-time visual feedback showing high exergy destruction zones over active biological or metabolic boundaries.

---

## 3. Extension Points: Building New Monads & Shaders

### 3.1 Creating a New Monadic Transformation
When building custom ecological processes (e.g., nitrogen fixation or deep-sea hydrothermal venting), you must wrap your transitions in the `ThermodynamicMonad<T>` to preserve the First and Second Laws of Thermodynamics:

```typescript
import { ThermodynamicMonad } from '../thermodynamics/thermodynamic_structure';
import { IThermodynamicStateVector } from '../thermodynamics/types';

// Example custom transformation function
function simulateNitrogenFixation(
  stock: NitrogenStock,
  state: IThermodynamicStateVector
): [NitrogenStock, IThermodynamicStateVector] {
  // Compute stock updates and entropy generation
  const dotSGen = 0.01; // Must be >= 0
  const updatedState = {
    ...state,
    entropyGenerationRate: dotSGen,
    exergyDestructionRate: state.referenceTemperature * dotSGen
  };
  return [{ ...stock, fixedN: stock.fixedN + 1.5 }, updatedState];
}
```

### 3.2 Extending WebGL Shaders for Thermodynamic Fields
Pass custom uniform buffers from `IThermodynamicStateVector` to your WebGL shaders:
```typescript
gl.uniform1f(entropyGenLocation, stateVector.entropyGenerationRate);
gl.uniform1f(exergyDestLocation, stateVector.exergyDestructionRate);