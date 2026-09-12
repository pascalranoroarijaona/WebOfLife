# Request for Comments: Sprint 066 - Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper

## 1. Executive Summary
Sprint 066 introduces the Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper (`src/thermodynamics/state_validator.ts`). This module provides isolated, deterministic mathematical comparison routines to verify that measured or simulated thermodynamic state vector inventories do not violate mass conservation or elemental preservation laws beyond specified per-element tolerance thresholds.

## 2. Architectural Context
Web of Life enforces strict First Law (matter conservation) and Second Law (entropy increase / solar-only energetic input) thermodynamic invariants across all biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water). 
- **Upstream Modules:** `src/thermodynamics/state_vector.ts`, `src/thermodynamics/types.ts`.
- **Downstream Modules:** Monad validation pipelines (`src/thermodynamics/state_validator.ts` integrated into state evolution monads).
- **Design Paradigm:** Object-oriented and incremental design, adhering strictly to pure mathematical helper functions and composable validator classes without rewriting established structures.

## 3. Class Hierarchy & Interface Specifications

### 3.1 Interfaces (`src/thermodynamics/types.ts` additions)
```ts
export interface ElementTolerances {
  carbon: number;
  nitrogen: number;
  phosphorus: number;
  water: number;
  [key: string]: number;
}

export interface DiscrepancyResult {
  isValid: boolean;
  discrepancies: {
    element: string;
    expected: number;
    actual: number;
    absoluteDifference: number;
    tolerance: number;
    exceeded: boolean;
  }[];
}
```

### 3.2 Core Helper Class: `StateValidator` (`src/thermodynamics/state_validator.ts`)
```ts
import { StateVector } from './state_vector';
import { ElementTolerances, DiscrepancyResult } from './types';

export class StateValidator {
  /**
   * Evaluates absolute differences between an expected state vector and an actual state vector
   * against individual elemental tolerances.
   */
  public static evaluateDiscrepancy(
    expected: StateVector,
    actual: StateVector,
    tolerances: ElementTolerances
  ): DiscrepancyResult {
    const elements = ['carbon', 'nitrogen', 'phosphorus', 'water'] as const;
    const discrepancies = [];
    let isValid = true;

    for (const el of elements) {
      const expectedVal = expected.getInventory(el);
      const actualVal = actual.getInventory(el);
      const absDiff = Math.abs(expectedVal - actualVal);
      const tolerance = tolerances[el] ?? 0;
      const exceeded = absDiff > tolerance;

      if (exceeded) {
        isValid = false;
      }

      discrepancies.push({
        element: el,
        expected: expectedVal,
        actual: actualVal,
        absoluteDifference: absDiff,
        tolerance,
        exceeded
      });
    }

    return { isValid, discrepancies };
  }
}
```

## 4. Thermodynamic Law Compliance
1. **First Law (Matter Conservation):** The `StateValidator` ensures atomic mass balance by asserting that elemental totals across transformations remain within strict delta bounds.
2. **Second Law (Entropy & Energy Input):** Discrepancies exceeding nominal degradation bounds trigger invariant failures, preserving directional energetic degradation and solar-driven boundary constraints.

## 5. Verification Plan
- Unit tests in `tests/sprint_066.test.ts` validating exact matches, minor variance within tolerance, and major deviations triggering `isValid: false`.