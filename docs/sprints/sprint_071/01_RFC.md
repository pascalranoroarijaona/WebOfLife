# RFC 071: Thermodynamic State Vector Discrepancy Absolute Difference Math Function

**Status:** Draft  
**Author:** Chief Systems Architect  
**Date:** Current Sprint  
**Target Module:** `src/thermodynamics/state_validator.ts`

---

## 1. Executive Summary

Sprint 071 introduces a foundational pure helper function, `computeAbsoluteStockDelta(actual, expected)`, within `src/thermodynamics/state_validator.ts`. This utility calculates the absolute difference between actual and expected thermodynamic state vectors across all elemental keys (Carbon, Nitrogen, Phosphorus, Water, and energy equivalents). 

This function reinforces the verification layers required to maintain strict compliance with the First Law (conservation of mass and energy) and Second Law (entropy management) of thermodynamics in the Web of Life architecture.

---

## 2. Architectural Context & Objectives

The Web of Life simulation models planetary metabolism through discrete thermodynamic state vectors and monad stock transformations. As systems evolve via bio-geochemical cycles (`src/cycles/`), validators must continuously verify that state deviations remain bounded and accounted for.

### Objectives:
1. **Extract Pure Calculation**: Decouple numerical difference logic from validation state checking into an isolated, testable pure function `computeAbsoluteStockDelta`.
2. **Elemental Key Granularity**: Process discrepancies key-by-key dynamically from standard thermodynamic keys.
3. **Monad & Structure Preservation**: Ensure state validation adheres to immutable vector transitions without side effects or unmonitored mass generation.

---

## 3. Interface Contracts & Class Hierarchy Additions

### 3.1 Type Definitions (`src/thermodynamics/types.ts`)
```typescript
export type ElementalStockKey = 'carbon' | 'nitrogen' | 'phosphorus' | 'water' | 'energy';

export type ThermodynamicStockMap = Record<ElementalStockKey, number>;
```

### 3.2 Function Signature (`src/thermodynamics/state_validator.ts`)
```typescript
/**
 * Computes the absolute stock discrepancy between actual and expected thermodynamic states.
 * @param actual - The measured state vector or stock map.
 * @param expected - The baseline or targeted state vector or stock map.
 * @returns A record mapping each elemental key to its absolute difference: |actual - expected|.
 */
export function computeAbsoluteStockDelta(
    actual: ThermodynamicStockMap,
    expected: ThermodynamicStockMap
): ThermodynamicStockMap {
    const result = {} as ThermodynamicStockMap;
    const keys: ElementalStockKey[] = ['carbon', 'nitrogen', 'phosphorus', 'water', 'energy'];
    
    for (const key of keys) {
        const actVal = actual[key] ?? 0;
        const expVal = expected[key] ?? 0;
        result[key] = Math.abs(actVal - expVal);
    }
    
    return result;
}
```

---

## 4. Thermodynamic Compliance

- **First Law (Mass Conservation)**: Absolute differences computed by `computeAbsoluteStockDelta` serve as residuals for mass balance checks. Any unexplained non-zero delta signals a closed-system boundary leak or unaccounted sink/source.
- **Second Law (Entropy & Dissipation)**: Energy stock discrepancies help quantify thermodynamic efficiency losses across monad process iterations (`src/thermodynamics/monad_process.ts`).

---

## 5. Verification & Testing Strategy

A dedicated test suite will be established at `tests/sprint_071.test.ts` covering:
1. **Exact Match**: Verifying zero delta when actual equals expected.
2. **Positive & Negative Deviations**: Ensuring `Math.abs()` correctly normalizes deficits and surpluses.
3. **Partial / Missing Keys**: Robust handling of incomplete stock maps via default fallback to `0`.