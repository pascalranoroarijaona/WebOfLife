<!-- Method Specifications -->

# Sprint 70: Thermodynamic State Vector Discrepancy Absolute Difference Math Function

## 1. Process Overview & Scientific Foundation
In the Web of Life simulation architecture, thermodynamic state validation is governed by mass-energy balance equations derived from the First and Second Laws of Thermodynamics. Systems must reconcile physical states against expected homeostatic baselines. 

The process formalized in this document extracts the pure mathematical function `computeAbsoluteStockDelta(actual, expected)`. This function evaluates stock discrepancies across elemental keys (e.g., carbon, nitrogen, phosphorus, water) within the thermodynamic state vector monad pipeline.

---

## 2. Mass/Energy Delta Equations
Given an actual thermodynamic state vector $A$ and an expected thermodynamic state vector $E$, with stock mappings defined over the universe of keys $K = \text{keys}(A.stocks) \cup \text{keys}(E.stocks)$, the absolute elemental discrepancy vector $\Delta$ is computed as:

$$\Delta_k = \left| A.stocks[k] - E.stocks[k] \right| \quad \forall k \in K$$

Where missing keys are evaluated with a neutral default baseline:
$$A.stocks[k] \text{ if undefined} \to 0.0$$
$$E.stocks[k] \text{ if undefined} \to 0.0$$

---

## 3. Monad Method & Executable Specification (`src/thermodynamics/state_validator.ts`)

```typescript
import { ThermodynamicStateVector } from './state_vector';

/**
 * Computes the absolute difference between actual and expected elemental stocks.
 * 
 * Formal Process:
 * Δ_k = |A[k] - E[k]| for each elemental stock key k in K.
 * 
 * @param actual The observed thermodynamic state vector (State_{t+1}).
 * @param expected The target/reference thermodynamic state vector (State_{expected}).
 * @returns A record mapping each elemental key to its absolute stock discrepancy.
 */
export function computeAbsoluteStockDelta(
  actual: ThermodynamicStateVector,
  expected: ThermodynamicStateVector
): Record<string, number> {
  const discrepancies: Record<string, number> = {};
  const actualStocks = actual?.stocks ?? {};
  const expectedStocks = expected?.stocks ?? {};
  
  const keys = new Set([
    ...Object.keys(actualStocks),
    ...Object.keys(expectedStocks)
  ]);

  for (const key of keys) {
    const actVal = actualStocks[key] ?? 0;
    const expVal = expectedStocks[key] ?? 0;
    discrepancies[key] = Math.abs(actVal - expVal);
  }

  return discrepancies;
}
```

---

## 4. State Monad Integration Pipeline
The validation monad operates in sequence with physical and biological process transitions:

$$\text{State}_t \xrightarrow{\text{Process Execution}} \text{State}_{t+1} \xrightarrow{\text{Validation}} \text{computeAbsoluteStockDelta}(\text{State}_{t+1}, \text{State}_{\text{expected}})$$

1. **State Transformation:** Biological/industrial processes mutate elemental pools (e.g., carbon fixation, water transpiration).
2. **Discrepancy Evaluation:** `computeAbsoluteStockDelta` calculates absolute deviations without altering system entropy or mass balances directly.
3. **Threshold Checking:** Resulting discrepancies are compared against tolerance limits to trigger homeostatic corrections or error states.