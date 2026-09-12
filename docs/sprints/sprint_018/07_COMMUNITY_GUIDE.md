<!-- DevRel Onboarding & Contributor Guide -->
# Sprint 018 Contributor & Onboarding Guide: Thermodynamic State Vectors & Nonequilibrium Exergy Accounting

Welcome to the **Web of Life** developer community! In **Sprint 018**, we formalize strict type safety and mathematical contracts for planetary metabolism, implementing rigorous tracking of internal entropy generation ($\dot{S}_{\text{gen}}$), exergy destruction ($\dot{I} = T_0 \dot{S}_{\text{gen}}$), and elemental mass-energy conservation ($C, N, P, \text{H}_2\text{O}$).

This guide will help you set up your development environment, understand the core thermodynamic abstractions, and point you toward **Good First Issues** if you want to build custom monads or WebGL shaders.

---

## 1. Quickstart & Development Environment Setup

Web of Life is built using **TypeScript** and **Node.js**. 

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/pascalranoroarijaona/WebOfLife.git
   cd WebOfLife
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Run the Test Suite (Sprint 018):**
   ```bash
   npx tsx tests/sprint_018.test.ts
   ```

---

## 2. Core Architecture: Thermodynamic Monads

In `src/thermodynamics/types.ts` and `src/thermodynamics/thermodynamic_monad_process.ts`, we define the immutable state vector and boundary flux interface contracts:

```typescript
export interface ThermodynamicStateVector {
  time: number;
  temperature: number;
  ambientTemperature: number;
  internalEnergy: number;
  entropy: number;
  exergy: number;
  elementalStocks: [number, number, number, number]; // [C, N, P, H2O]
  boundaryFluxes: BoundaryFluxVector;
  entropyGenerationRate: number;      // S_gen_dot >= 0 (Second Law)
  exergyDestructionRate: number;    // I_dot = T_0 * S_gen_dot (Gouy-Stodola)
}
```

Every simulation step passes through the `ThermodynamicMonadProcess.step()` method, enforcing:
1. **First Law:** Mass-energy conservation across boundary fluxes.
2. **Second Law:** Non-negative entropy generation ($\dot{S}_{\text{gen}} \ge 0$).
3. **Gouy-Stodola Theorem:** Exact exergy destruction quantification.

---

## 3. Good First Issues & Contribution Opportunities

We are actively looking for external contributors to expand our biogeochemical monad library and real-time visualization pipelines. 

### Issue #1801: Implement a Denitrification Biogeochemical Monad
* **Difficulty:** Good First Issue
* **Target Module:** `src/thermodynamics/monads/denitrification_monad.ts`
* **Description:** Create a subclass of `ThermodynamicMonadProcess` that simulates anaerobic microbial nitrate reduction ($NO_3^- \rightarrow N_2$). You must calculate the specific enthalpy of reaction, account for carbon oxidation coupling, and ensure $\dot{S}_{\text{gen}} \ge 0$ is strictly satisfied under low-oxygen boundary conditions.
* **Verification:** Write unit tests in `tests/sprint_018_denitrification.test.ts` and execute via `npx tsx tests/sprint_018_denitrification.test.ts`.

### Issue #1802: WebGL Exergy Destruction Heatmap Shader
* **Difficulty:** Intermediate
* **Target Module:** `src/renderer/shaders/exergy_destruction.frag`
* **Description:** Build a fragment shader that takes the `exergyDestructionRate` and `entropyGenerationRate` fields from the `ThermodynamicStateVector` buffer and renders a real-time false-color thermal dissipation heatmap across the planetary grid.
* **Verification:** Run the visual integration test suite using `npx tsx tests/sprint_018_webgl.test.ts`.

---

## 4. Submitting Your Contribution

1. Create a feature branch: `git checkout -b feature/sprint-018-your-feature-name`
2. Implement your monad or shader, ensuring strict adherence to TypeScript types.
3. Run tests locally:
   ```bash
   npx tsx tests/sprint_018.test.ts
   ```
4. Push to your fork and submit a Pull Request against `main`.

Happy coding, and welcome to the Web of Life community!