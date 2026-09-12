<!-- Method Specifications -->

# Method Specifications: Sprint 065 - Thermodynamic State Vector Inventory Discrepancy Evaluator

## 1. Process Overview & Scientific Basis
The Thermodynamic State Vector Inventory Discrepancy Evaluator (`src/thermodynamics/state_validator.ts`) formalizes mass and energy conservation laws within the Web of Life simulation engine. By evaluating absolute divergences between expected thermodynamic state vectors ($V_1$) and actual transitioned state vectors ($V_2$), the system enforces strict conservation boundaries across biological, ecological, and industrial processes.

### First Law of Thermodynamics (Conservation of Matter and Energy)
Total elemental inventories (Carbon, Nitrogen, Phosphorus, Water, and Energy) across closed monad transitions must balance within specified precision limits:
$$\sum e_{\text{in}} = \sum e_{\text{out}} \pm \epsilon$$

## 2. Mathematical Formalization

### Discrepancy Calculation
For each elemental stock or energy metric $e$ present in the union of keys between expected vector $V_1$ and actual vector $V_2$:
$$\Delta_e = |V_{1,e} - V_{2,e}|$$

### Tolerance Validation Condition
A state vector transition is deemed valid if and only if every elemental delta is bounded by its assigned tolerance $T_e$:
$$\text{isValid} = \bigwedge_{e \in \text{Keys}} (\Delta_e \le T_e)$$

Where default tolerance $T_e = 0.001$ units is applied if no explicit tolerance is specified.

## 3. Executable Monad Method & State Transfer Equations

The verification logic is encapsulated as a pure method within the thermodynamic monad pipeline, ensuring side-effect-free validation during cycle state transitions:

```ts
import { ThermodynamicStateVector } from './state_vector';
import { IStateValidator, ValidationResult } from './state_validator';

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

## 4. Verification & Testing Specifications
Unit tests in `tests/sprint_065.test.ts` validate:
1. **Zero-Delta Equivalence:** Identical expected and actual vectors return `isValid: true` with zero maxDelta.
2. **Tolerance Breach Detection:** Vectors exceeding $T_e$ return `isValid: false` with accurate delta tracking in `discrepancies`.
3. **Default Tolerance Fallback:** Unspecified keys correctly default to $0.001$ tolerance thresholds.