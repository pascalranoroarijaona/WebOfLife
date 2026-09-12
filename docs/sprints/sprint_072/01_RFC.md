```md
# Request for Comments (RFC): Sprint 072
## Thermodynamic State Vector Discrepancy Absolute Difference Math Function

### 1. Overview & Goal
Sprint 072 introduces a specialized pure helper function, `computeAbsoluteStockDelta(actual, expected)`, within `src/thermodynamics/state_validator.ts`. This function computes the absolute difference per elemental key between two thermodynamic state vectors (`actual` and `expected`), ensuring rigorous adherence to conservation laws and precision validation across biogeochemical cycles (Carbon, Nitrogen, Phosphorus, and Water).

### 2. Technical Architecture & Class Hierarchy Additions
Building upon the incremental design patterns established in previous sprints, this module operates strictly within the functional/state-validation layer of the thermodynamic subsystem.

- **Target File:** `src/thermodynamics/state_validator.ts`
- **Function Signature:**
  ```typescript
  export function computeAbsoluteStockDelta(
      actual: Record<string, number>,
      expected: Record<string, number>
  ): Record<string, number>
  ```
- **Composition & Interfaces:**
  - Integrates with `StateVector` and `ThermodynamicStructure` type definitions in `src/thermodynamics/types.ts`.
  - Guarantees pure mathematical operations without side effects, keeping monad stock state transitions deterministic and fully auditable.

### 3. Thermodynamic Compliance
- **First Law (Matter Conservation):** The calculation compares mass/moles across closed elemental stocks without introducing phantom matter or loss outside specified boundaries.
- **Second Law (Entropy & Dissipation):** Discrepancies computed via `computeAbsoluteStockDelta` supply quantitative error vectors for thermodynamic monad feedback loops, driving systemic equilibration toward maximum entropy production limits bounded by solar input.

### 4. Interface Contracts & Monad Stock Transitions
- **Input Contracts:** Both `actual` and `expected` dictionaries map string elemental identifiers (e.g., `'C'`, `'N'`, `'P'`, `'H2O'`) to numerical stock quantities ($\mathbb{R}_{\ge 0}$). Missing keys in either record default or normalize gracefully according to the established `StateVector` tolerance rules.
- **Output Contracts:** Returns a new dictionary mapping identical elemental keys to their absolute numerical differences:
  $$\Delta_i = | \text{actual}_i - \text{expected}_i |$$

### 5. Test Plan
- Create `tests/sprint_072.test.ts` to validate:
  1. Exact matching vectors returning zero deltas across all keys.
  2. Positive and negative variances resulting in correct absolute scalar outputs.
  3. Sparse or asymmetric key sets handled robustly without runtime exceptions.
  4. Integration with existing state validation pipelines in `src/thermodynamics/state_validator.ts`.