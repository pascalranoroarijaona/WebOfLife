# Request for Comments: Sprint 079 - Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper

## 1. Overview & Objective
Sprint 079 introduces the **Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper** (`src/thermodynamics/state_validator.ts`). This helper provides isolated, pure-function mathematical verification of thermodynamic state vectors against predefined elemental tolerances, guaranteeing that conservation laws and boundary limits are rigidly enforced across all monad stock transformations.

## 2. Thermodynamic & Mathematical Foundations
In alignment with the First and Second Laws of Thermodynamics implemented across the Web of Life architecture:
- **First Law (Matter/Energy Conservation)**: Total elemental stocks ($\Delta S_i = 0$ across closed partitions) must be preserved. The discrepancy evaluator measures absolute deviations $|\vec{v}_{\text{actual}} - \vec{v}_{\text{expected}}|$.
- **Second Law (Entropy Increase / Dissipative Bounds)**: Tolerances ($\tau_i$) define maximum allowable disequilibrium or measurement error thresholds per elemental vector component $i$ (Carbon, Nitrogen, Phosphorus, Water, Energy).
- **Evaluation Criteria**: A state vector inventory passes validation if and only if for all elements $i$:
  $$|\text{actual}_i - \text{expected}_i| \le \tau_i$$

## 3. Class Hierarchy & Interface Contracts

### 3.1 Interfaces (`src/thermodynamics/types.ts` integration)
```ts
export interface ElementTolerances {
  carbon: number;
  nitrogen: number;
  phosphorus: number;
  water: number;
  energy: number;
  [key: string]: number;
}

export interface DiscrepancyReport {
  isValid: boolean;
  discrepancies: Record<string, { actual: number; expected: number; absoluteDifference: number; tolerance: number }>;
  maxDiscrepancy: number;
}
```

### 3.2 StateValidator Class (`src/thermodynamics/state_validator.ts`)
```ts
import { ThermodynamicStateVector } from './state_vector';
import { ElementTolerances, DiscrepancyReport } from './types';

export class ThermodynamicStateValidator {
  constructor(private defaultTolerances: ElementTolerances) {}

  public evaluate(
    actual: ThermodynamicStateVector,
    expected: ThermodynamicStateVector,
    tolerances?: Partial<ElementTolerances>
  ): DiscrepancyReport {
    const activeTolerances: ElementTolerances = { ...this.defaultTolerances, ...tolerances };
    const discrepancies: DiscrepancyReport['discrepancies'] = {};
    let isValid = true;
    let maxDiscrepancy = 0;

    const actualStocks = actual.getStocks();
    const expectedStocks = expected.getStocks();

    const keys = new Set([...Object.keys(actualStocks), ...Object.keys(expectedStocks)]);

    for (const key of keys) {
      const actVal = actualStocks[key] ?? 0;
      const expVal = expectedStocks[key] ?? 0;
      const diff = Math.abs(actVal - expVal);
      const tol = activeTolerances[key] ?? 1e-6;

      if (diff > maxDiscrepancy) {
        maxDiscrepancy = diff;
      }

      if (diff > tol) {
        isValid = false;
        discrepancies[key] = {
          actual: actVal,
          expected: expVal,
          absoluteDifference: diff,
          tolerance: tol,
        };
      }
    }

    return { isValid, discrepancies, maxDiscrepancy };
  }
}
```

## 4. Monad Stock Transitions & Integration
The validator integrates directly into `ThermodynamicMonadProcess` to assert state consistency pre- and post-transition:
1. **Input State Vector** $\rightarrow$ **Process Transformation** $\rightarrow$ **Output State Vector**.
2. If `ThermodynamicStateValidator.evaluate()` detects a violation exceeding tolerances, the monad transaction triggers a thermodynamic rollback or halts state propagation to preserve system integrity.

## 5. Testing & Verification Plan
- **Unit Tests (`tests/sprint_079.test.ts`)**:
  - Test exact matches returning `isValid: true`.
  - Test minor fluctuations within individual elemental tolerances.
  - Test boundary violations on Carbon, Nitrogen, Phosphorus, and Energy triggering `isValid: false` with detailed discrepancy logs.
- **Integration Tests**: Verify coupling with `ThermodynamicMonadProcess` and cycle balance sheets (`src/cycles/`).