# Request for Comments (RFC): Sprint 067
## Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper (`src/thermodynamics/state_validator.ts`)

### 1. Overview & Objective
Sprint 067 introduces the **Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper** (`src/thermodynamics/state_validator.ts`). This module provides isolated, deterministic mathematical comparison routines for checking absolute elemental stock discrepancies against defined individual elemental tolerances. This ensures that thermodynamic states, monad transitions, and biogeochemical cycle inventories remain strictly bound within allowable conservation limits (First/Second Law compliance: matter conservation and closed-loop solar-driven energy flux).

---

### 2. Architectural & Class Hierarchy Additions
Building upon the existing thermodynamic vector models (`src/thermodynamics/state_vector.ts`) and monad process structures (`src/thermodynamics/monad_process.ts`), this sprint defines a dedicated validation helper class/interface structure.

```
+----------------------------------------------------+
|                StateValidator                      |
+----------------------------------------------------+
| - defaultTolerance: number                         |
+----------------------------------------------------+
| + validateState(actual: StateVector,               |
|                 expected: StateVector,             |
|                 tolerances?: Map<string, number>): |
|                 ValidationResult                   |
| + checkDiscrepancy(a: number, b: number,           |
|                    tolerance: number): boolean     |
+----------------------------------------------------+
```

#### Key Interfaces (`src/thermodynamics/types.ts` additions):
- `IStateValidator`: Interface defining evaluation contracts.
- `ValidationResult`: Structured output detailing whether validation passed, along with exact absolute differences per elemental stock.

---

### 3. Monad Stock Transitions & Thermodynamic Compliance
- **First Law (Conservation of Matter)**: The validator checks that matter inventories across atomic pools (Carbon, Nitrogen, Phosphorus, Water) do not spontaneously appear or vanish outside accepted floating-point tolerances.
- **Second Law (Entropy & Dissipative Tracking)**: Discrepancies exceeding allowable thresholds flag entropy accounting errors or non-conservative monad state transformations.

---

### 4. Implementation Specification: `src/thermodynamics/state_validator.ts`
```typescript
import { StateVector } from './state_vector';
import { ValidationResult } from './types';

export class StateValidator {
  constructor(private globalTolerance: number = 1e-6) {}

  public evaluateDiscrepancy(
    actual: StateVector,
    expected: StateVector,
    customTolerances?: Record<string, number>
  ): ValidationResult {
    const differences: Record<string, number> = {};
    const violations: string[] = {};
    let isValid = true;

    const actualStocks = actual.getStocks();
    const expectedStocks = expected.getStocks();
    const keys = new Set([...Object.keys(actualStocks), ...Object.keys(expectedStocks)]);

    for (const key of keys) {
      const actVal = actualStocks[key] ?? 0;
      const expVal = expectedStocks[key] ?? 0;
      const diff = Math.abs(actVal - expVal);
      differences[key] = diff;

      const tolerance = customTolerances?.[key] ?? this.globalTolerance;
      if (diff > tolerance) {
        isValid = false;
        violations[key] = `Discrepancy ${diff} exceeds tolerance ${tolerance}`;
      }
    }

    return {
      isValid,
      differences,
      violations
    };
  }
}
```

---

### 5. Verification & Testing Plan
- Unit tests in `tests/sprint_067.test.ts` will verify:
  1. Exact state matches return `isValid: true`.
  2. Stock differences within custom tolerances pass validation.
  3. Stock differences exceeding tolerances correctly flag violations per element.
  4. Integration with thermodynamic monad state checks.