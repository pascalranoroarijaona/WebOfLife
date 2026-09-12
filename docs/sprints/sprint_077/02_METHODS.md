<!-- Method Specifications -->

# Sprint 077: Thermodynamic State Vector Discrepancy Aggregator - Process Methods & Specifications

## 1. Process Overview & Thermodynamic Foundation
The Thermodynamic State Vector Discrepancy Aggregator (`src/thermodynamics/state_validator.ts`) implements rigorous monitoring of mass and energy conservation across biogeochemical and thermodynamic state evaluations in the Web of Life simulation. 

By enforcing the **First Law of Thermodynamics** (conservation of total mass and energy across stocks) and bounding deviations via the **Second Law of Thermodynamics** (entropy generation via maximum discrepancy accumulation), this component functions as an immutable monad process method mapping state vectors and tracking upper bounds of system degradation or numerical drift.

---

## 2. Mass & Energy Delta Quantifications

### 2.1 Conserved Vectors ($\mathbf{X}$)
Each state vector $\mathbf{X}$ within the evaluation framework is composed of the following conserved physical and chemical stocks:
* **Carbon ($C$):** $\text{kg}$
* **Nitrogen ($N$):** $\text{kg}$
* **Phosphorus ($P$):** $\text{kg}$
* **Water ($W$):** $\text{kg}$
* **Enthalpy ($H$):** $\text{J}$

### 2.2 First Law Conservation Equation
For any given thermodynamic evaluation $i$, the discrepancy $\delta_i$ is defined as the norm of the difference between the expected state vector $\mathbf{X}_{\text{expected}, i}$ and the actual measured state vector $\mathbf{X}_{\text{actual}, i}$:
$$\delta_i = ||\mathbf{X}_{\text{expected}, i} - \mathbf{X}_{\text{actual}, i}||_2 = \sqrt{\sum_{k \in \{C, N, P, W, H\}} (X_{\text{expected}, i, k} - X_{\text{actual}, i, k})^2}$$

### 2.3 Second Law Bounds & Maximum Discrepancy Accumulation
The aggregator computes the maximum discrepancy across an array of $n$ evaluation results to bound unmodeled dissipation or entropy generation anomalies ($\Delta S_{\text{gen}}$):
$$\Delta_{\max} = \max_{1 \le i \le n} (\delta_i) = \max_{1 \le i \le n} \left( ||\mathbf{X}_{\text{expected}, i} - \mathbf{X}_{\text{actual}, i}|| \right)$$

If $\Delta_{\max}$ exceeds the predefined thermodynamic threshold $\epsilon_{\text{threshold}}$, a conservation violation is flagged, indicating unmitigated mass/energy leakage or non-isentropic divergence exceeding allowable system bounds.

---

## 3. Executable Monad Method Specifications

### 3.1 Interface Contracts
```typescript
export interface IStateVector {
  carbon: number;
  nitrogen: number;
  phosphorus: number;
  water: number;
  enthalpy: number;
}

export interface IStateEvaluationResult {
  timestamp: number;
  expectedVector: IStateVector;
  actualVector: IStateVector;
  discrepancy: number;
}

export interface IStateVectorAggregator {
  mapEvaluations(results: IStateEvaluationResult[]): number[];
  accumulateMaxDiscrepancy(results: IStateEvaluationResult[]): number;
}
```

### 3.2 Monad Method Implementations (`src/thermodynamics/state_validator.ts`)

```ts
import { IStateEvaluationResult, IStateVectorAggregator } from './state_validator_interfaces';

export class StateVectorDiscrepancyAggregator implements IStateVectorAggregator {
  /**
   * Maps an array of state evaluation results to an array of scalar discrepancy values.
   * Enforces First Law tracking by isolating individual cycle discrepancies.
   */
  public mapEvaluations(results: IStateEvaluationResult[]): number[] {
    return results.map(result => {
      if (result.discrepancy !== undefined && result.discrepancy !== null) {
        return result.discrepancy;
      }
      return this.computeVectorDistance(result.expectedVector, result.actualVector);
    });
  }

  /**
   * Computes the maximum discrepancy accumulated across all evaluated cycles 
   * to flag potential thermodynamic breaches and Second Law violations.
   */
  public accumulateMaxDiscrepancy(results: IStateEvaluationResult[]): number {
    if (!results || results.length === 0) {
      return 0.0;
    }
    const discrepancies = this.mapEvaluations(results);
    return discrepancies.reduce((max, current) => Math.max(max, current), 0.0);
  }

  private computeVectorDistance(expected: import('./state_vector').IStateVector, actual: import('./state_vector').IStateVector): number {
    const dC = expected.carbon - actual.carbon;
    const dN = expected.nitrogen - actual.nitrogen;
    const dP = expected.phosphorus - actual.phosphorus;
    const dW = expected.water - actual.water;
    const dH = expected.enthalpy - actual.enthalpy;

    return Math.sqrt(dC * dC + dN * dN + dP * dP + dW * dW + dH * dH);
  }
}
```

---

## 4. Verification & Testing Protocol
1. **Mapping Correctness:** Validate that `mapEvaluations` accurately projects an array of `IStateEvaluationResult` objects into a 1:1 array of scalar discrepancies.
2. **Maximum Accumulation:** Verify that `accumulateMaxDiscrepancy` correctly extracts the supremum of discrepancies across stochastic and deterministic simulation runs.
3. **Conservation Bounds:** Confirm that zero-discrepancy states yield an accumulation of `0.0`, while injected mass/energy anomalies proportionally elevate the accumulated maximum discrepancy.