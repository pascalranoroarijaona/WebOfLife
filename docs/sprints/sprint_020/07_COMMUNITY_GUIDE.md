<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 20 Developer Onboarding & Contributor Guide: Thermodynamic State Vectors & Monad Integration

Welcome to the **Web of Life** developer community! This guide serves as your onboarding manual for **Sprint 20**, where we introduce rigorous thermodynamic state vector interfaces (`src/thermodynamics/types.ts`) and monad process execution models (`src/thermodynamics/thermodynamic_monad_process.ts`). 

Our simulation engine models planetary-scale biogeochemical metabolism under strict physical laws: the **First Law of Thermodynamics** (energy/mass conservation) and the **Second Law of Thermodynamics** (non-negative entropy generation, $\dot{S}_{\text{gen}} \ge 0$).

---

## 1. Quick Start & Environment Setup

The Web of Life repository is built on **TypeScript** and **Node.js**. 

### Installation
Clone the repository and install dependencies using `npm`:
```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

### Running the Test Suite
We validate all simulation mechanics and thermodynamic invariants using automated test suites via `npx tsx`. To run the Sprint 20 verification tests:
```bash
npx tsx tests/sprint_020.test.ts
```
*(Do not use `pytest` or `pip install`; this is a pure TypeScript/Node.js environment.)*

---

## 2. Core Architecture: Thermodynamics & Monads

Sprint 20 establishes strict TypeScript contracts governing energy transformations and biochemical monad transitions.

### 2.1 The Thermodynamic State Vector
Every pod or planetary subsystem maintains a `ThermodynamicStateVector` (`src/thermodynamics/types.ts`):
```ts
export interface ThermodynamicStateVector {
  internalEnergy: number;          // Joules (J)
  entropy: number;                 // Joules / Kelvin (J/K)
  referenceTemperature: number;    // Kelvin (K), e.g., 288.15 K
  entropyGenerationRate: number;   // Watts / Kelvin (W/K) -> S_dot_gen >= 0
  exergyDestructionRate: number;   // Watts (W) -> I = T_0 * S_dot_gen
  boundaryFlux: ThermodynamicBoundaryFlux;
  timestamp: number;
}
```

### 2.2 Enforcing the Second Law in Monads
When biochemical or elemental monads (Carbon, Nitrogen, Phosphorus, Water cycles) execute state transitions via `stepThermodynamicMonad` (`src/thermodynamics/thermodynamic_monad_process.ts`), entropy generation is calculated and validated:
$$\dot{S}_{\text{gen}} = \frac{dS_{\text{sys}}}{dt} - \sum_k \frac{\dot{Q}_k}{T_k} - \sum_i \dot{m}_i s_i \ge 0$$

If $\dot{S}_{\text{gen}} < 0$, the monad transition rejects the state change, preventing thermodynamic violations.

---

## 3. Good First Issues & Contributor Extension Points

Want to contribute to the Web of Life? Here are two designated entry points for external contributors looking to build new monads or WebGL shaders.

### 3.1 Good First Issue 1: Implementing a Custom Biogeochemical Monad
* **Objective**: Create a new elemental cycle monad (e.g., Sulfur or Iron cycle) that implements energy coupling with the thermodynamic state vector.
* **Extension Point**: `src/monads/` or `src/thermodynamics/thermodynamic_monad_process.ts`.
* **Task Description**:
  1. Define a new stock transfer matrix representing sulfur oxidation/reduction.
  2. Calculate the reaction enthalpy $\Delta H_{\text{reaction}}$ and map it directly into internal energy shifts ($\Delta U$).
  3. Ensure that internal entropy generation accounts for biological irreversibilities, passing `stepThermodynamicMonad`.
* **Testing**: Add a unit test in `tests/sprint_020.test.ts` verifying mass conservation ($\sum \Delta M_i = 0$) and Second Law compliance.

### 3.2 Good First Issue 2: WebGL Thermodynamic Heat Dissipation Shader
* **Objective**: Build a real-time WebGL fragment shader that visualizes planetary exergy destruction rate ($\dot{I} = T_0 \dot{S}_{\text{gen}}$) across simulated pods.
* **Extension Point**: `src/shaders/` or client rendering pipelines.
* **Task Description**:
  1. Bind the `exergyDestructionRate` property from `ThermodynamicStateVector` to a WebGL uniform buffer object.
  2. Write a fragment shader that color-maps exergy dissipation (thermal hotspots where $\dot{I}$ is high due to metabolic activity or radiative degradation).
  3. Expose a toggle in the UI / canvas controller to switch between temperature, entropy generation, and exergy views.

---

## 4. Submitting Your Contribution

1. Fork the repository on GitHub: `https://github.com/pascalranoroarijaona/WebOfLife`
2. Create your feature branch: `git checkout -b feature/sprint20-sulfur-monad`
3. Commit your changes following conventional commits.
4. Run the test suite: `npx tsx tests/sprint_020.test.ts`
5. Open a Pull Request detailing how your contribution upholds the First and Second Laws of Thermodynamics!