<!-- Method Specifications -->

# Thermodynamic Process Specifications & Monad Methods: Sprint 078
**Module:** `src/thermodynamics/state_validator.ts`  
**Author:** Process Mining & Research Scientist, Web of Life  

---

## 1. Executive Summary & Physical Principles

Sprint 078 formalizes the thermodynamic state validation pipeline for the Web of Life simulation engine. By evaluating state vector inventory discrepancies across biochemical and physical stocks (carbon, nitrogen, phosphorus, water, and energy), the system enforces strict First and Second Law thermodynamic constraints.

### 1.1 First Law of Thermodynamics (Conservation of Mass & Energy)
The total stock inventory within the system satisfies the conservation relation:
$$\sum S_{i,t} = \sum S_{i,t-1} + \sum \Phi_{in, t} - \sum \Phi_{out, t} + \Delta E_{gen}$$
Where:
- $S_{i,t}$ represents the inventory of stock $i$ at time $t$.
- $\Phi_{in, t}, \Phi_{out, t}$ represent incoming and outgoing boundary fluxes.
- $\Delta E_{gen}$ represents internal energy generation or solar input.

Any unexplained deviation between the observed current state vector ($\mathbf{S}_{curr}$) and the expected state vector ($\mathbf{S}_{exp}$) is quantified as an inventory discrepancy:
$$\delta_i = S_{curr, i} - S_{exp, i}$$
$$\mathcal{D}_{total} = \sum_{i} |\delta_i|$$

### 1.2 Second Law of Thermodynamics (Entropy & Irreversibility)
The entropy delta ($\Delta S_{sys}$) resulting from process transformations is bounded by irreversible dissipation. Within the validator, the second law is operationalized via energy state divergences:
$$\Delta S_{entropy} = \kappa \cdot |E_{curr} - E_{exp}|$$
Where $\kappa = 0.001 \, \text{J}\cdot\text{K}^{-1}\cdot\text{J}^{-1}$ represents the normalized dissipation coefficient for unallocated thermal degradation.

---

## 2. Executable Monad Method & Concrete Stock Transfer Equations

The core validation wrapper is implemented as an immutable monad-compatible service method within `StateValidator`.

### 2.1 Method Signature & Implementation (`src/thermodynamics/state_validator.ts`)

```typescript
import { StateVector } from './state_vector';

export interface DiscrepancyReport {
  timestamp: number;
  totalDiscrepancy: number;
  vectorDiscrepancies: Record<string, number>;
  isBalanced: boolean;
  entropyDelta: number;
}

export interface IStateValidator {
  evaluateDiscrepancy(currentState: StateVector, expectedState: StateVector): DiscrepancyReport;
}

export class StateValidator implements IStateValidator {
  constructor(private tolerance: number = 1e-6) {}

  public evaluateDiscrepancy(currentState: StateVector, expectedState: StateVector): DiscrepancyReport {
    const vectorDiscrepancies = this.aggregateDifferences(currentState, expectedState);
    const totalDiscrepancy = Object.values(vectorDiscrepancies).reduce((acc, val) => acc + Math.abs(val), 0);
    const isBalanced = totalDiscrepancy <= this.tolerance;
    const entropyDelta = this.computeEntropyDelta(currentState, expectedState);

    return {
      timestamp: Date.now(),
      totalDiscrepancy,
      vectorDiscrepancies,
      isBalanced,
      entropyDelta
    };
  }

  private aggregateDifferences(current: StateVector, expected: StateVector): Record<string, number> {
    const diffs: Record<string, number> = {};
    const keys = new Set([...Object.keys(current.stocks), ...Object.keys(expected.stocks)]);
    
    keys.forEach(key => {
      const currVal = current.stocks[key] || 0;
      const expVal = expected.stocks[key] || 0;
      diffs[key] = currVal - expVal;
    });

    return diffs;
  }

  private computeEntropyDelta(current: StateVector, expected: StateVector): number {
    return Math.abs(current.totalEnergy - expected.totalEnergy) * 0.001;
  }
}
```

---

## 3. Stock Transfer & Discrepancy Matrix

The following matrix defines how stock inventories across major biogeochemical cycles are evaluated for discrepancy detection:

| Stock Key (`key`) | Cycle / Domain | Units | Tolerance Threshold | Violation Consequence |
| :--- | :--- | :--- | :--- | :--- |
| `carbon_pool` | Carbon Cycle | $\text{mol C}$ | $10^{-6}$ | Damping feedback / Flux truncation |
| `nitrogen_pool` | Nitrogen Cycle | $\text{mol N}$ | $10^{-6}$ | Fixation rate adjustment |
| `phosphorus_pool` | Phosphorus Cycle | $\text{mol P}$ | $10^{-6}$ | Mineralization clamp |
| `water_inventory` | Hydrological | $\text{kg } H_2O$ | $10^{-6}$ | Evapotranspiration balance correction |
| `totalEnergy` | Thermodynamic Energy | $\text{Joules}$ | $10^{-6}$ | Thermal dissipation feedback |

---

## 4. Verification and Test Scenarios (`tests/sprint_078.test.ts`)

1. **Zero Discrepancy Test:** Identical `StateVector` inputs yield `isBalanced = true`, `totalDiscrepancy = 0`, and $\Delta S = 0$.
2. **Inventory Accumulation Mismatch:** Artificial perturbation of `carbon_pool` and `water_inventory` correctly populates `vectorDiscrepancies` and triggers `isBalanced = false` when exceeding `1e-6`.
3. **First Law Conservation Error:** Unbalanced energy injections without source provenance trigger boundary violation flags.
4. **Second Law Entropy Bounds:** Energy state divergence correctly calculates proportional entropic heat loss.