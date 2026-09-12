# Request for Comments (RFC): Sprint 073 - Thermodynamic State Vector Discrepancy Absolute Difference Math Function

## 1. Overview & Goal
Sprint 073 focuses on implementing a pure, isolated helper function `computeAbsoluteStockDelta(actual, expected)` within `src/thermodynamics/state_validator.ts`. This function calculates the absolute elemental stock discrepancies between actual and expected thermodynamic state vectors, providing foundational validation support for biogeochemical cycle invariant preservation.

## 2. Thermodynamic Laws & Constraints
- **First Law (Matter Conservation):** State vector discrepancies must be tracked strictly across closed elemental budgets ($C, N, P, H_2O$) without spontaneous generation or destruction of mass.
- **Second Law (Entropy & Dissipation):** Discrepancies quantify deviation from steady-state homeostatic equilibrium, feeding directly into dissipation and error-correction monad structures.

## 3. Architecture & Class Hierarchy Additions
- **Module Target:** `src/thermodynamics/state_validator.ts`
- **Interfaces & Types:** Consumes `StateVector` and `ElementalKey` definitions from `src/thermodynamics/types.ts`.
- **Pure Function Signature:**
  ```typescript
  export function computeAbsoluteStockDelta(
    actual: StateVector,
    expected: StateVector
  ): Record<ElementalKey, number>
  ```
- **Composition & Inheritance:** Aligns with incremental functional-reactive validation wrappers already present in the thermodynamic validation suite.

## 4. Implementation Specification
1. Iterate over all valid elemental keys defined in the thermodynamic schema.
2. Retrieve corresponding numerical stock values from `actual` and `expected` vectors (defaulting missing keys to `0`).
3. Compute the absolute difference: $\Delta_e = | \text{actual}[e] - \text{expected}[e] |$.
4. Return a structured record mapping each elemental key to its absolute stock discrepancy.

## 5. Verification & Testing Plan
- Introduce unit test `tests/sprint_073.test.ts` covering:
  - Exact state matches (zero deltas).
  - Positive and negative stock deviations resulting in correct absolute values.
  - Partial or missing elemental key handling under strict type safety.