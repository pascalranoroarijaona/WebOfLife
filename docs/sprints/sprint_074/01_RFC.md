# Request for Comments: Sprint 074
## Thermodynamic State Vector Discrepancy Absolute Difference Math Function (`src/thermodynamics/state_validator.ts`)

### 1. Overview & Motivation
As the Web of Life simulation architecture evolves toward robust biospheric tracking and autonomic validation, maintaining precise thermodynamic state conservation is paramount. Sprint 074 introduces the pure helper function `computeAbsoluteStockDelta(actual, expected)` within `src/thermodynamics/state_validator.ts`. 

This function calculates the exact absolute elemental discrepancies between an observed (`actual`) state vector and a target (`expected`) state vector across all elemental keys (e.g., carbon, nitrogen, phosphorus, water). This underpins automated homeostasis verification and anomaly detection, strictly upholding First and Second Law thermodynamic constraints (matter conservation and solar input tracking).

### 2. Architectural Scope & File Location
- **Target File**: `src/thermodynamics/state_validator.ts`
- **Related Modules**: 
  - `src/thermodynamics/state_vector.ts`
  - `src/thermodynamics/types.ts`
- **Testing Suite**: `tests/sprint_074.test.ts` (to be introduced alongside implementation)

### 3. Interface Contracts & Signature
```typescript
/**
 * Computes the absolute stock delta between actual and expected thermodynamic state vectors.
 * 
 * @param actual - The observed StateVector mapping elemental keys to numeric stock values.
 * @param expected - The baseline or expected StateVector mapping elemental keys to numeric stock values.
 * @returns A new StateVector (or record map) representing the absolute difference |actual - expected| per elemental key.
 */
export function computeAbsoluteStockDelta(
    actual: Record<string, number>,
    expected: Record<string, number>
): Record<string, number>;
```

### 4. Thermodynamic Principles & Invariants
1. **Matter Conservation (First Law)**: Discrepancy tracking ensures that mass redistribution across planetary compartments is accounted for without phantom creation or destruction.
2. **Deterministic Purity**: `computeAbsoluteStockDelta` is a side-effect-free pure function operating strictly on immutable input records, ensuring referential transparency.
3. **Key Union Robustness**: If keys differ between `actual` and `expected`, missing keys shall evaluate to a default value of `0` to prevent `NaN` propagations during validation cycles.

### 5. Incremental Object-Oriented Integration
This utility function integrates cleanly into the existing functional-reactive thermodynamic validation pipeline, bridging monad state transitions (`src/thermodynamics/thermodynamic_monad_process.ts`) with high-level system diagnostics in `src/earth_pod.ts`.