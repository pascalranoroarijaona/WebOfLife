<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 052 Community & Contributor Onboarding Guide

Welcome to **Web of Life**, an open-source planetary-scale geochemical and biogeochemical simulation engine built with **TypeScript** and **Node.js**. 

Sprint 052 introduces the **Thermodynamic State Vector Stock Conservation Asserter** (`src/thermodynamics/state_validator.ts`), a critical component that enforces the First and Second Laws of Thermodynamics across all simulation steps.

---

## 🚀 Quickstart for New Contributors

To get your local development environment up and running, follow these steps. 

> **CRITICAL NOTICE:** This repository uses **TypeScript** and **Node.js**. Do not attempt to use Python tools (`pip`, `pytest`) as they are incompatible with this codebase.

### 1. Clone & Install Dependencies
Ensure you have Node.js (v18+ recommended) installed on your machine.
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### 2. Run the Test Suite
Verify that your environment is working correctly by executing the sprint test suite using `npx tsx`:
```bash
npx tsx tests/sprint_052.test.ts
```

---

## 🛠️ Core Concepts: The `StateValidator`

The `StateValidator` (`src/thermodynamics/state_validator.ts`) guarantees that system inventory mass and energy changes over discrete simulation intervals ($\Delta t$) strictly adhere to boundary flux rates within numerical tolerances ($\epsilon \le 10^{-6}$).

### Example Usage
```typescript
import { StateValidator, StateVector } from '../src/thermodynamics/state_validator';

const validator = new StateValidator(1e-6);

const preState: StateVector = {
  timestamp: 0,
  stocks: new Map([['C_organic', 1000.0]]),
  enthalpy: 10000,
  entropy: 50
};

const postState: StateVector = {
  timestamp: 1,
  stocks: new Map([['C_organic', 1050.0]]),
  enthalpy: 10050,
  entropy: 51
};

const fluxes = new Map([['C_organic', 50.0]]); // 50 units/time * 1.0 delta time = 50 delta

// Assert conservation or throw an error if violated
validator.assertOrThrow(preState, postState, fluxes, 1.0);
```

---

## 💡 Good First Issues for External Contributors

Looking to make your first contribution? Here are three well-scoped tasks tailored for newcomers:

### 1. Issue #52.1: Implement Nitrogen Fixation Monad Guard
- **Description**: Create a specialized wrapper around `StateValidator` that checks biological nitrogen fixation against energetic ATP consumption limits.
- **Extension Point**: Extend `src/thermodynamics/state_validator.ts` or add a new file `src/thermodynamics/monads/nitrogen_monad.ts`.
- **Testing**: Add unit tests in `tests/sprint_052.test.ts`.

### 2. Issue #52.2: WebGL Shader Uniform Binding for Thermodynamic Heat Dissipation
- **Description**: Expose entropy production values from the `StateValidator` reports into the WebGL rendering pipeline to dynamically color planetary terrain based on thermal stress.
- **Extension Point**: `src/rendering/shaders/thermal_fragment.glsl` and corresponding TypeScript uniform binders in `src/rendering/renderer.ts`.
- **Testing**: Verify shader compilation and buffer binding tests via `npx tsx tests/sprint_052.test.ts`.

### 3. Issue #52.3: Custom Hydrological Tolerance Profiles
- **Description**: Allow dynamic tolerance configuration ($\epsilon$) per elemental stock (e.g., looser tolerance for large water reservoirs, ultra-strict tolerance for trace phosphorus).
- **Extension Point**: Modify the constructor of `StateValidator` to accept a `Map<string, number>` of custom tolerances.
- **Testing**: Write boundary tests verifying that water evaporation drift handles larger epsilon thresholds correctly.

---

## 🤝 Contribution Workflow

1. Fork the repository on GitHub: `https://github.com/pascalranoroarijaona/WebOfLife`
2. Create your feature branch: `git checkout -b feature/amazing-new-monad`
3. Commit your changes: `git commit -m "feat(thermodynamics): add custom nitrogen monad guard"`
4. Push to your branch: `git push origin feature/amazing-new-monad`
5. Open a Pull Request against `main`!

Happy coding, and welcome to the Web of Life community!