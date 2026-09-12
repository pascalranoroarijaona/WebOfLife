<!-- Method Specifications -->

# Sprint 079: Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper

## 1. Process Overview & Physical Foundation
The Thermodynamic State Vector Inventory Discrepancy Evaluator (`src/thermodynamics/state_validator.ts`) provides a rigorous mathematical validation layer enforcing the First and Second Laws of Thermodynamics across all Web of Life monad transitions. 

By comparing actual and expected state vectors against per-element tolerances ($\tau_i$), the evaluator acts as a constitutional guardrail against mass-energy creation/destruction anomalies and dissipative boundary violations during metabolic, biogeochemical, and industrial simulations.

## 2. Mathematical Formalization & Conservation Equations

Let $\vec{v}_{\text{actual}}$ and $\vec{v}_{\text{expected}}$ represent the thermodynamic state vectors containing elemental stocks (Carbon, Nitrogen, Phosphorus, Water, Energy, and dynamic extension keys).

### 2.1 Discrepancy Metric
For each elemental component $i$ present in either state vector:
$$\Delta S_i = |\text{actual}_i - \text{expected}_i|$$

### 2.2 Tolerance Inequality & Validity Criterion
A system transition satisfies conservation and equilibrium constraints if and only if:
$$\forall i \in \text{Keys}, \quad \Delta S_i \le \tau_i$$

Where $\tau_i$ is the active tolerance threshold for element $i$. If any component violates this bound:
$$\text{isValid} = \bigwedge_{i} (\Delta S_i \le \tau_i)$$

The global maximum discrepancy across the state vector is defined as:
$$\Omega_{\max} = \max_{i} (\Delta S_i)$$

## 3. Executable Monad Method Specification

The validation logic is encapsulated in the `ThermodynamicStateValidator` class and integrated into the monadic workflow to intercept and halt invalid state propagations.

### 3.1 TypeScript Implementation (`src/thermodynamics/state_validator.ts`)
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

## 4. Monad Integration Workflow
1. **Pre-State Capture**: Record $\vec{v}_{\text{in}}$ prior to monad execution.
2. **Process Transformation**: Execute biochemical or industrial stoichiometric reactions yielding $\vec{v}_{\text{out, actual}}$.
3. **Theoretical Expectation**: Compute theoretical conservation vector $\vec{v}_{\text{out, expected}}$ based on closed-system balance equations.
4. **Validation Check**: Invoke `ThermodynamicStateValidator.evaluate(v_out_actual, v_out_expected, tolerances)`.
5. **Enforcement**: If `isValid === false`, trigger transaction rollback and log all failing elemental discrepancies.