<!-- Method Specifications -->

# Thermodynamic State Vector Inventory Discrepancy Evaluator (`src/thermodynamics/state_validator.ts`)

## 1. Process Overview & Thermodynamic Foundation
The Web of Life thermodynamic engine models biogeochemical and industrial processes under strict physical conservation laws. Sprint 062 formalizes the validation of thermodynamic state vector transitions via `StateValidator`. This component evaluates mass and energy conservation across monad process boundaries by comparing empirical state changes ($\Delta S_{actual}$) against integrated flux-derived expectations ($\Delta S_{expected}$).

### Physical & Mathematical Formalism
For any stock $S_i$ within the thermodynamic state vector, the First Law of Thermodynamics mandates that its temporal evolution over a discrete time step $\Delta t$ equals the net flux transfer:

$$\Delta S_{actual, i} = S_{current, i} - S_{previous, i}$$

$$\Delta S_{expected, i} = \sum_{j} Inflow_{j, i} - \sum_{k} Outflow_{k, i} = \text{netFluxes}[i]$$

The absolute discrepancy $D_i$ for stock $i$ is calculated as:

$$D_i = \left| \Delta S_{actual, i} - \Delta S_{expected, i} \right|$$

A system state vector is declared balanced ($isBalanced = true$) if and only if all stock discrepancies remain within the specified tolerance $\epsilon$:

$$\forall i, \quad D_i \leq \epsilon \quad (\text{default } \epsilon = 1.0 \times 10^{-6})$$

---

## 2. Executable Monad Method & Stock Transfer Equations

The validation methodology is encapsulated within the `StateValidator` monad utility class, adhering to the `IStateValidator` interface contract.

### Core Validation Algorithm (`src/thermodynamics/state_validator.ts`)

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

    // Union of all tracked keys across states and flux maps
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

## 3. Biogeochemical Cycle Integration & Mass-Balance Validation

When integrated across the Web of Life simulation engine, `StateValidator` enforces mass-balance closure across major elemental cycles:

1. **Carbon Cycle:**
   $$\Delta S_{C, actual} = \text{Photosynthetic fixation} - (\text{Autotrophic respiration} + \text{Heterotrophic respiration} + \text{Leaching})$$
2. **Hydrological Cycle (Water):**
   $$\Delta S_{H_2O, actual} = \text{Precipitation} - (\text{Evapotranspiration} + \text{Runoff} + \text{Percolation})$$
3. **Nutrient Cycles (Nitrogen / Phosphorus):**
   $$\Delta S_{N/P, actual} = \text{Mineralization} + \text{Deposition} - (\text{Plant uptake} + \text{Immobilization} + \text{Denitrification})$$

Any uncounted sink or source introduced during monad state transitions results in $D_i > \epsilon$, triggering an immediate First Law discrepancy violation report.