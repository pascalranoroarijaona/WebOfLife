```md
<!-- Method Specifications -->

# Thermodynamic State Vector Inventory Discrepancy Evaluator - Process Methods

## 1. Overview
This document specifies the scientific and mathematical foundations for the **Thermodynamic State Vector Inventory Discrepancy Evaluator** (`src/thermodynamics/state_validator.ts`). The module formalizes the verification of biogeochemical cycles (Carbon, Nitrogen, Phosphorus, Water) under strict thermodynamic conservation laws within the Web of Life ecosystem architecture.

---

## 2. Thermodynamic & Mass Balance Equations

### 2.1 First Law: Conservation of Mass
For any given stock pool $S_i$ within the state vector over a discrete time step $\Delta t$:
$$\Delta S_{i, \text{actual}} = S_i(t + \Delta t) - S_i(t)$$

The expected flux-derived delta $\Delta S_{i, \text{expected}}$ is computed via integrated boundary fluxes (inflows minus outflows):
$$\Delta S_{i, \text{expected}} = \Delta t \cdot \sum_{j} J_{ji}$$

where $J_{ji}$ represents net flux rates (mass per unit time) entering or leaving stock $i$ via pathway $j$.

### 2.2 Discrepancy Metrics
For each stock key $i$, the absolute discrepancy $\epsilon_i$ is defined as:
$$\epsilon_i = \left| \Delta S_{i, \text{actual}} - \Delta S_{i, \text{expected}} \right|$$

Total system absolute discrepancy $E_{\text{total}}$:
$$E_{\text{total}} = \sum_{i} \epsilon_i$$

Mass conservation is preserved if and only if:
$$E_{\text{total}} \le \tau_{\text{tolerance}}$$
where default $\tau_{\text{tolerance}} = 10^{-6}$.

---

## 3. Executable Monad Method Specification (`StateValidator`)

```typescript
import { StateVector } from './state_vector';
import { ThermodynamicStructure } from './thermodynamic_structure';

export interface DiscrepancyRecord {
  stockKey: string;
  actualDelta: number;
  expectedFluxDelta: number;
  absoluteDiscrepancy: number;
  isWithinTolerance: boolean;
}

export interface ValidationReport {
  timestamp: number;
  totalAbsoluteDiscrepancy: number;
  records: DiscrepancyRecord[];
  isMassConserved: boolean;
}

export class StateValidator {
  private tolerance: number;

  constructor(tolerance: number = 1e-6) {
    this.tolerance = tolerance;
  }

  public evaluate(
    previousState: StateVector,
    currentState: StateVector,
    structure: ThermodynamicStructure,
    deltaTime: number
  ): ValidationReport {
    const records: DiscrepancyRecord[] = [];
    let totalAbsoluteDiscrepancy = 0;

    const actualDeltas = currentState.computeDelta(previousState);
    const expectedDeltas = structure.calculateFluxDerivedDeltas(previousState, deltaTime);

    for (const key of Object.keys(actualDeltas)) {
      const actualDelta = actualDeltas[key] ?? 0;
      const expectedFluxDelta = expectedDeltas[key] ?? 0;
      const absoluteDiscrepancy = Math.abs(actualDelta - expectedFluxDelta);
      const isWithinTolerance = absoluteDiscrepancy <= this.tolerance;

      totalAbsoluteDiscrepancy += absoluteDiscrepancy;

      records.push({
        stockKey: key,
        actualDelta,
        expectedFluxDelta,
        absoluteDiscrepancy,
        isWithinTolerance,
      });
    }

    return {
      timestamp: Date.now(),
      totalAbsoluteDiscrepancy,
      records,
      isMassConserved: totalAbsoluteDiscrepancy <= this.tolerance,
    };
  }
}
```

---

## 4. Verification & Test Suite Specifications (`tests/sprint_061.test.ts`)

1. **Test 1 (Perfect Equilibrium / Conservation)**:
   - Input: Actual deltas identically match flux-derived expectations across C, N, P, and $H_2O$ pools.
   - Assertion: `totalAbsoluteDiscrepancy === 0`, `isMassConserved === true`.
2. **Test 2 (Unmodeled Perturbation Detection)**:
   - Input: External unmodeled forcing introduces a divergence in a specific carbon pool stock delta.
   - Assertion: Non-zero `absoluteDiscrepancy` registered for the affected stock key.
3. **Test 3 (Tolerance Boundary Thresholding)**:
   - Input: Discrepancies introduced below vs. above $\epsilon = 10^{-6}$.
   - Assertion: `isMassConserved` correctly toggles based on whether total discrepancy breaches the tolerance limit.