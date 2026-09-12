<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 058 Developer Onboarding & Contributor Guide

Welcome to the **Web of Life** repository! This guide provides onboarding steps for Sprint 058—featuring the **Thermodynamic State Vector Stock Conservation Delta Calculator** (`src/thermodynamics/state_validator.ts`)—and highlights extension points for external contributors wanting to build new monads or WebGL shaders.

---

## 1. Getting Started & Environment Setup

The repository is built with **TypeScript** and **Node.js**. 

### Installation
Clone the repository and install dependencies using `npm`:
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running Tests
To verify your setup and run the test suite for Sprint 058, use `npx tsx`:
```bash
npx tsx tests/sprint_058.test.ts
```
*(Note: Never use Python tools like `pip` or `pytest`. All runtime executions, scripts, and tests run on Node.js and TypeScript via `npx tsx`.)*

---

## 2. Sprint 058 Core Concepts: Thermodynamic State Validation

Sprint 058 introduces mathematical enforcement of the First and Second Laws of Thermodynamics:
- **First Law (Conservation of Matter/Energy):** Net changes in stock quantities over a time step $\Delta t$ must match boundary flux integrations:
  $$\Delta S_i = (J_{\text{in}, i} - J_{\text{out}, i}) \cdot \Delta t$$
- **Second Law (Dissipation & Solar Driving):** External solar inputs and entropy generation bounds are checked against floating-point tolerances ($10^{-9}$).

Explore the implementation in:
- `src/thermodynamics/state_validator.ts`
- `src/thermodynamics/types.ts`
- `tests/sprint_058.test.ts`

---

## 3. Contributor Guide: Building New Monads

The Web of Life monad architecture allows you to encapsulate biological, chemical, or economic transformations safely.

### Step 1: Implement the Monad Interface
Create a new file under `src/monads/` implementing your custom state transition logic:
```ts
import { StateVector } from '../thermodynamics/state_vector';
import { FluxRateMap } from '../thermodynamics/types';
import { StateValidator } from '../thermodynamics/state_validator';

export class CustomMonadProcess {
  public execute(vector: StateVector, fluxes: FluxRateMap, dt: number): StateVector {
    const calculation = StateValidator.calculateExpectedDeltas(vector, fluxes, dt);
    // Apply calculation.expectedDeltas to build your next StateVector
    return vector;
  }
}
```

### Step 2: Add Unit Tests
Create a test file under `tests/sprint_custom.test.ts` verifying your monad's thermodynamic compliance using `npx tsx tests/sprint_custom.test.ts`.

---

## 4. Contributor Guide: Building New WebGL Shaders

For rendering complex ecological webs or real-time thermodynamic dissipation fields on the GPU:

1. **Shader Location:** Place your GLSL fragment/vertex shaders inside `src/shaders/`.
2. **TypeScript Pipeline Integration:** Bind your uniforms (such as `u_fluxRates` and `u_deltaTime`) in the WebGL renderer classes located under `src/rendering/`.
3. **Verification:** Add rendering integration tests ensuring GPU calculations mirror CPU-side `StateValidator` outputs within tolerance limits.

---
*Thank you for contributing to the Web of Life open-source ecosystem!*