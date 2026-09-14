<!-- DevRel Onboarding & Contributor Guide -->

# Sprint 043 Contributor Guide: Discrete Thermodynamic Invariants & H3 Cell Validation

Welcome to the **Web of Life** contributor guide for Sprint 043! This release introduces formal thermodynamic state invariant verification for discrete hexagonal cells across our planetary grid.

Whether you are a biological modeler, a numerical systems programmer, or a WebGL graphics engineer, this guide will walk you through our architectural standards, local development workflow, and prime contribution extension points.

---

## 1. Project Overview & Sprint 043 Context

The **Web of Life** engine models planetary-scale biosphere dynamics by combining Uber's H3 discrete global grid system with category-theoretic state monads. 

In Sprint 043, we integrated:
- `validateH3CellThermodynamicState`: A pure invariant verification predicate in `src/spatial/h3_state_tensor.ts`.
- Strict physical invariants:
  - **First Law Admissibility**: Mass stocks (atmospheric carbon $C_{\text{atm}}$, soil organic carbon $C_{\text{org}}$, water mass $W$, and trophic biomass stocks $\mathbf{B}$) must satisfy $X_{i, s} \ge -\epsilon_{\text{tol}}$ (where $\epsilon_{\text{tol}} = 10^{-9}$ by default).
  - **Second/Third Law Positivity**: Absolute thermodynamic temperature must be strictly positive ($T_i > 0\,\text{K}$, default floor $T_{\min} = 10^{-3}\,\text{K}$).
  - **Finiteness Guarantee**: Prevention of unphysical $\text{NaN}$, $+\infty$, or $-\infty$ values propagating through the monadic simulation loop.
- `isH3CellThermodynamicallyValid`: A zero-allocation, high-performance boolean guard designed for hot inner integration loops.

Repository: **[https://github.com/pascalranoroarijaona/WebOfLife](https://github.com/pascalranoroarijaona/WebOfLife)**

---

## 2. Developer Quickstart

The project is built entirely with **TypeScript** and **Node.js**.

### Prerequisites
- Node.js (v18.x or v20.x recommended)
- npm (v9.x or higher)

### Setup & Local Verification
Clone the repository and install dependencies:

```bash
git clone https://github.com/pascalranoroarijaona/WebOfLife.git
cd WebOfLife
npm install
```

Execute the Sprint 043 validation test suite:

```bash
npx tsx tests/sprint_043.test.ts
```

To run the complete regression test battery across all previous sprints:

```bash
npx tsx tests/run_all.ts
```

---

## 3. Core Architecture & Pure Predicates

The state tensor is defined in `src/spatial/h3_state_tensor.ts`:

```typescript
export interface IH3CellThermodynamicState {
  readonly cellIndex: string;
  readonly temperatureKelvin: number;
  readonly atmosphericCarbon: number;
  readonly organicCarbon: number;
  readonly biomassStocks: Record<string, number>;
  readonly waterMassKg: number;
  readonly enthalpyJoules: number;
}
```

### Invariant Verification Contract
`validateH3CellThermodynamicState` is a pure function that returns detailed diagnostic telemetry:

```typescript
import { validateH3CellThermodynamicState } from './src/spatial/h3_state_tensor';

const result = validateH3CellThermodynamicState(cellState, {
  tolerance: 1e-9,
  minTemperatureKelvin: 1e-3,
  failFast: false
});

if (!result.isValid) {
  for (const violation of result.violations) {
    console.error(`Cell ${result.cellIndex} invariant failed: ${violation.message}`);
  }
}
```

For performance-critical inner simulation loops where object allocation overhead must be eliminated:

```typescript
import { isH3CellThermodynamicallyValid } from './src/spatial/h3_state_tensor';

if (!isH3CellThermodynamicallyValid(cellState)) {
  // Trigger recovery or flag alert without heap allocations
}
```

---

## 4. Good First Issues & Contributor Extension Points

We actively welcome community contributions! Here are three curated areas where you can jump in immediately.

### Extension Point A: WebGL Shader for Thermodynamic Violation Overlays
* **Track**: WebGL / Shaders / Visualization
* **File Target**: `src/shaders/thermodynamic_anomaly.frag.glsl`
* **Task**: Create a WebGL fragment shader that visualizes cells failing thermodynamic consistency checks.
  * Inputs: Uniforms for cell temperature, normalized violation severity, and violation type flags (`NEGATIVE_STOCK`, `NON_POSITIVE_TEMPERATURE`, `NON_FINITE_VALUE`).
  * Output: Render a thermal glow effect (e.g., pulsing magenta for negative mass sinks, electric cyan for sub-zero temperature violations) overlaying the global hexagonal tessellation.
* **Suggested Next Step**: Open an issue titled `[GLSL] Implement Thermodynamic Invariant Shader Overlay` and reference RFC-043.

### Extension Point B: Conservative Clamping & Recovery Monad
* **Track**: Category-Theoretic Monads / Mathematical Biology
* **File Target**: `src/monads/thermodynamic_recovery_monad.ts`
* **Task**: Build a `ThermodynamicRecoveryMonad` that binds to `SpatialStateMonad`. When `validateH3CellThermodynamicState` produces violations:
  * Non-negative stock violations within $10^{-6}$ should be conservatively projected to zero, logging the numerical discrepancy into a planetary entropy/mass balance register.
  * Temperature deficits are resolved via local thermodynamic relaxation with neighboring H3 cells via `h3_adjacency.ts`.
* **Testing**: Add `tests/monads/recovery_monad.test.ts` ensuring mass conservation is strictly preserved across the cluster during recovery.

### Good First Issue C: Localized Invariant Breach Telemetry Exporter
* **Track**: Developer Experience / Observability
* **File Target**: `src/spatial/validation_telemetry.ts`
* **Task**: Implement a reporter function `exportViolationSummary(results: ThermodynamicValidationResult[]): DiagnosticReport` aggregating violation frequency by H3 resolution and trophic tier.
* **Requirements**: Pure TypeScript, zero external runtime dependencies, 100% test coverage via `npx tsx`.

---

## 5. Submitting Your Contribution

1. **Fork and Branch**: Create a descriptive feature branch:
   ```bash
   git checkout -b feature/glsl-thermo-overlay
   ```
2. **Implement & Test**: Ensure all tests compile and execute cleanly:
   ```bash
   npx tsx tests/sprint_043.test.ts
   ```
3. **Commit & PR**: Push to your fork and submit a Pull Request to `https://github.com/pascalranoroarijaona/WebOfLife` referencing Sprint 043. Our continuous integration workflow runs the full test suite on Node.js.

Need assistance? Join our discussions on GitHub or open a draft PR for early feedback!
```

---