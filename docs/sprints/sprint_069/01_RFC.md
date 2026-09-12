# Request for Comments: Sprint 069 - Thermodynamic State Vector Discrepancy Absolute Difference Math Function

**Author:** Chief Systems Architect  
**Status:** Approved / In Implementation  
**Target Module:** `src/thermodynamics/state_validator.ts`  

---

## 1. Executive Summary

Sprint 069 introduces a pure helper function, `computeAbsoluteStockDelta(actual, expected)`, within `src/thermodynamics/state_validator.ts`. This function computes the absolute numerical differences across elemental stock keys between an actual thermodynamic state vector and an expected thermodynamic state vector. 

This enhancement strengthens our thermodynamic validation framework, supporting rigorous adherence to mass-energy conservation laws (First Law) and entropy tracking (Second Law) across the Web of Life simulation engine.

---

## 2. Thermodynamic Laws & Compliance

1. **First Law of Thermodynamics (Conservation):** Matter and energy cannot be created or destroyed. The absolute difference calculation measures discrepancies against expected conservation balances, ensuring that any deviation from closed-system or solar-inflow-bounded states is precisely quantified.
2. **Second Law of Thermodynamics (Entropy):** State validation and delta computations help monitor degradation or divergence in biogeochemical cycles (carbon, nitrogen, phosphorus, water), ensuring directional thermodynamic consistency.

---

## 3. Architecture & Class Hierarchy Additions

### 3.1 File Modifications
- **`src/thermodynamics/state_validator.ts`**:
  - Add and export the pure utility function: `computeAbsoluteStockDelta(actual: StateVector | Record<string, number>, expected: StateVector | Record<string, number>): Record<string, number>`

### 3.2 Interface Contracts & Signatures

```typescript
import { StateVector } from './state_vector';

/**
 * Computes the absolute stock delta per elemental key between actual and expected states.
 * 
 * @param actual - The measured state vector or stock record.
 * @param expected - The theoretical baseline or expected state vector/stock record.
 * @returns A record mapping each elemental key to its absolute difference |actual - expected|.
 */
export function computeAbsoluteStockDelta(
  actual: StateVector | Record<string, number>,
  expected: StateVector | Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {};
  
  // Extract stock dictionaries or records safely
  const actualStocks = (actual instanceof StateVector) ? actual.getStocks() : actual;
  const expectedStocks = (expected instanceof StateVector) ? expected.getStocks() : expected;

  const allKeys = new Set([...Object.keys(actualStocks), ...Object.keys(expectedStocks)]);

  for (const key of allKeys) {
    const actVal = actualStocks[key] ?? 0;
    const expVal = expectedStocks[key] ?? 0;
    result[key] = Math.abs(actVal - expVal);
  }

  return result;
}
```

---

## 4. Monad Stock Transitions

The state validator integrates with the thermodynamic monad pipeline (`src/thermodynamics/monad_process.ts`) by allowing intermediate and final state vectors to be evaluated without side effects, preserving monad immutability rules.

---

## 5. Verification Plan

- **Unit Tests (`tests/sprint_069.test.ts`)**:
  - Verify exact absolute difference calculations for matching stock keys.
  - Verify handling of missing keys (defaulting to zero).
  - Confirm compatibility with both raw records and `StateVector` class instances.
- **Integration Audit**: Ensure zero regression in existing thermodynamic state validations.