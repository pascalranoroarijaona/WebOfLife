<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 053 Contributor Guide: Thermodynamic State Vector Stock Conservation Asserter

Welcome to the **Web of Life** developer community! This guide provides everything you need to know about onboarding onto **Sprint 053**, utilizing the new Thermodynamic State Vector Stock Conservation Asserter (`src/thermodynamics/state_validator.ts`), and extending the architecture with your own custom monads or WebGL shaders.

---

## 1. Getting Started

Before diving into development, ensure your environment is set up correctly. The Web of Life repository is built entirely on **TypeScript and Node.js**.

### Installation & Test Execution

```bash
# Clone the repository
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife

# Install dependencies using npm
npm install

# Run the Sprint 053 validation test suite
npx tsx tests/sprint_053.test.ts
```

*Note: Never use Python packaging tools (`pip install`, `pytest`) for this repository. All core simulation logic, verification tests, and asset pipelines operate inside a Node.js/TypeScript toolchain.*

---

## 2. Sprint 053 Overview: `StateValidator`

Sprint 053 introduces rigorous physical law enforcement via the `StateValidator` class (`src/thermodynamics/state_validator.ts`). As biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water) execute across monad process chains, numerical drift or mass-leak bugs can compromise simulation fidelity. 

The `StateValidator` guarantees compliance with:
- **First Law of Thermodynamics (Conservation of Mass/Energy):** Verifies that inventory stock deltas over discrete time steps ($\Delta S$) balance against incoming and outgoing boundary fluxes ($\sum F_{\text{net}} \cdot \Delta t$) within configurable tolerance bounds ($\epsilon$).
- **Second Law of Thermodynamics (Entropy & Solar Driver):** Tracks energy flows, ensuring energy enters exclusively via solar radiation (`ThermodynamicStructure`) and dissipates as radiative heat.

### Core Interface Contract

```typescript
import { StateVector, BoundaryFluxRates, ValidationResult } from './src/thermodynamics/types';
import { StateValidator } from './src/thermodynamics/state_validator';

const validator = new StateValidator(1.0e-6); // Default tolerance epsilon

const previousState: StateVector = {
  timestamp: 0,
  stocks: new Map([['carbon', 100.0]])
};

const currentState: StateVector = {
  timestamp: 10,
  stocks: new Map([['carbon', 105.0]])
};

const fluxes: BoundaryFluxRates = {
  fluxes: new Map([['carbon', 0.5]]) // 0.5 units/sec * 10s = 5.0 delta
};

// Throws an Error if conservation is violated beyond tolerance
validator.assertConservation(previousState, currentState, fluxes, 10);
```

---

## 3. Good First Issues for External Contributors

Looking to make your first contribution to Web of Life? Here are three well-scoped tasks designed to familiarize you with the codebase:

### Issue 01: Implement a Denitrification Monad Process
- **Description**: Create a new thermodynamic monad in `src/monads/denitrification.ts` that converts Soil Nitrate ($NO_3^-$) to Dinitrogen gas ($N_2$) under anaerobic conditions.
- **Acceptance Criteria**: 
  - Must inherit or implement `ThermodynamicMonadProcess`.
  - Must report accurate boundary fluxes to integrate cleanly with `StateValidator`.
  - Must include a unit test in `tests/sprint_053_denitrification.test.ts`.

### Issue 02: Add Custom Conservation Warning Hook Logger
- **Description**: Extend `src/earth_pod.ts` to register a custom hook on `StateValidator` via `registerConservationHook(...)` that logs warnings to a dedicated telemetry stream rather than throwing immediate fatal errors during soft exploratory runs.
- **Acceptance Criteria**: 
  - Hook captures non-fatal deviations within a secondary tolerance band ($1.0\times 10^{-5}$).
  - Outputs structured JSON log lines.

### Issue 03: WebGL Shader for Thermal Dissipation Heat Mapping
- **Description**: Build a fragment shader (`src/shaders/thermal_dissipation.frag.glsl`) that visually renders long-wave thermal radiation emission ($E_{\text{heat}}$) across the EarthPod surface grid.
- **Acceptance Criteria**: 
  - Shader compiles successfully in the WebGL rendering pipeline.
  - Color gradient accurately reflects heat flux magnitude mapped from `StateVector` thermal stocks.

---

## 4. Extension Points: Building New Monads & Shaders

### Building a Custom Monad
To create a new biogeochemical or physical monad:
1. Implement the `ThermodynamicMonadProcess` interface.
2. Define input and output species keys matching the global `StateVector` schema.
3. Emit boundary flux records for any exchange crossing the `EarthPod` boundary.
4. Run verification tests using `npx tsx tests/sprint_053.test.ts`.

### Adding WebGL Shaders
Visualizations of thermodynamic state vectors are rendered via WebGL. Place your vertex and fragment shaders in `src/shaders/`, wire them into the render loop in `src/renderer/`, and bind simulation stock arrays as WebGL textures to visualize real-time ecological dynamics.

---
*Happy coding, and welcome to the Web of Life open-source community!*