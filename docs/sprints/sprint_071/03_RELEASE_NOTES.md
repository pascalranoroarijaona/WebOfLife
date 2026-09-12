<!-- Release Notes -->
# Release Notes — Sprint 071: Thermodynamic State Vector Discrepancy Absolute Difference Math Function

**Sprint:** 071  
**Module:** `src/thermodynamics/state_validator.ts`  
**Target:** Thermodynamic State Vector Verification & Discrepancy Calculation  

---

## 1. Executive Summary

Sprint 071 successfully delivers the foundational pure helper function `computeAbsoluteStockDelta(actual, expected)` within `src/thermodynamics/state_validator.ts`. This utility computes absolute differences per elemental key between actual and expected thermodynamic state vectors, strengthening compliance verification for mass conservation and energy accounting across the Web of Life architecture.

---

## 2. Key Architectural Additions

### 2.1 Pure Helper Function: `computeAbsoluteStockDelta`
- **Location:** `src/thermodynamics/state_validator.ts`
- **Functionality:** Iterates dynamically across standard elemental stock keys (`carbon`, `nitrogen`, `phosphorus`, `water`, `energy`), calculating absolute numerical discrepancies: $\lvert \text{actual} - \text{expected} \rvert$.
- **Robustness:** Incorporates safe fallback mechanisms (`?? 0`) to handle partial or incomplete stock maps smoothly without throwing undefined reference errors.

### 2.2 Interface & Type Contracts (`src/thermodynamics/types.ts`)
- Introduced strict typing definitions to support state validation contracts:
  - `ElementalStockKey`: Union type covering ecological and energetic state dimensions.
  - `ThermodynamicStockMap`: Record mapping each `ElementalStockKey` to its corresponding numerical stock value.

---

## 3. Thermodynamic Compliance & Verification

- **First Law Verification:** The absolute differences produced by `computeAbsoluteStockDelta` serve as core residual metrics for mass balance validation, immediately flagging closed-system boundary leaks or unmonitored mass generation.
- **Second Law Tracking:** Energy stock discrepancies assist in quantifying efficiency losses across monad process iterations (`src/thermodynamics/monad_process.ts`).
- **Testing Strategy (`tests/sprint_071.test.ts`):** 
  - Validates exact matches (zero delta generation).
  - Confirms correct normalization of positive and negative deviations via `Math.abs()`.
  - Ensures robust fallback behavior for missing or partial keys.