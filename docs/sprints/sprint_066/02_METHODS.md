<!-- Method Specifications -->

# Sprint 066: Thermodynamic State Vector Inventory Discrepancy Evaluator Core Helper

## 1. Physical & Biogeochemical Process Foundations
The Web of Life simulation engine tracks multi-elemental mass balances (Carbon, Nitrogen, Phosphorus, Water) across physical, biological, and industrial state transformations. 
- **Conservation Law:** Total elemental inventory entering a state transformation must equal total elemental inventory exiting, subject to defined boundary fluxes and numerical floating-point tolerances.
- **Process Monad Integration:** The `StateValidator` acts as a pure mathematical monad method validator, evaluating expected versus actual state vector inventories without mutating underlying stocks.

## 2. Mathematical Formalization & Mass/Energy Deltas
Let $\vec{S}_{exp}$ be the expected thermodynamic state vector and $\vec{S}_{act}$ be the actual measured/simulated state vector. For each tracked elemental pool $i \in \{\text{carbon, nitrogen, phosphorus, water}\}$ with inventory values $X_i$, the absolute discrepancy $\Delta_i$ is defined as:

$$\Delta_i = |X_{i, \text{exp}} - X_{i, \text{act}}|$$

Let $T_i$ be the maximum allowable absolute tolerance threshold for element $i$. The invariant condition $V_i$ for element $i$ is satisfied if and only if:

$$V_i = \begin{cases} 
\text{true}, & \text{if } \Delta_i \le T_i \\
\text{false}, & \text{if } \Delta_i > T_i
\end{cases}$$

The overall state vector validity $\Omega$ is the logical conjunction across all tracked elements:

$$\Omega = \bigwedge_{i} V_i$$

## 3. Executable Monad Method Specification (`src/thermodynamics/state_validator.ts`)

```ts
import { StateVector } from './state_vector';
import { ElementTolerances, DiscrepancyResult } from './types';

/**
 * Thermodynamic State Validator Monad Method
 * Performs deterministic, side-effect-free evaluation of elemental inventories.
 */
export class StateValidator {
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