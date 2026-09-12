# RFC 070: Thermodynamic State Vector Discrepancy Absolute Difference Math Function

## 1. Executive Summary
This Request for Comments (RFC) outlines the technical specification and architectural integration for Sprint 70 of the **Web of Life** project. The goal of this sprint is to extract and formalize a pure helper function, `computeAbsoluteStockDelta(actual, expected)`, within `src/thermodynamics/state_validator.ts`. This function calculates the absolute elemental stock discrepancies between actual and expected thermodynamic state vectors, reinforcing adherence to conservation laws and precise state tracking.

---

## 2. Thermodynamic & Mathematical Foundations

### 2.1 First and Second Law Compliance
- **First Law (Conservation of Matter/Energy):** Elemental totals (Carbon, Nitrogen, Phosphorus, Water) within closed system boundaries remain conserved unless modulated by explicitly defined external fluxes (e.g., solar input).
- **Second Law (Entropy & Dissipation):** Discrepancies or deviations from expected equilibrium states represent irreversible energetic dispersal or unmodeled thermodynamic drift. Quantifying these variances precisely is critical for ecosystem resilience monitoring.

### 2.2 Mathematical Definition
Given two state vectors containing elemental stock mappings $A$ (`actual`) and $E$ (`expected`) over key set $K = \{\text{carbon}, \text{nitrogen}, \text{phosphorus}, \text{water}\}$, the absolute stock delta function $D: (A, E) \to R$ is defined as:

$$\Delta_k = |A[k] - E[k]| \quad \forall k \in K$$

If a key is missing from either vector, it defaults to a baseline of $0.0$, preserving deterministic behavior.

---

## 3. Architectural Specifications & File Modifying Plan

### 3.1 Target File
- **Path:** `src/thermodynamics/state_validator.ts`
- **Action:** Refactor existing inline discrepancy checks and introduce the exported pure function `computeAbsoluteStockDelta`.

### 3.2 Interface Contracts & Signatures
```typescript
import { ThermodynamicStateVector } from './state_vector';

/**
 * Computes the absolute difference between actual and expected elemental stocks.
 * @param actual The observed thermodynamic state vector.
 * @param expected The target/reference thermodynamic state vector.
 * @returns A record mapping each elemental key to its absolute stock discrepancy.
 */
export function computeAbsoluteStockDelta(
  actual: ThermodynamicStateVector,
  expected: ThermodynamicStateVector
): Record<string, number> {
  const discrepancies: Record<string, number> = {};
  const keys = new Set([
    ...Object.keys(actual.stocks || {}),
    ...Object.keys(expected.stocks || {})
  ]);

  for (const key of keys) {
    const actVal = actual.stocks[key] ?? 0;
    const expVal = expected.stocks[key] ?? 0;
    discrepancies[key] = Math.abs(actVal - expVal);
  }

  return discrepancies;
}
```

---

## 4. Class Hierarchy & Monad Stock Transitions

- **Incremental Design:** `computeAbsoluteStockDelta` integrates seamlessly with existing monad stock validation pipelines (`ThermodynamicMonadProcess`).
- **State Monad Flow:** 
  $$\text{State}_t \xrightarrow{\text{Process}} \text{State}_{t+1} \xrightarrow{\text{Validator}} \text{computeAbsoluteStockDelta}(\text{State}_{t+1}, \text{State}_{\text{expected}})$$

---

## 5. Verification & Testing Strategy
- **Unit Test File:** `tests/sprint_070.test.ts`
- **Test Scenarios:**
  1. Identical state vectors yield zero absolute deltas across all elemental keys.
  2. Positive and negative deviations correctly resolve to positive absolute magnitudes.
  3. Sparse or partially populated stock records handle missing keys gracefully via zero-defaults.