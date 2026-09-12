<!-- Release Notes -->
# Sprint 074 Release Notes: Thermodynamic State Vector Discrepancy Absolute Difference

## Overview
Sprint 074 delivers critical mathematical infrastructure to the thermodynamic validation engine of the Web of Life simulation. By implementing the isolated pure helper function `computeAbsoluteStockDelta(actual, expected)` within `src/thermodynamics/state_validator.ts`, this release establishes rigorous, automated tracking of elemental discrepancies between observed and expected biospheric states.

---

## Architectural Changes & Backend Modifications

### 1. Core Implementation (`src/thermodynamics/state_validator.ts`)
- **Introduced Function**: `computeAbsoluteStockDelta(actual, expected)`
- **Behavior**: Computes the exact absolute elemental discrepancies (`|actual - expected|`) across all unique keys present within the provided thermodynamic state vectors.
- **Robustness**: Built with key-union safety, ensuring missing keys default to `0` to completely eliminate `NaN` propagation risks during autonomic anomaly detection cycles.
- **Purity**: Maintained strictly as a side-effect-free, deterministic pure function operating on immutable record structures.

### 2. Interface Contract
```typescript
/**
 * Computes the absolute stock delta between actual and expected thermodynamic state vectors.
 * 
 * @param actual - The observed StateVector mapping elemental keys to numeric stock values.
 * @param expected - The baseline or expected StateVector mapping elemental keys to numeric stock values.
 * @returns A new StateVector record representing the absolute difference |actual - expected| per elemental key.
 */
export function computeAbsoluteStockDelta(
    actual: Record<string, number>,
    expected: Record<string, number>
): Record<string, number>;
```

---

## Testing & Quality Assurance
- **Test Suite**: Added `tests/sprint_074.test.ts` to validate edge cases, including exact matches, partial key overlaps, disjoint key sets, and zero-value handling.
- **Thermodynamic Invariants Enforced**:
  - **First Law Compliance**: Confirms strict mass conservation tracking without phantom creation/destruction artifacts during compartmental redistribution.
  - **Referential Transparency**: Verified through rigorous unit tests confirming immutable input parameters and stable functional outputs.

---

## Integration Pipeline
`computeAbsoluteStockDelta` integrates directly into the functional-reactive thermodynamic validation pipeline, bridging low-level monad state transitions (`src/thermodynamics/thermodynamic_monad_process.ts`) with high-level system diagnostics in `src/earth_pod.ts` to support automated homeostasis verification.