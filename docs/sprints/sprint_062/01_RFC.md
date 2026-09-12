# Request for Comments (RFC) - Sprint 062
## Thermodynamic State Vector Inventory Discrepancy Evaluator (`src/thermodynamics/state_validator.ts`)

### 1. Overview & Objective
Sprint 062 introduces the **Thermodynamic State Vector Inventory Discrepancy Evaluator** (`src/thermodynamics/state_validator.ts`), establishing rigorous discrepancy comparison logic between actual stock deltas and expected flux-derived deltas within the Web of Life thermodynamic engine. 

This component ensures absolute compliance with thermodynamic laws:
1. **First Law of Thermodynamics (Matter Conservation):** Total elemental stock changes must balance with net incoming and outgoing fluxes.
2. **Second Law of Thermodynamics (Solar Input Only / Entropy Directionality):** Dissipative losses and work done are tracked against net external solar input boundaries without unauthorized internal creation of mass or energy.

---

### 2. Class Hierarchy & Architectural Additions

```
+-----------------------------------+
| <<interface>> IStateValidator     |
+-----------------------------------+
| + evaluateDiscrepancy(            |
|     actual: StateVector,          |
|     expected: StateVector,        |
|     fluxes: Map<string, number>   |
|   ): DiscrepancyReport            |
+-----------------------------------+
                  ^
                  |
+-----------------------------------+
| StateValidator                    |
+-----------------------------------+
| - tolerance: number               |
| + constructor(tolerance: number)  |
| + evaluateDiscrepancy(...)        |
| - computeAbsoluteDifference(...)  |
+-----------------------------------+
```

#### 2.1 Interface Contracts (`src/thermodynamics/state_validator.ts`)
```typescript
import { StateVector } from './state_vector';
import { ThermodynamicStructure } from './thermodynamic_structure';

export interface DiscrepancyItem {
  stockKey: string;
  actualDelta: number;
  expectedDelta: number;
  absoluteDifference: number;
  exceedsTolerance: boolean;
}

export interface DiscrepancyReport {
  timestamp: number;
  isBalanced: boolean;
  maxDiscrepancy: number;
  items: DiscrepancyItem[];
}

export interface IStateValidator {
  evaluateDiscrepancy(
    previousState: StateVector,
    currentState: StateVector,
    netFluxes: Map<string, number>
  ): DiscrepancyReport;
}
```

---

### 3. Monad Stock Transitions & Flux Integration

The validator hooks into the monadic state transition pipeline (`src/thermodynamics/monad_process.ts` and `src/thermodynamic_monad_process.ts`):
- **Stock Delta Calculation:** $\Delta S_{actual} = S_{current} - S_{previous}$
- **Expected Flux Delta:** $\Delta S_{expected} = \sum Inflows - \sum Outflows$
- **Absolute Discrepancy:** $D = |\Delta S_{actual} - \Delta S_{expected}|$

If $D$ exceeds the defined thermodynamic tolerance ($\epsilon = 1.0 \times 10^{-6}$), the validator flags a mass-balance anomaly, enforcing strict adherence to the First Law of Thermodynamics.

---

### 4. Implementation Plan (`src/thermodynamics/state_validator.ts`)

```typescript
import { StateVector } from './state_vector';
import { IStateValidator, DiscrepancyReport, DiscrepancyItem } from './types';

export class StateValidator implements IStateValidator {
  private tolerance: number;

  constructor(tolerance: number = 1e-6) {
    this.tolerance = tolerance;
  }

  public evaluateDiscrepancy(
    previousState: StateVector,
    currentState: StateVector,
    netFluxes: Map<string, number>
  ): DiscrepancyReport {
    const items: DiscrepancyItem[] = [];
    let maxDiscrepancy = 0;
    let isBalanced = true;

    const allKeys = new Set([
      ...previousState.getKeys(),
      ...currentState.getKeys(),
      ...netFluxes.keys()
    ]);

    for (const key of allKeys) {
      const prevVal = previousState.getStock(key) || 0;
      const currVal = currentState.getStock(key) || 0;
      const actualDelta = currVal - prevVal;
      const expectedDelta = netFluxes.get(key) || 0;

      const absoluteDifference = Math.abs(actualDelta - expectedDelta);
      const exceedsTolerance = absoluteDifference > this.tolerance;

      if (exceedsTolerance) {
        isBalanced = false;
      }

      if (absoluteDifference > maxDiscrepancy) {
        maxDiscrepancy = absoluteDifference;
      }

      items.push({
        stockKey: key,
        actualDelta,
        expectedDelta,
        absoluteDifference,
        exceedsTolerance
      });
    }

    return {
      timestamp: Date.now(),
      isBalanced,
      maxDiscrepancy,
      items
    };
  }
}
```

---

### 5. Verification & Testing Strategy (`tests/sprint_062.test.ts`)
- **Unit Test 1:** Balanced stock transitions where actual deltas match flux-derived expectations within tolerance.
- **Unit Test 2:** Imbalanced transitions triggering First Law discrepancy violations when uncounted sinks or sources appear.
- **Unit Test 3:** Integration check with existing biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water).