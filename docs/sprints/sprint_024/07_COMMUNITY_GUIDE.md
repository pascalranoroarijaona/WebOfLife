<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 24 Community Onboarding & Contributor Guide: Thermodynamic State Vectors

Welcome to the **Web of Life** open-source community! In Sprint 24, we formalize the strict TypeScript interface contracts for thermodynamic state vectors, entropy generation rates ($\dot{S}_{\text{gen}}$), exergy destruction rates ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), and boundary flux array structures (`src/thermodynamics/types.ts`).

Whether you are here to build new biogeochemical monads or visualize energy dissipation through WebGL shaders, this guide will orient you to the repository structure, installation protocols, and active extension points.

---

## 1. Quick Start & Development Setup

Our stack is built strictly on **TypeScript** and **Node.js**. 

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the test suite (specifically Sprint 24 verification):**
   ```bash
   npx tsx tests/sprint_024.test.ts
   ```

---

## 2. Architecture Overview: Thermodynamics & Monads

The core simulation engine relies on modular monad transitions governed by the First and Second Laws of Thermodynamics:
- **First Law:** Conservation of energy across system boundaries.
- **Second Law:** Non-negative entropy generation ($\dot{S}_{\text{gen}} \ge 0$) and exergy destruction ($\dot{I} = T_0 \dot{S}_{\text{gen}}$).

Key files added in Sprint 24:
- `src/thermodynamics/types.ts`: Strict TypeScript interfaces (`IThermodynamicStateVector`, `IBoundaryFluxArray`, `IThermodynamicProcessResult`).
- `src/thermodynamics/methods.ts`: Concrete execution algorithms (e.g., `computeThermodynamicProcess`).

---

## 3. Good First Issues for External Contributors

If you are looking for ways to contribute, pick up one of these starter tasks:

### Issue #GFI-24.1: Custom Monad Thermodynamic Binding
- **Description:** Implement a new specialized monad for an anaerobic wetland ecosystem in `src/monads/wetland_monad.ts`.
- **Requirements:** 
  - Implement `IThermodynamicStateVector`.
  - Ensure all chemical transformations satisfy $\dot{S}_{\text{gen}} \ge 0$.
- **Test file:** `tests/sprint_024.test.ts`

### Issue #GFI-24.2: Exergy Destruction WebGL Shader
- **Description:** Create a fragment shader in `src/shaders/exergy_dissipation.frag` that maps `exergyDestructionRate` ($\dot{I}$) onto a color gradient (from blue/low dissipation to bright red/high dissipation).
- **Requirements:** Bind uniform inputs matching `IThermodynamicProcessResult`.

---

## 4. Extension Points for Advanced Contributors

### Building New Monads
To create a custom ecological or biogeochemical monad:
1. Extend the base monad structure.
2. Inject boundary fluxes (`IHeatFlux`, `IMassFlux`, `IRadiationFlux`).
3. Pipe state vectors through `computeThermodynamicProcess(...)` from `src/thermodynamics/methods.ts`.

### Building New WebGL Shaders
To visualize thermodynamic states in real time:
1. Expose `IThermodynamicProcessResult` properties as WebGL uniforms.
2. Register your custom shader pipeline in the rendering engine manager.

---
*Happy coding, and welcome to modeling the Web of Life!*