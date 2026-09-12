# Request for Comments (RFC): Sprint 065 - Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper

## 1. Overview & Goal
Sprint 065 introduces the Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper (`src/thermodynamics/state_validator.ts`). This module provides isolated mathematical comparison routines to check absolute thermodynamic and elemental stock differences between state vectors against individual elemental tolerances, ensuring rigorous mass and energy conservation compliance across the Web of Life biosphere simulation.

## 2. Thermodynamic & Mathematical Foundations
In accordance with First Law (conservation of matter/energy) and Second Law (entropy-bounded directional flux) thermodynamic principles:
- **Mass Conservation:** Elemental stocks (Carbon, Nitrogen, Phosphorus, Water, and Energy) must be accounted for within strict bounds.
- **Tolerances:** Let vector $V_1$ represent expected or baseline inventories and $V_2$ represent measured or transitioned inventories. The discrepancy evaluator computes absolute differences per element $e$:
  $$\Delta_e = |V_{1,e} - V_{2,e}|$$
- **Validation Condition:** $V_2$ is valid relative to tolerances $T_e$ iff $\forall e, \Delta_e \le T_e$.

## 3. Class Hierarchy & Interface Contracts

### 3.1 Interface & Type Definitions (`src/thermodynamics/state_validator.ts`)
```ts
import { ThermodynamicStateVector } from './state_vector';
import { ElementType } from './types';

export interface ValidationResult {
  readonly isValid: boolean;
  readonly discrepancies: Record<string, { expected: number; actual: number; delta: number; tolerance: number }>;
  readonly maxDelta: number;
}

export interface IStateValidator {
  validate(
    expected: ThermodynamicStateVector,
    actual: ThermodynamicStateVector,
    tolerances: Record<string, number>
  ): ValidationResult;
}
```

### 3.2 Concrete Implementation (`StateValidator`)
```ts
export class StateValidator implements IStateValidator {
  public validate(
    expected: ThermodynamicStateVector,
    actual: ThermodynamicStateVector,
    tolerances: Record<string, number>
  ): ValidationResult {
    const discrepancies: Record<string, { expected: number; actual: number; delta: number; tolerance: number }> = {};
    let isValid = true;
    let maxDelta = 0;

    const expectedStock = expected.getStock();
    const actualStock = actual.getStock();

    const allKeys = new Set([...Object.keys(expectedStock), ...Object.keys(actualStock)]);

    for (const key of allKeys) {
      const expVal = expectedStock[key] ?? 0;
      const actVal = actualStock[key] ?? 0;
      const delta = Math.abs(expVal - actVal);
      const tolerance = tolerances[key] ?? 0.001; // default tight tolerance

      if (delta > maxDelta) {
        maxDelta = delta;
      }

      if (delta > tolerance) {
        isValid = false;
      }

      discrepancies[key] = {
        expected: expVal,
        actual: actVal,
        delta,
        tolerance
      };
    }

    return {
      isValid,
      discrepancies,
      maxDelta
    };
  }
}
```

## 4. Monad Stock Transitions & Integration
The `StateValidator` integrates into the thermodynamic monad process (`src/thermodynamics/thermodynamic_monad_process.ts`) as an invariant checker during cycle step transitions. If a monad step violates conservation tolerances, the state validator triggers an audit alert or rollback flag.

## 5. Testing & Verification Plan
- Unit tests in `tests/sprint_065.test.ts` verifying:
  1. Exact matching vectors return `isValid: true`.
  2. Discrepancies exceeding tolerances return `isValid: false` with exact delta metrics.
  3. Default tolerance handling for unspecified elemental keys.